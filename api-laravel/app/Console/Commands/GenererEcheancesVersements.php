<?php

namespace App\Console\Commands;

use App\Models\Activite;
use App\Models\EcheanceVersement;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class GenererEcheancesVersements extends Command
{
    protected $signature = 'koue:generer-echeances {--date=}';

    protected $description = 'Génère les échéances de versement pour les activités assujetties.';

    public function handle(): int
    {
        $debut = $this->option('date')
            ? CarbonImmutable::parse($this->option('date'))->startOfWeek()
            : CarbonImmutable::now()->startOfWeek();
        $fin = $debut->endOfWeek();
        $nombre = 0;

        Activite::with('typeActivite')
            ->where('statut', 'actif')
            ->where('montant_versement', '>', 0)
            ->whereHas('typeActivite', fn ($q) => $q->where('a_versement_recurrent', true))
            ->each(function (Activite $activite) use ($debut, $fin, &$nombre) {
                EcheanceVersement::firstOrCreate([
                    'activite_id' => $activite->id,
                    'debut_periode' => $debut->toDateString(),
                    'fin_periode' => $fin->toDateString(),
                ], [
                    'montant_attendu' => $activite->montant_versement,
                    'montant_paye' => 0,
                    'statut' => 'a_venir',
                ]);
                $nombre++;
            });

        $this->info("Échéances contrôlées/générées : {$nombre}");

        return self::SUCCESS;
    }
}
