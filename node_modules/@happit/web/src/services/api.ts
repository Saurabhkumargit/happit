const API_URL = import.meta.env.VITE_API_URL;

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    throw new Error(
      data?.error?.message ?? "API request failed",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
}

export async function getHealth() {
  return apiRequest<{ status: string }>("/api/v1/health");
}

export async function register(
  email: string,
  password: string,
) {
  return apiRequest<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function login(
  email: string,
  password: string,
) {
  return apiRequest<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function getCurrentUser() {
  return apiRequest<AuthResponse>("/api/v1/auth/me");
}

export async function logout() {
  return apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
  });
}