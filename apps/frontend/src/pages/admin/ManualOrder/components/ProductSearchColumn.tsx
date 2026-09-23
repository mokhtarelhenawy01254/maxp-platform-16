import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { authService } from "../../../../services/authService";
import { config } from "../../../../config";
import { toast } from "sonner";
import { getPrimaryImageUrl, buildOptimizedUploadImageUrl } from "../../../../utils/imageUrl";
import { parseVariantAttributes } from "../utils/variantAttributes";

interface ProductVariant {
  id: string;
  sku: string;
  price: number | string;
  stock: number;
  name: string;
  type?: string;
  color?: string;
  size?: string;
  image?: string;
  metadata?: string;
  attributeValues?: Record<string, string>;
  trackInventory?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  sku: string;
  trackInventory?: boolean;
  variants: ProductVariant[];
}

interface ApiProductVariant extends Partial<ProductVariant> {
  id: string;
  availableStock?: unknown;
  fulfillableStock?: unknown;
  images?: unknown;
}

interface ApiProduct {
  id: string;
  name?: unknown;
  price?: unknown;
  mainImage?: unknown;
  image?: unknown;
  images?: unknown;
  stock?: unknown;
  availableStock?: unknown;
  fulfillableStock?: unknown;
  trackInventory?: boolean;
  sku?: unknown;
  variants?: ApiProductVariant[];
  productVariants?: ApiProductVariant[];
}

/** Returns true if the item is considered in-stock (either tracking is off, or stock > 0) */
const isInStock = (item: { stock: number; trackInventory?: boolean }): boolean => {
  if (item.trackInventory === false) return true;
  return item.stock > 0;
};

const resolveStock = (...values: unknown[]): number => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return 0;
};

interface ProductSearchColumnProps {
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  mode?: "admin" | "affiliate";
}

// Helper function to extract unique attributes from variants
const extractAttributes = (
  variants: ProductVariant[],
): { name: string; values: string[] }[] => {
  const attributeMap: Record<string, Set<string>> = {};

  variants.forEach((variant) => {
    const attrs = parseVariantAttributes(variant);
    Object.entries(attrs).forEach(([key, value]) => {
      if (!attributeMap[key]) attributeMap[key] = new Set();
      if (value) attributeMap[key].add(value);
    });
  });

  // Sort attributes to ensure consistent order
  return Object.entries(attributeMap)
    .filter(([_, values]) => values.size > 0)
    .map(([name, values]) => ({
      name,
      values: Array.from(values).sort(),
    }));
};

