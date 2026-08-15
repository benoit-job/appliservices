<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Parametre;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametreController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->ok(['donnees' => Parametre::orderBy('cle')->get()]);
    }

    public function update(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'parametres' => ['required', 'array'],
            'parametres.*.cle' => ['required', 'string', 'max:120'],
            'parametres.*.valeur' => ['nullable', 'string'],
            'parametres.*.description' => ['nullable', 'string'],
        ]);

        foreach ($donnees['parametres'] as $parametre) {
            Parametre::updateOrCreate(
                ['cle' => $parametre['cle']],
                [
                    'valeur' => $parametre['valeur'] ?? null,
                    'description' => $parametre['description'] ?? null,
                ]
            );
        }

        $this->auditer($request, 'modifier', 'parametres', null, $donnees);

        return $this->ok(['donnees' => Parametre::orderBy('cle')->get()], 'Paramètres mis à jour.');
    }
}
