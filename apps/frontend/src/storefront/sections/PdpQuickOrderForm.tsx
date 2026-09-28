import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Car, FileText } from "lucide-react";
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
import { getOrderAttributionPayload } from "../utils/orderAttribution";
import { buildQuantityOfferCartItems } from "../utils/quantityOfferCartItems";
import {
  calculateVolumeDiscountPricing,
  type VolumeDiscountTier,
} from "../utils/volumeDiscounts";
import {
  getActiveStorePromotionFromCompany,
  calculateStorePromotionDiscount,
} from "../utils/storePromotion";
import { getPdpQuickOrderSettingsFromDesignTokens } from "../utils/pdpQuickOrderSettings";
import { EGYPT_GOVERNORATES, getGovernorateByName } from "../../constants/egyptGovernorates";
import { useIpGovernorateDetection } from "../hooks/useIpGovernorateDetection";
import { getCartId, getCompanyId, storefrontApi } from "../../utils/storefrontApi";
import { persistPurchaseTracking } from "../utils/purchaseTrackingStorage";
import type { CartItem } from "../store/useCartStore";
import type { Product } from "../hooks/useProducts";
import { resolvePreviewThemeId } from "../preview/previewContext";
import { isValidStorefrontPhone } from "../utils/phoneValidation";

interface PdpQuickOrderFormProps {
  product: Product & {
    imageUrl?: string;
    hasVariants: boolean;
  };
  sectionSettings?: Record<string, unknown>;
  hideHeader?: boolean;
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
  customAttributesSummary,
}: {
  alternatePhone: string;
  attributeSummary: string;
  quantityOfferLabel: string;
  customAttributesSummary?: string;
}) => {
  const blocks: string[] = [];

  if (customAttributesSummary && customAttributesSummary.trim()) {
    blocks.push(`تفاصيل الطلب: ${customAttributesSummary.trim()}`);
  }

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
  isValidStorefrontPhone(value);

const inputClassName =
  "w-full rounded-[1rem] border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const PdpQuickOrderForm: React.FC<PdpQuickOrderFormProps> = ({
  product,
  sectionSettings,
  hideHeader = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { trackAddToCartEvent, trackInitiateCheckoutEvent } =
    useStorefrontFacebookTracking();
  const { formData, updateFormData, resetCheckout } = useCheckoutStore();
  useIpGovernorateDetection();
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
  const isRedlineAutoQuickOrder =
    theme.id === "redline-auto" || configuredFormVariant === "redline-auto";
  const isSoleaFemmeQuickOrder =
    (theme.id === "solea-femme" || configuredFormVariant === "solea-femme") &&
    !isRedlineAutoQuickOrder;
  const isMenShoesQuickOrder =
    (theme.id === "men-shoes-eg" ||
      theme.id === "women-fashion-eg" ||
      isSoleaFemmeQuickOrder ||
      configuredFormVariant === "men-shoes-eg" ||
      configuredFormVariant === "women-fashion-eg") &&
    !isRedlineAutoQuickOrder;
  const isWomenFashionQuickOrder =
    (theme.id === "women-fashion-eg" ||
      configuredFormVariant === "women-fashion-eg") &&
    !isRedlineAutoQuickOrder;
  const isKhemetLuxeQuickOrder =
    (theme.id === "khemet-luxe-eg" ||
      configuredFormVariant === "khemet-luxe-eg") &&
    !isRedlineAutoQuickOrder;
  const isVelaFashionQuickOrder =
    (theme.id === "vela-fashion-eg" ||
      configuredFormVariant === "vela-fashion-eg") &&
    !isRedlineAutoQuickOrder;
  const isMergedBuyboxSurface = configuredSurfaceMode === "merged-buybox";
  const isKhemetMergedBuyboxQuickOrder =
    isKhemetLuxeQuickOrder && isMergedBuyboxSurface;
  const isPrimaryQuantityOfferDecision = configuredDecisionMode === "primary";
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    "EGP";
  const companyId = storefrontSettings?.company?.id || getCompanyId();
  const walletPaymentSettings =
    (storefrontSettings?.storefront?.settings as any)?.walletPaymentSettings || null;
  const dbEnabledMethods = useMemo(() => {
    const raw =
      storefrontSettings?.storefront?.storefrontFeatures?.enabledPaymentMethods ??
      (storefrontSettings?.storefront?.settings as any)?.enabledPaymentMethods ??
      (storefrontSettings as any)?.storefrontSettings?.enabledPaymentMethods ??
      (storefrontSettings as any)?.enabledPaymentMethods;
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
    }
    return ["cod"];
  }, [storefrontSettings]);

  const isWalletActiveInSettings =
    walletPaymentSettings?.enabled !== false &&
    dbEnabledMethods.includes("wallet");
  const walletEnabled = Boolean(
    walletPaymentSettings?.walletNumber?.trim() && isWalletActiveInSettings
  );
  const isCodActive = dbEnabledMethods.includes("cod");
  const isCardActive = dbEnabledMethods.includes("card");

  const [paymentMethod, setPaymentMethod] = useState<"cod" | "wallet" | "card">(() => {
    if (isCodActive) return "cod";
    if (walletEnabled) return "wallet";
    if (isCardActive) return "card";
    return "cod";
  });

  useEffect(() => {
    const availableMethods: Array<"cod" | "wallet" | "card"> = [];
    if (isCodActive) availableMethods.push("cod");
    if (walletEnabled) availableMethods.push("wallet");
    if (isCardActive) availableMethods.push("card");

    if (availableMethods.length > 0 && !availableMethods.includes(paymentMethod)) {
      setPaymentMethod(availableMethods[0]);
    }
  }, [isCodActive, walletEnabled, isCardActive, paymentMethod]);
  const [walletProofImageUrl, setWalletProofImageUrl] = useState("");
  const [walletProofUploading, setWalletProofUploading] = useState(false);
  const [walletTransferRef, setWalletTransferRef] = useState("");
  const walletFileInputRef = useRef<HTMLInputElement | null>(null);

  const storePdpQuickOrderSettings = useMemo(() => {
    const rawTokens =
      storefrontSettings?.storefront?.settings?.designTokens ||
      storefrontSettings?.designTokens ||
      null;
    return getPdpQuickOrderSettingsFromDesignTokens(rawTokens);
  }, [storefrontSettings]);

  const customAttributes = useMemo(() => {
    let meta = (product as any)?.metadata;
    if (typeof meta === "string") {
      try {
        meta = JSON.parse(meta);
      } catch {
        meta = null;
      }
    }
    const productAttrs =
      meta && Array.isArray(meta.customAttributes)
        ? meta.customAttributes
        : meta && Array.isArray(meta.customFields)
        ? meta.customFields
        : [];

    if (isRedlineAutoQuickOrder) {
      const hasCarAttr = productAttrs.some(
        (a: any) =>
          a.key === "car_model" ||
          a.key?.toLowerCase().includes("car") ||
          a.label?.includes("سيار"),
      );
      if (!hasCarAttr) {
        return [
          ...productAttrs,
          {
            key: "car_model",
            label: prefersArabicCopy
              ? "نوع وموديل وسنة صنع السيارة"
              : "Car make, model & year",
            placeholder: prefersArabicCopy
              ? "مثال: هيونداي إلنترا CN7 موديل 2022، كيا سبورتاج 2020"
              : "e.g. Hyundai Elantra 2022, Kia Sportage 2020",
            required: true,
          },
        ];
      }
      return productAttrs;
    }

    if (productAttrs.length > 0) {
      return productAttrs;
    }

    // Fallback to store-level custom field if enabled in store settings
    const storeCustomField = storePdpQuickOrderSettings?.customField;
    if (storeCustomField?.enabled) {
      return [
        {
          key: "storeCustomField",
          label:
            storeCustomField.label ||
            (prefersArabicCopy
              ? "نوع وموديل وسنة صنع السيارة / مواصفات خاصة"
              : "Vehicle model / specifications"),
          placeholder:
            storeCustomField.placeholder ||
            (prefersArabicCopy
              ? "اكتب المواصفات هنا..."
              : "Enter specifications here..."),
          required: Boolean(storeCustomField.required),
        },
      ];
    }

    return [];
  }, [product, storePdpQuickOrderSettings, prefersArabicCopy, isRedlineAutoQuickOrder]);

  const [customAttributeValues, setCustomAttributeValues] = useState<Record<string, string>>({});

  const handleCustomAttributeChange = (key: string, value: string) => {
    setCustomAttributeValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const handleCarModelSelect = (event: Event) => {
      const customEvent = event as CustomEvent<{ carModel?: string }>;
      const carModel = customEvent.detail?.carModel;
      if (carModel && typeof carModel === "string") {
        setCustomAttributeValues((prev) => {
          const matchedAttr = customAttributes.find(
            (a: any) =>
              a.key === "car_model" ||
              a.key?.toLowerCase().includes("car") ||
              a.label?.includes("سيار"),
          );
          const carKey = matchedAttr?.key || "car_model";
          return { ...prev, [carKey]: carModel };
        });
      }
    };
    window.addEventListener(
      "maxp:storefront:select-car-model",
      handleCarModelSelect,
    );
    return () => {
      window.removeEventListener(
        "maxp:storefront:select-car-model",
        handleCarModelSelect,
      );
    };
  }, [customAttributes]);

  const customAttributesSummary = useMemo(() => {
    return customAttributes
      .filter((attr: any) => customAttributeValues[attr.key]?.trim())
      .map((attr: any) => `${attr.label}: ${customAttributeValues[attr.key].trim()}`)
      .join(" - ");
  }, [customAttributes, customAttributeValues]);

  const handleWalletProofFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setValidationErrors([
        prefersArabicCopy
          ? "صيغة الملف يجب أن تكون صورة (JPG/PNG)."
          : "The file must be an image (JPG/PNG).",
      ]);
      return;
    }
    setWalletProofUploading(true);
    try {
      const res = await storefrontApi.uploadWalletProof(file);
      const url = res?.data?.imageUrl || res?.imageUrl;
      if (!url) {
        setValidationErrors([
          prefersArabicCopy
            ? "فشل رفع صورة الإيصال. حاول مرة أخرى."
            : "Failed to upload the receipt. Try again.",
        ]);
        return;
      }
      setWalletProofImageUrl(String(url));
      setValidationErrors((prev) => prev.filter((e) => !e.includes("صورة")));
    } catch (err) {
      console.error("[WALLET-PROOF] Upload failed:", err);
      setValidationErrors([
        prefersArabicCopy
          ? "فشل رفع صورة الإيصال. حاول مرة أخرى."
          : "Failed to upload the receipt. Try again.",
      ]);
    } finally {
      setWalletProofUploading(false);
    }
  };

  const marketplacePreviewThemeId = resolvePreviewThemeId();
  const pdpQuickOrderSettings = getPdpQuickOrderSettingsFromDesignTokens(
    storefrontSettings?.storefrontSettings?.designTokens,
  );

  const activeSelection =
    selection && selection.productId === product.id ? selection : null;
  const isOutOfStock = useMemo(() => {
    if (activeSelection?.isOutOfStock !== undefined) {
      return activeSelection.isOutOfStock;
    }
    const isBackorderAllowed =
      Boolean(product.allowBackorders) ||
      (product.metadata as any)?.allowBackorders === true ||
      product.trackInventory === false ||
      Boolean(product.isPreOrder);
    if (product.trackInventory === false || isBackorderAllowed) {
      return false;
    }
    const rawStock =
      typeof product.stock === "number" && Number.isFinite(product.stock)
        ? product.stock
        : null;
    return typeof rawStock === "number" && rawStock <= 0;
  }, [activeSelection?.isOutOfStock, product]);
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
  const isSubmittingRef = useRef(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isStickySubmitVisible, setIsStickySubmitVisible] = useState(false);
  const trackedCheckoutFingerprintRef = useRef("");
  const checkoutDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shippingCacheRef = useRef<Map<string, { price: number; label: string }>>(new Map());
  const trackedShippingQuoteRef = useRef<string>("");

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
    Boolean(activeQuantityOffer)
      ? false
      : typeof sectionSettings?.showQuantity === "boolean"
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

  const normalizedGovValue = useMemo(() => {
    if (!formData.governorate) return "";
    const matched = getGovernorateByName(formData.governorate);
    return matched ? matched.nameEn : formData.governorate;
  }, [formData.governorate]);

  const resolvedGovernorate = effectiveGovernorateField.enabled
    ? normalizedGovValue || formData.governorate?.trim() || ""
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
  const hasCheckoutDraftSignal = Boolean(
    (resolvedFullName && resolvedFullName.trim().length >= 2) ||
    (contactPhone && contactPhone.replace(/\D/g, "").length >= 5) ||
    (resolvedAddress && resolvedAddress.trim().length >= 4),
  );
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
  const walletDiscountEnabled = Boolean(walletPaymentSettings?.discountEnabled);
  const walletDiscountPercent = Math.max(
    0,
    Number(walletPaymentSettings?.discountPercent || 0),
  );
  const walletDiscountActive =
    walletDiscountEnabled &&
    walletDiscountPercent > 0 &&
    (paymentMethod === "card" || (paymentMethod === "wallet" && walletEnabled));
  const walletDiscount =
    walletDiscountActive
      ? (Number(resolvedSubtotal) || 0) * (walletDiscountPercent / 100)
      : 0;
  const storePromotion = useMemo(
    () => getActiveStorePromotionFromCompany(storefrontSettings?.company),
    [storefrontSettings?.company],
  );
  const storePromoDiscountResult = useMemo(() => {
    if (activeQuantityOffer || !storePromotion || !storePromotion.isActive) {
      return { discount: 0, tier: null };
    }
    const currentItems = [
      {
        productId: product.id,
        quantity,
        price: pricing.unitPrice,
        comparePrice: pricing.comparePrice,
      },
    ];
    return calculateStorePromotionDiscount(currentItems, storePromotion);
  }, [activeQuantityOffer, storePromotion, product.id, quantity, pricing.unitPrice, pricing.comparePrice]);

  const storePromoDiscount = storePromoDiscountResult.discount;
  const storePromoTier = storePromoDiscountResult.tier;

  const total = Math.max(0, resolvedSubtotal - storePromoDiscount + shippingCost - walletDiscount);
  const minimumOrder = useMinimumOrderSettings(Math.max(0, resolvedSubtotal - storePromoDiscount), currency);
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

    const resolvedColor =
      activeAttributes.Color ||
      activeAttributes["اللون"] ||
      activeAttributes["لون"] ||
      activeAttributes.color ||
      undefined;
    const resolvedSize =
      activeAttributes.Size ||
      activeAttributes["المقاس"] ||
      activeAttributes["مقاس"] ||
      activeAttributes.size ||
      undefined;

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
      comparePrice: typeof product.comparePrice === 'number' ? product.comparePrice : undefined,
      quantity,
      imageUrl: activeSelection?.imageUrl || product.imageUrl,
      productColor: resolvedColor,
      productSize: resolvedSize,
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
    product.comparePrice,
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
    let cancelled = false;

    if (!effectiveGovernorateField.enabled || !resolvedGovernorate || !companyId) {
      setShippingCost(0);
      setShippingMethodLabel("");
      setIsShippingLoading(false);
      return undefined;
    }

    const cacheKey = `${companyId}:${resolvedGovernorate}:${shippingQuoteItems
      .map((i) => `${i.productId}:${i.variantId || ""}:${i.quantity}`)
      .join(";")}`;

    const cached = shippingCacheRef.current.get(cacheKey);
    if (cached) {
      setShippingCost(cached.price);
      setShippingMethodLabel(cached.label);
      setIsShippingLoading(false);
      return undefined;
    }

    const loadShipping = async () => {
      try {
        setIsShippingLoading(true);
        const response = await storefrontApi.calculateShipping(
          resolvedGovernorate,
          companyId,
          shippingQuoteItems,
        );

        if (!cancelled) {
          const resolvedCost = Number(response?.data?.price) || 0;
          const primaryMethod = Array.isArray(response?.data?.methods)
            ? response.data.methods[0]
            : null;
          const resolvedLabel = String(
            primaryMethod?.title ||
              primaryMethod?.label ||
              primaryMethod?.name ||
              "",
          ).trim();

          shippingCacheRef.current.set(cacheKey, {
            price: resolvedCost,
            label: resolvedLabel,
          });

          setShippingCost(resolvedCost);
          setShippingMethodLabel(resolvedLabel);
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

    const timer = setTimeout(() => {
      void loadShipping();
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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

    const quoteTrackingKey = `${product.id}:${resolvedGovernorate}:${shippingCost}:${resolvedSubtotal}:${quickOrderFingerprint}`;
    if (trackedShippingQuoteRef.current === quoteTrackingKey) {
      return;
    }
    trackedShippingQuoteRef.current = quoteTrackingKey;

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

  useEffect(() => {
    if (checkoutDraftTimerRef.current) {
      clearTimeout(checkoutDraftTimerRef.current);
    }

    if (!isSelectionReady || !companyId || !hasCheckoutDraftSignal) {
      return undefined;
    }

    const draftItems: CartItem[] = [];

    if (activeQuantityOffer) {
      const builtOfferItems = buildQuantityOfferCartItems({
        product,
        quantityOfferSelection: activeQuantityOffer,
      });

      if (builtOfferItems?.items?.length) {
        draftItems.push(...builtOfferItems.items);
      }
    } else if (trackingItem) {
      draftItems.push(trackingItem);
    }

    if (!draftItems.length) {
      return undefined;
    }

    checkoutDraftTimerRef.current = setTimeout(() => {
      void storefrontApi.saveCheckoutDraft({
        customerName: resolvedFullName || fallbackCustomerName,
        email: "",
        phone: contactPhone,
        address: resolvedAddress,
        city: resolvedGovernorate,
        governorate: resolvedGovernorate,
        notes: buildQuickOrderNote({
          alternatePhone: resolvedAlternatePhone,
          attributeSummary,
          quantityOfferLabel: activeQuantityOffer?.offerLabel || "",
          customAttributesSummary,
        }),
        paymentMethod,
        shippingCost,
        subtotal: resolvedSubtotal,
        total,
        attribution: getOrderAttributionPayload(companyId) || undefined,
        items: draftItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          name: item.name,
          price: item.price,
          basePrice: item.basePrice,
          quantity: item.quantity,
          attributes: item.attributes || {},
          image: item.imageUrl,
          productImage: item.imageUrl,
          quantityOffer: item.quantityOffer || undefined,
          volumeDiscount:
            Array.isArray(item.volumeDiscounts) && item.volumeDiscounts[0]
              ? item.volumeDiscounts[0]
              : undefined,
        })),
      });
    }, 1200);

    return () => {
      if (checkoutDraftTimerRef.current) {
        clearTimeout(checkoutDraftTimerRef.current);
      }
    };
  }, [
    companyId,
    hasCheckoutDraftSignal,
    isSelectionReady,
    activeQuantityOffer,
    trackingItem,
    resolvedFullName,
    contactPhone,
    resolvedGovernorate,
    resolvedAddress,
    resolvedAlternatePhone,
    attributeSummary,
    shippingCost,
    resolvedSubtotal,
    total,
  ]);

  const handleFieldChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    if (name === "governorate" && typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem("sf-gov-manual-selection", "true");
    }
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
      (!resolvedAddress || resolvedAddress.trim().length < 5)
    ) {
      errors.push(
        prefersArabicCopy
          ? "يرجى إدخال العنوان بالتفصيل (5 أحرف على الأقل)."
          : "Please enter the detailed address (at least 5 characters).",
      );
    }

    if (minimumOrder.blocked) {
      errors.push(minimumOrder.message);
    }

    if (isOutOfStock) {
      errors.push(
        prefersArabicCopy
          ? "عذرًا، هذا المنتج نفد من المخزون حاليًا."
          : "Sorry, this product is currently out of stock.",
      );
    }

    customAttributes.forEach((attr: any) => {
      if (attr.required && !customAttributeValues[attr.key]?.trim()) {
        errors.push(
          prefersArabicCopy
            ? `يرجى إدخال ${attr.label}.`
            : `Please enter ${attr.label}.`,
        );
      }
    });

    return errors;
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    if (isOutOfStock) {
      toast.error(
        prefersArabicCopy
          ? "عذرًا، نفدت كمية هذا المنتج حاليًا وغير متاح للطلب."
          : "Sorry, this product is currently out of stock.",
      );
      return;
    }

    const errors = validateForm();
    if (errors.length > 0) {
      setValidationErrors(errors);
      if (minimumOrder.blocked) {
        toast.error(minimumOrder.message);
      } else if (paymentMethod === "card") {
        toast.error(
          prefersArabicCopy
            ? "يرجى استكمال بيانات التوصيل المطلوبة أولاً للانتقال إلى صفحة الدفع بالبطاقة."
            : "Please complete required delivery details first to proceed to card payment.",
        );
      }
      return;
    }

    isSubmittingRef.current = true;
    setValidationErrors([]);
    setIsSubmitting(true);

    try {
      if (paymentMethod === "wallet") {
        if (walletProofUploading) {
          setValidationErrors([
            prefersArabicCopy
              ? "جارٍ رفع صورة الإيصال، انتظر قليلًا."
              : "Uploading the receipt, please wait.",
          ]);
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
        if (!walletProofImageUrl) {
          setValidationErrors([
            prefersArabicCopy
              ? "يرجى رفع صورة إيصال التحويل لإتمام الدفع بالمحفظة."
              : "Please upload the transfer receipt to pay by wallet.",
          ]);
          isSubmittingRef.current = false;
          setIsSubmitting(false);
          return;
        }
      }
      const quickOrderItems = buildQuickOrderCartItemsForSubmit();
      if (!quickOrderItems?.length) {
        isSubmittingRef.current = false;
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
        try {
          const eventId = trackInitiateCheckoutEvent({
            items: checkoutItems,
            total: resolvedSubtotal,
          });

          if (eventId !== undefined) {
            trackedCheckoutFingerprintRef.current = quickOrderFingerprint;
          }
        } catch (trackErr) {
          console.warn(
            "[PdpQuickOrderForm] Failed to track initiate checkout:",
            trackErr,
          );
        }
      }

      const pixelEventId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const payload = buildCheckoutOrderPayload(
        {
          customerName: resolvedFullName || fallbackCustomerName,
          email: "",
          phone: contactPhone,
          phone2:
            effectiveAlternatePhoneField.enabled && resolvedAlternatePhone
              ? resolvedAlternatePhone
              : undefined,
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
            customAttributesSummary,
          }),
          paymentMethod,
          shippingCost,
          subtotal: resolvedSubtotal,
          total,
          ...(paymentMethod === "wallet" && walletProofImageUrl
            ? {
                walletProof: {
                  imageUrl: walletProofImageUrl,
                  walletNumber: walletPaymentSettings?.walletNumber || undefined,
                  transferRef: walletTransferRef.trim() || undefined,
                },
              }
            : {}),
        },
        quickOrderItems,
        resolvedSubtotal,
        companyId,
        pixelEventId,
      );

      let previewResponse: PublicOrderResponse | null = null;
      if (marketplacePreviewThemeId) {
        try {
          const previewModule = await import(
            "../preview/marketplacePreviewOrder"
          );
          if (previewModule?.createMarketplacePreviewOrderResponse) {
            previewResponse =
              previewModule.createMarketplacePreviewOrderResponse(
                {
                  guestName: resolvedFullName || fallbackCustomerName,
                  guestEmail: "",
                  guestPhone: contactPhone,
                  guestPhone2:
                    effectiveAlternatePhoneField.enabled && resolvedAlternatePhone
                      ? resolvedAlternatePhone
                      : undefined,
                  paymentMethod,
                  notes: payload.notes,
                  shippingAddress: {
                    governorate: resolvedGovernorate || undefined,
                    city: resolvedGovernorate || undefined,
                    street: resolvedAddress || undefined,
                    address: resolvedAddress || undefined,
                    addressLine1: resolvedAddress || undefined,
                    phone2:
                      effectiveAlternatePhoneField.enabled &&
                      resolvedAlternatePhone
                        ? resolvedAlternatePhone
                        : undefined,
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
              ) as PublicOrderResponse | null;
          }
        } catch (previewErr) {
          console.warn(
            "[PdpQuickOrderForm] preview order simulation failed, falling back to storefrontApi:",
            previewErr,
          );
        }
      }

      if (paymentMethod === "card" && !marketplacePreviewThemeId) {
        const cartId = getCartId();
        const cardPayload = {
          guestName: payload.guestName || resolvedFullName || fallbackCustomerName,
          guestEmail: payload.guestEmail || undefined,
          guestPhone: payload.guestPhone || contactPhone,
          customerName: payload.guestName || resolvedFullName || fallbackCustomerName,
          phone: payload.guestPhone || contactPhone,
          shippingAddress: {
            governorate: resolvedGovernorate || undefined,
            city: resolvedGovernorate || undefined,
            street: resolvedAddress || undefined,
            address: resolvedAddress || undefined,
            phone2: effectiveAlternatePhoneField.enabled && resolvedAlternatePhone ? resolvedAlternatePhone : undefined,
          },
          items: quickOrderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.imageUrl,
            attributes: item.attributes || {},
            quantityOffer: item.quantityOffer || undefined,
          })),
          subtotal: resolvedSubtotal,
          shippingCost,
          total,
          cartId,
          pixelEventId,
          notes: payload.notes,
        };

        const cardResponse = (await storefrontApi.kashierCheckout(cardPayload)) as any;
        if (cardResponse?.success && cardResponse?.data?.sessionUrl) {
          window.location.href = cardResponse.data.sessionUrl;
          return;
        } else {
          throw new Error(
            cardResponse?.error ||
            cardResponse?.message ||
            (prefersArabicCopy ? "تعذر إنشاء جلسة الدفع بالبطاقة. يرجى التحقق من إعدادات بوابة الدفع." : "Failed to initiate card payment session.")
          );
        }
      }

      const response = previewResponse
        ? previewResponse
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
      const postPurchaseOffer = (storefrontSettings as any)?.designTokens?.postPurchaseOffer;
      const isOfferActive = Boolean(
        postPurchaseOffer?.enabled &&
        postPurchaseOffer?.productId
      );
      const targetRoute = isOfferActive ? "/order-offer" : "/thank-you";
      const thankYouPath = buildStorefrontPath(
        location.pathname,
        `${targetRoute}?orderId=${encodeURIComponent(String(resolvedOrderId))}`,
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
        companyId: companyId || undefined,
        total: resolvedOrderTotal,
        phone: contactPhone,
        customerName: resolvedFullName || fallbackCustomerName,
        paymentMethod,
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
      persistPurchaseTracking(purchaseTracking, companyId);

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
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      const message =
        error instanceof Error
          ? error.message
          : prefersArabicCopy
            ? "حدث خطأ أثناء إرسال الطلب."
            : "An error occurred while submitting the order.";
      toast.error(message);
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(
        prefersArabicCopy
          ? "عذرًا، نفدت كمية هذا المنتج حاليًا وغير متاح للطلب."
          : "Sorry, this product is currently out of stock.",
      );
      return;
    }

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
    isRedlineAutoQuickOrder
      ? configuredTitle ||
        (prefersArabicCopy
          ? "بيانات الشحن وتأكيد الطلب"
          : "Shipping & Order Confirmation")
      : isKhemetMergedBuyboxQuickOrder
      ? prefersArabicCopy
        ? "أكملي بياناتك وسنأكد طلبك"
        : "Add your details & we'll confirm"
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
    isRedlineAutoQuickOrder
      ? configuredSubtitle ||
        (prefersArabicCopy
          ? "استلم وجرب الستارة على حلق باب عربيتك وتأكد من المقاس الفابريقة قبل دفع أي قرش."
          : "Inspect on your car door frame before paying.")
      : isKhemetMergedBuyboxQuickOrder
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
  const fullNameLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? "الاسم بالكامل" : "Full Name"
    : isMenShoesQuickOrder || isVelaFashionQuickOrder || isKhemetLuxeQuickOrder
    ? prefersArabicCopy
      ? "الاسم"
      : "Name"
    : prefersArabicCopy
      ? "الاسم بالكامل"
      : "Full name";
  const phoneLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? "رقم الموبايل (للتواصل والشحن)" : "Mobile Phone"
    : prefersArabicCopy ? "رقم الهاتف" : "Phone number";
  const governorateLabel = prefersArabicCopy ? "المحافظة" : "Governorate";
  const addressLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? "عنوان التوصيل بالتفصيل (المحافظة / المركز / الشارع)" : "Detailed Address"
    : isMenShoesQuickOrder || isKhemetLuxeQuickOrder
    ? prefersArabicCopy
      ? "العنوان"
      : "Address"
    : prefersArabicCopy
      ? "العنوان بالتفصيل"
      : "Detailed address";
  const alternatePhoneLabel = isRedlineAutoQuickOrder
    ? prefersArabicCopy ? "رقم موبايل بديل (اختياري)" : "Alternate Phone (Optional)"
    : prefersArabicCopy
    ? "رقم هاتف بديل"
    : "Alternate phone";
  const shippingLabel = prefersArabicCopy ? "تكلفة الشحن" : "Shipping";
  const totalLabel = prefersArabicCopy ? "الإجمالي" : "Total";
  const cleanShippingMethodTitle = useMemo(() => {
    if (!shippingMethodLabel) return "";
    const trimmed = shippingMethodLabel.trim();
    if (trimmed.includes("،") || trimmed.includes(",") || trimmed.length > 30) {
      return "";
    }
    return trimmed;
  }, [shippingMethodLabel]);

  const shippingMethodSummaryLabel = cleanShippingMethodTitle
    ? prefersArabicCopy
      ? `طريقة الشحن: ${cleanShippingMethodTitle}`
      : `Shipping method: ${cleanShippingMethodTitle}`
    : "";
  const addToCartLabel = isOutOfStock
    ? (prefersArabicCopy ? "نفدت الكمية" : "Out of stock")
    : configuredAddToCartButtonText ||
      (isSoleaFemmeQuickOrder && prefersArabicCopy
        ? "أضيفي للسلة"
        : prefersArabicCopy
          ? "أضف للسلة"
          : "Add to cart");
  const submitLabel = isOutOfStock
    ? (prefersArabicCopy ? "نفدت الكمية" : "Out of stock")
    : paymentMethod === "card"
      ? (prefersArabicCopy
          ? `متابعة للدفع بالبطاقة 💳 (${formatStorefrontCurrency(total, currency)})`
          : `Proceed to Card Payment 💳 (${formatStorefrontCurrency(total, currency)})`)
      : configuredSubmitButtonText ||
        (isSoleaFemmeQuickOrder && prefersArabicCopy
          ? "تأكيد الطلب"
          : isKhemetLuxeQuickOrder && prefersArabicCopy
            ? "تأكيد الطلب"
          : prefersArabicCopy
            ? "اشتر الآن"
            : "Buy now");
  const minimumOrderSubmitLabel = isOutOfStock
    ? (prefersArabicCopy ? "نفدت الكمية" : "Out of stock")
    : minimumOrder.blocked
      ? `${prefersArabicCopy ? "متبقي" : "Remaining"} ${formatStorefrontCurrency(
          minimumOrder.remaining,
          currency,
        )}`
      : submitLabel;
  const showAddToCartButton =
    product?.showAddToCartButton === false
      ? false
      : product?.showAddToCartButton === true
        ? true
        : configuredShowAddToCartButton === null
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
    (isWomenMergedBuyboxQuickOrder ||
      isSoleaMergedBuyboxQuickOrder ||
      isRedlineAutoQuickOrder) &&
    !shouldCollapseFormUntilSelectionReady;
  const shouldShowMobileStickySubmitBar =
    shouldEnableMobileStickySubmitBar && isStickySubmitVisible;
  const shellClassName = isRedlineAutoQuickOrder
    ? isMergedBuyboxSurface
      ? "space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-950/60 dark:ring-white/10"
      : "space-y-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/5 dark:border-slate-800 dark:bg-slate-950/60 dark:ring-white/10"
    : isSoleaFemmeQuickOrder
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
  const quantitySurfaceClassName = isRedlineAutoQuickOrder
    ? "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/40"
    : isSoleaFemmeQuickOrder
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
  const addToCartButtonClassName = isRedlineAutoQuickOrder
    ? "min-h-[3.4rem] rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    : isSoleaFemmeQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] border border-[#d8b28a] bg-white px-4 text-sm font-black text-[#6f5448] transition hover:border-[#2f232d]/20 hover:bg-[#fff8f1]"
    : isKhemetLuxeQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] border border-[#d7c5b8] bg-white px-4 text-sm font-black text-[#4a352e] transition hover:border-[#1f4c3b]/15 hover:bg-[#fffaf6]"
    : isMenShoesQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] border border-[#d8dfd2] bg-white px-4 text-sm font-black text-[#111111] transition hover:border-[#111111]/20 hover:bg-[#f6f7f4]"
    : isVelaFashionQuickOrder
      ? "min-h-[3.4rem] rounded-[1rem] border border-[#d7b4bf] bg-white px-4 text-sm font-black text-[#7a5260] transition hover:bg-[#fff7fa]"
    : "min-h-[3.65rem] rounded-[1.05rem] border border-border bg-background px-4 text-sm font-black text-foreground transition hover:border-primary/30 hover:text-primary";
  const submitButtonClassName = isRedlineAutoQuickOrder
    ? "min-h-[3.6rem] w-full rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 bg-[length:200%_auto] px-5 py-3.5 text-sm sm:text-base font-black text-white shadow-[0_8px_25px_-5px_rgba(225,29,72,0.45)] transition-all hover:bg-[position:right_center] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
    : isSoleaFemmeQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] bg-[#2f232d] px-4 text-sm font-black text-white transition hover:bg-[#241a22] disabled:cursor-not-allowed disabled:opacity-60"
    : isKhemetLuxeQuickOrder
    ? "min-h-[3.5rem] rounded-[1rem] bg-[#1f4c3b] px-4 text-sm font-black text-[#fbf5ee] transition hover:bg-[#173a2d] disabled:cursor-not-allowed disabled:opacity-60"
    : isMenShoesQuickOrder
    ? "min-h-[3.4rem] rounded-[1rem] bg-[#111111] px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    : isVelaFashionQuickOrder
      ? "min-h-[3.4rem] rounded-[1rem] border border-[#7a5260] bg-[#7a5260] px-4 text-sm font-black text-white transition hover:bg-[#946777] disabled:cursor-not-allowed disabled:opacity-60"
    : "min-h-[3.65rem] rounded-[1.05rem] bg-black px-4 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";
  const resolvedInputClassName = isRedlineAutoQuickOrder
    ? "w-full rounded-xl border border-slate-300/80 bg-slate-50/50 px-3.5 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-red-600 focus:bg-white focus:ring-2 focus:ring-red-600/15 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-red-500"
    : isSoleaMergedBuyboxQuickOrder
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
  const fieldStackClassName = isRedlineAutoQuickOrder
    ? "block space-y-1.5"
    : isWomenMergedBuyboxQuickOrder
    ? "block space-y-1.5"
    : isKhemetMergedBuyboxQuickOrder
      ? "block space-y-1.5"
    : "block space-y-2";
  const fieldLabelClassName = isRedlineAutoQuickOrder
    ? "text-[13px] font-bold text-slate-900 dark:text-slate-100"
    : isWomenMergedBuyboxQuickOrder || isKhemetMergedBuyboxQuickOrder
    ? "text-[13px] font-semibold text-foreground"
    : "text-sm font-semibold text-foreground";
  const contactFieldsGridClassName = isKhemetMergedBuyboxQuickOrder
    ? "grid gap-3"
    : isCompactMergedQuickOrder
      ? "grid grid-cols-2 gap-2.5"
      : "space-y-4";
  const shouldRenderInlineTotalRow =
    isRedlineAutoQuickOrder || !shouldShowMobileStickySubmitBar;
  const shouldShowInlineSubmitButton =
    isRedlineAutoQuickOrder || !shouldShowMobileStickySubmitBar;
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
          {!hideHeader && configuredBadgeText && !isMergedBuyboxSurface ? (
            <span className="inline-flex items-center rounded-full border border-[#ead9c7] bg-[#fff8f1] px-3 py-1 text-[11px] font-black tracking-[0.16em] text-[#b45309]">
              {configuredBadgeText}
            </span>
          ) : null}
          {!hideHeader && title ? (
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
          {!hideHeader && subtitle ? (
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
                        autoComplete="name"
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
                        autoComplete="tel"
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {customAttributes && customAttributes.length > 0 ? (
                <div className="space-y-3">
                  {customAttributes.map((attr: any) => {
                    const isCarAttr =
                      attr.label?.includes("سيار") ||
                      attr.key?.toLowerCase().includes("car") ||
                      attr.key === "car_model" ||
                      isRedlineAutoQuickOrder;

                    if (isCarAttr) {
                      return (
                        <div
                          key={attr.key}
                          className="rounded-xl border border-red-200/90 bg-red-50/40 p-3.5 dark:border-red-900/40 dark:bg-red-950/20 space-y-2 shadow-xs transition-colors focus-within:border-red-500 focus-within:bg-red-50/60"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white">
                              <Car className="h-4 w-4 text-red-600 shrink-0" />
                              <span>
                                {attr.label ||
                                  (prefersArabicCopy
                                    ? "نوع وموديل وسنة صنع السيارة"
                                    : "Car Model & Year")}
                              </span>
                              {attr.required && (
                                <span className="text-red-500 font-bold">*</span>
                              )}
                            </span>
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700 dark:bg-red-900/50 dark:text-red-300">
                              {prefersArabicCopy ? "تفصيل بالمللي" : "Custom fit"}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={customAttributeValues[attr.key] || ""}
                            onChange={(e) =>
                              handleCustomAttributeChange(attr.key, e.target.value)
                            }
                            className={`${resolvedInputClassName} bg-white dark:bg-slate-900 font-medium`}
                            placeholder={
                              attr.placeholder ||
                              (prefersArabicCopy
                                ? "مثال: هيونداي توسان 2022، كيا سبورتاج 2020، إلنترا CN7"
                                : "e.g. Hyundai Tucson 2022, Kia Sportage 2020")
                            }
                          />
                        </div>
                      );
                    }

                    return (
                      <label key={attr.key} className={fieldStackClassName}>
                        <span className={fieldLabelClassName}>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            {attr.label}
                            {attr.required && (
                              <span className="text-red-500 font-bold">*</span>
                            )}
                          </span>
                        </span>
                        <input
                          type="text"
                          value={customAttributeValues[attr.key] || ""}
                          onChange={(e) =>
                            handleCustomAttributeChange(attr.key, e.target.value)
                          }
                          className={resolvedInputClassName}
                          placeholder={
                            attr.placeholder ||
                            (prefersArabicCopy
                              ? "اكتب هنا..."
                              : "Enter details...")
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {effectiveGovernorateField.enabled ? (
                <label className={fieldStackClassName}>
                  <span className={fieldLabelClassName}>{governorateLabel}</span>
                  <div className="relative">
                    <select
                      name="governorate"
                      value={normalizedGovValue}
                      onChange={handleFieldChange}
                      className={`${resolvedInputClassName} appearance-none pe-10`}
                      autoComplete="address-level1"
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
                        ? "min-h-[64px]"
                        : isMenShoesQuickOrder || isWomenFashionQuickOrder
                          ? "min-h-[96px]"
                          : "min-h-[140px]"
                    } resize-y`}
                    autoComplete="street-address"
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
                    autoComplete="tel"
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
                {storePromoDiscount > 0 ? (
                  <div className="flex items-center justify-between gap-4 text-sm font-medium">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {storePromoTier?.label || (prefersArabicCopy ? "عرض الكمية" : "Quantity Offer")}
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      -{formatStorefrontCurrency(storePromoDiscount, currency)}
                    </span>
                  </div>
                ) : null}
                {walletDiscount > 0 && walletPaymentSettings?.showDiscountBadge !== false ? (
                  <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    <span>
                      {prefersArabicCopy
                        ? paymentMethod === "card"
                          ? `خصم الدفع بالبطاقة / فيزا (${walletDiscountPercent}%)`
                          : `خصم الدفع بالمحفظة (${walletDiscountPercent}%)`
                        : paymentMethod === "card"
                          ? `Card payment discount (${walletDiscountPercent}%)`
                          : `Wallet payment discount (${walletDiscountPercent}%)`}
                    </span>
                    <span className="font-semibold text-emerald-600">
                      -{formatStorefrontCurrency(walletDiscount, currency)}
                    </span>
                  </div>
                ) : null}
                {shouldRenderInlineTotalRow ? (
                  <div
                    className={`flex items-center justify-between gap-4 text-base font-black ${
                      isRedlineAutoQuickOrder
                        ? "rounded-xl border border-red-200/80 bg-red-50/40 px-3.5 py-2.5 dark:border-red-900/30 dark:bg-red-950/20"
                        : ""
                    }`}
                  >
                    <span className="text-foreground">{totalLabel}</span>
                    <span
                      className={
                        isRedlineAutoQuickOrder
                          ? "text-lg font-black text-red-600 dark:text-red-400 tabular-nums"
                          : "text-foreground"
                      }
                    >
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

            {walletEnabled || isCardActive ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                    {prefersArabicCopy ? "طريقة الدفع" : "Payment method"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {isCodActive ? (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cod")}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          paymentMethod === "cod"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-emerald-300 bg-white text-emerald-800 dark:border-emerald-700 dark:bg-gray-900 dark:text-emerald-200"
                        }`}
                      >
                        {prefersArabicCopy ? "الدفع عند الاستلام" : "Cash on delivery"}
                      </button>
                    ) : null}
                    {walletEnabled ? (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("wallet")}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          paymentMethod === "wallet"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-emerald-300 bg-white text-emerald-800 dark:border-emerald-700 dark:bg-gray-900 dark:text-emerald-200"
                        }`}
                      >
                        <span>{prefersArabicCopy ? "الدفع بالمحفظة" : "Wallet payment"}</span>
                        {walletDiscountEnabled && walletDiscountPercent > 0 && walletPaymentSettings?.showDiscountBadge !== false ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                              paymentMethod === "wallet"
                                ? "bg-white text-emerald-800"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                            }`}
                          >
                            خصم {walletDiscountPercent}%
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                    {isCardActive ? (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                          paymentMethod === "card"
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-emerald-300 bg-white text-emerald-800 dark:border-emerald-700 dark:bg-gray-900 dark:text-emerald-200"
                        }`}
                      >
                        <span>💳 {prefersArabicCopy ? "بطاقة بنكية / فيزا" : "Card"}</span>
                        {walletDiscountEnabled && walletDiscountPercent > 0 && walletPaymentSettings?.showDiscountBadge !== false ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                              paymentMethod === "card"
                                ? "bg-white text-emerald-800"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                            }`}
                          >
                            خصم {walletDiscountPercent}%
                          </span>
                        ) : null}
                      </button>
                    ) : null}
                  </div>
                </div>

                {walletDiscountEnabled && walletDiscountPercent > 0 && paymentMethod === "cod" ? (
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    💡 {prefersArabicCopy
                      ? (isCardActive && !walletEnabled
                          ? `وفّر ${walletDiscountPercent}% فوراً عند اختيار الدفع بالبطاقة البنكية / فيزا (الدفع عند الاستلام متاح بالسعر الأصلي بدون خصم)`
                          : `وفّر ${walletDiscountPercent}% فوراً عند اختيار الدفع الإلكتروني المسبق (الدفع عند الاستلام متاح بالسعر الأصلي بدون خصم)`)
                      : `Save ${walletDiscountPercent}% instantly by choosing card payment (Cash on delivery is regular price without discount)`}
                  </p>
                ) : null}

                {paymentMethod === "card" ? (
                  <div className="space-y-2 rounded-xl border border-emerald-300/80 bg-white/80 p-3.5 shadow-xs dark:border-emerald-800/60 dark:bg-emerald-950/40">
                    {walletDiscount > 0 ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-100/90 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
                        <span className="flex items-center gap-1.5">
                          <span>🎉</span>
                          <span>
                            {prefersArabicCopy
                              ? `تم تطبيق خصم الفيزا (${walletDiscountPercent}%) بنجاح!`
                              : `Card discount (${walletDiscountPercent}%) applied!`}
                          </span>
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-300">
                          {prefersArabicCopy
                            ? `وفّرت ${formatStorefrontCurrency(walletDiscount, currency)}`
                            : `Saved ${formatStorefrontCurrency(walletDiscount, currency)}`}
                        </span>
                      </div>
                    ) : null}
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-1.5">
                      🔒 {prefersArabicCopy ? "دفع إلكتروني آمن بالبطاقة (فيزا / ماستركارد / ميزة)" : "Secure Card Payment (Visa / Mastercard / Meeza)"}
                    </p>
                    <p className="text-[11.5px] leading-relaxed text-emerald-800 dark:text-emerald-200">
                      {prefersArabicCopy
                        ? "أكمل بيانات التوصيل بالأعلى أولاً، ثم اضغط على زر «متابعة للدفع بالبطاقة» بالأسفل، وسيتم تحويلك فوراً وبأمان إلى صفحة البنك المعتمدة لإدخال بيانات الكارت وتأكيد العملية."
                        : "Fill in your delivery details above first, then click 'Proceed to Card Payment' below to securely complete your payment on the verified bank gateway."}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{prefersArabicCopy ? "تشفير وحماية مصرفية كاملة 256-bit SSL" : "256-bit SSL Bank-grade Encryption"}</span>
                    </div>
                  </div>
                ) : null}

                {paymentMethod === "wallet" ? (
                  <div className="space-y-3 border-t border-emerald-200 pt-3 dark:border-emerald-800/60">
                    <div className="text-sm text-emerald-900 dark:text-emerald-100">
                      <p className="font-bold">
                        {prefersArabicCopy
                          ? "حوّل المبلغ على رقم المحفظة ثم ارفع إيصال التحويل"
                          : "Transfer the amount to the wallet number, then upload the receipt"}
                      </p>
                      <p className="mt-1 text-emerald-800 dark:text-emerald-200">
                        {prefersArabicCopy ? "رقم المحفظة" : "Wallet number"}:{" "}
                        <span className="font-black" dir="ltr">{walletPaymentSettings.walletNumber}</span>
                        {walletPaymentSettings.recipientName ? (
                          <> · {prefersArabicCopy ? "المستلم" : "Recipient"}: <span className="font-bold">{walletPaymentSettings.recipientName}</span></>
                        ) : null}
                      </p>
                      {walletPaymentSettings.instructions ? (
                        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                          {walletPaymentSettings.instructions}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-emerald-900 dark:text-emerald-100">
                        {prefersArabicCopy ? "صورة إيصال التحويل" : "Transfer receipt image"}{" "}
                        <span className="text-red-600">*</span>
                      </label>
                      <input
                        ref={walletFileInputRef}
                        type="file"
                        accept="image/*"
                        disabled={walletProofUploading}
                        onChange={(e) => void handleWalletProofFile(e.target.files?.[0])}
                        className="block w-full text-xs text-emerald-900 file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700 disabled:opacity-50 dark:text-emerald-100"
                      />
                      {walletProofUploading ? (
                        <p className="mt-1 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                          {prefersArabicCopy ? "جارٍ رفع الإيصال..." : "Uploading receipt..."}
                        </p>
                      ) : walletProofImageUrl ? (
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                          {prefersArabicCopy ? "تم رفع الإيصال بنجاح" : "Receipt uploaded"}
                          <button type="button" onClick={() => walletFileInputRef.current?.click()} className="text-emerald-800 underline dark:text-emerald-200">
                            {prefersArabicCopy ? "استبدال" : "Replace"}
                          </button>
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-emerald-900 dark:text-emerald-100">
                        {prefersArabicCopy ? "رقم العملية / مرجع التحويل (اختياري)" : "Transfer reference (optional)"}
                      </label>
                      <input
                        type="text"
                        value={walletTransferRef}
                        onChange={(e) => setWalletTransferRef(e.target.value)}
                        placeholder={prefersArabicCopy ? "مثال: 123456789" : "e.g. 123456789"}
                        className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isOutOfStock ? (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-center text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {prefersArabicCopy
                  ? "⚠️ نفدت كمية هذا المنتج حاليًا وغير متاح للطلب الآن."
                  : "⚠️ This product is currently out of stock."}
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
                    disabled={isOutOfStock || isSubmitting}
                    className={`${addToCartButtonClassName} ${
                      isOutOfStock ? "opacity-50 cursor-not-allowed" : ""
                    }`}
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
                    disabled={isSubmitting || minimumOrder.blocked || isOutOfStock}
                    className={submitButtonClassName}
                  >
                    {isSubmitting
                      ? paymentMethod === "card"
                        ? prefersArabicCopy
                          ? "جارٍ التحويل لبوابة الدفع..."
                          : "Redirecting to payment gateway..."
                        : prefersArabicCopy
                          ? "جارٍ إرسال الطلب..."
                          : "Submitting order..."
                      : minimumOrderSubmitLabel}
                  </button>
                ) : null}
              </div>
            ) : null}

            {isKhemetMergedBuyboxQuickOrder && shouldRenderActionArea ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-medium text-[#6f5a54]">
                <span className="inline-flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                  {prefersArabicCopy ? 'الدفع عند الاستلام متاح' : 'Cash on delivery available'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {prefersArabicCopy ? 'تأكيد قبل الشحن' : 'Confirm before shipping'}
                </span>
              </div>
            ) : null}

            {shouldShowMobileStickySubmitBar ? (
              <div className="sm:hidden">
                <div className="h-20" aria-hidden="true" />
                <div
                  className={`fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 shadow-[0_-18px_40px_-28px_rgba(0,0,0,0.2)] backdrop-blur ${
                    isRedlineAutoQuickOrder
                      ? "border-slate-200 bg-white/95 supports-[backdrop-filter]:bg-white/88 dark:border-slate-800 dark:bg-slate-950/95"
                      : isSoleaMergedBuyboxQuickOrder
                      ? "border-[#ead8cf] bg-[#fffdfb]/95 supports-[backdrop-filter]:bg-[#fffdfb]/88"
                      : "border-[#ead8cf] bg-white/95 supports-[backdrop-filter]:bg-white/88"
                  }`}
                >
                  <div className="mx-auto flex max-w-md items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+0.85rem)]">
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[11px] font-semibold ${
                          isRedlineAutoQuickOrder
                            ? "text-slate-500 dark:text-slate-400"
                            : isSoleaMergedBuyboxQuickOrder
                            ? "text-[#8d6a66]"
                            : "text-[#8d6a66]"
                        }`}
                      >
                        {totalLabel}
                      </p>
                      <p
                        className={`truncate text-sm font-black ${
                          isRedlineAutoQuickOrder
                            ? "text-red-600 dark:text-red-400 tabular-nums"
                            : isSoleaMergedBuyboxQuickOrder
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
                      disabled={isSubmitting || minimumOrder.blocked || isOutOfStock}
                      className={`${submitButtonClassName} min-h-[3.15rem] min-w-[9.75rem] px-5`}
                    >
                      {isSubmitting
                        ? paymentMethod === "card"
                          ? prefersArabicCopy
                            ? "جارٍ التحويل..."
                            : "Redirecting..."
                          : prefersArabicCopy
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
