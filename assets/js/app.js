const app = document.querySelector("#application");
const chargeur = document.querySelector("#chargeur");
const barre = document.querySelector("#chargeur-barre");
const pourcentage = document.querySelector("#chargeur-pourcentage");
const libelle = document.querySelector("#chargeur-libelle");

const etat = {
    utilisateur: null,
    route: "tableau_bord",
    references: { activites: [], categories: [], types: [], utilisateurs: [] },
};

const routes = [
    ["tableau_bord", "Tableau de bord", "dashboard"],
    ["activites", "Activités", "briefcase"],
    ["versements", "Versements", "wallet"],
    ["decaissements", "Dépenses", "receipt"],
    ["inventaire", "Inventaire", "boxes"],
    ["rapports", "Rapports", "chart"],
    ["utilisateurs", "Utilisateurs", "users"],
    ["parametres", "Paramètres", "settings"],
];

document.addEventListener("DOMContentLoaded", async () => {
    await avecChargeur("Chargement de la plateforme", async () => {
        const reponse = await api("etat", {});
        etat.utilisateur = reponse.utilisateur;
    });
    etat.utilisateur ? await rendreApplication() : rendreConnexion();
});

async function api(action, donnees = {}) {
    const reponse = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(donnees),
    });
    const json = await reponse.json().catch(() => ({ statut: "erreur", message: "Réponse API illisible." }));
    if (!reponse.ok || json.statut === "erreur") {
        throw new Error(json.message || "Une erreur est survenue.");
    }
    return json;
}

async function avecChargeur(texte, travail) {
    let progression = 0;
    chargeur.classList.add("visible");
    libelle.textContent = texte;
    barre.style.width = "0%";
    pourcentage.textContent = "0%";

    const timer = setInterval(() => {
        progression = Math.min(94, progression + Math.ceil(Math.random() * 9));
        barre.style.width = `${progression}%`;
        pourcentage.textContent = `${progression}%`;
    }, 75);

    try {
        const resultat = await travail();
        await attendre(250);
        progression = 100;
        barre.style.width = "100%";
        pourcentage.textContent = "100%";
        await attendre(220);
        return resultat;
    } finally {
        clearInterval(timer);
        chargeur.classList.remove("visible");
    }
}

function attendre(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function rendreConnexion() {
    app.innerHTML = `
        <main class="login">
            <section class="login-panneau">
                <img class="login-logo" src="assets/img/logo-koue.svg" alt="KOUECONSOLIDATED">
                <div>
                    <h1>KOUE MANAGER</h1>
                    <p>Gestion, suivi et contrôle des activités de KOUECONSOLIDATED. Web aujourd’hui, API commune prête pour le mobile.</p>
                </div>
                <form id="formConnexion" class="formulaire">
                    <div class="message" id="messageConnexion"></div>
                    <div class="champ">
                        <label>Email</label>
                        <input name="email" type="email" value="admin@kouemanager.local" required>
                    </div>
                    <div class="champ">
                        <label>Mot de passe</label>
                        <input name="mot_de_passe" type="password" value="Admin@1234" required>
                    </div>
                    <button class="btn primary" type="submit">Se connecter</button>
                    <a class="primary-link" href="install.php">Installer / mettre à jour la base</a>
                </form>
            </section>
            <section aria-hidden="true"></section>
        </main>
    `;

    document.querySelector("#formConnexion").addEventListener("submit", async event => {
        event.preventDefault();
        const message = document.querySelector("#messageConnexion");
        message.classList.remove("visible");
        const donnees = Object.fromEntries(new FormData(event.currentTarget));
        try {
            const reponse = await avecChargeur("Connexion en cours", () => api("connexion", donnees));
            etat.utilisateur = reponse.utilisateur;
            await rendreApplication();
        } catch (erreur) {
            message.textContent = erreur.message;
            message.classList.add("visible");
        }
    });
}

async function rendreApplication() {
    app.innerHTML = `
        <main class="application">
            ${rendreSidebar()}
            <section class="zone-principale">
                ${rendreHeader()}
                <div class="contenu" id="contenu"></div>
            </section>
        </main>
    `;
    brancherShell();
    await chargerReferences();
    await naviguer(etat.route);
}

function rendreSidebar() {
    return `
        <aside class="barre-laterale">
            <div class="marque">
                <img src="assets/img/logo-koue.svg" alt="Logo">
                <strong>KOUE</strong>
            </div>
            <nav class="navigation">
                ${routes.map(([route, titre, iconeNom]) => `
                    <button class="nav-bouton ${etat.route === route ? "actif" : ""}" data-route="${route}">
                        ${icone(iconeNom)}<span>${titre}</span>
                    </button>
                `).join("")}
            </nav>
            <div class="sidebar-bas">KOUECONSOLIDATED<br>Groupe multi-activités</div>
        </aside>
    `;
}

function rendreHeader() {
    const initiales = (etat.utilisateur?.nom || "Admin").split(" ").map(mot => mot[0]).slice(0, 2).join("").toUpperCase();
    return `
        <header class="header">
            <button class="menu-btn" id="btnMenu" title="Menu">${icone("menu")}</button>
            <label class="recherche">
                ${icone("search")}
                <input id="recherche" placeholder="Search in Koue Manager">
            </label>
            <div></div>
            <div class="actions-header">
                <button class="icone" title="Activités">${icone("bag")}<span class="pastille">5</span></button>
                <button class="icone" title="Applications">${icone("grid")}</button>
                <span class="drapeau">FR</span>
                <button class="icone" id="themeBtn" title="Thème">${icone("sun")}</button>
                <button class="icone" title="Notifications">${icone("bell")}<span class="pastille rouge">3</span></button>
                <button class="icone" id="pleinEcran" title="Plein écran">${icone("maximize")}</button>
                <div class="avatar" title="${echapper(etat.utilisateur?.nom || "")}">
                    <span class="avatar-image">${initiales}</span>
                </div>
            </div>
        </header>
    `;
}

function brancherShell() {
    document.querySelector("#btnMenu").addEventListener("click", () => {
        document.body.classList.toggle("sidebar-ouverte");
    });

    document.querySelectorAll("[data-route]").forEach(bouton => {
        bouton.addEventListener("click", async () => {
            document.body.classList.remove("sidebar-ouverte");
            await naviguer(bouton.dataset.route);
        });
    });

    document.querySelector("#pleinEcran").addEventListener("click", () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    });
}

