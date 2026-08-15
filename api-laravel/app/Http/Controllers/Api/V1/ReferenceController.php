<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Activite;
use App\Models\CategorieTransaction;
use App\Models\TypeActivite;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ReferenceController extends ApiController
{
    public function index(): JsonResponse
    {
        return $this->ok([
            'types_activites' => TypeActivite::where('actif', true)->orderBy('nom')->get(),
            'categories_transactions' => CategorieTransaction::where('actif', true)->orderBy('nature')->orderBy('nom')->get(),
            'activites' => Activite::select('id', 'type_activite_id', 'nom', 'code', 'montant_versement')->orderBy('nom')->get(),
            'utilisateurs' => User::select('id', 'role_id', 'nom', 'email', 'telephone', 'statut')->where('statut', 'actif')->orderBy('nom')->get(),
        ]);
    }
}
