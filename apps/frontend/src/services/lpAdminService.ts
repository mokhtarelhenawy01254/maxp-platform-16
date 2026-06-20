import { tokenManager } from "../utils/tokenManager";

export type LpPage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  componentName: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

const BASE = "/api/v1/admin/lp-pages";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = tokenManager.getAccessToken();
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const lpAdminService = {
  list: () => request<LpPage[]>(BASE),
  update: (id: string, body: Partial<Pick<LpPage, "title" | "description" | "isActive" | "sortOrder">>) =>
    request<LpPage>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

export const lpPublicService = {
  list: () => request<LpPage[]>("/api/v1/public/lp-pages"),
};
