<?php

declare(strict_types=1);

require __DIR__ . '/config/bootstrap.php';

$action = $_GET['action'] ?? '';
$donnees = corps_json();

try {
    if ($action === 'etat') {
        reponse_json([
            'statut' => 'ok',
            'installe' => table_existe('utilisateurs') && table_existe('activites'),
            'utilisateur' => utilisateur_connecte(),
        ]);
    }

    if ($action === 'connexion') {
        if (!table_existe('utilisateurs')) {
            reponse_json(['statut' => 'erreur', 'message' => 'Application non installée. Lancez install.php.'], 409);
        }

        $email = trim((string) ($donnees['email'] ?? ''));
        $motDePasse = (string) ($donnees['mot_de_passe'] ?? '');

        $requete = pdo()->prepare(
            'SELECT u.*, r.nom AS role_nom, r.slug AS role_slug
             FROM utilisateurs u
             LEFT JOIN roles r ON r.id = u.role_id
             WHERE u.email = ? AND u.statut = "actif"
             LIMIT 1'
        );
        $requete->execute([$email]);
        $utilisateur = $requete->fetch();

        if (!$utilisateur || !password_verify($motDePasse, $utilisateur['mot_de_passe'])) {
            reponse_json(['statut' => 'erreur', 'message' => 'Identifiants incorrects.'], 422);
        }

        $_SESSION['utilisateur_id'] = (int) $utilisateur['id'];
        pdo()->prepare('UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?')->execute([$utilisateur['id']]);
        journaliser('connexion', 'utilisateurs', (int) $utilisateur['id']);

        unset($utilisateur['mot_de_passe']);
        reponse_json(['statut' => 'ok', 'message' => 'Connexion réussie.', 'utilisateur' => $utilisateur]);
    }

    if ($action === 'deconnexion') {
        journaliser('deconnexion', 'utilisateurs', $_SESSION['utilisateur_id'] ?? null);
        session_destroy();
        reponse_json(['statut' => 'ok']);
    }

    $utilisateur = auth_obligatoire();

    if ($action === 'moi') {
        reponse_json(['statut' => 'ok', 'utilisateur' => $utilisateur]);
    }

    if ($action === 'tableau_bord') {
        $resume = [
            'activites' => valeur_unique('SELECT COUNT(*) FROM activites WHERE statut = "actif"'),
            'revenus' => valeur_unique('SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE type = "revenu"'),
            'decaissements' => valeur_unique('SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE type = "decaissement"'),
            'retards' => valeur_unique('SELECT COUNT(*) FROM echeances_versements WHERE statut IN ("en_retard","impaye","partiel")'),
            'inventaire' => valeur_unique('SELECT COALESCE(SUM(quantite * valeur_unitaire), 0) FROM articles_inventaire'),
        ];
        $resume['resultat'] = (float) $resume['revenus'] - (float) $resume['decaissements'];

        $activites = pdo()->query(
            'SELECT a.id, a.nom, a.code, a.statut, a.montant_versement, t.nom AS type_nom, t.couleur,
                    COALESCE(SUM(CASE WHEN tr.type = "revenu" THEN tr.montant ELSE 0 END), 0) AS revenus,
                    COALESCE(SUM(CASE WHEN tr.type = "decaissement" THEN tr.montant ELSE 0 END), 0) AS decaissements
             FROM activites a
             JOIN types_activites t ON t.id = a.type_activite_id
             LEFT JOIN transactions tr ON tr.activite_id = a.id
             GROUP BY a.id
             ORDER BY a.id DESC
             LIMIT 8'
        )->fetchAll();

        $transactions = pdo()->query(
            'SELECT tr.*, a.nom AS activite_nom, c.nom AS categorie_nom
             FROM transactions tr
             JOIN activites a ON a.id = tr.activite_id
             LEFT JOIN categories_transactions c ON c.id = tr.categorie_id
             ORDER BY tr.date_transaction DESC, tr.id DESC
             LIMIT 8'
        )->fetchAll();

        $echeances = pdo()->query(
            'SELECT e.*, a.nom AS activite_nom, a.code AS activite_code
             FROM echeances_versements e
             JOIN activites a ON a.id = e.activite_id
             ORDER BY e.fin_periode ASC, e.id DESC
             LIMIT 8'
        )->fetchAll();

        reponse_json([
            'statut' => 'ok',
            'resume' => $resume,
            'activites' => $activites,
            'transactions' => $transactions,
            'echeances' => $echeances,
        ]);
    }

    if ($action === 'listes_reference') {
        reponse_json([
            'statut' => 'ok',
            'types' => pdo()->query('SELECT * FROM types_activites WHERE actif = 1 ORDER BY nom')->fetchAll(),
            'categories' => pdo()->query('SELECT * FROM categories_transactions WHERE actif = 1 ORDER BY nature, nom')->fetchAll(),
            'utilisateurs' => pdo()->query('SELECT id, nom, email, role_id FROM utilisateurs WHERE statut = "actif" ORDER BY nom')->fetchAll(),
            'activites' => pdo()->query('SELECT id, nom, code, type_activite_id, montant_versement FROM activites ORDER BY nom')->fetchAll(),
        ]);
    }

    if ($action === 'activites') {
        $lignes = pdo()->query(
            'SELECT a.*, t.nom AS type_nom, t.couleur, u.nom AS gerant_nom
             FROM activites a
             JOIN types_activites t ON t.id = a.type_activite_id
             LEFT JOIN utilisateurs u ON u.id = a.gerant_utilisateur_id
             ORDER BY a.id DESC'
        )->fetchAll();
        reponse_json(['statut' => 'ok', 'donnees' => $lignes]);
    }

    if ($action === 'enregistrer_activite') {
        $id = isset($donnees['id']) && $donnees['id'] !== '' ? (int) $donnees['id'] : null;
        $payload = [
            'type_activite_id' => (int) ($donnees['type_activite_id'] ?? 0),
            'nom' => trim((string) ($donnees['nom'] ?? '')),
            'code' => strtoupper(trim((string) ($donnees['code'] ?? ''))),
            'gerant_utilisateur_id' => empty($donnees['gerant_utilisateur_id']) ? null : (int) $donnees['gerant_utilisateur_id'],
            'attributs' => json_encode($donnees['attributs'] ?? [], JSON_UNESCAPED_UNICODE),
            'montant_versement' => (float) ($donnees['montant_versement'] ?? 0),
            'date_demarrage' => $donnees['date_demarrage'] ?: date('Y-m-d'),
            'statut' => $donnees['statut'] ?? 'actif',
        ];

        if ($payload['type_activite_id'] <= 0 || $payload['nom'] === '' || $payload['code'] === '') {
            reponse_json(['statut' => 'erreur', 'message' => 'Type, nom et code sont obligatoires.'], 422);
        }

        if ($id) {
            $requete = pdo()->prepare(
                'UPDATE activites
                 SET type_activite_id=:type_activite_id, nom=:nom, code=:code, gerant_utilisateur_id=:gerant_utilisateur_id,
                     attributs=:attributs, montant_versement=:montant_versement, date_demarrage=:date_demarrage, statut=:statut
                 WHERE id=:id'
            );
            $payload['id'] = $id;
            $requete->execute($payload);
        } else {
            $requete = pdo()->prepare(
                'INSERT INTO activites
                (type_activite_id, nom, code, gerant_utilisateur_id, attributs, montant_versement, date_demarrage, statut, cree_le, modifie_le)
                VALUES (:type_activite_id, :nom, :code, :gerant_utilisateur_id, :attributs, :montant_versement, :date_demarrage, :statut, NOW(), NOW())'
            );
            $requete->execute($payload);
            $id = (int) pdo()->lastInsertId();
        }

        journaliser('enregistrer', 'activites', $id, $payload);
        reponse_json(['statut' => 'ok', 'message' => 'Activité enregistrée.']);
    }

    if ($action === 'transactions') {
        $lignes = pdo()->query(
            'SELECT tr.*, a.nom AS activite_nom, c.nom AS categorie_nom, u.nom AS saisi_par_nom
             FROM transactions tr
             JOIN activites a ON a.id = tr.activite_id
             LEFT JOIN categories_transactions c ON c.id = tr.categorie_id
             LEFT JOIN utilisateurs u ON u.id = tr.saisi_par
             ORDER BY tr.date_transaction DESC, tr.id DESC
             LIMIT 200'
        )->fetchAll();
        reponse_json(['statut' => 'ok', 'donnees' => $lignes]);
    }

    if ($action === 'enregistrer_transaction') {
        $type = $donnees['type'] ?? 'revenu';
        if (!in_array($type, ['revenu', 'decaissement'], true)) {
            reponse_json(['statut' => 'erreur', 'message' => 'Type de transaction invalide.'], 422);
        }

        $payload = [
            'activite_id' => (int) ($donnees['activite_id'] ?? 0),
            'categorie_id' => empty($donnees['categorie_id']) ? null : (int) $donnees['categorie_id'],
            'type' => $type,
            'montant' => (float) ($donnees['montant'] ?? 0),
            'echeance_id' => empty($donnees['echeance_id']) ? null : (int) $donnees['echeance_id'],
            'mode_paiement' => $donnees['mode_paiement'] ?? 'especes',
            'date_transaction' => $donnees['date_transaction'] ?: date('Y-m-d'),
            'saisi_par' => (int) $utilisateur['id'],
            'note' => trim((string) ($donnees['note'] ?? '')),
        ];

        if ($payload['activite_id'] <= 0 || $payload['montant'] <= 0) {
            reponse_json(['statut' => 'erreur', 'message' => 'Activité et montant sont obligatoires.'], 422);
        }

        $requete = pdo()->prepare(
            'INSERT INTO transactions
            (activite_id, categorie_id, type, montant, echeance_id, mode_paiement, date_transaction, saisi_par, note, cree_le, modifie_le)
            VALUES (:activite_id, :categorie_id, :type, :montant, :echeance_id, :mode_paiement, :date_transaction, :saisi_par, :note, NOW(), NOW())'
        );
        $requete->execute($payload);
        $id = (int) pdo()->lastInsertId();

        if ($payload['echeance_id'] && $type === 'revenu') {
            recalculer_echeance((int) $payload['echeance_id']);
        }

        journaliser('creer', 'transactions', $id, $payload);
        reponse_json(['statut' => 'ok', 'message' => 'Transaction enregistrée.']);
    }

    if ($action === 'echeances') {
        actualiser_retards();
        $lignes = pdo()->query(
            'SELECT e.*, a.nom AS activite_nom, a.code AS activite_code
             FROM echeances_versements e
             JOIN activites a ON a.id = e.activite_id
             ORDER BY e.fin_periode DESC, e.id DESC
             LIMIT 200'
        )->fetchAll();
        reponse_json(['statut' => 'ok', 'donnees' => $lignes]);
    }

    if ($action === 'generer_echeances') {
        generer_echeances_courantes();
        journaliser('generer', 'echeances_versements', null);
        reponse_json(['statut' => 'ok', 'message' => 'Échéances de la semaine générées.']);
    }

    if ($action === 'inventaire') {
        $lignes = pdo()->query(
            'SELECT i.*, a.nom AS activite_nom, (i.quantite * i.valeur_unitaire) AS valeur_totale
             FROM articles_inventaire i
             JOIN activites a ON a.id = i.activite_id
             ORDER BY i.id DESC'
        )->fetchAll();
        reponse_json(['statut' => 'ok', 'donnees' => $lignes]);
    }

    if ($action === 'enregistrer_article') {
        $id = isset($donnees['id']) && $donnees['id'] !== '' ? (int) $donnees['id'] : null;
        $payload = [
            'activite_id' => (int) ($donnees['activite_id'] ?? 0),
            'nom' => trim((string) ($donnees['nom'] ?? '')),
            'type_article' => $donnees['type_article'] ?? 'bien_durable',
            'quantite' => (float) ($donnees['quantite'] ?? 0),
            'unite' => trim((string) ($donnees['unite'] ?? 'unité')),
            'valeur_unitaire' => (float) ($donnees['valeur_unitaire'] ?? 0),
            'attributs' => json_encode($donnees['attributs'] ?? [], JSON_UNESCAPED_UNICODE),
        ];

        if ($payload['activite_id'] <= 0 || $payload['nom'] === '') {
            reponse_json(['statut' => 'erreur', 'message' => 'Activité et nom sont obligatoires.'], 422);
        }

        if ($id) {
            $payload['id'] = $id;
            pdo()->prepare(
                'UPDATE articles_inventaire
                 SET activite_id=:activite_id, nom=:nom, type_article=:type_article, quantite=:quantite,
                     unite=:unite, valeur_unitaire=:valeur_unitaire, attributs=:attributs, modifie_le=NOW()
                 WHERE id=:id'
            )->execute($payload);
        } else {
            pdo()->prepare(
                'INSERT INTO articles_inventaire
                (activite_id, nom, type_article, quantite, unite, valeur_unitaire, attributs, modifie_le)
                VALUES (:activite_id, :nom, :type_article, :quantite, :unite, :valeur_unitaire, :attributs, NOW())'
            )->execute($payload);
            $id = (int) pdo()->lastInsertId();
        }

        journaliser('enregistrer', 'articles_inventaire', $id, $payload);
        reponse_json(['statut' => 'ok', 'message' => 'Article enregistré.']);
    }

    if ($action === 'utilisateurs') {
        $lignes = pdo()->query(
            'SELECT u.id, u.nom, u.email, u.telephone, u.statut, u.derniere_connexion, r.nom AS role_nom
             FROM utilisateurs u
             LEFT JOIN roles r ON r.id = u.role_id
             ORDER BY u.id DESC'
        )->fetchAll();
        reponse_json(['statut' => 'ok', 'donnees' => $lignes]);
    }

    if ($action === 'rapport') {
        $debut = $donnees['debut'] ?? date('Y-m-01');
        $fin = $donnees['fin'] ?? date('Y-m-t');
        $rapport = calculer_rapport($debut, $fin);
        reponse_json(['statut' => 'ok', 'donnees' => $rapport]);
    }

    if ($action === 'parametres') {
        $lignes = pdo()->query('SELECT cle, valeur, description FROM parametres ORDER BY cle')->fetchAll();
        reponse_json(['statut' => 'ok', 'donnees' => $lignes]);
    }

    reponse_json(['statut' => 'erreur', 'message' => 'Action API inconnue.'], 404);
} catch (Throwable $e) {
    reponse_json(['statut' => 'erreur', 'message' => $e->getMessage()], 500);
}

