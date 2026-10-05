const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, "");
const API_URL = !configuredApiUrl
  ? "http://127.0.0.1:3333/api/v1"
  : configuredApiUrl.endsWith("/api/v1")
    ? configuredApiUrl
    : configuredApiUrl.endsWith("/api")
      ? `${configuredApiUrl}/v1`
      : `${configuredApiUrl}/api/v1`;

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const request = (token: string | null) => {
    const headers = new Headers(options?.headers);
    if (!headers.has("Content-Type") && options?.body) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(`${API_URL}${endpoint}`, { ...options, credentials: "include", headers });
  };

  let response = await request(accessToken);
  const authEndpoint = endpoint.startsWith("/auth/");
  if (response.status === 401 && !authEndpoint) {
    refreshInFlight ??= fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    }).then(async (refreshResponse) => {
      if (!refreshResponse.ok) return null;
      const session = await refreshResponse.json() as { accessToken: string };
      setAccessToken(session.accessToken);
      return session.accessToken;
    }).catch(() => null).finally(() => { refreshInFlight = null; });
    const refreshedToken = await refreshInFlight;
    if (refreshedToken) response = await request(refreshedToken);
    else {
      setAccessToken(null);
      window.dispatchEvent(new Event("stockflow:auth-expired"));
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null) as {
      message?: string;
      error?: string | { message?: string };
    } | null;
    const apiMessage = typeof body?.error === "string" ? body.error : body?.error?.message;
    throw new Error(
      body?.message || apiMessage || `Erro na API: ${response.status} ${response.statusText}`
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
