<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli' && session_status() === PHP_SESSION_NONE) {
    $cheminSessions = dirname(__DIR__) . '/storage/sessions';
    if (!is_dir($cheminSessions)) {
        mkdir($cheminSessions, 0775, true);
    }
    if (is_dir($cheminSessions) && is_writable($cheminSessions)) {
        session_save_path($cheminSessions);
    }
    session_start();
}

date_default_timezone_set('Africa/Abidjan');

function configuration_bdd(): array
{
    return require __DIR__ . '/database.php';
}

function pdo(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = configuration_bdd();
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        $config['hote'],
        $config['port'],
        $config['base'],
        $config['charset']
    );

    $pdo = new PDO($dsn, $config['utilisateur'], $config['mot_de_passe'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function reponse_json(array $payload, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function corps_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function table_existe(string $nom): bool
{
    try {
        $requete = pdo()->prepare(
            'SELECT COUNT(*)
             FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = ?'
        );
        $requete->execute([$nom]);
        return (int) $requete->fetchColumn() > 0;
    } catch (Throwable $e) {
        return false;
    }
}

function utilisateur_connecte(): ?array
{
    if (empty($_SESSION['utilisateur_id']) || !table_existe('utilisateurs')) {
        return null;
    }

    $requete = pdo()->prepare(
        'SELECT u.id, u.nom, u.email, u.telephone, u.avatar_url, u.statut, r.nom AS role_nom, r.slug AS role_slug
         FROM utilisateurs u
         LEFT JOIN roles r ON r.id = u.role_id
         WHERE u.id = ? LIMIT 1'
    );
    $requete->execute([$_SESSION['utilisateur_id']]);
    $utilisateur = $requete->fetch();

    return $utilisateur ?: null;
}

function auth_obligatoire(): array
{
    $utilisateur = utilisateur_connecte();
    if (!$utilisateur) {
        reponse_json(['statut' => 'erreur', 'message' => 'Session expirée. Connectez-vous.'], 401);
    }

    return $utilisateur;
}

function journaliser(string $action, string $entite, ?int $entiteId, array $details = []): void
{
    if (!table_existe('journaux_audit')) {
        return;
    }

    $utilisateurId = $_SESSION['utilisateur_id'] ?? null;
    $requete = pdo()->prepare(
        'INSERT INTO journaux_audit (utilisateur_id, action, entite, entite_id, details, adresse_ip, cree_le)
         VALUES (?, ?, ?, ?, ?, ?, NOW())'
    );
    $requete->execute([
        $utilisateurId,
        $action,
        $entite,
        $entiteId,
        json_encode($details, JSON_UNESCAPED_UNICODE),
        $_SERVER['REMOTE_ADDR'] ?? null,
    ]);
}

function slugifier(string $texte): string
{
    $texte = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texte);
    $texte = strtolower((string) $texte);
    $texte = preg_replace('/[^a-z0-9]+/', '-', $texte) ?: '';
    return trim($texte, '-') ?: 'element';
}

function executer_schema(string $chemin): void
{
    $sql = file_get_contents($chemin);
    if ($sql === false) {
        throw new RuntimeException('Schéma SQL introuvable.');
    }

    $sql = preg_replace('/^\s*--.*$/m', '', $sql);
    $instructions = preg_split('/;\s*(?:\r?\n|$)/', (string) $sql);

    foreach ($instructions as $instruction) {
        $instruction = trim($instruction);
        if ($instruction !== '') {
            pdo()->exec($instruction);
        }
    }
}

function installer_donnees_depart(): void
{
    $db = pdo();

    $db->exec(
        "INSERT IGNORE INTO roles (id, nom, slug, description) VALUES
        (1, 'Propriétaire', 'proprietaire', 'Accès complet à la plateforme'),
        (2, 'Gestionnaire', 'gestionnaire', 'Gestion quotidienne et validation'),
        (3, 'Gérant d’activité', 'gerant', 'Saisie limitée aux activités assignées'),
        (4, 'Comptable / Auditeur', 'auditeur', 'Lecture des données financières')"
    );

    $motDePasse = password_hash('Admin@1234', PASSWORD_DEFAULT);
    $requete = $db->prepare(
        "INSERT IGNORE INTO utilisateurs
        (id, role_id, nom, email, mot_de_passe, telephone, statut, cree_le, modifie_le)
        VALUES (1, 1, 'Administrateur KOUE', 'admin@kouemanager.local', ?, '+2250000000000', 'actif', NOW(), NOW())"
    );
    $requete->execute([$motDePasse]);

    $db->exec(
        "INSERT IGNORE INTO types_activites
        (id, nom, slug, a_versement_recurrent, frequence_versement, schema_champs, icone, couleur, actif, cree_le, modifie_le)
        VALUES
        (1, 'Moto 2 roues', 'moto-2-roues', 1, 'hebdomadaire', '{\"plaque\":\"texte\",\"marque\":\"texte\",\"chauffeur\":\"texte\"}', 'bike', '#0b62b9', 1, NOW(), NOW()),
        (2, 'Moto 3 roues', 'moto-3-roues', 1, 'hebdomadaire', '{\"plaque\":\"texte\",\"marque\":\"texte\",\"chauffeur\":\"texte\"}', 'truck', '#f3b20b', 1, NOW(), NOW()),
        (3, 'Élevage de porcs', 'elevage-porcs', 0, 'aucun', '{\"site\":\"texte\",\"nombre_tetes\":\"nombre\",\"race\":\"texte\"}', 'warehouse', '#16a34a', 1, NOW(), NOW())"
    );

    $db->exec(
        "INSERT IGNORE INTO categories_transactions
        (id, type_activite_id, nom, nature, actif, cree_le, modifie_le)
        VALUES
        (1, NULL, 'Versement', 'revenu', 1, NOW(), NOW()),
        (2, NULL, 'Carburant', 'decaissement', 1, NOW(), NOW()),
        (3, NULL, 'Réparation', 'decaissement', 1, NOW(), NOW()),
        (4, 3, 'Aliment bétail', 'decaissement', 1, NOW(), NOW()),
        (5, 3, 'Vente de porc', 'revenu', 1, NOW(), NOW()),
        (6, NULL, 'Salaire', 'decaissement', 1, NOW(), NOW())"
    );

    $db->exec(
        "INSERT IGNORE INTO activites
        (id, type_activite_id, nom, code, gerant_utilisateur_id, attributs, montant_versement, date_demarrage, statut, cree_le, modifie_le)
        VALUES
        (1, 1, 'Moto Yamaha - 2 roues', 'MOTO-01', 1, '{\"plaque\":\"1234CI\",\"marque\":\"Yamaha\",\"chauffeur\":\"À affecter\"}', 25000, CURDATE(), 'actif', NOW(), NOW()),
        (2, 1, 'Moto TVS - 2 roues', 'MOTO-02', 1, '{\"plaque\":\"5678CI\",\"marque\":\"TVS\",\"chauffeur\":\"À affecter\"}', 25000, CURDATE(), 'actif', NOW(), NOW()),
        (3, 2, 'Tricycle cargo', 'MOTO3-01', 1, '{\"plaque\":\"9012CI\",\"marque\":\"Bajaj\",\"chauffeur\":\"À affecter\"}', 35000, CURDATE(), 'actif', NOW(), NOW()),
        (4, 3, 'Élevage de porcs - Site A', 'ELEV-01', 1, '{\"site\":\"Site A\",\"nombre_tetes\":12,\"race\":\"Locale\"}', 0, CURDATE(), 'actif', NOW(), NOW())"
    );

    $db->exec(
        "INSERT IGNORE INTO echeances_versements
        (id, activite_id, debut_periode, fin_periode, montant_attendu, montant_paye, statut, cree_le, modifie_le)
        VALUES
        (1, 1, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY), 25000, 0, 'a_venir', NOW(), NOW()),
        (2, 2, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY), 25000, 0, 'a_venir', NOW(), NOW()),
        (3, 3, DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY), 35000, 0, 'a_venir', NOW(), NOW())"
    );

    $db->exec(
        "INSERT IGNORE INTO articles_inventaire
        (id, activite_id, nom, type_article, quantite, unite, valeur_unitaire, attributs, modifie_le)
        VALUES
        (1, 1, 'Moto Yamaha', 'bien_durable', 1, 'unité', 650000, '{\"etat\":\"Bon\"}', NOW()),
        (2, 2, 'Moto TVS', 'bien_durable', 1, 'unité', 600000, '{\"etat\":\"Bon\"}', NOW()),
        (3, 3, 'Tricycle cargo', 'bien_durable', 1, 'unité', 1500000, '{\"etat\":\"Bon\"}', NOW()),
        (4, 4, 'Cheptel porcin', 'cheptel', 12, 'tête', 45000, '{\"site\":\"Site A\"}', NOW())"
    );

    $db->exec(
        "INSERT IGNORE INTO parametres (cle, valeur, description, modifie_le) VALUES
        ('nom_plateforme', 'KOUE MANAGER', 'Nom affiché dans l’application', NOW()),
        ('nom_entreprise', 'KOUECONSOLIDATED', 'Entreprise fondatrice', NOW()),
        ('devise', 'FCFA', 'Devise principale', NOW()),
        ('jour_cloture_semaine', 'dimanche', 'Jour de clôture des versements', NOW()),
        ('logo_plateforme', 'assets/img/logo-koue.svg', 'Logo utilisé sur les écrans', NOW())"
    );
}
