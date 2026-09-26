import { useEffect, useState, useCallback, useMemo, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
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
  PaperAirplaneIcon,
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
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import MetaTemplatesModal from "../customers/components/MetaTemplatesModal";
import { Label } from "@/components/ui/label";
import { normalizeVariableSyntax } from "./utils";
import type { TemplateScopeConfig, EventRow } from "./types";

// حد Meta Cloud API لطول نص الرسالة (body) — تجاوزه يسبب رفض القالب
const META_BODY_CHAR_LIMIT = 1024;

/** ⓘ تلميح مكتبي مختصر — tooltip عند الـ hover بدل فقرة شرح تاخد مساحة (نمط 2026: micro-hints) */
function FieldHint({ text }: { text: string }) {
  return (
    <span
      role="note"
      aria-label={text}
      title={text}
      tabIndex={0}
      className="inline-flex size-3.5 shrink-0 cursor-help items-center justify-center rounded-full bg-slate-200 align-middle text-[9px] font-bold leading-none text-slate-500 dark:bg-slate-700 dark:text-slate-400"
    >
      i
    </span>
  );
}

// يختار لون نص مقروء (أسود/أبيض) حسب سطوع خلفية الشارة — يضمن تباين WCAG AA
// يدعم #RGB و #RRGGBB و #RRGGBBAA (يتجاهل alpha)
function readableTextColor(hex: string): string {  let c = (hex || "#6B7280").replace("#", "").trim();
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

// ── قنوات الإرسال (تبويب الجدولة — خاص بالعملاء) ──
const CHANNEL_LABELS: Record<string, string> = {
  AUTO: "تلقائي",
  BAILEYS: "واتساب عادي",
  META_CLOUD: "ميتا (قالب معتمد)",
};

const CHANNEL_COLORS: Record<string, string> = {
  AUTO: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  BAILEYS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  META_CLOUD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

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
  /** فئة القالب (OCCASION لمناسبات العملاء) */
  category?: string;
  /** خاص بالعملاء — جدولة */
  channel?: string;
  delayValue?: number;
  delayUnit?: "HOURS" | "DAYS";
  trigger?: string;
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
  boundLocalContent?: string;
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
  /** نوع الزر: QUICK_REPLY (تغيير حالة) أو LINK (فتح صفحة العميل) */
  type?: "QUICK_REPLY" | "LINK";
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
  category: string;
  /** فئة ميتا الصريحة عند النشر — UTILITY/MARKETING/AUTHENTICATION */
  metaCategory: string;
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
    { id: "confirm", text: "تأكيد الأوردر", action: "CONFIRMED", type: "QUICK_REPLY" },
    { id: "cancel", text: "إلغاء الأوردر", action: "CANCELLED", type: "QUICK_REPLY" }
  ],
  sendMode: "direct",
  metaTemplateName: "",
  metaTemplateLanguage: "ar",
  headerFormat: "TEXT",
  headerMediaHandle: "",
  headerMediaName: "",
  headerUsesOrderProduct: false,
  category: "CUSTOMER",
  metaCategory: "UTILITY",
});

const DEFAULT_BUTTON_ACTIONS: { value: string; label: string }[] = [
  { value: "CONFIRMED", label: "تأكيد الطلب" },
  { value: "PROCESSING", label: "تأجيل التسليم" },
  { value: "CANCELLED", label: "إلغاء الطلب" },
];

const LARGE_GROUP_THRESHOLD = 4;

type FilterChip = "all" | "custom" | "meta_bound" | "no_template" | "disabled";
type SortMode = "alphabetical" | "statusType" | "recent";

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

function resolveVariablesForPreview(content: string, sample: Record<string, string> = SAMPLE_VARIABLES): string {
  if (!content) return "";
  // تطبيع صيغة القوس الواحد {var} (نطاق العملاء) إلى المزدوج {{var}} قبل الحل،
  // حتى تعمل المعاينة حتى لو كان المحتوى مخزَّنًا بصيغة القوس الواحد.
  // يدعم { var } بمسافات داخل الأقواس
  const normalized = content.replace(/\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}(?![}])/g, "{{$1}}");
  return normalized.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, name) => {
    return sample[name] || `[${name}]`;
  });
}

/**
 * عرض نص قالب ميتا (اللي فيه {{1}}، {{2}}...) بقيم نموذجية —
 * بيربط كل رقم ميتا بالمتغير المحلي المطابق حسب ترتيب الظهور.
 */
function resolveMetaBodyPreview(metaBody: string, localContent: string, sample: Record<string, string> = SAMPLE_VARIABLES): string {
  if (!metaBody) return "";
  const localVars = extractLocalVariableOrder(localContent);
  return metaBody.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const idx = parseInt(n, 10) - 1;
    const v = localVars[idx];
    return v ? (sample[v] || `[${v}]`) : `[${n}]`;
  });
}

/**
 * ترتيب المتغيرات الافتراضي لبناء محتوى محلي من نص قالب ميتا
 * ({{1}} → {{customerName}}، {{2}} → {{orderNumber}}...)
 * مبيتسوّىش مع أي قالب — المستخدم يقدر يعدّله، بس بيغطي الحالة الشائعة.
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
 * بناء محتوى محلي تلقائي من نص قالب ميتا:
 * بيحوّل كل {{N}} في نص قالب ميتا إلى {{variable}} محلي حسب ترتيب افتراضي،
 * وبيقفل على {{N}} اللي عددها أكتر من المتغيرات المتاحة (مش بيحذف النص).
 */
function buildLocalContentFromMetaBody(metaBody: string, order: string[] = META_TO_LOCAL_DEFAULT_ORDER): string {
  if (!metaBody) return "";
  return metaBody.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n: string) => {
    const idx = parseInt(n, 10) - 1;
    const name = order[idx];
    return name ? `{{${name}}}` : `{{${n}}}`;
  });
}

export { resolveVariablesForPreview, buildLocalContentFromMetaBody };

/**
 * WhatsAppBubblePreview — معاينة مباشرة لشكل الرسالة في محادثة واتساب.
 * بترسم bubble أخضر بـ timestamp ومتغيرات محلولة + الأزرار التفاعلية.
 */
interface WhatsAppBubblePreviewProps {
  content: string;
  buttons: TemplateButton[];
  hasButtons: boolean;
  sampleVariables?: Record<string, string>;
}

function formatWhatsAppText(text: string): string {
  return text.trim();
}

