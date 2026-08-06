import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { apiClient } from "../../services/apiClient";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  Bell,
  CalendarClock,
  Gift,
  Wallet,
  Star,
  Save,
  RefreshCw,
  TestTube2,
  Link2,
  Unlink,
  Plus,
  FileText,
  Globe,
  CheckCircle2,
  Pencil,
} from "lucide-react";

// ── Shared Types ────────────────────────────────────
type Channel = "AUTO" | "BAILEYS" | "META_CLOUD";

interface TemplateItem {
  id: string | null;
  eventType?: string;
  name: string;
  content: string;
  channel: string;
  isActive: boolean;
  isDefault?: boolean;
  variables?: string | null;
  metaTemplateName?: string | null;
  metaTemplateId?: string | null;
  metaTemplateStatus?: string | null;
}

interface ScheduleRow {
  id: string;
  eventType: string;
  enabled: boolean;
  activeChannel: Channel;
  delayValue: number;
  delayUnit: "HOURS" | "DAYS";
  label: string;
  category: string;
  trigger: string;
  templates: TemplateItem[];
}

interface WhatsAppSession {
  id: string;
  name?: string;
  phoneNumber?: string;
  provider?: string;
  status?: string;
}

interface MetaTemplateOption {
  name: string;
  status: string;
  language?: string;
  category?: string;
  boundToLocalTemplateId?: string | null;
  boundToEventType?: string | null;
  components?: Array<{ type: string; text?: string; example?: string }>;
}

// ── Event groups for the template tabs ─────────────
const EVENT_GROUPS: Record<string, string[]> = {
  loyalty: [
    "LOYALTY_POINTS_AWARDED",
    "LOYALTY_TIER_UPGRADED",
    "LOYALTY_TIER_DOWNGRADED",
    "LOYALTY_POINTS_EXPIRY_WARNING",
    "LOYALTY_POINTS_EXPIRED",
    "LOYALTY_POINTS_REDEEMED",
  ],
  cashback: ["CASHBACK_CREDITED", "CASHBACK_REVERSED"],
  quality: ["CUSTOMER_QUALITY_UPGRADED", "CUSTOMER_QUALITY_DOWNGRADED"],
};

const CHANNEL_LABELS: Record<Channel, string> = {
  AUTO: "تلقائي",
  BAILEYS: "واتساب عادي",
  META_CLOUD: "ميتا (قالب معتمد)",
};

const TEMPLATE_SLOT_LABELS: Record<string, string> = {
  BAILEYS: "قالب واتساب عادي",
  META_CLOUD: "قالب ميتا",
  AUTO: "قالب (تلقائي)",
};

