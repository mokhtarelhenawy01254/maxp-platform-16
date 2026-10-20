import React from "react";
import { cn } from "@/lib/utils";
import { SYSTEM_HUBS } from "@/utils/marketplaceSystems";
import type { MarketplaceApp } from "@/types/marketplace";

interface MarketplaceHubsBarProps {
  apps: MarketplaceApp[];
  selectedSystemHub: string;
  onSelectHub: (hubId: string) => void;
  recommendedHubId?: string;
}

export function MarketplaceHubsBar({
  apps,
  selectedSystemHub,
  onSelectHub,
  recommendedHubId,
}: MarketplaceHubsBarProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 mb-3 border-b border-border/20 pe-1">
      {SYSTEM_HUBS.map((hub) => {
        const Icon = hub.icon;
        const active = hub.id === selectedSystemHub;
        const isRecommended = recommendedHubId === hub.id;
        const hubAppCount =
          hub.id === "ALL"
            ? apps.length
            : apps.filter((a) => hub.categories.includes((a.category || "").toUpperCase())).length;

        return (
          <button
            key={hub.id}
            type="button"
            onClick={() => onSelectHub(hub.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30",
            )}
          >
            <Icon size={14} className={active ? "text-primary-foreground" : "text-primary"} />
            <span>{hub.nameAr}</span>
            <span
              className={cn(
                "text-[10px] tabular-nums font-mono px-1.5 py-0.2 rounded-full",
                active
                  ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {hubAppCount}
            </span>
            {isRecommended && !active && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                موصى به
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
