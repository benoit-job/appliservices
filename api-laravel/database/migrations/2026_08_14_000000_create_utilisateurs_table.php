<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('utilisateurs', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('email')->unique();
            $table->timestamp('email_verifie_le')->nullable();
            $table->string('mot_de_passe');
            $table->string('telephone', 40)->nullable();
            $table->string('avatar_url')->nullable();
            $table->enum('statut', ['actif', 'suspendu', 'desactive'])->default('actif');
            $table->timestamp('derniere_connexion')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('reinitialisations_mots_de_passe', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('jeton');
            $table->timestamp('cree_le')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('utilisateur_id')->nullable()->index();
            $table->string('adresse_ip', 45)->nullable();
            $table->text('agent_utilisateur')->nullable();
            $table->longText('donnees');
            $table->integer('derniere_activite')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('reinitialisations_mots_de_passe');
        Schema::dropIfExists('utilisateurs');
    }
};
