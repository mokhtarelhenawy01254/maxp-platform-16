import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  XCircle,
  Trash2,
  Users,
  Send,
  AlertTriangle,
  Play,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { tToast } from "../../utils/i18n-toast";

interface CampaignItem {
  id: string;
  name?: string;
  title?: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "SENT" | "FAILED" | "CANCELLED" | "DRAFT";
  targetCount?: number;
  sentCount?: number;
  message?: string;
  createdAt?: string;
}

interface UserbotConfig {
  id: string;
  label: string;
  clientPhone?: string;
}

interface DialogEntry {
  id: string;
  name: string;
}

export default function TelegramCampaigns() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [userbots, setUserbots] = useState<UserbotConfig[]>([]);
  const [dialogs, setDialogs] = useState<DialogEntry[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    userbotConfigId: "",
    chatIds: [] as string[],
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchCampaigns();
    fetchUserbots();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get("/api/v1/telegram-advanced/campaigns");
      setCampaigns(r.data.data || []);
    } catch {
      setError("فشل تحميل حملات Telegram");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserbots = async () => {
    try {
      const r = await apiClient.get("/api/v1/telegram/userbots");
      setUserbots(r.data.data || []);
    } catch {
      /* ignore */
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
      case "COMPLETED":
      case "SENT":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "RUNNING":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "FAILED":
      case "CANCELLED":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    }
  };

  const getStatusLabel = (s: string) =>
    ({
      PENDING: "قيد الانتظار",
      RUNNING: "قيد التشغيل",
      SENT: "تم الإرسال",
      COMPLETED: "مكتملة",
      FAILED: "فشلت",
      CANCELLED: "ملغاة",
      DRAFT: "مسودة",
    }[s] || s);

  const handleCreate = async () => {
    if (!formData.userbotConfigId || formData.chatIds.length === 0 || !formData.message.trim()) {
      setError("يرجى ملء جميع الحقول المطلوبة واختيار المحادثات");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/api/v1/telegram-advanced/campaigns", formData);
      fetchCampaigns();
      setOpenDialog(false);
      tToast.success("TelegramCampaigns.success_create_6e83");
    } catch {
      setError("فشل إنشاء الحملة");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من إلغاء هذه الحملة؟")) return;
    try {
      await apiClient.post(`/api/v1/telegram-advanced/campaigns/${id}/cancel`);
      fetchCampaigns();
      tToast.success("TelegramCampaigns.msg_2651");
    } catch {
      setError("فشل إلغاء الحملة");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الحملة؟")) return;
    try {
      await apiClient.delete(`/api/v1/telegram-advanced/campaigns/${id}`);
      fetchCampaigns();
      tToast.success("TelegramCampaigns.success_delete_09d0");
    } catch {
      setError("فشل حذف الحملة");
    }
  };

  const activeCount = campaigns.filter((c) => c.status === "RUNNING" || c.status === "PENDING").length;
  const totalTargets = campaigns.reduce((a, c) => a + (c.targetCount || 0), 0);
  const totalSent = campaigns.reduce((a, c) => a + (c.sentCount || 0), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${activeCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
              الحملات النشطة: {activeCount}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              ENGINE: telegram.campaigns.v2
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>إجمالي الحملات: <strong className="text-foreground">{campaigns.length}</strong></span>
            <span className="text-border">|</span>
            <span>المستهدفين: <strong className="text-foreground">{totalTargets}</strong></span>
            <span className="text-border">|</span>
            <span>المرسلة: <strong className="text-emerald-500">{totalSent}</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />
                محرك الحملات الترويجية
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                broadcast.campaigns
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              حملات Telegram التسويقية
            </h1>
            <p className="text-xs text-muted-foreground">
              إطلاق ومتابعة الحملات الترويجية والرسائل المستهدفة عبر حسابات الـ Userbot
            </p>
          </div>

          <button
            onClick={() => {
              const firstBotId = userbots[0]?.id || "";
              setFormData({
                userbotConfigId: firstBotId,
                chatIds: [],
                title: "",
                message: "",
              });
              if (firstBotId) fetchDialogs(firstBotId);
              setOpenDialog(true);
            }}
            disabled={userbots.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            حملة تسويقية جديدة
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Campaigns List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono">
              جاري فحص وتحديث قائمة الحملات...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border/70 rounded-lg bg-muted/5">
              <Megaphone className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                لا توجد حملات مسجلة بعد. اضغط "حملة تسويقية جديدة" لإطلاق أول حملة.
              </p>
            </div>
          ) : (
            campaigns.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-border/70 bg-card p-4 hover:border-border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {c.name || c.title || "حملة بدون عنوان"}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getStatusBadge(
                        c.status
                      )}`}
                    >
                      {getStatusLabel(c.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span>
                      المستهدفين: <strong className="text-foreground">{c.targetCount || 0}</strong>
                    </span>
                    <span className="text-border">|</span>
                    <span>
                      تم الإرسال: <strong className="text-emerald-500">{c.sentCount || 0}</strong>
                    </span>
                  </div>
                  {c.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/10 p-2 rounded border border-border/40 font-mono">
                      {c.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  {(c.status === "PENDING" || c.status === "RUNNING") && (
                    <button
                      onClick={() => handleCancel(c.id)}
                      className="p-1.5 text-muted-foreground hover:text-amber-500 hover:bg-muted/40 rounded transition-colors"
                      title="إلغاء الحملة"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-muted/40 rounded transition-colors"
                    title="حذف الحملة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Dialog for New Campaign */}
        {openDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-card border border-border/80 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
              <div className="border-b border-border/70 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  إنشاء حملة تسويقية جديدة
                </h3>
                <button
                  onClick={() => setOpenDialog(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  إلغاء
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block mb-1 font-medium text-foreground">حساب الـ Userbot المشغّل</label>
                  <select
                    value={formData.userbotConfigId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setFormData((p) => ({ ...p, userbotConfigId: id, chatIds: [] }));
                      fetchDialogs(id);
                    }}
                    className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  >
                    {userbots.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-foreground">المحادثة / المجموعة المستهدفة</label>
                  <select
                    value={formData.chatIds[0] || ""}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, chatIds: [e.target.value] }))
                    }
                    className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  >
                    <option value="">اختر المحادثة المستهدفة...</option>
                    {dialogs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-foreground">عنوان الحملة</label>
                  <input
                    type="text"
                    placeholder="مثال: عروض نهاية الأسبوع - المشتركين الجدد"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium text-foreground">نص الرسالة الترويجية</label>
                  <textarea
                    rows={5}
                    placeholder="اكتب نص الرسالة الترويجية..."
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, message: e.target.value }))
                    }
                    className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border/70 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpenDialog(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-md bg-muted/40 text-foreground hover:bg-muted/70 border border-border/70 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {loading ? "جاري الإنشاء..." : "إطلاق الحملة"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}