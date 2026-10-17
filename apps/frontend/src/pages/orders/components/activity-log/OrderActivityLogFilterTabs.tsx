import React from "react";

export type ActivityFilter = "all" | "status" | "products" | "customer" | "notes";

interface FilterTab {
  id: ActivityFilter;
  label: string;
  count: number;
}

interface OrderActivityLogFilterTabsProps {
  tabs: FilterTab[];
  activeFilter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
}

export const OrderActivityLogFilterTabs: React.FC<OrderActivityLogFilterTabsProps> = ({
  tabs,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="flex gap-1.5 mb-4 border-b border-border/70 pb-2.5 overflow-x-auto no-scrollbar -mx-1 px-1">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onFilterChange(tab.id)}
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-medium ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums font-bold ${
                isActive
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-background text-muted-foreground border border-border/70"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
