import { buildApiUrl } from "../../../utils/urlHelper";
import tokenManager from "../../../utils/tokenManager";
import { DemoDayEvent, DemoDayAttendee } from "./types";

export const getCompanyId = (): string | null => {
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
          return payload.companyId;
        }
      }
    }
  } catch {}

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
  } catch {}

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

export const demoDayApi = (path: string): string => {
  const base = buildApiUrl(`education/demo-day${path ? `/${path}` : ""}`);
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

export const fetchDemoDays = async (params: { status?: string; search?: string } = {}): Promise<DemoDayEvent[]> => {
  const url = new URL(demoDayApi(""));
  if (params.status && params.status !== "ALL") url.searchParams.set("status", params.status);
  if (params.search) url.searchParams.set("search", params.search);

  const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل جلب فعاليات الديمو داي");
  return data.data || [];
};

export const fetchDemoDayDetail = async (id: string): Promise<DemoDayEvent & { attendees: DemoDayAttendee[] }> => {
  const res = await fetch(demoDayApi(id), { headers: getAuthHeaders() });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل جلب تفاصيل الفعالية");
  return data.data;
};

export const saveDemoDay = async (body: Partial<DemoDayEvent>, id?: string): Promise<any> => {
  const url = id ? demoDayApi(id) : demoDayApi("");
  const method = id ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل حفظ الفعالية");
  return data.data;
};

export const deleteDemoDay = async (id: string): Promise<void> => {
  const res = await fetch(demoDayApi(id), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل حذف الفعالية");
};

export const registerAttendee = async (demoDayId: string, attendeeData: any): Promise<any> => {
  const res = await fetch(demoDayApi(`${demoDayId}/attendees`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(attendeeData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل تسجيل الحاضر");
  return data.data;
};

export const updateAttendeeStatus = async (
  attendeeId: string,
  update: { attendanceStatus?: string; conversionStatus?: string; notes?: string }
): Promise<void> => {
  const res = await fetch(demoDayApi(`attendees/${attendeeId}/status`), {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(update),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل تحديث حالة الحاضر");
};

export const convertAttendeeToStudent = async (
  attendeeId: string,
  convertData: { packageId?: string; teacherId?: string; amountPaid?: number }
): Promise<any> => {
  const res = await fetch(demoDayApi(`attendees/${attendeeId}/convert`), {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(convertData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل تحويل العميل المحتمل إلى طالب");
  return data.data;
};

export const deleteAttendee = async (attendeeId: string): Promise<void> => {
  const res = await fetch(demoDayApi(`attendees/${attendeeId}`), {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "فشل حذف الحاضر");
};

export const fetchEducationLookup = async (): Promise<{ subjects: any[]; teachers: any[]; packages: any[] }> => {
  const cid = getCompanyId();
  const q = cid ? `?companyId=${cid}` : "";
  const [subRes, teachRes, pkgRes] = await Promise.all([
    fetch(buildApiUrl(`education/subjects${q}`), { headers: getAuthHeaders() }),
    fetch(buildApiUrl(`education/teachers${q}`), { headers: getAuthHeaders() }),
    fetch(buildApiUrl(`education/packages${q}`), { headers: getAuthHeaders() }),
  ]);
  const subData = await subRes.json();
  const teachData = await teachRes.json();
  const pkgData = await pkgRes.json();
  return {
    subjects: subData.data || [],
    teachers: teachData.data || [],
    packages: pkgData.data || [],
  };
};
