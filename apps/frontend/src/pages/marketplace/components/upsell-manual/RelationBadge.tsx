import React from "react";

export type RelationBadgeTone = "blue" | "green" | "amber" | "neutral";

export interface RelationBadgeProps {
  label: string;
  tone?: RelationBadgeTone;
}

export function RelationBadge({ label, tone = "blue" }: RelationBadgeProps) {
  const styles =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
        : tone === "neutral"
          ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${styles}`}
    >
      {label}
    </span>
  );
}
