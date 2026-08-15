<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;

trait Multitenant
{
    protected static function bootMultitenant()
    {
        if (app()->runningInConsole()) {
            return;
        }

        static::addGlobalScope('plateforme', function (Builder $builder) {
            $user = auth()->user();

            if ($user && !$user->est_compte_entreprise) {
                $builder->where('plateforme_id', $user->plateforme_id);
            }
        });

        static::creating(function ($model) {
            $user = auth()->user();
            if ($user && !$user->est_compte_entreprise && empty($model->plateforme_id)) {
                $model->plateforme_id = $user->plateforme_id;
            }
        });
    }
}
