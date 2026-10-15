import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  Upload,
  Download,
  LayoutGrid,
  List,
  MoreVertical,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
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
  const { i18n } = useTranslation();
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
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-base sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground">
            {isMerchant
              ? (isEn ? "My Products" : "منتجاتي")
              : (isEn ? "Products" : "إدارة المنتجات")}
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-border/70 bg-muted/60 text-muted-foreground text-xs font-mono font-medium tabular-nums">
            {productsCount} {isEn ? "items" : "منتج"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
          {isMerchant
            ? (isEn ? "Manage supplier price and stock under your scope; final retail prices are reviewed by the company." : "عدّل سعر المورد والمخزون المسموح لك بإدارته، والشركة تراجع السعر النهائي للعملاء.")
            : (isEn ? "Track and manage all your products, pricing, and inventory with ease." : "إدارة وتتبع جميع منتجاتك ومخزونك بكل سهولة")}
        </p>
      </div>

      {/* Action Buttons Cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* View Mode Toggle */}
        <div className="flex items-center p-0.5 border border-border/70 rounded-lg bg-muted/40 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "table"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={isEn ? "Table view" : "عرض جدول"}
            aria-label={isEn ? "Table view" : "عرض جدول"}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "grid"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={isEn ? "Grid view" : "عرض شبكة"}
            aria-label={isEn ? "Grid view" : "عرض شبكة"}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop Quick Actions */}
        {!isMerchant && (
          <Link
            to="/products/trash"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 rounded-lg text-xs font-semibold text-foreground bg-card hover:bg-muted transition-all active:scale-[0.98] shadow-2xs"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{isEn ? "Trash" : "سلة المحذوفات"}</span>
          </Link>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={onImportClick}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 rounded-lg text-xs font-semibold text-foreground bg-card hover:bg-muted transition-all active:scale-[0.98] shadow-2xs"
          >
            <Upload className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{isEn ? "Import CSV" : "استيراد CSV"}</span>
          </button>
        )}

        {!isMerchant && (
          <button
            type="button"
            onClick={onExport}
            disabled={isLoading}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 rounded-lg text-xs font-semibold text-foreground bg-card hover:bg-muted transition-all active:scale-[0.98] shadow-2xs disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {isLoading
                ? (isEn ? "Exporting..." : "تصدير...")
                : (isEn ? "Export CSV" : "تصدير CSV")}
            </span>
          </button>
        )}

        {/* Action Button: Create Quick Order / Quick Product */}
        {canCreateProducts && onQuickAddClick && (
          <button
            type="button"
            onClick={onQuickAddClick}
            className="inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 shadow-2xs transition-all active:scale-[0.98]"
            title={isEn ? "Create Quick Order" : "إنشاء طلب سريع"}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isEn ? "Create Quick Order" : "إنشاء طلب سريع"}</span>
          </button>
        )}

        {/* Delivery & Returns Analytics Shortcut */}
        <Link
          to="/analytics/orders/product-delivery-returns"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold text-foreground bg-card border border-border/70 hover:bg-muted transition-all shrink-0 shadow-2xs active:scale-[0.98]"
          title={isEn ? "Product Delivery & Returns Report" : "تحليل تسليم ومرتجع المنتجات"}
        >
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{isEn ? "Delivery & Returns" : "نسب التسليم والمرتجع"}</span>
        </Link>

        {/* Primary Action Button: Add Product */}
        {canCreateProducts && (
          <Link
            to="/products/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.98] shrink-0 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{isEn ? "Add Product" : "إضافة منتج"}</span>
          </Link>
        )}

        {/* More Actions Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            className="p-1.5 sm:p-2 border border-border/70 rounded-lg text-muted-foreground bg-card hover:bg-muted transition-all active:scale-[0.98] shadow-2xs"
            title={isEn ? "More Options" : "خيارات إضافية"}
            aria-label={isEn ? "More Options" : "خيارات إضافية"}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className={`absolute ${isEn ? "right-0" : "left-0"} mt-1.5 w-52 bg-card rounded-xl shadow-lg border border-border/70 py-1 z-50 animate-in fade-in zoom-in-95 duration-100`}>
              <Link
                to="/analytics/orders/product-delivery-returns"
                onClick={() => setShowMenu(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors border-b border-border/40 pb-2 mb-1"
              >
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>{isEn ? "Delivery & Returns Report" : "تحليل التسليم والمرتجعات"}</span>
              </Link>

              {canCreateProducts && onQuickAddClick && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onQuickAddClick();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{isEn ? "Create Quick Order" : "إنشاء طلب سريع"}</span>
                  </button>
                  <Link
                    to="/products/new"
                    onClick={() => setShowMenu(false)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors border-b border-border/40 pb-2 mb-1"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    <span>{isEn ? "Add Product (Full Form)" : "إضافة منتج (النموذج الكامل)"}</span>
                  </Link>
                </>
              )}

              {/* Mobile-only menu items */}
              {!isMerchant && (
                <Link
                  to="/products/trash"
                  onClick={() => setShowMenu(false)}
                  className="flex md:hidden items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                  <span>{isEn ? "Trash" : "سلة المحذوفات"}</span>
                </Link>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onImportClick();
                  }}
                  className="flex md:hidden w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span>{isEn ? "Import CSV" : "استيراد CSV"}</span>
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
                  className="flex md:hidden w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span>{isEn ? "Export CSV" : "تصدير CSV"}</span>
                </button>
              )}

              {/* Dangerous Action: Delete All */}
              {isAdmin && (
                <>
                  <div className="my-1 border-t border-border/40" />
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteAll();
                    }}
                    disabled={isDeletingAll || productsCount === 0}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <AlertTriangle className="h-4 w-4 text-destructive" />
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
