<?php

namespace App\Http\Controllers\Api\V1;

use App\Services\ChartDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GraphiqueController extends ApiController
{
    public function __construct(private readonly ChartDataService $charts)
    {
    }

    public function types(): JsonResponse
    {
        return $this->ok([
            'types' => array_values($this->charts->typesDisponibles()),
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $filtres = $this->validerFiltres($request);

        if (empty($filtres['type'])) {
            return $this->erreur('Le paramètre type est requis.', 422);
        }

        try {
            $graphique = $this->charts->generer($filtres['type'], $filtres);
        } catch (\InvalidArgumentException $exception) {
            return $this->erreur($exception->getMessage(), 422);
        }

        return $this->ok(['graphique' => $graphique]);
    }

    public function vueEnsemble(Request $request): JsonResponse
    {
        $filtres = $this->validerFiltres($request);
        $types = null;

        if ($request->filled('types')) {
            $types = array_filter(array_map('trim', explode(',', (string) $request->input('types'))));
        }

        $graphiques = $this->charts->vueEnsemble($filtres, $types ?: null);

        return $this->ok([
            'filtres' => [
                'debut' => $filtres['debut'] ?? now()->startOfMonth()->toDateString(),
                'fin' => $filtres['fin'] ?? now()->endOfMonth()->toDateString(),
                'granularite' => $filtres['granularite'] ?? 'jour',
                'activite_id' => $filtres['activite_id'] ?? null,
                'type_transaction' => $filtres['type_transaction'] ?? null,
            ],
            'graphiques' => $graphiques,
        ]);
    }

    /** @return array<string, mixed> */
    private function validerFiltres(Request $request): array
    {
        return $request->validate([
            'type' => ['nullable', 'string'],
            'debut' => ['nullable', 'date'],
            'fin' => ['nullable', 'date', 'after_or_equal:debut'],
            'granularite' => ['nullable', 'in:jour,semaine,mois'],
            'activite_id' => ['nullable', 'integer', 'exists:activites,id'],
            'type_transaction' => ['nullable', 'in:revenu,decaissement'],
        ]);
    }
}
