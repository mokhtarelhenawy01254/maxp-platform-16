import React from "react";

const variants = {
  default: {
    container:
      "border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-slate-900",
    iconBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    label: "text-slate-500 dark:text-slate-400",
    value: "text-slate-950 dark:text-white",
    glow: "from-slate-500/5 to-transparent",
  },
  spend: {
    container:
      "border-blue-200/80 bg-gradient-to-br from-blue-50/60 via-white to-white dark:border-blue-900/40 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900",
    iconBg: "bg-blue-500/15 text-blue-600 dark:bg-blue-400/20 dark:text-blue-300",
    label: "text-blue-700 dark:text-blue-300",
    value: "text-slate-950 dark:text-white",
    glow: "from-blue-500/10 to-transparent",
  },
  purchases: {
    container:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900",
    iconBg:
      "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-slate-950 dark:text-white",
    glow: "from-emerald-500/10 to-transparent",
  },
  results: {
    container:
      "border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900",
    iconBg:
      "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-300",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-slate-950 dark:text-white",
    glow: "from-emerald-500/10 to-transparent",
  },
  roas: {
    container:
      "border-violet-200/80 bg-gradient-to-br from-violet-50/60 via-white to-white dark:border-violet-900/40 dark:from-violet-950/20 dark:via-slate-900 dark:to-slate-900",
    iconBg:
      "bg-violet-500/15 text-violet-600 dark:bg-violet-400/20 dark:text-violet-300",
    label: "text-violet-700 dark:text-violet-300",
    value: "text-slate-950 dark:text-white",
    glow: "from-violet-500/10 to-transparent",
  },
  cpa: {
    container:
      "border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-white dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900",
    iconBg:
      "bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-300",
    label: "text-amber-700 dark:text-amber-300",
    value: "text-slate-950 dark:text-white",
    glow: "from-amber-500/10 to-transparent",
  },
};

export default function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  delta,
  badge,
  subtitle,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "spend" | "purchases" | "results" | "roas" | "cpa" | string;
  delta?: { text: string; isPositive?: boolean };
  badge?: { text: string; isPositive?: boolean };
  subtitle?: string;
}) {
  const v = (variant && variants[variant as keyof typeof variants]) || variants.default;
  const tag = badge || delta;
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-3 shadow-xs transition-shadow duration-150 hover:shadow-sm ${v.container}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-gradient-to-br ${v.glow} blur-xl`}
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${v.label}`}>{label}</span>
        {Icon && (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-md ${v.iconBg}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <p
          dir="ltr"
          className={`truncate text-lg sm:text-xl font-bold tracking-tight tabular-nums ${v.value}`}
        >
          {value}
        </p>
        {tag && (
          <span
            className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
              tag.isPositive
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
            }`}
          >
            {tag.isPositive ? "▲ " : "▼ "}
            {tag.text}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}
