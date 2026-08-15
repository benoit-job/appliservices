<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UtilisateurController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->ok([
            'donnees' => User::with('role:id,nom,slug')
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $this->valider($request);
        $donnees['mot_de_passe'] = Hash::make($donnees['mot_de_passe']);
        $utilisateur = User::create($donnees);
        $this->auditer($request, 'creer', 'utilisateurs', $utilisateur->id, ['email' => $utilisateur->email]);

        return $this->ok(['donnees' => $utilisateur->load('role')], 'Utilisateur créé.', 201);
    }

    public function update(Request $request, User $utilisateur): JsonResponse
    {
        $donnees = $this->valider($request, $utilisateur->id);
        if (!empty($donnees['mot_de_passe'])) {
            $donnees['mot_de_passe'] = Hash::make($donnees['mot_de_passe']);
        } else {
            unset($donnees['mot_de_passe']);
        }
        $utilisateur->update($donnees);
        $this->auditer($request, 'modifier', 'utilisateurs', $utilisateur->id, ['email' => $utilisateur->email]);

        return $this->ok(['donnees' => $utilisateur->refresh()->load('role')], 'Utilisateur modifié.');
    }

    public function destroy(Request $request, User $utilisateur): JsonResponse
    {
        $utilisateur->update(['statut' => 'desactive']);
        $utilisateur->tokens()->delete();
        $this->auditer($request, 'desactiver', 'utilisateurs', $utilisateur->id);

        return $this->ok(message: 'Utilisateur désactivé.');
    }

    private function valider(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'role_id' => ['nullable', 'exists:roles,id'],
            'nom' => ['required', 'string', 'max:180'],
            'email' => ['required', 'email', 'max:180', Rule::unique('utilisateurs', 'email')->ignore($id)],
            'mot_de_passe' => [$id ? 'nullable' : 'required', 'string', 'min:8'],
            'telephone' => ['nullable', 'string', 'max:40'],
            'avatar_url' => ['nullable', 'string', 'max:255'],
            'statut' => ['required', Rule::in(['actif', 'suspendu', 'desactive'])],
        ]);
    }
}
