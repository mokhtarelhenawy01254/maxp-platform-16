import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { authService } from "../../../services/authService";
import { config } from "../../../config";
import { tToast } from "../../../utils/i18n-toast";
import { getPrimaryImageUrl } from "../../../utils/imageUrl";
import OrderModal from "../../../components/common/OrderModal";

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
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  sku: string;
  variants: ProductVariant[];
}

interface SimplifiedProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelected: (product: Product, variant?: ProductVariant) => void;
}

// Helper function to parse variant metadata and extract attributeValues
const parseVariantAttributes = (
  variant: ProductVariant,
): Record<string, string> => {
  if (
    variant.attributeValues &&
    Object.keys(variant.attributeValues).length > 0
  ) {
    return variant.attributeValues;
  }

  if (variant.metadata) {
    try {
      const metadata =
        typeof variant.metadata === "string"
          ? JSON.parse(variant.metadata)
          : variant.metadata;

      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        const attrs: Record<string, string> = {};
        metadata.attributes.forEach((attr: any) => {
          if (attr.type === "color") {
            attrs["اللون"] = attr.option;
          } else if (attr.type === "size") {
            attrs["المقاس"] = attr.option;
          } else if (attr.type === "material") {
            attrs["المادة"] = attr.option;
          } else if (attr.type === "style") {
            attrs["النمط"] = attr.option;
          } else if (attr.option) {
            const attrName = attr.name || "خاصية";
            attrs[attrName] = attr.option;
          }
        });

        if (Object.keys(attrs).length > 0) {
          return attrs;
        }
      }

      if (
        metadata.attributeValues &&
        Object.keys(metadata.attributeValues).length > 0
      ) {
        return metadata.attributeValues;
      }
    } catch {}
  }

  if (variant.color || variant.size) {
    const attrs: Record<string, string> = {};
    if (variant.color) attrs["اللون"] = variant.color;
    if (variant.size) attrs["المقاس"] = variant.size;
    return attrs;
  }

  if (variant.name) {
    const pipePattern = /([^:]+):\s*([^|]+)/g;
    const attrs: Record<string, string> = {};
    let match;

    while ((match = pipePattern.exec(variant.name)) !== null) {
      if (match[1] && match[2]) {
        const key = match[1].trim();
        const value = match[2].trim();
        attrs[key] = value;
      }
    }

    if (Object.keys(attrs).length > 0) {
      return attrs;
    }

    const parts = variant.name.split(/\s*[-–]\s*/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return {
        اللون: parts[0].trim(),
        المقاس: parts[1].trim(),
      };
    } else if (parts.length === 1 && parts[0] && variant.type) {
      const typeName =
        variant.type === "color"
          ? "اللون"
          : variant.type === "size"
            ? "المقاس"
            : variant.type;
      return { [typeName]: parts[0].trim() };
    }
  }

  return {};
};

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

  return Object.entries(attributeMap)
    .filter(([_, values]) => values.size > 0)
    .map(([name, values]) => ({
      name,
      values: Array.from(values).sort(),
    }));
};

const SimplifiedProductSelectionModal: React.FC<
  SimplifiedProductSelectionModalProps
