import { useEffect, useState, useCallback, useMemo } from "react";
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

// حد Meta Cloud API لطول نص الرسالة (body) — تجاوزه يسبب رفض القالب
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
}

interface SettingsForm {
  isEnabled: boolean;
  orderNotificationsEnabled: boolean;
  defaultSessionId: string;
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
    { id: "confirm", text: "تأكيد الأوردر", action: "CONFIRMED" },
    { id: "cancel", text: "إلغاء الأوردر", action: "CANCELLED" }
  ],
  sendMode: "direct",
  metaTemplateName: "",
  metaTemplateLanguage: "ar",
});

const DEFAULT_TEMPLATE_CONTENT = `مرحباً {{customerName}} 👋

نود إعلامك أن حالة طلبك رقم {{orderNumber}} قد تغيرت إلى: *{{status}}*

{{orderItems}}
شكراً لتعاملك معنا! ✨`;

const ORDER_VARIABLES = [
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

const TABS = [
  { key: "all", label: "الكل" },
  { key: "order", label: "الطلبات" },
  { key: "payment", label: "الدفع" },
  { key: "preparation", label: "التجهيز" },
  { key: "shipping", label: "الشحن" },
  { key: "incomplete", label: "رسائل الأوردر غير المكتمل" },
];

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

function resolveVariablesForPreview(content: string): string {
  if (!content) return "";
  return content.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, name) => {
    return SAMPLE_VARIABLES[name] || `[${name}]`;
  });
}

