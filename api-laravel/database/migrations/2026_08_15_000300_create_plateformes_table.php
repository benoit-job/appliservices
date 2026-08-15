<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plateformes', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('slug', 120)->unique();
            $table->string('email_contact')->nullable();
            $table->string('telephone_contact', 40)->nullable();
            $table->string('adresse')->nullable();
            $table->enum('statut', ['actif', 'suspendu', 'desactive'])->default('actif');
            $table->unsignedInteger('limite_utilisateurs')->default(10);
            $table->unsignedInteger('limite_activites')->default(25);
            $table->json('options')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->foreignId('plateforme_id')->nullable()->after('id')->constrained('plateformes')->nullOnDelete();
            $table->boolean('est_compte_entreprise')->default(false)->after('role_id');
            $table->index(['plateforme_id', 'statut']);
        });

        Schema::table('types_activites', function (Blueprint $table) {
            $table->foreignId('plateforme_id')->nullable()->after('id')->constrained('plateformes')->cascadeOnDelete();
            $table->index(['plateforme_id', 'actif']);
        });

        Schema::table('categories_transactions', function (Blueprint $table) {
            $table->foreignId('plateforme_id')->nullable()->after('id')->constrained('plateformes')->cascadeOnDelete();
            $table->index(['plateforme_id', 'nature', 'actif']);
        });

        Schema::table('activites', function (Blueprint $table) {
            $table->foreignId('plateforme_id')->nullable()->after('id')->constrained('plateformes')->cascadeOnDelete();
            $table->index(['plateforme_id', 'statut']);
        });
    }

    public function down(): void
    {
        Schema::table('activites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plateforme_id');
        });
        Schema::table('categories_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plateforme_id');
        });
        Schema::table('types_activites', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plateforme_id');
        });
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropIndex(['plateforme_id', 'statut']);
            $table->dropColumn('est_compte_entreprise');
            $table->dropConstrainedForeignId('plateforme_id');
        });
        Schema::dropIfExists('plateformes');
    }
};
