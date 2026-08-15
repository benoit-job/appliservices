<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        return $this->ok([
            'donnees' => Notification::where(function ($query) use ($request) {
                $query->whereNull('utilisateur_id')
                    ->orWhere('utilisateur_id', $request->user()->id);
            })->latest()->limit(100)->get(),
        ]);
    }

    public function marquerLue(Request $request, Notification $notification): JsonResponse
    {
        if ($notification->utilisateur_id && $notification->utilisateur_id !== $request->user()->id) {
            return $this->erreur('Notification inaccessible.', 403);
        }

        $notification->update(['lu' => true, 'lu_le' => now()]);

        return $this->ok(['donnees' => $notification], 'Notification lue.');
    }
}
