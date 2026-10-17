import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, RotateCw, List, Table as TableIcon } from "lucide-react";

interface ActivityLogHeaderProps {
  totalCount: number;
  loading: boolean;
  viewMode: "timeline" | "table";
  setViewMode: (mode: "timeline" | "table") => void;
  onRefresh: () => void;
}

export const ActivityLogHeader: React.FC<ActivityLogHeaderProps> = ({
  totalCount,
  loading,
  viewMode,
  setViewMode,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const rawTitle = t("orders.activityLogTitle");
  const title = !rawTitle || rawTitle === "orders.activityLogTitle" ? "سجل نشاط الطلبات" : rawTitle;

  const rawSubtitle = t("orders.activityLogSubtitle");
  const subtitle =
    !rawSubtitle || rawSubtitle === "orders.activityLogSubtitle"
      ? "متابعة شاملة لجميع الحركات وتغييرات الحالات الصادرة عن الموظفين والأنظمة الآلية"
      : rawSubtitle;

  return (
    <div className="border-b border-border/70 bg-card/60 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              {title}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-semibold bg-muted border border-border/70 text-muted-foreground">
              {totalCount.toLocaleString("ar-EG")} حركة
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-start sm:self-auto">
        {/* View Mode Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/70">
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "timeline"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>مسار زمني</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === "table"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>جدول</span>
          </button>
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="تحديث الحركات"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          <span className="hidden sm:inline">تحديث</span>
        </button>
      </div>
    </div>
  );
};
