import { useEffect, useState } from "react";
import type { TemplateButton } from "./types";

/**
 * ╪ú╪»┘ê╪º╪¬ ┘à╪│╪º╪╣╪»╪⌐ ┘à╪┤╪¬╪▒┘â╪⌐ ╪¿┘è┘å ┘å╪╖╪º┘é╪º╪¬ ╪╡┘ü╪¡╪⌐ TemplateCenter.
 * ┘â┘ä ╪º┘ä╪»┘ê╪º┘ä ┘ç┘å╪º pure (╪¿╪»┘ê┘å ╪¡╪º┘ä╪⌐) ΓÇö ╪│┘ç┘ä╪⌐ ╪º┘ä╪º╪«╪¬╪¿╪º╪▒ ┘ê╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä╪º╪│╪¬╪«╪»╪º┘à.
 */

export const META_BODY_CHAR_LIMIT = 1024;

const SAMPLE_VARIABLES: Record<string, string> = {
  customerName: "╪ú╪¡┘à╪» ┘à╪¡┘à╪»",
  orderNumber: "ORD-12345",
  customerPhone: "01001234567",
  total: "500",
  currency: "EGP",
  itemCount: "3",
  orderItems: "1. ╪¬┘è╪┤┘è╪▒╪¬ ╪ú╪¡┘à╪▒ | ╪º┘ä┘à┘é╪º╪│: L | ╪º┘ä┘â┘à┘è╪⌐: 2",
  status: "┘é┘è╪» ╪º┘ä╪¬╪¼┘ç┘è╪▓",
  trackingNumber: "TRK-98765",
  trackingLink: "https://maxp.online/track/TRK-98765",
  estimatedDays: "2-3",
};

/**
 * ┘è╪¡┘ä ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é┘è┘à ┘å┘à┘ê╪░╪¼┘è╪⌐ ╪╣╪┤╪º┘å ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪¬╪¿┘é┘ë ┘ê╪º┘é╪╣┘è╪⌐.
 * ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪║┘è╪▒ ╪º┘ä┘à╪╣╪▒┘ê┘ü╪⌐ ╪¬╪╕┘ç╪▒ ╪¿┘è┘å ╪ú┘é┘ê╪º╪│ [name].
 */
export function resolveVariablesForPreview(content: string): string {
  if (!content) return "";
  return content.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, name) => {
    return SAMPLE_VARIABLES[name] || `[${name}]`;
  });
}

/** ╪¬╪▒╪¬┘è╪¿ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è ┘ä╪¿┘å╪º╪í ┘à╪¡╪¬┘ê┘ë ┘à╪¡┘ä┘è ┘à┘å ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º */
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
 * ╪¿┘å╪º╪í ┘à╪¡╪¬┘ê┘ë ┘à╪¡┘ä┘è ╪¬┘ä┘é╪º╪ª┘è ┘à┘å ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º:
 * ╪¿┘è╪¡┘ê┘æ┘ä ┘â┘ä {{N}} ╪Ñ┘ä┘ë {{variable}} ┘à╪¡┘ä┘è ╪¡╪│╪¿ ╪¬╪▒╪¬┘è╪¿ ╪º┘ü╪¬╪▒╪º╪╢┘è.
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
 * ╪º╪│╪¬╪«╪▒╪º╪¼ ╪ú╪│┘à╪º╪í ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¡┘ä┘è╪⌐ ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪º┘ä┘ä┘è ╪¿╪¬╪╕┘ç╪▒ ╪¿┘è┘ç ┘ü┘è ╪º┘ä┘à╪¡╪¬┘ê┘ë.
 * ╪¿┘è╪¬┘à ╪º╪│╪¬╪«╪»╪º┘à┘ç ┘ä╪▒╪¿╪╖ ┘â┘ä ┘à╪¬╪║┘è╪▒ ┘à╪¡┘ä┘è {{customerName}} ╪¿╪▒┘é┘à ┘à┘è╪¬╪º {{1}}╪î {{2}}... ╪¿╪╡╪▒┘è╪º┘ï.
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

/** ╪º╪│╪¬╪«╪▒╪º╪¼ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪╡┘è╪║╪⌐ ╪º┘ä┘é┘ê╪│ ╪º┘ä┘ê╪º╪¡╪» (┘å╪╖╪º┘é ╪º┘ä╪╣┘à┘ä╪º╪í) */
export function extractSingleBraceVariables(content: string): string[] {
  const matches = content.match(/\{(\w+)\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1))));
}

