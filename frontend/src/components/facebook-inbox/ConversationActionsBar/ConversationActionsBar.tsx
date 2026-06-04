import React, { useState } from "react";
import {
  CheckCircleIcon,
  ArchiveBoxIcon,
  BellSlashIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  StarIcon as StarIconSolid,
  CheckCircleIcon as CheckCircleSolid,
} from "@heroicons/react/24/solid";

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
    setTimeout(() => setDoneFlash(false), 1000);
  };

  const handleTogglePriority = () => {
    setPriorityFlash(true);
    onTogglePriority();
    setTimeout(() => setPriorityFlash(false), 1000);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Mark as Done */}
      <button
        onClick={handleMarkDone}
        disabled={disabled}
        className={`business-chip-button p-2 rounded-lg transition-all duration-300 disabled:opacity-50 ${doneFlash ? "scale-110 shadow-lg" : ""}`}
        style={
          doneFlash
            ? { background: "var(--business-success)", color: "white" }
            : undefined
        }
        title="تحديد كمنتهي"
      >
        {doneFlash ? (
          <CheckCircleSolid className="w-5 h-5 animate-pulse" />
        ) : (
          <CheckCircleIcon className="w-5 h-5" />
        )}
      </button>

      {/* Toggle Priority/Star */}
      <button
        onClick={handleTogglePriority}
        disabled={disabled}
        className={`business-chip-button p-2 rounded-lg transition-all duration-300 disabled:opacity-50 ${priorityFlash ? "scale-110 shadow-lg" : ""}`}
        style={
          priorityFlash
            ? { background: "var(--business-warning)", color: "white" }
            : isPriority
              ? {
                  background:
                    "color-mix(in srgb, var(--business-warning) 10%, white)",
                  color: "var(--business-warning)",
                }
              : undefined
        }
        title={isPriority ? "إلغاء الأولوية" : "تحديد كأولوية"}
      >
        <StarIconSolid
          className={`w-5 h-5 ${priorityFlash ? "animate-pulse" : ""}`}
        />
      </button>

      {/* Snooze */}
      {onSnooze && (
        <button
          onClick={onSnooze}
          disabled={disabled}
          className="business-chip-button p-2 rounded-lg transition-colors disabled:opacity-50"
          title="غفوة المحادثة"
        >
          <ClockIcon className="w-5 h-5" />
        </button>
      )}

      {/* Delete */}
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={disabled}
          className="business-chip-button p-2 rounded-lg transition-colors disabled:opacity-50"
          style={{
            color: "var(--business-danger)",
            background: "color-mix(in srgb, var(--business-danger) 8%, white)",
            borderColor:
              "color-mix(in srgb, var(--business-danger) 18%, transparent)",
          }}
          title="حذف المحادثة"
          aria-label="حذف المحادثة"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      )}

      {/* Archive (future) */}
      {onArchive && (
        <button
          onClick={onArchive}
          disabled={disabled}
          className="business-chip-button p-2 rounded-lg transition-colors disabled:opacity-50"
          title="أرشفة"
        >
          <ArchiveBoxIcon className="w-5 h-5" />
        </button>
      )}

      {/* Mute (future) */}
      {onMute && (
        <button
          onClick={onMute}
          disabled={disabled}
          className="business-chip-button p-2 rounded-lg transition-colors disabled:opacity-50"
          title="كتم"
        >
          <BellSlashIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default ConversationActionsBar;
