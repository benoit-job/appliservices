<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Plateforme extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nom',
        'slug',
        'email_contact',
        'telephone_contact',
        'adresse',
        'statut',
        'limite_utilisateurs',
        'limite_activites',
        'image_url',
        'options',
    ];

    protected $casts = [
        'limite_utilisateurs' => 'integer',
        'limite_activites' => 'integer',
        'options' => 'array',
    ];

    public function utilisateurs(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function activites(): HasMany
    {
        return $this->hasMany(Activite::class);
    }

    public function typesActivites(): HasMany
    {
        return $this->hasMany(TypeActivite::class);
    }

    public function categoriesTransactions(): HasMany
    {
        return $this->hasMany(CategorieTransaction::class);
    }
}
