<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = ['utilisateur_id', 'titre', 'message', 'type_notification', 'lu', 'lu_le'];

    protected $casts = ['lu' => 'boolean', 'lu_le' => 'datetime'];
}
