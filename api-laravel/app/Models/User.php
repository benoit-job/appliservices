<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Traits\Multitenant;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, Multitenant;

    protected $table = 'utilisateurs';

    protected $fillable = [
        'plateforme_id',
        'role_id',
        'est_compte_entreprise',
        'nom',
        'email',
        'mot_de_passe',
        'telephone',
        'avatar_url',
        'statut',
        'derniere_connexion',
    ];

    protected $hidden = [
        'mot_de_passe',
        'remember_token',
    ];

    public function getAuthPassword(): string
    {
        return $this->mot_de_passe;
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function plateforme(): BelongsTo
    {
        return $this->belongsTo(Plateforme::class);
    }

    protected function casts(): array
    {
        return [
            'est_compte_entreprise' => 'boolean',
            'email_verifie_le' => 'datetime',
            'derniere_connexion' => 'datetime',
            'mot_de_passe' => 'hashed',
        ];
    }
}
