import React from "react";
import { Filter, X, RotateCcw, Star } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";

export interface FilterState {
  unreadOnly: boolean;
  assignedTo: "all" | "me" | "unassigned";
  startDate: Date | null;
  endDate: Date | null;
  priorityOnly?: boolean;
}

interface FilterPanelProps {
  isOpen: boolean;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClose: () => void;
  onReset: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  filters,
  onFilterChange,
  onClose,
  onReset,
}) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleChange = (key: keyof FilterState, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div
      className="bg-card border-b border-border/70 p-4 transition-all duration-200 text-card-foreground shadow-xs"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Filter className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-foreground">
            تصفية المحادثات
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="إغلاق التصفية"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Checkboxes (Unread & Priority) */}
        <div className="flex flex-col gap-2 justify-center">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="unreadOnly"
              checked={filters.unreadOnly}
              onChange={(e) => handleChange("unreadOnly", e.target.checked)}
              className="w-4 h-4 rounded border-border/70 text-primary focus:ring-primary/40 cursor-pointer"
            />
            <label
              htmlFor="unreadOnly"
              className="text-xs text-foreground cursor-pointer select-none"
            >
              غير مقروءة فقط
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="priorityOnly"
              checked={!!filters.priorityOnly}
              onChange={(e) => handleChange("priorityOnly", e.target.checked)}
              className="w-4 h-4 rounded border-border/70 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
            />
            <label
              htmlFor="priorityOnly"
              className="text-xs text-foreground cursor-pointer select-none flex items-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>ذات أولوية فقط</span>
            </label>
          </div>
        </div>

        {/* Assignment */}
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-muted-foreground">
            تعيين لـ
          </label>
          <select
            value={filters.assignedTo}
            onChange={(e) => handleChange("assignedTo", e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-background border border-border/70 text-foreground rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
          >
            <option value="all">الكل</option>
            <option value="me">محادثاتي ({user?.firstName || "أنا"})</option>
            <option value="unassigned">غير معين</option>
          </select>
        </div>

        {/* Date Range - Start */}
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-muted-foreground">
            من تاريخ
          </label>
          <input
            type="date"
            value={
              filters.startDate
                ? filters.startDate.toISOString().split("T")[0]
                : ""
            }
            onChange={(e) =>
              handleChange(
                "startDate",
                e.target.value ? new Date(e.target.value) : null,
              )
            }
            className="w-full px-3 py-1.5 text-xs bg-background border border-border/70 text-foreground rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all font-mono tabular-nums"
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        {/* Date Range - End */}
        <div className="space-y-1">
          <label className="block text-[11px] font-medium text-muted-foreground">
            إلى تاريخ
          </label>
          <input
            type="date"
            value={
              filters.endDate
                ? filters.endDate.toISOString().split("T")[0]
                : ""
            }
            onChange={(e) =>
              handleChange(
                "endDate",
                e.target.value ? new Date(e.target.value) : null,
              )
            }
            className="w-full px-3 py-1.5 text-xs bg-background border border-border/70 text-foreground rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all font-mono tabular-nums"
            min={
              filters.startDate
                ? filters.startDate.toISOString().split("T")[0]
                : undefined
            }
            max={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      {/* Reset Action */}
      <div className="flex justify-end mt-3 pt-2.5 border-t border-border/50">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>إعادة تعيين الفلاتر</span>
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
