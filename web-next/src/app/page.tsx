"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { ChartGrid } from "../components/ChartPanel";
import { ChartFiltersBar, defaultChartFilters, filtersToQuery } from "../components/ChartFilters";
import type { ChartFilters, Graphique } from "../types/charts";


type ApiResponse<T> = T & { statut: "ok" | "erreur"; message?: string };
type User = { id: number; nom: string; email: string; role?: { nom: string } };
type Resume = { activites: number; revenus: number; decaissements: number; resultat: number; retards: number; inventaire: number };
type Activite = { id: number; nom: string; code: string; statut: string; montant_versement: string | number; type_activite?: { nom: string; couleur?: string } };
type Transaction = { id: number; type: "revenu" | "decaissement"; montant: string | number; date_transaction: string; mode_paiement: string; activite?: { nom: string; code: string }; categorie?: { nom: string } };
type Echeance = { id: number; debut_periode: string; fin_periode: string; montant_attendu: string | number; montant_paye: string | number; statut: string; activite?: { nom: string; code: string } };
type Article = { id: number; nom: string; type_article: string; quantite: string | number; unite: string; valeur_unitaire: string | number; activite?: { nom: string; code: string } };
type Named = { id: number; nom: string };
type References = { types_activites: Named[]; categories_transactions: Array<Named & { nature: string }>; activites: Array<Named & { code: string }>; utilisateurs: Named[] };

