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
  Squares2X2Icon,
  ListBulletIcon,
  ChevronUpIcon,
  ChevronDownIcon,
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const productListRef = useRef<HTMLDivElement>(null);
  const skipNextSearchRef = useRef(false);

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Detect mobile or narrow viewports (handles normal mobile, tablets, and mobile Chrome with Desktop Site mode)
  const [isMobileView, setIsMobileView] = useState(() => {
    if (typeof window === "undefined") return false;
    const isMobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );
    const isNarrow =
      window.innerWidth < 1024 ||
      (window.screen && window.screen.width < 768) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    return isMobileUA || isNarrow;
  });

  useEffect(() => {
    const handleResize = () => {
      const isMobileUA =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );
      const isNarrow =
        window.innerWidth < 1024 ||
        (window.screen && window.screen.width < 768) ||
        (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
      setIsMobileView(isMobileUA || isNarrow);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      setPhone(initialCustomerPhone ? String(initialCustomerPhone) : "");
      setCustomerName(
        initialCustomerName
          ? String(initialCustomerName)
          : convCustomerName
          ? String(convCustomerName)
          : ""
      );
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
    const phoneStr = String(phone || "");
    const digits = phoneStr.replace(/\D/g, "");
    if (!isOpen || digits.length < 9) return;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        const customer = await lookupCustomerByPhone(phoneStr);
        if (cancelled || !customer) return;

        const firstNameStr = String(customer.firstName || "").trim();
        const lastNameStr = String(customer.lastName || "").trim();
        const fullName = `${firstNameStr} ${lastNameStr}`.trim();
        setCustomerName((prev) => String(prev || "").trim() || fullName);
        setAddress((prev) => String(prev || "").trim() || (customer.address ? String(customer.address) : ""));
        setCity((prev) => prev || customer.governorate || customer.city || "");
        setNotes((prev) => String(prev || "").trim() || (customer.notes ? String(customer.notes) : ""));
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

  // Render a cart item (reused in desktop sidebar and mobile drawer)
  const renderCartItem = (item: CartItem) => (
    <div
      key={`${item.productId}-${item.variantId || ""}`}
      className="business-cart-card p-2 sm:p-2.5 rounded-xl border"
      style={{
        background: "var(--business-surface-panel)",
        borderColor: "var(--business-card-border)",
      }}
    >
      <div className="flex gap-2.5">
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
            title={item.name}
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
          className="business-icon-button business-icon-button--sm flex-shrink-0"
          style={dangerStyle}
          aria-label="حذف المنتج من السلة"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
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
            aria-label="تقليل الكمية"
          >
            <MinusIcon className="h-3 w-3" />
          </button>
          <span
            className="w-8 text-center text-xs sm:text-sm font-semibold"
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
            aria-label="زيادة الكمية"
          >
            <PlusIcon className="h-3 w-3" />
          </button>
        </div>
        <span
          className="text-xs sm:text-sm font-bold"
          style={headingStyle}
        >
          {(item.price * item.quantity).toLocaleString()} ج.م
        </span>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 quick-order-modal"
      style={overlayStyle}
    >
      <div className="business-modal-surface flex h-[95vh] sm:h-auto sm:max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl sm:rounded-2xl">
        {/* Header */}
        <div className="business-workflow-header flex items-center justify-between p-3.5 sm:p-4">
          <div className="flex items-center gap-3">
            <ShoppingCartIcon className="w-6 h-6 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="business-workflow-title truncate">طلب سريع</h2>
              <p className="business-workflow-subtitle truncate">
                {initialCustomerName || convCustomerName} -{" "}
                {convPageName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="business-icon-button flex-shrink-0"
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
            onClick={() => {
              setStep("products");
              setShowMobileCart(false);
            }}
            className="business-workflow-tab flex-1 sm:flex-initial"
            data-active={step === "products" && !showMobileCart}
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
            onClick={() => {
              if (cartItems.length > 0) {
                setStep("checkout");
                setShowMobileCart(false);
              }
            }}
            disabled={cartItems.length === 0}
            className="business-workflow-tab flex-1 sm:flex-initial"
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
        <div className="relative flex flex-1 overflow-hidden">
          {step === "products" ? (
            <>
              {/* Products Grid */}
              <div className="flex flex-1 flex-col overflow-hidden min-w-0 w-full">
                {/* Search */}
                <div
                  className="p-3 sm:p-4 flex items-center gap-2"
                  style={{
                    borderBottom: "1px solid var(--business-muted-line)",
                  }}
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="بحث عن منتج..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="business-chat-input w-full pl-4 pr-10 py-2 text-sm"
                    />
                    <MagnifyingGlassIcon
                      className="absolute right-3 top-2.5 h-5 w-5"
                      style={mutedStyle}
                    />
                  </div>
                  <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/50 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === "grid"
                          ? "bg-primary text-primary-foreground shadow-sm font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="عرض الشبكة"
                      aria-label="عرض الشبكة"
                    >
                      <Squares2X2Icon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-lg transition-colors ${
                        viewMode === "list"
                          ? "bg-primary text-primary-foreground shadow-sm font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="عرض القائمة"
                      aria-label="عرض القائمة"
                    >
                      <ListBulletIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Products List */}
                <div
                  ref={productListRef}
                  onScroll={handleProductListScroll}
                  className="flex-1 overflow-y-auto p-2.5 sm:p-4"
                >
                  {loadingProducts ? (
                    <div className={viewMode === "grid" ? "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-3" : "space-y-2.5"}>
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className={viewMode === "grid" ? "h-44 sm:h-48 animate-pulse rounded-2xl" : "h-20 animate-pulse rounded-2xl"}
                          style={{
                            background:
                              "color-mix(in srgb, var(--color-border) 18%, var(--color-background))",
                          }}
                        />
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="business-inbox-empty py-12 text-center">
                      <ArchiveBoxIcon
                        className="mx-auto h-12 w-12 opacity-50"
                        style={mutedStyle}
                      />
                      <p className="mt-2 text-sm" style={mutedStyle}>لا توجد منتجات</p>
                    </div>
                  ) : (
                    <>
                      {viewMode === "list" ? (
                        <div className="space-y-2.5">
                          {products.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className="business-product-card group cursor-pointer flex items-center gap-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-transparent transition-all duration-150 active:scale-[0.99] hover:border-primary/30"
                            >
                              <div className="business-product-card-media relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 overflow-hidden rounded-lg sm:rounded-xl">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div
                                    className="flex h-full w-full items-center justify-center"
                                    style={mutedStyle}
                                  >
                                    <ArchiveBoxIcon className="h-8 w-8 opacity-40" />
                                  </div>
                                )}
                                {product.variants.length > 0 && (
                                  <div className="business-product-card-pill absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded font-medium shadow-sm">
                                    خيارات
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                <div>
                                  <h3
                                    className="line-clamp-2 text-xs sm:text-sm font-medium leading-snug"
                                    style={headingStyle}
                                    title={product.name}
                                  >
                                    {product.name}
                                  </h3>
                                  {product.sku && (
                                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-mono truncate">
                                      {product.sku}
                                    </p>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span
                                    className="text-xs sm:text-sm font-bold"
                                    style={primaryStyle}
                                  >
                                    {product.price} ج.م
                                  </span>
                                  {product.variants.length > 0 && (
                                    <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded font-medium">
                                      {product.variants.length} خيار
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                className="business-chip-button px-3 py-1.5 text-xs sm:text-sm font-semibold flex-shrink-0 flex items-center gap-1 shadow-sm"
                                data-active="true"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(product);
                                }}
                                aria-label="إضافة للطلب"
                              >
                                <PlusIcon className="h-4 w-4" />
                                <span className="hidden sm:inline">إضافة</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {products.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => handleProductClick(product)}
                              className="business-product-card group cursor-pointer flex flex-col justify-between overflow-hidden rounded-xl border border-transparent transition-all duration-150 active:scale-[0.98] h-full"
                            >
                              <div className="business-product-card-media relative aspect-square w-full overflow-hidden">
                                {product.image ? (
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div
                                    className="flex h-full w-full items-center justify-center"
                                    style={mutedStyle}
                                  >
                                    <ArchiveBoxIcon className="h-10 w-10 opacity-40" />
                                  </div>
                                )}
                                {product.variants.length > 0 && (
                                  <div className="business-product-card-pill absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded-md font-medium shadow-sm">
                                    خيارات
                                  </div>
                                )}
                              </div>
                              <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1">
                                <h3
                                  className="line-clamp-2 text-xs sm:text-sm font-medium leading-snug"
                                  style={headingStyle}
                                  title={product.name}
                                >
                                  {product.name}
                                </h3>
                                <div className="mt-2 flex items-center justify-between gap-1">
                                  <span
                                    className="text-xs sm:text-sm font-bold truncate"
                                    style={primaryStyle}
                                  >
                                    {product.price} ج.م
                                  </span>
                                  <button
                                    type="button"
                                    className="business-icon-button business-icon-button--sm h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                                    data-tone="primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleProductClick(product);
                                    }}
                                    aria-label="إضافة للطلب"
                                  >
                                    <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

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

                {/* Mobile Bottom Cart Bar (visible only on mobile / narrow viewports when cart has items) */}
                {cartItems.length > 0 && isMobileView && (
                  <div
                    className="flex items-center justify-between gap-2 p-2.5 sm:p-3 border-t bg-[var(--business-surface-strong)] flex-shrink-0 shadow-lg lg:hidden"
                    style={{ borderColor: "var(--business-muted-line)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowMobileCart(true)}
                      className="flex items-center gap-2 text-right min-w-0 flex-1 hover:opacity-85 transition-opacity"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500 dark:bg-blue-500/25">
                          <ShoppingCartIcon className="h-5 w-5" />
                        </div>
                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold truncate" style={headingStyle}>
                          {subtotal.toLocaleString()} ج.م
                        </div>
                        <div className="text-[10px] sm:text-xs text-blue-500 font-medium flex items-center gap-0.5">
                          <span>عرض وتعديل السلة</span>
                          <ChevronUpIcon className="h-3 w-3" />
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMobileCart(true)}
                      className="business-chip-button px-4 py-2 text-xs sm:text-sm font-bold flex-shrink-0 shadow-sm"
                      data-active="true"
                    >
                      متابعة الطلب
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Cart Overlay/Drawer */}
              {showMobileCart && (
                <div
                  className="absolute inset-0 z-30 flex flex-col bg-[var(--business-surface-panel)] animate-in fade-in slide-in-from-bottom-5 duration-200 lg:hidden"
                  style={{
                    background: "var(--business-surface-panel)",
                  }}
                >
                  <div
                    className="business-side-panel-header flex items-center justify-between p-3.5"
                    style={{ borderBottom: "1px solid var(--business-muted-line)" }}
                  >
                    <h3
                      className="flex items-center gap-2 font-bold text-sm"
                      style={headingStyle}
                    >
                      <ShoppingCartIcon className="h-5 w-5 text-primary" />
                      السلة ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} قطعة)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowMobileCart(false)}
                      className="business-icon-button business-icon-button--sm"
                      aria-label="إغلاق السلة"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {cartItems.length === 0 ? (
                      <div className="business-inbox-empty py-12 text-center">
                        <ShoppingCartIcon
                          className="mx-auto h-12 w-12 opacity-30"
                          style={mutedStyle}
                        />
                        <p className="mt-2 text-sm" style={mutedStyle}>
                          السلة فارغة
                        </p>
                      </div>
                    ) : (
                      cartItems.map((item) => renderCartItem(item))
                    )}
                  </div>

                  {cartItems.length > 0 && (
                    <div className="business-footer-bar p-3.5 flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span style={mutedStyle}>المجموع</span>
                        <span className="font-bold text-base" style={headingStyle}>
                          {subtotal.toLocaleString()} ج.م
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowMobileCart(false)}
                          className="business-chip-button flex-1 py-2 text-xs font-medium"
                        >
                          إضافة المزيد
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMobileCart(false);
                            setStep("checkout");
                          }}
                          className="business-chip-button flex-1 py-2 text-xs font-bold"
                          data-active="true"
                        >
                          متابعة الطلب
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Desktop Cart Sidebar (strictly hidden on mobile, rendered only on large desktop screens lg+) */}
              {!isMobileView && (
                <div
                  className="hidden lg:flex lg:w-72 lg:flex-col quick-order-desktop-cart-sidebar flex-shrink-0"
                  style={{
                    background: "var(--business-surface-panel)",
                    borderInlineStart: "1px solid var(--business-muted-line)",
                  }}
                >
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
                      cartItems.map((item) => renderCartItem(item))
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
              )}
            </>
          ) : (
            /* Checkout Step */
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                {/* Customer Info */}
                <div className="business-page-panel p-3.5 sm:p-4">
                  <h3
                    className="mb-3 sm:mb-4 flex items-center gap-2 font-semibold text-sm sm:text-base"
                    style={headingStyle}
                  >
                    <UserIcon className="h-5 w-5" style={mutedStyle} />
                    بيانات العميل
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        اسم العميل <span style={dangerStyle}>*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="business-control-input w-full text-sm"
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
                        className="business-control-input w-full text-sm"
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
        <div className="business-footer-bar flex items-center justify-between p-3 sm:p-4">
          <button
            type="button"
            onClick={step === "checkout" ? () => setStep("products") : onClose}
            className="business-chip-button px-4 py-2 text-xs sm:text-sm"
          >
            {step === "checkout" ? "رجوع" : "إلغاء"}
          </button>

          {step === "products" && cartItems.length > 0 && isMobileView && (
            <button
              type="button"
              onClick={() => {
                setShowMobileCart(false);
                setStep("checkout");
              }}
              className="business-chip-button lg:hidden flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
              data-active="true"
            >
              <span>متابعة الطلب</span>
              <span className="opacity-90">({grandTotal.toLocaleString()} ج.م)</span>
            </button>
          )}

          {step === "checkout" && (
            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={
                loading || cartItems.length === 0 || !phone || !customerName
              }
              className={`business-chip-button flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium ${
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
                  className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: "currentColor",
                    borderTopColor: "transparent",
                  }}
                />
              ) : (
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
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
