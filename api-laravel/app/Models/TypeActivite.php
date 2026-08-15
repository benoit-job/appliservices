<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Multitenant;

class TypeActivite extends Model
{
    use SoftDeletes, Multitenant;

    protected $table = 'types_activites';

    protected $fillable = [
        'plateforme_id',
        'nom',
        'slug',
        'a_versement_recurrent',
        'frequence_versement',
        'schema_champs',
        'icone',
        'couleur',
        'actif',
    ];

    protected $casts = [
        'a_versement_recurrent' => 'boolean',
        'schema_champs' => 'array',
        'actif' => 'boolean',
    ];

    public function activites(): HasMany
    {
        return $this->hasMany(Activite::class);
    }

    public function plateforme(): BelongsTo
    {
        return $this->belongsTo(Plateforme::class);
    }
}
