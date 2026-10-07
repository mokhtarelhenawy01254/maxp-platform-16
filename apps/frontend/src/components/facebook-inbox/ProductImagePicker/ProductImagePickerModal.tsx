import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  CheckIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../../services/apiClient";
import {
  getPrimaryImageUrl,
  getImageCandidates,
} from "../../../utils/imageUrl";

const overlayStyle: React.CSSProperties = {
  background: "rgba(7, 17, 32, 0.58)",
  backdropFilter: "blur(12px)",
};

const headingStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

const primaryStyle: React.CSSProperties = {
  color: "var(--color-primary)",
};

interface PickedProduct {
  id: string;
  name: string;
  price: number | string;
}

interface ProductImage {
  url: string;
  filename: string;
}

interface ProductImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendProduct: (
    product: PickedProduct,
    images: ProductImage[],
    includeDetails: boolean,
  ) => void;
}

interface ProductApiResponse {
  success?: boolean;
  data?: Array<Record<string, unknown>>;
  pagination?: {
    total?: number;
    totalPages?: number;
  };
}

const buildProductImages = (product: any): ProductImage[] => {
  const candidates = getImageCandidates(
    product.mainImage,
    product.image,
    product.images,
  );

  let productMetadata: any = {};
  if (typeof product.metadata === "string") {
    try {
      productMetadata = JSON.parse(product.metadata);
    } catch (_) {}
  } else if (product.metadata && typeof product.metadata === "object") {
    productMetadata = product.metadata;
  }

  const attributeImageUrls: string[] = [];
  const attributeImagesMap = productMetadata?.variantSettings?.attributeImages;
  if (attributeImagesMap && typeof attributeImagesMap === "object") {
    for (const attrGroup of Object.values(attributeImagesMap)) {
      if (attrGroup && typeof attrGroup === "object") {
        for (const rawImgUrl of Object.values(attrGroup as Record<string, unknown>)) {
          const resolvedUrl = getPrimaryImageUrl(rawImgUrl);
          if (typeof resolvedUrl === "string" && resolvedUrl.length > 0) {
            attributeImageUrls.push(resolvedUrl);
          }
        }
      }
    }
  }

  const variantImages = (product.variants || product.productVariants || [])
    .map((variant: any) => {
      let parsedMetadata: any = {};
      if (typeof variant.metadata === "string") {
        try {
          parsedMetadata = JSON.parse(variant.metadata);
        } catch (_) {}
      } else if (variant.metadata && typeof variant.metadata === "object") {
        parsedMetadata = variant.metadata;
      }

      return getPrimaryImageUrl(
        variant.image,
        variant.imageUrl,
        variant.image_url,
        variant.images,
        variant.mainImage,
        parsedMetadata?.image,
        parsedMetadata?.imageUrl,
      );
    })
    .filter((url: string) => typeof url === "string" && url.length > 0);

  const allUrls = Array.from(
    new Set([...candidates, ...attributeImageUrls, ...variantImages]),
  );

  const baseName =
    (product.name || "منتج")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim()
      .slice(0, 40) || "منتج";

  return allUrls.map((url, index) => ({
    url,
    filename:
      index === 0
        ? `${baseName}.jpg`
        : `${baseName}-${index + 1}.jpg`,
  }));
};

