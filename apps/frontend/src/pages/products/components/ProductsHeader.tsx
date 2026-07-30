import { Plus as PlusIcon, Trash2 as TrashIcon, Upload as ArrowUpTrayIcon, Download as ArrowDownTrayIcon, Grid as Squares2X2Icon, List as ListBulletIcon } from 'lucide-react';
import React from "react";
import { Link } from "react-router-dom";
;
import { ViewMode } from "./ProductsTypes";

interface ProductsHeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isAdmin: boolean;
  isMerchant: boolean;
  canCreateProducts: boolean;
  isDeletingAll: boolean;
  productsCount: number;
  isLoading: boolean;
  onDeleteAll: () => void;
  onImportClick: () => void;
  onExport: () => void;
}

const ProductsHeader: React.FC<ProductsHeaderProps> = ({
  viewMode,
  setViewMode,
  isAdmin,
  isMerchant,
  canCreateProducts,
  isDeletingAll,
  productsCount,
  isLoading,
  onDeleteAll,
  onImportClick,
  onExport,
}) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-l from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
          {isMerchant ? "منتجاتي" : "إدارة المنتجات"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
          {isMerchant
            ? "عدّل سعر المورد والمخزون المسموح لك بإدارته، والشركة تراجع السعر النهائي للعملاء."
            : "إدارة وتتبع جميع منتجاتك ومخزونك بكل سهولة"}
        </p>
      </div>

      <div className="flex items-center space-x-3 space-x-reverse flex-wrap gap-2">
        {/* View Mode Toggle */}
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 transition-colors ${viewMode === "table"
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            title="عرض جدول"
          >
            <ListBulletIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 transition-colors ${viewMode === "grid"
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            title="عرض شبكة"
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
        </div>

        {isAdmin && (
          <button
            onClick={onDeleteAll}
            disabled={isDeletingAll || productsCount === 0}
            className="inline-flex items-center px-4 py-2 border border-red-200 dark:border-red-900/30 rounded-lg shadow-sm text-sm font-semibold text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <TrashIcon className="h-4 w-4 ml-2" />
            {isDeletingAll ? "جاري الحذف..." : "حذف الكل"}
          </button>
        )}

        {!isMerchant && (
          <Link
            to="/products/trash"
            className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <TrashIcon className="h-4 w-4 ml-2" />
            سلة المحذوفات
          </Link>
        )}

        {isAdmin && (
          <button
            onClick={onImportClick}
            className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            <ArrowUpTrayIcon className="h-4 w-4 ml-2" />
            استيراد CSV
          </button>
        )}

        {!isMerchant && (
          <button
            onClick={onExport}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4 ml-2" />
            {isLoading ? "جاري التصدير..." : "تصدير CSV"}
          </button>
        )}

        {canCreateProducts && (
          <Link
            to="/products/new"
            className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-lg shadow-lg text-sm font-bold text-white bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95"
          >
            <PlusIcon className="h-5 w-5 ml-2" />
            إضافة منتج
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductsHeader;
