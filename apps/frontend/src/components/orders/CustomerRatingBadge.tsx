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
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";

export type CustomerRatingLevel = "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR" | "UNKNOWN";

export interface CustomerRatingOption {
  value: CustomerRatingLevel;
  label: string;
  shortLabel: string;
  badgeClass: string;
  activeClass: string;
  dotClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const CUSTOMER_RATING_OPTIONS: CustomerRatingOption[] = [
  {
    value: "EXCELLENT",
    label: "عميل ممتاز",
    shortLabel: "ممتاز",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60",
    activeClass:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 ring-1 ring-emerald-500/40",
    dotClass: "bg-emerald-500",
    icon: StarIcon,
  },
  {
    value: "GOOD",
    label: "عميل جيد",
    shortLabel: "جيد",
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60 hover:bg-sky-100/70 dark:hover:bg-sky-950/60",
    activeClass:
      "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200 ring-1 ring-sky-500/40",
    dotClass: "bg-sky-500",
    icon: CheckCircleIcon,
  },
  {
    value: "AVERAGE",
    label: "عميل متوسط",
    shortLabel: "متوسط",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100/70 dark:hover:bg-amber-950/60",
    activeClass:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 ring-1 ring-amber-500/40",
    dotClass: "bg-amber-500",
    icon: MinusCircleIcon,
  },
  {
    value: "POOR",
    label: "عميل ضعيف / مخاطرة",
    shortLabel: "ضعيف",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 hover:bg-rose-100/70 dark:hover:bg-rose-950/60",
    activeClass:
      "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 ring-1 ring-rose-500/40",
    dotClass: "bg-rose-500",
    icon: ExclamationTriangleIcon,
  },
  {
    value: "UNKNOWN",
    label: "عميل جديد / غير مصنف",
    shortLabel: "جديد",
    badgeClass:
      "bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/70",
    activeClass:
      "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 ring-1 ring-slate-400/40",
    dotClass: "bg-slate-400",
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
  deliveryRate,
  totalDelivered,
  totalAttempts,
  onRatingChange,
  className = "",
}) => {
  const currentRating = normalizeRatingLevel(rating);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localRating, setLocalRating] = useState<CustomerRatingLevel>(currentRating);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalRating(normalizeRatingLevel(rating));
  }, [rating]);

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

  const handleSelectRating = async (newRating: CustomerRatingLevel) => {
    if (newRating === localRating) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      if (orderNumber) {
        // Fast endpoint scoped to the order's customer (regular or guest)
        await apiClient.put(
          `/orders-new/simple/${encodeURIComponent(orderNumber)}/customer-rating`,
          { rating: newRating }
        );
      } else if (customerId) {
        await apiClient.put(`/customers/${customerId}`, {
          customerRating: newRating,
        });
      }

      setLocalRating(newRating);
      onRatingChange?.(newRating);
      const chosen = CUSTOMER_RATING_OPTIONS.find((o) => o.value === newRating);
      toast.success(`تم تحديث تقييم العميل إلى: ${chosen?.label || newRating}`);
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error updating customer rating:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "تعذر تحديث تقييم العميل";
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

  const canEdit = interactive && (Boolean(orderNumber) || Boolean(customerId));

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={loading || !canEdit}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (canEdit) setIsOpen((prev) => !prev);
        }}
        title={canEdit ? "انقر لتغيير تقييم العميل" : currentOption.label}
        aria-label={`تقييم العميل: ${currentOption.label}`}
        aria-expanded={isOpen}
        className={`inline-flex items-center font-medium rounded-md border transition-all duration-150 select-none ${sizeClasses} ${
          currentOption.badgeClass
        } ${
          canEdit
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
          <span className="truncate font-semibold tracking-tight">
            {currentOption.shortLabel}
          </span>
        )}
        {canEdit && (
          <ChevronDownIcon
            className={`w-3 h-3 opacity-60 transition-transform duration-150 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Quick Edit Dropdown Popover */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1 min-w-[210px] end-0 top-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 origin-top"
          style={{ transformOrigin: "top right" }}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            تعديل تقييم العميل
          </div>

          <div className="p-1 space-y-0.5">
            {CUSTOMER_RATING_OPTIONS.map((opt) => {
              const isSelected = opt.value === localRating;
              const OptIcon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectRating(opt.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors text-right ${
                    isSelected
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`}
                    />
                    <OptIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mr-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerRatingBadge;
