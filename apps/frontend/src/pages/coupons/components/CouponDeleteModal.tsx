import React from "react";
import { useTranslation } from "react-i18next";
import { TrashIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { Coupon } from "./types";

interface CouponDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupon: Coupon | null;
  onDelete: () => void;
  actionLoading: boolean;
}

export const CouponDeleteModal: React.FC<CouponDeleteModalProps> = ({
  isOpen,
  onClose,
  coupon,
  onDelete,
  actionLoading,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !coupon) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
            <TrashIcon className="h-5 w-5 text-red-600" />
            {t("coupons.modalDeleteTitle")}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="py-4 text-sm text-gray-600 dark:text-gray-300">
          <p>{t("coupons.deleteConfirm")}</p>
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/50">
            <p className="font-mono font-bold text-red-700 dark:text-red-400">
              {coupon.code}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {coupon.name}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
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
            onClick={onDelete}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {actionLoading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              t("coupons.delete")
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
