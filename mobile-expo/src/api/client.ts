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
    body: JSON.stringify({ identifiant: email, mot_de_passe, nom_appareil: "mobile-expo" }),
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

export async function getRoles() {
  return api<{ donnees: any[]; permissions: any[] }>("roles");
}

export async function createRole(data: { nom: string; description?: string; permissions?: number[] }) {
  return api("roles", { method: "POST", body: JSON.stringify(data) });
}

export async function updateRole(id: number, data: { nom: string; description?: string; permissions?: number[] }) {
  return api(`roles/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteRole(id: number) {
  return api(`roles/${id}`, { method: "DELETE" });
}

export async function getPermissions() {
  return api<{ donnees: any[]; roles: any[] }>("permissions");
}

export async function createPermission(data: { nom: string; roles?: number[] }) {
  return api("permissions", { method: "POST", body: JSON.stringify(data) });
}

export async function updatePermission(id: number, data: { nom: string; roles?: number[] }) {
  return api(`permissions/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deletePermission(id: number) {
  return api(`permissions/${id}`, { method: "DELETE" });
}
