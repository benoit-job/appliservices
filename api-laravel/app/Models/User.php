<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $table = 'utilisateurs';

    protected $fillable = [
        'role_id',
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

    protected function casts(): array
    {
        return [
            'email_verifie_le' => 'datetime',
            'derniere_connexion' => 'datetime',
            'mot_de_passe' => 'hashed',
        ];
    }
}
