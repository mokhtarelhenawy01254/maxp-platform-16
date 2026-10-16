import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { Sparkline } from "./Sparkline";

interface BaseMetricProps {
  label: string;
  value: string;
  isRtl: boolean;
  onClick?: () => void;
}

interface MetricWithSparkline extends BaseMetricProps {
  variant: "sparkline";
  sparklineData: number[];
  accentColor: string;
}

interface MetricWithTrend extends BaseMetricProps {
  variant: "trend";
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
}

interface MetricWithBar extends BaseMetricProps {
  variant: "bar";
  progress: number;
  accentColor?: string;
}

interface MetricSimple extends BaseMetricProps {
  variant: "simple";
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { value: string; positive: boolean };
}

type MetricCardProps = MetricWithSparkline | MetricWithTrend | MetricWithBar | MetricSimple;

const accentColors: Record<string, { bg: string; text: string; sparkline: string }> = {
  emerald: { bg: "from-emerald-500 to-emerald-400", text: "text-emerald-600 dark:text-emerald-400", sparkline: "var(--color-success)" },
  blue: { bg: "from-primary to-primary/80", text: "text-primary", sparkline: "var(--color-primary)" },
  violet: { bg: "from-purple-500 to-purple-400", text: "text-purple-600 dark:text-purple-400", sparkline: "var(--color-primary)" },
  amber: { bg: "from-amber-500 to-amber-400", text: "text-amber-600 dark:text-amber-400", sparkline: "var(--color-warning)" },
  cyan: { bg: "from-cyan-500 to-cyan-400", text: "text-cyan-600 dark:text-cyan-400", sparkline: "var(--color-primary)" },
  rose: { bg: "from-rose-500 to-rose-400", text: "text-rose-600 dark:text-rose-400", sparkline: "var(--color-destructive)" },
};

export function MetricCard(props: MetricCardProps) {
  const { label, value, variant, isRtl, onClick } = props;

  if (variant === "sparkline") {
    const p = props as MetricWithSparkline;
    const palette = accentColors[p.accentColor] ?? accentColors.emerald;
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex flex-col p-4 rounded-xl text-right col-span-1 row-span-1 h-full cursor-pointer",
          "bg-card text-card-foreground",
          "border border-border/70",
          "shadow-xs hover:border-border hover:shadow-sm",
          "transition-all duration-200 ease-out hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "group",
        )}
      >
        <span className="text-xs font-medium text-muted-foreground mb-1">
          {label}
        </span>
        <span className={cn(
          "text-2xl font-mono tabular-nums font-bold tracking-tight",
          palette.text,
        )}>
          {value}
        </span>
        <div className="mt-2.5 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
          <Sparkline
            data={p.sparklineData}
            stroke={palette.sparkline}
            fill={palette.sparkline}
          />
        </div>
      </button>
    );
  }

  if (variant === "bar") {
    const p = props as MetricWithBar;
    const palette = accentColors[p.accentColor ?? "emerald"];
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex flex-col p-4 rounded-xl text-right h-full cursor-pointer",
          "bg-card text-card-foreground",
          "border border-border/70",
          "shadow-xs hover:border-border hover:shadow-sm",
          "transition-all duration-200 ease-out hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        <span className="text-xs font-medium text-muted-foreground mb-1">
          {label}
        </span>
        <span className={cn(
          "text-2xl font-mono tabular-nums font-bold tracking-tight",
          palette.text,
        )}>
          {value}
        </span>
        <div className="mt-3.5 h-1.5 rounded-full bg-muted/60 overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out", palette.bg)}
            style={{ width: `${Math.min(p.progress, 100)}%` }}
          />
        </div>
      </button>
    );
  }

  if (variant === "trend") {
    const p = props as MetricWithTrend;
    const Icon = p.icon;
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative flex flex-col p-4 rounded-xl text-right h-full cursor-pointer",
          "bg-card text-card-foreground",
          "border border-border/70",
          "shadow-xs hover:border-border hover:shadow-sm",
          "transition-all duration-200 ease-out hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "group",
        )}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="p-2 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
          </div>
          {p.trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-semibold border",
                p.trend.positive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
              )}
              dir={isRtl ? "rtl" : "ltr"}
            >
              {p.trend.positive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {p.trend.value}
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground mb-1">
          {label}
        </span>
        <span className="text-2xl font-mono tabular-nums font-bold tracking-tight text-foreground">
          {value}
        </span>
      </button>
    );
  }

  const p = props as MetricSimple;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-row items-center gap-3.5 p-3.5 rounded-xl text-right h-full cursor-pointer",
        "bg-card text-card-foreground",
        "border border-border/70",
        "shadow-xs hover:border-border hover:shadow-sm",
        "transition-all duration-200 ease-out hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      {p.icon && (
        <div className="p-2 rounded-lg bg-muted/50 shrink-0">
          <p.icon className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground block">{label}</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-lg font-mono tabular-nums font-bold tracking-tight text-foreground">
            {value}
          </span>
          {p.trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-semibold border",
                p.trend.positive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
              )}
              dir={isRtl ? "rtl" : "ltr"}
            >
              {p.trend.positive ? (
                <ArrowUpRight className="w-2.5 h-2.5" />
              ) : (
                <ArrowDownRight className="w-2.5 h-2.5" />
              )}
              {p.trend.value}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
