import { useTranslation } from "react-i18next";
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
        "relative flex flex-col p-5 rounded-2xl text-right h-full",
        "bg-card text-card-foreground",
        "border border-border/50 shadow-sm",
        "transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group",
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110"
          style={{ background: `color-mix(in srgb, ${widget.color} 14%, transparent)` }}
        >
          <Icon className="w-5 h-5" style={{ color: widget.color }} />
        </div>
        {data?.status && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
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
            {t(data.statusLabel || `widgets.status.${data.status}`)}
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-3">
        {t(widget.titleKey)}
      </h3>

      {data?.metrics && data.metrics.length > 0 ? (
        <div className="space-y-2.5 mt-auto">
          {data.metrics.slice(0, 3).map((m, i) => (
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
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">{t("companyDashboard.widgets.noData")}</span>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border/20">
        <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          {t("companyDashboard.widgets.viewAll")} →
        </span>
      </div>
    </button>
  );
}