async function chargerReferences() {
    const reponse = await api("listes_reference", {});
    etat.references = reponse;
}

async function naviguer(route) {
    etat.route = route;
    document.querySelectorAll(".nav-bouton").forEach(b => b.classList.toggle("actif", b.dataset.route === route));
    await avecChargeur("Chargement de la page", async () => {
        if (route === "tableau_bord") return rendreTableauBord();
        if (route === "activites") return rendreActivites();
        if (route === "versements") return rendreVersements();
        if (route === "decaissements") return rendreTransactions("decaissement");
        if (route === "inventaire") return rendreInventaire();
        if (route === "rapports") return rendreRapports();
        if (route === "utilisateurs") return rendreUtilisateurs();
        if (route === "parametres") return rendreParametres();
    });
}

async function rendreTableauBord() {
    const { resume, activites, transactions, echeances } = await api("tableau_bord", {});
    contenu().innerHTML = `
        ${entete("Tableau de bord", "Vue consolidée des activités, versements, dépenses et inventaire.")}
        <section class="grille-cartes">
            ${carte("Activités actives", resume.activites)}
            ${carte("Revenus", argent(resume.revenus))}
            ${carte("Décaissements", argent(resume.decaissements))}
            ${carte("Résultat net", argent(resume.resultat))}
            ${carte("Inventaire valorisé", argent(resume.inventaire))}
        </section>
        <section class="grille-2">
            <div class="section">
                <h3>Activités récentes</h3>
                ${tableau(["Code", "Activité", "Type", "Revenus", "Dépenses", "Statut"], activites.map(a => [
                    a.code, a.nom, a.type_nom, argent(a.revenus), argent(a.decaissements), badge(a.statut)
                ]))}
            </div>
            <div class="section">
                <h3>Échéances proches</h3>
                ${tableau(["Activité", "Période", "Attendu", "Payé", "Statut"], echeances.map(e => [
                    e.activite_code, `${dateFr(e.debut_periode)} - ${dateFr(e.fin_periode)}`, argent(e.montant_attendu), argent(e.montant_paye), badge(e.statut)
                ]))}
            </div>
        </section>
        <section class="section">
            <h3>Dernières transactions</h3>
            ${tableau(["Date", "Activité", "Catégorie", "Type", "Montant"], transactions.map(t => [
                dateFr(t.date_transaction), t.activite_nom, t.categorie_nom || "-", badge(t.type), argent(t.montant)
            ]))}
        </section>
    `;
}

