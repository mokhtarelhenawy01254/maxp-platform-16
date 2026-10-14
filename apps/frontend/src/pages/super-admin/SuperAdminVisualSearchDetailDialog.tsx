import React from "react";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface VisualSearchLog {
  id: string;
  companyId: string;
  companyName: string;
  query: string;
  resultsCount: number;
  wasSuccessful: boolean;
  responseTime: number | null;
  intent: string;
  metadata: {
    top_score: number;
    image_present: boolean;
    mime_type: string;
    embedding_provider: string;
  } | null;
  createdAt: string;
}

interface DetailDialogProps {
  log: VisualSearchLog | null;
  onClose: () => void;
  fmtTime: (iso: string) => string;
  latencyColor: (ms: number) => string;
}

export function VisualSearchDetailDialog({ log, onClose, fmtTime, latencyColor }: DetailDialogProps) {
  return (
    <Dialog open={!!log} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md bg-card text-foreground border-border/80">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" />
            تفاصيل عملية البحث البصري
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            معلومات الاستعلام والبيانات الوصفية ونموذج التضمين
          </DialogDescription>
        </DialogHeader>
        {log && (
          <div className="space-y-2.5 text-xs pt-1 font-mono">
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-sans">الشركة:</span>
              <span className="font-semibold text-foreground font-sans">{log.companyName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-sans">الاستعلام:</span>
              <span className="font-medium text-foreground max-w-[220px] truncate text-left" dir="auto">
                {log.query || "—"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-sans">عدد النتائج:</span>
              <span className="font-semibold text-foreground tabular-nums">{log.resultsCount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-sans">زمن الاستجابة:</span>
              <span className={cn("font-semibold tabular-nums", log.responseTime ? latencyColor(log.responseTime) : "")}>
                {log.responseTime ?? "—"}ms
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground font-sans">التاريخ:</span>
              <span className="text-muted-foreground">{fmtTime(log.createdAt)}</span>
            </div>

            {log.metadata && (
              <div className="pt-2 space-y-2 border-t border-border/60">
                <p className="font-sans font-semibold text-foreground">بيانات التضمين العصبي</p>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">أعلى تطابق:</span>
                  <span className="font-semibold tabular-nums">{(log.metadata.top_score * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">صورة مرفقة:</span>
                  <span>{log.metadata.image_present ? "نعم" : "لا"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground font-sans">نوع الملف:</span>
                  <span>{log.metadata.mime_type || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground font-sans">مزود التضمين:</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {log.metadata.embedding_provider}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
