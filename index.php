<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>KOUE MANAGER</title>
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>
    <div id="chargeur" class="chargeur visible" aria-live="polite">
        <div class="chargeur-fond"></div>
        <div class="chargeur-contenu">
            <div class="orbite">
                <span class="fleche f1"></span>
                <span class="fleche f2"></span>
                <span class="fleche f3"></span>
                <div class="anneau-centre">
                    <img src="assets/img/logo-koue.svg" alt="KOUE MANAGER">
                </div>
            </div>
            <strong>KOUE MANAGER</strong>
            <small id="chargeur-libelle">Chargement...</small>
            <div class="barre-progression"><span id="chargeur-barre"></span></div>
            <em id="chargeur-pourcentage">0%</em>
        </div>
    </div>

    <div id="application"></div>
    <script src="assets/js/app.js"></script>
</body>
</html>