function valeur_unique(string $sql): float
{
    return (float) pdo()->query($sql)->fetchColumn();
}

function recalculer_echeance(int $echeanceId): void
{
    $requete = pdo()->prepare('SELECT montant_attendu FROM echeances_versements WHERE id = ?');
    $requete->execute([$echeanceId]);
    $echeance = $requete->fetch();
    if (!$echeance) {
        return;
    }

    $requete = pdo()->prepare('SELECT COALESCE(SUM(montant), 0) FROM transactions WHERE echeance_id = ? AND type = "revenu"');
    $requete->execute([$echeanceId]);
    $paye = (float) $requete->fetchColumn();
    $attendu = (float) $echeance['montant_attendu'];
    $statut = $paye >= $attendu ? 'paye' : ($paye > 0 ? 'partiel' : 'a_venir');

    pdo()->prepare('UPDATE echeances_versements SET montant_paye = ?, statut = ?, modifie_le = NOW() WHERE id = ?')
        ->execute([$paye, $statut, $echeanceId]);
}

function actualiser_retards(): void
{
    pdo()->exec(
        "UPDATE echeances_versements
         SET statut = CASE
            WHEN montant_paye >= montant_attendu THEN 'paye'
            WHEN montant_paye > 0 AND fin_periode < CURDATE() THEN 'partiel'
            WHEN montant_paye = 0 AND fin_periode < CURDATE() THEN 'en_retard'
            ELSE statut
         END,
         modifie_le = NOW()
         WHERE statut <> 'paye'"
    );
}

