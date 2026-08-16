"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

/* ────────────────────────── Types ────────────────────────── */
type Plateforme = {
  id: number; nom: string; slug: string;
  email_contact?: string; telephone_contact?: string; adresse?: string;
  image_url?: string | null;
  statut: "actif" | "suspendu" | "desactive";
  limite_utilisateurs: number; limite_activites: number;
  utilisateurs_count?: number; activites_count?: number; created_at?: string;
};
type UserItem = {
  id: number; nom: string; email: string; telephone?: string; statut: string;
  role?: { nom: string; slug: string }; plateforme_id?: number; derniere_connexion?: string;
};
type Role = { id: number; nom: string; slug: string };
type Activite = {
  id: number; nom: string; code: string; statut: string;
  montant_versement: string | number;
  type_activite?: { nom: string }; gerant?: { nom: string };
};
type TypeActivite = {
  id: number; nom: string; slug?: string; a_versement_recurrent?: boolean;
  frequence_versement?: string; schema_champs?: any; icone?: string; couleur?: string; actif: boolean; plateforme_id?: number;
};
type CategorieTransaction = {
  id: number; nom: string; nature: "revenu" | "decaissement"; actif: boolean;
  plateforme_id?: number; type_activite_id?: number; type_activite?: { nom: string };
};
type AuditLog = {
  id: number; action: string; entite: string; entite_id?: number;
  adresse_ip?: string; created_at?: string;
  utilisateur?: { nom: string; email: string };
};
type AdminRoute = "dashboard" | "plateformes" | "plateforme-detail" | "audit";

/* ────────────────────────── Helpers ────────────────────────── */
const API_BASE = "/api/v1";
const TOK = "koue_admin_token";
const USR = "koue_admin_user";

function fmtDate(s?: string) {
  if (!s) return "\u2014";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}
function fmt(n?: number | string) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(n ?? 0));
}
const SL: Record<string, string> = { actif: "Actif", suspendu: "Suspendu", desactive: "Desactive", en_pause: "En pause" };
const SC: Record<string, string> = { actif: "#16a34a", suspendu: "#d97706", desactive: "#dc2626", en_pause: "#d97706" };

