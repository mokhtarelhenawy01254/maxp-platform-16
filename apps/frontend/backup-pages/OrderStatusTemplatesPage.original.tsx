import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from "react";
import { apiClient } from "../../services/apiClient";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  BellIcon,
  BellSlashIcon,
  ChevronDownIcon,
  GlobeAltIcon,
  Cog6ToothIcon,
  ClockIcon,
  BoltIcon,
  ArrowPathIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/common/ConfirmDialog";

// ╪¡╪» Meta Cloud API ┘ä╪╖┘ê┘ä ┘å╪╡ ╪º┘ä╪▒╪│╪º┘ä╪⌐ (body) ΓÇö ╪¬╪¼╪º┘ê╪▓┘ç ┘è╪│╪¿╪¿ ╪▒┘ü╪╢ ╪º┘ä┘é╪º┘ä╪¿
const META_BODY_CHAR_LIMIT = 1024;

const INCOMPLETE_CART_EVENT_TYPE = "INCOMPLETE_CART_FIRST_APPEARANCE";

interface Template {
  id: string;
  name: string;
  content: string;
  eventType: string;
  isActive: boolean;
  buttons?: string;
  hasButtons?: boolean;
  channel?: string;
  headerFormat?: string | null;
  headerMediaHandle?: string | null;
  headerUsesOrderProduct?: boolean | null;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
  metaTemplateLanguage?: string | null;
}

interface StatusWithTemplate {
  id: string;
  code: string;
  name: string;
  color: string;
  sortOrder: number;
  statusType: string;
  notifyCustomer: boolean;
  isSystemStatus: boolean;
  template: Template | null;
  metaTemplate?: Template | null;
  hasTemplate: boolean;
  hasMetaTemplate?: boolean;
  isNonNotifiable?: boolean;
  updatedAt?: string;
}

interface MetaAvailableTemplate {
  name: string;
  status: string;
  language?: string;
  category?: string;
  components?: Array<{ type: string; text?: string }> | null;
  boundToLocalTemplateId?: string | null;
  boundToEventType?: string | null;
  boundToLocalTemplateIds?: string[];
  boundToEventTypes?: string[];
}

interface DeliveryPreviewItem {
  templateId: string;
  eventType: string;
  provider: string | null;
  deliveryStatus: string;
  riskLevel: "none" | "warning" | "danger";
  message: string;
  metaTemplateName?: string | null;
  metaTemplateStatus?: string | null;
}

interface DefaultSessionInfo {
  id: string;
  name: string;
  provider: string;
  phoneNumber?: string;
}

interface TemplateButton {
  id: string;
  text: string;
  action: string;
}

interface TemplateFormState {
  name: string;
  content: string;
  isActive: boolean;
  hasButtons: boolean;
  buttons: TemplateButton[];
  sendMode: "direct" | "bind_meta";
  metaTemplateName: string;
  metaTemplateLanguage: string;
  headerFormat: string;
  headerMediaHandle: string;
  headerMediaName: string;
  headerUsesOrderProduct: boolean;
}

interface SettingsForm {
  isEnabled: boolean;
  orderNotificationsEnabled: boolean;
  defaultSessionId: string | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  rateLimitPerMinute: number;
  stickySessionEnabled: boolean;
}

const emptyTemplateForm = (): TemplateFormState => ({
  name: "",
  content: "",
  isActive: true,
  hasButtons: true,
  buttons: [
    { id: "confirm", text: "╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒", action: "CONFIRMED" },
    { id: "cancel", text: "╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒", action: "CANCELLED" }
  ],
  sendMode: "direct",
  metaTemplateName: "",
  metaTemplateLanguage: "ar",
  headerFormat: "TEXT",
  headerMediaHandle: "",
  headerMediaName: "",
  headerUsesOrderProduct: false,
});

const DEFAULT_TEMPLATE_CONTENT = `┘à╪▒╪¡╪¿╪º┘ï {{customerName}} ≡ƒæï

┘å┘ê╪» ╪Ñ╪╣┘ä╪º┘à┘â ╪ú┘å ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿┘â ╪▒┘é┘à {{orderNumber}} ┘é╪» ╪¬╪║┘è╪▒╪¬ ╪Ñ┘ä┘ë: *{{status}}*

{{orderItems}}
╪┤┘â╪▒╪º┘ï ┘ä╪¬╪╣╪º┘à┘ä┘â ┘à╪╣┘å╪º! Γ£¿`;

const ORDER_VARIABLES = [
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

const TABS = [
  { key: "all", labelKey: "orders.statusTabs.all", label: "╪º┘ä┘â┘ä" },
  { key: "order", labelKey: "orders.statusTabs.orders", label: "╪º┘ä╪╖┘ä╪¿╪º╪¬" },
  { key: "payment", labelKey: "orders.statusTabs.payment", label: "╪º┘ä╪»┘ü╪╣" },
  { key: "preparation", labelKey: "orders.statusTabs.preparation", label: "╪º┘ä╪¬╪¼┘ç┘è╪▓" },
  { key: "shipping", labelKey: "orders.statusTabs.shipping", label: "╪º┘ä╪┤╪¡┘å" },
  { key: "incomplete", labelKey: "orders.statusTabs.incomplete", label: "╪▒╪│╪º╪ª┘ä ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪║┘è╪▒ ╪º┘ä┘à┘â╪¬┘à┘ä" },
  { key: "reports", labelKey: "orders.statusTabs.reports", label: "╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪¡╪º┘ä╪º╪¬" },
];

const DEFAULT_BUTTON_ACTIONS: { value: string; label: string }[] = [
  { value: "CONFIRMED", label: "╪¬╪ú┘â┘è╪» ╪º┘ä╪╖┘ä╪¿" },
  { value: "PROCESSING", label: "╪¬╪ú╪¼┘è┘ä ╪º┘ä╪¬╪│┘ä┘è┘à" },
  { value: "CANCELLED", label: "╪Ñ┘ä╪║╪º╪í ╪º┘ä╪╖┘ä╪¿" },
];

const LARGE_GROUP_THRESHOLD = 4;

type FilterChip = "all" | "custom" | "meta_bound" | "no_template" | "disabled";
type SortMode = "alphabetical" | "statusType" | "recent";

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

function resolveVariablesForPreview(content: string): string {
  if (!content) return "";
  return content.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, name) => {
    return SAMPLE_VARIABLES[name] || `[${name}]`;
  });
}

/**
 * ╪╣╪▒╪╢ ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º (╪º┘ä┘ä┘è ┘ü┘è┘ç {{1}}╪î {{2}}...) ╪¿┘é┘è┘à ┘å┘à┘ê╪░╪¼┘è╪⌐ ΓÇö
 * ╪¿┘è╪▒╪¿╪╖ ┘â┘ä ╪▒┘é┘à ┘à┘è╪¬╪º ╪¿╪º┘ä┘à╪¬╪║┘è╪▒ ╪º┘ä┘à╪¡┘ä┘è ╪º┘ä┘à╪╖╪º╪¿┘é ╪¡╪│╪¿ ╪¬╪▒╪¬┘è╪¿ ╪º┘ä╪╕┘ç┘ê╪▒.
 */
function resolveMetaBodyPreview(metaBody: string, localContent: string): string {
  if (!metaBody) return "";
  const localVars = extractLocalVariableOrder(localContent);
  return metaBody.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const idx = parseInt(n, 10) - 1;
    const v = localVars[idx];
    return v ? (SAMPLE_VARIABLES[v] || `[${v}]`) : `[${n}]`;
  });
}

/**
 * ╪¬╪▒╪¬┘è╪¿ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è ┘ä╪¿┘å╪º╪í ┘à╪¡╪¬┘ê┘ë ┘à╪¡┘ä┘è ┘à┘å ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º
 * ({{1}} ΓåÆ {{customerName}}╪î {{2}} ΓåÆ {{orderNumber}}...)
 * ┘à╪¿┘è╪¬╪│┘ê┘æ┘ë╪┤ ┘à╪╣ ╪ú┘è ┘é╪º┘ä╪¿ ΓÇö ╪º┘ä┘à╪│╪¬╪«╪»┘à ┘è┘é╪»╪▒ ┘è╪╣╪»┘æ┘ä┘ç╪î ╪¿╪│ ╪¿┘è╪║╪╖┘è ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪┤╪º╪ª╪╣╪⌐.
 */
const META_TO_LOCAL_DEFAULT_ORDER: string[] = [
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
 * ╪¿┘è╪¡┘ê┘æ┘ä ┘â┘ä {{N}} ┘ü┘è ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪Ñ┘ä┘ë {{variable}} ┘à╪¡┘ä┘è ╪¡╪│╪¿ ╪¬╪▒╪¬┘è╪¿ ╪º┘ü╪¬╪▒╪º╪╢┘è╪î
 * ┘ê╪¿┘è┘é┘ü┘ä ╪╣┘ä┘ë {{N}} ╪º┘ä┘ä┘è ╪╣╪»╪»┘ç╪º ╪ú┘â╪¬╪▒ ┘à┘å ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐ (┘à╪┤ ╪¿┘è╪¡╪░┘ü ╪º┘ä┘å╪╡).
 */
function buildLocalContentFromMetaBody(metaBody: string): string {
  if (!metaBody) return "";
  return metaBody.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
    const idx = parseInt(n, 10) - 1;
    const name = META_TO_LOCAL_DEFAULT_ORDER[idx];
    return name ? `{{${name}}}` : `{{${n}}}`;
  });
}

export { resolveVariablesForPreview, buildLocalContentFromMetaBody };

/**
 * WhatsAppBubblePreview ΓÇö ┘à╪╣╪º┘è┘å╪⌐ ┘à╪¿╪º╪┤╪▒╪⌐ ┘ä╪┤┘â┘ä ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘ü┘è ┘à╪¡╪º╪»╪½╪⌐ ┘ê╪º╪¬╪│╪º╪¿.
 * ╪¿╪¬╪▒╪│┘à bubble ╪ú╪«╪╢╪▒ ╪¿┘Ç timestamp ┘ê┘à╪¬╪║┘è╪▒╪º╪¬ ┘à╪¡┘ä┘ê┘ä╪⌐ + ╪º┘ä╪ú╪▓╪▒╪º╪▒ ╪º┘ä╪¬┘ü╪º╪╣┘ä┘è╪⌐.
 */
interface WhatsAppBubblePreviewProps {
  content: string;
  buttons: TemplateButton[];
  hasButtons: boolean;
}

function formatWhatsAppText(text: string): string {
  return text.trim();
}

