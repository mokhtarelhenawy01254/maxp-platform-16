import { RefreshCw as ArrowPathIcon, Download as ArrowDownTrayIcon, ChevronDown as ChevronDownIcon, ChevronRight as ChevronRightIcon, Check as CheckIcon, Filter as FunnelIcon, ShoppingBag as ShoppingBagIcon, X as XMarkIcon } from 'lucide-react';
import React from "react";
;
import { useCurrency } from "../../../hooks/useCurrency";
import { useWooCommerceProducts } from "../hooks/useWooCommerceProducts";
import { Settings } from "../types";
import { getImageUrl } from "../../../utils/imageUrl";

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
  const hiddenSelectedProductsCount = Math.max(
    0,
    selectedWooProducts.size - selectedVisibleProductsCount,
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            استيراد المنتجات
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            جلب المنتجات وتحديث المخزون من WooCommerce
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={fetchWooProducts}
            disabled={fetchingProducts}
            className="flex-1 sm:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {fetchingProducts ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-5 w-5" />
            )}
            تحديث القائمة
          </button>
        </div>
      </div>

      {(wooProducts?.length || 0) > 0 && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                تصفية المتغيرات:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setVariantFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    variantFilter === "all"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  الكل
                </button>
                <button
                  onClick={() => setVariantFilter("color")}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                    variantFilter === "color"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 "
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"></span>
                  ألوان
                </button>
                <button
                  onClick={() => setVariantFilter("size")}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1 ${
                    variantFilter === "size"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  <FunnelIcon className="w-3 h-3" />
                  مقاسات
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-right min-w-[180px]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  التحديد الحالي
                </p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {selectedVisibleProductsCount} من {filteredWooProducts.length}{" "}
                  منتج ظاهر
                </p>
                {hiddenSelectedProductsCount > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    +{hiddenSelectedProductsCount} محدد خارج التصفية الحالية
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  if (allVisibleProductsSelected) {
                    deselectAllWooProducts(filteredWooProducts);
                  } else {
                    selectAllWooProducts(filteredWooProducts);
                  }
                }}
                disabled={filteredWooProducts.length === 0}
                className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors font-medium"
              >
                {allVisibleProductsSelected ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <CheckIcon className="h-5 w-5" />
                )}
                {allVisibleProductsSelected
                  ? "إلغاء تحديد كل المنتجات"
                  : "تحديد كل المنتجات"}
              </button>

              <button
                onClick={importSelectedProducts}
                disabled={importingProducts || selectedWooProducts.size === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95 transition-all font-bold"
              >
                {importingProducts ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="h-5 w-5" />
                )}
                استيراد المحدد ({selectedWooProducts.size})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredWooProducts.map((product) => {
              const isExpanded = expandedProduct === product.wooCommerceId;
              const hasVariations =
                product.isVariable &&
                product.variations &&
                product.variations.length > 0;
              const productSelected = selectedWooProducts.has(
                product.wooCommerceId,
              );
              const selectedCount =
                selectedVariants.get(product.wooCommerceId)?.size || 0;
              const totalVariations = product.variations?.length || 0;
              const variantTypes = hasVariations
                ? groupVariantsByType(product.variations!)
                : {};

              return (
                <div
                  key={product.wooCommerceId}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-right"
                >
                  <div className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={productSelected}
                      onChange={(e) => {
                        if (e.target.checked)
                          selectAllVariantsForProduct(product.wooCommerceId);
                        else
                          deselectAllVariantsForProduct(product.wooCommerceId);
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-offset-0 focus:ring-1"
                    />
                    {product.images?.[0] ? (
                      <img
                        src={getImageUrl(product.images[0]) || ""}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <ShoppingBagIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>#{product.sku || "N/A"}</span>
                        <span>•</span>
                        <span>{formatPrice(product.price)}</span>
                        {hasVariations && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs font-medium">
                              {totalVariations} متغيرات
                              {selectedCount > 0 && ` (${selectedCount} محدد)`}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Quick Variation Filters for this product */}
                      {hasVariations && isExpanded && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllVariantsForProduct(
                                product.wooCommerceId,
                              );
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            تحديد الكل
                          </button>
                          {variantTypes.color && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectVariantsByType(
                                  product.wooCommerceId,
                                  "color",
                                );
                              }}
                              className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                            >
                              تحديد الألوان
                            </button>
                          )}
                          {variantTypes.size && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectVariantsByType(
                                  product.wooCommerceId,
                                  "size",
                                );
                              }}
                              className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                            >
                              تحديد المقاسات
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {hasVariations && (
                      <button
                        onClick={() =>
                          setExpandedProduct(
                            isExpanded ? null : product.wooCommerceId,
                          )
                        }
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Variations List */}
                  {isExpanded && hasVariations && (
                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-black/20 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 animate-fadeIn">
                      {product.variations!.map((variant) => {
                        // Check Filters
                        if (variantFilter !== "all") {
                          const hasAttr = variant.attributes.some(
                            (attribute) => attribute.type === variantFilter,
                          );
                          if (!hasAttr) return null;
                        }

                        const isSelected = selectedVariants
                          .get(product.wooCommerceId)
                          ?.has(variant.wooCommerceVariationId);

                        return (
                          <div
                            key={variant.wooCommerceVariationId}
                            onClick={() =>
                              toggleVariantSelection(
                                product.wooCommerceId,
                                variant.wooCommerceVariationId,
                              )
                            }
                            className={`
                                                flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                                ${
                                                  isSelected
                                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                                }
                                            `}
                          >
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              readOnly
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-offset-0 focus:ring-1 pointer-events-none"
                            />
                            {variant.images?.[0] && (
                              <img
                                src={getImageUrl(variant.images[0]) || ""}
                                alt=""
                                className="w-10 h-10 object-cover rounded border border-gray-100 dark:border-gray-700"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {variant.attributes.map(
                                  (attr, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-xs px-2 py-0.5 rounded border ${
                                        attr.type === "color"
                                          ? "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                                          : "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                                      }`}
                                    >
                                      {attr.type === "color" &&
                                        attr.colorHex && (
                                          <span
                                            className="w-2 h-2 rounded-full inline-block ml-1"
                                            style={{
                                              backgroundColor: attr.colorHex,
                                            }}
                                          ></span>
                                        )}
                                      {attr.option}
                                    </span>
                                  ),
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                <span>{variant.sku || "No SKU"}</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {formatPrice(variant.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {(wooProducts?.length || 0) === 0 && !fetchingProducts && (
        <div className="text-center py-12">
          <ShoppingBagIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            اضغط على &quot;تحديث القائمة&quot; لعرض المنتجات
          </p>
        </div>
      )}
    </div>
  );
};
