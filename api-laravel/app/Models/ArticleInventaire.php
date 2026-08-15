<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ArticleInventaire extends Model
{
    use SoftDeletes;

    protected $table = 'articles_inventaire';

    protected $fillable = [
        'activite_id',
        'nom',
        'type_article',
        'quantite',
        'unite',
        'valeur_unitaire',
        'seuil_alerte',
        'attributs',
    ];

    protected $casts = [
        'quantite' => 'decimal:2',
        'valeur_unitaire' => 'decimal:2',
        'seuil_alerte' => 'decimal:2',
        'attributs' => 'array',
    ];

    public function activite(): BelongsTo
    {
        return $this->belongsTo(Activite::class);
    }

    public function mouvements(): HasMany
    {
        return $this->hasMany(MouvementInventaire::class);
    }
}
