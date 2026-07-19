import React from "react";

const variants = {
  default: {
    container: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
    icon: "text-blue-600 dark:text-blue-300",
    label: "text-slate-500 dark:text-slate-400",
    value: "text-slate-950 dark:text-white",
    topBar: "bg-blue-500 dark:bg-blue-400",
  },
  spend: {
    container: "border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/20",
    icon: "text-blue-600 dark:text-blue-300",
    label: "text-blue-700 dark:text-blue-300",
    value: "text-slate-950 dark:text-white",
    topBar: "bg-blue-500 dark:bg-blue-400",
  },
  purchases: {
    container: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
    icon: "text-emerald-600 dark:text-emerald-300",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-slate-950 dark:text-white",
    topBar: "bg-emerald-500 dark:bg-emerald-400",
  },
  roas: {
    container: "border-violet-200 bg-violet-50/60 dark:border-violet-900/50 dark:bg-violet-950/20",
    icon: "text-violet-600 dark:text-violet-300",
    label: "text-violet-700 dark:text-violet-300",
    value: "text-slate-950 dark:text-white",
    topBar: "bg-violet-500 dark:bg-violet-400",
  },
  cpa: {
    container: "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
    icon: "text-amber-600 dark:text-amber-300",
    label: "text-amber-700 dark:text-amber-300",
    value: "text-slate-950 dark:text-white",
    topBar: "bg-amber-500 dark:bg-amber-400",
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
      className={`rounded-xl border px-3 py-2.5 shadow-sm ${v.container}`}
    >
      <div className={`mb-2 h-1 w-8 rounded-full ${v.topBar}`} />
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-black ${v.label}`}>{label}</span>
        <Icon className={`h-3.5 w-3.5 ${v.icon}`} />
      </div>
      <p className={`mt-1.5 truncate text-lg font-black tracking-tight ${v.value}`}>
        {value}
      </p>
    </div>
  );
}
