<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstantaneRapport extends Model
{
    protected $table = 'instantanes_rapports';

    protected $fillable = ['periode_debut', 'periode_fin', 'donnees', 'genere_par'];

    protected $casts = [
        'periode_debut' => 'date',
        'periode_fin' => 'date',
        'donnees' => 'array',
    ];
}
