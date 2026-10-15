import React from "react";
import {
  RefreshCw,
  DownloadCloud,
  SlidersHorizontal,
  Palette,
  Ruler,
  ShoppingBag,
} from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { useWooCommerceProducts } from "../hooks/useWooCommerceProducts";
import { WooProductItemCard } from "./WooProductItemCard";
import { Settings } from "../types";

interface ProductsTabProps {
  settings: Settings | null;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({ settings }) => {
  const { formatPrice } = useCurrency();
  const {
    wooProducts,
    fetchingProducts,
    importingProducts,
    selectedWooProducts,
    selectedVariants,
    expandedProduct,
    setExpandedProduct,
    variantFilter,
    setVariantFilter,
    fetchWooProducts,
    importSelectedProducts,
    toggleVariantSelection,
    selectAllVariantsForProduct,
    deselectAllVariantsForProduct,
    selectAllWooProducts,
    deselectAllWooProducts,
    groupVariantsByType,
    selectVariantsByType,
  } = useWooCommerceProducts(settings);

  const filteredWooProducts = React.useMemo(() => {
    if (variantFilter === "all") return wooProducts;

    return wooProducts.filter((product) => {
      const hasVariations =
        product.isVariable &&
        product.variations &&
        product.variations.length > 0;

      return (
        hasVariations &&
        product.variations!.some((variation) =>
          variation.attributes.some(
            (attribute) => attribute.type === variantFilter,
          ),
        )
      );
    });
  }, [wooProducts, variantFilter]);

  const allVisibleProductsSelected =
    filteredWooProducts.length > 0 &&
    filteredWooProducts.every((product) => {
      if (!selectedWooProducts.has(product.wooCommerceId)) return false;
      if (!product.isVariable || !product.variations?.length) return true;

      return (
        (selectedVariants.get(product.wooCommerceId)?.size || 0) ===
        product.variations.length
      );
    });
  const selectedVisibleProductsCount = filteredWooProducts.filter((product) =>
    selectedWooProducts.has(product.wooCommerceId),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-xs">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            استيراد المنتجات
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            جلب المنتجات وتحديث المخزون والأسعار مباشرة من متجر WooCommerce
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchWooProducts}
            disabled={fetchingProducts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-lg border border-border/60 disabled:opacity-50 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetchingProducts ? "animate-spin" : ""}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {(wooProducts?.length || 0) > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-card rounded-xl border border-border/70 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">
                تصفية المتغيرات:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVariantFilter("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    variantFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setVariantFilter("color")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                    variantFilter === "color"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Palette className="w-3 h-3" />
                  <span>ألوان</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVariantFilter("size")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1 ${
                    variantFilter === "size"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Ruler className="w-3 h-3" />
                  <span>مقاسات</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap justify-end">
              <div className="px-3 py-1.5 bg-muted/30 border border-border/50 rounded-lg text-right">
                <p className="text-[10px] text-muted-foreground">التحديد الحالي</p>
                <p className="text-xs font-mono tabular-nums font-semibold text-foreground">
                  {selectedVisibleProductsCount} من {filteredWooProducts.length} منتج
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (allVisibleProductsSelected) {
                    deselectAllWooProducts();
                  } else {
                    selectAllWooProducts();
                  }
                }}
                className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border/60 rounded-lg text-xs font-semibold transition-colors active:scale-[0.98]"
              >
                {allVisibleProductsSelected ? "إلغاء تحديد الظاهر" : "تحديد كل الظاهر"}
              </button>

              <button
                type="button"
                onClick={importSelectedProducts}
                disabled={importingProducts || selectedWooProducts.size === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
              >
                <DownloadCloud className={`h-3.5 w-3.5 ${importingProducts ? "animate-pulse" : ""}`} />
                <span>استيراد المحدد ({selectedWooProducts.size})</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredWooProducts.map((product) => {
              const isExpanded = expandedProduct === product.wooCommerceId;
              const productSelected = selectedWooProducts.has(product.wooCommerceId);
              const selectedVarSet = selectedVariants.get(product.wooCommerceId) || new Set<number>();

              return (
                <WooProductItemCard
                  key={product.wooCommerceId}
                  product={product}
                  isExpanded={isExpanded}
                  onToggleExpand={() =>
                    setExpandedProduct(isExpanded ? null : product.wooCommerceId)
                  }
                  productSelected={productSelected}
                  onToggleProductSelect={(checked) => {
                    if (checked) {
                      selectAllVariantsForProduct(product.wooCommerceId);
                    } else {
                      deselectAllVariantsForProduct(product.wooCommerceId);
                    }
                  }}
                  selectedVariants={selectedVarSet}
                  onToggleVariant={(variantId) =>
                    toggleVariantSelection(product.wooCommerceId, variantId)
                  }
                  onSelectAllVariants={() =>
                    selectAllVariantsForProduct(product.wooCommerceId)
                  }
                  onSelectVariantsByType={(type) =>
                    selectVariantsByType(product.wooCommerceId, type)
                  }
                  variantFilter={variantFilter}
                  groupVariantsByType={groupVariantsByType}
                  formatPrice={formatPrice}
                />
              );
            })}
          </div>
        </>
      )}

      {(wooProducts?.length || 0) === 0 && !fetchingProducts && (
        <div className="rounded-xl border border-border/70 bg-card p-10 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-muted text-muted-foreground mx-auto mb-3 flex items-center justify-center border border-border/50">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            اضغط على "تحديث القائمة" لجلب المنتجات من متجر WooCommerce
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductsTab;
