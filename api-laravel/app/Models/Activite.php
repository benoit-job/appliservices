<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Activite extends Model
{
    use SoftDeletes;

    protected $table = 'activites';

    protected $fillable = [
        'type_activite_id',
        'nom',
        'code',
        'gerant_utilisateur_id',
        'attributs',
        'montant_versement',
        'date_demarrage',
        'statut',
    ];

    protected $casts = [
        'attributs' => 'array',
        'montant_versement' => 'decimal:2',
        'date_demarrage' => 'date',
    ];

    public function typeActivite(): BelongsTo
    {
        return $this->belongsTo(TypeActivite::class);
    }

    public function gerant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gerant_utilisateur_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function echeancesVersements(): HasMany
    {
        return $this->hasMany(EcheanceVersement::class);
    }

    public function articlesInventaire(): HasMany
    {
        return $this->hasMany(ArticleInventaire::class);
    }
}
