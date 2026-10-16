import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Square,
  Pause,
  Pencil,
  Trash2,
  Copy,
  Share2,
  Check,
  Calendar,
} from "lucide-react";
import { Task } from "../../../types/tasks";

interface TaskHeaderProps {
  task: Task;
  isTimerRunning: boolean;
  isTimerPaused?: boolean;
  elapsedSeconds: number;
  handleStartTimer: () => void;
  handleStopTimer: () => void;
  handlePauseTimer?: () => void;
  handleResumeTimer?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isSmartTimeTrackingEnabled: boolean;
  canEdit: boolean;
  canDelete: boolean;
  settings?: any;
}

const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  isTimerRunning,
  isTimerPaused = false,
  elapsedSeconds,
  handleStartTimer,
  handleStopTimer,
  handlePauseTimer,
  handleResumeTimer,
  onEdit,
  onDelete,
  onDuplicate,
  isSmartTimeTrackingEnabled,
  canEdit,
  canDelete,
  settings,
}) => {
  const navigate = useNavigate();
  const [copiedLink, setCopiedLink] = useState(false);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-border/70 text-foreground">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate("/super-admin/dev-tasks")}
          className="p-2 rounded-lg border border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all active:scale-95 shrink-0"
          title="العودة للمهام"
          aria-label="العودة"
        >
          <ArrowRight className="w-5 h-5 rtl:rotate-180" />
        </button>

        {/* Stepper Navigation */}
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/20 p-0.5 shrink-0">
          <button
            onClick={() =>
              task.nextTaskId &&
              navigate(`/super-admin/dev-tasks/${task.nextTaskId}`)
            }
            disabled={!task.nextTaskId}
            className="p-1 hover:bg-muted/50 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="المهمة التالية"
            aria-label="المهمة التالية"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-px h-3.5 bg-border/60 mx-0.5" />
          <button
            onClick={() =>
              task.previousTaskId &&
              navigate(`/super-admin/dev-tasks/${task.previousTaskId}`)
            }
            disabled={!task.previousTaskId}
            className="p-1 hover:bg-muted/50 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="المهمة السابقة"
            aria-label="المهمة السابقة"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-0.5">
            <span className="bg-muted/60 px-1.5 py-0.5 rounded text-[11px] font-mono border border-border/50">
              #{task.id.slice(0, 8)}
            </span>
            <span>/</span>
            <span className="font-medium text-foreground">{task.projectName || "General"}</span>
            {(settings?.taskDetailsVisibility?.showCreatedAt ?? true) && (
              <div className="flex items-center gap-1.5 ms-2 ps-2 border-s border-border/60 font-mono tabular-nums">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span>
                  {new Date(task.createdAt).toLocaleString("ar-EG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-foreground line-clamp-1">
            {task.title}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Smart Time Tracking */}
        {isSmartTimeTrackingEnabled && (
          <div className="flex items-center gap-1.5">
            {!isTimerRunning ? (
              <button
                onClick={handleStartTimer}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ابدأ العمل</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1 bg-card border border-primary/50 rounded-lg text-foreground">
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {formatTime(elapsedSeconds)}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${isTimerPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}
                  />
                </div>
                {isTimerPaused ? (
                  <button
                    onClick={handleResumeTimer}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all active:scale-[0.98]"
                    title="استئناف"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>استئناف</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePauseTimer}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all active:scale-[0.98]"
                    title="إيقاف مؤقت"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>إيقاف مؤقت</span>
                  </button>
                )}
                <button
                  onClick={handleStopTimer}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all active:scale-[0.98]"
                  title="إيقاف نهائي"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>إيقاف</span>
                </button>
              </>
            )}
          </div>
        )}

        <div className="h-5 w-px bg-border/60 mx-1" />

        <button
          onClick={copyLink}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors active:scale-95 border border-border/50"
          title="نسخ الرابط"
          aria-label="نسخ الرابط"
        >
          {copiedLink ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onDuplicate}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors active:scale-95 border border-border/50"
          title="تكرار المهمة"
          aria-label="تكرار"
        >
          <Copy className="w-4 h-4" />
        </button>

        {canEdit && (
          <button
            onClick={onEdit}
            className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors active:scale-95 border border-border/50"
            title="تعديل المهمة"
            aria-label="تعديل"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}

        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors active:scale-95 border border-border/50"
            title="حذف المهمة"
            aria-label="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskHeader;
