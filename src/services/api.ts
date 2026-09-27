const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(
      `Erro na API: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}