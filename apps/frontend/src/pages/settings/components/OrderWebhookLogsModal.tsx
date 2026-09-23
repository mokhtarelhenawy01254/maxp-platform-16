import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "../../../services/api";
import { WebhookConfig } from "./OrderWebhookFormModal";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              سجلات إرسال الويب هوك ({webhook.name || "Endpoint"})
            </h3>
            <p className="text-xs text-muted-foreground truncate">{webhook.url}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">جاري تحميل السجلات...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">لا توجد سجلات إرسال سابقة بعد لهذا الرابط.</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-border bg-muted/40 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        log.isSuccess
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {log.responseStatus ? `HTTP ${log.responseStatus}` : "FAILED"}
                    </span>
                    <span className="font-semibold text-foreground">
                      {log.orderNumber || "طلب بدون رقم"}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{log.event}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {log.durationMs ? `${log.durationMs}ms` : "—"} |{" "}
                    {new Date(log.createdAt).toLocaleString("ar-EG")}
                  </span>
                </div>
                {log.error && (
                  <p className="font-mono text-destructive text-[11px] break-all">{log.error}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
