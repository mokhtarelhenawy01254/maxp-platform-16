import React, { useState, useRef, useEffect } from "react";
import {
  StarIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/20/solid";
import { toast } from "sonner";

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

// Clean circular info icon outline (exact match to Screenshot 2)
export const InfoOutlineIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export interface ComputedHealthScore {
  score: number;
  formattedScore: string;
  tier: "high" | "medium" | "low";
  tierLabel: string;
  badgeClass: string;
  iconClass: string;
  barColor: string;
  diagnosis: string;
  isNew: boolean;
}

/**
 * Calculates continuous, Bayesian-smoothed Customer Health Score (0.0 - 10.0)
 * reflecting real delivery reliability, return rate, duplicate risk, and cancellation history.
 */
export function computeHealthScore({
  healthScore,
  deliveryRate,
  totalDelivered,
  totalAttempts,
  totalFailed,
  totalCancelled,
  rating,
  isDuplicate,
  orderStatus,
}: {
  healthScore?: number | null;
  deliveryRate?: number | null;
  totalDelivered?: number | null;
  totalAttempts?: number | null;
  totalFailed?: number | null;
  totalCancelled?: number | null;
  rating?: string | null;
  isDuplicate?: boolean;
  orderStatus?: string | null;
}): ComputedHealthScore {
  let score = 7.5;
  let diagnosis = "عميل جديد — لم تكتمل له شحنات سابقة بعد";
  let isNew = false;

  const hasCompletedAttempts = Boolean(totalAttempts && totalAttempts > 0);
  const hasPositiveDeliveryRate = Boolean(
    deliveryRate !== null && deliveryRate !== undefined && Number(deliveryRate) > 0
  );
  const hasExplicitTier = Boolean(rating && rating !== "UNKNOWN");
  const hasNonDefaultHealthScore =
    healthScore !== null &&
    healthScore !== undefined &&
    !isNaN(Number(healthScore)) &&
    (Number(healthScore) !== 7.5 || hasCompletedAttempts || hasPositiveDeliveryRate || hasExplicitTier);

  if (hasNonDefaultHealthScore) {
    score = Number(healthScore);
    if (deliveryRate !== null && deliveryRate !== undefined) {
      diagnosis = `نسبة الاستلام: ${Math.round(deliveryRate)}% — مؤشر موثوقية ${score.toFixed(1)}/10`;
    }
  } else if (hasCompletedAttempts) {
    const delivered = totalDelivered ?? 0;
    const attempts = totalAttempts!;
    const returned = totalFailed ?? Math.max(0, attempts - delivered);
    const rate = delivered / attempts;

    // Minimum 3 attempts needed to form an evaluation tier
    if (attempts >= 3) {
      let s: number;
      if (delivered === 0) {
        s = Math.max(1.5, 2.8 - returned * 0.5);
      } else if (returned === 0) {
        s = ((delivered + 1.125) / (attempts + 1.5)) * 10;
      } else {
        const base = ((delivered + 1.125) / (attempts + 1.5)) * 10;
        const penalty = (1 - rate) * 1.8;
        s = base - penalty;
      }

      score = Math.min(9.9, Math.max(1.0, Math.round(s * 10) / 10));
      const pct = Math.round(rate * 100);
      if (score >= 8.0) {
        diagnosis = `سجل استلام ممتاز (${pct}%) — ${delivered} من ${attempts} طلب`;
      } else if (score >= 7.0) {
        diagnosis = `سجل استلام جيد (${pct}%) — ${delivered} من ${attempts} طلب`;
      } else if (score >= 5.0) {
        diagnosis = `سجل استلام متوسط (${pct}%) — ${returned > 0 ? `${returned} مرتجع سابق` : ""}`;
      } else {
        diagnosis = `تحذير: مخاطرة مرتفعة (${pct}%) — ${returned} مرتجع سابق`;
      }
    } else {
      isNew = true;
      score = 7.5;
      diagnosis = isDuplicate
        ? "طلب مكرر لنفس العميل — غير محسوب في التقييم"
        : "عميل جديد — لم تكتمل له شحنات سابقة بعد";
    }
  } else if (isDuplicate) {
    isNew = true;
    score = 7.5;
    diagnosis = "طلب مكرر لنفس العميل — غير محسوب في التقييم";
  } else if (hasPositiveDeliveryRate) {
    const rateVal = Number(deliveryRate);
    if (rateVal >= 90) score = 9.2;
    else if (rateVal >= 80) score = 8.5;
    else if (rateVal >= 70) score = 7.7;
    else if (rateVal >= 60) score = 6.4;
    else if (rateVal >= 50) score = 5.2;
    else score = 3.5;
    diagnosis = `نسبة الاستلام: ${Math.round(rateVal)}%`;
  } else if (hasExplicitTier) {
    if (rating === "EXCELLENT") {
      score = 9.2;
      diagnosis = "عميل ممتاز";
    } else if (rating === "GOOD") {
      score = 8.2;
      diagnosis = "عميل جيد";
    } else if (rating === "AVERAGE") {
      score = 6.4;
      diagnosis = "عميل متوسط";
    } else if (rating === "POOR") {
      score = 3.3;
      diagnosis = "عميل ضعيف / مخاطرة";
    }
  } else if (orderStatus === "DELIVERED") {
    score = 8.5;
    diagnosis = "تم استلام الطلب بنجاح";
  } else {
    isNew = true;
    score = 7.5;
    diagnosis = isDuplicate
      ? "طلب مكرر لنفس العميل — غير محسوب في التقييم"
      : "عميل جديد — لم تكتمل له شحنات سابقة بعد";
  }

  score = Math.min(9.9, Math.max(1.0, Math.round(score * 10) / 10));
  const formattedScore = score.toFixed(1);

  let tier: "high" | "medium" | "low" = "medium";
  let tierLabel = "عميل متوسط • موثوق جزئياً";
  let badgeClass =
    "bg-amber-50 text-amber-800 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
  let iconClass = "text-amber-600 dark:text-amber-400";
  let barColor = "bg-amber-500";

  if (isNew) {
    tier = "medium";
    tierLabel = "عميل جديد • لم تكتمل له شحنات بعد";
    badgeClass =
      "bg-slate-100 text-slate-600 border-slate-200/80 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60";
    iconClass = "text-slate-500 dark:text-slate-400";
    barColor = "bg-slate-400";
  } else if (score >= 8.0) {
    tier = "high";
    tierLabel = "عميل موثوق • عالي الجودة";
    badgeClass =
      "bg-emerald-50 text-emerald-800 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60";
    iconClass = "text-emerald-600 dark:text-emerald-400";
    barColor = "bg-emerald-500";
  } else if (score < 5.0) {
    tier = "low";
    tierLabel = "عميل عالي المخاطر • حذر";
    badgeClass =
      "bg-rose-50 text-rose-800 border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60";
    iconClass = "text-rose-600 dark:text-rose-400";
    barColor = "bg-rose-500";
  }

  return {
    score,
    formattedScore,
    tier,
    tierLabel,
    badgeClass,
    iconClass,
    barColor,
    diagnosis,
    isNew,
  };
}

export interface CustomerRatingBadgeProps {
  rating?: string | null;
  healthScore?: number | null;
  healthDiagnosis?: string | null;
  orderNumber?: string;
  customerId?: string | null;
  interactive?: boolean;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  legacyChip?: boolean;
  deliveryRate?: number | null;
  totalDelivered?: number | null;
  totalAttempts?: number | null;
  totalFailed?: number | null;
  totalCancelled?: number | null;
  totalOrdersCount?: number | null;
  isDuplicate?: boolean;
  orderStatus?: string | null;
  onRatingChange?: (newRating: CustomerRatingLevel) => void;
  className?: string;
  variant?: "dot" | "badge" | "detailed" | "health";
}

export const CustomerRatingBadge: React.FC<CustomerRatingBadgeProps> = ({
  rating,
  healthScore,
  healthDiagnosis,
  orderNumber,
  customerId,
  interactive = false,
  size = "sm",
  showLabel = true,
  legacyChip = false,
  deliveryRate,
  totalDelivered,
  totalAttempts,
  totalFailed,
  totalCancelled,
  totalOrdersCount,
  isDuplicate = false,
  orderStatus,
  onRatingChange,
  className = "",
  variant = "badge",
}) => {
  const [currentRating, setCurrentRating] = useState<CustomerRatingLevel>(() =>
    normalizeRatingLevel(rating)
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCurrentRating(normalizeRatingLevel(rating));
  }, [rating]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const healthInfo = computeHealthScore({
    healthScore,
    deliveryRate,
    totalDelivered,
    totalAttempts,
    totalFailed,
    totalCancelled,
    rating: currentRating,
    isDuplicate,
    orderStatus,
  });

  const effectiveRatingLevel: CustomerRatingLevel =
    currentRating !== "UNKNOWN"
      ? currentRating
      : !healthInfo.isNew
      ? healthInfo.score >= 8.0
        ? "EXCELLENT"
        : healthInfo.score >= 7.0
        ? "GOOD"
        : healthInfo.score >= 5.0
        ? "AVERAGE"
        : "POOR"
      : "UNKNOWN";

  const currentOption =
    CUSTOMER_RATING_OPTIONS.find((opt) => opt.value === effectiveRatingLevel) ||
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

  const tooltipText = `تقييم العميل: ${currentOption.label}${
    displayPercent ? ` (نسبة الاستلام: ${displayPercent})` : ""
  }${
    hasDeliveryStats && totalDelivered !== null && totalAttempts !== null
      ? ` — ${totalDelivered} من ${totalAttempts} طلب`
      : ""
  }`;

  const handleRatingSelect = async (e: React.MouseEvent, newLevel: CustomerRatingLevel) => {
    e.stopPropagation();
    e.preventDefault();
    setIsMenuOpen(false);

    if (newLevel === currentRating && !isRecalculating) return;

    const previousRating = currentRating;
    setCurrentRating(newLevel);
    onRatingChange?.(newLevel);

    if (orderNumber) {
      setIsUpdating(true);
      try {
        const { apiClient } = await import("../../services/apiClient");
        const encoded = encodeURIComponent(orderNumber);
        const res = await apiClient.put(`/orders-new/simple/${encoded}/customer-rating`, {
          rating: newLevel,
        });
        if (res?.data?.success) {
          const selectedOpt = CUSTOMER_RATING_OPTIONS.find((o) => o.value === newLevel);
          toast.success(`تم تحديث تقييم العميل إلى: ${selectedOpt?.label || newLevel}`);
        } else {
          throw new Error(res?.data?.message || "فشل تحديث التقييم");
        }
      } catch (err: any) {
        console.error("Failed to update customer rating:", err);
        setCurrentRating(previousRating);
        onRatingChange?.(previousRating);
        toast.error(err?.response?.data?.message || err?.message || "فشل تحديث تقييم العميل");
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleRecalculate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!orderNumber || isRecalculating) return;

    setIsRecalculating(true);
    try {
      const { apiClient } = await import("../../services/apiClient");
      const encoded = encodeURIComponent(orderNumber);
      const res = await apiClient.post(`/orders-new/simple/${encoded}/recalculate-rating`);
      if (res?.data?.success && res.data.data) {
        const recalculatedRating = normalizeRatingLevel(res.data.data.rating);
        setCurrentRating(recalculatedRating);
        onRatingChange?.(recalculatedRating);
        toast.success("تمت إعادة احتساب تقييم العميل آلياً");
        setIsMenuOpen(false);
      } else {
        throw new Error(res?.data?.message || "فشل إعادة احتساب التقييم");
      }
    } catch (err: any) {
      console.error("Failed to recalculate customer rating:", err);
      toast.error(
        err?.response?.data?.message || err?.message || "خطأ في إعادة احتساب تقييم العميل"
      );
    } finally {
      setIsRecalculating(false);
    }
  };

  // 1. Non-interactive pure 8px Dot Indicator for backward compatibility
  if (!interactive && variant === "dot") {
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
  if (variant === "detailed") {
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
          <div className="flex items-center gap-1.5">
            {!healthInfo.isNew && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md border tabular-nums ${healthInfo.badgeClass}`}>
                {healthInfo.formattedScore} / 10
              </span>
            )}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${currentOption.badgeClass}`}>
              {currentOption.label}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500 dark:text-slate-400">نسبة نجاح الاستلام:</span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {deliveryRate !== null && deliveryRate !== undefined && !healthInfo.isNew
                ? `${Math.round(deliveryRate)}%`
                : "عميل جديد (لم يستلم بعد)"}
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${healthInfo.barColor} transition-all duration-300`}
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

  // 3. Optional Legacy Chip format (for backward tests or explicitly requested legacy display)
  if (legacyChip) {
    const IconComponent = currentOption.icon;
    return (
      <span
        className={`inline-flex items-center font-medium rounded-md border select-none transition-colors duration-150 cursor-default px-2 py-0.5 text-xs gap-1.5 ${currentOption.badgeClass} ${className}`}
        title={tooltipText}
        aria-label={tooltipText}
      >
        <IconComponent className="w-3.5 h-3.5 shrink-0" />
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
  }

  // 4. ⭐ Standard Modern Health Score Pill Badge (Exact Design from Screenshot 2)
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

  // 4. Clean Non-Interactive Static Badge (Zero Click, Zero Popover)
  if (!interactive) {
    return (
      <span
        className={`inline-flex items-center font-semibold rounded-md border select-none transition-colors duration-150 cursor-default ${sizeClasses} ${healthInfo.badgeClass} ${className}`}
        title={
          healthInfo.isNew
            ? `تقييم العميل: ${currentOption.label} — ${healthInfo.diagnosis}`
            : `مؤشر صحة العميل الآلي: ${currentOption.label} — ${healthInfo.formattedScore}/10 — ${healthInfo.diagnosis}`
        }
        aria-label={
          healthInfo.isNew
            ? `تقييم العميل الآلي: ${currentOption.label}`
            : `تقييم العميل الآلي: ${currentOption.label} (${healthInfo.formattedScore})`
        }
      >
        <span>{currentOption.shortLabel}</span>
        {!healthInfo.isNew && (
          <span className="tabular-nums font-mono text-[10px] opacity-75">
            {healthInfo.formattedScore}
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-flex items-center ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        disabled={isUpdating || isRecalculating}
        className={`group inline-flex items-center font-semibold rounded-md border select-none transition-all duration-150 active:scale-97 cursor-pointer hover:shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 ${sizeClasses} ${healthInfo.badgeClass}`}
        title={
          healthInfo.isNew
            ? `تقييم العميل: ${currentOption.label} — ${healthInfo.diagnosis} (انقر لعرض التحليل)`
            : `مؤشر صحة العميل الآلي: ${currentOption.label} — ${healthInfo.formattedScore}/10 — ${healthInfo.diagnosis} (انقر لعرض التحليل)`
        }
        aria-label={
          healthInfo.isNew
            ? `تقييم العميل الآلي: ${currentOption.label}`
            : `تقييم العميل الآلي: ${currentOption.label} (${healthInfo.formattedScore})`
        }
        aria-expanded={isMenuOpen}
      >
        <span>{currentOption.shortLabel}</span>
        {!healthInfo.isNew && (
          <span className="tabular-nums font-mono text-[10px] opacity-75">
            {healthInfo.formattedScore}
          </span>
        )}
        <InfoOutlineIcon
          className={`${iconSizes} shrink-0 opacity-80 group-hover:opacity-100 transition-opacity ${healthInfo.iconClass}`}
        />
      </button>

      {/* 5. Rich Diagnostic Popover Modal */}
      {isMenuOpen && (
        <div
          className="absolute start-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900 select-none animate-in fade-in zoom-in-95 duration-100"
          role="menu"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>تقييم العميل الآلي</span>
                <span className="text-[10px] font-mono font-medium text-slate-400">HEALTH SCORE</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {healthInfo.tierLabel}
              </p>
            </div>
            <div
              className={`px-2 py-0.5 rounded-md border text-xs font-bold tabular-nums shrink-0 ${healthInfo.badgeClass}`}
            >
              {healthInfo.formattedScore} / 10
            </div>
          </div>

          {/* Real Metrics and Telemetry Breakdown */}
          <div className="py-2.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600 dark:text-slate-400">نسبة نجاح الاستلام:</span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                {displayPercent ? displayPercent : (totalAttempts && totalAttempts > 0 ? "0%" : "رصيد أولي (جديد)")}
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${healthInfo.barColor}`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, deliveryRate != null ? deliveryRate : healthInfo.score * 10)
                  )}%`,
                }}
              />
            </div>

            {/* Counter Grid */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">مستلم</div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {totalDelivered ?? 0}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">مرتجع</div>
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {totalFailed ?? Math.max(0, (totalAttempts || 0) - (totalDelivered || 0))}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="text-[10px] text-slate-500 dark:text-slate-400">الإجمالي</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                  {totalOrdersCount || totalAttempts || 1}
                </div>
              </div>
            </div>

            {/* Diagnosis note */}
            <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 leading-relaxed">
              {healthDiagnosis || healthInfo.diagnosis}
            </div>
          </div>

          {/* Recalculate Trigger */}
          {orderNumber && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isUpdating || isRecalculating}
                onClick={handleRecalculate}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowPathIcon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isRecalculating ? "animate-spin text-primary" : ""
                  }`}
                />
                <span>
                  {isRecalculating ? "جاري إعادة الاحتساب..." : "إعادة احتساب آلي للتقييم"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerRatingBadge;
