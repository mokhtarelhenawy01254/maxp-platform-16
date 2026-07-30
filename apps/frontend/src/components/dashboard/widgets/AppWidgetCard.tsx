import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import type { WidgetDefinition, WidgetData } from "./types";

type Props = {
  widget: WidgetDefinition;
  data: WidgetData | null;
};

export function AppWidgetCard({ widget, data }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Icon = widget.icon;

  return (
    <button
      type="button"
      onClick={() => navigate(widget.href)}
      className={cn(
        "relative flex flex-col p-5 rounded-2xl text-start h-full w-full",
        "bg-card text-card-foreground",
        "border border-border/50 shadow-sm",
        "transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group",
      )}
    >
      {data?.status && (
        <span
          className={cn(
            "absolute top-3 end-3 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium",
            data.status === "active" && "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            data.status === "warning" && "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
            data.status === "error" && "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
            data.status === "inactive" && "bg-gray-100 dark:bg-gray-500/10 text-gray-500 dark:text-gray-400",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              data.status === "active" && "bg-emerald-500",
              data.status === "warning" && "bg-amber-500",
              data.status === "error" && "bg-rose-500",
              data.status === "inactive" && "bg-gray-400",
            )}
          />
          {t(data.statusLabel || `companyDashboard.widgets.status.${data.status}`)}
        </span>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-2.5 rounded-xl shrink-0 transition-all duration-300 group-hover:scale-105"
          style={{ background: `color-mix(in srgb, ${widget.color} 14%, transparent)` }}
        >
          <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" style={{ color: widget.color }} />
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          {t(widget.titleKey)}
        </h3>
      </div>

      {data?.metrics && data.metrics.length > 0 ? (
        <div className="space-y-2.5 mt-auto">
          {data.metrics.filter((m) => m.value !== "0" && m.value !== "—").slice(0, 2).map((m, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{t(m.label)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tabular-nums text-foreground">{m.value}</span>
                {m.trend && (
                  <span
                    className={cn(
                      "text-[10px] font-semibold",
                      m.trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {m.trend.value}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </button>
  );
}
