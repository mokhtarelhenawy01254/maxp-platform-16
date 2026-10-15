import React from "react";
import { X, CheckCircle2, UserPlus, Tag } from "lucide-react";

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
    <div
      className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-2.5 bg-card/95 backdrop-blur-sm border-b border-border/70 shadow-sm animate-in slide-in-from-top duration-200"
      dir="rtl"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearSelection}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="إلغاء التحديد"
          title="إلغاء التحديد"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-foreground font-mono tabular-nums">
          {selectedCount} محادثة محددة
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {onMarkAsDone && (
          <button
            type="button"
            onClick={onMarkAsDone}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>إنهاء</span>
          </button>
        )}
        {onAssign && (
          <button
            type="button"
            onClick={onAssign}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border/70 bg-background hover:bg-muted text-foreground transition-colors"
            title="تعيين للموظف"
            aria-label="تعيين للموظف"
          >
            <UserPlus className="w-3.5 h-3.5 text-muted-foreground" />
            <span>تعيين</span>
          </button>
        )}
        {onAddTags && (
          <button
            type="button"
            onClick={onAddTags}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border/70 bg-background hover:bg-muted text-foreground transition-colors"
            title="تغيير التصنيفات"
            aria-label="تغيير التصنيفات"
          >
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <span>تصنيف</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BulkActionsBar;
