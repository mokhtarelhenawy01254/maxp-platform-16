import React from "react";
import { useTranslation } from "react-i18next";
import {
  ExclamationTriangleIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

interface CustomerDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const CustomerDeleteModal: React.FC<CustomerDeleteModalProps> = ({
  isOpen,
  onClose,
  customerName,
  onConfirm,
  isDeleting,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rose-100 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
            <ExclamationTriangleIcon className="h-5 w-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
            {t("customers.deleteConfirmTitle")}
          </h3>
        </div>
        <p className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm mb-6 leading-relaxed">
          {t("customers.deleteConfirmMessage", { name: customerName })}
          <br />
          <span className="text-rose-600 font-medium text-xs mt-1 block">
            {t("customers.deleteWarning")}
          </span>
        </p>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            {isDeleting ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>جاري الحذف...</span>
              </>
            ) : (
              <>
                <TrashIcon className="h-4 w-4" />
                <span>حذف العميل</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
