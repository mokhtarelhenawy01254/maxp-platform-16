import React from "react";
import { cn } from "../../lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "yellow" | "red" | "gray";
  className?: string;
}

const colorStyles: Record<
  "blue" | "green" | "yellow" | "red" | "gray",
  { text: string; bg: string; border: string }
> = {
  blue: {
    text: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
  green: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  yellow: {
    text: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  red: {
    text: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
  },
  gray: {
    text: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border/60",
  },
};

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
  className = "",
}) => {
  const currentTone = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-2xs transition-colors hover:border-border text-foreground space-y-3",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <h4 className="text-xs font-semibold tracking-tight text-muted-foreground">
          {title}
        </h4>
        {icon && (
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-xl border shadow-2xs",
              currentTone.bg,
              currentTone.border,
              currentTone.text,
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className="font-mono text-2xl font-bold tracking-tight text-foreground tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground/80 leading-normal">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
