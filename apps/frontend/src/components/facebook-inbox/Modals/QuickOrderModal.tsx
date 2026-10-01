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
  PrinterIcon,
  CalendarIcon,
  TicketIcon,
  BanknotesIcon,
  ArrowPathIcon,
  ClockIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import { apiClient } from "../../../services/apiClient";
import {
  lookupCustomerByPhone,
  EligiblePreviousOrder,
  ExchangeReturnPolicy,
  PreviousOrder,
  CustomerLookupResult,
} from "../../../hooks/useCustomerByPhone";
import { authService } from "../../../services/authService";
import { config } from "../../../config";
import { InboxConversation } from "../../../types/inbox.types";
import { EGYPT_GOVERNORATES } from "../../../constants/egyptGovernorates";
import { detectUserGovernorate } from "../../../utils/geolocation";
import { getPrimaryImageUrl } from "../../../utils/imageUrl";
import { useAuth } from "../../../hooks/useAuthSimple";
import {
  customerBlocklistService,
  CustomerBlockEvaluation,
} from "../../../services/customerBlocklistService";
import { GovernorateAreaSearch } from "../../../components/ui/GovernorateAreaSearch";
import { extractVariantDisplayDetails } from "../../../pages/admin/ManualOrder/utils/variantAttributes";


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
  originalPrice: number;
  quantity: number;
  image: string;
  stock: number;
  sku?: string;
  color?: string;
  size?: string;
  attributes?: Record<string, string>;
}

interface CouponInfo {
  id: string;
  code: string;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discountAmount: number;
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
  onOrderCreated?: (orderId: string, order?: any, confirmationMessage?: any) => void;
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

