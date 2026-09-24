import React, { useState, useRef, useEffect } from "react";
import {
  StarIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  ExclamationTriangleIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { apiClient } from "../../services/apiClient";
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
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60",
    dotClass: "bg-emerald-500",
    barColor: "bg-emerald-500",
    icon: StarIcon,
  },
  {
    value: "GOOD",
    label: "عميل جيد",
    shortLabel: "جيد",
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60 hover:bg-sky-100/70 dark:hover:bg-sky-950/60",
    dotClass: "bg-sky-500",
    barColor: "bg-sky-500",
    icon: CheckCircleIcon,
  },
  {
    value: "AVERAGE",
    label: "عميل متوسط",
    shortLabel: "متوسط",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100/70 dark:hover:bg-amber-950/60",
    dotClass: "bg-amber-500",
    barColor: "bg-amber-500",
    icon: MinusCircleIcon,
  },
  {
    value: "POOR",
    label: "عميل ضعيف / مخاطرة",
    shortLabel: "ضعيف",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 hover:bg-rose-100/70 dark:hover:bg-rose-950/60",
    dotClass: "bg-rose-500",
    barColor: "bg-rose-500",
    icon: ExclamationTriangleIcon,
  },
  {
    value: "UNKNOWN",
    label: "عميل جديد / غير مصنف",
    shortLabel: "جديد",
    badgeClass:
      "bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/70",
    dotClass: "bg-slate-400",
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
}

