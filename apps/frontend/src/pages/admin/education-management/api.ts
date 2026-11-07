import { buildApiUrl } from "../../../utils/urlHelper";
import tokenManager from "../../../utils/tokenManager";

export const getCompanyId = (): string | null => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}").companyId || null;
  } catch {
    return null;
  }
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
  const base = buildApiUrl(`customers/search?query=${encodeURIComponent(q)}`);
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
