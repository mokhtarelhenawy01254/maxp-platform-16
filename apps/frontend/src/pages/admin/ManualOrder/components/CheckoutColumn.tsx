import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  UserIcon,
  MapPinIcon,
  BanknotesIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  TruckIcon,
  TicketIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  PrinterIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import { SearchableSelect } from "../../../../components/ui/SearchableSelect";
import { GovernorateAreaSearch } from "../../../../components/ui/GovernorateAreaSearch";
import { apiClient, type ApiRequestConfig } from "../../../../services/apiClient";
import {
  lookupCustomerByPhone,
  EligiblePreviousOrder,
  ExchangeReturnPolicy,
} from "../../../../hooks/useCustomerByPhone";
import {
  customerBlocklistService,
  CustomerBlockEvaluation,
} from "../../../../services/customerBlocklistService";
import { toast } from "sonner";
import { CartItem } from "../types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuthSimple";

const EGYPTIAN_GOVERNORATES = [
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "البحر الأحمر",
  "البحيرة",
  "الفيوم",
  "الغربية",
  "الإسماعيلية",
  "المنوفية",
  "المنيا",
  "القليوبية",
  "الوادي الجديد",
  "السويس",
  "أسوان",
  "أسيوط",
  "بني سويف",
  "بورسعيد",
  "دمياط",
  "الشرقية",
  "جنوب سيناء",
  "كفر الشيخ",
  "مطروح",
  "الأقصر",
  "قنا",
  "شمال سيناء",
  "سوهاج",
];

const normalizeLocationLabel = (value: string | null | undefined) =>
  String(value || "").replace(/^\d+:/, "").trim();

const buildVariantSummary = (item: CartItem) => {
  const baseSummary = [item.color, item.size].filter(Boolean).join(" / ");
  if (item.variantName && item.variantName !== baseSummary) {
    return item.variantName;
  }
  return baseSummary;
};

interface CheckoutColumnProps {
  cartItems: CartItem[];
  onClearCart?: () => void;
}

interface GovernmentOption {
  id: number;
  name: string;
}

interface AreaOption {
  id: number;
  name: string;
}

interface ShippingInfo {
  zoneId: string | null;
  price: number;
  deliveryTime: string;
  governorate: string | null;
}

interface CouponInfo {
  id: string;
  code: string;
  name: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  discountAmount: number;
}

interface TurboLocationApiItem {
  id?: number | string;
  name?: string | null;
}

interface ApiErrorPayload {
  response?: {
    data?: {
      error?: string;
      message?: string;
    };
  };
}

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const payload = error as ApiErrorPayload;
  return payload.response?.data?.message || payload.response?.data?.error || fallback;
};

