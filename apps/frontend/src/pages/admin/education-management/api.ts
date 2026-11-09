import { buildApiUrl } from "../../../utils/urlHelper";
import tokenManager from "../../../utils/tokenManager";

export const getCompanyId = (): string | null => {
  // 1. JWT token payload is the most authoritative and always matches Authorization header
  try {
    const token = tokenManager.getAccessToken();
    if (token) {
      const parts = token.split(".");
      if (parts.length === 3) {
        const base64Url = parts[1] || "";
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        const payload = JSON.parse(atob(padded));
        if (payload?.companyId && typeof payload.companyId === "string") {
          // Synchronize localStorage user if companyId is stale
          if (typeof window !== "undefined") {
            try {
              const rawUser = localStorage.getItem("user");
              if (rawUser) {
                const u = JSON.parse(rawUser);
                if (u && u.companyId !== payload.companyId) {
                  u.companyId = payload.companyId;
                  localStorage.setItem("user", JSON.stringify(u));
                }
              }
            } catch {}
          }
          return payload.companyId;
        }
      }
    }
  } catch {
    // Non-blocking fallback to storage
  }

  // 2. Storage fallbacks if token is not decoded or available
  try {
    if (typeof window !== "undefined") {
      const direct =
        localStorage.getItem("activeCompanyId") ||
        localStorage.getItem("currentCompanyId") ||
        sessionStorage.getItem("currentCompanyId") ||
        localStorage.getItem("companyId");
      if (direct) return direct;

      const userRaw = localStorage.getItem("user") || sessionStorage.getItem("user");
      if (userRaw) {
        const user = JSON.parse(userRaw);
        return user?.companyId || user?.company?.id || user?.currentCompanyId || null;
      }
    }
  } catch {
    // Ignore storage parsing error
  }

  return null;
};

export const getAuthHeaders = (): Record<string, string> => {
  const headers = tokenManager.createAuthHeaders({
    "Content-Type": "application/json",
  });
  const cid = getCompanyId();
  if (cid) headers["X-Company-Id"] = cid;
  return headers as Record<string, string>;
};

export const api = (path: string): string => {
  const base = buildApiUrl(`education/${path}`);
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    url = new URL(base, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  }
  const cid = getCompanyId();
  if (cid) url.searchParams.set("companyId", cid);
  return url.toString();
};

export const searchCustomersApi = (q: string): string => {
  return api(`students/guardians/search?q=${encodeURIComponent(q)}&query=${encodeURIComponent(q)}`);
};

export const fetchJson = async (
  url: string,
  options?: RequestInit,
  retries = 2
): Promise<any> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: getAuthHeaders(), ...options });
      if (res.status === 502 || res.status === 503) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw new Error("الخادم غير متاح حالياً - جارٍ إعادة التشغيل");
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || data.message || "فشل العملية");
      }
      return data.data;
    } catch (e: any) {
      if (
        attempt < retries &&
        (e.message?.includes("502") ||
          e.message?.includes("503") ||
          e.message?.includes("fetch"))
      ) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
};

export const fetchEducationLogsApi = async (params: Record<string, any> = {}): Promise<{
  logs: any[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  actionDefinitions: Record<string, any>;
}> => {
  const url = new URL(api("logs"));
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "ALL") {
      url.searchParams.set(k, String(v));
    }
  });

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || "فشل جلب سجلات النظام التعليمي");
  }
  return {
    logs: data.data || [],
    pagination: data.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 },
    actionDefinitions: data.actionDefinitions || {},
  };
};

export const fetchEducationLogsStatsApi = async (): Promise<any> => {
  return await fetchJson(api("logs/stats"));
};

export const getEducationLogsExportUrl = (params: Record<string, any> = {}): string => {
  const url = new URL(api("logs/export"));
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "ALL") {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
};