function generer_echeances_courantes(): void
{
    $debut = (new DateTimeImmutable('monday this week'))->format('Y-m-d');
    $fin = (new DateTimeImmutable('sunday this week'))->format('Y-m-d');
    $activites = pdo()->query(
        'SELECT a.id, a.montant_versement
         FROM activites a
         JOIN types_activites t ON t.id = a.type_activite_id
         WHERE a.statut = "actif" AND t.a_versement_recurrent = 1 AND a.montant_versement > 0'
    )->fetchAll();

    $existe = pdo()->prepare('SELECT COUNT(*) FROM echeances_versements WHERE activite_id = ? AND debut_periode = ? AND fin_periode = ?');
    $insertion = pdo()->prepare(
        'INSERT INTO echeances_versements
        (activite_id, debut_periode, fin_periode, montant_attendu, montant_paye, statut, cree_le, modifie_le)
        VALUES (?, ?, ?, ?, 0, "a_venir", NOW(), NOW())'
    );

    foreach ($activites as $activite) {
        $existe->execute([$activite['id'], $debut, $fin]);
        if ((int) $existe->fetchColumn() === 0) {
            $insertion->execute([$activite['id'], $debut, $fin, $activite['montant_versement']]);
        }
    }
}

function calculer_rapport(string $debut, string $fin): array
{
    $requete = pdo()->prepare(
        'SELECT a.id, a.nom, a.code, t.nom AS type_nom,
                COALESCE(SUM(CASE WHEN tr.type = "revenu" THEN tr.montant ELSE 0 END), 0) AS revenus,
                COALESCE(SUM(CASE WHEN tr.type = "decaissement" THEN tr.montant ELSE 0 END), 0) AS decaissements
         FROM activites a
         JOIN types_activites t ON t.id = a.type_activite_id
         LEFT JOIN transactions tr ON tr.activite_id = a.id AND tr.date_transaction BETWEEN ? AND ?
         GROUP BY a.id
         ORDER BY a.nom'
    );
    $requete->execute([$debut, $fin]);
    $activites = $requete->fetchAll();

    $totaux = ['revenus' => 0.0, 'decaissements' => 0.0, 'resultat' => 0.0];
    foreach ($activites as &$activite) {
        $activite['resultat'] = (float) $activite['revenus'] - (float) $activite['decaissements'];
        $totaux['revenus'] += (float) $activite['revenus'];
        $totaux['decaissements'] += (float) $activite['decaissements'];
    }
    unset($activite);
    $totaux['resultat'] = $totaux['revenus'] - $totaux['decaissements'];

    return [
        'periode' => ['debut' => $debut, 'fin' => $fin],
        'totaux' => $totaux,
        'activites' => $activites,
    ];
}
