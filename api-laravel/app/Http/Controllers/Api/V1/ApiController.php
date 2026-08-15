<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\JournalAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class ApiController extends Controller
{
    protected function ok(array $data = [], string $message = 'OK', int $code = 200): JsonResponse
    {
        return response()->json([
            'statut' => 'ok',
            'message' => $message,
            ...$data,
        ], $code);
    }

    protected function erreur(string $message, int $code = 422, array $erreurs = []): JsonResponse
    {
        return response()->json([
            'statut' => 'erreur',
            'message' => $message,
            'erreurs' => $erreurs,
        ], $code);
    }

    protected function auditer(Request $request, string $action, string $entite, ?int $entiteId = null, array $details = []): void
    {
        JournalAudit::create([
            'utilisateur_id' => $request->user()?->id,
            'action' => $action,
            'entite' => $entite,
            'entite_id' => $entiteId,
            'details' => $details,
            'adresse_ip' => $request->ip(),
            'agent_utilisateur' => substr((string) $request->userAgent(), 0, 255),
        ]);
    }

    protected function estCompteEntreprise(Request $request): bool
    {
        return (bool) $request->user()?->est_compte_entreprise;
    }

    protected function plateformeId(Request $request): ?int
    {
        return $request->user()?->plateforme_id;
    }
}