const ProductSearchColumn: React.FC<ProductSearchColumnProps> = ({
  onAddToCart,
  mode = "admin",
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Variant Selection State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Multi-level selection state
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});

  // Debounce search could be better, but let's keep it simple for now
  const fetchProducts = useCallback(async (query: string = "") => {
    try {
      setLoading(true);
      const token = authService.getAccessToken();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      const params = new URLSearchParams({
        page: "1",
        limit: "200",
        manualOrder: "true", // ✅ Request all products for manual order
      });

      if (query.trim()) {
        params.set("search", query.trim());
      }

      const response = await fetch(
        `${config.apiUrl}/products?${params.toString()}`,
        { headers },
      );
      const data = await response.json();

      if (data.success && data.data) {
        const sourceProducts = Array.isArray(data.data)
          ? (data.data as ApiProduct[])
          : [];
        const mappedProducts: Product[] = sourceProducts.map((p) => {
          const productStock = resolveStock(
            p.availableStock,
            p.fulfillableStock,
            p.stock,
          );

          return {
            id: p.id,
            name: String(p.name || ""),
            price: Number(p.price || 0),
            stock: productStock,
            trackInventory: p.trackInventory,
            sku: String(p.sku || ""),
            image: getPrimaryImageUrl(p.mainImage, p.image, p.images),
            variants: (p.variants || p.productVariants || []).map((v) => ({
              ...v,
              image: getPrimaryImageUrl(v.image, v.images),
              stock: resolveStock(
                v.availableStock,
                v.fulfillableStock,
                v.stock,
                productStock,
              ),
              trackInventory: v.trackInventory,
            })),
          };
        });

        const filtered = query
          ? mappedProducts.filter(
              (p) =>
                String(p.name || "")
                  .toLowerCase()
                  .includes(query.toLowerCase()) ||
                String(p.sku || "")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
          : mappedProducts;

        setProducts(filtered);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(t('manualOrder.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleRefresh = async () => {
    await fetchProducts(searchQuery);
    toast.success(t('manualOrder.productsRefreshed'));
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedAttributes({});
      setIsModalOpen(true);
    } else {
      onAddToCart(product);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (selectedProduct) {
      onAddToCart(selectedProduct, variant);
      setIsModalOpen(false);
      setSelectedProduct(null);
      setSelectedAttributes({});
    }
  };

  const handleAttributeSelect = (attrName: string, value: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attrName]: value,
    }));
  };

  // Extract attributes from selected product
  const productAttributes = useMemo(() => {
    if (!selectedProduct) return [];
    return extractAttributes(selectedProduct.variants);
  }, [selectedProduct]);

  // Filter variants based on selected attributes
  const filteredVariants = useMemo(() => {
    if (!selectedProduct) return [];

    return selectedProduct.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(selectedAttributes).every(([key, value]) => {
        return variantAttrs[key] === value;
      });
    });
  }, [selectedProduct, selectedAttributes]);

  // Get available values for each attribute based on current selection
  const getAvailableValues = (attrName: string): string[] => {
    if (!selectedProduct) return [];

    // Filter variants based on all OTHER selected attributes (not this one)
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attrName];

    const availableVariants = selectedProduct.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(otherSelections).every(([key, value]) => {
        return variantAttrs[key] === value;
      });
    });

    const values = new Set<string>();
    availableVariants.forEach((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      if (variantAttrs[attrName]) {
        values.add(variantAttrs[attrName]);
      }
    });

    return Array.from(values);
  };

  // Check if all attributes are selected
  const allAttributesSelected =
    productAttributes.length > 0 &&
    productAttributes.every((attr) => selectedAttributes[attr.name]);

  // Get the matching variant when all attributes are selected
  const matchedVariant = useMemo(() => {
    if (!allAttributesSelected || filteredVariants.length !== 1) return null;
    return filteredVariants[0];
  }, [allAttributesSelected, filteredVariants]);

  const isAffiliateMode = mode === "affiliate";

  return (
    <div
      className="flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden relative"
      style={{ height: "100%", maxHeight: "100%" }}
    >
      {/* Search Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            {isAffiliateMode ? t('manualOrder.affiliateProducts') : t('manualOrder.products')}
          </h2>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            title={t('manualOrder.refreshProducts')}
            className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            aria-label={t('manualOrder.refreshProducts')}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin text-blue-600 dark:text-blue-400" : ""}`} />
          </button>
        </div>
        <div className="relative">
          <input
            id="manual-order-product-search"
            type="text"
            placeholder={t('manualOrder.searchPlaceholder')}
            className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchProducts(searchQuery);
            }}
          />
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute right-3 top-2.5" />
        </div>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-2 manual-order-scroll manual-order-column">
        {loading ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden animate-pulse"
              >
                <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="flex justify-between items-center mt-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500">
            <ArchiveBoxIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>
              {isAffiliateMode
                ? t('manualOrder.noAffiliateProducts')
                : t('manualOrder.noProducts')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group cursor-pointer overflow-hidden relative"
                onClick={() => handleProductClick(product)}
              >
                {/* Image - Now larger and on top */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative">
                    {product.image ? (
                      <img
                        src={buildOptimizedUploadImageUrl(product.image, { width: 300 })}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                      <ArchiveBoxIcon className="w-12 h-12" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-black/10 transition-colors" />

                  {/* Stock Badge */}
                  {product.trackInventory !== false && product.stock <= 5 && (
                    <div className="absolute top-2 left-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-red-600 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-red-100 dark:border-red-900">
                      {t('manualOrder.k_135')} {product.stock}
                    </div>
                  )}

                  {/* Variant Badge */}
                  {product.variants.length > 0 && (
                    <div className="absolute bottom-2 right-2 bg-blue-600 dark:bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm">
                      {t('manualOrder.k_136')}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 h-10 leading-snug mb-1"
                    title={product.name}
                  >
                    {product.name}
                  </h3>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">
                      {product.price} {t('manualOrder.k_75')}
                    </span>

                    <button
                      className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                    SKU: {product.sku || "N/A"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Variant Selection Modal */}
      {isModalOpen && selectedProduct && (
        <div className="absolute inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate pr-4">
                {selectedProduct.name}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedAttributes({});
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {/* Multi-level attribute selection */}
              {productAttributes.length > 0 ? (
                <div className="space-y-4">
                  {productAttributes.map((attr) => {
                    const availableValues = getAvailableValues(attr.name);
                    const isSelected = selectedAttributes[attr.name];

                    return (
                      <div key={attr.name} className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {attr.name}
                          {isSelected && (
                            <span className="text-blue-600 dark:text-blue-400 mr-2">
                              : {isSelected}
                            </span>
                          )}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value) => {
                            const isAvailable = availableValues.includes(value);
                            const isActive =
                              selectedAttributes[attr.name] === value;

                            return (
                              <button
                                key={value}
                                onClick={() =>
                                  handleAttributeSelect(attr.name, value)
                                }
                                disabled={!isAvailable}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                                    ${
                                      isActive
                                        ? "bg-blue-600 dark:bg-blue-500 text-white border-2 border-blue-600 dark:border-blue-500"
                                        : isAvailable
                                          ? "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                          : "bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-2 border-gray-100 dark:border-gray-800 cursor-not-allowed line-through"
                                    }
                                `}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Selected variant info & add button */}
                  {matchedVariant && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {matchedVariant.price} {t('manualOrder.k_75')}
                          </div>
                          <div
                            className={`text-sm ${isInStock(matchedVariant) ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400 font-medium"}`}
                          >
                            {isInStock(matchedVariant)
                              ? matchedVariant.trackInventory === false
                                ? t('manualOrder.inStock')
                                : t('manualOrder.available_count', { count: matchedVariant.stock })
                              : t('manualOrder.outOfStock')}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          SKU: {matchedVariant.sku}
                        </div>
                      </div>
                      <button
                        onClick={() => handleVariantSelect(matchedVariant)}
                        disabled={!isInStock(matchedVariant)}
                        className={`w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2
                                                    ${
                                                      isInStock(matchedVariant)
                                                        ? "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                                                        : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                                    }
                                                `}
                      >
                        <PlusIcon className="w-5 h-5" />
                        {t('manualOrder.k_137')}
                      </button>
                    </div>
                  )}

                  {/* Prompt to select remaining attributes */}
                  {!allAttributesSelected && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
                      <ChevronRightIcon className="w-4 h-4 inline ml-1" />
                      {t('manualOrder.k_138')}{" "}
                      {productAttributes
                        .filter((a) => !selectedAttributes[a.name])
                        .map((a) => a.name)
                        .join(t('manualOrder.andSeparator'))}
                    </div>
                  )}
                </div>
              ) : (
                /* Fallback: Simple variant list if no attributes found */
                <div className="space-y-2">
                  {selectedProduct.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => handleVariantSelect(variant)}
                      disabled={!isInStock(variant)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-right transition-all
                                                ${
                                                  isInStock(variant)
                                                    ? "border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer bg-white dark:bg-gray-700"
                                                    : "border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-60 cursor-not-allowed"
                                                }
                                            `}
                    >
                      <div className="flex flex-col items-start">
                        <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {variant.name || t('manualOrder.notSpecified')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          SKU: {variant.sku}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {variant.price} {t('manualOrder.k_75')}
                        </div>
                        <div
                          className={`text-xs mt-0.5 ${isInStock(variant) ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400 font-medium"}`}
                        >
                          {isInStock(variant)
                            ? variant.trackInventory === false
                              ? t('manualOrder.inStock')
                              : t('manualOrder.available_count', { count: variant.stock })
                            : t('manualOrder.outOfStock')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchColumn;
