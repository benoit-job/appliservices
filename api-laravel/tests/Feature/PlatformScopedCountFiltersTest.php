<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\V1\ActiviteController;
use App\Http\Controllers\Api\V1\UtilisateurController;
use App\Models\Activite;
use App\Models\Plateforme;
use App\Models\TypeActivite;
use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class PlatformScopedCountFiltersTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('activites');
        Schema::dropIfExists('types_activites');
        Schema::dropIfExists('utilisateurs');
        Schema::dropIfExists('plateformes');

        Schema::create('plateformes', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('slug')->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('utilisateurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plateforme_id')->nullable()->constrained('plateformes');
            $table->string('nom');
            $table->string('email')->unique();
            $table->string('mot_de_passe')->nullable();
            $table->string('statut')->default('actif');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('types_activites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plateforme_id')->nullable()->constrained('plateformes');
            $table->string('nom');
            $table->string('slug')->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('activites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plateforme_id')->nullable()->constrained('plateformes');
            $table->foreignId('type_activite_id')->nullable()->constrained('types_activites');
            $table->string('nom');
            $table->string('code')->unique();
            $table->string('statut')->default('actif');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activite_id')->nullable()->constrained('activites');
            $table->string('categorie')->default('default');
            $table->decimal('montant', 12, 2)->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('articles_inventaire', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activite_id')->nullable()->constrained('activites');
            $table->string('nom');
            $table->integer('quantite')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function test_utilisateur_index_filters_by_plateforme_id(): void
    {
        $plateformeA = Plateforme::create(['nom' => 'Alpha', 'slug' => 'alpha']);
        $plateformeB = Plateforme::create(['nom' => 'Beta', 'slug' => 'beta']);

        User::create(['plateforme_id' => $plateformeA->id, 'nom' => 'Alice', 'email' => 'alice@example.com', 'mot_de_passe' => 'secret', 'statut' => 'actif']);
        User::create(['plateforme_id' => $plateformeB->id, 'nom' => 'Bob', 'email' => 'bob@example.com', 'mot_de_passe' => 'secret', 'statut' => 'actif']);

        $response = (new UtilisateurController())->index(new Request(['plateforme_id' => $plateformeA->id]));
        $data = $response->getData(true);

        $this->assertCount(1, $data['donnees']);
        $this->assertSame($plateformeA->id, $data['donnees'][0]['plateforme_id']);
    }

    public function test_activite_index_filters_by_plateforme_id(): void
    {
        $plateformeA = Plateforme::create(['nom' => 'Alpha', 'slug' => 'alpha-2']);
        $plateformeB = Plateforme::create(['nom' => 'Beta', 'slug' => 'beta-2']);

        $typeA = TypeActivite::create(['plateforme_id' => $plateformeA->id, 'nom' => 'Vente', 'slug' => 'vente']);
        $typeB = TypeActivite::create(['plateforme_id' => $plateformeB->id, 'nom' => 'Stock', 'slug' => 'stock']);

        Activite::create(['plateforme_id' => $plateformeA->id, 'type_activite_id' => $typeA->id, 'nom' => 'Boutique', 'code' => 'BOUTIQUE-1', 'statut' => 'actif']);
        Activite::create(['plateforme_id' => $plateformeB->id, 'type_activite_id' => $typeB->id, 'nom' => 'Magasin', 'code' => 'MAGASIN-1', 'statut' => 'actif']);

        $response = (new ActiviteController())->index(new Request(['plateforme_id' => $plateformeA->id]));
        $data = $response->getData(true);

        $this->assertCount(1, $data['donnees']);
        $this->assertSame($plateformeA->id, $data['donnees'][0]['plateforme_id']);
    }
}
