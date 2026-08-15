import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "koue_manager_token";
const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://127.0.0.1:8020/api/v1";

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function login(email: string, mot_de_passe: string) {
  return api<{ jeton: string; utilisateur: { id: number; nom: string; email: string } }>("connexion", {
    method: "POST",
    body: JSON.stringify({ email, mot_de_passe, nom_appareil: "mobile-expo" }),
    skipAuth: true,
  });
}

export async function api<T>(path: string, options: RequestInit & { skipAuth?: boolean } = {}) {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");

  if (!options.skipAuth) {
    const token = await getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}/${path}`, { ...options, headers });
  const json = await response.json();
  if (!response.ok || json.statut === "erreur") {
    throw new Error(json.message ?? "Erreur API");
  }
  return json as T & { statut: "ok" };
}
