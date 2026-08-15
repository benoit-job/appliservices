<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Parametre extends Model
{
    protected $primaryKey = 'cle';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['cle', 'valeur', 'description'];
}
