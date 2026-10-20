import React, { type ReactNode } from "react";
import { ExternalLink } from "lucide-react";

export const ToggleField = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-900/30">
    <div className="space-y-1">
      <div className="font-semibold text-gray-900 dark:text-white">{label}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
    </div>
    <input
      type="checkbox"
      className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  </label>
);

export const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus-visible:ring-blue-900/40"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
);

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "datetime-local";
}) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus-visible:ring-blue-900/40"
    />
  </label>
);

export const InsightCard = ({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) => (
  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</div>
      <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold tabular-nums font-mono text-gray-900 dark:text-white">{value}</div>
    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{hint}</p>
  </div>
);

export const QuickLinkCard = ({
  title,
  description,
  ctaLabel,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  ctaLabel: string;
  icon: ReactNode;
  onClick: () => void;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{description}</p>
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 dark:border-gray-700 dark:text-white dark:hover:border-blue-900/50 dark:hover:text-blue-300 dark:focus-visible:ring-blue-900/40"
    >
      {ctaLabel}
      <ExternalLink size={16} />
    </button>
  </div>
);

export const StatusPill = ({
  active,
  activeLabel = "مفعّل",
  inactiveLabel = "متوقف",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
      active
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    }`}
  >
    {active ? activeLabel : inactiveLabel}
  </span>
);

export const PlacementMetric = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/60">
    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
      {label}
    </div>
    <div className="mt-2 text-2xl font-black tabular-nums font-mono text-gray-900 dark:text-white">{value}</div>
    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">{hint}</p>
  </div>
);

export const PlacementCard = ({
  icon,
  eyebrow,
  title,
  description,
  status,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  status: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {icon}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
            {eyebrow}
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{status}</div>
    </div>

    {children}
  </section>
);

export const PreviewPill = ({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "blue" | "green" | "amber" | "neutral";
}) => {
  const toneClassMap = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    neutral: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
        toneClassMap[tone]
      }`}
    >
      {label}
    </span>
  );
};

export const PlacementPreview = ({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) => (
  <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-slate-50 via-white to-blue-50/70 p-5 shadow-sm dark:border-gray-700 dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-blue-950/20">
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
          Preview Snapshot
        </div>
        <h3 className="mt-2 text-xl font-black text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>

    {children}
  </div>
);
