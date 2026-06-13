import React, { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquarePlus, Phone, XCircle } from "lucide-react";

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

import { apiClient as api } from "../../services/apiClient";

interface CheckNumberDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  onChatStart?: (jid: string) => void;
}

const CheckNumberDialog: React.FC<CheckNumberDialogProps> = ({
  open,
  onClose,
  sessionId,
  onChatStart,
}) => {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNumber("");
      setError(null);
      setSuccessMessage(null);
      setLoading(false);
    }
  }, [open]);

  const handleAddAndStartChat = async () => {
    if (!number) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.post("/whatsapp/check-number", {
        sessionId,
        number,
      });

      if (response.data.success && response.data.exists && response.data.jid) {
        // Number exists on WhatsApp — auto-start chat immediately
        setSuccessMessage("تم العثور على الرقم! جاري فتح المحادثة...");
        onChatStart?.(response.data.jid);
        // Brief delay so the user sees the success state, then close
        setTimeout(() => {
          onClose();
        }, 400);
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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <DialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <MessageSquarePlus className="size-5 text-[color:var(--color-primary)]" />
            بدء محادثة جديدة
          </DialogTitle>
          <DialogDescription>
            أدخل رقم الهاتف للعميل وسيتم فتح المحادثة معه مباشرة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
              رقم الهاتف
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="مثال: 201xxxxxxxxx"
                className="h-11 rounded-[18px] bg-white/75 ps-10"
                autoFocus
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-[22px] border border-[color:var(--shell-control-border)] bg-white/65 px-4 py-6">
              <Loader2 className="size-5 animate-spin text-[color:var(--color-primary)]" />
              <span className="text-sm text-[color:var(--color-muted-foreground)]">جاري التحقق وفتح المحادثة...</span>
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="rounded-[20px] border-rose-200 bg-rose-50/90">
              <XCircle className="size-4" />
              <AlertTitle>تعذر إضافة الرقم</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {successMessage ? (
            <Alert className="rounded-[22px] border-emerald-200 bg-emerald-50/90">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <AlertTitle className="text-emerald-700">{successMessage}</AlertTitle>
            </Alert>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[color:var(--shell-control-border)] bg-white/55">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleAddAndStartChat} disabled={!number || loading}>
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="size-4" />
            )}
            إضافة وبدء محادثة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckNumberDialog;
