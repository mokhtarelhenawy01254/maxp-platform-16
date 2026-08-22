import { tokenManager } from "../utils/tokenManager";

export type LpPage = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  componentName: string;
  isActive: boolean;
  sortOrder: number;
  bundleSlug: string | null;
  activationType: string;
  createdAt?: string;
  updatedAt?: string;
};

export type LpPageWithBundle = LpPage & {
  bundle: {
    slug: string;
    name: string;
    nameEn: string | null;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number | null;
    discount: number;
    appSlugs: string[];
    trialDays: number;
  } | null;
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
  update: (id: string, body: Partial<Pick<LpPage, "title" | "description" | "isActive" | "sortOrder" | "bundleSlug" | "activationType">>) =>
    request<LpPage>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
};

export const lpPublicService = {
  // Public LP pages may return 400 when no company/subdomain context is
  // available (e.g. on the main domain). Treat that as "no pages" instead of
  // throwing, so the navbar simply shows no LP links rather than logging a
  // console error on every load.
  list: async (): Promise<LpPage[]> => {
    try {
      return await request<LpPage[]>("/api/v1/public/lp-pages");
    } catch (err: any) {
      if (err?.message?.includes("400") || err?.message?.includes("HTTP 400")) {
        return [];
      }
      throw err;
    }
  },
};
