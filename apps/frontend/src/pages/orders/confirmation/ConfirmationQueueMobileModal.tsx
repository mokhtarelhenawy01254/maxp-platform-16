import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import type { FilterOption } from "./types";

export interface ConfirmationQueueMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  onlyUnassigned: boolean;
  setOnlyUnassigned: React.Dispatch<React.SetStateAction<boolean>>;
  statusOptions: FilterOption[];
  sourceOptions: FilterOption[];
  resetQueueFilters: () => void;
  setPage: (val: number) => void;
}

export const ConfirmationQueueMobileModal: React.FC<ConfirmationQueueMobileModalProps> = ({
  isOpen,
  onClose,
  statusFilter,
  setStatusFilter,
  sourceFilter,
  setSourceFilter,
  onlyUnassigned,
  setOnlyUnassigned,
  statusOptions,
  sourceOptions,
  resetQueueFilters,
  setPage,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-xs p-0 sm:hidden animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full rounded-t-3xl border-t border-border/80 bg-card p-4 sm:p-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t("orders.filterConfirmationQueue", { defaultValue: "تصفية قائمة التأكيد" })}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("orders.filterDescription", { defaultValue: "اختر الحالات والمصادر لعرض الطلبات المطلوبة" })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
            aria-label={String(t("orders.closeFilters", { defaultValue: "إغلاق" }))}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          <label className="block text-xs font-bold text-foreground">
            {t("orders.orderStatus", { defaultValue: "حالة الطلب" })}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="mt-1.5 h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold text-foreground">
            {t("orders.source", { defaultValue: "المصدر" })}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="mt-1.5 h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-xs sm:text-sm text-foreground focus:border-primary focus:outline-none transition-colors"
            >
              {sourceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setOnlyUnassigned((prev) => !prev)}
            className={`flex h-11 w-full items-center justify-between rounded-xl border px-4 text-xs sm:text-sm font-bold active:scale-95 transition-all ${
              onlyUnassigned
                ? "border-primary bg-primary text-primary-foreground shadow-xs"
                : "border-border/70 bg-background text-foreground"
            }`}
          >
            <span>{t("orders.showUnassignedOrders", { defaultValue: "عرض الطلبات غير المخصصة فقط" })}</span>
            <FunnelIcon className="h-4 w-4" />
          </button>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={resetQueueFilters}
              className="h-11 rounded-xl border border-border/70 bg-background text-xs sm:text-sm font-bold text-foreground hover:bg-muted active:scale-95 transition-all"
            >
              {t("orders.reset", { defaultValue: "إعادة تعيين" })}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl bg-primary text-xs sm:text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-95 transition-all"
            >
              {t("orders.showResults", { defaultValue: "عرض النتائج" })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default ConfirmationQueueMobileModal;
