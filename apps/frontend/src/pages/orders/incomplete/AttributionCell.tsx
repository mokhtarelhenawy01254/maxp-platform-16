import React from "react";
import type { OrderAttributionData } from "../types";

export const AttributionCell: React.FC<{
  attribution?: OrderAttributionData | null;
}> = ({ attribution }) => {
  if (!attribution) {
    return <span className="text-xs text-muted-foreground/60">—</span>;
  }

  const sourceLabel = (value?: string) =>
    value === "audience_network" || value === "audience-network"
      ? "Audience Network"
      : value;
  const sourceMedium = [sourceLabel(attribution.source), attribution.medium]
    .filter(Boolean)
    .join(" / ");
  const campaignLabel = attribution.campaignName || attribution.campaignId;

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {attribution.platform && (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
            {attribution.platform}
          </span>
        )}
        {sourceMedium && (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {sourceMedium}
          </span>
        )}
      </div>
      {campaignLabel && (
        <span
          className="inline-flex max-w-[170px] items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
          title={campaignLabel}
        >
          <span className="truncate">{campaignLabel}</span>
        </span>
      )}
    </div>
  );
};

export default AttributionCell;
