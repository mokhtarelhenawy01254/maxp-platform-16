import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { WebhookConfig } from "./OrderWebhookFormModal";
import { X, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface WebhookLog {
  id: string;
  event: string;
  orderNumber: string | null;
  responseStatus: number | null;
  durationMs: number | null;
  isSuccess: boolean;
  error: string | null;
  createdAt: string;
}

interface OrderWebhookLogsModalProps {
  webhook: WebhookConfig | null;
  onClose: () => void;
}

export const OrderWebhookLogsModal: React.FC<OrderWebhookLogsModalProps> = ({
  webhook,
  onClose,
}) => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!webhook) {
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/order-webhooks/${webhook.id}/logs?limit=30`);
        setLogs(res.data?.data || []);
      } catch {
        toast.error("فشل تحميل سجلات الويب هوك");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [webhook]);

  if (!webhook) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border/80 rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 text-xs font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">
                سجلات إرسال الويب هوك ({webhook.name || "Endpoint"})
              </h3>
              <p className="text-[11px] text-muted-foreground truncate font-mono" dir="ltr">
                {webhook.url}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
              <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-xs">جاري تحميل سجلات الإرسال...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 border border-border/60 rounded-xl">
              لا توجد سجلات إرسال سابقة بعد لهذا الرابط.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-border/70 bg-card space-y-2 shadow-xs transition-colors hover:border-primary/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                        log.isSuccess
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }`}
                    >
                      {log.responseStatus ? `HTTP ${log.responseStatus}` : "FAILED"}
                    </span>
                    <span className="font-semibold text-foreground text-xs">
                      {log.orderNumber || "طلب بدون رقم"}
                    </span>
                    <span className="text-muted-foreground text-[10px] bg-muted px-2 py-0.5 rounded-md">
                      {log.event}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono tabular-nums">
                    <Clock className="w-3 h-3 text-muted-foreground/70" />
                    <span>
                      {log.durationMs ? `${log.durationMs}ms` : "—"} ·{" "}
                      {new Date(log.createdAt).toLocaleString("ar-EG")}
                    </span>
                  </div>
                </div>

                {log.error && (
                  <div className="p-2 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-[11px] font-mono break-all">
                    {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-border/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border/70 bg-card hover:bg-muted/60 text-foreground font-medium transition shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
