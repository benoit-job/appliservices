<?php

namespace App\Services;

use App\Models\Activite;
use App\Models\ArticleInventaire;
use App\Models\CategorieTransaction;
use App\Models\EcheanceVersement;
use App\Models\Parametre;
use App\Models\Transaction;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class ChartDataService
{
    public const COULEURS = [
        'revenus' => '#16a34a',
        'decaissements' => '#dc2626',
        'resultat' => '#0757a6',
        'gold' => '#f3b20b',
        'purple' => '#7c3aed',
        'cyan' => '#0891b2',
        'orange' => '#ea580c',
        'pink' => '#db2777',
    ];

    public const STATUTS_ECHEANCE = [
        'paye' => '#16a34a',
        'partiel' => '#f3b20b',
        'a_venir' => '#0757a6',
        'en_retard' => '#ea580c',
        'impaye' => '#dc2626',
    ];

    /** @return array<string, array{id: string, type: string, titre: string, description: string, filtres: array<string>}> */
    public function typesDisponibles(): array
    {
        return [
            'evolution_financiere' => [
                'id' => 'evolution_financiere',
                'type' => 'line',
                'titre' => 'Évolution financière',
                'description' => 'Courbe des revenus, dépenses et résultat dans le temps.',
                'filtres' => ['debut', 'fin', 'granularite', 'activite_id'],
            ],
            'repartition_activites' => [
                'id' => 'repartition_activites',
                'type' => 'bar',
                'titre' => 'Revenus et dépenses par activité',
                'description' => 'Comparaison des flux financiers par activité.',
                'filtres' => ['debut', 'fin', 'activite_id'],
            ],
            'resultat_activites' => [
                'id' => 'resultat_activites',
                'type' => 'bar',
                'titre' => 'Résultat par activité',
                'description' => 'Bénéfice ou perte nette par activité.',
                'filtres' => ['debut', 'fin', 'activite_id'],
            ],
            'repartition_categories' => [
                'id' => 'repartition_categories',
                'type' => 'doughnut',
                'titre' => 'Répartition par catégorie',
                'description' => 'Ventilation des montants par catégorie de transaction.',
                'filtres' => ['debut', 'fin', 'activite_id', 'type_transaction'],
            ],
            'echeances_statut' => [
                'id' => 'echeances_statut',
                'type' => 'doughnut',
                'titre' => 'Statut des échéances',
                'description' => 'Répartition des échéances de versement par statut.',
                'filtres' => ['debut', 'fin', 'activite_id'],
            ],
            'inventaire_activite' => [
                'id' => 'inventaire_activite',
                'type' => 'bar',
                'titre' => 'Valeur inventaire par activité',
                'description' => 'Valorisation totale du stock par activité.',
                'filtres' => ['activite_id'],
            ],
            'modes_paiement' => [
                'id' => 'modes_paiement',
                'type' => 'pie',
                'titre' => 'Modes de paiement',
                'description' => 'Répartition des transactions par mode de paiement.',
                'filtres' => ['debut', 'fin', 'activite_id', 'type_transaction'],
            ],
            'recouvrement_echeances' => [
                'id' => 'recouvrement_echeances',
                'type' => 'bar',
                'titre' => 'Recouvrement des échéances',
                'description' => 'Montants attendus vs payés par activité.',
                'filtres' => ['debut', 'fin', 'activite_id'],
            ],
        ];
    }

    /** @param array<string, mixed> $filtres */
    public function generer(string $type, array $filtres = []): array
    {
        $types = $this->typesDisponibles();
        if (! isset($types[$type])) {
            throw new \InvalidArgumentException("Type de graphique inconnu : {$type}");
        }

        $meta = $types[$type];
        $periode = $this->resoudrePeriode($filtres);

        $graphique = match ($type) {
            'evolution_financiere' => $this->evolutionFinanciere($periode, $filtres),
            'repartition_activites' => $this->repartitionActivites($periode, $filtres),
            'resultat_activites' => $this->resultatActivites($periode, $filtres),
            'repartition_categories' => $this->repartitionCategories($periode, $filtres),
            'echeances_statut' => $this->echeancesStatut($periode, $filtres),
            'inventaire_activite' => $this->inventaireActivite($filtres),
            'modes_paiement' => $this->modesPaiement($periode, $filtres),
            'recouvrement_echeances' => $this->recouvrementEcheances($periode, $filtres),
            default => throw new \InvalidArgumentException("Type de graphique inconnu : {$type}"),
        };

        return array_merge($meta, $graphique, [
            'devise' => $this->devise(),
            'periode' => $periode,
            'filtres_appliques' => $this->filtresAppliques($filtres, $periode),
        ]);
    }

    /** @param array<string, mixed> $filtres @return list<array<string, mixed>> */
    public function vueEnsemble(array $filtres = [], ?array $types = null): array
    {
        $disponibles = $this->typesDisponibles();
        $cibles = $types ? array_values(array_intersect(array_keys($disponibles), $types)) : array_keys($disponibles);

        return array_map(fn (string $type) => $this->generer($type, $filtres), $cibles);
    }

    /** @param array<string, mixed> $filtres */
    private function resoudrePeriode(array $filtres): array
    {
        $debut = isset($filtres['debut']) ? Carbon::parse($filtres['debut'])->startOfDay() : now()->startOfMonth();
        $fin = isset($filtres['fin']) ? Carbon::parse($filtres['fin'])->endOfDay() : now()->endOfMonth();

        return [
            'debut' => $debut->toDateString(),
            'fin' => $fin->toDateString(),
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function filtresAppliques(array $filtres, array $periode): array
    {
        return [
            'debut' => $periode['debut'],
            'fin' => $periode['fin'],
            'granularite' => $filtres['granularite'] ?? 'jour',
            'activite_id' => isset($filtres['activite_id']) ? (int) $filtres['activite_id'] : null,
            'type_transaction' => $filtres['type_transaction'] ?? null,
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function evolutionFinanciere(array $periode, array $filtres): array
    {
        $granularite = $filtres['granularite'] ?? 'jour';
        $labels = $this->genererLabels($periode['debut'], $periode['fin'], $granularite);

        $query = Transaction::query()
            ->where('statut_validation', 'valide')
            ->whereBetween('date_transaction', [$periode['debut'], $periode['fin']]);

        if (! empty($filtres['activite_id'])) {
            $query->where('activite_id', $filtres['activite_id']);
        }

        $rows = $query->get(['type', 'montant', 'date_transaction']);
        $buckets = $this->initialiserBuckets($labels);

        foreach ($rows as $row) {
            $cle = $this->bucketKey(Carbon::parse($row->date_transaction), $granularite);
            if (! isset($buckets[$cle])) {
                continue;
            }
            $buckets[$cle][$row->type] += (float) $row->montant;
        }

        $revenus = [];
        $decaissements = [];
        $resultats = [];
        foreach ($labels as $label) {
            $revenus[] = round($buckets[$label]['revenu'] ?? 0, 2);
            $decaissements[] = round($buckets[$label]['decaissement'] ?? 0, 2);
            $resultats[] = round(($buckets[$label]['revenu'] ?? 0) - ($buckets[$label]['decaissement'] ?? 0), 2);
        }

        return [
            'labels' => $labels,
            'series' => [
                ['id' => 'revenus', 'label' => 'Revenus', 'couleur' => self::COULEURS['revenus'], 'donnees' => $revenus],
                ['id' => 'decaissements', 'label' => 'Dépenses', 'couleur' => self::COULEURS['decaissements'], 'donnees' => $decaissements],
                ['id' => 'resultat', 'label' => 'Résultat', 'couleur' => self::COULEURS['resultat'], 'donnees' => $resultats],
            ],
            'meta' => [
                'total_revenus' => array_sum($revenus),
                'total_decaissements' => array_sum($decaissements),
                'total_resultat' => array_sum($resultats),
                'granularite' => $granularite,
            ],
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function repartitionActivites(array $periode, array $filtres): array
    {
        $activites = $this->activitesFiltrees($filtres);
        $labels = $activites->pluck('nom')->all();
        $revenus = [];
        $decaissements = [];

        foreach ($activites as $activite) {
            $revenus[] = (float) Transaction::where('activite_id', $activite->id)
                ->where('type', 'revenu')
                ->where('statut_validation', 'valide')
                ->whereBetween('date_transaction', [$periode['debut'], $periode['fin']])
                ->sum('montant');
            $decaissements[] = (float) Transaction::where('activite_id', $activite->id)
                ->where('type', 'decaissement')
                ->where('statut_validation', 'valide')
                ->whereBetween('date_transaction', [$periode['debut'], $periode['fin']])
                ->sum('montant');
        }

        return [
            'labels' => $labels,
            'series' => [
                ['id' => 'revenus', 'label' => 'Revenus', 'couleur' => self::COULEURS['revenus'], 'donnees' => $revenus],
                ['id' => 'decaissements', 'label' => 'Dépenses', 'couleur' => self::COULEURS['decaissements'], 'donnees' => $decaissements],
            ],
            'meta' => ['total_revenus' => array_sum($revenus), 'total_decaissements' => array_sum($decaissements)],
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function resultatActivites(array $periode, array $filtres): array
    {
        $activites = $this->activitesFiltrees($filtres);
        $labels = [];
        $resultats = [];
        $couleurs = [];

        foreach ($activites as $activite) {
            $revenus = (float) Transaction::where('activite_id', $activite->id)
                ->where('type', 'revenu')
                ->where('statut_validation', 'valide')
                ->whereBetween('date_transaction', [$periode['debut'], $periode['fin']])
                ->sum('montant');
            $decaissements = (float) Transaction::where('activite_id', $activite->id)
                ->where('type', 'decaissement')
                ->where('statut_validation', 'valide')
                ->whereBetween('date_transaction', [$periode['debut'], $periode['fin']])
                ->sum('montant');
            $resultat = $revenus - $decaissements;

            $labels[] = $activite->nom;
            $resultats[] = $resultat;
            $couleurs[] = $resultat >= 0 ? self::COULEURS['revenus'] : self::COULEURS['decaissements'];
        }

        return [
            'labels' => $labels,
            'series' => [
                ['id' => 'resultat', 'label' => 'Résultat', 'couleur' => self::COULEURS['resultat'], 'donnees' => $resultats, 'couleurs' => $couleurs],
            ],
            'meta' => ['total_resultat' => array_sum($resultats)],
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function repartitionCategories(array $periode, array $filtres): array
    {
        $query = Transaction::query()
            ->with('categorie:id,nom')
            ->where('statut_validation', 'valide')
            ->whereBetween('date_transaction', [$periode['debut'], $periode['fin']]);

        if (! empty($filtres['activite_id'])) {
            $query->where('activite_id', $filtres['activite_id']);
        }
        if (! empty($filtres['type_transaction'])) {
            $query->where('type', $filtres['type_transaction']);
        } else {
            $query->where('type', 'decaissement');
        }

        $groupes = $query->get()
            ->groupBy(fn ($t) => $t->categorie?->nom ?? 'Sans catégorie')
            ->map(fn (Collection $items) => (float) $items->sum('montant'))
            ->sortDesc();

        return $this->formatPie($groupes);
    }

    /** @param array<string, mixed> $filtres */
    private function echeancesStatut(array $periode, array $filtres): array
    {
        $query = EcheanceVersement::query()
            ->whereBetween('fin_periode', [$periode['debut'], $periode['fin']]);

        if (! empty($filtres['activite_id'])) {
            $query->where('activite_id', $filtres['activite_id']);
        }

        $groupes = $query->get()
            ->groupBy('statut')
            ->map(fn (Collection $items) => $items->count())
            ->sortDesc();

        $labels = $groupes->keys()->map(fn ($s) => str_replace('_', ' ', ucfirst($s)))->all();
        $donnees = $groupes->values()->all();
        $couleurs = $groupes->keys()->map(fn ($s) => self::STATUTS_ECHEANCE[$s] ?? self::COULEURS['purple'])->all();

        return [
            'labels' => $labels,
            'series' => [
                ['id' => 'statuts', 'label' => 'Échéances', 'couleur' => self::COULEURS['gold'], 'donnees' => $donnees, 'couleurs' => $couleurs],
            ],
            'meta' => ['total' => array_sum($donnees)],
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function inventaireActivite(array $filtres): array
    {
        $query = ArticleInventaire::query()->with('activite:id,nom');

        if (! empty($filtres['activite_id'])) {
            $query->where('activite_id', $filtres['activite_id']);
        }

        $groupes = $query->get()
            ->groupBy(fn ($a) => $a->activite?->nom ?? 'Sans activité')
            ->map(fn (Collection $items) => (float) $items->sum(fn ($a) => (float) $a->quantite * (float) $a->valeur_unitaire))
            ->sortDesc();

        $palette = array_values(self::COULEURS);

        return [
            'labels' => $groupes->keys()->all(),
            'series' => [
                [
                    'id' => 'valeur',
                    'label' => 'Valeur inventaire',
                    'couleur' => self::COULEURS['resultat'],
                    'donnees' => $groupes->values()->all(),
                    'couleurs' => collect($groupes->keys())->values()->map(fn ($_, $i) => $palette[$i % count($palette)])->all(),
                ],
            ],
            'meta' => ['total' => $groupes->sum()],
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function modesPaiement(array $periode, array $filtres): array
    {
        $query = Transaction::query()
            ->where('statut_validation', 'valide')
            ->whereBetween('date_transaction', [$periode['debut'], $periode['fin']]);

        if (! empty($filtres['activite_id'])) {
            $query->where('activite_id', $filtres['activite_id']);
        }
        if (! empty($filtres['type_transaction'])) {
            $query->where('type', $filtres['type_transaction']);
        }

        $groupes = $query->get()
            ->groupBy('mode_paiement')
            ->map(fn (Collection $items) => (float) $items->sum('montant'))
            ->sortDesc()
            ->mapWithKeys(fn ($montant, $mode) => [str_replace('_', ' ', ucfirst($mode)) => $montant]);

        return $this->formatPie($groupes);
    }

    /** @param array<string, mixed> $filtres */
    private function recouvrementEcheances(array $periode, array $filtres): array
    {
        $activites = $this->activitesFiltrees($filtres);
        $labels = $activites->pluck('nom')->all();
        $attendus = [];
        $payes = [];

        foreach ($activites as $activite) {
            $echeances = EcheanceVersement::where('activite_id', $activite->id)
                ->whereBetween('fin_periode', [$periode['debut'], $periode['fin']])
                ->get();
            $attendus[] = (float) $echeances->sum('montant_attendu');
            $payes[] = (float) $echeances->sum('montant_paye');
        }

        return [
            'labels' => $labels,
            'series' => [
                ['id' => 'attendu', 'label' => 'Attendu', 'couleur' => self::COULEURS['gold'], 'donnees' => $attendus],
                ['id' => 'paye', 'label' => 'Payé', 'couleur' => self::COULEURS['revenus'], 'donnees' => $payes],
            ],
            'meta' => [
                'total_attendu' => array_sum($attendus),
                'total_paye' => array_sum($payes),
                'taux_recouvrement' => array_sum($attendus) > 0 ? round(array_sum($payes) / array_sum($attendus) * 100, 1) : 0,
            ],
        ];
    }

    /** @param Collection<string, float> $groupes */
    private function formatPie(Collection $groupes): array
    {
        $palette = array_values(self::COULEURS);
        $labels = $groupes->keys()->all();
        $donnees = $groupes->values()->all();
        $couleurs = collect($labels)->values()->map(fn ($_, $i) => $palette[$i % count($palette)])->all();

        return [
            'labels' => $labels,
            'series' => [
                ['id' => 'repartition', 'label' => 'Montant', 'couleur' => self::COULEURS['resultat'], 'donnees' => $donnees, 'couleurs' => $couleurs],
            ],
            'meta' => ['total' => array_sum($donnees)],
        ];
    }

    /** @param array<string, mixed> $filtres */
    private function activitesFiltrees(array $filtres): Collection
    {
        $query = Activite::query()->orderBy('nom');
        if (! empty($filtres['activite_id'])) {
            $query->where('id', $filtres['activite_id']);
        }

        return $query->get(['id', 'nom', 'code']);
    }

    /** @return list<string> */
    private function genererLabels(string $debut, string $fin, string $granularite): array
    {
        $start = Carbon::parse($debut)->startOfDay();
        $end = Carbon::parse($fin)->endOfDay();
        $labels = [];

        if ($granularite === 'mois') {
            $cursor = $start->copy()->startOfMonth();
            while ($cursor <= $end) {
                $labels[] = $cursor->format('Y-m');
                $cursor->addMonth();
            }

            return $labels;
        }

        if ($granularite === 'semaine') {
            $cursor = $start->copy()->startOfWeek();
            while ($cursor <= $end) {
                $labels[] = $cursor->format('Y-\\WW');
                $cursor->addWeek();
            }

            return $labels;
        }

        foreach (CarbonPeriod::create($start, $end) as $day) {
            $labels[] = $day->format('Y-m-d');
        }

        return $labels;
    }

    /** @param list<string> $labels @return array<string, array<string, float>> */
    private function initialiserBuckets(array $labels): array
    {
        $buckets = [];
        foreach ($labels as $label) {
            $buckets[$label] = ['revenu' => 0.0, 'decaissement' => 0.0];
        }

        return $buckets;
    }

    private function bucketKey(Carbon $date, string $granularite): string
    {
        return match ($granularite) {
            'mois' => $date->format('Y-m'),
            'semaine' => $date->copy()->startOfWeek()->format('Y-\\WW'),
            default => $date->format('Y-m-d'),
        };
    }

    private function devise(): string
    {
        return Parametre::where('cle', 'devise')->value('valeur') ?? 'FCFA';
    }
}
