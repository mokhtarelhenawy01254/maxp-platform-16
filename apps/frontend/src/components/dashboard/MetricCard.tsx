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
}

type MetricCardProps = MetricWithSparkline | MetricWithTrend | MetricWithBar | MetricSimple;

const accentColors: Record<string, { bg: string; text: string; sparkline: string }> = {
  emerald: { bg: "from-emerald-500 to-emerald-400", text: "text-emerald-600 dark:text-emerald-400", sparkline: "var(--color-success)" },
  blue: { bg: "from-blue-500 to-blue-400", text: "text-blue-600 dark:text-blue-400", sparkline: "var(--color-primary)" },
  violet: { bg: "from-violet-500 to-violet-400", text: "text-violet-600 dark:text-violet-400", sparkline: "var(--color-primary)" },
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
          "relative flex flex-col p-5 rounded-2xl text-right col-span-1 row-span-1",
          "bg-card text-card-foreground",
          "border border-border/50",
          "shadow-sm hover:shadow-md",
          "transition-all duration-500 ease-out hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "group",
        )}
      >
        <span className="text-[13px] font-medium text-muted-foreground mb-0.5">
          {label}
        </span>
        <span className={cn(
          "text-2xl sm:text-[28px] font-bold tabular-nums tracking-tight",
          palette.text,
        )}>
          {value}
        </span>
        <div className="mt-2 opacity-50 group-hover:opacity-100 transition-opacity duration-500">
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
          "relative flex flex-col p-5 rounded-2xl text-right",
          "bg-card text-card-foreground",
          "border border-border/50",
          "shadow-sm hover:shadow-md",
          "transition-all duration-500 ease-out hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <span className="text-[13px] font-medium text-muted-foreground mb-0.5">
          {label}
        </span>
        <span className={cn(
          "text-2xl sm:text-[28px] font-bold tabular-nums tracking-tight",
          palette.text,
        )}>
          {value}
        </span>
        <div className="mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out", palette.bg)}
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
          "relative flex flex-col p-5 rounded-2xl text-right",
          "bg-card text-card-foreground",
          "border border-border/50",
          "shadow-sm hover:shadow-md",
          "transition-all duration-500 ease-out hover:-translate-y-0.5",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "group",
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 rounded-xl bg-muted/20 group-hover:bg-muted/40 transition-colors duration-300">
            {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
          </div>
          {p.trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold",
                p.trend.positive
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
              )}
              dir={isRtl ? "rtl" : "ltr"}
            >
              <svg
                className={cn("w-3 h-3", p.trend.positive ? "" : "rotate-180")}
                viewBox="0 0 12 12"
                fill="none"
              >
                <path d="M6 2L10 7H2L6 2Z" fill="currentColor" />
              </svg>
              {p.trend.value}
            </span>
          )}
        </div>
        <span className="text-[13px] font-medium text-muted-foreground mb-0.5">
          {label}
        </span>
        <span className="text-2xl sm:text-[28px] font-bold tabular-nums tracking-tight text-foreground">
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
        "relative flex flex-row items-center gap-4 p-4 rounded-2xl text-right",
        "bg-card text-card-foreground",
        "border border-border/50",
        "shadow-sm hover:shadow-md",
        "transition-all duration-500 ease-out hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      {p.icon && (
        <div className="p-2.5 rounded-xl bg-muted/20 shrink-0">
          <p.icon className="w-5 h-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-muted-foreground block">{label}</span>
        <span className="text-lg font-bold tabular-nums tracking-tight text-foreground">
          {value}
        </span>
      </div>
    </button>
  );
}
