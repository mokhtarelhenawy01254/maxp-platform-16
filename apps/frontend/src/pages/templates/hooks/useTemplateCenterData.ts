import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { useMediaQuery, DEFAULT_BUTTON_ACTIONS, timeToMinutes } from "../utils";
import { useTemplateFilters } from "./useTemplateFilters";
import { useTemplateCrud } from "./useTemplateCrud";
import { useTemplateMetaOps } from "./useTemplateMetaOps";
import type {
  TemplateScopeConfig,
  StatusWithTemplate,
  DeliveryPreviewItem,
  DefaultSessionInfo,
  TemplateSlot,
  SettingsForm,
  EventRow,
} from "../types";
import type { EditingScheduleState } from "../components/TemplateScheduleTab";

function buildVariableDescriptionsFrom(variables: { var: string; desc: string }[]): Record<string, string> {
  return variables.reduce((acc, v) => {
    const key = v.var.replace(/^\{\{|\}\}$/g, "").replace(/^\{|\}$/g, "").trim();
    acc[key] = v.desc;
    return acc;
  }, {} as Record<string, string>);
}

export function useTemplateCenterData(config: TemplateScopeConfig) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const noun = config.entityLabel ?? { singular: "حالة", plural: "حالات" };
  const [activeTab, setActiveTab] = useState(() => config.tabs[0]?.key || "all");

  const variableDescriptions = useMemo(() => buildVariableDescriptionsFrom(config.variables), [config.variables]);
  const sampleVariables = useMemo(() => config.sampleVariables || {}, [config.sampleVariables]);

  const [statuses, setStatuses] = useState<StatusWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [deliveryPreview, setDeliveryPreview] = useState<Record<string, DeliveryPreviewItem>>({});
  const [defaultSessionInfo, setDefaultSessionInfo] = useState<DefaultSessionInfo | null>(null);

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedPreviews, setExpandedPreviews] = useState<Set<string>>(new Set());
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Schedule state
  const [editingSchedule, setEditingSchedule] = useState<EditingScheduleState | null>(null);
  const [savingSchedule, setSavingSchedule] = useState("");

  // Settings state
  const [settings, setSettings] = useState<SettingsForm | null>(null);
  const [settingsSessions, setSettingsSessions] = useState<{ id: string; name: string; phoneNumber?: string; status: string; provider?: string }[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Test sender state
  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [testing, setTesting] = useState(false);
  const [topCreateEvent, setTopCreateEvent] = useState("");
  const [liveOccasions, setLiveOccasions] = useState<Array<{ id: string; name: string; scheduledAt: string; recurrence: string; templateId: string | null; totalSent: number }>>([]);
  const [linkedOccasionId, setLinkedOccasionId] = useState<string | null>(null);
  const [linkingOccasion, setLinkingOccasion] = useState<{ id: string; name: string } | null>(null);

  const dialogDirtyRef = useRef(false);
  const onDirtyDialog = useCallback(() => {
    dialogDirtyRef.current = true;
  }, []);

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
      console.error("Failed to fetch delivery preview", err);
    }
  }, [config]);

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

  const filters = useTemplateFilters({ statuses, config, activeTab });

  const crud = useTemplateCrud({
    config,
    availableMetaTemplates: [],
    fetchData,
    bindMetaTemplate: async () => {},
    fetchMetaSessions: async () => {},
    onDirtyDialog,
  });

  const metaOps = useTemplateMetaOps({
    config,
    statuses,
    deliveryPreview,
    fetchData,
    fetchDeliveryPreview,
    setDialogOpen: crud.setDialogOpen,
    dialogOpen: crud.dialogOpen,
    persistLocalTemplate: crud.persistLocalTemplate,
    selectedTemplate: crud.selectedTemplate,
    templateFormContent: crud.templateForm.content,
    metaCategory: crud.templateForm.metaCategory,
    onDirtyDialog,
  });

  const handleSave = async () => {
    if (!crud.selectedStatus) return;
    if (crud.dialogSlot === "meta") {
      const templateId = await crud.persistLocalTemplate();
      if (!templateId) return;
      if (crud.templateForm.metaTemplateName) {
        await metaOps.bindMetaTemplate(templateId, crud.templateForm.metaTemplateName, crud.templateForm.metaTemplateLanguage);
      } else {
        crud.setDialogOpen(false);
        fetchData();
      }
      return;
    }
    const templateId = await crud.persistLocalTemplate();
    if (!templateId) return;
    crud.setDialogOpen(false);
    fetchData();
  };

  const uploadHeaderMedia = useCallback(async (file: File) => {
    const res = await metaOps.uploadHeaderMedia(file);
    if (res) {
      crud.setTemplateForm((p) => ({ ...p, headerMediaHandle: res.mediaId, headerMediaName: res.fileName }));
    }
  }, [metaOps, crud]);

  const loadLiveOccasions = useCallback(async () => {
    try {
      const res = await apiClient.get("/customers/whatsapp-notify/occasions");
      setLiveOccasions(res.data?.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (config.scope === "customers") loadLiveOccasions();
  }, [config.scope, loadLiveOccasions]);

  const linkOccasionToTemplate = useCallback(async (occasionId: string, templateId: string | null) => {
    try {
      await apiClient.put(`/customers/whatsapp-notify/occasions/${occasionId}`, { templateId });
      toast.success("تم ربط المناسبة بالقالب");
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
      toast.success(
        next ? `تم تفعيل إشعار: ${row.name}` : `تم إيقاف إشعار: ${row.name}`,
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

  const handleSaveSettings = async () => {
    if (!settings) return;
    const rate = Number(settings.rateLimitPerMinute);
    if (!Number.isFinite(rate) || rate <= 0 || rate > 60) {
      toast.error("الحد الأقصى للرسائل في الدقيقة يجب أن يكون بين 1 و 60");
      return;
    }
    if (settings.quietHoursEnabled) {
      const startMin = timeToMinutes(settings.quietHoursStart || "");
      const endMin = timeToMinutes(settings.quietHoursEnd || "");
      if (startMin == null || endMin == null) {
        toast.error("صيغة ساعات الهدوء غير صحيحة");
        return;
      }
      if (startMin === endMin) {
        toast.error("بداية ونهاية ساعات الهدوء لا يمكن أن تتطابقا");
        return;
      }
    }
    setSettingsSaving(true);
    try {
      const res = await apiClient.put("/whatsapp/notifications/settings", settings);
      if (res.data?.success) {
        toast.success("تم حفظ الإعدادات");
        onDirtyDialog();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل حفظ الإعدادات");
    } finally {
      setSettingsSaving(false);
    }
  };

  const sendTest = async () => {
    if (!config.testSend) return;
    const phone = testPhone.trim().replace(/[\s-]/g, "");
    if (!phone || !testEvent) {
      toast.error("أدخل رقم الهاتف واختر الحدث");
      return;
    }
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

  useEffect(() => {
    document.title = `${config.documentTitle} | MaxP`;
    metaOps.fetchMetaSessions();
    Promise.allSettled([fetchData(), fetchDeliveryPreview(), fetchSettings()]);
  }, [config]);

  useEffect(() => {
    if (crud.dialogOpen === false && dialogDirtyRef.current) {
      fetchDeliveryPreview();
      dialogDirtyRef.current = false;
    }
  }, [crud.dialogOpen, fetchDeliveryPreview]);

  useEffect(() => {
    const activeTabDef = config.tabs.find((tb) => tb.key === activeTab);
    const tabStatuses = activeTabDef?.kind === "list" && activeTabDef.filter
      ? statuses.filter((s) => activeTabDef.filter!(s as EventRow))
      : statuses;
    if (!testEvent && tabStatuses.length > 0) {
      const first = tabStatuses[0];
      if (first?.code) setTestEvent(first.code);
    }
  }, [statuses, testEvent, activeTab, config]);

  const toggleNotify = async (status: StatusWithTemplate) => {
    if (togglingId) return;
    const nextValue = !status.notifyCustomer;
    setTogglingId(status.id);
    const prevStatuses = statuses;
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id !== status.id) return s;
        const updated = { ...s, notifyCustomer: nextValue };
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
      setStatuses(prevStatuses);
      toast.error(err?.response?.data?.message || t("orders.toggleError", "حدث خطأ"));
    } finally {
      setTogglingId(null);
    }
  };

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    const actions = config.features.quickReplyActions ?? DEFAULT_BUTTON_ACTIONS;
    for (const a of actions) map.set(a.value, a.label);
    for (const s of statuses) {
      if (s.code && !map.has(s.code)) map.set(s.code, s.name);
    }
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [statuses, config.features.quickReplyActions]);

  const togglePreview = useCallback((id: string) => {
    setExpandedPreviews((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const anyBoundMeta = statuses.some((s) => s.template?.metaTemplateName || s.metaTemplate?.metaTemplateName);

  const unsubmittedMetaTemplates = useMemo(() => {
    return statuses.filter((s) => {
      const meta = s.metaTemplate || (s.template?.metaTemplateName ? s.template : null);
      if (!meta || !meta.metaTemplateName) return false;
      const status = String(meta.metaTemplateStatus || "").toUpperCase();
      return !status || status === "DRAFT" || status === "NULL";
    });
  }, [statuses]);

  const handleBatchPublish = () => {
    const templateIds = unsubmittedMetaTemplates
      .map((s) => s.metaTemplate?.id || s.template?.id)
      .filter((id): id is string => Boolean(id));
    metaOps.handleBatchPublishToMeta(templateIds);
  };

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
    crud.openCreateDialog(newStatus, slot);
  };

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
    crud.openCreateDialog(newStatus, slot);
  };

  const handleTopCreate = (slot: TemplateSlot) => {
    if (filters.filteredStatuses.length === 0) {
      if (activeTab === "occasions") { openNewOccasion(slot); return; }
      if (activeTab === "products") { openNewProduct(slot); return; }
      toast.error("لا توجد أحداث في هذا التبويب");
      return;
    }
    const code = topCreateEvent || filters.filteredStatuses[0]?.code || "";
    if (code === "__new_occasion__") { openNewOccasion(slot); return; }
    if (code === "__new_product__") { openNewProduct(slot); return; }
    if (!code) {
      toast.error("اختر نوع الحدث أولاً");
      return;
    }
    const status = filters.filteredStatuses.find((s) => s.code === code) || filters.filteredStatuses[0];
    if (status) crud.openCreateDialog(status, slot);
    else toast.error("نوع الحدث غير موجود");
  };

  return {
    t,
    noun,
    activeTab,
    setActiveTab,
    variableDescriptions,
    sampleVariables,
    statuses,
    setStatuses,
    loading,
    loadError,
    fetchData,
    togglingId,
    toggleNotify,
    deliveryPreview,
    defaultSessionInfo,
    collapsedGroups,
    setCollapsedGroups,
    expandedPreviews,
    togglePreview,
    isMobile,
    testPhone,
    setTestPhone,
    testEvent,
    setTestEvent,
    testing,
    sendTest,
    topCreateEvent,
    setTopCreateEvent,
    liveOccasions,
    linkedOccasionId,
    setLinkedOccasionId,
    linkingOccasion,
    setLinkingOccasion,
    linkOccasionToTemplate,
    openNewOccasion,
    openNewProduct,
    statusOptions,
    anyBoundMeta,
    unsubmittedMetaTemplates,
    handleBatchPublish,
    handleTopCreate,
    filters,
    crud,
    metaOps,
    handleSave,
    uploadHeaderMedia,
    editingSchedule,
    setEditingSchedule,
    savingSchedule,
    saveScheduleRow,
    toggleScheduleNotify,
    settings,
    setSettings,
    settingsSessions,
    settingsLoading,
    settingsSaving,
    handleSaveSettings,
  };
}