const routes = [
  ["tableau-bord", "Tableau de bord", "▦"],
  ["vue-ensemble", "Vue d'ensemble", "◫"],
  ["activites", "Activités", "▣"],
  ["versements", "Versements", "◉"],
  ["depenses", "Dépenses", "◍"],
  ["inventaire", "Inventaire", "▤"],
  ["rapports", "Rapports", "▥"],
  ["utilisateurs", "Utilisateurs", "◎"],
  ["parametres", "Paramètres", "⚙"],
] as const;

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState("tableau-bord");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [refs, setRefs] = useState<References>({ types_activites: [], categories_transactions: [], activites: [], utilisateurs: [] });
  const [dashboard, setDashboard] = useState<{ resume?: Resume; activites?: Activite[]; transactions?: Transaction[]; echeances?: Echeance[]; graphiques?: Graphique[] }>({});
  const [vueEnsemble, setVueEnsemble] = useState<Graphique[]>([]);
  const [chartFilters, setChartFilters] = useState<ChartFilters>(defaultChartFilters);
  const [chartFiltersDraft, setChartFiltersDraft] = useState<ChartFilters>(defaultChartFilters);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [rapport, setRapport] = useState<any>(null);
  const [utilisateurs, setUtilisateurs] = useState<User[]>([]);
  const [parametres, setParametres] = useState<Array<{ cle: string; valeur: string; description: string }>>([]);

  const api = useMemo(() => {
    return async <T,>(path: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers);
      headers.set("Accept", "application/json");
      if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const response = await fetch(`/api/v1/${path}`, { ...options, headers });
      const json = (await response.json()) as ApiResponse<T>;
      if (!response.ok || json.statut === "erreur") throw new Error(json.message ?? "Erreur API");
      return json;
    };
  }, [token]);

  useEffect(() => {
    const savedToken = localStorage.getItem("koue_token");
    const savedUser = localStorage.getItem("koue_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    void runLoader(() => Promise.resolve());
  }, []);

  useEffect(() => {
    if (token) void chargerBase();
  }, [token]);

  useEffect(() => {
    if (token) void chargerRoute(route);
  }, [route, token]);

  async function runLoader(work: () => Promise<void>) {
    setLoading(true);
    setProgress(0);
    const timer = window.setInterval(() => setProgress((value) => Math.min(94, value + Math.ceil(Math.random() * 9))), 70);
    try {
      await work();
      setProgress(100);
      await new Promise((resolve) => setTimeout(resolve, 220));
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function chargerBase() {
    await runLoader(async () => {
      const references = await api<References>("references");
      setRefs(references);
      await chargerRoute(route);
    });
  }

  async function chargerRoute(nextRoute: string) {
    await runLoader(async () => {
      if (nextRoute === "tableau-bord") setDashboard(await api("tableau-bord"));
      if (nextRoute === "vue-ensemble") {
        const query = filtersToQuery(chartFilters);
        const response = await api<{ graphiques: Graphique[]; filtres: ChartFilters }>(`graphiques/vue-ensemble?${query}`);
        setVueEnsemble(response.graphiques ?? []);
        if (response.filtres) {
          setChartFilters((prev) => ({
            ...prev,
            ...response.filtres,
            activite_id: String(response.filtres.activite_id ?? ""),
            type_transaction: String(response.filtres.type_transaction ?? ""),
          }));
        }
      }
      if (nextRoute === "activites") setActivites((await api<{ donnees: Activite[] }>("activites")).donnees);
      if (nextRoute === "versements") setEcheances((await api<{ donnees: { data: Echeance[] } }>("echeances-versements")).donnees.data);
      if (nextRoute === "depenses") setTransactions((await api<{ donnees: { data: Transaction[] } }>("transactions?type=decaissement")).donnees.data);
      if (nextRoute === "inventaire") setArticles((await api<{ donnees: { data: Article[] } }>("inventaire")).donnees.data);
      if (nextRoute === "rapports") setRapport((await api<{ donnees: any }>("rapports/bilan")).donnees);
      if (nextRoute === "utilisateurs") setUtilisateurs((await api<{ donnees: User[] }>("utilisateurs")).donnees);
      if (nextRoute === "parametres") setParametres((await api<{ donnees: Array<{ cle: string; valeur: string; description: string }> }>("parametres")).donnees);
    });
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await runLoader(async () => {
        const response = await fetch("/api/v1/connexion", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...data, nom_appareil: "web-next" }),
        });
        const json = await response.json();
        if (!response.ok || json.statut === "erreur") throw new Error(json.message ?? "Connexion impossible");
        localStorage.setItem("koue_token", json.jeton);
        localStorage.setItem("koue_user", JSON.stringify(json.utilisateur));
        setToken(json.jeton);
        setUser(json.utilisateur);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    }
  }

  async function logout() {
    try {
      if (token) await api("deconnexion", { method: "POST", body: "{}" });
    } finally {
      localStorage.removeItem("koue_token");
      localStorage.removeItem("koue_user");
      setToken(null);
      setUser(null);
      setRoute("tableau-bord");
      setMobileMenuOpen(false);
      setSidebarCollapsed(false);
    }
  }

  function toggleNavigation() {
    if (window.matchMedia("(max-width: 760px)").matches) {
      setMobileMenuOpen((open) => !open);
      return;
    }

    setSidebarCollapsed((collapsed) => !collapsed);
  }

  function openRoute(nextRoute: string) {
    setRoute(nextRoute);
    setMobileMenuOpen(false);
  }

  async function submitActivite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("activites", { method: "POST", body: JSON.stringify({ ...data, attributs: {}, statut: "actif" }) });
    event.currentTarget.reset();
    await chargerBase();
    await chargerRoute("activites");
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>, type: "revenu" | "decaissement") {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("transactions", { method: "POST", body: JSON.stringify({ ...data, type }) });
    event.currentTarget.reset();
    await chargerBase();
    await chargerRoute(type === "revenu" ? "versements" : "depenses");
  }

  async function submitArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("inventaire", { method: "POST", body: JSON.stringify({ ...data, attributs: {} }) });
    event.currentTarget.reset();
    await chargerRoute("inventaire");
  }

  async function appliquerFiltresGraphiques() {
    setChartFilters(chartFiltersDraft);
    await runLoader(async () => {
      const query = filtersToQuery(chartFiltersDraft);
      const response = await api<{ graphiques: Graphique[] }>(`graphiques/vue-ensemble?${query}`);
      setVueEnsemble(response.graphiques ?? []);
    });
  }

  useEffect(() => {
    if (token && route === "vue-ensemble") {
      setChartFiltersDraft(chartFilters);
    }
  }, [route, token]);
  async function genererEcheances() {
    await api("echeances-versements/generer", { method: "POST", body: "{}" });
    await chargerRoute("versements");
  }

  if (!token || !user) {
    return (
      <>
        <Loader visible={loading} progress={progress} />
        <main className="login-screen">
          <section className="login-hero">
            <div className="login-brand-mark">
              <img src="/logo-koue.svg" alt="KOUECONSOLIDATED" />
            </div>
            <div className="login-copy">
              <span className="login-kicker">Groupe multi-activités</span>
              <h1>KOUE MANAGER</h1>
              <p>Un poste de contrôle clair pour suivre les motos, l’élevage, les versements, les dépenses et l’inventaire depuis le même compte.</p>
            </div>
            <div className="login-metrics" aria-label="Aperçu des modules">
              <div><strong>4</strong><span>activités prêtes</span></div>
              <div><strong>API</strong><span>web et mobile</span></div>
              <div><strong>100%</strong><span>JSON sécurisé</span></div>
            </div>
          </section>
          <section className="login-panel">
            <div className="login-card-head">
              <span className="secure-pill">Accès sécurisé</span>
              <h2>Connexion</h2>
              <p>Entrez dans votre espace de gestion KOUECONSOLIDATED.</p>
            </div>
            <form className="form login-form" onSubmit={login}>
              {error && <div className="alert">{error}</div>}
              <label>
                Adresse email
                <input name="email" type="email" defaultValue="admin@kouemanager.local" autoComplete="email" required />
              </label>
              <label>
                Mot de passe
                <input name="mot_de_passe" type="password" defaultValue="Admin@1234" autoComplete="current-password" required />
              </label>
              <button className="btn primary login-submit" type="submit">Se connecter</button>
              <div className="login-footnote">
                <span>Laravel Sanctum</span>
                <span>Synchronisation web/mobile</span>
              </div>
            </form>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Loader visible={loading} progress={progress} />
      <main className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
        <aside className="sidebar">
          <div className="brand"><img src="/logo-koue.svg" alt="" /><strong>KOUE</strong></div>
          <nav>{routes.map(([key, label, icon]) => <button key={key} className={route === key ? "active" : ""} onClick={() => openRoute(key)} title={label} aria-label={label}><span>{icon}</span>{label}</button>)}</nav>
          <small>KOUECONSOLIDATED<br />Groupe multi-activités</small>
        </aside>
        <button className="sidebar-backdrop" type="button" aria-label="Fermer le menu" onClick={() => setMobileMenuOpen(false)} />
        <section className="main-area">
          <header className="topbar">
            <button className="icon-button menu-button" type="button" onClick={toggleNavigation} aria-label="Ouvrir ou fermer le menu" aria-expanded={mobileMenuOpen || !sidebarCollapsed}>☰</button>
            <label className="search">⌕<input placeholder="Search in Koue Manager" /></label>
            <div className="top-actions">
              <span className="badge-dot">5</span><button className="icon-button">▦</button><span className="flag">FR</span><button className="icon-button">☼</button><span className="badge-dot red">3</span>
              <button className="logout-icon-button" onClick={logout} title="Déconnexion" aria-label="Déconnexion"><span className="logout-icon" aria-hidden="true" /></button>
            </div>
          </header>
          <section className="content">{renderRoute()}</section>
        </section>
      </main>
    </>
  );

  function renderRoute() {
    const resume = dashboard.resume;
    if (route === "tableau-bord") {
      return <>
        <PageTitle title="Tableau de bord" subtitle="Vue consolidée des activités, versements, dépenses et inventaire." />
        <div className="cards"><Card label="Activités" value={resume?.activites ?? 0} /><Card label="Revenus" value={money(resume?.revenus)} /><Card label="Dépenses" value={money(resume?.decaissements)} /><Card label="Résultat" value={money(resume?.resultat)} /><Card label="Inventaire" value={money(resume?.inventaire)} /></div>
        <ChartGrid graphiques={dashboard.graphiques ?? []} compact />
        <Grid><Panel title="Activités récentes"><Table heads={["Code", "Activité", "Type", "Versement", "Statut"]} rows={(dashboard.activites ?? []).map((a) => [a.code, a.nom, a.type_activite?.nom ?? "-", money(a.montant_versement), pill(a.statut)])} /></Panel><Panel title="Échéances"><Table heads={["Activité", "Période", "Attendu", "Payé", "Statut"]} rows={(dashboard.echeances ?? []).map((e) => [e.activite?.code ?? "-", `${date(e.debut_periode)} - ${date(e.fin_periode)}`, money(e.montant_attendu), money(e.montant_paye), pill(e.statut)])} /></Panel></Grid>
      </>;
    }
    if (route === "vue-ensemble") {
      return <>
        <PageTitle title="Vue d'ensemble" subtitle="Tous les graphiques et indicateurs avec filtres précis." />
        <ChartFiltersBar filters={chartFiltersDraft} activites={refs.activites} onChange={setChartFiltersDraft} onApply={() => void appliquerFiltresGraphiques()} />
        <ChartGrid graphiques={vueEnsemble} />
      </>;
    }
    if (route === "activites") return <><PageTitle title="Activités" subtitle="Créez tout nouveau business sans modifier le schéma." /><Grid><Panel title="Nouvelle activité"><form className="form compact" onSubmit={submitActivite}><Select name="type_activite_id" label="Type" items={refs.types_activites} /><input name="code" placeholder="Code" required /><input name="nom" placeholder="Nom de l’activité" required /><input name="montant_versement" type="number" placeholder="Versement attendu" defaultValue={0} /><input name="date_demarrage" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /><button className="btn primary">Enregistrer</button></form></Panel><Panel title="Liste"><Table heads={["Code", "Nom", "Type", "Versement", "Statut"]} rows={activites.map((a) => [a.code, a.nom, a.type_activite?.nom ?? "-", money(a.montant_versement), pill(a.statut)])} /></Panel></Grid></>;
    if (route === "versements") return <><PageTitle title="Versements" subtitle="Générez les échéances et saisissez les paiements." action={<button className="btn gold" onClick={genererEcheances}>Générer la semaine</button>} /><Grid><Panel title="Nouveau versement"><form className="form compact" onSubmit={(e) => submitTransaction(e, "revenu")}><Select name="activite_id" label="Activité" items={refs.activites} /><Select name="categorie_id" label="Catégorie" items={refs.categories_transactions.filter((c) => c.nature === "revenu")} /><input name="montant" type="number" placeholder="Montant" required /><input name="date_transaction" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /><PaymentSelect /><button className="btn primary">Enregistrer</button></form></Panel><Panel title="Échéances"><Table heads={["Activité", "Période", "Attendu", "Payé", "Statut"]} rows={echeances.map((e) => [e.activite?.nom ?? "-", `${date(e.debut_periode)} - ${date(e.fin_periode)}`, money(e.montant_attendu), money(e.montant_paye), pill(e.statut)])} /></Panel></Grid></>;
    if (route === "depenses") return <><PageTitle title="Dépenses" subtitle="Décaissements, carburant, réparations, aliments, salaires." /><Grid><Panel title="Nouvelle dépense"><form className="form compact" onSubmit={(e) => submitTransaction(e, "decaissement")}><Select name="activite_id" label="Activité" items={refs.activites} /><Select name="categorie_id" label="Catégorie" items={refs.categories_transactions.filter((c) => c.nature === "decaissement")} /><input name="montant" type="number" placeholder="Montant" required /><input name="date_transaction" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /><PaymentSelect /><button className="btn primary">Enregistrer</button></form></Panel><Panel title="Historique"><Table heads={["Date", "Activité", "Catégorie", "Montant", "Paiement"]} rows={transactions.map((t) => [date(t.date_transaction), t.activite?.nom ?? "-", t.categorie?.nom ?? "-", money(t.montant), t.mode_paiement])} /></Panel></Grid></>;
    if (route === "inventaire") return <><PageTitle title="Inventaire" subtitle="Biens durables, stocks consommables et cheptel." /><Grid><Panel title="Nouvel article"><form className="form compact" onSubmit={submitArticle}><Select name="activite_id" label="Activité" items={refs.activites} /><input name="nom" placeholder="Nom" required /><select name="type_article"><option value="bien_durable">Bien durable</option><option value="stock_consommable">Stock consommable</option><option value="cheptel">Cheptel</option></select><input name="quantite" type="number" placeholder="Quantité" defaultValue={1} /><input name="unite" placeholder="Unité" defaultValue="unite" /><input name="valeur_unitaire" type="number" placeholder="Valeur unitaire" defaultValue={0} /><button className="btn primary">Enregistrer</button></form></Panel><Panel title="Articles"><Table heads={["Activité", "Article", "Type", "Quantité", "Valeur"]} rows={articles.map((a) => [a.activite?.nom ?? "-", a.nom, pill(a.type_article), `${a.quantite} ${a.unite}`, money(Number(a.quantite) * Number(a.valeur_unitaire))])} /></Panel></Grid></>;
    if (route === "rapports") return <><PageTitle title="Rapports" subtitle="Bilan consolidé par activité sur la période courante." /><div className="cards"><Card label="Revenus" value={money(rapport?.totaux?.revenus)} /><Card label="Dépenses" value={money(rapport?.totaux?.decaissements)} /><Card label="Résultat" value={money(rapport?.totaux?.resultat)} /></div><Panel title="Détail par activité"><Table heads={["Code", "Activité", "Type", "Revenus", "Dépenses", "Résultat"]} rows={(rapport?.activites ?? []).map((a: any) => [a.code, a.nom, a.type_activite, money(a.revenus), money(a.decaissements), money(a.resultat)])} /></Panel></>;
    if (route === "utilisateurs") return <><PageTitle title="Utilisateurs" subtitle="Comptes utilisables sur le web et le mobile avec le même token." /><Panel title="Liste des comptes"><Table heads={["Nom", "Email", "Rôle"]} rows={utilisateurs.map((u) => [u.nom, u.email, u.role?.nom ?? "-"])} /></Panel></>;
    return <><PageTitle title="Paramètres" subtitle="Configuration globale de KOUECONSOLIDATED." /><Panel title="Paramètres"><Table heads={["Clé", "Valeur", "Description"]} rows={parametres.map((p) => [p.cle, p.valeur, p.description])} /></Panel></>;
  }
}