  const { user } = useAuth();
  const canOverrideBlockedCustomer = [
    "OWNER",
    "COMPANY_ADMIN",
    "SUPER_ADMIN",
    "MANAGER",
    "ADMIN",
  ].includes(user?.role || "");

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Customer Form State
  const [phone, setPhone] = useState(initialCustomerPhone || "");
  const [customerName, setCustomerName] = useState(initialCustomerName || convCustomerName || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");

  // Customer Blocklist State
  const [checkingBlock, setCheckingBlock] = useState(false);
  const [customerBlock, setCustomerBlock] = useState<CustomerBlockEvaluation | null>(null);
  const [allowBlockedCustomerOverride, setAllowBlockedCustomerOverride] = useState(false);

  // Order Settings State
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [status, setStatus] = useState("CONFIRMED");
  const [requestType, setRequestType] = useState("delivery");
  const [returnAmount, setReturnAmount] = useState("");

  // Exchange & Return Policy State
  const [eligiblePreviousOrders, setEligiblePreviousOrders] = useState<EligiblePreviousOrder[]>([]);
  const [previousOrders, setPreviousOrders] = useState<PreviousOrder[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerLookupResult | null>(null);
  const [loadingCustomerOrders, setLoadingCustomerOrders] = useState(false);
  const [exchangeReturnPolicy, setExchangeReturnPolicy] = useState<ExchangeReturnPolicy | null>(null);
  const [selectedPreviousOrder, setSelectedPreviousOrder] = useState<string>("");
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const isSubmittingRef = useRef(false);

  // Preload order policy when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    apiClient
      .get("/order-settings")
      .then((res) => {
        if (active && res.data?.data?.exchangeReturnPolicy) {
          setExchangeReturnPolicy(res.data.data.exchangeReturnPolicy);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen]);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponInfo | null>(null);
  const [loadingCoupon, setLoadingCoupon] = useState(false);

  // Manual Discount State
  const [manualDiscount, setManualDiscount] = useState(0);

  // Scheduled Order State
  const [isScheduledOrder, setIsScheduledOrder] = useState(false);
  const [scheduledDeliveryDate, setScheduledDeliveryDate] = useState("");
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState("");
  const [scheduledNotes, setScheduledNotes] = useState("");

  // Order Success State
  const [createdOrder, setCreatedOrder] = useState<{ id: string; orderNumber?: string } | null>(null);

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
      setCreatedOrder(null);
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

  // Auto-fill customer details and fetch full order history when phone number is entered
  useEffect(() => {
    const phoneStr = String(phone || "");
    const digits = phoneStr.replace(/\D/g, "");
    if (!isOpen || digits.length < 9) {
      setEligiblePreviousOrders([]);
      setPreviousOrders([]);
      setCustomerProfile(null);
      setLoadingCustomerOrders(false);
      return;
    }

    let cancelled = false;
    setLoadingCustomerOrders(true);
    const timeoutId = setTimeout(async () => {
      try {
        const customer = await lookupCustomerByPhone(phoneStr, convId);
        if (cancelled || !customer) return;

        setCustomerProfile(customer);

        const firstNameStr = String(customer.firstName || "").trim();
        const lastNameStr = String(customer.lastName || "").trim();
        const fullName = `${firstNameStr} ${lastNameStr}`.trim();
        if (fullName) {
          setCustomerName(fullName);
        }
        if (customer.address) {
          setAddress(String(customer.address));
        }
        if (customer.governorate || customer.city) {
          setCity(customer.governorate || customer.city || "");
        }
        if (customer.area || customer.city) {
          setArea(customer.area || customer.city || "");
        }
        if (customer.notes) {
          setNotes((prev) => String(prev || "").trim() || String(customer.notes));
        }

        if (customer.previousOrders && customer.previousOrders.length > 0) {
          setPreviousOrders(customer.previousOrders);
        } else {
          setPreviousOrders([]);
        }

        if (customer.eligiblePreviousOrders) {
          setEligiblePreviousOrders(customer.eligiblePreviousOrders);
          if (customer.eligiblePreviousOrders.length === 1) {
            setSelectedPreviousOrder(customer.eligiblePreviousOrders[0].id);
          }
        }
        if (customer.exchangeReturnPolicy) {
          setExchangeReturnPolicy(customer.exchangeReturnPolicy);
        }
      } catch (error) {
        console.error("Quick order customer lookup error:", error);
      } finally {
        if (!cancelled) {
          setLoadingCustomerOrders(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, phone, convId]);

  // Customer Blocklist check
  useEffect(() => {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!isOpen || digits.length < 10) {
      setCustomerBlock(null);
      setAllowBlockedCustomerOverride(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setCheckingBlock(true);
        const result = await customerBlocklistService.check({
          phone: String(phone),
          source: "manual",
          paymentMethod,
        });

        if (!isCancelled) {
          setCustomerBlock(result?.rule || result?.blocked ? result : null);
          if (!result?.blocked) {
            setAllowBlockedCustomerOverride(false);
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setCustomerBlock(null);
          setAllowBlockedCustomerOverride(false);
        }
      } finally {
        if (!isCancelled) {
          setCheckingBlock(false);
        }
      }
    }, 450);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, phone, paymentMethod]);

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
          const mappedProducts: Product[] = data.data.map((p: Record<string, unknown>) => {
            return {
              id: String(p.id),
              name: String(p.name),
              price: Number(p.price),
              stock: Number(p.stock),
              sku: String(p.sku || ""),
              trackInventory: p.trackInventory as boolean | undefined,
              image: getPrimaryImageUrl(p.mainImage, p.image, p.images),
              variants: ((p.variants || p.productVariants || []) as Record<string, unknown>[]).map((v) => ({
                ...v,
                image: getPrimaryImageUrl(v.image, v.images),
                trackInventory: v.trackInventory as boolean | undefined,
              })) as unknown as ProductVariant[],
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
  const handleAddToCart = (
    product: Product,
    variant?: ProductVariant,
    attributes?: Record<string, string>,
  ) => {
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
      const productPrice =
        typeof product.price === "string"
          ? parseFloat(product.price)
          : product.price || 0;
      const price = variant ? parseFloat(String(variant.price)) : productPrice;
      const image = variant && variant.image ? variant.image : product.image;
      const stock = variant ? variant.stock : product.stock;
      const sku = variant ? variant.sku : product.sku;

      const variantDetails = extractVariantDisplayDetails(variant);
      const color =
        attributes?.["اللون"] ||
        attributes?.["color"] ||
        attributes?.["Color"] ||
        attributes?.["لون"] ||
        variantDetails.color ||
        undefined;
      const size =
        attributes?.["المقاس"] ||
        attributes?.["size"] ||
        attributes?.["Size"] ||
        attributes?.["مقاس"] ||
        variantDetails.size ||
        undefined;

      const variantName =
        variantDetails.summary ||
        [color, size].filter(Boolean).join(" / ") ||
        variant?.name ||
        "";

      setCartItems((prev) => [
        ...prev,
        {
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          variantName,
          price,
          originalPrice: price,
          quantity: 1,
          image,
          stock,
          sku,
          color,
          size,
          attributes:
            attributes && Object.keys(attributes).length > 0
              ? attributes
              : undefined,
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

  // Update item custom price
  const updateItemPrice = (
    productId: string,
    variantId: string | undefined,
    newPrice: number,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isMatch = variantId
          ? item.productId === productId && item.variantId === variantId
          : item.productId === productId && !item.variantId;

        return isMatch ? { ...item, price: newPrice } : item;
      }),
    );
  };

  // Restore original price
  const restoreItemPrice = (
    productId: string,
    variantId: string | undefined,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isMatch = variantId
          ? item.productId === productId && item.variantId === variantId
          : item.productId === productId && !item.variantId;

        return isMatch ? { ...item, price: item.originalPrice } : item;
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

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("يرجى إدخال كود الكوبون");
      return;
    }

    if (subtotal <= 0) {
      toast.error("لا يمكن تطبيق كوبون على سلة فارغة");
      return;
    }

    try {
      setLoadingCoupon(true);
      const response = await apiClient.post("/coupons/validate", {
        code: couponCode.trim(),
        orderAmount: subtotal,
      });

      if (response.data?.success) {
        const { coupon, discountAmount } = response.data.data;
        setAppliedCoupon({
          ...coupon,
          discountAmount,
        });
        toast.success(`تم تطبيق الكوبون! خصم ${discountAmount.toLocaleString()} ج.م`);
        setCouponCode("");
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "كود الكوبون غير صالح أو منتهي");
    } finally {
      setLoadingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success("تم إزالة الكوبون");
  };

  // Calculate totals
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const totalDiscount = couponDiscount + manualDiscount;
  const shippingCost = shippingInfo?.price || 0;
  const grandTotal = Math.max(0, subtotal - totalDiscount + shippingCost);

  // Check if blocked customer prevents order
  const blockPreventsOrder =
    Boolean(customerBlock?.blocked) &&
    !(canOverrideBlockedCustomer && allowBlockedCustomerOverride);

  // Check if previous order policy prevents exchange/return
  const isExchangeOrReturn = requestType === "exchange" || requestType === "return";
  const previousOrderRequired = isExchangeOrReturn && (exchangeReturnPolicy?.requirePreviousOrder ?? false);
  const phoneDigitsCount = String(phone || "").replace(/\D/g, "").length;
  const previousOrderMissing = previousOrderRequired && phoneDigitsCount >= 9 && eligiblePreviousOrders.length === 0;
  const explicitOrderLinkMissing = previousOrderRequired && Boolean(exchangeReturnPolicy?.requireExplicitOrderLink) && !selectedPreviousOrder;
  const previousOrderPreventsOrder = previousOrderMissing || explicitOrderLinkMissing;

  const selectedOrderObj = useMemo(() => {
    return eligiblePreviousOrders.find(
      (o) => o.id === selectedPreviousOrder || o.orderNumber === selectedPreviousOrder
    );
  }, [eligiblePreviousOrders, selectedPreviousOrder]);

  // Create order
  const handleCreateOrder = async () => {
    if (isSubmittingRef.current || loading) return;
    if (cartItems.length === 0) {
      tToast.error("QuickOrderModal.msg_337c");
      return;
    }
    if (!phone || !customerName) {
      tToast.error("QuickOrderModal.msg_55c5");
      return;
    }
    if (previousOrderMissing) {
      toast.error(
        `لا يمكن إنشاء طلب ${requestType === "return" ? "مرتجع" : "استبدال"}: يتطلب وجود طلب سابق مؤهل لهذا العميل وفقاً لسياسة المتجر.`
      );
      return;
    }
    if (explicitOrderLinkMissing) {
      toast.error("يرجى اختيار الطلب السابق المرتبط بالاستبدال أو المرتجع.");
      return;
    }
    if (blockPreventsOrder) {
      toast.error(customerBlock?.message || "هذا العميل محظور من إنشاء الطلبات");
      return;
    }
    if (isScheduledOrder && !scheduledDeliveryDate) {
      toast.error("يرجى تحديد تاريخ التوصيل للطلب المجدول");
      return;
    }

    isSubmittingRef.current = true;
    try {
      setLoading(true);

      const scheduledDateTime =
        isScheduledOrder && scheduledDeliveryDate
          ? new Date(
              `${scheduledDeliveryDate}${scheduledDeliveryTime ? "T" + scheduledDeliveryTime : "T00:00:00"}`,
            ).toISOString()
          : null;

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
          productColor: item.color ? String(item.color) : null,
          productSize: item.size != null ? String(item.size) : null,
          productImage: item.image,
          attributes:
            item.attributes ||
            (item.color || item.size
              ? {
                  ...(item.color ? { "اللون": item.color } : {}),
                  ...(item.size ? { "المقاس": item.size } : {}),
                }
              : undefined),
        })),
        customerId: convCustomerId,
        customerPhone: phone,
        customerName: customerName.trim(),
        customerAddress: address,
        governorate: city,
        city: area || city,
        area: area || city,
        notes: notes,
        status: isScheduledOrder ? "SCHEDULED" : status,
        paymentMethod: paymentMethod,
        extractionMethod,
        conversationId: convId,
        platform: convPlatform,
        source,
        requestType: requestType,
        returnAmount: returnAmount ? parseFloat(returnAmount) : undefined,
        ...(isExchangeOrReturn ? {
          originalOrderId: selectedPreviousOrder || (eligiblePreviousOrders[0]?.id) || undefined,
          originalOrderNumber: selectedOrderObj?.orderNumber || (eligiblePreviousOrders[0]?.orderNumber) || undefined,
        } : {}),
        couponId: appliedCoupon?.id,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscount,
        manualDiscount: manualDiscount,
        subtotal: subtotal,
        totalAmount: grandTotal,
        isScheduled: isScheduledOrder,
        scheduledDeliveryDate: scheduledDateTime,
        scheduledNotes: isScheduledOrder ? scheduledNotes : undefined,
        allowBlockedCustomerOverride:
          canOverrideBlockedCustomer && allowBlockedCustomerOverride,
        shippingCost: shippingCost,
        shippingZoneId: shippingInfo?.zoneId,
      };

      const response = await apiClient.post("/orders-enhanced", payload);

      if (response.data?.success) {
        tToast.success("QuickOrderModal.success_create_5c00");
        const orderObj = response.data.order || response.data.data;
        const orderId = orderObj?.id;
        const orderNumber = orderObj?.orderNumber;
        const confirmationMessage = response.data.confirmationMessage;

        // Dispatch real-time global event so CustomerProfile, FacebookInbox, and chat instantly update
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("inbox:order-created", {
              detail: {
                order: orderObj,
                orderId,
                orderNumber,
                conversationId: convId,
                confirmationMessage,
              },
            })
          );
        }

        if (onOrderCreated && orderId) {
          onOrderCreated(orderId, orderObj, confirmationMessage);
        }

        setCreatedOrder({
          id: orderId ? String(orderId) : "new",
          orderNumber: orderNumber ? String(orderNumber) : undefined,
        });
      } else {
        toast.error(
          "فشل إنشاء الطلب: " + (response.data?.error || i18n.t("QuickOrderModal.msg_4223")),
        );
      }
    } catch (error: unknown) {
      console.error("Create order error:", error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "حدث خطأ أثناء إنشاء الطلب");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Render a cart item (reused in desktop sidebar and mobile drawer)
  const renderCartItem = (item: CartItem) => {
    const isCustomPrice = item.price !== item.originalPrice;
    const isOverStock = item.stock > 0 && item.quantity > item.stock;

    return (
      <div
        key={`${item.productId}-${item.variantId || ""}`}
        className={`business-cart-card p-2 sm:p-2.5 rounded-xl border transition-colors ${
          isOverStock
            ? "border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-900/15"
            : ""
        }`}
        style={{
          background: isOverStock ? undefined : "var(--business-surface-panel)",
          borderColor: isOverStock ? undefined : "var(--business-card-border)",
        }}
      >
        <div className="flex gap-2.5">
          <div className="business-product-card-media h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl">
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
            <div className="flex justify-between items-start gap-1">
              <h4
                className="line-clamp-1 text-xs font-semibold"
                style={headingStyle}
                title={item.name}
              >
                {item.name}
              </h4>
              <button
                type="button"
                onClick={() => removeFromCart(item.productId, item.variantId)}
                className="text-gray-400 hover:text-red-500 p-0.5 rounded transition-colors flex-shrink-0"
                title="حذف من السلة"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>

            {(item.color || item.size || item.variantName) && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.color && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                    {item.color}
                  </span>
                )}
                {item.size && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-medium">
                    {item.size}
                  </span>
                )}
                {!item.color && !item.size && item.variantName && (
                  <span className="text-[10px] text-blue-500 font-medium truncate">
                    {item.variantName}
                  </span>
                )}
              </div>
            )}

            {isOverStock && (
              <div className="flex items-center gap-1 text-[10px] text-red-500 font-medium mt-1">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>الكمية أكبر من المخزون ({item.stock})</span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-1 flex-wrap">
              {/* Quantity controls */}
              <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border border-border/40">
                <button
                  type="button"
                  onClick={() => {
                    if (item.quantity > 1) {
                      updateQuantity(item.productId, item.variantId, -1);
                    } else {
                      removeFromCart(item.productId, item.variantId);
                    }
                  }}
                  className="business-qty-button"
                  aria-label="تقليل الكمية"
                >
                  <MinusIcon className="h-3 w-3" />
                </button>
                <span
                  className="w-7 text-center text-xs font-bold"
                  style={headingStyle}
                >
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateQuantity(item.productId, item.variantId, 1)
                  }
                  className="business-qty-button"
                  aria-label="زيادة الكمية"
                >
                  <PlusIcon className="h-3 w-3" />
                </button>
              </div>

              {/* Editable unit price */}
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      updateItemPrice(item.productId, item.variantId, val);
                    }}
                    className={`w-16 text-xs text-center font-bold py-0.5 px-1 rounded border ${
                      isCustomPrice
                        ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
                        : "border-border/60 bg-background text-foreground"
                    }`}
                    title="سعر القطعة (قابل للتعديل)"
                    min="0"
                  />
                  <span className="text-[10px] text-muted-foreground">ج.م</span>
                </div>
                {isCustomPrice && (
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                    <span className="line-through">{item.originalPrice}</span>
                    <button
                      type="button"
                      onClick={() =>
                        restoreItemPrice(item.productId, item.variantId)
                      }
                      className="text-blue-500 hover:underline font-semibold"
                      title="استعادة السعر الأصلي"
                    >
                      استعادة
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-1.5 flex justify-between items-center text-xs border-t border-border/30 pt-1">
              <span className="text-[10px] text-muted-foreground">المجموع:</span>
              <span className="font-bold text-xs" style={headingStyle}>
                {(item.price * item.quantity).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        {!createdOrder && (
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
        )}

        {/* Content */}
        <div className="relative flex flex-1 overflow-hidden">
          {createdOrder ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
              <div
                className="max-w-md w-full text-center space-y-6 business-page-panel p-6 sm:p-8 shadow-xl rounded-2xl border"
                style={{
                  background: "var(--business-surface-panel)",
                  borderColor: "var(--business-card-border)",
                }}
              >
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center border"
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    borderColor: "rgba(16, 185, 129, 0.28)",
                    color: "var(--business-success)",
                  }}
                >
                  <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl font-bold" style={headingStyle}>
                    تم إنشاء الطلب بنجاح!
                  </h3>
                  <p className="text-sm" style={mutedStyle}>
                    رقم الطلب:{" "}
                    <span className="font-mono font-bold" style={headingStyle}>
                      #{createdOrder.orderNumber || createdOrder.id}
                    </span>
                  </p>
                </div>

                <div
                  className="p-4 rounded-xl text-xs sm:text-sm text-right space-y-2 border"
                  style={{
                    background: "var(--business-surface-subtle)",
                    borderColor: "var(--business-card-border)",
                  }}
                >
                  <div className="flex justify-between">
                    <span style={mutedStyle}>العميل:</span>
                    <span className="font-medium" style={headingStyle}>
                      {customerName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={mutedStyle}>الهاتف:</span>
                    <span className="font-mono font-medium" style={headingStyle}>
                      {phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={mutedStyle}>إجمالي الطلب:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {grandTotal.toLocaleString()} ج.م
                    </span>
                  </div>
                  {isScheduledOrder && scheduledDeliveryDate && (
                    <div className="flex justify-between">
                      <span style={mutedStyle}>موعد التوصيل:</span>
                      <span className="font-medium" style={headingStyle}>
                        {scheduledDeliveryDate} {scheduledDeliveryTime ? `(${scheduledDeliveryTime})` : ""}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.open(`/orders/${encodeURIComponent(createdOrder.id)}?print=true`, "_blank");
                    }}
                    className="business-chip-button w-full py-3 flex items-center justify-center gap-2 font-bold text-sm"
                    data-active="true"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--business-success) 0%, color-mix(in srgb, var(--color-secondary) 82%, white) 100%)",
                      borderColor: "transparent",
                      color: "white",
                    }}
                  >
                    <PrinterIcon className="w-5 h-5" />
                    طباعة الفاتورة / البوليصة
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(`/orders/${encodeURIComponent(createdOrder.id)}`, "_blank");
                    }}
                    className="business-chip-button w-full py-2.5 flex items-center justify-center gap-2 text-sm border"
                    style={{
                      borderColor: "var(--business-card-border)",
                      color: "var(--business-text-primary)",
                    }}
                  >
                    عرض تفاصيل الطلب
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreatedOrder(null);
                      setCartItems([]);
                      onClose();
                    }}
                    className="text-xs pt-2 underline transition-colors"
                    style={mutedStyle}
                  >
                    إنهاء والعودة للمحادثة
                  </button>
                </div>
              </div>
            </div>
          ) : step === "products" ? (
            <>
              {/* Products Grid */}
              <div className="flex flex-1 flex-col overflow-hidden min-w-0">
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

                  {/* Customer Previous Orders Quick Button beside Search */}
                  {(previousOrders.length > 0 || customerProfile || phone.length >= 9) && (
                    <button
                      type="button"
                      onClick={() => setShowHistoryDrawer((prev) => !prev)}
                      className={`business-chip-button flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold shrink-0 transition-all ${
                        showHistoryDrawer
                          ? "bg-primary text-white border-primary"
                          : "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      }`}
                      title="سجل طلبات وبيانات العميل السابقة"
                    >
                      <ClockIcon className="h-4 w-4 shrink-0" />
                      <span className="hidden sm:inline">طلبات العميل</span>
                      {previousOrders.length > 0 && (
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                          showHistoryDrawer ? "bg-white text-primary" : "bg-primary text-white"
                        }`}>
                          {previousOrders.length}
                        </span>
                      )}
                    </button>
                  )}

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

                {/* Mobile Bottom Cart Bar (visible only on mobile < md when cart has items) */}
                {cartItems.length > 0 && (
                  <div
                    className="md:hidden flex items-center justify-between gap-2 p-2.5 sm:p-3 border-t bg-[var(--business-surface-strong)] flex-shrink-0 shadow-lg"
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
                  className="md:hidden absolute inset-0 z-30 flex flex-col bg-[var(--business-surface-panel)] animate-in fade-in slide-in-from-bottom-5 duration-200"
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

              {/* Customer Previous Orders Drawer / Overlay */}
              {showHistoryDrawer && (
                <div
                  className="absolute inset-0 z-30 flex flex-col bg-[var(--business-surface-panel)] animate-in fade-in slide-in-from-top-3 duration-200"
                  style={{
                    background: "var(--business-surface-panel)",
                  }}
                >
                  <div
                    className="business-side-panel-header flex items-center justify-between p-3.5"
                    style={{ borderBottom: "1px solid var(--business-muted-line)" }}
                  >
                    <div className="flex items-center gap-2">
                      <ClockIcon className="h-5 w-5 text-primary" />
                      <h3 className="font-bold text-sm" style={headingStyle}>
                        سجل طلبات وبيانات العميل ({previousOrders.length})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowHistoryDrawer(false)}
                      className="business-icon-button business-icon-button--sm"
                      aria-label="إغلاق السجل"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    {/* Customer Info Card */}
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="font-bold text-sm" style={headingStyle}>
                          {customerName || "عميل"}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {customerProfile?.customerRating && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                              ⭐ {customerProfile.customerRating}
                            </span>
                          )}
                          {customerProfile?.deliveryRate != null && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {customerProfile.deliveryRate}% تسليم
                            </span>
                          )}
                        </div>
                      </div>

                      {phone && (
                        <div className="font-mono text-primary font-medium" dir="ltr">
                          {phone}
                        </div>
                      )}

                      {(city || area || address) && (
                        <div className="flex items-start gap-1.5 text-muted-foreground">
                          <MapPinIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                          <span>{[city, area, address].filter(Boolean).join(" · ")}</span>
                        </div>
                      )}

                      {notes && (
                        <div className="text-muted-foreground pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                          📝 {notes}
                        </div>
                      )}
                    </div>

                    {/* Orders List */}
                    {loadingCustomerOrders ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        <ArrowPathIcon className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                        جاري جلب الطلبات السابقة...
                      </div>
                    ) : previousOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground">
                        <ShoppingBagIcon className="h-10 w-10 opacity-30 mx-auto mb-2" />
                        لا توجد طلبات سابقة مسجلة لهذا الرقم
                      </div>
                    ) : (
                      previousOrders.map((prevOrder) => (
                        <div
                          key={prevOrder.id || prevOrder.orderNumber}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-sm">
                                #{prevOrder.orderNumber}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(prevOrder.createdAt).toLocaleDateString("ar-EG")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800">
                                {prevOrder.status}
                              </span>
                              <span className="font-bold text-primary font-mono text-sm">
                                {prevOrder.total?.toLocaleString()} ج.م
                              </span>
                            </div>
                          </div>

                          {prevOrder.orderItems && prevOrder.orderItems.length > 0 && (
                            <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                              {prevOrder.orderItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[11px]">
                                  <span className="truncate text-muted-foreground">
                                    {item.quantity}× {item.productName || item.name}
                                    {(item.productColor || item.productSize) && (
                                      <span className="opacity-75 mr-1 font-normal">
                                        ({[item.productColor, item.productSize].filter(Boolean).join(" - ")})
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-mono font-medium shrink-0">
                                    {(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()} ج.م
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="pt-1.5 flex justify-end">
                            <a
                              href={`/orders/${encodeURIComponent(prevOrder.orderNumber || prevOrder.id)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                              عرض تفاصيل الطلب بالكامل ←
                            </a>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Desktop Cart Sidebar (hidden on mobile, visible on md+) */}
              <div className="hidden md:flex md:w-72 md:flex-col business-side-panel flex-shrink-0">
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

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="mb-1 block text-xs" style={mutedStyle}>
                          رقم الهاتف <span style={dangerStyle}>*</span>
                        </label>
                        <div className="relative">
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
                    </div>

                    {/* Customer Profile & Historical Orders Lookup */}
                    {(loadingCustomerOrders || customerProfile || previousOrders.length > 0) && (
                      <div className="rounded-xl border p-3 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs" style={headingStyle}>
                              سجل العميل والطلبات السابقة
                            </span>
                            {loadingCustomerOrders && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-primary animate-pulse">
                                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                                جاري فحص السجل...
                              </span>
                            )}
                          </div>

                          {customerProfile && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {customerProfile.customerRating && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                                  ⭐ {customerProfile.customerRating}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {customerProfile.totalOrdersCount || previousOrders.length} طلبات
                              </span>
                              {customerProfile.deliveryRate != null && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  {customerProfile.deliveryRate}% تسليم
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Customer Tags & Address info if any */}
                        {customerProfile && (customerProfile.tags || customerProfile.notes) && (
                          <div className="text-[11px] space-y-1 text-muted-foreground border-t border-slate-200/60 dark:border-slate-800/60 pt-1.5">
                            {customerProfile.notes && (
                              <p className="truncate">
                                📝 <span className="font-medium text-foreground">ملاحظات:</span> {customerProfile.notes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Full Previous Orders List */}
                        {previousOrders.length > 0 ? (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between">
                              <span>الطلبات السابقة المسجلة ({previousOrders.length}):</span>
                              <span className="text-[10px] opacity-75">محدّثة فورياً</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5">
                              {previousOrders.map((prevOrder) => (
                                <div
                                  key={prevOrder.id || prevOrder.orderNumber}
                                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-xs space-y-1 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold font-mono">
                                        #{prevOrder.orderNumber}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(prevOrder.createdAt).toLocaleDateString("ar-EG")}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {prevOrder.status}
                                      </span>
                                      <span className="font-bold text-primary font-mono">
                                        {prevOrder.total?.toLocaleString()} ج.م
                                      </span>
                                    </div>
                                  </div>

                                  {prevOrder.orderItems && prevOrder.orderItems.length > 0 && (
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {prevOrder.orderItems
                                        .map(
                                          (item: any) =>
                                            `${item.quantity}× ${item.productName || item.name}${
                                              item.productSize || item.productColor
                                                ? ` (${[item.productColor, item.productSize]
                                                    .filter(Boolean)
                                                    .join("-")})`
                                                : ""
                                            }`
                                        )
                                        .join(" · ")}
                                    </div>
                                  )}

                                  <div className="text-left pt-0.5">
                                    <a
                                      href={`/orders/${encodeURIComponent(prevOrder.orderNumber || prevOrder.id)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
                                    >
                                      عرض تفاصيل الطلب ←
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : !loadingCustomerOrders && phone.replace(/\D/g, "").length >= 10 ? (
                          <div className="text-xs text-muted-foreground italic py-1">
                            لا توجد طلبات سابقة مسجلة لهذا الرقم (عميل جديد)
                          </div>
                        ) : null}
                      </div>
                    )}
                    {(checkingBlock || customerBlock) && (
                      <div
                        className={`rounded-xl border p-3 text-xs sm:text-sm ${
                          customerBlock?.blocked
                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">
                              {checkingBlock
                                ? "جاري فحص سجل العميل..."
                                : customerBlock?.blocked
                                  ? "تنبيه: العميل محظور من إنشاء الطلبات"
                                  : "تنبيه بخصوص هذا العميل"}
                            </p>
                            {customerBlock?.message && (
                              <p className="mt-1 leading-5 text-xs">
                                {customerBlock.message}
                              </p>
                            )}
                            {customerBlock?.blocked &&
                              canOverrideBlockedCustomer && (
                                <label className="mt-2.5 flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={allowBlockedCustomerOverride}
                                    onChange={(e) =>
                                      setAllowBlockedCustomerOverride(
                                        e.target.checked,
                                      )
                                    }
                                    className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                                  />
                                  <span>تجاوز الحظر وإتمام الطلب (صلاحية إدارية)</span>
                                </label>
                              )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping & Location Info */}
                <div className="business-page-panel p-3.5 sm:p-4">
                  <h3
                    className="mb-3 sm:mb-4 flex items-center gap-2 font-semibold text-sm sm:text-base"
                    style={headingStyle}
                  >
                    <MapPinIcon className="h-5 w-5" style={mutedStyle} />
                    عنوان وموقع التوصيل
                  </h3>

                  <div className="space-y-3 sm:space-y-4">
                    {/* Smart Governorate and Area Search */}
                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        البحث الذكي عن المحافظة والمنطقة (شركة الشحن)
                      </label>
                      <GovernorateAreaSearch
                        value={{ governorate: city, area }}
                        onChange={(next) => {
                          setCity(next.governorate);
                          setArea(next.area);
                        }}
                        placeholder="ابحث عن المحافظة أو المنطقة..."
                        searchPlaceholder="اكتب اسم المحافظة أو المدينة..."
                        emptyText="لا توجد مناطق مطابقة"
                        loadingText="جاري البحث..."
                        autoSearchText={address || ""}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs" style={mutedStyle}>
                          المحافظة <span style={dangerStyle}>*</span>
                        </label>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="business-control-input w-full text-sm"
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
                          المدينة / المنطقة التابعة
                        </label>
                        <input
                          type="text"
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          placeholder="المدينة أو المنطقة"
                          className="business-control-input w-full text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        العنوان بالتفصيل
                      </label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="business-chat-input h-20 w-full resize-none text-sm"
                        placeholder="اسم الشارع، رقم العمارة، علامة مميزة..."
                      />
                    </div>

                    {/* Shipping Cost Banner */}
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
                            تكلفة الشحن ({shippingInfo.governorate || city})
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
                          لا توجد منطقة شحن مسجلة لهذه المحافظة (سيتم احتساب الشحن 0 ج.م)
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Coupons and Discounts */}
                <div className="business-page-panel p-3.5 sm:p-4">
                  <h3
                    className="mb-3 flex items-center gap-2 font-semibold text-sm sm:text-base"
                    style={headingStyle}
                  >
                    <TicketIcon className="h-5 w-5" style={mutedStyle} />
                    الكوبونات والخصم
                  </h3>

                  <div className="space-y-3">
                    {/* Coupon Input or Applied Chip */}
                    {!appliedCoupon ? (
                      <div>
                        <label className="mb-1 block text-xs" style={mutedStyle}>
                          كود الكوبون
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="أدخل كود الكوبون..."
                            className="business-control-input flex-1 text-sm font-mono"
                            onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={loadingCoupon || !couponCode.trim() || subtotal <= 0}
                            className="business-chip-button px-4 py-2 text-xs sm:text-sm font-semibold"
                            data-active="true"
                          >
                            {loadingCoupon ? "جاري الفحص..." : "تطبيق"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <TicketIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                            {appliedCoupon.code}
                          </span>
                          <span className="text-muted-foreground">
                            (خصم {appliedCoupon.discountAmount.toLocaleString()} ج.م)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                          title="إزالة الكوبون"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Manual Discount */}
                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        خصم يدوي مباشر (ج.م)
                      </label>
                      <input
                        type="number"
                        value={manualDiscount || ""}
                        onChange={(e) => setManualDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                        min="0"
                        className="business-control-input w-full text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Order Settings & Payment */}
                <div className="business-page-panel p-3.5 sm:p-4">
                  <h3
                    className="mb-3 flex items-center gap-2 font-semibold text-sm sm:text-base"
                    style={headingStyle}
                  >
                    <BanknotesIcon className="h-5 w-5" style={mutedStyle} />
                    إعدادات الطلب والدفع
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        طريقة الدفع
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="business-control-input w-full text-sm"
                      >
                        <option value="CASH">دفع عند الاستلام (كاش)</option>
                        <option value="WALLET">محفظة إلكترونية</option>
                        <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        حالة الطلب
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="business-control-input w-full text-sm"
                      >
                        <option value="CONFIRMED">مؤكد (CONFIRMED)</option>
                        <option value="PENDING">معلق (PENDING)</option>
                        <option value="PROCESSING">قيد التجهيز (PROCESSING)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        نوع الطلب
                      </label>
                      <select
                        value={requestType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRequestType(val);
                          if (val === "return") {
                            setStatus("RETURNED");
                          } else if (val === "exchange") {
                            setStatus("EXCHANGED");
                          } else {
                            setStatus("CONFIRMED");
                          }
                        }}
                        className="business-control-input w-full text-sm"
                      >
                        <option value="delivery">شحن وتوصيل عادي</option>
                        <option value="partial_delivery">طلب تسليم جزئي</option>
                        <option value="exchange">طلب استبدال</option>
                        <option value="return">طلب مرتجع</option>
                      </select>
                    </div>
                  </div>

                  {(requestType === "return" || requestType === "exchange") && (
                    <div className="mt-3">
                      <label className="mb-1 block text-xs" style={mutedStyle}>
                        💰 مبلغ التحصيل في حالة المرتجع (افتراضي: مصاريف الشحن)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={returnAmount}
                          onChange={(e) => setReturnAmount(e.target.value)}
                          placeholder={
                            shippingInfo
                              ? `${shippingInfo.price} (مصاريف الشحن)`
                              : "سيتم استخدام مصاريف الشحن تلقائياً"
                          }
                          className="business-control-input w-full text-sm pe-12"
                          min="0"
                          step="1"
                        />
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          ج.م
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        هذا المبلغ يظهر لشركة الشحن كـ &quot;مبلغ التحصيل في حالة المرتجع&quot;.
                      </p>
                    </div>
                  )}

                  {isExchangeOrReturn && (
                    <div className="mt-3 space-y-2">
                      {phoneDigitsCount < 9 ? (
                        <div className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>يرجى إدخال رقم هاتف العميل أولاً للتحقق من وجود طلبات سابقة مؤهلة</span>
                        </div>
                      ) : previousOrderMissing ? (
                        <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300 space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
                            <span>لا يمكن إنشاء طلب {requestType === "return" ? "مرتجع" : "استبدال"}</span>
                          </div>
                          <p className="leading-relaxed text-[11px]">
                            سياسة المتجر تشترط وجود طلب سابق مكتمل ({exchangeReturnPolicy?.allowedStatuses?.join(" أو ") || "DELIVERED"}) خلال {exchangeReturnPolicy?.timeLimitDays || 14} يوم. لم يتم العثور على أي طلب مؤهل لهذا الرقم.
                          </p>
                        </div>
                      ) : eligiblePreviousOrders.length > 0 ? (
                        <div className="p-3 rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-blue-900 dark:text-blue-300">
                              الطلب السابق المرتبط بال{requestType === "return" ? "مرتجع" : "استبدال"}
                              {exchangeReturnPolicy?.requireExplicitOrderLink && <span className="text-red-500 ms-1">*</span>}
                            </label>
                            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                              {eligiblePreviousOrders.length} طلب سابق مؤهل
                            </span>
                          </div>
                          <select
                            value={selectedPreviousOrder}
                            onChange={(e) => setSelectedPreviousOrder(e.target.value)}
                            className="business-control-input w-full text-xs py-1.5"
                          >
                            <option value="">
                              {exchangeReturnPolicy?.requireExplicitOrderLink
                                ? "اختر الطلب السابق (إلزامي)..."
                                : "تحديد تلقائي (أحدث طلب مؤهل)"}
                            </option>
                            {eligiblePreviousOrders.map((ord) => (
                              <option key={ord.id} value={ord.id}>
                                #{ord.orderNumber} — {new Date(ord.createdAt).toLocaleDateString("ar-EG")} — {Number(ord.total).toLocaleString()} ج.م ({ord.status})
                              </option>
                            ))}
                          </select>
                          {selectedOrderObj && (
                            <div className="text-[11px] text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-gray-800/80 p-2 rounded border border-gray-200 dark:border-gray-700 space-y-0.5">
                              <span className="font-semibold text-gray-700 dark:text-gray-200">المنتجات بالطلب السابق: </span>
                              <span>
                                {selectedOrderObj.orderItems?.map((it) => `${it.productName}${it.productColor ? ` - ${it.productColor}` : ''}${it.productSize ? ` (${it.productSize})` : ''} × ${it.quantity}`).join(' | ') || 'منتجات الطلب السابق'}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Scheduled Order Section */}
                <div className="business-page-panel p-3.5 sm:p-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isScheduledOrder}
                      onChange={(e) => setIsScheduledOrder(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <CalendarIcon className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-semibold text-foreground">
                      جدولة الطلب لتسليمه في تاريخ محدد
                    </span>
                  </label>

                  {isScheduledOrder && (
                    <div className="mt-3 space-y-3 pt-3 border-t border-border/40">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">
                            تاريخ التوصيل <span style={dangerStyle}>*</span>
                          </label>
                          <input
                            type="date"
                            value={scheduledDeliveryDate}
                            onChange={(e) => setScheduledDeliveryDate(e.target.value)}
                            min={
                              new Date(Date.now() + 24 * 60 * 60 * 1000)
                                .toISOString()
                                .split("T")[0]
                            }
                            className="business-control-input w-full text-xs"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">
                            وقت التوصيل المفضل (اختياري)
                          </label>
                          <input
                            type="time"
                            value={scheduledDeliveryTime}
                            onChange={(e) => setScheduledDeliveryTime(e.target.value)}
                            className="business-control-input w-full text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-foreground">
                          ملاحظات الجدولة والتسليم
                        </label>
                        <textarea
                          value={scheduledNotes}
                          onChange={(e) => setScheduledNotes(e.target.value)}
                          placeholder="مثال: تسليم بعد الساعة 5 مساءً..."
                          className="business-control-input w-full text-xs h-14 resize-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="business-page-panel p-3.5 sm:p-4">
                  <label className="mb-1 block text-xs" style={mutedStyle}>
                    ملاحظات الطلب (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="business-chat-input h-16 w-full resize-none text-sm"
                    placeholder="أي ملاحظات إضافية على الطلب..."
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

                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                        <span>إجمالي الخصم</span>
                        <span>-{totalDiscount.toLocaleString()} ج.م</span>
                      </div>
                    )}

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
                      <span style={headingStyle}>الإجمالي النهائي</span>
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

        {/* Footer (Hidden when createdOrder is active) */}
        {!createdOrder && (
          <div className="business-footer-bar flex items-center justify-between p-3 sm:p-4">
            <button
              type="button"
              onClick={step === "checkout" ? () => setStep("products") : onClose}
              className="business-chip-button px-4 py-2 text-xs sm:text-sm"
            >
              {step === "checkout" ? "رجوع" : "إلغاء"}
            </button>

            {step === "products" && cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowMobileCart(false);
                  setStep("checkout");
                }}
                className="business-chip-button md:hidden flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
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
                  loading ||
                  cartItems.length === 0 ||
                  !phone ||
                  !customerName ||
                  blockPreventsOrder ||
                  previousOrderPreventsOrder ||
                  (isScheduledOrder && !scheduledDeliveryDate) ||
                  (Boolean(city) && loadingShipping)
                }
                className={`business-chip-button flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium ${
                  loading ||
                  cartItems.length === 0 ||
                  !phone ||
                  !customerName ||
                  blockPreventsOrder ||
                  previousOrderPreventsOrder ||
                  (isScheduledOrder && !scheduledDeliveryDate) ||
                  (Boolean(city) && loadingShipping)
                    ? "cursor-not-allowed opacity-60"
                    : ""
                }`}
                style={
                  loading ||
                  cartItems.length === 0 ||
                  !phone ||
                  !customerName ||
                  blockPreventsOrder ||
                  previousOrderPreventsOrder ||
                  (isScheduledOrder && !scheduledDeliveryDate) ||
                  (Boolean(city) && loadingShipping)
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
        )}

        {/* Variant Selection Modal - Same as ManualOrder */}
        {showVariantModal && selectedProduct && (
          <VariantSelectionModal
            product={selectedProduct}
            selectedAttributes={selectedAttributes}
            onAttributeSelect={(attrName, value) => {
              setSelectedAttributes((prev) => ({ ...prev, [attrName]: value }));
            }}
            onVariantSelect={(variant) => {
              handleAddToCart(selectedProduct, variant, selectedAttributes);
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
