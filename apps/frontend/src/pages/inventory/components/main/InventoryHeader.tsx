import React from "react";
import { PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface InventoryHeaderProps {
  isMerchant: boolean;
  canEditAnyStock: boolean;
  onDownloadCsv: () => void;
  onCreateProduct: () => void;
  onOpenStockUpdate: () => void;
}

export const InventoryHeader: React.FC<InventoryHeaderProps> = ({
  isMerchant,
  canEditAnyStock,
  onDownloadCsv,
  onCreateProduct,
  onOpenStockUpdate,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-2xl">
          {isMerchant ? "مخزوني" : "إدارة المخزون"}
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          {isMerchant
            ? "متابعة المنتجات المسندة لك والأرصدة المتاحة في مخازنك أو مخازن الشركة"
            : "متابعة وإدارة مستويات المخزون والتنبيهات لجميع منتجات الشركة"}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onDownloadCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
        >
          تصدير CSV
        </button>
        <button
          type="button"
          onClick={onCreateProduct}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          title="إنشاء طلب سريع / إضافة منتج"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          إضافة منتج
        </button>
        {canEditAnyStock && (
          <button
            type="button"
            onClick={onOpenStockUpdate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/80 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            تحديث المخزون
          </button>
        )}
      </div>
    </div>
  );
};