const CheckoutColumn: React.FC<CheckoutColumnProps> = ({
  cartItems,
  onClearCart,
}) => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAffiliate = user?.role === "AFFILIATE";
  const canOverrideBlockedCustomer = [
    "OWNER",
    "COMPANY_ADMIN",
    "SUPER_ADMIN",
    "MANAGER",
    "ADMIN",
  ].includes(user?.role || "");

  const canUseTurboLocationLookups = Boolean(
    user?.role && user.role !== "AFFILIATE",
  );
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(false);
  const [customerBlock, setCustomerBlock] =
    useState<CustomerBlockEvaluation | null>(null);
  const [allowBlockedCustomerOverride, setAllowBlockedCustomerOverride] =
    useState(false);

  // Customer Form State
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [governments, setGovernments] = useState<GovernmentOption[]>([]);
  const [availableAreas, setAvailableAreas] = useState<AreaOption[]>([]);
  const [loadingGovernments, setLoadingGovernments] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Order Settings
  const [status, setStatus] = useState("CONFIRMED"); // PENDING, CONFIRMED
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [requestType, setRequestType] = useState("delivery");
  const [searchParams] = useSearchParams();
  const [returnAmount, setReturnAmount] = useState<string>("");

  // Exchange & Return Policy State
  const [eligiblePreviousOrders, setEligiblePreviousOrders] = useState<EligiblePreviousOrder[]>([]);
  const [exchangeReturnPolicy, setExchangeReturnPolicy] = useState<ExchangeReturnPolicy | null>(null);
  const [selectedPreviousOrder, setSelectedPreviousOrder] = useState<string>("");

  // Initialize from searchParams if present
  useEffect(() => {
    const exchangeParam = searchParams.get("exchangeOrderNumber");
    const returnParam = searchParams.get("returnOrderNumber");
    const phoneParam = searchParams.get("phone");

    if (phoneParam && !phone) {
      setPhone(phoneParam);
    }
    if (exchangeParam) {
      setRequestType("exchange");
      setStatus("EXCHANGED");
      setSelectedPreviousOrder(exchangeParam);
    } else if (returnParam) {
      setRequestType("return");
      setStatus("RETURNED");
      setSelectedPreviousOrder(returnParam);
    }
  }, [searchParams]);

  // Preload order policy on mount (skip for affiliates, and silence error toast for background load)
  useEffect(() => {
    if (isAffiliate) return;
    let active = true;
    apiClient
      .get("/order-settings", { _skipErrorToast: true } as ApiRequestConfig)
      .then((res) => {
        if (active && res.data?.data?.exchangeReturnPolicy) {
          setExchangeReturnPolicy(res.data.data.exchangeReturnPolicy);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAffiliate]);

  // Shipping State
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);

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

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Calculate totals
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems],
  );

  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const shippingCost = shippingInfo?.price || 0;
  const totalDiscount = couponDiscount + manualDiscount;
  const grandTotal = subtotal - totalDiscount + shippingCost;

  useEffect(() => {
    if (!canUseTurboLocationLookups) {
      setGovernments([]);
      setLoadingGovernments(false);
      return;
    }

    const fetchGovernments = async () => {
      try {
        setLoadingGovernments(true);
        const response = await apiClient.get("/turbo/governments");
        const turboGovernments = response.data?.data?.governments;

        if (
          response.data?.success &&
          Array.isArray(turboGovernments) &&
          turboGovernments.length > 0
        ) {
          setGovernments(
            turboGovernments
              .map((gov: TurboLocationApiItem) => ({
                id: Number(gov.id),
                name: normalizeLocationLabel(gov.name),
              }))
              .filter(
                (gov: GovernmentOption) =>
                  Number.isFinite(gov.id) && Boolean(gov.name),
              ),
          );
        }
      } catch (error) {
        console.debug(
          "[manual-order] Turbo governments unavailable, using fallback list",
          error,
        );
      } finally {
        setLoadingGovernments(false);
      }
    };

    fetchGovernments();
  }, [canUseTurboLocationLookups]);

  // Debounced Phone Search — auto-fill customer data from previous orders
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setSearching(false);
      setEligiblePreviousOrders([]);
      return;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        const customer = await lookupCustomerByPhone(phone);

        if (isCancelled || !customer) return;

        if (customer.firstName || customer.lastName || customer.address) {
          setFirstName(customer.firstName || "");
          setLastName(customer.lastName || "");
          setAddress(customer.address || "");
          setGovernorate(normalizeLocationLabel(customer.governorate || ""));
          setArea(normalizeLocationLabel(customer.area || ""));
          if (customer.notes) setNotes(customer.notes);
          toast.success(t('manualOrder.k_52'));
        }

        if (customer.eligiblePreviousOrders) {
          setEligiblePreviousOrders(customer.eligiblePreviousOrders);
          const targetNum = searchParams.get("exchangeOrderNumber") || searchParams.get("returnOrderNumber");
          if (targetNum) {
            const matched = customer.eligiblePreviousOrders.find(
              (o) => o.orderNumber === targetNum || o.id === targetNum
            );
            if (matched) setSelectedPreviousOrder(matched.id);
          } else if (customer.eligiblePreviousOrders.length === 1) {
            setSelectedPreviousOrder(customer.eligiblePreviousOrders[0].id);
          }
        }
        if (customer.exchangeReturnPolicy) {
          setExchangeReturnPolicy(customer.exchangeReturnPolicy);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        if (!isCancelled) setSearching(false);
      }
    }, 800);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [phone]);

  useEffect(() => {
    if (phone.replace(/\D/g, "").length < 10) {
      setCustomerBlock(null);
      setAllowBlockedCustomerOverride(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setCheckingBlock(true);
        const result = await customerBlocklistService.check({
          phone,
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
  }, [phone, paymentMethod]);

  useEffect(() => {
    if (!canUseTurboLocationLookups) {
      setAvailableAreas([]);
      setLoadingAreas(false);
      return;
    }
    const selectedGovernment = governments.find(
      (gov) =>
        normalizeLocationLabel(gov.name) === normalizeLocationLabel(governorate),
    );

    if (!selectedGovernment?.id) {
      setAvailableAreas([]);
      setLoadingAreas(false);
      return;
    }

    const fetchAreas = async () => {
      try {
        setLoadingAreas(true);
        const response = await apiClient.get(
          `/turbo/areas/${selectedGovernment.id}`,
        );
        const turboAreas = response.data?.data?.areas;

        if (response.data?.success && Array.isArray(turboAreas)) {
          const uniqueAreas = Array.from(
            new Map(
              turboAreas
                .map((item: TurboLocationApiItem) => ({
                  id: Number(item.id),
                  name: normalizeLocationLabel(item.name),
                }))
                .filter(
                  (item: AreaOption) =>
                    Number.isFinite(item.id) && Boolean(item.name),
                )
                .map((item: AreaOption) => [item.name, item]),
            ).values(),
          );

          setAvailableAreas(uniqueAreas);
        } else {
          setAvailableAreas([]);
        }
      } catch (error) {
        console.debug(
          "[manual-order] Turbo areas unavailable, falling back to free text",
          error,
        );
        setAvailableAreas([]);
      } finally {
        setLoadingAreas(false);
      }
    };

    fetchAreas();
  }, [canUseTurboLocationLookups, governorate, governments]);

  // Fetch shipping cost when governorate changes
  useEffect(() => {
    const fetchShippingCost = async () => {
      if (!governorate || governorate.length < 2) {
        setShippingInfo(null);
        return;
      }

      try {
        setLoadingShipping(true);
        const response = await apiClient.get(
          `/shipping-zones/find-price?governorate=${encodeURIComponent(governorate)}`,
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
  }, [governorate]);

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error(t('manualOrder.k_53'));
      return;
    }

    if (subtotal <= 0) {
      toast.error(t('manualOrder.k_54'));
      return;
    }

    try {
      setLoadingCoupon(true);
      const response = await apiClient.post("/coupons/validate", {
        code: couponCode.trim(),
        orderAmount: subtotal,
      });

      if (response.data.success) {
        const { coupon, discountAmount } = response.data.data;
        setAppliedCoupon({
          ...coupon,
          discountAmount,
        });
        toast.success(
          t('manualOrder.coupon_applied', { amount: discountAmount.toLocaleString() }),
        );
        setCouponCode("");
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('manualOrder.k_55')));
    } finally {
      setLoadingCoupon(false);
    }
  };

  // Remove Coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.success(t('manualOrder.k_56'));
  };

  // Reset form after successful order
  const resetForm = () => {
    setPhone("");
    setFirstName("");
    setLastName("");
    setAddress("");
    setGovernorate("");
    setArea("");
    setNotes("");
    setAppliedCoupon(null);
    setCouponCode("");
    setManualDiscount(0);
    setShippingInfo(null);
    setIsScheduledOrder(false);
    setScheduledDeliveryDate("");
    setScheduledDeliveryTime("");
    setScheduledNotes("");
    setCustomerBlock(null);
    setAllowBlockedCustomerOverride(false);
    onClearCart?.();
  };

  const handleCreateOrder = async () => {
    if (cartItems.length === 0) {
      toast.error(t('manualOrder.k_57'));
      return;
    }
    if (!phone || !firstName) {
      toast.error(t('manualOrder.k_58'));
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
    if (governorate && loadingShipping) {
      toast.error(t('manualOrder.k_59'));
      return;
    }
    if (
      customerBlock?.blocked &&
      !(canOverrideBlockedCustomer && allowBlockedCustomerOverride)
    ) {
      toast.error(customerBlock.message || t('manualOrder.k_60'));
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };
  const confirmCreateOrder = async () => {
    setShowConfirmModal(false);

    try {
      setLoading(true);

      const scheduledDateTime =
        isScheduledOrder && scheduledDeliveryDate
          ? new Date(
            `${scheduledDeliveryDate}${scheduledDeliveryTime ? "T" + scheduledDeliveryTime : "T00:00:00"}`,
          ).toISOString()
          : null;

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
        })),
        customerPhone: phone,
        customerName: `${firstName} ${lastName}`.trim(),
        customerAddress: address,
        governorate: governorate,
        city: area,
        area: area,
        notes: notes,
        status: isScheduledOrder ? "SCHEDULED" : status,
        paymentMethod: paymentMethod,
        extractionMethod: isAffiliate ? "affiliate_manual" : "manual_admin",
        conversationId: "manual",
        platform: isAffiliate ? "affiliate" : "manual",
        source: isAffiliate ? "affiliate_direct" : "manual_entry",
        orderSource: isAffiliate ? "AFFILIATE_DIRECT" : "manual",
        createAsAffiliate: isAffiliate,
        requestType: requestType,
        returnAmount: returnAmount ? parseFloat(returnAmount) : undefined,
        ...(isExchangeOrReturn ? {
          originalOrderId: selectedPreviousOrder || (eligiblePreviousOrders[0]?.id) || undefined,
          originalOrderNumber: selectedOrderObj?.orderNumber || (eligiblePreviousOrders[0]?.orderNumber) || undefined,
        } : {}),
        // New fields for shipping and discount
        couponId: appliedCoupon?.id,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscount,
        manualDiscount: manualDiscount,
        subtotal: subtotal,
        totalAmount: grandTotal,
        // Scheduled order fields
        isScheduled: isScheduledOrder,
        scheduledDeliveryDate: scheduledDateTime,
        scheduledNotes: isScheduledOrder ? scheduledNotes : undefined,
        allowBlockedCustomerOverride:
          canOverrideBlockedCustomer && allowBlockedCustomerOverride,
        ...(governorate
          ? {
            shippingCost,
            ...(shippingInfo?.zoneId
              ? {
                shippingZoneId: shippingInfo.zoneId,
              }
              : {}),
          }
          : {}),
      };

      const response = await apiClient.post("/orders-enhanced", payload);

      if (response.data.success) {
        toast.success(t('manualOrder.k_61'));

        // Get order ID and show success modal
        const orderId = response.data.order?.id || response.data.data?.id;
        setCreatedOrderId(orderId);
        setShowSuccessModal(true);
      } else {
        toast.error(
          t('manualOrder.k_62') + (response.data.error || t('manualOrder.k_63')),
        );
      }
    } catch (error: unknown) {
      console.error("Create order error:", error);
      toast.error(getApiErrorMessage(error, t('manualOrder.k_64')));
    } finally {
      setLoading(false);
    }
  };

  // Check for stock warnings
  const stockWarnings = cartItems.filter((item) => item.quantity > item.stock);
  const blockPreventsOrder =
    Boolean(customerBlock?.blocked) &&
    !(canOverrideBlockedCustomer && allowBlockedCustomerOverride);

  const isExchangeOrReturn = requestType === "exchange" || requestType === "return";
  const previousOrderRequired = isExchangeOrReturn && (exchangeReturnPolicy?.requirePreviousOrder ?? false);
  const phoneDigitsCount = phone.replace(/\D/g, "").length;
  const previousOrderMissing = previousOrderRequired && phoneDigitsCount >= 9 && eligiblePreviousOrders.length === 0;
  const explicitOrderLinkMissing = previousOrderRequired && Boolean(exchangeReturnPolicy?.requireExplicitOrderLink) && !selectedPreviousOrder;
  const previousOrderPreventsOrder = previousOrderMissing || explicitOrderLinkMissing;

  const selectedOrderObj = useMemo(() => {
    return eligiblePreviousOrders.find(
      (o) => o.id === selectedPreviousOrder || o.orderNumber === selectedPreviousOrder
    );
  }, [eligiblePreviousOrders, selectedPreviousOrder]);

  return (
    <div
      className="flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xs border border-gray-200/80 dark:border-gray-800 overflow-hidden"
      style={{ height: "100%", maxHeight: "100%" }}
    >
      <div className="px-4 py-3 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
        <h2 className="text-xs sm:text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
          {t('manualOrder.k_89')}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-5 manual-order-scroll manual-order-column">
        {/* Customer Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {t('manualOrder.k_90')}
          </h3>

          <div className="relative">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('manualOrder.k_91')}{" "}
              <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-right dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
              {searching && (
                <MagnifyingGlassIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 absolute left-3 top-3 animate-bounce" />
              )}
            </div>
          </div>

          {(checkingBlock || customerBlock) && (
            <div
              className={`rounded-lg border p-3 text-sm ${
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
                      ? t('manualOrder.k_65')
                      : customerBlock?.blocked
                        ? t('manualOrder.k_66')
                        : t('manualOrder.k_67')}
                  </p>
                  {customerBlock?.message && (
                    <p className="mt-1 leading-5">{customerBlock.message}</p>
                  )}
                  {customerBlock?.blocked && canOverrideBlockedCustomer && (
                    <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={allowBlockedCustomerOverride}
                        onChange={(event) =>
                          setAllowBlockedCustomerOverride(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                      />
                      {t('manualOrder.k_92')}
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('manualOrder.k_93')}{" "}
                <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('manualOrder.k_94')}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('manualOrder.k_95')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            {canUseTurboLocationLookups ? (
              <GovernorateAreaSearch
                value={{ governorate, area }}
                onChange={(next) => {
                  setGovernorate(normalizeLocationLabel(next.governorate));
                  setArea(normalizeLocationLabel(next.area));
                }}
                placeholder={t('manualOrder.k_1')}
                searchPlaceholder={t('manualOrder.k_2')}
                emptyText={t('manualOrder.k_3')}
                loadingText={t('manualOrder.k_4')}
                autoSearchText={address || ""}
              />
            ) : (
              <SearchableSelect
                options={EGYPTIAN_GOVERNORATES.map((gov) => ({
                  value: gov,
                  label: gov,
                }))}
                value={governorate}
                onChange={(val) => {
                  setGovernorate(normalizeLocationLabel(val));
                }}
                placeholder={t('manualOrder.k_1', 'اختر المحافظة...')}
                searchPlaceholder={t('manualOrder.k_2', 'ابحث عن المحافظة...')}
                emptyText={t('manualOrder.k_3', 'لا توجد نتائج')}
              />
            )}
            {loadingGovernments && (
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                {t('manualOrder.k_96')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('manualOrder.k_97')}
            </label>
            {availableAreas.length > 0 ? (
              <SearchableSelect
                options={availableAreas.map((areaOption) => ({
                  value: areaOption.name,
                  label: areaOption.name,
                }))}
                value={area}
                onChange={setArea}
                placeholder={loadingAreas ? t('manualOrder.k_7') : t('manualOrder.k_68')}
                searchPlaceholder={t('manualOrder.k_5')}
                emptyText={t('manualOrder.k_6')}
                disabled={false}
                loading={loadingAreas}
                loadingText={t('manualOrder.k_7')}
              />
            ) : (
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder={
                  governorate
                    ? t('manualOrder.k_69')
                    : t('manualOrder.k_70')
                }
              />
            )}
            <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
              {t('manualOrder.k_98')}
            </p>
          </div>

          <div className="relative">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('manualOrder.k_99')}
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 h-20 resize-none dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              placeholder={t('manualOrder.k_8')}
            />
            <MapPinIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-8" />
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Shipping Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {t('manualOrder.k_24')}
          </h3>

          {loadingShipping ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
              {t('manualOrder.k_100')}
            </div>
          ) : shippingInfo?.zoneId ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700 dark:text-green-400">
                  {t('manualOrder.k_101')}{shippingInfo.governorate})
                </span>
                <span className="font-bold text-green-700 dark:text-green-400">
                  {shippingInfo.price.toLocaleString()} {t('manualOrder.k_75')}
                </span>
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {t('manualOrder.k_102')} {shippingInfo.deliveryTime}
              </div>
            </div>
          ) : governorate ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {t('manualOrder.k_103')}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 dark:text-gray-500">
              {t('manualOrder.k_104')}
            </div>
          )}
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Coupon & Discount */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {t('manualOrder.k_105')}
          </h3>

          {/* Coupon Input */}
          {!appliedCoupon ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder={t('manualOrder.k_9')}
                className="flex-1 border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
              />
              <button
                onClick={handleApplyCoupon}
                disabled={loadingCoupon || !couponCode.trim()}
                className="px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md text-sm hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                {loadingCoupon ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  t('manualOrder.k_71')
                )}
              </button>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 mr-2">
                    ({appliedCoupon.name})
                  </span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                {t('manualOrder.k_106')}{appliedCoupon.discountAmount.toLocaleString()} {t('manualOrder.k_75')}
              </div>
            </div>
          )}

          {/* Manual Discount */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('manualOrder.k_107')}
            </label>
            <input
              type="number"
              value={manualDiscount || ""}
              onChange={(e) =>
                setManualDiscount(parseFloat(e.target.value) || 0)
              }
              className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100"
              placeholder="0"
              min="0"
            />
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Order Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <BanknotesIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {t('manualOrder.k_108')}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('manualOrder.k_109')}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="CASH">{t('manualOrder.k_12')}</option>
                <option value="WALLET">{t('manualOrder.k_13')}</option>
                <option value="INSTAPAY">Instapay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('manualOrder.k_110')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="PENDING">{t('manualOrder.k_14')}</option>
                <option value="CONFIRMED">{t('manualOrder.k_15')}</option>
                <option value="PROCESSING">{t('manualOrder.k_16')}</option>
                <option value="RETURNED">{t('manualOrder.k_17')}</option>
                <option value="EXCHANGED">{t('manualOrder.k_18')}</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {t('manualOrder.k_111')}
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
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="delivery">{t('manualOrder.k_19')}</option>
                <option value="partial_delivery">{isEn ? "Partial Delivery Order" : "طلب تسليم جزئي"}</option>
                <option value="return">{t('manualOrder.k_20')}</option>
                <option value="exchange">{t('manualOrder.k_21')}</option>
              </select>
            </div>

            {isExchangeOrReturn && (
              <div className="col-span-2 space-y-2">
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
                    <p className="leading-relaxed">
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
                      className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100 py-2"
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

          {/* قيمة المرتجع الافتراضية */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {isEn
                ? "💰 Return Collection Amount (Default: Shipping Cost)"
                : "💰 مبلغ التحصيل في حالة المرتجع (افتراضي: مصاريف الشحن)"}
            </label>
            <div className="relative">
              <input
                type="number"
                value={returnAmount}
                onChange={(e) => setReturnAmount(e.target.value)}
                placeholder={
                  shippingInfo
                    ? `${shippingInfo.price} ${isEn ? "(Shipping Cost)" : "(مصاريف الشحن)"}`
                    : (isEn ? "Shipping cost will be used automatically" : "سيتم استخدام مصاريف الشحن تلقائياً")
                }
                className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 pe-16"
                min="0"
                step="1"
              />
              <span className={`absolute ${isEn ? "end-2" : "start-2"} top-1/2 -translate-y-1/2 text-xs text-gray-400`}>
                {isEn ? "EGP" : "ج.م"}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {isEn
                ? 'This amount appears in the courier system as "Return Collection Amount"'
                : 'هذا المبلغ يظهر في شركة الشحن كـ "مبلغ التحصيل في حالة المرتجع"'}
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('manualOrder.k_112')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 h-16 resize-none text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
              placeholder={t('manualOrder.k_10')}
            />
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-700" />

        {/* Scheduled Order Section */}
        <div className="space-y-3">
          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isScheduledOrder}
                onChange={(e) => setIsScheduledOrder(e.target.checked)}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <CalendarIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('manualOrder.k_113')}
              </span>
            </label>

            {isScheduledOrder && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('manualOrder.k_114')} <span className="text-red-500">*</span>
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
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('manualOrder.k_115')}
                    </label>
                    <input
                      type="time"
                      value={scheduledDeliveryTime}
                      onChange={(e) => setScheduledDeliveryTime(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('manualOrder.k_116')}
                  </label>
                  <textarea
                    value={scheduledNotes}
                    onChange={(e) => setScheduledNotes(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    rows={2}
                    placeholder={t('manualOrder.k_11')}
                  />
                </div>
                <div className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-300">
                  <CalendarIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    {t('manualOrder.k_117')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Warnings */}
      {stockWarnings.length > 0 && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-700">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>{t('manualOrder.k_22')}</span>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {t('manualOrder.k_118')}
            {cartItems.reduce((acc, item) => acc + item.quantity, 0)} {t('manualOrder.k_119')}
          </span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {subtotal.toLocaleString()} {t('manualOrder.k_75')}
          </span>
        </div>

        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span>{t('manualOrder.k_23')}</span>
            <span>-{totalDiscount.toLocaleString()}{t('manualOrder.k_75')}</span>
          </div>
        )}

        {shippingCost > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">{t('manualOrder.k_24')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              +{shippingCost.toLocaleString()} {t('manualOrder.k_75')}
            </span>
          </div>
        )}

        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-gray-900 dark:text-gray-100">
            {t('manualOrder.k_120')}
          </span>
          <span className="text-blue-600 dark:text-blue-400">
            {grandTotal.toLocaleString()} {t('manualOrder.k_75')}
          </span>
        </div>

        <button
          onClick={handleCreateOrder}
          disabled={loading || cartItems.length === 0 || (!!governorate && loadingShipping) || blockPreventsOrder || previousOrderPreventsOrder}
          title={
            previousOrderMissing
              ? "لا يمكن المتابعة: سياسة المتجر تشترط وجود طلب سابق مؤهل لهذا العميل"
              : explicitOrderLinkMissing
              ? "يرجى تحديد الطلب السابق المرتبط أولاً"
              : undefined
          }
          className={`w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-white font-bold transition-all mt-3 ${loading || cartItems.length === 0
            || (!!governorate && loadingShipping)
            || blockPreventsOrder
            || previousOrderPreventsOrder
            ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
            : "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 shadow-lg hover:shadow-xl"
            }`}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircleIcon className="w-6 h-6" />
              <span>{t('manualOrder.k_82')}{grandTotal.toLocaleString()}{t('manualOrder.k_83')}</span>
            </>
          )}
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <ShoppingCartIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
                {t('manualOrder.k_121')}
              </h3>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
                {t('manualOrder.k_122')}
              </p>

              {/* Order Summary in Modal */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('manualOrder.k_123')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {firstName} {lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('manualOrder.k_124')}
                  </span>
                  <span
                    className="font-medium text-gray-900 dark:text-gray-100"
                    dir="ltr"
                  >
                    {phone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('manualOrder.k_125')}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {cartItems.length} {t('manualOrder.k_126')}
                    {cartItems.reduce((acc, item) => acc + item.quantity, 0)}{" "}
                    {t('manualOrder.k_119')}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-gray-600 dark:text-gray-400 mb-2">
                    {t('manualOrder.k_127')}
                  </div>
                  <div className="space-y-2">
                    {cartItems.map((item) => {
                      const variantSummary = buildVariantSummary(item);

                      return (
                        <div
                          key={`${item.productId}-${item.variantId || "default"}-confirm`}
                          className="rounded-md bg-white/70 dark:bg-gray-800/70 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {item.name}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {item.color && (
                                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                    {t('manualOrder.k_85')} {item.color}
                                  </span>
                                )}
                                {item.size && (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                    {t('manualOrder.k_86')} {item.size}
                                  </span>
                                )}
                                {!item.color && !item.size && variantSummary && (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                                    {variantSummary}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-left shrink-0">
                              <div className="font-semibold text-blue-600 dark:text-blue-400">
                                {item.price.toLocaleString()} {t('manualOrder.k_75')}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                {t('manualOrder.k_128')} {item.quantity}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-600 font-bold">
                  <span className="text-gray-900 dark:text-gray-100">
                    {t('manualOrder.k_77')}
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {grandTotal.toLocaleString()} {t('manualOrder.k_75')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('manualOrder.k_129')}
                </button>
                <button
                  onClick={confirmCreateOrder}
                  className="flex-1 py-2.5 px-4 bg-green-600 dark:bg-green-500 text-white rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                >
                  {t('manualOrder.k_130')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">
                {t('manualOrder.k_61')}
              </h3>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                {t('manualOrder.k_131')}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    if (createdOrderId) {
                      navigate(
                        isAffiliate
                          ? "/affiliates/orders"
                          : `/orders/${encodeURIComponent(String(createdOrderId))}`,
                      );
                    }
                  }}
                  className="w-full py-3 px-4 bg-blue-600 dark:bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                >
                  {t('manualOrder.k_132')}
                </button>
                <button
                  onClick={() => {
                    if (createdOrderId) {
                      window.open(
                        isAffiliate
                          ? "/affiliates/orders"
                          : `/orders/${encodeURIComponent(String(createdOrderId))}?print=true`,
                        "_blank",
                      );
                    }
                  }}
                  className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <PrinterIcon className="w-5 h-5" />
                  {t('manualOrder.k_133')}
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCreatedOrderId(null);
                    resetForm();
                  }}
                  className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('manualOrder.k_134')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutColumn;
