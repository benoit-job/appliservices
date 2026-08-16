import { ComponentProps, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, clearToken, getToken, login, setToken } from "./src/api/client";
import { ChartFiltersBar } from "./src/components/ChartFilters";
import { ChartGrid } from "./src/components/ChartPanel";
import { enqueueOperation, flushQueue, getQueue } from "./src/storage/offlineQueue";
import { ChartFilters, defaultChartFilters, filtersToQuery, Graphique } from "./src/types/charts";

type Role = { id: number; nom: string; slug?: string };
type User = { id: number; role_id?: number; nom: string; email: string; telephone?: string; statut?: string; role?: { nom: string }; plateforme?: { id?: number; nom?: string; slug?: string; email_contact?: string; telephone_contact?: string; adresse?: string; image_url?: string | null; statut?: string; limite_utilisateurs?: number; limite_activites?: number } };
type Reference = { id: number; nom: string; code?: string; nature?: string };
type Resume = { activites: number; revenus: number; decaissements: number; resultat: number; retards: number; inventaire: number };
type TypeActivite = { id: number; nom: string; slug?: string; frequence_versement: string; a_versement_recurrent: boolean; actif: boolean; activites_count?: number };
type Activite = { id: number; type_activite_id?: number; nom: string; code: string; statut: string; montant_versement: string | number; type_activite?: { nom: string }; gerant?: { nom: string; email: string } };
type Transaction = { id: number; type: "revenu" | "decaissement"; montant: string | number; date_transaction: string; mode_paiement: string; statut_validation?: string; activite?: { nom: string; code: string }; categorie?: { nom: string } };
type Echeance = { id: number; statut: string; debut_periode?: string; fin_periode?: string; montant_attendu: string | number; montant_paye: string | number; activite?: { code: string; nom: string } };
type Article = { id: number; nom: string; type_article: string; quantite: string | number; unite: string; valeur_unitaire: string | number; seuil_alerte?: string | number | null; activite?: { nom: string; code: string } };
type NotificationItem = { id: number; titre: string; message: string; type_notification: string; lu: boolean };
type AuditLog = { id: number; action: string; entite: string; entite_id?: number; created_at?: string; utilisateur?: { nom: string; email: string } };
type RapportActivite = { id: number; code: string; nom: string; type_activite?: string; revenus: number; decaissements: number; resultat: number };
type Rapport = { periode?: { debut: string; fin: string }; totaux?: { revenus: number; decaissements: number; resultat: number }; activites?: RapportActivite[] };
type Parametre = { cle: string; valeur: string; description?: string };
type Dashboard = { resume?: Resume; activites?: Activite[]; transactions?: Transaction[]; echeances?: Echeance[]; graphiques?: Graphique[] };

const routes = [
  ["tableau-bord", "Tableau de bord"],
  ["vue-ensemble", "Vue d'ensemble"],
  ["activites", "Activites"],
  ["versements", "Versements"],
  ["depenses", "Depenses"],
  ["inventaire", "Inventaire"],
  ["rapports", "Rapports"],
  ["types-activites", "Types d'activites"],
  ["utilisateurs", "Utilisateurs"],
  ["notifications", "Notifications"],
  ["audit", "Audit"],
  ["infos", "Infos"],
  ["parametres", "Parametres"],
] as const;

