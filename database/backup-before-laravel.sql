-- MySQL dump 10.13  Distrib 9.1.0, for Win64 (x86_64)
--
-- Host: localhost    Database: appliservices
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `activites`
--

DROP TABLE IF EXISTS `activites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activites` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `type_activite_id` bigint unsigned NOT NULL,
  `nom` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `code` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `gerant_utilisateur_id` bigint unsigned DEFAULT NULL,
  `attributs` json DEFAULT NULL,
  `montant_versement` decimal(12,2) NOT NULL DEFAULT '0.00',
  `date_demarrage` date DEFAULT NULL,
  `statut` enum('actif','en_pause','cede','cloture') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'actif',
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_activites_statut` (`statut`),
  KEY `idx_activites_type` (`type_activite_id`),
  KEY `fk_activites_gerant` (`gerant_utilisateur_id`),
  CONSTRAINT `fk_activites_gerant` FOREIGN KEY (`gerant_utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_activites_types` FOREIGN KEY (`type_activite_id`) REFERENCES `types_activites` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activites`
--

LOCK TABLES `activites` WRITE;
/*!40000 ALTER TABLE `activites` DISABLE KEYS */;
INSERT INTO `activites` VALUES (1,1,'Moto Yamaha - 2 roues','MOTO-01',1,'{\"marque\": \"Yamaha\", \"plaque\": \"1234CI\", \"chauffeur\": \"À affecter\"}',25000.00,'2026-08-14','actif','2026-08-14 22:30:44','2026-08-14 22:30:44'),(2,1,'Moto TVS - 2 roues','MOTO-02',1,'{\"marque\": \"TVS\", \"plaque\": \"5678CI\", \"chauffeur\": \"À affecter\"}',25000.00,'2026-08-14','actif','2026-08-14 22:30:44','2026-08-14 22:30:44'),(3,2,'Tricycle cargo','MOTO3-01',1,'{\"marque\": \"Bajaj\", \"plaque\": \"9012CI\", \"chauffeur\": \"À affecter\"}',35000.00,'2026-08-14','actif','2026-08-14 22:30:44','2026-08-14 22:30:44'),(4,3,'Élevage de porcs - Site A','ELEV-01',1,'{\"race\": \"Locale\", \"site\": \"Site A\", \"nombre_tetes\": 12}',0.00,'2026-08-14','actif','2026-08-14 22:30:44','2026-08-14 22:30:44'),(5,3,'Nouvelle activité','MOTO-03',NULL,'[]',25000.00,'2026-08-14','actif','2026-08-14 22:53:02','2026-08-14 22:53:02');
/*!40000 ALTER TABLE `activites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `articles_inventaire`
--

DROP TABLE IF EXISTS `articles_inventaire`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `articles_inventaire` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `activite_id` bigint unsigned NOT NULL,
  `nom` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `type_article` enum('bien_durable','stock_consommable','cheptel') COLLATE utf8mb4_general_ci NOT NULL,
  `quantite` decimal(10,2) NOT NULL DEFAULT '0.00',
  `unite` varchar(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'unité',
  `valeur_unitaire` decimal(12,2) NOT NULL DEFAULT '0.00',
  `attributs` json DEFAULT NULL,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_inventaire_activite` (`activite_id`),
  CONSTRAINT `fk_inventaire_activites` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `articles_inventaire`
--

LOCK TABLES `articles_inventaire` WRITE;
/*!40000 ALTER TABLE `articles_inventaire` DISABLE KEYS */;
INSERT INTO `articles_inventaire` VALUES (1,1,'Moto Yamaha','bien_durable',1.00,'unité',650000.00,'{\"etat\": \"Bon\"}','2026-08-14 22:30:45'),(2,2,'Moto TVS','bien_durable',1.00,'unité',600000.00,'{\"etat\": \"Bon\"}','2026-08-14 22:30:45'),(3,3,'Tricycle cargo','bien_durable',1.00,'unité',1500000.00,'{\"etat\": \"Bon\"}','2026-08-14 22:30:45'),(4,4,'Cheptel porcin','cheptel',12.00,'tête',45000.00,'{\"site\": \"Site A\"}','2026-08-14 22:30:45');
/*!40000 ALTER TABLE `articles_inventaire` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories_transactions`
--

DROP TABLE IF EXISTS `categories_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `type_activite_id` bigint unsigned DEFAULT NULL,
  `nom` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `nature` enum('revenu','decaissement') COLLATE utf8mb4_general_ci NOT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_categories_nature` (`nature`),
  KEY `fk_categories_types` (`type_activite_id`),
  CONSTRAINT `fk_categories_types` FOREIGN KEY (`type_activite_id`) REFERENCES `types_activites` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories_transactions`
--

LOCK TABLES `categories_transactions` WRITE;
/*!40000 ALTER TABLE `categories_transactions` DISABLE KEYS */;
INSERT INTO `categories_transactions` VALUES (1,NULL,'Versement','revenu',1,'2026-08-14 22:30:44','2026-08-14 22:30:44'),(2,NULL,'Carburant','decaissement',1,'2026-08-14 22:30:44','2026-08-14 22:30:44'),(3,NULL,'Réparation','decaissement',1,'2026-08-14 22:30:44','2026-08-14 22:30:44'),(4,3,'Aliment bétail','decaissement',1,'2026-08-14 22:30:44','2026-08-14 22:30:44'),(5,3,'Vente de porc','revenu',1,'2026-08-14 22:30:44','2026-08-14 22:30:44'),(6,NULL,'Salaire','decaissement',1,'2026-08-14 22:30:44','2026-08-14 22:30:44');
/*!40000 ALTER TABLE `categories_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `echeances_versements`
--

DROP TABLE IF EXISTS `echeances_versements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `echeances_versements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `activite_id` bigint unsigned NOT NULL,
  `debut_periode` date NOT NULL,
  `fin_periode` date NOT NULL,
  `montant_attendu` decimal(12,2) NOT NULL DEFAULT '0.00',
  `montant_paye` decimal(12,2) NOT NULL DEFAULT '0.00',
  `statut` enum('a_venir','paye','partiel','en_retard','impaye') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'a_venir',
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_echeances_dates` (`debut_periode`,`fin_periode`),
  KEY `idx_echeances_statut` (`statut`),
  KEY `fk_echeances_activites` (`activite_id`),
  CONSTRAINT `fk_echeances_activites` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `echeances_versements`
--

LOCK TABLES `echeances_versements` WRITE;
/*!40000 ALTER TABLE `echeances_versements` DISABLE KEYS */;
INSERT INTO `echeances_versements` VALUES (1,1,'2026-08-10','2026-08-16',25000.00,0.00,'a_venir','2026-08-14 22:30:44','2026-08-14 22:53:19'),(2,2,'2026-08-10','2026-08-16',25000.00,0.00,'a_venir','2026-08-14 22:30:44','2026-08-14 22:53:19'),(3,3,'2026-08-10','2026-08-16',35000.00,0.00,'a_venir','2026-08-14 22:30:44','2026-08-14 22:53:19');
/*!40000 ALTER TABLE `echeances_versements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `instantanes_rapports`
--

DROP TABLE IF EXISTS `instantanes_rapports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `instantanes_rapports` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `periode_debut` date NOT NULL,
  `periode_fin` date NOT NULL,
  `donnees` json NOT NULL,
  `genere_par` bigint unsigned DEFAULT NULL,
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_rapports_utilisateurs` (`genere_par`),
  CONSTRAINT `fk_rapports_utilisateurs` FOREIGN KEY (`genere_par`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `instantanes_rapports`
--

LOCK TABLES `instantanes_rapports` WRITE;
/*!40000 ALTER TABLE `instantanes_rapports` DISABLE KEYS */;
/*!40000 ALTER TABLE `instantanes_rapports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `journaux_audit`
--

DROP TABLE IF EXISTS `journaux_audit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `journaux_audit` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utilisateur_id` bigint unsigned DEFAULT NULL,
  `action` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `entite` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `entite_id` bigint unsigned DEFAULT NULL,
  `details` json DEFAULT NULL,
  `adresse_ip` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_entite` (`entite`,`entite_id`),
  KEY `fk_audit_utilisateurs` (`utilisateur_id`),
  CONSTRAINT `fk_audit_utilisateurs` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `journaux_audit`
--

LOCK TABLES `journaux_audit` WRITE;
/*!40000 ALTER TABLE `journaux_audit` DISABLE KEYS */;
INSERT INTO `journaux_audit` VALUES (1,1,'connexion','utilisateurs',1,'[]','127.0.0.1','2026-08-14 22:33:28'),(2,1,'connexion','utilisateurs',1,'[]','::1','2026-08-14 22:38:04'),(3,1,'enregistrer','activites',5,'{\"nom\": \"Nouvelle activité\", \"code\": \"MOTO-03\", \"statut\": \"actif\", \"attributs\": \"[]\", \"date_demarrage\": \"2026-08-14\", \"type_activite_id\": 3, \"montant_versement\": 25000, \"gerant_utilisateur_id\": null}','::1','2026-08-14 22:53:03');
/*!40000 ALTER TABLE `journaux_audit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mouvements_inventaire`
--

DROP TABLE IF EXISTS `mouvements_inventaire`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mouvements_inventaire` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `article_inventaire_id` bigint unsigned NOT NULL,
  `type_mouvement` enum('entree','sortie','ajustement') COLLATE utf8mb4_general_ci NOT NULL,
  `quantite` decimal(10,2) NOT NULL,
  `motif` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `transaction_id` bigint unsigned DEFAULT NULL,
  `saisi_par` bigint unsigned DEFAULT NULL,
  `date_mouvement` date NOT NULL,
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mouvements_articles` (`article_inventaire_id`),
  KEY `fk_mouvements_transactions` (`transaction_id`),
  KEY `fk_mouvements_utilisateurs` (`saisi_par`),
  CONSTRAINT `fk_mouvements_articles` FOREIGN KEY (`article_inventaire_id`) REFERENCES `articles_inventaire` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mouvements_transactions` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mouvements_utilisateurs` FOREIGN KEY (`saisi_par`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mouvements_inventaire`
--

LOCK TABLES `mouvements_inventaire` WRITE;
/*!40000 ALTER TABLE `mouvements_inventaire` DISABLE KEYS */;
/*!40000 ALTER TABLE `mouvements_inventaire` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `utilisateur_id` bigint unsigned DEFAULT NULL,
  `titre` varchar(180) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `type_notification` enum('info','alerte','retard','stock','rapport') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'info',
  `lu` tinyint(1) NOT NULL DEFAULT '0',
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_notifications_utilisateurs` (`utilisateur_id`),
  CONSTRAINT `fk_notifications_utilisateurs` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateurs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parametres`
--

DROP TABLE IF EXISTS `parametres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parametres` (
  `cle` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `valeur` text COLLATE utf8mb4_general_ci,
  `description` text COLLATE utf8mb4_general_ci,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parametres`
--

LOCK TABLES `parametres` WRITE;
/*!40000 ALTER TABLE `parametres` DISABLE KEYS */;
INSERT INTO `parametres` VALUES ('devise','FCFA','Devise principale','2026-08-14 22:30:46'),('jour_cloture_semaine','dimanche','Jour de clôture des versements','2026-08-14 22:30:46'),('logo_plateforme','assets/img/logo-koue.svg','Logo utilisé sur les écrans','2026-08-14 22:30:46'),('nom_entreprise','KOUECONSOLIDATED','Entreprise fondatrice','2026-08-14 22:30:46'),('nom_plateforme','KOUE MANAGER','Nom affiché dans l’application','2026-08-14 22:30:46');
/*!40000 ALTER TABLE `parametres` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nom` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` bigint unsigned NOT NULL,
  `permission_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permissions` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permissions` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_role_permissions_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'Propriétaire','proprietaire','Accès complet à la plateforme','2026-08-14 22:30:43',NULL),(2,'Gestionnaire','gestionnaire','Gestion quotidienne et validation','2026-08-14 22:30:43',NULL),(3,'Gérant d’activité','gerant','Saisie limitée aux activités assignées','2026-08-14 22:30:43',NULL),(4,'Comptable / Auditeur','auditeur','Lecture des données financières','2026-08-14 22:30:43',NULL);
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `activite_id` bigint unsigned NOT NULL,
  `categorie_id` bigint unsigned DEFAULT NULL,
  `type` enum('revenu','decaissement') COLLATE utf8mb4_general_ci NOT NULL,
  `montant` decimal(12,2) NOT NULL,
  `echeance_id` bigint unsigned DEFAULT NULL,
  `mode_paiement` enum('especes','mobile_money','banque','autre') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'especes',
  `date_transaction` date NOT NULL,
  `saisi_par` bigint unsigned DEFAULT NULL,
  `justificatif_path` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_general_ci,
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transactions_type_date` (`type`,`date_transaction`),
  KEY `idx_transactions_activite` (`activite_id`),
  KEY `fk_transactions_categories` (`categorie_id`),
  KEY `fk_transactions_echeances` (`echeance_id`),
  KEY `fk_transactions_utilisateurs` (`saisi_par`),
  CONSTRAINT `fk_transactions_activites` FOREIGN KEY (`activite_id`) REFERENCES `activites` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_categories` FOREIGN KEY (`categorie_id`) REFERENCES `categories_transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_echeances` FOREIGN KEY (`echeance_id`) REFERENCES `echeances_versements` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transactions_utilisateurs` FOREIGN KEY (`saisi_par`) REFERENCES `utilisateurs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `types_activites`
--

DROP TABLE IF EXISTS `types_activites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `types_activites` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `a_versement_recurrent` tinyint(1) NOT NULL DEFAULT '0',
  `frequence_versement` enum('journalier','hebdomadaire','mensuel','aucun') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'aucun',
  `schema_champs` json DEFAULT NULL,
  `icone` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `couleur` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `actif` tinyint(1) NOT NULL DEFAULT '1',
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `types_activites`
--

LOCK TABLES `types_activites` WRITE;
/*!40000 ALTER TABLE `types_activites` DISABLE KEYS */;
INSERT INTO `types_activites` VALUES (1,'Moto 2 roues','moto-2-roues',1,'hebdomadaire','{\"marque\": \"texte\", \"plaque\": \"texte\", \"chauffeur\": \"texte\"}','bike','#0b62b9',1,'2026-08-14 22:30:44','2026-08-14 22:30:44'),(2,'Moto 3 roues','moto-3-roues',1,'hebdomadaire','{\"marque\": \"texte\", \"plaque\": \"texte\", \"chauffeur\": \"texte\"}','truck','#f3b20b',1,'2026-08-14 22:30:44','2026-08-14 22:30:44'),(3,'Élevage de porcs','elevage-porcs',0,'aucun','{\"race\": \"texte\", \"site\": \"texte\", \"nombre_tetes\": \"nombre\"}','warehouse','#16a34a',1,'2026-08-14 22:30:44','2026-08-14 22:30:44');
/*!40000 ALTER TABLE `types_activites` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utilisateurs`
--

DROP TABLE IF EXISTS `utilisateurs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `utilisateurs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` bigint unsigned DEFAULT NULL,
  `nom` varchar(180) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(180) COLLATE utf8mb4_general_ci NOT NULL,
  `mot_de_passe` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `telephone` varchar(40) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `statut` enum('actif','suspendu','desactive') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'actif',
  `derniere_connexion` timestamp NULL DEFAULT NULL,
  `cree_le` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modifie_le` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_utilisateurs_roles` (`role_id`),
  CONSTRAINT `fk_utilisateurs_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utilisateurs`
--

LOCK TABLES `utilisateurs` WRITE;
/*!40000 ALTER TABLE `utilisateurs` DISABLE KEYS */;
INSERT INTO `utilisateurs` VALUES (1,1,'Administrateur KOUE','admin@kouemanager.local','$2y$10$NFUbR8Ts.LuRoRdoYSljwOwG5xxfbqxAwZcdzGJngBmCccOWa7QEu','+2250000000000',NULL,'actif','2026-08-14 22:38:04','2026-08-14 22:30:44','2026-08-14 22:38:04');
/*!40000 ALTER TABLE `utilisateurs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-14 23:49:46
