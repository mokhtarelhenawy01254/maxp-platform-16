import React, { useState, useEffect } from "react";
import {
  Send,
  Plus,
  Users,
  MessageSquare,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Sliders,
  Layers,
} from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface Userbot {
  id: string;
  label: string;
  clientPhone?: string;
}

interface DialogEntry {
  id: string;
  name: string;
}

interface BulkMessageItem {
  id: string;
  message: string;
  targetCount?: number;
  sentCount?: number;
  createdAt?: string;
}

export default function TelegramBulkMessages() {
  const [messages, setMessages] = useState<BulkMessageItem[]>([]);
  const [userbots, setUserbots] = useState<Userbot[]>([]);
  const [dialogList, setDialogList] = useState<DialogEntry[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedUserbot, setSelectedUserbot] = useState("");
  const [selectedDialogs, setSelectedDialogs] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    fetchUserbots();
    fetchMessages();
  }, []);

  const fetchUserbots = async () => {
    try {
      const r = await apiClient.get("/api/v1/telegram/userbots");
      const list = r.data.data || [];
      setUserbots(list);
      if (list.length > 0 && !selectedUserbot) {
        setSelectedUserbot(list[0].id);
        fetchDialogs(list[0].id);
      }
    } catch {
      /* ignore */
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const r = await apiClient.get("/api/v1/telegram-advanced/bulk-messages");
      setMessages(r.data.data || []);
    } catch {
      setError("فشل تحميل سجل الرسائل الجماعية");
    } finally {
      setLoading(false);
    }
  };

  const fetchDialogs = async (id: string) => {
    if (!id) return;
    try {
      const r = await apiClient.get(`/api/v1/userbot/dialogs?userbotConfigId=${id}`);
      setDialogList(r.data.data || []);
    } catch {
      /* ignore */
    }
  };

  const handleSend = async () => {
    if (!selectedUserbot || selectedDialogs.length === 0 || !messageText.trim()) {
      toast.error("يرجى اختيار الحساب والمحادثات وكتابة نص الرسالة");
      return;
    }
    setSending(true);
    setError("");
    try {
      const r = await apiClient.post("/api/v1/telegram-advanced/bulk-messages", {
        userbotConfigId: selectedUserbot,
        chatIds: selectedDialogs,
        message: messageText,
      });
      setMessages(r.data.data || []);
      tToast.success("TelegramBulkMessages.success_send_242e");
      setOpenDialog(false);
      setMessageText("");
    } catch {
      setError("فشل إرسال الرسائل الجماعية");
    } finally {
      setSending(false);
    }
  };

  const totalTargets = messages.reduce((a, m) => a + (m.targetCount || 0), 0);
  const totalSent = messages.reduce((a, m) => a + (m.sentCount || 0), 0);

  return (
    <div dir="rtl" className="min-h-screen bg-card text-foreground font-sans rtl">
      {/* Telemetry Status Ribbon */}
      <div className="border-b border-border/70 bg-muted/20 px-4 sm:px-6 py-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <span className={`inline-block w-2 h-2 rounded-full ${userbots.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              منظومة البث الجماعي: {userbots.length > 0 ? "جاهزة" : "بانتظار ربط الحسابات"}
            </span>
            <span className="text-border">|</span>
            <span className="text-muted-foreground font-mono">
              USERBOTS: {userbots.length}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-muted-foreground">
            <span>إجمالي الإرساليات: <strong className="text-foreground">{messages.length}</strong></span>
            <span className="text-border">|</span>
            <span>المحادثات المستهدفة: <strong className="text-foreground">{totalTargets}</strong></span>
            <span className="text-border">|</span>
            <span>الرسائل المسلمة: <strong className="text-emerald-500">{totalSent}</strong></span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted/40 text-foreground border border-border/70">
                <Radio className="w-3.5 h-3.5 text-muted-foreground" />
                محرك البث والتوزيع
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                telegram.broadcast.v2
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              الرسائل الجماعية عبر Telegram
            </h1>
            <p className="text-xs text-muted-foreground">
              بث رسائل وتنبيهات مباشرة لقوائم المحادثات والمجموعات المحددة عبر حسابات Userbot
            </p>
          </div>

          <button
            onClick={() => setOpenDialog(true)}
            disabled={userbots.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            إنشاء بث جماعي جديد
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Broadcasts List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground font-mono">
              جاري فحص سجل الإرساليات الجماعية...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center space-y-2 border border-dashed border-border/70 rounded-lg bg-muted/5">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">
                لا توجد رسائل جماعية سابقة مسجلة. اضغط "إنشاء بث جماعي جديد" لبدء الإرسال.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border/70 bg-card p-4 hover:border-border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-2">
                    {m.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span>
                      المستهدفين: <strong className="text-foreground">{m.targetCount || 0}</strong> محادثة
                    </span>
                    <span className="text-border">|</span>
                    <span>
                      تم الإرسال: <strong className="text-emerald-500">{m.sentCount || 0}</strong>
                    </span>
                    {m.createdAt && (
                      <>
                        <span className="text-border">|</span>
                        <span>{new Date(m.createdAt).toLocaleString("ar-EG")}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    مكتمل
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Dialog for Bulk Send */}
        {openDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-card border border-border/80 rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
              <div className="border-b border-border/70 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  إنشاء بث رسائل جماعية جديد
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
                    value={selectedUserbot}
                    onChange={(e) => {
                      setSelectedUserbot(e.target.value);
                      fetchDialogs(e.target.value);
                    }}
                    className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  >
                    {userbots.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} {b.clientPhone ? `(${b.clientPhone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-foreground">المحادثات والمجموعات المستهدفة</label>
                  <select
                    value={selectedDialogs[0] || ""}
                    onChange={(e) => setSelectedDialogs([e.target.value])}
                    className="w-full bg-background border border-border/80 rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  >
                    <option value="">اختر المحادثة المستهدفة...</option>
                    {dialogList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-foreground">نص الرسالة</label>
                  <textarea
                    rows={6}
                    placeholder="اكتب نص الرسالة الجماعية المراد إرسالها..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
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
                  onClick={handleSend}
                  disabled={sending || !selectedUserbot || selectedDialogs.length === 0 || !messageText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? "جاري الإرسال..." : "بدء الإرسال الآن"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}