const ProductImagePickerModal: React.FC<ProductImagePickerModalProps> = ({
  isOpen,
  onClose,
  onSendProduct,
}) => {
  // Product catalog state
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const productListRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);

  // Selected product + images
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);

  const fetchProducts = useCallback(
    async (query: string = "", targetPage: number = 1, append = false) => {
      try {
        if (append) setLoadingMoreProducts(true);
        else setLoadingProducts(true);

        const params: Record<string, unknown> = {
          page: targetPage,
          limit: 30,
        };
        if (query.trim()) {
          params["search"] = query.trim();
        }

        const response = await apiClient.get<ProductApiResponse>("/products", {
          params,
        });
        const data = response.data;

        if (data.success && data.data) {
          const items = data.data;
          setProducts((prev) => (append ? [...prev, ...items] : items));

          const total = data.pagination?.total ?? items.length;
          const totalPages =
            data.pagination?.totalPages ??
            Math.max(1, Math.ceil(total / 30));
          setHasMoreProducts(
            targetPage < totalPages && items.length > 0,
          );
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoadingProducts(false);
        setLoadingMoreProducts(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isOpen) {
      skipNextSearchRef.current = true;
      setSearchQuery("");
      setProductPage(1);
      setHasMoreProducts(false);
      setSelectedProduct(null);
      setProductImages([]);
      setSelectedImages(new Set());
      fetchProducts("", 1);
    }
  }, [isOpen, fetchProducts]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      setProductPage(1);
      if (productListRef.current) {
        productListRef.current.scrollTop = 0;
      }
      fetchProducts(searchQuery, 1);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchProducts, isOpen]);

  const loadMoreProducts = useCallback(() => {
    if (loadingProducts || loadingMoreProducts || !hasMoreProducts) return;
    const nextPage = productPage + 1;
    setProductPage(nextPage);
    fetchProducts(searchQuery, nextPage, true);
  }, [
    loadingProducts,
    loadingMoreProducts,
    hasMoreProducts,
    productPage,
    searchQuery,
    fetchProducts,
  ]);

  const handleProductListScroll = useCallback(() => {
    const el = productListRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 150) {
      loadMoreProducts();
    }
  }, [loadMoreProducts]);

  const handleSelectProduct = (product: any) => {
    const images = buildProductImages(product);
    setSelectedProduct(product);
    setProductImages(images);
    setSelectedImages(new Set(images.map((_, index) => index)));
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setProductImages([]);
    setSelectedImages(new Set());
  };

  const toggleImage = (index: number) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedImages((prev) =>
      prev.size === productImages.length
        ? new Set()
        : new Set(productImages.map((_, index) => index)),
    );
  };

  const handleSend = async (includeDetails: boolean) => {
    if (!selectedProduct || selectedImages.size === 0) return;

    const imagesToSend = productImages.filter((_, index) =>
      selectedImages.has(index),
    );

    setSending(true);
    try {
      onSendProduct(
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
        },
        imagesToSend,
        includeDetails,
      );
      setSelectedImages(new Set());
      onClose();
    } catch (error) {
      console.error("Error sending product images:", error);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={overlayStyle}
    >
      <div
        className="business-modal-surface product-picker-modal flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden"
        style={{ background: "var(--color-card)" }}
      >
        {/* Header */}
        <div className="business-gallery-toolbar flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="h-6 w-6"
              style={primaryStyle}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-xl font-bold" style={headingStyle}>
              {selectedProduct
                ? "صور المنتج"
                : "منتجات الموقع"}
            </h3>
            <span className="text-sm" style={mutedStyle}>
              {selectedProduct
                ? `(${productImages.length} صورة)`
                : `(${products.length} منتج)`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button"
            style={mutedStyle}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {!selectedProduct ? (
          <>
            {/* Search */}
            <div
              className="p-4"
              style={{
                borderBottom: "1px solid var(--business-muted-line)",
              }}
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث عن منتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="business-chat-input w-full pl-4 pr-10 py-2"
                />
                <MagnifyingGlassIcon
                  className="absolute right-3 top-2.5 h-5 w-5"
                  style={mutedStyle}
                />
              </div>
            </div>

            {/* Products Grid */}
            <div
              ref={productListRef}
              onScroll={handleProductListScroll}
              className="flex-1 overflow-y-auto p-4"
            >
              {loadingProducts ? (
                <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-xl"
                      style={{
                        background:
                          "color-mix(in srgb, var(--color-border) 18%, var(--color-background))",
                      }}
                    />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="business-inbox-empty py-10">
                  <ArchiveBoxIcon
                    className="h-12 w-12 opacity-50"
                    style={mutedStyle}
                  />
                  <p>لا توجد منتجات</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
                    {products.map((product) => {
                      const image = getPrimaryImageUrl(
                        product.mainImage,
                        product.image,
                        product.images,
                      );
                      const thumbImages = buildProductImages(product);
                      return (
                        <div
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className="business-product-card group cursor-pointer"
                          style={{ background: "var(--color-card)" }}
                        >
                          <div
                            className="business-product-card-media relative h-28 sm:h-32"
                            style={{ background: "var(--color-card)" }}
                          >
                            {image ? (
                              <img
                                src={image}
                                alt={product.name}
                                className="h-full w-full object-contain p-2"
                                style={{ background: "var(--color-card)" }}
                              />
                            ) : (
                              <div
                                className="flex h-full w-full items-center justify-center"
                                style={mutedStyle}
                              >
                                <ArchiveBoxIcon className="h-7 w-7" />
                              </div>
                            )}
                          </div>
                          <div className="p-1.5 sm:p-2">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className="text-xs font-bold sm:text-sm"
                                style={primaryStyle}
                              >
                                {product.price} ج.م
                              </span>
                              <button
                                type="button"
                                className="business-icon-button business-icon-button--sm"
                                data-tone="primary"
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {thumbImages.length > 0 && (
                              <div className="mt-1.5 flex items-center gap-1">
                                {thumbImages.slice(0, 4).map((thumb, idx) => (
                                  <img
                                    key={`${thumb.url}-${idx}`}
                                    src={thumb.url}
                                    alt=""
                                    className="h-7 w-7 rounded-md border object-contain p-0.5 sm:h-8 sm:w-8"
                                    style={{
                                      background: "var(--color-card)",
                                      borderColor:
                                        "var(--business-muted-line)",
                                    }}
                                  />
                                ))}
                                {thumbImages.length > 4 && (
                                  <span
                                    className="text-[10px] font-semibold"
                                    style={mutedStyle}
                                  >
                                    +{thumbImages.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {loadingMoreProducts && (
                    <div className="flex justify-center py-6">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-transparent border-t-current opacity-60" />
                    </div>
                  )}
                  {!loadingMoreProducts && hasMoreProducts && (
                    <button
                      type="button"
                      onClick={loadMoreProducts}
                      className="mt-4 w-full rounded-2xl border-2 border-dashed border-gray-200 py-3 text-sm font-semibold text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500 dark:border-gray-700 dark:text-gray-400"
                    >
                      عرض المزيد من المنتجات
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Selected product banner */}
            <div className="business-status-banner mx-3 mt-3 px-4 py-3" data-tone="primary">
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-semibold" style={headingStyle}>
                    {selectedProduct.name}
                  </span>
                  <span className="text-xs font-bold" style={primaryStyle}>
                    {selectedProduct.price} ج.م
                  </span>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="business-chip-button px-3 py-1.5 text-sm"
                  >
                    {selectedImages.size === productImages.length
                      ? "إلغاء الكل"
                      : "تحديد الكل"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBackToProducts}
                    className="business-chip-button px-3 py-1.5 text-sm"
                  >
                    ← رجوع للمنتجات
                  </button>
                </div>
              </div>
            </div>

            {/* Product images grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {productImages.length === 0 ? (
                <div className="business-inbox-empty py-10">
                  <ArchiveBoxIcon
                    className="h-12 w-12 opacity-50"
                    style={mutedStyle}
                  />
                  <p>لا توجد صور لهذا المنتج</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {productImages.map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      className="business-gallery-card relative group cursor-pointer overflow-hidden border-2"
                      data-selected={selectedImages.has(index)}
                      style={{ background: "var(--color-card)" }}
                      onClick={() => toggleImage(index)}
                    >
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="h-40 w-full object-contain p-2"
                        style={{ background: "var(--color-card)" }}
                      />
                      <div
                        className="business-gallery-check absolute left-2 top-2 cursor-pointer"
                        data-selected={selectedImages.has(index)}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImage(index);
                        }}
                      >
                        {selectedImages.has(index) ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold" style={mutedStyle}>
                            +
                          </span>
                        )}
                      </div>
                      <div className="business-gallery-caption absolute bottom-0 left-0 right-0 p-2">
                        <p className="truncate text-xs">{image.filename}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send actions */}
            <div className="business-gallery-toolbar flex flex-wrap items-center justify-between gap-3">
              {selectedImages.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSend(false)}
                    disabled={sending}
                    className="business-chip-button flex items-center gap-2 px-4 py-2 disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                      borderColor: "transparent",
                      color: "white",
                    }}
                  >
                    {sending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2" style={{ borderColor: "currentColor" }} />
                    ) : (
                      <ArchiveBoxIcon className="h-5 w-5" />
                    )}
                    <span>إرسال الصور ({selectedImages.size})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend(true)}
                    disabled={sending}
                    className="business-chip-button flex items-center gap-2 px-4 py-2 disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--business-success) 0%, color-mix(in srgb, var(--color-secondary) 82%, white) 100%)",
                      borderColor: "transparent",
                      color: "white",
                    }}
                  >
                    {sending ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2" style={{ borderColor: "currentColor" }} />
                    ) : (
                      <ArchiveBoxIcon className="h-5 w-5" />
                    )}
                    <span>صور + اسم وسعر ({selectedImages.size})</span>
                  </button>
                </div>
              ) : (
                <span className="text-sm" style={mutedStyle}>
                  اختر الصور اللي عايز تبعت منها
                </span>
              )}
            </div>
          </>
        )}

        <div className="business-hint-bar flex items-center justify-between text-center">
          <span>
            {selectedProduct
              ? selectedImages.size > 0
                ? `💡 اختاري زر الإرسال المناسب — صور فقط أو صور + اسم وسعر المنتج`
                : "💡 ألغي تحديد الصور اللي مش عايزاها ثم اضغطي زر الإرسال"
              : "💡 اختاري منتج لعرض صوره وإرسالها كرسالة"}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductImagePickerModal;
