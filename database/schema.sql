CREATE TABLE IF NOT EXISTS roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS utilisateurs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NULL,
    nom VARCHAR(180) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    telephone VARCHAR(40) NULL,
    avatar_url VARCHAR(255) NULL,
    statut ENUM('actif','suspendu','desactive') NOT NULL DEFAULT 'actif',
    derniere_connexion TIMESTAMP NULL DEFAULT NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_utilisateurs_roles FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_roles FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permissions FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS types_activites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    a_versement_recurrent TINYINT(1) NOT NULL DEFAULT 0,
    frequence_versement ENUM('journalier','hebdomadaire','mensuel','aucun') NOT NULL DEFAULT 'aucun',
    schema_champs JSON NULL,
    icone VARCHAR(80) NULL,
    couleur VARCHAR(30) NULL,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS activites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_activite_id BIGINT UNSIGNED NOT NULL,
    nom VARCHAR(255) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    gerant_utilisateur_id BIGINT UNSIGNED NULL,
    attributs JSON NULL,
    montant_versement DECIMAL(12,2) NOT NULL DEFAULT 0,
    date_demarrage DATE NULL,
    statut ENUM('actif','en_pause','cede','cloture') NOT NULL DEFAULT 'actif',
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activites_statut (statut),
    INDEX idx_activites_type (type_activite_id),
    CONSTRAINT fk_activites_types FOREIGN KEY (type_activite_id) REFERENCES types_activites(id),
    CONSTRAINT fk_activites_gerant FOREIGN KEY (gerant_utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS categories_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type_activite_id BIGINT UNSIGNED NULL,
    nom VARCHAR(120) NOT NULL,
    nature ENUM('revenu','decaissement') NOT NULL,
    actif TINYINT(1) NOT NULL DEFAULT 1,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_categories_nature (nature),
    CONSTRAINT fk_categories_types FOREIGN KEY (type_activite_id) REFERENCES types_activites(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS echeances_versements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activite_id BIGINT UNSIGNED NOT NULL,
    debut_periode DATE NOT NULL,
    fin_periode DATE NOT NULL,
    montant_attendu DECIMAL(12,2) NOT NULL DEFAULT 0,
    montant_paye DECIMAL(12,2) NOT NULL DEFAULT 0,
    statut ENUM('a_venir','paye','partiel','en_retard','impaye') NOT NULL DEFAULT 'a_venir',
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_echeances_dates (debut_periode, fin_periode),
    INDEX idx_echeances_statut (statut),
    CONSTRAINT fk_echeances_activites FOREIGN KEY (activite_id) REFERENCES activites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activite_id BIGINT UNSIGNED NOT NULL,
    categorie_id BIGINT UNSIGNED NULL,
    type ENUM('revenu','decaissement') NOT NULL,
    montant DECIMAL(12,2) NOT NULL,
    echeance_id BIGINT UNSIGNED NULL,
    mode_paiement ENUM('especes','mobile_money','banque','autre') NOT NULL DEFAULT 'especes',
    date_transaction DATE NOT NULL,
    saisi_par BIGINT UNSIGNED NULL,
    justificatif_path VARCHAR(255) NULL,
    note TEXT NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transactions_type_date (type, date_transaction),
    INDEX idx_transactions_activite (activite_id),
    CONSTRAINT fk_transactions_activites FOREIGN KEY (activite_id) REFERENCES activites(id) ON DELETE CASCADE,
    CONSTRAINT fk_transactions_categories FOREIGN KEY (categorie_id) REFERENCES categories_transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_echeances FOREIGN KEY (echeance_id) REFERENCES echeances_versements(id) ON DELETE SET NULL,
    CONSTRAINT fk_transactions_utilisateurs FOREIGN KEY (saisi_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS articles_inventaire (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activite_id BIGINT UNSIGNED NOT NULL,
    nom VARCHAR(150) NOT NULL,
    type_article ENUM('bien_durable','stock_consommable','cheptel') NOT NULL,
    quantite DECIMAL(10,2) NOT NULL DEFAULT 0,
    unite VARCHAR(30) NOT NULL DEFAULT 'unité',
    valeur_unitaire DECIMAL(12,2) NOT NULL DEFAULT 0,
    attributs JSON NULL,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inventaire_activite (activite_id),
    CONSTRAINT fk_inventaire_activites FOREIGN KEY (activite_id) REFERENCES activites(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS mouvements_inventaire (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_inventaire_id BIGINT UNSIGNED NOT NULL,
    type_mouvement ENUM('entree','sortie','ajustement') NOT NULL,
    quantite DECIMAL(10,2) NOT NULL,
    motif VARCHAR(150) NOT NULL,
    transaction_id BIGINT UNSIGNED NULL,
    saisi_par BIGINT UNSIGNED NULL,
    date_mouvement DATE NOT NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mouvements_articles FOREIGN KEY (article_inventaire_id) REFERENCES articles_inventaire(id) ON DELETE CASCADE,
    CONSTRAINT fk_mouvements_transactions FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    CONSTRAINT fk_mouvements_utilisateurs FOREIGN KEY (saisi_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id BIGINT UNSIGNED NULL,
    titre VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    type_notification ENUM('info','alerte','retard','stock','rapport') NOT NULL DEFAULT 'info',
    lu TINYINT(1) NOT NULL DEFAULT 0,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_utilisateurs FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS journaux_audit (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id BIGINT UNSIGNED NULL,
    action VARCHAR(120) NOT NULL,
    entite VARCHAR(120) NOT NULL,
    entite_id BIGINT UNSIGNED NULL,
    details JSON NULL,
    adresse_ip VARCHAR(80) NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entite (entite, entite_id),
    CONSTRAINT fk_audit_utilisateurs FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS instantanes_rapports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    donnees JSON NOT NULL,
    genere_par BIGINT UNSIGNED NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rapports_utilisateurs FOREIGN KEY (genere_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS parametres (
    cle VARCHAR(120) PRIMARY KEY,
    valeur TEXT NULL,
    description TEXT NULL,
    modifie_le TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
