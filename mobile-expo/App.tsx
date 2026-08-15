import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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

type User = { id?: number; nom: string; email: string; role?: { nom: string } };
type Reference = { id: number; nom: string; code?: string; nature?: string };
type Resume = { activites: number; revenus: number; decaissements: number; resultat: number; retards: number; inventaire: number };
type Activite = { id: number; nom: string; code: string; statut: string; montant_versement: string | number; type_activite?: { nom: string } };
type Transaction = { id: number; type: "revenu" | "decaissement"; montant: string | number; date_transaction: string; mode_paiement: string; activite?: { nom: string; code: string }; categorie?: { nom: string } };
type Echeance = { id: number; statut: string; debut_periode?: string; fin_periode?: string; montant_attendu: string | number; montant_paye: string | number; activite?: { code: string; nom: string } };
type Article = { id: number; nom: string; type_article: string; quantite: string | number; unite: string; valeur_unitaire: string | number; activite?: { nom: string; code: string } };
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
  ["utilisateurs", "Utilisateurs"],
  ["parametres", "Parametres"],
] as const;

type RouteKey = (typeof routes)[number][0];
const linear = (value: number) => value;

export default function App() {
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [route, setRoute] = useState<RouteKey>("tableau-bord");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [vueEnsemble, setVueEnsemble] = useState<Graphique[]>([]);
  const [chartFilters, setChartFilters] = useState<ChartFilters>(defaultChartFilters);
  const [chartFiltersDraft, setChartFiltersDraft] = useState<ChartFilters>(defaultChartFilters);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [rapport, setRapport] = useState<any>(null);
  const [utilisateurs, setUtilisateurs] = useState<User[]>([]);
  const [parametres, setParametres] = useState<Parametre[]>([]);
  const [references, setReferences] = useState<{
    activites: Reference[];
    categories_transactions: Reference[];
  }>({ activites: [], categories_transactions: [] });
  const [offlineCount, setOfflineCount] = useState(0);
  const [email, setEmail] = useState("admin@kouemanager.local");
  const [password, setPassword] = useState("Admin@1234");
  const [montant, setMontant] = useState("");

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
        api<{ activites: Reference[]; categories_transactions: Reference[] }>("references"),
      ]);
      setDashboard(home);
      setReferences({
        activites: refs.activites ?? [],
        categories_transactions: refs.categories_transactions ?? [],
      });
    } finally {
      setRefreshing(false);
    }
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
      if (nextRoute === "rapports") setRapport((await api<{ donnees: any }>("rapports/bilan")).donnees);
      if (nextRoute === "utilisateurs") setUtilisateurs((await api<{ donnees: User[] }>("utilisateurs")).donnees);
      if (nextRoute === "parametres") setParametres((await api<{ donnees: Parametre[] }>("parametres")).donnees);
    } catch (error) {
      Alert.alert("Chargement impossible", error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setRefreshing(false);
    }
  }

  async function submitTransactionRapide(type: "revenu" | "decaissement") {
    const activite = references.activites[0];
    const categorie = references.categories_transactions.find((item) => item.nature === type);
    if (!activite || !categorie || !montant) {
      Alert.alert("Information manquante", "Selectionnez un montant et verifiez les references.");
      return;
    }

    const payload = {
      activite_id: activite.id,
      categorie_id: categorie.id,
      type,
      montant,
      mode_paiement: "especes",
      date_transaction: new Date().toISOString().slice(0, 10),
    };

    try {
      await api("transactions", { method: "POST", body: JSON.stringify(payload) });
      setMontant("");
      await loadData();
      await openRoute(type === "revenu" ? "versements" : "depenses");
    } catch {
      await enqueueOperation({ path: "transactions", method: "POST", payload });
      setOfflineCount((await getQueue()).length);
      Alert.alert("Hors ligne", "L'operation est gardee localement et sera synchronisee plus tard.");
    }
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
              <TextInput style={styles.loginInput} value={password} onChangeText={setPassword} secureTextEntry />
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
        <Pressable style={styles.logout} onPress={logout} accessibilityLabel="Deconnexion">
          <LogoutIcon />
        </Pressable>
      </View>

      {menuOpen && (
        <View style={styles.menuWrap}>
          {routes.map(([key, label]) => (
            <Pressable key={key} style={[styles.menuItem, route === key && styles.menuItemActive]} onPress={() => void openRoute(key)}>
              <Text style={[styles.menuText, route === key && styles.menuTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content}>
        {refreshing && <Splash compact />}
        {renderRoute()}
        <Pressable style={styles.secondary} onPress={syncOffline}>
          <Text style={styles.secondaryText}>Synchroniser hors ligne ({offlineCount})</Text>
        </Pressable>
      </ScrollView>
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
          <SectionTitle title="Activites" subtitle="Toutes les activites du groupe." />
          <ListCard title="Liste des activites" empty="Aucune activite.">
            {activites.map((item) => (
              <DataRow key={item.id} title={item.nom} subtitle={`${item.code} - ${item.type_activite?.nom ?? "Type"}`} value={item.statut} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "versements") {
      return (
        <>
          <SectionTitle title="Versements" subtitle="Saisie rapide et suivi des paiements." />
          <QuickAmountCard title="Nouveau versement" actionLabel="Enregistrer le versement" onSubmit={() => submitTransactionRapide("revenu")} />
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
          <QuickAmountCard title="Nouvelle depense" actionLabel="Enregistrer la depense" onSubmit={() => submitTransactionRapide("decaissement")} />
          <ListCard title="Historique" empty="Aucune depense.">
            {transactions.map((item) => (
              <DataRow key={item.id} title={item.categorie?.nom ?? "Depense"} subtitle={`${date(item.date_transaction)} - ${item.activite?.nom ?? "-"}`} value={money(item.montant)} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "inventaire") {
      return (
        <>
          <SectionTitle title="Inventaire" subtitle="Biens, stocks et cheptel." />
          <ListCard title="Articles" empty="Aucun article.">
            {articles.map((item) => (
              <DataRow key={item.id} title={item.nom} subtitle={`${item.quantite} ${item.unite} - ${item.type_article}`} value={money(Number(item.quantite) * Number(item.valeur_unitaire))} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "rapports") {
      return (
        <>
          <SectionTitle title="Rapports" subtitle="Bilan consolide." />
          <View style={styles.stats}>
            <Stat label="Revenus" value={money(rapport?.totaux?.revenus)} />
            <Stat label="Depenses" value={money(rapport?.totaux?.decaissements)} />
            <Stat label="Resultat" value={money(rapport?.totaux?.resultat)} />
          </View>
          <ListCard title="Par activite" empty="Aucune donnee.">
            {(rapport?.activites ?? []).map((item: any) => (
              <DataRow key={item.id ?? item.code} title={item.nom} subtitle={item.type_activite ?? item.code} value={money(item.resultat)} />
            ))}
          </ListCard>
        </>
      );
    }

    if (route === "utilisateurs") {
      return (
        <>
          <SectionTitle title="Utilisateurs" subtitle="Comptes web et mobile." />
          <ListCard title="Comptes" empty="Aucun utilisateur.">
            {utilisateurs.map((item) => (
              <DataRow key={item.id ?? item.email} title={item.nom} subtitle={item.email} value={item.role?.nom ?? "Role"} />
            ))}
          </ListCard>
        </>
      );
    }

    return (
      <>
        <SectionTitle title="Parametres" subtitle="Configuration globale." />
        <ListCard title="Parametres" empty="Aucun parametre.">
          {parametres.map((item) => (
            <DataRow key={item.cle} title={item.cle} subtitle={item.description ?? ""} value={item.valeur} />
          ))}
        </ListCard>
      </>
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

function LogoutIcon() {
  return (
    <View style={styles.logoutIcon} pointerEvents="none">
      <View style={styles.logoutDoor} />
      <View style={styles.logoutArrowStem} />
      <View style={styles.logoutArrowHead} />
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },
  loginScreen: { flex: 1, backgroundColor: "#061a37" },
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
  menuWrap: {
    gap: 8,
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#dde5ef",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
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
  input: { height: 46, borderWidth: 1, borderColor: "#dde5ef", borderRadius: 7, paddingHorizontal: 12, backgroundColor: "#fff" },
  primary: { minHeight: 46, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#0757a6" },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondary: { minHeight: 46, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#f3b20b" },
  secondaryText: { color: "#1c2431", fontWeight: "800" },
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
