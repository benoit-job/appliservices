<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Activite;
use App\Models\InstantaneRapport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RapportController extends ApiController
{
    public function bilan(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'debut' => ['nullable', 'date'],
            'fin' => ['nullable', 'date', 'after_or_equal:debut'],
        ]);

        $debut = $donnees['debut'] ?? now()->startOfMonth()->toDateString();
        $fin = $donnees['fin'] ?? now()->endOfMonth()->toDateString();
        $activites = Activite::with('typeActivite:id,nom')
            ->withSum(['transactions as revenus' => fn ($q) => $q->where('type', 'revenu')->whereBetween('date_transaction', [$debut, $fin])->where('statut_validation', 'valide')], 'montant')
            ->withSum(['transactions as decaissements' => fn ($q) => $q->where('type', 'decaissement')->whereBetween('date_transaction', [$debut, $fin])->where('statut_validation', 'valide')], 'montant')
            ->orderBy('nom')
            ->get()
            ->map(function (Activite $activite) {
                $revenus = (float) ($activite->revenus ?? 0);
                $decaissements = (float) ($activite->decaissements ?? 0);

                return [
                    'id' => $activite->id,
                    'code' => $activite->code,
                    'nom' => $activite->nom,
                    'type_activite' => $activite->typeActivite?->nom,
                    'revenus' => $revenus,
                    'decaissements' => $decaissements,
                    'resultat' => $revenus - $decaissements,
                ];
            });

        $totaux = [
            'revenus' => $activites->sum('revenus'),
            'decaissements' => $activites->sum('decaissements'),
            'resultat' => $activites->sum('resultat'),
        ];

        return $this->ok([
            'donnees' => [
                'periode' => compact('debut', 'fin'),
                'totaux' => $totaux,
                'activites' => $activites,
            ],
        ]);
    }

    public function figer(Request $request): JsonResponse
    {
        $rapport = $this->bilan($request)->getData(true)['donnees'];
        $instantane = InstantaneRapport::create([
            'periode_debut' => $rapport['periode']['debut'],
            'periode_fin' => $rapport['periode']['fin'],
            'donnees' => $rapport,
            'genere_par' => $request->user()->id,
        ]);
        $this->auditer($request, 'figer', 'instantanes_rapports', $instantane->id);

        return $this->ok(['donnees' => $instantane], 'Rapport figé.', 201);
    }
}
