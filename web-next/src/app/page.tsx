"use client";

import { CSSProperties, FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { type Language, getTranslation } from "./translations";
import { ChartGrid } from "../components/ChartPanel";
import { ChartFiltersBar, defaultChartFilters, filtersToQuery } from "../components/ChartFilters";
import type { ChartFilters, Graphique } from "../types/charts";
import { ThemePicker } from "../components/ThemePicker";
import { applyTheme, DEFAULT_THEME_ID, THEME_STORAGE_KEY, themes, type ThemeId } from "./themes";


type ApiResponse<T> = T & { statut: "ok" | "erreur"; message?: string };
type Permission = { id: number; nom: string; slug: string; roles?: Role[] };
type Role = { id: number; nom: string; slug?: string; description?: string; permissions?: Permission[] };
type User = { id: number; role_id?: number; nom: string; email: string; telephone?: string; statut?: string; derniere_connexion?: string; role?: { nom: string }; plateforme?: { id?: number; nom?: string; slug?: string; email_contact?: string; telephone_contact?: string; adresse?: string; image_url?: string | null; statut?: string; limite_utilisateurs?: number; limite_activites?: number } };
type Resume = { activites: number; revenus: number; decaissements: number; resultat: number; retards: number; inventaire: number };
type TypeActivite = { id: number; nom: string; slug: string; a_versement_recurrent: boolean; frequence_versement: string; schema_champs?: Record<string, string> | null; icone?: string; couleur?: string; actif: boolean; activites_count?: number };
type Activite = { id: number; type_activite_id?: number; nom: string; code: string; statut: string; montant_versement: string | number; attributs?: Record<string, unknown>; type_activite?: { nom: string; couleur?: string }; gerant?: { nom: string; email: string } };
type Transaction = { id: number; type: "revenu" | "decaissement"; montant: string | number; date_transaction: string; mode_paiement: string; statut_validation?: string; note?: string; activite?: { nom: string; code: string }; categorie?: { nom: string }; auteur?: { nom: string } };
type Echeance = { id: number; debut_periode: string; fin_periode: string; montant_attendu: string | number; montant_paye: string | number; statut: string; activite?: { nom: string; code: string } };
type Article = { id: number; nom: string; type_article: string; quantite: string | number; unite: string; valeur_unitaire: string | number; seuil_alerte?: string | number | null; activite?: { nom: string; code: string } };
type NotificationItem = { id: number; titre: string; message: string; type_notification: string; lu: boolean; created_at?: string };
type AuditLog = { id: number; action: string; entite: string; entite_id?: number; adresse_ip?: string; created_at?: string; utilisateur?: { nom: string; email: string } };
type RapportActivite = { id: number; code: string; nom: string; type_activite?: string; revenus: number; decaissements: number; resultat: number };
type Rapport = { periode?: { debut: string; fin: string }; totaux?: { revenus: number; decaissements: number; resultat: number }; activites?: RapportActivite[] };
type Parametre = { cle: string; valeur: string; description: string };
type Named = { id: number; nom: string };
type References = { types_activites: TypeActivite[]; categories_transactions: Array<Named & { nature: string }>; activites: Array<Named & { code: string }>; utilisateurs: User[]; roles: Role[] };

const routes = [
  ["tableau-bord", "dashboard", "▦"],
  ["vue-ensemble", "overview", "◫"],
  ["activites", "activities", "▣"],
  ["versements", "installments", "◉"],
  ["depenses", "expenses", "◍"],
  ["inventaire", "inventory", "▤"],
  ["rapports", "reports", "▥"],
  ["types-activites", "typeActivities", "◧"],
  ["utilisateurs", "users", "◎"],
  ["notifications", "notifications", "◌"],
  ["audit", "audit", "◷"],
  ["infos", "infos", "ℹ"],
  ["parametres", "settings", "⚙"],
] as const;

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [route, setRoute] = useState("tableau-bord");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [infoMenuOpen, setInfoMenuOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(false);
  const [profileForm, setProfileForm] = useState({ nom: "", email: "", telephone: "", statut: "actif" });
  const [platformForm, setPlatformForm] = useState({ nom: "", slug: "", email_contact: "", telephone_contact: "", adresse: "" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [refs, setRefs] = useState<References>({ types_activites: [], categories_transactions: [], activites: [], utilisateurs: [], roles: [] });
  const [dashboard, setDashboard] = useState<{ resume?: Resume; activites?: Activite[]; transactions?: Transaction[]; echeances?: Echeance[]; graphiques?: Graphique[] }>({});
  const [vueEnsemble, setVueEnsemble] = useState<Graphique[]>([]);
  const [chartFilters, setChartFilters] = useState<ChartFilters>(defaultChartFilters);
  const [chartFiltersDraft, setChartFiltersDraft] = useState<ChartFilters>(defaultChartFilters);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [utilisateurs, setUtilisateurs] = useState<User[]>([]);
  const [typesActivites, setTypesActivites] = useState<TypeActivite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roleDraft, setRoleDraft] = useState<{ id?: number; nom: string; description: string; permissions: number[] } | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<{ id?: number; nom: string; roles: number[] } | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  
  const [lang, setLang] = useState<Language>("fr");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifPopupOpen, setNotifPopupOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(lang, key);

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
    setMounted(true);
    queueMicrotask(() => {
      const savedToken = localStorage.getItem("koue_token");
      const savedUser = localStorage.getItem("koue_user");
      const savedLang = localStorage.getItem("koue_lang") as Language | null;
      if (savedLang) setLang(savedLang);
      // Restore saved theme on mount
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      const themeId = savedTheme && themes.some((theme) => theme.id === savedTheme) ? savedTheme : DEFAULT_THEME_ID;
      applyTheme(themeId);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
      void runLoader(() => Promise.resolve());
    });
  }, []);

  useEffect(() => {
    if (token) void chargerBase();
  }, [token]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        nom: user.nom ?? "",
        email: user.email ?? "",
        telephone: user.telephone ?? "",
        statut: user.statut ?? "actif",
      });
      setPlatformForm({
        nom: user.plateforme?.nom ?? "",
        slug: user.plateforme?.slug ?? "",
        email_contact: user.plateforme?.email_contact ?? "",
        telephone_contact: user.plateforme?.telephone_contact ?? "",
        adresse: user.plateforme?.adresse ?? "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (token) void chargerRoute(route);
  }, [route, token]);

  async function runLoader(work: () => Promise<void>) {
    setLoading(true);
    setProgress(0);
    const timer = window.setInterval(() => setProgress((value) => Math.min(94, value + Math.ceil(Math.random() * 9))), 70);
    try {
      /* Ralentissement artificiel (1.5s) pour voir le skeleton */
      await new Promise((resolve) => setTimeout(resolve, 1500));
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
      const [references, alertes] = await Promise.all([
        api<References>("references"),
        api<{ donnees: NotificationItem[] }>("notifications"),
      ]);
      setRefs(references);
      setNotifications(alertes.donnees ?? []);
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
      if (nextRoute === "rapports") setRapport((await api<{ donnees: Rapport }>("rapports/bilan")).donnees);
      if (nextRoute === "types-activites") setTypesActivites((await api<{ donnees: TypeActivite[] }>("types-activites")).donnees);
      if (nextRoute === "utilisateurs") setUtilisateurs((await api<{ donnees: User[] }>("utilisateurs")).donnees);
      if (nextRoute === "roles") {
        const res = await api<{ donnees: Role[]; permissions: Permission[] }>("roles");
        setRoles(res.donnees);
        setPermissions(res.permissions);
      }
      if (nextRoute === "permissions") {
        const res = await api<{ donnees: Permission[]; roles: Role[] }>("permissions");
        setPermissions(res.donnees);
        setRoles(res.roles);
      }
      if (nextRoute === "notifications") setNotifications((await api<{ donnees: NotificationItem[] }>("notifications")).donnees);
      if (nextRoute === "audit") setAuditLogs((await api<{ donnees: { data: AuditLog[] } }>("audit")).donnees.data);
      if (nextRoute === "parametres") setParametres((await api<{ donnees: Parametre[] }>("parametres")).donnees);
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

  async function handleLogout() {
    setUserMenuOpen(false);
    const result = await Swal.fire({
      title: t("logoutConfirmTitle") as string || "Confirmation",
      text: t("logoutConfirmText") as string || "Voulez-vous vraiment vous déconnecter ?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--red)',
      cancelButtonColor: 'var(--muted)',
      confirmButtonText: t("logout") as string || 'Déconnexion',
      cancelButtonText: t("cancel") as string || 'Annuler',
      background: 'var(--surface)',
      color: 'var(--text)'
    });
    
    if (result.isConfirmed) {
      logout();
    }
  }

  async function saveProfile() {
    if (!user) return;

    const payload = {
      nom: profileForm.nom,
      email: profileForm.email,
      telephone: profileForm.telephone,
      statut: profileForm.statut || "actif",
      role_id: user.role_id ?? undefined,
    };

    await api(`utilisateurs/${user.id}`, { method: "PUT", body: JSON.stringify(payload) });
    const response = await api<{ utilisateur: User }>("moi");
    localStorage.setItem("koue_user", JSON.stringify(response.utilisateur));
    setUser(response.utilisateur);
    setEditingProfile(false);
    showToast(t("profileSaved"));
  }

  async function savePlatform() {
    if (!user?.plateforme?.id) return;

    const payload = {
      nom: platformForm.nom,
      slug: platformForm.slug,
      email_contact: platformForm.email_contact,
      telephone_contact: platformForm.telephone_contact,
      adresse: platformForm.adresse,
      statut: user.plateforme.statut ?? "actif",
      limite_utilisateurs: user.plateforme.limite_utilisateurs ?? 10,
      limite_activites: user.plateforme.limite_activites ?? 25,
    };

    await api(`plateformes/${user.plateforme.id}`, { method: "PUT", body: JSON.stringify(payload) });
    const response = await api<{ utilisateur: User }>("moi");
    localStorage.setItem("koue_user", JSON.stringify(response.utilisateur));
    setUser(response.utilisateur);
    setEditingPlatform(false);
    showToast(t("platformSaved"));
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? null : current), 3200);
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
    setInfoMenuOpen(false);
    setUsersMenuOpen(false);
    setMobileMenuOpen(false);
  }

  async function submitActivite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("activites", { method: "POST", body: JSON.stringify({ ...data, attributs: parseJsonObject(data.attributs), statut: data.statut || "actif" }) });
    event.currentTarget.reset();
    await chargerBase();
    await chargerRoute("activites");
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>, type: "revenu" | "decaissement") {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("type", type);
    const justificatif = data.get("justificatif");
    if (justificatif instanceof File && justificatif.size === 0) data.delete("justificatif");
    await api("transactions", { method: "POST", body: data });
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

  async function submitMouvementArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const articleId = String(data.article_id);
    await api(`inventaire/${articleId}/mouvements`, { method: "POST", body: JSON.stringify(data) });
    event.currentTarget.reset();
    await chargerRoute("inventaire");
  }

  async function submitTypeActivite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("types-activites", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        a_versement_recurrent: data.a_versement_recurrent === "on",
        actif: true,
        schema_champs: parseSchema(String(data.schema_champs ?? "")),
      }),
    });
    event.currentTarget.reset();
    await chargerBase();
    await chargerRoute("types-activites");
  }

  async function submitUtilisateur(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api("utilisateurs", { method: "POST", body: JSON.stringify(data) });
    event.currentTarget.reset();
    await chargerBase();
    await chargerRoute("utilisateurs");
    showToast(t("userSaved"));
  }

  async function submitParametres(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = parametres.map((parametre) => ({
      cle: parametre.cle,
      valeur: String(data.get(`valeur:${parametre.cle}`) ?? ""),
      description: String(data.get(`description:${parametre.cle}`) ?? ""),
    }));
    const response = await api<{ donnees: Parametre[] }>("parametres", { method: "PUT", body: JSON.stringify({ parametres: payload }) });
    setParametres(response.donnees);
  }

  async function filtrerRapport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>).toString();
    setRapport((await api<{ donnees: Rapport }>(`rapports/bilan?${query}`)).donnees);
  }

  async function figerRapport() {
    const query = rapport?.periode ? new URLSearchParams(rapport.periode).toString() : "";
    await api("rapports/figer" + (query ? `?${query}` : ""), { method: "POST", body: "{}" });
    await chargerRoute("audit");
  }

  async function marquerNotificationLue(notificationId: number) {
    await api(`notifications/${notificationId}/lue`, { method: "PATCH", body: "{}" });
    await chargerRoute("notifications");
  }

  async function validerTransaction(id: number, statut: "valide" | "rejete") {
    try {
      await api(`transactions/${id}/validation`, { method: "PATCH", body: JSON.stringify({ statut_validation: statut }) });
      await chargerRoute("depenses");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible");
    }
  }

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roleDraft) return;
    try {
      const isNew = !roleDraft.id;
      const url = isNew ? "roles" : `roles/${roleDraft.id}`;
      const method = isNew ? "POST" : "PUT";
      
      await api(url, { method, body: JSON.stringify(roleDraft) });
      setRoleDraft(null);
      await chargerRoute("roles");
      showToast(t(isNew ? "roleCreated" : "roleUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function deleteRole(role: Role) {
    const result = await Swal.fire({
      title: t("deleteRoleConfirm") as string,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: 'var(--red)',
      cancelButtonColor: 'var(--muted)',
      confirmButtonText: t("delete") as string || 'Supprimer',
      cancelButtonText: t("cancel") as string || 'Annuler',
      background: 'var(--surface)',
      color: 'var(--text)'
    });
    
    if (result.isConfirmed) {
      try {
        await api(`roles/${role.id}`, { method: "DELETE" });
        await chargerRoute("roles");
        showToast(t("roleDeleted"));
      } catch (err) {
        Swal.fire({
          title: "Erreur",
          text: err instanceof Error ? err.message : "Erreur",
          icon: 'error',
          background: 'var(--surface)',
          color: 'var(--text)'
        });
      }
    }
  }

  async function submitPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissionDraft) return;
    try {
      const isNew = !permissionDraft.id;
      const url = isNew ? "permissions" : `permissions/${permissionDraft.id}`;
      const method = isNew ? "POST" : "PUT";

      await api(url, { method, body: JSON.stringify(permissionDraft) });
      setPermissionDraft(null);
      await chargerRoute("permissions");
      showToast(t(isNew ? "permissionCreated" : "permissionUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function deletePermission(permission: Permission) {
    const result = await Swal.fire({
      title: t("deletePermissionConfirm") as string,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--red)",
      cancelButtonColor: "var(--muted)",
      confirmButtonText: t("delete") as string || "Supprimer",
      cancelButtonText: t("cancel") as string || "Annuler",
      background: "var(--surface)",
      color: "var(--text)"
    });

    if (result.isConfirmed) {
      try {
        await api(`permissions/${permission.id}`, { method: "DELETE" });
        await chargerRoute("permissions");
        showToast(t("permissionDeleted"));
      } catch (err) {
        Swal.fire({
          title: "Erreur",
          text: err instanceof Error ? err.message : "Erreur",
          icon: "error",
          background: "var(--surface)",
          color: "var(--text)"
        });
      }
    }
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
      queueMicrotask(() => setChartFiltersDraft(chartFilters));
    }
  }, [chartFilters, route, token]);
  async function genererEcheances() {
    await api("echeances-versements/generer", { method: "POST", body: "{}" });
    await chargerRoute("versements");
  }

  if (!mounted) return null;

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
                <input name="identifiant" type="email" defaultValue="admin@kouemanager.local" autoComplete="email" required />
              </label>
              <label style={{ position: "relative" }}>
                Mot de passe
                <input name="mot_de_passe" type={showLoginPassword ? "text" : "password"} defaultValue="Admin@1234" autoComplete="current-password" required />
                <button type="button" className="password-toggle" onClick={() => setShowLoginPassword(!showLoginPassword)} aria-label={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showLoginPassword ? "🙈" : "👁️"}</button>
              </label>
              <button className="btn primary login-submit" type="submit">Se connecter</button>
              <div className="login-footnote">
                <span>Laravel Sanctum</span>
                <span>Synchronisation web/mobile</span>
              </div>
            </form>
          </section>
        </main>
        <ThemePicker t={t} />
      </>
    );
  }

  return (
    <>
      <Loader visible={loading} progress={progress} />
      <main className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""} ${mobileMenuOpen ? "mobile-menu-open" : ""}`}>
        <aside className="sidebar">
          <div className="brand"><img src="/logo-koue.svg" alt="" /><strong>KOUE</strong></div>
          <nav>
            {routes.map(([key, label, icon]) => {
              const isUsersRoot = key === "utilisateurs";
              const usersActive = route === "utilisateurs" || route === "roles" || route === "permissions";
              return (
              <div key={key} className={key === "infos" || isUsersRoot ? "nav-item-with-popover" : undefined}>
                <button className={(route === key || (isUsersRoot && usersActive)) ? "active" : ""} onClick={() => {
                  if (isUsersRoot) {
                    setUsersMenuOpen((value) => !value);
                    return;
                  }
                  if (key === "infos") {
                    setInfoMenuOpen((value) => !value);
                    return;
                  }
                  openRoute(key);
                }} title={t(label)} aria-label={t(label)} aria-expanded={isUsersRoot ? usersMenuOpen : key === "infos" ? infoMenuOpen : undefined}><span>{icon}</span>{t(label as any)}</button>
                {isUsersRoot && usersMenuOpen && (
                  <div className="subnav" role="menu" aria-label={t("usersMenu")}>
                    <button type="button" className={route === "utilisateurs" ? "active" : ""} onClick={() => openRoute("utilisateurs")}>{t("users")}</button>
                    <button type="button" className={route === "roles" ? "active" : ""} onClick={() => openRoute("roles")}>{t("roles")}</button>
                    <button type="button" className={route === "permissions" ? "active" : ""} onClick={() => openRoute("permissions")}>{t("permissions")}</button>
                  </div>
                )}
                {key === "infos" && infoMenuOpen && (
                  <div className="subnav" role="menu" aria-label="Sous-menu Infos">
                    <button type="button" className={route === "info-plateforme" ? "active" : ""} onClick={() => { setRoute("info-plateforme"); setInfoMenuOpen(false); }}>{t("platform")}</button>
                    <button type="button" className={route === "info-compte" ? "active" : ""} onClick={() => { setRoute("info-compte"); setInfoMenuOpen(false); }}>{t("myAccount")}</button>
                  </div>
                )}
              </div>
            )})}
          </nav>
          <small>KOUECONSOLIDATED<br />Groupe multi-activités</small>
        </aside>
        <button className="sidebar-backdrop" type="button" aria-label="Fermer le menu" onClick={() => setMobileMenuOpen(false)} />
        <section className="main-area">
          <header className="topbar">
            <button className="icon-button menu-button" type="button" onClick={toggleNavigation} aria-label="Ouvrir ou fermer le menu" aria-expanded={mobileMenuOpen || !sidebarCollapsed}>☰</button>
            <label className="search">⌕<input placeholder="Search in Koue Manager" /></label>
            <div className="top-actions">
              <button className="icon-button" type="button" onClick={() => { if (!document.fullscreenElement) void document.documentElement.requestFullscreen(); else void document.exitFullscreen(); }} title="Plein écran">▦</button>
              
              <div style={{ position: "relative" }}>
                <span className="flag" onClick={() => setLangMenuOpen(!langMenuOpen)} style={{ cursor: "pointer", fontSize: 18 }}>{lang === "fr" ? "🇫🇷" : lang === "en" ? "🇬🇧" : "🇪🇸"}</span>
                {langMenuOpen && (
                  <div className="dropdown-menu" style={{ position: "absolute", top: 35, right: 0, width: 120, background: "#1c2128", border: "1px solid #30363d", borderRadius: 8, padding: 8, zIndex: 1000, display: "flex", flexDirection: "column", gap: 5 }}>
                    <button className="btn secondary" onClick={() => { setLang("fr"); localStorage.setItem("koue_lang", "fr"); setLangMenuOpen(false); }}>🇫🇷 Français</button>
                    <button className="btn secondary" onClick={() => { setLang("en"); localStorage.setItem("koue_lang", "en"); setLangMenuOpen(false); }}>🇬🇧 English</button>
                    <button className="btn secondary" onClick={() => { setLang("es"); localStorage.setItem("koue_lang", "es"); setLangMenuOpen(false); }}>🇪🇸 Español</button>
                  </div>
                )}
              </div>
              
              <div style={{ position: "relative" }}>
                <button className="badge-dot red" type="button" onClick={() => setNotifPopupOpen(!notifPopupOpen)} title="Notifications">{notifications.filter((item) => !item.lu).length}</button>
                {notifPopupOpen && (
                  <div className="dropdown-menu" style={{ position: "absolute", top: 35, right: 0, width: 300, background: "#1c2128", border: "1px solid #30363d", borderRadius: 8, padding: 15, zIndex: 1000, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ margin: 0, color: "#e6edf3", fontSize: 14 }}>{t("notifications")}</h4>
                    </div>
                    {notifications.length === 0 ? (
                      <p style={{ color: "#8b949e", fontSize: 13, margin: 0 }}>{t("noNotifications")}</p>
                    ) : (
                      <p style={{ color: "#8b949e", fontSize: 13, margin: 0 }}>Vous avez {notifications.length} notification(s).</p>
                    )}
                  </div>
                )}
              </div>

              <div style={{ position: "relative" }}>
                <button className="icon-button" type="button" onClick={() => setUserMenuOpen(!userMenuOpen)} title={t("myAccount")}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </button>
                {userMenuOpen && (
                  <div className="dropdown-menu" style={{ position: "absolute", top: 35, right: 0, width: 160, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, padding: 8, zIndex: 1000, display: "flex", flexDirection: "column", gap: 5, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                    <button className="btn secondary" onClick={() => { setRoute("info-compte"); setUserMenuOpen(false); }}>{t("myAccount")}</button>
                    <button className="btn secondary" style={{ color: "var(--red)", borderColor: "var(--red)" }} onClick={handleLogout}>{t("logout")}</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <section className="content">{renderRoute()}</section>
        </section>
      </main>
      <ThemePicker t={t} />
      {toast && <div className="confirm-toast" role="status">{toast}</div>}
    </>
  );

  function renderRoute() {
    if (!user) return null;
    const resume = dashboard.resume;

    if (route === "tableau-bord") {
      return <>
        <PageTitle title={t("dashboard")} subtitle={t("dashboardSubtitle")} />
        <div className="cards">
          <Card label={t("activitiesCount")} value={resume?.activites ?? 0} />
          <Card label={t("income")} value={money(resume?.revenus)} />
          <Card label={t("decaissements")} value={money(resume?.decaissements)} />
          <Card label={t("result")} value={money(resume?.resultat)} />
          <Card label={t("inventoryValue")} value={money(resume?.inventaire)} />
        </div>
        <ChartGrid graphiques={dashboard.graphiques ?? []} compact />
        <Grid>
          <Panel title={t("recentActivities")}>
            <Table
                  loading={loading}
                  heads={["Code", t("activities"), "Type", t("installments"), "Statut"]} rows={(dashboard.activites ?? []).map((a) => [a.code, a.nom, a.type_activite?.nom ?? "-", money(a.montant_versement), pill(a.statut)])} />
          </Panel>
          <Panel title={t("recentDeadlines")}>
            <Table
                  loading={loading}
                  heads={[t("activities"), "Période", "Attendu", "Payé", "Statut"]} rows={(dashboard.echeances ?? []).map((e) => [e.activite?.code ?? "-", `${date(e.debut_periode)} - ${date(e.fin_periode)}`, money(e.montant_attendu), money(e.montant_paye), pill(e.statut)])} />
          </Panel>
        </Grid>
      </>;
    }

    if (route === "vue-ensemble") {
      return <>
        <PageTitle title={t("overview")} subtitle={t("overviewDesc")} />
        <ChartFiltersBar filters={chartFiltersDraft} activites={refs.activites} onChange={setChartFiltersDraft} onApply={() => void appliquerFiltresGraphiques()} t={t} />
        <ChartGrid graphiques={vueEnsemble} />
      </>;
    }

    if (route === "activites") {
      return <>
        <PageTitle title={t("activities")} subtitle={t("activitiesSubtitle")} />
        <Grid>
          <Panel title={t("newActivity") ?? "Nouvelle activité"}>
            <form className="form compact" onSubmit={submitActivite}>
              <Select name="type_activite_id" label="Type" items={refs.types_activites} />
              <Select name="gerant_utilisateur_id" label="Gérant assigné" items={refs.utilisateurs} optional />
              <input name="code" placeholder="Code" required />
              <input name="nom" placeholder="Nom de l’activité" required />
              <input name="montant_versement" type="number" placeholder="Versement attendu" defaultValue={0} />
              <input name="date_demarrage" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              <select name="statut" defaultValue="actif"><option value="actif">Actif</option><option value="en_pause">En pause</option><option value="cede">Cédé</option><option value="cloture">Clôturé</option></select>
              <textarea name="attributs" placeholder='Attributs JSON, ex. {"plaque":"1234CI","marque":"Yamaha"}' />
              <button className="btn primary">Enregistrer</button>
            </form>
          </Panel>
          <Panel title={t("activitiesList") ?? "Liste"}>
            <Table
                  loading={loading}
                  heads={["Code", "Nom", "Type", "Gérant", t("installments"), "Statut"]} rows={activites.map((a) => [a.code, a.nom, a.type_activite?.nom ?? "-", a.gerant?.nom ?? "-", money(a.montant_versement), pill(a.statut)])} />
          </Panel>
        </Grid>
      </>;
    }

    if (route === "versements") {
      return <>
        <PageTitle title={t("installments")} subtitle={t("installmentsSubtitle")} action={<button className="btn gold" onClick={genererEcheances}>Générer la semaine</button>} />
        <Grid>
          <Panel title="Nouveau versement">
            <form className="form compact" onSubmit={(e) => submitTransaction(e, "revenu")}>
              <Select name="activite_id" label="Activité" items={refs.activites} />
              <Select name="categorie_id" label="Catégorie" items={refs.categories_transactions.filter((c) => c.nature === "revenu")} />
              <Select name="echeance_id" label="Échéance liée" items={echeances.map((e) => ({ id: e.id, nom: `${e.activite?.code ?? "Activité"} · ${date(e.debut_periode)}` }))} optional />
              <input name="montant" type="number" placeholder="Montant" required />
              <input name="date_transaction" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              <PaymentSelect />
              <input name="justificatif" type="file" accept=".jpg,.jpeg,.png,.pdf" />
              <textarea name="note" placeholder="Note ou référence du reçu" />
              <button className="btn primary">Enregistrer</button>
            </form>
          </Panel>
          <Panel title={t("deadlines")}>
            <Table
                  loading={loading}
                  heads={[t("activities"), "Période", "Attendu", "Payé", "Statut"]} rows={echeances.map((e) => [e.activite?.nom ?? "-", `${date(e.debut_periode)} - ${date(e.fin_periode)}`, money(e.montant_attendu), money(e.montant_paye), pill(e.statut)])} />
          </Panel>
        </Grid>
      </>;
    }

    if (route === "depenses") {
      return <>
        <PageTitle title={t("expenses")} subtitle={t("expensesSubtitle")} />
        <Grid>
          <Panel title="Nouvelle dépense">
            <form className="form compact" onSubmit={(e) => submitTransaction(e, "decaissement")}>
              <Select name="activite_id" label="Activité" items={refs.activites} />
              <Select name="categorie_id" label="Catégorie" items={refs.categories_transactions.filter((c) => c.nature === "decaissement")} />
              <input name="montant" type="number" placeholder="Montant" required />
              <input name="date_transaction" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              <PaymentSelect />
              <input name="justificatif" type="file" accept=".jpg,.jpeg,.png,.pdf" />
              <textarea name="note" placeholder="Motif, fournisseur ou commentaire" />
              <button className="btn primary">Enregistrer</button>
            </form>
          </Panel>
          <Panel title={t("history")}>
            <Table
                  loading={loading}
                  heads={["Date", t("activities"), "Catégorie", "Montant", "Statut", "Actions"]} rows={transactions.map((trx) => [date(trx.date_transaction), trx.activite?.nom ?? "-", trx.categorie?.nom ?? "-", money(trx.montant), pill(trx.statut_validation ?? "valide"), trx.statut_validation === "en_attente" ? <ActionGroup key={trx.id}><button onClick={() => void validerTransaction(trx.id, "valide")}>Valider</button><button onClick={() => void validerTransaction(trx.id, "rejete")}>Rejeter</button></ActionGroup> : trx.mode_paiement])} />
          </Panel>
        </Grid>
      </>;
    }

    if (route === "inventaire") {
      return <>
        <PageTitle title={t("inventory")} subtitle={t("inventorySubtitle")} />
        <Grid>
          <Panel title={t("newArticle") ?? "Nouvel article"}>
            <form className="form compact" onSubmit={submitArticle}>
              <Select name="activite_id" label="Activité" items={refs.activites} />
              <input name="nom" placeholder="Nom" required />
              <select name="type_article"><option value="bien_durable">Bien durable</option><option value="stock_consommable">Stock consommable</option><option value="cheptel">Cheptel</option></select>
              <input name="quantite" type="number" placeholder="Quantité" defaultValue={1} />
              <input name="unite" placeholder="Unité" defaultValue="unite" />
              <input name="valeur_unitaire" type="number" placeholder="Valeur unitaire" defaultValue={0} />
              <input name="seuil_alerte" type="number" placeholder="Seuil d’alerte" />
              <button className="btn primary">Enregistrer</button>
            </form>
          </Panel>
          <Panel title={t("stockMovement") ?? "Mouvement de stock"}>
            <form className="form compact" onSubmit={submitMouvementArticle}>
              <Select name="article_id" label="Article" items={articles} />
              <select name="type_mouvement"><option value="entree">Entrée</option><option value="sortie">Sortie</option><option value="ajustement">Ajustement</option></select>
              <input name="quantite" type="number" step="0.01" placeholder="Quantité" required />
              <input name="motif" placeholder="Motif" required />
              <input name="date_mouvement" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              <button className="btn primary">Enregistrer</button>
            </form>
          </Panel>
        </Grid>
        <Panel title={t("articles")}>
          <Table
                  loading={loading}
                  heads={[t("activities"), "Article", "Type", "Quantité", "Seuil", "Valeur"]} rows={articles.map((a) => [a.activite?.nom ?? "-", a.nom, pill(a.type_article), `${a.quantite} ${a.unite}`, a.seuil_alerte ?? "-", money(Number(a.quantite) * Number(a.valeur_unitaire))])} />
        </Panel>
      </>;
    }

    if (route === "rapports") {
      return <>
        <PageTitle title={t("reports")} subtitle={t("reportsSubtitle")} action={<button className="btn gold" onClick={() => void figerRapport()}>{t("freeze")}</button>} />
        <form className="filter-row" onSubmit={filtrerRapport}>
          <input name="debut" type="date" defaultValue={rapport?.periode?.debut ?? new Date().toISOString().slice(0, 10)} />
          <input name="fin" type="date" defaultValue={rapport?.periode?.fin ?? new Date().toISOString().slice(0, 10)} />
          <button className="btn primary">{t("filter")}</button>
        </form>
        <div className="cards">
          <Card label={t("income")} value={money(rapport?.totaux?.revenus)} />
          <Card label={t("decaissements")} value={money(rapport?.totaux?.decaissements)} />
          <Card label={t("result")} value={money(rapport?.totaux?.resultat)} />
        </div>
        <Panel title={t("byActivity")}>
          <Table
                  loading={loading}
                  heads={["Code", t("activities"), "Type", t("income"), t("decaissements"), t("result")]} rows={(rapport?.activites ?? []).map((a) => [a.code, a.nom, a.type_activite ?? "-", money(a.revenus), money(a.decaissements), money(a.resultat)])} />
        </Panel>
      </>;
    }

    if (route === "types-activites") {
      return <>
        <PageTitle title={t("typeActivities")} subtitle={t("typeActivitiesSubtitle")} />
        <Grid>
          <Panel title={t("newType") ?? "Nouveau type"}>
            <form className="form compact" onSubmit={submitTypeActivite}>
              <input name="nom" placeholder="Nom du type" required />
              <input name="slug" placeholder="Slug optionnel" />
              <select name="frequence_versement" defaultValue="aucun"><option value="aucun">Aucun versement</option><option value="journalier">Journalier</option><option value="hebdomadaire">Hebdomadaire</option><option value="mensuel">Mensuel</option></select>
              <label className="check-row"><input name="a_versement_recurrent" type="checkbox" /> Versement récurrent</label>
              <input name="icone" placeholder="Icône ou code visuel" />
              <input name="couleur" placeholder="Couleur, ex. #0757a6" />
              <textarea name="schema_champs" placeholder={"Champs dynamiques, un par ligne\nplaque:texte\nnombre_tetes:nombre"} />
              <button className="btn primary">Enregistrer</button>
            </form>
          </Panel>
          <Panel title={t("configuredTypes") ?? "Types configurés"}>
            <Table
                  loading={loading}
                  heads={["Type", "Fréquence", "Versement", "Activités", "Statut"]} rows={typesActivites.map((t) => [t.nom, t.frequence_versement, t.a_versement_recurrent ? "Oui" : "Non", t.activites_count ?? 0, pill(t.actif ? "actif" : "inactif")])} />
          </Panel>
        </Grid>
      </>;
    }

    if (route === "utilisateurs") {
      return <>
        <PageTitle title={t("users")} subtitle={t("usersSubtitle")} />
        <Grid>
          <Panel title={t("newUser") ?? "Nouvel utilisateur"}>
            <form className="form compact" onSubmit={submitUtilisateur}>
              <Select name="role_id" label="Rôle" items={roles.length > 0 ? roles : refs.roles} />
              <input name="nom" placeholder="Nom complet" required />
              <input name="email" type="email" placeholder="Email" required />
              <div style={{ position: "relative" }}>
                <input name="mot_de_passe" type={showUserPassword ? "text" : "password"} placeholder="Mot de passe" required style={{ width: "100%", paddingRight: "40px" }} />
                <button type="button" className="password-toggle" onClick={() => setShowUserPassword(!showUserPassword)} aria-label={showUserPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "0", background: "none", cursor: "pointer", fontSize: "18px" }}>{showUserPassword ? "🙈" : "👁️"}</button>
              </div>
              <input name="telephone" placeholder="Téléphone" />
              <select name="statut" defaultValue="actif"><option value="actif">Actif</option><option value="suspendu">Suspendu</option><option value="desactive">Désactivé</option></select>
              <button className="btn primary">Enregistrer</button>
            </form>
          </Panel>
          <Panel title="Liste des comptes">
            <Table
                  loading={loading}
                  heads={["Nom", "Email", "Rôle", "Téléphone", "Statut"]} rows={utilisateurs.map((u) => [u.nom, u.email, u.role?.nom ?? "-", u.telephone ?? "-", pill(u.statut ?? "actif")])} />
          </Panel>
        </Grid>
      </>;
    }

    if (route === "roles") {
      return <>
        <PageTitle title={t("roles")} subtitle="Gestion des permissions" action={<button className="btn primary" onClick={() => setRoleDraft({ nom: "", description: "", permissions: [] })}>{t("addRole")}</button>} />
        
        {roleDraft && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <Panel title={roleDraft.id ? t("editRole") : t("addRole")} style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
              <button type="button" onClick={() => setRoleDraft(null)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text)" }}>✕</button>
              <form className="form" onSubmit={submitRole}>
                <div className="field-group">
                  <label>{t("roleName")}</label>
                  <input value={roleDraft.nom} onChange={e => setRoleDraft({...roleDraft, nom: e.target.value})} required />
                </div>
                <div className="field-group">
                  <label>{t("roleDescription")}</label>
                  <input value={roleDraft.description} onChange={e => setRoleDraft({...roleDraft, description: e.target.value})} />
                </div>
                
                <h4 style={{ marginTop: 20, marginBottom: 10 }}>{t("permissions")}</h4>
                <div className="permission-grid">
                  {permissions.map(p => (
                    <label key={p.id} className="permission-check">
                      <input 
                        type="checkbox" 
                        checked={roleDraft.permissions.includes(p.id)}
                        onChange={e => {
                          const newPerms = e.target.checked 
                            ? [...roleDraft.permissions, p.id] 
                            : roleDraft.permissions.filter(id => id !== p.id);
                          setRoleDraft({...roleDraft, permissions: newPerms});
                        }} 
                      />
                      <span>{p.nom}</span>
                    </label>
                  ))}
                </div>
                
                <div className="action-row" style={{ marginTop: 20 }}>
                  <button type="button" className="btn secondary" onClick={() => setRoleDraft(null)}>{t("cancel")}</button>
                  <button type="submit" className="btn primary">{t("save")}</button>
                </div>
              </form>
            </Panel>
          </div>
        )}

        <Panel title={t("roles")}>
          <Table
                  loading={loading}
                  heads={["Nom", "Description", "Permissions", "Actions"]} 
            rows={roles.map(r => [
              <strong>{r.nom}</strong>, 
              r.description ?? "-", 
              pill(String(r.permissions?.length ?? 0) + " permissions"),
              ["proprietaire", "super-admin-plateformes"].includes(r.slug ?? "") ? <span className="muted">Système</span> : (
                <div className="icon-actions">
                  <IconButton label={t("editRole")} onClick={() => setRoleDraft({ id: r.id, nom: r.nom, description: r.description ?? "", permissions: r.permissions?.map(p => p.id) ?? [] })} icon="edit" />
                  <IconButton label={t("delete")} tone="danger" onClick={() => void deleteRole(r)} icon="delete" />
                </div>
              )
            ])} 
          />
        </Panel>
      </>;
    }

    if (route === "permissions") {
      return <>
        <PageTitle title={t("permissions")} subtitle={t("permissionsSubtitle")} action={<button className="btn primary" onClick={() => setPermissionDraft({ nom: "", roles: [] })}>{t("addPermission")}</button>} />

        {permissionDraft && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <Panel title={permissionDraft.id ? t("editPermission") : t("addPermission")} style={{ width: "100%", maxWidth: 600, maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
              <button type="button" onClick={() => setPermissionDraft(null)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text)" }}>x</button>
              <form className="form" onSubmit={submitPermission}>
                <div className="field-group">
                  <label>{t("permissionName")}</label>
                  <input value={permissionDraft.nom} onChange={e => setPermissionDraft({ ...permissionDraft, nom: e.target.value })} required />
                </div>

                <h4 style={{ marginTop: 20, marginBottom: 10 }}>{t("assignedRoles")}</h4>
                <div className="permission-grid">
                  {roles.map(r => (
                    <label key={r.id} className="permission-check">
                      <input
                        type="checkbox"
                        checked={permissionDraft.roles.includes(r.id)}
                        onChange={e => {
                          const newRoles = e.target.checked
                            ? [...permissionDraft.roles, r.id]
                            : permissionDraft.roles.filter(id => id !== r.id);
                          setPermissionDraft({ ...permissionDraft, roles: newRoles });
                        }}
                      />
                      <span>{r.nom}</span>
                    </label>
                  ))}
                </div>

                <div className="action-row" style={{ marginTop: 20 }}>
                  <button type="button" className="btn secondary" onClick={() => setPermissionDraft(null)}>{t("cancel")}</button>
                  <button type="submit" className="btn primary">{t("save")}</button>
                </div>
              </form>
            </Panel>
          </div>
        )}

        <Panel title={t("existingPermissions")}>
          <Table
                  loading={loading}
                  heads={["Nom", "Slug", t("roles"), "Actions"]}
            rows={permissions.map(p => [
              <strong>{p.nom}</strong>,
              p.slug ?? "-",
              pill(String(p.roles?.length ?? 0) + " " + t("roles").toLowerCase()),
              <div className="icon-actions">
                <IconButton label={t("editPermission")} onClick={() => setPermissionDraft({ id: p.id, nom: p.nom, roles: p.roles?.map(r => r.id) ?? [] })} icon="edit" />
                <IconButton label={t("delete")} tone="danger" onClick={() => void deletePermission(p)} icon="delete" />
              </div>
            ])}
          />
        </Panel>
      </>;
    }

    if (route === "notifications") {
      return <>
        <PageTitle title="Notifications" subtitle="Alertes de retard, stock et rapports." />
        <Panel title="Centre d'alertes">
          <Table
                  loading={loading}
                  heads={["Type", "Titre", "Message", "Statut", "Action"]} rows={notifications.map((n) => [pill(n.type_notification), n.titre, n.message, n.lu ? "Lue" : pill("en_attente"), n.lu ? "-" : <button className="btn mini" key={n.id} onClick={() => void marquerNotificationLue(n.id)}>Marquer lue</button>])} />
        </Panel>
      </>;
    }

    if (route === "audit") {
      return <>
        <PageTitle title="Journal d'audit" subtitle="Traçabilité des actions sensibles." />
        <Panel title="Dernières actions">
          <Table
                  loading={loading}
                  heads={["Date", "Utilisateur", "Action", "Entité", "IP"]} rows={auditLogs.map((log) => [log.created_at ? date(log.created_at) : "-", log.utilisateur?.nom ?? "-", log.action, `${log.entite}${log.entite_id ? ` #${log.entite_id}` : ""}`, log.adresse_ip ?? "-"])} />
        </Panel>
      </>;
    }

    if (route === "info-plateforme" || route === "infos") {
      const plateforme = user.plateforme ?? {};
      return <>
        <PageTitle title="Plateforme" subtitle="Informations de la plateforme associée au compte." />
        <div className="info-shell">
          <Panel title="Identité de la plateforme">
            <div className="info-header">
              <div className="profile-avatar large">{plateforme.image_url ? <img src={plateforme.image_url} alt={plateforme.nom ?? "Plateforme"} /> : <span>🏢</span>}</div>
              <div>
                <div className="mini-badge">Plateforme active</div>
                <strong className="info-title">{plateforme.nom ?? "Plateforme"}</strong>
                <span className="info-subtitle">{plateforme.slug ?? "-"}</span>
              </div>
              <button className="btn secondary" type="button" onClick={() => setEditingPlatform((value) => !value)}>{editingPlatform ? "Annuler" : "Modifier"}</button>
            </div>

            {!editingPlatform ? (
              <div className="info-list">
                <div><label>Email</label><span>{plateforme.email_contact ?? "-"}</span></div>
                <div><label>Téléphone</label><span>{plateforme.telephone_contact ?? "-"}</span></div>
                <div><label>Adresse</label><span>{plateforme.adresse ?? "-"}</span></div>
                <div><label>Statut</label><span>{plateforme.statut ?? "actif"}</span></div>
              </div>
            ) : (
              <form className="info-form" onSubmit={(event) => { event.preventDefault(); void savePlatform(); }}>
                <div className="field-grid">
                  <label className="field-group"><span>Nom</span><input value={platformForm.nom} onChange={(event) => setPlatformForm((prev) => ({ ...prev, nom: event.target.value }))} /></label>
                  <label className="field-group"><span>Slug</span><input value={platformForm.slug} onChange={(event) => setPlatformForm((prev) => ({ ...prev, slug: event.target.value }))} /></label>
                  <label className="field-group"><span>Email</span><input type="email" value={platformForm.email_contact} onChange={(event) => setPlatformForm((prev) => ({ ...prev, email_contact: event.target.value }))} /></label>
                  <label className="field-group"><span>Téléphone</span><input value={platformForm.telephone_contact} onChange={(event) => setPlatformForm((prev) => ({ ...prev, telephone_contact: event.target.value }))} /></label>
                  <label className="field-group full"><span>Adresse</span><input value={platformForm.adresse} onChange={(event) => setPlatformForm((prev) => ({ ...prev, adresse: event.target.value }))} /></label>
                </div>
                <div className="action-row">
                  <button className="btn primary" type="submit">Enregistrer</button>
                </div>
              </form>
            )}
          </Panel>

          <Panel title="Informations générales">
            <div className="info-list">
              <div><label>Entreprise</label><span>KOUECONSOLIDATED</span></div>
              <div><label>Compte</label><span>{user.role?.nom ?? "Utilisateur"}</span></div>
              <div><label>Utilisateurs</label><span>{plateforme.limite_utilisateurs ? `${(user.plateforme as { utilisateurs_count?: number })?.utilisateurs_count ?? 0} / ${plateforme.limite_utilisateurs}` : "-"}</span></div>
              <div><label>Activités</label><span>{plateforme.limite_activites ? `${(user.plateforme as { activites_count?: number })?.activites_count ?? 0} / ${plateforme.limite_activites}` : "-"}</span></div>
            </div>
          </Panel>
        </div>
      </>;
    }

    if (route === "info-compte") {
      return <>
        <PageTitle title="Mon compte" subtitle="Informations de votre profil et accès." />
        <div className="info-shell">
          <Panel title="Profil">
            <div className="info-header">
              <div className="profile-avatar">{user.nom?.charAt(0)?.toUpperCase() ?? "U"}</div>
              <div>
                <div className="mini-badge">Compte utilisateur</div>
                <strong className="info-title">{user.nom}</strong>
                <span className="info-subtitle">{user.email}</span>
              </div>
              <button className="btn secondary" type="button" onClick={() => setEditingProfile((value) => !value)}>{editingProfile ? "Annuler" : "Modifier"}</button>
            </div>

            {!editingProfile ? (
              <div className="info-list">
                <div><label>Nom</label><span>{user.nom}</span></div>
                <div><label>Email</label><span>{user.email}</span></div>
                <div><label>Téléphone</label><span>{user.telephone ?? "-"}</span></div>
                <div><label>Rôle</label><span>{user.role?.nom ?? "Utilisateur"}</span></div>
              </div>
            ) : (
              <form className="info-form" onSubmit={(event) => { event.preventDefault(); void saveProfile(); }}>
                <div className="field-grid">
                  <label className="field-group"><span>Nom</span><input value={profileForm.nom} onChange={(event) => setProfileForm((prev) => ({ ...prev, nom: event.target.value }))} /></label>
                  <label className="field-group"><span>Email</span><input type="email" value={profileForm.email} onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))} /></label>
                  <label className="field-group"><span>Téléphone</span><input value={profileForm.telephone} onChange={(event) => setProfileForm((prev) => ({ ...prev, telephone: event.target.value }))} /></label>
                  <label className="field-group"><span>Statut</span>
                    <select value={profileForm.statut} onChange={(event) => setProfileForm((prev) => ({ ...prev, statut: event.target.value }))}>
                      <option value="actif">Actif</option>
                      <option value="suspendu">Suspendu</option>
                      <option value="desactive">Désactivé</option>
                    </select>
                  </label>
                </div>
                <div className="action-row">
                  <button className="btn primary" type="submit">Enregistrer</button>
                </div>
              </form>
            )}
          </Panel>

          <Panel title="Sécurité et accès">
            <div className="info-list">
              <div><label>Rôle</label><span>{user.role?.nom ?? "Utilisateur"}</span></div>
              <div><label>Dernière connexion</label><span>{user.derniere_connexion ? date(user.derniere_connexion) : "-"}</span></div>
              <div><label>Plateforme</label><span>{user.plateforme?.nom ?? "-"}</span></div>
              <div><label>Statut</label><span>{user.statut ?? "actif"}</span></div>
            </div>
          </Panel>
        </div>
      </>;
    }

    return <>
      <PageTitle title="Paramètres" subtitle="Configuration globale de KOUECONSOLIDATED." />
      <Panel title="Paramètres">
        <form className="settings-form" onSubmit={submitParametres}>
          {parametres.map((p) => (
            <div className="settings-row" key={p.cle}>
              <strong>{p.cle}</strong>
              <input name={`valeur:${p.cle}`} defaultValue={p.valeur ?? ""} />
              <input name={`description:${p.cle}`} defaultValue={p.description ?? ""} />
            </div>
          ))}
          <button className="btn primary">Enregistrer les paramètres</button>
        </form>
      </Panel>
    </>;
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

function Panel({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return <section className="panel" style={style}><h3>{title}</h3>{children}</section>;
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid-2">{children}</div>;
}

function ActionGroup({ children }: { children: ReactNode }) {
  return <span className="action-group">{children}</span>;
}

function IconButton({ label, icon, tone = "default", onClick }: { label: string; icon: "edit" | "delete"; tone?: "default" | "danger"; onClick: () => void }) {
  return (
    <button className={`table-icon-button ${tone === "danger" ? "danger" : ""}`} type="button" onClick={onClick} title={label} aria-label={label}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon === "edit" ? (
          <>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </>
        ) : (
          <>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </>
        )}
      </svg>
    </button>
  );
}

/* ─── DataTable skeleton shimmer keyframes (injected once) ─── */
const DT_STYLE_ID = "koue-datatable-styles-client";
if (typeof document !== "undefined" && !document.getElementById(DT_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = DT_STYLE_ID;
  s.textContent = `
    @keyframes koue-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .koue-skel {
      display: inline-block;
      width: 100%;
      height: 14px;
      border-radius: 6px;
      background: linear-gradient(90deg,
        var(--accent-bg) 25%,
        var(--line)   50%,
        var(--accent-bg) 75%
      );
      background-size: 400px 100%;
      animation: koue-shimmer 1.4s ease-in-out infinite;
    }
    .koue-skel-sm  { height: 10px; width: 60%; }
    .koue-skel-xs  { height: 10px; width: 40%; }
    .koue-th-sort:hover { color: var(--primary-light) !important; }
    .koue-th-sort { cursor: pointer; user-select: none; }
    .koue-tr:hover td { background: var(--accent-bg); }
    .koue-dt-page-btn {
      padding: 5px 12px;
      border-radius: 6px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--muted);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .koue-dt-page-btn:hover:not(:disabled) { border-color: var(--blue); color: var(--blue); }
    .koue-dt-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .koue-dt-page-active {
      background: var(--blue);
      border-color: var(--blue);
      color: #fff;
    }
  `;
  document.head.appendChild(s);
}

const PAGE_SIZE_DEFAULT = 10;

function Table({
  heads,
  rows,
  loading = false,
  pageSize = PAGE_SIZE_DEFAULT,
  sortable = true,
}: {
  heads: string[];
  rows: ReactNode[][];
  loading?: boolean;
  pageSize?: number;
  sortable?: boolean;
}) {
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const rowCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const effectiveEmpty = loading ? false : rowCount === 0;

  const handleSort = (idx: number) => {
    if (!sortable) return;
    if (sortCol === idx) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(idx);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sortIcon = (idx: number) => {
    if (sortCol !== idx) return <span style={{ opacity: 0.3, marginLeft: 4, fontSize: 10 }}>⇅</span>;
    return <span style={{ marginLeft: 4, fontSize: 10, color: "var(--blue)" }}>{sortDir === "asc" ? "▲" : "▼"}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 12 }}>
      <div
        style={{
          overflowX: "auto",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          borderBottomLeftRadius: rowCount > pageSize ? 0 : 14,
          borderBottomRightRadius: rowCount > pageSize ? 0 : 14,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "var(--accent-bg)" }}>
              {heads.map((h, i) => (
                <th
                  key={h}
                  onClick={() => handleSort(i)}
                  className={sortable ? "koue-th-sort" : ""}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    color: sortCol === i ? "var(--primary-light)" : "var(--muted)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    fontWeight: 700,
                    borderBottom: "1px solid var(--line)",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s",
                  }}
                >
                  {h}{sortable && sortIcon(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* ── Skeleton loading ── */}
            {loading && (
              <>
                {[0, 1, 2].map((skIdx) => (
                  <tr key={`sk-${skIdx}`} style={{ borderBottom: "1px solid var(--line)" }}>
                    {heads.map((_, ci) => (
                      <td key={ci} style={{ padding: "14px 16px" }}>
                        {ci === 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              className="koue-skel"
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                flexShrink: 0,
                                animationDelay: `${skIdx * 0.15}s`,
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div className="koue-skel" style={{ animationDelay: `${skIdx * 0.15}s` }} />
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`koue-skel ${ci % 2 === 0 ? "koue-skel-sm" : "koue-skel-xs"}`}
                            style={{ animationDelay: `${skIdx * 0.15 + ci * 0.05}s` }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}

            {/* ── Empty state ── */}
            {!loading && effectiveEmpty && (
              <tr>
                <td
                  colSpan={heads.length}
                  style={{
                    padding: "40px 16px",
                    color: "var(--muted)",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  Aucune donnée trouvée.
                </td>
              </tr>
            )}

            {/* ── Data rows (paginated) ── */}
            {!loading && !effectiveEmpty && pagedRows.map((row, i) => (
              <tr key={i} className="koue-tr">
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer: count + pagination ── */}
      {!loading && rowCount > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderTop: "none",
            borderRadius: "0 0 14px 14px",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            {rowCount} entrée{rowCount > 1 ? "s" : ""}
          </span>
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className="koue-dt-page-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1)
                .reduce<(number | "…")[]>((acc, i, idx, arr) => {
                  if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "…" ? (
                    <span key={`e-${i}`} style={{ color: "var(--muted)", fontSize: 13 }}>…</span>
                  ) : (
                    <button
                      key={item}
                      className={`koue-dt-page-btn ${item === safePage ? "koue-dt-page-active" : ""}`}
                      onClick={() => setPage(item as number)}
                    >
                      {(item as number) + 1}
                    </button>
                  )
                )}
              <button
                className="koue-dt-page-btn"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Select({ name, label, items, optional = false }: { name: string; label: string; items: Named[]; optional?: boolean }) {
  return <select name={name} aria-label={label} required={!optional}><option value="">{label}</option>{items.map((item) => <option value={item.id} key={item.id}>{item.nom}</option>)}</select>;
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

function parseJsonObject(value: unknown) {
  const texte = String(value ?? "").trim();
  if (!texte) return {};

  try {
    const parsed = JSON.parse(texte);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseSchema(value: string) {
  return Object.fromEntries(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [cle, type = "texte"] = line.split(":").map((part) => part.trim());
        return [cle, type];
      })
      .filter(([cle]) => Boolean(cle)),
  );
}