type RouteKey = (typeof routes)[number][0];
const linear = (value: number) => value;
const today = () => new Date().toISOString().slice(0, 10);
const statusOptions = [
  { id: "actif", nom: "Actif" },
  { id: "en_pause", nom: "En pause" },
  { id: "cede", nom: "Cede" },
  { id: "cloture", nom: "Cloture" },
];
const userStatusOptions = [
  { id: "actif", nom: "Actif" },
  { id: "suspendu", nom: "Suspendu" },
  { id: "desactive", nom: "Desactive" },
];
const articleTypeOptions = [
  { id: "bien_durable", nom: "Bien durable" },
  { id: "stock_consommable", nom: "Stock" },
  { id: "cheptel", nom: "Cheptel" },
];
const movementTypeOptions = [
  { id: "entree", nom: "Entree" },
  { id: "sortie", nom: "Sortie" },
  { id: "ajustement", nom: "Ajustement" },
];
const frequencyOptions = [
  { id: "aucun", nom: "Aucun" },
  { id: "journalier", nom: "Journalier" },
  { id: "hebdomadaire", nom: "Hebdo" },
  { id: "mensuel", nom: "Mensuel" },
];
const paymentOptions = [
  { id: "especes", nom: "Especes" },
  { id: "mobile_money", nom: "Mobile Money" },
  { id: "banque", nom: "Banque" },
  { id: "autre", nom: "Autre" },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [route, setRoute] = useState<RouteKey>("tableau-bord");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(false);
  const [profileForm, setProfileForm] = useState({ nom: "", email: "", telephone: "", statut: "actif" });
  const [platformForm, setPlatformForm] = useState({ nom: "", slug: "", email_contact: "", telephone_contact: "", adresse: "" });
  const [dashboard, setDashboard] = useState<Dashboard>({});
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [syncTooltip, setSyncTooltip] = useState(false);
  const [references, setReferences] = useState<{
    activites: Reference[];
    categories_transactions: Reference[];
    types_activites: TypeActivite[];
    utilisateurs: User[];
    roles: Role[];
  }>({ activites: [], categories_transactions: [], types_activites: [], utilisateurs: [], roles: [] });
  const [offlineCount, setOfflineCount] = useState(0);
  const [email, setEmail] = useState("admin@kouemanager.local");
  const [password, setPassword] = useState("Admin@1234");
  const [montant, setMontant] = useState("");
  const [activiteDraft, setActiviteDraft] = useState({
    type_activite_id: "",
    gerant_utilisateur_id: "",
    code: "",
    nom: "",
    montant_versement: "0",
    date_demarrage: today(),
    statut: "actif",
    attributs: "",
  });
  const [transactionDraft, setTransactionDraft] = useState({
    activite_id: "",
    categorie_id: "",
    echeance_id: "",
    montant: "",
    date_transaction: today(),
    mode_paiement: "especes",
    note: "",
  });
  const [articleDraft, setArticleDraft] = useState({
    activite_id: "",
    nom: "",
    type_article: "bien_durable",
    quantite: "1",
    unite: "unite",
    valeur_unitaire: "0",
    seuil_alerte: "",
  });
  const [mouvementDraft, setMouvementDraft] = useState({
    article_id: "",
    type_mouvement: "entree",
    quantite: "",
    motif: "",
    date_mouvement: today(),
  });
  const [rapportDraft, setRapportDraft] = useState({ debut: today(), fin: today() });
  const [typeDraft, setTypeDraft] = useState({
    nom: "",
    slug: "",
    frequence_versement: "aucun",
    a_versement_recurrent: false,
    icone: "",
    couleur: "",
    schema_champs: "",
  });
  const [userDraft, setUserDraft] = useState({
    role_id: "",
    nom: "",
    email: "",
    mot_de_passe: "",
    telephone: "",
    statut: "actif",
  });
  const [paramDrafts, setParamDrafts] = useState<Record<string, string>>({});

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
    void bootstrap();
  }, []);

  async function bootstrap() {
    const savedToken = await getToken();
    if (savedToken) {
      try {
        const me = await api<{ utilisateur: User }>("moi");
        setUserState(me.utilisateur);
        await loadData();
      } catch {
        await clearToken();
      }
    }
    setOfflineCount((await getQueue()).length);
    setReady(true);
  }

  async function handleLogin() {
    try {
      const response = await login(email, password);
      await setToken(response.jeton);
      setUserState(response.utilisateur);
      await loadData();
    } catch (error) {
      Alert.alert("Connexion impossible", error instanceof Error ? error.message : "Erreur inconnue");
    }
  }

  async function loadData() {
    setRefreshing(true);
    try {
      const [home, refs] = await Promise.all([
        api<Dashboard>("tableau-bord"),
        api<{
          activites: Reference[];
          categories_transactions: Reference[];
          types_activites: TypeActivite[];
          utilisateurs: User[];
          roles: Role[];
        }>("references"),
      ]);
      setDashboard(home);
      setReferences({
        activites: refs.activites ?? [],
        categories_transactions: refs.categories_transactions ?? [],
        types_activites: refs.types_activites ?? [],
        utilisateurs: refs.utilisateurs ?? [],
        roles: refs.roles ?? [],
      });
    } finally {
      setRefreshing(false);
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

    await api(`utilisateurs/${user.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const me = await api<{ utilisateur: User }>("moi");
    setUserState(me.utilisateur);
    setEditingProfile(false);
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

    await api(`plateformes/${user.plateforme.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    const me = await api<{ utilisateur: User }>("moi");
    setUserState(me.utilisateur);
    setEditingPlatform(false);
  }

  async function openRoute(nextRoute: RouteKey) {
    setRoute(nextRoute);
    setMenuOpen(false);
    setRefreshing(true);
    try {
      if (nextRoute === "tableau-bord") setDashboard(await api<Dashboard>("tableau-bord"));
      if (nextRoute === "vue-ensemble") {
        const response = await api<{ graphiques: Graphique[]; filtres: ChartFilters }>(`graphiques/vue-ensemble?${filtersToQuery(chartFilters)}`);
        setVueEnsemble(response.graphiques ?? []);
      }
      if (nextRoute === "activites") setActivites((await api<{ donnees: Activite[] }>("activites")).donnees);
      if (nextRoute === "versements") setEcheances((await api<{ donnees: { data: Echeance[] } }>("echeances-versements")).donnees.data);
      if (nextRoute === "depenses") setTransactions((await api<{ donnees: { data: Transaction[] } }>("transactions?type=decaissement")).donnees.data);
      if (nextRoute === "inventaire") setArticles((await api<{ donnees: { data: Article[] } }>("inventaire")).donnees.data);
      if (nextRoute === "rapports") setRapport((await api<{ donnees: Rapport }>("rapports/bilan")).donnees);
      if (nextRoute === "types-activites") setTypesActivites((await api<{ donnees: TypeActivite[] }>("types-activites")).donnees);
      if (nextRoute === "utilisateurs") setUtilisateurs((await api<{ donnees: User[] }>("utilisateurs")).donnees);
      if (nextRoute === "notifications") setNotifications((await api<{ donnees: NotificationItem[] }>("notifications")).donnees);
      if (nextRoute === "audit") setAuditLogs((await api<{ donnees: { data: AuditLog[] } }>("audit")).donnees.data);
      if (nextRoute === "parametres") {
        const response = await api<{ donnees: Parametre[] }>("parametres");
        setParametres(response.donnees);
        setParamDrafts(Object.fromEntries(response.donnees.map((item) => [item.cle, item.valeur ?? ""])));
      }
    } catch (error) {
      Alert.alert("Chargement impossible", error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setRefreshing(false);
    }
  }

  async function submitTransactionRapide(type: "revenu" | "decaissement") {
    const activite = references.activites.find((item) => String(item.id) === transactionDraft.activite_id) ?? references.activites[0];
    const categorie = references.categories_transactions.find((item) => String(item.id) === transactionDraft.categorie_id)
      ?? references.categories_transactions.find((item) => item.nature === type);
    const amount = transactionDraft.montant || montant;
    if (!activite || !categorie || !amount) {
      Alert.alert("Information manquante", "Selectionnez un montant et verifiez les references.");
      return;
    }

    const payload = {
      activite_id: activite.id,
      categorie_id: categorie.id,
      type,
      montant: amount,
      echeance_id: transactionDraft.echeance_id || undefined,
      mode_paiement: transactionDraft.mode_paiement,
      date_transaction: transactionDraft.date_transaction,
      note: transactionDraft.note || undefined,
    };

    try {
      await api("transactions", { method: "POST", body: JSON.stringify(payload) });
      setMontant("");
      setTransactionDraft((draft) => ({ ...draft, montant: "", note: "" }));
      await loadData();
      await openRoute(type === "revenu" ? "versements" : "depenses");
    } catch {
      await enqueueOperation({ path: "transactions", method: "POST", payload });
      setOfflineCount((await getQueue()).length);
      Alert.alert("Hors ligne", "L'operation est gardee localement et sera synchronisee plus tard.");
    }
  }

  async function submitActiviteMobile() {
    if (!activiteDraft.type_activite_id || !activiteDraft.code || !activiteDraft.nom) {
      Alert.alert("Information manquante", "Renseignez le type, le code et le nom.");
      return;
    }

    await api("activites", {
      method: "POST",
      body: JSON.stringify({
        ...activiteDraft,
        gerant_utilisateur_id: activiteDraft.gerant_utilisateur_id || null,
        attributs: parseJsonObject(activiteDraft.attributs),
      }),
    });
    setActiviteDraft({ type_activite_id: "", gerant_utilisateur_id: "", code: "", nom: "", montant_versement: "0", date_demarrage: today(), statut: "actif", attributs: "" });
    await loadData();
    await openRoute("activites");
  }

  async function submitArticleMobile() {
    if (!articleDraft.activite_id || !articleDraft.nom) {
      Alert.alert("Information manquante", "Renseignez l'activite et le nom de l'article.");
      return;
    }

    await api("inventaire", { method: "POST", body: JSON.stringify({ ...articleDraft, attributs: {} }) });
    setArticleDraft({ activite_id: "", nom: "", type_article: "bien_durable", quantite: "1", unite: "unite", valeur_unitaire: "0", seuil_alerte: "" });
    await openRoute("inventaire");
  }

  async function submitMouvementMobile() {
    if (!mouvementDraft.article_id || !mouvementDraft.quantite || !mouvementDraft.motif) {
      Alert.alert("Information manquante", "Selectionnez l'article, la quantite et le motif.");
      return;
    }

    const { article_id, ...payload } = mouvementDraft;
    await api(`inventaire/${article_id}/mouvements`, { method: "POST", body: JSON.stringify(payload) });
    setMouvementDraft({ article_id: "", type_mouvement: "entree", quantite: "", motif: "", date_mouvement: today() });
    await openRoute("inventaire");
  }

  async function filtrerRapportMobile() {
    const query = new URLSearchParams(rapportDraft).toString();
    setRapport((await api<{ donnees: Rapport }>(`rapports/bilan?${query}`)).donnees);
  }

  async function figerRapportMobile() {
    const query = rapport?.periode ? new URLSearchParams(rapport.periode).toString() : new URLSearchParams(rapportDraft).toString();
    await api(`rapports/figer?${query}`, { method: "POST", body: "{}" });
    Alert.alert("Rapport fige", "Le rapport a ete archive.");
  }

  async function submitTypeActiviteMobile() {
    if (!typeDraft.nom) {
      Alert.alert("Information manquante", "Renseignez le nom du type.");
      return;
    }

    await api("types-activites", {
      method: "POST",
      body: JSON.stringify({
        ...typeDraft,
        slug: typeDraft.slug || undefined,
        actif: true,
        schema_champs: parseSchema(typeDraft.schema_champs),
      }),
    });
    setTypeDraft({ nom: "", slug: "", frequence_versement: "aucun", a_versement_recurrent: false, icone: "", couleur: "", schema_champs: "" });
    await loadData();
    await openRoute("types-activites");
  }

  async function submitUtilisateurMobile() {
    if (!userDraft.role_id || !userDraft.nom || !userDraft.email || !userDraft.mot_de_passe) {
      Alert.alert("Information manquante", "Renseignez le role, le nom, l'email et le mot de passe.");
      return;
    }

    await api("utilisateurs", { method: "POST", body: JSON.stringify(userDraft) });
    setUserDraft({ role_id: "", nom: "", email: "", mot_de_passe: "", telephone: "", statut: "actif" });
    await loadData();
    await openRoute("utilisateurs");
  }

  async function submitParametresMobile() {
    const payload = parametres.map((parametre) => ({
      cle: parametre.cle,
      valeur: paramDrafts[parametre.cle] ?? parametre.valeur ?? "",
      description: parametre.description ?? "",
    }));
    const response = await api<{ donnees: Parametre[] }>("parametres", { method: "PUT", body: JSON.stringify({ parametres: payload }) });
    setParametres(response.donnees);
    setParamDrafts(Object.fromEntries(response.donnees.map((item) => [item.cle, item.valeur ?? ""])));
  }

  async function marquerNotificationLue(notificationId: number) {
    await api(`notifications/${notificationId}/lue`, { method: "PATCH", body: "{}" });
    await openRoute("notifications");
  }

  async function validerTransactionMobile(transactionId: number, statut: "valide" | "rejete") {
    await api(`transactions/${transactionId}/validation`, { method: "PATCH", body: JSON.stringify({ statut_validation: statut }) });
    await openRoute("depenses");
  }

  async function appliquerFiltresGraphiques() {
    setChartFilters(chartFiltersDraft);
    setRefreshing(true);
    try {
      const response = await api<{ graphiques: Graphique[] }>(`graphiques/vue-ensemble?${filtersToQuery(chartFiltersDraft)}`);
      setVueEnsemble(response.graphiques ?? []);
    } catch (error) {
      Alert.alert("Chargement impossible", error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setRefreshing(false);
    }
  }

  async function syncOffline() {
    await flushQueue(api);
    setOfflineCount((await getQueue()).length);
    await loadData();
    await openRoute(route);
  }

  async function logout() {
    await clearToken();
    setUserState(null);
    setRoute("tableau-bord");
    setMenuOpen(false);
  }

  if (!ready) {
    return <Splash />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loginScreen}>
        <View style={styles.loginCircleOne} />
        <View style={styles.loginCircleTwo} />
        <ScrollView contentContainerStyle={styles.loginContent}>
          <View style={styles.mobileHero}>
            <View style={styles.mobileLogo}>
              <Text style={styles.mobileLogoText}>KC</Text>
            </View>
            <Text style={styles.mobileKicker}>Groupe multi-activites</Text>
            <Text style={styles.mobileTitle}>KOUE MANAGER</Text>
            <Text style={styles.mobileSubtitle}>Suivi des versements, depenses, inventaire et alertes depuis le terrain.</Text>
          </View>

          <View style={styles.loginCard}>
            <View>
              <Text style={styles.loginCardTitle}>Acces securise</Text>
              <Text style={styles.loginCardText}>Connectez-vous avec le meme compte que sur le web.</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adresse email</Text>
              <TextInput style={styles.loginInput} value={email} onChangeText={setEmail} autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View style={{ position: "relative", flexDirection: "row", alignItems: "center" }}>
                <TextInput style={[styles.loginInput, { flex: 1 }]} value={password} onChangeText={setPassword} secureTextEntry={!showLoginPassword} />
                <Pressable onPress={() => setShowLoginPassword(!showLoginPassword)} style={{ position: "absolute", right: 12, padding: 8 }}>
                  <Text style={{ fontSize: 18 }}>{showLoginPassword ? "🙈" : "👁️"}</Text>
                </Pressable>
              </View>
            </View>
            <Pressable style={styles.loginPrimary} onPress={handleLogin}>
              <Text style={styles.primaryText}>Se connecter</Text>
            </Pressable>
            <View style={styles.loginBadges}>
              <Text style={styles.loginBadge}>Sanctum</Text>
              <Text style={styles.loginBadge}>Hors ligne</Text>
              <Text style={styles.loginBadge}>JSON</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.appContainer}>
        <View style={styles.appHeader}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuToggle} onPress={() => setMenuOpen((value) => !value)} accessibilityLabel="Ouvrir le menu">
              <View style={styles.menuBar} />
              <View style={styles.menuBar} />
              <View style={styles.menuBar} />
            </Pressable>
            <View>
              <Text style={styles.brand}>KOUE MANAGER</Text>
              <Text style={styles.muted}>{currentRouteLabel(route)} - {user.nom}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {syncTooltip && (
              <View style={styles.syncTooltip} pointerEvents="none">
                <Text style={styles.syncTooltipText}>Synchroniser hors ligne ({offlineCount})</Text>
              </View>
            )}
            <Pressable
              style={[styles.syncBtn, offlineCount > 0 && styles.syncBtnActive]}
              onPress={() => { setSyncTooltip(false); void syncOffline(); }}
              onLongPress={() => setSyncTooltip(true)}
              onPressOut={() => setSyncTooltip(false)}
              accessibilityLabel="Synchroniser hors ligne"
            >
              <SyncIcon />
              {offlineCount > 0 && (
                <View style={styles.syncBadge}>
                  <Text style={styles.syncBadgeText}>{offlineCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable style={styles.logout} onPress={logout} accessibilityLabel="Deconnexion">
              <LogoutIcon />
            </Pressable>
          </View>
        </View>

        {menuOpen && (
          <>
            <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)} />
            <View style={styles.menuWrap}>
              {routes.map(([key, label]) => (
                <View key={key}>
                  <Pressable style={[styles.menuItem, (route === key || (key === "infos" && (route === "info-plateforme" || route === "info-compte"))) && styles.menuItemActive]} onPress={() => {
                    if (key === "infos") {
                      setRoute("infos");
                      // ne pas fermer pour afficher les sous-menus
                      return;
                    }
                    void openRoute(key);
                    setMenuOpen(false);
                  }}>
                    <Text style={[styles.menuText, (route === key || (key === "infos" && (route === "info-plateforme" || route === "info-compte"))) && styles.menuTextActive]}>{label}</Text>
                  </Pressable>
                  {key === "infos" && (
                    <View style={styles.submenuWrap}>
                      <Pressable
                        style={[styles.submenuItem, route === "info-plateforme" && styles.submenuItemActive]}
                        onPress={() => { setRoute("info-plateforme"); setMenuOpen(false); }}
                      >
                        <Text style={[styles.submenuText, route === "info-plateforme" && styles.submenuTextActive]}>📍 Plateforme</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.submenuItem, route === "info-compte" && styles.submenuItemActive]}
                        onPress={() => { setRoute("info-compte"); setMenuOpen(false); }}
                      >
                        <Text style={[styles.submenuText, route === "info-compte" && styles.submenuTextActive]}>👤 Mon compte</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        <ScrollView contentContainerStyle={styles.content}>
        {refreshing && <Splash compact />}
        {renderRoute()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );

  function renderRoute() {
    if (route === "tableau-bord") {
      const resume = dashboard.resume;
      return (
        <>
          <SectionTitle title="Tableau de bord" subtitle="Vue consolidee des activites." />
          <View style={styles.stats}>
            <Stat label="Activites" value={resume?.activites ?? 0} />
            <Stat label="Retards" value={resume?.retards ?? 0} />
            <Stat label="Resultat" value={money(resume?.resultat)} />
          </View>
          <View style={styles.stats}>
            <Stat label="Revenus" value={money(resume?.revenus)} />
            <Stat label="Depenses" value={money(resume?.decaissements)} />
            <Stat label="Inventaire" value={money(resume?.inventaire)} />
          </View>
          <ChartGrid graphiques={dashboard.graphiques ?? []} compact />
          <ListCard title="Echeances recentes" empty="Aucune echeance.">
            {(dashboard.echeances ?? []).slice(0, 5).map((item) => (
              <DataRow key={item.id} title={item.activite?.nom ?? "-"} subtitle={item.activite?.code ?? "-"} value={item.statut} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "vue-ensemble") {
      return (
        <>
          <SectionTitle title="Vue d'ensemble" subtitle="Tous les graphiques avec filtres precis." />
          <ChartFiltersBar
            filters={chartFiltersDraft}
            activites={references.activites}
            onChange={setChartFiltersDraft}
            onApply={() => void appliquerFiltresGraphiques()}
          />
          <ChartGrid graphiques={vueEnsemble} />
        </>
      );
    }

    if (route === "activites") {
      return (
        <>
          <SectionTitle title="Activites" subtitle="Creez tout nouveau business sans modifier le schema." />
          <FormCard title="Nouvelle activite">
            <ChoiceGroup label="Type" items={references.types_activites} selected={activiteDraft.type_activite_id} onSelect={(value) => setActiviteDraft((draft) => ({ ...draft, type_activite_id: value }))} />
            <ChoiceGroup label="Gerant assigne" items={references.utilisateurs} selected={activiteDraft.gerant_utilisateur_id} onSelect={(value) => setActiviteDraft((draft) => ({ ...draft, gerant_utilisateur_id: value }))} optional />
            <Field label="Code" value={activiteDraft.code} onChangeText={(value) => setActiviteDraft((draft) => ({ ...draft, code: value }))} placeholder="MOTO-04" />
            <Field label="Nom" value={activiteDraft.nom} onChangeText={(value) => setActiviteDraft((draft) => ({ ...draft, nom: value }))} placeholder="Nom de l'activite" />
            <Field label="Versement attendu" value={activiteDraft.montant_versement} onChangeText={(value) => setActiviteDraft((draft) => ({ ...draft, montant_versement: value }))} keyboardType="numeric" />
            <Field label="Date demarrage" value={activiteDraft.date_demarrage} onChangeText={(value) => setActiviteDraft((draft) => ({ ...draft, date_demarrage: value }))} placeholder="YYYY-MM-DD" />
            <ChoiceGroup label="Statut" items={statusOptions} selected={activiteDraft.statut} onSelect={(value) => setActiviteDraft((draft) => ({ ...draft, statut: value }))} />
            <Field label="Attributs JSON" value={activiteDraft.attributs} onChangeText={(value) => setActiviteDraft((draft) => ({ ...draft, attributs: value }))} placeholder='{"plaque":"1234CI"}' multiline />
            <Pressable style={styles.primary} onPress={() => void submitActiviteMobile()}><Text style={styles.primaryText}>Enregistrer</Text></Pressable>
          </FormCard>
          <ListCard title="Liste des activites" empty="Aucune activite.">
            {activites.map((item) => (
              <DataRow key={item.id} title={item.nom} subtitle={`${item.code} - ${item.type_activite?.nom ?? "Type"} - ${item.gerant?.nom ?? "Sans gerant"}`} value={item.statut} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "versements") {
      return (
        <>
          <SectionTitle title="Versements" subtitle="Saisie rapide et suivi des paiements." />
          <TransactionFormCard type="revenu" />
          <ListCard title="Echeances" empty="Aucune echeance.">
            {echeances.map((item) => (
              <DataRow key={item.id} title={item.activite?.nom ?? "-"} subtitle={`${money(item.montant_paye)} / ${money(item.montant_attendu)}`} value={item.statut} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "depenses") {
      return (
        <>
          <SectionTitle title="Depenses" subtitle="Decaissements et historique." />
          <TransactionFormCard type="decaissement" />
          <ListCard title="Historique" empty="Aucune depense.">
            {transactions.map((item) => (
              item.statut_validation === "en_attente" ? (
                <ActionRow
                  key={item.id}
                  title={item.categorie?.nom ?? "Depense"}
                  subtitle={`${date(item.date_transaction)} - ${item.activite?.nom ?? "-"} - ${money(item.montant)}`}
                  value="en attente"
                  actions={[
                    ["Valider", () => void validerTransactionMobile(item.id, "valide")],
                    ["Rejeter", () => void validerTransactionMobile(item.id, "rejete")],
                  ]}
                />
              ) : (
                <DataRow key={item.id} title={item.categorie?.nom ?? "Depense"} subtitle={`${date(item.date_transaction)} - ${item.activite?.nom ?? "-"} - ${item.mode_paiement}`} value={money(item.montant)} />
              )
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "inventaire") {
      return (
        <>
          <SectionTitle title="Inventaire" subtitle="Biens, stocks, cheptel et mouvements traces." />
          <FormCard title="Nouvel article">
            <ChoiceGroup label="Activite" items={references.activites} selected={articleDraft.activite_id} onSelect={(value) => setArticleDraft((draft) => ({ ...draft, activite_id: value }))} />
            <Field label="Nom" value={articleDraft.nom} onChangeText={(value) => setArticleDraft((draft) => ({ ...draft, nom: value }))} placeholder="Nom de l'article" />
            <ChoiceGroup label="Type article" items={articleTypeOptions} selected={articleDraft.type_article} onSelect={(value) => setArticleDraft((draft) => ({ ...draft, type_article: value }))} />
            <Field label="Quantite" value={articleDraft.quantite} onChangeText={(value) => setArticleDraft((draft) => ({ ...draft, quantite: value }))} keyboardType="numeric" />
            <Field label="Unite" value={articleDraft.unite} onChangeText={(value) => setArticleDraft((draft) => ({ ...draft, unite: value }))} />
            <Field label="Valeur unitaire" value={articleDraft.valeur_unitaire} onChangeText={(value) => setArticleDraft((draft) => ({ ...draft, valeur_unitaire: value }))} keyboardType="numeric" />
            <Field label="Seuil d'alerte" value={articleDraft.seuil_alerte} onChangeText={(value) => setArticleDraft((draft) => ({ ...draft, seuil_alerte: value }))} keyboardType="numeric" />
            <Pressable style={styles.primary} onPress={() => void submitArticleMobile()}><Text style={styles.primaryText}>Enregistrer</Text></Pressable>
          </FormCard>
          <FormCard title="Mouvement de stock">
            <ChoiceGroup label="Article" items={articles} selected={mouvementDraft.article_id} onSelect={(value) => setMouvementDraft((draft) => ({ ...draft, article_id: value }))} />
            <ChoiceGroup label="Type mouvement" items={movementTypeOptions} selected={mouvementDraft.type_mouvement} onSelect={(value) => setMouvementDraft((draft) => ({ ...draft, type_mouvement: value }))} />
            <Field label="Quantite" value={mouvementDraft.quantite} onChangeText={(value) => setMouvementDraft((draft) => ({ ...draft, quantite: value }))} keyboardType="numeric" />
            <Field label="Motif" value={mouvementDraft.motif} onChangeText={(value) => setMouvementDraft((draft) => ({ ...draft, motif: value }))} />
            <Field label="Date mouvement" value={mouvementDraft.date_mouvement} onChangeText={(value) => setMouvementDraft((draft) => ({ ...draft, date_mouvement: value }))} placeholder="YYYY-MM-DD" />
            <Pressable style={styles.primary} onPress={() => void submitMouvementMobile()}><Text style={styles.primaryText}>Enregistrer</Text></Pressable>
          </FormCard>
          <ListCard title="Articles" empty="Aucun article.">
            {articles.map((item) => (
              <DataRow key={item.id} title={item.nom} subtitle={`${item.activite?.nom ?? "-"} - ${item.quantite} ${item.unite} - seuil ${item.seuil_alerte ?? "-"}`} value={money(Number(item.quantite) * Number(item.valeur_unitaire))} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "rapports") {
      return (
        <>
          <SectionTitle title="Rapports" subtitle="Bilan consolide." />
          <FormCard title="Filtre de periode">
            <Field label="Debut" value={rapportDraft.debut} onChangeText={(value) => setRapportDraft((draft) => ({ ...draft, debut: value }))} placeholder="YYYY-MM-DD" />
            <Field label="Fin" value={rapportDraft.fin} onChangeText={(value) => setRapportDraft((draft) => ({ ...draft, fin: value }))} placeholder="YYYY-MM-DD" />
            <View style={styles.actionRowButtons}>
              <Pressable style={[styles.primary, styles.actionButton]} onPress={() => void filtrerRapportMobile()}><Text style={styles.primaryText}>Filtrer</Text></Pressable>
              <Pressable style={[styles.secondary, styles.actionButton]} onPress={() => void figerRapportMobile()}><Text style={styles.secondaryText}>Figer</Text></Pressable>
            </View>
          </FormCard>
          <View style={styles.stats}>
            <Stat label="Revenus" value={money(rapport?.totaux?.revenus)} />
            <Stat label="Depenses" value={money(rapport?.totaux?.decaissements)} />
            <Stat label="Resultat" value={money(rapport?.totaux?.resultat)} />
          </View>
          <ListCard title="Par activite" empty="Aucune donnee.">
            {(rapport?.activites ?? []).map((item) => (
              <DataRow key={item.id ?? item.code} title={item.nom} subtitle={item.type_activite ?? item.code} value={money(item.resultat)} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "utilisateurs") {
      return (
        <>
          <SectionTitle title="Utilisateurs" subtitle="Comptes web et mobile avec roles." />
          <FormCard title="Nouvel utilisateur">
            <ChoiceGroup label="Role" items={references.roles} selected={userDraft.role_id} onSelect={(value) => setUserDraft((draft) => ({ ...draft, role_id: value }))} />
            <Field label="Nom" value={userDraft.nom} onChangeText={(value) => setUserDraft((draft) => ({ ...draft, nom: value }))} />
            <Field label="Email" value={userDraft.email} onChangeText={(value) => setUserDraft((draft) => ({ ...draft, email: value }))} autoCapitalize="none" keyboardType="email-address" />
            <Field label="Mot de passe" value={userDraft.mot_de_passe} onChangeText={(value) => setUserDraft((draft) => ({ ...draft, mot_de_passe: value }))} secureTextEntry showPassword={showUserPassword} onTogglePassword={() => setShowUserPassword(!showUserPassword)} />
            <Field label="Telephone" value={userDraft.telephone} onChangeText={(value) => setUserDraft((draft) => ({ ...draft, telephone: value }))} keyboardType="phone-pad" />
            <ChoiceGroup label="Statut" items={userStatusOptions} selected={userDraft.statut} onSelect={(value) => setUserDraft((draft) => ({ ...draft, statut: value }))} />
            <Pressable style={styles.primary} onPress={() => void submitUtilisateurMobile()}><Text style={styles.primaryText}>Enregistrer</Text></Pressable>
          </FormCard>
          <ListCard title="Comptes" empty="Aucun utilisateur.">
            {utilisateurs.map((item) => (
              <DataRow key={item.id ?? item.email} title={item.nom} subtitle={`${item.email} - ${item.telephone ?? "-"}`} value={item.role?.nom ?? "Role"} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "types-activites") {
      return (
        <>
          <SectionTitle title="Types d'activites" subtitle="Configuration des business." />
          <FormCard title="Nouveau type">
            <Field label="Nom" value={typeDraft.nom} onChangeText={(value) => setTypeDraft((draft) => ({ ...draft, nom: value }))} />
            <Field label="Slug" value={typeDraft.slug} onChangeText={(value) => setTypeDraft((draft) => ({ ...draft, slug: value }))} />
            <ChoiceGroup label="Frequence" items={frequencyOptions} selected={typeDraft.frequence_versement} onSelect={(value) => setTypeDraft((draft) => ({ ...draft, frequence_versement: value }))} />
            <Pressable style={styles.checkRow} onPress={() => setTypeDraft((draft) => ({ ...draft, a_versement_recurrent: !draft.a_versement_recurrent }))}>
              <View style={[styles.checkBox, typeDraft.a_versement_recurrent && styles.checkBoxActive]} />
              <Text style={styles.checkText}>Versement recurrent</Text>
            </Pressable>
            <Field label="Icone" value={typeDraft.icone} onChangeText={(value) => setTypeDraft((draft) => ({ ...draft, icone: value }))} />
            <Field label="Couleur" value={typeDraft.couleur} onChangeText={(value) => setTypeDraft((draft) => ({ ...draft, couleur: value }))} placeholder="#0757a6" />
            <Field label="Champs dynamiques" value={typeDraft.schema_champs} onChangeText={(value) => setTypeDraft((draft) => ({ ...draft, schema_champs: value }))} placeholder={"plaque:texte\nnombre_tetes:nombre"} multiline />
            <Pressable style={styles.primary} onPress={() => void submitTypeActiviteMobile()}><Text style={styles.primaryText}>Enregistrer</Text></Pressable>
          </FormCard>
          <ListCard title="Types configures" empty="Aucun type.">
            {typesActivites.map((item) => (
              <DataRow
                key={item.id}
                title={item.nom}
                subtitle={`${item.frequence_versement} - ${item.a_versement_recurrent ? "versement recurrent" : "sans versement"}`}
                value={item.actif ? `${item.activites_count ?? 0} act.` : "inactif"}
              />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "notifications") {
      return (
        <>
          <SectionTitle title="Notifications" subtitle="Alertes et rappels." />
          <ListCard title="Centre d'alertes" empty="Aucune notification.">
            {notifications.map((item) => (
              item.lu ? (
                <DataRow key={item.id} title={item.titre} subtitle={item.message} value="Lue" />
              ) : (
                <ActionRow key={item.id} title={item.titre} subtitle={item.message} value={item.type_notification} actions={[["Marquer lue", () => void marquerNotificationLue(item.id)]]} />
              )
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "audit") {
      return (
        <>
          <SectionTitle title="Audit" subtitle="Actions sensibles tracees." />
          <ListCard title="Dernieres actions" empty="Aucune action.">
            {auditLogs.map((item) => (
              <DataRow
                key={item.id}
                title={`${item.action} - ${item.entite}`}
                subtitle={`${item.utilisateur?.nom ?? "Systeme"}${item.created_at ? ` - ${date(item.created_at)}` : ""}`}
                value={item.entite_id ? `#${item.entite_id}` : "-"}
              />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "info-plateforme" || route === "infos") {
      const plateforme = user.plateforme ?? {};
      return (
        <>
          <SectionTitle title="Plateforme" subtitle="Informations associees a votre espace." />
          <FormCard title="Plateforme">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ width: 92, height: 92, borderRadius: 20, backgroundColor: "#edf2f7", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {plateforme.image_url ? (
                  <Image source={{ uri: plateforme.image_url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                ) : (
                  <Text style={{ fontSize: 32 }}>🏢</Text>
                )}
              </View>
              <Pressable style={styles.secondary} onPress={() => setEditingPlatform((value) => !value)}>
                <Text style={styles.secondaryText}>{editingPlatform ? "Annuler" : "Modifier"}</Text>
              </Pressable>
            </View>

            {!editingPlatform ? (
              <>
                <Field label="Nom" value={plateforme.nom ?? "-"} editable={false} />
                <Field label="Slug" value={plateforme.slug ?? "-"} editable={false} />
                <Field label="Email" value={plateforme.email_contact ?? "-"} editable={false} />
                <Field label="Telephone" value={plateforme.telephone_contact ?? "-"} editable={false} />
                <Field label="Adresse" value={plateforme.adresse ?? "-"} editable={false} />
              </>
            ) : (
              <>
                <Field label="Nom" value={platformForm.nom} onChangeText={(value) => setPlatformForm((prev) => ({ ...prev, nom: value }))} />
                <Field label="Slug" value={platformForm.slug} onChangeText={(value) => setPlatformForm((prev) => ({ ...prev, slug: value }))} />
                <Field label="Email" value={platformForm.email_contact} onChangeText={(value) => setPlatformForm((prev) => ({ ...prev, email_contact: value }))} keyboardType="email-address" autoCapitalize="none" />
                <Field label="Telephone" value={platformForm.telephone_contact} onChangeText={(value) => setPlatformForm((prev) => ({ ...prev, telephone_contact: value }))} keyboardType="phone-pad" />
                <Field label="Adresse" value={platformForm.adresse} onChangeText={(value) => setPlatformForm((prev) => ({ ...prev, adresse: value }))} />
                <Pressable style={styles.primary} onPress={() => void savePlatform()}>
                  <Text style={styles.primaryText}>Enregistrer</Text>
                </Pressable>
              </>
            )}
          </FormCard>
        </>
      );
    }

    if (route === "info-compte") {
      return (
        <>
          <SectionTitle title="Mon compte" subtitle="Informations de profil." />
          <FormCard title="Compte">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#0757a6", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{user.nom?.charAt(0)?.toUpperCase() ?? "U"}</Text>
              </View>
              <Pressable style={styles.secondary} onPress={() => setEditingProfile((value) => !value)}>
                <Text style={styles.secondaryText}>{editingProfile ? "Annuler" : "Modifier"}</Text>
              </Pressable>
            </View>

            {!editingProfile ? (
              <>
                <Field label="Nom" value={user.nom} editable={false} />
                <Field label="Email" value={user.email} editable={false} />
                <Field label="Telephone" value={user.telephone ?? "-"} editable={false} />
                <Field label="Role" value={user.role?.nom ?? "-"} editable={false} />
                <Field label="Plateforme" value={user.plateforme?.nom ?? "-"} editable={false} />
              </>
            ) : (
              <>
                <Field label="Nom" value={profileForm.nom} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, nom: value }))} />
                <Field label="Email" value={profileForm.email} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, email: value }))} autoCapitalize="none" keyboardType="email-address" />
                <Field label="Telephone" value={profileForm.telephone} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, telephone: value }))} keyboardType="phone-pad" />
                <Field label="Statut" value={profileForm.statut} onChangeText={(value) => setProfileForm((prev) => ({ ...prev, statut: value }))} />
                <Pressable style={styles.primary} onPress={() => void saveProfile()}>
                  <Text style={styles.primaryText}>Enregistrer</Text>
                </Pressable>
              </>
            )}
          </FormCard>
        </>
      );
    }

    return (
      <>
        <SectionTitle title="Parametres" subtitle="Configuration globale." />
        <FormCard title="Parametres">
          {parametres.map((item) => (
            <Field key={item.cle} label={item.cle} value={paramDrafts[item.cle] ?? item.valeur ?? ""} onChangeText={(value) => setParamDrafts((drafts) => ({ ...drafts, [item.cle]: value }))} placeholder={item.description ?? ""} />
          ))}
          <Pressable style={styles.primary} onPress={() => void submitParametresMobile()}><Text style={styles.primaryText}>Enregistrer les parametres</Text></Pressable>
        </FormCard>
      </>
    );
  }

  function TransactionFormCard({ type }: { type: "revenu" | "decaissement" }) {
    const categories = references.categories_transactions.filter((item) => item.nature === type);
    return (
      <FormCard title={type === "revenu" ? "Nouveau versement" : "Nouvelle depense"}>
        <ChoiceGroup label="Activite" items={references.activites} selected={transactionDraft.activite_id} onSelect={(value) => setTransactionDraft((draft) => ({ ...draft, activite_id: value }))} />
        <ChoiceGroup label="Categorie" items={categories} selected={transactionDraft.categorie_id} onSelect={(value) => setTransactionDraft((draft) => ({ ...draft, categorie_id: value }))} />
        {type === "revenu" && (
          <ChoiceGroup label="Echeance liee" items={echeances.map((item) => ({ id: item.id, nom: `${item.activite?.code ?? "Activite"} - ${item.debut_periode ? date(item.debut_periode) : "periode"}` }))} selected={transactionDraft.echeance_id} onSelect={(value) => setTransactionDraft((draft) => ({ ...draft, echeance_id: value }))} optional />
        )}
        <Field label="Montant" value={transactionDraft.montant} onChangeText={(value) => setTransactionDraft((draft) => ({ ...draft, montant: value }))} keyboardType="numeric" />
        <Field label="Date" value={transactionDraft.date_transaction} onChangeText={(value) => setTransactionDraft((draft) => ({ ...draft, date_transaction: value }))} placeholder="YYYY-MM-DD" />
        <ChoiceGroup label="Paiement" items={paymentOptions} selected={transactionDraft.mode_paiement} onSelect={(value) => setTransactionDraft((draft) => ({ ...draft, mode_paiement: value }))} />
        <Field label="Note / reference recu" value={transactionDraft.note} onChangeText={(value) => setTransactionDraft((draft) => ({ ...draft, note: value }))} multiline />
        <Pressable style={styles.primary} onPress={() => void submitTransactionRapide(type)}>
          <Text style={styles.primaryText}>{type === "revenu" ? "Enregistrer le versement" : "Enregistrer la depense"}</Text>
        </Pressable>
      </FormCard>
    );
  }

  function QuickAmountCard({ title, actionLabel, onSubmit }: { title: string; actionLabel: string; onSubmit: () => void }) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{references.activites[0]?.nom ?? "Aucune activite"}</Text>
        <TextInput style={styles.input} value={montant} onChangeText={setMontant} keyboardType="numeric" placeholder="Montant" />
        <Pressable style={styles.primary} onPress={onSubmit}>
          <Text style={styles.primaryText}>{actionLabel}</Text>
        </Pressable>
      </View>
    );
  }
}

function Splash({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.splash, compact && styles.splashCompact]}>
      <KoueSpinner compact={compact} />
      {!compact && <Text style={styles.brand}>KOUE MANAGER</Text>}
      {!compact && <Text style={styles.muted}>Chargement...</Text>}
    </View>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.formStack}>{children}</View>
    </View>
  );
}

function Field({ label, multiline = false, showPassword = false, onTogglePassword, secureTextEntry = false, ...props }: { label: string; multiline?: boolean; showPassword?: boolean; onTogglePassword?: () => void; secureTextEntry?: boolean } & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      {secureTextEntry && onTogglePassword ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline, { flex: 1 }]}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            placeholderTextColor="#8a97aa"
            secureTextEntry={!showPassword}
            {...props}
          />
          <Pressable onPress={onTogglePassword} style={{ position: "absolute", right: 12, padding: 8 }}>
            <Text style={{ fontSize: 16 }}>{showPassword ? "🙈" : "👁️"}</Text>
          </Pressable>
        </View>
      ) : (
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          placeholderTextColor="#8a97aa"
          secureTextEntry={secureTextEntry}
          {...props}
        />
      )}
    </View>
  );
}

function ChoiceGroup({
  label,
  items,
  selected,
  onSelect,
  optional = false,
}: {
  label: string;
  items: Array<{ id: string | number; nom: string; code?: string }>;
  selected: string;
  onSelect: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.choiceWrap}>
        {optional && (
          <Pressable style={[styles.choiceChip, !selected && styles.choiceChipActive]} onPress={() => onSelect("")}>
            <Text style={[styles.choiceText, !selected && styles.choiceTextActive]}>Aucun</Text>
          </Pressable>
        )}
        {items.map((item) => {
          const value = String(item.id);
          const active = selected === value;
          return (
            <Pressable key={value} style={[styles.choiceChip, active && styles.choiceChipActive]} onPress={() => onSelect(value)}>
              <Text style={[styles.choiceText, active && styles.choiceTextActive]} numberOfLines={1}>
                {item.code ? `${item.code} - ${item.nom}` : item.nom}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function KoueSpinner({ compact = false }: { compact?: boolean }) {
  const outer = useRef(new Animated.Value(0)).current;
  const inner = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const outerLoop = Animated.loop(
      Animated.timing(outer, {
        toValue: 1,
        duration: 1160,
        easing: linear,
        useNativeDriver: false,
      }),
    );
    const innerLoop = Animated.loop(
      Animated.timing(inner, {
        toValue: 1,
        duration: 1800,
        easing: linear,
        useNativeDriver: false,
      }),
    );

    outerLoop.start();
    innerLoop.start();

    return () => {
      outerLoop.stop();
      innerLoop.stop();
    };
  }, [inner, outer]);

  const outerRotation = outer.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const innerRotation = inner.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });

  return (
    <View style={[styles.spinnerStage, compact && styles.spinnerStageCompact]}>
      <Animated.View style={[styles.spinnerOrbit, compact && styles.spinnerOrbitCompact, { transform: [{ rotate: outerRotation }] }]}>
        <View style={[styles.spinnerArrow, styles.spinnerArrowOne, compact && styles.spinnerArrowCompact, compact && styles.spinnerArrowOneCompact]} />
        <View style={[styles.spinnerArrow, styles.spinnerArrowTwo, compact && styles.spinnerArrowCompact, compact && styles.spinnerArrowTwoCompact]} />
        <View style={[styles.spinnerArrow, styles.spinnerArrowThree, compact && styles.spinnerArrowCompact, compact && styles.spinnerArrowThreeCompact]} />
      </Animated.View>
      <Animated.View style={[styles.spinnerInnerOrbit, compact && styles.spinnerInnerOrbitCompact, { transform: [{ rotate: innerRotation }] }]} />
      <View style={[styles.spinnerLogoDisk, compact && styles.spinnerLogoDiskCompact]}>
        <Text style={[styles.spinnerLogoText, compact && styles.spinnerLogoTextCompact]}>KC</Text>
      </View>
    </View>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.pageTitle}>{title}</Text>
      <Text style={styles.muted}>{subtitle}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ListCard({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {isEmpty ? <Text style={styles.empty}>{empty}</Text> : items}
    </View>
  );
}

function DataRow({ title, subtitle, value }: { title: string; subtitle: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.pill} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ActionRow({
  title,
  subtitle,
  value,
  actions,
}: {
  title: string;
  subtitle: string;
  value: string | number;
  actions: Array<[string, () => void]>;
}) {
  return (
    <View style={styles.actionRow}>
      <DataRow title={title} subtitle={subtitle} value={value} />
      <View style={styles.actionRowButtons}>
        {actions.map(([label, action]) => (
          <Pressable key={label} style={[styles.secondary, styles.actionButton]} onPress={action}>
            <Text style={styles.secondaryText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function LogoutIcon() {
  return (
    <View style={styles.logoutIcon} pointerEvents="none">
      <View style={styles.logoutDoor} />
      <View style={styles.logoutArrowStem} />
      <View style={styles.logoutArrowHead} />
    </View>
  );
}

function SyncIcon() {
  return (
    <View style={styles.syncIcon} pointerEvents="none">
      {/* Arc superieur */}
      <View style={styles.syncArcTop} />
      {/* Arc inferieur */}
      <View style={styles.syncArcBottom} />
      {/* Fleche haut droite */}
      <View style={styles.syncArrowTop} />
      {/* Fleche bas gauche */}
      <View style={styles.syncArrowBottom} />
    </View>
  );
}

function currentRouteLabel(route: RouteKey) {
  return routes.find(([key]) => key === route)?.[1] ?? "Tableau de bord";
}

function money(value?: string | number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(value ?? 0))} FCFA`;
}

function date(value: string) {
  return new Intl.DateTimeFormat("fr-FR").format(new Date(value));
}

function parseJsonObject(value: string) {
  const text = value.trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
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
        const [key, type = "texte"] = line.split(":").map((part) => part.trim());
        return [key, type];
      })
      .filter(([key]) => Boolean(key)),
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },
  loginScreen: { flex: 1, backgroundColor: "#061a37" },
  appContainer: { flex: 1, position: "relative" },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#dde5ef",
  },
  headerLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8, position: "relative" },
  syncBtn: {
    width: 44,
    height: 44,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eaf3ff",
    borderWidth: 1,
    borderColor: "#cfe4ff",
  },
  syncBtnActive: {
    backgroundColor: "#fff7e6",
    borderColor: "#f3b20b",
  },
  syncBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#f3b20b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  syncBadgeText: { color: "#1c2431", fontSize: 9, fontWeight: "900" },
  syncTooltip: {
    position: "absolute",
    bottom: 50,
    right: 0,
    backgroundColor: "#162033",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    zIndex: 99,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 200,
  },
  syncTooltipText: { color: "#fff", fontSize: 12, fontWeight: "700", textAlign: "center" },
  syncIcon: { width: 22, height: 22, position: "relative", alignItems: "center", justifyContent: "center" },
  syncArcTop: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#0757a6",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
    top: 1,
    left: 1,
  },
  syncArcBottom: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: "#0757a6",
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    bottom: 1,
    right: 1,
  },
  syncArrowTop: {
    position: "absolute",
    top: 0,
    right: 2,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#0757a6",
    transform: [{ rotate: "-45deg" }],
  },
  syncArrowBottom: {
    position: "absolute",
    bottom: 0,
    left: 2,
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#0757a6",
    transform: [{ rotate: "135deg" }],
  },
  menuToggle: {
    width: 44,
    height: 44,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#eaf3ff",
    borderWidth: 1,
    borderColor: "#cfe4ff",
  },
  menuBar: {
    width: 22,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#0757a6",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 10,
  },
  menuWrap: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    zIndex: 11,
    gap: 4,
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#dde5ef",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },
  menuItem: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 7,
    paddingHorizontal: 14,
    backgroundColor: "#edf2f7",
  },
  menuItemActive: { backgroundColor: "#0757a6" },
  menuText: { color: "#42516a", fontWeight: "800", fontSize: 13 },
  menuTextActive: { color: "#fff" },
  submenuWrap: {
    marginTop: 2,
    marginLeft: 14,
    gap: 3,
    borderLeftWidth: 2,
    borderLeftColor: "#cfe4ff",
    paddingLeft: 10,
  },
  submenuItem: {
    minHeight: 38,
    justifyContent: "center",
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: "#f0f5ff",
  },
  submenuItemActive: { backgroundColor: "#0757a6" },
  submenuText: { color: "#3a5a8c", fontWeight: "700", fontSize: 13 },
  submenuTextActive: { color: "#fff" },
  loginContent: { flexGrow: 1, padding: 22, justifyContent: "center", gap: 22 },
  loginCircleOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(243, 178, 11, 0.24)",
    top: -86,
    right: -82,
  },
  loginCircleTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(22, 163, 74, 0.18)",
    bottom: -72,
    left: -72,
  },
  mobileHero: { gap: 10, alignItems: "flex-start" },
  mobileLogo: {
    width: 86,
    height: 86,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 3,
    borderColor: "#f3b20b",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  mobileLogoText: { color: "#0757a6", fontSize: 30, fontWeight: "900" },
  mobileKicker: {
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: "#172554",
    backgroundColor: "#fde68a",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  mobileTitle: { color: "#fff", fontSize: 42, lineHeight: 44, fontWeight: "900" },
  mobileSubtitle: { color: "rgba(255,255,255,0.82)", fontSize: 16, lineHeight: 24 },
  loginCard: {
    gap: 16,
    padding: 20,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 10,
  },
  loginCardTitle: { color: "#0b2144", fontSize: 26, fontWeight: "900" },
  loginCardText: { marginTop: 5, color: "#708094", lineHeight: 21 },
  inputGroup: { gap: 7 },
  inputLabel: { color: "#26384f", fontSize: 13, fontWeight: "800" },
  loginInput: {
    height: 54,
    borderWidth: 1,
    borderColor: "#cbd7e6",
    borderRadius: 7,
    paddingHorizontal: 14,
    backgroundColor: "#f8fbff",
    color: "#162033",
    fontSize: 16,
  },
  loginPrimary: {
    minHeight: 56,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0757a6",
    shadowColor: "#0757a6",
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 5,
  },
  loginBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  loginBadge: {
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: "#0757a6",
    backgroundColor: "#eaf3ff",
    fontSize: 12,
    fontWeight: "800",
  },
  splash: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  splashCompact: { flex: 0, paddingVertical: 12 },
  spinnerStage: { width: 188, height: 188, alignItems: "center", justifyContent: "center" },
  spinnerStageCompact: { width: 96, height: 96 },
  spinnerOrbit: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 94,
    borderWidth: 8,
    borderColor: "#f3b20b",
    borderTopColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  spinnerOrbitCompact: { borderRadius: 48, borderWidth: 5 },
  spinnerInnerOrbit: {
    position: "absolute",
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: "#4a3cd7",
    borderRightColor: "transparent",
  },
  spinnerInnerOrbitCompact: { width: 42, height: 42, borderRadius: 21, borderWidth: 3 },
  spinnerLogoDisk: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  spinnerLogoDiskCompact: { width: 38, height: 38, borderRadius: 19 },
  spinnerLogoText: { color: "#0757a6", fontSize: 24, fontWeight: "900" },
  spinnerLogoTextCompact: { fontSize: 13 },
  spinnerArrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 24,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftColor: "#f3b20b",
  },
  spinnerArrowCompact: { borderTopWidth: 7, borderBottomWidth: 7, borderLeftWidth: 14 },
  spinnerArrowOne: { left: 24, top: 20, transform: [{ rotate: "138deg" }] },
  spinnerArrowTwo: { left: 14, bottom: 32, transform: [{ rotate: "14deg" }] },
  spinnerArrowThree: { right: 8, top: 86 },
  spinnerArrowOneCompact: { left: 12, top: 10 },
  spinnerArrowTwoCompact: { left: 7, bottom: 16 },
  spinnerArrowThreeCompact: { right: 4, top: 42 },
  brand: { fontSize: 24, fontWeight: "900", color: "#0757a6" },
  muted: { color: "#708094" },
  sectionTitle: { gap: 4 },
  pageTitle: { fontSize: 27, fontWeight: "900", color: "#162033" },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 16, gap: 12, borderWidth: 1, borderColor: "#dde5ef" },
  title: { fontSize: 18, fontWeight: "800", color: "#162033" },
  formStack: { gap: 12 },
  field: { gap: 7 },
  input: { minHeight: 46, borderWidth: 1, borderColor: "#dde5ef", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#fff", color: "#162033" },
  inputMultiline: { minHeight: 92 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: {
    maxWidth: "100%",
    minHeight: 36,
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dde5ef",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#f8fafc",
  },
  choiceChipActive: { borderColor: "#0757a6", backgroundColor: "#0757a6" },
  choiceText: { maxWidth: 220, color: "#42516a", fontSize: 12, fontWeight: "800" },
  choiceTextActive: { color: "#fff" },
  checkRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#dde5ef",
    borderRadius: 7,
    paddingHorizontal: 12,
    backgroundColor: "#f8fafc",
  },
  checkBox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: "#9aa8ba", backgroundColor: "#fff" },
  checkBoxActive: { borderColor: "#0757a6", backgroundColor: "#0757a6" },
  checkText: { color: "#42516a", fontWeight: "800" },
  primary: { minHeight: 46, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#0757a6" },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondary: { minHeight: 46, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#f3b20b" },
  secondaryText: { color: "#1c2431", fontWeight: "800" },
  actionRow: { borderBottomWidth: 1, borderBottomColor: "#edf2f7", paddingBottom: 10, gap: 8 },
  actionRowButtons: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1, minHeight: 40 },
  logout: { width: 44, height: 44, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#eaf3ff" },
  logoutIcon: { position: "relative", width: 25, height: 25 },
  logoutDoor: {
    position: "absolute",
    left: 2,
    top: 3,
    width: 10,
    height: 19,
    borderWidth: 2,
    borderRightWidth: 0,
    borderColor: "#0757a6",
    borderRadius: 2,
  },
  logoutArrowStem: {
    position: "absolute",
    left: 9,
    top: 12,
    width: 13,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#0757a6",
  },
  logoutArrowHead: {
    position: "absolute",
    right: 2,
    top: 8,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#0757a6",
    transform: [{ rotate: "45deg" }],
  },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#dde5ef" },
  statValue: { marginTop: 6, fontSize: 16, fontWeight: "900", color: "#162033" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#edf2f7" },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: "#162033", fontWeight: "800" },
  rowSubtitle: { marginTop: 3, color: "#708094", fontSize: 12 },
  empty: { color: "#708094", paddingVertical: 10 },
  pill: {
    maxWidth: 124,
    overflow: "hidden",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fef3c7",
    color: "#854d0e",
    fontWeight: "800",
    fontSize: 12,
  },
});
