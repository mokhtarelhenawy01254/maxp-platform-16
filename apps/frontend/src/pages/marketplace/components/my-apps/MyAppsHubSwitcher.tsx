import React from "react";
import { cn } from "@/lib/utils";
import { SYSTEM_HUBS, type SystemHub } from "@/utils/marketplaceSystems";

interface MyAppsHubSwitcherProps {
  selectedHub: string;
  recommendedHub: SystemHub | null;
  hubCounts: Record<string, number>;
  onSelectHub: (hubId: string) => void;
}

export const MyAppsHubSwitcher: React.FC<MyAppsHubSwitcherProps> = ({
  selectedHub,
  recommendedHub,
  hubCounts,
  onSelectHub,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 border-b border-border/20">
      {SYSTEM_HUBS.map((hub) => {
        const HubIcon = hub.icon;
        const active = selectedHub === hub.id;
        const isRecommended = recommendedHub?.id === hub.id;
        const count = hubCounts[hub.id] ?? 0;

        return (
          <button
            key={hub.id}
            type="button"
            onClick={() => onSelectHub(hub.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 shrink-0",
              active
                ? "bg-foreground text-background shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
            )}
          >
            <HubIcon size={14} className={active ? "text-background" : "text-primary"} />
            <span>{hub.nameAr}</span>
            <span
              className={cn(
                "text-[10px] tabular-nums font-mono px-1.5 py-0.2 rounded-full",
                active ? "bg-background/20 text-background font-semibold" : "bg-muted text-muted-foreground"
              )}
            >
              {count}
            </span>
            {isRecommended && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                موصى به
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