/**
 * ╪¬╪¡┘ê┘è┘ä ╪╡┘è╪║╪⌐ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬: ┘è┘ê╪¡┘æ╪» ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪Ñ┘ä┘ë ╪º┘ä╪╡┘è╪║╪⌐ ╪º┘ä┘à╪╣╪¬┘à╪»╪⌐ ┘ä┘ä┘å╪╖╪º┘é.
 * ╪º┘ä╪ú┘ê╪▒╪»╪▒╪▓: {{var}} | ╪º┘ä╪╣┘à┘ä╪º╪í: {var}
 */
export function normalizeVariableSyntax(content: string, target: "double" | "single"): string {
  if (!content) return "";
  if (target === "double") {
    return content.replace(/\{(\w+)\}/g, "{{$1}}");
  }
  return content.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, "{$1}");
}

/**
 * ╪¡┘ä ┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿┘à╪╣╪º┘è┘å╪⌐ ╪¬╪╣╪¬┘à╪» ╪╣┘ä┘ë ╪º┘ä┘å╪╖╪º┘é (╪ú╪▓┘ê╪º╪¼ ┘é┘è┘à ┘à╪▒┘å╪⌐).
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
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

export const ORDER_VARIABLES = [
  { var: "{{customerName}}", desc: "╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä" },
  { var: "{{customerPhone}}", desc: "╪▒┘é┘à ┘ç╪º╪¬┘ü ╪º┘ä╪╣┘à┘è┘ä" },
  { var: "{{orderNumber}}", desc: "╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{orderDate}}", desc: "╪¬╪º╪▒┘è╪« ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{orderItems}}", desc: "╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ (╪º┘ä╪º╪│┘à╪î ╪º┘ä┘ä┘ê┘å╪î ╪º┘ä┘à┘é╪º╪│╪î ╪º┘ä┘â┘à┘è╪⌐)" },
  { var: "{{status}}", desc: "╪º╪│┘à ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘å╪╡┘è (┘à╪½╪º┘ä: ┘é┘è╪» ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐)" },
  { var: "{{total}}", desc: "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{subtotal}}", desc: "╪º┘ä┘à╪¼┘à┘ê╪╣ ╪º┘ä┘ü╪▒╪╣┘è" },
  { var: "{{shipping}}", desc: "┘é┘è┘à╪⌐ ╪º┘ä╪┤╪¡┘å" },
  { var: "{{currency}}", desc: "╪º┘ä╪╣┘à┘ä╪⌐ (┘à╪½╪º┘ä: EGP)" },
  { var: "{{trackingNumber}}", desc: "╪▒┘é┘à ╪º┘ä╪¬╪¬╪¿╪╣" },
  { var: "{{trackingLink}}", desc: "╪▒╪º╪¿╪╖ ╪¬╪¬╪¿╪╣ ╪º┘ä╪╖┘ä╪¿" },
  { var: "{{estimatedDays}}", desc: "╪º┘ä╪ú┘è╪º┘à ╪º┘ä╪¬┘é╪»┘è╪▒┘è╪⌐ ┘ä┘ä╪┤╪¡┘å" },
  { var: "{{reason}}", desc: "╪│╪¿╪¿ ╪º┘ä╪Ñ┘ä╪║╪º╪í ╪ú┘ê ╪º┘ä╪▒┘ü╪╢" },
];

/** ┘ê╪╡┘ü ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘â┘Ç Record ┘ä╪¼╪»┘ê┘ä ╪¬╪╖╪º╪¿┘é ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ */
export function buildVariableDescriptions(variables: { var: string; desc: string }[]): Record<string, string> {
  return variables.reduce((acc, v) => {
    const key = v.var.replace(/^\{\{|\}\}$/g, "").replace(/^\{|\}$/g, "").trim();
    acc[key] = v.desc;
    return acc;
  }, {} as Record<string, string>);
}

export const DEFAULT_TEMPLATE_CONTENT = `┘à╪▒╪¡╪¿╪º┘ï {{customerName}} ≡ƒæï

┘å┘ê╪» ╪Ñ╪╣┘ä╪º┘à┘â ╪ú┘å ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿┘â ╪▒┘é┘à {{orderNumber}} ┘é╪» ╪¬╪║┘è╪▒╪¬ ╪Ñ┘ä┘ë: *{{status}}*

{{orderItems}}
╪┤┘â╪▒╪º┘ï ┘ä╪¬╪╣╪º┘à┘ä┘â ┘à╪╣┘å╪º! Γ£¿`;

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