function Loader({ visible, progress }: { visible: boolean; progress: number }) {
  return <div className={`loader ${visible ? "visible" : ""}`}><div className="loader-bg" /><div className="loader-inner"><div className="orbit"><span /><span /><span /><div><img src="/logo-koue.svg" alt="" /></div></div><strong>KOUE MANAGER</strong><small>Chargement...</small><div className="progress"><i style={{ width: `${progress}%` }} /></div><em>{progress}%</em></div></div>;
}

function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>;
}

function Card({ label, value }: { label: string; value: ReactNode }) {
  return <article className="card"><span>{label}</span><strong>{value}</strong></article>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel"><h3>{title}</h3>{children}</section>;
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid-2">{children}</div>;
}

function Table({ heads, rows }: { heads: string[]; rows: ReactNode[][] }) {
  return <div className="table-wrap"><table><thead><tr>{heads.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>) : <tr><td colSpan={heads.length}>Aucune donnée.</td></tr>}</tbody></table></div>;
}

function Select({ name, label, items }: { name: string; label: string; items: Named[] }) {
  return <select name={name} aria-label={label} required><option value="">{label}</option>{items.map((item) => <option value={item.id} key={item.id}>{item.nom}</option>)}</select>;
}

function PaymentSelect() {
  return <select name="mode_paiement"><option value="especes">Espèces</option><option value="mobile_money">Mobile Money</option><option value="banque">Banque</option><option value="autre">Autre</option></select>;
}

function pill(value: string) {
  const cls = ["paye", "actif", "revenu", "valide"].includes(value) ? "green" : ["en_retard", "impaye", "rejete"].includes(value) ? "red" : "gold";
  return <span className={`pill ${cls}`}>{value.replaceAll("_", " ")}</span>;
}

function money(value?: string | number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value ?? 0))} FCFA`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

