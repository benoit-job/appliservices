<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Traits\Multitenant;

class CategorieTransaction extends Model
{
    use SoftDeletes, Multitenant;

    protected $table = 'categories_transactions';

    protected $fillable = ['plateforme_id', 'type_activite_id', 'nom', 'nature', 'actif'];

    protected $casts = ['actif' => 'boolean'];

    public function typeActivite(): BelongsTo
    {
        return $this->belongsTo(TypeActivite::class);
    }

    public function plateforme(): BelongsTo
    {
        return $this->belongsTo(Plateforme::class);
    }
}
