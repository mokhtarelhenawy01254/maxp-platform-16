import React, { useState, useEffect } from "react";
import { X, Clock, User, RotateCcw } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { TurboTicketLog } from "./types";

interface TurboTicketLogsModalProps {
  isOpen: boolean;
  ticketId: number | null;
  onClose: () => void;
}

export const TurboTicketLogsModal: React.FC<TurboTicketLogsModalProps> = ({
  isOpen,
  ticketId,
  onClose,
}) => {
  const [logs, setLogs] = useState<TurboTicketLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/turbo/tickets/${ticketId}/log`);
      const list =
        res.data?.data?.logs ||
        res.data?.logs ||
        res.data?.feed ||
        res.data?.data ||
        [];
      setLogs(Array.isArray(list) ? list : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      fetchLogs();
    }
  }, [isOpen, ticketId]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-background/80 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/80 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-right font-sans">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground">
                سجل تحركات التذكرة #{ticketId}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                التسلسل الزمني للعمليات وتحديثات الحالة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition"
              title="تحديث السجل"
            >
              <RotateCcw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 min-h-0 text-xs">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto" />
              <p>جاري تحميل السجل...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 border border-border/60 rounded-xl">
              لا توجد سجلات مسجلة لهذه التذكرة حتى الآن.
            </div>
          ) : (
            logs.map((log, idx) => {
              const desc =
                typeof log.description === "object"
                  ? log.description?.ar || log.description?.en || ""
                  : log.description || "تحديث حالة";
              const author =
                log.user?.full_name || log.user?.name || "نظام تربو";
              const dateStr = log.created_at
                ? new Date(log.created_at).toLocaleString("ar-EG")
                : "";

              return (
                <div
                  key={log.id || idx}
                  className="p-3 rounded-xl border border-border/70 bg-card text-xs space-y-1.5 shadow-xs transition-colors hover:border-primary/30"
                >
                  <p className="font-medium text-foreground leading-relaxed">
                    {desc}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 text-primary" />
                      <span>{author}</span>
                    </span>
                    <span className="font-mono tabular-nums">{dateStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
