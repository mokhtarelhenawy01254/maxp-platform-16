import { getApiUrl } from "@/config/environment";

export const PORTAL_TOKEN_KEY = "dental_portal_token";
export const PORTAL_DENTIST_KEY = "dental_portal_dentist";

export interface Dentist {
  id: string;
  name: string;
  clinicName?: string | null;
}

export type DentalCaseStatus =
  | "RECEIVED"
  | "DESIGN"
  | "MANUFACTURING"
  | "QC"
  | "READY"
  | "DELIVERED"
  | "CLOSED";

export type DentalCasePriority = "NORMAL" | "URGENT" | "STAT";

export interface DentalWorkType {
  id: string;
  name: string;
  category: string;
  price: number;
  leadTimeDays: number;
  isActive?: boolean;
}

export interface DentalPortalCase {
  id: string;
  caseNumber: string;
  workTypeName: string;
  status: DentalCaseStatus;
  priority: DentalCasePriority;
  dueDate: string;
  total: number;
  paid: number;
  remaining: number;
  createdAt: string;
}

export interface DentalCaseStage {
  id?: string;
  stageKey?: string;
  name: string;
  status: "pending" | "in_progress" | "done" | string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface DentalCaseAttachment {
  id?: string;
  fileName: string;
  storedName: string;
  kind?: string | null;
  url: string;
  uploadedAt?: string | null;
}

export interface DentalPayment {
  id: string;
  amount: number;
  method: string;
  paidAt: string;
}

export interface DentalInvoice {
  id: string;
  invoiceNumber: string;
  doctorName: string;
  total: number;
  paid: number;
  remaining: number;
  status: string;
  createdAt: string;
  payments?: DentalPayment[];
}

export interface DentalCaseDetail {
  case: DentalPortalCase & {
    patientName?: string | null;
    patientPhone?: string | null;
    teeth?: string | null;
    shade?: string | null;
    material?: string | null;
    notes?: string | null;
  };
  stages: DentalCaseStage[];
  attachments: DentalCaseAttachment[];
  invoices: DentalInvoice[];
  designReview?: string;
}

export interface DentalDashboardData {
  byStatus: Partial<Record<DentalCaseStatus, number>>;
  activeCount: number;
  readyCount: number;
  overdueCount: number;
  outstanding: number;
}

export interface CartLine {
  workTypeId: string;
  workTypeName: string;
  price: number;
  leadTimeDays?: number;
  unitsCount?: number;
  teeth?: string;
  shade?: string;
  material?: string;
}

export interface DentalOrderInput {
  items?: CartLine[];
  workTypeId?: string;
  unitsCount?: number;
  teeth?: string;
  shade?: string;
  material?: string;
  patientName?: string;
  patientPhone?: string;
  notes?: string;
}

export interface DentalOrderCreatedItem {
  id?: string;
  caseNumber: string;
  workTypeName?: string;
  total: number;
}

export interface DentalOrderResult {
  id?: string;
  caseNumber: string;
  total: number;
  created?: DentalOrderCreatedItem[];
  totalAll?: number;
}

export interface DentalLoginResult {
  token: string;
  dentist: Dentist;
}

export function getPortalToken(): string | null {
  return typeof window !== "undefined"
    ? window.localStorage.getItem(PORTAL_TOKEN_KEY)
    : null;
}

export function getStoredDentist(): Dentist | null {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(PORTAL_DENTIST_KEY)
        : null;
    return raw ? (JSON.parse(raw) as Dentist) : null;
  } catch {
    return null;
  }
}

export function savePortalAuth(token: string, dentist: Dentist): void {
  window.localStorage.setItem(PORTAL_TOKEN_KEY, token);
  window.localStorage.setItem(PORTAL_DENTIST_KEY, JSON.stringify(dentist));
}

export function clearPortalAuth(): void {
  window.localStorage.removeItem(PORTAL_TOKEN_KEY);
  window.localStorage.removeItem(PORTAL_DENTIST_KEY);
}

export const CART_STORAGE_KEY = "dental_cart";

