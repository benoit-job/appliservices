<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\EcheanceVersement;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TransactionController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $transactions = Transaction::with(['activite:id,nom,code', 'categorie:id,nom,nature', 'auteur:id,nom'])
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('activite_id'), fn ($q) => $q->where('activite_id', $request->integer('activite_id')))
            ->when($request->filled('debut'), fn ($q) => $q->whereDate('date_transaction', '>=', $request->date('debut')))
            ->when($request->filled('fin'), fn ($q) => $q->whereDate('date_transaction', '<=', $request->date('fin')))
            ->latest('date_transaction')
            ->paginate($request->integer('par_page', 50));

        return $this->ok(['donnees' => $transactions]);
    }

    public function store(Request $request): JsonResponse
    {
        $donnees = $this->validerDonnees($request);
        $donnees['saisi_par'] = $request->user()->id;

        if ($request->hasFile('justificatif')) {
            $donnees['justificatif_path'] = $request->file('justificatif')->store('justificatifs', 'public');
        }

        if ($donnees['type'] === 'decaissement' && (float) $donnees['montant'] >= 100000) {
            $donnees['statut_validation'] = 'en_attente';
        }

        $transaction = Transaction::create($donnees);

        if ($transaction->echeance_id && $transaction->type === 'revenu') {
            $this->recalculerEcheance($transaction->echeance_id);
        }

        $this->auditer($request, 'creer', 'transactions', $transaction->id, $donnees);

        return $this->ok(['donnees' => $transaction->load(['activite', 'categorie'])], 'Transaction enregistrée.', 201);
    }

    public function update(Request $request, Transaction $transaction): JsonResponse
    {
        $ancienEcheanceId = $transaction->echeance_id;
        $donnees = $this->validerDonnees($request);
        $transaction->update($donnees);

        if ($ancienEcheanceId) {
            $this->recalculerEcheance($ancienEcheanceId);
        }
        if ($transaction->echeance_id) {
            $this->recalculerEcheance($transaction->echeance_id);
        }

        $this->auditer($request, 'modifier', 'transactions', $transaction->id, $donnees);

        return $this->ok(['donnees' => $transaction->refresh()->load(['activite', 'categorie'])], 'Transaction modifiée.');
    }

    public function valider(Request $request, Transaction $transaction): JsonResponse
    {
        $donnees = $request->validate([
            'statut_validation' => ['required', Rule::in(['valide', 'rejete'])],
        ]);

        $transaction->update([
            'statut_validation' => $donnees['statut_validation'],
            'valide_par' => $request->user()->id,
            'valide_le' => now(),
        ]);

        $this->auditer($request, $donnees['statut_validation'], 'transactions', $transaction->id);

        return $this->ok(['donnees' => $transaction->refresh()], 'Validation enregistrée.');
    }

    public function destroy(Request $request, Transaction $transaction): JsonResponse
    {
        $echeanceId = $transaction->echeance_id;
        $transaction->delete();
        if ($echeanceId) {
            $this->recalculerEcheance($echeanceId);
        }
        $this->auditer($request, 'supprimer', 'transactions', $transaction->id);

        return $this->ok(message: 'Transaction archivée.');
    }

    private function validerDonnees(Request $request): array
    {
        return $request->validate([
            'activite_id' => ['required', 'exists:activites,id'],
            'categorie_id' => ['nullable', 'exists:categories_transactions,id'],
            'type' => ['required', Rule::in(['revenu', 'decaissement'])],
            'montant' => ['required', 'numeric', 'min:1'],
            'echeance_id' => ['nullable', 'exists:echeances_versements,id'],
            'mode_paiement' => ['required', Rule::in(['especes', 'mobile_money', 'banque', 'autre'])],
            'date_transaction' => ['required', 'date'],
            'justificatif' => ['nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
            'note' => ['nullable', 'string'],
        ]);
    }

    private function recalculerEcheance(int $echeanceId): void
    {
        $echeance = EcheanceVersement::find($echeanceId);
        if (!$echeance) {
            return;
        }

        $paye = (float) Transaction::where('echeance_id', $echeanceId)
            ->where('type', 'revenu')
            ->where('statut_validation', 'valide')
            ->sum('montant');

        $statut = match (true) {
            $paye >= (float) $echeance->montant_attendu => 'paye',
            $paye > 0 && $echeance->fin_periode->isPast() => 'partiel',
            $paye > 0 => 'partiel',
            $echeance->fin_periode->isPast() => 'en_retard',
            default => 'a_venir',
        };

        $echeance->update([
            'montant_paye' => $paye,
            'statut' => $statut,
        ]);
    }
}
