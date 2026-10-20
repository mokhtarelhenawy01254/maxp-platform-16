import { useEffect, useState } from "react";
import type { TemplateButton } from "./types";

/**
 * أدوات مساعدة مشتركة بين نطاقات صفحة TemplateCenter.
 * كل الدوال هنا pure (بدون حالة) — سهلة الاختبار وإعادة الاستخدام.
 */

export const META_BODY_CHAR_LIMIT = 1024;

const SAMPLE_VARIABLES: Record<string, string> = {
  customerName: "أحمد محمد",
  orderNumber: "ORD-12345",
  customerPhone: "01001234567",
  total: "500",
  currency: "EGP",
  itemCount: "3",
  orderItems: "1. تيشيرت أحمر | المقاس: L | الكمية: 2",
  status: "قيد التجهيز",
  trackingNumber: "TRK-98765",
  trackingLink: "https://maxp.online/track/TRK-98765",
  estimatedDays: "2-3",
};

/**
 * يحل متغيرات القالب بقيم نموذجية عشان المعاينة تبقى واقعية.
 * المتغيرات غير المعروفة تظهر بين أقواس [name].
 */
export function resolveVariablesForPreview(content: string): string {
  if (!content) return "";
  return content.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, name) => {
    return SAMPLE_VARIABLES[name] || `[${name}]`;
  });
}

/** ترتيب المتغيرات الافتراضي لبناء محتوى محلي من نص قالب ميتا */
export const META_TO_LOCAL_DEFAULT_ORDER: string[] = [
  "customerName",
  "orderNumber",
  "orderItems",
  "total",
  "currency",
  "customerPhone",
  "orderDate",
  "subtotal",
  "shipping",
  "trackingNumber",
  "trackingLink",
  "estimatedDays",
  "reason",
];

/**
 * بناء محتوى محلي تلقائي من نص قالب ميتا:
 * بيحوّل كل {{N}} إلى {{variable}} محلي حسب ترتيب افتراضي.
 */
export function buildLocalContentFromMetaBody(metaBody: string): string {
  if (!metaBody) return "";
  return metaBody.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
    const idx = parseInt(n, 10) - 1;
    const name = META_TO_LOCAL_DEFAULT_ORDER[idx];
    return name ? `{{${name}}}` : `{{${n}}}`;
  });
}

/**
 * استخراج أسماء المتغيرات المحلية بالترتيب اللي بتظهر بيه في المحتوى.
 * بيتم استخدامه لربط كل متغير محلي {{customerName}} برقم ميتا {{1}}، {{2}}... بصرياً.
 */
export function extractLocalVariableOrder(content: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[1];
    if (!name) continue;
    if (!seen.has(name)) {
      seen.add(name);
      order.push(name);
    }
  }
  return order;
}

/** استخراج المتغيرات بصيغة القوس الواحد (نطاق العملاء) */
export function extractSingleBraceVariables(content: string): string[] {
  const matches = content.match(/\{(\w+)\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1))));
}

/**
 * تحويل صيغة المتغيرات: يوحّد المحتوى إلى الصيغة المعتمدة للنطاق.
 * الأوردرز: {{var}} | العملاء: {var}
 */
export function normalizeVariableSyntax(content: string, target: "double" | "single"): string {
  if (!content) return "";
  if (target === "double") {
    return content.replace(/\{(\w+)\}/g, "{{$1}}");
  }
  return content.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, "{$1}");
}

/**
 * حل متغيرات بمعاينة تعتمد على النطاق (أزواج قيم مرنة).
 */
export function resolveVariablesCustom(content: string, sample: Record<string, string>): string {
  if (!content) return "";
  return content.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, name) => {
    return sample[name] || `[${name}]`;
  });
}

function inferButtonAction(id?: string): string {
  const nid = String(id || "").toLowerCase();
  const setMatch = nid.match(/^set_status_(.+)_(.+)$/);
  if (setMatch?.[1]) return setMatch[1].toUpperCase();
  if (nid.includes("confirm")) return "CONFIRMED";
  if (nid.includes("cancel")) return "CANCELLED";
  if (nid.includes("delay") || nid.includes("postpone")) return "PROCESSING";
  return "CONFIRMED";
}