export const CustomerRatingBadge: React.FC<CustomerRatingBadgeProps> = ({
  rating,
  orderNumber,
  customerId,
  interactive = true,
  size = "xs",
  showLabel = true,
  deliveryRate: initialDeliveryRate,
  totalDelivered: initialTotalDelivered,
  totalAttempts: initialTotalAttempts,
  onRatingChange,
  className = "",
}) => {
  const currentRating = normalizeRatingLevel(rating);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localRating, setLocalRating] = useState<CustomerRatingLevel>(currentRating);
  const [localDeliveryRate, setLocalDeliveryRate] = useState<number | null>(
    initialDeliveryRate !== undefined ? initialDeliveryRate : null
  );
  const [localTotalDelivered, setLocalTotalDelivered] = useState<number | null>(
    initialTotalDelivered !== undefined ? initialTotalDelivered : null
  );
  const [localTotalAttempts, setLocalTotalAttempts] = useState<number | null>(
    initialTotalAttempts !== undefined ? initialTotalAttempts : null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalRating(normalizeRatingLevel(rating));
  }, [rating]);

  useEffect(() => {
    if (initialDeliveryRate !== undefined) setLocalDeliveryRate(initialDeliveryRate);
    if (initialTotalDelivered !== undefined) setLocalTotalDelivered(initialTotalDelivered);
    if (initialTotalAttempts !== undefined) setLocalTotalAttempts(initialTotalAttempts);
  }, [initialDeliveryRate, initialTotalDelivered, initialTotalAttempts]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const currentOption =
    CUSTOMER_RATING_OPTIONS.find((opt) => opt.value === localRating) ||
    CUSTOMER_RATING_OPTIONS[4];

  /**
   * إعادة احتساب التقييم آلياً وفقاً لسجل استلام طلبات العميل وإعدادات الطلبات
   */
  const handleRecalculate = async () => {
    if (!customerId && !orderNumber) return;
    setLoading(true);
    try {
      let res: any;
      if (orderNumber) {
        res = await apiClient.post(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}/recalculate-rating`
        );
      } else if (customerId) {
        res = await apiClient.post(`/customers/${customerId}/recalculate-rating`);
      }

      const data = res?.data?.data || res?.data;
      if (data?.rating) {
        const newNormalized = normalizeRatingLevel(data.rating);
        setLocalRating(newNormalized);
        if (data.deliveryRate !== undefined) setLocalDeliveryRate(data.deliveryRate);
        if (data.totalDelivered !== undefined) setLocalTotalDelivered(data.totalDelivered);
        if (data.totalAttempts !== undefined) setLocalTotalAttempts(data.totalAttempts);
        onRatingChange?.(newNormalized);

        const chosen = CUSTOMER_RATING_OPTIONS.find((o) => o.value === newNormalized);
        toast.success(`تم تحديث تقييم العميل آلياً إلى: ${chosen?.label || newNormalized}`);
      } else {
        toast.success("تمت إعادة احتساب تقييم العميل بنجاح");
      }
    } catch (err: any) {
      console.error("Error recalculating customer rating:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "تعذر إعادة احتساب تقييم العميل";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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

  const hasDeliveryStats =
    localDeliveryRate !== null &&
    localDeliveryRate !== undefined &&
    localTotalAttempts !== null &&
    localTotalAttempts !== undefined &&
    localTotalAttempts > 0;

  const displayPercent =
    hasDeliveryStats && localDeliveryRate !== null
      ? `${Math.round(localDeliveryRate)}%`
      : null;

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (interactive) setIsOpen((prev) => !prev);
        }}
        title={`تقييم آلي: ${currentOption.label}${displayPercent ? ` (${displayPercent})` : ""} - انقر لعرض تفاصيل الحساب`}
        aria-label={`تقييم العميل الآلي: ${currentOption.label}`}
        aria-expanded={isOpen}
        className={`inline-flex items-center font-medium rounded-md border transition-all duration-150 select-none ${sizeClasses} ${
          currentOption.badgeClass
        } ${
          interactive
            ? "cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-xs"
            : "cursor-default"
        }`}
      >
        {loading ? (
          <ArrowPathIcon className={`${iconSizes} animate-spin`} />
        ) : (
          <IconComponent className={`${iconSizes} shrink-0`} />
        )}
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
        {interactive && (
          <InformationCircleIcon
            className={`w-3 h-3 opacity-60 transition-transform duration-150 shrink-0 ${
              isOpen ? "rotate-180 opacity-100" : ""
            }`}
          />
        )}
      </button>

      {/* Automated Rating Telemetry Popover (No Manual Choice Override) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1 min-w-[260px] max-w-[320px] end-0 top-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-3 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 origin-top text-right"
          dir="rtl"
          style={{ transformOrigin: "top right" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${currentOption.dotClass}`} />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                تقييم استلام العميل الآلي
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              title="إغلاق"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rating Status Badge & Explanation */}
          <div className="mt-2.5 space-y-2">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs text-slate-500 dark:text-slate-400">التصنيف الحالي:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${currentOption.badgeClass}`}>
                {currentOption.label}
              </span>
            </div>

            {/* Delivery Rate Progress & Counts */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">نسبة الاستلام:</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                  {localDeliveryRate !== null && localDeliveryRate !== undefined
                    ? `${Math.round(localDeliveryRate)}%`
                    : "0% (عميل جديد)"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${currentOption.barColor} transition-all duration-300`}
                  style={{
                    width: `${Math.min(100, Math.max(0, localDeliveryRate || 0))}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span>الطلبات المستلمة:</span>
                <span className="font-medium tabular-nums">
                  {localTotalDelivered ?? 0} من {localTotalAttempts ?? 0} طلب منتهي
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              * يُحتسب هذا التقييم آلياً وفقاً لنسبة استلام الطلبات السابقة وقواعد المتجر المعتمدة في{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                إعدادات الطلبات
              </span>.
            </p>
          </div>

          {/* Instant Recalculation Button */}
          {(customerId || orderNumber) && (
            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={loading}
                onClick={handleRecalculate}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer"
              >
                <ArrowPathIcon
                  className={`w-3.5 h-3.5 shrink-0 ${loading ? "animate-spin text-indigo-600" : ""}`}
                />
                <span>{loading ? "جاري إعادة الحساب..." : "إعادة احتساب التقييم آلياً"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerRatingBadge;
