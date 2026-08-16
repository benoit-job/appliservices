"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { type Language, getTranslation } from "../translations";

/* ─────────────────────────── Types ─────────────────────────── */
type Plateforme = {
  id: number;
  nom: string;
  slug: string;
  email_contact?: string;
  telephone_contact?: string;
  adresse?: string;
  image_url?: string | null;
  statut: "actif" | "suspendu" | "desactive";
  limite_utilisateurs: number;
  limite_activites: number;
  utilisateurs_count?: number;
  activites_count?: number;
  created_at?: string;
};
type UserItem = {
  id: number;
  nom: string;
  email: string;
  telephone?: string;
  statut: string;
  role?: { nom: string; slug: string };
  plateforme_id?: number;
  derniere_connexion?: string;
};
type Role = {
  id: number;
  nom: string;
  slug: string;
  description?: string;
  permissions?: Permission[];
};
type Permission = { id: number; nom: string; slug: string; roles?: Role[] };
type Activite = {
  id: number;
  nom: string;
  code: string;
  statut: string;
  montant_versement: string | number;
  type_activite?: { nom: string };
  gerant?: { nom: string };
};
type TypeActivite = {
  id: number;
  nom: string;
  slug?: string;
  a_versement_recurrent?: boolean;
  frequence_versement?: string;
  schema_champs?: Record<string, unknown>;
  icone?: string;
  couleur?: string;
  actif: boolean;
  plateforme_id?: number;
};
type CategorieTransaction = {
  id: number;
  nom: string;
  nature: "revenu" | "decaissement";
  actif: boolean;
  plateforme_id?: number;
  type_activite_id?: number;
  type_activite?: { nom: string };
};
type AuditLog = {
  id: number;
  action: string;
  entite: string;
  entite_id?: number;
  adresse_ip?: string;
  created_at?: string;
  utilisateur?: { nom: string; email: string };
  details?: Record<string, unknown>;
};
type Transaction = {
  id: number;
  type: "revenu" | "decaissement";
  montant: string | number;
  date_transaction: string;
  mode_paiement: string;
  statut_validation?: string;
  activite?: { nom: string; code: string };
  categorie?: { nom: string };
};
type Echeance = {
  id: number;
  statut: string;
  debut_periode?: string;
  fin_periode?: string;
  montant_attendu: string | number;
  montant_paye: string | number;
  activite?: { code: string; nom: string };
};
type Article = {
  id: number;
  nom: string;
  type_article: string;
  quantite: string | number;
  unite: string;
  valeur_unitaire: string | number;
  seuil_alerte?: string | number | null;
  activite?: { nom: string; code: string };
};
type NotifItem = {
  id: number;
  titre: string;
  message: string;
  type_notification: string;
  lu: boolean;
};
type Parametre = { cle: string; valeur: string; description?: string };
type Rapport = {
  periode?: { debut: string; fin: string };
  totaux?: { revenus: number; decaissements: number; resultat: number };
  activites?: {
    id: number;
    nom: string;
    code: string;
    revenus: number;
    decaissements: number;
    resultat: number;
  }[];
};

type AdminRoute =
  | "dashboard"
  | "plateformes"
  | "plateforme-detail"
  | "audit"
  | "rapports"
  | "versements"
  | "echeances"
  | "inventaire"
  | "notifications"
  | "parametres"
  | "parametres"
  | "roles"
  | "permissions"
  | "utilisateurs";
type DetailTab =
  | "infos"
  | "users"
  | "types"
  | "cats"
  | "acts"
  | "rapports"
  | "versements"
  | "echeances"
  | "inventaire"
  | "notifs";

/* ─────────────────────────── Design tokens ─────────────────── */
const C = {
  bg: "#0d1117",
  surface: "#161b22",
  surface2: "#1c2128",
  border: "#30363d",
  primary: "#1d6ae5",
  primaryLight: "#388bfd",
  cyan: "#39d5d5",
  cyanDim: "rgba(57,213,213,0.12)",
  text: "#e6edf3",
  textMuted: "#8b949e",
  textDim: "#6e7681",
  green: "#3fb950",
  greenDim: "rgba(63,185,80,0.12)",
  red: "#f85149",
  redDim: "rgba(248,81,73,0.12)",
  orange: "#e3b341",
  orangeDim: "rgba(227,179,65,0.12)",
  purple: "#a371f7",
  purpleDim: "rgba(163,113,247,0.12)",
};

/* ─────────────────────────── Helpers ────────────────────────── */
const API_BASE = "/api/v1";
const TOK = "koue_admin_token";
const USR = "koue_admin_user";

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(s));
}
function fmt(n?: number | string) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Number(n ?? 0),
  );
}
function money(n?: number | string) {
  return `${fmt(n)} F`;
}
const SL: Record<string, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
  desactive: "Désactivé",
  en_pause: "En pause",
  retard: "En retard",
  paye: "Payé",
  partiel: "Partiel",
};
const SC: Record<string, string> = {
  actif: C.green,
  suspendu: C.orange,
  desactive: C.red,
  en_pause: C.orange,
  retard: C.red,
  paye: C.green,
  partiel: C.orange,
};

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

