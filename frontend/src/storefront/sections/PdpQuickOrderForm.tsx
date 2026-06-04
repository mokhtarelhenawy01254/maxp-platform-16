import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import QuantitySelector from "../components/QuantitySelector";
import { useCheckoutStore } from "../store/useCheckoutStore";
import { usePdpSelectionStore } from "../store/usePdpSelectionStore";
import { useQuantityOfferSelectionStore } from "../store/useQuantityOfferSelectionStore";
import { useCartStore } from "../store/useCartStore";
import { buildCheckoutOrderPayload } from "../hooks/useCheckout";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import { useStorefrontFacebookTracking } from "../hooks/useStorefrontFacebookTracking";
import { useMinimumOrderSettings } from "../hooks/useMinimumOrderSettings";
import { formatStorefrontCurrency } from "../utils/currency";
import { buildStorefrontPath } from "../utils/paths";
import { trackConversionSuiteUsage } from "../utils/conversionSuiteTracking";
import { buildQuantityOfferCartItems } from "../utils/quantityOfferCartItems";
import {
  calculateVolumeDiscountPricing,
  type VolumeDiscountTier,
} from "../utils/volumeDiscounts";
import { getPdpQuickOrderSettingsFromDesignTokens } from "../utils/pdpQuickOrderSettings";
import { EGYPT_GOVERNORATES } from "../../constants/egyptGovernorates";
import { getCompanyId, storefrontApi } from "../../utils/storefrontApi";
import { persistPurchaseTracking } from "../utils/purchaseTrackingStorage";
import type { CartItem } from "../store/useCartStore";
import type { Product } from "../hooks/useProducts";
import { resolvePreviewThemeId } from "../preview/previewContext";

interface PdpQuickOrderFormProps {
  product: Product & {
    imageUrl?: string;
    hasVariants: boolean;
  };
  sectionSettings?: Record<string, unknown>;
}

interface PublicOrderResponse {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    id?: string | number;
    orderNumber?: string | number;
    total?: string | number;
    finalTotal?: string | number;
    [key: string]: unknown;
  } | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const translateAttributeKey = (key: string, prefersArabicCopy: boolean) => {
  const normalized = key.trim().toLowerCase();

  if (!prefersArabicCopy) {
    return key;
  }

  if (
    normalized === "size" ||
    normalized === "eu size" ||
    normalized === "shoe size"
  ) {
    return "المقاس";
  }

  if (normalized === "color" || normalized === "colour") {
    return "اللون";
  }

  return key;
};

const buildQuickOrderNote = ({
  alternatePhone,
  attributeSummary,
  quantityOfferLabel,
}: {
  alternatePhone: string;
  attributeSummary: string;
  quantityOfferLabel: string;
}) => {
  const blocks: string[] = [];

  if (alternatePhone.trim()) {
    blocks.push(`رقم هاتف بديل: ${alternatePhone.trim()}`);
  }

  if (attributeSummary.trim()) {
    blocks.push(`اختيار المنتج: ${attributeSummary.trim()}`);
  }

  if (quantityOfferLabel.trim()) {
    blocks.push(`العرض المحدد: ${quantityOfferLabel.trim()}`);
  }

  return blocks.join("\n");
};

const isValidEgyptianPhone = (value: string) =>
  /^01\d{9}$/.test(value.replace(/\s+/g, ""));

