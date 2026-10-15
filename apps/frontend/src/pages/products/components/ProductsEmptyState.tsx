import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PackageOpen, Plus } from "lucide-react";

interface ProductsEmptyStateProps {
  isMerchant?: boolean;
  onQuickAddClick?: () => void;
}

const ProductsEmptyState: React.FC<ProductsEmptyStateProps> = ({
  isMerchant = false,
  onQuickAddClick,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  return (
    <div className="rounded-xl border border-border/70 bg-card p-10 sm:p-14 text-center shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-muted text-muted-foreground mx-auto mb-4 flex items-center justify-center border border-border/50">
        <PackageOpen className="h-7 w-7" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5">
        {isEn ? "No products found" : "لا توجد منتجات حتى الآن"}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
        {isEn
          ? "Start by adding your first product to manage inventory and pricing"
          : "ابدأ بإضافة منتجك الأول لتتمكن من إدارة المخزون، الأسعار، وعرض المنتجات للعملاء"}
      </p>
      <div className="flex gap-2.5 justify-center flex-wrap items-center">
        {!isMerchant && (
          <>
            <Link
              to="/products/import-easy-orders"
              className="inline-flex items-center px-3.5 py-1.5 border border-border/70 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
            >
              Easy Orders
            </Link>
            <Link
              to="/products/import-woocommerce"
              className="inline-flex items-center px-3.5 py-1.5 border border-border/70 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors active:scale-[0.98]"
            >
              WooCommerce
            </Link>
          </>
        )}
        {onQuickAddClick ? (
          <button
            type="button"
            onClick={onQuickAddClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>{isEn ? "Add New Product" : "إضافة منتج جديد"}</span>
          </button>
        ) : (
          <Link
            to="/products/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent rounded-lg text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>{isEn ? "Add New Product" : "إضافة منتج جديد"}</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default ProductsEmptyState;
