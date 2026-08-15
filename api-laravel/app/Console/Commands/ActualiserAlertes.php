<?php

namespace App\Console\Commands;

use App\Models\ArticleInventaire;
use App\Models\EcheanceVersement;
use App\Models\Notification;
use Illuminate\Console\Command;

class ActualiserAlertes extends Command
{
    protected $signature = 'koue:actualiser-alertes';

    protected $description = 'Actualise les retards de versement et génère les alertes de stock bas.';

    public function handle(): int
    {
        $retards = 0;

        EcheanceVersement::where('statut', '!=', 'paye')
            ->whereDate('fin_periode', '<', now()->toDateString())
            ->with('activite:id,nom,code')
            ->get()
            ->each(function (EcheanceVersement $echeance) use (&$retards) {
                $statut = (float) $echeance->montant_paye > 0 ? 'partiel' : 'en_retard';
                if ($echeance->statut !== $statut) {
                    $echeance->update(['statut' => $statut]);
                    Notification::firstOrCreate([
                        'titre' => 'Retard de versement',
                        'message' => "{$echeance->activite?->code} - {$echeance->activite?->nom} est en retard de versement.",
                        'type_notification' => 'retard',
                    ]);
                    $retards++;
                }
            });

        ArticleInventaire::whereNotNull('seuil_alerte')
            ->whereColumn('quantite', '<=', 'seuil_alerte')
            ->with('activite:id,nom,code')
            ->get()
            ->each(function (ArticleInventaire $article) {
                Notification::firstOrCreate([
                    'titre' => 'Stock bas',
                    'message' => "{$article->nom} est sous le seuil dans {$article->activite?->code}.",
                    'type_notification' => 'stock',
                ]);
            });

        $this->info("Alertes de retard actualisées : {$retards}");

        return self::SUCCESS;
    }
}
