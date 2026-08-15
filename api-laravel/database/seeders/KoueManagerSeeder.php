<?php

namespace Database\Seeders;

use App\Models\Activite;
use App\Models\ArticleInventaire;
use App\Models\CategorieTransaction;
use App\Models\EcheanceVersement;
use App\Models\Parametre;
use App\Models\Role;
use App\Models\TypeActivite;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class KoueManagerSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['id' => 1, 'nom' => 'Propriétaire', 'slug' => 'proprietaire', 'description' => 'Accès complet à la plateforme'],
            ['id' => 2, 'nom' => 'Gestionnaire', 'slug' => 'gestionnaire', 'description' => 'Gestion quotidienne et validation'],
            ['id' => 3, 'nom' => 'Gérant d’activité', 'slug' => 'gerant', 'description' => 'Saisie limitée aux activités assignées'],
            ['id' => 4, 'nom' => 'Comptable / Auditeur', 'slug' => 'auditeur', 'description' => 'Lecture des données financières'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['id' => $role['id']], $role);
        }

        User::updateOrCreate(
            ['email' => 'admin@kouemanager.local'],
            [
                'role_id' => 1,
                'nom' => 'Administrateur KOUE',
                'mot_de_passe' => Hash::make('Admin@1234'),
                'telephone' => '+2250000000000',
                'statut' => 'actif',
            ]
        );

        $types = [
            [1, 'Moto 2 roues', 'moto-2-roues', true, 'hebdomadaire', ['plaque' => 'texte', 'marque' => 'texte', 'chauffeur' => 'texte'], 'bike', '#0b62b9'],
            [2, 'Moto 3 roues', 'moto-3-roues', true, 'hebdomadaire', ['plaque' => 'texte', 'marque' => 'texte', 'chauffeur' => 'texte'], 'truck', '#f3b20b'],
            [3, 'Élevage de porcs', 'elevage-porcs', false, 'aucun', ['site' => 'texte', 'nombre_tetes' => 'nombre', 'race' => 'texte'], 'warehouse', '#16a34a'],
        ];

        foreach ($types as [$id, $nom, $slug, $versement, $frequence, $schema, $icone, $couleur]) {
            TypeActivite::updateOrCreate(['id' => $id], [
                'nom' => $nom,
                'slug' => $slug,
                'a_versement_recurrent' => $versement,
                'frequence_versement' => $frequence,
                'schema_champs' => $schema,
                'icone' => $icone,
                'couleur' => $couleur,
                'actif' => true,
            ]);
        }

        $categories = [
            [1, null, 'Versement', 'revenu'],
            [2, null, 'Carburant', 'decaissement'],
            [3, null, 'Réparation', 'decaissement'],
            [4, 3, 'Aliment bétail', 'decaissement'],
            [5, 3, 'Vente de porc', 'revenu'],
            [6, null, 'Salaire', 'decaissement'],
            [7, 3, 'Soins vétérinaires', 'decaissement'],
        ];

        foreach ($categories as [$id, $typeId, $nom, $nature]) {
            CategorieTransaction::updateOrCreate(['id' => $id], [
                'type_activite_id' => $typeId,
                'nom' => $nom,
                'nature' => $nature,
                'actif' => true,
            ]);
        }

        $activites = [
            [1, 1, 'Moto Yamaha - 2 roues', 'MOTO-01', ['plaque' => '1234CI', 'marque' => 'Yamaha', 'chauffeur' => 'À affecter'], 25000],
            [2, 1, 'Moto TVS - 2 roues', 'MOTO-02', ['plaque' => '5678CI', 'marque' => 'TVS', 'chauffeur' => 'À affecter'], 25000],
            [3, 2, 'Tricycle cargo', 'MOTO3-01', ['plaque' => '9012CI', 'marque' => 'Bajaj', 'chauffeur' => 'À affecter'], 35000],
            [4, 3, 'Élevage de porcs - Site A', 'ELEV-01', ['site' => 'Site A', 'nombre_tetes' => 12, 'race' => 'Locale'], 0],
        ];

        foreach ($activites as [$id, $typeId, $nom, $code, $attributs, $montant]) {
            Activite::updateOrCreate(['id' => $id], [
                'type_activite_id' => $typeId,
                'nom' => $nom,
                'code' => $code,
                'gerant_utilisateur_id' => 1,
                'attributs' => $attributs,
                'montant_versement' => $montant,
                'date_demarrage' => now()->toDateString(),
                'statut' => 'actif',
            ]);
        }

        $debut = CarbonImmutable::now()->startOfWeek();
        $fin = CarbonImmutable::now()->endOfWeek();
        Activite::where('montant_versement', '>', 0)->get()->each(function (Activite $activite) use ($debut, $fin) {
            EcheanceVersement::updateOrCreate([
                'activite_id' => $activite->id,
                'debut_periode' => $debut->toDateString(),
                'fin_periode' => $fin->toDateString(),
            ], [
                'montant_attendu' => $activite->montant_versement,
                'montant_paye' => 0,
                'statut' => 'a_venir',
            ]);
        });

        $articles = [
            [1, 1, 'Moto Yamaha', 'bien_durable', 1, 'unite', 650000, ['etat' => 'Bon']],
            [2, 2, 'Moto TVS', 'bien_durable', 1, 'unite', 600000, ['etat' => 'Bon']],
            [3, 3, 'Tricycle cargo', 'bien_durable', 1, 'unite', 1500000, ['etat' => 'Bon']],
            [4, 4, 'Cheptel porcin', 'cheptel', 12, 'tete', 45000, ['site' => 'Site A']],
        ];

        foreach ($articles as [$id, $activiteId, $nom, $type, $quantite, $unite, $valeur, $attributs]) {
            ArticleInventaire::updateOrCreate(['id' => $id], [
                'activite_id' => $activiteId,
                'nom' => $nom,
                'type_article' => $type,
                'quantite' => $quantite,
                'unite' => $unite,
                'valeur_unitaire' => $valeur,
                'attributs' => $attributs,
            ]);
        }

        $parametres = [
            ['nom_plateforme', 'KOUE MANAGER', 'Nom affiché dans l’application'],
            ['nom_entreprise', 'KOUECONSOLIDATED', 'Entreprise fondatrice'],
            ['devise', 'FCFA', 'Devise principale'],
            ['jour_cloture_semaine', 'dimanche', 'Jour de clôture des versements'],
            ['logo_plateforme', '/logo-koue.svg', 'Logo utilisé sur les écrans'],
        ];

        foreach ($parametres as [$cle, $valeur, $description]) {
            Parametre::updateOrCreate(['cle' => $cle], compact('valeur', 'description'));
        }
    }
}
