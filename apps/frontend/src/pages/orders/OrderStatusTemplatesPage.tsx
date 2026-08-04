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
} from "@heroicons/react/24/outline";

interface Template {
  id: string;
  name: string;
  content: string;
  eventType: string;
  isActive: boolean;
  buttons?: string;
  hasButtons?: boolean;
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
  hasTemplate: boolean;
}

interface MetaAvailableTemplate {
  name: string;
  status: string;
  language?: string;
  category?: string;
  boundToLocalTemplateId?: string | null;
  boundToEventType?: string | null;
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
];

const DEFAULT_BUTTON_ACTIONS: { value: string; label: string }[] = [
  { value: "CONFIRMED", label: "تأكيد الطلب" },
  { value: "PROCESSING", label: "تأجيل التسليم" },
  { value: "CANCELLED", label: "إلغاء الطلب" },
];

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

export default function OrderStatusTemplatesPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState("all");

  const [statuses, setStatuses] = useState<StatusWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<StatusWithTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(emptyTemplateForm());

  const [metaSessions, setMetaSessions] = useState<{ id: string; name: string; metaDisplayPhoneNumber?: string }[]>([]);
  const [selectedMetaSession, setSelectedMetaSession] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [availableMetaTemplates, setAvailableMetaTemplates] = useState<MetaAvailableTemplate[]>([]);
  const [loadingMetaTemplates, setLoadingMetaTemplates] = useState(false);
  const [bindingId, setBindingId] = useState<string | null>(null);

  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [settingsSessions, setSettingsSessions] = useState<{ id: string; name: string; phoneNumber?: string; status: string; provider?: string }[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [deliveryPreview, setDeliveryPreview] = useState<Record<string, DeliveryPreviewItem>>({});
  const [defaultSessionInfo, setDefaultSessionInfo] = useState<DefaultSessionInfo | null>(null);

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
      if (res.data?.success) {
        setDefaultSessionInfo(res.data.defaultSession || null);
        const map: Record<string, DeliveryPreviewItem> = {};
        for (const item of res.data.preview || []) {
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

  const openCreateDialog = (status: StatusWithTemplate) => {
    setSelectedStatus(status);
    setTemplateForm({
      name: `قالب ${status.name}`,
      content: DEFAULT_TEMPLATE_CONTENT,
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
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const openEditDialog = (status: StatusWithTemplate) => {
    setSelectedStatus(status);
    const hasBoundMeta = !!(status.template?.metaTemplateName && status.template.metaTemplateStatus === "APPROVED");
    setTemplateForm({
      name: status.template?.name || `قالب ${status.name}`,
      content: status.template?.content || DEFAULT_TEMPLATE_CONTENT,
      isActive: status.template?.isActive ?? true,
      hasButtons: status.template?.hasButtons ?? true,
      buttons: parseTemplateButtons(status.template?.buttons),
      sendMode: hasBoundMeta ? "bind_meta" : "direct",
      metaTemplateName: status.template?.metaTemplateName || "",
      metaTemplateLanguage: status.template?.metaTemplateLanguage || "ar",
    });
    setDialogOpen(true);
    fetchMetaSessions();
  };

  const handleSave = async () => {
    if (!selectedStatus) return;
    if (templateForm.sendMode === "bind_meta") {
      if (!templateForm.metaTemplateName) {
        toast.error(t("orders.selectMetaTemplate", "اختر قالب ميتا للربط"));
        return;
      }
      if (selectedStatus.template?.id) {
        await bindMetaTemplate(selectedStatus.template.id, templateForm.metaTemplateName, templateForm.metaTemplateLanguage);
      } else {
        toast.error(t("orders.saveTemplateFirst", "احفظ القالب كإرسال مباشر أولاً ثم اربطه بميتا"));
      }
      return;
    }
    if (!templateForm.content.trim()) {
      toast.error(t("orders.templateContentRequired", "محتوى الرسالة مطلوب"));
      return;
    }
    const saveButtons = templateForm.hasButtons
      ? templateForm.buttons
          .filter((b) => b.text.trim())
          .map((b) => ({ id: b.id, text: b.text.trim(), action: b.action.toUpperCase() }))
      : [];
    setSaving(true);
    try {
      const isEdit = !!selectedStatus.template?.id;
      const payload = {
        category: "ORDERS",
        eventType: selectedStatus.code,
        name: templateForm.name,
        content: templateForm.content,
        isActive: templateForm.isActive,
        hasButtons: saveButtons.length > 0,
        buttons: saveButtons,
      };
      if (isEdit) {
        await apiClient.put(`/whatsapp/notifications/templates/${selectedStatus.template!.id}`, payload);
        toast.success(t("orders.templateUpdated", "تم تحديث القالب بنجاح"));
      } else {
        await apiClient.post("/whatsapp/notifications/templates", payload);
        toast.success(t("orders.templateCreated", "تم إنشاء القالب بنجاح"));
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("orders.templateSaveError", "حدث خطأ في حفظ القالب"));
    } finally {
      setSaving(false);
    }
  };

  const toggleNotify = async (status: StatusWithTemplate) => {
    setTogglingId(status.id);
    try {
      await apiClient.put(`/order-status/${status.id}`, {
        notifyCustomer: !status.notifyCustomer,
      });
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

  useEffect(() => {
    if (dialogOpen && selectedMetaSession) {
      fetchAvailableMetaTemplates();
    }
  }, [dialogOpen, selectedMetaSession, fetchAvailableMetaTemplates]);

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

  const statusesWithoutTemplate = filteredStatuses.filter((s) => !s.hasTemplate);
  const hasGaps = statusesWithoutTemplate.length > 0;

  const boundMetaCount = filteredStatuses.filter((s) => s.template?.metaTemplateName).length;
  const defaultSession = settingsSessions.find((s) => s.id === settings?.defaultSessionId);
  const defaultSessionIsMeta = defaultSession?.provider === "META_CLOUD" || !!metaSessions.find((s) => s.id === settings?.defaultSessionId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("orders.statusTemplatesTitle", "قوالب الواتساب للحالات")}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {t("orders.statusTemplatesDesc", "إدارة قوالب رسائل الواتساب المرتبطة بحالات الطلبات")}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const count = tab.key === "all" ? statuses.length : statuses.filter((s) => s.statusType === tab.key).length;
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
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => setSettings((p) => p ? { ...p, isEnabled: e.target.checked } : p)}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-slate-700 dark:peer-checked:bg-indigo-500" />
                </label>
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Order notifications toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">إشعارات حالات الطلبات</p>
                  <p className="text-xs text-slate-500">إرسال رسالة واتساب عند تغيير حالة الطلب</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.orderNotificationsEnabled}
                    onChange={(e) => setSettings((p) => p ? { ...p, orderNotificationsEnabled: e.target.checked } : p)}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-slate-700 dark:peer-checked:bg-indigo-500" />
                </label>
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
                    {defaultSessionInfo.provider === "META_CLOUD" && !Object.keys(deliveryPreview).some((k) => deliveryPreview[k].riskLevel === "none") && (
                      <span className="text-amber-500 dark:text-amber-400">تحقق من حالة كل قالب</span>
                    )}
                  </div>
                )}
              </div>

              <hr className="border-slate-200 dark:border-slate-700" />

              {/* Sticky session */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">تثبيت الجلسة (Sticky Session)</p>
                  <p className="text-xs text-slate-500">نفس العميل يستخدم نفس الجلسة دايمًا</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.stickySessionEnabled}
                    onChange={(e) => setSettings((p) => p ? { ...p, stickySessionEnabled: e.target.checked } : p)}
                    className="peer sr-only"
                  />
                  <span className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-slate-700 dark:peer-checked:bg-indigo-500" />
                </label>
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
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.quietHoursEnabled}
                      onChange={(e) => setSettings((p) => p ? { ...p, quietHoursEnabled: e.target.checked } : p)}
                      className="peer sr-only"
                    />
                    <span className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-slate-700 dark:peer-checked:bg-indigo-500" />
                  </label>
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

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="mb-3 inline-block h-7 w-7 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
              <p className="text-sm">{t("common.loading", "جار التحميل...")}</p>
            </div>
          ) : filteredStatuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 py-16 text-center dark:border-white/10">
              <DocumentTextIcon className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                لا توجد حالات في هذا القسم
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStatuses.map((status) => {
                const hasTemplate = status.hasTemplate;
                return (
                  <div
                    key={status.id}
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
                                {status.statusType === "preparation" ? "تجهيز" : status.statusType === "shipping" ? "شحن" : status.statusType === "payment" ? "دفع" : status.statusType}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono">{status.code}</span>
                            <button
                              onClick={() => toggleNotify(status)}
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

                      <div className="flex shrink-0 items-center gap-1.5">
                        {(() => {
                          const p = status.template?.eventType ? deliveryPreview[status.template.eventType] : undefined;
                          if (!p) return null;
                          const colors = {
                            none: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                            warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                            danger: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                          };
                          const icons = { none: "🟢", warning: "🟡", danger: "🔴" };
                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium ${colors[p.riskLevel]}`}
                              title={p.message}
                            >
                              {icons[p.riskLevel]} {p.message.length > 40 ? `${p.message.substring(0, 40)}…` : p.message}
                            </span>
                          );
                        })()}
                        {hasTemplate ? (
                          <>
                            <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                              <CheckCircleIcon className="h-3 w-3" />
                              يوجد قالب
                            </span>
                            {status.template?.metaTemplateName && (
                              <span
                                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  status.template.metaTemplateStatus === "APPROVED"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                                }`}
                                title={`Meta template: ${status.template.metaTemplateName} (${status.template.metaTemplateStatus})`}
                              >
                                <GlobeAltIcon className="h-3 w-3" />
                                {status.template.metaTemplateStatus === "APPROVED" ? "ميتا معتمد" : status.template.metaTemplateStatus || "ميتا"}
                              </span>
                            )}
                            <button
                              onClick={() => openEditDialog(status)}
                              className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[11px] font-medium text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400"
                            >
                              <PencilSquareIcon className="h-3 w-3" />
                              تعديل
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                              <XCircleIcon className="h-3 w-3" />
                              بدون قالب
                            </span>
                            <button
                              onClick={() => openCreateDialog(status)}
                              disabled={!status.notifyCustomer}
                              title={!status.notifyCustomer ? "فعّل الإشعار أولاً" : ""}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                                status.notifyCustomer
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                              }`}
                            >
                              <PlusIcon className="h-3 w-3" />
                              إضافة
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {hasTemplate && status.template?.content && (
                      <div className="mt-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/30">
                        <p className="mb-1 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          معاينة القالب
                        </p>
                        <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                          {status.template.content}
                        </p>
                        {status.template?.hasButtons && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {parseTemplateButtons(status.template?.buttons).map((b, i) => (
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
              })}
            </div>
          )}
        </>
      )}

      {/* Template dialog */}
      {dialogOpen && selectedStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {selectedStatus.template?.id
                ? `تعديل قالب: ${selectedStatus.name}`
                : `إنشاء قالب: ${selectedStatus.name}`}
            </h2>

            <div className="mt-4 space-y-3">
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

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">طريقة الإرسال</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateForm((p) => ({ ...p, sendMode: "direct" }))}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      templateForm.sendMode === "direct"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    إرسال مباشر (نص)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplateForm((p) => ({ ...p, sendMode: "bind_meta" }))}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      templateForm.sendMode === "bind_meta"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    ربط قالب ميتا معتمد
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {templateForm.sendMode === "bind_meta"
                    ? "القالب المعتمد على ميتا هو اللي هيتبعت للعميل (يشتغل مع جلسة Meta Cloud API)"
                    : "النص اللي بتكتبه تحت هو اللي هيتبعت مباشرة"}
                </p>
              </div>

              {templateForm.sendMode === "bind_meta" ? (
                <div className="rounded-lg border border-emerald-200 p-3 dark:border-emerald-800/40">
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    اختر قالب ميتا المعتمد
                  </label>
                  {metaSessions.length > 0 ? (
                    <>
                      <select
                        value={selectedMetaSession}
                        onChange={(e) => { setSelectedMetaSession(e.target.value); }}
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
                        <select
                          value={templateForm.metaTemplateName}
                          onChange={(e) => setTemplateForm((p) => ({ ...p, metaTemplateName: e.target.value }))}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        >
                          <option value="">اختر قالب...</option>
                          {availableMetaTemplates
                            .filter((mt) => !mt.boundToLocalTemplateId || mt.boundToLocalTemplateId === selectedStatus?.template?.id)
                            .map((mt) => (
                              <option key={mt.name} value={mt.name}>
                                {mt.name} {mt.category ? `(${mt.category})` : ""}
                                {mt.boundToEventType ? ` - مربوط بـ ${mt.boundToEventType}` : ""}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <p className="text-xs text-slate-400">
                          لا توجد قوالب ميتا معتمدة. انشر قالب جديد من القسم اللي تحت أولاً.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">لا توجد جلسة ميتا متصلة لربط القوالب</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      محتوى الرسالة <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm((p) => ({ ...p, content: e.target.value }))}
                      rows={6}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      placeholder="اكتب رسالتك هنا..."
                    />

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
                  </div>
                </>
              )}

              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    الأزرار التفاعلية
                  </label>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={templateForm.hasButtons}
                      onChange={(e) => setTemplateForm((p) => ({ ...p, hasButtons: e.target.checked }))}
                      className="peer sr-only"
                    />
                    <span className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-indigo-600 peer-checked:after:translate-x-full dark:bg-slate-700 dark:peer-checked:bg-indigo-500" />
                  </label>
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
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={saving || bindingId === selectedStatus?.template?.id || (templateForm.sendMode === "direct" && !templateForm.content.trim())}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving || bindingId === selectedStatus?.template?.id ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
                {templateForm.sendMode === "bind_meta" ? "ربط بقالب ميتا" : "حفظ"}
              </button>
            </div>

            {selectedStatus?.template?.id && (
              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                <p className="mb-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">النشر على Meta Cloud API</p>
                {metaSessions.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMetaSession}
                      onChange={(e) => setSelectedMetaSession(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {metaSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.metaDisplayPhoneNumber ? `(${s.metaDisplayPhoneNumber})` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => publishToMeta(selectedStatus.template!.id!)}
                      disabled={publishingId === selectedStatus.template!.id}
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {publishingId === selectedStatus.template!.id ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <GlobeAltIcon className="h-3.5 w-3.5" />
                      )}
                      نشر
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">لا توجد جلسة ميتا متصلة</p>
                )}
              </div>
            )}
          </div>
        </div>
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
