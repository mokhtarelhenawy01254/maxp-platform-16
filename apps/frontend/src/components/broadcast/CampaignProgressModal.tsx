import React, { useEffect, useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
} from "lucide-react";
import { socketService } from "../../services/socketService";

interface CampaignProgressModalProps {
  campaignId: string;
  campaignName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ProgressData {
  campaignId: string;
  status: "started" | "sending" | "completed" | "failed";
  total: number;
  sent: number;
  failed: number;
  progress: number;
  currentRecipient?: string;
}

const CampaignProgressModal: React.FC<CampaignProgressModalProps> = ({
  campaignId,
  campaignName,
  isOpen,
  onClose,
}) => {
  const [progressData, setProgressData] = useState<ProgressData>({
    campaignId,
    status: "started",
    total: 0,
    sent: 0,
    failed: 0,
    progress: 0,
  });

  useEffect(() => {
    if (!isOpen) return;

    // Listen for progress updates
    const handleProgress = (data: ProgressData) => {
      if (data.campaignId === campaignId) {
        setProgressData(data);
      }
    };

    socketService.onCampaignProgress(handleProgress);

    return () => {
      socketService.off("campaign:progress", handleProgress);
    };
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const isCompleted = progressData.status === "completed";
  const isFailed = progressData.status === "failed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      dir="rtl"
    >
      <div className="bg-card border border-border/70 text-card-foreground shadow-2xl rounded-2xl max-w-md w-full p-5 space-y-4">
        {/* Header (Zero Emojis) */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl border ${
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : isFailed
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                    : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isFailed ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {isCompleted
                  ? "اكتمل إرسال الحملة"
                  : isFailed
                    ? "تعذر إرسال الحملة"
                    : "جاري إرسال البث الجماعي"}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                {campaignName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono tabular-nums">
            <span>نسبة الإنجاز</span>
            <span className="font-semibold text-foreground">
              {progressData.progress}%
            </span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isCompleted
                  ? "bg-emerald-500"
                  : isFailed
                    ? "bg-rose-500"
                    : "bg-primary"
              }`}
              style={{ width: `${progressData.progress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-muted/20 border border-border/60 rounded-xl text-center space-y-0.5">
            <div className="text-lg font-bold font-mono tabular-nums text-foreground">
              {progressData.total}
            </div>
            <div className="text-[10px] text-muted-foreground">الإجمالي</div>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-0.5">
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {progressData.sent}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
              نجح
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-0.5">
            <div className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {progressData.failed}
            </div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400">
              فشل
            </div>
          </div>
        </div>

        {/* Current Recipient */}
        {progressData.currentRecipient && !isCompleted && (
          <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">المستلم الحالي:</span>
            <span className="font-mono text-foreground font-medium" dir="ltr">
              {progressData.currentRecipient}
            </span>
          </div>
        )}

        {/* Status Message */}
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p>
              تم إرسال الحملة بنجاح! تم إرسال {progressData.sent} رسالة من أصل{" "}
              {progressData.total}
            </p>
          </div>
        )}

        {isFailed && (
          <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p>فشل إرسال الحملة أو حدث خطأ أثناء المعالجة</p>
          </div>
        )}

        {/* Ongoing Spinner */}
        {!isCompleted && !isFailed && (
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span>جاري إرسال الرسائل في الخلفية...</span>
          </div>
        )}

        {/* Close Button when done */}
        {(isCompleted || isFailed) && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-medium bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-colors"
            >
              إغلاق النافذة
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignProgressModal;