export function getCart(): CartLine[] {
  try {
    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(CART_STORAGE_KEY)
        : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        !!line &&
        typeof line === "object" &&
        typeof (line as CartLine).workTypeId === "string",
    );
  } catch {
    return [];
  }
}

function notifyCartChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dental-cart-changed"));
  }
}

export function saveCart(list: CartLine[]): void {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(list));
  notifyCartChanged();
}

export function addToCart(line: CartLine): void {
  saveCart([...getCart(), line]);
}

export function removeFromCart(workTypeId: string): void {
  saveCart(getCart().filter((line) => line.workTypeId !== workTypeId));
}

export function clearCart(): void {
  window.localStorage.removeItem(CART_STORAGE_KEY);
  notifyCartChanged();
}

export function cartCount(): number {
  return getCart().length;
}

export const SHADE_OPTIONS = [
  "A1",
  "A2",
  "A3",
  "A4",
  "B1",
  "B2",
  "B3",
  "B4",
  "C1",
  "C2",
  "C3",
  "C4",
  "D2",
  "D3",
  "D4",
  "1M1",
  "1M2",
  "2L1",
  "2L2",
  "2L3",
  "2M1",
  "2M2",
  "2M3",
  "2R1",
  "2R2",
  "3L1",
  "3L2",
  "3L3",
  "3M1",
  "3M2",
  "3M3",
  "3R1",
  "3R2",
  "4L1",
  "4L2",
  "4L3",
  "4M1",
  "4M2",
  "4M3",
  "4R1",
  "4R2",
  "5M1",
  "5M2",
  "5M3",
  "تاني",
];

export const MATERIAL_OPTIONS = ["زيركون", "إيماكس", "برسلين", "معدن", "تاني"];

const PORTAL_BASE = `${getApiUrl()}/dental-lab/portal`;

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as Record<string, unknown>)["data"] as T;
  }
  return payload as T;
}

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const arr =
      obj["items"] ?? obj["workTypes"] ?? obj["cases"] ?? obj["invoices"];
    if (Array.isArray(arr)) return arr as T[];
  }
  return [];
}

async function portalFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getPortalToken();
  const isFormData = options.body instanceof FormData;
  const headers = new Headers(options.headers);
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${PORTAL_BASE}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const data = json as Record<string, unknown>;
    const msg = data["message"] ?? data["error"];
    throw new Error(
      typeof msg === "string" && msg ? msg : "حصل خطأ في الاتصال",
    );
  }
  return unwrapEnvelope<T>(json);
}