/* ────────────────────────── Component ────────────────────────── */
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{ nom: string; email: string } | null>(null);
  const [route, setRoute] = useState<AdminRoute>("dashboard");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const [plateformes, setPlateformes] = useState<Plateforme[]>([]);
  const [sel, setSel] = useState<Plateforme | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [acts, setActs] = useState<Activite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [types, setTypes] = useState<TypeActivite[]>([]);
  const [platformTypes, setPlatformTypes] = useState<TypeActivite[]>([]);
  const [platformCats, setPlatformCats] = useState<CategorieTransaction[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);

  const [mCreate, setMCreate] = useState(false);
  const [mEdit, setMEdit] = useState<Plateforme | null>(null);
  const [mUser, setMUser] = useState(false);
  const [mAct, setMAct] = useState(false);
  const [mType, setMType] = useState<TypeActivite | boolean>(false);
  const [mCat, setMCat] = useState<CategorieTransaction | boolean>(false);

  /* API */
  async function callApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const h = new Headers(opts.headers);
    h.set("Accept", "application/json");
    if (!(opts.body instanceof FormData)) h.set("Content-Type", "application/json");
    if (token) h.set("Authorization", `Bearer ${token}`);
    const r = await fetch(`${API_BASE}/${path}`, { ...opts, headers: h });
    const j = await r.json();
    if (!r.ok || j.statut === "erreur") throw new Error(j.message ?? "Erreur API");
    return j as T;
  }

  useEffect(() => {
    const t = localStorage.getItem(TOK);
    const u = localStorage.getItem(USR);
    if (t && u) { setToken(t); setAdminUser(JSON.parse(u)); }
  }, []);

  useEffect(() => { if (token) void refresh(); }, [token]);

  async function refresh() {
    setLoading(true);
    try {
      const [p, r, a] = await Promise.all([
        callApi<{ donnees: Plateforme[] }>("plateformes"),
        callApi<{ roles: Role[]; types_activites: TypeActivite[] }>("references"),
        callApi<{ donnees: { data: AuditLog[] } }>("audit"),
      ]);
      setPlateformes(p.donnees ?? []);
      setRoles(r.roles ?? []);
      setTypes(r.types_activites ?? []);
      setAudits(a.donnees?.data ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur chargement");
    } finally { setLoading(false); }
  }

  async function openPlateforme(p: Plateforme) {
    setSel(p); setLoading(true);
    try {
      const [u, a, pt, pc] = await Promise.all([
        callApi<{ donnees: UserItem[] }>(`utilisateurs?plateforme_id=${p.id}`),
        callApi<{ donnees: Activite[] }>(`activites?plateforme_id=${p.id}`),
        callApi<{ donnees: TypeActivite[] }>(`types-activites?plateforme_id=${p.id}`),
        callApi<{ donnees: CategorieTransaction[] }>(`categories-transactions?plateforme_id=${p.id}`),
      ]);
      setUsers(u.donnees ?? []); setActs(a.donnees ?? []);
      setPlatformTypes(pt.donnees ?? []); setPlatformCats(pc.donnees ?? []);
      setRoute("plateforme-detail");
    } finally { setLoading(false); }
  }

  /* Auth */
  async function doLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const d = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch(`${API_BASE}/connexion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...d, nom_appareil: "admin-web" }),
      });
      const j = await r.json();
      if (!r.ok || j.statut === "erreur") throw new Error(j.message ?? "Identifiants invalides");
      if (!j.utilisateur?.est_compte_entreprise)
        throw new Error("Acces reserve au compte entreprise KOUECONSOLIDATED.");
      localStorage.setItem(TOK, j.jeton);
      localStorage.setItem(USR, JSON.stringify({ nom: j.utilisateur.nom, email: j.utilisateur.email }));
      setToken(j.jeton);
      setAdminUser({ nom: j.utilisateur.nom, email: j.utilisateur.email });
    } catch (e) { setErr(e instanceof Error ? e.message : "Connexion impossible"); }
    finally { setLoading(false); }
  }

  async function doLogout() {
    try { if (token) await callApi("deconnexion", { method: "POST", body: "{}" }); } finally {
      localStorage.removeItem(TOK); localStorage.removeItem(USR);
      setToken(null); setAdminUser(null); setRoute("dashboard");
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
    payload.set("utilisateur_defaut[nom]", String(d["utilisateur_defaut.nom"] ?? ""));
    payload.set("utilisateur_defaut[email]", String(d["utilisateur_defaut.email"] ?? ""));
    payload.set("utilisateur_defaut[mot_de_passe]", String(d["utilisateur_defaut.mot_de_passe"] ?? ""));
    payload.set("utilisateur_defaut[telephone]", String(d["utilisateur_defaut.telephone"] ?? ""));
    if (image instanceof File && image.size > 0) payload.set("image", image, image.name);
    await callApi("plateformes", { method: "POST", body: payload });
    setMCreate(false); await refresh();
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
    if (image instanceof File && image.size > 0) payload.set("image", image, image.name);
    await callApi(`plateformes/${id}`, { method: "PUT", body: payload });
    setMEdit(null); await refresh();
    if (sel?.id === id) {
      const fresh = plateformes.find(p => p.id === id);
      if (fresh) await openPlateforme(fresh);
    }
  }

  async function changerStatut(id: number, statut: string) {
    if (!confirm(`Confirmer le statut "${SL[statut]}" ?`)) return;
    await callApi(`plateformes/${id}/statut`, { method: "PATCH", body: JSON.stringify({ statut }) });
    await refresh();
    if (sel?.id === id) {
      const p = plateformes.find(x => x.id === id);
      if (p) await openPlateforme({ ...p, statut: statut as Plateforme["statut"] });
    }
  }

  /* Users */
  async function creerUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await callApi("utilisateurs", { method: "POST", body: JSON.stringify({ ...d, plateforme_id: sel?.id }) });
    setMUser(false); if (sel) await openPlateforme(sel);
  }
  async function toggleUser(id: number, statut: string) {
    await callApi(`utilisateurs/${id}`, { method: "PUT", body: JSON.stringify({ statut }) });
    if (sel) await openPlateforme(sel);
  }
  async function supprimerUser(id: number) {
    if (!confirm("Supprimer cet utilisateur ?")) return;
    await callApi(`utilisateurs/${id}`, { method: "DELETE" });
    if (sel) await openPlateforme(sel);
  }

  /* Activites */
  async function creerAct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await callApi("activites", {
      method: "POST",
      body: JSON.stringify({ ...d, plateforme_id: sel?.id, attributs: {}, statut: d.statut || "actif" }),
    });
    setMAct(false); if (sel) await openPlateforme(sel);
  }
  async function toggleAct(id: number, statut: string) {
    await callApi(`activites/${id}`, { method: "PUT", body: JSON.stringify({ statut }) });
    if (sel) await openPlateforme(sel);
  }

  /* Types d'activites */
  async function saveType(e: FormEvent<HTMLFormElement>, id?: number) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    let schema = null;
    if (d.schema_champs) {
      try { schema = JSON.parse(d.schema_champs as string); } catch { throw new Error("Le schema des champs additionnels doit etre un JSON valide."); }
    }
    const body = JSON.stringify({ ...d, a_versement_recurrent: d.a_versement_recurrent === "true", actif: d.actif === "true", plateforme_id: sel?.id, schema_champs: schema });
    await callApi(id ? `types-activites/${id}` : "types-activites", { method: id ? "PUT" : "POST", body });
    setMType(false); if (sel) await openPlateforme(sel);
  }
  async function toggleType(id: number, actif: boolean) {
    await callApi(`types-activites/${id}`, { method: "PUT", body: JSON.stringify({ actif }) });
    if (sel) await openPlateforme(sel);
  }

  /* Categories Financieres */
  async function saveCat(e: FormEvent<HTMLFormElement>, id?: number) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    await callApi(id ? `categories-transactions/${id}` : "categories-transactions", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({ ...d, actif: d.actif === "true", plateforme_id: sel?.id, type_activite_id: d.type_activite_id || null }),
    });
    setMCat(false); if (sel) await openPlateforme(sel);
  }
  async function toggleCat(id: number, actif: boolean) {
    await callApi(`categories-transactions/${id}`, { method: "PUT", body: JSON.stringify({ actif }) });
    if (sel) await openPlateforme(sel);
  }

  const filteredPlateformes = plateformes.filter((p) => {
    const matchesPlateforme = dashboardFilters.plateforme === "all" || String(p.id) === dashboardFilters.plateforme;
    const matchesStatut = dashboardFilters.statut === "all" || p.statut === dashboardFilters.statut;

    const createdAt = p.created_at ? new Date(p.created_at).getTime() : null;
    const from = dashboardFilters.date_debut ? new Date(`${dashboardFilters.date_debut}T00:00:00`).getTime() : null;
    const to = dashboardFilters.date_fin ? new Date(`${dashboardFilters.date_fin}T23:59:59`).getTime() : null;

    const matchesDate =
      (!from || !createdAt || createdAt >= from) &&
      (!to || !createdAt || createdAt <= to);

    return matchesPlateforme && matchesStatut && matchesDate;
  });

  const filteredSummary = {
    plateformes_actives: filteredPlateformes.filter((p) => p.statut === "actif").length,
    total_plateformes: filteredPlateformes.length,
    total_utilisateurs: filteredPlateformes.reduce((sum, p) => sum + (p.utilisateurs_count ?? 0), 0),
    total_activites: filteredPlateformes.reduce((sum, p) => sum + (p.activites_count ?? 0), 0),
  };

  const auditPlatformOptions = Array.from(new Set(
    audits
      .map((entry) => typeof entry.details?.plateforme === "string" ? entry.details.plateforme : null)
      .filter((value): value is string => Boolean(value))
  )).sort();
  const auditActionOptions = Array.from(new Set(audits.map((entry) => entry.action))).sort();
  const auditEntiteOptions = Array.from(new Set(audits.map((entry) => entry.entite))).sort();

  const filteredAudits = audits.filter((entry) => {
    const matchesAction = auditFilters.action === "all" || entry.action === auditFilters.action;
    const matchesEntite = auditFilters.entite === "all" || entry.entite === auditFilters.entite;
    const matchesPlateforme =
      auditFilters.plateforme === "all" ||
      (typeof entry.details?.plateforme === "string" && entry.details.plateforme === auditFilters.plateforme);

    const createdAt = entry.created_at ? new Date(entry.created_at).getTime() : null;
    const from = auditFilters.date_debut ? new Date(`${auditFilters.date_debut}T00:00:00`).getTime() : null;
    const to = auditFilters.date_fin ? new Date(`${auditFilters.date_fin}T23:59:59`).getTime() : null;
    const matchesDate =
      (!from || !createdAt || createdAt >= from) &&
      (!to || !createdAt || createdAt <= to);

    return matchesAction && matchesEntite && matchesPlateforme && matchesDate;
  });

  /* ──── LOGIN ──── */
  if (!token || !adminUser) return (
    <div className="admin-login-container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0710", position: "relative", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* Animated Orbs */}
      <div className="login-orb orb-1" style={{ position: "absolute", top: "-10%", left: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%", filter: "blur(40px)", animation: "float 15s ease-in-out infinite" }} />
      <div className="login-orb orb-2" style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "60vw", height: "60vw", background: "radial-gradient(circle, rgba(79,70,229,0.1) 0%, rgba(0,0,0,0) 70%)", borderRadius: "50%", filter: "blur(50px)", animation: "float 20s ease-in-out infinite reverse" }} />
      
      {/* Login Card */}
      <div className="login-card" style={{ position: "relative", width: "min(440px, 92vw)", padding: "48px 40px", borderRadius: 24, background: "rgba(20, 16, 35, 0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.05)", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)", zIndex: 10 }}>
        
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 12px 32px rgba(124,58,237,0.3)" }}>
            <span style={{ color: "#fff", fontSize: 24, fontWeight: 900, letterSpacing: "-1px" }}>KC</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#a78bfa", marginBottom: 8 }}>Entreprise</span>
          <h1 style={{ color: "#ffffff", fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Administration</h1>
        </div>

        <form onSubmit={doLogin} id="admin-login-form" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {err && <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 12, padding: "12px 16px", color: "#fca5a5", fontSize: 13, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 16 }}>⚠️</span> {err}
          </div>}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[["identifiant", "Identifiant", "KOUECONSOLIDATED", "text"], ["mot_de_passe", "Mot de passe", "Knb0171ent", "password"]].map(([n, l, dv, t]) => (
              <div key={n} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</label>
                <input id={`admin-${n}`} name={n} type={t} defaultValue={dv} required
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", color: "#ffffff", fontSize: 15, outline: "none", transition: "all 0.2s ease" }} 
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#7c3aed"; e.currentTarget.style.background = "rgba(124,58,237,0.05)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(0,0,0,0.2)"; }}
                />
              </div>
            ))}
          </div>

          <button id="admin-login-submit" type="submit" disabled={loading}
            className="login-submit-btn"
            style={{ marginTop: 8, padding: "16px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "transform 0.2s ease, box-shadow 0.2s ease", boxShadow: "0 8px 20px rgba(124,58,237,0.25)" }}>
            {loading ? "Connexion en cours..." : "Accéder au portail"}
          </button>
        </form>
        
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a href="/" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none", fontSize: 13, transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"} onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}>
            ← Retour à l'application
          </a>
        </div>
      </div>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        .login-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(124,58,237,0.4) !important;
        }
        .login-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );

  /* ──── SHELL ──── */
  const nav: [AdminRoute, string][] = [["dashboard", "Vue d'ensemble"], ["plateformes", "Plateformes"], ["audit", "Journal d'audit"]];

  return (
    <div style={{ display: "grid", gridTemplateColumns: sidebarOpen ? "260px 1fr" : "64px 1fr", minHeight: "100vh", background: "#15122e", fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>
      {/* SIDEBAR */}
      <aside style={{ background: "#1a1538", borderRight: "1px solid rgba(124,58,237,.18)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(124,58,237,.12)" }}>
          <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 900 }}>KC</div>
          {sidebarOpen && <div><strong style={{ display: "block", color: "#e2d9f3", fontSize: 15 }}>Admin</strong><span style={{ color: "rgba(255,255,255,.35)", fontSize: 11 }}>KOUECONSOLIDATED</span></div>}
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map(([key, label]) => {
            const active = route === key || (route === "plateforme-detail" && key === "plateformes");
            return (
              <button key={key} id={`admin-nav-${key}`} onClick={() => { setRoute(key); if (key !== "plateformes") setSel(null); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, border: "none", background: active ? "rgba(124,58,237,.2)" : "transparent", color: active ? "#c4b5fd" : "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 18 }}>{key === "dashboard" ? "◈" : key === "plateformes" ? "◫" : "◷"}</span>
                {sidebarOpen && <span>{label}</span>}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 16, borderTop: "1px solid rgba(124,58,237,.12)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{adminUser.nom[0]}</div>
          {sidebarOpen && <div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: "block", color: "#e2d9f3", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminUser.nom}</strong><span style={{ color: "rgba(255,255,255,.35)", fontSize: 11, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminUser.email}</span></div>}
          <button id="admin-logout-btn" onClick={doLogout} title="Deconnexion"
            style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 16, cursor: "pointer", flexShrink: 0 }}>⏻</button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ background: "#1e1940", borderBottom: "1px solid rgba(124,58,237,.15)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 10 }}>
          <button onClick={() => setSidebarOpen(v => !v)} aria-label="Menu"
            style={{ display: "flex", flexDirection: "column", gap: 5, width: 36, height: 36, justifyContent: "center", alignItems: "center", background: "rgba(124,58,237,.1)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, cursor: "pointer" }}>
            {[0, 1, 2].map(i => <span key={i} style={{ width: 18, height: 2, background: "#a78bfa", borderRadius: 2 }} />)}
          </button>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2d9f3", flex: 1 }}>
            {route === "dashboard" && "Vue d'ensemble"}
            {route === "plateformes" && "Plateformes"}
            {route === "plateforme-detail" && `Plateforme : ${sel?.nom}`}
            {route === "audit" && "Journal d'audit"}
          </div>
          {loading && <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(124,58,237,.3)", borderTopColor: "#7c3aed", animation: "spin 0.8s linear infinite" }} />}
          <div style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "rgba(124,58,237,.15)", color: "#a78bfa", fontWeight: 600, border: "1px solid rgba(124,58,237,.2)" }}>
            {plateformes.length} plateforme{plateformes.length !== 1 ? "s" : ""}
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", background: "#15122e" }}>
          {err && <div style={{ margin: "20px 32px 0", background: "rgba(220,38,38,.12)", border: "1px solid rgba(220,38,38,.25)", borderRadius: 8, padding: "10px 14px", color: "#fca5a5", fontSize: 14, display: "flex", justifyContent: "space-between" }}>{err}<button onClick={() => setErr("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fca5a5", fontSize: 18 }}>x</button></div>}

          {/* DASHBOARD */}
          {route === "dashboard" && (
            <div style={{ padding: "28px 32px" }}>
              <PageHead title="Vue d'ensemble" sub="Resume consolide de toutes les plateformes." action={<Btn id="admin-create-plateforme-btn" onClick={() => { setRoute("plateformes"); setMCreate(true); }}>+ Nouvelle plateforme</Btn>} />

              <div style={{ background: "#1a1630", border: "1px solid rgba(124,58,237,.15)", borderRadius: 16, padding: 18, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Filtres</div>
                  <button
                    type="button"
                    onClick={() => setDashboardFilters({ plateforme: "all", statut: "all", date_debut: "", date_fin: "" })}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "rgba(255,255,255,.65)", padding: "8px 12px", cursor: "pointer" }}
                  >
                    Réinitialiser
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Plateforme</label>
                    <select
                      value={dashboardFilters.plateforme}
                      onChange={(e) => setDashboardFilters((prev) => ({ ...prev, plateforme: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }}
                    >
                      <option value="all">Toutes</option>
                      {plateformes.map((p) => (
                        <option key={p.id} value={String(p.id)}>{p.nom}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Statut</label>
                    <select
                      value={dashboardFilters.statut}
                      onChange={(e) => setDashboardFilters((prev) => ({ ...prev, statut: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }}
                    >
                      <option value="all">Tous</option>
                      <option value="actif">Actif</option>
                      <option value="suspendu">Suspendu</option>
                      <option value="desactive">Désactivé</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Date de début</label>
                    <input
                      type="date"
                      value={dashboardFilters.date_debut}
                      onChange={(e) => setDashboardFilters((prev) => ({ ...prev, date_debut: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Date de fin</label>
                    <input
                      type="date"
                      value={dashboardFilters.date_fin}
                      onChange={(e) => setDashboardFilters((prev) => ({ ...prev, date_fin: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
                {[
                  ["Plateformes actives", filteredSummary.plateformes_actives, "#7c3aed"],
                  ["Total plateformes", filteredSummary.total_plateformes, "#0757a6"],
                  ["Total utilisateurs", filteredSummary.total_utilisateurs, "#16a34a"],
                  ["Total activites", filteredSummary.total_activites, "#d97706"],
                ].map(([l, v, c]) => (
                  <div key={String(l)} style={{ background: "#1a1630", border: `1px solid rgba(124,58,237,.15)`, borderRadius: 14, padding: 20, borderTop: `3px solid ${c}` }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: "#e2d9f3", lineHeight: 1, marginBottom: 6 }}>{v}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>{l}</div>
                  </div>
                ))}
              </div>
              <Table heads={["Nom", "Statut", "Users", "Activites", "Limites", "Actions"]}
                empty={filteredPlateformes.length === 0} emptyMsg="Aucune plateforme pour ces filtres.">
                {filteredPlateformes.map(p => (
                  <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding: "12px 14px" }}><GhostBtn onClick={() => void openPlateforme(p)}>{p.nom}</GhostBtn><div style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>{p.slug}</div></td>
                    <td style={{ padding: "12px 14px" }}><Badge s={p.statut} /></td>
                    <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{p.utilisateurs_count ?? 0}/{p.limite_utilisateurs}</td>
                    <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{p.activites_count ?? 0}/{p.limite_activites}</td>
                    <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>U:{p.limite_utilisateurs} A:{p.limite_activites}</td>
                    <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}><SmBtn onClick={() => void openPlateforme(p)}>Detail</SmBtn><SmBtn onClick={() => setMEdit(p)}>Modifier</SmBtn></div></td>
                  </tr>
                ))}
              </Table>
            </div>
          )}

          {/* PLATEFORMES */}
          {route === "plateformes" && (
            <div style={{ padding: "28px 32px" }}>
              <PageHead title="Plateformes" sub="Creez et gerez les espaces clients multi-tenant." action={<Btn id="admin-new-plateforme" onClick={() => setMCreate(true)}>+ Nouvelle plateforme</Btn>} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
                {plateformes.length === 0 && (
                  <div style={{ background: "#1a1630", border: "2px dashed rgba(124,58,237,.2)", borderRadius: 16, padding: 48, textAlign: "center", gridColumn: "1/-1" }}>
                    <div style={{ fontSize: 48, color: "rgba(124,58,237,.3)", marginBottom: 16 }}>◫</div>
                    <h3 style={{ color: "#e2d9f3", margin: "0 0 8px" }}>Aucune plateforme</h3>
                    <p style={{ color: "rgba(255,255,255,.3)", margin: "0 0 24px" }}>Commencez par creer votre premiere plateforme.</p>
                    <Btn onClick={() => setMCreate(true)}>Creer une plateforme</Btn>
                  </div>
                )}
                {plateformes.map(p => (
                  <div key={p.id} style={{ background: "#1a1630", border: "1px solid rgba(124,58,237,.15)", borderRadius: 16, padding: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <div><h3 style={{ color: "#e2d9f3", margin: "0 0 4px", fontSize: 16 }}>{p.nom}</h3><code style={{ color: "rgba(255,255,255,.3)", fontSize: 12 }}>{p.slug}</code></div>
                      <Badge s={p.statut} />
                    </div>
                    <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
                      {[["utilisateurs_count", "limite_utilisateurs", "users"], ["activites_count", "limite_activites", "activites"]].map(([c, l, u]) => (
                        <div key={c} style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
                          <strong style={{ color: "#e2d9f3", fontSize: 22, fontWeight: 900 }}>{(p as any)[c] ?? 0}</strong>
                          <span style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>/ {(p as any)[l]} {u}</span>
                        </div>
                      ))}
                    </div>
                    {p.email_contact && <p style={{ color: "rgba(255,255,255,.3)", fontSize: 12, margin: "0 0 14px" }}>{p.email_contact}</p>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Btn onClick={() => void openPlateforme(p)}>Gerer</Btn>
                      <GhostBtn onClick={() => setMEdit(p)}>Modifier</GhostBtn>
                      {p.statut !== "actif" && <SuccBtn onClick={() => void changerStatut(p.id, "actif")}>Activer</SuccBtn>}
                      {p.statut === "actif" && <WarnBtn onClick={() => void changerStatut(p.id, "suspendu")}>Suspendre</WarnBtn>}
                      {p.statut !== "desactive" && <DangBtn onClick={() => void changerStatut(p.id, "desactive")}>Desactiver</DangBtn>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PLATEFORME DETAIL */}
          {route === "plateforme-detail" && sel && (
            <div style={{ padding: "28px 32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,.4)", fontSize: 14 }}>
                  <GhostBtn onClick={() => { setRoute("plateformes"); setSel(null); }}>Plateformes</GhostBtn>
                  <span>&rsaquo;</span>
                  <strong style={{ color: "#e2d9f3" }}>{sel.nom}</strong>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge s={sel.statut} />
                  <GhostBtn onClick={() => setMEdit(sel)}>Modifier</GhostBtn>
                  {sel.statut !== "actif" && <SuccBtn onClick={() => void changerStatut(sel.id, "actif")}>Activer</SuccBtn>}
                  {sel.statut === "actif" && <WarnBtn onClick={() => void changerStatut(sel.id, "suspendu")}>Suspendre</WarnBtn>}
                  {sel.statut !== "desactive" && <DangBtn onClick={() => void changerStatut(sel.id, "desactive")}>Desactiver</DangBtn>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 28 }}>                <div style={{ background: "#1a1630", borderRadius: 10, padding: 14, border: "1px solid rgba(124,58,237,.1)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 68, height: 68, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,.04)", border: "1px solid rgba(124,58,237,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {sel.image_url ? <img src={sel.image_url} alt={sel.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "rgba(255,255,255,.7)", fontSize: 20 }}>🏢</span>}
                  </div>
                  <div>
                    <span style={{ display: "block", color: "rgba(255,255,255,.35)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Logo</span>
                    <span style={{ color: "#e2d9f3", fontSize: 15, fontWeight: 600 }}>{sel.nom}</span>
                  </div>
                </div>                {[["Slug", sel.slug], ["Email", sel.email_contact], ["Tel", sel.telephone_contact], ["Adresse", sel.adresse], ["Users", `${sel.utilisateurs_count ?? 0}/${sel.limite_utilisateurs}`], ["Activites", `${sel.activites_count ?? 0}/${sel.limite_activites}`]].map(([l, v]) => (
                  <div key={l} style={{ background: "#1a1630", borderRadius: 10, padding: 14, border: "1px solid rgba(124,58,237,.1)" }}>
                    <span style={{ display: "block", color: "rgba(255,255,255,.35)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{l}</span>
                    <span style={{ color: "#e2d9f3", fontSize: 15, fontWeight: 600 }}>{v ?? "\u2014"}</span>
                  </div>
                ))}
              </div>

              {/* Types d'activites */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ color: "#c4b5fd", fontSize: 15, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Types d'activites (Business Models)</h3>
                  <Btn onClick={() => { setMType(true); }}>+ Nouveau Type</Btn>
                </div>
                <Table heads={["Nom", "Recurrent", "Frequence", "Champs sup.", "Statut", "Actions"]} empty={platformTypes.length === 0} emptyMsg="Aucun type configure.">
                  {platformTypes.map(t => (
                    <tr key={t.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <td style={{ padding: "12px 14px", color: "#e2d9f3", fontWeight: 700 }}>{t.nom}</td>
                      <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{t.a_versement_recurrent ? "Oui" : "Non"}</td>
                      <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{t.frequence_versement || "\u2014"}</td>
                      <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)" }}>{t.schema_champs ? "Configure" : "\u2014"}</td>
                      <td style={{ padding: "12px 14px" }}><Badge s={t.actif ? "actif" : "desactive"} /></td>
                      <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>
                        <SmBtn onClick={() => setMType(t)}>Modifier</SmBtn>
                        {t.actif ? <DangBtn onClick={() => void toggleType(t.id, false)}>Desactiver</DangBtn> : <SuccBtn onClick={() => void toggleType(t.id, true)}>Activer</SuccBtn>}
                      </div></td>
                    </tr>
                  ))}
                </Table>
              </div>

              {/* Categories Financieres */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ color: "#c4b5fd", fontSize: 15, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Categories Financieres</h3>
                  <Btn onClick={() => { setMCat(true); }}>+ Nouvelle Categorie</Btn>
                </div>
                <Table heads={["Nom", "Nature", "Business lie", "Statut", "Actions"]} empty={platformCats.length === 0} emptyMsg="Aucune categorie.">
                  {platformCats.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <td style={{ padding: "12px 14px", color: "#e2d9f3", fontWeight: 700 }}>{c.nom}</td>
                      <td style={{ padding: "12px 14px", color: c.nature === "revenu" ? "#16a34a" : "#dc2626" }}>{c.nature === "revenu" ? "Revenu" : "Depense"}</td>
                      <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{c.type_activite?.nom || "Tous"}</td>
                      <td style={{ padding: "12px 14px" }}><Badge s={c.actif ? "actif" : "desactive"} /></td>
                      <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>
                        <SmBtn onClick={() => setMCat(c)}>Modifier</SmBtn>
                        {c.actif ? <DangBtn onClick={() => void toggleCat(c.id, false)}>Desactiver</DangBtn> : <SuccBtn onClick={() => void toggleCat(c.id, true)}>Activer</SuccBtn>}
                      </div></td>
                    </tr>
                  ))}
                </Table>
              </div>

              {/* Users */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ color: "#c4b5fd", fontSize: 15, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Utilisateurs ({users.length})</h3>
                  <Btn id="admin-add-user-btn" onClick={() => setMUser(true)}>+ Ajouter</Btn>
                </div>
                <Table heads={["Nom", "Email", "Role", "Statut", "Connexion", "Actions"]} empty={users.length === 0} emptyMsg="Aucun utilisateur.">
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <td style={{ padding: "12px 14px", color: "#e2d9f3", fontWeight: 700 }}>{u.nom}</td>
                      <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{u.email}</td>
                      <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{u.role?.nom ?? "\u2014"}</td>
                      <td style={{ padding: "12px 14px" }}><Badge s={u.statut} /></td>
                      <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)", fontSize: 13 }}>{fmtDate(u.derniere_connexion)}</td>
                      <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: 6 }}>
                        {u.statut === "actif" ? <WarnBtn onClick={() => void toggleUser(u.id, "suspendu")}>Suspendre</WarnBtn> : <SuccBtn onClick={() => void toggleUser(u.id, "actif")}>Activer</SuccBtn>}
                        <DangBtn onClick={() => void supprimerUser(u.id)}>Supprimer</DangBtn>
                      </div></td>
                    </tr>
                  ))}
                </Table>
              </div>

              {/* Activities */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ color: "#c4b5fd", fontSize: 15, margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>Activites ({acts.length})</h3>
                  <Btn id="admin-add-activite-btn" onClick={() => setMAct(true)}>+ Ajouter</Btn>
                </div>
                <Table heads={["Code", "Nom", "Type", "Versement", "Statut", "Actions"]} empty={acts.length === 0} emptyMsg="Aucune activite.">
                  {acts.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <td style={{ padding: "12px 14px" }}><code style={{ color: "#a78bfa", fontSize: 13 }}>{a.code}</code></td>
                      <td style={{ padding: "12px 14px", color: "#e2d9f3" }}>{a.nom}</td>
                      <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{a.type_activite?.nom ?? "\u2014"}</td>
                      <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{fmt(a.montant_versement)} F</td>
                      <td style={{ padding: "12px 14px" }}><Badge s={a.statut} /></td>
                      <td style={{ padding: "12px 14px" }}>
                        {a.statut === "actif" ? <WarnBtn onClick={() => void toggleAct(a.id, "en_pause")}>Pause</WarnBtn> : <SuccBtn onClick={() => void toggleAct(a.id, "actif")}>Activer</SuccBtn>}
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            </div>
          )}

          {/* AUDIT */}
          {route === "audit" && (
            <div style={{ padding: "28px 32px" }}>
              <PageHead title="Journal d'audit" sub="Toutes les actions sensibles tracees." action={null} />

              <div style={{ background: "#1a1630", border: "1px solid rgba(124,58,237,.15)", borderRadius: 16, padding: 18, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  <div style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Filtres</div>
                  <button
                    type="button"
                    onClick={() => setAuditFilters({ action: "all", entite: "all", plateforme: "all", date_debut: "", date_fin: "" })}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "rgba(255,255,255,.65)", padding: "8px 12px", cursor: "pointer" }}
                  >
                    Réinitialiser
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Action</label>
                    <select value={auditFilters.action} onChange={(e) => setAuditFilters((prev) => ({ ...prev, action: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }}>
                      <option value="all">Toutes</option>
                      {auditActionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Entité</label>
                    <select value={auditFilters.entite} onChange={(e) => setAuditFilters((prev) => ({ ...prev, entite: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }}>
                      <option value="all">Toutes</option>
                      {auditEntiteOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Plateforme</label>
                    <select value={auditFilters.plateforme} onChange={(e) => setAuditFilters((prev) => ({ ...prev, plateforme: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }}>
                      <option value="all">Toutes</option>
                      {auditPlatformOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Date de début</label>
                    <input type="date" value={auditFilters.date_debut} onChange={(e) => setAuditFilters((prev) => ({ ...prev, date_debut: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600 }}>Date de fin</label>
                    <input type="date" value={auditFilters.date_fin} onChange={(e) => setAuditFilters((prev) => ({ ...prev, date_fin: e.target.value }))}
                      style={{ background: "rgba(0,0,0,.2)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }} />
                  </div>
                </div>
              </div>

              <Table heads={["Action", "Entite", "ID", "Utilisateur", "IP", "Date"]} empty={filteredAudits.length === 0} emptyMsg="Aucune action pour ces filtres.">
                {filteredAudits.map(l => (
                  <tr key={l.id} style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <td style={{ padding: "12px 14px" }}><code style={{ color: "#a78bfa" }}>{l.action}</code></td>
                    <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{l.entite}</td>
                    <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)" }}>{l.entite_id ? `#${l.entite_id}` : "\u2014"}</td>
                    <td style={{ padding: "12px 14px", color: "#c4b5fd" }}>{l.utilisateur?.nom ?? "Systeme"}</td>
                    <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)", fontSize: 13 }}>{l.adresse_ip ?? "\u2014"}</td>
                    <td style={{ padding: "12px 14px", color: "rgba(255,255,255,.4)", fontSize: 13 }}>{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {mCreate && (
        <Modal title="Nouvelle plateforme" onClose={() => setMCreate(false)}>
          <form id="admin-create-plateforme-form" onSubmit={e => { void creer(e); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionHdr>Informations</SectionHdr>
            <Row><Field id="cp-nom" label="Nom *" name="nom" required ph="Ma Plateforme" /><Field id="cp-slug" label="Slug (auto)" name="slug" ph="ma-plateforme" /></Row>
            <Row><Field id="cp-email" label="Email" name="email_contact" type="email" ph="contact@..." /><Field id="cp-tel" label="Tel" name="telephone_contact" ph="+225..." /></Row>
            <Field id="cp-adresse" label="Adresse" name="adresse" ph="Abidjan, CI" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600 }}>Image de la plateforme</label>
              <input name="image" type="file" accept="image/*" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }} />
            </div>
            <Row>
              <SelField id="cp-stat" label="Statut *" name="statut" opts={[["actif","Actif"],["suspendu","Suspendu"],["desactive","Desactive"]]} dv="actif" />
              <Field id="cp-lu" label="Limite users *" name="limite_utilisateurs" type="number" dv="10" min="1" required />
              <Field id="cp-la" label="Limite activites *" name="limite_activites" type="number" dv="25" min="1" required />
            </Row>
            <SectionHdr>Admin par defaut</SectionHdr>
            <Row><Field id="cp-unom" label="Nom *" name="utilisateur_defaut.nom" required ph="Admin" /><Field id="cp-uemail" label="Email *" name="utilisateur_defaut.email" type="email" required ph="admin@..." /></Row>
            <Row><Field id="cp-upw" label="Mot de passe *" name="utilisateur_defaut.mot_de_passe" type="password" required minLength={8} ph="min 8 car." /><Field id="cp-utel" label="Tel admin" name="utilisateur_defaut.telephone" ph="+225..." /></Row>
            <FormActions onCancel={() => setMCreate(false)} submitId="admin-submit-plateforme" label="Creer la plateforme" />
          </form>
        </Modal>
      )}

      {mEdit && (
        <Modal title={`Modifier : ${mEdit.nom}`} onClose={() => setMEdit(null)}>
          <form id="admin-edit-plateforme-form" onSubmit={e => { void modifier(e, mEdit.id); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row><Field label="Nom *" name="nom" required dv={mEdit.nom} /><Field label="Slug" name="slug" dv={mEdit.slug} /></Row>
            <Row><Field label="Email" name="email_contact" type="email" dv={mEdit.email_contact} /><Field label="Tel" name="telephone_contact" dv={mEdit.telephone_contact} /></Row>
            <Field label="Adresse" name="adresse" dv={mEdit.adresse} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600 }}>Image de la plateforme</label>
              {mEdit.image_url && <img src={mEdit.image_url} alt={mEdit.nom} style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 12, border: "1px solid rgba(124,58,237,.2)" }} />}
              <input name="image" type="file" accept="image/*" style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 12px", color: "#e2d9f3" }} />
            </div>
            <Row>
              <SelField label="Statut" name="statut" opts={[["actif","Actif"],["suspendu","Suspendu"],["desactive","Desactive"]]} dv={mEdit.statut} />
              <Field label="Limite users *" name="limite_utilisateurs" type="number" dv={String(mEdit.limite_utilisateurs)} min="1" required />
              <Field label="Limite activites *" name="limite_activites" type="number" dv={String(mEdit.limite_activites)} min="1" required />
            </Row>
            <FormActions onCancel={() => setMEdit(null)} label="Enregistrer" />
          </form>
        </Modal>
      )}

      {mUser && sel && (
        <Modal title={`Ajouter un utilisateur — ${sel.nom}`} onClose={() => setMUser(false)}>
          <form id="admin-create-user-form" onSubmit={e => { void creerUser(e); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row><Field label="Nom *" name="nom" required ph="Jean" /><Field label="Email *" name="email" type="email" required ph="user@..." /></Row>
            <Row><Field label="Mot de passe *" name="mot_de_passe" type="password" required minLength={8} ph="min 8 car." /><Field label="Tel" name="telephone" ph="+225..." /></Row>
            <Row>
              <SelField label="Role *" name="role_id" required opts={roles.map(r => [String(r.id), r.nom])} dv="" emptyOpt="Choisir un role" />
              <SelField label="Statut" name="statut" opts={[["actif","Actif"],["suspendu","Suspendu"]]} dv="actif" />
            </Row>
            <FormActions onCancel={() => setMUser(false)} label="Creer l'utilisateur" />
          </form>
        </Modal>
      )}

      {mType && sel && (
        <Modal title={typeof mType === "boolean" ? `Nouveau Type d'activite — ${sel.nom}` : `Modifier Type : ${(mType as TypeActivite).nom}`} onClose={() => setMType(false)}>
          <form id="admin-create-type-form" onSubmit={e => { void saveType(e, typeof mType === "boolean" ? undefined : (mType as TypeActivite).id); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row><Field label="Nom *" name="nom" required ph="Ex: Moto taxi" dv={typeof mType === "boolean" ? "" : (mType as TypeActivite).nom} /><Field label="Slug" name="slug" dv={typeof mType === "boolean" ? "" : (mType as TypeActivite).slug} /></Row>
            <Row>
              <SelField label="Versement recurrent ?" name="a_versement_recurrent" opts={[["true","Oui"],["false","Non"]]} dv={typeof mType === "boolean" ? "false" : ((mType as TypeActivite).a_versement_recurrent ? "true" : "false")} />
              <SelField label="Frequence" name="frequence_versement" opts={[["aucun","Aucun"],["journalier","Journalier"],["hebdomadaire","Hebdomadaire"],["mensuel","Mensuel"]]} dv={typeof mType === "boolean" ? "aucun" : (mType as TypeActivite).frequence_versement} />
            </Row>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,.6)", fontSize: 13, fontWeight: 600 }}>Schema des champs additionnels (JSON)</label>
              <textarea name="schema_champs" placeholder='{"plaque": {"type": "string", "label": "Plaque d\u0027immatriculation"}}' defaultValue={typeof mType !== "boolean" && (mType as TypeActivite).schema_champs ? JSON.stringify((mType as TypeActivite).schema_champs, null, 2) : ""} style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", color: "#ffffff", fontSize: 13, outline: "none", minHeight: 100, fontFamily: "monospace" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Laissez vide si aucun champ additionnel. Le JSON doit etre valide.</span>
            </div>
            <Row>
              <SelField label="Statut" name="actif" opts={[["true","Actif"],["false","Desactive"]]} dv={typeof mType === "boolean" ? "true" : ((mType as TypeActivite).actif ? "true" : "false")} />
            </Row>
            <FormActions onCancel={() => setMType(false)} label="Enregistrer" />
          </form>
        </Modal>
      )}

      {mCat && sel && (
        <Modal title={typeof mCat === "boolean" ? `Nouvelle Categorie — ${sel.nom}` : `Modifier Categorie : ${(mCat as CategorieTransaction).nom}`} onClose={() => setMCat(false)}>
          <form id="admin-create-cat-form" onSubmit={e => { void saveCat(e, typeof mCat === "boolean" ? undefined : (mCat as CategorieTransaction).id); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row>
              <Field label="Nom *" name="nom" required ph="Ex: Achat carburant" dv={typeof mCat === "boolean" ? "" : (mCat as CategorieTransaction).nom} />
              <SelField label="Nature *" name="nature" required opts={[["revenu","Revenu"],["decaissement","Depense/Decaissement"]]} dv={typeof mCat === "boolean" ? "decaissement" : (mCat as CategorieTransaction).nature} />
            </Row>
            <Row>
              <SelField label="Type d'activite lie (optionnel)" name="type_activite_id" opts={platformTypes.filter(t => t.actif).map(t => [String(t.id), t.nom])} emptyOpt="Tous les types" dv={typeof mCat === "boolean" ? "" : String((mCat as CategorieTransaction).type_activite_id || "")} />
              <SelField label="Statut" name="actif" opts={[["true","Actif"],["false","Desactive"]]} dv={typeof mCat === "boolean" ? "true" : ((mCat as CategorieTransaction).actif ? "true" : "false")} />
            </Row>
            <FormActions onCancel={() => setMCat(false)} label="Enregistrer" />
          </form>
        </Modal>
      )}

      {mAct && sel && (
        <Modal title={`Nouvelle activite — ${sel.nom}`} onClose={() => setMAct(false)}>
          <form id="admin-create-activite-form" onSubmit={e => { void creerAct(e); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row>
              <SelField label="Type *" name="type_activite_id" required opts={types.filter(t => t.actif).map(t => [String(t.id), t.nom])} dv="" emptyOpt="Choisir un type" />
              <Field label="Code *" name="code" required ph="MOTO-01" />
            </Row>
            <Row><Field label="Nom *" name="nom" required ph="Moto taxi" /><Field label="Versement (FCFA) *" name="montant_versement" type="number" required dv="0" min="0" /></Row>
            <Row>
              <Field label="Date demarrage *" name="date_demarrage" type="date" required dv={new Date().toISOString().slice(0, 10)} />
              <SelField label="Statut" name="statut" opts={[["actif","Actif"],["en_pause","En pause"]]} dv="actif" />
            </Row>
            <FormActions onCancel={() => setMAct(false)} label="Creer l'activite" />
          </form>
        </Modal>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

/* ── Sub components ── */
function Badge({ s }: { s: string }) {
  return <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, color: SC[s] ?? "#708094", background: `${SC[s] ?? "#708094"}18` }}>{SL[s] ?? s}</span>;
}
function Btn({ children, onClick, id }: { children: ReactNode; onClick?: () => void; id?: string }) {
  return <button id={id} onClick={onClick} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{children}</button>;
}
function GhostBtn({ children, onClick, id }: { children: ReactNode; onClick?: () => void; id?: string }) {
  return <button id={id} onClick={onClick} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{children}</button>;
}
function SmBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "transparent", color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{children}</button>;
}
function SuccBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(22,163,74,.25)", background: "rgba(22,163,74,.15)", color: "#4ade80", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{children}</button>;
}
function WarnBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(217,119,6,.25)", background: "rgba(217,119,6,.12)", color: "#fbbf24", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{children}</button>;
}
function DangBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(220,38,38,.25)", background: "rgba(220,38,38,.1)", color: "#f87171", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{children}</button>;
}
function Table({ heads, empty, emptyMsg, children }: { heads: string[]; empty: boolean; emptyMsg: string; children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>{heads.map(h => <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "rgba(255,255,255,.3)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid rgba(124,58,237,.15)" }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {empty && <tr><td colSpan={heads.length} style={{ padding: "20px 14px", color: "rgba(255,255,255,.2)", fontStyle: "italic" }}>{emptyMsg}</td></tr>}
          {children}
        </tbody>
      </table>
    </div>
  );
}
function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div role="dialog" aria-modal="true" style={{ background: "#1a1630", border: "1px solid rgba(124,58,237,.3)", borderRadius: 20, width: "min(680px,96vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,.8)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 28px", borderBottom: "1px solid rgba(124,58,237,.15)", position: "sticky", top: 0, background: "#1a1630", zIndex: 1, borderRadius: "20px 20px 0 0" }}>
          <h2 style={{ color: "#e2d9f3", margin: 0, fontSize: 18 }}>{title}</h2>
          <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", fontSize: 20 }}>x</button>
        </div>
        <div style={{ padding: "24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}
function PageHead({ title, sub, action }: { title: string; sub: string; action: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
      <div><h2 style={{ color: "#e2d9f3", fontSize: 26, margin: "0 0 4px" }}>{title}</h2><p style={{ color: "rgba(255,255,255,.4)", margin: 0, fontSize: 14 }}>{sub}</p></div>
      {action}
    </div>
  );
}
function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>{children}</div>;
}
function SectionHdr({ children }: { children: ReactNode }) {
  return <h4 style={{ color: "#a78bfa", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, margin: "8px 0 0", borderBottom: "1px solid rgba(124,58,237,.15)", paddingBottom: 8 }}>{children}</h4>;
}
function Field({ id, label, name, required, ph, type = "text", dv, min, minLength }: { id?: string; label: string; name: string; required?: boolean; ph?: string; type?: string; dv?: string; min?: string; minLength?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600 }}>{label}</label>
      <input id={id} name={name} type={type} required={required} placeholder={ph} defaultValue={dv} min={min} minLength={minLength}
        style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 14px", color: "#e2d9f3", fontSize: 14, outline: "none" }} />
    </div>
  );
}
function SelField({ id, label, name, opts, dv, required, emptyOpt }: { id?: string; label: string; name: string; opts: [string, string][]; dv?: string; required?: boolean; emptyOpt?: string }) {
  const value = dv ?? "";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 600 }}>{label}</label>
      <select id={id} name={name} defaultValue={value} required={required}
        style={{ background: "#1a1630", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, padding: "10px 14px", color: "#e2d9f3", fontSize: 14, outline: "none" }}>
        {emptyOpt && <option value="" disabled>{emptyOpt}</option>}
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
function FormActions({ onCancel, label, submitId }: { onCancel: () => void; label: string; submitId?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8 }}>
      <GhostBtn onClick={onCancel}>Annuler</GhostBtn>
      <button id={submitId} type="submit" style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{label}</button>
    </div>
  );
}
