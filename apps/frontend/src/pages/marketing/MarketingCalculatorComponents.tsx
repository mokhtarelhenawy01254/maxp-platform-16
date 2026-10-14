/**
 * 📊 Marketing Calculator Shared Chassis Components
 *
 * Linear / Raycast Single-Surface UI elements for marketing financial engines
 * Zero Emojis - Micro-Typography - Modular Components (< 400 lines)
 */

import React from "react";
import {
  Bookmark,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LucideIcon,
} from "lucide-react";

export interface TelemetryItem {
  label: string;
  value: string;
  sub?: string;
  color?: "primary" | "emerald" | "amber" | "rose" | "purple" | "muted";
}

export function MarketingTelemetryRibbon({ items }: { items: TelemetryItem[] }) {
  const colorMap = {
    primary: "text-primary",
    emerald: "text-emerald-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
    purple: "text-purple-500",
    muted: "text-foreground",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/70 bg-muted/20 divide-x divide-x-reverse divide-border/60">
      {items.map((it, idx) => (
        <div key={idx} className="p-3.5 px-4">
          <span className="text-[11px] font-medium text-muted-foreground block truncate">
            {it.label}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className={`text-base font-bold font-mono tabular-nums ${
                it.color ? colorMap[it.color] : "text-foreground"
              }`}
            >
              {it.value}
            </span>
            {it.sub && (
              <span className="text-[10px] text-muted-foreground truncate">
                {it.sub}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MarketingMetricTile({
  label,
  value,
  sub,
  positive = true,
  accent = "emerald",
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  accent?: "emerald" | "red" | "blue" | "purple" | "yellow" | "gray";
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    red: "text-rose-600 dark:text-rose-400",
    blue: "text-primary",
    purple: "text-purple-600 dark:text-purple-400",
    yellow: "text-amber-500",
    gray: "text-foreground",
  };

  return (
    <div className="bg-card border border-border/70 rounded-lg p-3 sm:p-3.5 flex flex-col justify-between">
      <div className="text-[11px] font-medium text-muted-foreground mb-1 truncate">
        {label}
      </div>
      <div
        className={`text-base sm:text-lg font-bold font-mono tabular-nums ${
          positive ? colorMap[accent] || colorMap.emerald : colorMap.red
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {sub}
        </div>
      )}
    </div>
  );
}

export function MarketingChassisCard({
  title,
  icon,
  children,
  badge,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
      <div className="p-4 border-b border-border/70 bg-muted/10 flex items-center justify-between">
        <h2 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {badge}
      </div>
      <div className="p-4 sm:p-5 space-y-4">{children}</div>
    </div>
  );
}

export function MarketingPresetBar<T extends string>({
  presets,
  current,
  onSelect,
  labels,
}: {
  presets: T[];
  current: T;
  onSelect: (p: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {presets.map((p) => {
        const isSelected = current === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              isSelected
                ? "bg-primary/10 border-primary text-primary font-semibold ring-1 ring-primary/20"
                : "bg-card border-border/70 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSelected ? "bg-primary" : "bg-muted-foreground/40"
              }`}
            />
            {labels[p] || p}
          </button>
        );
      })}
    </div>
  );
}

export function MarketingScenarioBar<T>({
  saved,
  scenarioName,
  setScenarioName,
  onSave,
  onLoad,
  onDelete,
  savePlaceholder,
  saveLabel,
}: {
  saved: { id: string; name: string }[];
  scenarioName: string;
  setScenarioName: (s: string) => void;
  onSave: () => void;
  onLoad: (item: any) => void;
  onDelete: (id: string) => void;
  savePlaceholder: string;
  saveLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex items-center gap-1.5">
        <input
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          placeholder={savePlaceholder}
          className="w-28 sm:w-36 text-xs bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={onSave}
          disabled={saved.length >= 3}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Bookmark className="w-3.5 h-3.5" />
          {saveLabel} ({saved.length}/3)
        </button>
      </div>

      {saved.map((sc) => (
        <div
          key={sc.id}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-muted/30 border border-border/70"
        >
          <button
            type="button"
            onClick={() => onLoad(sc)}
            className="text-foreground hover:text-primary font-medium truncate max-w-28 cursor-pointer"
          >
            {sc.name}
          </button>
          <button
            type="button"
            onClick={() => onDelete(sc.id)}
            className="text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
            title="حذف السيناريو"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function MarketingAlertBanner({
  alerts,
}: {
  alerts: { type: "success" | "warn" | "error"; title: string; msg: string }[];
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const isErr = a.type === "error";
        const isWarn = a.type === "warn";
        return (
          <div
            key={i}
            className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs leading-relaxed ${
              isErr
                ? "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                : isWarn
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isErr ? (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            ) : isWarn ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            )}
            <div>
              <span className="font-bold block">{a.title}</span>
              <span className="opacity-90">{a.msg}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MarketingWhatIfButton({
  label,
  icon: Icon,
  desc,
  active,
  impact,
  curr,
  onClick,
  suffix,
  isNegativeBest,
}: {
  label: string;
  icon?: LucideIcon;
  desc: string;
  active: boolean;
  impact: number | null;
  curr: (v: number) => string;
  onClick: () => void;
  suffix?: string;
  isNegativeBest?: boolean;
}) {
  const isPositive = impact !== null && (isNegativeBest ? impact < 0 : impact > 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-3 rounded-lg border text-right transition-all cursor-pointer ${
        active
          ? "bg-primary/5 border-primary ring-1 ring-primary text-foreground"
          : "bg-card border-border/70 hover:bg-muted/20 text-muted-foreground"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
          {label}
        </span>
        {impact !== null && (
          <span
            className={`text-[11px] font-mono font-bold ${
              isPositive ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {isNegativeBest ? "" : isPositive ? "+" : ""}
            {curr(Math.round(impact))}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
        {desc}
      </p>
      {suffix && (
        <span className="text-[10px] text-muted-foreground/80 mt-1 block">
          {suffix}
        </span>
      )}
    </button>
  );
}

export function MarketingWhatIfDeltaRow({
  label,
  base,
  projected,
  positive,
}: {
  label: string;
  base: string;
  projected: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 font-mono">
        <span className="text-muted-foreground line-through opacity-70">{base}</span>
        <span className="text-muted-foreground">→</span>
        <span
          className={`font-bold ${positive ? "text-emerald-500" : "text-rose-500"}`}
        >
          {projected}
        </span>
      </div>
    </div>
  );
}
