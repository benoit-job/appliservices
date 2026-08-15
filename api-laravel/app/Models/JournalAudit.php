<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JournalAudit extends Model
{
    protected $table = 'journaux_audit';

    protected $fillable = ['utilisateur_id', 'action', 'entite', 'entite_id', 'details', 'adresse_ip', 'agent_utilisateur'];

    protected $casts = ['details' => 'array'];

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
