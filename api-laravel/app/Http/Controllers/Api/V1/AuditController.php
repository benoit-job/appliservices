<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\JournalAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        return $this->ok([
            'donnees' => JournalAudit::with('utilisateur:id,nom,email')
                ->when($request->filled('entite'), fn ($q) => $q->where('entite', $request->string('entite')))
                ->latest()
                ->paginate($request->integer('par_page', 50)),
        ]);
    }
}
