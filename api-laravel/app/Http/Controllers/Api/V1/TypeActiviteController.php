<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\TypeActivite;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TypeActiviteController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = TypeActivite::withCount('activites')->orderBy('nom');
        if ($request->has('plateforme_id')) {
            $query->where('plateforme_id', $request->input('plateforme_id'));
        }
        return $this->ok(['donnees' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $this->valider($request);
        $donnees['slug'] = $donnees['slug'] ?? Str::slug($donnees['nom']);
        $type = TypeActivite::create($donnees);
        $this->auditer($request, 'creer', 'types_activites', $type->id, $donnees);

        return $this->ok(['donnees' => $type], 'Type d’activité créé.', 201);
    }

    public function update(Request $request, TypeActivite $typeActivite): JsonResponse
    {
        $donnees = $this->valider($request, $typeActivite->id);
        $donnees['slug'] = $donnees['slug'] ?? Str::slug($donnees['nom']);
        $typeActivite->update($donnees);
        $this->auditer($request, 'modifier', 'types_activites', $typeActivite->id, $donnees);

        return $this->ok(['donnees' => $typeActivite->refresh()], 'Type d’activité modifié.');
    }

    public function destroy(Request $request, TypeActivite $typeActivite): JsonResponse
    {
        $typeActivite->delete();
        $this->auditer($request, 'supprimer', 'types_activites', $typeActivite->id);

        return $this->ok(message: 'Type d’activité désactivé.');
    }

    private function valider(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'plateforme_id' => ['nullable', 'exists:plateformes,id'],
            'nom' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:100', Rule::unique('types_activites', 'slug')->ignore($id)],
            'a_versement_recurrent' => ['boolean'],
            'frequence_versement' => ['required', Rule::in(['journalier', 'hebdomadaire', 'mensuel', 'aucun'])],
            'schema_champs' => ['nullable'],
            'icone' => ['nullable', 'string', 'max:80'],
            'couleur' => ['nullable', 'string', 'max:30'],
            'actif' => ['boolean'],
        ]);
    }
}
