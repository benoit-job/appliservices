<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Plateforme;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PlateformeController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        if (!$this->estCompteEntreprise($request)) {
            return $this->erreur('Accès réservé au compte entreprise.', 403);
        }

        return $this->ok([
            'donnees' => Plateforme::withCount(['utilisateurs', 'activites'])
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (!$this->estCompteEntreprise($request)) {
            return $this->erreur('Accès réservé au compte entreprise.', 403);
        }

        $donnees = $this->valider($request);
        $donnees['slug'] = $donnees['slug'] ?: Str::slug($donnees['nom']);
        $donnees['image_url'] = $this->traiterImage($request, $donnees['image_url'] ?? null);

        $plateforme = Plateforme::create($donnees);
        $role = Role::where('slug', 'proprietaire')->first();

        $utilisateur = User::create([
            'plateforme_id' => $plateforme->id,
            'role_id' => $role?->id,
            'est_compte_entreprise' => false,
            'nom' => $request->input('utilisateur_defaut.nom', 'Administrateur '.$plateforme->nom),
            'email' => $request->input('utilisateur_defaut.email'),
            'mot_de_passe' => Hash::make($request->input('utilisateur_defaut.mot_de_passe')),
            'telephone' => $request->input('utilisateur_defaut.telephone'),
            'statut' => 'actif',
        ]);

        $this->auditer($request, 'creer', 'plateformes', $plateforme->id, [
            'plateforme' => $plateforme->nom,
            'utilisateur_defaut' => $utilisateur->email,
        ]);

        return $this->ok([
            'donnees' => $plateforme->loadCount(['utilisateurs', 'activites']),
            'utilisateur_defaut' => $utilisateur->load('role'),
        ], 'Plateforme créée.', 201);
    }

    public function update(Request $request, Plateforme $plateforme): JsonResponse
    {
        if (!$this->estCompteEntreprise($request)) {
            return $this->erreur('Accès réservé au compte entreprise.', 403);
        }

        $donnees = $this->valider($request, $plateforme->id, false);
        if (array_key_exists('slug', $donnees) && empty($donnees['slug'])) {
            $donnees['slug'] = Str::slug($donnees['nom']);
        }

        $donnees['image_url'] = $this->traiterImage($request, $plateforme->image_url ?? null);
        $plateforme->update($donnees);
        $this->auditer($request, 'modifier', 'plateformes', $plateforme->id, $donnees);

        return $this->ok(['donnees' => $plateforme->refresh()->loadCount(['utilisateurs', 'activites'])], 'Plateforme modifiée.');
    }

    public function changerStatut(Request $request, Plateforme $plateforme): JsonResponse
    {
        if (!$this->estCompteEntreprise($request)) {
            return $this->erreur('Accès réservé au compte entreprise.', 403);
        }

        $donnees = $request->validate([
            'statut' => ['required', Rule::in(['actif', 'suspendu', 'desactive'])],
        ]);

        $plateforme->update($donnees);
        $plateforme->utilisateurs()->update([
            'statut' => $donnees['statut'] === 'actif' ? 'actif' : 'suspendu',
        ]);

        if ($donnees['statut'] !== 'actif') {
            $plateforme->utilisateurs()->each(fn (User $user) => $user->tokens()->delete());
        }

        $this->auditer($request, $donnees['statut'], 'plateformes', $plateforme->id);

        return $this->ok(['donnees' => $plateforme->refresh()->loadCount(['utilisateurs', 'activites'])], 'Statut plateforme mis à jour.');
    }

    private function valider(Request $request, ?int $id = null, bool $avecUtilisateurDefaut = true): array
    {
        $regles = [
            'nom' => ['required', 'string', 'max:180'],
            'slug' => ['nullable', 'string', 'max:120', Rule::unique('plateformes', 'slug')->ignore($id)],
            'email_contact' => ['nullable', 'email', 'max:180'],
            'telephone_contact' => ['nullable', 'string', 'max:40'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'statut' => ['required', Rule::in(['actif', 'suspendu', 'desactive'])],
            'limite_utilisateurs' => ['required', 'integer', 'min:1', 'max:10000'],
            'limite_activites' => ['required', 'integer', 'min:1', 'max:100000'],
            'image_url' => ['nullable', 'string', 'max:255'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'options' => ['nullable', 'array'],
        ];

        if ($avecUtilisateurDefaut) {
            $regles += [
                'utilisateur_defaut.nom' => ['required', 'string', 'max:180'],
                'utilisateur_defaut.email' => ['required', 'email', 'max:180', 'unique:utilisateurs,email'],
                'utilisateur_defaut.mot_de_passe' => ['required', 'string', 'min:8'],
                'utilisateur_defaut.telephone' => ['nullable', 'string', 'max:40'],
            ];
        }

        return $request->validate($regles);
    }

    private function traiterImage(Request $request, ?string $imageActuelle = null): ?string
    {
        if (!$request->hasFile('image')) {
            return $request->input('image_url', $imageActuelle);
        }

        $fichier = $request->file('image');
        if (!$fichier || !$fichier->isValid()) {
            return $imageActuelle;
        }

        if ($imageActuelle) {
            $ancienChemin = str_replace('/storage/', '', $imageActuelle);
            Storage::disk('public')->delete($ancienChemin);
        }

        $chemin = $fichier->store('plateformes', 'public');

        return '/storage/' . str_replace('\\', '/', $chemin);
    }
}
