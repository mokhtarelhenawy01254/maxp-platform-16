import React from "react";

export interface OrdersOperationalStageCardProps {
  title: string;
  statusKey: string;
  icon: React.ComponentType<{ className?: string }>;
  percentage: number;
  ordersCount: number;
  piecesCount?: number;
  subLabel: string;
  piecesLabel: string;
  tooltip: string;
  variant: "emerald" | "sky" | "amber" | "indigo" | "rose" | "red";
  onFilterStatus?: (status: string) => void;
}

const VARIANT_STYLES = {
  emerald: {
    border: "border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]",
    title: "text-emerald-800 dark:text-emerald-400",
    badge: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10",
    count: "text-emerald-950 dark:text-emerald-100",
    pieces: "text-emerald-700 dark:text-emerald-400",
  },
  sky: {
    border: "border-sky-500/20 bg-sky-500/[0.04] hover:bg-sky-500/[0.08]",
    title: "text-sky-800 dark:text-sky-400",
    badge: "text-sky-700 dark:text-sky-300 bg-sky-500/10",
    count: "text-sky-950 dark:text-sky-100",
    pieces: "text-sky-700 dark:text-sky-400",
  },
  amber: {
    border: "border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]",
    title: "text-amber-800 dark:text-amber-400",
    badge: "text-amber-700 dark:text-amber-300 bg-amber-500/10",
    count: "text-amber-950 dark:text-amber-100",
    pieces: "text-amber-700 dark:text-amber-400",
  },
  indigo: {
    border: "border-indigo-500/20 bg-indigo-500/[0.04] hover:bg-indigo-500/[0.08]",
    title: "text-indigo-800 dark:text-indigo-400",
    badge: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10",
    count: "text-indigo-950 dark:text-indigo-100",
    pieces: "text-indigo-700 dark:text-indigo-400",
  },
  rose: {
    border: "border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.08]",
    title: "text-rose-800 dark:text-rose-400",
    badge: "text-rose-700 dark:text-rose-300 bg-rose-500/10",
    count: "text-rose-950 dark:text-rose-100",
    pieces: "text-rose-700 dark:text-rose-400",
  },
  red: {
    border: "border-red-600/20 bg-red-600/[0.04] hover:bg-red-600/[0.08]",
    title: "text-red-800 dark:text-red-400",
    badge: "text-red-700 dark:text-red-300 bg-red-600/10",
    count: "text-red-950 dark:text-red-100",
    pieces: "text-red-700 dark:text-red-400",
  },
};

export const OrdersOperationalStageCard: React.FC<OrdersOperationalStageCardProps> = React.memo(
  ({
    title,
    statusKey,
    icon: Icon,
    percentage,
    ordersCount,
    piecesCount = 0,
    subLabel,
    piecesLabel,
    tooltip,
    variant,
    onFilterStatus,
  }) => {
    const style = VARIANT_STYLES[variant];

    return (
      <div
        onClick={() => onFilterStatus && onFilterStatus(statusKey)}
        className={`p-2.5 sm:p-3 rounded-lg border ${style.border} transition-colors cursor-pointer flex flex-col justify-between`}
        title={tooltip}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={`text-xs font-bold ${style.title} flex items-center gap-1`}>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{title}</span>
          </span>
          <span className={`text-[11px] font-black ${style.badge} px-1.5 py-0.5 rounded tabular-nums`}>
            {percentage}%
          </span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className={`text-xl sm:text-2xl font-extrabold tabular-nums ${style.count}`}>
            {ordersCount.toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500">{subLabel}</span>
        </div>
        {piecesCount > 0 && (
          <span className={`text-[10px] font-semibold ${style.pieces} tabular-nums mt-0.5`}>
            {piecesCount.toLocaleString()}&nbsp;{piecesLabel}
          </span>
        )}
      </div>
    );
  }
);

OrdersOperationalStageCard.displayName = "OrdersOperationalStageCard";
