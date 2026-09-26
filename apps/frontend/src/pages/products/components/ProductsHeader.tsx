import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  Squares2X2Icon,
  ListBulletIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
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
  onQuickAddClick?: () => void;
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
  onQuickAddClick,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
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
    <div className="relative z-30 flex items-center justify-between gap-2 sm:gap-3 animate-slide-up">
      {/* Title & Subtitle */}
      <div className="min-w-0 flex-1">
        <h1 className="text-base sm:text-2xl lg:text-3xl font-bold bg-gradient-to-l from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent truncate">
          {isMerchant
            ? (isEn ? "My Products" : "منتجاتي")
            : (isEn ? "Products" : "إدارة المنتجات")}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
          {isMerchant
            ? (isEn ? "Manage supplier price and stock under your scope; final retail prices are reviewed by the company." : "عدّل سعر المورد والمخزون المسموح لك بإدارته، والشركة تراجع السعر النهائي للعملاء.")
            : (isEn ? "Track and manage all your products, pricing, and inventory with ease." : "إدارة وتتبع جميع منتجاتك ومخزونك بكل سهولة")}
        </p>
      </div>

      {/* Action Buttons Cluster */}
      <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
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
            title={isEn ? "Table view" : "عرض جدول"}
            aria-label={isEn ? "Table view" : "عرض جدول"}
          >
            <ListBulletIcon className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 sm:p-2 transition-colors ${
              viewMode === "grid"
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title={isEn ? "Grid view" : "عرض شبكة"}
            aria-label={isEn ? "Grid view" : "عرض شبكة"}
          >
            <Squares2X2Icon className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
          </button>
        </div>

        {/* Desktop Quick Actions (hidden on mobile to save space) */}
        {!isMerchant && (
          <Link
            to="/products/trash"
            className="hidden md:inline-flex items-center px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
          >
            <TrashIcon className={`h-3.5 w-3.5 ${isEn ? "mr-1.5" : "ml-1.5"} text-gray-500`} />
            {isEn ? "Trash" : "سلة المحذوفات"}
          </Link>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={onImportClick}
            className="hidden md:inline-flex items-center px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
          >
            <ArrowUpTrayIcon className={`h-3.5 w-3.5 ${isEn ? "mr-1.5" : "ml-1.5"} text-gray-500`} />
            {isEn ? "Import CSV" : "استيراد CSV"}
          </button>
        )}

        {!isMerchant && (
          <button
            type="button"
            onClick={onExport}
            disabled={isLoading}
            className="hidden md:inline-flex items-center px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <ArrowDownTrayIcon className={`h-3.5 w-3.5 ${isEn ? "mr-1.5" : "ml-1.5"} text-gray-500`} />
            {isLoading
              ? (isEn ? "Exporting..." : "تصدير...")
              : (isEn ? "Export CSV" : "تصدير CSV")}
          </button>
        )}

        {/* Action Button: Create Quick Order / Quick Product */}
        {canCreateProducts && onQuickAddClick && (
          <button
            type="button"
            onClick={onQuickAddClick}
            className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 sm:gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 shadow-2xs transition-all transform active:scale-95"
            title={isEn ? "Create Quick Order" : "إنشاء طلب سريع"}
          >
            <PlusIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isEn ? "mr-1 sm:mr-1.5" : "ml-1 sm:ml-1.5"}`} />
            <span>{isEn ? "Create Quick Order" : "إنشاء طلب سريع"}</span>
          </button>
        )}

        {/* Delivery & Returns Analytics Shortcut */}
        <Link
          to="/analytics/orders/product-delivery-returns"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition-all shrink-0 shadow-2xs"
          title={isEn ? "Product Delivery & Returns Report" : "تحليل تسليم ومرتجع المنتجات"}
        >
          <ChartBarIcon className="h-4 w-4 text-indigo-500" />
          <span>{isEn ? "Delivery & Returns" : "نسب التسليم والمرتجع"}</span>
        </Link>

        {/* Primary Action Button: Add Product */}
        {canCreateProducts && (
          <Link
            to="/products/new"
            className="inline-flex items-center px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all transform active:scale-95 shrink-0 shadow-xs"
          >
            <PlusIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isEn ? "mr-1 sm:mr-1.5" : "ml-1 sm:ml-1.5"}`} />
            <span>{isEn ? "Add Product" : "إضافة منتج"}</span>
          </Link>
        )}

        {/* More Actions Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 sm:p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-xs"
            title={isEn ? "More Options" : "خيارات إضافية"}
            aria-label={isEn ? "More Options" : "خيارات إضافية"}
          >
            <EllipsisVerticalIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {showMenu && (
            <div className={`absolute ${isEn ? "right-0" : "left-0"} mt-1.5 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 ring-1 ring-black/10 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-100`}>
              {/* Delivery & Returns report link in dropdown */}
              <Link
                to="/analytics/orders/product-delivery-returns"
                onClick={() => setShowMenu(false)}
                className="flex w-full items-center px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors border-b border-gray-100 dark:border-gray-700/50 pb-2 mb-1"
              >
                <ChartBarIcon className={`h-4 w-4 ${isEn ? "mr-2.5" : "ml-2.5"} text-indigo-500`} />
                <span>{isEn ? "Delivery & Returns Report" : "تحليل التسليم والمرتجعات"}</span>
              </Link>
              {/* Quick Add / Advanced links in dropdown */}
              {canCreateProducts && onQuickAddClick && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onQuickAddClick();
                    }}
                    className="flex w-full items-center px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <PlusIcon className={`h-4 w-4 ${isEn ? "mr-2.5" : "ml-2.5"} text-emerald-600 dark:text-emerald-400`} />
                    {isEn ? "Create Quick Order" : "إنشاء طلب سريع"}
                  </button>
                  <Link
                    to="/products/new"
                    onClick={() => setShowMenu(false)}
                    className="flex w-full items-center px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors border-b border-gray-100 dark:border-gray-700/50 pb-2 mb-1"
                  >
                    <PlusIcon className={`h-4 w-4 ${isEn ? "mr-2.5" : "ml-2.5"} text-gray-400`} />
                    {isEn ? "Add Product (Full Form)" : "إضافة منتج (النموذج الكامل)"}
                  </Link>
                </>
              )}
              {/* Mobile-only menu items */}
              {!isMerchant && (
                <Link
                  to="/products/trash"
                  onClick={() => setShowMenu(false)}
                  className="flex md:hidden items-center px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                >
                  <TrashIcon className={`h-4 w-4 ${isEn ? "mr-2.5" : "ml-2.5"} text-gray-400`} />
                  {isEn ? "Trash" : "سلة المحذوفات"}
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
                  <ArrowUpTrayIcon className={`h-4 w-4 ${isEn ? "mr-2.5" : "ml-2.5"} text-gray-400`} />
                  {isEn ? "Import CSV" : "استيراد CSV"}
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
                  <ArrowDownTrayIcon className={`h-4 w-4 ${isEn ? "mr-2.5" : "ml-2.5"} text-gray-400`} />
                  {isEn ? "Export CSV" : "تصدير CSV"}
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
                    <ExclamationTriangleIcon className={`h-4 w-4 ${isEn ? "mr-2.5" : "ml-2.5"} text-red-500`} />
                    <span>
                      {isDeletingAll
                        ? (isEn ? "Deleting..." : "جاري الحذف...")
                        : (isEn ? "Delete All Products" : "حذف جميع المنتجات")}
                    </span>
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

