import type { DashboardMetricRailProps } from "./types";
import DashboardSurfaceCard from "./DashboardSurfaceCard";

export default function DashboardMetricRail({
  description,
  items,
  title,
}: DashboardMetricRailProps) {
  return (
    <DashboardSurfaceCard>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 transition-colors hover:bg-muted/30"
              onClick={item.onClick}
              role={item.onClick ? "button" : undefined}
              tabIndex={item.onClick ? 0 : undefined}
              onKeyDown={
                item.onClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        item.onClick?.();
                      }
                    }
                  : undefined
              }
            >
              {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
              <span className="font-semibold tabular-nums">{item.value}</span>
              <span className="text-center text-[10px] text-muted-foreground">
                {item.title}
              </span>
            </div>
          );
        })}
      </div>
    </DashboardSurfaceCard>
  );
}