const inputClassName =
  "w-full rounded-[1rem] border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const PdpQuickOrderForm: React.FC<PdpQuickOrderFormProps> = ({
  product,
  sectionSettings,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { trackAddToCartEvent, trackInitiateCheckoutEvent } =
    useStorefrontFacebookTracking();
  const { formData, updateFormData, resetCheckout } = useCheckoutStore();
  const selection = usePdpSelectionStore((state) => state.selection);
  const quantity = usePdpSelectionStore((state) => state.quantity);
  const setQuantity = usePdpSelectionStore((state) => state.setQuantity);
  const quantityOfferSelection = useQuantityOfferSelectionStore(
    (state) => state.selection,
  );
  const addItem = useCartStore((state) => state.addItem);
  const prefersArabicCopy = theme.direction === "rtl";
  const configuredTitle =
    typeof sectionSettings?.title === "string" && sectionSettings.title.trim()
      ? sectionSettings.title.trim()
      : "";
  const configuredBadgeText =
    typeof sectionSettings?.badgeText === "string" &&
    sectionSettings.badgeText.trim()
      ? sectionSettings.badgeText.trim()
      : "";
  const configuredSubtitle =
    typeof sectionSettings?.subtitle === "string" &&
    sectionSettings.subtitle.trim()
      ? sectionSettings.subtitle.trim()
      : "";
  const configuredEmptyStateText =
    typeof sectionSettings?.emptyStateText === "string" &&
    sectionSettings.emptyStateText.trim()
      ? sectionSettings.emptyStateText.trim()
      : "";
  const configuredFormVariant =
    typeof sectionSettings?.formVariant === "string" &&
    sectionSettings.formVariant.trim()
      ? sectionSettings.formVariant.trim()
      : "";
  const configuredSurfaceMode =
    typeof sectionSettings?.surfaceMode === "string" &&
    sectionSettings.surfaceMode.trim()
      ? sectionSettings.surfaceMode.trim()
      : "";
  const configuredSubmitButtonText =
    typeof sectionSettings?.submitButtonText === "string" &&
    sectionSettings.submitButtonText.trim()
      ? sectionSettings.submitButtonText.trim()
      : "";
  const configuredAddToCartButtonText =
    typeof sectionSettings?.addToCartButtonText === "string" &&
    sectionSettings.addToCartButtonText.trim()
      ? sectionSettings.addToCartButtonText.trim()
      : "";
  const configuredShippingSummaryText =
    typeof sectionSettings?.shippingSummaryText === "string" &&
    sectionSettings.shippingSummaryText.trim()
      ? sectionSettings.shippingSummaryText.trim()
      : "";
  const configuredShippingSummaryValueText =
    typeof sectionSettings?.shippingSummaryValueText === "string" &&
    sectionSettings.shippingSummaryValueText.trim()
      ? sectionSettings.shippingSummaryValueText.trim()
      : "";
  const configuredShowAddToCartButton =
    typeof sectionSettings?.showAddToCartButton === "boolean"
      ? sectionSettings.showAddToCartButton
      : null;
  const configuredDecisionMode =
    typeof sectionSettings?.decisionMode === "string" &&
    sectionSettings.decisionMode.trim()
      ? sectionSettings.decisionMode.trim()
      : "";
  const fieldOverrideMap = isRecord(sectionSettings?.fields)
    ? sectionSettings.fields
    : {};
  const isSoleaFemmeQuickOrder =
    theme.id === "solea-femme" || configuredFormVariant === "solea-femme";
  const isMenShoesQuickOrder =
    theme.id === "men-shoes-eg" ||
    theme.id === "women-fashion-eg" ||
    isSoleaFemmeQuickOrder ||
    configuredFormVariant === "men-shoes-eg" ||
    configuredFormVariant === "women-fashion-eg";
  const isWomenFashionQuickOrder =
    theme.id === "women-fashion-eg" || configuredFormVariant === "women-fashion-eg";
  const isKhemetLuxeQuickOrder =
    theme.id === "khemet-luxe-eg" || configuredFormVariant === "khemet-luxe-eg";
  const isVelaFashionQuickOrder =
    theme.id === "vela-fashion-eg" || configuredFormVariant === "vela-fashion-eg";
  const isMergedBuyboxSurface = configuredSurfaceMode === "merged-buybox";
  const isKhemetMergedBuyboxQuickOrder =
    isKhemetLuxeQuickOrder && isMergedBuyboxSurface;
  const isPrimaryQuantityOfferDecision = configuredDecisionMode === "primary";
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    "EGP";
  const companyId = storefrontSettings?.company?.id || getCompanyId();
  const marketplacePreviewThemeId = resolvePreviewThemeId();
  const pdpQuickOrderSettings = getPdpQuickOrderSettingsFromDesignTokens(
    storefrontSettings?.storefrontSettings?.designTokens,
  );

  const activeSelection =
    selection && selection.productId === product.id ? selection : null;
  const activeQuantityOffer =
    quantityOfferSelection && quantityOfferSelection.productId === product.id
      ? quantityOfferSelection
      : null;
  const activeUnitPrice = activeSelection?.unitPrice ?? product.price;
  const activeAttributes = useMemo(
    () => activeSelection?.attributes || {},
    [activeSelection?.attributes],
  );
  const attributeSummary = useMemo(
    () =>
      Object.entries(activeAttributes || {})
        .filter(([, value]) => typeof value === "string" && value.trim())
        .map(
          ([key, value]) =>
            `${translateAttributeKey(key, prefersArabicCopy)}: ${value}`,
        )
        .join(" - "),
    [activeAttributes, prefersArabicCopy],
  );
  const activeDiscounts = useMemo(
    () =>
      Array.isArray(activeSelection?.volumeDiscounts)
        ? (activeSelection.volumeDiscounts as VolumeDiscountTier[])
        : [],
    [activeSelection?.volumeDiscounts],
  );
  const pricing = useMemo(
    () =>
      calculateVolumeDiscountPricing({
        unitPrice: activeUnitPrice,
        quantity,
        discounts: activeDiscounts,
      }),
    [activeDiscounts, activeUnitPrice, quantity],
  );

  const [alternatePhone, setAlternatePhone] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingMethodLabel, setShippingMethodLabel] = useState("");
  const [isShippingLoading, setIsShippingLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isStickySubmitVisible, setIsStickySubmitVisible] = useState(false);
  const trackedCheckoutFingerprintRef = useRef("");

  const fullNameField = pdpQuickOrderSettings.fields.fullName;
  const phoneField = pdpQuickOrderSettings.fields.phone;
  const governorateField = pdpQuickOrderSettings.fields.governorate;
  const addressField = pdpQuickOrderSettings.fields.address;
  const alternatePhoneField = pdpQuickOrderSettings.fields.alternatePhone;
  const fullNameOverride = isRecord(fieldOverrideMap.fullName)
    ? fieldOverrideMap.fullName
    : {};
  const phoneOverride = isRecord(fieldOverrideMap.phone)
    ? fieldOverrideMap.phone
    : {};
  const governorateOverride = isRecord(fieldOverrideMap.governorate)
    ? fieldOverrideMap.governorate
    : {};
  const addressOverride = isRecord(fieldOverrideMap.address)
    ? fieldOverrideMap.address
    : {};
  const alternatePhoneOverride = isRecord(fieldOverrideMap.alternatePhone)
    ? fieldOverrideMap.alternatePhone
    : {};
  const effectiveFullNameField = {
    enabled:
      typeof fullNameOverride.enabled === "boolean"
        ? fullNameOverride.enabled
        : fullNameField.enabled,
    required:
      typeof fullNameOverride.required === "boolean"
        ? fullNameOverride.required
        : fullNameField.required,
  };
  const effectivePhoneField = {
    enabled:
      typeof phoneOverride.enabled === "boolean"
        ? phoneOverride.enabled
        : phoneField.enabled,
    required:
      typeof phoneOverride.required === "boolean"
        ? phoneOverride.required
        : phoneField.required,
  };
  const effectiveGovernorateField = {
    enabled:
      typeof governorateOverride.enabled === "boolean"
        ? governorateOverride.enabled
        : governorateField.enabled,
    required:
      typeof governorateOverride.required === "boolean"
        ? governorateOverride.required
        : governorateField.required,
  };
  const effectiveAddressField = {
    enabled:
      typeof addressOverride.enabled === "boolean"
        ? addressOverride.enabled
        : addressField.enabled,
    required:
      typeof addressOverride.required === "boolean"
        ? addressOverride.required
        : addressField.required,
  };
  const effectiveAlternatePhoneField = {
    enabled:
      typeof alternatePhoneOverride.enabled === "boolean"
        ? alternatePhoneOverride.enabled
        : isMenShoesQuickOrder
          ? false
          : isKhemetLuxeQuickOrder
            ? false
          : isVelaFashionQuickOrder
              ? false
            : alternatePhoneField.enabled,
    required:
      typeof alternatePhoneOverride.required === "boolean"
        ? alternatePhoneOverride.required
        : alternatePhoneField.required,
  };
  const showQuantityBlock =
    typeof sectionSettings?.showQuantity === "boolean"
      ? sectionSettings.showQuantity
      : isVelaFashionQuickOrder
          ? false
        : isKhemetLuxeQuickOrder
          ? false
        : isMenShoesQuickOrder
          ? false
        : pdpQuickOrderSettings.showQuantity;
  const showOrderSummaryBlock =
    typeof sectionSettings?.showOrderSummary === "boolean"
      ? sectionSettings.showOrderSummary
      : pdpQuickOrderSettings.showOrderSummary;

  const resolvedGovernorate = effectiveGovernorateField.enabled
    ? formData.governorate?.trim() || ""
    : "";
  const resolvedAddress = effectiveAddressField.enabled
    ? formData.address?.trim() || ""
    : "";
  const resolvedFullName = effectiveFullNameField.enabled
    ? formData.customerName?.trim() || ""
    : "";
  const resolvedPhone = effectivePhoneField.enabled
    ? formData.phone?.trim() || ""
    : "";
  const resolvedAlternatePhone = effectiveAlternatePhoneField.enabled
    ? alternatePhone.trim()
    : "";
  const contactPhone = resolvedPhone || resolvedAlternatePhone;
  const fallbackCustomerName = prefersArabicCopy
    ? "عميل صفحة المنتج"
    : "Product page customer";
  const requiresVariantSelection =
    product.hasVariants && Boolean(activeSelection?.requiresVariantSelection);
  const isSelectionReady =
    activeQuantityOffer
      ? Boolean(activeQuantityOffer.isReady)
      : !requiresVariantSelection || Boolean(activeSelection?.isSelectionReady);
  const resolvedSubtotal =
    activeQuantityOffer?.offerTotal ?? pricing.lineSubtotal;
  const total = resolvedSubtotal + shippingCost;
  const minimumOrder = useMinimumOrderSettings(resolvedSubtotal, currency);
  const shippingQuoteItems = useMemo(
    () => [
      {
        productId: product.id,
        variantId: activeSelection?.variantId ?? undefined,
        quantity: activeQuantityOffer?.offerQuantity ?? quantity,
      },
    ],
    [
      activeQuantityOffer?.offerQuantity,
      activeSelection?.variantId,
      product.id,
      quantity,
    ],
  );

  const trackingItem = useMemo<CartItem | null>(() => {
    if (activeQuantityOffer) {
      return null;
    }

    if (!isSelectionReady) {
      return null;
    }

    return {
      id:
        activeSelection?.variantId
          ? `${product.id}-${activeSelection.variantId}`
          : `${product.id}-${JSON.stringify(activeAttributes)}`,
      productId: product.id,
      variantId: activeSelection?.variantId ?? null,
      name: product.name,
      price: activeUnitPrice,
      basePrice: activeSelection?.basePrice ?? activeUnitPrice,
      quantity,
      imageUrl: activeSelection?.imageUrl || product.imageUrl,
      attributes: activeAttributes,
      volumeDiscounts: activeDiscounts,
    };
  }, [
    activeAttributes,
    activeDiscounts,
    activeQuantityOffer,
    activeSelection?.basePrice,
    activeSelection?.imageUrl,
    activeSelection?.variantId,
    activeUnitPrice,
    isSelectionReady,
    product.id,
    product.imageUrl,
    product.name,
    quantity,
  ]);

  const quickOrderFingerprint = useMemo(() => {
    if (activeQuantityOffer) {
      return [
        product.id,
        activeQuantityOffer.offerId,
        activeQuantityOffer.offerQuantity,
        activeQuantityOffer.offerTotal,
        JSON.stringify(activeQuantityOffer.selections || []),
      ].join(":");
    }

    if (!trackingItem) {
      return "";
    }

    return [
      trackingItem.productId,
      trackingItem.variantId || "base",
      trackingItem.quantity,
      trackingItem.price,
    ].join(":");
  }, [activeQuantityOffer, product.id, trackingItem]);

  useEffect(() => {
    if (!showQuantityBlock && quantity !== 1) {
      setQuantity(1);
    }
  }, [showQuantityBlock, quantity, setQuantity]);

  useEffect(() => {
    let cancelled = false;

    const loadShipping = async () => {
      if (!effectiveGovernorateField.enabled || !resolvedGovernorate || !companyId) {
        setShippingCost(0);
        setShippingMethodLabel("");
        setIsShippingLoading(false);
        return;
      }

      try {
        setIsShippingLoading(true);
        const response = await storefrontApi.calculateShipping(
          resolvedGovernorate,
          companyId,
          shippingQuoteItems,
        );

        if (!cancelled) {
          setShippingCost(Number(response?.data?.price) || 0);
          const primaryMethod = Array.isArray(response?.data?.methods)
            ? response.data.methods[0]
            : null;
          setShippingMethodLabel(
            String(
              primaryMethod?.title ||
                primaryMethod?.label ||
                primaryMethod?.name ||
                "",
            ).trim(),
          );
        }
      } catch {
        if (!cancelled) {
          setShippingCost(0);
          setShippingMethodLabel("");
        }
      } finally {
        if (!cancelled) {
          setIsShippingLoading(false);
        }
      }
    };

    void loadShipping();

    return () => {
      cancelled = true;
    };
  }, [
    companyId,
    effectiveGovernorateField.enabled,
    resolvedGovernorate,
    shippingQuoteItems,
  ]);

  useEffect(() => {
    if (
      !effectiveGovernorateField.enabled ||
      isShippingLoading ||
      !resolvedGovernorate ||
      !quickOrderFingerprint
    ) {
      return;
    }

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: "pdp_quick_order_shipping_quote",
      dedupeKey: `pdp-quick-order-shipping:${product.id}:${resolvedGovernorate}:${quickOrderFingerprint}`,
        metadata: {
          productId: product.id,
          governorate: resolvedGovernorate,
          shippingCost,
          subtotal: resolvedSubtotal,
        },
      });
  }, [
    effectiveGovernorateField.enabled,
    isShippingLoading,
    product.id,
    quickOrderFingerprint,
    resolvedGovernorate,
    resolvedSubtotal,
    shippingCost,
    storefrontSettings,
  ]);

  const handleFieldChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    updateFormData({ [name]: value });
  };

  const buildQuickOrderCartItemsForSubmit = (): CartItem[] | null => {
    if (activeQuantityOffer) {
      const builtOfferItems = buildQuantityOfferCartItems({
        product,
        quantityOfferSelection: activeQuantityOffer,
      });

      if (!builtOfferItems?.items?.length) {
        toast.error(
          prefersArabicCopy
            ? "أكمل اختيار كل قطعة داخل العرض أولًا."
            : "Complete the offer selection first.",
        );
        return null;
      }

      return builtOfferItems.items;
    }

    if (!trackingItem) {
      toast.error(
        prefersArabicCopy
          ? "اختر اللون أو المقاس من خيارات المنتج بالأعلى أولًا."
          : "Choose the color or size from the product options above first.",
      );
      return null;
    }

    return [trackingItem];
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!isSelectionReady) {
      errors.push(
        activeQuantityOffer
          ? prefersArabicCopy
            ? "يرجى استكمال اختيار كل قطعة داخل العرض أولًا."
            : "Please complete each item selection inside the offer first."
          : prefersArabicCopy
            ? "يرجى اختيار اللون أو المقاس من خيارات المنتج بالأعلى أولًا."
            : "Please choose the color or size from the product options above first.",
      );
    }

    if (
      effectiveFullNameField.enabled &&
      effectiveFullNameField.required &&
      !resolvedFullName
    ) {
      errors.push(
        prefersArabicCopy
          ? "يرجى إدخال الاسم بالكامل."
          : "Please enter the full name.",
      );
    }

    if (effectivePhoneField.enabled && effectivePhoneField.required && !resolvedPhone) {
      errors.push(
        prefersArabicCopy
          ? "يرجى إدخال رقم الهاتف."
          : "Please enter the phone number.",
      );
    }

    if (
      effectivePhoneField.enabled &&
      resolvedPhone &&
      !isValidEgyptianPhone(resolvedPhone)
    ) {
      errors.push(
        prefersArabicCopy
          ? "رقم الهاتف يجب أن يكون رقم موبايل مصري صحيحًا."
          : "Phone number must be a valid Egyptian mobile number.",
      );
    }

    if (
      effectiveAlternatePhoneField.enabled &&
      effectiveAlternatePhoneField.required &&
      !contactPhone
    ) {
      errors.push(
        prefersArabicCopy
          ? "يرجى إدخال رقم هاتف صالح للتواصل."
          : "Please provide a valid contact phone number.",
      );
    }

    if (
      effectiveAlternatePhoneField.enabled &&
      resolvedAlternatePhone &&
      !isValidEgyptianPhone(resolvedAlternatePhone)
    ) {
      errors.push(
        prefersArabicCopy
          ? "رقم الهاتف البديل غير صحيح."
          : "Alternate phone number is invalid.",
      );
    }

    if (
      effectiveGovernorateField.enabled &&
      effectiveGovernorateField.required &&
      !resolvedGovernorate
    ) {
      errors.push(
        prefersArabicCopy
          ? "يرجى اختيار المحافظة."
          : "Please select a governorate.",
      );
    }

    if (
      effectiveAddressField.enabled &&
      effectiveAddressField.required &&
      !resolvedAddress
    ) {
      errors.push(
        prefersArabicCopy
          ? "يرجى إدخال العنوان بالتفصيل."
          : "Please enter the detailed address.",
      );
    }

    if (minimumOrder.blocked) {
      errors.push(minimumOrder.message);
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      if (minimumOrder.blocked) {
        toast.error(minimumOrder.message);
      }
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      const quickOrderItems = buildQuickOrderCartItemsForSubmit();
      if (!quickOrderItems?.length) {
        setIsSubmitting(false);
        return;
      }
      const totalQuantity = quickOrderItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0,
      );
      const checkoutItems = quickOrderItems.map((item) => ({
        id: item.productId,
        quantity: item.quantity,
        price: item.price,
      }));

      if (
        quickOrderFingerprint &&
        trackedCheckoutFingerprintRef.current !== quickOrderFingerprint
      ) {
        const eventId = trackInitiateCheckoutEvent({
          items: checkoutItems,
          total: resolvedSubtotal,
        });

        if (eventId !== undefined) {
          trackedCheckoutFingerprintRef.current = quickOrderFingerprint;
        }
      }

      const pixelEventId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const payload = buildCheckoutOrderPayload(
        {
          customerName: resolvedFullName || fallbackCustomerName,
          email: "",
          phone: contactPhone,
          address: resolvedAddress,
          city: resolvedGovernorate,
          governorate: resolvedGovernorate,
          notes: buildQuickOrderNote({
            alternatePhone:
              effectiveAlternatePhoneField.enabled && resolvedAlternatePhone
                ? resolvedAlternatePhone
                : "",
            attributeSummary,
            quantityOfferLabel: activeQuantityOffer?.offerLabel || "",
          }),
          paymentMethod: "cod",
          shippingCost,
          subtotal: resolvedSubtotal,
          total,
        },
        quickOrderItems,
        resolvedSubtotal,
        companyId,
        pixelEventId,
      );

      const previewResponse = marketplacePreviewThemeId
        ? (
            await import("../preview/marketplacePreviewOrder")
          ).createMarketplacePreviewOrderResponse(
              {
                guestName: resolvedFullName || fallbackCustomerName,
                guestEmail: "",
                guestPhone: contactPhone,
                paymentMethod: "cod",
                notes: payload.notes,
                shippingAddress: {
                  governorate: resolvedGovernorate || undefined,
                  city: resolvedGovernorate || undefined,
                  street: resolvedAddress || undefined,
                  address: resolvedAddress || undefined,
                  addressLine1: resolvedAddress || undefined,
                },
                items: quickOrderItems.map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId || undefined,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                  image: item.imageUrl,
                  productImage: item.imageUrl,
                  attributes: item.attributes || {},
                  quantityOffer: item.quantityOffer || undefined,
                })),
                subtotal: resolvedSubtotal,
                shippingCost,
                total,
              },
              marketplacePreviewThemeId,
            )
        : null;
      const response = previewResponse
        ? (previewResponse as PublicOrderResponse)
        : ((await storefrontApi.createOrder(payload)) as PublicOrderResponse);
      if (!response?.success) {
        throw new Error(
          response?.message ||
            response?.error ||
            (prefersArabicCopy
              ? "تعذر إرسال الطلب الآن."
              : "Could not submit the order right now."),
        );
      }

      const resolvedOrderId =
        response.data?.orderNumber || response.data?.id || "success";
      const resolvedOrderTotal = Number(
        response.data?.finalTotal ?? response.data?.total ?? total,
      );
      const thankYouPath = buildStorefrontPath(
        location.pathname,
        `/thank-you?orderId=${encodeURIComponent(String(resolvedOrderId))}`,
        location.search,
      );

      void trackConversionSuiteUsage(storefrontSettings, {
        feature: "pdp_quick_order_submit",
        metadata: {
          productId: product.id,
          offerId: activeQuantityOffer?.offerId,
          quantity: totalQuantity,
          subtotal: resolvedSubtotal,
          total: resolvedOrderTotal,
        },
      });

      resetCheckout();
      setAlternatePhone("");
      setQuantity(1);
      toast.success(
        prefersArabicCopy
          ? "تم إرسال الطلب بنجاح."
          : "Order submitted successfully.",
      );
      const purchaseTracking = {
        eventId: pixelEventId,
        orderNumber: String(resolvedOrderId),
        total: resolvedOrderTotal,
        phone: contactPhone,
        customerName: resolvedFullName || fallbackCustomerName,
        paymentMethod: "cod",
        items: [
          ...quickOrderItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId || undefined,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            imageUrl: item.imageUrl,
            attributes: item.attributes || {},
            quantityOffer: item.quantityOffer || undefined,
          })),
        ],
      };
      persistPurchaseTracking(purchaseTracking);

      if (typeof window !== "undefined") {
        window.location.assign(thankYouPath);
        return;
      }

      navigate(thankYouPath, {
        state: {
          purchaseTracking,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : prefersArabicCopy
            ? "حدث خطأ أثناء إرسال الطلب."
            : "An error occurred while submitting the order.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    const quickOrderItems = buildQuickOrderCartItemsForSubmit();
    if (!quickOrderItems?.length) {
      return;
    }

    quickOrderItems.forEach((item, index) => {
      addItem(item, { openCart: index === quickOrderItems.length - 1 });
    });
    const totalQuantity = quickOrderItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
    trackAddToCartEvent({
      id: product.id,
      name: product.name,
      price: resolvedSubtotal,
      quantity: totalQuantity,
    });
    void trackConversionSuiteUsage(storefrontSettings, {
      feature: "pdp_quick_order_add_to_cart",
      metadata: {
        productId: product.id,
        offerId: activeQuantityOffer?.offerId,
        quantity: totalQuantity,
        subtotal: resolvedSubtotal,
      },
    });
    toast.success(
      activeQuantityOffer
        ? prefersArabicCopy
          ? "تمت إضافة العرض إلى السلة."
          : "Offer added to cart."
        : prefersArabicCopy
          ? "تمت إضافة المنتج إلى السلة."
          : "Product added to cart.",
    );
  };

  const title =
    isKhemetMergedBuyboxQuickOrder
      ? prefersArabicCopy
        ? "بيانات الطلب"
        : "Order details"
      : configuredTitle ||
    (isSoleaFemmeQuickOrder
      ? prefersArabicCopy
        ? "احسمي الطلب من هنا"
        : "Complete your order here"
      : isKhemetLuxeQuickOrder
      ? prefersArabicCopy
        ? "كمّلي بيانات الطلب"
        : "Complete your order"
      : isMenShoesQuickOrder
      ? prefersArabicCopy
        ? "بيانات الطلب"
        : "Order details"
      : isVelaFashionQuickOrder
        ? prefersArabicCopy
          ? "أكملي الطلب الآن"
          : "Complete your order now"
      : prefersArabicCopy
        ? "يرجى إدخال معلوماتك لإكمال الطلب"
        : "Please enter your details to complete the order");
  const subtitle =
    isKhemetMergedBuyboxQuickOrder
      ? ""
      : configuredSubtitle ||
    (isSoleaFemmeQuickOrder
      ? prefersArabicCopy
        ? "بعد اختيار المقاس أو العرض، اتركي بياناتك وسنؤكد الطلب معك بسرعة."
        : "Choose the size or offer, then leave your details and we will confirm the order."
      : isKhemetLuxeQuickOrder
      ? prefersArabicCopy
        ? "اختاري اللون والمقاس الأول، وبعدها سيبي بياناتك وسنأكد معاكي الطلب."
        : "Choose the color and size first, then leave your details and we will confirm the order."
      : isMenShoesQuickOrder
      ? ""
      : "");
  const quantityLabel = isVelaFashionQuickOrder
      ? prefersArabicCopy
        ? "الكمية"
        : "Quantity"
    : prefersArabicCopy
      ? "عدد القطع"
      : "Quantity";
  const fullNameLabel = isMenShoesQuickOrder || isVelaFashionQuickOrder || isKhemetLuxeQuickOrder
    ? prefersArabicCopy
      ? "الاسم"
      : "Name"
    : prefersArabicCopy
      ? "الاسم بالكامل"
      : "Full name";
  const phoneLabel = prefersArabicCopy ? "رقم الهاتف" : "Phone number";
  const governorateLabel = prefersArabicCopy ? "المحافظة" : "Governorate";
  const addressLabel = isMenShoesQuickOrder || isKhemetLuxeQuickOrder
    ? prefersArabicCopy
      ? "العنوان"
      : "Address"
    : prefersArabicCopy
      ? "العنوان بالتفصيل"
      : "Detailed address";
  const alternatePhoneLabel = prefersArabicCopy
    ? "رقم هاتف بديل"
    : "Alternate phone";
  const shippingLabel = prefersArabicCopy ? "تكلفة الشحن" : "Shipping";
  const totalLabel = prefersArabicCopy ? "الإجمالي" : "Total";
  const shippingMethodSummaryLabel = shippingMethodLabel
    ? prefersArabicCopy
      ? `طريقة الشحن: ${shippingMethodLabel}`
      : `Shipping method: ${shippingMethodLabel}`
    : "";
  const addToCartLabel =
    configuredAddToCartButtonText ||
    (isSoleaFemmeQuickOrder && prefersArabicCopy
      ? "أضيفي للسلة"
      : prefersArabicCopy
        ? "أضف للسلة"
        : "Add to cart");
  const submitLabel =
    configuredSubmitButtonText ||
    (isSoleaFemmeQuickOrder && prefersArabicCopy
      ? "تأكيد الطلب"
      : isKhemetLuxeQuickOrder && prefersArabicCopy
        ? "تأكيد الطلب"
      : prefersArabicCopy
        ? "اشتر الآن"
        : "Buy now");
  const minimumOrderSubmitLabel = minimumOrder.blocked
    ? `${prefersArabicCopy ? "متبقي" : "Remaining"} ${formatStorefrontCurrency(
        minimumOrder.remaining,
        currency,
      )}`
    : submitLabel;
  const showAddToCartButton =
    configuredShowAddToCartButton === null
      ? !isPrimaryQuantityOfferDecision
      : configuredShowAddToCartButton;
  const staticShippingValueText =
    configuredShippingSummaryValueText ||
    (prefersArabicCopy ? "شحن مجاني" : "Free shipping");
  const selectionHint = !isSelectionReady
    ? activeQuantityOffer
        ? prefersArabicCopy
          ? isSoleaFemmeQuickOrder
            ? "اختاري العرض وحددي اللون أو المقاس لكل قطعة أولًا، ثم أكملي بيانات الطلب هنا."
            : "أكمل اختيار اللون والمقاس لكل قطعة داخل العرض أولًا، ثم أكمل الطلب هنا."
          : "Complete the color and size selection for each item inside the offer first, then continue here."
        : configuredEmptyStateText ||
          (prefersArabicCopy
            ? isSoleaFemmeQuickOrder
                ? "اختاري المقاس أو اللون من أعلى أولًا، ثم أكملي الطلب من هنا."
                : isKhemetLuxeQuickOrder
                  ? "اختاري اللون والمقاس الأول، وبعدها كمّلي بيانات الطلب من هنا."
                : isVelaFashionQuickOrder
                  ? "اختاري اللون أو المقاس من أعلى، ثم أكملي الطلب من هنا."
                  : "اختر اللون أو المقاس من خيارات المنتج بالأعلى أولًا، ثم أكمل الطلب هنا."
            : "Choose the color or size from the product options above first, then complete the form here.")
      : null;
  const shouldCollapseFormUntilSelectionReady =
    isPrimaryQuantityOfferDecision && !isSelectionReady;
  const isWomenMergedBuyboxQuickOrder =
    isWomenFashionQuickOrder && isMergedBuyboxSurface;
  const isSoleaMergedBuyboxQuickOrder =
    isSoleaFemmeQuickOrder && isMergedBuyboxSurface;
  const isCompactMergedQuickOrder =
    isWomenMergedBuyboxQuickOrder || isKhemetMergedBuyboxQuickOrder;
  const showAttributeSummary =
    Boolean(attributeSummary) &&
    !isMenShoesQuickOrder &&
    !isVelaFashionQuickOrder &&
    !isKhemetLuxeQuickOrder;
  const quantityOfferSummaryTitle = prefersArabicCopy
    ? "العرض المحدد الآن"
    : "Current quantity offer";
  const quantityOfferSummaryHelper = prefersArabicCopy
    ? activeQuantityOffer?.isReady
      ? "سيُنفذ الطلب مباشرة على هذا العرض."
      : "أكملي اختيار كل قطعة ثم أدخلي بياناتك."
    : activeQuantityOffer?.isReady
      ? "This order will use the selected offer directly."
      : "Complete each bundle selection, then add your details.";
  const shouldShowQuantityOfferSummaryHelper =
    Boolean(activeQuantityOffer) && !activeQuantityOffer?.isReady;
  const shouldEnableMobileStickySubmitBar =
    (isWomenMergedBuyboxQuickOrder || isSoleaMergedBuyboxQuickOrder) &&
    !shouldCollapseFormUntilSelectionReady;
  const shouldShowMobileStickySubmitBar =
    shouldEnableMobileStickySubmitBar && isStickySubmitVisible;
  const shellClassName = isSoleaFemmeQuickOrder
    ? isSoleaMergedBuyboxQuickOrder
      ? "border-t border-[#ead8cf] pt-3.5"
      : "rounded-[1.6rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdf9_0%,#fff8f3_100%)] p-4 shadow-[0_24px_60px_-52px_rgba(47,35,45,0.2)] sm:p-5"
    : isKhemetLuxeQuickOrder
    ? isKhemetMergedBuyboxQuickOrder
      ? "pt-0"
      : "rounded-[1.6rem] border border-[#eadfd9] bg-[#fffdfb] p-4 shadow-[0_24px_64px_-56px_rgba(54,36,27,0.16)] sm:p-5"
    : isMenShoesQuickOrder
    ? isWomenMergedBuyboxQuickOrder
      ? "border-t border-[#f0d7d2] pt-3"
      : isMergedBuyboxSurface
      ? "border-t border-[#e5eadf] pt-4"
      : "rounded-[1.55rem] border border-[#d8dfd2] bg-white/95 p-4 shadow-[0_20px_56px_-52px_rgba(17,24,39,0.18)]"
    : isVelaFashionQuickOrder
      ? "rounded-[1.45rem] border border-[#efd9df] bg-[linear-gradient(180deg,#fffefe_0%,#fff7f9_100%)] p-4 shadow-[0_20px_60px_-52px_rgba(176,125,139,0.18)] sm:p-5"
    : "rounded-[1.85rem] border border-border/70 bg-background p-5 shadow-[0_34px_100px_-78px_rgba(15,23,42,0.38)] sm:p-6";
  const quantitySurfaceClassName = isSoleaFemmeQuickOrder
    ? "flex items-center justify-between gap-3 rounded-[1rem] border border-[#ead8cf] bg-[#fffaf5] px-3 py-2.5"
    : isKhemetMergedBuyboxQuickOrder
    ? "hidden items-center justify-between gap-3 rounded-[1rem] border border-[#eadfd9] bg-[#fffaf6] px-3 py-2.5 sm:flex"
    : isKhemetLuxeQuickOrder
    ? "flex items-center justify-between gap-3 rounded-[1rem] border border-[#eadfd9] bg-[#fffaf6] px-3 py-2.5"
    : isMenShoesQuickOrder
    ? "flex items-center justify-between gap-3 rounded-[1rem] border border-[#e5eadf] bg-[#fbfcfa] px-3 py-2.5"
    : isVelaFashionQuickOrder
      ? "flex items-center justify-between gap-3 rounded-[1rem] border border-[#efd9df] bg-white px-4 py-3"
    : "flex items-start justify-between gap-4 rounded-[1.15rem] border border-border/70 bg-secondary/15 px-4 py-4";
  const addToCartButtonClassName = isSoleaFemmeQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] border border-[#d8b28a] bg-white px-4 text-sm font-black text-[#6f5448] transition hover:border-[#2f232d]/20 hover:bg-[#fff8f1]"
    : isKhemetLuxeQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] border border-[#d7c5b8] bg-white px-4 text-sm font-black text-[#4a352e] transition hover:border-[#1f4c3b]/15 hover:bg-[#fffaf6]"
    : isMenShoesQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] border border-[#d8dfd2] bg-white px-4 text-sm font-black text-[#111111] transition hover:border-[#111111]/20 hover:bg-[#f6f7f4]"
    : isVelaFashionQuickOrder
      ? "min-h-[3.4rem] rounded-[1rem] border border-[#d7b4bf] bg-white px-4 text-sm font-black text-[#7a5260] transition hover:bg-[#fff7fa]"
    : "min-h-[3.65rem] rounded-[1.05rem] border border-border bg-background px-4 text-sm font-black text-foreground transition hover:border-primary/30 hover:text-primary";
  const submitButtonClassName = isSoleaFemmeQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] bg-[#2f232d] px-4 text-sm font-black text-white transition hover:bg-[#241a22] disabled:cursor-not-allowed disabled:opacity-60"
    : isKhemetLuxeQuickOrder
    ? "min-h-[3.5rem] rounded-[1rem] bg-[#1f4c3b] px-4 text-sm font-black text-[#fbf5ee] transition hover:bg-[#173a2d] disabled:cursor-not-allowed disabled:opacity-60"
    : isMenShoesQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] bg-[#111111] px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    : isVelaFashionQuickOrder
      ? "min-h-[3.4rem] rounded-[1rem] border border-[#7a5260] bg-[#7a5260] px-4 text-sm font-black text-white transition hover:bg-[#946777] disabled:cursor-not-allowed disabled:opacity-60"
    : "min-h-[3.65rem] rounded-[1.05rem] bg-black px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
  const resolvedInputClassName = isSoleaMergedBuyboxQuickOrder
      ? "w-full rounded-[0.95rem] border border-[#ead8cf] bg-white px-3.5 py-2.5 text-sm text-[#3f2432] outline-none transition focus:border-[#d8b28a] focus:ring-2 focus:ring-[#d8b28a]/15"
    : isKhemetMergedBuyboxQuickOrder
      ? "w-full rounded-[0.95rem] border border-[#eadfd9] bg-white px-3.5 py-2.5 text-sm text-[#4a352e] outline-none transition focus:border-[#1f4c3b]/18 focus:ring-2 focus:ring-[#1f4c3b]/10"
    : isVelaFashionQuickOrder
      ? "w-full rounded-[1rem] border border-[#efd9df] bg-white px-4 py-3 text-sm font-medium text-[#5f3f48] outline-none transition focus:border-[#b07d8b] focus:ring-2 focus:ring-[#b07d8b]/12"
    : isWomenMergedBuyboxQuickOrder
      ? "w-full rounded-[0.95rem] border border-[#ead8cf] bg-white px-3.5 py-2.5 text-sm text-[#3f2432] outline-none transition focus:border-[#8b3d33]/35 focus:ring-2 focus:ring-[#8b3d33]/10"
    : inputClassName;
  const shouldShowQuantityOfferSummary =
    Boolean(activeQuantityOffer) &&
    !(isVelaFashionQuickOrder && activeQuantityOffer?.offerQuantity === 1);
  const fieldStackClassName = isWomenMergedBuyboxQuickOrder
    ? "block space-y-1.5"
    : isKhemetMergedBuyboxQuickOrder
      ? "block space-y-1.5"
    : "block space-y-2";
  const fieldLabelClassName = isWomenMergedBuyboxQuickOrder || isKhemetMergedBuyboxQuickOrder
    ? "text-[13px] font-semibold text-foreground"
    : "text-sm font-semibold text-foreground";
  const contactFieldsGridClassName = isKhemetMergedBuyboxQuickOrder
    ? "grid gap-3"
    : isCompactMergedQuickOrder
      ? "grid grid-cols-2 gap-2.5"
      : "space-y-4";
  const shouldRenderInlineTotalRow = !shouldShowMobileStickySubmitBar;
  const shouldShowInlineSubmitButton = !shouldShowMobileStickySubmitBar;
  const shouldRenderActionArea = showAddToCartButton || shouldShowInlineSubmitButton;

  useEffect(() => {
    if (!shouldEnableMobileStickySubmitBar) {
      setIsStickySubmitVisible(false);
      return;
    }

    const updateStickySubmitVisibility = () => {
      setIsStickySubmitVisible(window.scrollY > 360);
    };

    updateStickySubmitVisibility();
    window.addEventListener("scroll", updateStickySubmitVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", updateStickySubmitVisibility);
    };
  }, [shouldEnableMobileStickySubmitBar]);

  return (
    <div className={shellClassName}>
      <div
        className={`mx-auto max-w-3xl ${
          isMenShoesQuickOrder || isCompactMergedQuickOrder
            ? isCompactMergedQuickOrder
              ? "space-y-3"
              : "space-y-4"
            : "space-y-5"
        }`}
      >
        <div className={isCompactMergedQuickOrder ? "space-y-1.5" : "space-y-2"}>
          {configuredBadgeText && !isMergedBuyboxSurface ? (
            <span className="inline-flex items-center rounded-full border border-[#ead9c7] bg-[#fff8f1] px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#b45309]">
              {configuredBadgeText}
            </span>
          ) : null}
          {title ? (
            <h2
              className={`font-heading font-black text-foreground ${
                isCompactMergedQuickOrder
                  ? "text-[15px] sm:text-base"
                  : isMergedBuyboxSurface
                    ? "text-base sm:text-lg"
                    : isMenShoesQuickOrder
                      ? "text-xl sm:text-[1.7rem]"
                      : "text-2xl sm:text-[2rem]"
              }`}
            >
              {title}
            </h2>
          ) : null}
          {subtitle ? (
            <p
              className={
                isCompactMergedQuickOrder
                  ? "text-[12px] leading-5 text-muted-foreground"
                  : "text-sm leading-7 text-muted-foreground"
              }
            >
              {subtitle}
            </p>
          ) : null}
          {showAttributeSummary ? (
            <p
              className={
                isCompactMergedQuickOrder
                  ? "text-[12px] leading-5 text-muted-foreground"
                  : "text-sm leading-7 text-muted-foreground"
              }
            >
              {attributeSummary}
            </p>
          ) : null}
          {selectionHint ? (
            <div
              className={`border border-amber-200 bg-amber-50 font-medium text-amber-800 ${
                isCompactMergedQuickOrder
                  ? "rounded-[0.95rem] px-3 py-2.5 text-[12px] leading-5"
                  : "rounded-[1rem] px-4 py-3 text-sm"
              }`}
            >
              {selectionHint}
            </div>
          ) : null}
          {shouldShowQuantityOfferSummary ? (
            <div
                className={
                  isWomenFashionQuickOrder
                    ? `space-y-1.5 border-b border-[#eadcc7] pb-2.5 ${
                        isMergedBuyboxSurface ? "" : ""
                      }`
                  : isSoleaFemmeQuickOrder
                    ? "space-y-2 border-b border-[#ead8cf] pb-3"
                  : `rounded-[1rem] border border-[#eadcc7] bg-[#fff9f2] px-3 py-3 ${
                      isMergedBuyboxSurface ? "space-y-2" : "space-y-2.5"
                    }`
              }
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-black text-[#8a4b14]">
                  {quantityOfferSummaryTitle}
                </span>
                <span
                    className={`px-2.5 py-1 text-[11px] font-black text-[#8a4b14] ${
                      isWomenFashionQuickOrder
                        ? "rounded-full border border-[#eadcc7] bg-transparent"
                        : isSoleaFemmeQuickOrder
                          ? "rounded-full border border-[#ead8cf] bg-[#fff6ee] text-[#6f5448]"
                        : "rounded-full bg-white"
                    }`}
                >
                  {prefersArabicCopy
                    ? activeQuantityOffer.offerQuantity === 1
                      ? "قطعة واحدة"
                      : activeQuantityOffer.offerQuantity === 2
                        ? "قطعتان"
                        : `${activeQuantityOffer.offerQuantity} قطع`
                    : `${activeQuantityOffer.offerQuantity} items`}
                </span>
                {activeQuantityOffer.savings > 0 && !isWomenFashionQuickOrder ? (
                  <span
                    className={`px-2.5 py-1 text-[11px] font-black text-emerald-700 ${
                      isWomenFashionQuickOrder
                        ? "rounded-full border border-emerald-200 bg-transparent"
                        : "rounded-full bg-emerald-500/10"
                    }`}
                  >
                    {prefersArabicCopy
                      ? `وفر ${formatStorefrontCurrency(
                          activeQuantityOffer.savings,
                          currency,
                        )}`
                      : `Save ${formatStorefrontCurrency(
                          activeQuantityOffer.savings,
                          currency,
                        )}`}
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-semibold leading-6 text-foreground">
                {activeQuantityOffer.offerLabel}
              </p>
              {shouldShowQuantityOfferSummaryHelper ? (
                <p className="text-[12px] leading-5 text-muted-foreground">
                  {quantityOfferSummaryHelper}
                </p>
              ) : null}
            </div>
          ) : null}
          {validationErrors.length > 0 ? (
            <div
              className={`rounded-[1rem] border border-red-200 bg-red-50 text-red-700 ${
                isCompactMergedQuickOrder
                  ? "px-3.5 py-2.5 text-[13px]"
                  : "px-4 py-3 text-sm"
              }`}
            >
              <ul className="space-y-1">
                {validationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {!shouldCollapseFormUntilSelectionReady ? (
          <>
            {showQuantityBlock ? (
              <div className={quantitySurfaceClassName}>
                <div>
                  <p className="text-sm font-semibold text-foreground">{quantityLabel}</p>
                </div>
                <QuantitySelector value={quantity} onChange={setQuantity} />
              </div>
            ) : null}

            <div
              className={
                isCompactMergedQuickOrder
                  ? "space-y-3"
                  : isMenShoesQuickOrder
                    ? "space-y-3"
                    : "space-y-4"
              }
            >
              {effectiveFullNameField.enabled || effectivePhoneField.enabled ? (
                <div
                  className={contactFieldsGridClassName}
                >
                  {effectiveFullNameField.enabled ? (
                    <label className={fieldStackClassName}>
                      <span className={fieldLabelClassName}>{fullNameLabel}</span>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName || ""}
                        onChange={handleFieldChange}
                        className={resolvedInputClassName}
                        placeholder={
                          isMenShoesQuickOrder || isKhemetLuxeQuickOrder
                            ? prefersArabicCopy
                              ? "الاسم"
                              : "Name"
                            : prefersArabicCopy
                              ? "مثال: محمد أحمد"
                              : "John Doe"
                        }
                      />
                    </label>
                  ) : null}

                  {effectivePhoneField.enabled ? (
                    <label className={fieldStackClassName}>
                      <span className={fieldLabelClassName}>{phoneLabel}</span>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleFieldChange}
                        className={resolvedInputClassName}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {effectiveGovernorateField.enabled ? (
                <label className={fieldStackClassName}>
                  <span className={fieldLabelClassName}>{governorateLabel}</span>
                  <div className="relative">
                    <select
                      name="governorate"
                      value={formData.governorate || ""}
                      onChange={handleFieldChange}
                      className={`${resolvedInputClassName} appearance-none pe-10`}
                    >
                      <option value="">
                        {prefersArabicCopy ? "اختر المحافظة" : "Select governorate"}
                      </option>
                      {EGYPT_GOVERNORATES.map((governorate) => (
                        <option key={governorate.id} value={governorate.nameEn}>
                          {governorate.nameAr}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ▼
                    </span>
                  </div>
                </label>
              ) : null}

              {effectiveAddressField.enabled ? (
                <label className={fieldStackClassName}>
                  <span className={fieldLabelClassName}>{addressLabel}</span>
                  <textarea
                    name="address"
                    value={formData.address || ""}
                    onChange={handleFieldChange}
                    rows={isCompactMergedQuickOrder ? 2 : isMenShoesQuickOrder || isWomenFashionQuickOrder ? 3 : 5}
                    className={`${resolvedInputClassName} ${
                      isCompactMergedQuickOrder
                        ? "min-h-[84px]"
                        : isMenShoesQuickOrder || isWomenFashionQuickOrder
                          ? "min-h-[96px]"
                          : "min-h-[140px]"
                    } resize-y`}
                    placeholder={
                      prefersArabicCopy
                        ? "الحي، الشارع، رقم العمارة، أقرب علامة مميزة"
                        : "District, street, building number, nearest landmark"
                    }
                  />
                </label>
              ) : null}

              {effectiveAlternatePhoneField.enabled ? (
                <label className={fieldStackClassName}>
                  <span className={fieldLabelClassName}>{alternatePhoneLabel}</span>
                  <input
                    type="tel"
                    value={alternatePhone}
                    onChange={(event) => setAlternatePhone(event.target.value)}
                    className={resolvedInputClassName}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                  />
                </label>
              ) : null}
            </div>

            {showOrderSummaryBlock ? (
              <div
                className={`space-y-2.5 border-t border-border/60 ${
                  isCompactMergedQuickOrder
                    ? "pt-2.5"
                    : isMenShoesQuickOrder
                      ? "pt-2"
                      : "pt-3"
                }`}
              >
                {effectiveGovernorateField.enabled &&
                (isShippingLoading || Boolean(resolvedGovernorate)) ? (
                  <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    <span>
                      {shippingLabel}
                      {shippingMethodSummaryLabel ? (
                        <span className="mt-1 block text-[11px] text-muted-foreground/80">
                          {shippingMethodSummaryLabel}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-semibold text-foreground">
                      {isShippingLoading
                        ? prefersArabicCopy
                          ? "جارٍ الحساب..."
                          : "Calculating..."
                        : formatStorefrontCurrency(shippingCost, currency)}
                    </span>
                  </div>
                ) : configuredShippingSummaryText ? (
                  <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    <span>{configuredShippingSummaryText}</span>
                    <span className="font-semibold text-foreground">
                      {staticShippingValueText}
                    </span>
                  </div>
                ) : null}
                {shouldRenderInlineTotalRow ? (
                  <div className="flex items-center justify-between gap-4 text-base font-black">
                    <span className="text-foreground">{totalLabel}</span>
                    <span className="text-foreground">
                      {formatStorefrontCurrency(total, currency)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {minimumOrder.blocked ? (
              <div className="space-y-2 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <p className="text-sm font-semibold leading-6">
                  {minimumOrder.message}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-amber-200">
                  <div
                    className="h-full rounded-full bg-amber-600 transition-[width] duration-500"
                    style={{ width: `${minimumOrder.progress}%` }}
                  />
                </div>
              </div>
            ) : null}

            {shouldRenderActionArea ? (
              <div
                className={`${
                  isCompactMergedQuickOrder ? "pt-1" : "pt-2"
                } ${
                  isKhemetMergedBuyboxQuickOrder
                    ? "grid grid-cols-2 gap-2"
                    : isPrimaryQuantityOfferDecision
                      ? "grid gap-3"
                      : "grid gap-3 sm:grid-cols-2"
                }`}
              >
                {showAddToCartButton ? (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={addToCartButtonClassName}
                  >
                    {addToCartLabel}
                  </button>
                ) : null}
                {shouldShowInlineSubmitButton ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSubmit();
                    }}
                    disabled={isSubmitting || minimumOrder.blocked}
                    className={submitButtonClassName}
                  >
                    {isSubmitting
                      ? prefersArabicCopy
                        ? "جارٍ إرسال الطلب..."
                        : "Submitting order..."
                      : minimumOrderSubmitLabel}
                  </button>
                ) : null}
              </div>
            ) : null}

            {shouldShowMobileStickySubmitBar ? (
              <div className="sm:hidden">
                <div className="h-20" aria-hidden="true" />
                <div
                  className={`fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 shadow-[0_-18px_40px_-28px_rgba(107,33,49,0.28)] backdrop-blur ${
                    isSoleaMergedBuyboxQuickOrder
                      ? "border-[#ead8cf] bg-[#fffdfb]/95 supports-[backdrop-filter]:bg-[#fffdfb]/88"
                      : "border-[#ead8cf] bg-white/95 supports-[backdrop-filter]:bg-white/88"
                  }`}
                >
                  <div className="mx-auto flex max-w-md items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)]">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[11px] font-semibold ${
                          isSoleaMergedBuyboxQuickOrder
                            ? "text-[#8d6a66]"
                            : "text-[#8d6a66]"
                        }`}
                      >
                        {totalLabel}
                      </p>
                      <p
                        className={`truncate text-sm font-black ${
                          isSoleaMergedBuyboxQuickOrder
                            ? "text-[#2f232d]"
                            : "text-[#3f2432]"
                        }`}
                      >
                        {formatStorefrontCurrency(total, currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void handleSubmit();
                      }}
                      disabled={isSubmitting || minimumOrder.blocked}
                      className={`${submitButtonClassName} min-h-[3.15rem] min-w-[9.75rem] px-5`}
                    >
                      {isSubmitting
                        ? prefersArabicCopy
                          ? "جارٍ الإرسال..."
                          : "Submitting..."
                        : minimumOrderSubmitLabel}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PdpQuickOrderForm;
