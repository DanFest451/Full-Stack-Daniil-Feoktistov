import { getToken } from "../utils/storage";
import type { AuthResponse, DocumentDTO, PublicDocDTO } from "../types";

const API_URL: string = import.meta.env.VITE_API_URL || "http://localhost:5000";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

async function request<T>(path: string, { method = "GET", body, auth = false }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const msg = (data as { message?: string } | null)?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/register", { method: "POST", body: { email, password } }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } }),

  getDocs: () => request<DocumentDTO[]>("/api/documents", { auth: true }),

  createDoc: (title: string) =>
    request<DocumentDTO>("/api/documents", { method: "POST", auth: true, body: { title } }),

  deleteDoc: (id: string) =>
    request<{ message: string }>(`/api/documents/${id}`, { method: "DELETE", auth: true }),

  updateDoc: (id: string, data: Partial<Pick<DocumentDTO, "title" | "content">>) =>
    request<DocumentDTO>(`/api/documents/${id}`, { method: "PUT", auth: true, body: data }),

  acquireLock: (id: string) =>
    request<{ message: string; lockedBy: string; lockExpiresAt: string }>(`/api/documents/${id}/lock`, {
      method: "POST",
      auth: true,
    }),

  renewLock: (id: string) =>
    request<{ message: string; lockExpiresAt: string }>(`/api/documents/${id}/lock/renew`, {
      method: "POST",
      auth: true,
    }),

  releaseLock: (id: string) =>
    request<{ message: string }>(`/api/documents/${id}/lock`, { method: "DELETE", auth: true }),

  enablePublicLink: (id: string) =>
    request<{ message: string; publicUrl: string; token: string }>(`/api/documents/${id}/public/enable`, {
      method: "POST",
      auth: true,
    }),

  getPublicDoc: (token: string) => request<PublicDocDTO>(`/api/public/${token}`),
};