/**
 * عرض نص قالب ميتا (اللي فيه {{1}}، {{2}}...) بقيم نموذجية —
 * بيربط كل رقم ميتا بالمتغير المحلي المطابق حسب ترتيب الظهور.
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

export { resolveVariablesForPreview };

/**
 * WhatsAppBubblePreview — معاينة مباشرة لشكل الرسالة في محادثة واتساب.
 * بترسم bubble أخضر بـ timestamp ومتغيرات محلولة + الأزرار التفاعلية.
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
          <span className="text-slate-400 dark:text-slate-500">معاينة الرسالة ستظهر هنا...</span>
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

function parseTemplateButtons(raw?: string): TemplateButton[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((b: any) => ({
        id: String(b?.id || ""),
        text: String(b?.text || ""),
        action: b?.action ? String(b.action).toUpperCase() : inferButtonAction(b?.id),
      }))
      .filter((b) => b.id || b.text);
  } catch {
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
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [showLocalRef, setShowLocalRef] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm());

  const [metaSessions, setMetaSessions] = useState<{ id: string; name: string; metaDisplayPhoneNumber?: string }[]>([]);
  const [selectedMetaSession, setSelectedMetaSession] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resubmittingMeta, setResubmittingMeta] = useState(false);
  const [availableMetaTemplates, setAvailableMetaTemplates] = useState<MetaAvailableTemplate[]>([]);
  const [loadingMetaTemplates, setLoadingMetaTemplates] = useState(false);
  const [bindingId, setBindingId] = useState<string | null>(null);

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
      toast.error(t("orders.loadError", "حدث خطأ في تحميل البيانات"));
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
      // silent fail — الـ preview ميزة مساعدة
      console.error("Failed to fetch delivery preview", err);
    }
  }, []);

  useEffect(() => {
    document.title = `${t("orders.statusTemplatesTitle", "قوالب الواتساب للحالات")} | MaxP`;
    fetchData();
    fetchSettings();
    fetchDeliveryPreview();
  }, [fetchData, fetchSettings, fetchDeliveryPreview, t]);

  useEffect(() => {
    if (dialogOpen === false) fetchDeliveryPreview();
  }, [dialogOpen, fetchDeliveryPreview]);

  const openCreateDialog = (status: StatusWithTemplate, slot: TemplateSlot) => {
    setSelectedStatus(status);
    setSelectedTemplate(null);
    setDialogSlot(slot);
    setTemplateForm({
      name: slot === "meta" ? `قالب ميتا ${status.name}` : `قالب ${status.name}`,
      content: slot === "meta" && status.template?.content ? status.template.content : DEFAULT_TEMPLATE_CONTENT,
      isActive: true,
      hasButtons: true,
      buttons: [
        { id: "confirm", text: "تأكيد الأوردر", action: "CONFIRMED" },
        { id: "cancel", text: "إلغاء الأوردر", action: "CANCELLED" }
      ],
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: "",
      metaTemplateLanguage: "ar",
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
    const metaName = target?.metaTemplateName || "";
    // لو قالب ميتا مربوط بالفعل، المرجع المحلي هو اللي بنعدّل بيه الرسالة (resubmit)
    setShowLocalRef(slot === "meta" && !!metaName);
    setTemplateForm({
      name: target?.name || (slot === "meta" ? `قالب ميتا ${status.name}` : `قالب ${status.name}`),
      content: target?.content || DEFAULT_TEMPLATE_CONTENT,
      isActive: target?.isActive ?? true,
      hasButtons: target?.hasButtons ?? true,
      buttons: parseTemplateButtons(target?.buttons),
      sendMode: slot === "meta" ? "bind_meta" : "direct",
      metaTemplateName: metaName,
      metaTemplateLanguage: target?.metaTemplateLanguage || "ar",
    });
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const persistLocalTemplate = useCallback(async (): Promise<string | null> => {
    if (!selectedStatus) return null;
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "محتوى الرسالة مطلوب"));
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
      } = {
        category: selectedStatus.code === INCOMPLETE_CART_EVENT_TYPE ? "ABANDONED_CART" : "ORDERS",
        eventType: selectedStatus.code,
        name: templateForm.name,
        content: templateForm.content,
        isActive: templateForm.isActive,
        hasButtons: saveButtons.length > 0,
        buttons: saveButtons,
      };
      if (!isEdit) {
        payload.channel = dialogSlot === "meta" ? "META_CLOUD" : "AUTO";
      }
      if (isEdit) {
        await apiClient.put(`/whatsapp/notifications/templates/${selectedTemplate!.id}`, payload);
        toast.success(t("orders.templateUpdated", "تم تحديث القالب بنجاح"));
        return selectedTemplate!.id;
      } else {
        const res = await apiClient.post("/whatsapp/notifications/templates", payload);
        const created = (res?.data as { template?: { id?: string } })?.template;
        const newTemplateId = created?.id;
        if (!newTemplateId) {
          toast.error(t("orders.templateSaveError", "حدث خطأ في حفظ القالب"));
          return null;
        }
        toast.success(t("orders.templateCreated", "تم إنشاء القالب بنجاح"));
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
  }, [selectedStatus, selectedTemplate, templateForm, dialogSlot, t]);

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
    setResubmittingMeta(true);
    try {
      const res = await apiClient.post(`/whatsapp-notifications/templates/${selectedTemplate.id}/resubmit-meta`, {
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
    setTogglingId(status.id);
    try {
      if (status.code === INCOMPLETE_CART_EVENT_TYPE) {
        await apiClient.put("/whatsapp/notifications/settings", {
          incompleteCartImmediateMessage: !status.notifyCustomer,
        });
      } else {
        await apiClient.put(`/order-status/${status.id}`, {
          notifyCustomer: !status.notifyCustomer,
        });
      }
      setStatuses((prev) =>
        prev.map((s) => (s.id === status.id ? { ...s, notifyCustomer: !s.notifyCustomer } : s))
      );
      toast.success(
        status.notifyCustomer
          ? t("orders.notifyDisabled", "تم إيقاف الإشعار لهذه الحالة")
          : t("orders.notifyEnabled", "تم تفعيل الإشعار لهذه الحالة")
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("orders.toggleError", "حدث خطأ"));
    } finally {
      setTogglingId(null);
    }
  };

  const fetchMetaSessions = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp/sessions");
      const list: { id: string; name: string; provider: string; metaDisplayPhoneNumber?: string }[] = res.data?.sessions || [];
      const cloud = list.filter((s) => s.provider === "META_CLOUD");
      setMetaSessions(cloud);
      if (cloud.length > 0 && !selectedMetaSession) {
        setSelectedMetaSession(cloud[0].id);
      }
    } catch {}
  }, [selectedMetaSession]);

  const publishToMeta = async (templateId: string) => {
    if (!selectedMetaSession) {
      toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    setPublishingId(templateId);
    try {
      await apiClient.post(`/whatsapp-notifications/templates/${templateId}/publish`, { sessionId: selectedMetaSession });
      toast.success(t("orders.publishedToMeta", "تم إرسال القالب لميتا للمراجعة"));
      fetchAvailableMetaTemplates();
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
      toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    setBindingId(templateId);
    try {
      await apiClient.post(`/whatsapp-notifications/templates/${templateId}/bind-meta`, {
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

  const unbindMeta = async (status: StatusWithTemplate) => {
    const target = status.metaTemplate || (status.template?.metaTemplateName ? status.template : null);
    if (!target?.id) return;
    if (!window.confirm("هل تريد فك ربط هذا القالب بقالب ميتا؟")) return;
    try {
      await apiClient.put(`/whatsapp/notifications/templates/${target.id}`, {
        metaTemplateName: null,
        metaTemplateId: null,
        metaTemplateStatus: null,
      });
      toast.success("تم فك ربط القالب بقالب ميتا");
      fetchData();
      fetchDeliveryPreview();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.bindFailed", "فشل ربط القالب بميتا"));
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
      toast.error(t("orders.selectMetaSession", "اختر جلسة ميتا أولاً"));
      return;
    }
    setSyncingStatus(true);
    try {
      const res = await apiClient.post("/whatsapp-notifications/templates/sync-status", { sessionId: metaSessionId });
      const data = res.data as { success?: boolean; synced?: number };
      if (data?.success) {
        const synced = data.synced ?? 0;
        if (synced === 0) {
          toast.success(t("orders.metaSyncUpToDate", "كل القوالب محدّثة — مفيش حاجة اتغيرت"));
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
      toast.error(err?.response?.data?.error || t("orders.metaSyncFailed", "فشلت المزامنة من ميتا"));
    } finally {
      setSyncingStatus(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSettingsSaving(true);
    try {
      const res = await apiClient.put("/whatsapp/notifications/settings", settings);
      if (res.data?.success) {
        toast.success(t("orders.settingsSaved", "تم حفظ الإعدادات"));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("orders.settingsError", "فشل حفظ الإعدادات"));
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
              {t("orders.statusTemplatesTitle", "قوالب الواتساب للحالات")}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t("orders.statusTemplatesDesc", "إدارة قوالب رسائل الواتساب المرتبطة بحالات الطلبات")}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const count = tab.key === "all"
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
              {tab.label}
              <span className="mr-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                {count}
              </span>
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
          الإعدادات
        </button>
      </div>

      {activeTab === "settings" ? (
        /* ⚙️ Settings Panel */
        <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-slate-900/50">
          <h2 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
            <Cog6ToothIcon className="ml-1.5 inline h-5 w-5" />
            إعدادات إشعارات واتساب للطلبات
          </h2>

          {settingsLoading ? (
            <div className="flex justify-center py-10">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
            </div>
          ) : !settings ? (
            <p className="text-sm text-slate-400">لا توجد إعدادات</p>
          ) : (
            <div className="space-y-5 max-w-xl">
              {/* General toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">تفعيل إشعارات واتساب</p>
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
                    onClick={syncMetaStatuses}
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
                  <p className="text-sm font-medium text-slate-900 dark:text-white">تثبيت الجلسة (Sticky Session)</p>
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
                      <ClockIcon className="ml-1 inline h-4 w-4" />
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
                  <BoltIcon className="ml-1 inline h-4 w-4" />
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
                حفظ الإعدادات
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
                {statusesWithoutTemplate.length} حالة بدون قالب واتساب
                {activeTab !== "all" ? " في هذا القسم" : ""}
              </span>
            </div>
          )}

          {/* Meta session warning */}
          {boundMetaCount > 0 && !defaultSessionIsMeta && (
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
                placeholder="ابحث باسم الحالة أو الكود..."
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
                { key: "all", label: "الكل" },
                { key: "custom", label: "مخصصة" },
                { key: "meta_bound", label: "مربوطة بميتا" },
                { key: "no_template", label: "بدون قالب" },
                { key: "disabled", label: "متوقفة" },
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
                  {chip.label}
                </button>
              ))}
            </div>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="statusType">حسب التبويب</option>
              <option value="alphabetical">أبجدي</option>
              <option value="recent">آخر تعديل</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={showInternal}
                onChange={(e) => setShowInternal(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              عرض الحالات الداخلية ({internalCount})
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
                  ? "لا توجد حالات مطابقة لبحثك"
                  : "لا توجد حالات بعد"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
                {searchQuery || activeChip !== "all"
                  ? "جرّب تغيير كلمات البحث أو إلغاء الفلاتر لرؤية كل الحالات."
                  : "الحالات الخاصة بالطلبات هتظهر هنا أول ما تتضاف."}
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
                    onUnbindMeta={unbindMeta}
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
          showCloseButton
          closeLabel="إغلاق"
          className="max-w-2xl overflow-y-auto p-5 sm:max-h-[90vh] sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {dialogSlot === "meta"
                ? `${selectedTemplate?.id ? "تعديل قالب ميتا" : "إنشاء قالب ميتا"}: ${selectedStatus?.name}`
                : `${selectedTemplate?.id ? "تعديل قالب واتساب" : "إنشاء قالب واتساب"}: ${selectedStatus?.name}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              نموذج إنشاء وتعديل قالب رسالة واتساب للحالة
            </DialogDescription>
          </DialogHeader>
          {dialogOpen && selectedStatus && (
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

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">اسم القالب</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="مثال: قالب تأكيد الطلب"
                />
              </div>

              {/* Slot indicator + contextual explainer */}
              <div className={`rounded-lg p-2.5 text-[11px] leading-relaxed ${
                dialogSlot === "meta"
                  ? "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                  : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
              }`}>
                {dialogSlot === "meta" ? (
                  <>☁️ <strong>قالب ميتا المعتمد هو اللي بيتابعت للعميل</strong> — النص اللي بتكتبه هنا مرجع للربط/النشر. بيشتغل بس مع جلسة <code>Meta Cloud API</code>.</>
                ) : (
                  <>📱 <strong>النص اللي بتكتبه هنا هو اللي بيتابعت للعميل مباشرة</strong> عبر الواتساب (Baileys). لو عملت كمان قالب ميتا لنفس الحالة، ميتا له الأسبقية لما الجلسة الأساسية تكون Meta Cloud.</>
                )}
              </div>

              {dialogSlot === "meta" && defaultSessionInfo?.provider !== "META_CLOUD" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                  ⚠️ الجلسة الافتراضية الحالية {defaultSessionInfo?.provider === "BAILEYS" ? "Baileys" : "غير ميتا"} —
                  القوالب المربوطة بميتا مش هتتبعت إلا لو غيّرت الجلسة الافتراضية من الإعدادات.
                </div>
              )}

              {/* ===== META SLOT CONTENT ===== */}
              {dialogSlot === "meta" && (
                <div className="space-y-3 rounded-lg border border-blue-200 p-3 dark:border-blue-800/40">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    اختر قالب ميتا المعتمد
                  </label>
                  <p className="-mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                    اختار القالب وبعدين اضغط «حفظ وربط بقالب ميتا» تحت — اختيارك مش بيتحفظ لوحده.
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
                        إنشاء قالب ميتا جديد
                      </button>
                      <select
                        value={selectedMetaSession}
                        onChange={(e) => { setSelectedMetaSession(e.target.value); }}
                        aria-label="جلسة ميتا للربط"
                        className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {metaSessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} {s.metaDisplayPhoneNumber ? `(${s.metaDisplayPhoneNumber})` : ""}
                          </option>
                        ))}
                      </select>
                      {loadingMetaTemplates ? (
                        <p className="text-xs text-slate-400">جار تحميل قوالب ميتا...</p>
                      ) : availableMetaTemplates.length > 0 ? (
                        <>
                          <select
                            value={templateForm.metaTemplateName}
                            onChange={(e) => setTemplateForm((p) => ({ ...p, metaTemplateName: e.target.value }))}
                            aria-label="قالب ميتا المعتمد"
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          >
                            <option value="">اختر قالب...</option>
                            {availableMetaTemplates.map((mt) => {
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

                          {selectedMetaBody && (
                            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50/50 p-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
                              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-blue-500 dark:text-blue-400">
                                <GlobeAltIcon className="h-3 w-3" />
                                الرسالة اللي هتتبعت للعميل (نص قالب ميتا)
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
                                المتغيرات بتتقري تلقائيًا من الطلب — النص ده هو اللي هيوصلك للعميل بالظبط.
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
                                ℹ️ القالب ده مربوط حالياً بكمان: {otherBoundEvents.join("، ")} — نفس الرسالة هتتبعت ليهم. لو عايز رسالة مختلفة لحالة، اعمل قالب ميتا جديد.
                              </div>
                            );
                          })()}

                          {/* Variable mapping {{1}} → customerName — بصري وواضح */}
                          {selectedMetaBody && (() => {
                            const localVars = extractLocalVariableOrder(templateForm.content);
                            const metaNums = [...selectedMetaBody.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]);
                            if (localVars.length === 0 || metaNums.length === 0) return null;
                            const pairs = metaNums.map((n, i) => ({
                              meta: `{{${n}}}`,
                              local: localVars[i] ? `{{${localVars[i]}}}` : "—",
                              desc: localVars[i] ? (VARIABLE_DESCRIPTIONS[localVars[i]] || "") : "غير متوفر",
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

                          {selectedTemplate?.metaTemplateName && (
                            <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-700 dark:border-sky-800/40 dark:bg-sky-900/20 dark:text-sky-300">
                              حالياً مربوط بـ: {selectedTemplate.metaTemplateName}
                              {selectedTemplate.metaTemplateStatus ? ` (${selectedTemplate.metaTemplateStatus})` : ""}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">
                          لا توجد قوالب ميتا معتمدة — اضغط «إنشاء قالب ميتا جديد» عشان تنشر قالب جديد على ميتا للمراجعة.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">لا توجد جلسة ميتا متصلة لربط القوالب</p>
                  )}
                </div>
              )}

              {/* ===== LOCAL CONTENT ===== */}
              <div className={dialogSlot === "meta" ? "rounded-lg border border-slate-200 p-3 dark:border-slate-700" : ""}>
                {dialogSlot === "meta" ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowLocalRef((s) => !s)}
                      className="flex w-full items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                        <ChevronDownIcon className={`h-3.5 w-3.5 transition ${showLocalRef ? "rotate-180" : ""}`} />
                        {selectedTemplate?.metaTemplateName ? "نص رسالة قالب ميتا" : "المرجع المحلي (لتطابق المتغيرات)"}
                      </span>
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                        {showLocalRef ? "إخفاء" : "عرض"}
                      </span>
                    </button>
                    {selectedTemplate?.metaTemplateName ? (
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                        النص ده هو رسالة قالب ميتا — عدّل عليه وبعدين اضغط «إرسال للمراجعة من جديد» عشان ميتا تراجع الرسالة الجديدة (الرسايل هتتوقف لحد الموافقة).
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                        القالب المحلي ده مش اللي هيتتبعت — بيستخدم بس عشان نربط متغيرات الطلب بأرقام قالب ميتا ({"{{1}}"} ← {"{{customerName}}"}) .
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      محتوى الرسالة <span className="text-red-500">*</span>
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
                    aria-label={dialogSlot === "meta" ? "محتوى القالب المحلي" : "محتوى الرسالة"}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                      templateForm.content.length > META_BODY_CHAR_LIMIT
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
                    />
                  </div>
                </div>

                {templateForm.content.length > META_BODY_CHAR_LIMIT && (
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
                    لو غيّرت المرجع المحلي وضغطت "حفظ وربط بقالب ميتا" يتسجّل — أو "إرسال للمراجعة من جديد" عشان ميتا تراجعه.
                  </p>
                )}
                </>
                ) : null}
              </div>

              {dialogSlot === "meta" && templateForm.metaTemplateName ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ℹ️ الأزرار بتاعة الرسالة بتتاخد من قالب ميتا المعتمد نفسه — الأزرار المحلية مش هتتأثر.
                  </p>
                </div>
              ) : (
              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    الأزرار التفاعلية
                  </label>
                  <Switch
                    checked={templateForm.hasButtons}
                    onCheckedChange={(val) => setTemplateForm((p) => ({ ...p, hasButtons: val }))}
                    aria-label="الأزرار التفاعلية"
                  />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  لما العميل يضغط على الزر، حالة الطلب هتتغير تلقائيًا للحالة المحددة أدناه
                </p>

                {templateForm.hasButtons && (
                  <div className="mt-3 space-y-2">
                    {templateForm.buttons.map((btn, idx) => (
                      <div
                        key={btn.id || idx}
                        className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-700 dark:bg-slate-800/40"
                      >
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[10px] font-medium text-slate-400 dark:text-slate-500">نص الزر</label>
                          <input
                            type="text"
                            value={btn.text}
                            onChange={(e) => updateButton(idx, { text: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            placeholder="مثال: تأكيد الأوردر"
                          />
                        </div>
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

                    {templateForm.buttons.length < 3 && (
                      <button
                        type="button"
                        onClick={addButton}
                        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                        إضافة زر
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">الحد الأقصى 3 أزرار لكل رسالة</p>
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
                  قالب نشط
                </label>
              </div>

            <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/70 bg-white/95 px-1 pt-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              {dialogSlot === "meta" && selectedTemplate?.metaTemplateName && (
                <button
                  onClick={handleResubmitMeta}
                  disabled={saving || resubmittingMeta || !!bindingId}
                  title="تحديث المحتوى على ميتا ويرجع للمراجعة تاني"
                  className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                >
                  {resubmittingMeta ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <ArrowPathIcon className="h-4 w-4" />}
                  إرسال للمراجعة من جديد
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving || resubmittingMeta || !!bindingId || (dialogSlot === "regular" && !templateForm.content.trim())}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving || bindingId ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {dialogSlot === "meta"
                  ? templateForm.metaTemplateName
                    ? "حفظ وربط بقالب ميتا"
                    : "حفظ قالب ميتا"
                  : "حفظ"}
              </button>
            </div>

            {dialogSlot === "meta" && (
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                أي تعديل على المحتوى أو الأزرار وبعدين "إرسال للمراجعة من جديد" هيبعت القالب لميتا للمراجعة — هيتوقف عن الإرسال لحد ما يوافقوا تاني.
              </p>
            )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  const deliveryIcons = { none: "🟢", warning: "🟡", danger: "🔴" };

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
                {resolveVariablesForPreview(previewContent)}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMeta ? "لا يوجد قالب ميتا لهذه الحالة" : "لا يوجد قالب واتساب عادي — استخدم زر الإنشاء"}
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
        {template ? (
          <button
            onClick={onEdit}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${colors.accent}`}
          >
            <PencilSquareIcon className="h-3 w-3" />
            {isMeta && isLegacy ? "تعديل الربط" : "تعديل"}
          </button>
        ) : (
          <button
            onClick={onCreate}
            disabled={!status.notifyCustomer}
            title={!status.notifyCustomer ? "فعّل الإشعار أولاً" : ""}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
              status.notifyCustomer
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            <PlusIcon className="h-3 w-3" />
            إنشاء
          </button>
        )}
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

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
