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

const toneStyles: Record<
  BusinessMetricTone,
  { iconBg: string; iconColor: string; borderFocus: string }
> = {
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    borderFocus: "hover:border-primary/40",
  },
  secondary: {
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-500",
    borderFocus: "hover:border-sky-500/40",
  },
  warning: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    borderFocus: "hover:border-amber-500/40",
  },
  success: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    borderFocus: "hover:border-emerald-500/40",
  },
};

export const BusinessMetricCard: React.FC<BusinessMetricCardProps> = ({
  title,
  value,
  subtitle,
  tone,
  icon: Icon,
  compact = false,
  onClick,
}) => {
  const currentTone = toneStyles[tone] || toneStyles.primary;

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-none transition-all duration-160",
        compact && "gap-2 p-2.5 md:p-3",
        onClick
          ? "cursor-pointer hover:bg-muted/20 active:scale-[0.99] " + currentTone.borderFocus
          : "hover:border-border",
      )}
      data-tone={tone}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-xs font-medium text-muted-foreground",
              compact && "text-[11px]",
            )}
          >
            {title}
          </p>
          <div
            className={cn(
              "mt-1 font-mono text-xl font-semibold tracking-tight text-foreground tabular-nums",
              compact && "text-lg md:text-xl",
            )}
          >
            {value}
          </div>
        </div>
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/40 transition-colors",
            currentTone.iconBg,
            currentTone.iconColor,
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <p
        className={cn(
          "mt-2 text-[11px] leading-relaxed text-muted-foreground/80",
          compact && "hidden md:block md:text-[11px]",
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
          ? "grid grid-cols-2 gap-2.5 md:grid-cols-2 md:gap-3.5 xl:grid-cols-4"
          : "flex gap-2.5 overflow-x-auto pb-1 scrollbar-none md:grid md:grid-cols-2 md:gap-3.5 md:overflow-visible xl:grid-cols-4",
      )}
    >
      {items.map((item) => (
        <div
          key={item.title}
          className={cn(
            usesMobileGrid ? "min-w-0" : "min-w-[14.5rem] shrink-0 md:min-w-0",
          )}
        >
          <BusinessMetricCard {...item} compact={usesCompactMobileDensity} />
        </div>
      ))}
    </div>
  );
};
