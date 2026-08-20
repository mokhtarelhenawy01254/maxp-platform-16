import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ShoppingCartIcon,
  UserIcon,
  MapPinIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import { apiClient } from "../../../services/apiClient";
import { lookupCustomerByPhone } from "../../../hooks/useCustomerByPhone";
import { authService } from "../../../services/authService";
import { config } from "../../../config";
import { InboxConversation } from "../../../types/inbox.types";
import { EGYPT_GOVERNORATES } from "../../../constants/egyptGovernorates";
import { detectUserGovernorate } from "../../../utils/geolocation";
import { getPrimaryImageUrl } from "../../../utils/imageUrl";

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

const successStyle: React.CSSProperties = {
  color: "color-mix(in srgb, var(--business-success) 74%, black)",
};

const warningStyle: React.CSSProperties = {
  color: "color-mix(in srgb, var(--business-warning) 74%, black)",
};

const dangerStyle: React.CSSProperties = {
  color: "color-mix(in srgb, var(--business-danger) 74%, black)",
};

const sectionSurfaceStyle: React.CSSProperties = {
  background: "var(--business-surface-subtle)",
  border: "1px solid var(--business-card-border)",
  boxShadow: "0 24px 52px -42px rgba(7, 17, 32, 0.28)",
};

const getVariantButtonStyle = (
  isActive: boolean,
  isAvailable: boolean,
): React.CSSProperties => {
  if (isActive) {
    return {
      background:
        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
      borderColor: "transparent",
      color: "white",
    };
  }

  if (isAvailable) {
    return {
      background: "var(--business-surface-subtle)",
      borderColor: "var(--business-card-border)",
      color: "var(--color-foreground)",
    };
  }

  return {
    background:
      "color-mix(in srgb, var(--color-border) 18%, var(--color-background))",
    borderColor: "color-mix(in srgb, var(--color-border) 40%, transparent)",
    color: "var(--color-muted-foreground)",
  };
};

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

// Helper function to parse variant metadata and extract attributeValues
const parseVariantAttributes = (
  variant: ProductVariant,
): Record<string, string> => {
  // First try attributeValues directly
  if (
    variant.attributeValues &&
    Object.keys(variant.attributeValues).length > 0
  ) {
    return variant.attributeValues;
  }

  // Then try metadata
  if (variant.metadata) {
    try {
      const metadata =
        typeof variant.metadata === "string"
          ? JSON.parse(variant.metadata)
          : variant.metadata;
      if (
        metadata.attributeValues &&
        Object.keys(metadata.attributeValues).length > 0
      ) {
        return metadata.attributeValues;
      }
    } catch {
      // ignore parse errors
    }
  }

  // Try color and size fields directly
  if (variant.color || variant.size) {
    const attrs: Record<string, string> = {};
    if (variant.color) attrs["اللون"] = variant.color;
    if (variant.size) attrs["المقاس"] = variant.size;
    return attrs;
  }

  // Fallback: Try to extract from variant name (e.g., "بيفليل - 54" or "تنا - 98")
  if (variant.name) {
    const parts = variant.name.split(/\s*[-–]\s*/);
    if (parts.length >= 2) {
      const colorPart = parts[0] ?? "";
      const sizePart = parts[1] ?? "";
      return {
        اللون: colorPart.trim(),
        المقاس: sizePart.trim(),
      };
    } else if (parts.length === 1 && variant.type) {
      const partValue = parts[0] ?? "";
      const typeName =
        variant.type === "color"
          ? "اللون"
          : variant.type === "size"
            ? "المقاس"
            : variant.type;
      return { [typeName]: partValue.trim() };
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
      const valueSet = attributeMap[key] ?? new Set<string>();
      attributeMap[key] = valueSet;
      if (value) valueSet.add(value);
    });
  });

  return Object.entries(attributeMap)
    .filter(([_, values]) => values.size > 0)
    .map(([name, values]) => ({
      name,
      values: Array.from(values).sort(),
    }));
};

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

/** Returns true if the item is considered in-stock (either tracking is off, or stock > 0) */
const isInStock = (item: {
  stock: number;
  trackInventory?: boolean;
}): boolean => {
  if (item.trackInventory === false) return true;
  return item.stock > 0;
};

interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
  sku?: string;
}

interface ShippingInfo {
  zoneId: string | null;
  price: number;
  deliveryTime: string;
  governorate: string | null;
}

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Either pass conversation object (Facebook) OR individual fields (any platform) */
  conversation?: InboxConversation;
  customerName?: string;
  customerPhone?: string;
  conversationId?: string;
  customerId?: string;
  platform?: 'facebook' | 'whatsapp' | 'telegram';
  pageName?: string;
  onOrderCreated?: (orderId: string) => void;
}

// Variant Selection Modal Component - Same as ManualOrder
interface VariantSelectionModalProps {
  product: Product;
  selectedAttributes: Record<string, string>;
  onAttributeSelect: (attrName: string, value: string) => void;
  onVariantSelect: (variant: ProductVariant) => void;
  onClose: () => void;
}

const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  product,
  selectedAttributes,
  onAttributeSelect,
  onVariantSelect,
  onClose,
}) => {
  // Extract attributes from product
  const productAttributes = useMemo(() => {
    return extractAttributes(product.variants);
  }, [product]);

  // Filter variants based on selected attributes
  const filteredVariants = useMemo(() => {
    return product.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(selectedAttributes).every(([key, value]) => {
        return variantAttrs[key] === value;
      });
    });
  }, [product, selectedAttributes]);

  // Get available values for each attribute based on current selection
  const getAvailableValues = (attrName: string): string[] => {
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attrName];

    const availableVariants = product.variants.filter((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      return Object.entries(otherSelections).every(([key, value]) => {
        return variantAttrs[key] === value;
      });
    });

    const values = new Set<string>();
    availableVariants.forEach((variant) => {
      const variantAttrs = parseVariantAttributes(variant);
      const attributeValue = variantAttrs[attrName];
      if (attributeValue) {
        values.add(attributeValue);
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

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4 variant-selection-modal"
      style={overlayStyle}
    >
      <div className="business-modal-surface w-full max-w-md overflow-hidden">
        <div
          className="business-gallery-toolbar flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--business-muted-line)" }}
        >
          <h3 className="truncate pr-4 font-bold" style={headingStyle}>
            {product.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button business-icon-button--sm"
            style={mutedStyle}
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
                    <label
                      className="block text-sm font-semibold"
                      style={headingStyle}
                    >
                      {attr.name}
                      {isSelected && (
                        <span className="mr-2" style={primaryStyle}>
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
                            type="button"
                            key={value}
                            onClick={() => onAttributeSelect(attr.name, value)}
                            disabled={!isAvailable}
                            className={`rounded-2xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                              !isAvailable
                                ? "cursor-not-allowed line-through"
                                : ""
                            }`}
                            style={getVariantButtonStyle(isActive, isAvailable)}
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
                <div
                  className="business-status-banner mt-4 p-4"
                  data-tone="primary"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="text-lg font-bold" style={primaryStyle}>
                        {matchedVariant.price} ج.م
                      </div>
                      <div
                        className="text-sm"
                        style={
                          isInStock(matchedVariant) ? successStyle : dangerStyle
                        }
                      >
                        {isInStock(matchedVariant)
                          ? matchedVariant.trackInventory === false
                            ? "متاح"
                            : `${matchedVariant.stock} متاح`
                          : "نفذت الكمية"}
                      </div>
                    </div>
                    <div className="text-xs" style={mutedStyle}>
                      SKU: {matchedVariant.sku}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onVariantSelect(matchedVariant)}
                    disabled={!isInStock(matchedVariant)}
                    className={`business-chip-button flex w-full items-center justify-center gap-2 py-2.5 font-semibold ${
                      !isInStock(matchedVariant)
                        ? "cursor-not-allowed opacity-60"
                        : ""
                    }`}
                    data-active={isInStock(matchedVariant)}
                    style={
                      isInStock(matchedVariant)
                        ? undefined
                        : {
                            background:
                              "color-mix(in srgb, var(--color-border) 18%, var(--color-background))",
                            color: "var(--color-muted-foreground)",
                          }
                    }
                  >
                    <PlusIcon className="w-5 h-5" />
                    إضافة للسلة
                  </button>
                </div>
              )}

              {/* Prompt to select remaining attributes */}
              {!allAttributesSelected && (
                <div
                  className="mt-4 rounded-2xl p-3 text-center text-sm"
                  style={{
                    ...sectionSurfaceStyle,
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  ← اختر{" "}
                  {productAttributes
                    .filter((a) => !selectedAttributes[a.name])
                    .map((a) => a.name)
                    .join(" و ")}
                </div>
              )}
            </div>
          ) : (
            /* Fallback: Simple variant list if no attributes found */
            <div className="space-y-2">
              {product.variants.map((variant) => (
                <button
                  type="button"
                  key={variant.id}
                  onClick={() => onVariantSelect(variant)}
                  disabled={!isInStock(variant)}
                  className={`w-full rounded-2xl border p-3 text-right transition-all ${
                    isInStock(variant)
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-60"
                  }`}
                  style={
                    isInStock(variant)
                      ? sectionSurfaceStyle
                      : {
                          background:
                            "color-mix(in srgb, var(--color-border) 18%, var(--color-background))",
                          borderColor: "var(--business-muted-line)",
                        }
                  }
                >
                  <div className="flex flex-col items-start">
                    <div className="text-sm font-medium" style={headingStyle}>
                      {variant.name || "غير محدد"}
                    </div>
                    <div className="mt-0.5 text-xs" style={mutedStyle}>
                      SKU: {variant.sku}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold" style={primaryStyle}>
                      {variant.price} ج.م
                    </div>
                    <div
                      className="mt-0.5 text-xs"
                      style={isInStock(variant) ? successStyle : dangerStyle}
                    >
                      {isInStock(variant)
                        ? variant.trackInventory === false
                          ? "متاح"
                          : `${variant.stock} متاح`
                        : "نفذت الكمية"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
  isOpen,
  onClose,
  conversation,
  customerName: initialCustomerName,
  customerPhone: initialCustomerPhone,
  conversationId: propConvId,
  customerId: propCustomerId,
  platform: propPlatform,
  pageName: propPageName,
  onOrderCreated,
}) => {
  // Derive conversation data from either conversation object OR individual props
  const convId = conversation?.id || propConvId || '';
  const convCustomerId = conversation?.customerId || propCustomerId || '';
  const convCustomerName = conversation?.customerName || '';
  const convPageName = conversation?.pageName || propPageName || 'Facebook';
  const convPlatform = conversation?.platform || propPlatform || 'facebook';

  // Product Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const productListRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Customer Form State
  const [phone, setPhone] = useState(initialCustomerPhone || "");
  const [customerName, setCustomerName] = useState(initialCustomerName || convCustomerName || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  // Shipping State
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

  // Order State
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"products" | "checkout">("products");

  // Variant Selection State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<
    Record<string, string>
  >({});

  // Sync customer data when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setPhone(initialCustomerPhone || "");
      setCustomerName(initialCustomerName || convCustomerName || "");
    }
  }, [isOpen, initialCustomerName, initialCustomerPhone, convCustomerName]);

  // Auto-detect governorate for quick checkout
  useEffect(() => {
    if (!isOpen || city) return;

    let cancelled = false;
    const detectGovernorate = async () => {
      const detected = await detectUserGovernorate();
      if (!cancelled && detected?.nameAr && !city) {
        setCity(detected.nameAr);
      }
    };

    void detectGovernorate();
    return () => {
      cancelled = true;
    };
  }, [isOpen, city]);

  // Auto-fill customer details from previous orders when a phone number is entered
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (!isOpen || digits.length < 9) return;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        const customer = await lookupCustomerByPhone(phone);
        if (cancelled || !customer) return;

        const fullName = `${customer.firstName} ${customer.lastName}`.trim();
        setCustomerName((prev) => prev.trim() || fullName);
        setAddress((prev) => prev.trim() || customer.address || "");
        setCity((prev) => prev || customer.governorate || customer.city || "");
        setNotes((prev) => prev.trim() || customer.notes || "");
      } catch (error) {
        console.error("Quick order customer lookup error:", error);
      }
    }, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, phone]);

  // Fetch products
  const fetchProducts = useCallback(
    async (query: string = "", targetPage: number = 1, append = false) => {
      try {
        if (append) setLoadingMoreProducts(true);
        else setLoadingProducts(true);
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
              trackInventory: p.trackInventory,
              image: getPrimaryImageUrl(p.mainImage, p.image, p.images),
              variants: (p.variants || p.productVariants || []).map((v: any) => ({
                ...v,
                image: getPrimaryImageUrl(v.image, v.images),
                trackInventory: v.trackInventory,
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
          setHasMoreProducts(
            targetPage < totalPages && mappedProducts.length > 0,
          );
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        tToast.error("QuickOrderModal.failed_fetch_fdd8");
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
      fetchProducts("", 1);
    }
  }, [isOpen, fetchProducts]);

  // Search with debounce
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

  // Fetch shipping cost when city changes
  useEffect(() => {
    const fetchShippingCost = async () => {
      if (!city || city.length < 2) {
        setShippingInfo(null);
        return;
      }

      try {
        setLoadingShipping(true);
        const response = await apiClient.get(
          `/shipping-zones/find-price?governorate=${encodeURIComponent(city)}`,
        );

        if (response.data.success) {
          setShippingInfo(response.data.data);
        }
      } catch (error) {
        console.error("Shipping fetch error:", error);
        setShippingInfo(null);
      } finally {
        setLoadingShipping(false);
      }
    };

    const timeoutId = setTimeout(fetchShippingCost, 500);
    return () => clearTimeout(timeoutId);
  }, [city]);

  // Add to cart
  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    const itemId = variant ? `${product.id}-${variant.id}` : product.id;

    const existing = cartItems.find((item) => {
      if (variant) {
        return item.productId === product.id && item.variantId === variant.id;
      }
      return item.productId === product.id && !item.variantId;
    });

    if (existing) {
      setCartItems((prev) =>
        prev.map((item) => {
          const currentItemId = item.variantId
            ? `${item.productId}-${item.variantId}`
            : item.productId;
          return currentItemId === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        }),
      );
      tToast.success("QuickOrderModal.msg_7c93");
    } else {
      const price = variant ? parseFloat(String(variant.price)) : product.price;
      const image = variant && variant.image ? variant.image : product.image;
      const stock = variant ? variant.stock : product.stock;
      const sku = variant ? variant.sku : product.sku;

      let variantName = "";
      if (variant) {
        const parts = [];
        if (variant.color) parts.push(variant.color);
        if (variant.size) parts.push(variant.size);
        if (parts.length === 0 && variant.name) parts.push(variant.name);
        variantName = parts.join(" / ");
      }

      setCartItems((prev) => [
        ...prev,
        {
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          variantName,
          price,
          quantity: 1,
          image,
          stock,
          sku,
        },
      ]);
      tToast.success("QuickOrderModal.msg_e784");
    }

    setShowVariantModal(false);
    setSelectedProduct(null);
  };

  // Handle product click
  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setSelectedAttributes({});
      setShowVariantModal(true);
    } else {
      handleAddToCart(product);
    }
  };

  // Update cart item quantity
  const updateQuantity = (
    productId: string,
    variantId: string | undefined,
    delta: number,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isMatch = variantId
          ? item.productId === productId && item.variantId === variantId
          : item.productId === productId && !item.variantId;

        if (isMatch) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      }),
    );
  };

  // Remove from cart
  const removeFromCart = (productId: string, variantId?: string) => {
    setCartItems((prev) =>
      prev.filter((item) => {
        const isMatch = variantId
          ? item.productId === productId && item.variantId === variantId
          : item.productId === productId && !item.variantId;
        return !isMatch;
      }),
    );
    tToast.success("QuickOrderModal.success_delete_b9f1");
  };

  // Calculate totals
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const shippingCost = shippingInfo?.price || 0;
  const grandTotal = subtotal + shippingCost;

  // Create order
  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      tToast.error("QuickOrderModal.msg_337c");
      return;
    }
    if (!phone || !customerName) {
      tToast.error("QuickOrderModal.msg_55c5");
      return;
    }

    try {
      setLoading(true);

      const extractionMethod =
        convPlatform === "whatsapp" ? "whatsapp_inbox" : "facebook_inbox";
      const source =
        convPlatform === "whatsapp" ? "whatsapp_inbox" : "facebook_inbox";

      const payload = {
        products: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          variantId: item.variantId,
          sku: item.sku,
        })),
        customerId: convCustomerId,
        customerPhone: phone,
        customerName: customerName.trim(),
        customerAddress: address,
        city: city,
        notes: notes,
        status: "PENDING",
        paymentMethod: "cod",
        extractionMethod,
        conversationId: convId,
        platform: convPlatform,
        source,
        shippingCost: shippingCost,
        shippingZoneId: shippingInfo?.zoneId,
        subtotal: subtotal,
        totalAmount: grandTotal,
      };

      const response = await apiClient.post("/orders-enhanced", payload);

      if (response.data.success) {
        tToast.success("QuickOrderModal.success_create_5c00");
        const orderId = response.data.order?.id || response.data.data?.id;

        if (onOrderCreated && orderId) {
          onOrderCreated(orderId);
        }

        // Reset and close
        setCartItems([]);
        setStep("products");
        onClose();
      } else {
        toast.error(
          "فشل إنشاء الطلب: " + (response.data.error || i18n.t("QuickOrderModal.msg_4223")),
        );
      }
    } catch (error: any) {
      console.error("Create order error:", error);
      toast.error(error.response?.data?.message || "حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 quick-order-modal"
      style={overlayStyle}
    >
      <div className="business-modal-surface flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden">
        {/* Header */}
        <div className="business-workflow-header">
          <div className="flex items-center gap-3">
            <ShoppingCartIcon className="w-6 h-6" />
            <div>
              <h2 className="business-workflow-title">طلب سريع</h2>
              <p className="business-workflow-subtitle">
                {initialCustomerName || convCustomerName} -{" "}
                {convPageName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button"
            style={{
              background: "rgba(255, 255, 255, 0.14)",
              borderColor: "rgba(255, 255, 255, 0.18)",
              color: "white",
            }}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Steps Indicator */}
        <div className="business-workflow-tabs">
          <button
            type="button"
            onClick={() => setStep("products")}
            className="business-workflow-tab"
            data-active={step === "products"}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="business-workflow-badge">1</span>
              المنتجات
              {cartItems.length > 0 && (
                <span className="business-gallery-count">
                  {cartItems.length}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => cartItems.length > 0 && setStep("checkout")}
            disabled={cartItems.length === 0}
            className="business-workflow-tab"
            data-active={step === "checkout"}
            data-disabled={cartItems.length === 0}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="business-workflow-badge">2</span>
              الدفع والتوصيل
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {step === "products" ? (
            <>
              {/* Products Grid */}
              <div className="flex flex-1 flex-col overflow-hidden">
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

                {/* Products List */}
                <div
                  ref={productListRef}
                  onScroll={handleProductListScroll}
                  className="flex-1 overflow-y-auto p-4"
                >
                  {loadingProducts ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="h-40 animate-pulse rounded-2xl"
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
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {products.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleProductClick(product)}
                            className="business-product-card group cursor-pointer"
                          >
                            <div className="business-product-card-media relative aspect-square">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div
                                  className="flex h-full w-full items-center justify-center"
                                  style={mutedStyle}
                                >
                                  <ArchiveBoxIcon className="h-10 w-10" />
                                </div>
                              )}
                              {product.variants.length > 0 && (
                                <div className="business-product-card-pill absolute bottom-2 right-2">
                                  خيارات
                                </div>
                              )}
                            </div>
                            <div className="p-2.5">
                              <h3
                                className="line-clamp-1 text-sm font-medium"
                                style={headingStyle}
                              >
                                {product.name}
                              </h3>
                              <div className="mt-1 flex items-center justify-between">
                                <span
                                  className="text-sm font-bold"
                                  style={primaryStyle}
                                >
                                  {product.price} ج.م
                                </span>
                                <button
                                  type="button"
                                  className="business-icon-button business-icon-button--sm"
                                  data-tone="primary"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
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
              </div>

              {/* Cart Sidebar */}
              <div className="business-side-panel w-72">
                <div className="business-side-panel-header">
                  <h3
                    className="flex items-center gap-2 font-semibold"
                    style={headingStyle}
                  >
                    <ShoppingCartIcon className="h-5 w-5" />
                    السلة ({cartItems.length})
                  </h3>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {cartItems.length === 0 ? (
                    <div className="business-inbox-empty py-8">
                      <ShoppingCartIcon
                        className="h-10 w-10 opacity-30"
                        style={mutedStyle}
                      />
                      <p className="text-sm">السلة فارغة</p>
                    </div>
                  ) : (
                    cartItems.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId || ""}`}
                        className="business-cart-card p-2"
                      >
                        <div className="flex gap-2">
                          <div className="business-product-card-media h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div
                                className="flex h-full w-full items-center justify-center"
                                style={mutedStyle}
                              >
                                <ArchiveBoxIcon className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4
                              className="line-clamp-1 text-xs font-medium"
                              style={headingStyle}
                            >
                              {item.name}
                            </h4>
                            {item.variantName && (
                              <p className="text-[10px]" style={mutedStyle}>
                                {item.variantName}
                              </p>
                            )}
                            <p
                              className="mt-0.5 text-xs font-bold"
                              style={primaryStyle}
                            >
                              {item.price} ج.م
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(item.productId, item.variantId)
                            }
                            className="business-icon-button business-icon-button--sm"
                            style={dangerStyle}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  -1,
                                )
                              }
                              className="business-qty-button"
                            >
                              <MinusIcon className="h-3 w-3" />
                            </button>
                            <span
                              className="w-8 text-center text-sm font-medium"
                              style={headingStyle}
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.variantId,
                                  1,
                                )
                              }
                              className="business-qty-button"
                            >
                              <PlusIcon className="h-3 w-3" />
                            </button>
                          </div>
                          <span
                            className="text-xs font-bold"
                            style={headingStyle}
                          >
                            {(item.price * item.quantity).toLocaleString()} ج.م
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Total */}
                {cartItems.length > 0 && (
                  <div className="business-footer-bar">
                    <div className="mb-2 flex justify-between text-sm">
                      <span style={mutedStyle}>المجموع</span>
                      <span className="font-bold" style={headingStyle}>
                        {subtotal.toLocaleString()} ج.م
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep("checkout")}
                      className="business-chip-button w-full py-2 font-medium"
                      data-active="true"
                    >
                      متابعة الطلب
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Checkout Step */
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Customer Info */}
                <div className="business-page-panel p-4">
                  <h3
                    className="mb-4 flex items-center gap-2 font-semibold"
                    style={headingStyle}
                  >
                    <UserIcon className="h-5 w-5" style={mutedStyle} />
                    بيانات العميل
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        اسم العميل <span style={dangerStyle}>*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="business-control-input w-full"
                        placeholder="اسم العميل"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        رقم الهاتف <span style={dangerStyle}>*</span>
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="business-control-input w-full"
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Info */}
                <div className="business-page-panel p-4">
                  <h3
                    className="mb-4 flex items-center gap-2 font-semibold"
                    style={headingStyle}
                  >
                    <MapPinIcon className="h-5 w-5" style={mutedStyle} />
                    عنوان التوصيل
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        المحافظة
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="business-control-input w-full"
                      >
                        <option value="">اختر المحافظة...</option>
                        {EGYPT_GOVERNORATES.map((gov) => (
                          <option key={gov.id} value={gov.nameAr}>
                            {gov.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        العنوان بالتفصيل
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="business-chat-input h-20 w-full resize-none"
                        placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
                      />
                    </div>

                    {/* Shipping Cost */}
                    {loadingShipping ? (
                      <div
                        className="flex items-center gap-2 text-sm"
                        style={mutedStyle}
                      >
                        <div
                          className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
                          style={{ borderColor: "var(--color-primary)" }}
                        />
                        جاري حساب تكلفة الشحن...
                      </div>
                    ) : shippingInfo?.zoneId ? (
                      <div
                        className="business-status-banner"
                        data-tone="success"
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className="flex items-center gap-2 text-sm"
                            style={successStyle}
                          >
                            <TruckIcon className="h-4 w-4" />
                            تكلفة الشحن
                          </span>
                          <span className="font-bold" style={successStyle}>
                            {shippingInfo.price.toLocaleString()} ج.م
                          </span>
                        </div>
                        <div className="mt-1 text-xs" style={successStyle}>
                          مدة التوصيل: {shippingInfo.deliveryTime}
                        </div>
                      </div>
                    ) : city ? (
                      <div
                        className="business-status-banner"
                        data-tone="warning"
                      >
                        <div
                          className="flex items-center gap-2 text-sm"
                          style={warningStyle}
                        >
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          لا توجد منطقة شحن لهذه المحافظة
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Notes */}
                <div className="business-page-panel p-4">
                  <label className="mb-1 block text-xs" style={mutedStyle}>
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="business-chat-input h-16 w-full resize-none text-sm"
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>

                {/* Order Summary */}
                <div className="business-status-banner p-4" data-tone="primary">
                  <h3 className="mb-3 font-semibold" style={headingStyle}>
                    ملخص الطلب
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={mutedStyle}>
                        المنتجات (
                        {cartItems.reduce(
                          (acc, item) => acc + item.quantity,
                          0,
                        )}{" "}
                        قطعة)
                      </span>
                      <span className="font-medium" style={headingStyle}>
                        {subtotal.toLocaleString()} ج.م
                      </span>
                    </div>
                    {shippingCost > 0 && (
                      <div className="flex justify-between">
                        <span style={mutedStyle}>الشحن</span>
                        <span className="font-medium" style={headingStyle}>
                          +{shippingCost.toLocaleString()} ج.م
                        </span>
                      </div>
                    )}
                    <div
                      className="flex justify-between pt-2 text-lg font-bold"
                      style={{
                        borderTop: "1px solid var(--business-muted-line)",
                      }}
                    >
                      <span style={headingStyle}>الإجمالي</span>
                      <span style={primaryStyle}>
                        {grandTotal.toLocaleString()} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="business-footer-bar flex items-center justify-between">
          <button
            type="button"
            onClick={step === "checkout" ? () => setStep("products") : onClose}
            className="business-chip-button px-4 py-2"
          >
            {step === "checkout" ? "رجوع" : "إلغاء"}
          </button>

          {step === "checkout" && (
            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={
                loading || cartItems.length === 0 || !phone || !customerName
              }
              className={`business-chip-button flex items-center gap-2 px-6 py-2 font-medium ${
                loading || cartItems.length === 0 || !phone || !customerName
                  ? "cursor-not-allowed opacity-60"
                  : ""
              }`}
              style={
                loading || cartItems.length === 0 || !phone || !customerName
                  ? undefined
                  : {
                      background:
                        "linear-gradient(135deg, var(--business-success) 0%, color-mix(in srgb, var(--color-secondary) 82%, white) 100%)",
                      borderColor: "transparent",
                      color: "white",
                    }
              }
            >
              {loading ? (
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: "currentColor",
                    borderTopColor: "transparent",
                  }}
                />
              ) : (
                <CheckCircleIcon className="w-5 h-5" />
              )}
              إنشاء الطلب ({grandTotal.toLocaleString()} ج.م)
            </button>
          )}
        </div>

        {/* Variant Selection Modal - Same as ManualOrder */}
        {showVariantModal && selectedProduct && (
          <VariantSelectionModal
            product={selectedProduct}
            selectedAttributes={selectedAttributes}
            onAttributeSelect={(attrName, value) => {
              setSelectedAttributes((prev) => ({ ...prev, [attrName]: value }));
            }}
            onVariantSelect={(variant) => {
              handleAddToCart(selectedProduct, variant);
              setSelectedAttributes({});
            }}
            onClose={() => {
              setShowVariantModal(false);
              setSelectedProduct(null);
              setSelectedAttributes({});
            }}
          />
        )}
      </div>
    </div>
  );
};

export default QuickOrderModal;