const CHANNEL_COLORS: Record<string, string> = {
  AUTO: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  BAILEYS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  META_CLOUD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const emptyTemplate = (eventType: string, channel: string): TemplateItem => ({
  id: null,
  eventType,
  name: "",
  content: "",
  channel,
  isActive: true,
});

interface ScheduleResponse {
  success: boolean;
  data: ScheduleRow[];
}

interface TemplatesResponse {
  success: boolean;
  templates: TemplateItem[];
}

interface SessionsResponse {
  sessions: WhatsAppSession[];
}

interface SimpleResponse {
  success: boolean;
  error?: string;
  message?: string;
}

const CustomerNotifications: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [allTemplates, setAllTemplates] = useState<TemplateItem[]>([]);
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [metaSessionId, setMetaSessionId] = useState("");

  const [editing, setEditing] = useState<{
    row: ScheduleRow;
    enabled: boolean;
    activeChannel: Channel;
    delayValue: number;
    delayUnit: "HOURS" | "DAYS";
  } | null>(null);
  const [savingEvent, setSavingEvent] = useState("");

  const [templateDialog, setTemplateDialog] = useState<{
    eventType: string;
    slot: string;
    template: TemplateItem;
    metaOptions?: MetaTemplateOption[];
    metaLoading?: boolean;
  } | null>(null);

  const [testPhone, setTestPhone] = useState("");
  const [testEvent, setTestEvent] = useState("");
  const [testing, setTesting] = useState(false);

  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, boolean>>({});

  const togglePreview = useCallback((key: string) => {
    setExpandedPreviews((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // ── Meta flows state ──────────────────────────────
  const [selectedMetaSession, setSelectedMetaSession] = useState("");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resubmittingMeta, setResubmittingMeta] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [showVariables, setShowVariables] = useState(false);

  const metaSessions = useMemo(
    () => sessions.filter((s) => String(s.provider || "").toUpperCase() === "META_CLOUD"),
    [sessions],
  );

  const eventsByType = useMemo(() => {
    const map: Record<string, ScheduleRow | undefined> = {};
    for (const s of schedules) map[s.eventType] = s;
    return map;
  }, [schedules]);

  const templatesForEvent = useCallback((eventType: string): TemplateItem[] => {
    return allTemplates.filter((t) => t.eventType === eventType);
  }, [allTemplates]);

  const slotTemplate = useCallback(
    (eventType: string, slot: string): TemplateItem | undefined => {
      const list = templatesForEvent(eventType);
      if (slot === "META_CLOUD") {
        return list.find((t) => (t.channel || "").toUpperCase() === "META_CLOUD");
      }
      return (
        list.find((t) => (t.channel || "").toUpperCase() === "BAILEYS") ||
        list.find((t) => (t.channel || "").toUpperCase() === "AUTO") ||
        list.find((t) => !t.channel) ||
        undefined
      );
    },
    [templatesForEvent],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleRes, templatesRes, sessionsRes] = await Promise.all([
        apiClient.get<ScheduleResponse>("/hr/customer-loyalty/notifications/schedule"),
        apiClient.get<TemplatesResponse>("/whatsapp-notifications/templates"),
        apiClient.get<SessionsResponse>("/whatsapp/sessions").catch(() => ({ data: { sessions: [] } })),
      ]);

      const rows: ScheduleRow[] = scheduleRes.data?.data || [];
      setSchedules(rows);

      const all: TemplateItem[] = (templatesRes.data?.templates || []).filter(
        (t: TemplateItem) => !!t.eventType && Object.values(EVENT_GROUPS).flat().includes(t.eventType),
      );
      setAllTemplates(all);

      const sessionsList: WhatsAppSession[] = sessionsRes.data?.sessions || [];
      setSessions(sessionsList);
      const meta = sessionsList.find((s) => String(s.provider || "").toUpperCase() === "META_CLOUD");
      setMetaSessionId(meta?.id || "");
    } catch (error) {
      console.error("Error loading customer notifications:", error);
      toast.error("تعذر تحميل بيانات إشعارات العملاء");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveSchedule = async (row: ScheduleRow) => {
    if (!editing) return;
    setSavingEvent(row.eventType);
    try {
      const res = await apiClient.put<SimpleResponse>("/hr/customer-loyalty/notifications/schedule", {
        eventType: row.eventType,
        enabled: editing.enabled,
        activeChannel: editing.activeChannel,
        delayValue: editing.delayValue,
        delayUnit: editing.delayUnit,
      });
      if (res.data?.success) {
        toast.success("تم حفظ الجدول بنجاح");
        setEditing(null);
        await fetchAll();
      } else {
        toast.error(res.data?.error || "فشل الحفظ");
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل الحفظ");
    } finally {
      setSavingEvent("");
    }
  };

  const openTemplateDialog = async (eventType: string, slot: string) => {
    const existing = slotTemplate(eventType, slot) || emptyTemplate(eventType, slot);
    setTemplateDialog({ eventType, slot, template: { ...existing } });

    // جلب قوالب ميتا المتاحة للربط عند فتح قالب ميتا
    if (slot === "META_CLOUD") {
      const metaId = selectedMetaSession || metaSessionId || sessions.find((s) => String(s.provider || "").toUpperCase() === "META_CLOUD")?.id;
      if (metaId && !selectedMetaSession) setSelectedMetaSession(metaId);
      if (metaId) {
        try {
          setTemplateDialog((d) => (d ? { ...d, metaLoading: true } : d));
          const res = await apiClient.get<{ success: boolean; templates: MetaTemplateOption[] }>(
            "/whatsapp-notifications/templates/meta-available",
            { params: { sessionId: metaId } },
          );
          setTemplateDialog((d) =>
            d && d.eventType === eventType
              ? { ...d, metaOptions: res.data?.templates || [], metaLoading: false }
              : d,
          );
        } catch (e) {
          setTemplateDialog((d) =>
            d && d.eventType === eventType ? { ...d, metaOptions: [], metaLoading: false } : d,
          );
        }
      }
    }
  };

  // حفظ القالب المحلي الحالي في الديالوج وإرجاع id
  const persistLocalTemplate = async (): Promise<string | null> => {
    if (!templateDialog) return null;
    const { eventType, slot, template } = templateDialog;
    if (!template.content.trim()) {
      toast.error("محتوى القالب مطلوب");
      return null;
    }

    const payload = {
      name: template.name.trim() || (slot === "META_CLOUD" ? "قالب ميتا" : "قالب واتساب"),
      category: "MARKETING",
      eventType,
      content: template.content,
      channel: slot,
      variables: extractVariables(template.content),
      isActive: template.isActive,
    };

    try {
      if (template.id) {
        await apiClient.put<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`, payload);
        return template.id;
      }
      const res = await apiClient.post<{ success: boolean; template?: { id?: string } }>(
        "/whatsapp-notifications/templates",
        payload,
      );
      const newId = res.data?.template?.id;
      if (!newId) {
        toast.error("فشل إنشاء القالب");
        return null;
      }
      setTemplateDialog((d) => (d ? { ...d, template: { ...d.template, id: newId } } : d));
      return newId;
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل حفظ القالب");
      return null;
    }
  };

  const publishToMeta = async (templateId: string) => {
    const metaId = selectedMetaSession || metaSessionId || metaSessions[0]?.id;
    if (!metaId) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    setPublishingId(templateId);
    try {
      await apiClient.post<SimpleResponse>(`/whatsapp-notifications/templates/${templateId}/publish`, {
        sessionId: metaId,
      });
      toast.success("تم إرسال القالب إلى ميتا للمراجعة");
      // إعادة جلب القوالب المتاحة لتحديث حالة الربط
      await openTemplateDialog(templateDialog?.eventType || "", "META_CLOUD");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل النشر على ميتا");
    } finally {
      setPublishingId(null);
    }
  };

  const createMetaTemplate = async () => {
    if (!templateDialog) return;
    if (!selectedMetaSession && !metaSessionId) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    if (!templateDialog.template.content.trim()) {
      toast.error("محتوى القالب مطلوب");
      return;
    }
    const templateId = await persistLocalTemplate();
    if (!templateId) return;
    await publishToMeta(templateId);
  };

  const handleResubmitMeta = async () => {
    if (!templateDialog?.template.id) return;
    const metaId = selectedMetaSession || metaSessionId;
    if (!metaId) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    const saved = await persistLocalTemplate();
    if (!saved) return;
    setResubmittingMeta(true);
    try {
      const res = await apiClient.post<{ success?: boolean; applied?: boolean; message?: string; metaTemplateName?: string; applyReason?: string }>(
        `/whatsapp-notifications/templates/${saved}/resubmit-meta`,
        { sessionId: metaId },
      );
      const data = res.data;
      if (data?.applied && data?.success) {
        toast.success(data.message || "تم تحديث القالب على ميتا — الحالة قيد المراجعة");
      } else if (data?.success && data?.metaTemplateName) {
        toast.success(data.message || "تم تحديث القالب على ميتا — سيتم تفعيله بعد الموافقة");
      } else if (data?.applied === false) {
        toast.warning(data.applyReason || "ميتا لسه شايلة المحتوى القديم — جرب تاني بعد شوية");
      } else {
        toast.warning(data?.applyReason || "تم إرسال القالب للمراجعة مرة أخرى");
      }
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل تحديث القالب على ميتا");
    } finally {
      setResubmittingMeta(false);
    }
  };

  const syncMetaStatuses = async () => {
    const metaId = selectedMetaSession || metaSessionId;
    if (!metaId) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    setSyncingStatus(true);
    try {
      const res = await apiClient.post<SimpleResponse>("/whatsapp-notifications/templates/sync-status", {
        sessionId: metaId,
      });
      toast.success(res.data?.success ? "تمت مزامنة حالات قوالب ميتا" : "تعذرت المزامنة");
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل مزامنة حالات ميتا");
    } finally {
      setSyncingStatus(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateDialog) return;
    const { eventType, slot, template } = templateDialog;
    if (!template.name.trim() || !template.content.trim()) {
      toast.error("اسم القالب والمحتوى مطلوبان");
      return;
    }

    const payload = {
      name: template.name.trim(),
      category: "MARKETING",
      eventType,
      content: template.content,
      channel: slot,
      variables: extractVariables(template.content),
      isActive: template.isActive,
    };

    try {
      if (template.id) {
        await apiClient.put<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`, payload);
        toast.success("تم تحديث القالب بنجاح");
      } else {
        await apiClient.post<SimpleResponse>("/whatsapp-notifications/templates", payload);
        toast.success("تم إنشاء القالب بنجاح");
      }
      setTemplateDialog(null);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل حفظ القالب");
    }
  };

  const deleteTemplate = async (template: TemplateItem) => {
    if (!template.id) return;
    if (!window.confirm("هل تريد حذف هذا القالب؟")) return;
    try {
      await apiClient.delete<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`);
      toast.success("تم حذف القالب");
      setTemplateDialog(null);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل حذف القالب");
    }
  };

  const bindMetaTemplate = async (metaName: string) => {
    if (!templateDialog) return;
    const metaId = selectedMetaSession || metaSessionId || metaSessions[0]?.id;
    if (!metaId) {
      toast.error("اختر جلسة ميتا أولاً");
      return;
    }
    // لو القالب المحلي لسه مفيش id، نحفظه الأول
    let templateId = templateDialog.template.id;
    if (!templateId) {
      templateId = await persistLocalTemplate();
      if (!templateId) return;
    }
    try {
      await apiClient.post<SimpleResponse>(`/whatsapp-notifications/templates/${templateId}/bind-meta`, {
        sessionId: metaId,
        metaTemplateName: metaName,
        metaTemplateLanguage: "ar",
      });
      toast.success("تم ربط القالب بقالب ميتا");
      setTemplateDialog((d) =>
        d ? { ...d, template: { ...d.template, id: templateId, metaTemplateName: metaName } } : d,
      );
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل ربط قالب ميتا");
    }
  };

  const confirmUnbind = async (template: TemplateItem) => {
    if (!template.id) return;
    if (!window.confirm("هل تريد فك ربط هذا القالب بقالب ميتا؟")) return;
    try {
      await apiClient.put<SimpleResponse>(`/whatsapp-notifications/templates/${template.id}`, {
        metaTemplateName: null,
        metaTemplateId: null,
        metaTemplateStatus: null,
      });
      toast.success("تم فك ربط القالب");
      setTemplateDialog(null);
      await fetchAll();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "فشل فك الربط");
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim() || !testEvent) {
      toast.error("أدخل رقم الهاتف واختر الحدث");
      return;
    }
    setTesting(true);
    try {
      const res = await apiClient.post<SimpleResponse>("/whatsapp-notifications/test", {
        phone: testPhone.trim(),
        eventType: testEvent,
      });
      if (res.data?.success) toast.success("تم إرسال الإشعار التجريبي");
      else toast.error(res.data?.message || res.data?.error || "فشل الإرسال");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.response?.data?.error || "فشل الإرسال التجريبي");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const eventOptions = schedules.map((s) => (
    <option key={s.eventType} value={s.eventType}>
      {s.label}
    </option>
  ));

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            إشعارات العملاء
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            إدارة إشعارات الولاء والكاش باك وتقسيم العملاء — القوالب ومواعيد الإرسال
          </p>
        </div>
        <Button variant="outline" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 ml-1" />
          تحديث
        </Button>
      </div>

      {/* ── Test sender strip ──────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] items-end">
            <div>
              <Label className="text-xs text-gray-500">إرسال تجريبي (رقم الهاتف)</Label>
              <Input
                dir="ltr"
                className="mt-1"
                placeholder="01000000000"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">الحدث</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                value={testEvent}
                onChange={(e) => setTestEvent(e.target.value)}
              >
                <option value="">اختر الحدث...</option>
                {eventOptions}
              </select>
            </div>
            <Button onClick={sendTest} disabled={testing} className="gap-1">
              <TestTube2 className="h-4 w-4" />
              {testing ? "جارٍ الإرسال..." : "إرسال تجريبي"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="schedule">
        <TabsList className="flex-wrap">
          <TabsTrigger value="schedule" className="gap-1">
            <CalendarClock className="h-4 w-4" /> جدول الإشعارات
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="gap-1">
            <Gift className="h-4 w-4" /> قوالب الولاء
          </TabsTrigger>
          <TabsTrigger value="cashback" className="gap-1">
            <Wallet className="h-4 w-4" /> قوالب الكاش باك
          </TabsTrigger>
          <TabsTrigger value="quality" className="gap-1">
            <Star className="h-4 w-4" /> قوالب التقسيم
          </TabsTrigger>
        </TabsList>

        {/* ── Schedule tab ─────────────────────── */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جدول الإشعارات</CardTitle>
              <CardDescription>
                حدد لكل حدث: هل يتبعت، القناة النشطة، ومتى يتبعت (بعد قد إيه)
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    <th className="py-3 px-2 text-right font-medium">الحدث</th>
                    <th className="py-3 px-2 text-right font-medium">يتبعت امتي</th>
                    <th className="py-3 px-2 text-right font-medium">بعد قد ايه</th>
                    <th className="py-3 px-2 text-right font-medium">القناة النشطة</th>
                    <th className="py-3 px-2 text-right font-medium">القوالب</th>
                    <th className="py-3 px-2 text-right font-medium">مفعّل</th>
                    <th className="py-3 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((row) => {
                    const isEditing = editing?.row.eventType === row.eventType;
                    const normalTpl = slotTemplate(row.eventType, "BAILEYS");
                    const metaTpl = slotTemplate(row.eventType, "META_CLOUD");
                    return (
                      <tr
                        key={row.eventType}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                      >
                        <td className="py-3 px-2">
                          <p className="font-medium text-gray-900 dark:text-white">{row.label}</p>
                          <p className="text-xs text-gray-400" dir="ltr">
                            {row.eventType}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">{row.trigger}</td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                className="w-20"
                                value={editing!.delayValue}
                                onChange={(e) =>
                                  setEditing((d) => (d ? { ...d, delayValue: Number(e.target.value) || 0 } : d))
                                }
                              />
                              <Select
                                value={editing!.delayUnit}
                                onValueChange={(v) =>
                                  setEditing((d) => (d ? { ...d, delayUnit: v as "HOURS" | "DAYS" } : d))
                                }
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="HOURS">ساعة</SelectItem>
                                  <SelectItem value="DAYS">يوم</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : row.delayValue > 0 ? (
                            <span className="text-gray-700 dark:text-gray-200">
                              {row.delayValue} {row.delayUnit === "DAYS" ? "يوم" : "ساعة"}
                            </span>
                          ) : (
                            <span className="text-gray-400">فوري</span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <Select
                              value={editing!.activeChannel}
                              onValueChange={(v) =>
                                setEditing((d) => (d ? { ...d, activeChannel: v as Channel } : d))
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AUTO">تلقائي (ميتا ← عادي)</SelectItem>
                                <SelectItem value="BAILEYS">واتساب عادي</SelectItem>
                                <SelectItem value="META_CLOUD">ميتا فقط</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={CHANNEL_COLORS[row.activeChannel]}>
                              {CHANNEL_LABELS[row.activeChannel]}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline">
                              عادي: {normalTpl ? (normalTpl.name || "افتراضي") : "غير محدد"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={metaTpl?.metaTemplateStatus === "APPROVED" ? "border-blue-400 text-blue-600" : ""}
                            >
                              ميتا: {metaTpl ? metaTpl.name || "غير مسمّى" : "غير محدد"}
                              {metaTpl?.metaTemplateStatus === "APPROVED" ? " (معتمد)" : ""}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Switch
                            checked={isEditing ? editing!.enabled : row.enabled}
                            onCheckedChange={(v) => {
                              if (isEditing) {
                                setEditing((d) => (d ? { ...d, enabled: v } : d));
                              } else {
                                setEditing({
                                  row,
                                  enabled: v,
                                  activeChannel: row.activeChannel,
                                  delayValue: row.delayValue,
                                  delayUnit: row.delayUnit,
                                });
                              }
                            }}
                          />
                        </td>
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => saveSchedule(row)}
                                disabled={savingEvent === row.eventType}
                                className="gap-1"
                              >
                                <Save className="h-3.5 w-3.5" />
                                حفظ
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                                إلغاء
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditing({
                                  row,
                                  enabled: row.enabled,
                                  activeChannel: row.activeChannel,
                                  delayValue: row.delayValue,
                                  delayUnit: row.delayUnit,
                                })
                              }
                            >
                              تعديل
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Template tabs ─────────────────────── */}
        {(["loyalty", "cashback", "quality"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle>
                    {tab === "loyalty"
                      ? "قوالب إشعارات الولاء"
                      : tab === "cashback"
                        ? "قوالب إشعارات الكاش باك"
                        : "قوالب إشعارات التقسيم"}
                  </CardTitle>
                  <CardDescription>
                    لكل حدث قالبان (واتساب عادي + ميتا) — عدّل القالبين وحدد الفعّال من جدول الإشعارات
                  </CardDescription>
                </div>
                {sessions.some((s) => String(s.provider || "").toUpperCase() === "META_CLOUD") && (
                  <div className="w-64">
                    <Label className="text-xs text-gray-500">جلسة ميتا للربط</Label>
                    <Select value={metaSessionId} onValueChange={(v) => v && setMetaSessionId(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر جلسة ميتا" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions
                          .filter((s) => String(s.provider || "").toUpperCase() === "META_CLOUD")
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name || s.phoneNumber || s.id}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {(EVENT_GROUPS[tab] || []).map((eventType) => {
                  const row = eventsByType[eventType];
                  return (
                    <div key={eventType} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {row?.label || eventType}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {row?.trigger} — <span className="font-mono" dir="ltr">{eventType}</span>
                          </p>
                        </div>
                        {row && (
                          <Badge className={CHANNEL_COLORS[row.activeChannel]}>
                            القناة: {CHANNEL_LABELS[row.activeChannel]}
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <TemplateSlotCard
                          slot="BAILEYS"
                          eventType={eventType}
                          template={slotTemplate(eventType, "BAILEYS")}
                          isPreviewExpanded={!!expandedPreviews[`BAILEYS-${eventType}`]}
                          onTogglePreview={() => togglePreview(`BAILEYS-${eventType}`)}
                          onOpen={() => openTemplateDialog(eventType, "BAILEYS")}
                        />
                        <TemplateSlotCard
                          slot="META_CLOUD"
                          eventType={eventType}
                          template={slotTemplate(eventType, "META_CLOUD")}
                          isPreviewExpanded={!!expandedPreviews[`META_CLOUD-${eventType}`]}
                          onTogglePreview={() => togglePreview(`META_CLOUD-${eventType}`)}
                          onOpen={() => openTemplateDialog(eventType, "META_CLOUD")}
                          onUnbind={(tpl) => confirmUnbind(tpl)}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Template editor dialog ───────────────── */}
      <Dialog
        open={!!templateDialog}
        onOpenChange={(open) => !open && setTemplateDialog(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {templateDialog ? TEMPLATE_SLOT_LABELS[templateDialog.slot] : ""} —{" "}
              {templateDialog && eventsByType[templateDialog.eventType]?.label}
            </DialogTitle>
            <DialogDescription>
              {templateDialog && (
                <span className="font-mono" dir="ltr">
                  {templateDialog.eventType}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {templateDialog && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>اسم القالب</Label>
                <Input
                  value={templateDialog.template.name}
                  onChange={(e) =>
                    setTemplateDialog((d) =>
                      d ? { ...d, template: { ...d.template, name: e.target.value } } : d,
                    )
                  }
                />
              </div>

              <div className="space-y-1">
                <Label>محتوى القالب</Label>
                <Textarea
                  rows={6}
                  className="font-mono text-sm"
                  value={templateDialog.template.content}
                  onChange={(e) =>
                    setTemplateDialog((d) =>
                      d ? { ...d, template: { ...d.template, content: e.target.value } } : d,
                    )
                  }
                />
                <p className="text-xs text-gray-400">
                  المتغيرات: <code>{extractVariables(templateDialog.template.content).map((v) => `{${v}}`).join(" ")}</code>
                </p>
                <button
                  type="button"
                  onClick={() => setShowVariables(!showVariables)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700"
                >
                  {showVariables ? "إخفاء المتغيرات المتاحة" : "عرض كل المتغيرات المتاحة"}
                </button>
                {showVariables && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-gray-50 text-right dark:bg-gray-800">
                          <th className="px-2 py-1 font-medium text-gray-500">المتغير</th>
                          <th className="px-2 py-1 font-medium text-gray-500">الوصف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {Object.entries(VARIABLE_DESCRIPTIONS).map(([v, desc]) => (
                          <tr key={v} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="whitespace-nowrap px-2 py-1 font-mono text-indigo-600 dark:text-indigo-400">
                              {`{${v}}`}
                            </td>
                            <td className="px-2 py-1 text-gray-600 dark:text-gray-400">{desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>قالب فعال</Label>
                  <Switch
                    checked={templateDialog.template.isActive}
                    onCheckedChange={(v) =>
                      setTemplateDialog((d) =>
                        d ? { ...d, template: { ...d.template, isActive: v } } : d,
                      )
                    }
                  />
                </div>
                {templateDialog.template.id && (
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteTemplate(templateDialog.template)}>
                    حذف
                  </Button>
                )}
              </div>

              {templateDialog.slot === "META_CLOUD" && (
                <div className="space-y-3">
                  {/* توضيح سلوك القناة */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-[11px] leading-relaxed text-blue-800 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-300">
                    ☁️ <strong>قالب ميتا المعتمد (APPROVED) هو اللي بيتبعت للعميل</strong> عندما تكون الجلسة
                    الأساسية Meta Cloud والقناة النشطة في الجدول "ميتا فقط" أو "تلقائي".
                    النص اللي بتكتبه هنا هو المرجع للربط/النشر على ميتا.
                  </div>

                  {/* جلسة ميتا */}
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">جلسة ميتا للربط/النشر</Label>
                    <Select
                      value={selectedMetaSession || metaSessionId}
                      onValueChange={(v) => v && setSelectedMetaSession(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر جلسة ميتا" />
                      </SelectTrigger>
                      <SelectContent>
                        {metaSessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name || s.phoneNumber || s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* مزامنة الحالات مع ميتا */}
                  {templateDialog.template.metaTemplateName && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-600"
                      disabled={syncingStatus}
                      onClick={syncMetaStatuses}
                    >
                      {syncingStatus ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      مزامنة حالة القالب مع ميتا
                    </Button>
                  )}

                  {/* إنشاء قالب ميتا جديد */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    disabled={!!publishingId}
                    onClick={createMetaTemplate}
                  >
                    {publishingId ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {publishingId ? "جارٍ النشر على ميتا..." : "إنشاء قالب ميتا جديد ونشره"}
                  </Button>

                  {/* ربط بقالب ميتا معتمد موجود */}
                  <div className="border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Link2 className="h-4 w-4 text-blue-600" />
                      ربط بقالب ميتا معتمد موجود
                    </div>
                    {templateDialog.metaLoading ? (
                      <p className="text-xs text-gray-400">جارٍ جلب قوالب ميتا...</p>
                    ) : templateDialog.metaOptions && templateDialog.metaOptions.length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          value={templateDialog.template.metaTemplateName || ""}
                          onChange={(e) => {
                            const opt = templateDialog.metaOptions?.find((m) => m.name === e.target.value);
                            setTemplateDialog((d) =>
                              d
                                ? {
                                    ...d,
                                    template: {
                                      ...d.template,
                                      metaTemplateName: e.target.value || null,
                                      metaTemplateId: opt?.name || null,
                                    },
                                  }
                                : d,
                            );
                          }}
                        >
                          <option value="">اختر قالب ميتا...</option>
                          {templateDialog.metaOptions
                            .filter(
                              (m) =>
                                !m.boundToLocalTemplateId ||
                                m.boundToLocalTemplateId === templateDialog.template.id,
                            )
                            .map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name} {m.category ? `(${m.category})` : ""}
                                {m.boundToEventType ? ` - مربوط بـ ${m.boundToEventType}` : ""}
                              </option>
                            ))}
                        </select>
                        {templateDialog.template.metaTemplateName && (
                          <Button size="sm" className="w-full" onClick={() => bindMetaTemplate(templateDialog.template.metaTemplateName!)}>
                            <Link2 className="h-3.5 w-3.5" />
                            حفظ الربط
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600">
                        لا توجد قوالب ميتا معتمدة متاحة — أنشئ قالباً من الزر أعلاه أو تأكد من اتصال جلسة ميتا
                      </p>
                    )}
                  </div>

                  {/* تطابق المتغيرات: {{1}} ← المتغير المحلي */}
                  <VariableMappingTable template={templateDialog.template} metaOptions={templateDialog.metaOptions || []} />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {templateDialog?.slot === "META_CLOUD" && templateDialog.template.metaTemplateName && (
              <Button
                variant="outline"
                className="text-blue-700 border-blue-300"
                disabled={resubmittingMeta}
                onClick={handleResubmitMeta}
              >
                {resubmittingMeta ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                إرسال للمراجعة من جديد
              </Button>
            )}
            <Button variant="outline" onClick={() => setTemplateDialog(null)}>
              إلغاء
            </Button>
            <Button onClick={saveTemplate} className="gap-1">
              <Save className="h-4 w-4" />
              حفظ القالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const extractVariables = (content: string): string[] => {
  const matches = content.match(/\{(\w+)\}/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1, -1))));
};

// قيم نموذجية لمعاينة المتغيرات في كروت القوالب
const PREVIEW_VARIABLES: Record<string, string> = {
  customerName: "عميلنا الكريم",
  points: "50",
  currentPoints: "120",
  reason: "طلب #10025",
  tierName: "ذهبي",
  expiryDate: "2026-09-01",
  programName: "برنامج الولاء",
  cashAmount: "25.00",
  currency: "ج.م",
  orderNumber: "10025",
  balance: "75.00",
  qualityTier: "VIP",
  score: "85",
};

function resolveVariablesForPreview(content: string): string {
  return content.replace(/\{(\w+)\}/g, (_, name) => PREVIEW_VARIABLES[name] || name);
}

// استخراج أسماء المتغيرات المحلية بالترتيب الذي تظهر به في المحتوى
// يُستخدم لربط كل متغير محلي {customerName} برقم ميتا {{1}}، {{2}}... بصرياً
function extractLocalVariableOrder(content: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  const re = /\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}/g;
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

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  customerName: "اسم العميل",
  points: "عدد النقاط المكتسبة/المستبدلة",
  currentPoints: "رصيد النقاط الحالي",
  reason: "سبب الإضافة/الخصم",
  tierName: "اسم المستوى الجديد",
  expiryDate: "تاريخ انتهاء الصلاحية",
  programName: "اسم برنامج الولاء",
  cashAmount: "قيمة الكاش باك/الاستبدال",
  currency: "العملة (ج.م)",
  orderNumber: "رقم الطلب",
  balance: "رصيد المحفظة الحالي",
  qualityTier: "تصنيف الجودة (VIP/عالي/متوسط/منخفض)",
  score: "درجة الجودة من 100",
};

// ── Template slot card (نفس تقسيمة صفحة حالات الطلبات) ──
interface TemplateSlotCardProps {
  slot: "BAILEYS" | "META_CLOUD";
  eventType: string;
  template: TemplateItem | undefined;
  isPreviewExpanded: boolean;
  onTogglePreview: () => void;
  onOpen: () => void;
  onUnbind?: (template: TemplateItem) => void;
}

function TemplateSlotCard({
  slot,
  eventType,
  template,
  isPreviewExpanded,
  onTogglePreview,
  onOpen,
  onUnbind,
}: TemplateSlotCardProps) {
  const isMeta = slot === "META_CLOUD";
  const bound = !!template?.metaTemplateName;
  const metaStatus = String(template?.metaTemplateStatus || "").toUpperCase();
  const hasContent = !!template?.content;

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
      ? template.isActive === false
        ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
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
      ? template.isActive === false
        ? "⏸ متوقف"
        : "يوجد قالب"
      : "بدون قالب";

  return (
    <div data-testid={`${slot}-slot-${eventType}`} className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${colors.badge}`}>
          {isMeta ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
          {isMeta ? "قالب ميتا" : "واتساب عادي"}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge}`}>
          {isMeta && bound ? <CheckCircle2 className="h-3 w-3" /> : null}
          {statusLabel}
        </span>
      </div>

      {isMeta && bound && template?.metaTemplateName && (
        <p className="mt-1.5 truncate font-mono text-[11px] text-blue-700 dark:text-blue-300" dir="ltr">
          {template.metaTemplateName}
        </p>
      )}

      <div className="mt-1.5 min-h-[2.75rem]">
        {template ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {template.name || "قالب غير مسمّى"}
              {template.isDefault ? " (افتراضي)" : ""}
            </p>
            {hasContent && (
              <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-400">
                {resolveVariablesForPreview(template.content)}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isMeta ? "لا يوجد قالب ميتا لهذا الحدث" : "لا يوجد قالب واتساب عادي — استخدم زر الإنشاء"}
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {hasContent && (
          <button
            onClick={onTogglePreview}
            className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
          >
            <FileText className="h-3 w-3" />
            {isPreviewExpanded ? "إخفاء" : "معاينة"}
          </button>
        )}
        <button
          onClick={onOpen}
          className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${colors.accent}`}
        >
          {template ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {template ? (isMeta ? "تعديل الربط" : "تعديل") : "إنشاء"}
        </button>
        {isMeta && bound && onUnbind && template && (
          <button
            onClick={() => onUnbind(template)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Unlink className="h-3 w-3" />
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
            {resolveVariablesForPreview(template!.content)}
          </p>
        </div>
      )}
    </div>
  );
}

// جدول تطابق المتغيرات: {{1}} في قالب ميتا ← المتغير المحلي في القالب
const META_BODY_CHAR_LIMIT = 1024;

function VariableMappingTable({
  template,
  metaOptions,
}: {
  template: TemplateItem;
  metaOptions: MetaTemplateOption[];
}) {
  const selectedMeta = metaOptions.find((m) => m.name === template.metaTemplateName);
  const metaBody = selectedMeta?.components?.find((c) => c.type === "BODY")?.text || "";
  const localVars = extractLocalVariableOrder(template.content);
  const metaNums = [...metaBody.matchAll(/\{\{\s*(\d+)\s*\}\}/g)].map((m) => m[1]);
  const isOverLimit = template.content.length > META_BODY_CHAR_LIMIT;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
      {/* عداد حروف ميتا */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          حد حروف ميتا
        </span>
        <span
          className={`text-[10px] font-medium tabular-nums ${
            isOverLimit ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {template.content.length} / {META_BODY_CHAR_LIMIT}
        </span>
      </div>
      {isOverLimit && (
        <p className="text-[11px] text-red-600 dark:text-red-400" role="alert">
          ⚠️ النص أطول من حد ميتا ({META_BODY_CHAR_LIMIT} حرف) — القالب هيترفض عند النشر على Meta Cloud API.
        </p>
      )}

      {selectedMeta ? (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            محتوى قالب ميتا المحدد ({selectedMeta.name})
          </p>
          <p className="whitespace-pre-wrap break-words text-xs text-slate-700 dark:text-slate-300">{metaBody}</p>

          {metaNums.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                تطابق المتغيرات
              </p>
              {metaNums.map((n, i) => {
                const local = localVars[i];
                const matched = !!local;
                const numLabel = n ?? String(i + 1);
                return (
                  <div key={`${numLabel}-${i}`} className="flex items-center gap-2 text-[11px]">
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {`{{${numLabel}}}`}
                    </span>
                    <span className="text-slate-400">←</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono ${
                        matched
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {local ? `{${local}}` : "—"}
                    </span>
                    {local && (
                      <span className="text-slate-500">{VARIABLE_DESCRIPTIONS[local] || ""}</span>
                    )}
                    {!matched && (
                      <span className="text-red-500">
                        ناقص — رتب المتغيرات في المحتوى حسب ترتيب {`{{${numLabel}}}`}
                      </span>
                    )}
                  </div>
                );
              })}
              {localVars.length > metaNums.length && (
                <p className="text-[11px] text-amber-600">
                  ⚠️ عندك متغيرات محلية زيادة ({localVars.slice(metaNums.length).map((v) => `{${v}}`).join(", ")}) —
                  ميتا مش هتعرضهم (المتغيرات بتترتب بالترتيب بس).
                </p>
              )}
              {localVars.length < metaNums.length && (
                <p className="text-[11px] text-red-600">
                  ❌ عدد المتغيرات أقل من المطلوب — أضف {metaNums.length - localVars.length} متغير إضافي للمحتوى قبل الحفظ.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              قالب ميتا ده من غير متغيرات — المتناسق تماماً. لو عايز متغيرات، اكتبها في المحتوى المحلي
              (زي <code>{`{customerName}`}</code>) وسيب ميتا يبنيها بترتيب ظهورها.
            </p>
          )}
        </>
      ) : template.metaTemplateName && metaOptions.length === 0 ? (
        <p className="text-xs text-slate-500">القالب مربوط بقالب ميتا — حدّث القوالب المتاحة لمشاهدة التطابق.</p>
      ) : (
        <p className="text-xs text-slate-500">
          💡 <strong>إزاي تعرف متغيرات قالب ميتا؟</strong> ميتا بتستخدم أرقام ({`{{1}}, {{2}}`}...) مش أسماء.
          الترتيب بيتحدد من <strong>ترتيب ظهور المتغيرات في محتوى القالب المحلي</strong>: أول{" "}
          <code>{`{customerName}`}</code> = {`{{1}}`}، التاني = {`{{2}}`} وهكذا. اختار قالب ميتا من فوق وشوف التطابق هنا.
        </p>
      )}
    </div>
  );
}

export default CustomerNotifications;
