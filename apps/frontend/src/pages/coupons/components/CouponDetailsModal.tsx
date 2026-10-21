import React from "react";
import { useTranslation } from "react-i18next";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  TicketIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { Coupon } from "./types";

interface CouponDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  onEdit: (coupon: Coupon) => void;
  onCopyCode: (code: string) => void;
  getTypeText: (type: string) => string;
  getTypeColor: (type: string) => string;
}

export const CouponDetailsModal: React.FC<CouponDetailsModalProps> = ({
  isOpen,
  onClose,
  coupon,
  onEdit,
  onCopyCode,
  getTypeText,
  getTypeColor,
}) => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();

  if (!isOpen || !coupon) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-indigo-600" />
            {t("coupons.modalViewTitle")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 text-center">
            <div className="inline-flex items-center gap-2">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-wider">
                {coupon.code || coupon.id}
              </span>
              <button
                onClick={() => onCopyCode(coupon.code || coupon.id)}
                className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-2">
              {coupon.name}
            </div>
            {coupon.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-lg mx-auto">
                {coupon.description}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.tableType")}
              </label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(
                    coupon.type,
                  )}`}
                >
                  {getTypeText(coupon.type)}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.value")}
              </label>
              <div className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-100">
                {coupon.type?.toLowerCase() === "percentage"
                  ? `${coupon.value}%`
                  : coupon.type?.toLowerCase() === "free_shipping"
                    ? t("coupons.typeFreeShipping")
                    : formatPrice(coupon.value)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.minOrderAmount")}
              </label>
              <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {coupon.minOrderAmount && coupon.minOrderAmount > 0
                  ? formatPrice(coupon.minOrderAmount)
                  : "0"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.maxDiscount")}
              </label>
              <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0
                  ? formatPrice(coupon.maxDiscountAmount)
                  : t("coupons.notSpecified")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.totalUsageLimit")}
              </label>
              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {coupon.usageCount || 0} / {coupon.usageLimit || "∞"}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.tableStatus")}
              </label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    coupon.isActive
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {coupon.isActive ? t("coupons.active") : t("coupons.inactive")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.startDate")}
              </label>
              <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {formatDate(coupon.validFrom)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
                {t("coupons.endDate")}
              </label>
              <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {formatDate(coupon.validTo)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(coupon);
              }}
              className="px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            >
              {t("coupons.modalEditTitle")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              {t("coupons.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