> = ({ isOpen, onClose, onProductSelected }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);

  const fetchProducts = useCallback(
    async (query: string = "", targetPage: number = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const token = authService.getAccessToken();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        };

        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "30",
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
          const mappedProducts: Product[] = data.data.map((p: any) => {
            return {
              id: p.id,
              name: p.name,
              price: p.price,
              stock: p.stock,
              sku: p.sku,
              image: getPrimaryImageUrl(p.mainImage, p.image, p.images),
              variants: (p.variants || p.productVariants || []).map((v: any) => ({
                ...v,
                image: getPrimaryImageUrl(v.image, v.images),
              })),
            };
          });

          setProducts((prev) =>
            append ? [...prev, ...mappedProducts] : mappedProducts,
          );

          const total = data.pagination?.total ?? mappedProducts.length;
          const totalPages =
            data.pagination?.totalPages ??
            Math.max(1, Math.ceil(total / 30));
          setHasMore(targetPage < totalPages && mappedProducts.length > 0);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        tToast.error("SimplifiedProductSelectionModal.failed_fetch_c827");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isOpen) {
      skipNextSearchRef.current = true;
      setPage(1);
      setHasMore(false);
      setSearchQuery("");
      setSelectedProduct(null);
      setSelectedAttributes({});
      fetchProducts("", 1);
    }
  }, [isOpen, fetchProducts]);

  useEffect(() => {
    if (!isOpen) return;
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      setPage(1);
      setSelectedProduct(null);
      setSelectedAttributes({});
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = 0;
      }
      fetchProducts(searchQuery, 1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchProducts, isOpen]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(searchQuery, nextPage, true);
  }, [loading, loadingMore, hasMore, page, searchQuery, fetchProducts]);

  const handleScroll = useCallback(() => {
    const el = listContainerRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) {
      loadMore();
    }
  }, [loadMore]);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedAttributes({});
    } else {
      if (product.stock !== undefined && product.stock <= 0) {
        tToast.error("SimplifiedProductSelectionModal.msg_0e6c");
        return;
      }
      onProductSelected(product);
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    if (selectedProduct) {
      if (variant.stock !== undefined && variant.stock <= 0) {
        tToast.error("SimplifiedProductSelectionModal.msg_0e6c");
        return;
      }

      onProductSelected(selectedProduct, variant);
      setSelectedProduct(null);
      setSelectedAttributes({});
    }
  };

  const productAttributes = useMemo(() => {
    if (!selectedProduct) return [];
    return extractAttributes(selectedProduct.variants);
  }, [selectedProduct]);

  const filteredVariants = useMemo(() => {
    if (!selectedProduct) return [];
    return selectedProduct.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(selectedAttributes).every(
        ([key, value]) => variantAttrs[key] === value,
      );
    });
  }, [selectedProduct, selectedAttributes]);

  const getAvailableValues = (attrName: string): string[] => {
    if (!selectedProduct) return [];
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attrName];

    const availableVariants = selectedProduct.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(otherSelections).every(
        ([key, value]) => variantAttrs[key] === value,
      );
    });

    const values = new Set<string>();
    availableVariants.forEach((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      if (variantAttrs[attrName]) values.add(variantAttrs[attrName]);
    });

    return Array.from(values);
  };

  const allAttributesSelected =
    productAttributes.length > 0 &&
    productAttributes.every((attr) => selectedAttributes[attr.name]);

  const matchedVariant = useMemo(() => {
    if (!allAttributesSelected || filteredVariants.length !== 1) return null;
    return filteredVariants[0];
  }, [allAttributesSelected, filteredVariants]);

  return (
    <OrderModal
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="إضافة منتج للطلب"
      icon={PlusIcon}
      tone="primary"
      size="full"
      showCancel={false}
      flushBody
      hideClose
    >
      <div className="flex h-[min(78vh,720px)] flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side: Product List & Search */}
          <div className="flex flex-1 flex-col border-e border-border/60">
            <div className="border-b border-border/60 bg-background p-4">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="بحث باسم المنتج أو SKU..."
                  className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 pe-11 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <MagnifyingGlassIcon className="pointer-events-none absolute end-3.5 top-3 h-6 w-6 text-muted-foreground" />
              </div>
            </div>

            <div
              ref={listContainerRef}
              onScroll={handleScroll}
              className="custom-scrollbar flex-1 overflow-y-auto p-4"
            >
              {loading ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-48 animate-pulse rounded-xl border border-border bg-muted/40"
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-muted-foreground">
                  <ArchiveBoxIcon className="mb-4 h-16 w-16 opacity-30" />
                  <p className="text-lg">لا توجد منتجات مطابقة</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-card transition-all ${
                          selectedProduct?.id === product.id
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/60 hover:shadow-md"
                        }`}
                      >
                        <div className="relative aspect-square overflow-hidden bg-muted/40">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                              <ArchiveBoxIcon className="h-12 w-12" />
                            </div>
                          )}
                          {product.variants.length > 0 && (
                            <div className="absolute end-2 top-2 rounded-lg bg-primary/90 px-2 py-1 text-[10px] font-bold text-primary-foreground shadow-sm backdrop-blur-sm">
                              خيارات
                            </div>
                          )}
                        </div>
                        <div className="bg-card p-3">
                          <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-foreground">
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-primary">
                              {product.price} ج.م
                            </span>
                            <div className="max-w-[60px] truncate text-[10px] text-muted-foreground">
                              SKU: {product.sku || "N/A"}
                            </div>
                          </div>
                          {product.stock !== undefined && (
                            <div className="mt-1">
                              {product.stock <= 0 ? (
                                <span className="text-[10px] font-semibold text-destructive">
                                  نفذ من المخزون
                                </span>
                              ) : product.stock < 5 ? (
                                <span className="text-[10px] font-semibold text-warning">
                                  متبقي {product.stock}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-success">
                                  متوفر
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {loadingMore && (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  )}
                  {!loadingMore && hasMore && (
                    <button
                      onClick={loadMore}
                      className="mt-4 w-full rounded-xl border-2 border-dashed border-border py-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      عرض المزيد من المنتجات
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Side: Variant Selection */}
          <div
            className={`w-80 flex-col overflow-y-auto bg-muted/30 transition-all ${
              selectedProduct ? "flex" : "hidden md:flex"
            }`}
          >
            {selectedProduct ? (
              <div className="flex h-full flex-col">
                <div className="border-b border-border/60 bg-card p-4">
                  <h3 className="line-clamp-2 font-bold leading-snug text-foreground">
                    {selectedProduct.name}
                  </h3>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {selectedProduct.price} ج.م
                  </p>
                </div>

                <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
                  {productAttributes.length > 0 ? (
                    productAttributes.map((attr) => {
                      const availableValues = getAvailableValues(attr.name);
                      const isSelected = selectedAttributes[attr.name];

                      return (
                        <div key={attr.name} className="space-y-3">
                          <label className="flex items-center justify-between text-sm font-bold text-foreground">
                            {attr.name}
                            {isSelected && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                {isSelected}
                              </span>
                            )}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {attr.values.map((value) => {
                              const isAvailable =
                                availableValues.includes(value);
                              const isActive =
                                selectedAttributes[attr.name] === value;

                              return (
                                <button
                                  key={value}
                                  onClick={() =>
                                    setSelectedAttributes((prev) => ({
                                      ...prev,
                                      [attr.name]: value,
                                    }))
                                  }
                                  disabled={!isAvailable}
                                  className={`min-w-[3rem] rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                                    isActive
                                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                      : isAvailable
                                        ? "border-border bg-card text-foreground hover:border-primary/60 hover:shadow-sm"
                                        : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground line-through"
                                  }`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="space-y-2">
                      {selectedProduct.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => handleVariantSelect(variant)}
                          disabled={
                            variant.stock !== undefined && variant.stock <= 0
                          }
                          className={`w-full rounded-xl border-2 p-3 text-end transition-all ${
                            variant.stock !== undefined && variant.stock <= 0
                              ? "cursor-not-allowed border-border bg-muted/40 opacity-50"
                              : "border-border bg-card hover:border-primary"
                          }`}
                        >
                          <div className="font-bold text-foreground">
                            {variant.name}
                          </div>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-sm font-semibold text-primary">
                              {variant.price &&
                              parseFloat(variant.price as any) > 0
                                ? `${variant.price} ج.م`
                                : `${selectedProduct.price} ج.م`}
                            </span>
                            {variant.stock !== undefined &&
                              (variant.stock <= 0 ? (
                                <span className="text-[10px] font-semibold text-destructive">
                                  نفذ
                                </span>
                              ) : variant.stock < 5 ? (
                                <span className="text-[10px] font-semibold text-warning">
                                  متبقي {variant.stock}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-success">
                                  متوفر
                                </span>
                              ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border/60 bg-card p-4">
                  {matchedVariant ? (
                    <button
                      onClick={() => handleVariantSelect(matchedVariant)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                    >
                      <PlusIcon className="h-5 w-5" />
                      تأكيد الإضافة
                    </button>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 px-3 py-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        {!allAttributesSelected
                          ? `يرجى اختيار ${productAttributes
                              .filter((a) => !selectedAttributes[a.name])
                              .map((a) => a.name)
                              .join(" و ")}`
                          : "المزيج المختار غير متوفر"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-50 grayscale">
                <ArchiveBoxIcon className="mb-4 h-16 w-16 text-muted-foreground" />
                <h4 className="font-bold text-muted-foreground">اختر منتجاً</h4>
                <p className="mt-2 text-sm text-muted-foreground">
                  اختر منتجاً من القائمة الجانبية لتخصيص الخيارات
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </OrderModal>
  );
};

export default SimplifiedProductSelectionModal;
