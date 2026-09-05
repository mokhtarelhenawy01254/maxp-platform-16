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
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "spend" | "purchases" | "roas" | "cpa";
}) {
  const v = variants[variant];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-3.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${v.container}`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${v.glow} blur-xl`}
      />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-black ${v.label}`}>{label}</span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${v.iconBg}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p
        className={`mt-2 truncate text-lg font-black tracking-tight ${v.value}`}
      >
        {value}
      </p>
    </div>
  );
}
