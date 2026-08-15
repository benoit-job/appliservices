<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Transaction extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'activite_id',
        'categorie_id',
        'type',
        'montant',
        'echeance_id',
        'mode_paiement',
        'date_transaction',
        'saisi_par',
        'justificatif_path',
        'statut_validation',
        'valide_par',
        'valide_le',
        'note',
    ];

    protected $casts = [
        'montant' => 'decimal:2',
        'date_transaction' => 'date',
        'valide_le' => 'datetime',
    ];

    public function activite(): BelongsTo
    {
        return $this->belongsTo(Activite::class);
    }

    public function categorie(): BelongsTo
    {
        return $this->belongsTo(CategorieTransaction::class);
    }

    public function echeance(): BelongsTo
    {
        return $this->belongsTo(EcheanceVersement::class);
    }

    public function auteur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'saisi_par');
    }
}
