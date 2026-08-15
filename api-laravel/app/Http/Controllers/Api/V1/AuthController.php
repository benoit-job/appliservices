<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends ApiController
{
    public function connexion(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'identifiant' => ['required', 'string'],
            'mot_de_passe' => ['required', 'string'],
            'nom_appareil' => ['nullable', 'string', 'max:120'],
        ]);

        $utilisateur = User::with('role')
            ->where(function ($query) use ($donnees) {
                $query->where('email', $donnees['identifiant'])
                      ->orWhere('nom', $donnees['identifiant']);
            })
            ->where('statut', 'actif')
            ->first();

        if (!$utilisateur || !Hash::check($donnees['mot_de_passe'], $utilisateur->mot_de_passe)) {
            throw ValidationException::withMessages([
                'identifiant' => ['Identifiants incorrects.'],
            ]);
        }

        $utilisateur->forceFill(['derniere_connexion' => now()])->save();
        $token = $utilisateur->createToken($donnees['nom_appareil'] ?? 'KOUE MANAGER')->plainTextToken;

        $this->auditer($request, 'connexion', 'utilisateurs', $utilisateur->id);

        return $this->ok([
            'jeton' => $token,
            'type_jeton' => 'Bearer',
            'utilisateur' => $utilisateur,
        ], 'Connexion réussie.');
    }

    public function moi(Request $request): JsonResponse
    {
        return $this->ok(['utilisateur' => $request->user()->load('role')]);
    }

    public function deconnexion(Request $request): JsonResponse
    {
        $this->auditer($request, 'deconnexion', 'utilisateurs', $request->user()->id);
        $request->user()->currentAccessToken()?->delete();

        return $this->ok(message: 'Déconnexion réussie.');
    }
}
