import React, { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/marketplace";
import type { MarketplaceApp } from "@/types/marketplace";
import { groupAppsByHub, type HubAppSection } from "@/utils/marketplaceSystems";

interface MarketplaceAppsGridProps {
  displayedApps: MarketplaceApp[];
  selectedCategory: string;
  searchQuery: string;
  viewMode: "grid" | "list";
  hasMoreApps: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onResetFilters: () => void;
}

export function MarketplaceAppsGrid({
  displayedApps,
  selectedCategory,
  searchQuery,
  viewMode,
  hasMoreApps,
  sentinelRef,
  onResetFilters,
}: MarketplaceAppsGridProps) {
  const { t } = useTranslation();

  if (displayedApps.length === 0) {
    return (
      <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-border/50 my-6 bg-card/40">
        <div className="mx-auto size-14 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground/60 mb-3">
          <Package size={28} />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">
          {searchQuery ? t("marketplace.noSearchResults", { query: searchQuery }) : t("marketplace.emptySearchTitle")}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
          {t("marketplace.emptyHint")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl text-xs font-bold"
          onClick={onResetFilters}
        >
          <X size={13} />
          {t("marketplace.clearAllFilters")}
        </Button>
      </div>
    );
  }

  if (selectedCategory) {
    /* Flat layout when a specific category is selected */
    return (
      <div className="mt-4">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {displayedApps.map((app) => (
              <AppCard key={app.id} app={app} variant="default" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayedApps.map((app) => (
              <AppCard key={app.id} app={app} variant="horizontal" />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className={hasMoreApps ? "h-6" : "hidden"} />
        {!hasMoreApps && displayedApps.length > 0 && (
          <p className="mt-10 text-center text-xs text-muted-foreground/60">{t("marketplace.allLoaded")}</p>
        )}
      </div>
    );
  }

  /* Grouped layout when viewing all categories — sections = system hubs */
  return (
    <div className="space-y-7 mt-4">
      {groupAppsByHub(displayedApps).map((section: HubAppSection) => {
        const HubIcon = section.icon;
        return (
          <div key={section.id}>
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-border/25">
              <div className="flex items-center gap-2">
                <HubIcon size={15} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">{section.nameAr}</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground tabular-nums font-mono">
                  {section.apps.length}
                </span>
              </div>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
                {section.apps.map((app) => (
                  <AppCard key={app.id} app={app} variant="default" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {section.apps.map((app) => (
                  <AppCard key={app.id} app={app} variant="horizontal" />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div ref={sentinelRef} className={hasMoreApps ? "h-6" : "hidden"} />
      {!hasMoreApps && displayedApps.length > 0 && (
        <p className="mt-10 text-center text-xs text-muted-foreground/60">{t("marketplace.allLoaded")}</p>
      )}
    </div>
  );
}
