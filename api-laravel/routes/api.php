<?php

use App\Http\Controllers\Api\V1\ActiviteController;
use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\GraphiqueController;
use App\Http\Controllers\Api\V1\EcheanceVersementController;
use App\Http\Controllers\Api\V1\InventaireController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ParametreController;
use App\Http\Controllers\Api\V1\RapportController;
use App\Http\Controllers\Api\V1\ReferenceController;
use App\Http\Controllers\Api\V1\TransactionController;
use App\Http\Controllers\Api\V1\TypeActiviteController;
use App\Http\Controllers\Api\V1\UtilisateurController;
use App\Models\ArticleInventaire;
use App\Models\Transaction;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('connexion', [AuthController::class, 'connexion'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('moi', [AuthController::class, 'moi']);
        Route::post('deconnexion', [AuthController::class, 'deconnexion']);
        Route::get('references', [ReferenceController::class, 'index']);
        Route::get('tableau-bord', [DashboardController::class, 'index']);
        Route::get('graphiques/types', [GraphiqueController::class, 'types']);
        Route::get('graphiques/vue-ensemble', [GraphiqueController::class, 'vueEnsemble']);
        Route::get('graphiques', [GraphiqueController::class, 'show']);

        Route::get('types-activites', [TypeActiviteController::class, 'index']);
        Route::post('types-activites', [TypeActiviteController::class, 'store']);
        Route::put('types-activites/{typeActivite}', [TypeActiviteController::class, 'update']);
        Route::delete('types-activites/{typeActivite}', [TypeActiviteController::class, 'destroy']);

        Route::apiResource('activites', ActiviteController::class);

        Route::get('transactions', [TransactionController::class, 'index']);
        Route::post('transactions', [TransactionController::class, 'store']);
        Route::put('transactions/{transaction}', [TransactionController::class, 'update']);
        Route::patch('transactions/{transaction}/validation', [TransactionController::class, 'valider']);
        Route::delete('transactions/{transaction}', [TransactionController::class, 'destroy']);

        Route::get('echeances-versements', [EcheanceVersementController::class, 'index']);
        Route::post('echeances-versements/generer', [EcheanceVersementController::class, 'generer']);

        Route::get('inventaire', [InventaireController::class, 'index']);
        Route::post('inventaire', [InventaireController::class, 'store']);
        Route::put('inventaire/{article}', [InventaireController::class, 'update']);
        Route::post('inventaire/{article}/mouvements', [InventaireController::class, 'mouvement']);
        Route::get('inventaire/{article}/mouvements', [InventaireController::class, 'mouvements']);
        Route::bind('article', fn (string $value) => ArticleInventaire::findOrFail($value));
        Route::bind('transaction', fn (string $value) => Transaction::findOrFail($value));

        Route::get('rapports/bilan', [RapportController::class, 'bilan']);
        Route::post('rapports/figer', [RapportController::class, 'figer']);

        Route::apiResource('utilisateurs', UtilisateurController::class)->except(['show']);
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::patch('notifications/{notification}/lue', [NotificationController::class, 'marquerLue']);
        Route::get('audit', [AuditController::class, 'index']);
        Route::get('parametres', [ParametreController::class, 'index']);
        Route::put('parametres', [ParametreController::class, 'update']);
    });
});
