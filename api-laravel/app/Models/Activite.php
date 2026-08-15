<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Multitenant;

class Activite extends Model
{
    use SoftDeletes, Multitenant;

    protected $table = 'activites';

    protected $fillable = [
        'plateforme_id',
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

    public function plateforme(): BelongsTo
    {
        return $this->belongsTo(Plateforme::class);
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
