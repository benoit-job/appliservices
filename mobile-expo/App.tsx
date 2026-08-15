import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, clearToken, getToken, login, setToken } from "./src/api/client";
import { enqueueOperation, flushQueue, getQueue } from "./src/storage/offlineQueue";

type User = { nom: string; email: string };
type Reference = { id: number; nom: string };
type Dashboard = {
  resume?: {
    activites: number;
    revenus: number;
    decaissements: number;
    resultat: number;
    retards: number;
    inventaire: number;
  };
  echeances?: Array<{
    id: number;
    statut: string;
    montant_attendu: string;
    montant_paye: string;
    activite?: { code: string; nom: string };
  }>;
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [references, setReferences] = useState<{
    activites: Reference[];
    categories_transactions: Array<Reference & { nature: string }>;
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
    const [home, refs] = await Promise.all([
      api<Dashboard>("tableau-bord"),
      api<{
        activites: Reference[];
        categories_transactions: Array<Reference & { nature: string }>;
      }>("references"),
    ]);
    setDashboard(home);
    setReferences(refs);
  }

  async function submitVersement() {
    const activite = references.activites[0];
    const categorie = references.categories_transactions.find((item) => item.nature === "revenu");
    if (!activite || !categorie || !montant) return;

    const payload = {
      activite_id: activite.id,
      categorie_id: categorie.id,
      type: "revenu",
      montant,
      mode_paiement: "especes",
      date_transaction: new Date().toISOString().slice(0, 10),
    };

    try {
      await api("transactions", { method: "POST", body: JSON.stringify(payload) });
      setMontant("");
      await loadData();
    } catch {
      await enqueueOperation({ path: "transactions", method: "POST", payload });
      setOfflineCount((await getQueue()).length);
      Alert.alert("Hors ligne", "Le versement est gardé localement et sera synchronisé plus tard.");
    }
  }

  async function syncOffline() {
    await flushQueue(api);
    setOfflineCount((await getQueue()).length);
    await loadData();
  }

  async function logout() {
    await clearToken();
    setUserState(null);
  }

  if (!ready) {
    return <Splash />;
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Splash compact />
          <View style={styles.card}>
            <Text style={styles.title}>Connexion</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
            <Pressable style={styles.primary} onPress={handleLogin}>
              <Text style={styles.primaryText}>Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>KOUE MANAGER</Text>
            <Text style={styles.muted}>{user.nom}</Text>
          </View>
          <Pressable style={styles.logout} onPress={logout}>
            <Text style={styles.logoutText}>Sortir</Text>
          </Pressable>
        </View>

        <View style={styles.stats}>
          <Stat label="Activités" value={dashboard.resume?.activites ?? 0} />
          <Stat label="Retards" value={dashboard.resume?.retards ?? 0} />
          <Stat label="Résultat" value={`${Number(dashboard.resume?.resultat ?? 0).toLocaleString("fr-FR")} FCFA`} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Versement rapide</Text>
          <Text style={styles.muted}>{references.activites[0]?.nom ?? "Aucune activité"}</Text>
          <TextInput
            style={styles.input}
            value={montant}
            onChangeText={setMontant}
            keyboardType="numeric"
            placeholder="Montant reçu"
          />
          <Pressable style={styles.primary} onPress={submitVersement}>
            <Text style={styles.primaryText}>Enregistrer</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Échéances</Text>
          {(dashboard.echeances ?? []).slice(0, 5).map((item) => (
            <View style={styles.row} key={item.id}>
              <Text>{item.activite?.code}</Text>
              <Text style={styles.pill}>{item.statut}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.secondary} onPress={syncOffline}>
          <Text>Synchroniser hors ligne ({offlineCount})</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Splash({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.splash, compact && styles.splashCompact]}>
      <View style={styles.spinner}>
        <ActivityIndicator size="large" color="#f3b20b" />
      </View>
      <Text style={styles.brand}>KOUE MANAGER</Text>
      {!compact && <Text style={styles.muted}>Chargement...</Text>}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 18, gap: 14 },
  splash: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  splashCompact: { flex: 0, paddingVertical: 24 },
  spinner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 7,
    borderColor: "#0757a6",
    alignItems: "center",
    justifyContent: "center",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { fontSize: 28, fontWeight: "900", color: "#0757a6" },
  muted: { color: "#708094" },
  card: { backgroundColor: "#fff", borderRadius: 8, padding: 16, gap: 12, borderWidth: 1, borderColor: "#dde5ef" },
  title: { fontSize: 18, fontWeight: "800", color: "#162033" },
  input: { height: 46, borderWidth: 1, borderColor: "#dde5ef", borderRadius: 7, paddingHorizontal: 12, backgroundColor: "#fff" },
  primary: { minHeight: 46, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#0757a6" },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondary: { minHeight: 46, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#f3b20b" },
  logout: { paddingHorizontal: 12, height: 38, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#eaf3ff" },
  logoutText: { color: "#0757a6", fontWeight: "800" },
  stats: { flexDirection: "row", gap: 10 },
  stat: { flex: 1, backgroundColor: "#fff", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#dde5ef" },
  statValue: { marginTop: 6, fontSize: 16, fontWeight: "900" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#edf2f7" },
  pill: { overflow: "hidden", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#fef3c7", color: "#854d0e", fontWeight: "800" },
});
