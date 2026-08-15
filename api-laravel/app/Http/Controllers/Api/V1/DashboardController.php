<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Activite;
use App\Models\ArticleInventaire;
use App\Models\EcheanceVersement;
use App\Models\Transaction;
use App\Services\ChartDataService;
use Illuminate\Http\JsonResponse;

class DashboardController extends ApiController
{
    public function __construct(private readonly ChartDataService $charts)
    {
    }

    public function index(): JsonResponse
    {
        $revenus = (float) Transaction::where('type', 'revenu')->where('statut_validation', 'valide')->sum('montant');
        $decaissements = (float) Transaction::where('type', 'decaissement')->where('statut_validation', 'valide')->sum('montant');

        $activites = Activite::query()
            ->with('typeActivite:id,nom,couleur,icone')
            ->withSum(['transactions as revenus' => fn ($q) => $q->where('type', 'revenu')->where('statut_validation', 'valide')], 'montant')
            ->withSum(['transactions as decaissements' => fn ($q) => $q->where('type', 'decaissement')->where('statut_validation', 'valide')], 'montant')
            ->latest()
            ->limit(8)
            ->get();

        $filtres = [
            'debut' => now()->startOfMonth()->toDateString(),
            'fin' => now()->endOfMonth()->toDateString(),
            'granularite' => 'jour',
        ];

        return $this->ok([
            'resume' => [
                'activites' => Activite::where('statut', 'actif')->count(),
                'revenus' => $revenus,
                'decaissements' => $decaissements,
                'resultat' => $revenus - $decaissements,
                'retards' => EcheanceVersement::whereIn('statut', ['en_retard', 'impaye', 'partiel'])->count(),
                'inventaire' => (float) ArticleInventaire::query()
                    ->selectRaw('COALESCE(SUM(quantite * valeur_unitaire), 0) as total')
                    ->value('total'),
            ],
            'graphiques' => $this->charts->vueEnsemble($filtres, [
                'evolution_financiere',
                'repartition_activites',
                'resultat_activites',
                'echeances_statut',
                'repartition_categories',
                'inventaire_activite',
                'modes_paiement',
                'recouvrement_echeances',
            ]),
            'activites' => $activites,
            'transactions' => Transaction::with(['activite:id,nom,code', 'categorie:id,nom'])
                ->latest('date_transaction')
                ->limit(10)
                ->get(),
            'echeances' => EcheanceVersement::with('activite:id,nom,code')
                ->orderBy('fin_periode')
                ->limit(10)
                ->get(),
        ]);
    }
}
