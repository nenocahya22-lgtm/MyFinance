// src/utils/auth.ts
// Helper untuk menyimpan dan mengambil JWT token dari localStorage

export const AUTH_KEY = "keuangan_jwt_token";
export const USER_ID_KEY = "keuangan_user_id";
export const USER_ROLE_KEY = "keuangan_user_role";

export function getToken(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(USER_ROLE_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

export function getUserId(): string {
  return localStorage.getItem(USER_ID_KEY) || "";
}

export function getUserRole(): string {
  return localStorage.getItem(USER_ROLE_KEY) || "ANGGOTA";
}
