<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->nettoyerEtatPartiel();

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 100);
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('nom', 120);
            $table->string('slug', 120)->unique();
            $table->timestamps();
        });

        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->after('id')->constrained('roles')->nullOnDelete();
        });

        Schema::create('types_activites', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('slug', 100)->unique();
            $table->boolean('a_versement_recurrent')->default(false);
            $table->enum('frequence_versement', ['journalier', 'hebdomadaire', 'mensuel', 'aucun'])->default('aucun');
            $table->json('schema_champs')->nullable();
            $table->string('icone', 80)->nullable();
            $table->string('couleur', 30)->nullable();
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('activites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('type_activite_id')->constrained('types_activites');
            $table->string('nom');
            $table->string('code', 30)->unique();
            $table->foreignId('gerant_utilisateur_id')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->json('attributs')->nullable();
            $table->decimal('montant_versement', 12, 2)->default(0);
            $table->date('date_demarrage')->nullable();
            $table->enum('statut', ['actif', 'en_pause', 'cede', 'cloture'])->default('actif');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['type_activite_id', 'statut']);
        });

        Schema::create('categories_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('type_activite_id')->nullable()->constrained('types_activites')->nullOnDelete();
            $table->string('nom', 120);
            $table->enum('nature', ['revenu', 'decaissement']);
            $table->boolean('actif')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['nature', 'actif']);
        });

        Schema::create('echeances_versements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activite_id')->constrained('activites')->cascadeOnDelete();
            $table->date('debut_periode');
            $table->date('fin_periode');
            $table->decimal('montant_attendu', 12, 2)->default(0);
            $table->decimal('montant_paye', 12, 2)->default(0);
            $table->enum('statut', ['a_venir', 'paye', 'partiel', 'en_retard', 'impaye'])->default('a_venir');
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['activite_id', 'debut_periode', 'fin_periode'], 'uniq_echeance_activite_periode');
            $table->index(['fin_periode', 'statut']);
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activite_id')->constrained('activites')->cascadeOnDelete();
            $table->foreignId('categorie_id')->nullable()->constrained('categories_transactions')->nullOnDelete();
            $table->enum('type', ['revenu', 'decaissement']);
            $table->decimal('montant', 12, 2);
            $table->foreignId('echeance_id')->nullable()->constrained('echeances_versements')->nullOnDelete();
            $table->enum('mode_paiement', ['especes', 'mobile_money', 'banque', 'autre'])->default('especes');
            $table->date('date_transaction');
            $table->foreignId('saisi_par')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->string('justificatif_path')->nullable();
            $table->enum('statut_validation', ['brouillon', 'en_attente', 'valide', 'rejete'])->default('valide');
            $table->foreignId('valide_par')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->timestamp('valide_le')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['type', 'date_transaction']);
            $table->index('activite_id');
        });

        Schema::create('articles_inventaire', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activite_id')->constrained('activites')->cascadeOnDelete();
            $table->string('nom', 150);
            $table->enum('type_article', ['bien_durable', 'stock_consommable', 'cheptel']);
            $table->decimal('quantite', 10, 2)->default(0);
            $table->string('unite', 30)->default('unite');
            $table->decimal('valeur_unitaire', 12, 2)->default(0);
            $table->decimal('seuil_alerte', 10, 2)->nullable();
            $table->json('attributs')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('activite_id');
        });

        Schema::create('mouvements_inventaire', function (Blueprint $table) {
            $table->id();
            $table->foreignId('article_inventaire_id')->constrained('articles_inventaire')->cascadeOnDelete();
            $table->enum('type_mouvement', ['entree', 'sortie', 'ajustement']);
            $table->decimal('quantite', 10, 2);
            $table->string('motif', 150);
            $table->foreignId('transaction_id')->nullable()->constrained('transactions')->nullOnDelete();
            $table->foreignId('saisi_par')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->date('date_mouvement');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->nullable()->constrained('utilisateurs')->cascadeOnDelete();
            $table->string('titre', 180);
            $table->text('message');
            $table->enum('type_notification', ['info', 'alerte', 'retard', 'stock', 'rapport'])->default('info');
            $table->boolean('lu')->default(false);
            $table->timestamp('lu_le')->nullable();
            $table->timestamps();
        });

        Schema::create('journaux_audit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->string('action', 120);
            $table->string('entite', 120);
            $table->unsignedBigInteger('entite_id')->nullable();
            $table->json('details')->nullable();
            $table->string('adresse_ip', 80)->nullable();
            $table->string('agent_utilisateur')->nullable();
            $table->timestamps();
            $table->index(['entite', 'entite_id']);
        });

        Schema::create('instantanes_rapports', function (Blueprint $table) {
            $table->id();
            $table->date('periode_debut');
            $table->date('periode_fin');
            $table->json('donnees');
            $table->foreignId('genere_par')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('parametres', function (Blueprint $table) {
            $table->string('cle', 120)->primary();
            $table->text('valeur')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parametres');
        Schema::dropIfExists('instantanes_rapports');
        Schema::dropIfExists('journaux_audit');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('mouvements_inventaire');
        Schema::dropIfExists('articles_inventaire');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('echeances_versements');
        Schema::dropIfExists('categories_transactions');
        Schema::dropIfExists('activites');
        Schema::dropIfExists('types_activites');
        if (Schema::hasColumn('utilisateurs', 'role_id')) {
            Schema::table('utilisateurs', fn (Blueprint $table) => $table->dropConstrainedForeignId('role_id'));
        }
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }

    private function nettoyerEtatPartiel(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::dropIfExists('parametres');
        Schema::dropIfExists('instantanes_rapports');
        Schema::dropIfExists('journaux_audit');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('mouvements_inventaire');
        Schema::dropIfExists('articles_inventaire');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('echeances_versements');
        Schema::dropIfExists('categories_transactions');
        Schema::dropIfExists('activites');
        Schema::dropIfExists('types_activites');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('permissions');

        if (Schema::hasColumn('utilisateurs', 'role_id')) {
            Schema::table('utilisateurs', function (Blueprint $table) {
                $table->dropConstrainedForeignId('role_id');
            });
        }

        Schema::dropIfExists('roles');
        Schema::enableForeignKeyConstraints();
    }
};
