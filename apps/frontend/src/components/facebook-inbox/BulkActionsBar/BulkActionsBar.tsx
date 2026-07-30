import { X as XMarkIcon, Check as CheckCircleIcon, Circle as UserPlusIcon, Tag as TagIcon } from 'lucide-react';
import React from "react";
;

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMarkAsDone?: () => void;
  onAssign?: () => void;
  onAddTags?: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onClearSelection,
  onMarkAsDone,
  onAssign,
  onAddTags,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="business-bulk-bar absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClearSelection}
          className="business-icon-button business-icon-button--sm"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-foreground)" }}
        >
          {selectedCount} محدد
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMarkAsDone}
          className="business-chip-button px-3 py-1.5 text-xs font-medium"
          style={{
            background:
              "color-mix(in srgb, var(--business-success) 10%, white)",
            borderColor:
              "color-mix(in srgb, var(--business-success) 18%, transparent)",
            color: "color-mix(in srgb, var(--business-success) 74%, black)",
          }}
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span>إنهاء</span>
        </button>
        <button
          type="button"
          onClick={onAssign}
          className="business-chip-button px-3 py-1.5 text-xs font-medium"
          style={{
            background: "color-mix(in srgb, var(--color-primary) 10%, white)",
            borderColor:
              "color-mix(in srgb, var(--color-primary) 18%, transparent)",
            color: "var(--color-primary)",
          }}
          title="تعيين للموظف"
        >
          <UserPlusIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onAddTags}
          className="business-chip-button px-3 py-1.5 text-xs font-medium"
          style={{
            background: "color-mix(in srgb, var(--color-secondary) 10%, white)",
            borderColor:
              "color-mix(in srgb, var(--color-secondary) 18%, transparent)",
            color: "var(--color-secondary)",
          }}
          title="تغيير التصنيفات"
        >
          <TagIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
