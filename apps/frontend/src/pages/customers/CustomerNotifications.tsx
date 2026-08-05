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
  boundToLocalTemplateId?: string | null;
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
      const metaId = metaSessionId || sessions.find((s) => String(s.provider || "").toUpperCase() === "META_CLOUD")?.id;
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
    if (!templateDialog || !templateDialog.template.id) return;
    const metaId = metaSessionId || sessions.find((s) => String(s.provider || "").toUpperCase() === "META_CLOUD")?.id;
    if (!metaId) {
      toast.error("لا توجد جلسة ميتا متصلة — اربط جلسة ميتا أولاً");
      return;
    }
    try {
      await apiClient.post<SimpleResponse>(`/whatsapp-notifications/templates/${templateDialog.template.id}/bind-meta`, {
        sessionId: metaId,
        metaTemplateName: metaName,
        metaTemplateLanguage: "ar",
      });
      toast.success("تم ربط القالب بقالب ميتا");
      setTemplateDialog(null);
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

                      <div className="grid gap-4 md:grid-cols-2">
                        {["BAILEYS", "META_CLOUD"].map((slot) => {
                          const tpl = slotTemplate(eventType, slot);
                          return (
                            <div
                              key={slot}
                              className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 flex flex-col gap-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={CHANNEL_COLORS[slot]}>
                                    {TEMPLATE_SLOT_LABELS[slot]}
                                  </Badge>
                                  {tpl?.isActive === false && (
                                    <Badge variant="secondary">معطّل</Badge>
                                  )}
                                </div>
                                {slot === "META_CLOUD" && tpl?.metaTemplateStatus && (
                                  <Badge
                                    className={
                                      String(tpl.metaTemplateStatus).toUpperCase() === "APPROVED"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-amber-100 text-amber-700"
                                    }
                                  >
                                    {String(tpl.metaTemplateStatus).toUpperCase()}
                                  </Badge>
                                )}
                              </div>

                              {tpl ? (
                                <>
                                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    {tpl.name || "قالب غير مسمّى"}
                                    {tpl.isDefault ? " (افتراضي)" : ""}
                                  </p>
                                  <p className="text-xs text-gray-500 line-clamp-3 whitespace-pre-line">
                                    {tpl.content || "بدون محتوى"}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-gray-400">لا يوجد قالب مخصص — سيُستخدم القالب الافتراضي</p>
                              )}

                              <div className="flex items-center gap-1 flex-wrap mt-auto">
                                <Button size="sm" variant="outline" onClick={() => openTemplateDialog(eventType, slot)} className="gap-1">
                                  <Plus className="h-3.5 w-3.5" />
                                  {tpl ? "تعديل" : "إنشاء"}
                                </Button>
                                {slot === "META_CLOUD" && tpl?.metaTemplateName && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600"
                                    onClick={() => confirmUnbind(tpl)}
                                  >
                                    <Unlink className="h-3.5 w-3.5" />
                                    فك الربط
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
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

              {templateDialog.slot === "META_CLOUD" && templateDialog.template.id && (
                <div className="border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Link2 className="h-4 w-4 text-blue-600" />
                    ربط بقالب ميتا معتمد
                  </div>
                  {templateDialog.metaLoading ? (
                    <p className="text-xs text-gray-400">جارٍ جلب قوالب ميتا...</p>
                  ) : templateDialog.metaOptions && templateDialog.metaOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {templateDialog.metaOptions.map((m) => (
                        <Button
                          key={m.name}
                          size="sm"
                          variant="outline"
                          disabled={!!m.boundToLocalTemplateId && m.boundToLocalTemplateId !== templateDialog.template.id}
                          onClick={() => bindMetaTemplate(m.name)}
                        >
                          {m.name}
                          {m.boundToLocalTemplateId === templateDialog.template.id ? " (مربوط)" : ""}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600">
                      لا توجد قوالب ميتا معتمدة متاحة — تأكد من اتصال جلسة ميتا وإنشاء قالب معتمد
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
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

export default CustomerNotifications;