async function rendreActivites() {
    const { donnees } = await api("activites", {});
    contenu().innerHTML = `
        ${entete("Activités", "Ajoutez des motos, élevages, boutiques ou futurs métiers sans changer la base.", `<button class="btn primary" id="btnSauverActivite">Enregistrer</button>`)}
        <section class="grille-2">
            <form class="carte formulaire" id="formActivite">
                <h3>Nouvelle activité</h3>
                <div class="form-grid">
                    ${champSelect("type_activite_id", "Type", options(etat.references.types, "id", "nom"))}
                    ${champ("code", "Code", "MOTO-03")}
                    ${champ("nom", "Nom", "Nouvelle activité", "large")}
                    ${champSelect("gerant_utilisateur_id", "Gérant", `<option value="">Non affecté</option>${options(etat.references.utilisateurs, "id", "nom")}`)}
                    ${champ("montant_versement", "Versement attendu", "25000", "", "number")}
                    ${champ("date_demarrage", "Date démarrage", new Date().toISOString().slice(0, 10), "", "date")}
                    ${champSelect("statut", "Statut", `<option value="actif">Actif</option><option value="en_pause">En pause</option><option value="cede">Cédé</option><option value="cloture">Clôturé</option>`)}
                    <div class="champ large"><label>Attributs JSON</label><textarea name="attributs">{}</textarea></div>
                </div>
            </form>
            <div class="section">
                <h3>Liste</h3>
                ${tableau(["Code", "Nom", "Type", "Gérant", "Versement", "Statut"], donnees.map(a => [
                    a.code, a.nom, a.type_nom, a.gerant_nom || "-", argent(a.montant_versement), badge(a.statut)
                ]))}
            </div>
        </section>
    `;
    document.querySelector("#btnSauverActivite").addEventListener("click", () => soumettreActivite());
}

async function soumettreActivite() {
    const form = document.querySelector("#formActivite");
    const donnees = Object.fromEntries(new FormData(form));
    try {
        donnees.attributs = JSON.parse(donnees.attributs || "{}");
    } catch {
        alert("Le champ Attributs JSON est invalide.");
        return;
    }
    await avecChargeur("Enregistrement de l’activité", () => api("enregistrer_activite", donnees));
    await chargerReferences();
    await rendreActivites();
}

async function rendreVersements() {
    const { donnees } = await api("echeances", {});
    contenu().innerHTML = `
        ${entete("Versements", "Suivi des échéances hebdomadaires et encaissements des activités.", `
            <div class="actions-ligne">
                <button class="btn gold" id="btnGenerer">Générer la semaine</button>
                <button class="btn primary" id="btnVersement">Enregistrer versement</button>
            </div>
        `)}
        <section class="grille-2">
            <form class="carte formulaire" id="formVersement">
                <h3>Nouveau versement</h3>
                <div class="form-grid">
                    ${champSelect("activite_id", "Activité", options(etat.references.activites, "id", "nom"))}
                    ${champSelect("echeance_id", "Échéance", `<option value="">Sans échéance</option>${donnees.map(e => `<option value="${e.id}">${echapper(e.activite_code)} - ${dateFr(e.debut_periode)}</option>`).join("")}`)}
                    ${champSelect("categorie_id", "Catégorie", options(etat.references.categories.filter(c => c.nature === "revenu"), "id", "nom"))}
                    ${champ("montant", "Montant", "25000", "", "number")}
                    ${champ("date_transaction", "Date", new Date().toISOString().slice(0, 10), "", "date")}
                    ${champSelect("mode_paiement", "Paiement", modesPaiement())}
                    <div class="champ large"><label>Note</label><textarea name="note"></textarea></div>
                    <input type="hidden" name="type" value="revenu">
                </div>
            </form>
            <div class="section">
                <h3>Échéances</h3>
                ${tableau(["Activité", "Période", "Attendu", "Payé", "Statut"], donnees.map(e => [
                    e.activite_nom, `${dateFr(e.debut_periode)} - ${dateFr(e.fin_periode)}`, argent(e.montant_attendu), argent(e.montant_paye), badge(e.statut)
                ]))}
            </div>
        </section>
    `;
    document.querySelector("#btnGenerer").addEventListener("click", async () => {
        await avecChargeur("Génération des échéances", () => api("generer_echeances", {}));
        await rendreVersements();
    });
    document.querySelector("#btnVersement").addEventListener("click", () => soumettreTransaction("#formVersement", "versements"));
}

