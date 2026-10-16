import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquarePlus, Phone, XCircle, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiClient as api } from "../../services/apiClient";
import type { WhatsAppProvider, Session as SessionType } from "../../hooks/useWhatsAppQueries";

interface CheckNumberDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  sessions: SessionType[];
  onChatStart?: (jid: string, sessionId: string) => void;
}

const providerBadge: Record<WhatsAppProvider, { label: string; className: string }> = {
  META_CLOUD: { label: "Cloud API", className: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  BAILEYS: { label: "Baileys", className: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
};

const statusBadge: Record<string, { label: string; className: string }> = {
  connected: { label: "متصل", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  connecting: { label: "جاري الاتصال", className: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  disconnected: { label: "غير متصل", className: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400" },
};

const CheckNumberDialog: React.FC<CheckNumberDialogProps> = ({
  open,
  onClose,
  sessionId,
  sessions,
  onChatStart,
}) => {
  const [number, setNumber] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(sessionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const realSessions = sessions.filter((s) => s.id !== "all");

  useEffect(() => {
    if (open) {
      setNumber("");
      setSelectedSessionId(sessionId);
      setError(null);
      setSuccessMessage(null);
      setLoading(false);
    }
  }, [open, sessionId]);

  const handleAddAndStartChat = async () => {
    if (!number || !selectedSessionId) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post("/whatsapp/check-number", {
        sessionId: selectedSessionId,
        number,
      });

      if (response.data.success && response.data.exists && response.data.jid) {
        setSuccessMessage("تم العثور على الرقم! جاري فتح المحادثة...");
        onChatStart?.(response.data.jid, selectedSessionId);
        setTimeout(() => onClose(), 400);
      } else if (response.data.success && !response.data.exists) {
        setError("الرقم غير مسجل على واتساب. تأكد من الرقم وحاول مرة أخرى.");
      } else {
        setError(response.data.error || "فشل التحقق من الرقم");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "حدث خطأ أثناء التحقق");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && number && !loading) {
      handleAddAndStartChat();
    }
  };

  const selectedSession = realSessions.find((s) => s.id === selectedSessionId);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 rounded-2xl border border-border/70 bg-card p-0 shadow-2xl text-foreground"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <MessageSquarePlus className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold tracking-tight text-foreground">
                بدء محادثة جديدة
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                أدخل رقم هاتف العميل لفتح المحادثة مباشرة.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              الجلسة
            </label>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger className="h-9.5 rounded-lg border-border/70 bg-background/80 text-xs text-foreground">
                <SelectValue placeholder="اختر الجلسة" />
              </SelectTrigger>
              <SelectContent>
                {realSessions.map((s) => {
                  const provider = providerBadge[s.provider ?? "BAILEYS"];
                  const st = statusBadge[String(s.status || s.liveStatus || "").toLowerCase()] ?? statusBadge.disconnected;
                  return (
                    <SelectItem key={s.id} value={s.id} className="py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.name}</span>
                        {s.phoneNumber && (
                          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                            {s.phoneNumber}
                          </span>
                        )}
                        <span className={`rounded-md border px-1.5 py-0.2 font-mono text-[10px] ${provider.className}`}>
                          {provider.label}
                        </span>
                        <span className={`rounded-md border px-1.5 py-0.2 font-mono text-[10px] ${st.className}`}>
                          {st.label}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              رقم الهاتف
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="مثال: 201xxxxxxxxx"
                className="h-9.5 rounded-lg border-border/70 bg-background/80 ps-9 font-mono text-xs tabular-nums text-foreground placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>
          </div>

          {selectedSession && selectedSession.provider === "META_CLOUD" && (
            <p className="text-[11px] text-muted-foreground">
              سيتم التحقق من الرقم عبر Meta Cloud API. تأكد من صحة التوكن أولاً.
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-5">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                جاري التحقق وفتح المحادثة...
              </span>
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/10 text-xs">
              <XCircle className="size-4" />
              <AlertTitle className="text-xs font-semibold">تعذر إضافة الرقم</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{successMessage}</AlertTitle>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-3">
          <Button variant="outline" onClick={onClose} className="h-8.5 rounded-lg border-border/70 text-xs font-medium hover:bg-muted/50">
            إلغاء
          </Button>
          <Button
            onClick={handleAddAndStartChat}
            disabled={!number || !selectedSessionId || loading}
            className="h-8.5 gap-1.5 rounded-lg text-xs font-semibold shadow-xs"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="size-3.5" />
            )}
            إضافة وبدء محادثة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckNumberDialog;
