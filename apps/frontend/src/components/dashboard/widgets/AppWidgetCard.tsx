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
        "relative flex flex-col p-4 sm:p-5 rounded-2xl text-start h-full w-full",
        "bg-card text-card-foreground",
        "border border-border/70 shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]",
        "transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group",
      )}
    >
      {data?.status && (
        <span
          className={cn(
            "absolute top-3 end-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
            data.status === "active" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
            data.status === "warning" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            data.status === "error" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
            data.status === "inactive" && "bg-muted text-muted-foreground border-border/50",
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              data.status === "active" && "bg-emerald-500",
              data.status === "warning" && "bg-amber-500",
              data.status === "error" && "bg-rose-500",
              data.status === "inactive" && "bg-muted-foreground/60",
            )}
          />
          {t(data.statusLabel || `companyDashboard.widgets.status.${data.status}`)}
        </span>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-2.5 rounded-xl shrink-0 transition-all duration-200 group-hover:scale-105 border border-black/5 dark:border-white/10"
          style={{ background: `color-mix(in srgb, ${widget.color} 14%, transparent)` }}
        >
          <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" style={{ color: widget.color }} />
        </div>
        <h3 className="text-sm font-bold tracking-tight text-foreground">
          {t(widget.titleKey)}
        </h3>
      </div>

      {data?.metrics && data.metrics.length > 0 ? (
        <div className="space-y-2 mt-auto pt-2 border-t border-border/40">
          {data.metrics.filter((m) => m.value !== "0" && m.value !== "—").slice(0, 2).map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-medium text-muted-foreground">{t(m.label)}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black font-mono tabular-nums text-foreground">{m.value}</span>
                {m.trend && (
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums",
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