async function rendreTransactions(type) {
    const { donnees } = await api("transactions", {});
    const lignes = donnees.filter(t => t.type === type);
    contenu().innerHTML = `
        ${entete("Dépenses", "Enregistrez carburant, réparations, aliments, salaires et autres décaissements.", `<button class="btn primary" id="btnDepense">Enregistrer</button>`)}
        <section class="grille-2">
            <form class="carte formulaire" id="formDepense">
                <h3>Nouvelle dépense</h3>
                <div class="form-grid">
                    ${champSelect("activite_id", "Activité", options(etat.references.activites, "id", "nom"))}
                    ${champSelect("categorie_id", "Catégorie", options(etat.references.categories.filter(c => c.nature === "decaissement"), "id", "nom"))}
                    ${champ("montant", "Montant", "10000", "", "number")}
                    ${champ("date_transaction", "Date", new Date().toISOString().slice(0, 10), "", "date")}
                    ${champSelect("mode_paiement", "Paiement", modesPaiement())}
                    <div class="champ large"><label>Note</label><textarea name="note"></textarea></div>
                    <input type="hidden" name="type" value="decaissement">
                </div>
            </form>
            <div class="section">
                <h3>Historique</h3>
                ${tableau(["Date", "Activité", "Catégorie", "Montant", "Paiement"], lignes.map(t => [
                    dateFr(t.date_transaction), t.activite_nom, t.categorie_nom || "-", argent(t.montant), t.mode_paiement
                ]))}
            </div>
        </section>
    `;
    document.querySelector("#btnDepense").addEventListener("click", () => soumettreTransaction("#formDepense", "decaissements"));
}

async function soumettreTransaction(formSelector, retour) {
    const donnees = Object.fromEntries(new FormData(document.querySelector(formSelector)));
    await avecChargeur("Enregistrement de la transaction", () => api("enregistrer_transaction", donnees));
    retour === "versements" ? await rendreVersements() : await rendreTransactions("decaissement");
}

async function rendreInventaire() {
    const { donnees } = await api("inventaire", {});
    contenu().innerHTML = `
        ${entete("Inventaire", "Biens durables, stocks consommables et cheptel par activité.", `<button class="btn primary" id="btnArticle">Enregistrer</button>`)}
        <section class="grille-2">
            <form class="carte formulaire" id="formArticle">
                <h3>Nouvel article</h3>
                <div class="form-grid">
                    ${champSelect("activite_id", "Activité", options(etat.references.activites, "id", "nom"))}
                    ${champ("nom", "Nom", "Sac d’aliment", "")}
                    ${champSelect("type_article", "Type", `<option value="bien_durable">Bien durable</option><option value="stock_consommable">Stock consommable</option><option value="cheptel">Cheptel</option>`)}
                    ${champ("quantite", "Quantité", "1", "", "number")}
                    ${champ("unite", "Unité", "unité")}
                    ${champ("valeur_unitaire", "Valeur unitaire", "0", "", "number")}
                    <div class="champ large"><label>Attributs JSON</label><textarea name="attributs">{}</textarea></div>
                </div>
            </form>
            <div class="section">
                <h3>Articles</h3>
                ${tableau(["Activité", "Article", "Type", "Quantité", "Valeur"], donnees.map(i => [
                    i.activite_nom, i.nom, badge(i.type_article), `${nombre(i.quantite)} ${i.unite}`, argent(i.valeur_totale)
                ]))}
            </div>
        </section>
    `;
    document.querySelector("#btnArticle").addEventListener("click", async () => {
        const donnees = Object.fromEntries(new FormData(document.querySelector("#formArticle")));
        try {
            donnees.attributs = JSON.parse(donnees.attributs || "{}");
        } catch {
            alert("Le champ Attributs JSON est invalide.");
            return;
        }
        await avecChargeur("Enregistrement de l’article", () => api("enregistrer_article", donnees));
        await rendreInventaire();
    });
}

async function rendreRapports() {
    const debut = new Date();
    debut.setDate(1);
    const fin = new Date();
    const rapport = await api("rapport", {
        debut: debut.toISOString().slice(0, 10),
        fin: fin.toISOString().slice(0, 10),
    });
    const data = rapport.donnees;
    contenu().innerHTML = `
        ${entete("Rapports", "Bilan consolidé et résultat par activité sur la période sélectionnée.")}
        <section class="grille-cartes">
            ${carte("Revenus", argent(data.totaux.revenus))}
            ${carte("Dépenses", argent(data.totaux.decaissements))}
            ${carte("Résultat", argent(data.totaux.resultat))}
        </section>
        <section class="section">
            <h3>Détail par activité</h3>
            ${tableau(["Code", "Activité", "Type", "Revenus", "Dépenses", "Résultat"], data.activites.map(a => [
                a.code, a.nom, a.type_nom, argent(a.revenus), argent(a.decaissements), argent(a.resultat)
            ]))}
        </section>
    `;
}

