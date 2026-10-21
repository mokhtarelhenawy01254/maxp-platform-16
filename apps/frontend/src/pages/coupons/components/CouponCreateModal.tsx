import React from "react";
import { useTranslation } from "react-i18next";
import {
  TicketIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { NewCouponState } from "./types";
import { generateRandomCode } from "./useCouponsController";

interface CouponCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  newCoupon: NewCouponState;
  onCouponChange: (updated: NewCouponState) => void;
  onCreate: () => void;
  actionLoading: boolean;
}

export const CouponCreateModal: React.FC<CouponCreateModalProps> = ({
  isOpen,
  onClose,
  newCoupon,
  onCouponChange,
  onCreate,
  actionLoading,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-indigo-600" />
            {t("coupons.modalCreateTitle")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 pt-4">
          {/* Code & Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("coupons.couponCode")} *
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onCouponChange({
                      ...newCoupon,
                      code: generateRandomCode(),
                    })
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium inline-flex items-center gap-1"
                >
                  <SparklesIcon className="h-3.5 w-3.5" />
                  {t("coupons.generateCode")}
                </button>
              </div>
              <input
                type="text"
                value={newCoupon.code}
                onChange={(e) =>
                  onCouponChange({
                    ...newCoupon,
                    code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder={t("coupons.codePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.couponName")} *
              </label>
              <input
                type="text"
                value={newCoupon.name}
                onChange={(e) => onCouponChange({ ...newCoupon, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder={t("coupons.namePlaceholder")}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("coupons.description")}
            </label>
            <textarea
              value={newCoupon.description}
              onChange={(e) =>
                onCouponChange({ ...newCoupon, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder={t("coupons.descPlaceholder")}
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.discountType")} *
              </label>
              <select
                value={newCoupon.type}
                onChange={(e) =>
                  onCouponChange({
                    ...newCoupon,
                    type: e.target.value as "percentage" | "fixed" | "free_shipping",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="percentage">{t("coupons.typePercentage")}</option>
                <option value="fixed">{t("coupons.typeFixed")}</option>
                <option value="free_shipping">{t("coupons.typeFreeShipping")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.value")} {newCoupon.type !== "free_shipping" && "*"}
              </label>
              <input
                type="number"
                disabled={newCoupon.type === "free_shipping"}
                value={newCoupon.type === "free_shipping" ? 0 : newCoupon.value}
                onChange={(e) =>
                  onCouponChange({
                    ...newCoupon,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                placeholder={newCoupon.type === "percentage" ? "15%" : "50"}
              />
            </div>
          </div>

          {/* Min Order & Max Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.minOrderAmount")}
              </label>
              <input
                type="number"
                value={newCoupon.minOrderAmount || ""}
                onChange={(e) =>
                  onCouponChange({
                    ...newCoupon,
                    minOrderAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.maxDiscount")} (للنسبة المئوية)
              </label>
              <input
                type="number"
                disabled={newCoupon.type !== "percentage"}
                value={newCoupon.maxDiscountAmount || ""}
                onChange={(e) =>
                  onCouponChange({
                    ...newCoupon,
                    maxDiscountAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                placeholder="غير محدد"
              />
            </div>
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.totalUsageLimit")}
              </label>
              <input
                type="number"
                value={newCoupon.usageLimit || ""}
                onChange={(e) =>
                  onCouponChange({
                    ...newCoupon,
                    usageLimit: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.perCustomerLimit")}
              </label>
              <input
                type="number"
                value={newCoupon.userUsageLimit || ""}
                onChange={(e) =>
                  onCouponChange({
                    ...newCoupon,
                    userUsageLimit: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="1"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.startDate")} *
              </label>
              <input
                type="datetime-local"
                value={newCoupon.validFrom}
                onChange={(e) =>
                  onCouponChange({ ...newCoupon, validFrom: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.endDate")} *
              </label>
              <input
                type="datetime-local"
                value={newCoupon.validTo}
                onChange={(e) =>
                  onCouponChange({ ...newCoupon, validTo: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Stacking & Active Checkboxes */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newCoupon.isActive}
                onChange={(e) =>
                  onCouponChange({ ...newCoupon, isActive: e.target.checked })
                }
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              {t("coupons.activateCoupon")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newCoupon.allowWithLoyalty}
                onChange={(e) =>
                  onCouponChange({ ...newCoupon, allowWithLoyalty: e.target.checked })
                }
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              {t("coupons.allowWithLoyalty")}
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t("coupons.cancel")}
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={onCreate}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {actionLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                t("coupons.create")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
