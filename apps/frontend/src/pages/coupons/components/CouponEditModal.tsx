import React from "react";
import { useTranslation } from "react-i18next";
import { PencilIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { Coupon } from "./types";

interface CouponEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCoupon: Coupon | null;
  onCouponChange: (updated: Coupon) => void;
  onUpdate: () => void;
  actionLoading: boolean;
}

export const CouponEditModal: React.FC<CouponEditModalProps> = ({
  isOpen,
  onClose,
  editingCoupon,
  onCouponChange,
  onUpdate,
  actionLoading,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !editingCoupon) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PencilIcon className="h-5 w-5 text-blue-600" />
            {t("coupons.modalEditTitle")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.couponCode")} *
              </label>
              <input
                type="text"
                value={editingCoupon.code}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    code: e.target.value.toUpperCase().replace(/\s+/g, ""),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.couponName")} *
              </label>
              <input
                type="text"
                value={editingCoupon.name}
                onChange={(e) => onCouponChange({ ...editingCoupon, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              {t("coupons.description")}
            </label>
            <textarea
              value={editingCoupon.description || ""}
              onChange={(e) =>
                onCouponChange({
                  ...editingCoupon,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.discountType")} *
              </label>
              <select
                value={editingCoupon.type}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    type: e.target.value as Coupon["type"],
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
                {t("coupons.value")} *
              </label>
              <input
                type="number"
                value={editingCoupon.value}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    value: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.minOrderAmount")}
              </label>
              <input
                type="number"
                value={editingCoupon.minOrderAmount ?? ""}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    minOrderAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.maxDiscount")}
              </label>
              <input
                type="number"
                value={editingCoupon.maxDiscountAmount ?? ""}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    maxDiscountAmount: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.totalUsageLimit")}
              </label>
              <input
                type="number"
                value={editingCoupon.usageLimit ?? ""}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    usageLimit: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t("coupons.perCustomerLimit")}
              </label>
              <input
                type="number"
                value={editingCoupon.userUsageLimit ?? ""}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    userUsageLimit: parseInt(e.target.value) || 1,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editingCoupon.isActive}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    isActive: e.target.checked,
                  })
                }
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              {t("coupons.activateCoupon")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={editingCoupon.allowWithLoyalty ?? true}
                onChange={(e) =>
                  onCouponChange({
                    ...editingCoupon,
                    allowWithLoyalty: e.target.checked,
                  })
                }
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              {t("coupons.allowWithLoyalty")}
            </label>
          </div>

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
              onClick={onUpdate}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {actionLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                t("coupons.saveChanges")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
