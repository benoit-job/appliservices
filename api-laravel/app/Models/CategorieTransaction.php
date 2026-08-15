<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CategorieTransaction extends Model
{
    use SoftDeletes;

    protected $table = 'categories_transactions';

    protected $fillable = ['type_activite_id', 'nom', 'nature', 'actif'];

    protected $casts = ['actif' => 'boolean'];

    public function typeActivite(): BelongsTo
    {
        return $this->belongsTo(TypeActivite::class);
    }
}
