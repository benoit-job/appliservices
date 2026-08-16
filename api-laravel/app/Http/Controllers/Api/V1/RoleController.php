<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class RoleController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        return $this->ok([
            'donnees' => Role::with('permissions')->orderBy('nom')->get(),
            'permissions' => Permission::orderBy('nom')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'nom' => ['required', 'string', 'max:100', 'unique:roles,nom'],
            'description' => ['nullable', 'string'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['exists:permissions,id'],
        ]);

        $donnees['slug'] = Str::slug($donnees['nom']);
        
        $role = Role::create($donnees);

        if (!empty($donnees['permissions'])) {
            $role->permissions()->sync($donnees['permissions']);
        }

        $this->auditer($request, 'creer', 'roles', $role->id, ['nom' => $role->nom]);

        return $this->ok(['donnees' => $role->load('permissions')], 'Rôle créé avec succès.', 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        if (in_array($role->slug, ['proprietaire', 'super-admin-plateformes'])) {
            return $this->error('Ce rôle système ne peut pas être modifié.', 403);
        }

        $donnees = $request->validate([
            'nom' => ['required', 'string', 'max:100', Rule::unique('roles', 'nom')->ignore($role->id)],
            'description' => ['nullable', 'string'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['exists:permissions,id'],
        ]);

        $donnees['slug'] = Str::slug($donnees['nom']);

        $role->update($donnees);

        if (isset($donnees['permissions'])) {
            $role->permissions()->sync($donnees['permissions']);
        } else {
            $role->permissions()->detach();
        }

        $this->auditer($request, 'modifier', 'roles', $role->id, ['nom' => $role->nom]);

        return $this->ok(['donnees' => $role->refresh()->load('permissions')], 'Rôle modifié avec succès.');
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if (in_array($role->slug, ['proprietaire', 'gestionnaire', 'gerant', 'auditeur', 'super-admin-plateformes'])) {
            return $this->error('Ce rôle système ne peut pas être supprimé.', 403);
        }

        if ($role->utilisateurs()->count() > 0) {
            return $this->error('Ce rôle est assigné à des utilisateurs et ne peut pas être supprimé.', 403);
        }

        $role->delete();
        $this->auditer($request, 'supprimer', 'roles', $role->id);

        return $this->ok(message: 'Rôle supprimé avec succès.');
    }
}