export async function dentalLogin(
  phone: string,
  pin: string,
): Promise<DentalLoginResult> {
  const res = await fetch(`${PORTAL_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, pin }),
  });
  const json = await res.json().catch(() => ({}));
  const payload = unwrapEnvelope<Record<string, unknown>>(json);
  const token = payload?.["token"];
  const dentist = payload?.["dentist"] as unknown;
  if (!res.ok || typeof token !== "string") {
    const msg = payload?.["message"] ?? payload?.["error"];
    throw new Error(
      typeof msg === "string" && msg ? msg : "بيانات الدخول غلط",
    );
  }
  return {
    token,
    dentist:
      dentist && typeof dentist === "object"
        ? (dentist as Dentist)
        : { id: "", name: "" },
  };
}

export async function getDashboard(): Promise<DentalDashboardData> {
  const data = await portalFetch<unknown>("/dashboard");
  const obj = (data && typeof data === "object" ? data : {}) as Record<
    string,
    unknown
  >;
  return {
    byStatus: (obj["byStatus"] ?? {}) as Partial<
      Record<DentalCaseStatus, number>
    >,
    activeCount: Number(obj["activeCount"] ?? 0),
    readyCount: Number(obj["readyCount"] ?? 0),
    overdueCount: Number(obj["overdueCount"] ?? 0),
    outstanding: Number(obj["outstanding"] ?? 0),
  };
}

export async function getCatalog(): Promise<DentalWorkType[]> {
  const items = asArray<DentalWorkType>(await portalFetch<unknown>("/catalog"));
  return items.filter((w) => w.isActive !== false);
}

export async function placeOrder(
  input: DentalOrderInput,
): Promise<DentalOrderResult> {
  return portalFetch<DentalOrderResult>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCases(): Promise<DentalPortalCase[]> {
  return asArray<DentalPortalCase>(await portalFetch<unknown>("/cases"));
}

function normalizeAttachment(
  a: Record<string, unknown>,
): DentalCaseAttachment {
  const storedName = typeof a["storedName"] === "string" ? a["storedName"] : "";
  const fileName =
    typeof a["fileName"] === "string" ? a["fileName"] : storedName || "ملف";
  const url =
    typeof a["url"] === "string" && a["url"]
      ? a["url"]
      : storedName
        ? `${getApiUrl()}/dental-lab/files/${storedName}`
        : "";
  return {
    id: typeof a["id"] === "string" ? a["id"] : undefined,
    fileName,
    storedName,
    kind: typeof a["kind"] === "string" ? a["kind"] : null,
    url,
    uploadedAt: typeof a["uploadedAt"] === "string" ? a["uploadedAt"] : null,
  };
}

export async function fetchAttachmentBlobPortal(storedName: string): Promise<Blob> {
  const token = getPortalToken();
  const res = await fetch(`${getApiUrl()}/dental-lab/files/${encodeURIComponent(storedName)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load file");
  return res.blob();
}

export async function getCase(id: string): Promise<DentalCaseDetail> {
  const raw = await portalFetch<unknown>(`/cases/${encodeURIComponent(id)}`);
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const caseData = (obj["case"] ?? obj) as DentalCaseDetail["case"];
  const stages = Array.isArray(obj["stages"])
    ? (obj["stages"] as DentalCaseStage[])
    : [];
  const attachments = Array.isArray(obj["attachments"])
    ? (obj["attachments"] as Record<string, unknown>[]).map(normalizeAttachment)
    : [];
  const invoices = Array.isArray(obj["invoices"])
    ? (obj["invoices"] as DentalInvoice[])
    : [];
  const designReview =
    typeof obj["designReview"] === "string" && obj["designReview"]
      ? obj["designReview"]
      : undefined;
  return { case: caseData, stages, attachments, invoices, designReview };
}

export function designReviewUrl(storedName: string): string {
  return `${getApiUrl()}/dental-lab/design-review/${encodeURIComponent(storedName)}`;
}

export async function fetchDesignReviewBlob(storedName: string): Promise<Blob> {
  const token = getPortalToken();
  const res = await fetch(designReviewUrl(storedName), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to load design review");
  return res.blob();
}

export async function submitDesignApproval(
  caseId: string,
  approved: boolean,
  note?: string,
): Promise<{ approved: boolean; note?: string }> {
  return (await portalFetch<unknown>(`/cases/${encodeURIComponent(caseId)}/design-approval`, {
    method: "POST",
    body: JSON.stringify({ approved, note }),
  })) as { approved: boolean; note?: string };
}

export async function uploadAttachment(
  caseId: string,
  file: File,
  kind?: string,
): Promise<DentalCaseAttachment> {
  const form = new FormData();
  form.append("file", file);
  if (kind) {
    form.append("kind", kind);
  }
  const raw = await portalFetch<unknown>(
    `/cases/${encodeURIComponent(caseId)}/attachments`,
    { method: "POST", body: form },
  );
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return normalizeAttachment(obj);
}

// Same infer logic as the admin side — matches backend ATTACHMENT_KINDS.
export function inferAttachmentKind(
  filename: string,
): "SCAN" | "PHOTO" | "PRESCRIPTION" | "OTHER" {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (["stl", "ply", "obj", "dcm"].includes(ext)) return "SCAN";
  if (["jpg", "jpeg", "png", "webp", "bmp", "tiff", "heic"].includes(ext))
    return "PHOTO";
  if (ext === "pdf") return "PRESCRIPTION";
  return "OTHER";
}

export interface PortalUploadResult {
  id?: string;
  fileName: string;
}

// Multi-file upload with real per-file progress (XMLHttpRequest). Uploads at
// most 3 files in parallel to avoid overloading the server with large STLs,
// mirroring the admin case-detail behaviour.
export async function uploadCaseFilesPortal(
  caseId: string,
  files: File[],
  kinds: (string | undefined)[],
  onProgress: (index: number, pct: number) => void,
): Promise<PortalUploadResult[]> {
  const token = getPortalToken();
  const results: PortalUploadResult[] = [];
  const CONCURRENCY = 3;
  let cursor = 0;
  const next = async (): Promise<void> => {
    while (cursor < files.length) {
      const i = cursor++;
      const file = files[i];
      const kind = (kinds[i] || "SCAN").toUpperCase();
      const form = new FormData();
      form.append("files", file);
      form.append("kinds", kind);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          "POST",
          `${PORTAL_BASE}/cases/${encodeURIComponent(caseId)}/attachments`,
        );
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.timeout = 600000; // 10 min per file (large STL on slow link)
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            onProgress(i, Math.round((ev.loaded * 100) / ev.total));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              const data = (json && json.data) || {};
              const att = Array.isArray(data) ? data[0] : data;
              results.push({
                id: (att && att.id) || undefined,
                fileName: file.name,
              });
            } catch {
              results.push({ fileName: file.name });
            }
            resolve();
          } else {
            reject(new Error(`رفع ${file.name} فشل (${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error(`تعذر رفع ${file.name}`));
        xhr.ontimeout = () => reject(new Error(`انتهت مهلة رفع ${file.name}`));
        xhr.send(form);
      });
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => next()),
  );
  return results;
}

export async function getInvoices(): Promise<DentalInvoice[]> {
  return asArray<DentalInvoice>(await portalFetch<unknown>("/invoices"));
}

export async function fetchWorkOrderPdfPortal(caseId: string): Promise<Blob> {
  const token = getPortalToken();
  const res = await fetch(
    `${getApiUrl()}/dental-lab/portal/cases/${encodeURIComponent(
      caseId,
    )}/work-order`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const data = json as Record<string, unknown>;
    const msg = data["message"] ?? data["error"];
    throw new Error(
      typeof msg === "string" && msg ? msg : "قدرش يحمل ورقة الشغل",
    );
  }
  return res.blob();
}

export interface StatusVisual {
  label: string;
  pill: string;
}

export const CASE_STATUS_CONFIG: Record<DentalCaseStatus, StatusVisual> = {
  RECEIVED: { label: "وصل", pill: "bg-sky-100 text-sky-800" },
  DESIGN: { label: "تصميم", pill: "bg-violet-100 text-violet-800" },
  MANUFACTURING: { label: "تصنيع", pill: "bg-amber-100 text-amber-800" },
  QC: { label: "فحص جودة", pill: "bg-cyan-100 text-cyan-800" },
  READY: { label: "جاهزة للتسليم", pill: "bg-green-100 text-green-800" },
  DELIVERED: { label: "اتسلمت", pill: "bg-blue-100 text-blue-800" },
  CLOSED: { label: "مقفولة", pill: "bg-gray-100 text-gray-700" },
};

export const PRIORITY_CONFIG: Record<DentalCasePriority, StatusVisual> = {
  NORMAL: { label: "عادي", pill: "bg-gray-100 text-gray-600" },
  URGENT: { label: "مستعجل", pill: "bg-orange-100 text-orange-800" },
  STAT: { label: "استعجالي جداً", pill: "bg-red-100 text-red-800" },
};

export function statusVisual(status: string): StatusVisual {
  return (
    CASE_STATUS_CONFIG[status as DentalCaseStatus] ?? {
      label: status || "—",
      pill: "bg-gray-100 text-gray-700",
    }
  );
}

export function priorityVisual(priority: string): StatusVisual {
  return (
    PRIORITY_CONFIG[priority as DentalCasePriority] ?? {
      label: priority || "—",
      pill: "bg-gray-100 text-gray-600",
    }
  );
}

export function formatCurrency(value: number): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  return `${num.toLocaleString("ar-EG")} ج.م`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}