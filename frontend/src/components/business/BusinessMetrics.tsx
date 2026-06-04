import React from "react";

import { cn } from "../../lib/utils";

export type BusinessMetricTone =
  | "primary"
  | "secondary"
  | "warning"
  | "success";

interface BusinessMetricCardProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  tone: BusinessMetricTone;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  compact?: boolean;
  onClick?: () => void;
}

interface BusinessMetricsStripProps {
  items: BusinessMetricCardProps[];
  mobileLayout?: "rail" | "grid";
  mobileDensity?: "regular" | "compact";
}

export const BusinessMetricCard: React.FC<BusinessMetricCardProps> = ({
  title,
  value,
  subtitle,
  tone,
  icon: Icon,
  compact = false,
  onClick,
}) => {
  return (
    <div
      className={cn(
        "business-metric-card",
        compact && "gap-3 p-3 md:gap-[0.9rem] md:p-[1rem]",
        onClick && "cursor-pointer hover:bg-accent/50 transition-all",
      )}
      data-tone={tone}
      onClick={onClick}
    >
      <div className="business-metric-head">
        <div className="min-w-0">
          <p
            className={cn(
              "text-sm text-muted-foreground",
              compact && "text-[0.72rem] md:text-sm",
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight text-foreground",
              compact && "text-xl md:text-2xl",
            )}
          >
            {value}
          </p>
        </div>
        <div className="business-metric-icon">
          <Icon className="size-5" />
        </div>
      </div>
      <p
        className={cn(
          "text-xs leading-6 text-muted-foreground",
          compact && "hidden md:block",
        )}
      >
        {subtitle}
      </p>
    </div>
  );
};

export const BusinessMetricsStrip: React.FC<BusinessMetricsStripProps> = ({
  items,
  mobileLayout = "rail",
  mobileDensity = "regular",
}) => {
  if (items.length === 0) {
    return null;
  }

  const usesMobileGrid = mobileLayout === "grid";
  const usesCompactMobileDensity = mobileDensity === "compact";

  return (
    <div
      className={cn(
        usesMobileGrid
          ? "grid grid-cols-2 gap-2.5 md:grid-cols-2 md:gap-4 xl:grid-cols-4"
          : "flex gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4",
      )}
    >
      {items.map((item) => (
        <div
          key={item.title}
          className={cn(
            usesMobileGrid ? "min-w-0" : "min-w-[15rem] shrink-0 md:min-w-0",
          )}
        >
          <BusinessMetricCard {...item} compact={usesCompactMobileDensity} />
        </div>
      ))}
    </div>
  );
};