export function WhatsAppBubblePreview({ content, buttons, hasButtons, sampleVariables }: WhatsAppBubblePreviewProps) {
  const resolved = resolveVariablesForPreview(content, sampleVariables);
  const now = new Date();
  const time = now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const visibleButtons = hasButtons ? buttons.filter((b) => b.text.trim()) : [];

  return (
    <div
      data-testid="whatsapp-preview"
      className="relative ms-auto w-[88%] max-w-[340px] rounded-xl rounded-ee-sm bg-[#dcf8c6] p-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100"
      dir="auto"
    >
      <div className="absolute bottom-1.5 end-1.5 flex items-center gap-0.5 text-[#34b7f1] dark:text-sky-300">
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M11.071.653a.5.5 0 0 1 .076.704l-6 7.5a.5.5 0 0 1-.762.026L2.146 6.16a.5.5 0 1 1 .708-.706l1.864 1.864 5.65-7.06a.5.5 0 0 1 .703-.075z" fill="currentColor"/>
          <path d="M15.071.653a.5.5 0 0 1 .076.704l-6 7.5a.5.5 0 0 1-.762.026l-.5-.5.707-.707.13.13 5.65-7.06a.5.5 0 0 1 .7-.075z" fill="currentColor"/>
        </svg>
      </div>

      <p className="whitespace-pre-wrap break-words ps-5 font-[system-ui]">
        {formatWhatsAppText(resolved) || (
          <span className="text-slate-400 dark:text-slate-500">معاينة الرسالة ستظهر هنا...</span>
        )}
      </p>

      <p className="mt-1 pe-5 text-end text-[10px] text-slate-500 dark:text-slate-400">{time}</p>

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
  const GENERIC_PATTERN = /تم تغيير حالة طلبك إلى/;
  return !!status.template?.content && !GENERIC_PATTERN.test(status.template.content);
}

type TemplateSlot = "regular" | "meta";

/**
 * القالب المعروض في slot ميتا:
 * قالب قناة META_CLOUD (النموذج الجديد) أو توافق قديم:
 * القالب العادي اللي عليه ربط ميتا (channel قديم بدون META_CLOUD).
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
        type: String(b?.type || b?.action || "").toUpperCase() === "LINK" ? ("LINK" as const) : ("QUICK_REPLY" as const),
      }))
      .filter((b) => b.id || b.text);
  } catch (e) {
    // 🔎 نُسجّل الخطأ عشان بيانات الأزرار الفاسدة ما تختفيش بصمت أثناء التطوير
    console.warn("[TEMPLATE-BUTTONS] Failed to parse buttons JSON:", (e as Error)?.message);
    return [];
  }
}

/**
 * استخراج أسماء المتغيرات المحلية بالترتيب اللي بتظهر بيه في المحتوى.
 * بيتم استخدامه لربط كل متغير محلي {{customerName}} برقم ميتا {{1}}، {{2}}... بصرياً.
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

function buildVariableDescriptionsFrom(variables: { var: string; desc: string }[]): Record<string, string> {
  return variables.reduce((acc, v) => {
    const key = v.var.replace(/^\{\{|\}\}$/g, "").replace(/^\{|\}$/g, "").trim();
    acc[key] = v.desc;
    return acc;
  }, {} as Record<string, string>);
}

export default function TemplateCenter({ config }: { config: TemplateScopeConfig }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // تسمية الكيان في نصوص الواجهة — «حالة» للطلبات، «حدث» للعملاء وغيرهم
  const noun = config.entityLabel ?? { singular: "حالة", plural: "حالات" };
  const [activeTab, setActiveTab] = useState(() => config.tabs[0]?.key || "all");

  const variableDescriptions = useMemo(() => buildVariableDescriptionsFrom(config.variables), [config.variables]);
  const sampleVariables = useMemo(() => config.sampleVariables || {}, [config.sampleVariables]);

  const [statuses, setStatuses] = useState<StatusWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

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

  // ⚡ Cache جلسات الميتا (TTL 30 ثانية) — منع refetch عند فتح dialogs متتالية
  const metaSessionsCacheRef = useRef<{ data: typeof metaSessions; at: number } | null>(null);
  // ⚡ نعيد جلب الـ preview بعد إغلاق الديالوج فقط لو حصل تعديل فعلي
  const dialogDirtyRef = useRef(false);
  // ⚡ snapshot لحالة النموذج عند فتح الديالوج — عشان نمنع إغلاقه وضياع التعديلات بصمت
  const initialFormRef = useRef<string | null>(null);
  const isFormDirty = () =>
    initialFormRef.current !== null && initialFormRef.current !== JSON.stringify(templateForm);

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
  const [sortMode, setSortMode] = useState<SortMode>(
    config.features.sortModes.includes("alphabetical") ? "alphabetical" : "statusType",
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const isMobile = useMediaQuery("(max-width: 640px)");

  // ── Schedule / test sender state (خاص بالعملاء) ──
  const [editingSchedule, setEditingSchedule] = useState<{
    row: EventRow;
    enabled: boolean;
    activeChannel: string;
    delayValue: number;
    delayUnit: "HOURS" | "DAYS";
  } | null>(null);
  const [savingSchedule, setSavingSchedule] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [testing, setTesting] = useState(false);
  // ── شريط الإنشاء الموحد فوق كل تبويب (عربي) ──
  const [topCreateEvent, setTopCreateEvent] = useState("");
  // 🔗 المناسبات الحقيقية المجدولة (من صفحة مناسبات العملاء) — للربط بالقوالب
  const [liveOccasions, setLiveOccasions] = useState<Array<{ id: string; name: string; scheduledAt: string; recurrence: string; templateId: string | null; totalSent: number }>>([]);
  const [linkedOccasionId, setLinkedOccasionId] = useState<string | null>(null);
  const [linkingOccasion, setLinkingOccasion] = useState<{ id: string; name: string } | null>(null);

  const loadLiveOccasions = useCallback(async () => {
    try {
      const res = await apiClient.get("/customers/whatsapp-notify/occasions");
      setLiveOccasions(res.data?.data || []);
    } catch {
      // صامت — المناسبات اختيارية في العرض
    }
  }, []);

  useEffect(() => {
    if (config.scope === "customers") loadLiveOccasions();
  }, [config.scope, loadLiveOccasions]);

  // ربط مناسبة بقالب معين
  const linkOccasionToTemplate = useCallback(async (occasionId: string, templateId: string | null) => {
    try {
      await apiClient.put(`/customers/whatsapp-notify/occasions/${occasionId}`, { templateId });
      toast.success("اتربطت المناسبة بالقالب");
      setLinkedOccasionId(null);
      loadLiveOccasions();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || "فشل الربط";
      toast.error(msg);
    }
  }, [loadLiveOccasions]);

  const saveScheduleRow = async (row: EventRow) => {
    if (!editingSchedule || !config.saveSchedule) return;
    setSavingSchedule(row.code);
    try {
      await config.saveSchedule(apiClient, row, {
        enabled: editingSchedule.enabled,
        activeChannel: editingSchedule.activeChannel,
        delayValue: editingSchedule.delayValue,
        delayUnit: editingSchedule.delayUnit,
      });
      toast.success("تم حفظ الجدول بنجاح");
      // تحديث موضعي للصف بقيم الحفظ — بدل إعادة جلب كل الأحداث والقوالب بعد كل حفظ
      setStatuses((prev) =>
        prev.map((s) =>
          s.id === row.id
            ? {
                ...s,
                notifyCustomer: editingSchedule.enabled,
                channel: editingSchedule.activeChannel,
                delayValue: editingSchedule.delayValue,
                delayUnit: editingSchedule.delayUnit,
              }
            : s,
        ),
      );
      setEditingSchedule(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل الحفظ");
    } finally {
      setSavingSchedule("");
    }
  };

  // حفظ تلقائي لتفعيل/إيقاف الإشعار من جدول الجدولة — بدون ما المستخدم يضطر يضغط «حفظ»
  // (التعديل على القناة/التأخير لسه بيحتاج زر «حفظ» صريح).
  const toggleScheduleNotify = async (row: EventRow, next: boolean) => {
    if (savingSchedule || !config.saveSchedule) return;
    setSavingSchedule(row.code);
    const prevStatuses = statuses;
    setStatuses((p) => p.map((s) => (s.id === row.id ? { ...s, notifyCustomer: next } : s)));
    try {
      await config.saveSchedule(apiClient, row, {
        enabled: next,
        activeChannel: row.channel || "AUTO",
        delayValue: row.delayValue ?? 0,
        delayUnit: row.delayUnit || "HOURS",
      });
      // زر «تراجع» يفتح نافذة قصيرة لعكس التبديل لو كان بالغلط
      toast.success(
        next ? t("orders.notifyEnabled", `تم تفعيل إشعار: ${row.name}`) : t("orders.notifyDisabled", `تم إيقاف إشعار: ${row.name}`),
        {
          action: {
            label: "تراجع",
            onClick: () => {
              toggleScheduleNotify(row, !next);
            },
          },
        },
      );
    } catch (e: any) {
      setStatuses(prevStatuses);
      toast.error(e?.response?.data?.error || "فشل الحفظ");
    } finally {
      setSavingSchedule("");
    }
  };

  const sendTest = async () => {
    if (!config.testSend) return;
    const phone = testPhone.trim().replace(/[\s-]/g, "");
    if (!phone || !testEvent) {
      toast.error("أدخل رقم الهاتف واختر الحدث");
      return;
    }
    // تحقق خفيف من صيغة الرقم — يسمح بأرقام محلية أو دولية (مع +) بطول معقول
    if (!/^\+?\d{8,15}$/.test(phone)) {
      toast.error("صيغة رقم الهاتف غير صالحة — تأكد إن الرقم مكوّن من 8 إلى 15 رقمًا");
      return;
    }
    setTesting(true);
    try {
      const res = await config.testSend(apiClient, phone, testEvent);
      if (res?.success) toast.success("تم إرسال الإشعار التجريبي");
      else toast.error(res?.message || res?.error || "فشل الإرسال");
    } catch (e: any) {
      // الإشعارات معطلة على مستوى الشركة — الرسالة الافتراضية من السيرفر بتوجه
      // لتبويب إعدادات مش موجود في كل النطاقات، فنتوجه للمسار الصحيح
      if (e?.response?.data?.error === "DISABLED") {
        if (config.features.enableSettings) {
          toast.error(e?.response?.data?.message || "الإشعارات معطلة — فعّلها من تبويب الإعدادات");
        } else if (config.settingsPath) {
          toast.error("الإشعارات معطّلة حالياً — بتتدار من صفحة قوالب إشعارات الطلبات", {
            action: { label: "فتح الإعدادات", onClick: () => navigate(config.settingsPath!) },
          });
        } else {
          toast.error("الإشعارات معطلة حالياً");
        }
      } else {
        toast.error(e?.response?.data?.message || e?.response?.data?.error || "فشل الإرسال التجريبي");
      }
    } finally {
      setTesting(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await config.loadEvents(apiClient);
      setStatuses(rows as StatusWithTemplate[]);
      setLoadError(false);
    } catch (err) {
      setLoadError(true);
      console.error("Failed to fetch statuses with templates", err);
      toast.error(t("orders.loadError", "حدث خطأ في تحميل البيانات"));
    } finally {
      setLoading(false);
    }
  }, [config, t]);

  // 🔧 auto-select first event from the CURRENT tab so the test sender isn't
  // sent with an empty eventType (fixes "بيانات الطلب ناقصة" when switching tabs)
  useEffect(() => {
    const activeTabDef = config.tabs.find((tb) => tb.key === activeTab);
    const tabStatuses = activeTabDef?.kind === 'list' && activeTabDef.filter
      ? statuses.filter((s) => activeTabDef.filter!(s as EventRow))
      : statuses;
    if (!testEvent && tabStatuses.length > 0) {
      const first = tabStatuses[0];
      if (first?.code) setTestEvent(first.code);
    }
  }, [statuses, testEvent, activeTab, config]);

  const fetchSettings = useCallback(async () => {
    if (!config.features.enableSettings) return;
    setSettingsLoading(true);
    try {
      const res = await apiClient.get(config.endpoints?.settings || "/whatsapp/notifications/settings");
      if (res.data?.success) {
        setSettings(res.data.settings);
        setSettingsSessions(res.data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    } finally {
      setSettingsLoading(false);
    }
  }, [config]);

  const fetchDeliveryPreview = useCallback(async () => {
    if (!config.endpoints?.deliveryPreview) return;
    try {
      const res = await apiClient.get(config.endpoints.deliveryPreview);
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
      // silent fail — الـ preview ميزة مساعدة
      console.error("Failed to fetch delivery preview", err);
    }
  }, [config]);

  useEffect(() => {
    document.title = `${config.documentTitle} | MaxP`;
    // جلسات الميتا عند الدخول — المزامنة التلقائية وتحذيرات الربط محتاجاها بدون فتح دايلوج
    fetchMetaSessions();
    // ⚡ Promise.allSettled: نجمع الطلبات المستقلة لتجنب waterfall وإخفاء الـ loading خاطئ
    Promise.allSettled([fetchData(), fetchSettings(), fetchDeliveryPreview()]);
  }, [fetchData, fetchSettings, fetchDeliveryPreview, config]);

  // نعيد جلب الـ preview بعد إغلاق الديالوج فقط لو حصل تعديل فعلي (وليس "إلغاء" بدون تغيير)
  useEffect(() => {
    if (dialogOpen === false) {
      if (dialogDirtyRef.current) {
        fetchDeliveryPreview();
        dialogDirtyRef.current = false;
      }
    }
  }, [dialogOpen, fetchDeliveryPreview]);

  // فتح شاشة إنشاء مناسبة جديدة — بديل عن "الكارت الثابت" اللي كان ظاهر في تبويب المناسبات
  const openNewOccasion = (slot: TemplateSlot = "regular") => {
    const newStatus: StatusWithTemplate = {
      id: "__new_occasion__",
      code: `CUSTOMER_OCCASION_${Date.now().toString(36)}`,
      name: "مناسبة جديدة",
      color: "#8B5CF6",
      sortOrder: 100000,
      statusType: "occasion",
      notifyCustomer: true,
      isSystemStatus: false,
      template: null,
      metaTemplate: null,
      hasTemplate: false,
      hasMetaTemplate: false,
      isNonNotifiable: false,
      category: "OCCASION",
    };
    openCreateDialog(newStatus, slot);
  };

  // إنشاء قالب منتج جديد — نفس آلية المناسبة لكن بفئة PRODUCTS
  const openNewProduct = (slot: TemplateSlot = "regular") => {
    const newStatus: StatusWithTemplate = {
      id: "__new_product__",
      code: `NEW_PRODUCT_${Date.now().toString(36).toUpperCase()}`,
      name: "قالب منتج جديد",
      color: "#0EA5E9",
      sortOrder: 200000,
      statusType: "products",
      notifyCustomer: true,
      isSystemStatus: false,
      template: null,
      metaTemplate: null,
      hasTemplate: false,
      hasMetaTemplate: false,
      isNonNotifiable: false,
      category: "PRODUCTS",
    };
    openCreateDialog(newStatus, slot);
  };

  const openCreateDialog = (status: StatusWithTemplate, slot: TemplateSlot) => {
    setSelectedStatus(status);
    setSelectedTemplate(null);
    setDialogSlot(slot);
    setDialogMode("create");
    setOriginalMetaTemplateName("");
    setMetaAutoFilled(false);
    const form: TemplateFormState = {
      name: slot === "meta" ? `قالب ميتا ${status.name}` : `قالب ${status.name}`,
      content: slot === "meta" && status.template?.content ? status.template.content : config.defaultContent,
      isActive: true,
      hasButtons: config.features.enableButtons,
      buttons: config.features.enableButtons
        ? (config.defaultCreateButtons
          ? config.defaultCreateButtons.map((b) => ({ ...b }))
          : [
              { id: "confirm", text: "تأكيد الأوردر", action: "CONFIRMED", type: "QUICK_REPLY" },
              { id: "cancel", text: "إلغاء الأوردر", action: "CANCELLED", type: "QUICK_REPLY" },
            ])
        : [],
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: "",
      metaTemplateLanguage: "ar",
      headerFormat: slot === "meta" ? "IMAGE" : "TEXT",
      headerMediaHandle: "",
      headerMediaName: "",
      headerUsesOrderProduct: config.features.enableHeaderProductImage && slot === "meta",
      category: config.features.categoryMode === "manual"
        ? (status.category || config.features.dialogCategoryOptions?.[0]?.value || "CUSTOMER")
        : "CUSTOMER",
      metaCategory: String(status.category || "").toUpperCase() === "MARKETING" ? "MARKETING" : "UTILITY",
    };
    setTemplateForm(form);
    initialFormRef.current = JSON.stringify(form);
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
    const form: TemplateFormState = {
      name: target?.name || (slot === "meta" ? `قالب ميتا ${status.name}` : `قالب ${status.name}`),
      content: target?.content || config.defaultContent,
      isActive: target?.isActive ?? true,
      hasButtons: config.features.enableButtons ? (target?.hasButtons ?? true) : false,
      buttons: config.features.enableButtons ? parseTemplateButtons(target?.buttons) : [],
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: metaName,
      metaTemplateLanguage: target?.metaTemplateLanguage || "ar",
      headerFormat: target?.headerFormat || (slot === "meta" ? "IMAGE" : "TEXT"),
      headerMediaHandle: target?.headerMediaHandle || "",
      headerMediaName: target?.headerMediaHandle || "",
      headerUsesOrderProduct: config.features.enableHeaderProductImage ? (target?.headerUsesOrderProduct ?? (slot === "meta")) : false,
      category: config.features.categoryMode === "manual"
        ? (status.category || config.features.dialogCategoryOptions?.[0]?.value || "CUSTOMER")
        : "CUSTOMER",
      metaCategory: String(status.category || "").toUpperCase() === "MARKETING" ? "MARKETING" : "UTILITY",
    };
    setTemplateForm(form);
    initialFormRef.current = JSON.stringify(form);
    setDialogOpen(true);
    fetchMetaSessions();
  };

  /**
   * وضع "تغيير القالب": شاشة بسيطة لربط قالب ميتا معتمد مختلف.
   * مش بيعدّل محتوى الرسالة الحالية — بس بيدور على قالب معتمد تاني ويربطه.
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
    const form: TemplateFormState = {
      name: current?.name || `قالب ميتا ${status.name}`,
      content: current?.content || config.defaultContent,
      isActive: current?.isActive ?? true,
      hasButtons: config.features.enableButtons ? (current?.hasButtons ?? true) : false,
      buttons: config.features.enableButtons ? parseTemplateButtons(current?.buttons) : [],
      sendMode: "bind_meta",
      metaTemplateName: metaName,
      metaTemplateLanguage: current?.metaTemplateLanguage || "ar",
      headerFormat: current?.headerFormat || "IMAGE",
      headerMediaHandle: current?.headerMediaHandle || "",
      headerMediaName: current?.headerMediaHandle || "",
      headerUsesOrderProduct: config.features.enableHeaderProductImage ? (current?.headerUsesOrderProduct ?? true) : false,
      category: config.features.categoryMode === "manual" ? (config.features.dialogCategoryOptions?.[0]?.value || "CUSTOMER") : "CUSTOMER",
      metaCategory: "UTILITY",
    };
    setTemplateForm(form);
    initialFormRef.current = JSON.stringify(form);
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const persistLocalTemplate = useCallback(async (): Promise<string | null> => {
    if (!selectedStatus) return null;
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "محتوى الرسالة مطلوب"));
      return null;
    }
    const enableButtons = config.features.enableButtons;
    const saveButtons = enableButtons && templateForm.hasButtons
      ? templateForm.buttons
          .filter((b) => b.text.trim())
          .map((b) => ({
            id: b.id,
            text: b.text.trim(),
            action: b.type === "LINK" ? "LINK" : b.action.toUpperCase(),
            type: b.type || "QUICK_REPLY",
          }))
      : [];
    setSaving(true);
    try {
      const isEdit = !!selectedTemplate?.id;
      const category =
        config.features.categoryMode === "manual"
          ? templateForm.category || "CUSTOMER"
          : config.resolveCategory?.(selectedStatus as EventRow) || "ORDERS";
      const contentOut =
        config.variableSyntax === "single"
          ? normalizeVariableSyntax(templateForm.content, "single")
          : templateForm.content;
      const payload: {
        category: string;
        eventType: string;
        name: string;
        content: string;
        isActive: boolean;
        hasButtons: boolean;
        buttons: { id: string; text: string; action: string; type?: string }[];
        channel?: string;
        headerFormat?: string;
        headerMediaHandle?: string;
        headerUsesOrderProduct?: boolean;
        variables?: string[];
      } = {
        category,
        eventType: selectedStatus.code,
        name: templateForm.name,
        content: contentOut,
        isActive: templateForm.isActive,
        hasButtons: saveButtons.length > 0,
        buttons: saveButtons,
        variables: extractLocalVariableOrder(templateForm.content),
      };
      if (dialogSlot === "meta" && templateForm.headerFormat !== "TEXT") {
        payload.headerFormat = templateForm.headerFormat;
        payload.headerMediaHandle = templateForm.headerMediaHandle || undefined;
        if (config.features.enableHeaderProductImage) {
          payload.headerUsesOrderProduct = templateForm.headerUsesOrderProduct;
        }
      }
      if (!isEdit) {
        payload.channel = dialogSlot === "meta" ? "META_CLOUD" : "AUTO";
      }
      if (isEdit) {
        await apiClient.put(`${config.templateCrudBase}/${selectedTemplate!.id}`, payload);
        toast.success(t("orders.templateUpdated", "تم تحديث القالب بنجاح"));
        dialogDirtyRef.current = true;
        return selectedTemplate!.id;
      } else {
        const res = await apiClient.post(config.templateCrudBase, payload);
        const created = (res?.data as { template?: { id?: string } })?.template;
        const newTemplateId = created?.id;
        if (!newTemplateId) {
          toast.error(t("orders.templateSaveError", "حدث خطأ في حفظ القالب"));
          return null;
        }
        toast.success(t("orders.templateCreated", "تم إنشاء القالب بنجاح"));
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
      toast.error(err?.response?.data?.message || t("orders.templateSaveError", "حدث خطأ في حفظ القالب"));
      return null;
    } finally {
      setSaving(false);
    }
  }, [selectedStatus, selectedTemplate, templateForm, dialogSlot, config, t]);

  const uploadHeaderMedia = useCallback(async (file: File) => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    setHeaderUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", selectedMetaSession);
      const res = await apiClient.post<{ success?: boolean; mediaId?: string; fileName?: string; error?: string }>(
        config.endpoints?.uploadMedia || "/whatsapp-templates/templates/upload-media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const data = res.data;
      if (data?.success && data.mediaId) {
        setTemplateForm((p) => ({ ...p, headerMediaHandle: data.mediaId!, headerMediaName: data.fileName || file.name }));
        toast.success(t("orders.headerMediaUploaded", "تم رفع الوسيط — جاهز للنشر على ميتا"));
      } else {
        toast.error(data?.error || t("orders.headerMediaUploadFailed", "فشل رفع الوسيط"));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.headerMediaUploadFailed", "فشل رفع الوسيط"));
    } finally {
      setHeaderUploading(false);
    }
  }, [selectedMetaSession, config, t]);

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
      toast.error(t("orders.templateContentRequired", "محتوى الرسالة مطلوب"));
      return;
    }
    const saved = await persistLocalTemplate();
    if (!saved) return;
    if (templateForm.content.length > META_BODY_CHAR_LIMIT) {
      toast.error(t("orders.metaBodyTooLong", `النص أطول من حد ميتا (${META_BODY_CHAR_LIMIT} حرف) — قلّل النص قبل النشر`));
      return;
    }
    setResubmittingMeta(true);
    try {
      const res = await apiClient.post(`${config.metaOpsBase}/${selectedTemplate.id}/resubmit-meta`, {
        sessionId: selectedMetaSession,
      });
      const data = res.data;
      if (data?.applied && data?.success) {
        // تم تعديل قالب ميتا الموجود نفسه بالمحتوى الجديد — ميتا تعيد مراجعته تلقائياً
        const status = data.verifiedStatus || "PENDING";
        toast.success(
          data.message ||
          t("orders.metaResubmitted", `تم تحديث القالب على ميتا — الحالة: ${status}`)
        );
        setDialogOpen(false);
      } else if (data?.success && data?.metaTemplateName) {
        // (توافق للخلف) في حال أنشأ الخادم قالباً جديداً
        toast.success(
          data.message ||
          t("orders.metaResubmittedNew", "تم تحديث القالب على ميتا — سيتم تفعيله بعد الموافقة")
        );
        setDialogOpen(false);
      } else if (data?.applied === false) {
        toast.warning(
          data.applyReason ||
          t("orders.metaNotApplied", "ميتا لسه شايلة المحتوى القديم — جرب تاني بعد شوية")
        );
      } else {
        toast.warning(
          data?.applyReason ||
          t("orders.metaResubmitted", "تم تحديث القالب على ميتا — هيتراجع تاني")
        );
      }
      fetchData();
      fetchDeliveryPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.metaResubmitFailed", "فشل تحديث القالب على ميتا"));
    } finally {
      setResubmittingMeta(false);
    }
  };

  const toggleNotify = async (status: StatusWithTemplate) => {
    if (togglingId) return; // منع الضغط المتكرر (double-click guard)
    const nextValue = !status.notifyCustomer;
    setTogglingId(status.id);
    // Optimistic update + rollback على الفشل
    const prevStatuses = statuses;
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id !== status.id) return s;
        const updated = { ...s, notifyCustomer: nextValue };
        // لمناسبات/منتجات العملاء، تفعيل الإشعار يقلب isActive في القالب نفسه — نوائمه في الحالة المحلية
        if (s.category === "OCCASION" || s.category === "PRODUCTS") {
          if (updated.template) updated.template = { ...updated.template, isActive: nextValue };
          if (updated.metaTemplate) updated.metaTemplate = { ...updated.metaTemplate, isActive: nextValue };
        }
        return updated;
      })
    );
    try {
      await config.toggleNotify(apiClient, status as EventRow);
      toast.success(
        nextValue
          ? t("orders.notifyEnabled", `تم تفعيل إشعار: ${status.name}`)
          : t("orders.notifyDisabled", `تم إيقاف إشعار: ${status.name}`)
      );
    } catch (err: any) {
      // Rollback: نعيد الحالة الأصلية لو فشل الـ API
      setStatuses(prevStatuses);
      toast.error(err?.response?.data?.message || t("orders.toggleError", "حدث خطأ"));
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
      const res = await apiClient.get(config.endpoints?.sessions || "/whatsapp/sessions");
      const list: { id: string; name: string; provider: string; metaDisplayPhoneNumber?: string }[] = res.data?.sessions || [];
      const cloud = list.filter((s) => s.provider === "META_CLOUD");
      metaSessionsCacheRef.current = { data: cloud, at: now };
      setMetaSessions(cloud);
      if (cloud.length > 0 && !selectedMetaSession) {
        setSelectedMetaSession(cloud[0].id);
      }
    } catch {}
  }, [selectedMetaSession, config]);

  const publishToMeta = async (templateId: string) => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    setPublishingId(templateId);
    try {
      await apiClient.post(`${config.metaOpsBase}/${templateId}/publish`, {
        sessionId: selectedMetaSession,
        metaCategory: templateForm.metaCategory || undefined,
      });
      toast.success(t("orders.publishedToMeta", "تم إرسال القالب لميتا للمراجعة"));
      // نغلق الديالوج ونعيد الجلب — بدل بادج «محفوظ (بدون ربط)» المضلل
      // ولمنع ضغطة تانية تنشئ قالب ميتا مكرر بنفس الاسم المتولد
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.publishFailed", "فشل النشر على ميتا"));
    } finally {
      setPublishingId(null);
    }
  };

  const createMetaTemplate = async () => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "محتوى الرسالة مطلوب"));
      return;
    }
    // حد ميتا الصارم لطول الـ body — النشر بعده مضمون الرفض
    if (templateForm.content.length > META_BODY_CHAR_LIMIT) {
      toast.error(t("orders.metaBodyTooLong", `النص أطول من حد ميتا (${META_BODY_CHAR_LIMIT} حرف) — قلّل النص قبل النشر`));
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
      const res = await apiClient.get(`${config.metaOpsBase}/meta-available`, {
        params: { sessionId: selectedMetaSession },
      });
      setAvailableMetaTemplates(res.data?.templates || []);
    } catch {
      setAvailableMetaTemplates([]);
    } finally {
      setLoadingMetaTemplates(false);
    }
  }, [selectedMetaSession, config.metaOpsBase]);

  const bindMetaTemplate = async (templateId: string, metaTemplateName: string, metaTemplateLanguage: string) => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    setBindingId(templateId);
    try {
      await apiClient.post(`${config.metaOpsBase}/${templateId}/bind-meta`, {
        sessionId: selectedMetaSession,
        metaTemplateName,
        metaTemplateLanguage,
      });
      toast.success(t("orders.boundToMeta", "تم ربط القالب بقالب ميتا المعتمد"));
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.bindFailed", "فشل ربط القالب بميتا"));
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
      await apiClient.put(`${config.templateCrudBase}/${target.id}`, {
        metaTemplateName: null,
        metaTemplateId: null,
        metaTemplateStatus: null,
      });
      toast.success(t("orders.unboundToMeta", "تم فك ربط القالب بقالب ميتا"));
      setUnbindTarget(null);
      dialogDirtyRef.current = true;
      fetchData();
      fetchDeliveryPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.bindFailed", "فشل ربط القالب بميتا"));
      setUnbindTarget(null);
    }
  };

  useEffect(() => {
    if (dialogOpen && selectedMetaSession) {
      fetchAvailableMetaTemplates();
    }
  }, [dialogOpen, selectedMetaSession, fetchAvailableMetaTemplates]);

  const syncMetaStatuses = async (silent = false) => {
    const metaSessionId = selectedMetaSession || metaSessions[0]?.id;
    if (!metaSessionId) {
      if (!silent) toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    if (!silent) setSyncingStatus(true);
    try {
      const res = await apiClient.post(`${config.metaOpsBase}/sync-status`, { sessionId: metaSessionId });
      const data = res.data as { success?: boolean; synced?: number };
      if (data?.success) {
        const synced = data.synced ?? 0;
        if (synced === 0) {
          if (!silent) toast.success(t("orders.metaSyncUpToDate", "كل القوالب محدّثة — مفيش حاجة اتغيرت"));
        } else {
          toast.success(t("orders.metaSyncDone", `تمت مزامنة ${synced} قالب`));
          const rejectedCount = Object.values(deliveryPreview).filter((p) => p.metaTemplateStatus === "REJECTED").length;
          if (rejectedCount > 0) {
            toast.warning(t("orders.metaSyncRejected", `${rejectedCount} قالب اترفض من ميتا — راجعهم`));
          }
        }
        fetchData();
        fetchDeliveryPreview();
      }
    } catch (err: any) {
      // فشل المزامنة التلقائية غير حرج — نسجله فقط بدون إزعاج المستخدم
      if (silent) console.warn("[META-SYNC] auto-sync failed:", err?.message);
      else toast.error(err?.response?.data?.error || t("orders.metaSyncFailed", "فشلت المزامنة من ميتا"));
    } finally {
      if (!silent) setSyncingStatus(false);
    }
  };

  // 🔄 مزامنة تلقائية واحدة عند الدخول لو فيه قوالب مربوطة بميتا — عشان بادج
  // PENDING/APPROVED/REJECTED يظهر محدّث من ميتا بدون ما المستخدم يدور على زرار مزامنة
  const autoSyncDoneRef = useRef(false);
  useEffect(() => {
    if (autoSyncDoneRef.current) return;
    if (loading || statuses.length === 0 || metaSessions.length === 0) return;
    autoSyncDoneRef.current = true;
    const hasBoundMeta = statuses.some((s) => isMetaTemplateBound(s.template) || isMetaTemplateBound(s.metaTemplate));
    if (hasBoundMeta) syncMetaStatuses(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, statuses, metaSessions]);

  const handleSaveSettings = async () => {
    if (!settings) return;

    // 🧪 Validation قبل الحفظ
    const rate = Number(settings.rateLimitPerMinute);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 60) {
      toast.error(t("orders.settingsRateInvalid", "الحد الأقصى للرسائل في الدقيقة يجب أن يكون بين 1 و 60"));
      return;
    }
    if (settings.quietHoursEnabled) {
      const startMin = timeToMinutes(settings.quietHoursStart || "");
      const endMin = timeToMinutes(settings.quietHoursEnd || "");
      if (startMin == null || endMin == null) {
        toast.error(t("orders.settingsQuietHoursInvalid", "صيغة ساعات الهدوء غير صحيحة"));
        return;
      }
      if (startMin === endMin) {
        toast.error(t("orders.settingsQuietHoursSame", "بداية ونهاية ساعات الهدوء لا يمكن أن تتطابقا"));
        return;
      }
    }

    setSettingsSaving(true);
    try {
      const res = await apiClient.put("/whatsapp/notifications/settings", settings);
      if (res.data?.success) {
        toast.success(t("orders.settingsSaved", "تم حفظ الإعدادات"));
        dialogDirtyRef.current = true;
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.settingsError", "فشل حفظ الإعدادات"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    // أزرار سريعة مناسبة للنطاق — النطاقات غير الطلبية (العملاء) محتاجة إجراءات
    // غير انتقال الحالة (فتح المتجر/عرض النقاط) مش تأكيد/إلغاء الطلب.
    const actions = config.features.quickReplyActions ?? DEFAULT_BUTTON_ACTIONS;
    for (const a of actions) map.set(a.value, a.label);
    for (const s of statuses) {
      if (s.code && !map.has(s.code)) map.set(s.code, s.name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [statuses, config.features.quickReplyActions]);

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
        buttons: [...p.buttons, { id: `btn_${Date.now()}`, text: "", action: "CONFIRMED", type: "QUICK_REPLY" }],
      };
    });
  };

  const addLinkButton = () => {
    setTemplateForm((p) => {
      if (p.buttons.length >= 3) return p;
      return {
        ...p,
        buttons: [...p.buttons, { id: `link_${Date.now()}`, text: "صفحتي على المتجر", action: "LINK", type: "LINK" }],
      };
    });
  };

  const activeTabDef = config.tabs.find((tb) => tb.key === activeTab);
  const filteredStatuses = useMemo(() => {
    if (activeTabDef?.kind === "list" && activeTabDef.filter) {
      return statuses.filter((s) => activeTabDef.filter!(s as EventRow));
    }
    return statuses;
  }, [statuses, activeTab, config.tabs]);

  // مزامنة اختيار نوع الحدث في شريط الإنشاء العلوي مع التبويب الحالي
  useEffect(() => {
    if (config.scope !== "customers" || activeTabDef?.kind !== "list") return;
    // حالة فارغة: occasions/products بدون صفوف — اضبط اختيار افتراضي لزر الإنشاء الأول
    if (filteredStatuses.length === 0) {
      if (activeTab === "occasions" && topCreateEvent !== "__new_occasion__") setTopCreateEvent("__new_occasion__");
      else if (activeTab === "products" && topCreateEvent !== "__new_product__") setTopCreateEvent("__new_product__");
      return;
    }
    if (!topCreateEvent && filteredStatuses.length > 0) {
      setTopCreateEvent(filteredStatuses[0].code);
    }
    if (topCreateEvent && !filteredStatuses.some((s) => s.code === topCreateEvent) && topCreateEvent !== "__new_occasion__" && topCreateEvent !== "__new_product__") {
      setTopCreateEvent(filteredStatuses[0]?.code || "");
    }
  }, [activeTab, filteredStatuses, topCreateEvent, activeTabDef?.kind, config.scope]);

  const visibleStatuses = useMemo(
    () => filteredStatuses.filter((s) => showInternal || !s.isNonNotifiable),
    [filteredStatuses, showInternal]
  );

  const internalCount = filteredStatuses.filter((s) => s.isNonNotifiable).length;

  const scheduleCountLabel = useMemo(() => {
    const sched = statuses.filter((s) => {
      const st = String(s.statusType || "").toLowerCase();
      const cat = String(s.category || "").toUpperCase();
      // يستبعد المناسبات/المنتجات سواء جاءت كـ statusType صغير أو category كبير — يطابق فلتر الجدول
      return st !== "occasion" && st !== "products" && cat !== "OCCASION" && cat !== "PRODUCTS";
    });
    const on = sched.filter((s) => s.notifyCustomer).length;
    return `${on}/${sched.length}`;
  }, [statuses]);
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
      const key =
        config.features.groupMode === "identity"
          ? s.code
          : s.template?.content?.trim() || s.metaTemplate?.content?.trim() || "__no-template__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return { groupedStatuses: groups, groupKeys: Array.from(groups.keys()) };
  }, [filteredByChipAndSearch, config.features.groupMode]);

  const togglePreview = useCallback((id: string) => {
    setExpandedPreviews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const metaBindingChanged = dialogSlot === "meta" && templateForm.metaTemplateName !== originalMetaTemplateName;
  const buttonsSignature = (btns: TemplateButton[]): string =>
    JSON.stringify(
      (Array.isArray(btns) ? btns : [])
        .filter((b) => b.text.trim())
        .map((b) => ({
          id: b.id,
          text: b.text.trim(),
          action: b.type === "LINK" ? "LINK" : String(b.action || "").toUpperCase(),
          type: b.type || "QUICK_REPLY",
        }))
    );
  const metaContentChanged =
    dialogSlot === "meta" &&
    !!selectedTemplate?.id &&
    (templateForm.content !== (selectedTemplate?.content || "") ||
      templateForm.hasButtons !== (selectedTemplate?.hasButtons ?? false) ||
      buttonsSignature(templateForm.buttons) !== buttonsSignature(parseTemplateButtons(selectedTemplate?.buttons)));
  const isMetaBound = dialogSlot === "meta" && !!originalMetaTemplateName;

  // فاليديشن قبل الحفظ: عدد المتغيرات المحلية لازم يطابق قالب ميتا المختار
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
    if (dialogMode === "switch") return `تغيير قالب ميتا: ${selectedStatus?.name}`;
    if (dialogSlot !== "meta") {
      return `${selectedTemplate?.id ? "تعديل قالب واتساب" : "إنشاء قالب واتساب"}: ${selectedStatus?.name}`;
    }
    if (dialogMode === "create") return `إنشاء قالب ميتا: ${selectedStatus?.name}`;
    if (isMetaBound && metaContentChanged) return `تحديث محتوى قالب ميتا: ${selectedStatus?.name}`;
    return `تعديل قالب ميتا: ${selectedStatus?.name}`;
  })();

  /**
   * اختيار قالب ميتا → تحديث المحتوى المحلي تلقائياً (auto-fill):
   * - لو القالب مربوط بحالة تانية (boundLocalContent) → ننسخ محتواها الصح (أفضل مصدر للمتغيرات).
   * - غير كده → نبني محتوى من نص قالب ميتا ({{N}} → متغير محلي افتراضي).
   * - مش بنلغي محتوى المستخدم لو هو كتبه ومتطابق بالفعل (فيه متغيرات كفاية).
   */
  const handleMetaTemplateSelect = (name: string) => {
    const selected = availableMetaTemplates.find((m) => m.name === name);
    const metaBody = (selected?.components || []).find((c) => c.type === "BODY")?.text || "";

    setTemplateForm((p) => {
      const existingVars = extractLocalVariableOrder(p.content);
      const metaVarCount = (metaBody.match(/\{\{\s*\d+\s*\}\}/g) || []).length;
      const needsFill = metaVarCount > 0 && existingVars.length < metaVarCount;
      if (needsFill) {
        const filled = selected?.boundLocalContent || buildLocalContentFromMetaBody(metaBody, config.metaToLocalDefaultOrder);
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
  // هل فيه أي قالب مربوط بميتا في كل التبويبات؟ — لإظهار زرار مزامنة حالات ميتا في الهيدر
  const anyBoundMeta = statuses.some((s) => isMetaTemplateBound(s.template) || isMetaTemplateBound(s.metaTemplate));

  // 🚀 القوالب الجاهزة محلياً للميتا والتي لم تُرسل بعد للمراجعة (للأكونتات الجديدة وغير المربوطة)
  const unsubmittedMetaTemplates = useMemo(() => {
    return statuses.filter((s) => {
      const meta = s.metaTemplate || (s.template?.metaTemplateName ? s.template : null);
      if (!meta || !meta.metaTemplateName) return false;
      const status = String(meta.metaTemplateStatus || "").toUpperCase();
      return !status || status === "DRAFT" || status === "NULL";
    });
  }, [statuses]);

  const [batchPublishing, setBatchPublishing] = useState(false);

  const handleBatchPublishToMeta = async () => {
    if (metaSessions.length === 0) {
      toast.error("يرجى ربط وتفعيل جلسة Meta Cloud في واتساب أولاً لتتمكن من إرسال القوالب لميتا");
      return;
    }
    const sessionId = selectedMetaSession || metaSessions[0]?.id;
    if (!sessionId) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    setBatchPublishing(true);
    try {
      const templateIds = unsubmittedMetaTemplates
        .map((s) => s.metaTemplate?.id || s.template?.id)
        .filter((id): id is string => Boolean(id));

      const res = await apiClient.post(`${config.metaOpsBase}/batch-publish-meta`, {
        sessionId,
        templateIds,
      });
      const data = res.data as { success?: boolean; submittedCount?: number; message?: string };
      if (data?.success) {
        toast.success(data.message || `تم إرسال ${data.submittedCount ?? 0} قوالب إلى Meta للمراجعة بنجاح`);
        fetchData();
      } else {
        toast.error("فشل إرسال بعض القوالب إلى Meta");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إرسال القوالب إلى Meta");
    } finally {
      setBatchPublishing(false);
    }
  };

  // الزراران العلويان في شريط الإنشاء — مدخل سريع من أول الصفحة (الميتا أساسي + العادي)
  const handleTopCreate = (slot: TemplateSlot) => {
    if (filteredStatuses.length === 0) {
      if (activeTab === "occasions") { openNewOccasion(slot); return; }
      if (activeTab === "products") { openNewProduct(slot); return; }
      toast.error("لا توجد أحداث في هذا التبويب");
      return;
    }
    const code = topCreateEvent || filteredStatuses[0]?.code || "";
    if (code === "__new_occasion__") { openNewOccasion(slot); return; }
    if (code === "__new_product__") { openNewProduct(slot); return; }
    if (!code) {
      toast.error("اختر نوع الحدث أولاً");
      return;
    }
    const status = filteredStatuses.find((s) => s.code === code) || filteredStatuses[0];
    if (status) openCreateDialog(status, slot);
    else toast.error("نوع الحدث غير موجود");
  };
  const defaultSession = settingsSessions.find((s) => s.id === settings?.defaultSessionId);
  const defaultSessionIsMeta = defaultSession?.provider === "META_CLOUD" || !!metaSessions.find((s) => s.id === settings?.defaultSessionId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {config.title}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {config.description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {anyBoundMeta && metaSessions.length > 0 && (
              <button
                onClick={() => syncMetaStatuses(false)}
                disabled={syncingStatus}
                title="تحديث حالة قوالب ميتا (معتمد/مرفوض/قيد المراجعة) من ميتا مباشرة"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${syncingStatus ? "animate-spin" : ""}`} />
                مزامنة حالات ميتا
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 شريط إرسال القوالب لميتا لأول مرة (للأكونتات الجديدة وغير المربوطة) */}
      {unsubmittedMetaTemplates.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/[0.06] p-3.5 backdrop-blur-sm dark:border-sky-500/30 dark:bg-sky-500/10">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-500/25 dark:text-sky-400">
              <GlobeAltIcon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                قوالب Meta الرسمية جاهزة ({unsubmittedMetaTemplates.length} قالب جاهز)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                تم تجهيز قوالب الحالات تلقائياً بمعايير Meta المعتمدة. اضغط لإرسالها لميتا للمراجعة والاعتماد لأول مرة.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metaSessions.length > 1 && (
              <select
                value={selectedMetaSession}
                onChange={(e) => setSelectedMetaSession(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {metaSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleBatchPublishToMeta}
              disabled={batchPublishing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-95 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
            >
              {batchPublishing ? (
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PaperAirplaneIcon className="h-3.5 w-3.5" />
              )}
              إرسال القوالب إلى Meta
            </button>
          </div>
        </div>
      )}

      {/* ── Test sender strip (خاص بالعملاء) ── */}
      {config.features.enableTestSender && config.testSend && (
        <div className="mb-4 rounded-xl border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-slate-900/50">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] items-end">
            <div>
              <Label htmlFor="test-phone" className="text-xs text-slate-500">إرسال تجريبي (رقم الهاتف)</Label>
              <input
                id="test-phone"
                dir="ltr"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="01000000000"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="test-event" className="text-xs text-slate-500">الحدث</Label>
              <select
                id="test-event"
                value={testEvent}
                onChange={(e) => setTestEvent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">اختر الحدث...</option>
                {statuses.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={sendTest}
              disabled={testing}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
              {testing ? "جارٍ الإرسال..." : "إرسال تجريبي"}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {config.tabs.map((tab) => {
          const isReports = tab.kind === "reports";
          const isSettings = tab.kind === "settings";
          const isSchedule = tab.kind === "schedule";
          const count = isSchedule ? scheduleCountLabel : (isReports || isSettings ? 0 : tab.count ? tab.count(statuses as EventRow[]) : notifiableCount);
          return (
            <button
              key={tab.key}
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              {isReports ? <DocumentTextIcon className="me-1.5 inline h-4 w-4" /> : null}
              {isSettings ? <Cog6ToothIcon className="me-1.5 inline h-4 w-4" /> : null}
              {tab.label}
              {!isReports && !isSettings && (
                <span className="ms-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* فشل التحميل — بانر ثابت بزرار إعادة محاولة بدل empty state بيضلل المستخدم */}
      {!loading && loadError && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
          role="alert"
        >
          <span>فشل تحميل البيانات — القوالب والأحداث مش ظاهرة. اتأكد من الاتصال وحاول تاني.</span>
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            إعادة المحاولة
          </button>
        </div>
      )}

      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
      {activeTab === "reports" ? (
        <StatusReportTab statuses={statuses} config={config} />
      ) : activeTab === "schedule" && config.features.enableSchedule ? (
        /* ── Schedule tab (خاص بالعملاء) ── */
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
            <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">جدول الإشعارات</h2>
            <p className="mb-4 text-xs text-slate-500">حدد لكل حدث: هل يتبعت، القناة النشطة، ومتى يتبعت (بعد قد إيه)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th scope="col" className="py-3 px-2 text-right font-medium">الحدث</th>
                    <th scope="col" className="py-3 px-2 text-right font-medium">يتبعت امتي</th>
                    <th scope="col" className="py-3 px-2 text-right font-medium">بعد قد ايه</th>
                    <th scope="col" className="py-3 px-2 text-right font-medium">القناة النشطة</th>
                    <th scope="col" className="py-3 px-2 text-right font-medium">مفعّل</th>
                    <th scope="col" className="py-3 px-2" aria-hidden="true"><span className="sr-only">إجراءات</span></th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.filter((row) => {
                    const st = String((row as any).statusType || "").toLowerCase();
                    const cat = String(row.category || "").toUpperCase();
                    return st !== "occasion" && st !== "products" && cat !== "OCCASION" && cat !== "PRODUCTS";
                  }).map((row) => {
                    const isEditing = editingSchedule?.row.code === row.code;
                    return (
                      <tr key={row.code} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-2">
                          <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                          <p className="text-xs text-slate-400" dir="ltr">{row.code}</p>
                        </td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-300">{row.trigger || "—"}</td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                               <input
                                 id="schedule-delay"
                                 type="number"
                                 min={0}
                                 aria-label="مدة التأخير"
                                 value={editingSchedule!.delayValue}
                                 onChange={(e) => setEditingSchedule((d) => d ? { ...d, delayValue: Number(e.target.value) || 0 } : d)}
                                 className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                               />
                               <select
                                 id="schedule-delay-unit"
                                 aria-label="وحدة التأخير"
                                 value={editingSchedule!.delayUnit}
                                 onChange={(e) => setEditingSchedule((d) => d ? { ...d, delayUnit: e.target.value as "HOURS" | "DAYS" } : d)}
                                className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              >
                                <option value="HOURS">ساعة</option>
                                <option value="DAYS">يوم</option>
                              </select>
                            </div>
                          ) : (row.delayValue ?? 0) > 0 ? (
                            <span className="text-slate-700 dark:text-slate-200">{row.delayValue} {row.delayUnit === "DAYS" ? "يوم" : "ساعة"}</span>
                          ) : (
                            <span className="text-slate-400">فوري</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <select
                              value={editingSchedule!.activeChannel}
                              onChange={(e) => setEditingSchedule((d) => d ? { ...d, activeChannel: e.target.value } : d)}
                              className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                              <option value="AUTO">تلقائي (ميتا ← عادي)</option>
                              <option value="BAILEYS">واتساب عادي</option>
                              <option value="META_CLOUD">ميتا فقط</option>
                            </select>
                          ) : (
                            <Badge className={CHANNEL_COLORS[row.channel || "AUTO"]}>{CHANNEL_LABELS[row.channel || "AUTO"]}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <Switch
                            checked={isEditing ? editingSchedule!.enabled : row.notifyCustomer}
                            aria-label={`تفعيل إشعار ${row.name}`}
                            onCheckedChange={(v) => {
                              if (isEditing) {
                                setEditingSchedule((d) => d ? { ...d, enabled: v } : d);
                              } else {
                                // تفعيل/إيقاف مباشر — لا يحتاج زر «حفظ»
                                toggleScheduleNotify(row, v);
                              }
                            }}
                          />
                        </td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => saveScheduleRow(row)}
                                disabled={savingSchedule === row.code}
                                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                              >
                                <ArrowPathIcon className={`h-3.5 w-3.5 ${savingSchedule === row.code ? "animate-spin" : ""}`} />
                                حفظ
                              </button>
                              <button onClick={() => setEditingSchedule(null)} className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingSchedule({
                                row,
                                enabled: row.notifyCustomer,
                                activeChannel: row.channel || "AUTO",
                                delayValue: row.delayValue ?? 0,
                                delayUnit: row.delayUnit || "HOURS",
                              })}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              تعديل
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "settings" ? (
        <div data-testid="settings-panel" className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
            <Cog6ToothIcon className="ms-1.5 inline h-5 w-5" />
            إعدادات إشعارات واتساب للطلبات
          </h2>

          {settingsLoading ? (
            <div className="flex justify-center py-10">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
            </div>
          ) : !settings ? (
            <p className="text-sm text-slate-400">{t("orders.settingsNone", "لا توجد إعدادات")}</p>
          ) : (
            <div className="space-y-5 max-w-xl">
              {/* General toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("orders.settingsEnableNotifications", "تفعيل إشعارات واتساب")}</p>
                  <p className="text-xs text-slate-500">تشغيل أو إيقاف جميع إشعارات الواتساب</p>
                </div>
                <Switch
                  checked={settings.isEnabled}
                  onCheckedChange={(val) => setSettings((p) => p ? { ...p, isEnabled: val } : p)}
                  aria-label="تفعيل إشعارات واتساب"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Order notifications toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">إشعارات حالات الطلبات</p>
                  <p className="text-xs text-slate-500">إرسال رسالة واتساب عند تغيير حالة الطلب</p>
                </div>
                <Switch
                  checked={settings.orderNotificationsEnabled}
                  onCheckedChange={(val) => setSettings((p) => p ? { ...p, orderNotificationsEnabled: val } : p)}
                  aria-label="إشعارات حالات الطلبات"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Default session */}
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900 dark:text-white">الجلسة الأساسية</label>
                <p className="mb-2 text-xs text-slate-500">جلسة الواتساب اللي هتتبعت منها الرسايل</p>
                <select
                  value={settings.defaultSessionId || ""}
                  onChange={(e) => setSettings((p) => p ? { ...p, defaultSessionId: e.target.value || null } : p)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">تلقائي (أي جلسة متصلة)</option>
                  {settingsSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phoneNumber ? `(${s.phoneNumber})` : ""} - {s.status === "CONNECTED" ? "🟢" : "🔴"}
                    </option>
                  ))}
                </select>
                {defaultSessionInfo && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">طريقة الإرسال الحالية:</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                        defaultSessionInfo.provider === "META_CLOUD"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      }`}
                    >
                      {defaultSessionInfo.provider === "META_CLOUD" ? "☁️ Meta Cloud API" : "📱 Baileys"}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">{defaultSessionInfo.name}</span>
                    {defaultSessionInfo.provider === "META_CLOUD" && !Object.values(deliveryPreview).some((item) => item.riskLevel === "none") && (
                      <span className="text-amber-500 dark:text-amber-400">تحقق من حالة كل قالب</span>
                    )}
                  </div>
                )}
                {defaultSessionInfo?.provider === "META_CLOUD" && (
                  <button
                    onClick={() => syncMetaStatuses(false)}
                    disabled={syncingStatus}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${syncingStatus ? "animate-spin" : ""}`} />
                    مزامنة الحالات من ميتا
                  </button>
                )}
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Sticky session */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{t("orders.settingsStickySession", "تثبيت الجلسة (Sticky Session)")}</p>
                  <p className="text-xs text-slate-500">نفس العميل يستخدم نفس الجلسة دايمًا</p>
                </div>
                <Switch
                  checked={settings.stickySessionEnabled}
                  onCheckedChange={(val) => setSettings((p) => p ? { ...p, stickySessionEnabled: val } : p)}
                  aria-label="تثبيت الجلسة"
                />
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Quiet hours */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      <ClockIcon className="me-1 inline h-4 w-4" />
                      ساعات الهدوء
                    </p>
                    <p className="text-xs text-slate-500">ما ترسلش رسايل في الوقت ده</p>
                  </div>
                  <Switch
                    checked={settings.quietHoursEnabled}
                    onCheckedChange={(val) => setSettings((p) => p ? { ...p, quietHoursEnabled: val } : p)}
                    aria-label="ساعات الهدوء"
                  />
                </div>
                {settings.quietHoursEnabled && (
                  <div className="mt-2 flex items-center gap-3">
                    <div>
                      <label className="text-xs text-slate-500">من</label>
                      <input
                        type="time"
                        value={settings.quietHoursStart}
                        onChange={(e) => setSettings((p) => p ? { ...p, quietHoursStart: e.target.value } : p)}
                        className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <span className="mt-5 text-slate-400">→</span>
                    <div>
                      <label className="text-xs text-slate-500">إلى</label>
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
                  <BoltIcon className="me-1 inline h-4 w-4" />
                  حد الإرسال (رسالة/دقيقة)
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
                {t("orders.saveSettings", "حفظ الإعدادات")}
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
                {statusesWithoutTemplate.length} {noun.plural} بدون قالب واتساب
                {activeTab !== "all" ? " في هذا القسم" : ""}
              </span>
            </div>
          )}

          {/* Meta session warning — يظهر فقط لو الصفحة قادرة فعلاً على تقييم الجلسة الأساسية */}
          {!!config.endpoints?.deliveryPreview && boundMetaCount > 0 && !defaultSessionIsMeta && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-800/30 dark:bg-sky-900/20 dark:text-sky-300">
              <GlobeAltIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                عندك {boundMetaCount} قالب مربوط بقالب ميتا معتمد — لكن الجلسة الأساسية للإرسال مش Meta Cloud API.
                القوالب المربوطة بميتا هتتبعت فعليًا بس لو الإرسال بيتم من جلسة Meta Cloud. اختار جلسة ميتا من الإعدادات.
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
                placeholder="ابحث بالاسم أو الكود..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pe-9 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <svg
                className="absolute end-3 top-2.5 h-4 w-4 text-slate-400"
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

            {config.features.enableFilterChips && (
            <div className="flex flex-wrap items-center gap-1">
              {([
                { key: "all", labelKey: "orders.statusChips.all", label: "الكل" },
                { key: "custom", labelKey: "orders.statusChips.custom", label: "مخصصة" },
                { key: "meta_bound", labelKey: "orders.statusChips.metaBound", label: "مربوطة بميتا" },
                { key: "no_template", labelKey: "orders.statusChips.noTemplate", label: "بدون قالب" },
                { key: "disabled", labelKey: "orders.statusChips.disabled", label: "متوقفة" },
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
            )}

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {config.features.sortModes.includes("statusType") && <option value="statusType">حسب التبويب</option>}
              {config.features.sortModes.includes("alphabetical") && <option value="alphabetical">أبجدي</option>}
              {config.features.sortModes.includes("recent") && <option value="recent">آخر تعديل</option>}
            </select>

            {config.features.enableInternalToggle && (
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              عرض الحالات الداخلية ({internalCount})
            </label>
            )}
          </div>

          {/* ── شريط الإنشاء الموحد — فوق كل تبويب قائمة (عربي) — للعملاء فقط ── */}
          {config.scope === "customers" && activeTabDef?.kind === "list" && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50">
              <div className="flex flex-wrap items-center gap-2">
                {/* اختيار نوع الحدث بالعربي — ظاهر دائماً قبل زر الإنشاء */}
                {filteredStatuses.length > 0 ? (
                  <select
                    value={topCreateEvent || filteredStatuses[0]?.code || ""}
                    onChange={(e) => setTopCreateEvent(e.target.value)}
                    aria-label="نوع الحدث"
                    className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {filteredStatuses.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} {s.hasTemplate || s.hasMetaTemplate ? "— به قالب" : "— بدون قالب"}
                      </option>
                    ))}
                    {activeTab === "occasions" && (
                      <option value="__new_occasion__">＋ مناسبة جديدة…</option>
                    )}
                    {activeTab === "products" && (
                      <option value="__new_product__">＋ قالب منتج جديد…</option>
                    )}
                  </select>
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {activeTab === "occasions" ? "لا توجد مناسبات بعد — أنشئ أول مناسبة" : activeTab === "products" ? "لا توجد قوالب منتجات بعد" : "لا توجد أحداث في هذا التبويب"}
                  </span>
                )}
                <button
                  disabled={filteredStatuses.length > 0 && !topCreateEvent && !filteredStatuses[0]?.code}
                  onClick={() => handleTopCreate("meta")}
                  title="تأليف قالب وإرساله لميتا للمراجعة والاعتماد"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-4 w-4" />
                  إنشاء قالب ميتا
                </button>
                <button
                  disabled={filteredStatuses.length > 0 && !topCreateEvent && !filteredStatuses[0]?.code}
                  onClick={() => handleTopCreate("regular")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-indigo-800/40 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                >
                  <PlusIcon className="h-4 w-4" />
                  إنشاء قالب عادي
                </button>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {visibleStatuses.length} {noun.plural} في هذا التبويب
              </span>
            </div>
          )}

          
          {/* 🔗 المناسبات المجدولة الحقيقية — كل مناسبة ليها قالبها الخاص (ميتا أو عادي) */}
          {config.scope === "customers" && activeTab === "occasions" && liveOccasions.length > 0 && (
            <div className="mb-4 rounded-xl border border-violet-200/70 bg-violet-50/40 p-4 dark:border-violet-900/30 dark:bg-violet-950/20">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-violet-900 dark:text-violet-200">
                    المناسبات المجدولة ({liveOccasions.length})
                  </h3>
                  <p className="text-xs text-violet-600 dark:text-violet-400">
                    كل مناسبة بتبعت برسالتها الخاصة — اربطي كل مناسبة بقالب ميتا أو رسالة عادية
                  </p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {liveOccasions.map((occ) => {
                  const isLinked = linkedOccasionId === occ.id;
                  return (
                    <div
                      key={occ.id}
                      className="rounded-lg border border-violet-200 bg-white p-3 dark:border-violet-900/40 dark:bg-slate-900/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{occ.name}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {new Date(occ.scheduledAt).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}
                            {" · "}
                            {occ.recurrence === "yearly" ? "سنوي" : occ.recurrence === "monthly" ? "شهري" : "مرة واحدة"}
                            {" · "}
                            {(occ.totalSent || 0).toLocaleString("ar-EG")} مرسل
                          </p>
                        </div>
                        {occ.templateId && !isLinked && (
                          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            ✓ مربوطة بقالب
                          </span>
                        )}
                      </div>
                      {!occ.templateId ? (
                        <button
                          onClick={() => setLinkingOccasion({ id: occ.id, name: occ.name })}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-blue-700"
                        >
                          <span>🔗</span>
                          اختيار قالب ميتا للمناسبة
                        </button>
                      ) : isLinked ? (
                        <p className="mt-2 rounded-md bg-violet-100/60 p-2 text-[11px] text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                          جاري الربط… اختاري القالب من النافذة
                        </p>
                      ) : (
                        <button
                          onClick={() => setLinkingOccasion({ id: occ.id, name: occ.name })}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 px-3 py-1.5 text-[11px] font-medium text-violet-700 transition hover:bg-violet-50 dark:border-violet-800 dark:text-violet-300"
                        >
                          🔄 تغيير القالب
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                  ? `لا توجد ${noun.plural} مطابقة لبحثك`
                  : `لا توجد ${noun.plural} بعد`}
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || activeChip !== "all"
                  ? "جرّب تغيير كلمات البحث أو إلغاء الفلاتر لرؤية كل النتائج."
                  : config.scope === "customers"
                    ? "قوالب إشعارات العملاء هتظهر هنا أول ما تتضاف."
                    : `ال${noun.plural} هتظهر هنا أول ما تتضاف.`}
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
                  مسح الفلاتر
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
                    sampleVariables={sampleVariables}
                    enableMetaSwitch={config.features.enableMetaSwitch}
                  />
                ));
              })}
            </div>
          )}
        </>
      )}
      </div>

      {/* Template dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          // لو المستخدم بيقفل وفيه تعديلات مش محفوظة — نأكّد قبل ما نضيّعهم
          if (!open && isFormDirty()) {
            setConfirmCloseOpen(true);
          } else {
            setDialogOpen(open);
          }
        }}
      >
        <DialogContent
          data-testid="template-dialog"
          showCloseButton
          closeLabel={t("orders.close", "إغلاق") as string}
          className="max-h-[90vh] max-w-2xl overflow-y-auto p-5 sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {metaDialogTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              نموذج إنشاء وتعديل قالب رسالة واتساب لل{noun.singular}
            </DialogDescription>
          </DialogHeader>
          {dialogOpen && selectedStatus && dialogMode === "switch" && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">نوع الحدث</label>
                <input
                  type="text"
                  value={selectedStatus.code}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                />
              </div>

              <div className="rounded-lg border border-blue-200 p-3 dark:border-blue-800/40">
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  اختر قالب ميتا المعتمد
                </label>
                <p className="-mt-0.5 mb-2 text-[10px] text-slate-400 dark:text-slate-500">
                  {isMetaBound
                    ? `الربط الحالي: ${originalMetaTemplateName} — اختار قالب تاني عشان تغيّره (مش بيغيّر محتوى الرسالة).`
                    : `اختار قالب معتمد وربطه بال${noun.singular} — الرسالة اللي هتتبعت هي نص قالب ميتا نفسه.`}
                </p>
                <MetaTemplateSelect
                  metaSessions={metaSessions}
                  selectedMetaSession={selectedMetaSession}
                  onSessionChange={(v) => setSelectedMetaSession(v)}
                  availableMetaTemplates={availableMetaTemplates}
                  loadingMetaTemplates={loadingMetaTemplates}
                  selectedMetaTemplateName={templateForm.metaTemplateName}
                  onSelectTemplate={(name) => setTemplateForm((p) => ({ ...p, metaTemplateName: name }))}
                  showMapping={false}
                  localContent={templateForm.content}
                  sampleVariables={sampleVariables}
                  variableDescriptions={variableDescriptions}
                />
              </div>

              {metaVariableMismatch && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300" role="alert">
                  ⚠️ قالب ميتا محتاج <strong>{metaVariableMismatch.metaCount} متغيرات</strong>، لكن محتوى الرسالة الحالية فيه <strong>{metaVariableMismatch.localCount} فقط</strong>. بدّل من وضع «تعديل» عشان تعدّل الرسالة وتضيف المتغيرات الناقصة.
                </p>
              )}

              <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 bg-white/95 px-1 pt-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || resubmittingMeta || !!bindingId || !templateForm.metaTemplateName || !!metaVariableMismatch}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving || bindingId ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                  {isMetaBound ? "حفظ التغيير" : "اربط القالب"}
                </button>
              </div>
            </div>
          )}

          {dialogOpen && selectedStatus && dialogMode !== "switch" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">نوع الحدث</label>
                {dialogMode === "create" ? (
                  <select
                    value={selectedStatus.code}
                    onChange={(e) => {
                      const next = statuses.find((s) => s.code === e.target.value);
                      if (next) {
                        setSelectedStatus(next);
                      } else if (e.target.value.startsWith("CUSTOMER_OCCASION") || e.target.value.startsWith("NEW_PRODUCT")) {
                        // حالة جديدة (من الشريط العلوي) — حدث الاسم والكود معاً
                        setSelectedStatus((prev) => prev ? { ...prev, code: e.target.value } : prev);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {statuses
                      .filter((s) => {
                        const def = config.tabs.find((tb) => tb.key === activeTab);
                        if (def?.kind === "list" && def.filter) return def.filter(s as EventRow);
                        return true;
                      })
                      .map((s) => (
                        <option key={s.code} value={s.code}>{s.name} — {s.code}</option>
                      ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={`${selectedStatus.name} — ${selectedStatus.code}`}
                    disabled
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                  اسم القالب
                  {dialogSlot === "meta" && (
                    <FieldHint text="اسم محلي للعرض داخل المنصة فقط — ميتا بتولّد اسمًا تقنيًا (مثل price_drop_mtabc12) يظهر على الكارت بعد النشر" />
                  )}
                </label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder={config.scope === "customers" ? "مثال: قالب نقاط الولاء" : "مثال: قالب تأكيد الطلب"}
                />
                </div>
              </div>

              {/* ===== META SLOT CONTENT ===== */}
              {dialogSlot === "meta" && (
                <div className="space-y-3 rounded-lg border border-blue-200 p-3 dark:border-blue-800/40">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                        {dialogMode === "create" ? "حساب النشر على ميتا" : "اختر قالب ميتا المعتمد"}
                      </label>
                      <MetaTemplateSelect
                        metaSessions={metaSessions}
                        selectedMetaSession={selectedMetaSession}
                        onSessionChange={(v) => setSelectedMetaSession(v)}
                        availableMetaTemplates={availableMetaTemplates}
                        loadingMetaTemplates={loadingMetaTemplates}
                        selectedMetaTemplateName={templateForm.metaTemplateName}
                        onSelectTemplate={handleMetaTemplateSelect}
                        showTemplates={dialogMode !== "create"}
                        enableMultiBind={config.features.enableMetaMultiBind}
                        excludeOtherBound={!config.features.enableMetaMultiBind}
                        selectedTemplateId={selectedTemplate?.id}
                        showMapping
                        localContent={templateForm.content}
                        sampleVariables={sampleVariables}
                        variableDescriptions={variableDescriptions}
                      />
                    </div>

                    {/* فئة ميتا الحقيقية (3 فئات) — وضع التأليف فقط؛ في وضع الربط الفئة جاية من القالب المعتمد */}
                    {!templateForm.metaTemplateName && (
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                          فئة القالب على ميتا
                          <FieldHint text="UTILITY = معاملات (موافقة أسرع، موصى به) · MARKETING = عروض (محتاج opt-in) · AUTHENTICATION = أكواد تحقق" />
                        </label>
                        <select
                          value={templateForm.metaCategory || "UTILITY"}
                          onChange={(e) => setTemplateForm((p) => ({ ...p, metaCategory: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="UTILITY">UTILITY — معاملات وتحديثات</option>
                          <option value="MARKETING">MARKETING — عروض وتسويق</option>
                          <option value="AUTHENTICATION">AUTHENTICATION — أكواد تحقق</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {(() => {
                    const selectedMt = availableMetaTemplates.find((mt) => mt.name === templateForm.metaTemplateName);
                    const otherBoundEvents = (selectedMt?.boundToEventTypes || [])
                      .filter((ev) => ev !== selectedTemplate?.eventType);
                    if (!selectedMt || otherBoundEvents.length === 0) return null;
                    return (
                      <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-700 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300">
                        ℹ️ القالب ده مربوط حالياً بكمان: {otherBoundEvents.join("، ")} — نفس الرسالة هتتبعت ليهم. لو عايز رسالة مختلفة ل{noun.singular}، اعمل قالب ميتا جديد.
                      </div>
                    );
                  })()}

                  {selectedTemplate?.metaTemplateName && !metaBindingChanged && (
                    <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-700 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300">
                      الربط الحالي: {selectedTemplate.metaTemplateName}
                      {selectedTemplate.metaTemplateStatus ? ` (${selectedTemplate.metaTemplateStatus})` : ""}
                    </div>
                  )}
                  {metaBindingChanged && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                      التبديل: من «{originalMetaTemplateName}» إلى «{templateForm.metaTemplateName}» — اضغط «حفظ وربط بقالب ميتا» للتأكيد.
                    </div>
                  )}
                  {metaAutoFilled && (
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-[11px] text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                      ✅ اتبنى المحتوى المحلي تلقائياً من قالب ميتا المختار — راجع المتغيرات فوق وعدّل لو محتاج.
                    </div>
                  )}
                </div>
              )}

              {/* ===== LOCAL CONTENT ===== */}
              <div className={dialogSlot === "meta" ? "rounded-lg border border-slate-200 p-3 dark:border-slate-700" : ""}>
                {dialogSlot === "meta" && (
                  <div className="mb-3 space-y-1">
                    <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                      صورة الرأس (HEADER)
                      <FieldHint text="اختياري — بتترفع لميتا كـ IMAGE header وتُستخدم عيّنة للموافقة" />
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
                            إزالة
                          </button>
                        </div>
                      ) : (
                        <div className="flex h-10 flex-1 items-center gap-2">
                          <label className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                            <PhotoIcon className="size-4" />
                            {headerUploading ? "جاري الرفع إلى ميتا..." : "اختر صورة للرأس"}
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
                    {config.features.enableHeaderProductImage && (
                    <>
                    <label
                      className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
                      title="كل رسالة هتتبعت بصورة أول منتج في الطلب (متغيرة لكل طلب)"
                    >
                      <input
                        type="checkbox"
                        checked={templateForm.headerUsesOrderProduct}
                        onChange={(e) => setTemplateForm((p) => ({ ...p, headerUsesOrderProduct: e.target.checked }))}
                        className="size-4 accent-indigo-600"
                      />
                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        استخدم صورة المنتج من الطلب وقت الإرسال
                      </span>
                    </label>
                    </>
                    )}
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
                        {selectedTemplate?.metaTemplateName ? "محتوى الرسالة" : "محتوى الرسالة (هي اللي هتتبعت)"} <span className="text-red-500">*</span>
                      </span>
                      <span className="flex items-center gap-2">
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
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                          {showLocalRef ? "إخفاء" : "عرض"}
                        </span>
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      محتوى الرسالة <span className="text-red-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-medium tabular-nums ${
                        dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT
                          ? "text-red-600 dark:text-red-400"
                          : dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT * 0.9
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-slate-400 dark:text-slate-500"
                      }`}
                      aria-live="polite"
                    >
                      {dialogSlot === "meta" ? `${templateForm.content.length} / ${META_BODY_CHAR_LIMIT}` : `${templateForm.content.length} حرف`}
                    </span>
                  </div>
                )}

                {dialogSlot !== "meta" || showLocalRef || !selectedTemplate?.metaTemplateName ? (
                <>
                <div className={dialogSlot === "meta" ? "mt-3 grid gap-3 lg:grid-cols-2" : "grid gap-3 lg:grid-cols-2"}>
                  <textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, content: dialogSlot === "meta" ? e.target.value.slice(0, META_BODY_CHAR_LIMIT + 200) : e.target.value }))}
                    rows={7}
                    aria-label={dialogSlot === "meta" ? "محتوى القالب المحلي" : "محتوى الرسالة"}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                      dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT
                        ? "border-red-400 dark:border-red-500"
                        : "border-slate-200"
                    }`}
                    placeholder="اكتب رسالتك هنا..."
                  />

                  {/* Live WhatsApp-style preview */}
                  <div className="rounded-lg border border-slate-200 bg-[#e5ddd5] p-3 dark:border-slate-700 dark:bg-slate-900/60">
                    <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      معاينة مباشرة
                    </p>
                    <WhatsAppBubblePreview
                      content={templateForm.content}
                      buttons={templateForm.buttons}
                      hasButtons={templateForm.hasButtons}
                      sampleVariables={sampleVariables}
                    />
                  </div>
                </div>

                {dialogSlot === "meta" && templateForm.content.length > META_BODY_CHAR_LIMIT && (
                  <p className="mt-1 text-[11px] text-red-600 dark:text-red-400" role="alert">
                    ⚠️ النص أطول من حد ميتا ({META_BODY_CHAR_LIMIT} حرف) — القالب هيترفض عند النشر على Meta Cloud API.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowVariables(!showVariables)}
                  className="mt-1 flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <ChevronDownIcon className={`h-3 w-3 transition ${showVariables ? "rotate-180" : ""}`} />
                  {showVariables ? "إخفاء المتغيرات" : "عرض كل المتغيرات المتاحة"}
                </button>

                {showVariables && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 text-right dark:bg-slate-800">
                          <th className="px-2 py-1 font-medium text-slate-500">المتغير</th>
                          <th className="px-2 py-1 font-medium text-slate-500">الوصف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {config.variables.map((v) => (
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
                    لو غيّرت المرجع المحلي وضغطت "حفظ وربط بقالب ميتا" يتسجّل — أو "إرسال للمراجعة من جديد" عشان ميتا تراجعه.
                  </p>
                )}
                </>
                ) : null}
              </div>

              {config.features.enableButtons && (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                    الأزرار التفاعلية
                    {dialogSlot === "meta" && templateForm.metaTemplateName && (
                      <FieldHint text="الأزرار الحالية معتمدة على ميتا — أي تعديل محتاج «إرسال للمراجعة من جديد» عشان يتبنى" />
                    )}
                  </label>
                  <Switch
                    checked={templateForm.hasButtons}
                    onCheckedChange={(val) => setTemplateForm((p) => ({ ...p, hasButtons: val }))}
                    aria-label="الأزرار التفاعلية"
                  />
                </div>
                {dialogSlot === "meta" && templateForm.metaTemplateName ? (
                  <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">
                    ℹ️ الأزرار الجديدة محتاجة مراجعة ميتا تاني عشان تتبنى في القالب المعتمد.
                  </p>
                ) : config.features.quickReplyActions ? null : null}

                {templateForm.hasButtons && (
                  <div className="mt-3 space-y-2">
                    {templateForm.buttons.map((btn, idx) => (
                      <div
                        key={btn.id || idx}
                        className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/40"
                      >
                        <div className="w-32">
                          <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">نوع الزر</label>
                          <select
                            value={btn.type || "QUICK_REPLY"}
                            onChange={(e) => {
                              const type = e.target.value as "QUICK_REPLY" | "LINK";
                              updateButton(idx, {
                                type,
                                action: type === "LINK" ? "LINK" : (btn.action === "LINK" ? "CONFIRMED" : btn.action),
                              });
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="QUICK_REPLY">{config.features.quickReplyActions ? "إجراء سريع" : "تغيير الحالة"}</option>
                            <option value="LINK">صفحة العميل</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">نص الزر</label>
                          <input
                            type="text"
                            value={btn.text}
                            onChange={(e) => updateButton(idx, { text: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            placeholder={btn.type === "LINK" ? "مثال: صفحتي على المتجر" : "مثال: تأكيد الأوردر"}
                          />
                        </div>
                        {btn.type === "LINK" ? (
                          <div className="flex-1 pb-1">
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400" title="يفتح صفحة العميل على متجركم حسب رقم الواتساب تلقائيًا">
                              🔗 رابط صفحة العميل
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">عند الضغط</label>
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
                        )}
                        <button
                          type="button"
                          onClick={() => removeButton(idx)}
                          title="حذف الزر"
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      {templateForm.buttons.length < 3 && (
                        <button
                          type="button"
                          onClick={addButton}
                          title="الحد الأقصى 3 أزرار لكل رسالة"
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        >
                          <PlusIcon className="h-3.5 w-3.5" />
                          إضافة زر حالة
                        </button>
                      )}
                      {templateForm.buttons.length < 3 && (
                        <button
                          type="button"
                          onClick={addLinkButton}
                          title="الحد الأقصى 3 أزرار لكل رسالة"
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                        >
                          <GlobeAltIcon className="h-3.5 w-3.5" />
                          إضافة زر صفحة العميل
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}

            <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 bg-white/95 px-1 pt-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
              <label
                htmlFor="template-active"
                className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                title="القوالب غير النشطة بتتحفظ بس مش بتتبعت"
              >
                <input
                  type="checkbox"
                  id="template-active"
                  checked={templateForm.isActive}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                قالب نشط
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              {dialogSlot === "meta" && isMetaBound && metaContentChanged && !metaBindingChanged && (
                <button
                  onClick={handleResubmitMeta}
                  disabled={saving || resubmittingMeta || !!bindingId || metaSessions.length === 0}
                  title={metaSessions.length === 0 ? "لا توجد جلسة ميتا متصلة" : "تحديث المحتوى على ميتا ويرجع للمراجعة تاني"}
                  className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                >
                  {resubmittingMeta ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowPathIcon className="h-4 w-4" />}
                  إرسال للمراجعة من جديد
                </button>
              )}
              <button
                onClick={dialogSlot === "meta" && !templateForm.metaTemplateName ? createMetaTemplate : handleSave}
                disabled={saving || resubmittingMeta || !!bindingId || !!publishingId || !!metaVariableMismatch || (dialogSlot === "regular" && !templateForm.content.trim()) || (dialogSlot === "meta" && metaSessions.length === 0 && !isMetaBound)}
                title={metaSessions.length === 0 && dialogSlot === "meta" && !isMetaBound ? "لا توجد جلسة ميتا متصلة — أنشئ جلسة Meta Cloud أولاً" : metaVariableMismatch ? `القالب المحلي محتاج ${metaVariableMismatch.missing} متغيرات إضافية` : undefined}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                  dialogSlot === "meta" && (metaBindingChanged || !templateForm.metaTemplateName)
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {saving || bindingId || publishingId ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {dialogSlot === "meta"
                  ? metaBindingChanged
                    ? "حفظ وربط بقالب ميتا"
                    : isMetaBound
                      ? "حفظ"
                      : templateForm.metaTemplateName
                        ? "حفظ وربط بقالب ميتا"
                        : "إنشاء قالب ميتا جديد"
                  : "حفظ"}
              </button>
              </div>
            </div>

            {metaVariableMismatch && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[11px] leading-relaxed text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300" role="alert">
                ⚠️ قالب ميتا محتاج <strong>{metaVariableMismatch.metaCount} متغيرات</strong>، لكن المحتوى المحلي فيه <strong>{metaVariableMismatch.localCount} فقط</strong> — أضف <strong>{metaVariableMismatch.missing}</strong> متغيرات ({config.variables.slice(0, 4).map((v) => v.var).join("، ")}) عشان تقدر تحفظ وتربط.
              </p>
            )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCloseOpen}
        title={t("orders.discardChanges", "تجاهل التغييرات؟")}
        content={t("orders.discardChangesHint", "في تعديلات على القالب مش محفوظة. تحب تقفل النافذة من غير ما تحفظ؟")}
        confirmLabel={t("orders.closeWithoutSave", "إغلاق بدون حفظ")}
        cancelLabel={t("orders.back", "رجوع")}
        confirmColor="warning"
        onConfirm={() => {
          setDialogOpen(false);
          setConfirmCloseOpen(false);
        }}
        onCancel={() => setConfirmCloseOpen(false)}
      />

      <ConfirmDialog
        open={!!unbindTarget}
        title={t("orders.unbindConfirmTitle", "فك ربط القالب بقالب ميتا")}
        content={t("orders.unbindConfirmContent", "هل تريد فك ربط هذا القالب بقالب ميتا؟ بعد الفك، الرسالة هتتبعت كـ واتساب عادي.")}
        confirmLabel={t("orders.unbindConfirmYes", "نعم، فك الربط") as string}
        cancelLabel={t("orders.unbindConfirmCancel", "إلغاء") as string}
        confirmColor="error"
        onConfirm={() => unbindTarget && unbindMeta(unbindTarget)}
        onCancel={() => setUnbindTarget(null)}
      />

      {linkingOccasion && (
        <MetaTemplatesModal
          open={!!linkingOccasion}
          onClose={() => setLinkingOccasion(null)}
          onPick={async (_content: string, template?: { id?: string }) => {
            if (!template?.id) {
              toast.error("اختاري قالب ميتا معتمد");
              return;
            }
            const occ = linkingOccasion;
            setLinkingOccasion(null);
            await linkOccasionToTemplate(occ.id, template.id);
          }}
          title={`ربط مناسبة: ${linkingOccasion.name}`}
        />
      )}
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
  sampleVariables?: Record<string, string>;
  enableMetaSwitch?: boolean;
}

/**
 * مكوّن مشترك لاختيار/ربط قالب ميتا المعتمد — بيُستخدم في وضع «تغيير القالب» (switch)
 * و في قسم الميتا عند إنشاء/تعديل القالب. بيلغي التكرار بين الاتنين.
 */
function MetaTemplateSelect({
  metaSessions,
  selectedMetaSession,
  onSessionChange,
  availableMetaTemplates,
  loadingMetaTemplates,
  selectedMetaTemplateName,
  onSelectTemplate,
  onCreateTemplate,
  createDisabled,
  showTemplates = true,
  enableMultiBind,
  excludeOtherBound,
  selectedTemplateId,
  showMapping,
  localContent,
  sampleVariables,
  variableDescriptions,
}: {
  metaSessions: { id: string; name: string; metaDisplayPhoneNumber?: string }[];
  selectedMetaSession: string;
  onSessionChange: (id: string) => void;
  availableMetaTemplates: MetaAvailableTemplate[];
  loadingMetaTemplates: boolean;
  selectedMetaTemplateName: string;
  onSelectTemplate: (name: string) => void;
  onCreateTemplate?: () => void;
  createDisabled?: boolean;
  /** إخفاء قائمة القوالب المعتمدة — وضع التأليف (الجلسة فقط يكفي) */
  showTemplates?: boolean;
  enableMultiBind?: boolean;
  /** يخفي القوالب المربوطة بقوالب محلية تانية (وضع تعديل ميتا) — switch بيعرض الكل */
  excludeOtherBound?: boolean;
  selectedTemplateId?: string | null;
  showMapping: boolean;
  localContent: string;
  sampleVariables: Record<string, string>;
  variableDescriptions: Record<string, string>;
}) {
  const selected = availableMetaTemplates.find((m) => m.name === selectedMetaTemplateName);
  const metaBody = (selected?.components || []).find((c) => c.type === "BODY")?.text || "";

  if (metaSessions.length === 0) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
          ⚠️ لا توجد جلسة <strong>Meta Cloud API</strong> متصلة — أنشئ جلسة ميتا من <strong>الإعدادات &gt; واتساب &gt; الجلسات</strong> عشان الربط والنشر يشتغل.
        </div>
        <select
          disabled
          aria-label="حساب النشر على ميتا"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
        >
          <option>لا توجد جلسات متاحة</option>
        </select>
      </div>
    );
  }

  return (
    <>
      {onCreateTemplate && (
        <button
          type="button"
          onClick={onCreateTemplate}
          disabled={createDisabled}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/40"
        >
          {createDisabled ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <PlusIcon className="h-3.5 w-3.5" />
          )}
          إنشاء قالب ميتا جديد
        </button>
      )}
      <select
        value={selectedMetaSession}
        onChange={(e) => onSessionChange(e.target.value)}
        aria-label="حساب النشر على ميتا"
        className="mb-2 mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        {metaSessions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {s.metaDisplayPhoneNumber ? `(${s.metaDisplayPhoneNumber})` : ""}
          </option>
        ))}
      </select>
      {showTemplates && (loadingMetaTemplates ? (
        <p className="text-xs text-slate-400">جار تحميل قوالب ميتا...</p>
      ) : availableMetaTemplates.length > 0 ? (
        <>
          <select
            value={selectedMetaTemplateName}
            onChange={(e) => onSelectTemplate(e.target.value)}
            aria-label="قالب ميتا المعتمد"
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">اختر قالب...</option>
            {availableMetaTemplates
              .filter((mt) => {
                if (enableMultiBind || !excludeOtherBound) return true;
                return !mt.boundToLocalTemplateId || mt.boundToLocalTemplateId === selectedTemplateId;
              })
              .map((mt) => {
                const boundEvents = mt.boundToEventTypes?.length
                  ? mt.boundToEventTypes.join("، ")
                  : (mt.boundToEventType || "");
                return (
                  <option key={mt.name} value={mt.name}>
                    {mt.name} {mt.category ? `(${mt.category})` : ""}
                    {boundEvents ? ` - مربوط بـ ${boundEvents}` : ""}
                  </option>
                );
              })}
          </select>

          {metaBody && (
            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
                <GlobeAltIcon className="h-3 w-3" />
                الرسالة اللي هتتبعت للعميل (نص قالب ميتا)
              </p>
              <div
                dir="auto"
                className="rounded-xl rounded-ee-sm bg-[#dcf8c6] p-2.5 text-[13px] leading-relaxed text-slate-800 shadow-sm dark:bg-[#005c4b] dark:text-slate-100"
              >
                <p className="whitespace-pre-wrap break-words">
                  {resolveMetaBodyPreview(metaBody, localContent, sampleVariables)}
                </p>
              </div>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                المتغيرات بتتقري تلقائياً من الطلب — النص ده هو اللي هيوصلك للعميل بالظبط.
              </p>
            </div>
          )}

          {showMapping && metaBody && (() => {
            const localVars = extractLocalVariableOrder(localContent);
            const metaNums = [...metaBody.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]);
            if (localVars.length === 0 || metaNums.length === 0) return null;
            const pairs = metaNums.map((n, i) => ({
              meta: `{{${n}}}`,
              local: localVars[i] ? `{{${localVars[i]}}}` : "—",
              desc: localVars[i] ? (variableDescriptions[localVars[i]] || "") : "غير متوفر",
              matched: !!localVars[i],
            }));
            return (
              <div className="mt-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  تطابق المتغيرات
                </p>
                <div className="space-y-1">
                  {pairs.map((pr) => (
                    <div key={pr.meta} className="flex items-center gap-2 text-[11px]">
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{pr.meta}</span>
                      <span className="text-slate-400">←</span>
                      <span className={`rounded px-1.5 py-0.5 font-mono ${pr.matched ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                        {pr.local}
                      </span>
                      {pr.desc && <span className="text-slate-500 dark:text-slate-400">{pr.desc}</span>}
                      {!pr.matched && <span className="text-red-500">⚠️ متغير ناقص في النص المحلي</span>}
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                  ميتا بترقّم المتغيرات بترتيب ظهورها؛ تأكد إن كل رقم ميتا ليه متغير محلي مطابق.
                </p>
              </div>
            );
          })()}
        </>
      ) : (
        <p className="text-xs text-slate-400">
          لا توجد قوالب ميتا معتمدة — اكتب المحتوى أعلاه ثم استخدم الزر السفلي «إنشاء قالب ميتا جديد» لنشره للمراجعة.
        </p>
      ))}
    </>
  );
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
  sampleVariables,
  enableMetaSwitch = true,
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
  const deliveryIcons = { none: "🟢", warning: "🟡", danger: "🔴" };

  return (
    <div
      data-testid={`status-row-${status.id}`}
      className="group rounded-lg border border-slate-200/70 bg-white p-3.5 transition hover:shadow-sm dark:border-white/10 dark:bg-slate-900/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
            style={{ backgroundColor: status.color || "#6B7280", color: readableTextColor(status.color || "#6B7280") }}
            title={status.name}
          >
            {status.name.trim().slice(0, 2)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {status.name}
              </span>
              {status.isSystemStatus && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {t("orders.system", "نظامي")}
                </span>
              )}
              {status.statusType && status.statusType !== "order" && (
                <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                  {status.statusType === "preparation" ? "تجهيز" : status.statusType === "shipping" ? "شحن" : status.statusType === "payment" ? "دفع" : status.statusType === "incomplete" ? "غير مكتمل" : status.statusType}
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
                {status.notifyCustomer ? "مفعل" : "متوقف"}
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
            {deliveryIcons[p.riskLevel]} 🔗 اربط بقالب ميتا
          </button>
        ) : p ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${deliveryColors[p.riskLevel]}`}
            title={p.message}
          >
            {deliveryIcons[p.riskLevel]}
            {!isMobile && (p.message.length > 40 ? `${p.message.substring(0, 40)}…` : p.message)}
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
          sampleVariables={sampleVariables}
        />
        {enableMetaSwitch && (
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
            sampleVariables={sampleVariables}
          />
        )}
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
  onSwitch?: () => void;
  onUnbind?: () => void;
  sampleVariables?: Record<string, string>;
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
  sampleVariables,
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
        ? "✅ معتمد"
        : metaStatus === "REJECTED"
          ? "❌ مرفوض"
          : metaStatus
            ? `⏳ ${metaStatus}`
            : "قيد المراجعة"
      : template
        ? "محفوظ (بدون ربط)"
        : "بدون قالب"
    : template
      ? "يوجد قالب"
      : "بدون قالب";

  return (
    <div
      data-testid={`${slot}-slot-${status.id}`}
      className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors.badge}`}>
          {isMeta ? <GlobeAltIcon className="h-3 w-3" /> : <DocumentTextIcon className="h-3 w-3" />}
          {isMeta ? "قالب ميتا" : "واتساب عادي"}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge}`}>
          {isMeta && bound ? <CheckCircleIcon className="h-3 w-3" /> : null}
          {statusLabel}
        </span>
      </div>

      {isMeta && bound && template?.metaTemplateName && (
        <p className="mt-1.5 truncate font-mono text-[11px] text-blue-700 dark:text-blue-300" dir="ltr">
          {template.metaTemplateName}
          {isLegacy ? " (توصيف قديم)" : ""}
        </p>
      )}

      <div className="mt-1.5 min-h-[2.75rem]">
        {template ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {template.name || "قالب غير مسمّى"}
            </p>
            {hasContent && (
              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-400">
                {resolveVariablesForPreview(previewContent, sampleVariables)}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMeta
              ? "لا يوجد قالب ميتا — اضغط «إنشاء قالب ميتا» لتأليف رسالة وإرسالها لميتا للمراجعة، أو «اختيار قالب معتمد» لربط قالب معتمد موجود"
              : "لا يوجد قالب واتساب عادي — استخدم زر الإنشاء"}
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
            {isPreviewExpanded ? "إخفاء" : "معاينة"}
          </button>
        )}
        {isMeta && (
          <button
            onClick={onSwitch}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "فعّل الإشعار أولاً" : ""}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 transition hover:bg-white dark:bg-white/10 dark:text-blue-400 dark:hover:bg-white/20 disabled:opacity-50"
          >
            <GlobeAltIcon className="h-3 w-3" />
            {bound ? "تغيير القالب" : "اختيار قالب معتمد"}
          </button>
        )}
        {template ? (
          <button
            onClick={onEdit}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${colors.accent}`}
          >
            <PencilSquareIcon className="h-3 w-3" />
            {isMeta ? "تعديل المحتوى" : "تعديل"}
          </button>
        ) : onCreate ? (
          <button
            onClick={onCreate}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "فعّل الإشعار أولاً" : ""}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 ${
              isMeta ? "bg-blue-600 hover:bg-blue-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            <PlusIcon className="h-3 w-3" />
            {isMeta ? "إنشاء قالب ميتا" : "إنشاء"}
          </button>
        ) : null}
        {isMeta && bound && onUnbind && (
          <button
            onClick={onUnbind}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircleIcon className="h-3 w-3" />
            فك الربط
          </button>
        )}
      </div>

      {hasContent && isPreviewExpanded && (
        <div className="mt-2 rounded-md bg-white/70 p-2 dark:bg-white/5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            المعاينة الكاملة
          </p>
          <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-300">
            {resolveVariablesForPreview(previewContent, sampleVariables)}
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
              ? `${members.length} حالة بدون قالب`
              : `${members.length} حالة بنفس القالب العام`}
          </span>
          <button
            onClick={onExpand}
            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            عرض التفاصيل
          </button>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-700 dark:text-slate-400">
          {members.map((m) => m.code).slice(0, 5).join("، ")}
          {members.length > 5 ? "…" : ""}
        </span>
      </div>
      {!isNoTemplate && (members[0]?.template?.content || members[0]?.metaTemplate?.content) && (
        <p className="mt-2 line-clamp-1 text-xs italic text-slate-500 dark:text-slate-500">
          "{(members[0].template?.content || members[0].metaTemplate?.content || "").substring(0, 80)}…"
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

// نفس خريطة التحويل في backend/utils (ORDER_STATUS_TO_EVENT_TYPE) —
// عشان نطابق حالة معيّنة في الصفحة مع الـ eventType المتخزّن فعلًا في السجل.
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

function StatusReportTab({ statuses, config }: { statuses: StatusWithTemplate[]; config: TemplateScopeConfig }) {
  const { t } = useTranslation();
  // تسمية موحّدة مع باقي الصفحة — «حالة» للطلبات و«حدث» لباقي النطاقات
  const noun = config.entityLabel ?? { singular: "حالة", plural: "حالات" };
  const [range, setRange] = useState<ReportRange>("today");
  const [startDate, setStartDate] = useState(() => localDateStr(new Date()));
  const [endDate, setEndDate] = useState(() => localDateStr(new Date()));
  const [data, setData] = useState<StatusReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "meta" | "regular">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailByEvent, setDetailByEvent] = useState<Record<string, { items: StatusReportItem[]; loading: boolean }>>({});

  const reportEndpoint = config.endpoints?.report || "/whatsapp/notifications/status-report";
  const reportCategories = config.reportCategories?.length ? config.reportCategories.join(",") : undefined;
  const reportEventTypes = config.reportEventTypes?.length ? config.reportEventTypes.join(",") : undefined;

  const statusNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of statuses) {
      m.set(s.code, s.name);
      m.set(persistedEventTypeForCode(s.code), s.name);
    }
    return m;
  }, [statuses]);

  const reportParams = useCallback((params: Record<string, unknown>) => {
    return {
      ...params,
      ...(reportEventTypes ? { eventTypes: reportEventTypes } : {}),
      ...(reportCategories ? { category: reportCategories } : {}),
    };
  }, [reportCategories, reportEventTypes]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = reportRangeParams(range, startDate, endDate);
      const res = await apiClient.get(reportEndpoint, { params: reportParams({ ...params, limit: 200 }) });
      const body = res.data as StatusReportData | undefined;
      setData(body?.success ? body : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range, startDate, endDate, reportEndpoint, reportParams]);

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
      const res = await apiClient.get(reportEndpoint, {
        params: reportParams({ ...params, eventType, limit: 500 }),
      });
      const detailBody = res.data as StatusReportData | undefined;
      const items = detailBody?.items || [];
      setDetailByEvent((prev) => ({ ...prev, [eventType]: { items, loading: false } }));
    } catch {
      setDetailByEvent((prev) => ({ ...prev, [eventType]: { items: [], loading: false } }));
    }
  }, [detailByEvent, range, startDate, endDate, reportEndpoint, reportParams]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = reportRangeParams(range, startDate, endDate);
      const res = await apiClient.get(reportEndpoint, {
        params: reportParams({ ...params, limit: 5000 }),
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
        "رقم الطلب", "العميل", "الهاتف", "الحالة", "اسم القالب", "قالب ميتا",
        "النوع", "حالة التوصيل", "الوقت", "السبب",
      ];
      const rows = items.map((it) => [
        it.orderNumber,
        it.customerName,
        it.recipientPhone,
        statusNameMap.get(it.eventType) || it.eventType,
        it.templateName,
        it.metaTemplateName,
        String(it.messageType).toUpperCase() === "TEMPLATE" ? "ميتا" : "عادي",
        it.status,
        it.sentAt ? new Date(it.sentAt).toLocaleString("ar-EG") : it.createdAt ? new Date(it.createdAt).toLocaleString("ar-EG") : "",
        it.errorCode ? `[${it.errorCode}] ${it.failureReason || ""}` : (it.failureReason || ""),
      ].map(escapeCsvCell));
      const csv = "\uFEFF" + [header.map(escapeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `status-report-${config.scope}-${range}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("orders.reportExportError", "فشل تصدير التقرير"));
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

  // حالات مفعّلة للإشعار لكن مفيش ليها أي إرسال في الفترة — مؤشر إن القالب مش شغال
  const enabledWithoutSends = useMemo(() => {
    if (!data) return [];
    const reported = new Set(data.byStatus.map((r) => r.eventType));
    return statuses.filter((s) => s.category !== "OCCASION" && s.category !== "PRODUCTS" && s.notifyCustomer && !s.isNonNotifiable && !reported.has(persistedEventTypeForCode(s.code)));
  }, [data, statuses]);

  const summary = data?.summary;
  const kpis = summary
    ? [
        { label: "إجمالي الإرسالات", value: summary.total, color: "text-slate-900 dark:text-white", bg: "bg-slate-100 dark:bg-slate-800" },
        { label: "قالب ميتا", value: summary.meta, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
        { label: "واتساب عادي", value: summary.regular, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
        { label: "تم التسليم", value: summary.delivered, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
        { label: "فشل", value: summary.failed, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
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
    DELIVERED: "تم التسليم",
    READ: "مقروءة",
    SENT: "مرسلة",
    FAILED: "فشل",
    PENDING: "قيد الإرسال",
  };

  return (
    <div className="space-y-4" data-testid="status-report-tab">
      {/* Toolbar: نطاق التاريخ + الفلترة + تصدير */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900/50">
          {([
            { key: "today", label: "اليوم" },
            { key: "yesterday", label: "أمس" },
            { key: "7d", label: "آخر 7 أيام" },
            { key: "custom", label: "فترة مخصصة" },
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
              aria-label="من تاريخ"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value || localDateStr(new Date()))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="إلى تاريخ"
            />
          </div>
        )}

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          aria-label="فلترة نوع الإرسال"
        >
          <option value="all">كل الأنواع</option>
          <option value="meta">قالب ميتا</option>
          <option value="regular">واتساب عادي</option>
        </select>

        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث
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
          تصدير CSV
        </button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
        </div>
      ) : !summary ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-16 text-center dark:border-white/10">
          <DocumentTextIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">لا توجد بيانات لهذه الفترة</p>
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
                <span className="font-semibold">{noun.plural} مفعّلة بدون إرسالات في هذه الفترة:</span>{" "}
                {enabledWithoutSends.map((s) => s.name).join("، ")}
                <span className="block text-xs opacity-80">لو كان مفروض تتبعت رسايل منها، راجع قوالبها من تبويبات القوالب.</span>
              </div>
            </div>
          )}

          {/* Per-status summary table */}
          <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:border-white/10 dark:bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200/70 bg-slate-50 text-[11px] text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="px-3 py-2.5 font-medium">الحالة</th>
                    <th className="px-3 py-2.5 text-center font-medium">إجمالي</th>
                    <th className="px-3 py-2.5 text-center font-medium">ميتا</th>
                    <th className="px-3 py-2.5 text-center font-medium">عادي</th>
                    <th className="px-3 py-2.5 text-center font-medium">تم التسليم</th>
                    <th className="px-3 py-2.5 text-center font-medium">فشل</th>
                    <th className="px-3 py-2.5 text-center font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                        لا توجد إرسالات لهذه الفترة
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
                              <span className="ms-1.5 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
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
                                <p className="py-4 text-center text-xs text-slate-400">لا توجد رسائل تفصيلية في هذه الفترة</p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200/70 bg-white dark:border-white/10 dark:bg-slate-900/50">
                                  <table className="w-full text-right text-[11px]">
                                    <thead>
                                      <tr className="border-b border-slate-200/70 bg-slate-50 text-[10px] text-slate-500 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400">
                                        <th className="px-3 py-2 font-medium">رقم الطلب</th>
                                        <th className="px-3 py-2 font-medium">العميل</th>
                                        <th className="px-3 py-2 font-medium">الهاتف</th>
                                        <th className="px-3 py-2 font-medium">القالب</th>
                                        <th className="px-3 py-2 font-medium">النوع</th>
                                        <th className="px-3 py-2 font-medium">الحالة</th>
                                        <th className="px-3 py-2 font-medium">الوقت</th>
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
                                              {it.orderNumber || "—"}
                                            </td>
                                            <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{it.customerName || "—"}</td>
                                            <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400" dir="ltr">
                                              {it.recipientPhone || "—"}
                                            </td>
                                            <td className="px-3 py-2">
                                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {it.templateName || "بدون قالب"}
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
                                                  ☁️ ميتا
                                                </span>
                                              ) : (
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                  📱 عادي
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
                                                : "—"}
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
