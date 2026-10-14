import React, { useState, useEffect } from "react";
import {
  CalendarClock,
  Plus,
  XCircle,
  Clock,
  Repeat,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { tToast } from "../../utils/i18n-toast";
import TelegramSchedulerDialog from "./TelegramSchedulerDialog";

interface UserbotConfig {
  id: string;
  label: string;
  clientPhone?: string;
}

interface DialogEntry {
  id: string;
  name: string;
}

interface ScheduledMessage {
  id: string;
  chatId: string;
  message: string;
  scheduledTime: string;
  recurring: boolean;
  recurringPattern?: "DAILY" | "WEEKLY" | "MONTHLY";
  status: "PENDING" | "SENT" | "FAILED" | "CANCELLED";
}

export default function TelegramScheduler() {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [userbots, setUserbots] = useState<UserbotConfig[]>([]);
  const [dialogs, setDialogs] = useState<DialogEntry[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentTab, setCurrentTab] = useState<string>("ALL");
  const [formData, setFormData] = useState<{
    userbotConfigId: string;
    chatIds: string[];
    message: string;
    scheduledTime: Date;
    recurring: boolean;
    recurringPattern: "DAILY" | "WEEKLY" | "MONTHLY";
  }>({
    userbotConfigId: "",
    chatIds: [],
    message: "",
    scheduledTime: new Date(Date.now() + 3600000),
    recurring: false,
    recurringPattern: "DAILY",
  });

  useEffect(() => {
    fetchUserbots();
    fetchScheduledMessages();
    const timer = setInterval(() => fetchScheduledMessages(false), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchUserbots = async () => {
    try {
      const r = await apiClient.get("/api/v1/telegram/userbots");
      setUserbots(r.data.data || []);
    } catch {
      /* ignore */
    }
  };

  const fetchScheduledMessages = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const r = await apiClient.get("/api/v1/telegram-advanced/scheduled-messages");
      setScheduledMessages(r.data.data || []);
    } catch {
      if (showLoading) setError("فشل تحميل الرسائل المجدولة");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchDialogs = async (id: string) => {
    if (!id) return;
    try {
      const r = await apiClient.get(`/api/v1/userbot/dialogs?userbotConfigId=${id}`);
      setDialogs(r.data.data || []);
    } catch {
      /* ignore */
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "SENT":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "FAILED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "CANCELLED":
        return "bg-muted text-muted-foreground border-border/70";
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }
  };

  const getStatusLabel = (s: string) =>
    ({
      PENDING: "قيد الانتظار",
      SENT: "تم الإرسال",
      FAILED: "فشل الإرسال",
      CANCELLED: "ملغاة",
    }[s] || s);

  const getRecurringLabel = (p?: string) =>
    ({
      DAILY: "يومي",
      WEEKLY: "أسبوعي",
      MONTHLY: "شهري",
    }[p || "DAILY"] || p);

  const handleSchedule = async () => {
    const cleanChatIds = formData.chatIds.filter(Boolean);
    if (!formData.userbotConfigId || cleanChatIds.length === 0 || !formData.message.trim()) {
      setError("يرجى ملء جميع الحقول المطلوبة واختيار المحادثة");
      return;
    }
    if (new Date(formData.scheduledTime) < new Date()) {
      setError("لا يمكن جدولة رسالة في وقت ماضٍ");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/api/v1/telegram-advanced/scheduled-messages", {
        ...formData,
        chatIds: cleanChatIds,
      });
      fetchScheduledMessages();
      setOpenDialog(false);
      tToast.success("TelegramScheduler.msg_5a62");
    } catch {
      setError("فشل جدولة الرسالة");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من إلغاء جدولة هذه الرسالة؟")) return;
    setLoading(true);
    try {
      await apiClient.post(`/api/v1/telegram-advanced/scheduled-messages/${id}/cancel`);
      fetchScheduledMessages();
    } catch {
      setError("فشل إلغاء الرسالة");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewDialog = () => {
    const firstBotId = userbots[0]?.id || "";
    setFormData({
      userbotConfigId: firstBotId,
      chatIds: [],
      message: "",
      scheduledTime: new Date(Date.now() + 3600000),
      recurring: false,
      recurringPattern: "DAILY",
    });
    if (firstBotId) fetchDialogs(firstBotId);
    setOpenDialog(true);
  };

  const pendingCount = scheduledMessages.filter((m) => m.status === "PENDING").length;
  const sentCount = scheduledMessages.filter((m) => m.status === "SENT").length;
  const recurringCount = scheduledMessages.filter((m) => m.recurring).length;

  const filtered = scheduledMessages.filter(
    (m) => currentTab === "ALL" || m.status === currentTab
  );

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${pendingCount > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
              جدولة المهام: {pendingCount > 0 ? `${pendingCount} قيد الانتظار` : "مستقرة"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              ENGINE: telegram.scheduler.v2
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>إجمالي المجدول: <strong className="text-foreground">{scheduledMessages.length}</strong></span>
            <span className="text-border">|</span>
            <span>المرسلة: <strong className="text-emerald-500">{sentCount}</strong></span>
            <span className="text-border">|</span>
            <span>المهام المتكررة: <strong className="text-foreground">{recurringCount}</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
                المجدول الزمني التلقائي
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                cron.delivery
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              جدولة رسائل Telegram
            </h1>
            <p className="text-xs text-muted-foreground">
              برمجة إرسال الرسائل والتنبيهات الدورية في أوقات محددة مسبقاً بشكل آلي
            </p>
          </div>

          <button
            onClick={handleOpenNewDialog}
            disabled={userbots.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            جدولة رسالة جديدة
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Filter Navigation Tabs */}
        <div className="flex gap-2 border-b border-border/70 pb-px text-xs">
          {[
            { v: "ALL", l: "الكل" },
            { v: "PENDING", l: "قيد الانتظار" },
            { v: "SENT", l: "تم الإرسال" },
            { v: "FAILED", l: "فشل الإرسال" },
            { v: "CANCELLED", l: "ملغاة" },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setCurrentTab(t.v)}
              className={`px-3 py-1.5 font-medium border-b-2 transition-colors ${
                currentTab === t.v
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* Scheduled Messages Stream */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono">
              جاري فحص وتحديث قائمة الرسائل المجدولة...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border/70 rounded-lg bg-muted/5">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                لا توجد رسائل مجدولة تطابق هذا الفلتر. اضغط "جدولة رسالة جديدة" لإنشاء مهمة.
              </p>
            </div>
          ) : (
            filtered.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg border border-border/70 bg-card p-4 hover:border-border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-xs font-semibold text-foreground font-mono">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date(msg.scheduledTime).toLocaleString("ar-EG")}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getStatusBadge(
                        msg.status
                      )}`}
                    >
                      {getStatusLabel(msg.status)}
                    </span>
                    {msg.recurring && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border border-border/70 bg-muted/30 text-muted-foreground font-mono">
                        <Repeat className="w-3 h-3" />
                        {getRecurringLabel(msg.recurringPattern)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    معرف المحادثة: <strong className="text-foreground">{msg.chatId}</strong>
                  </p>
                  <p className="text-xs text-foreground bg-muted/10 p-2.5 rounded border border-border/40 font-mono">
                    {msg.message}
                  </p>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  {msg.status === "PENDING" && (
                    <button
                      onClick={() => handleCancel(msg.id)}
                      disabled={loading}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-muted/40 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border border-border/70 transition-colors"
                      title="إلغاء الجدولة"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      إلغاء الإرسال
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Dialog for Scheduling */}
        <TelegramSchedulerDialog
          open={openDialog}
          formData={formData}
          setFormData={setFormData}
          userbots={userbots}
          dialogs={dialogs}
          loading={loading}
          onClose={() => setOpenDialog(false)}
          onSchedule={handleSchedule}
          onFetchDialogs={fetchDialogs}
        />
      </div>
    </div>
  );
}