<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Activite;
use App\Models\EcheanceVersement;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EcheanceVersementController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $this->actualiserRetards();

        return $this->ok([
            'donnees' => EcheanceVersement::with('activite:id,nom,code,montant_versement')
                ->when($request->filled('activite_id'), fn ($q) => $q->where('activite_id', $request->integer('activite_id')))
                ->when($request->filled('statut'), fn ($q) => $q->where('statut', $request->string('statut')))
                ->orderByDesc('debut_periode')
                ->paginate($request->integer('par_page', 50)),
        ]);
    }

    public function generer(Request $request): JsonResponse
    {
        $debut = $request->date('debut_periode')
            ? CarbonImmutable::parse($request->date('debut_periode'))->startOfWeek()
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

        $this->auditer($request, 'generer', 'echeances_versements', null, [
            'debut_periode' => $debut->toDateString(),
            'fin_periode' => $fin->toDateString(),
        ]);

        return $this->ok(['nombre' => $nombre], 'Échéances générées.');
    }

    private function actualiserRetards(): void
    {
        EcheanceVersement::where('statut', '!=', 'paye')
            ->whereDate('fin_periode', '<', now()->toDateString())
            ->get()
            ->each(function (EcheanceVersement $echeance) {
                $echeance->update([
                    'statut' => (float) $echeance->montant_paye > 0 ? 'partiel' : 'en_retard',
                ]);
            });
    }
}
