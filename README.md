# KOUE MANAGER

Plateforme multi-activités pour KOUECONSOLIDATED.

Architecture cible livrée dans ce dossier :

- `api-laravel` : API JSON Laravel + Sanctum, base MySQL `appliservices`, migrations, seed admin, commandes planifiées.
- `web-next` : application web Next.js/React/Tailwind consommant l’API Laravel.
- `mobile-expo` : base mobile Expo/React Native consommant la même API, avec token sécurisé et file hors-ligne.
- les anciens fichiers PHP à la racine restent comme prototype historique, mais la vraie suite du projet est dans les trois dossiers ci-dessus.

## Identifiants

- Email : `admin@kouemanager.local`
- Mot de passe : `Admin@1234`

## Backend Laravel

```bash
cd api-laravel
composer install --no-dev
php artisan migrate:fresh --seed --force
php artisan serve --host=127.0.0.1 --port=8020
```

API :

- `POST http://127.0.0.1:8020/api/v1/connexion`
- `GET http://127.0.0.1:8020/api/v1/tableau-bord`
- `GET http://127.0.0.1:8020/api/v1/activites`
- `GET http://127.0.0.1:8020/api/v1/echeances-versements`
- `POST http://127.0.0.1:8020/api/v1/transactions`

Commandes planifiées :

```bash
php artisan koue:generer-echeances
php artisan koue:actualiser-alertes
```

## Web Next.js

```bash
cd web-next
pnpm install
pnpm exec next dev
```

Puis ouvrir :

```text
http://localhost:3000
```

Le proxy Next redirige `/api/v1/*` vers Laravel `http://127.0.0.1:8020`.

Build validé côté utilisateur :

```bash
pnpm exec next build
```

## Mobile Expo

```bash
cd mobile-expo
pnpm install
pnpm exec expo start
```

Sur téléphone physique, remplacer dans `mobile-expo/app.json` :

```json
"apiUrl": "http://127.0.0.1:8020/api/v1"
```

par l’adresse IP locale du PC, par exemple :

```json
"apiUrl": "http://192.168.1.20:8020/api/v1"
```

## Base de données

Base utilisée : `appliservices`.

Tables principales en français :

- `utilisateurs`
- `roles`
- `permissions`
- `types_activites`
- `activites`
- `categories_transactions`
- `transactions`
- `echeances_versements`
- `articles_inventaire`
- `mouvements_inventaire`
- `notifications`
- `journaux_audit`
- `instantanes_rapports`
- `parametres`

Une sauvegarde avant migration Laravel existe ici :

```text
database/backup-before-laravel.sql
```

## Fonctionnalités couvertes

- API Laravel versionnée `/api/v1`.
- Authentification Sanctum par token pour web et mobile.
- Même compte utilisable web/mobile.
- Modèle générique multi-activités.
- Types d’activités configurables.
- Activités/business units.
- Versements hebdomadaires et génération d’échéances.
- Transactions revenus/décaissements.
- Workflow de validation initial pour grosses dépenses.
- Inventaire et mouvements.
- Rapports consolidés.
- Notifications et alertes.
- Journal d’audit.
- Écran de chargement web avec logo et progression 0 à 100%.
- Header web inspiré du modèle fourni.
- Base mobile Expo avec stockage token et file hors-ligne.
