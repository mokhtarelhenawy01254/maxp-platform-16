import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import { PRESET_PERIODS } from "../../utils/overviewStatsHelpers";

export interface OverviewPeriodSelectorProps {
  period: string;
  periodLabel: string;
  customStart: string;
  customEnd: string;
  onPeriodChange: (val: string) => void;
  onCustomStartChange: (val: string) => void;
  onCustomEndChange: (val: string) => void;
}

const dateInputClass =
  "rounded-xl border border-border/70 bg-background px-2.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all";

export const OverviewPeriodSelector: React.FC<OverviewPeriodSelectorProps> = ({
  period,
  periodLabel,
  customStart,
  customEnd,
  onPeriodChange,
  onCustomStartChange,
  onCustomEndChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 lg:border-t-0 lg:border-r lg:pt-0 lg:pr-3">
      {period === "custom" && (
        <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className={dateInputClass}
            aria-label={t("orders.overviewFrom", { defaultValue: "من" })}
          />
          <span className="text-xs text-muted-foreground">
            {t("orders.overviewTo", { defaultValue: "إلى" })}
          </span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className={dateInputClass}
            aria-label={t("orders.overviewTo", { defaultValue: "إلى" })}
          />
        </div>
      )}

      <div
        className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-xl border border-border/70 bg-muted/20 p-1 sm:w-auto"
        role="tablist"
        aria-label={periodLabel}
      >
        {PRESET_PERIODS.map((p) => {
          const isActive = period === p.value;
          return (
            <button
              key={p.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onPeriodChange(p.value)}
              className={`min-h-[28px] sm:min-h-[30px] flex-shrink-0 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold transition-all active:scale-95 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t(`orders.${p.labelKey}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewPeriodSelector;
