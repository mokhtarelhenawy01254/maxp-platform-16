import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="flex items-center justify-between gap-3 animate-slide-up">
      {/* Title & Subtitle */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-l from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent truncate">
          {isMerchant ? "منتجاتي" : "إدارة المنتجات"}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
          {isMerchant
            ? "عدّل سعر المورد والمخزون المسموح لك بإدارته، والشركة تراجع السعر النهائي للعملاء."
            : "إدارة وتتبع جميع منتجاتك ومخزونك بكل سهولة"}
        </p>
      </div>

      {/* Action Buttons Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* View Mode Toggle */}
        <div className="flex border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-xs bg-white dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 sm:p-2 transition-colors ${
              viewMode === "table"
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title="عرض جدول"
            aria-label="عرض جدول"
          >
            <ListBulletIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 sm:p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title="عرض شبكة"
            aria-label="عرض شبكة"
          >
            <Squares2X2Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
          </button>
        </div>

        {/* Desktop Quick Actions (hidden on mobile to save space) */}
        {!isMerchant && (
          <Link
            to="/products/trash"
            className="hidden md:inline-flex items-center px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
          >
            <TrashIcon className="h-3.5 w-3.5 ml-1.5 text-gray-500" />
            سلة المحذوفات
          </Link>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={onImportClick}
            className="hidden md:inline-flex items-center px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
          >
            <ArrowUpTrayIcon className="h-3.5 w-3.5 ml-1.5 text-gray-500" />
            استيراد CSV
          </button>
        )}

        {!isMerchant && (
          <button
            type="button"
            onClick={onExport}
            disabled={isLoading}
            className="hidden md:inline-flex items-center px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-3.5 w-3.5 ml-1.5 text-gray-500" />
            {isLoading ? "تصدير..." : "تصدير CSV"}
          </button>
        )}

        {/* Primary Action Button: Add Product */}
        {canCreateProducts && (
          <Link
            to="/products/new"
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-sm transition-all transform active:scale-95 shrink-0"
          >
            <PlusIcon className="h-4 w-4 ml-1 sm:ml-1.5" />
            <span>إضافة منتج</span>
          </Link>
        )}

        {/* More Actions Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 sm:p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
            title="خيارات إضافية"
            aria-label="خيارات إضافية"
          >
            <EllipsisVerticalIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {showMenu && (
            <div className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* Mobile-only menu items */}
              {!isMerchant && (
                <Link
                  to="/products/trash"
                  onClick={() => setShowMenu(false)}
                  className="flex md:hidden items-center px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <TrashIcon className="h-4 w-4 ml-2.5 text-gray-400" />
                  سلة المحذوفات
                </Link>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onImportClick();
                  }}
                  className="flex md:hidden w-full items-center px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <ArrowUpTrayIcon className="h-4 w-4 ml-2.5 text-gray-400" />
                  استيراد CSV
                </button>
              )}

              {!isMerchant && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onExport();
                  }}
                  disabled={isLoading}
                  className="flex md:hidden w-full items-center px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 ml-2.5 text-gray-400" />
                  تصدير CSV
                </button>
              )}

              {/* Dangerous Action: Delete All (Always tucked inside dropdown menu for safety) */}
              {isAdmin && (
                <>
                  <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteAll();
                    }}
                    disabled={isDeletingAll || productsCount === 0}
                    className="flex w-full items-center px-3.5 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ExclamationTriangleIcon className="h-4 w-4 ml-2.5 text-red-500" />
                    <span>{isDeletingAll ? "جاري الحذف..." : "حذف جميع المنتجات"}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsHeader;

