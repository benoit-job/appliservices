<?php

declare(strict_types=1);

require __DIR__ . '/config/bootstrap.php';

$message = null;
$erreur = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        executer_schema(__DIR__ . '/database/schema.sql');
        installer_donnees_depart();
        $message = 'Installation terminée. Les tables et les données de départ sont prêtes.';
    } catch (Throwable $e) {
        $erreur = $e->getMessage();
    }
}
?>
<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Installation KOUE MANAGER</title>
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body class="install-page">
    <main class="install-box">
        <img src="assets/img/logo-koue.svg" alt="KOUECONSOLIDATED" class="install-logo">
        <h1>Installation de KOUE MANAGER</h1>
        <p>Cette action crée les tables en français dans la base <strong>appliservices</strong> et ajoute l’utilisateur administrateur par défaut.</p>

        <?php if ($message): ?>
            <div class="notice success"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div>
            <p><a class="primary-link" href="index.php">Ouvrir l’application</a></p>
            <p class="muted">Connexion : admin@kouemanager.local / Admin@1234</p>
        <?php elseif ($erreur): ?>
            <div class="notice danger"><?= htmlspecialchars($erreur, ENT_QUOTES, 'UTF-8') ?></div>
        <?php endif; ?>

        <form method="post">
            <button class="btn primary" type="submit">Créer / mettre à jour les tables</button>
        </form>
    </main>
</body>
</html>
