import React from "react";
import { useTranslation } from "react-i18next";
import { getStatusDisplay } from "../../../../utils/statusRegistry";

interface BulkOrderStatsGridProps {
  status: string;
  totalOrders: number;
  progress: number;
  createdByName?: string;
  description?: string;
}

export const BulkOrderStatsGrid: React.FC<BulkOrderStatsGridProps> = ({
  status,
  totalOrders,
  progress,
  createdByName,
  description,
}) => {
  const { t } = useTranslation();
  const info = getStatusDisplay(status);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl p-3.5 border border-border/70 shadow-xs space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {t("orders.bulkStatus")}
          </p>
          <div className="pt-0.5">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${info.colorClass}`}>
              {t(info.labelKey) || info.label}
            </span>
          </div>
        </div>

        <div className="bg-card rounded-xl p-3.5 border border-border/70 shadow-xs space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {t("orders.bulkTotalOrders")}
          </p>
          <p className="text-xl font-bold font-mono tabular-nums text-foreground">
            {totalOrders}
          </p>
        </div>

        <div className="bg-card rounded-xl p-3.5 border border-border/70 shadow-xs space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {t("orders.bulkProgress")}
          </p>
          <div className="pt-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress === 100 ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs font-bold font-mono tabular-nums text-foreground">
              {progress}%
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl p-3.5 border border-border/70 shadow-xs space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {t("orders.bulkCreatedBy")}
          </p>
          <p className="text-sm font-semibold text-foreground truncate mt-0.5">
            {createdByName || "—"}
          </p>
        </div>
      </div>

      {description && (
        <div className="bg-card rounded-xl p-3.5 border border-border/70 shadow-xs">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {t("orders.bulkDescriptionLabel")}
          </p>
          <p className="text-xs text-foreground leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
