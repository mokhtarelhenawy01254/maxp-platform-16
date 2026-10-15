import React, { useState } from "react";
import {
  CheckCircle2,
  Archive,
  BellOff,
  Clock,
  Trash2,
  Star,
} from "lucide-react";

interface ConversationActionsBarProps {
  isPriority: boolean;
  onTogglePriority: () => void;
  onMarkDone: () => void;
  onSnooze?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onMute?: () => void;
  disabled?: boolean;
}

const ConversationActionsBar: React.FC<ConversationActionsBarProps> = ({
  isPriority,
  onTogglePriority,
  onMarkDone,
  onSnooze,
  onDelete,
  onArchive,
  onMute,
  disabled = false,
}) => {
  const [doneFlash, setDoneFlash] = useState(false);
  const [priorityFlash, setPriorityFlash] = useState(false);

  const handleMarkDone = () => {
    setDoneFlash(true);
    onMarkDone();
    setTimeout(() => setDoneFlash(false), 800);
  };

  const handleTogglePriority = () => {
    setPriorityFlash(true);
    onTogglePriority();
    setTimeout(() => setPriorityFlash(false), 800);
  };

  return (
    <div className="flex items-center gap-1.5" dir="rtl">
      {/* Mark as Done */}
      <button
        type="button"
        onClick={handleMarkDone}
        disabled={disabled}
        className={`p-1.5 rounded-lg border transition-all duration-200 disabled:opacity-50 ${
          doneFlash
            ? "bg-emerald-500 text-white border-emerald-600 scale-105 shadow-sm"
            : "border-border/70 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 hover:border-emerald-500/20 bg-card"
        }`}
        title="تحديد كمنتهي"
        aria-label="تحديد كمنتهي"
      >
        <CheckCircle2 className={`w-4 h-4 ${doneFlash ? "animate-pulse" : ""}`} />
      </button>

      {/* Toggle Priority/Star */}
      <button
        type="button"
        onClick={handleTogglePriority}
        disabled={disabled}
        className={`p-1.5 rounded-lg border transition-all duration-200 disabled:opacity-50 ${
          priorityFlash
            ? "bg-amber-500 text-white border-amber-600 scale-105 shadow-sm"
            : isPriority
              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
              : "border-border/70 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20 bg-card"
        }`}
        title={isPriority ? "إلغاء الأولوية" : "تحديد كأولوية"}
        aria-label={isPriority ? "إلغاء الأولوية" : "تحديد كأولوية"}
      >
        <Star
          className={`w-4 h-4 ${isPriority ? "fill-amber-500" : ""} ${
            priorityFlash ? "animate-pulse" : ""
          }`}
        />
      </button>

      {/* Snooze */}
      {onSnooze && (
        <button
          type="button"
          onClick={onSnooze}
          disabled={disabled}
          className="p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 bg-card transition-colors disabled:opacity-50"
          title="غفوة المحادثة"
          aria-label="غفوة المحادثة"
        >
          <Clock className="w-4 h-4" />
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 bg-card transition-colors disabled:opacity-50"
          title="حذف المحادثة"
          aria-label="حذف المحادثة"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Archive */}
      {onArchive && (
        <button
          type="button"
          onClick={onArchive}
          disabled={disabled}
          className="p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 bg-card transition-colors disabled:opacity-50"
          title="أرشفة"
          aria-label="أرشفة"
        >
          <Archive className="w-4 h-4" />
        </button>
      )}

      {/* Mute */}
      {onMute && (
        <button
          type="button"
          onClick={onMute}
          disabled={disabled}
          className="p-1.5 rounded-lg border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40 bg-card transition-colors disabled:opacity-50"
          title="كتم التنبيهات"
          aria-label="كتم التنبيهات"
        >
          <BellOff className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ConversationActionsBar;
