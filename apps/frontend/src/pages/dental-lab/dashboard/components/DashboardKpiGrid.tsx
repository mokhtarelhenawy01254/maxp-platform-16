import { ExternalLink } from "lucide-react";
import { type DashboardKpiCardItem } from "../types/dashboardTypes";

interface DashboardKpiGridProps {
  cards: DashboardKpiCardItem[];
}

export function DashboardKpiGrid({ cards }: DashboardKpiGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {cards.map((c) => (
        <div
          key={c.id}
          role="button"
          tabIndex={0}
          onClick={c.onClick}
          onKeyDown={(e) =>
            (e.key === "Enter" || e.key === " ") && c.onClick()
          }
          title={c.tooltip}
          className="group flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200"
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.bg} ${c.tone} group-hover:scale-105 transition-transform`}
          >
            {c.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center justify-between">
              <span>{c.label}</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </p>
            <p
              className={`text-xl font-bold truncate font-mono tabular-nums ${c.tone}`}
            >
              {c.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default DashboardKpiGrid;
