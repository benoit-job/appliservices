<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class PermissionController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        return $this->ok([
            'donnees' => Permission::with('roles')->orderBy('nom')->get(),
            'roles' => Role::orderBy('nom')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $request->validate([
            'nom' => ['required', 'string', 'max:100', 'unique:permissions,nom'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['exists:roles,id'],
        ]);

        $donnees['slug'] = Str::slug($donnees['nom']);
        
        $permission = Permission::create($donnees);

        if (!empty($donnees['roles'])) {
            $permission->roles()->sync($donnees['roles']);
        }

        $this->auditer($request, 'creer', 'permissions', $permission->id, ['nom' => $permission->nom]);

        return $this->ok(['donnees' => $permission->load('roles')], 'Permission créée avec succès.', 201);
    }

    public function update(Request $request, Permission $permission): JsonResponse
    {
        $donnees = $request->validate([
            'nom' => ['required', 'string', 'max:100', Rule::unique('permissions', 'nom')->ignore($permission->id)],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['exists:roles,id'],
        ]);

        $donnees['slug'] = Str::slug($donnees['nom']);

        $permission->update($donnees);

        if (isset($donnees['roles'])) {
            $permission->roles()->sync($donnees['roles']);
        } else {
            $permission->roles()->detach();
        }

        $this->auditer($request, 'modifier', 'permissions', $permission->id, ['nom' => $permission->nom]);

        return $this->ok(['donnees' => $permission->refresh()->load('roles')], 'Permission modifiée avec succès.');
    }

    public function destroy(Request $request, Permission $permission): JsonResponse
    {
        if ($permission->roles()->count() > 0) {
            return $this->erreur('Cette permission est assignée à des rôles et ne peut pas être supprimée.', 403);
        }

        $permission->delete();
        $this->auditer($request, 'supprimer', 'permissions', $permission->id);

        return $this->ok(message: 'Permission supprimée avec succès.');
    }
}
