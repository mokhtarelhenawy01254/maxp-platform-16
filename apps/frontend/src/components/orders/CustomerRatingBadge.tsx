import React from "react";
import {
  StarIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/20/solid";

export type CustomerRatingLevel = "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR" | "UNKNOWN";

export interface CustomerRatingOption {
  value: CustomerRatingLevel;
  label: string;
  shortLabel: string;
  badgeClass: string;
  dotClass: string;
  barColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CUSTOMER_RATING_OPTIONS: CustomerRatingOption[] = [
  {
    value: "EXCELLENT",
    label: "عميل ممتاز",
    shortLabel: "ممتاز",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    dotClass: "bg-emerald-500 ring-emerald-500/20",
    barColor: "bg-emerald-500",
    icon: StarIcon,
  },
  {
    value: "GOOD",
    label: "عميل جيد",
    shortLabel: "جيد",
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
    dotClass: "bg-sky-500 ring-sky-500/20",
    barColor: "bg-sky-500",
    icon: CheckCircleIcon,
  },
  {
    value: "AVERAGE",
    label: "عميل متوسط",
    shortLabel: "متوسط",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    dotClass: "bg-amber-500 ring-amber-500/20",
    barColor: "bg-amber-500",
    icon: MinusCircleIcon,
  },
  {
    value: "POOR",
    label: "عميل ضعيف / مخاطرة",
    shortLabel: "ضعيف",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    dotClass: "bg-rose-500 ring-rose-500/20",
    barColor: "bg-rose-500",
    icon: ExclamationTriangleIcon,
  },
  {
    value: "UNKNOWN",
    label: "عميل جديد / غير مصنف",
    shortLabel: "جديد",
    badgeClass:
      "bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60",
    dotClass: "bg-slate-400 ring-slate-400/20",
    barColor: "bg-slate-400",
    icon: QuestionMarkCircleIcon,
  },
];

export const normalizeRatingLevel = (raw?: string | null): CustomerRatingLevel => {
  if (!raw) return "UNKNOWN";
  const upper = String(raw).trim().toUpperCase();
  if (upper === "BAD") return "POOR";
  if (upper === "EXCELLENT" || upper === "GOOD" || upper === "AVERAGE" || upper === "POOR") {
    return upper;
  }
  return "UNKNOWN";
};

export interface CustomerRatingBadgeProps {
  rating?: string | null;
  orderNumber?: string;
  customerId?: string | null;
  interactive?: boolean;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  deliveryRate?: number | null;
  totalDelivered?: number | null;
  totalAttempts?: number | null;
  onRatingChange?: (newRating: CustomerRatingLevel) => void;
  className?: string;
  /**
   * "dot": 8px indicator for orders table and mobile rows with single-line tooltip, no popover, no button.
   * "badge": rounded pill chip (used in customer profile header).
   * "detailed": full telemetry card (used in customer details stats).
   */
  variant?: "dot" | "badge" | "detailed";
}

export const CustomerRatingBadge: React.FC<CustomerRatingBadgeProps> = ({
  rating,
  size = "xs",
  showLabel = true,
  deliveryRate,
  totalDelivered,
  totalAttempts,
  className = "",
  variant,
}) => {
  const currentRating = normalizeRatingLevel(rating);

  const currentOption =
    CUSTOMER_RATING_OPTIONS.find((opt) => opt.value === currentRating) ||
    CUSTOMER_RATING_OPTIONS[4];

  const hasDeliveryStats =
    deliveryRate !== null &&
    deliveryRate !== undefined &&
    totalAttempts !== null &&
    totalAttempts !== undefined &&
    totalAttempts > 0;

  const displayPercent =
    hasDeliveryStats && deliveryRate !== null
      ? `${Math.round(deliveryRate)}%`
      : null;

  // Resolved mode: size="xs" or variant="dot" renders the pure 8px indicator
  const effectiveVariant = variant || (size === "xs" ? "dot" : "badge");

  const tooltipText = `تقييم العميل: ${currentOption.label}${
    displayPercent ? ` (نسبة الاستلام: ${displayPercent})` : ""
  }${
    hasDeliveryStats && totalDelivered !== null && totalAttempts !== null
      ? ` — ${totalDelivered} من ${totalAttempts} طلب`
      : ""
  }`;

  // 1. Pure 8px Dot Indicator for Orders Table & Mobile Row (No Popover, No Buttons)
  if (effectiveVariant === "dot") {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        title={tooltipText}
        aria-label={tooltipText}
      >
        <span
          className={`w-2 h-2 rounded-full ring-2 shadow-xs transition-transform duration-100 hover:scale-125 cursor-default ${currentOption.dotClass}`}
        />
      </span>
    );
  }

  // 2. Full Telemetry Card (For Customer Details / Analytics)
  if (effectiveVariant === "detailed") {
    return (
      <div
        className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs ${className}`}
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ring-2 ${currentOption.dotClass}`} />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              تصنيف العميل الآلي
            </span>
          </div>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${currentOption.badgeClass}`}>
            {currentOption.label}
          </span>
        </div>

        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500 dark:text-slate-400">نسبة نجاح الاستلام:</span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {deliveryRate !== null && deliveryRate !== undefined
                ? `${Math.round(deliveryRate)}%`
                : "0% (عميل جديد)"}
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${currentOption.barColor} transition-all duration-300`}
              style={{
                width: `${Math.min(100, Math.max(0, deliveryRate || 0))}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span>الطلبات المستلمة:</span>
            <span className="font-medium tabular-nums">
              {totalDelivered ?? 0} من {totalAttempts ?? 0} طلب مكتمل
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Compact Badge Chip (e.g. Header / Profile Badge without popover)
  const IconComponent = currentOption.icon;
  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[11px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs sm:text-sm gap-1.5",
  }[size];

  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border select-none transition-colors duration-150 cursor-default ${sizeClasses} ${currentOption.badgeClass} ${className}`}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <IconComponent className={`${iconSizes} shrink-0`} />
      {showLabel && (
        <span className="truncate font-semibold tracking-tight inline-flex items-center gap-1">
          <span>{currentOption.shortLabel}</span>
          {displayPercent && (
            <span className="text-[10px] opacity-80 tabular-nums">
              ({displayPercent})
            </span>
          )}
        </span>
      )}
    </span>
  );
};

export default CustomerRatingBadge;
