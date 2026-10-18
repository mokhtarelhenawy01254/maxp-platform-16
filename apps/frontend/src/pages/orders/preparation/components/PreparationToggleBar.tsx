import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { NotPrintedFilter, NoShippingCodeFilter } from "../types";
import type { ProductOption } from "./useProductFilterOptions";

export interface PreparationToggleBarProps {
  notPrintedFilter: NotPrintedFilter;
  noShippingCodeFilter: NoShippingCodeFilter;
  productFilter: string;
  localProductFilter: string;
  setLocalProductFilter: (val: string) => void;
  showProductSuggestions: boolean;
  setShowProductSuggestions: (val: boolean) => void;
  products: ProductOption[];
  productsLoading: boolean;
  productIdFilter: string;
  variantIdFilter: string;
  productColorFilter: string;
  productSizeFilter: string;
  selectedProductVariants: Array<{ id: string; name: string }>;
  availableColors: string[];
  availableSizes: string[];
  visibleFilterSections: string[];
  onNotPrintedFilterChange: (value: NotPrintedFilter) => void;
  onNoShippingCodeFilterChange: (value: NoShippingCodeFilter) => void;
  onProductFilterChange: (value: string) => void;
  onProductIdFilterChange: (value: string) => void;
  onVariantIdFilterChange: (value: string) => void;
  onProductColorFilterChange: (value: string) => void;
  onProductSizeFilterChange: (value: string) => void;
}

export const PreparationToggleBar: React.FC<PreparationToggleBarProps> = ({
  notPrintedFilter,
  noShippingCodeFilter,
  localProductFilter,
  setLocalProductFilter,
  showProductSuggestions,
  setShowProductSuggestions,
  products,
  productsLoading,
  productIdFilter,
  variantIdFilter,
  productColorFilter,
  productSizeFilter,
  selectedProductVariants,
  availableColors,
  availableSizes,
  visibleFilterSections,
  onNotPrintedFilterChange,
  onNoShippingCodeFilterChange,
  onProductFilterChange,
  onProductIdFilterChange,
  onVariantIdFilterChange,
  onProductColorFilterChange,
  onProductSizeFilterChange,
}) => {
  const { t } = useTranslation();
  const productInputRef = useRef<HTMLInputElement>(null);
  const productSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        productSuggestionsRef.current &&
        !productSuggestionsRef.current.contains(e.target as Node) &&
        !productInputRef.current?.contains(e.target as Node)
      ) {
        setShowProductSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowProductSuggestions]);

  if (!visibleFilterSections.includes("toggleButtons")) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-3 py-2 bg-card/60">
      <div className="flex flex-wrap items-center gap-1.5 max-sm:w-full">
        <button
          onClick={() =>
            onNotPrintedFilterChange(notPrintedFilter === "not_printed" ? "all" : "not_printed")
          }
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition max-sm:flex-1 border active:scale-[0.98] ${
            notPrintedFilter === "not_printed"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs border-transparent font-bold"
              : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {t("preparation.filters.notPrinted", { defaultValue: "غير مطبوعة" })}
        </button>
        <button
          onClick={() =>
            onNoShippingCodeFilterChange(
              noShippingCodeFilter === "no_shipping_code" ? "all" : "no_shipping_code"
            )
          }
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition max-sm:flex-1 border active:scale-[0.98] ${
            noShippingCodeFilter === "no_shipping_code"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs border-transparent font-bold"
              : "border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {t("preparation.filters.noShippingCode", { defaultValue: "بدون بوليصة" })}
        </button>
      </div>

      <div className="relative w-full sm:ms-auto sm:min-w-[200px] sm:max-w-[280px] max-sm:mt-1">
        <input
          ref={productInputRef}
          value={localProductFilter}
          onChange={(e) => {
            setLocalProductFilter(e.target.value);
            onProductFilterChange(e.target.value);
            if (e.target.value === "") {
              onProductIdFilterChange("");
              onProductColorFilterChange("");
              onProductSizeFilterChange("");
            }
            setShowProductSuggestions(true);
          }}
          onFocus={() => setShowProductSuggestions(true)}
          placeholder={t("preparation.filters.productPlaceholder", { defaultValue: "بحث بالمنتج..." })}
          className="h-9 w-full rounded-xl border border-border/70 bg-background/80 px-3 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
        />
        <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        {showProductSuggestions && (
          <div
            ref={productSuggestionsRef}
            className="absolute right-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-2xl border border-border/80 bg-card p-1 shadow-xl text-xs"
          >
            {productsLoading && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t("common.loading", { defaultValue: "جاري التحميل..." })}
              </div>
            )}
            {!productsLoading && products.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t("preparation.filters.noProductResults", { defaultValue: "لا توجد منتجات مطابقة" })}
              </div>
            )}
            {!productsLoading &&
              products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onProductFilterChange(p.name);
                    onProductIdFilterChange(p.id);
                    onProductColorFilterChange("");
                    onProductSizeFilterChange("");
                    setShowProductSuggestions(false);
                  }}
                  className="cursor-pointer rounded-xl px-3 py-1.5 text-xs text-foreground hover:bg-muted font-medium transition-colors"
                >
                  {p.name}
                </div>
              ))}
          </div>
        )}
      </div>

      {selectedProductVariants.length > 0 && (
        <div className="relative min-w-[140px]">
          <select
            value={variantIdFilter}
            onChange={(e) => onVariantIdFilterChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors"
          >
            <option value="">{t("preparation.filters.allVariants", { defaultValue: "كل المتغيرات" })}</option>
            {selectedProductVariants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {productIdFilter && availableColors.length > 0 && (
        <div className="relative sm:min-w-[120px] max-sm:w-full">
          <select
            value={productColorFilter}
            onChange={(e) => onProductColorFilterChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors"
          >
            <option value="">{t("preparation.filters.productColorAll", { defaultValue: "كل الألوان" })}</option>
            {availableColors.map((color, idx) => (
              <option key={idx} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      )}

      {productIdFilter && availableSizes.length > 0 && (
        <div className="relative sm:min-w-[120px] max-sm:w-full">
          <select
            value={productSizeFilter}
            onChange={(e) => onProductSizeFilterChange(e.target.value)}
            className="h-9 w-full rounded-xl border border-border/70 bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-colors"
          >
            <option value="">{t("preparation.filters.productSizeAll", { defaultValue: "كل المقاسات" })}</option>
            {availableSizes.map((size, idx) => (
              <option key={idx} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default PreparationToggleBar;
