import React from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { categoryIcons } from "@/utils/marketplace";
import { CATEGORY_CONFIG } from "../../types/myAppsTypes";
import type { InstalledApp } from "@/types/marketplace";
import { getAppSystemHub } from "@/utils/marketplaceSystems";

interface MyAppsCategoryPillsProps {
  availableCategories: string[];
  categoryFilter: string;
  onCategoryFilterChange: (cat: string) => void;
  selectedHub: string;
  apps: InstalledApp[];
  hubCounts: Record<string, number>;
}

export const MyAppsCategoryPills: React.FC<MyAppsCategoryPillsProps> = ({
  availableCategories,
  categoryFilter,
  onCategoryFilterChange,
  selectedHub,
  apps,
  hubCounts,
}) => {
  if (availableCategories.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
      <button
        type="button"
        onClick={() => onCategoryFilterChange("ALL")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
          categoryFilter === "ALL"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
        )}
      >
        <span>كل الأقسام</span>
        <span
          className={cn(
            "text-[10px] tabular-nums font-mono px-1.5 py-0.2 rounded-full",
            categoryFilter === "ALL"
              ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
              : "bg-muted text-muted-foreground"
          )}
        >
          {selectedHub === "ALL" ? apps.length : hubCounts[selectedHub] ?? 0}
        </span>
      </button>

      {availableCategories.map((cat) => {
        const conf = CATEGORY_CONFIG[cat];
        const label = conf?.labelAr || cat;
        const active = categoryFilter === cat;
        const Icon = categoryIcons[cat] || Package;
        const count = apps.filter((a) => {
          if ((a.app?.category || "").toUpperCase() !== cat) return false;
          if (selectedHub !== "ALL") {
            const hub = getAppSystemHub(a.app as any);
            if (hub.id !== selectedHub) return false;
          }
          return true;
        }).length;

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onCategoryFilterChange(active ? "ALL" : cat)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
            )}
          >
            <Icon size={13} className="shrink-0" />
            <span>{label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "text-[10px] tabular-nums font-mono px-1.5 py-0.2 rounded-full",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