async function rendreUtilisateurs() {
    const { donnees } = await api("utilisateurs", {});
    contenu().innerHTML = `
        ${entete("Utilisateurs", "Comptes et rôles disponibles pour le web et la future application mobile.")}
        <section class="section">
            ${tableau(["Nom", "Email", "Rôle", "Statut", "Dernière connexion"], donnees.map(u => [
                u.nom, u.email, u.role_nom || "-", badge(u.statut), u.derniere_connexion ? dateFr(u.derniere_connexion) : "-"
            ]))}
        </section>
    `;
}

async function rendreParametres() {
    const { donnees } = await api("parametres", {});
    contenu().innerHTML = `
        ${entete("Paramètres", "Configuration globale de KOUECONSOLIDATED.")}
        <section class="section">
            ${tableau(["Clé", "Valeur", "Description"], donnees.map(p => [p.cle, p.valeur || "-", p.description || "-"]))}
        </section>
        <button class="btn ghost" id="deconnexion">Se déconnecter</button>
    `;
    document.querySelector("#deconnexion").addEventListener("click", async () => {
        await avecChargeur("Déconnexion", () => api("deconnexion", {}));
        etat.utilisateur = null;
        rendreConnexion();
    });
}

function contenu() {
    return document.querySelector("#contenu");
}

function entete(titre, description, action = "") {
    return `
        <div class="entete-page">
            <div><h2>${titre}</h2><p>${description}</p></div>
            ${action}
        </div>
    `;
}

function carte(label, valeur) {
    return `<article class="carte"><span>${label}</span><strong>${valeur}</strong></article>`;
}

function tableau(entetes, lignes) {
    if (!lignes.length) {
        return `<div class="table-wrap"><table><thead><tr>${entetes.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody><tr><td colspan="${entetes.length}">Aucune donnée pour le moment.</td></tr></tbody></table></div>`;
    }
    return `
        <div class="table-wrap">
            <table>
                <thead><tr>${entetes.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                <tbody>${lignes.map(ligne => `<tr>${ligne.map(cellule => `<td>${cellule}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
        </div>
    `;
}

function champ(nom, label, valeur = "", classe = "", type = "text") {
    return `<div class="champ ${classe}"><label>${label}</label><input name="${nom}" type="${type}" value="${echapper(valeur)}"></div>`;
}

function champSelect(nom, label, opts, classe = "") {
    return `<div class="champ ${classe}"><label>${label}</label><select name="${nom}">${opts}</select></div>`;
}

function options(lignes, valeur, label) {
    return lignes.map(l => `<option value="${echapper(l[valeur])}">${echapper(l[label])}</option>`).join("");
}

function modesPaiement() {
    return `<option value="especes">Espèces</option><option value="mobile_money">Mobile Money</option><option value="banque">Banque</option><option value="autre">Autre</option>`;
}

function badge(statut) {
    const texte = String(statut || "").replaceAll("_", " ");
    const cls = ["paye", "actif", "revenu"].includes(statut) ? "vert" : ["en_retard", "impaye", "decaissement"].includes(statut) ? "rouge" : "or";
    return `<span class="badge ${cls}">${echapper(texte)}</span>`;
}

function argent(valeur) {
    return `${nombre(valeur)} FCFA`;
}

function nombre(valeur) {
    return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(valeur || 0));
}

function dateFr(valeur) {
    if (!valeur) return "-";
    return new Intl.DateTimeFormat("fr-FR").format(new Date(valeur));
}

function echapper(valeur) {
    return String(valeur ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function icone(nom) {
    const paths = {
        menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        dashboard: '<path d="M4 13h6V4H4v9Zm10 7h6V4h-6v16ZM4 20h6v-3H4v3Z"/>',
        briefcase: '<path d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1"/><path d="M4 7h16v12H4z"/><path d="M4 12h16"/>',
        wallet: '<path d="M4 7h15v12H4z"/><path d="M16 12h4v4h-4z"/><path d="M4 7l3-3h10v3"/>',
        receipt: '<path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
        boxes: '<path d="M4 7 12 3l8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
        chart: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16V9M12 16V6M16 16v-4"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20h-3v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3v-3h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.12-2.12.06.06A1.7 1.7 0 0 0 8.3 5.6a1.7 1.7 0 0 0 1-1.55V4h3v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06A1.7 1.7 0 0 0 19.4 9c.6 0 1.1.4 1.55 1H21v3h-.09a1.7 1.7 0 0 0-1.51 1Z"/>',
        bag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
        grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 21h4"/>',
        maximize: '<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[nom] || paths.dashboard}</svg>`;
}
