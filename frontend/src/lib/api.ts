const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const USE_API =
  import.meta.env.VITE_USE_API === "true" || import.meta.env.VITE_USE_API === "1" || Boolean(API_URL);

const TOKEN_KEY = "musiclab.token";

/** Base URL for API calls. Empty string = same-origin relative paths (`/api/...`). */
export function apiBase(): string {
  return API_URL;
}

export function isApiMode(): boolean {
  return USE_API;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!USE_API) throw new Error("API mode not enabled");

  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? res.statusText, res.status);
  }
  return data as T;
}
