<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MouvementInventaire extends Model
{
    use SoftDeletes;

    protected $table = 'mouvements_inventaire';

    protected $fillable = [
        'article_inventaire_id',
        'type_mouvement',
        'quantite',
        'motif',
        'transaction_id',
        'saisi_par',
        'date_mouvement',
    ];

    protected $casts = [
        'quantite' => 'decimal:2',
        'date_mouvement' => 'date',
    ];

    public function article(): BelongsTo
    {
        return $this->belongsTo(ArticleInventaire::class, 'article_inventaire_id');
    }
}
