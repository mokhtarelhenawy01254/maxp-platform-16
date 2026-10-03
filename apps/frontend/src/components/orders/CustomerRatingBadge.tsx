import React, { useState, useRef, useEffect } from "react";
import {
  StarIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
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
   * "dot": 8px indicator for orders table and mobile rows with single-line tooltip.
   * "badge": rounded pill chip (used in customer profile header and table cells).
   * "detailed": full telemetry card (used in customer details stats).
   */
  variant?: "dot" | "badge" | "detailed";
}

export const CustomerRatingBadge: React.FC<CustomerRatingBadgeProps> = ({
  rating,
  orderNumber,
  customerId,
  interactive = false,
  size = "xs",
  showLabel = true,
  deliveryRate,
  totalDelivered,
  totalAttempts,
  onRatingChange,
  className = "",
  variant,
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

  const effectiveVariant = variant || (size === "xs" ? "dot" : "badge");

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
  if (!interactive && effectiveVariant === "dot") {
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

  // 3. Non-interactive compact Badge Chip
  if (!interactive) {
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
  }

  // 4. Interactive Mode (With Dropdown Menu)
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
    <div
      ref={dropdownRef}
      className={`relative inline-flex items-center text-start ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {effectiveVariant === "dot" ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          disabled={isUpdating || isRecalculating}
          className="inline-flex items-center justify-center p-0.5 rounded-full hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600 transition-all focus:outline-none cursor-pointer"
          title={`${tooltipText} — انقر لتعديل التقييم`}
          aria-label={`${tooltipText} — انقر لتعديل التقييم`}
          aria-expanded={isMenuOpen}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ring-2 shadow-xs transition-transform duration-100 hover:scale-125 ${currentOption.dotClass} ${
              isUpdating ? "animate-pulse" : ""
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          disabled={isUpdating || isRecalculating}
          className={`inline-flex items-center font-medium rounded-md border select-none transition-all duration-150 active:scale-97 cursor-pointer hover:shadow-xs focus:outline-none focus:ring-1 focus:ring-primary/40 ${sizeClasses} ${currentOption.badgeClass} ${
            isUpdating ? "opacity-60 animate-pulse" : ""
          }`}
          title={`${tooltipText} — انقر لتعديل التقييم`}
          aria-label={`${tooltipText} — انقر لتعديل التقييم`}
          aria-expanded={isMenuOpen}
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
          <ChevronDownIcon
            className={`w-3 h-3 opacity-60 transition-transform ${
              isMenuOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      )}

      {isMenuOpen && (
        <div
          className="absolute start-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-800 dark:bg-slate-900 select-none animate-in fade-in zoom-in-95 duration-100"
          role="menu"
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            تعديل تقييم العميل
          </div>
          <div className="py-1 space-y-0.5">
            {CUSTOMER_RATING_OPTIONS.map((opt) => {
              const isSelected = opt.value === currentRating;
              const OptionIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isUpdating || isRecalculating}
                  onClick={(e) => handleRatingSelect(e, opt.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-right cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800 dark:text-white"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <OptionIcon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        opt.value === "EXCELLENT"
                          ? "text-emerald-500"
                          : opt.value === "GOOD"
                          ? "text-sky-500"
                          : opt.value === "AVERAGE"
                          ? "text-amber-500"
                          : opt.value === "POOR"
                          ? "text-rose-500"
                          : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
          {orderNumber && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isUpdating || isRecalculating}
                onClick={handleRecalculate}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors text-right cursor-pointer"
              >
                <ArrowPathIcon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isRecalculating ? "animate-spin text-primary" : ""
                  }`}
                />
                <span className="truncate">
                  {isRecalculating
                    ? "جاري إعادة الاحتساب..."
                    : "إعادة احتساب آلي (حسب التسليم)"}
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