export function parseTemplateButtons(raw?: string): TemplateButton[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) {
      console.warn("[TEMPLATE-BUTTONS] buttons data is not an array:", raw);
      return [];
    }
    return arr
      .map((b: any) => ({
        id: String(b?.id || ""),
        text: String(b?.text || ""),
        action: b?.action ? String(b.action).toUpperCase() : inferButtonAction(b?.id),
      }))
      .filter((b) => b.id || b.text);
  } catch (e) {
    console.warn("[TEMPLATE-BUTTONS] Failed to parse buttons JSON:", (e as Error)?.message);
    return [];
  }
}

export function timeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export const ORDER_VARIABLES = [
  { var: "{{customerName}}", desc: "اسم العميل" },
  { var: "{{customerPhone}}", desc: "رقم هاتف العميل" },
  { var: "{{orderNumber}}", desc: "رقم الطلب" },
  { var: "{{orderDate}}", desc: "تاريخ الطلب" },
  { var: "{{orderItems}}", desc: "تفاصيل المنتجات (الاسم، اللون، المقاس، الكمية)" },
  { var: "{{status}}", desc: "اسم الحالة النصي (مثال: قيد المعالجة)" },
  { var: "{{total}}", desc: "إجمالي الطلب" },
  { var: "{{subtotal}}", desc: "المجموع الفرعي" },
  { var: "{{shipping}}", desc: "قيمة الشحن" },
  { var: "{{currency}}", desc: "العملة (مثال: EGP)" },
  { var: "{{trackingNumber}}", desc: "رقم التتبع" },
  { var: "{{trackingLink}}", desc: "رابط تتبع الطلب" },
  { var: "{{estimatedDays}}", desc: "الأيام التقديرية للشحن" },
  { var: "{{reason}}", desc: "سبب الإلغاء أو الرفض" },
];

/** وصف المتغيرات كـ Record لجدول تطابق المتغيرات */
export function buildVariableDescriptions(variables: { var: string; desc: string }[]): Record<string, string> {
  return variables.reduce((acc, v) => {
    const key = v.var.replace(/^\{\{|\}\}$/g, "").replace(/^\{|\}$/g, "").trim();
    acc[key] = v.desc;
    return acc;
  }, {} as Record<string, string>);
}

export const DEFAULT_TEMPLATE_CONTENT = `مرحباً {{customerName}} 👋

نود إعلامك أن حالة طلبك رقم {{orderNumber}} قد تغيرت إلى: *{{status}}*

{{orderItems}}
شكراً لتعاملك معنا! ✨`;

export const INCOMPLETE_CART_EVENT_TYPE = "INCOMPLETE_CART_FIRST_APPEARANCE";

export const ORDER_STATUS_TO_EVENT_TYPE: Record<string, string> = {
  CONFIRMED: "ORDER_CONFIRMED",
  PROCESSING: "ORDER_PROCESSING",
  SHIPPED: "ORDER_SHIPPED",
  OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
  RETURNED: "ORDER_RETURNED",
  PARTIALLY_RETURNED: "ORDER_RETURNED",
  REFUNDED: "ORDER_REFUNDED",
  PARTIALLY_REFUNDED: "PARTIAL_REFUND",
  EXCHANGED: "ORDER_RETURNED",
};

export const DEFAULT_BUTTON_ACTIONS: { value: string; label: string }[] = [
  { value: "CONFIRMED", label: "تأكيد الطلب" },
  { value: "PROCESSING", label: "تأجيل التسليم" },
  { value: "CANCELLED", label: "إلغاء الطلب" },
];

export function formatWhatsAppText(text: string): string {
  return text.trim();
}

/**
 * يختار لون نص مقروء (أسود/أبيض) حسب سطوع خلفية الشارة — يضمن تباين WCAG AA
 * يدعم #RGB و #RRGGBB و #RRGGBBAA (يتجاهل alpha)
 */
export function readableTextColor(hex: string): string {
  let c = (hex || "#6B7280").replace("#", "").trim();
  if (c.length === 3) c = c.split("").map((ch) => ch + ch).join("");
  if (c.length === 4) c = c.slice(0, 3).split("").map((ch) => ch + ch).join("");
  if (c.length === 8) c = c.slice(0, 6);
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#ffffff";
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.179 ? "#0f172a" : "#ffffff";
}

