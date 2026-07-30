import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { cn } from "../../../lib/utils";
import type { WidgetDefinition, WidgetData } from "./types";

type Props = {
  widget: WidgetDefinition;
  data: WidgetData | null;
};

export function AppWidgetMini({ widget, data }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Icon = widget.icon;

  if (!data || !data.metrics || data.metrics.length === 0) return null;
  const firstMetric = data.metrics[0];
  if (!firstMetric) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(widget.href)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl text-start w-full",
        "bg-card border border-border/50 shadow-sm",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-primary/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group",
      )}
    >
      <div
        className="p-2 rounded-lg shrink-0 transition-all duration-300 group-hover:scale-105"
        style={{ background: `color-mix(in srgb, ${widget.color} 14%, transparent)` }}
      >
        <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" style={{ color: widget.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {data.status && (
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                data.status === "active" && "bg-emerald-500",
                data.status === "warning" && "bg-amber-500",
                data.status === "error" && "bg-rose-500",
                data.status === "inactive" && "bg-gray-400",
              )}
            />
          )}
          <span className="text-xs font-semibold text-foreground block truncate">
            {t(widget.titleKey)}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground block mt-0.5">
          {t(firstMetric.label)}: {firstMetric.value}
        </span>
      </div>
    </button>
  );
}
