<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EcheanceVersement extends Model
{
    use SoftDeletes;

    protected $table = 'echeances_versements';

    protected $fillable = [
        'activite_id',
        'debut_periode',
        'fin_periode',
        'montant_attendu',
        'montant_paye',
        'statut',
    ];

    protected $casts = [
        'debut_periode' => 'date',
        'fin_periode' => 'date',
        'montant_attendu' => 'decimal:2',
        'montant_paye' => 'decimal:2',
    ];

    public function activite(): BelongsTo
    {
        return $this->belongsTo(Activite::class);
    }
}