/* ─────────────────────────── Component ─────────────────────── */
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{
    nom: string;
    email: string;
  } | null>(null);
  const [route, setRoute] = useState<AdminRoute>("dashboard");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [usersMenuOpen, setUsersMenuOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("infos");

  const [lang, setLang] = useState<Language>("fr");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const t = (key: Parameters<typeof getTranslation>[1]) =>
    getTranslation(lang, key);

  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  };

  /* Data */
  const [plateformes, setPlateformes] = useState<Plateforme[]>([]);
  const [sel, setSel] = useState<Plateforme | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [acts, setActs] = useState<Activite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [types, setTypes] = useState<TypeActivite[]>([]);
  const [platformTypes, setPlatformTypes] = useState<TypeActivite[]>([]);
  const [platformCats, setPlatformCats] = useState<CategorieTransaction[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [rapportDates, setRapportDates] = useState({
    debut: new Date(new Date().setDate(1)).toISOString().slice(0, 10),
    fin: new Date().toISOString().slice(0, 10),
  });
  const [search, setSearch] = useState("");
  const [paramDrafts, setParamDrafts] = useState<Record<string, string>>({});

  /* Filters */
  const [dashboardFilters, setDashboardFilters] = useState({
    plateforme: "all",
    statut: "all",
    date_debut: "",
    date_fin: "",
  });
  const [auditFilters, setAuditFilters] = useState({
    action: "all",
    entite: "all",
    plateforme: "all",
    date_debut: "",
    date_fin: "",
  });
  const [paramFilter, setParamFilter] = useState("all");

  /* Modals */
  const [mCreate, setMCreate] = useState(false);
  const [mEdit, setMEdit] = useState<Plateforme | null>(null);
  const [mUser, setMUser] = useState(false);
  const [mAct, setMAct] = useState(false);
  const [mType, setMType] = useState<TypeActivite | boolean>(false);
  const [mCat, setMCat] = useState<CategorieTransaction | boolean>(false);
  const [mNotif, setMNotif] = useState(false);
  const [mRole, setMRole] = useState<Role | boolean>(false);
  const [mPermission, setMPermission] = useState<Permission | boolean>(false);

  /* API */
  async function callApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const h = new Headers(opts.headers);
    h.set("Accept", "application/json");
    if (!(opts.body instanceof FormData))
      h.set("Content-Type", "application/json");
    if (token) h.set("Authorization", `Bearer ${token}`);
    const r = await fetch(`${API_BASE}/${path}`, { ...opts, headers: h });
    const j = await r.json();
    if (!r.ok || j.statut === "erreur")
      throw new Error(j.message ?? "Erreur API");
    return j as T;
  }

  useEffect(() => {
    const t = localStorage.getItem(TOK);
    const u = localStorage.getItem(USR);
    if (t && u) {
      setToken(t);
      setAdminUser(JSON.parse(u));
    }
    const savedLang = localStorage.getItem("koue_lang") as Language | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    if (token) void refresh();
  }, [token]);
  useEffect(() => {
    if (token && route === "parametres") void loadParametres(paramFilter);
  }, [paramFilter, route, token]);
  useEffect(() => {
    if (token && route === "roles") void loadRoles();
  }, [route, token]);
  useEffect(() => {
    if (token && route === "permissions") void loadPermissions();
  }, [route, token]);

  async function refresh() {
    setLoading(true);
    try {
      const [p, r, a, pm] = await Promise.all([
        callApi<{ donnees: Plateforme[] }>("plateformes"),
        callApi<{ roles: Role[]; types_activites: TypeActivite[] }>(
          "references",
        ),
        callApi<{ donnees: { data: AuditLog[] } }>("audit"),
        callApi<{ donnees: Parametre[] }>(
          paramFilter === "all"
            ? "parametres"
            : `parametres?plateforme_id=${paramFilter}`,
        ).catch(() => ({ donnees: [] })),
      ]);
      setPlateformes(p.donnees ?? []);
      setRoles(r.roles ?? []);
      setTypes(r.types_activites ?? []);
      setAudits(a.donnees?.data ?? []);
      const pms = pm.donnees ?? [];
      setParametres(pms);
      setParamDrafts(Object.fromEntries(pms.map((x) => [x.cle, x.valeur])));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  async function openPlateforme(p: Plateforme) {
    setSel(p);
    setLoading(true);
    setDetailTab("infos");
    try {
      const [u, a, pt, pc] = await Promise.all([
        callApi<{ donnees: UserItem[] }>(`utilisateurs?plateforme_id=${p.id}`),
        callApi<{ donnees: Activite[] }>(`activites?plateforme_id=${p.id}`),
        callApi<{ donnees: TypeActivite[] }>(
          `types-activites?plateforme_id=${p.id}`,
        ),
        callApi<{ donnees: CategorieTransaction[] }>(
          `categories-transactions?plateforme_id=${p.id}`,
        ),
      ]);
      setUsers(u.donnees ?? []);
      setActs(a.donnees ?? []);
      setPlatformTypes(pt.donnees ?? []);
      setPlatformCats(pc.donnees ?? []);
      setRoute("plateforme-detail");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetailTab(tab: DetailTab) {
    if (!sel) return;
    setDetailTab(tab);
    if (tab === "versements" && transactions.length === 0) {
      setLoading(true);
      try {
        const r = await callApi<{ donnees: { data: Transaction[] } }>(
          `transactions?plateforme_id=${sel.id}&per_page=50`,
        );
        setTransactions(r.donnees?.data ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    if (tab === "echeances" && echeances.length === 0) {
      setLoading(true);
      try {
        const r = await callApi<{ donnees: { data: Echeance[] } }>(
          `echeances?plateforme_id=${sel.id}&per_page=50`,
        );
        setEcheances(r.donnees?.data ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    if (tab === "inventaire" && articles.length === 0) {
      setLoading(true);
      try {
        const r = await callApi<{ donnees: { data: Article[] } }>(
          `articles?plateforme_id=${sel.id}&per_page=50`,
        );
        setArticles(r.donnees?.data ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    if (tab === "notifs") {
      setLoading(true);
      try {
        const r = await callApi<{ donnees: NotifItem[] }>(
          `notifications?plateforme_id=${sel.id}`,
        );
        setNotifs(r.donnees ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    if (tab === "rapports") {
      await loadRapport();
    }
  }

  async function loadRapport() {
    if (!sel) return;
    setLoading(true);
    try {
      const r = await callApi<Rapport>(
        `rapports?plateforme_id=${sel.id}&debut=${rapportDates.debut}&fin=${rapportDates.fin}`,
      );
      setRapport(r);
    } catch {
      setRapport(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    setLoading(true);
    try {
      const r = await callApi<{ donnees: Role[]; permissions: Permission[] }>("roles");
      setRoles(r.donnees ?? []);
      setPermissions(r.permissions ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur chargement des rôles");
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissions() {
    setLoading(true);
    try {
      const r = await callApi<{ donnees: Permission[]; roles: Role[] }>("permissions");
      setPermissions(r.donnees ?? []);
      setRoles(r.roles ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur chargement des permissions");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const r = await callApi<{ donnees: UserItem[] }>("utilisateurs");
      setUsers(r.donnees ?? []);
      const r2 = await callApi<{ donnees: Role[] }>("roles");
      setRoles(r2.donnees ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  }

  /* Auth */
  async function doLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch(`${API_BASE}/connexion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ ...d, nom_appareil: "admin-web" }),
      });
      const j = await r.json();
      if (!r.ok || j.statut === "erreur")
        throw new Error(j.message ?? "Identifiants invalides");
      if (!j.utilisateur?.est_compte_entreprise)
        throw new Error("Accès réservé au compte entreprise KOUECONSOLIDATED.");
      localStorage.setItem(TOK, j.jeton);
      localStorage.setItem(
        USR,
        JSON.stringify({ nom: j.utilisateur.nom, email: j.utilisateur.email }),
      );
      setToken(j.jeton);
      setAdminUser({ nom: j.utilisateur.nom, email: j.utilisateur.email });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  async function doLogout() {
    try {
      if (token) await callApi("deconnexion", { method: "POST", body: "{}" });
    } finally {
      localStorage.removeItem(TOK);
      localStorage.removeItem(USR);
      setToken(null);
      setAdminUser(null);
      setRoute("dashboard");
    }
  }

  /* Plateformes CRUD */
  async function creer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const image = form.get("image");
    if (image instanceof File && image.size === 0) form.delete("image");
    const d = Object.fromEntries(form.entries());
    const payload = new FormData();
    payload.set("nom", String(d.nom ?? ""));
    payload.set("slug", String(d.slug ?? ""));
    payload.set("email_contact", String(d.email_contact ?? ""));
    payload.set("telephone_contact", String(d.telephone_contact ?? ""));
    payload.set("adresse", String(d.adresse ?? ""));
    payload.set("statut", String(d.statut ?? "actif"));
    payload.set("limite_utilisateurs", String(d.limite_utilisateurs ?? "10"));
    payload.set("limite_activites", String(d.limite_activites ?? "25"));
    payload.set(
      "utilisateur_defaut[nom]",
      String(d["utilisateur_defaut.nom"] ?? ""),
    );
    payload.set(
      "utilisateur_defaut[email]",
      String(d["utilisateur_defaut.email"] ?? ""),
    );
    payload.set(
      "utilisateur_defaut[mot_de_passe]",
      String(d["utilisateur_defaut.mot_de_passe"] ?? ""),
    );
    payload.set(
      "utilisateur_defaut[telephone]",
      String(d["utilisateur_defaut.telephone"] ?? ""),
    );
    if (image instanceof File && image.size > 0)
      payload.set("image", image, image.name);
    await callApi("plateformes", { method: "POST", body: payload });
    setMCreate(false);
    await refresh();
  }

  async function modifier(e: FormEvent<HTMLFormElement>, id: number) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const image = form.get("image");
    if (image instanceof File && image.size === 0) form.delete("image");
    const d = Object.fromEntries(form.entries());
    const payload = new FormData();
    payload.set("nom", String(d.nom ?? ""));
    payload.set("slug", String(d.slug ?? ""));
    payload.set("email_contact", String(d.email_contact ?? ""));
    payload.set("telephone_contact", String(d.telephone_contact ?? ""));
    payload.set("adresse", String(d.adresse ?? ""));
    payload.set("statut", String(d.statut ?? "actif"));
    payload.set("limite_utilisateurs", String(d.limite_utilisateurs ?? "10"));
    payload.set("limite_activites", String(d.limite_activites ?? "25"));
    if (image instanceof File && image.size > 0)
      payload.set("image", image, image.name);
    await callApi(`plateformes/${id}`, { method: "PUT", body: payload });
    setMEdit(null);
    await refresh();
    if (sel?.id === id) {
      const fresh = plateformes.find((p) => p.id === id);
      if (fresh) await openPlateforme(fresh);
    }
  }

  async function changerStatut(id: number, statut: string) {
    if (!confirm(`Confirmer le statut "${SL[statut]}" ?`)) return;
    await callApi(`plateformes/${id}/statut`, {
      method: "PATCH",
      body: JSON.stringify({ statut }),
    });
    await refresh();
    if (sel?.id === id) {
      const p = plateformes.find((x) => x.id === id);
      if (p)
        await openPlateforme({ ...p, statut: statut as Plateforme["statut"] });
    }
  }

  /* Users */
  async function creerUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    const isGlobal = !sel;
    await callApi("utilisateurs", {
      method: "POST",
      body: JSON.stringify({ ...d, plateforme_id: sel?.id || null }),
    });
    setMUser(false);
    showToast(t("save"));
    if (sel) await openPlateforme(sel);
    if (route === "utilisateurs") await loadUsers();
  }
  async function toggleUser(id: number, statut: string) {
    await callApi(`utilisateurs/${id}`, {
      method: "PUT",
      body: JSON.stringify({ statut }),
    });
    showToast(t("save"));
    if (sel) await openPlateforme(sel);
    if (route === "utilisateurs") await loadUsers();
  }
  async function supprimerUser(id: number) {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    await callApi(`utilisateurs/${id}`, { method: "DELETE" });
    showToast(t("save"));
    if (sel) await openPlateforme(sel);
    if (route === "utilisateurs") await loadUsers();
  }

  /* Roles */
  async function saveRole(e: FormEvent<HTMLFormElement>, id?: number) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    const body = JSON.stringify({
      ...d,
      permissions: d.permissions ? (d.permissions as string).split(',').map(Number) : [],
    });
    await callApi(id ? `roles/${id}` : "roles", { method: id ? "PUT" : "POST", body });
    setMRole(false);
    showToast(t("save"));
    await loadRoles();
  }
  async function deleteRole(id: number) {
    if (!confirm(t("deleteRoleConfirm"))) return;
    await callApi(`roles/${id}`, { method: "DELETE" });
    showToast(t("save"));
    await loadRoles();
  }

  /* Permissions */
  async function savePermission(e: FormEvent<HTMLFormElement>, id?: number) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    const body = JSON.stringify({
      ...d,
      roles: d.roles ? (d.roles as string).split(',').map(Number) : [],
    });
    await callApi(id ? `permissions/${id}` : "permissions", { method: id ? "PUT" : "POST", body });
    setMPermission(false);
    showToast(t("save"));
    await loadPermissions();
  }
  async function deletePermission(id: number) {
    if (!confirm("Voulez-vous vraiment supprimer cette permission ?")) return;
    await callApi(`permissions/${id}`, { method: "DELETE" });
    showToast(t("save"));
    await loadPermissions();
  }

  /* Activites */
  async function creerAct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await callApi("activites", {
      method: "POST",
      body: JSON.stringify({
        ...d,
        plateforme_id: sel?.id,
        attributs: {},
        statut: d.statut || "actif",
      }),
    });
    setMAct(false);
    if (sel) await openPlateforme(sel);
  }
  async function toggleAct(id: number, statut: string) {
    await callApi(`activites/${id}`, {
      method: "PUT",
      body: JSON.stringify({ statut }),
    });
    if (sel) await openPlateforme(sel);
  }

  /* Types d'activites */
  async function saveType(e: FormEvent<HTMLFormElement>, id?: number) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    let schema = null;
    if (d.schema_champs) {
      try {
        schema = JSON.parse(d.schema_champs as string);
      } catch {
        throw new Error(
          "Le schéma des champs additionnels doit être un JSON valide.",
        );
      }
    }
    const body = JSON.stringify({
      ...d,
      a_versement_recurrent: d.a_versement_recurrent === "true",
      actif: d.actif === "true",
      plateforme_id: sel?.id,
      schema_champs: schema,
    });
    await callApi(id ? `types-activites/${id}` : "types-activites", {
      method: id ? "PUT" : "POST",
      body,
    });
    setMType(false);
    if (sel) await openPlateforme(sel);
  }
  async function toggleType(id: number, actif: boolean) {
    await callApi(`types-activites/${id}`, {
      method: "PUT",
      body: JSON.stringify({ actif }),
    });
    if (sel) await openPlateforme(sel);
  }

  /* Categories */
  async function saveCat(e: FormEvent<HTMLFormElement>, id?: number) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await callApi(
      id ? `categories-transactions/${id}` : "categories-transactions",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify({
          ...d,
          actif: d.actif === "true",
          plateforme_id: sel?.id,
          type_activite_id: d.type_activite_id || null,
        }),
      },
    );
    setMCat(false);
    if (sel) await openPlateforme(sel);
  }
  async function toggleCat(id: number, actif: boolean) {
    await callApi(`categories-transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify({ actif }),
    });
    if (sel) await openPlateforme(sel);
  }

  /* Notifications */
  async function envoyerNotif(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await callApi("notifications", {
      method: "POST",
      body: JSON.stringify({ ...d, plateforme_id: sel?.id }),
    });
    setMNotif(false);
    await loadDetailTab("notifs");
  }

  /* Paramètres */
  async function loadParametres(pltId: string) {
    setLoading(true);
    try {
      const url =
        pltId === "all" ? "parametres" : `parametres?plateforme_id=${pltId}`;
      const r = await callApi<{ donnees: Parametre[] }>(url);
      const pms = r.donnees ?? [];
      setParametres(pms);
      setParamDrafts(Object.fromEntries(pms.map((x) => [x.cle, x.valeur])));
    } catch {
      setParametres([]);
    } finally {
      setLoading(false);
    }
  }

  async function saveParam(cle: string) {
    const body: Record<string, unknown> = { valeur: paramDrafts[cle] };
    if (paramFilter !== "all") body.plateforme_id = Number(paramFilter);
    await callApi(`parametres/${cle}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    await loadParametres(paramFilter);
  }

  /* Computed */
  const filteredPlateformes = plateformes.filter((p) => {
    const matchPl =
      dashboardFilters.plateforme === "all" ||
      String(p.id) === dashboardFilters.plateforme;
    const matchSt =
      dashboardFilters.statut === "all" || p.statut === dashboardFilters.statut;
    const createdAt = p.created_at ? new Date(p.created_at).getTime() : null;
    const from = dashboardFilters.date_debut
      ? new Date(`${dashboardFilters.date_debut}T00:00:00`).getTime()
      : null;
    const to = dashboardFilters.date_fin
      ? new Date(`${dashboardFilters.date_fin}T23:59:59`).getTime()
      : null;
    const matchDate =
      (!from || !createdAt || createdAt >= from) &&
      (!to || !createdAt || createdAt <= to);
    return matchPl && matchSt && matchDate;
  });

  const filteredSummary = {
    actives: filteredPlateformes.filter((p) => p.statut === "actif").length,
    total: filteredPlateformes.length,
    users: filteredPlateformes.reduce(
      (s, p) => s + (p.utilisateurs_count ?? 0),
      0,
    ),
    acts: filteredPlateformes.reduce((s, p) => s + (p.activites_count ?? 0), 0),
  };

  const auditPlatformOptions = Array.from(
    new Set(
      audits
        .map((e) =>
          typeof e.details?.plateforme === "string"
            ? e.details.plateforme
            : null,
        )
        .filter((v): v is string => Boolean(v)),
    ),
  ).sort();
  const auditActionOptions = Array.from(
    new Set(audits.map((e) => e.action)),
  ).sort();
  const auditEntiteOptions = Array.from(
    new Set(audits.map((e) => e.entite)),
  ).sort();

  const filteredAudits = audits.filter((entry) => {
    const matchA =
      auditFilters.action === "all" || entry.action === auditFilters.action;
    const matchE =
      auditFilters.entite === "all" || entry.entite === auditFilters.entite;
    const matchP =
      auditFilters.plateforme === "all" ||
      (typeof entry.details?.plateforme === "string" &&
        entry.details.plateforme === auditFilters.plateforme);
    const createdAt = entry.created_at
      ? new Date(entry.created_at).getTime()
      : null;
    const from = auditFilters.date_debut
      ? new Date(`${auditFilters.date_debut}T00:00:00`).getTime()
      : null;
    const to = auditFilters.date_fin
      ? new Date(`${auditFilters.date_fin}T23:59:59`).getTime()
      : null;
    const matchDate =
      (!from || !createdAt || createdAt >= from) &&
      (!to || !createdAt || createdAt <= to);
    return matchA && matchE && matchP && matchDate;
  });

  const searchedPl = plateformes.filter(
    (p) =>
      !search ||
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      (p.email_contact ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  /* ──── LOGIN ──── */
  if (!token || !adminUser)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(ellipse at 20% 50%, rgba(29,106,229,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(57,213,213,0.1) 0%, transparent 50%), ${C.bg}`,
          fontFamily: "'Inter','Segoe UI',sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "15%",
            width: 320,
            height: 320,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(29,106,229,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 80,
            right: "15%",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(57,213,213,0.07) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />

        <div
          style={{
            position: "relative",
            width: "min(440px, 92vw)",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: "48px 40px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: `0 8px 24px rgba(29,106,229,0.4)`,
              }}
            >
              <span style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>
                KC
              </span>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: C.cyan,
                marginBottom: 8,
              }}
            >
              Administration
            </div>
            <h1
              style={{
                color: C.text,
                fontSize: 26,
                fontWeight: 800,
                margin: 0,
              }}
            >
              Portail Entreprise
            </h1>
            <p style={{ color: C.textMuted, fontSize: 13, margin: "8px 0 0" }}>
              KOUECONSOLIDATED — Accès sécurisé
            </p>
          </div>

          <form
            onSubmit={doLogin}
            id="admin-login-form"
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            {err && (
              <div
                style={{
                  background: C.redDim,
                  border: `1px solid ${C.red}40`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: C.red,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span>⚠</span> {err}
              </div>
            )}
            {[
              ["identifiant", "Identifiant", "KOUECONSOLIDATED", "text"],
              ["mot_de_passe", "Mot de passe", "••••••••", "password"],
            ].map(([n, l, ph, t]) => (
              <div
                key={n}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <label
                  style={{
                    color: C.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {l}
                </label>
                <input
                  id={`admin-${n}`}
                  name={n}
                  type={t}
                  placeholder={ph}
                  required
                  style={{
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "13px 16px",
                    color: C.text,
                    fontSize: 15,
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = C.primary;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                  }}
                />
              </div>
            ))}
            <button
              id="admin-login-submit"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: "15px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${C.primary}, #1551b5)`,
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: `0 4px 16px rgba(29,106,229,0.35)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {loading && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              )}
              {loading ? "Connexion..." : "Accéder au portail"}
            </button>
          </form>
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <a
              href="/"
              style={{ color: C.textDim, textDecoration: "none", fontSize: 13 }}
            >
              ← Retour à l'application
            </a>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      </div>
    );

  /* ──── NAV ──── */
  const navItems: [AdminRoute | "group_users", string, string, AdminRoute[]?][] = [
    ["dashboard", "🏠", "overview"],
    ["plateformes", "🏢", "platform"],
    [
      "group_users",
      "👥",
      "users",
      ["utilisateurs", "roles", "permissions"]
    ],
    ["rapports", "📊", "reports"],
    ["versements", "💰", "installments"],
    ["echeances", "📅", "deadlines"],
    ["inventaire", "📦", "inventory"],
    ["notifications", "🔔", "notifications"],
    ["audit", "🔍", "audit"],
    ["parametres", "⚙️", "settings"],
  ];

  const goRoute = (r: AdminRoute) => {
    setRoute(r);
    setSearch("");
    setSel(null);
    setTransactions([]);
    setEcheances([]);
    setArticles([]);
    setNotifs([]);
    setRapport(null);
    if (r === "roles") void loadRoles();
    if (r === "permissions") void loadPermissions();
    if (r === "utilisateurs") void loadUsers();
  };

  /* ──── SHELL ──── */
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
        color: C.text,
      }}
    >
      {/* SPINNER GLOBAL */}
      {loading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(13,17,23,0.7)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                border: `3px solid ${C.border}`,
                borderTopColor: C.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <span style={{ color: C.textMuted, fontSize: 14, fontWeight: 600 }}>
              Chargement...
            </span>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 64,
          flexShrink: 0,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: `1px solid ${C.border}`,
            minHeight: 68,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
              fontWeight: 900,
              boxShadow: `0 4px 12px rgba(29,106,229,0.3)`,
            }}
          >
            KC
          </div>
          {sidebarOpen && (
            <div style={{ minWidth: 0 }}>
              <strong
                style={{
                  display: "block",
                  color: C.text,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                }}
              >
                Admin
              </strong>
              <span
                style={{ color: C.textDim, fontSize: 11, whiteSpace: "nowrap" }}
              >
                KOUECONSOLIDATED
              </span>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <div
            style={{
              padding: "12px 16px 8px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{
                width: "100%",
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "8px 12px",
                color: C.text,
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
        )}

        <nav
          style={{
            flex: 1,
            padding: "12px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflowY: "auto",
          }}
        >
          {navItems.map(([key, icon, label, children]) => {
            if (children) {
              const isGroupActive = children.includes(route as AdminRoute);
              const isOpen = usersMenuOpen || isGroupActive;
              return (
                <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                  <button
                    onClick={() => {
                      setUsersMenuOpen(!isOpen);
                      if (!sidebarOpen) setSidebarOpen(true);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      borderRadius: 8, border: "none", background: "transparent",
                      color: isGroupActive ? C.primaryLight : C.textMuted,
                      fontSize: 14, fontWeight: isGroupActive ? 700 : 500,
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                    {sidebarOpen && (
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                        {t(label as Parameters<typeof t>[0])}
                      </span>
                    )}
                    {sidebarOpen && (
                      <span style={{ fontSize: 10, opacity: 0.5 }}>{isOpen ? "▼" : "▶"}</span>
                    )}
                  </button>
                  {isOpen && sidebarOpen && (
                    <div style={{ display: "flex", flexDirection: "column", paddingLeft: 28, marginTop: 4, gap: 2 }}>
                      {children.map(childKey => {
                        const childActive = route === childKey;
                        let childLabel: string = childKey;
                        if (childKey === "utilisateurs") childLabel = "Comptes";
                        return (
                          <button
                            key={childKey}
                            onClick={() => goRoute(childKey as AdminRoute)}
                            style={{
                              display: "flex", alignItems: "center", padding: "8px 12px",
                              borderRadius: 6, border: "none",
                              background: childActive ? `linear-gradient(135deg, rgba(29,106,229,0.2), rgba(57,213,213,0.08))` : "transparent",
                              color: childActive ? C.primaryLight : C.textDim,
                              fontSize: 13, fontWeight: childActive ? 600 : 400,
                              cursor: "pointer", textAlign: "left", width: "100%",
                              borderLeft: childActive ? `2px solid ${C.primary}` : "2px solid transparent",
                              transition: "all 0.15s",
                            }}
                          >
                            {childLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = route === key || (route === "plateforme-detail" && key === "plateformes");
            return (
              <button
                key={key}
                id={`admin-nav-${key}`}
                onClick={() => goRoute(key as AdminRoute)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  borderRadius: 8, border: "none",
                  background: active ? `linear-gradient(135deg, rgba(29,106,229,0.2), rgba(57,213,213,0.08))` : "transparent",
                  color: active ? C.primaryLight : C.textMuted,
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  cursor: "pointer", textAlign: "left", width: "100%",
                  borderLeft: active ? `3px solid ${C.primary}` : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                {sidebarOpen && (
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t(label as Parameters<typeof t>[0])}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div
          style={{ padding: "12px 8px", borderTop: `1px solid ${C.border}` }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {adminUser.nom[0]?.toUpperCase()}
            </div>
            {sidebarOpen && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong
                  style={{
                    display: "block",
                    color: C.text,
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {adminUser.nom}
                </strong>
                <span
                  style={{
                    color: C.textDim,
                    fontSize: 11,
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {adminUser.email}
                </span>
              </div>
            )}
            <button
              id="admin-logout-btn"
              onClick={doLogout}
              title="Déconnexion"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.textMuted,
                fontSize: 16,
                cursor: "pointer",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflow: "hidden",
        }}
      >
        {/* TOPBAR */}
        <header
          style={{
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            padding: "0 24px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 16,
            position: "sticky",
            top: 0,
            zIndex: 100,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menu"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 5,
              width: 36,
              height: 36,
              justifyContent: "center",
              alignItems: "center",
              background: C.surface2,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 18,
                  height: 2,
                  background: C.textMuted,
                  borderRadius: 2,
                }}
              />
            ))}
          </button>

          <div
            style={{ flex: 1, fontSize: 16, fontWeight: 700, color: C.text }}
          >
            {route === "dashboard" && t("overview")}
            {route === "plateformes" && "Plateformes"}
            {route === "plateforme-detail" && (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => goRoute("plateformes")}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.textMuted,
                    fontSize: 14,
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 500,
                  }}
                >
                  Plateformes
                </button>
                <span style={{ color: C.textDim }}>›</span>
                <span style={{ color: C.text }}>{sel?.nom}</span>
              </span>
            )}
            {route === "rapports" && "Rapports"}
            {route === "versements" && "Versements"}
            {route === "echeances" && "Écheances"}
            {route === "inventaire" && "Inventaire"}
            {route === "notifications" && "Notifications"}
            {route === "audit" && t("audit")}
            {route === "parametres" && t("settings")}
            {route === "roles" && t("roles")}
            {route === "permissions" && t("permissions")}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              style={{
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: C.textMuted,
              }}
              onClick={() => {
                if (!document.fullscreenElement)
                  document.documentElement.requestFullscreen().catch(() => {});
                else document.exitFullscreen().catch(() => {});
              }}
            >
              ▦
            </button>

            <div style={{ position: "relative" }}>
              <span
                style={{ cursor: "pointer", fontSize: 20 }}
                onClick={() => setLangMenuOpen(!langMenuOpen)}
              >
                {lang === "fr" ? "🇫🇷" : lang === "en" ? "🇬🇧" : "🇪🇸"}
              </span>
              {langMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 40,
                    right: 0,
                    width: 120,
                    zIndex: 100,
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: C.text,
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                    onClick={() => {
                      setLang("fr");
                      localStorage.setItem("koue_lang", "fr");
                      setLangMenuOpen(false);
                    }}
                  >
                    🇫🇷 Français
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: C.text,
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                    onClick={() => {
                      setLang("en");
                      localStorage.setItem("koue_lang", "en");
                      setLangMenuOpen(false);
                    }}
                  >
                    🇬🇧 English
                  </button>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: C.text,
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                    onClick={() => {
                      setLang("es");
                      localStorage.setItem("koue_lang", "es");
                      setLangMenuOpen(false);
                    }}
                  >
                    🇪🇸 Español
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: 12,
                padding: "5px 12px",
                borderRadius: 20,
                background: C.cyanDim,
                color: C.cyan,
                fontWeight: 600,
                border: `1px solid ${C.cyan}30`,
              }}
            >
              {plateformes.length} plateforme
              {plateformes.length !== 1 ? "s" : ""}
            </div>
            <button
              onClick={() => void refresh()}
              title="Actualiser"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: "transparent",
                color: C.textMuted,
                fontSize: 16,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↻
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", background: C.bg }}>
          {err && (
            <div
              style={{
                margin: "16px 24px 0",
                background: C.redDim,
                border: `1px solid ${C.red}40`,
                borderRadius: 10,
                padding: "12px 16px",
                color: C.red,
                fontSize: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>⚠ {err}</span>
              <button
                onClick={() => setErr("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.red,
                  fontSize: 20,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* ══════════ DASHBOARD ══════════ */}
          {route === "dashboard" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Vue d'ensemble"
                sub="Tableau de bord consolidé de toutes les plateformes."
                action={
                  <PBtn
                    id="admin-create-plateforme-btn"
                    onClick={() => {
                      goRoute("plateformes");
                      setMCreate(true);
                    }}
                  >
                    + Nouvelle plateforme
                  </PBtn>
                }
              />

              {/* Filtres */}
              <FiltreBox
                onReset={() =>
                  setDashboardFilters({
                    plateforme: "all",
                    statut: "all",
                    date_debut: "",
                    date_fin: "",
                  })
                }
              >
                <Sel
                  label="Plateforme"
                  value={dashboardFilters.plateforme}
                  onChange={(v) =>
                    setDashboardFilters((p) => ({ ...p, plateforme: v }))
                  }
                >
                  <option value="all">Toutes</option>
                  {plateformes.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nom}
                    </option>
                  ))}
                </Sel>
                <Sel
                  label="Statut"
                  value={dashboardFilters.statut}
                  onChange={(v) =>
                    setDashboardFilters((p) => ({ ...p, statut: v }))
                  }
                >
                  <option value="all">Tous</option>
                  <option value="actif">Actif</option>
                  <option value="suspendu">Suspendu</option>
                  <option value="desactive">Désactivé</option>
                </Sel>
                <DateField
                  label="Du"
                  value={dashboardFilters.date_debut}
                  onChange={(v) =>
                    setDashboardFilters((p) => ({ ...p, date_debut: v }))
                  }
                />
                <DateField
                  label="Au"
                  value={dashboardFilters.date_fin}
                  onChange={(v) =>
                    setDashboardFilters((p) => ({ ...p, date_fin: v }))
                  }
                />
              </FiltreBox>

              {/* KPIs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {[
                  {
                    label: "Plateformes actives",
                    value: filteredSummary.actives,
                    total: filteredSummary.total,
                    color: C.green,
                    icon: "✅",
                  },
                  {
                    label: "Total plateformes",
                    value: filteredSummary.total,
                    color: C.primary,
                    icon: "🏢",
                  },
                  {
                    label: "Total utilisateurs",
                    value: filteredSummary.users,
                    color: C.cyan,
                    icon: "👥",
                  },
                  {
                    label: "Total activités",
                    value: filteredSummary.acts,
                    color: C.orange,
                    icon: "📋",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: "20px 22px",
                      borderTop: `3px solid ${k.color}`,
                      transition: "transform 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 32,
                            fontWeight: 900,
                            color: C.text,
                            lineHeight: 1,
                            marginBottom: 6,
                          }}
                        >
                          {k.value}
                        </div>
                        <div style={{ fontSize: 13, color: C.textMuted }}>
                          {k.label}
                        </div>
                      </div>
                      <span style={{ fontSize: 24 }}>{k.icon}</span>
                    </div>
                    {k.total !== undefined && (
                      <div
                        style={{
                          marginTop: 12,
                          height: 4,
                          borderRadius: 2,
                          background: C.surface2,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 2,
                            background: k.color,
                            width: `${k.total ? (k.value / k.total) * 100 : 0}%`,
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Table plateformes */}
              <SectionTitle
                title="Plateformes"
                badge={filteredPlateformes.length}
              />
              <TTable
                heads={[
                  "Plateforme",
                  "Statut",
                  "Utilisateurs",
                  "Activités",
                  "Limites",
                  "Créée le",
                  "Actions",
                ]}
                empty={filteredPlateformes.length === 0}
                emptyMsg="Aucune plateforme pour ces filtres."
              >
                {filteredPlateformes.map((p) => (
                  <tr
                    key={p.id}
                    style={{ borderBottom: `1px solid ${C.border}20` }}
                  >
                    <td style={{ padding: "13px 16px" }}>
                      <button
                        onClick={() => void openPlateforme(p)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: C.primaryLight,
                          fontWeight: 700,
                          fontSize: 14,
                          padding: 0,
                          textAlign: "left",
                        }}
                      >
                        {p.nom}
                      </button>
                      <div style={{ color: C.textDim, fontSize: 12 }}>
                        {p.slug}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <Bdg s={p.statut} />
                    </td>
                    <td style={{ padding: "13px 16px", color: C.cyan }}>
                      {p.utilisateurs_count ?? 0} / {p.limite_utilisateurs}
                    </td>
                    <td style={{ padding: "13px 16px", color: C.orange }}>
                      {p.activites_count ?? 0} / {p.limite_activites}
                    </td>
                    <td
                      style={{
                        padding: "13px 16px",
                        color: C.textMuted,
                        fontSize: 13,
                      }}
                    >
                      U:{p.limite_utilisateurs} · A:{p.limite_activites}
                    </td>
                    <td
                      style={{
                        padding: "13px 16px",
                        color: C.textDim,
                        fontSize: 13,
                      }}
                    >
                      {fmtDate(p.created_at)}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <SmBtn onClick={() => void openPlateforme(p)}>
                          Gérer
                        </SmBtn>
                        <SmBtn onClick={() => setMEdit(p)}>Modifier</SmBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </TTable>
            </div>
          )}

          {/* ══════════ PLATEFORMES ══════════ */}
          {route === "plateformes" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Plateformes"
                sub="Gérez les espaces clients multi-tenant."
                action={
                  <PBtn
                    id="admin-new-plateforme"
                    onClick={() => setMCreate(true)}
                  >
                    + Nouvelle plateforme
                  </PBtn>
                }
              />

              {/* Recherche */}
              <div style={{ marginBottom: 20 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="🔍  Rechercher une plateforme..."
                  style={{
                    width: "100%",
                    maxWidth: 400,
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "11px 16px",
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
                  gap: 20,
                }}
              >
                {searchedPl.length === 0 && (
                  <div
                    style={{
                      background: C.surface,
                      border: `2px dashed ${C.border}`,
                      borderRadius: 16,
                      padding: 48,
                      textAlign: "center",
                      gridColumn: "1/-1",
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
                    <h3 style={{ color: C.text, margin: "0 0 8px" }}>
                      Aucune plateforme
                    </h3>
                    <p style={{ color: C.textMuted, margin: "0 0 24px" }}>
                      Commencez par créer votre première plateforme.
                    </p>
                    <PBtn onClick={() => setMCreate(true)}>
                      Créer une plateforme
                    </PBtn>
                  </div>
                )}
                {searchedPl.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 16,
                      padding: 22,
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                      transition: "border-color 0.2s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = C.primary + "60")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = C.border)
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 12,
                            background: C.surface2,
                            border: `1px solid ${C.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.nom}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: 22 }}>🏢</span>
                          )}
                        </div>
                        <div>
                          <h3
                            style={{
                              color: C.text,
                              margin: 0,
                              fontSize: 16,
                              fontWeight: 700,
                            }}
                          >
                            {p.nom}
                          </h3>
                          <code style={{ color: C.textDim, fontSize: 12 }}>
                            {p.slug}
                          </code>
                        </div>
                      </div>
                      <Bdg s={p.statut} />
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {[
                        {
                          label: "Utilisateurs",
                          value: p.utilisateurs_count ?? 0,
                          limit: p.limite_utilisateurs,
                          color: C.cyan,
                        },
                        {
                          label: "Activités",
                          value: p.activites_count ?? 0,
                          limit: p.limite_activites,
                          color: C.orange,
                        },
                      ].map((m) => (
                        <div
                          key={m.label}
                          style={{
                            background: C.surface2,
                            borderRadius: 10,
                            padding: 12,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              color: C.textMuted,
                              marginBottom: 4,
                            }}
                          >
                            {m.label}
                          </div>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 800,
                              color: m.color,
                            }}
                          >
                            {m.value}
                            <span
                              style={{
                                fontSize: 12,
                                color: C.textDim,
                                fontWeight: 400,
                              }}
                            >
                              {" "}
                              / {m.limit}
                            </span>
                          </div>
                          <div
                            style={{
                              marginTop: 8,
                              height: 3,
                              borderRadius: 2,
                              background: C.border,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 2,
                                background: m.color,
                                width: `${m.limit ? Math.min((m.value / m.limit) * 100, 100) : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {p.email_contact && (
                      <p
                        style={{ color: C.textMuted, fontSize: 13, margin: 0 }}
                      >
                        📧 {p.email_contact}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <PBtn onClick={() => void openPlateforme(p)}>Gérer</PBtn>
                      <GhBtn onClick={() => setMEdit(p)}>Modifier</GhBtn>
                      {p.statut !== "actif" && (
                        <OkBtn
                          onClick={() => void changerStatut(p.id, "actif")}
                        >
                          Activer
                        </OkBtn>
                      )}
                      {p.statut === "actif" && (
                        <WnBtn
                          onClick={() => void changerStatut(p.id, "suspendu")}
                        >
                          Suspendre
                        </WnBtn>
                      )}
                      {p.statut !== "desactive" && (
                        <DgBtn
                          onClick={() => void changerStatut(p.id, "desactive")}
                        >
                          Désactiver
                        </DgBtn>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ PLATEFORME DETAIL ══════════ */}
          {route === "plateforme-detail" && sel && (
            <div style={{ padding: "24px" }}>
              {/* Header plateforme */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginBottom: 24,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      background: C.surface2,
                      border: `1px solid ${C.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {sel.image_url ? (
                      <img
                        src={sel.image_url}
                        alt={sel.nom}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 28 }}>🏢</span>
                    )}
                  </div>
                  <div>
                    <h2
                      style={{
                        color: C.text,
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                      }}
                    >
                      {sel.nom}
                    </h2>
                    <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                      <code style={{ color: C.textDim, fontSize: 13 }}>
                        {sel.slug}
                      </code>
                      {sel.email_contact && (
                        <span style={{ color: C.textMuted, fontSize: 13 }}>
                          · {sel.email_contact}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Bdg s={sel.statut} />
                  <GhBtn onClick={() => setMEdit(sel)}>Modifier</GhBtn>
                  {sel.statut !== "actif" && (
                    <OkBtn onClick={() => void changerStatut(sel.id, "actif")}>
                      Activer
                    </OkBtn>
                  )}
                  {sel.statut === "actif" && (
                    <WnBtn
                      onClick={() => void changerStatut(sel.id, "suspendu")}
                    >
                      Suspendre
                    </WnBtn>
                  )}
                  {sel.statut !== "desactive" && (
                    <DgBtn
                      onClick={() => void changerStatut(sel.id, "desactive")}
                    >
                      Désactiver
                    </DgBtn>
                  )}
                </div>
              </div>

              {/* Onglets */}
              <div
                style={{
                  display: "flex",
                  gap: 2,
                  marginBottom: 24,
                  overflowX: "auto",
                  background: C.surface,
                  borderRadius: 12,
                  padding: "6px",
                  border: `1px solid ${C.border}`,
                }}
              >
                {(
                  [
                    ["infos", "ℹ️ Infos"],
                    ["users", `👥 Utilisateurs (${users.length})`],
                    ["types", `🏷️ Types (${platformTypes.length})`],
                    ["cats", `💡 Catégories (${platformCats.length})`],
                    ["acts", `📋 Activités (${acts.length})`],
                    ["rapports", "📊 Rapports"],
                    ["versements", "💰 Versements"],
                    ["echeances", "📅 Échéances"],
                    ["inventaire", "📦 Inventaire"],
                    ["notifs", "🔔 Notifications"],
                  ] as [DetailTab, string][]
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => void loadDetailTab(tab)}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 9,
                      border: "none",
                      background:
                        detailTab === tab
                          ? `linear-gradient(135deg, ${C.primary}, #1551b5)`
                          : "transparent",
                      color: detailTab === tab ? "#fff" : C.textMuted,
                      fontSize: 13,
                      fontWeight: detailTab === tab ? 700 : 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Onglet Infos */}
              {detailTab === "infos" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                    gap: 14,
                  }}
                >
                  {[
                    ["Slug", sel.slug],
                    ["Email", sel.email_contact || "—"],
                    ["Téléphone", sel.telephone_contact || "—"],
                    ["Adresse", sel.adresse || "—"],
                    [
                      "Utilisateurs",
                      `${sel.utilisateurs_count ?? 0} / ${sel.limite_utilisateurs}`,
                    ],
                    [
                      "Activités",
                      `${sel.activites_count ?? 0} / ${sel.limite_activites}`,
                    ],
                    ["Statut", SL[sel.statut]],
                    ["Créée le", fmtDate(sel.created_at)],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      style={{
                        background: C.surface,
                        borderRadius: 12,
                        padding: 16,
                        border: `1px solid ${C.border}`,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: C.textDim,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 1,
                          marginBottom: 6,
                        }}
                      >
                        {l}
                      </span>
                      <span
                        style={{ color: C.text, fontSize: 15, fontWeight: 600 }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Onglet Users */}
              {detailTab === "users" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <SectionTitle title="Utilisateurs" badge={users.length} />
                    <PBtn
                      id="admin-add-user-btn"
                      onClick={() => setMUser(true)}
                    >
                      + Ajouter
                    </PBtn>
                  </div>
                  <TTable
                    heads={[
                      "Nom",
                      "Email",
                      "Rôle",
                      "Statut",
                      "Dernière connexion",
                      "Actions",
                    ]}
                    empty={users.length === 0}
                    emptyMsg="Aucun utilisateur."
                  >
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        style={{ borderBottom: `1px solid ${C.border}20` }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {u.nom[0]?.toUpperCase()}
                            </div>
                            <span style={{ color: C.text, fontWeight: 600 }}>
                              {u.nom}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{ padding: "12px 16px", color: C.textMuted }}
                        >
                          {u.email}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: C.purpleDim,
                              color: C.purple,
                            }}
                          >
                            {u.role?.nom ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Bdg s={u.statut} />
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: C.textDim,
                            fontSize: 13,
                          }}
                        >
                          {fmtDate(u.derniere_connexion)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {u.statut === "actif" ? (
                              <WnBtn
                                onClick={() =>
                                  void toggleUser(u.id, "suspendu")
                                }
                              >
                                Suspendre
                              </WnBtn>
                            ) : (
                              <OkBtn
                                onClick={() => void toggleUser(u.id, "actif")}
                              >
                                Activer
                              </OkBtn>
                            )}
                            <DgBtn onClick={() => void supprimerUser(u.id)}>
                              Supprimer
                            </DgBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </TTable>
                </div>
              )}

              {/* Onglet Types */}
              {detailTab === "types" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <SectionTitle
                      title="Types d'activités"
                      badge={platformTypes.length}
                    />
                    <PBtn onClick={() => setMType(true)}>+ Nouveau type</PBtn>
                  </div>
                  <TTable
                    heads={[
                      "Nom",
                      "Récurrent",
                      "Fréquence",
                      "Champs supp.",
                      "Statut",
                      "Actions",
                    ]}
                    empty={platformTypes.length === 0}
                    emptyMsg="Aucun type configuré."
                  >
                    {platformTypes.map((t) => (
                      <tr
                        key={t.id}
                        style={{ borderBottom: `1px solid ${C.border}20` }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            color: C.text,
                            fontWeight: 600,
                          }}
                        >
                          {t.nom}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              color: t.a_versement_recurrent
                                ? C.green
                                : C.textDim,
                            }}
                          >
                            {t.a_versement_recurrent ? "✓ Oui" : "Non"}
                          </span>
                        </td>
                        <td
                          style={{ padding: "12px 16px", color: C.textMuted }}
                        >
                          {t.frequence_versement || "—"}
                        </td>
                        <td
                          style={{ padding: "12px 16px", color: C.textMuted }}
                        >
                          {t.schema_champs ? "✓ Configuré" : "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Bdg s={t.actif ? "actif" : "desactive"} />
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <SmBtn onClick={() => setMType(t)}>Modifier</SmBtn>
                            {t.actif ? (
                              <DgBtn
                                onClick={() => void toggleType(t.id, false)}
                              >
                                Désactiver
                              </DgBtn>
                            ) : (
                              <OkBtn
                                onClick={() => void toggleType(t.id, true)}
                              >
                                Activer
                              </OkBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </TTable>
                </div>
              )}

              {/* Onglet Categories */}
              {detailTab === "cats" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <SectionTitle
                      title="Catégories financières"
                      badge={platformCats.length}
                    />
                    <PBtn onClick={() => setMCat(true)}>
                      + Nouvelle catégorie
                    </PBtn>
                  </div>
                  <TTable
                    heads={[
                      "Nom",
                      "Nature",
                      "Business lié",
                      "Statut",
                      "Actions",
                    ]}
                    empty={platformCats.length === 0}
                    emptyMsg="Aucune catégorie."
                  >
                    {platformCats.map((c) => (
                      <tr
                        key={c.id}
                        style={{ borderBottom: `1px solid ${C.border}20` }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            color: C.text,
                            fontWeight: 600,
                          }}
                        >
                          {c.nom}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 700,
                              background:
                                c.nature === "revenu" ? C.greenDim : C.redDim,
                              color: c.nature === "revenu" ? C.green : C.red,
                            }}
                          >
                            {c.nature === "revenu" ? "📈 Revenu" : "📉 Dépense"}
                          </span>
                        </td>
                        <td
                          style={{ padding: "12px 16px", color: C.textMuted }}
                        >
                          {c.type_activite?.nom || "Tous"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Bdg s={c.actif ? "actif" : "desactive"} />
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <SmBtn onClick={() => setMCat(c)}>Modifier</SmBtn>
                            {c.actif ? (
                              <DgBtn
                                onClick={() => void toggleCat(c.id, false)}
                              >
                                Désactiver
                              </DgBtn>
                            ) : (
                              <OkBtn onClick={() => void toggleCat(c.id, true)}>
                                Activer
                              </OkBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </TTable>
                </div>
              )}

              {/* Onglet Activités */}
              {detailTab === "acts" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <SectionTitle title="Activités" badge={acts.length} />
                    <PBtn
                      id="admin-add-activite-btn"
                      onClick={() => setMAct(true)}
                    >
                      + Ajouter
                    </PBtn>
                  </div>
                  <TTable
                    heads={[
                      "Code",
                      "Nom",
                      "Type",
                      "Versement",
                      "Gérant",
                      "Statut",
                      "Actions",
                    ]}
                    empty={acts.length === 0}
                    emptyMsg="Aucune activité."
                  >
                    {acts.map((a) => (
                      <tr
                        key={a.id}
                        style={{ borderBottom: `1px solid ${C.border}20` }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <code
                            style={{
                              color: C.purple,
                              fontSize: 13,
                              background: C.purpleDim,
                              padding: "2px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {a.code}
                          </code>
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: C.text,
                            fontWeight: 600,
                          }}
                        >
                          {a.nom}
                        </td>
                        <td
                          style={{ padding: "12px 16px", color: C.textMuted }}
                        >
                          {a.type_activite?.nom ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            color: C.orange,
                            fontWeight: 600,
                          }}
                        >
                          {money(a.montant_versement)}
                        </td>
                        <td
                          style={{ padding: "12px 16px", color: C.textMuted }}
                        >
                          {a.gerant?.nom ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Bdg s={a.statut} />
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {a.statut === "actif" ? (
                            <WnBtn
                              onClick={() => void toggleAct(a.id, "en_pause")}
                            >
                              Pause
                            </WnBtn>
                          ) : (
                            <OkBtn
                              onClick={() => void toggleAct(a.id, "actif")}
                            >
                              Activer
                            </OkBtn>
                          )}
                        </td>
                      </tr>
                    ))}
                  </TTable>
                </div>
              )}

              {/* Onglet Rapports */}
              {detailTab === "rapports" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <SectionTitle title="Rapport financier" />
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <DateField
                        label="Du"
                        value={rapportDates.debut}
                        onChange={(v) =>
                          setRapportDates((p) => ({ ...p, debut: v }))
                        }
                      />
                      <DateField
                        label="Au"
                        value={rapportDates.fin}
                        onChange={(v) =>
                          setRapportDates((p) => ({ ...p, fin: v }))
                        }
                      />
                      <PBtn onClick={() => void loadRapport()}>Générer</PBtn>
                    </div>
                  </div>
                  {rapport ? (
                    <>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit,minmax(180px,1fr))",
                          gap: 16,
                          marginBottom: 24,
                        }}
                      >
                        {[
                          {
                            label: "Revenus",
                            value: rapport.totaux?.revenus ?? 0,
                            color: C.green,
                          },
                          {
                            label: "Dépenses",
                            value: rapport.totaux?.decaissements ?? 0,
                            color: C.red,
                          },
                          {
                            label: "Résultat net",
                            value: rapport.totaux?.resultat ?? 0,
                            color:
                              (rapport.totaux?.resultat ?? 0) >= 0
                                ? C.cyan
                                : C.red,
                          },
                        ].map((k) => (
                          <div
                            key={k.label}
                            style={{
                              background: C.surface,
                              border: `1px solid ${C.border}`,
                              borderRadius: 14,
                              padding: "20px 22px",
                              borderTop: `3px solid ${k.color}`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: C.textMuted,
                                marginBottom: 8,
                                textTransform: "uppercase",
                                letterSpacing: 1,
                              }}
                            >
                              {k.label}
                            </div>
                            <div
                              style={{
                                fontSize: 26,
                                fontWeight: 900,
                                color: k.color,
                              }}
                            >
                              {money(k.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {rapport.activites && rapport.activites.length > 0 && (
                        <TTable
                          heads={[
                            "Code",
                            "Activité",
                            "Revenus",
                            "Dépenses",
                            "Résultat",
                          ]}
                          empty={false}
                          emptyMsg=""
                        >
                          {rapport.activites.map((a) => (
                            <tr
                              key={a.id}
                              style={{
                                borderBottom: `1px solid ${C.border}20`,
                              }}
                            >
                              <td style={{ padding: "12px 16px" }}>
                                <code style={{ color: C.purple, fontSize: 13 }}>
                                  {a.code}
                                </code>
                              </td>
                              <td
                                style={{ padding: "12px 16px", color: C.text }}
                              >
                                {a.nom}
                              </td>
                              <td
                                style={{ padding: "12px 16px", color: C.green }}
                              >
                                {money(a.revenus)}
                              </td>
                              <td
                                style={{ padding: "12px 16px", color: C.red }}
                              >
                                {money(a.decaissements)}
                              </td>
                              <td
                                style={{
                                  padding: "12px 16px",
                                  color: a.resultat >= 0 ? C.cyan : C.red,
                                  fontWeight: 700,
                                }}
                              >
                                {money(a.resultat)}
                              </td>
                            </tr>
                          ))}
                        </TTable>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      icon="📊"
                      title="Aucun rapport"
                      msg="Choisissez une période et cliquez sur Générer."
                    />
                  )}
                </div>
              )}

              {/* Onglet Versements */}
              {detailTab === "versements" && (
                <div>
                  <SectionTitle
                    title="Versements récents"
                    badge={
                      transactions.filter((t) => t.type === "revenu").length
                    }
                  />
                  <TTable
                    heads={[
                      "Date",
                      "Activité",
                      "Catégorie",
                      "Montant",
                      "Mode",
                      "Statut",
                    ]}
                    empty={transactions.length === 0}
                    emptyMsg="Aucun versement pour cette plateforme."
                  >
                    {transactions
                      .filter((t) => t.type === "revenu")
                      .map((t) => (
                        <tr
                          key={t.id}
                          style={{ borderBottom: `1px solid ${C.border}20` }}
                        >
                          <td
                            style={{
                              padding: "12px 16px",
                              color: C.textMuted,
                              fontSize: 13,
                            }}
                          >
                            {fmtDate(t.date_transaction)}
                          </td>
                          <td style={{ padding: "12px 16px", color: C.text }}>
                            {t.activite?.nom ?? "—"}
                            <div style={{ color: C.textDim, fontSize: 12 }}>
                              {t.activite?.code}
                            </div>
                          </td>
                          <td
                            style={{ padding: "12px 16px", color: C.textMuted }}
                          >
                            {t.categorie?.nom ?? "—"}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: C.green,
                              fontWeight: 700,
                            }}
                          >
                            {money(t.montant)}
                          </td>
                          <td
                            style={{ padding: "12px 16px", color: C.textMuted }}
                          >
                            {t.mode_paiement}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <Bdg s={t.statut_validation ?? "actif"} />
                          </td>
                        </tr>
                      ))}
                  </TTable>
                </div>
              )}

              {/* Onglet Écheances */}
              {detailTab === "echeances" && (
                <div>
                  <SectionTitle title="Échéances" badge={echeances.length} />
                  <TTable
                    heads={[
                      "Activité",
                      "Période",
                      "Attendu",
                      "Payé",
                      "Solde",
                      "Statut",
                    ]}
                    empty={echeances.length === 0}
                    emptyMsg="Aucune échéance pour cette plateforme."
                  >
                    {echeances.map((ec) => {
                      const solde =
                        Number(ec.montant_attendu) - Number(ec.montant_paye);
                      return (
                        <tr
                          key={ec.id}
                          style={{ borderBottom: `1px solid ${C.border}20` }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ color: C.text, fontWeight: 600 }}>
                              {ec.activite?.nom ?? "—"}
                            </div>
                            <code style={{ color: C.textDim, fontSize: 12 }}>
                              {ec.activite?.code}
                            </code>
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: C.textMuted,
                              fontSize: 13,
                            }}
                          >
                            {ec.debut_periode
                              ? `${fmtDate(ec.debut_periode)} → ${fmtDate(ec.fin_periode)}`
                              : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", color: C.cyan }}>
                            {money(ec.montant_attendu)}
                          </td>
                          <td style={{ padding: "12px 16px", color: C.green }}>
                            {money(ec.montant_paye)}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: solde > 0 ? C.red : C.green,
                              fontWeight: 700,
                            }}
                          >
                            {money(solde)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <Bdg s={ec.statut} />
                          </td>
                        </tr>
                      );
                    })}
                  </TTable>
                </div>
              )}

              {/* Onglet Inventaire */}
              {detailTab === "inventaire" && (
                <div>
                  <SectionTitle title="Inventaire" badge={articles.length} />
                  <TTable
                    heads={[
                      "Article",
                      "Type",
                      "Quantité",
                      "Valeur unit.",
                      "Valeur totale",
                      "Seuil alerte",
                      "Activité",
                    ]}
                    empty={articles.length === 0}
                    emptyMsg="Aucun article dans l'inventaire."
                  >
                    {articles.map((a) => {
                      const vTotal =
                        Number(a.quantite) * Number(a.valeur_unitaire);
                      const enAlerte =
                        a.seuil_alerte &&
                        Number(a.quantite) <= Number(a.seuil_alerte);
                      return (
                        <tr
                          key={a.id}
                          style={{
                            borderBottom: `1px solid ${C.border}20`,
                            background: enAlerte ? `${C.red}08` : undefined,
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div
                              style={{
                                color: C.text,
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              {enAlerte && <span title="Stock bas">⚠️</span>}{" "}
                              {a.nom}
                            </div>
                          </td>
                          <td
                            style={{ padding: "12px 16px", color: C.textMuted }}
                          >
                            {a.type_article}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: enAlerte ? C.red : C.cyan,
                              fontWeight: 700,
                            }}
                          >
                            {fmt(a.quantite)} {a.unite}
                          </td>
                          <td style={{ padding: "12px 16px", color: C.orange }}>
                            {money(a.valeur_unitaire)}
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              color: C.text,
                              fontWeight: 600,
                            }}
                          >
                            {money(vTotal)}
                          </td>
                          <td
                            style={{ padding: "12px 16px", color: C.textMuted }}
                          >
                            {a.seuil_alerte ? fmt(a.seuil_alerte) : "—"}
                          </td>
                          <td
                            style={{ padding: "12px 16px", color: C.textMuted }}
                          >
                            {a.activite?.nom ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </TTable>
                </div>
              )}

              {/* Onglet Notifications */}
              {detailTab === "notifs" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <SectionTitle title="Notifications" badge={notifs.length} />
                    <PBtn onClick={() => setMNotif(true)}>
                      + Envoyer une notif.
                    </PBtn>
                  </div>
                  <TTable
                    heads={["Titre", "Message", "Type", "Lu"]}
                    empty={notifs.length === 0}
                    emptyMsg="Aucune notification."
                  >
                    {notifs.map((n) => (
                      <tr
                        key={n.id}
                        style={{ borderBottom: `1px solid ${C.border}20` }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            color: C.text,
                            fontWeight: 600,
                          }}
                        >
                          {n.titre}
                        </td>
                        <td
                          style={{ padding: "12px 16px", color: C.textMuted }}
                        >
                          {n.message}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              background: C.cyanDim,
                              color: C.cyan,
                            }}
                          >
                            {n.type_notification}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {n.lu ? (
                            <span style={{ color: C.green }}>✓ Lu</span>
                          ) : (
                            <span style={{ color: C.orange }}>Non lu</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </TTable>
                </div>
              )}
            </div>
          )}

          {/* ══════════ RAPPORTS GLOBAUX ══════════ */}
          {route === "rapports" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Rapports"
                sub="Choisissez une plateforme pour générer son rapport financier."
                action={null}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                {plateformes.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>
                        {p.nom}
                      </h3>
                      <Bdg s={p.statut} />
                    </div>
                    <p style={{ color: C.textMuted, fontSize: 13, margin: 0 }}>
                      📋 {p.activites_count ?? 0} activités · 👥{" "}
                      {p.utilisateurs_count ?? 0} utilisateurs
                    </p>
                    <PBtn
                      onClick={() => {
                        void openPlateforme(p).then(
                          () => void loadDetailTab("rapports"),
                        );
                      }}
                    >
                      Voir le rapport
                    </PBtn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ VERSEMENTS GLOBAUX ══════════ */}
          {route === "versements" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Versements"
                sub="Sélectionnez une plateforme pour consulter ses versements."
                action={null}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                {plateformes.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>
                        {p.nom}
                      </h3>
                      <Bdg s={p.statut} />
                    </div>
                    <PBtn
                      onClick={() => {
                        void openPlateforme(p).then(
                          () => void loadDetailTab("versements"),
                        );
                      }}
                    >
                      Voir les versements
                    </PBtn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ ÉCHEANCES GLOBALES ══════════ */}
          {route === "echeances" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Échéances"
                sub="Consultez les retards de paiement par plateforme."
                action={null}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                {plateformes.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>
                        {p.nom}
                      </h3>
                      <Bdg s={p.statut} />
                    </div>
                    <PBtn
                      onClick={() => {
                        void openPlateforme(p).then(
                          () => void loadDetailTab("echeances"),
                        );
                      }}
                    >
                      Voir les échéances
                    </PBtn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ INVENTAIRE GLOBAL ══════════ */}
          {route === "inventaire" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Inventaire"
                sub="Consultez le stock de chaque plateforme."
                action={null}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                {plateformes.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>
                        {p.nom}
                      </h3>
                      <Bdg s={p.statut} />
                    </div>
                    <PBtn
                      onClick={() => {
                        void openPlateforme(p).then(
                          () => void loadDetailTab("inventaire"),
                        );
                      }}
                    >
                      Voir l'inventaire
                    </PBtn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ NOTIFICATIONS GLOBAL ══════════ */}
          {route === "notifications" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Notifications"
                sub="Envoyez des notifications aux utilisateurs de vos plateformes."
                action={null}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                  gap: 16,
                }}
              >
                {plateformes.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 14,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ color: C.text, margin: 0, fontSize: 16 }}>
                        {p.nom}
                      </h3>
                      <Bdg s={p.statut} />
                    </div>
                    <PBtn
                      onClick={() => {
                        void openPlateforme(p).then(() => {
                          setDetailTab("notifs");
                          setMNotif(true);
                        });
                      }}
                    >
                      Envoyer une notif.
                    </PBtn>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ AUDIT ══════════ */}
          {route === "audit" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Journal d'audit"
                sub="Toutes les actions sensibles tracées en temps réel."
                action={null}
              />

              <FiltreBox
                onReset={() =>
                  setAuditFilters({
                    action: "all",
                    entite: "all",
                    plateforme: "all",
                    date_debut: "",
                    date_fin: "",
                  })
                }
              >
                <Sel
                  label="Action"
                  value={auditFilters.action}
                  onChange={(v) =>
                    setAuditFilters((p) => ({ ...p, action: v }))
                  }
                >
                  <option value="all">Toutes</option>
                  {auditActionOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Sel>
                <Sel
                  label="Entité"
                  value={auditFilters.entite}
                  onChange={(v) =>
                    setAuditFilters((p) => ({ ...p, entite: v }))
                  }
                >
                  <option value="all">Toutes</option>
                  {auditEntiteOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Sel>
                <Sel
                  label="Plateforme"
                  value={auditFilters.plateforme}
                  onChange={(v) =>
                    setAuditFilters((p) => ({ ...p, plateforme: v }))
                  }
                >
                  <option value="all">Toutes</option>
                  {auditPlatformOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Sel>
                <DateField
                  label="Du"
                  value={auditFilters.date_debut}
                  onChange={(v) =>
                    setAuditFilters((p) => ({ ...p, date_debut: v }))
                  }
                />
                <DateField
                  label="Au"
                  value={auditFilters.date_fin}
                  onChange={(v) =>
                    setAuditFilters((p) => ({ ...p, date_fin: v }))
                  }
                />
              </FiltreBox>

              <TTable
                heads={["Action", "Entité", "ID", "Utilisateur", "IP", "Date"]}
                empty={filteredAudits.length === 0}
                emptyMsg="Aucune action pour ces filtres."
              >
                {filteredAudits.map((l) => (
                  <tr
                    key={l.id}
                    style={{ borderBottom: `1px solid ${C.border}20` }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <code
                        style={{
                          color: C.purple,
                          background: C.purpleDim,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 13,
                        }}
                      >
                        {l.action}
                      </code>
                    </td>
                    <td style={{ padding: "12px 16px", color: C.textMuted }}>
                      {l.entite}
                    </td>
                    <td style={{ padding: "12px 16px", color: C.textDim }}>
                      {l.entite_id ? `#${l.entite_id}` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: C.text }}>
                      {l.utilisateur?.nom ?? "Système"}
                      <div style={{ color: C.textDim, fontSize: 12 }}>
                        {l.utilisateur?.email}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: C.textDim,
                        fontSize: 13,
                      }}
                    >
                      {l.adresse_ip ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: C.textDim,
                        fontSize: 13,
                      }}
                    >
                      {fmtDate(l.created_at)}
                    </td>
                  </tr>
                ))}
              </TTable>
            </div>
          )}

          {/* ══════════ PARAMÈTRES ══════════ */}
          {route === "parametres" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Paramètres système"
                sub="Configurez les paramètres globaux ou spécifiques à une plateforme."
                action={null}
              />

              <FiltreBox onReset={() => setParamFilter("all")}>
                <Sel
                  label="Plateforme"
                  value={paramFilter}
                  onChange={(v) => setParamFilter(v)}
                >
                  <option value="all">Global (Système)</option>
                  {plateformes.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.nom}
                    </option>
                  ))}
                </Sel>
              </FiltreBox>
              {parametres.length === 0 ? (
                <EmptyState
                  icon="⚙️"
                  title="Aucun paramètre"
                  msg="Aucun paramètre système n'est disponible."
                />
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {parametres.map((pm) => (
                    <div
                      key={pm.cle}
                      style={{
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        padding: "18px 22px",
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div
                          style={{
                            color: C.text,
                            fontWeight: 700,
                            marginBottom: 4,
                          }}
                        >
                          {pm.cle}
                        </div>
                        {pm.description && (
                          <div style={{ color: C.textMuted, fontSize: 13 }}>
                            {pm.description}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <input
                          value={paramDrafts[pm.cle] ?? pm.valeur}
                          onChange={(e) =>
                            setParamDrafts((p) => ({
                              ...p,
                              [pm.cle]: e.target.value,
                            }))
                          }
                          style={{
                            background: C.surface2,
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            padding: "9px 14px",
                            color: C.text,
                            fontSize: 14,
                            outline: "none",
                            minWidth: 200,
                          }}
                        />
                        <PBtn onClick={() => void saveParam(pm.cle)}>
                          Enregistrer
                        </PBtn>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══════════ ROLES ══════════ */}
          {route === "roles" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title={t("roles")}
                sub="Gérez les rôles utilisateurs et leurs permissions."
                action={<PBtn onClick={() => setMRole(true)}>{t("addRole")}</PBtn>}
              />

              {/* Search bar */}
              <div style={{ marginBottom: 18 }}>
                <input
                  type="text"
                  placeholder="🔍 Rechercher un rôle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "10px 16px",
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {roles.filter(r => r.nom.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <EmptyState
                  icon="👥"
                  title="Aucun rôle"
                  msg="Aucun rôle n'a été créé yet."
                />
              ) : (
                <TTable
                  heads={["Nom", "Slug", "Description", "Permissions", "Actions"]}
                  empty={roles.length === 0}
                  emptyMsg="Aucun rôle disponible."
                >
                  {roles.filter(r => r.nom.toLowerCase().includes(search.toLowerCase()) || (r.description && r.description.toLowerCase().includes(search.toLowerCase()))).map((r) => (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td style={{ padding: "12px 16px", color: C.text, fontWeight: 600 }}>
                        {r.nom}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <code style={{ color: C.textDim, fontSize: 12 }}>{r.slug}</code>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.textMuted }}>
                        {r.description || "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ 
                          padding: "4px 10px", 
                          borderRadius: 20, 
                          fontSize: 12, 
                          fontWeight: 600,
                          background: C.cyanDim,
                          color: C.cyan,
                          border: `1px solid ${C.cyan}30`
                        }}>
                          {r.permissions?.length || 0} {t("permissions")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setMRole(r)}
                            style={{
                              width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`,
                              background: C.surface2, color: C.textMuted, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = C.primary;
                              e.currentTarget.style.color = C.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.color = C.textMuted;
                            }}
                            title={t("edit")}
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => void deleteRole(r.id)}
                            style={{
                              width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`,
                              background: C.surface2, color: C.textMuted, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = C.red;
                              e.currentTarget.style.color = C.red;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.color = C.textMuted;
                            }}
                            title="Supprimer"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </TTable>
              )}
            </div>
          )}

          {/* ══════════ PERMISSIONS ══════════ */}
          {route === "permissions" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title={t("permissions")}
                sub="Gérez les permissions du système."
                action={<PBtn onClick={() => setMPermission(true)}>Ajouter une permission</PBtn>}
              />

              {/* Search bar */}
              <div style={{ marginBottom: 18 }}>
                <input
                  type="text"
                  placeholder="🔍 Rechercher une permission..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "10px 16px",
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {permissions.filter(p => p.nom.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
                <EmptyState
                  icon="🔑"
                  title="Aucune permission"
                  msg="Aucune permission n'a été créée."
                />
              ) : (
                <TTable
                  heads={["Nom", "Slug", "Rôles assignés", "Actions"]}
                  empty={permissions.length === 0}
                  emptyMsg="Aucune permission disponible."
                >
                  {permissions.filter(p => p.nom.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())).map((p) => (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td style={{ padding: "12px 16px", color: C.text, fontWeight: 600 }}>
                        {p.nom}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <code style={{ color: C.textDim, fontSize: 12 }}>{p.slug}</code>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ 
                          padding: "4px 10px", 
                          borderRadius: 20, 
                          fontSize: 12, 
                          fontWeight: 600,
                          background: C.purpleDim,
                          color: C.purple,
                          border: `1px solid ${C.purple}30`
                        }}>
                          {p.roles?.length || 0} rôle(s)
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => setMPermission(p)}
                            style={{
                              width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`,
                              background: C.surface2, color: C.textMuted, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = C.primary;
                              e.currentTarget.style.color = C.primary;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.color = C.textMuted;
                            }}
                            title={t("edit")}
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => void deletePermission(p.id)}
                            style={{
                              width: 32, height: 32, borderRadius: 6, border: `1px solid ${C.border}`,
                              background: C.surface2, color: C.textMuted, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = C.red;
                              e.currentTarget.style.color = C.red;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.color = C.textMuted;
                            }}
                            title="Supprimer"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </TTable>
              )}
            </div>
          )}
          {/* ══════════ UTILISATEURS ══════════ */}
          {route === "utilisateurs" && (
            <div style={{ padding: "28px 24px" }}>
              <PH
                title="Comptes Utilisateurs"
                sub="Gérez les accès globaux."
                action={<PBtn onClick={() => setMUser(true)}>Ajouter un utilisateur</PBtn>}
              />

              {/* Search bar */}
              <div style={{ marginBottom: 18 }}>
                <input
                  type="text"
                  placeholder="🔍 Rechercher un utilisateur..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: "10px 16px",
                    color: C.text,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {users.length === 0 ? (
                <EmptyState
                  icon="👤"
                  title="Aucun utilisateur"
                  msg="Aucun compte créé."
                />
              ) : (
                <TTable
                  heads={["Nom", "Email", "Rôle", "Statut", "Dernière connexion", "Actions"]}
                  empty={users.length === 0}
                  emptyMsg="Aucun utilisateur."
                >
                  {users.filter(u => u.nom.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).map((u) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {u.nom[0]?.toUpperCase()}
                          </div>
                          <span style={{ color: C.text, fontWeight: 600 }}>{u.nom}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.textMuted }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: C.purpleDim, color: C.purple,
                        }}>
                          {u.role?.nom ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Bdg s={u.statut} />
                      </td>
                      <td style={{ padding: "12px 16px", color: C.textDim, fontSize: 13 }}>
                        {fmtDate(u.derniere_connexion)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {u.statut === "actif" ? (
                            <WnBtn onClick={() => void toggleUser(u.id, "suspendu")}>
                              Suspendre
                            </WnBtn>
                          ) : (
                            <OkBtn onClick={() => void toggleUser(u.id, "actif")}>
                              Activer
                            </OkBtn>
                          )}
                          <DgBtn onClick={() => void supprimerUser(u.id)}>
                            Supprimer
                          </DgBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </TTable>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ══════════ TOAST ══════════ */}
      {toast.visible && (
        <div style={{
          position: "fixed",
          bottom: 24,
          left: 24,
          background: C.surface,
          border: `1px solid ${C.green}50`,
          borderRadius: 8,
          padding: "16px 24px",
          color: C.text,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          zIndex: 9999,
          animation: "slideUp 0.3s ease-out",
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%", background: C.greenDim,
            color: C.green, display: "flex", alignItems: "center", justifyContent: "center"
          }}>✓</div>
          {toast.message}
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}
      {mCreate && (
        <Moda title="Nouvelle plateforme" onClose={() => setMCreate(false)}>
          <form
            id="admin-create-plateforme-form"
            onSubmit={(e) => {
              void creer(e);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <SecH>Informations de la plateforme</SecH>
            <GRow>
              <Fld
                id="cp-nom"
                label="Nom *"
                name="nom"
                required
                ph="Ma Plateforme"
              />
              <Fld
                id="cp-slug"
                label="Slug (auto)"
                name="slug"
                ph="ma-plateforme"
              />
            </GRow>
            <GRow>
              <Fld
                id="cp-email"
                label="Email"
                name="email_contact"
                type="email"
                ph="contact@..."
              />
              <Fld
                id="cp-tel"
                label="Téléphone"
                name="telephone_contact"
                ph="+225..."
              />
            </GRow>
            <Fld
              id="cp-adresse"
              label="Adresse"
              name="adresse"
              ph="Abidjan, Côte d'Ivoire"
            />
            <FileField label="Logo de la plateforme" name="image" />
            <GRow>
              <SlFld
                id="cp-stat"
                label="Statut *"
                name="statut"
                opts={[
                  ["actif", "Actif"],
                  ["suspendu", "Suspendu"],
                  ["desactive", "Désactivé"],
                ]}
                dv="actif"
              />
              <Fld
                id="cp-lu"
                label="Limite utilisateurs *"
                name="limite_utilisateurs"
                type="number"
                dv="10"
                min="1"
                required
              />
              <Fld
                id="cp-la"
                label="Limite activités *"
                name="limite_activites"
                type="number"
                dv="25"
                min="1"
                required
              />
            </GRow>
            <SecH>Administrateur par défaut</SecH>
            <GRow>
              <Fld
                id="cp-unom"
                label="Nom *"
                name="utilisateur_defaut.nom"
                required
                ph="Admin"
              />
              <Fld
                id="cp-uemail"
                label="Email *"
                name="utilisateur_defaut.email"
                type="email"
                required
                ph="admin@..."
              />
            </GRow>
            <GRow>
              <Fld
                id="cp-upw"
                label="Mot de passe *"
                name="utilisateur_defaut.mot_de_passe"
                type="password"
                required
                minLength={8}
                ph="min 8 car."
              />
              <Fld
                id="cp-utel"
                label="Téléphone admin"
                name="utilisateur_defaut.telephone"
                ph="+225..."
              />
            </GRow>
            <FmAct
              onCancel={() => setMCreate(false)}
              submitId="admin-submit-plateforme"
              label="Créer la plateforme"
            />
          </form>
        </Moda>
      )}

      {mEdit && (
        <Moda title={`Modifier : ${mEdit.nom}`} onClose={() => setMEdit(null)}>
          <form
            id="admin-edit-plateforme-form"
            onSubmit={(e) => {
              void modifier(e, mEdit.id);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <GRow>
              <Fld label="Nom *" name="nom" required dv={mEdit.nom} />
              <Fld label="Slug" name="slug" dv={mEdit.slug} />
            </GRow>
            <GRow>
              <Fld
                label="Email"
                name="email_contact"
                type="email"
                dv={mEdit.email_contact}
              />
              <Fld
                label="Téléphone"
                name="telephone_contact"
                dv={mEdit.telephone_contact}
              />
            </GRow>
            <Fld label="Adresse" name="adresse" dv={mEdit.adresse} />
            <FileField
              label="Logo (laisser vide pour conserver)"
              name="image"
              previewUrl={mEdit.image_url ?? undefined}
            />
            <GRow>
              <SlFld
                label="Statut"
                name="statut"
                opts={[
                  ["actif", "Actif"],
                  ["suspendu", "Suspendu"],
                  ["desactive", "Désactivé"],
                ]}
                dv={mEdit.statut}
              />
              <Fld
                label="Limite utilisateurs *"
                name="limite_utilisateurs"
                type="number"
                dv={String(mEdit.limite_utilisateurs)}
                min="1"
                required
              />
              <Fld
                label="Limite activités *"
                name="limite_activites"
                type="number"
                dv={String(mEdit.limite_activites)}
                min="1"
                required
              />
            </GRow>
            <FmAct
              onCancel={() => setMEdit(null)}
              label="Enregistrer les modifications"
            />
          </form>
        </Moda>
      )}

      {mUser && sel && (
        <Moda
          title={`Ajouter un utilisateur — ${sel.nom}`}
          onClose={() => setMUser(false)}
        >
          <form
            id="admin-create-user-form"
            onSubmit={(e) => {
              void creerUser(e);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <GRow>
              <Fld label="Nom *" name="nom" required ph="Jean Dupont" />
              <Fld
                label="Email *"
                name="email"
                type="email"
                required
                ph="user@..."
              />
            </GRow>
            <GRow>
              <Fld
                label="Mot de passe *"
                name="mot_de_passe"
                type="password"
                required
                minLength={8}
                ph="min 8 caractères"
              />
              <Fld label="Téléphone" name="telephone" ph="+225..." />
            </GRow>
            <GRow>
              <SlFld
                label="Rôle *"
                name="role_id"
                required
                opts={roles.map((r) => [String(r.id), r.nom])}
                dv=""
                emptyOpt="Choisir un rôle"
              />
              <SlFld
                label="Statut"
                name="statut"
                opts={[
                  ["actif", "Actif"],
                  ["suspendu", "Suspendu"],
                ]}
                dv="actif"
              />
            </GRow>
            <FmAct
              onCancel={() => setMUser(false)}
              label="Créer l'utilisateur"
            />
          </form>
        </Moda>
      )}

      {mType && sel && (
        <Moda
          title={
            typeof mType === "boolean"
              ? `Nouveau type d'activité — ${sel.nom}`
              : `Modifier : ${(mType as TypeActivite).nom}`
          }
          onClose={() => setMType(false)}
        >
          <form
            id="admin-create-type-form"
            onSubmit={(e) => {
              void saveType(
                e,
                typeof mType === "boolean"
                  ? undefined
                  : (mType as TypeActivite).id,
              );
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <GRow>
              <Fld
                label="Nom *"
                name="nom"
                required
                ph="Ex: Moto taxi"
                dv={
                  typeof mType === "boolean" ? "" : (mType as TypeActivite).nom
                }
              />
              <Fld
                label="Slug"
                name="slug"
                dv={
                  typeof mType === "boolean" ? "" : (mType as TypeActivite).slug
                }
              />
            </GRow>
            <GRow>
              <SlFld
                label="Versement récurrent ?"
                name="a_versement_recurrent"
                opts={[
                  ["true", "Oui"],
                  ["false", "Non"],
                ]}
                dv={
                  typeof mType === "boolean"
                    ? "false"
                    : (mType as TypeActivite).a_versement_recurrent
                      ? "true"
                      : "false"
                }
              />
              <SlFld
                label="Fréquence"
                name="frequence_versement"
                opts={[
                  ["aucun", "Aucun"],
                  ["journalier", "Journalier"],
                  ["hebdomadaire", "Hebdomadaire"],
                  ["mensuel", "Mensuel"],
                ]}
                dv={
                  typeof mType === "boolean"
                    ? "aucun"
                    : (mType as TypeActivite).frequence_versement
                }
              />
              <SlFld
                label="Statut"
                name="actif"
                opts={[
                  ["true", "Actif"],
                  ["false", "Désactivé"],
                ]}
                dv={
                  typeof mType === "boolean"
                    ? "true"
                    : (mType as TypeActivite).actif
                      ? "true"
                      : "false"
                }
              />
            </GRow>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}
              >
                Schéma des champs additionnels (JSON, optionnel)
              </label>
              <textarea
                name="schema_champs"
                placeholder={`{"plaque": {"type": "string", "label": "Plaque d'immatriculation"}}`}
                defaultValue={
                  typeof mType !== "boolean" &&
                  (mType as TypeActivite).schema_champs
                    ? JSON.stringify(
                        (mType as TypeActivite).schema_champs,
                        null,
                        2,
                      )
                    : ""
                }
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "13px 16px",
                  color: C.text,
                  fontSize: 13,
                  outline: "none",
                  minHeight: 100,
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
              <span style={{ fontSize: 11, color: C.textDim }}>
                Laissez vide si aucun champ additionnel. Le JSON doit être
                valide.
              </span>
            </div>
            <FmAct onCancel={() => setMType(false)} label="Enregistrer" />
          </form>
        </Moda>
      )}

      {mCat && sel && (
        <Moda
          title={
            typeof mCat === "boolean"
              ? `Nouvelle catégorie — ${sel.nom}`
              : `Modifier : ${(mCat as CategorieTransaction).nom}`
          }
          onClose={() => setMCat(false)}
        >
          <form
            id="admin-create-cat-form"
            onSubmit={(e) => {
              void saveCat(
                e,
                typeof mCat === "boolean"
                  ? undefined
                  : (mCat as CategorieTransaction).id,
              );
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <GRow>
              <Fld
                label="Nom *"
                name="nom"
                required
                ph="Ex: Achat carburant"
                dv={
                  typeof mCat === "boolean"
                    ? ""
                    : (mCat as CategorieTransaction).nom
                }
              />
              <SlFld
                label="Nature *"
                name="nature"
                required
                opts={[
                  ["revenu", "📈 Revenu"],
                  ["decaissement", "📉 Dépense/Décaissement"],
                ]}
                dv={
                  typeof mCat === "boolean"
                    ? "decaissement"
                    : (mCat as CategorieTransaction).nature
                }
              />
            </GRow>
            <GRow>
              <SlFld
                label="Type d'activité lié (optionnel)"
                name="type_activite_id"
                opts={platformTypes
                  .filter((t) => t.actif)
                  .map((t) => [String(t.id), t.nom])}
                emptyOpt="Tous les types"
                dv={
                  typeof mCat === "boolean"
                    ? ""
                    : String(
                        (mCat as CategorieTransaction).type_activite_id || "",
                      )
                }
              />
              <SlFld
                label="Statut"
                name="actif"
                opts={[
                  ["true", "Actif"],
                  ["false", "Désactivé"],
                ]}
                dv={
                  typeof mCat === "boolean"
                    ? "true"
                    : (mCat as CategorieTransaction).actif
                      ? "true"
                      : "false"
                }
              />
            </GRow>
            <FmAct onCancel={() => setMCat(false)} label="Enregistrer" />
          </form>
        </Moda>
      )}

      {mAct && sel && (
        <Moda
          title={`Nouvelle activité — ${sel.nom}`}
          onClose={() => setMAct(false)}
        >
          <form
            id="admin-create-activite-form"
            onSubmit={(e) => {
              void creerAct(e);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <GRow>
              <SlFld
                label="Type *"
                name="type_activite_id"
                required
                opts={types
                  .filter((t) => t.actif)
                  .map((t) => [String(t.id), t.nom])}
                dv=""
                emptyOpt="Choisir un type"
              />
              <Fld label="Code *" name="code" required ph="MOTO-01" />
            </GRow>
            <GRow>
              <Fld label="Nom *" name="nom" required ph="Moto taxi" />
              <Fld
                label="Versement (FCFA) *"
                name="montant_versement"
                type="number"
                required
                dv="0"
                min="0"
              />
            </GRow>
            <GRow>
              <Fld
                label="Date de démarrage *"
                name="date_demarrage"
                type="date"
                required
                dv={new Date().toISOString().slice(0, 10)}
              />
              <SlFld
                label="Statut"
                name="statut"
                opts={[
                  ["actif", "Actif"],
                  ["en_pause", "En pause"],
                ]}
                dv="actif"
              />
            </GRow>
            <FmAct onCancel={() => setMAct(false)} label="Créer l'activité" />
          </form>
        </Moda>
      )}

      {mNotif && sel && (
        <Moda
          title={`Envoyer une notification — ${sel.nom}`}
          onClose={() => setMNotif(false)}
        >
          <form
            id="admin-create-notif-form"
            onSubmit={(e) => {
              void envoyerNotif(e);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <Fld
              label="Titre *"
              name="titre"
              required
              ph="Rappel de versement"
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label
                style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}
              >
                Message *
              </label>
              <textarea
                name="message"
                required
                placeholder="Votre message..."
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "13px 16px",
                  color: C.text,
                  fontSize: 14,
                  outline: "none",
                  minHeight: 100,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <SlFld
              label="Type"
              name="type_notification"
              opts={[
                ["info", "ℹ️ Information"],
                ["alerte", "⚠️ Alerte"],
                ["rappel", "📅 Rappel"],
                ["systeme", "⚙️ Système"],
              ]}
              dv="info"
            />
            <FmAct
              onCancel={() => setMNotif(false)}
              label="Envoyer la notification"
            />
          </form>
        </Moda>
      )}

      {/* ══════════ ROLE MODAL ══════════ */}
      {mRole && (
        <Moda 
          title={typeof mRole === "boolean" ? t("addRole") : t("editRole")} 
          onClose={() => setMRole(false)}
        >
          <form
            id="admin-role-form"
            onSubmit={(e) => void saveRole(e, typeof mRole === "boolean" ? undefined : mRole.id)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <Fld
              id="role-nom"
              label={t("roleName")}
              name="nom"
              required
              ph="Administrateur"
              dv={typeof mRole === "boolean" ? undefined : mRole.nom}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>
                {t("roleDescription")}
              </label>
              <textarea
                name="description"
                placeholder="Description du rôle..."
                defaultValue={typeof mRole === "boolean" ? undefined : mRole.description}
                style={{
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "13px 16px",
                  color: C.text,
                  fontSize: 14,
                  outline: "none",
                  minHeight: 80,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>
                {t("permissions")}
              </label>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", 
                gap: 6,
                maxHeight: 180,
                overflowY: "auto",
                padding: 10,
                background: C.surface2,
                borderRadius: 8,
                border: `1px solid ${C.border}`
              }}>
                {permissions.map((p) => (
                  <label key={p.id} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                    borderRadius: 6,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.surface;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <input
                        type="checkbox"
                        name="permissions"
                        value={p.id}
                        defaultChecked={
                          typeof mRole === "boolean" 
                            ? false 
                            : mRole.permissions?.some(rp => rp.id === p.id)
                        }
                        style={{ 
                          cursor: "pointer",
                          width: 14,
                          height: 14,
                          appearance: "none",
                          border: `2px solid ${C.border}`,
                          borderRadius: 3,
                          background: C.surface,
                          outline: "none",
                          transition: "all 0.2s",
                          position: "relative",
                        }}
                        onChange={(e) => {
                          if (e.target.checked) {
                            e.target.style.background = C.primary;
                            e.target.style.borderColor = C.primary;
                          } else {
                            e.target.style.background = C.surface;
                            e.target.style.borderColor = C.border;
                          }
                        }}
                        ref={(el) => {
                          if (el) {
                            if (el.checked) {
                              el.style.background = C.primary;
                              el.style.borderColor = C.primary;
                            }
                          }
                        }}
                      />
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', width: 10, height: 10, left: 2, top: 2, pointerEvents: 'none', opacity: 1 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{p.nom}</span>
                  </label>
                ))}
              </div>
            </div>
            <FmAct
              onCancel={() => setMRole(false)}
              label={typeof mRole === "boolean" ? t("addRole") : t("save")}
            />
          </form>
        </Moda>
      )}

      {/* ══════════ PERMISSION MODAL ══════════ */}
      {mPermission && (
        <Moda 
          title={typeof mPermission === "boolean" ? "Ajouter une permission" : "Modifier la permission"} 
          onClose={() => setMPermission(false)}
        >
          <form
            id="admin-permission-form"
            onSubmit={(e) => void savePermission(e, typeof mPermission === "boolean" ? undefined : mPermission.id)}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <Fld
              id="perm-nom"
              label="Nom de la permission"
              name="nom"
              required
              ph="users.create"
              dv={typeof mPermission === "boolean" ? undefined : mPermission.nom}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: C.textMuted, fontSize: 13, fontWeight: 600 }}>
                Rôles assignés
              </label>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", 
                gap: 6,
                maxHeight: 180,
                overflowY: "auto",
                padding: 10,
                background: C.surface2,
                borderRadius: 8,
                border: `1px solid ${C.border}`
              }}>
                {roles.map((r) => (
                  <label key={r.id} style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                    borderRadius: 6,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.surface;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  >
                    <input
                      type="checkbox"
                      name="roles"
                      value={r.id}
                      defaultChecked={
                        typeof mPermission === "boolean" 
                          ? false 
                          : mPermission.roles?.some(rr => rr.id === r.id)
                      }
                      style={{ 
                        cursor: "pointer",
                        width: 16,
                        height: 16,
                        accentColor: C.primary,
                      }}
                    />
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{r.nom}</span>
                  </label>
                ))}
              </div>
            </div>
            <FmAct
              onCancel={() => setMPermission(false)}
              label={typeof mPermission === "boolean" ? "Créer" : t("save")}
            />
          </form>
        </Moda>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── Sub-components ───────────────────────── */

function Bdg({ s }: { s: string }) {
  const color = SC[s] ?? C.textMuted;
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        color,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        whiteSpace: "nowrap",
      }}
    >
      {SL[s] ?? s}
    </span>
  );
}

function PBtn({
  children,
  onClick,
  id,
}: {
  children: ReactNode;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 9,
        border: "none",
        background: `linear-gradient(135deg, ${C.primary}, #1551b5)`,
        color: "#fff",
        fontWeight: 700,
        fontSize: 13,
        cursor: "pointer",
        whiteSpace: "nowrap",
        boxShadow: `0 2px 8px rgba(29,106,229,0.3)`,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "0.9";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
    >
      {children}
    </button>
  );
}

function GhBtn({
  children,
  onClick,
  id,
}: {
  children: ReactNode;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        padding: "9px 16px",
        borderRadius: 9,
        border: `1px solid ${C.border}`,
        background: "transparent",
        color: C.textMuted,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function SmBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 7,
        border: `1px solid ${C.border}`,
        background: C.surface2,
        color: C.textMuted,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function OkBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        border: `1px solid ${C.green}30`,
        background: C.greenDim,
        color: C.green,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function WnBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        border: `1px solid ${C.orange}30`,
        background: C.orangeDim,
        color: C.orange,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function DgBtn({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 8,
        border: `1px solid ${C.red}30`,
        background: C.redDim,
        color: C.red,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function TTable({
  heads,
  empty,
  emptyMsg,
  children,
}: {
  heads: string[];
  empty: boolean;
  emptyMsg: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        overflowX: "auto",
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
      >
        <thead>
          <tr style={{ background: C.surface2 }}>
            {heads.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  color: C.textDim,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontWeight: 700,
                  borderBottom: `1px solid ${C.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {empty && (
            <tr>
              <td
                colSpan={heads.length}
                style={{
                  padding: "28px 16px",
                  color: C.textDim,
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                {emptyMsg}
              </td>
            </tr>
          )}
          {children}
        </tbody>
      </table>
    </div>
  );
}

function Moda({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          width: "min(700px, 96vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 28px",
            borderBottom: `1px solid ${C.border}`,
            position: "sticky",
            top: 0,
            background: C.surface,
            zIndex: 1,
            borderRadius: "20px 20px 0 0",
          }}
        >
          <h2
            style={{ color: C.text, margin: 0, fontSize: 17, fontWeight: 800 }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: C.surface2,
              border: `1px solid ${C.border}`,
              cursor: "pointer",
              color: C.textMuted,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: "24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

function PH({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 28,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2
          style={{
            color: C.text,
            fontSize: 24,
            margin: "0 0 4px",
            fontWeight: 800,
          }}
        >
          {title}
        </h2>
        <p style={{ color: C.textMuted, margin: 0, fontSize: 14 }}>{sub}</p>
      </div>
      {action}
    </div>
  );
}

function GRow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function SecH({ children }: { children: ReactNode }) {
  return (
    <h4
      style={{
        color: C.cyan,
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        margin: "8px 0 0",
        borderBottom: `1px solid ${C.border}`,
        paddingBottom: 10,
        fontWeight: 700,
      }}
    >
      {children}
    </h4>
  );
}

function SectionTitle({ title, badge }: { title: string; badge?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <h3 style={{ color: C.text, fontSize: 16, margin: 0, fontWeight: 700 }}>
        {title}
      </h3>
      {badge !== undefined && (
        <span
          style={{
            padding: "2px 9px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: C.cyanDim,
            color: C.cyan,
            border: `1px solid ${C.cyan}30`,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function Fld({
  id,
  label,
  name,
  required,
  ph,
  type = "text",
  dv,
  min,
  minLength,
}: {
  id?: string;
  label: string;
  name: string;
  required?: boolean;
  ph?: string;
  type?: string;
  dv?: string;
  min?: string;
  minLength?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          color: C.textMuted,
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={ph}
        defaultValue={dv}
        min={min}
        minLength={minLength}
        style={{
          background: C.surface2,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          padding: "11px 14px",
          color: C.text,
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = C.primary;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = C.border;
        }}
      />
    </div>
  );
}

function SlFld({
  id,
  label,
  name,
  opts,
  dv,
  required,
  emptyOpt,
}: {
  id?: string;
  label: string;
  name: string;
  opts: [string, string][];
  dv?: string;
  required?: boolean;
  emptyOpt?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        htmlFor={id}
        style={{
          color: C.textMuted,
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={dv ?? ""}
        required={required}
        style={{
          background: C.surface2,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          padding: "11px 14px",
          color: C.text,
          fontSize: 14,
          outline: "none",
        }}
      >
        {emptyOpt && (
          <option value="" disabled>
            {emptyOpt}
          </option>
        )}
        {opts.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function FileField({
  label,
  name,
  previewUrl,
}: {
  label: string;
  name: string;
  previewUrl?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label
        style={{
          color: C.textMuted,
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="Logo actuel"
          style={{
            width: 72,
            height: 72,
            objectFit: "cover",
            borderRadius: 10,
            border: `1px solid ${C.border}`,
          }}
        />
      )}
      <input
        name={name}
        type="file"
        accept="image/*"
        style={{
          background: C.surface2,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          padding: "10px 14px",
          color: C.text,
          fontSize: 14,
        }}
      />
    </div>
  );
}

function FmAct({
  onCancel,
  label,
  submitId,
}: {
  onCancel: () => void;
  label: string;
  submitId?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        paddingTop: 8,
      }}
    >
      <GhBtn onClick={onCancel}>Annuler</GhBtn>
      <button
        id={submitId}
        type="submit"
        style={{
          padding: "10px 20px",
          borderRadius: 9,
          border: "none",
          background: `linear-gradient(135deg, ${C.primary}, #1551b5)`,
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          boxShadow: `0 2px 8px rgba(29,106,229,0.3)`,
        }}
      >
        {label}
      </button>
    </div>
  );
}

function FiltreBox({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "16px 20px",
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            color: C.cyan,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          🔽 Filtres
        </span>
        <button
          onClick={onReset}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.textMuted,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Réinitialiser
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 14,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Sel({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          color: C.textMuted,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: C.surface2,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "9px 12px",
          color: C.text,
          fontSize: 13,
          outline: "none",
        }}
      >
        {children}
      </select>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          color: C.textMuted,
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: C.surface2,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: "9px 12px",
          color: C.text,
          fontSize: 13,
          outline: "none",
        }}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  msg,
}: {
  icon: string;
  title: string;
  msg: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        background: C.surface,
        borderRadius: 14,
        border: `2px dashed ${C.border}`,
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ color: C.text, margin: "0 0 8px", fontSize: 18 }}>
        {title}
      </h3>
      <p style={{ color: C.textMuted, margin: 0 }}>{msg}</p>
    </div>
  );
}
