<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CategorieTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategorieTransactionController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = CategorieTransaction::orderBy('nature')->orderBy('nom');
        if ($request->has('plateforme_id')) {
            $query->where('plateforme_id', $request->input('plateforme_id'));
        }
        return $this->ok(['donnees' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $this->valider($request);
        $categorie = CategorieTransaction::create($donnees);
        $this->auditer($request, 'creer', 'categories_transactions', $categorie->id, $donnees);

        return $this->ok(['donnees' => $categorie], 'Catégorie financière créée.', 201);
    }

    public function update(Request $request, CategorieTransaction $categories_transaction): JsonResponse
    {
        // $categories_transaction parameter name must match route parameter name 'categories_transaction' based on apiResource('categories-transactions')
        $donnees = $this->valider($request, $categories_transaction->id);
        $categories_transaction->update($donnees);
        $this->auditer($request, 'modifier', 'categories_transactions', $categories_transaction->id, $donnees);

        return $this->ok(['donnees' => $categories_transaction->refresh()], 'Catégorie financière modifiée.');
    }

    public function destroy(Request $request, CategorieTransaction $categories_transaction): JsonResponse
    {
        $categories_transaction->delete();
        $this->auditer($request, 'supprimer', 'categories_transactions', $categories_transaction->id);

        return $this->ok(message: 'Catégorie financière supprimée.');
    }

    private function valider(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'plateforme_id' => ['nullable', 'exists:plateformes,id'],
            'type_activite_id' => ['nullable', 'exists:types_activites,id'],
            'nom' => ['required', 'string', 'max:100'],
            'nature' => ['required', Rule::in(['revenu', 'decaissement'])],
            'actif' => ['boolean'],
        ]);
    }
}
