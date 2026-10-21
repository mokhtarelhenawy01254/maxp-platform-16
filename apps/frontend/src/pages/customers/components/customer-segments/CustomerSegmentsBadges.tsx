import React from "react";
import { TIER_COLORS } from "./types";

export const QualityTierBadge: React.FC<{ tier: string }> = ({ tier }) => {
  const color = TIER_COLORS[tier] || "#6B7280";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color + "20", color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {tier}
    </span>
  );
};

export const RatingBadge: React.FC<{ rating?: string }> = ({ rating }) => {
  if (!rating || rating === "UNKNOWN") return <span className="text-xs text-gray-400">-</span>;
  const colors: Record<string, string> = {
    EXCELLENT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    GOOD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    AVERAGE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    BAD: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[rating] || ""}`}>
      {rating === "EXCELLENT" ? "★★★★★" : rating === "GOOD" ? "★★★★" : rating === "AVERAGE" ? "★★★" : "★★"}
    </span>
  );
};

export const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  onClick?: () => void;
}> = ({ icon: Icon, label, value, sub, color, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 ${
      onClick
        ? "cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
        : ""
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="p-2.5 rounded-lg" style={{ backgroundColor: color + "20" }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 font-mono tabular-nums">
      {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
    </p>
  </div>
);
