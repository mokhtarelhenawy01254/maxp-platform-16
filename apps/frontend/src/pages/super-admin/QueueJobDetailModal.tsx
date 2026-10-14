import React from "react";
import { Info, XCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { AnimatePresence } from "framer-motion";

export interface RecentJob {
  id: string;
  name: string;
  data: string;
  status: string;
  finishedOn?: number;
  failedReason?: string;
  rawPayload?: any;
}

interface QueueJobDetailModalProps {
  job: RecentJob | null;
  onClose: () => void;
}

export function QueueJobDetailModal({ job, onClose }: QueueJobDetailModalProps) {
  return (
    <AnimatePresence>
      {job && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-xs"
            onClick={onClose}
          />
          <div
            className="relative bg-card border border-border/80 rounded-xl max-w-lg w-full overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="border-b border-border/60 bg-muted/20 p-3.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="size-7 bg-primary/10 rounded-md border border-primary/20 text-primary flex items-center justify-center">
                    <Info className="size-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-foreground font-mono">
                    تفاصيل مهمة الطابور
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                >
                  <XCircle className="size-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3.5 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-2.5 bg-muted/20 p-3 rounded-lg border border-border/50">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground mb-0.5">
                    المعرف (Job ID)
                  </p>
                  <p className="text-xs font-mono font-medium text-foreground bg-card p-1.5 rounded border border-border/50 truncate">
                    {job.id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground mb-0.5">
                    نوع المهمة
                  </p>
                  <p className="text-xs font-mono font-medium text-foreground bg-card p-1.5 rounded border border-border/50 truncate">
                    {job.name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground mb-0.5">
                    الحالة
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium border ${
                      job.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : job.status === "active"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          : job.status === "waiting"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                  >
                    <span className="size-1.5 rounded-full bg-current" />
                    {job.status === "completed"
                      ? "ناجحة"
                      : job.status === "active"
                        ? "قيد التنفيذ"
                        : job.status === "waiting"
                          ? "في الانتظار"
                          : "فاشلة"}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground mb-0.5">
                    تاريخ ووقت الانتهاء
                  </p>
                  <p className="text-xs font-mono text-muted-foreground tabular-nums">
                    {job.finishedOn
                      ? new Date(job.finishedOn).toLocaleString("ar-EG")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-mono text-foreground font-semibold">
                  حزمة البيانات (Payload):
                </p>
                <div
                  className="bg-muted/40 border border-border/60 text-foreground p-3 rounded-lg text-[11px] font-mono overflow-auto max-h-[180px]"
                  dir="ltr"
                >
                  <pre>
                    {JSON.stringify(job.rawPayload || {}, null, 2)}
                  </pre>
                </div>
              </div>

              {job.failedReason && (
                <div className="space-y-1.5">
                  <p className="text-xs font-mono text-destructive font-semibold">
                    سبب الفشل:
                  </p>
                  <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-xs font-mono border border-destructive/20">
                    {job.failedReason}
                  </div>
                </div>
              )}
            </div>

              <div className="p-3 border-t border-border/60 bg-muted/10">
                <Button
                  className="w-full h-8 text-xs font-mono rounded-md active:scale-[0.98]"
                  onClick={onClose}
                >
                  إغلاق النافذة
                </Button>
              </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
