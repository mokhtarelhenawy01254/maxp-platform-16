import { useTranslation } from "react-i18next";
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

  return (
    <button
      type="button"
      onClick={() => navigate(widget.href)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl text-right",
        "bg-card border border-border/50 shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "group",
      )}
    >
      <div
        className="p-2 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ background: `color-mix(in srgb, ${widget.color} 14%, transparent)` }}
      >
        <Icon className="w-4 h-4" style={{ color: widget.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-foreground block truncate">
          {t(widget.titleKey)}
        </span>
        {data?.metrics?.[0] && (
          <span className="text-[11px] text-muted-foreground">
            {data.metrics[0].value}
          </span>
        )}
      </div>
    </button>
  );
}
