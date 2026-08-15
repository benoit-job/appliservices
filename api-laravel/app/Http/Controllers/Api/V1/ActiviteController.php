<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Activite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ActiviteController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Activite::with(['typeActivite:id,nom,couleur,icone', 'gerant:id,nom,email'])
            ->withCount(['transactions', 'articlesInventaire'])
            ->latest();

        if ($request->has('plateforme_id')) {
            $query->where('plateforme_id', $request->input('plateforme_id'));
        }

        return $this->ok([
            'donnees' => $query->get(),
        ]);
    }

    public function show(Activite $activite): JsonResponse
    {
        return $this->ok([
            'donnees' => $activite->load(['typeActivite', 'gerant', 'transactions.categorie', 'echeancesVersements', 'articlesInventaire']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $this->valider($request);
        $activite = Activite::create($donnees);
        $this->auditer($request, 'creer', 'activites', $activite->id, $donnees);

        return $this->ok(['donnees' => $activite->load('typeActivite')], 'Activité créée.', 201);
    }

    public function update(Request $request, Activite $activite): JsonResponse
    {
        $donnees = $this->valider($request, $activite->id);
        $activite->update($donnees);
        $this->auditer($request, 'modifier', 'activites', $activite->id, $donnees);

        return $this->ok(['donnees' => $activite->refresh()->load('typeActivite')], 'Activité modifiée.');
    }

    public function destroy(Request $request, Activite $activite): JsonResponse
    {
        $activite->delete();
        $this->auditer($request, 'supprimer', 'activites', $activite->id);

        return $this->ok(message: 'Activité archivée.');
    }

    private function valider(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'type_activite_id' => ['required', 'exists:types_activites,id'],
            'nom' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:30', Rule::unique('activites', 'code')->ignore($id)],
            'gerant_utilisateur_id' => ['nullable', 'exists:utilisateurs,id'],
            'attributs' => ['nullable', 'array'],
            'montant_versement' => ['nullable', 'numeric', 'min:0'],
            'date_demarrage' => ['nullable', 'date'],
            'statut' => ['required', Rule::in(['actif', 'en_pause', 'cede', 'cloture'])],
        ]);
    }
}
