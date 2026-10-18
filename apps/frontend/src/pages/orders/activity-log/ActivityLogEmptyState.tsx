import React from "react";
import { Clock, RotateCw } from "lucide-react";

interface ActivityLogEmptyStateProps {
  loading: boolean;
  isFilterActive: boolean;
  onResetFilters: () => void;
}

export const ActivityLogEmptyState: React.FC<ActivityLogEmptyStateProps> = ({
  loading,
  isFilterActive,
  onResetFilters,
}) => {
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <RotateCw className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs font-mono">
          جاري تحميل سجل الحركات الحية...
        </span>
      </div>
    );
  }

  return (
    <div className="py-24 flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed border-border/70 rounded-xl my-4">
      <Clock className="w-10 h-10 stroke-[1.25] text-muted-foreground/40 mb-3" />
      <h3 className="text-sm font-semibold text-foreground">
        لا توجد حركات مطابقة للبحث
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mt-1">
        جرب تغيير شروط الفلترة أو تفريغ البحث برقم الطلب لعرض كافة الحركات المسجلة.
      </p>
      {isFilterActive && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-4 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-card border border-border/70 hover:bg-muted text-foreground transition-colors active:scale-[0.98]"
        >
          إظهار كافة الحركات
        </button>
      )}
    </div>
  );
};

export default ActivityLogEmptyState;