export function WhatsAppBubblePreview({ content, buttons, hasButtons }: WhatsAppBubblePreviewProps) {
  const resolved = resolveVariablesForPreview(content);
  const now = new Date();
  const time = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const visibleButtons = hasButtons ? buttons.filter((b) => b.text.trim()) : [];

  return (
    <div
      data-testid="whatsapp-preview"
      className="relative ml-auto w-[88%] max-w-[340px] rounded-xl rounded-bl-sm bg-[#dcf8c6] p-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100"
      dir="auto"
    >
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[#34b7f1] dark:text-sky-300">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M11.071.653a.5.5 0 0 1 .076.704l-6 7.5a.5.5 0 0 1-.762.026L2.146 6.16a.5.5 0 1 1 .708-.706l1.864 1.864 5.65-7.06a.5.5 0 0 1 .703-.075z" fill="currentColor"/>
          <path d="M15.071.653a.5.5 0 0 1 .076.704l-6 7.5a.5.5 0 0 1-.762.026l-.5-.5.707-.707.13.13 5.65-7.06a.5.5 0 0 1 .7-.075z" fill="currentColor"/>
        </svg>
      </div>

      <p className="whitespace-pre-wrap break-words pr-5 font-[system-ui]">
        {formatWhatsAppText(resolved) || (
          <span className="text-slate-400 dark:text-slate-500">┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪│╪¬╪╕┘ç╪▒ ┘ç┘å╪º...</span>
        )}
      </p>

      <p className="mt-1 pl-5 text-right text-[10px] text-slate-500 dark:text-slate-400">{time}</p>

      {visibleButtons.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-black/5 pt-1.5 dark:border-white/10">
          {visibleButtons.map((b, i) => (
            <div
              key={b.id || i}
              className="rounded-md bg-white/70 py-1.5 text-center text-[12px] font-medium text-[#34b7f1] dark:bg-white/10 dark:text-sky-300"
            >
              {b.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function isCustomContent(status: StatusWithTemplate): boolean {
  const GENERIC_PATTERN = /╪¬┘à ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪╖┘ä╪¿┘â ╪Ñ┘ä┘ë/;
  return !!status.template?.content && !GENERIC_PATTERN.test(status.template.content);
}

type TemplateSlot = "regular" | "meta";

/**
 * ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪╣╪▒┘ê╪╢ ┘ü┘è slot ┘à┘è╪¬╪º:
 * ┘é╪º┘ä╪¿ ┘é┘å╪º╪⌐ META_CLOUD (╪º┘ä┘å┘à┘ê╪░╪¼ ╪º┘ä╪¼╪»┘è╪») ╪ú┘ê ╪¬┘ê╪º┘ü┘é ┘é╪»┘è┘à:
 * ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º╪»┘è ╪º┘ä┘ä┘è ╪╣┘ä┘è┘ç ╪▒╪¿╪╖ ┘à┘è╪¬╪º (channel ┘é╪»┘è┘à ╪¿╪»┘ê┘å META_CLOUD).
 */
function getMetaSlotTemplate(status: StatusWithTemplate): Template | null {
  if (status.metaTemplate) return status.metaTemplate;
  if (status.template?.metaTemplateName && String(status.template.channel || "").toUpperCase() !== "META_CLOUD") {
    return status.template;
  }
  return null;
}

function metaSlotIsLegacy(status: StatusWithTemplate): boolean {
  return !status.metaTemplate && !!status.template?.metaTemplateName;
}

function isMetaTemplateBound(tpl?: Template | null): boolean {
  return !!tpl?.metaTemplateName;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
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

function inferButtonAction(id?: string): string {
  const nid = String(id || "").toLowerCase();
  const setMatch = nid.match(/^set_status_(.+)_(.+)$/);
  if (setMatch) return setMatch[1].toUpperCase();
  if (nid.includes("confirm")) return "CONFIRMED";
  if (nid.includes("cancel")) return "CANCELLED";
  if (nid.includes("delay") || nid.includes("postpone")) return "PROCESSING";
  return "CONFIRMED";
}

function timeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function parseTemplateButtons(raw?: string): TemplateButton[] {
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
    // ≡ƒöÄ ┘å┘Å╪│╪¼┘æ┘ä ╪º┘ä╪«╪╖╪ú ╪╣╪┤╪º┘å ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪ú╪▓╪▒╪º╪▒ ╪º┘ä┘ü╪º╪│╪»╪⌐ ┘à╪º ╪¬╪«╪¬┘ü┘è╪┤ ╪¿╪╡┘à╪¬ ╪ú╪½┘å╪º╪í ╪º┘ä╪¬╪╖┘ê┘è╪▒
    console.warn("[TEMPLATE-BUTTONS] Failed to parse buttons JSON:", (e as Error)?.message);
    return [];
  }
}

/**
 * ╪º╪│╪¬╪«╪▒╪º╪¼ ╪ú╪│┘à╪º╪í ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¡┘ä┘è╪⌐ ╪¿╪º┘ä╪¬╪▒╪¬┘è╪¿ ╪º┘ä┘ä┘è ╪¿╪¬╪╕┘ç╪▒ ╪¿┘è┘ç ┘ü┘è ╪º┘ä┘à╪¡╪¬┘ê┘ë.
 * ╪¿┘è╪¬┘à ╪º╪│╪¬╪«╪»╪º┘à┘ç ┘ä╪▒╪¿╪╖ ┘â┘ä ┘à╪¬╪║┘è╪▒ ┘à╪¡┘ä┘è {{customerName}} ╪¿╪▒┘é┘à ┘à┘è╪¬╪º {{1}}╪î {{2}}... ╪¿╪╡╪▒┘è╪º┘ï.
 */
function extractLocalVariableOrder(content: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      order.push(m[1]);
    }
  }
  return order;
}

const VARIABLE_DESCRIPTIONS: Record<string, string> = ORDER_VARIABLES.reduce(
  (acc, v) => {
    const key = v.var.replace(/^\{\{|\}\}$/g, "").trim();
    acc[key] = v.desc;
    return acc;
  },
  {} as Record<string, string>,
);

export default function OrderStatusTemplatesPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("all");

  const [statuses, setStatuses] = useState<StatusWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusWithTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSlot, setDialogSlot] = useState<TemplateSlot>("regular");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "switch">("create");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [showLocalRef, setShowLocalRef] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm());
  const [headerUploading, setHeaderUploading] = useState(false);

  const [metaSessions, setMetaSessions] = useState<{ id: string; name: string; metaDisplayPhoneNumber?: string }[]>([]);
  const [selectedMetaSession, setSelectedMetaSession] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resubmittingMeta, setResubmittingMeta] = useState(false);
  const [availableMetaTemplates, setAvailableMetaTemplates] = useState<MetaAvailableTemplate[]>([]);
  const [loadingMetaTemplates, setLoadingMetaTemplates] = useState(false);
  const [bindingId, setBindingId] = useState<string | null>(null);
  const [originalMetaTemplateName, setOriginalMetaTemplateName] = useState<string>("");
  const [metaAutoFilled, setMetaAutoFilled] = useState(false);
  const [unbindTarget, setUnbindTarget] = useState<StatusWithTemplate | null>(null);

  // ΓÜí Cache ╪¼┘ä╪│╪º╪¬ ╪º┘ä┘à┘è╪¬╪º (TTL 30 ╪½╪º┘å┘è╪⌐) ΓÇö ┘à┘å╪╣ refetch ╪╣┘å╪» ┘ü╪¬╪¡ dialogs ┘à╪¬╪¬╪º┘ä┘è╪⌐
  const metaSessionsCacheRef = useRef<{ data: typeof metaSessions; at: number } | null>(null);
  // ΓÜí ┘å╪╣┘è╪» ╪¼┘ä╪¿ ╪º┘ä┘Ç preview ╪¿╪╣╪» ╪Ñ╪║┘ä╪º┘é ╪º┘ä╪»┘è╪º┘ä┘ê╪¼ ┘ü┘é╪╖ ┘ä┘ê ╪¡╪╡┘ä ╪¬╪╣╪»┘è┘ä ┘ü╪╣┘ä┘è
  const dialogDirtyRef = useRef(false);

  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [settingsSessions, setSettingsSessions] = useState<{ id: string; name: string; phoneNumber?: string; status: string; provider?: string }[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [deliveryPreview, setDeliveryPreview] = useState<Record<string, DeliveryPreviewItem>>({});
  const [defaultSessionInfo, setDefaultSessionInfo] = useState<DefaultSessionInfo | null>(null);
  const [syncingStatus, setSyncingStatus] = useState(false);

  const [showInternal, setShowInternal] = useState(false);
  const [activeChip, setActiveChip] = useState<FilterChip>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("statusType");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const isMobile = useMediaQuery("(max-width: 640px)");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/order-status/with-templates");
      if (res.data?.success) {
        setStatuses(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch statuses with templates", err);
      toast.error(t("orders.loadError", "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¿┘è╪º┘å╪º╪¬"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await apiClient.get("/whatsapp/notifications/settings");
      if (res.data?.success) {
        setSettings(res.data.settings);
        setSettingsSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const fetchDeliveryPreview = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp-notifications/templates/delivery-preview");
      const data = res.data as { success?: boolean; defaultSession?: DefaultSessionInfo | null; preview?: DeliveryPreviewItem[] };
      if (data?.success) {
        setDefaultSessionInfo(data.defaultSession || null);
        const map: Record<string, DeliveryPreviewItem> = {};
        for (const item of data.preview || []) {
          map[item.eventType] = item;
        }
        setDeliveryPreview(map);
      }
    } catch (err) {
      // silent fail ΓÇö ╪º┘ä┘Ç preview ┘à┘è╪▓╪⌐ ┘à╪│╪º╪╣╪»╪⌐
      console.error("Failed to fetch delivery preview", err);
    }
  }, []);

  useEffect(() => {
    document.title = `${t("orders.statusTemplatesTitle", "┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪¡╪º┘ä╪º╪¬")} | MaxP`;
    // ΓÜí Promise.allSettled: ┘å╪¼┘à╪╣ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪│╪¬┘é┘ä╪⌐ ┘ä╪¬╪¼┘å╪¿ waterfall ┘ê╪Ñ╪«┘ü╪º╪í ╪º┘ä┘Ç loading ╪«╪º╪╖╪ª
    Promise.allSettled([fetchData(), fetchSettings(), fetchDeliveryPreview()]);
  }, [fetchData, fetchSettings, fetchDeliveryPreview, t]);

  // ┘å╪╣┘è╪» ╪¼┘ä╪¿ ╪º┘ä┘Ç preview ╪¿╪╣╪» ╪Ñ╪║┘ä╪º┘é ╪º┘ä╪»┘è╪º┘ä┘ê╪¼ ┘ü┘é╪╖ ┘ä┘ê ╪¡╪╡┘ä ╪¬╪╣╪»┘è┘ä ┘ü╪╣┘ä┘è (┘ê┘ä┘è╪│ "╪Ñ┘ä╪║╪º╪í" ╪¿╪»┘ê┘å ╪¬╪║┘è┘è╪▒)
  useEffect(() => {
    if (dialogOpen === false) {
      if (dialogDirtyRef.current) {
        fetchDeliveryPreview();
        dialogDirtyRef.current = false;
      }
    }
  }, [dialogOpen, fetchDeliveryPreview]);

  const openCreateDialog = (status: StatusWithTemplate, slot: TemplateSlot) => {
    setSelectedStatus(status);
    setSelectedTemplate(null);
    setDialogSlot(slot);
    setDialogMode("create");
    setOriginalMetaTemplateName("");
    setMetaAutoFilled(false);
    setTemplateForm({
      name: slot === "meta" ? `┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ${status.name}` : `┘é╪º┘ä╪¿ ${status.name}`,
      content: slot === "meta" && status.template?.content ? status.template.content : DEFAULT_TEMPLATE_CONTENT,
      isActive: true,
      hasButtons: true,
      buttons: [
        { id: "confirm", text: "╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒", action: "CONFIRMED" },
        { id: "cancel", text: "╪Ñ┘ä╪║╪º╪í ╪º┘ä╪ú┘ê╪▒╪»╪▒", action: "CANCELLED" }
      ],
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: "",
      metaTemplateLanguage: "ar",
      headerFormat: slot === "meta" ? "IMAGE" : "TEXT",
      headerMediaHandle: "",
      headerMediaName: "",
      headerUsesOrderProduct: slot === "meta",
    });
    setShowLocalRef(false);
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const openEditDialog = (status: StatusWithTemplate, slot: TemplateSlot = "regular") => {
    setSelectedStatus(status);
    const target = slot === "meta" ? getMetaSlotTemplate(status) : status.template;
    setSelectedTemplate(target);
    setDialogSlot(slot);
    setDialogMode("edit");
    const metaName = target?.metaTemplateName || "";
    setOriginalMetaTemplateName(metaName);
    setMetaAutoFilled(false);
    setShowLocalRef(slot === "meta" && !!metaName);
    setTemplateForm({
      name: target?.name || (slot === "meta" ? `┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ${status.name}` : `┘é╪º┘ä╪¿ ${status.name}`),
      content: target?.content || DEFAULT_TEMPLATE_CONTENT,
      isActive: target?.isActive ?? true,
      hasButtons: target?.hasButtons ?? true,
      buttons: parseTemplateButtons(target?.buttons),
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: metaName,
      metaTemplateLanguage: target?.metaTemplateLanguage || "ar",
      headerFormat: target?.headerFormat || (slot === "meta" ? "IMAGE" : "TEXT"),
      headerMediaHandle: target?.headerMediaHandle || "",
      headerMediaName: target?.headerMediaHandle || "",
      headerUsesOrderProduct: target?.headerUsesOrderProduct ?? (slot === "meta"),
    });
    setDialogOpen(true);
    fetchMetaSessions();
  };

  /**
   * ┘ê╪╢╪╣ "╪¬╪║┘è┘è╪▒ ╪º┘ä┘é╪º┘ä╪¿": ╪┤╪º╪┤╪⌐ ╪¿╪│┘è╪╖╪⌐ ┘ä╪▒╪¿╪╖ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪» ┘à╪«╪¬┘ä┘ü.
   * ┘à╪┤ ╪¿┘è╪╣╪»┘æ┘ä ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ΓÇö ╪¿╪│ ╪¿┘è╪»┘ê╪▒ ╪╣┘ä┘ë ┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪» ╪¬╪º┘å┘è ┘ê┘è╪▒╪¿╪╖┘ç.
   */
  const openSwitchDialog = (status: StatusWithTemplate) => {
    const current = getMetaSlotTemplate(status);
    setSelectedStatus(status);
    setSelectedTemplate(current);
    setDialogSlot("meta");
    setDialogMode("switch");
    const metaName = current?.metaTemplateName || "";
    setOriginalMetaTemplateName(metaName);
    setMetaAutoFilled(false);
    setShowLocalRef(false);
    setTemplateForm({
      name: current?.name || `┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ${status.name}`,
      content: current?.content || DEFAULT_TEMPLATE_CONTENT,
      isActive: current?.isActive ?? true,
      hasButtons: current?.hasButtons ?? true,
      buttons: parseTemplateButtons(current?.buttons),
      sendMode: "bind_meta",
      metaTemplateName: metaName,
      metaTemplateLanguage: current?.metaTemplateLanguage || "ar",
      headerFormat: current?.headerFormat || "IMAGE",
      headerMediaHandle: current?.headerMediaHandle || "",
      headerMediaName: current?.headerMediaHandle || "",
      headerUsesOrderProduct: current?.headerUsesOrderProduct ?? true,
    });
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const persistLocalTemplate = useCallback(async (): Promise<string | null> => {
    if (!selectedStatus) return null;
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘à╪╖┘ä┘ê╪¿"));
      return null;
    }
    const saveButtons = templateForm.hasButtons
      ? templateForm.buttons
          .filter((b) => b.text.trim())
          .map((b) => ({ id: b.id, text: b.text.trim(), action: b.action.toUpperCase() }))
      : [];
    setSaving(true);
    try {
      const isEdit = !!selectedTemplate?.id;
      const payload: {
        category: string;
        eventType: string;
        name: string;
        content: string;
        isActive: boolean;
        hasButtons: boolean;
        buttons: { id: string; text: string; action: string }[];
        channel?: string;
        headerFormat?: string;
        headerMediaHandle?: string;
        headerUsesOrderProduct?: boolean;
      } = {
        category: selectedStatus.code === INCOMPLETE_CART_EVENT_TYPE ? "ABANDONED_CART" : "ORDERS",
        eventType: selectedStatus.code,
        name: templateForm.name,
        content: templateForm.content,
        isActive: templateForm.isActive,
        hasButtons: saveButtons.length > 0,
        buttons: saveButtons,
      };
      if (dialogSlot === "meta" && templateForm.headerFormat !== "TEXT") {
        payload.headerFormat = templateForm.headerFormat;
        payload.headerMediaHandle = templateForm.headerMediaHandle || undefined;
        payload.headerUsesOrderProduct = templateForm.headerUsesOrderProduct;
      }
      if (!isEdit) {
        payload.channel = dialogSlot === "meta" ? "META_CLOUD" : "AUTO";
      }
      if (isEdit) {
        await apiClient.put(`/whatsapp/notifications/templates/${selectedTemplate!.id}`, payload);
        toast.success(t("orders.templateUpdated", "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘å╪¼╪º╪¡"));
        dialogDirtyRef.current = true;
        return selectedTemplate!.id;
      } else {
        const res = await apiClient.post("/whatsapp/notifications/templates", payload);
        const created = (res?.data as { template?: { id?: string } })?.template;
        const newTemplateId = created?.id;
        if (!newTemplateId) {
          toast.error(t("orders.templateSaveError", "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡┘ü╪╕ ╪º┘ä┘é╪º┘ä╪¿"));
          return null;
        }
        toast.success(t("orders.templateCreated", "╪¬┘à ╪Ñ┘å╪┤╪º╪í ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘å╪¼╪º╪¡"));
        dialogDirtyRef.current = true;
        setSelectedStatus((prev) => {
          if (!prev) return prev;
          const newTpl = {
            id: newTemplateId,
            name: templateForm.name,
            content: templateForm.content,
            eventType: prev.code,
            isActive: templateForm.isActive,
            hasButtons: saveButtons.length > 0,
            buttons: saveButtons.length > 0 ? JSON.stringify(saveButtons) : undefined,
            channel: dialogSlot === "meta" ? "META_CLOUD" : "AUTO",
          };
          return {
            ...prev,
            template: dialogSlot === "meta" ? prev.template : newTpl,
            metaTemplate: dialogSlot === "meta" ? newTpl : prev.metaTemplate,
            hasTemplate: true,
            hasMetaTemplate: dialogSlot === "meta" ? true : !!prev.metaTemplate,
          };
        });
        setSelectedTemplate((prev) =>
          dialogSlot === "meta" || prev ? { id: newTemplateId, name: templateForm.name, content: templateForm.content, eventType: selectedStatus.code, isActive: templateForm.isActive } : null
        );
        return newTemplateId;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("orders.templateSaveError", "╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¡┘ü╪╕ ╪º┘ä┘é╪º┘ä╪¿"));
      return null;
    } finally {
      setSaving(false);
    }
  }, [selectedStatus, selectedTemplate, templateForm, dialogSlot, t]);

  const uploadHeaderMedia = useCallback(async (file: File) => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï"));
      return;
    }
    setHeaderUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", selectedMetaSession);
      const res = await apiClient.post<{ success?: boolean; mediaId?: string; fileName?: string; error?: string }>(
        "/whatsapp-templates/templates/upload-media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const data = res.data;
      if (data?.success && data.mediaId) {
        setTemplateForm((p) => ({ ...p, headerMediaHandle: data.mediaId!, headerMediaName: data.fileName || file.name }));
        toast.success(t("orders.headerMediaUploaded", "╪¬┘à ╪▒┘ü╪╣ ╪º┘ä┘ê╪│┘è╪╖ ΓÇö ╪¼╪º┘ç╪▓ ┘ä┘ä┘å╪┤╪▒ ╪╣┘ä┘ë ┘à┘è╪¬╪º"));
      } else {
        toast.error(data?.error || t("orders.headerMediaUploadFailed", "┘ü╪┤┘ä ╪▒┘ü╪╣ ╪º┘ä┘ê╪│┘è╪╖"));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.headerMediaUploadFailed", "┘ü╪┤┘ä ╪▒┘ü╪╣ ╪º┘ä┘ê╪│┘è╪╖"));
    } finally {
      setHeaderUploading(false);
    }
  }, [selectedMetaSession, t]);

  const handleSave = async () => {
    if (!selectedStatus) return;
    if (dialogSlot === "meta") {
      const templateId = await persistLocalTemplate();
      if (!templateId) return;
      if (templateForm.metaTemplateName) {
        await bindMetaTemplate(templateId, templateForm.metaTemplateName, templateForm.metaTemplateLanguage);
      } else {
        setDialogOpen(false);
        fetchData();
      }
      return;
    }
    const templateId = await persistLocalTemplate();
    if (!templateId) return;
    setDialogOpen(false);
    fetchData();
  };

  const handleResubmitMeta = async () => {
    if (!selectedTemplate?.id) return;
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘à╪╖┘ä┘ê╪¿"));
      return;
    }
    const saved = await persistLocalTemplate();
    if (!saved) return;
    setResubmittingMeta(true);
    try {
      const res = await apiClient.post(`/whatsapp-notifications/templates/${selectedTemplate.id}/resubmit-meta`, {
        sessionId: selectedMetaSession,
      });
      const data = res.data;
      if (data?.applied && data?.success) {
        // ╪¬┘à ╪¬╪╣╪»┘è┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à┘ê╪¼┘ê╪» ┘å┘ü╪│┘ç ╪¿╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä╪¼╪»┘è╪» ΓÇö ┘à┘è╪¬╪º ╪¬╪╣┘è╪» ┘à╪▒╪º╪¼╪╣╪¬┘ç ╪¬┘ä┘é╪º╪ª┘è╪º┘ï
        const status = data.verifiedStatus || "PENDING";
        toast.success(
          data.message ||
          t("orders.metaResubmitted", `╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º ΓÇö ╪º┘ä╪¡╪º┘ä╪⌐: ${status}`)
        );
        setDialogOpen(false);
      } else if (data?.success && data?.metaTemplateName) {
        // (╪¬┘ê╪º┘ü┘é ┘ä┘ä╪«┘ä┘ü) ┘ü┘è ╪¡╪º┘ä ╪ú┘å╪┤╪ú ╪º┘ä╪«╪º╪»┘à ┘é╪º┘ä╪¿╪º┘ï ╪¼╪»┘è╪»╪º┘ï
        toast.success(
          data.message ||
          t("orders.metaResubmittedNew", "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º ΓÇö ╪│┘è╪¬┘à ╪¬┘ü╪╣┘è┘ä┘ç ╪¿╪╣╪» ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐")
        );
        setDialogOpen(false);
      } else if (data?.applied === false) {
        toast.warning(
          data.applyReason ||
          t("orders.metaNotApplied", "┘à┘è╪¬╪º ┘ä╪│┘ç ╪┤╪º┘è┘ä╪⌐ ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪»┘è┘à ΓÇö ╪¼╪▒╪¿ ╪¬╪º┘å┘è ╪¿╪╣╪» ╪┤┘ê┘è╪⌐")
        );
      } else {
        toast.warning(
          data?.applyReason ||
          t("orders.metaResubmitted", "╪¬┘à ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º ΓÇö ┘ç┘è╪¬╪▒╪º╪¼╪╣ ╪¬╪º┘å┘è")
        );
      }
      fetchData();
      fetchDeliveryPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.metaResubmitFailed", "┘ü╪┤┘ä ╪¬╪¡╪»┘è╪½ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º"));
    } finally {
      setResubmittingMeta(false);
    }
  };

  const toggleNotify = async (status: StatusWithTemplate) => {
    if (togglingId) return; // ┘à┘å╪╣ ╪º┘ä╪╢╪║╪╖ ╪º┘ä┘à╪¬┘â╪▒╪▒ (double-click guard)
    const nextValue = !status.notifyCustomer;
    setTogglingId(status.id);
    // Optimistic update + rollback ╪╣┘ä┘ë ╪º┘ä┘ü╪┤┘ä
    const prevStatuses = statuses;
    setStatuses((prev) =>
      prev.map((s) => (s.id === status.id ? { ...s, notifyCustomer: nextValue } : s))
    );
    try {
      if (status.code === INCOMPLETE_CART_EVENT_TYPE) {
        await apiClient.put("/whatsapp/notifications/settings", {
          incompleteCartImmediateMessage: nextValue,
        });
      } else {
        await apiClient.put(`/order-status/${status.id}`, {
          notifyCustomer: nextValue,
        });
      }
      toast.success(
        nextValue
          ? t("orders.notifyEnabled", "╪¬┘à ╪¬┘ü╪╣┘è┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘ä┘ç╪░┘ç ╪º┘ä╪¡╪º┘ä╪⌐")
          : t("orders.notifyDisabled", "╪¬┘à ╪Ñ┘è┘é╪º┘ü ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ┘ä┘ç╪░┘ç ╪º┘ä╪¡╪º┘ä╪⌐")
      );
    } catch (err: any) {
      // Rollback: ┘å╪╣┘è╪» ╪º┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪ú╪╡┘ä┘è╪⌐ ┘ä┘ê ┘ü╪┤┘ä ╪º┘ä┘Ç API
      setStatuses(prevStatuses);
      toast.error(err?.response?.data?.message || t("orders.toggleError", "╪¡╪»╪½ ╪«╪╖╪ú"));
    } finally {
      setTogglingId(null);
    }
  };

  const fetchMetaSessions = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && metaSessionsCacheRef.current && now - metaSessionsCacheRef.current.at < 30_000) {
      const cached = metaSessionsCacheRef.current.data;
      setMetaSessions(cached);
      if (cached.length > 0 && !selectedMetaSession) setSelectedMetaSession(cached[0].id);
      return;
    }
    try {
      const res = await apiClient.get("/whatsapp/sessions");
      const list: { id: string; name: string; provider: string; metaDisplayPhoneNumber?: string }[] = res.data?.sessions || [];
      const cloud = list.filter((s) => s.provider === "META_CLOUD");
      metaSessionsCacheRef.current = { data: cloud, at: now };
      setMetaSessions(cloud);
      if (cloud.length > 0 && !selectedMetaSession) {
        setSelectedMetaSession(cloud[0].id);
      }
    } catch {}
  }, [selectedMetaSession]);

  const publishToMeta = async (templateId: string) => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï"));
      return;
    }
    setPublishingId(templateId);
    try {
      await apiClient.post(`/whatsapp-notifications/templates/${templateId}/publish`, { sessionId: selectedMetaSession });
      toast.success(t("orders.publishedToMeta", "╪¬┘à ╪Ñ╪▒╪│╪º┘ä ╪º┘ä┘é╪º┘ä╪¿ ┘ä┘à┘è╪¬╪º ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐"));
      fetchAvailableMetaTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.publishFailed", "┘ü╪┤┘ä ╪º┘ä┘å╪┤╪▒ ╪╣┘ä┘ë ┘à┘è╪¬╪º"));
    } finally {
      setPublishingId(null);
    }
  };

  const createMetaTemplate = async () => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï"));
      return;
    }
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘à╪╖┘ä┘ê╪¿"));
      return;
    }
    const templateId = await persistLocalTemplate();
    if (!templateId) return;
    await publishToMeta(templateId);
  };

  const fetchAvailableMetaTemplates = useCallback(async () => {
    if (!selectedMetaSession) return;
    setLoadingMetaTemplates(true);
    try {
      const res = await apiClient.get(`/whatsapp-notifications/templates/meta-available`, {
        params: { sessionId: selectedMetaSession },
      });
      setAvailableMetaTemplates(res.data?.templates || []);
    } catch {
      setAvailableMetaTemplates([]);
    } finally {
      setLoadingMetaTemplates(false);
    }
  }, [selectedMetaSession]);

  const bindMetaTemplate = async (templateId: string, metaTemplateName: string, metaTemplateLanguage: string) => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï"));
      return;
    }
    setBindingId(templateId);
    try {
      await apiClient.post(`/whatsapp-notifications/templates/${templateId}/bind-meta`, {
        sessionId: selectedMetaSession,
        metaTemplateName,
        metaTemplateLanguage,
      });
      toast.success(t("orders.boundToMeta", "╪¬┘à ╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»"));
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.bindFailed", "┘ü╪┤┘ä ╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘à┘è╪¬╪º"));
    } finally {
      setBindingId(null);
    }
  };

  const requestUnbindMeta = (status: StatusWithTemplate) => {
    const target = status.metaTemplate || (status.template?.metaTemplateName ? status.template : null);
    if (!target?.id) return;
    setUnbindTarget(status);
  };

  const unbindMeta = async (status: StatusWithTemplate) => {
    const target = status.metaTemplate || (status.template?.metaTemplateName ? status.template : null);
    if (!target?.id) return;
    try {
      await apiClient.put(`/whatsapp/notifications/templates/${target.id}`, {
        metaTemplateName: null,
        metaTemplateId: null,
        metaTemplateStatus: null,
      });
      toast.success(t("orders.unboundToMeta", "╪¬┘à ┘ü┘â ╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º"));
      setUnbindTarget(null);
      dialogDirtyRef.current = true;
      fetchData();
      fetchDeliveryPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.bindFailed", "┘ü╪┤┘ä ╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘à┘è╪¬╪º"));
      setUnbindTarget(null);
    }
  };

  useEffect(() => {
    if (dialogOpen && selectedMetaSession) {
      fetchAvailableMetaTemplates();
    }
  }, [dialogOpen, selectedMetaSession, fetchAvailableMetaTemplates]);

  const syncMetaStatuses = async () => {
    const metaSessionId = selectedMetaSession || metaSessions[0]?.id;
    if (!metaSessionId) {
      toast.error(t("orders.selectMetaSession", "╪º╪«╪¬╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ╪ú┘ê┘ä╪º┘ï"));
      return;
    }
    setSyncingStatus(true);
    try {
      const res = await apiClient.post("/whatsapp-notifications/templates/sync-status", { sessionId: metaSessionId });
      const data = res.data as { success?: boolean; synced?: number };
      if (data?.success) {
        const synced = data.synced ?? 0;
        if (synced === 0) {
          toast.success(t("orders.metaSyncUpToDate", "┘â┘ä ╪º┘ä┘é┘ê╪º┘ä╪¿ ┘à╪¡╪»┘æ╪½╪⌐ ΓÇö ┘à┘ü┘è╪┤ ╪¡╪º╪¼╪⌐ ╪º╪¬╪║┘è╪▒╪¬"));
        } else {
          toast.success(t("orders.metaSyncDone", `╪¬┘à╪¬ ┘à╪▓╪º┘à┘å╪⌐ ${synced} ┘é╪º┘ä╪¿`));
          const rejectedCount = Object.values(deliveryPreview).filter((p) => p.metaTemplateStatus === "REJECTED").length;
          if (rejectedCount > 0) {
            toast.warning(t("orders.metaSyncRejected", `${rejectedCount} ┘é╪º┘ä╪¿ ╪º╪¬╪▒┘ü╪╢ ┘à┘å ┘à┘è╪¬╪º ΓÇö ╪▒╪º╪¼╪╣┘ç┘à`));
          }
        }
        fetchData();
        fetchDeliveryPreview();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.metaSyncFailed", "┘ü╪┤┘ä╪¬ ╪º┘ä┘à╪▓╪º┘à┘å╪⌐ ┘à┘å ┘à┘è╪¬╪º"));
    } finally {
      setSyncingStatus(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    // ≡ƒº¬ Validation ┘é╪¿┘ä ╪º┘ä╪¡┘ü╪╕
    const rate = Number(settings.rateLimitPerMinute);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 60) {
      toast.error(t("orders.settingsRateInvalid", "╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë ┘ä┘ä╪▒╪│╪º╪ª┘ä ┘ü┘è ╪º┘ä╪»┘é┘è┘é╪⌐ ┘è╪¼╪¿ ╪ú┘å ┘è┘â┘ê┘å ╪¿┘è┘å 1 ┘ê 60"));
      return;
    }
    if (settings.quietHoursEnabled) {
      const startMin = timeToMinutes(settings.quietHoursStart || "");
      const endMin = timeToMinutes(settings.quietHoursEnd || "");
      if (startMin == null || endMin == null) {
        toast.error(t("orders.settingsQuietHoursInvalid", "╪╡┘è╪║╪⌐ ╪│╪º╪╣╪º╪¬ ╪º┘ä┘ç╪»┘ê╪í ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐"));
        return;
      }
      if (startMin === endMin) {
        toast.error(t("orders.settingsQuietHoursSame", "╪¿╪»╪º┘è╪⌐ ┘ê┘å┘ç╪º┘è╪⌐ ╪│╪º╪╣╪º╪¬ ╪º┘ä┘ç╪»┘ê╪í ┘ä╪º ┘è┘à┘â┘å ╪ú┘å ╪¬╪¬╪╖╪º╪¿┘é╪º"));
        return;
      }
    }

    setSettingsSaving(true);
    try {
      const res = await apiClient.put("/whatsapp/notifications/settings", settings);
      if (res.data?.success) {
        toast.success(t("orders.settingsSaved", "╪¬┘à ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬"));
        dialogDirtyRef.current = true;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.settingsError", "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of DEFAULT_BUTTON_ACTIONS) map.set(a.value, a.label);
    for (const s of statuses) {
      if (s.code && !map.has(s.code)) map.set(s.code, s.name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [statuses]);

  const updateButton = (idx: number, patch: Partial<TemplateButton>) => {
    setTemplateForm((p) => ({
      ...p,
      buttons: p.buttons.map((b, i) => (i === idx ? { ...b, ...patch } : b)),
    }));
  };

  const removeButton = (idx: number) => {
    setTemplateForm((p) => ({ ...p, buttons: p.buttons.filter((_, i) => i !== idx) }));
  };

  const addButton = () => {
    setTemplateForm((p) => {
      if (p.buttons.length >= 3) return p;
      return {
        ...p,
        buttons: [...p.buttons, { id: `btn_${Date.now()}`, text: "", action: "CONFIRMED" }],
      };
    });
  };

  const filteredStatuses = activeTab === "all"
    ? statuses
    : statuses.filter((s) => s.statusType === activeTab);

  const visibleStatuses = useMemo(
    () => filteredStatuses.filter((s) => showInternal || !s.isNonNotifiable),
    [filteredStatuses, showInternal]
  );

  const internalCount = filteredStatuses.filter((s) => s.isNonNotifiable).length;
  const notifiableCount = useMemo(
    () => statuses.filter((s) => !s.isNonNotifiable).length,
    [statuses]
  );

  const filteredByChipAndSearch = useMemo(() => {
    let result = visibleStatuses;

    if (activeChip === "custom") {
      result = result.filter((s) => {
        if (!s.template?.content && !s.metaTemplate?.content) return false;
        const content = s.template?.content || s.metaTemplate?.content || "";
        return /\{\{|\}\}/.test(content) || isCustomContent(s);
      });
    } else if (activeChip === "meta_bound") {
      result = result.filter((s) => isMetaTemplateBound(s.template) || isMetaTemplateBound(s.metaTemplate));
    } else if (activeChip === "no_template") {
      result = result.filter((s) => !s.hasTemplate);
    } else if (activeChip === "disabled") {
      result = result.filter((s) => !s.notifyCustomer);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((s) =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      );
    }

    result = [...result];
    if (sortMode === "alphabetical") {
      result.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    } else if (sortMode === "statusType") {
      const typeOrder: Record<string, number> = { order: 0, payment: 1, preparation: 2, shipping: 3 };
      result.sort(
        (a, b) => (typeOrder[a.statusType] ?? 9) - (typeOrder[b.statusType] ?? 9) || a.sortOrder - b.sortOrder
      );
    } else if (sortMode === "recent") {
      result.sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );
    }

    return result;
  }, [visibleStatuses, activeChip, searchQuery, sortMode]);

  const { groupedStatuses, groupKeys } = useMemo(() => {
    const groups = new Map<string, StatusWithTemplate[]>();
    for (const s of filteredByChipAndSearch) {
      const key = s.template?.content?.trim() || s.metaTemplate?.content?.trim() || "__no-template__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return { groupedStatuses: groups, groupKeys: Array.from(groups.keys()) };
  }, [filteredByChipAndSearch]);

  const togglePreview = useCallback((id: string) => {
    setExpandedPreviews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedMetaBody = useMemo(() => {
    if (!templateForm.metaTemplateName) return "";
    const mt = availableMetaTemplates.find((m) => m.name === templateForm.metaTemplateName);
    const body = (mt?.components || []).find((c) => c.type === "BODY");
    return body?.text || "";
  }, [templateForm.metaTemplateName, availableMetaTemplates]);

  const metaBindingChanged = dialogSlot === "meta" && templateForm.metaTemplateName !== originalMetaTemplateName;
  const metaContentChanged = dialogSlot === "meta" && !!selectedTemplate?.id && templateForm.content !== (selectedTemplate?.content || "");
  const isMetaBound = dialogSlot === "meta" && !!originalMetaTemplateName;

  // ┘ü╪º┘ä┘è╪»┘è╪┤┘å ┘é╪¿┘ä ╪º┘ä╪¡┘ü╪╕: ╪╣╪»╪» ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¡┘ä┘è╪⌐ ┘ä╪º╪▓┘à ┘è╪╖╪º╪¿┘é ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪«╪¬╪º╪▒
  const metaVariableMismatch = (() => {
    if (dialogSlot !== "meta" || !templateForm.metaTemplateName) return null;
    const metaBody = (() => {
      const sel = availableMetaTemplates.find((m) => m.name === templateForm.metaTemplateName);
      return (sel?.components || []).find((c) => c.type === "BODY")?.text || "";
    })();
    const metaCount = (metaBody.match(/\{\{\s*\d+\s*\}\}/g) || []).length;
    if (metaCount === 0) return null;
    const localCount = extractLocalVariableOrder(templateForm.content).length;
    if (localCount >= metaCount) return null;
    return { metaCount, localCount, missing: metaCount - localCount };
  })();

  const metaDialogTitle = (() => {
    if (dialogMode === "switch") return `╪¬╪║┘è┘è╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º: ${selectedStatus?.name}`;
    if (dialogSlot !== "meta") {
      return `${selectedTemplate?.id ? "╪¬╪╣╪»┘è┘ä ┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿" : "╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿"}: ${selectedStatus?.name}`;
    }
    if (dialogMode === "create") return `╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º: ${selectedStatus?.name}`;
    if (isMetaBound && metaContentChanged) return `╪¬╪¡╪»┘è╪½ ┘à╪¡╪¬┘ê┘ë ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º: ${selectedStatus?.name}`;
    return `╪¬╪╣╪»┘è┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º: ${selectedStatus?.name}`;
  })();

  /**
   * ╪º╪«╪¬┘è╪º╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ΓåÆ ╪¬╪¡╪»┘è╪½ ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪¡┘ä┘è ╪¬┘ä┘é╪º╪ª┘è╪º┘ï (auto-fill):
   * - ┘ä┘ê ╪º┘ä┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖ ╪¿╪¡╪º┘ä╪⌐ ╪¬╪º┘å┘è╪⌐ (boundLocalContent) ΓåÆ ┘å┘å╪│╪« ┘à╪¡╪¬┘ê╪º┘ç╪º ╪º┘ä╪╡╪¡ (╪ú┘ü╪╢┘ä ┘à╪╡╪»╪▒ ┘ä┘ä┘à╪¬╪║┘è╪▒╪º╪¬).
   * - ╪║┘è╪▒ ┘â╪»┘ç ΓåÆ ┘å╪¿┘å┘è ┘à╪¡╪¬┘ê┘ë ┘à┘å ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ({{N}} ΓåÆ ┘à╪¬╪║┘è╪▒ ┘à╪¡┘ä┘è ╪º┘ü╪¬╪▒╪º╪╢┘è).
   * - ┘à╪┤ ╪¿┘å┘ä╪║┘è ┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪│╪¬╪«╪»┘à ┘ä┘ê ┘ç┘ê ┘â╪¬╪¿┘ç ┘ê┘à╪¬╪╖╪º╪¿┘é ╪¿╪º┘ä┘ü╪╣┘ä (┘ü┘è┘ç ┘à╪¬╪║┘è╪▒╪º╪¬ ┘â┘ü╪º┘è╪⌐).
   */
  const handleMetaTemplateSelect = (name: string) => {
    const selected = availableMetaTemplates.find((m) => m.name === name);
    const metaBody = (selected?.components || []).find((c) => c.type === "BODY")?.text || "";

    setTemplateForm((p) => {
      const existingVars = extractLocalVariableOrder(p.content);
      const metaVarCount = (metaBody.match(/\{\{\s*\d+\s*\}\}/g) || []).length;
      const needsFill = metaVarCount > 0 && existingVars.length < metaVarCount;
      if (needsFill) {
        const filled = selected?.boundLocalContent || buildLocalContentFromMetaBody(metaBody);
        if (filled && filled !== p.content) {
          setMetaAutoFilled(true);
          return { ...p, metaTemplateName: name, content: filled };
        }
      }
      return { ...p, metaTemplateName: name };
    });
  };

  const statusesWithoutTemplate = visibleStatuses.filter((s) => !s.hasTemplate);
  const hasGaps = statusesWithoutTemplate.length > 0;

  const boundMetaCount = visibleStatuses.filter(
    (s) => isMetaTemplateBound(s.template) || isMetaTemplateBound(s.metaTemplate)
  ).length;
  const defaultSession = settingsSessions.find((s) => s.id === settings?.defaultSessionId);
  const defaultSessionIsMeta = defaultSession?.provider === "META_CLOUD" || !!metaSessions.find((s) => s.id === settings?.defaultSessionId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t("orders.statusTemplatesTitle", "┘é┘ê╪º┘ä╪¿ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪¡╪º┘ä╪º╪¬")}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t("orders.statusTemplatesDesc", "╪Ñ╪»╪º╪▒╪⌐ ┘é┘ê╪º┘ä╪¿ ╪▒╪│╪º╪ª┘ä ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ╪º┘ä┘à╪▒╪¬╪¿╪╖╪⌐ ╪¿╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬")}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const isReports = tab.key === "reports";
          const count = isReports
            ? 0
            : tab.key === "all"
              ? notifiableCount
              : statuses.filter((s) => s.statusType === tab.key && !s.isNonNotifiable).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {isReports ? <DocumentTextIcon className="ml-1.5 inline h-4 w-4" /> : null}
              {t(tab.labelKey, tab.label)}
              {!isReports && (
                <span className="mr-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setActiveTab("settings")}
          className={`mr-auto flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
            activeTab === "settings"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          <Cog6ToothIcon className="h-4 w-4" />
          {t("orders.settingsTab", "╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬")}
        </button>
      </div>

      {activeTab === "reports" ? (
        <StatusReportTab statuses={statuses} />
      ) : activeTab === "settings" ? (
        /* ΓÜÖ∩╕Å Settings Panel */
        <div data-testid="settings-panel" className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
            <Cog6ToothIcon className="ml-1.5 inline h-5 w-5" />
            ╪Ñ╪╣╪»╪º╪»╪º╪¬ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪╖┘ä╪¿╪º╪¬
          </h2>

          {settingsLoading ? (
            <div className="flex justify-center py-10">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
            </div>
          ) : !settings ? (
            <p className="text-sm text-slate-400">{t("orders.settingsNone", "┘ä╪º ╪¬┘ê╪¼╪» ╪Ñ╪╣╪»╪º╪»╪º╪¬")}</p>
          ) : (
            <div className="space-y-5 max-w-xl">
              {/* General toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("orders.settingsEnableNotifications", "╪¬┘ü╪╣┘è┘ä ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿")}</p>
                  <p className="text-xs text-slate-500">╪¬╪┤╪║┘è┘ä ╪ú┘ê ╪Ñ┘è┘é╪º┘ü ╪¼┘à┘è╪╣ ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿</p>
                </div>
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(val) => setSettings((p) => p ? { ...p, isEnabled: val } : p)}
                  aria-label="╪¬┘ü╪╣┘è┘ä ╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ┘ê╪º╪¬╪│╪º╪¿"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Order notifications toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬</p>
                  <p className="text-xs text-slate-500">╪Ñ╪▒╪│╪º┘ä ╪▒╪│╪º┘ä╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ╪╣┘å╪» ╪¬╪║┘è┘è╪▒ ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿</p>
                </div>
                <Switch
                  checked={settings.orderNotificationsEnabled}
                  onCheckedChange={(val) => setSettings((p) => p ? { ...p, orderNotificationsEnabled: val } : p)}
                  aria-label="╪Ñ╪┤╪╣╪º╪▒╪º╪¬ ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Default session */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">╪º┘ä╪¼┘ä╪│╪⌐ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐</label>
                <p className="mb-2 text-xs text-slate-500">╪¼┘ä╪│╪⌐ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ ╪º┘ä┘ä┘è ┘ç╪¬╪¬╪¿╪╣╪¬ ┘à┘å┘ç╪º ╪º┘ä╪▒╪│╪º┘è┘ä</p>
                <select
                  value={settings.defaultSessionId || ""}
                  onChange={(e) => setSettings((p) => p ? { ...p, defaultSessionId: e.target.value || null } : p)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">╪¬┘ä┘é╪º╪ª┘è (╪ú┘è ╪¼┘ä╪│╪⌐ ┘à╪¬╪╡┘ä╪⌐)</option>
                  {settingsSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phoneNumber ? `(${s.phoneNumber})` : ""} - {s.status === "CONNECTED" ? "≡ƒƒó" : "≡ƒö┤"}
                    </option>
                  ))}
                </select>
                {defaultSessionInfo && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪¡╪º┘ä┘è╪⌐:</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                        defaultSessionInfo.provider === "META_CLOUD"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {defaultSessionInfo.provider === "META_CLOUD" ? "Γÿü∩╕Å Meta Cloud API" : "≡ƒô▒ Baileys"}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">{defaultSessionInfo.name}</span>
                    {defaultSessionInfo.provider === "META_CLOUD" && !Object.values(deliveryPreview).some((item) => item.riskLevel === "none") && (
                      <span className="text-amber-500 dark:text-amber-400">╪¬╪¡┘é┘é ┘à┘å ╪¡╪º┘ä╪⌐ ┘â┘ä ┘é╪º┘ä╪¿</span>
                    )}
                  </div>
                )}
                {defaultSessionInfo?.provider === "META_CLOUD" && (
                  <button
                    onClick={syncMetaStatuses}
                    disabled={syncingStatus}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${syncingStatus ? "animate-spin" : ""}`} />
                    ┘à╪▓╪º┘à┘å╪⌐ ╪º┘ä╪¡╪º┘ä╪º╪¬ ┘à┘å ┘à┘è╪¬╪º
                  </button>
                )}
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Sticky session */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("orders.settingsStickySession", "╪¬╪½╪¿┘è╪¬ ╪º┘ä╪¼┘ä╪│╪⌐ (Sticky Session)")}</p>
                  <p className="text-xs text-slate-500">┘å┘ü╪│ ╪º┘ä╪╣┘à┘è┘ä ┘è╪│╪¬╪«╪»┘à ┘å┘ü╪│ ╪º┘ä╪¼┘ä╪│╪⌐ ╪»╪º┘è┘à┘ï╪º</p>
                </div>
                <Switch
                  checked={settings.stickySessionEnabled}
                  onCheckedChange={(val) => setSettings((p) => p ? { ...p, stickySessionEnabled: val } : p)}
                  aria-label="╪¬╪½╪¿┘è╪¬ ╪º┘ä╪¼┘ä╪│╪⌐"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Quiet hours */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      <ClockIcon className="ml-1 inline h-4 w-4" />
                      ╪│╪º╪╣╪º╪¬ ╪º┘ä┘ç╪»┘ê╪í
                    </p>
                    <p className="text-xs text-slate-500">┘à╪º ╪¬╪▒╪│┘ä╪┤ ╪▒╪│╪º┘è┘ä ┘ü┘è ╪º┘ä┘ê┘é╪¬ ╪»┘ç</p>
                  </div>
                  <Switch
                    checked={settings.quietHoursEnabled}
                    onCheckedChange={(val) => setSettings((p) => p ? { ...p, quietHoursEnabled: val } : p)}
                    aria-label="╪│╪º╪╣╪º╪¬ ╪º┘ä┘ç╪»┘ê╪í"
                  />
                </div>
                {settings.quietHoursEnabled && (
                  <div className="mt-2 flex items-center gap-3">
                    <div>
                      <label className="text-xs text-slate-500">┘à┘å</label>
                      <input
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => setSettings((p) => p ? { ...p, quietHoursStart: e.target.value } : p)}
                        className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <span className="mt-5 text-slate-400">ΓåÆ</span>
                    <div>
                      <label className="text-xs text-slate-500">╪Ñ┘ä┘ë</label>
                      <input
                        type="time"
                        value={settings.quietHoursEnd}
                        onChange={(e) => setSettings((p) => p ? { ...p, quietHoursEnd: e.target.value } : p)}
                        className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Rate limit */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">
                  <BoltIcon className="ml-1 inline h-4 w-4" />
                  ╪¡╪» ╪º┘ä╪Ñ╪▒╪│╪º┘ä (╪▒╪│╪º┘ä╪⌐/╪»┘é┘è┘é╪⌐)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.rateLimitPerMinute}
                  onChange={(e) => setSettings((p) => p ? { ...p, rateLimitPerMinute: parseInt(e.target.value) || 30 } : p)}
                  className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {settingsSaving && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {t("orders.saveSettings", "╪¡┘ü╪╕ ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬")}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Gap banner */}
          {hasGaps && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
              <span>
                {statusesWithoutTemplate.length} ╪¡╪º┘ä╪⌐ ╪¿╪»┘ê┘å ┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿
                {activeTab !== "all" ? " ┘ü┘è ┘ç╪░╪º ╪º┘ä┘é╪│┘à" : ""}
              </span>
            </div>
          )}

          {/* Meta session warning */}
          {boundMetaCount > 0 && !defaultSessionIsMeta && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-800/30 dark:bg-sky-900/20 dark:text-sky-300">
              <GlobeAltIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                ╪╣┘å╪»┘â {boundMetaCount} ┘é╪º┘ä╪¿ ┘à╪▒╪¿┘ê╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪» ΓÇö ┘ä┘â┘å ╪º┘ä╪¼┘ä╪│╪⌐ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐ ┘ä┘ä╪Ñ╪▒╪│╪º┘ä ┘à╪┤ Meta Cloud API.
                ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪▒╪¿┘ê╪╖╪⌐ ╪¿┘à┘è╪¬╪º ┘ç╪¬╪¬╪¿╪╣╪¬ ┘ü╪╣┘ä┘è┘ï╪º ╪¿╪│ ┘ä┘ê ╪º┘ä╪Ñ╪▒╪│╪º┘ä ╪¿┘è╪¬┘à ┘à┘å ╪¼┘ä╪│╪⌐ Meta Cloud. ╪º╪«╪¬╪º╪▒ ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ┘à┘å ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬.
              </span>
            </div>
          )}

          {/* Toolbar: search + filter chips + sort + internal toggle */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="╪º╪¿╪¡╪½ ╪¿╪º╪│┘à ╪º┘ä╪¡╪º┘ä╪⌐ ╪ú┘ê ╪º┘ä┘â┘ê╪»..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-9 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <svg
                className="absolute right-3 top-2.5 h-4 w-4 text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {([
                { key: "all", labelKey: "orders.statusChips.all", label: "╪º┘ä┘â┘ä" },
                { key: "custom", labelKey: "orders.statusChips.custom", label: "┘à╪«╪╡╪╡╪⌐" },
                { key: "meta_bound", labelKey: "orders.statusChips.metaBound", label: "┘à╪▒╪¿┘ê╪╖╪⌐ ╪¿┘à┘è╪¬╪º" },
                { key: "no_template", labelKey: "orders.statusChips.noTemplate", label: "╪¿╪»┘ê┘å ┘é╪º┘ä╪¿" },
                { key: "disabled", labelKey: "orders.statusChips.disabled", label: "┘à╪¬┘ê┘é┘ü╪⌐" },
              ] as const).map((chip) => (
                <button
                  key={chip.key}
                  onClick={() => setActiveChip(chip.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    activeChip === chip.key
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {t(chip.labelKey, chip.label)}
                </button>
              ))}
            </div>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="statusType">╪¡╪│╪¿ ╪º┘ä╪¬╪¿┘ê┘è╪¿</option>
              <option value="alphabetical">╪ú╪¿╪¼╪»┘è</option>
              <option value="recent">╪ó╪«╪▒ ╪¬╪╣╪»┘è┘ä</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              ╪╣╪▒╪╢ ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪»╪º╪«┘ä┘è╪⌐ ({internalCount})
            </label>
          </div>

          {loading ? (
            <div data-testid="status-skeleton" className="space-y-2" aria-busy="true" aria-live="polite">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-white p-3.5 dark:border-white/10 dark:bg-slate-900/50"
                >
                  <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/3" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredByChipAndSearch.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-16 text-center dark:border-white/10">
              <DocumentTextIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                {searchQuery || activeChip !== "all"
                  ? "┘ä╪º ╪¬┘ê╪¼╪» ╪¡╪º┘ä╪º╪¬ ┘à╪╖╪º╪¿┘é╪⌐ ┘ä╪¿╪¡╪½┘â"
                  : "┘ä╪º ╪¬┘ê╪¼╪» ╪¡╪º┘ä╪º╪¬ ╪¿╪╣╪»"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || activeChip !== "all"
                  ? "╪¼╪▒┘æ╪¿ ╪¬╪║┘è┘è╪▒ ┘â┘ä┘à╪º╪¬ ╪º┘ä╪¿╪¡╪½ ╪ú┘ê ╪Ñ┘ä╪║╪º╪í ╪º┘ä┘ü┘ä╪º╪¬╪▒ ┘ä╪▒╪ñ┘è╪⌐ ┘â┘ä ╪º┘ä╪¡╪º┘ä╪º╪¬."
                  : "╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪«╪º╪╡╪⌐ ╪¿╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ç╪¬╪╕┘ç╪▒ ┘ç┘å╪º ╪ú┘ê┘ä ┘à╪º ╪¬╪¬╪╢╪º┘ü."}
              </p>
              {(searchQuery || activeChip !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveChip("all");
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-700"
                >
                  <XCircleIcon className="h-3.5 w-3.5" />
                  ┘à╪│╪¡ ╪º┘ä┘ü┘ä╪º╪¬╪▒
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {groupKeys.map((groupKey) => {
                const members = groupedStatuses.get(groupKey) || [];
                const isLarge = members.length > LARGE_GROUP_THRESHOLD;
                const isCollapsed = isLarge && collapsedGroups[groupKey] !== false;
                const isNoTemplate = groupKey === "__no-template__";

                if (isCollapsed) {
                  return (
                    <GroupHeader
                      key={groupKey}
                      members={members}
                      isNoTemplate={isNoTemplate}
                      onExpand={() => setCollapsedGroups((p) => ({ ...p, [groupKey]: false }))}
                    />
                  );
                }

                return members.map((status) => (
                  <StatusRow
                    key={status.id}
                    status={status}
                    deliveryPreview={deliveryPreview}
                    isRegularPreviewExpanded={expandedPreviews.has(`regular-${status.id}`)}
                    isMetaPreviewExpanded={expandedPreviews.has(`meta-${status.id}`)}
                    isMobile={isMobile}
                    togglingId={togglingId}
                    onTogglePreview={(slot) => togglePreview(`${slot}-${status.id}`)}
                    onToggleNotify={toggleNotify}
                    onOpenEdit={openEditDialog}
                    onOpenCreate={openCreateDialog}
                    onOpenSwitch={openSwitchDialog}
                    onUnbindMeta={requestUnbindMeta}
                  />
                ));
              })}
            </div>
          )}
        </>
      )}

      {/* Template dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent
          data-testid="template-dialog"
          showCloseButton
          closeLabel={t("orders.close", "╪Ñ╪║┘ä╪º┘é") as string}
          className="max-h-[90vh] max-w-2xl overflow-y-auto p-5 sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {metaDialogTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              ┘å┘à┘ê╪░╪¼ ╪Ñ┘å╪┤╪º╪í ┘ê╪¬╪╣╪»┘è┘ä ┘é╪º┘ä╪¿ ╪▒╪│╪º┘ä╪⌐ ┘ê╪º╪¬╪│╪º╪¿ ┘ä┘ä╪¡╪º┘ä╪⌐
            </DialogDescription>
          </DialogHeader>
          {dialogOpen && selectedStatus && dialogMode === "switch" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">┘å┘ê╪╣ ╪º┘ä╪¡╪»╪½</label>
                <input
                  type="text"
                  value={selectedStatus.code}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              <div className="rounded-lg border border-blue-200 p-3 dark:border-blue-800/40">
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  ╪º╪«╪¬╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»
                </label>
                <p className="-mt-0.5 mb-2 text-[10px] text-slate-400 dark:text-slate-500">
                  {isMetaBound
                    ? `╪º┘ä╪▒╪¿╪╖ ╪º┘ä╪¡╪º┘ä┘è: ${originalMetaTemplateName} ΓÇö ╪º╪«╪¬╪º╪▒ ┘é╪º┘ä╪¿ ╪¬╪º┘å┘è ╪╣╪┤╪º┘å ╪¬╪║┘è┘æ╪▒┘ç (┘à╪┤ ╪¿┘è╪║┘è┘æ╪▒ ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐).`
                    : "╪º╪«╪¬╪º╪▒ ┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪» ┘ê╪▒╪¿╪╖┘ç ╪¿╪º┘ä╪¡╪º┘ä╪⌐ ΓÇö ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘ä┘è ┘ç╪¬╪¬╪¿╪╣╪¬ ┘ç┘è ┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘å┘ü╪│┘ç."}
                </p>
                {metaSessions.length > 0 ? (
                  <>
                    <select
                      value={selectedMetaSession}
                      onChange={(e) => { setSelectedMetaSession(e.target.value); }}
                      aria-label="╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ┘ä┘ä╪▒╪¿╪╖"
                      className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {metaSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.metaDisplayPhoneNumber ? `(${s.metaDisplayPhoneNumber})` : ""}
                        </option>
                      ))}
                    </select>
                    {loadingMetaTemplates ? (
                      <p className="text-xs text-slate-400">╪¼╪º╪▒ ╪¬╪¡┘à┘è┘ä ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º...</p>
                    ) : availableMetaTemplates.length > 0 ? (
                      <select
                        value={templateForm.metaTemplateName}
                        onChange={(e) => setTemplateForm((p) => ({ ...p, metaTemplateName: e.target.value }))}
                        aria-label="┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="">╪º╪«╪¬╪▒ ┘é╪º┘ä╪¿...</option>
                        {availableMetaTemplates.map((mt) => {
                          const boundEvents = mt.boundToEventTypes?.length
                            ? mt.boundToEventTypes.join("╪î ")
                            : (mt.boundToEventType || "");
                          return (
                            <option key={mt.name} value={mt.name}>
                              {mt.name} {mt.category ? `(${mt.category})` : ""}
                              {boundEvents ? ` - ┘à╪▒╪¿┘ê╪╖ ╪¿┘Ç ${boundEvents}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <p className="text-xs text-slate-400">
                        ┘ä╪º ╪¬┘ê╪¼╪» ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪»╪⌐ ΓÇö ╪º╪╣┘à┘ä ┘é╪º┘ä╪¿ ╪¼╪»┘è╪» ┘à┘å ┬½╪º┘å╪┤╪º╪í ┘é╪º┘ä╪¿┬╗ ┘ü┘è ╪º┘ä┘â╪º╪▒╪¬.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-400">┘ä╪º ╪¬┘ê╪¼╪» ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ┘à╪¬╪╡┘ä╪⌐ ┘ä╪▒╪¿╪╖ ╪º┘ä┘é┘ê╪º┘ä╪¿</p>
                )}
              </div>

              {selectedMetaBody && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
                    <GlobeAltIcon className="h-3 w-3" />
                    ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘ä┘è ┘ç╪¬╪¬╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘è┘ä (┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º)
                  </p>
                  <div
                    dir="auto"
                    className="rounded-xl rounded-bl-sm bg-[#dcf8c6] p-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100"
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {resolveMetaBodyPreview(selectedMetaBody, templateForm.content)}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                    ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪¬╪¬┘é╪▒┘è ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘à┘å ╪º┘ä╪╖┘ä╪¿ ΓÇö ╪º┘ä┘å╪╡ ╪»┘ç ┘ç┘ê ╪º┘ä┘ä┘è ┘ç┘è┘ê╪╡┘ä┘â ┘ä┘ä╪╣┘à┘è┘ä ╪¿╪º┘ä╪╕╪¿╪╖.
                  </p>
                </div>
              )}

              {metaVariableMismatch && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300" role="alert">
                  ΓÜá∩╕Å ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪¡╪¬╪º╪¼ <strong>{metaVariableMismatch.metaCount} ┘à╪¬╪║┘è╪▒╪º╪¬</strong>╪î ┘ä┘â┘å ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ ┘ü┘è┘ç <strong>{metaVariableMismatch.localCount} ┘ü┘é╪╖</strong>. ╪¿╪»┘æ┘ä ┘à┘å ┘ê╪╢╪╣ ┬½╪¬╪╣╪»┘è┘ä┬╗ ╪╣╪┤╪º┘å ╪¬╪╣╪»┘æ┘ä ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘ê╪¬╪╢┘è┘ü ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘å╪º┘é╪╡╪⌐.
                </p>
              )}

              <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 bg-white/95 px-1 pt-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  ╪Ñ┘ä╪║╪º╪í
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || resubmittingMeta || !!bindingId || !templateForm.metaTemplateName || !!metaVariableMismatch}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving || bindingId ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                  {isMetaBound ? "╪¡┘ü╪╕ ╪º┘ä╪¬╪║┘è┘è╪▒" : "╪º╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿"}
                </button>
              </div>
            </div>
          )}

          {dialogOpen && selectedStatus && dialogMode !== "switch" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">┘å┘ê╪╣ ╪º┘ä╪¡╪»╪½</label>
                <input
                  type="text"
                  value={selectedStatus.code}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">╪º╪│┘à ╪º┘ä┘é╪º┘ä╪¿</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="┘à╪½╪º┘ä: ┘é╪º┘ä╪¿ ╪¬╪ú┘â┘è╪» ╪º┘ä╪╖┘ä╪¿"
                />
              </div>

              {/* Slot indicator + contextual explainer */}
              <div className={`rounded-lg p-2.5 text-[11px] leading-relaxed ${
                dialogSlot === "meta"
                  ? "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              }`}>
                {dialogSlot === "meta" ? (
                  isMetaBound && metaBindingChanged ? (
                    <>≡ƒöä <strong>╪¬╪¿╪»┘è┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º</strong> ΓÇö ┘ç╪¬╪║┘è╪▒ ╪º┘ä╪▒╪¿╪╖ ┘à┘å <code>{originalMetaTemplateName}</code> ┘ä┘é╪º┘ä╪¿ ╪¼╪»┘è╪». ╪º╪╢╪║╪╖ ┬½╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º┬╗ ╪╣╪┤╪º┘å ╪º┘ä╪¬╪¿╪»┘è┘ä ┘è╪¬╪│╪¼┘æ┘ä.</>
                  ) : isMetaBound ? (
                    <>Γÿü∩╕Å <strong>┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪▒╪¿┘ê╪╖ ╪¡╪º┘ä┘è╪º┘ï</strong> ΓÇö ╪╣╪»┘æ┘ä ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘ç┘å╪º╪î ╪¿╪╣╪»┘è┘å ╪º╪╢╪║╪╖ ┬½╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»┬╗ ╪╣╪┤╪º┘å ┘à┘è╪¬╪º ╪¬╪▒╪º╪¼╪╣ ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä╪¼╪»┘è╪»╪⌐.</>
                  ) : (
                    <>Γÿü∩╕Å <strong>╪º╪«╪¬╪º╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪»</strong> ΓÇö ╪º╪«╪¬╪º╪▒ ╪º┘ä┘é╪º┘ä╪¿ ┘à┘å ╪º┘ä┘é╪º╪ª┘à╪⌐ ┘ê╪¿╪╣╪»┘è┘å ╪º╪╢╪║╪╖ ┬½╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º┬╗. ╪¿┘è╪┤╪¬╪║┘ä ╪¿╪│ ┘à╪╣ ╪¼┘ä╪│╪⌐ <code>Meta Cloud API</code>.</>
                  )
                ) : (
                  <>≡ƒô▒ <strong>╪º┘ä┘å╪╡ ╪º┘ä┘ä┘è ╪¿╪¬┘â╪¬╪¿┘ç ┘ç┘å╪º ┘ç┘ê ╪º┘ä┘ä┘è ╪¿┘è╪¬╪º╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘è┘ä ┘à╪¿╪º╪┤╪▒╪⌐</strong> ╪╣╪¿╪▒ ╪º┘ä┘ê╪º╪¬╪│╪º╪¿ (Baileys). ┘ä┘ê ╪╣┘à┘ä╪¬ ┘â┘à╪º┘å ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘ä┘å┘ü╪│ ╪º┘ä╪¡╪º┘ä╪⌐╪î ┘à┘è╪¬╪º ┘ä┘ç ╪º┘ä╪ú╪│╪¿┘é┘è╪⌐ ┘ä┘à╪º ╪º┘ä╪¼┘ä╪│╪⌐ ╪º┘ä╪ú╪│╪º╪│┘è╪⌐ ╪¬┘â┘ê┘å Meta Cloud.</>
                )}
              </div>

              {dialogSlot === "meta" && defaultSessionInfo?.provider !== "META_CLOUD" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                  ΓÜá∩╕Å ╪º┘ä╪¼┘ä╪│╪⌐ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ╪º┘ä╪¡╪º┘ä┘è╪⌐ {defaultSessionInfo?.provider === "BAILEYS" ? "Baileys" : "╪║┘è╪▒ ┘à┘è╪¬╪º"} ΓÇö
                  ╪º┘ä┘é┘ê╪º┘ä╪¿ ╪º┘ä┘à╪▒╪¿┘ê╪╖╪⌐ ╪¿┘à┘è╪¬╪º ┘à╪┤ ┘ç╪¬╪¬╪¿╪╣╪¬ ╪Ñ┘ä╪º ┘ä┘ê ╪║┘è┘æ╪▒╪¬ ╪º┘ä╪¼┘ä╪│╪⌐ ╪º┘ä╪º┘ü╪¬╪▒╪º╪╢┘è╪⌐ ┘à┘å ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬.
                </div>
              )}

              {/* ===== META SLOT CONTENT ===== */}
              {dialogSlot === "meta" && (
                <div className="space-y-3 rounded-lg border border-blue-200 p-3 dark:border-blue-800/40">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    ╪º╪«╪¬╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»
                  </label>
                  <p className="-mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                    {isMetaBound
                      ? "╪º╪«╪¬╪º╪▒ ┘é╪º┘ä╪¿ ┘à╪«╪¬┘ä┘ü ╪╣╪┤╪º┘å ╪¬╪║┘è┘æ╪▒ ╪º┘ä╪▒╪¿╪╖ ΓÇö ╪º┘ä╪¬╪║┘è┘è╪▒ ┘è╪¬╪│╪¼┘æ┘ä ┘ä┘à╪º ╪¬╪╢╪║╪╖ ╪¡┘ü╪╕."
                      : "╪º╪«╪¬╪º╪▒ ╪º┘ä┘é╪º┘ä╪¿ ┘ê╪¿╪╣╪»┘è┘å ╪º╪╢╪║╪╖ ┬½╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º┬╗ ╪¬╪¡╪¬ ΓÇö ╪º╪«╪¬┘è╪º╪▒┘â ┘à╪┤ ╪¿┘è╪¬╪¡┘ü╪╕ ┘ä┘ê╪¡╪»┘ç."}
                  </p>
                  {metaSessions.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={createMetaTemplate}
                        disabled={!!publishingId || saving}
                        className="flex w-full items-center justify-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
                      >
                        {publishingId ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <PlusIcon className="h-3.5 w-3.5" />
                        )}
                        ╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¼╪»┘è╪»
                      </button>
                      <select
                        value={selectedMetaSession}
                        onChange={(e) => { setSelectedMetaSession(e.target.value); }}
                        aria-label="╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ┘ä┘ä╪▒╪¿╪╖"
                        className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {metaSessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.metaDisplayPhoneNumber ? `(${s.metaDisplayPhoneNumber})` : ""}
                          </option>
                        ))}
                      </select>
                      {loadingMetaTemplates ? (
                        <p className="text-xs text-slate-400">╪¼╪º╪▒ ╪¬╪¡┘à┘è┘ä ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º...</p>
                      ) : availableMetaTemplates.length > 0 ? (
                        <>
                          <select
                            value={templateForm.metaTemplateName}
                            onChange={(e) => handleMetaTemplateSelect(e.target.value)}
                            aria-label="┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪»"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="">╪º╪«╪¬╪▒ ┘é╪º┘ä╪¿...</option>
                            {availableMetaTemplates.map((mt) => {
                              const boundEvents = mt.boundToEventTypes?.length
                                ? mt.boundToEventTypes.join("╪î ")
                                : (mt.boundToEventType || "");
                              return (
                                <option key={mt.name} value={mt.name}>
                                  {mt.name} {mt.category ? `(${mt.category})` : ""}
                                  {boundEvents ? ` - ┘à╪▒╪¿┘ê╪╖ ╪¿┘Ç ${boundEvents}` : ""}
                                </option>
                              );
                            })}
                          </select>

                          {selectedMetaBody && (
                            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
                              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
                                <GlobeAltIcon className="h-3 w-3" />
                                ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘ä┘è ┘ç╪¬╪¬╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘è┘ä (┘å╪╡ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º)
                              </p>
                              <div
                                dir="auto"
                                className="rounded-xl rounded-bl-sm bg-[#dcf8c6] p-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100"
                              >
                                <p className="whitespace-pre-wrap break-words">
                                  {resolveMetaBodyPreview(selectedMetaBody, templateForm.content)}
                                </p>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪¬╪¬┘é╪▒┘è ╪¬┘ä┘é╪º╪ª┘è┘ï╪º ┘à┘å ╪º┘ä╪╖┘ä╪¿ ΓÇö ╪º┘ä┘å╪╡ ╪»┘ç ┘ç┘ê ╪º┘ä┘ä┘è ┘ç┘è┘ê╪╡┘ä┘â ┘ä┘ä╪╣┘à┘è┘ä ╪¿╪º┘ä╪╕╪¿╪╖.
                              </p>
                            </div>
                          )}

                          {(() => {
                            const selectedMt = availableMetaTemplates.find((mt) => mt.name === templateForm.metaTemplateName);
                            const otherBoundEvents = (selectedMt?.boundToEventTypes || [])
                              .filter((ev) => ev !== selectedTemplate?.eventType);
                            if (!selectedMt || otherBoundEvents.length === 0) return null;
                            return (
                              <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-700 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300">
                                Γä╣∩╕Å ╪º┘ä┘é╪º┘ä╪¿ ╪»┘ç ┘à╪▒╪¿┘ê╪╖ ╪¡╪º┘ä┘è╪º┘ï ╪¿┘â┘à╪º┘å: {otherBoundEvents.join("╪î ")} ΓÇö ┘å┘ü╪│ ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘ç╪¬╪¬╪¿╪╣╪¬ ┘ä┘è┘ç┘à. ┘ä┘ê ╪╣╪º┘è╪▓ ╪▒╪│╪º┘ä╪⌐ ┘à╪«╪¬┘ä┘ü╪⌐ ┘ä╪¡╪º┘ä╪⌐╪î ╪º╪╣┘à┘ä ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¼╪»┘è╪».
                              </div>
                            );
                          })()}

                          {/* Variable mapping {{1}} ΓåÆ customerName ΓÇö ╪¿╪╡╪▒┘è ┘ê┘ê╪º╪╢╪¡ */}
                          {selectedMetaBody && (() => {
                            const localVars = extractLocalVariableOrder(templateForm.content);
                            const metaNums = [...selectedMetaBody.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]);
                            if (localVars.length === 0 || metaNums.length === 0) return null;
                            const pairs = metaNums.map((n, i) => ({
                              meta: `{{${n}}}`,
                              local: localVars[i] ? `{{${localVars[i]}}}` : "ΓÇö",
                              desc: localVars[i] ? (VARIABLE_DESCRIPTIONS[localVars[i]] || "") : "╪║┘è╪▒ ┘à╪¬┘ê┘ü╪▒",
                              matched: !!localVars[i],
                            }));
                            return (
                              <div className="mt-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                  ╪¬╪╖╪º╪¿┘é ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬
                                </p>
                                <div className="space-y-1">
                                  {pairs.map((pr) => (
                                    <div key={pr.meta} className="flex items-center gap-2 text-[11px]">
                                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{pr.meta}</span>
                                      <span className="text-slate-400">ΓåÉ</span>
                                      <span className={`rounded px-1.5 py-0.5 font-mono ${pr.matched ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                                        {pr.local}
                                      </span>
                                      {pr.desc && <span className="text-slate-500 dark:text-slate-400">{pr.desc}</span>}
                                      {!pr.matched && <span className="text-red-500">ΓÜá∩╕Å ┘à╪¬╪║┘è╪▒ ┘å╪º┘é╪╡ ┘ü┘è ╪º┘ä┘å╪╡ ╪º┘ä┘à╪¡┘ä┘è</span>}
                                    </div>
                                  ))}
                                </div>
                                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                  ┘à┘è╪¬╪º ╪¿╪¬╪▒┘é┘æ┘à ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪¿╪¬╪▒╪¬┘è╪¿ ╪╕┘ç┘ê╪▒┘ç╪º╪¢ ╪¬╪ú┘â╪» ╪Ñ┘å ┘â┘ä ╪▒┘é┘à ┘à┘è╪¬╪º ┘ä┘è┘ç ┘à╪¬╪║┘è╪▒ ┘à╪¡┘ä┘è ┘à╪╖╪º╪¿┘é.
                                </p>
                              </div>
                            );
                          })()}

                          {selectedTemplate?.metaTemplateName && !metaBindingChanged && (
                            <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-700 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300">
                              ╪º┘ä╪▒╪¿╪╖ ╪º┘ä╪¡╪º┘ä┘è: {selectedTemplate.metaTemplateName}
                              {selectedTemplate.metaTemplateStatus ? ` (${selectedTemplate.metaTemplateStatus})` : ""}
                            </div>
                          )}
                          {metaBindingChanged && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                              ╪º┘ä╪¬╪¿╪»┘è┘ä: ┘à┘å ┬½{originalMetaTemplateName}┬╗ ╪Ñ┘ä┘ë ┬½{templateForm.metaTemplateName}┬╗ ΓÇö ╪º╪╢╪║╪╖ ┬½╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º┬╗ ┘ä┘ä╪¬╪ú┘â┘è╪».
                            </div>
                          )}
                          {metaAutoFilled && (
                            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                              Γ£à ╪º╪¬╪¿┘å┘ë ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪¡┘ä┘è ╪¬┘ä┘é╪º╪ª┘è╪º┘ï ┘à┘å ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪«╪¬╪º╪▒ ΓÇö ╪▒╪º╪¼╪╣ ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ┘ü┘ê┘é ┘ê╪╣╪»┘æ┘ä ┘ä┘ê ┘à╪¡╪¬╪º╪¼.
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">
                          ┘ä╪º ╪¬┘ê╪¼╪» ┘é┘ê╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪╣╪¬┘à╪»╪⌐ ΓÇö ╪º╪╢╪║╪╖ ┬½╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪¼╪»┘è╪»┬╗ ╪╣╪┤╪º┘å ╪¬┘å╪┤╪▒ ┘é╪º┘ä╪¿ ╪¼╪»┘è╪» ╪╣┘ä┘ë ┘à┘è╪¬╪º ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">┘ä╪º ╪¬┘ê╪¼╪» ╪¼┘ä╪│╪⌐ ┘à┘è╪¬╪º ┘à╪¬╪╡┘ä╪⌐ ┘ä╪▒╪¿╪╖ ╪º┘ä┘é┘ê╪º┘ä╪¿</p>
                  )}
                </div>
              )}

              {/* ===== LOCAL CONTENT ===== */}
              <div className={dialogSlot === "meta" ? "rounded-lg border border-slate-200 p-3 dark:border-slate-700" : ""}>
                {dialogSlot === "meta" && (
                  <div className="mb-3 space-y-1">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      ╪╡┘ê╪▒╪⌐ ╪º┘ä╪▒╪ú╪│ (HEADER) ΓÇö ╪º╪«╪¬┘è╪º╪▒┘è
                    </label>
                    <div className="flex items-center gap-2">
                      {templateForm.headerMediaHandle ? (
                        <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-800">
                          <PhotoIcon className="size-4 shrink-0 text-slate-400" />
                          <span className="flex-1 truncate text-xs text-slate-600 dark:text-slate-400" dir="ltr">
                            {templateForm.headerMediaName || templateForm.headerMediaHandle}
                          </span>
                          <button
                            type="button"
                            onClick={() => setTemplateForm((p) => ({ ...p, headerMediaHandle: "", headerMediaName: "" }))}
                            className="shrink-0 text-[11px] font-medium text-red-500 hover:text-red-600"
                          >
                            ╪Ñ╪▓╪º┘ä╪⌐
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-10 flex-1 items-center gap-2">
                          <label className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                            <PhotoIcon className="size-4" />
                            {headerUploading ? "╪¼╪º╪▒┘è ╪º┘ä╪▒┘ü╪╣ ╪Ñ┘ä┘ë ┘à┘è╪¬╪º..." : "╪º╪«╪¬╪▒ ╪╡┘ê╪▒╪⌐ ┘ä┘ä╪▒╪ú╪│"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={headerUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadHeaderMedia(file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                      ╪╣┘å╪» ╪º╪«╪¬┘è╪º╪▒ ╪╡┘ê╪▒╪⌐╪î ┘è┘Å╪▒┘ü╪╣ ╪º┘ä┘é╪º┘ä╪¿ ╪╣┘ä┘ë ┘à┘è╪¬╪º ╪¿┘ç┘è╪»╪▒ IMAGE ╪¿╪╡┘ê╪▒╪⌐ ╪º┘ä╪▒╪ú╪│ (╪¬┘Å╪│╪¬╪«╪»┘à ┘â╪╣┘è┘æ┘å╪⌐ ┘ä┘ä┘à┘ê╪º┘ü┘é╪⌐).
                    </p>
                    <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={templateForm.headerUsesOrderProduct}
                        onChange={(e) => setTemplateForm((p) => ({ ...p, headerUsesOrderProduct: e.target.checked }))}
                        className="size-4 accent-indigo-600"
                      />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        ╪º╪│╪¬╪«╪»┘à ╪╡┘ê╪▒╪⌐ ╪º┘ä┘à┘å╪¬╪¼ ┘à┘å ╪º┘ä╪╖┘ä╪¿ ┘ê┘é╪¬ ╪º┘ä╪Ñ╪▒╪│╪º┘ä
                      </span>
                    </label>
                    <p className="text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                      ┘ä┘ê ┘à┘ü╪╣┘æ┘ä╪î ┘â┘ä ╪▒╪│╪º┘ä╪⌐ ┘ä┘ä╪╣┘à┘è┘ä ┘ç╪¬╪¬╪¿╪╣╪¬ ╪¿┘è┘ç╪º ╪╡┘ê╪▒╪⌐ ╪ú┘ê┘ä ┘à┘å╪¬╪¼ ╪╖┘ä╪¿┘ç (┘à╪¬╪║┘è╪▒╪⌐ ┘ä┘â┘ä ╪╖┘ä╪¿). ┘ä┘ê ╪¿╪»┘ê┘å ╪¬╪¡╪»┘è╪» ╪╡┘ê╪▒╪⌐ ╪½╪º╪¿╪¬╪⌐╪î ╪º┘ä┘é╪º┘ä╪¿ ┘ç┘è╪¡╪¬╪º╪¼ ╪╡┘ê╪▒╪⌐ ╪╣┘è┘æ┘å╪⌐ ┘ä┘ä┘à┘ê╪º┘ü┘é╪⌐.
                    </p>
                  </div>
                )}
                {dialogSlot === "meta" ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowLocalRef((s) => !s)}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <ChevronDownIcon className={`h-3.5 w-3.5 transition ${showLocalRef ? "rotate-180" : ""}`} />
                        {selectedTemplate?.metaTemplateName ? "┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐" : "╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è (┘ä╪¬╪╖╪º╪¿┘é ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬)"}
                      </span>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                        {showLocalRef ? "╪Ñ╪«┘ü╪º╪í" : "╪╣╪▒╪╢"}
                      </span>
                    </button>
                    {selectedTemplate?.metaTemplateName ? (
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                        ╪º┘ä┘å╪╡ ╪»┘ç ┘ç┘ê ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä┘ä┘è ┘ç╪¬╪¬╪¿╪╣╪¬ ┘ä┘ä╪╣┘à┘è┘ä ╪╣╪¿╪▒ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ΓÇö ╪╣╪»┘æ┘ä ╪╣┘ä┘è┘ç ┘ê╪¿╪╣╪»┘è┘å ╪º╪╢╪║╪╖ ┬½╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»┬╗ ╪╣╪┤╪º┘å ┘à┘è╪¬╪º ╪¬╪▒╪º╪¼╪╣ ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä╪¼╪»┘è╪»╪⌐.
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                        ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ╪»┘ç ┘à╪┤ ╪º┘ä┘ä┘è ┘ç┘è╪¬╪¬╪¿╪╣╪¬ ΓÇö ╪¿┘è╪│╪¬╪«╪»┘à ╪¿╪│ ╪╣╪┤╪º┘å ┘å╪▒╪¿╪╖ ┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä╪╖┘ä╪¿ ╪¿╪ú╪▒┘é╪º┘à ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ({"{{1}}"} ΓåÉ {"{{customerName}}"}) .
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-medium tabular-nums ${
                        templateForm.content.length > META_BODY_CHAR_LIMIT
                          ? "text-red-600 dark:text-red-400"
                          : templateForm.content.length > META_BODY_CHAR_LIMIT * 0.9
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-400 dark:text-slate-500"
                      }`}
                      aria-live="polite"
                    >
                      {templateForm.content.length} / {META_BODY_CHAR_LIMIT}
                    </span>
                  </div>
                )}

                {dialogSlot !== "meta" || showLocalRef ? (
                <>
                <div className={dialogSlot === "meta" ? "mt-3 grid gap-3 lg:grid-cols-2" : "grid gap-3 lg:grid-cols-2"}>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, content: e.target.value.slice(0, META_BODY_CHAR_LIMIT + 200) }))}
                    rows={7}
                    aria-label={dialogSlot === "meta" ? "┘à╪¡╪¬┘ê┘ë ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è" : "┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐"}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                      templateForm.content.length > META_BODY_CHAR_LIMIT
                        ? "border-red-400 dark:border-red-500"
                        : "border-slate-200"
                    }`}
                    placeholder="╪º┘â╪¬╪¿ ╪▒╪│╪º┘ä╪¬┘â ┘ç┘å╪º..."
                  />

                  {/* Live WhatsApp-style preview */}
                  <div className="rounded-lg border border-slate-200 bg-[#e5ddd5] p-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      ┘à╪╣╪º┘è┘å╪⌐ ┘à╪¿╪º╪┤╪▒╪⌐
                    </p>
                    <WhatsAppBubblePreview
                      content={templateForm.content}
                      buttons={templateForm.buttons}
                      hasButtons={templateForm.hasButtons}
                    />
                  </div>
                </div>

                {templateForm.content.length > META_BODY_CHAR_LIMIT && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400" role="alert">
                    ΓÜá∩╕Å ╪º┘ä┘å╪╡ ╪ú╪╖┘ê┘ä ┘à┘å ╪¡╪» ┘à┘è╪¬╪º ({META_BODY_CHAR_LIMIT} ╪¡╪▒┘ü) ΓÇö ╪º┘ä┘é╪º┘ä╪¿ ┘ç┘è╪¬╪▒┘ü╪╢ ╪╣┘å╪» ╪º┘ä┘å╪┤╪▒ ╪╣┘ä┘ë Meta Cloud API.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowVariables(!showVariables)}
                  className="mt-1 flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <ChevronDownIcon className={`h-3 w-3 transition ${showVariables ? "rotate-180" : ""}`} />
                  {showVariables ? "╪Ñ╪«┘ü╪º╪í ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬" : "╪╣╪▒╪╢ ┘â┘ä ╪º┘ä┘à╪¬╪║┘è╪▒╪º╪¬ ╪º┘ä┘à╪¬╪º╪¡╪⌐"}
                </button>

                {showVariables && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 text-right dark:bg-slate-800">
                          <th className="px-2 py-1 font-medium text-slate-500">╪º┘ä┘à╪¬╪║┘è╪▒</th>
                          <th className="px-2 py-1 font-medium text-slate-500">╪º┘ä┘ê╪╡┘ü</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ORDER_VARIABLES.map((v) => (
                          <tr key={v.var} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="whitespace-nowrap px-2 py-1 font-mono text-indigo-600 dark:text-indigo-400">
                              {v.var}
                            </td>
                            <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{v.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {dialogSlot === "meta" && showLocalRef && (
                  <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                    ┘ä┘ê ╪║┘è┘æ╪▒╪¬ ╪º┘ä┘à╪▒╪¼╪╣ ╪º┘ä┘à╪¡┘ä┘è ┘ê╪╢╪║╪╖╪¬ "╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º" ┘è╪¬╪│╪¼┘æ┘ä ΓÇö ╪ú┘ê "╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»" ╪╣╪┤╪º┘å ┘à┘è╪¬╪º ╪¬╪▒╪º╪¼╪╣┘ç.
                  </p>
                )}
                </>
                ) : null}
              </div>

              {dialogSlot === "meta" && templateForm.metaTemplateName ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Γä╣∩╕Å ╪º┘ä╪ú╪▓╪▒╪º╪▒ ╪º┘ä╪¬┘ü╪º╪╣┘ä┘è╪⌐ ╪¿╪¬╪¬╪º╪«╪░ ┘à┘å ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ╪º┘ä┘à╪╣╪¬┘à╪» ΓÇö ╪º┘ä╪ú╪▓╪▒╪º╪▒ ╪º┘ä┘ä┘è ┘ç┘å╪º ╪¿╪¬╪¬╪│╪¬╪«╪»┘à ╪¿╪│ ┘ü┘è ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘à╪¡┘ä┘è╪⌐.
                  </p>
                </div>
              ) : (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    ╪º┘ä╪ú╪▓╪▒╪º╪▒ ╪º┘ä╪¬┘ü╪º╪╣┘ä┘è╪⌐
                  </label>
                  <Switch
                    checked={templateForm.hasButtons}
                    onCheckedChange={(val) => setTemplateForm((p) => ({ ...p, hasButtons: val }))}
                    aria-label="╪º┘ä╪ú╪▓╪▒╪º╪▒ ╪º┘ä╪¬┘ü╪º╪╣┘ä┘è╪⌐"
                  />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  ┘ä┘à╪º ╪º┘ä╪╣┘à┘è┘ä ┘è╪╢╪║╪╖ ╪╣┘ä┘ë ╪º┘ä╪▓╪▒╪î ╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿ ┘ç╪¬╪¬╪║┘è╪▒ ╪¬┘ä┘é╪º╪ª┘è┘ï╪º ┘ä┘ä╪¡╪º┘ä╪⌐ ╪º┘ä┘à╪¡╪»╪»╪⌐ ╪ú╪»┘å╪º┘ç
                </p>

                {templateForm.hasButtons && (
                  <div className="mt-3 space-y-2">
                    {templateForm.buttons.map((btn, idx) => (
                      <div
                        key={btn.id || idx}
                        className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/40"
                      >
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">┘å╪╡ ╪º┘ä╪▓╪▒</label>
                          <input
                            type="text"
                            value={btn.text}
                            onChange={(e) => updateButton(idx, { text: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            placeholder="┘à╪½╪º┘ä: ╪¬╪ú┘â┘è╪» ╪º┘ä╪ú┘ê╪▒╪»╪▒"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">╪╣┘å╪» ╪º┘ä╪╢╪║╪╖</label>
                          <select
                            value={btn.action}
                            onChange={(e) => updateButton(idx, { action: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            {statusOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeButton(idx)}
                          title="╪¡╪░┘ü ╪º┘ä╪▓╪▒"
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {templateForm.buttons.length < 3 && (
                      <button
                        type="button"
                        onClick={addButton}
                        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        ╪Ñ╪╢╪º┘ü╪⌐ ╪▓╪▒
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("orders.buttonsMaxHint", "╪º┘ä╪¡╪» ╪º┘ä╪ú┘é╪╡┘ë 3 ╪ú╪▓╪▒╪º╪▒ ┘ä┘â┘ä ╪▒╪│╪º┘ä╪⌐")}</p>
                  </div>
                )}
              </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="template-active"
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="template-active" className="text-sm text-slate-700 dark:text-slate-300">
                  ┘é╪º┘ä╪¿ ┘å╪┤╪╖
                </label>
              </div>

            <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 bg-white/95 px-1 pt-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ╪Ñ┘ä╪║╪º╪í
              </button>
              {dialogSlot === "meta" && isMetaBound && metaContentChanged && !metaBindingChanged && (
                <button
                  onClick={handleResubmitMeta}
                  disabled={saving || resubmittingMeta || !!bindingId}
                  title="╪¬╪¡╪»┘è╪½ ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪╣┘ä┘ë ┘à┘è╪¬╪º ┘ê┘è╪▒╪¼╪╣ ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ╪¬╪º┘å┘è"
                  className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                >
                  {resubmittingMeta ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowPathIcon className="h-4 w-4" />}
                  ╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»
                </button>
              )}
              {!(dialogSlot === "meta" && isMetaBound && metaContentChanged && !metaBindingChanged) && (
              <button
                onClick={handleSave}
                disabled={saving || resubmittingMeta || !!bindingId || !!metaVariableMismatch || (dialogSlot === "regular" && !templateForm.content.trim())}
                title={metaVariableMismatch ? `╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä┘à╪¡┘ä┘è ┘à╪¡╪¬╪º╪¼ ${metaVariableMismatch.missing} ┘à╪¬╪║┘è╪▒╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐` : undefined}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                  dialogSlot === "meta" && metaBindingChanged
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {saving || bindingId ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {dialogSlot === "meta"
                  ? metaBindingChanged
                    ? "╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º"
                    : isMetaBound
                      ? "╪¡┘ü╪╕"
                      : templateForm.metaTemplateName
                        ? "╪¡┘ü╪╕ ┘ê╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º"
                        : "╪¡┘ü╪╕ ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º"
                  : "╪¡┘ü╪╕"}
              </button>
              )}
            </div>

            {metaVariableMismatch && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300" role="alert">
                ΓÜá∩╕Å ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘à╪¡╪¬╪º╪¼ <strong>{metaVariableMismatch.metaCount} ┘à╪¬╪║┘è╪▒╪º╪¬</strong>╪î ┘ä┘â┘å ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪º┘ä┘à╪¡┘ä┘è ┘ü┘è┘ç <strong>{metaVariableMismatch.localCount} ┘ü┘é╪╖</strong> ΓÇö ╪ú╪╢┘ü <strong>{metaVariableMismatch.missing}</strong> ┘à╪¬╪║┘è╪▒╪º╪¬ ({ORDER_VARIABLES.slice(0, 4).map((v) => v.var).join("╪î ")}) ╪╣╪┤╪º┘å ╪¬┘é╪»╪▒ ╪¬╪¡┘ü╪╕ ┘ê╪¬╪▒╪¿╪╖.
              </p>
            )}

            {dialogSlot === "meta" && !metaVariableMismatch && (
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {metaBindingChanged ? (
                  <>┘ç╪¬╪║┘è╪▒ ╪º┘ä╪▒╪¿╪╖ ┘à┘å ┬½{originalMetaTemplateName}┬╗ ┘ä┘é╪º┘ä╪¿ ╪¼╪»┘è╪» ΓÇö ╪º┘ä╪¬╪║┘è┘è╪▒ ┘è╪¬╪│╪¼┘æ┘ä ┘ä┘à╪º ╪¬╪╢╪║╪╖ ╪¡┘ü╪╕.</>
                ) : isMetaBound && metaContentChanged ? (
                  <>╪╣╪»┘æ┘ä╪¬ ┘à╪¡╪¬┘ê┘ë ╪º┘ä╪▒╪│╪º┘ä╪⌐ ΓÇö ╪º╪╢╪║╪╖ ┬½╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»┬╗ ╪╣╪┤╪º┘å ┘à┘è╪¬╪º ╪¬╪▒╪º╪¼╪╣ ╪º┘ä╪▒╪│╪º┘ä╪⌐ ╪º┘ä╪¼╪»┘è╪»╪⌐ (╪º┘ä╪▒╪│╪º┘è┘ä ┘ç╪¬╪¬┘ê┘é┘ü ┘ä╪¡╪» ╪º┘ä┘à┘ê╪º┘ü┘é╪⌐).</>
                ) : (
                  <>╪ú┘è ╪¬╪╣╪»┘è┘ä ╪╣┘ä┘ë ╪º┘ä┘à╪¡╪¬┘ê┘ë ╪ú┘ê ╪º┘ä╪ú╪▓╪▒╪º╪▒ ┘ê╪¿╪╣╪»┘è┘å ┬½╪Ñ╪▒╪│╪º┘ä ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ┘à┘å ╪¼╪»┘è╪»┬╗ ┘ç┘è╪¿╪╣╪¬ ╪º┘ä┘é╪º┘ä╪¿ ┘ä┘à┘è╪¬╪º ┘ä┘ä┘à╪▒╪º╪¼╪╣╪⌐ ΓÇö ┘ç┘è╪¬┘ê┘é┘ü ╪╣┘å ╪º┘ä╪Ñ╪▒╪│╪º┘ä ┘ä╪¡╪» ┘à╪º ┘è┘ê╪º┘ü┘é┘ê╪º ╪¬╪º┘å┘è.</>
                )}
              </p>
            )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!unbindTarget}
        title={t("orders.unbindConfirmTitle", "┘ü┘â ╪▒╪¿╪╖ ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º")}
        content={t("orders.unbindConfirmContent", "┘ç┘ä ╪¬╪▒┘è╪» ┘ü┘â ╪▒╪¿╪╖ ┘ç╪░╪º ╪º┘ä┘é╪º┘ä╪¿ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º╪ƒ ╪¿╪╣╪» ╪º┘ä┘ü┘â╪î ╪º┘ä╪▒╪│╪º┘ä╪⌐ ┘ç╪¬╪¬╪¿╪╣╪¬ ┘â┘Ç ┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è.")}
        confirmLabel={t("orders.unbindConfirmYes", "┘å╪╣┘à╪î ┘ü┘â ╪º┘ä╪▒╪¿╪╖") as string}
        cancelLabel={t("orders.unbindConfirmCancel", "╪Ñ┘ä╪║╪º╪í") as string}
        confirmColor="error"
        onConfirm={() => unbindTarget && unbindMeta(unbindTarget)}
        onCancel={() => setUnbindTarget(null)}
      />
    </div>
  );
}

interface StatusRowProps {
  status: StatusWithTemplate;
  deliveryPreview: Record<string, DeliveryPreviewItem>;
  isRegularPreviewExpanded: boolean;
  isMetaPreviewExpanded: boolean;
  isMobile: boolean;
  togglingId: string | null;
  onTogglePreview: (slot: TemplateSlot) => void;
  onToggleNotify: (status: StatusWithTemplate) => void;
  onOpenEdit: (status: StatusWithTemplate, slot?: TemplateSlot) => void;
  onOpenCreate: (status: StatusWithTemplate, slot: TemplateSlot) => void;
  onOpenSwitch: (status: StatusWithTemplate) => void;
  onUnbindMeta: (status: StatusWithTemplate) => void;
}

function StatusRow({
  status,
  deliveryPreview,
  isRegularPreviewExpanded,
  isMetaPreviewExpanded,
  isMobile,
  togglingId,
  onTogglePreview,
  onToggleNotify,
  onOpenEdit,
  onOpenCreate,
  onOpenSwitch,
  onUnbindMeta,
}: StatusRowProps) {
  const { t } = useTranslation();
  const regular = status.template;
  const meta = getMetaSlotTemplate(status);
  const previewEventType = status.template?.eventType || status.metaTemplate?.eventType;
  const p = previewEventType ? deliveryPreview[previewEventType] : undefined;
  const deliveryColors = {
    none: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  const deliveryIcons = { none: "≡ƒƒó", warning: "≡ƒƒí", danger: "≡ƒö┤" };

  return (
    <div
      data-testid={`status-row-${status.id}`}
      className="group rounded-lg border border-slate-200/70 bg-white p-3.5 transition hover:shadow-sm dark:border-white/10 dark:bg-slate-900/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
            style={{ backgroundColor: status.color || "#6B7280" }}
          >
            {status.sortOrder}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {status.name}
              </span>
              {status.isSystemStatus && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t("orders.system", "┘å╪╕╪º┘à┘è")}
                </span>
              )}
              {status.statusType && status.statusType !== "order" && (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                  {status.statusType === "preparation" ? "╪¬╪¼┘ç┘è╪▓" : status.statusType === "shipping" ? "╪┤╪¡┘å" : status.statusType === "payment" ? "╪»┘ü╪╣" : status.statusType === "incomplete" ? "╪║┘è╪▒ ┘à┘â╪¬┘à┘ä" : status.statusType}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono">{status.code}</span>
              <button
                onClick={() => onToggleNotify(status)}
                disabled={togglingId === status.id}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                  status.notifyCustomer
                    ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {togglingId === status.id ? (
                  <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : status.notifyCustomer ? (
                  <BellIcon className="h-3 w-3" />
                ) : (
                  <BellSlashIcon className="h-3 w-3" />
                )}
                {status.notifyCustomer ? "┘à┘ü╪╣┘ä" : "┘à╪¬┘ê┘é┘ü"}
              </button>
            </div>
          </div>
        </div>

        {p && (p.riskLevel === "warning" || p.riskLevel === "danger") ? (
          <button
            onClick={() => onOpenEdit(status, "meta")}
            title={p.message}
            className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition hover:opacity-80 ${deliveryColors[p.riskLevel]}`}
          >
            {deliveryIcons[p.riskLevel]} ≡ƒöù ╪º╪▒╪¿╪╖ ╪¿┘é╪º┘ä╪¿ ┘à┘è╪¬╪º
          </button>
        ) : p ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${deliveryColors[p.riskLevel]}`}
            title={p.message}
          >
            {deliveryIcons[p.riskLevel]}
            {!isMobile && (p.message.length > 40 ? `${p.message.substring(0, 40)}ΓÇª` : p.message)}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <StatusTemplateSlot
          slot="regular"
          template={regular}
          status={status}
          isPreviewExpanded={isRegularPreviewExpanded}
          onTogglePreview={() => onTogglePreview("regular")}
          onEdit={() => onOpenEdit(status, "regular")}
          onCreate={() => onOpenCreate(status, "regular")}
        />
        <StatusTemplateSlot
          slot="meta"
          template={meta}
          status={status}
          isLegacy={metaSlotIsLegacy(status)}
          isPreviewExpanded={isMetaPreviewExpanded}
          onTogglePreview={() => onTogglePreview("meta")}
          onEdit={() => onOpenEdit(status, "meta")}
          onCreate={() => onOpenCreate(status, "meta")}
          onSwitch={() => onOpenSwitch(status)}
          onUnbind={meta ? () => onUnbindMeta(status) : undefined}
        />
      </div>
    </div>
  );
}

interface StatusTemplateSlotProps {
  slot: TemplateSlot;
  template: Template | null;
  status: StatusWithTemplate;
  isLegacy?: boolean;
  isPreviewExpanded: boolean;
  onTogglePreview: () => void;
  onEdit: () => void;
  onCreate: () => void;
  onSwitch: () => void;
  onUnbind?: () => void;
}

function StatusTemplateSlot({
  slot,
  template,
  status,
  isLegacy,
  isPreviewExpanded,
  onTogglePreview,
  onEdit,
  onCreate,
  onSwitch,
  onUnbind,
}: StatusTemplateSlotProps) {
  const isMeta = slot === "meta";
  const bound = isMetaTemplateBound(template);
  const metaStatus = String(template?.metaTemplateStatus || "").toUpperCase();
  const hasContent = !!template?.content;
  const previewContent = hasContent ? template!.content : "";

  const colors = isMeta
    ? {
        border: "border-blue-200 dark:border-blue-800/40",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        bg: "bg-blue-50/40 dark:bg-blue-900/10",
        accent: "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30",
      }
    : {
        border: "border-emerald-200 dark:border-emerald-800/40",
        badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        bg: "bg-emerald-50/40 dark:bg-emerald-900/10",
        accent: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30",
      };

  const statusBadge = isMeta
    ? bound
      ? metaStatus === "APPROVED"
        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        : metaStatus === "REJECTED"
          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      : template
        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
    : template
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

  const statusLabel = isMeta
    ? bound
      ? metaStatus === "APPROVED"
        ? "Γ£à ┘à╪╣╪¬┘à╪»"
        : metaStatus === "REJECTED"
          ? "Γ¥î ┘à╪▒┘ü┘ê╪╢"
          : metaStatus
            ? `ΓÅ│ ${metaStatus}`
            : "┘é┘è╪» ╪º┘ä┘à╪▒╪º╪¼╪╣╪⌐"
      : template
        ? "┘à╪¡┘ü┘ê╪╕ (╪¿╪»┘ê┘å ╪▒╪¿╪╖)"
        : "╪¿╪»┘ê┘å ┘é╪º┘ä╪¿"
    : template
      ? "┘è┘ê╪¼╪» ┘é╪º┘ä╪¿"
      : "╪¿╪»┘ê┘å ┘é╪º┘ä╪¿";

  return (
    <div
      data-testid={`${slot}-slot-${status.id}`}
      className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors.badge}`}>
          {isMeta ? <GlobeAltIcon className="h-3 w-3" /> : <DocumentTextIcon className="h-3 w-3" />}
          {isMeta ? "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º" : "┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è"}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge}`}>
          {isMeta && bound ? <CheckCircleIcon className="h-3 w-3" /> : null}
          {statusLabel}
        </span>
      </div>

      {isMeta && bound && template?.metaTemplateName && (
        <p className="mt-1.5 truncate font-mono text-[11px] text-blue-700 dark:text-blue-300" dir="ltr">
          {template.metaTemplateName}
          {isLegacy ? " (╪¬┘ê╪╡┘è┘ü ┘é╪»┘è┘à)" : ""}
        </p>
      )}

      <div className="mt-1.5 min-h-[2.75rem]">
        {template ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {template.name || "┘é╪º┘ä╪¿ ╪║┘è╪▒ ┘à╪│┘à┘æ┘ë"}
            </p>
            {hasContent && (
              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-400">
                {resolveVariablesForPreview(previewContent)}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMeta ? "┘ä╪º ┘è┘ê╪¼╪» ┘é╪º┘ä╪¿ ┘à┘è╪¬╪º ┘ä┘ç╪░┘ç ╪º┘ä╪¡╪º┘ä╪⌐" : "┘ä╪º ┘è┘ê╪¼╪» ┘é╪º┘ä╪¿ ┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è ΓÇö ╪º╪│╪¬╪«╪»┘à ╪▓╪▒ ╪º┘ä╪Ñ┘å╪┤╪º╪í"}
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {hasContent && (
          <button
            onClick={onTogglePreview}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            <DocumentTextIcon className="h-3 w-3" />
            {isPreviewExpanded ? "╪Ñ╪«┘ü╪º╪í" : "┘à╪╣╪º┘è┘å╪⌐"}
          </button>
        )}
        {isMeta && (
          <button
            onClick={onSwitch}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "┘ü╪╣┘æ┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ╪ú┘ê┘ä╪º┘ï" : ""}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 transition hover:bg-white dark:bg-white/10 dark:text-blue-400 dark:hover:bg-white/20 disabled:opacity-50"
          >
            <GlobeAltIcon className="h-3 w-3" />
            {bound ? "╪¬╪║┘è┘è╪▒ ╪º┘ä┘é╪º┘ä╪¿" : "╪º╪«╪¬┘è╪º╪▒ ┘é╪º┘ä╪¿ ┘à╪╣╪¬┘à╪»"}
          </button>
        )}
        {template ? (
          <button
            onClick={onEdit}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${colors.accent}`}
          >
            <PencilSquareIcon className="h-3 w-3" />
            {isMeta ? "╪¬╪╣╪»┘è┘ä ╪º┘ä┘à╪¡╪¬┘ê┘ë" : "╪¬╪╣╪»┘è┘ä"}
          </button>
        ) : !isMeta ? (
          <button
            onClick={onCreate}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "┘ü╪╣┘æ┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ╪ú┘ê┘ä╪º┘ï" : ""}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
              status.notifyCustomer
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            <PlusIcon className="h-3 w-3" />
            ╪Ñ┘å╪┤╪º╪í
          </button>
        ) : null}
        {isMeta && (
          <button
            onClick={onCreate}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "┘ü╪╣┘æ┘ä ╪º┘ä╪Ñ╪┤╪╣╪º╪▒ ╪ú┘ê┘ä╪º┘ï" : ""}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
              status.notifyCustomer
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            <PlusIcon className="h-3 w-3" />
            ╪Ñ┘å╪┤╪º╪í ┘é╪º┘ä╪¿
          </button>
        )}
        {isMeta && bound && onUnbind && (
          <button
            onClick={onUnbind}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircleIcon className="h-3 w-3" />
            ┘ü┘â ╪º┘ä╪▒╪¿╪╖
          </button>
        )}
      </div>

      {hasContent && isPreviewExpanded && (
        <div className="mt-2 rounded-md bg-white/70 p-2 dark:bg-white/5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            ╪º┘ä┘à╪╣╪º┘è┘å╪⌐ ╪º┘ä┘â╪º┘à┘ä╪⌐
          </p>
          <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-300">
            {resolveVariablesForPreview(previewContent)}
          </p>
          {template?.hasButtons && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {parseTemplateButtons(template?.buttons).map((b, i) => (
                <span
                  key={i}
                  className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-400"
                >
                  {b.text || b.id}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface GroupHeaderProps {
  members: StatusWithTemplate[];
  isNoTemplate: boolean;
  onExpand: () => void;
}

function GroupHeader({ members, isNoTemplate, onExpand }: GroupHeaderProps) {
  return (
    <div
      data-testid="group-header"
      className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isNoTemplate
              ? `${members.length} ╪¡╪º┘ä╪⌐ ╪¿╪»┘ê┘å ┘é╪º┘ä╪¿`
              : `${members.length} ╪¡╪º┘ä╪⌐ ╪¿┘å┘ü╪│ ╪º┘ä┘é╪º┘ä╪¿ ╪º┘ä╪╣╪º┘à`}
          </span>
          <button
            onClick={onExpand}
            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            ╪╣╪▒╪╢ ╪º┘ä╪¬┘ü╪º╪╡┘è┘ä
          </button>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-400">
          {members.map((m) => m.code).slice(0, 5).join("╪î ")}
          {members.length > 5 ? "ΓÇª" : ""}
        </span>
      </div>
      {!isNoTemplate && (members[0]?.template?.content || members[0]?.metaTemplate?.content) && (
        <p className="mt-2 line-clamp-1 text-xs italic text-slate-500 dark:text-slate-500">
          "{(members[0].template?.content || members[0].metaTemplate?.content || "").substring(0, 80)}ΓÇª"
        </p>
      )}
    </div>
  );
}

type ReportRange = "today" | "yesterday" | "7d" | "custom";

interface StatusReportSummary {
  total: number;
  meta: number;
  regular: number;
  delivered: number;
  sent: number;
  read: number;
  failed: number;
  pending: number;
}

interface StatusReportRow {
  eventType: string;
  total: number;
  meta: number;
  regular: number;
  delivered: number;
  sent: number;
  read: number;
  failed: number;
  pending: number;
}

interface StatusReportItem {
  id: string;
  eventType: string;
  orderId: string | null;
  orderNumber: string | null;
  customerName: string | null;
  recipientPhone: string | null;
  templateId: string | null;
  templateName: string | null;
  metaTemplateName: string | null;
  templateChannel: string | null;
  headerUsesOrderProduct: boolean | null;
  messageType: string;
  status: string;
  sentAt: string | null;
  createdAt: string | null;
  failureReason: string | null;
  errorCode: string | null;
}

interface StatusReportData {
  success: boolean;
  range: { startDate: string; endDate: string };
  summary: StatusReportSummary;
  byStatus: StatusReportRow[];
  items: StatusReportItem[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function reportRangeParams(range: ReportRange, startDate: string, endDate: string) {
  const today = new Date();
  if (range === "today") {
    const s = localDateStr(today);
    return { startDate: s, endDate: s };
  }
  if (range === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const s = localDateStr(y);
    return { startDate: s, endDate: s };
  }
  if (range === "7d") {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { startDate: localDateStr(s), endDate: localDateStr(today) };
  }
  return { startDate, endDate };
}

// ┘å┘ü╪│ ╪«╪▒┘è╪╖╪⌐ ╪º┘ä╪¬╪¡┘ê┘è┘ä ┘ü┘è backend/utils (ORDER_STATUS_TO_EVENT_TYPE) ΓÇö
// ╪╣╪┤╪º┘å ┘å╪╖╪º╪¿┘é ╪¡╪º┘ä╪⌐ ┘à╪╣┘è┘æ┘å╪⌐ ┘ü┘è ╪º┘ä╪╡┘ü╪¡╪⌐ ┘à╪╣ ╪º┘ä┘Ç eventType ╪º┘ä┘à╪¬╪«╪▓┘æ┘å ┘ü╪╣┘ä┘ï╪º ┘ü┘è ╪º┘ä╪│╪¼┘ä.
function persistedEventTypeForCode(code: string): string {
  const map: Record<string, string> = {
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
  return map[code] || code;
}

function humanizeEventType(ev: string): string {
  const cleaned = ev.replace(/^ORDER_/, "").replace(/_/g, " ");
  return cleaned || ev;
}

function escapeCsvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function StatusReportTab({ statuses }: { statuses: StatusWithTemplate[] }) {
  const { t } = useTranslation();
  const [range, setRange] = useState<ReportRange>("today");
  const [startDate, setStartDate] = useState(() => localDateStr(new Date()));
  const [endDate, setEndDate] = useState(() => localDateStr(new Date()));
  const [data, setData] = useState<StatusReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "meta" | "regular">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailByEvent, setDetailByEvent] = useState<Record<string, { items: StatusReportItem[]; loading: boolean }>>({});

  const statusNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of statuses) {
      m.set(s.code, s.name);
      m.set(persistedEventTypeForCode(s.code), s.name);
    }
    return m;
  }, [statuses]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = reportRangeParams(range, startDate, endDate);
      const res = await apiClient.get("/whatsapp/notifications/status-report", { params: { ...params, limit: 200 } });
      const body = res.data as StatusReportData | undefined;
      setData(body?.success ? body : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, startDate, endDate]);

  useEffect(() => {
    load();
    setExpanded(new Set());
    setDetailByEvent({});
  }, [load]);

  const toggleExpand = useCallback(async (eventType: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) next.delete(eventType);
      else next.add(eventType);
      return next;
    });
    const cached = detailByEvent[eventType];
    if (cached?.items?.length || cached?.loading) return;
    const params = reportRangeParams(range, startDate, endDate);
    setDetailByEvent((prev) => ({ ...prev, [eventType]: { items: [], loading: true } }));
    try {
      const res = await apiClient.get("/whatsapp/notifications/status-report", {
        params: { ...params, eventType, limit: 500 },
      });
      const detailBody = res.data as StatusReportData | undefined;
      const items = detailBody?.items || [];
      setDetailByEvent((prev) => ({ ...prev, [eventType]: { items, loading: false } }));
    } catch {
      setDetailByEvent((prev) => ({ ...prev, [eventType]: { items: [], loading: false } }));
    }
  }, [detailByEvent, range, startDate, endDate]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = reportRangeParams(range, startDate, endDate);
      const res = await apiClient.get("/whatsapp/notifications/status-report", {
        params: { ...params, limit: 5000 },
      });
      const exportBody = res.data as StatusReportData | undefined;
      const items: StatusReportItem[] = (exportBody?.items || []).filter((it) =>
        typeFilter === "all"
          ? true
          : typeFilter === "meta"
            ? String(it.messageType).toUpperCase() === "TEMPLATE"
            : String(it.messageType).toUpperCase() !== "TEMPLATE"
      );
      const header = [
        "╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿", "╪º┘ä╪╣┘à┘è┘ä", "╪º┘ä┘ç╪º╪¬┘ü", "╪º┘ä╪¡╪º┘ä╪⌐", "╪º╪│┘à ╪º┘ä┘é╪º┘ä╪¿", "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º",
        "╪º┘ä┘å┘ê╪╣", "╪¡╪º┘ä╪⌐ ╪º┘ä╪¬┘ê╪╡┘è┘ä", "╪º┘ä┘ê┘é╪¬", "╪º┘ä╪│╪¿╪¿",
      ];
      const rows = items.map((it) => [
        it.orderNumber,
        it.customerName,
        it.recipientPhone,
        statusNameMap.get(it.eventType) || it.eventType,
        it.templateName,
        it.metaTemplateName,
        String(it.messageType).toUpperCase() === "TEMPLATE" ? "┘à┘è╪¬╪º" : "╪╣╪º╪»┘è",
        it.status,
        it.sentAt ? new Date(it.sentAt).toLocaleString("ar-EG") : it.createdAt ? new Date(it.createdAt).toLocaleString("ar-EG") : "",
        it.errorCode ? `[${it.errorCode}] ${it.failureReason || ""}` : (it.failureReason || ""),
      ].map(escapeCsvCell));
      const csv = "\uFEFF" + [header.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `status-report-${range}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("orders.reportExportError", "┘ü╪┤┘ä ╪¬╪╡╪»┘è╪▒ ╪º┘ä╪¬┘é╪▒┘è╪▒"));
    } finally {
      setExporting(false);
    }
  };

  const visibleRows = useMemo(() => {
    if (!data) return [];
    let rows = data.byStatus;
    if (typeFilter === "meta") rows = rows.filter((r) => r.meta > 0);
    if (typeFilter === "regular") rows = rows.filter((r) => r.regular > 0);
    return rows;
  }, [data, typeFilter]);

  // ╪¡╪º┘ä╪º╪¬ ┘à┘ü╪╣┘æ┘ä╪⌐ ┘ä┘ä╪Ñ╪┤╪╣╪º╪▒ ┘ä┘â┘å ┘à┘ü┘è╪┤ ┘ä┘è┘ç╪º ╪ú┘è ╪Ñ╪▒╪│╪º┘ä ┘ü┘è ╪º┘ä┘ü╪¬╪▒╪⌐ ΓÇö ┘à╪ñ╪┤╪▒ ╪Ñ┘å ╪º┘ä┘é╪º┘ä╪¿ ┘à╪┤ ╪┤╪║╪º┘ä
  const enabledWithoutSends = useMemo(() => {
    if (!data) return [];
    const reported = new Set(data.byStatus.map((r) => r.eventType));
    return statuses.filter((s) => s.notifyCustomer && !s.isNonNotifiable && !reported.has(persistedEventTypeForCode(s.code)));
  }, [data, statuses]);

  const summary = data?.summary;
  const kpis = summary
    ? [
        { label: "╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ╪▒╪│╪º┘ä╪º╪¬", value: summary.total, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-slate-800" },
        { label: "┘é╪º┘ä╪¿ ┘à┘è╪¬╪º", value: summary.meta, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
        { label: "┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è", value: summary.regular, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
        { label: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à", value: summary.delivered, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
        { label: "┘ü╪┤┘ä", value: summary.failed, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
      ]
    : [];

  const statusColors: Record<string, string> = {
    DELIVERED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    READ: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    SENT: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  const statusLabel: Record<string, string> = {
    DELIVERED: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à",
    READ: "┘à┘é╪▒┘ê╪í╪⌐",
    SENT: "┘à╪▒╪│┘ä╪⌐",
    FAILED: "┘ü╪┤┘ä",
    PENDING: "┘é┘è╪» ╪º┘ä╪Ñ╪▒╪│╪º┘ä",
  };

  return (
    <div className="space-y-4" data-testid="status-report-tab">
      {/* Toolbar: ┘å╪╖╪º┘é ╪º┘ä╪¬╪º╪▒┘è╪« + ╪º┘ä┘ü┘ä╪¬╪▒╪⌐ + ╪¬╪╡╪»┘è╪▒ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900/50">
          {([
            { key: "today", label: "╪º┘ä┘è┘ê┘à" },
            { key: "yesterday", label: "╪ú┘à╪│" },
            { key: "7d", label: "╪ó╪«╪▒ 7 ╪ú┘è╪º┘à" },
            { key: "custom", label: "┘ü╪¬╪▒╪⌐ ┘à╪«╪╡╪╡╪⌐" },
          ] as const).map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                range === r.key
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value || localDateStr(new Date()))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="┘à┘å ╪¬╪º╪▒┘è╪«"
            />
            <span className="text-xs text-slate-400">ΓåÆ</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value || localDateStr(new Date()))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="╪Ñ┘ä┘ë ╪¬╪º╪▒┘è╪«"
            />
          </div>
        )}

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          aria-label="┘ü┘ä╪¬╪▒╪⌐ ┘å┘ê╪╣ ╪º┘ä╪Ñ╪▒╪│╪º┘ä"
        >
          <option value="all">┘â┘ä ╪º┘ä╪ú┘å┘ê╪º╪╣</option>
          <option value="meta">┘é╪º┘ä╪¿ ┘à┘è╪¬╪º</option>
          <option value="regular">┘ê╪º╪¬╪│╪º╪¿ ╪╣╪º╪»┘è</option>
        </select>

        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          ╪¬╪¡╪»┘è╪½
        </button>

        <button
          onClick={exportCsv}
          disabled={exporting || !data?.items?.length}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          {exporting ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <DocumentTextIcon className="h-3.5 w-3.5" />
          )}
          ╪¬╪╡╪»┘è╪▒ CSV
        </button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        </div>
      ) : !summary ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-16 text-center dark:border-white/10">
          <DocumentTextIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">┘ä╪º ╪¬┘ê╪¼╪» ╪¿┘è╪º┘å╪º╪¬ ┘ä┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐</p>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-slate-200/70 bg-white p-3.5 dark:border-white/10 dark:bg-slate-900/50">
                <p className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${k.bg} ${k.color}`}>{k.label}</p>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {enabledWithoutSends.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/20 dark:text-amber-300">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <span className="font-semibold">╪¡╪º┘ä╪º╪¬ ┘à┘ü╪╣┘æ┘ä╪⌐ ╪¿╪»┘ê┘å ╪Ñ╪▒╪│╪º┘ä╪º╪¬ ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐:</span>{" "}
                {enabledWithoutSends.map((s) => s.name).join("╪î ")}
                <span className="block text-xs opacity-80">┘ä┘ê ╪º┘ä╪¡╪º┘ä╪⌐ ╪»┘è ┘â╪º┘å ╪º┘ä┘à┘ü╪▒┘ê╪╢ ╪¬╪¬╪¿╪╣╪¬ ┘ü┘è┘ç╪º ╪▒╪│╪º┘è┘ä╪î ╪▒╪º╪¼╪╣ ┘é╪º┘ä╪¿┘ç╪º ┘à┘å ╪¬╪¿┘ê┘è╪¿ ┬½╪º┘ä┘â┘ä┬╗.</span>
              </div>
            </div>
          )}

          {/* Per-status summary table */}
          <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-white/10 dark:bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50 text-[11px] text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="px-3 py-2.5 font-medium">╪º┘ä╪¡╪º┘ä╪⌐</th>
                    <th className="px-3 py-2.5 text-center font-medium">╪Ñ╪¼┘à╪º┘ä┘è</th>
                    <th className="px-3 py-2.5 text-center font-medium">┘à┘è╪¬╪º</th>
                    <th className="px-3 py-2.5 text-center font-medium">╪╣╪º╪»┘è</th>
                    <th className="px-3 py-2.5 text-center font-medium">╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à</th>
                    <th className="px-3 py-2.5 text-center font-medium">┘ü╪┤┘ä</th>
                    <th className="px-3 py-2.5 text-center font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                        ┘ä╪º ╪¬┘ê╪¼╪» ╪Ñ╪▒╪│╪º┘ä╪º╪¬ ┘ä┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((row) => {
                    const isOpen = expanded.has(row.eventType);
                    const detail = detailByEvent[row.eventType];
                    return (
                      <Fragment key={row.eventType}>
                        <tr
                          className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          onClick={() => toggleExpand(row.eventType)}
                        >
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {statusNameMap.get(row.eventType) || humanizeEventType(row.eventType)}
                            </span>
                            {!statusNameMap.has(row.eventType) && (
                              <span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                {row.eventType}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold tabular-nums text-slate-900 dark:text-white">{row.total}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-blue-600 dark:text-blue-400">{row.meta}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-emerald-600 dark:text-emerald-400">{row.regular}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-green-600 dark:text-green-400">{row.delivered}</td>
                          <td className="px-3 py-2.5 text-center tabular-nums text-red-600 dark:text-red-400">{row.failed}</td>
                          <td className="px-3 py-2.5 text-center">
                            <ChevronDownIcon className={`inline h-4 w-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                          </td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={7} className="bg-slate-50/60 px-3 pb-3 dark:bg-slate-800/30">
                              {detail?.loading ? (
                                <div className="flex justify-center py-4">
                                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-500/20 border-t-indigo-500" />
                                </div>
                              ) : !detail || detail.items.length === 0 ? (
                                <p className="py-4 text-center text-xs text-slate-400">┘ä╪º ╪¬┘ê╪¼╪» ╪▒╪│╪º╪ª┘ä ╪¬┘ü╪╡┘è┘ä┘è╪⌐ ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200/70 bg-white dark:border-white/10 dark:bg-slate-900/50">
                                  <table className="w-full text-right text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-200/70 bg-slate-50 text-[10px] text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
                                        <th className="px-3 py-2 font-medium">╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿</th>
                                        <th className="px-3 py-2 font-medium">╪º┘ä╪╣┘à┘è┘ä</th>
                                        <th className="px-3 py-2 font-medium">╪º┘ä┘ç╪º╪¬┘ü</th>
                                        <th className="px-3 py-2 font-medium">╪º┘ä┘é╪º┘ä╪¿</th>
                                        <th className="px-3 py-2 font-medium">╪º┘ä┘å┘ê╪╣</th>
                                        <th className="px-3 py-2 font-medium">╪º┘ä╪¡╪º┘ä╪⌐</th>
                                        <th className="px-3 py-2 font-medium">╪º┘ä┘ê┘é╪¬</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {detail.items
                                        .filter((it) =>
                                          typeFilter === "all"
                                            ? true
                                            : typeFilter === "meta"
                                              ? String(it.messageType).toUpperCase() === "TEMPLATE"
                                              : String(it.messageType).toUpperCase() !== "TEMPLATE"
                                        )
                                        .map((it) => (
                                          <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-3 py-2 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                              {it.orderNumber || "ΓÇö"}
                                            </td>
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{it.customerName || "ΓÇö"}</td>
                                            <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                                              {it.recipientPhone || "ΓÇö"}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {it.templateName || "╪¿╪»┘ê┘å ┘é╪º┘ä╪¿"}
                                              </span>
                                              {it.metaTemplateName && (
                                                <span className="block truncate font-mono text-[10px] text-blue-500 dark:text-blue-400" dir="ltr">
                                                  {it.metaTemplateName}
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              {String(it.messageType).toUpperCase() === "TEMPLATE" ? (
                                                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                  Γÿü∩╕Å ┘à┘è╪¬╪º
                                                </span>
                                              ) : (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                  ≡ƒô▒ ╪╣╪º╪»┘è
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className={`rounded-full px-2 py-0.5 font-medium ${statusColors[it.status] || statusColors["PENDING"]}`}>
                                                {statusLabel[it.status] || it.status}
                                              </span>
                                              {it.status === "FAILED" && it.failureReason && (
                                                <span className="block max-w-[200px] truncate text-[10px] text-red-500" title={it.failureReason}>
                                                  {it.errorCode ? `[${it.errorCode}] ` : ""}{it.failureReason}
                                                </span>
                                              )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-slate-500 dark:text-slate-400">
                                              {(it.sentAt || it.createdAt)
                                                ? new Date((it.sentAt || it.createdAt) as string).toLocaleString("ar-EG", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                  })
                                                : "ΓÇö"}
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
