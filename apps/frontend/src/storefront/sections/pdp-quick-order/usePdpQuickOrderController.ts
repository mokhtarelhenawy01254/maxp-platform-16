import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCheckoutStore } from '../../store/useCheckoutStore';
import { usePdpSelectionStore } from '../../store/usePdpSelectionStore';
import { useQuantityOfferSelectionStore } from '../../store/useQuantityOfferSelectionStore';
import { useCartStore } from '../../store/useCartStore';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { useStorefrontFacebookTracking } from '../../hooks/useStorefrontFacebookTracking';
import { getPdpQuickOrderSettingsFromDesignTokens } from '../../utils/pdpQuickOrderSettings';
import { getGovernorateByName } from '../../../constants/egyptGovernorates';
import { useIpGovernorateDetection } from '../../hooks/useIpGovernorateDetection';
import { getCompanyId, storefrontApi } from '../../../utils/storefrontApi';
import { resolvePreviewThemeId } from '../../preview/previewContext';
import { getOrderAttributionPayload } from '../../utils/orderAttribution';
import { buildQuantityOfferCartItems } from '../../utils/quantityOfferCartItems';
import type { CartItem } from '../../store/useCartStore';
import type {
  PdpQuickOrderFormProps,
  QuickOrderPaymentMethod,
} from './quickOrderTypes';
import {
  isRecord,
  buildQuickOrderNote,
} from './quickOrderHelpers';
import { useQuickOrderPricing } from './hooks/useQuickOrderPricing';
import { useQuickOrderShipping } from './hooks/useQuickOrderShipping';
import { useQuickOrderThemeStyles } from './hooks/useQuickOrderThemeStyles';
import { useQuickOrderFormSubmit } from './hooks/useQuickOrderFormSubmit';

export const usePdpQuickOrderController = ({
  product,
  sectionSettings,
  hideHeader = false,
}: PdpQuickOrderFormProps) => {
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
  const prefersArabicCopy = theme.direction === 'rtl';

  const configuredTitle =
    typeof sectionSettings?.title === 'string' && sectionSettings.title.trim()
      ? sectionSettings.title.trim()
      : '';
  const configuredBadgeText =
    typeof sectionSettings?.badgeText === 'string' &&
    sectionSettings.badgeText.trim()
      ? sectionSettings.badgeText.trim()
      : '';
  const configuredSubtitle =
    typeof sectionSettings?.subtitle === 'string' &&
    sectionSettings.subtitle.trim()
      ? sectionSettings.subtitle.trim()
      : '';
  const configuredEmptyStateText =
    typeof sectionSettings?.emptyStateText === 'string' &&
    sectionSettings.emptyStateText.trim()
      ? sectionSettings.emptyStateText.trim()
      : '';
  const configuredFormVariant =
    typeof sectionSettings?.formVariant === 'string' &&
    sectionSettings.formVariant.trim()
      ? sectionSettings.formVariant.trim()
      : '';
  const configuredSurfaceMode =
    typeof sectionSettings?.surfaceMode === 'string' &&
    sectionSettings.surfaceMode.trim()
      ? sectionSettings.surfaceMode.trim()
      : '';
  const configuredSubmitButtonText =
    typeof sectionSettings?.submitButtonText === 'string' &&
    sectionSettings.submitButtonText.trim()
      ? sectionSettings.submitButtonText.trim()
      : '';
  const configuredAddToCartButtonText =
    typeof sectionSettings?.addToCartButtonText === 'string' &&
    sectionSettings.addToCartButtonText.trim()
      ? sectionSettings.addToCartButtonText.trim()
      : '';
  const configuredShippingSummaryText =
    typeof sectionSettings?.shippingSummaryText === 'string' &&
    sectionSettings.shippingSummaryText.trim()
      ? sectionSettings.shippingSummaryText.trim()
      : '';
  const configuredShippingSummaryValueText =
    typeof sectionSettings?.shippingSummaryValueText === 'string' &&
    sectionSettings.shippingSummaryValueText.trim()
      ? sectionSettings.shippingSummaryValueText.trim()
      : '';
  const configuredShowAddToCartButton =
    typeof sectionSettings?.showAddToCartButton === 'boolean'
      ? sectionSettings.showAddToCartButton
      : null;
  const configuredDecisionMode =
    typeof sectionSettings?.decisionMode === 'string' &&
    sectionSettings.decisionMode.trim()
      ? sectionSettings.decisionMode.trim()
      : '';
  const fieldOverrideMap = isRecord(sectionSettings?.fields)
    ? sectionSettings.fields
    : {};

  const isRedlineAuto =
    theme.id === 'redline-auto' || configuredFormVariant === 'redline-auto';

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
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
    }
    return ['cod'];
  }, [storefrontSettings]);

  const isWalletActiveInSettings =
    walletPaymentSettings?.enabled !== false &&
    dbEnabledMethods.includes('wallet');
  const walletEnabled = Boolean(
    walletPaymentSettings?.walletNumber?.trim() && isWalletActiveInSettings,
  );
  const isCodActive = dbEnabledMethods.includes('cod');
  const isCardActive = dbEnabledMethods.includes('card');

  const [paymentMethod, setPaymentMethod] = useState<QuickOrderPaymentMethod>(() => {
    if (isCodActive) return 'cod';
    if (walletEnabled) return 'wallet';
    if (isCardActive) return 'card';
    return 'cod';
  });

  useEffect(() => {
    const availableMethods: QuickOrderPaymentMethod[] = [];
    if (isCodActive) availableMethods.push('cod');
    if (walletEnabled) availableMethods.push('wallet');
    if (isCardActive) availableMethods.push('card');

    if (availableMethods.length > 0 && !availableMethods.includes(paymentMethod)) {
      setPaymentMethod(availableMethods[0]);
    }
  }, [isCodActive, walletEnabled, isCardActive, paymentMethod]);

  const [walletProofImageUrl, setWalletProofImageUrl] = useState('');
  const [walletProofUploading, setWalletProofUploading] = useState(false);
  const [walletTransferRef, setWalletTransferRef] = useState('');
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
    if (typeof meta === 'string') {
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

    if (isRedlineAuto) {
      const hasCarAttr = productAttrs.some(
        (a: any) =>
          a.key === 'car_model' ||
          a.key?.toLowerCase().includes('car') ||
          a.label?.includes('سيار'),
      );
      if (!hasCarAttr) {
        return [
          ...productAttrs,
          {
            key: 'car_model',
            label: prefersArabicCopy
              ? 'نوع وموديل وسنة صنع السيارة'
              : 'Car make, model & year',
            placeholder: prefersArabicCopy
              ? 'مثال: هيونداي إلنترا CN7 موديل 2022، كيا سبورتاج 2020'
              : 'e.g. Hyundai Elantra 2022, Kia Sportage 2020',
            required: true,
          },
        ];
      }
      return productAttrs.map((a: any) => {
        if (
          a.key === 'car_model' ||
          a.key?.toLowerCase().includes('car') ||
          a.label?.includes('سيار')
        ) {
          return { ...a, required: true };
        }
        return a;
      });
    }

    if (productAttrs.length > 0) {
      return productAttrs;
    }

    const storeCustomField = storePdpQuickOrderSettings?.customField;
    if (storeCustomField?.enabled) {
      return [
        {
          key: 'storeCustomField',
          label:
            storeCustomField.label ||
            (prefersArabicCopy
              ? 'نوع وموديل وسنة صنع السيارة / مواصفات خاصة'
              : 'Vehicle model / specifications'),
          placeholder:
            storeCustomField.placeholder ||
            (prefersArabicCopy
              ? 'اكتب المواصفات هنا...'
              : 'Enter specifications here...'),
          required: Boolean(storeCustomField.required),
        },
      ];
    }

    return [];
  }, [product, storePdpQuickOrderSettings, prefersArabicCopy, isRedlineAuto]);

  const [customAttributeValues, setCustomAttributeValues] = useState<Record<string, string>>({});

  const handleCustomAttributeChange = (key: string, value: string) => {
    setCustomAttributeValues((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const handleCarModelSelect = (event: Event) => {
      const customEvent = event as CustomEvent<{ carModel?: string }>;
      const carModel = customEvent.detail?.carModel;
      if (carModel && typeof carModel === 'string') {
        setCustomAttributeValues((prev) => {
          const matchedAttr = customAttributes.find(
            (a: any) =>
              a.key === 'car_model' ||
              a.key?.toLowerCase().includes('car') ||
              a.label?.includes('سيار'),
          );
          const carKey = matchedAttr?.key || 'car_model';
          return { ...prev, [carKey]: carModel };
        });
      }
    };
    window.addEventListener(
      'maxp:storefront:select-car-model',
      handleCarModelSelect,
    );
    return () => {
      window.removeEventListener(
        'maxp:storefront:select-car-model',
        handleCarModelSelect,
      );
    };
  }, [customAttributes]);

  const customAttributesSummary = useMemo(() => {
    return customAttributes
      .filter((attr: any) => customAttributeValues[attr.key]?.trim())
      .map((attr: any) => `${attr.label}: ${customAttributeValues[attr.key].trim()}`)
      .join(' - ');
  }, [customAttributes, customAttributeValues]);

  const [alternatePhone, setAlternatePhone] = useState('');
  const [isStickySubmitVisible, setIsStickySubmitVisible] = useState(false);
  const checkoutDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pdpQuickOrderSettings = getPdpQuickOrderSettingsFromDesignTokens(
    storefrontSettings?.storefrontSettings?.designTokens,
  );
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

  const isSoleaFemme =
    (theme.id === 'solea-femme' || configuredFormVariant === 'solea-femme') &&
    !isRedlineAuto;
  const isMenShoes =
    (theme.id === 'men-shoes-eg' ||
      theme.id === 'women-fashion-eg' ||
      isSoleaFemme ||
      configuredFormVariant === 'men-shoes-eg' ||
      configuredFormVariant === 'women-fashion-eg') &&
    !isRedlineAuto;
  const isKhemetLuxe =
    (theme.id === 'khemet-luxe-eg' ||
      configuredFormVariant === 'khemet-luxe-eg') &&
    !isRedlineAuto;
  const isVelaFashion =
    (theme.id === 'vela-fashion-eg' ||
      configuredFormVariant === 'vela-fashion-eg') &&
    !isRedlineAuto;

  const effectiveFullNameField = {
    enabled:
      typeof fullNameOverride.enabled === 'boolean'
        ? fullNameOverride.enabled
        : fullNameField.enabled,
    required:
      typeof fullNameOverride.required === 'boolean'
        ? fullNameOverride.required
        : fullNameField.required,
  };
  const effectivePhoneField = {
    enabled:
      typeof phoneOverride.enabled === 'boolean'
        ? phoneOverride.enabled
        : phoneField.enabled,
    required:
      typeof phoneOverride.required === 'boolean'
        ? phoneOverride.required
        : phoneField.required,
  };
  const effectiveGovernorateField = {
    enabled:
      typeof governorateOverride.enabled === 'boolean'
        ? governorateOverride.enabled
        : governorateField.enabled,
    required:
      typeof governorateOverride.required === 'boolean'
        ? governorateOverride.required
        : governorateField.required,
  };
  const effectiveAddressField = {
    enabled:
      typeof addressOverride.enabled === 'boolean'
        ? addressOverride.enabled
        : addressField.enabled,
    required:
      typeof addressOverride.required === 'boolean'
        ? addressOverride.required
        : addressField.required,
  };
  const effectiveAlternatePhoneField = {
    enabled:
      typeof alternatePhoneOverride.enabled === 'boolean'
        ? alternatePhoneOverride.enabled
        : isMenShoes
          ? false
          : isKhemetLuxe
            ? false
          : isVelaFashion
              ? false
            : alternatePhoneField.enabled,
    required:
      typeof alternatePhoneOverride.required === 'boolean'
        ? alternatePhoneOverride.required
        : alternatePhoneField.required,
  };

  const normalizedGovValue = useMemo(() => {
    if (!formData.governorate) return '';
    const matched = getGovernorateByName(formData.governorate);
    return matched ? matched.nameEn : formData.governorate;
  }, [formData.governorate]);

  const resolvedGovernorate = effectiveGovernorateField.enabled
    ? normalizedGovValue || formData.governorate?.trim() || ''
    : '';
  const resolvedAddress = effectiveAddressField.enabled
    ? formData.address?.trim() || ''
    : '';
  const resolvedFullName = effectiveFullNameField.enabled
    ? formData.customerName?.trim() || ''
    : '';
  const resolvedPhone = effectivePhoneField.enabled
    ? formData.phone?.trim() || ''
    : '';
  const resolvedAlternatePhone = effectiveAlternatePhoneField.enabled
    ? alternatePhone.trim()
    : '';
  const contactPhone = resolvedPhone || resolvedAlternatePhone;

  const fallbackCustomerName = prefersArabicCopy
    ? 'عميل صفحة المنتج'
    : 'Product page customer';

  const [temporaryShippingCost, setTemporaryShippingCost] = useState(0);

  // Hook 1: Pricing
  const pricingData = useQuickOrderPricing({
    product,
    selection,
    quantity,
    quantityOfferSelection,
    storefrontSettings,
    shippingCost: temporaryShippingCost,
    paymentMethod,
    walletPaymentSettings,
    walletEnabled,
    prefersArabicCopy,
  });

  const effectiveShippingQuantity =
    pricingData.activeQuantityOffer?.offerQuantity ?? quantity;

  // Hook 2: Shipping
  const shippingData = useQuickOrderShipping({
    companyId,
    resolvedGovernorate,
    effectiveGovernorateEnabled: effectiveGovernorateField.enabled,
    productId: product.id,
    effectiveShippingQuantity,
    resolvedSubtotal: pricingData.resolvedSubtotal,
    quickOrderFingerprint: pricingData.quickOrderFingerprint,
    storefrontSettings,
  });

  useEffect(() => {
    setTemporaryShippingCost(shippingData.shippingCost);
  }, [shippingData.shippingCost]);

  // Hook 3: Theme Styles & Labels
  const themeStyles = useQuickOrderThemeStyles({
    theme,
    sectionSettings,
    configuredFormVariant,
    configuredSurfaceMode,
    configuredTitle,
    configuredSubtitle,
    configuredBadgeText,
    configuredAddToCartButtonText,
    configuredSubmitButtonText,
    configuredShippingSummaryValueText,
    configuredShowAddToCartButton,
    configuredEmptyStateText,
    configuredDecisionMode,
    isOutOfStock: pricingData.isOutOfStock,
    paymentMethod,
    total: pricingData.total,
    currency: pricingData.currency,
    minimumOrder: pricingData.minimumOrder,
    activeQuantityOffer: pricingData.activeQuantityOffer,
    isSelectionReady: pricingData.isSelectionReady,
    attributeSummary: pricingData.attributeSummary,
    prefersArabicCopy,
  });

  const marketplacePreviewThemeId = resolvePreviewThemeId();

  // Hook 4: Submission & Actions
  const submitData = useQuickOrderFormSubmit({
    product,
    activeQuantityOffer: pricingData.activeQuantityOffer,
    trackingItem: pricingData.trackingItem,
    customAttributeValues,
    isOutOfStock: pricingData.isOutOfStock,
    isSelectionReady: pricingData.isSelectionReady,
    effectiveFullNameField,
    effectivePhoneField,
    effectiveAlternatePhoneField,
    effectiveGovernorateField,
    effectiveAddressField,
    resolvedFullName,
    resolvedPhone,
    contactPhone,
    resolvedAlternatePhone,
    resolvedGovernorate,
    resolvedAddress,
    minimumOrder: pricingData.minimumOrder,
    customAttributes,
    customAttributesSummary,
    attributeSummary: pricingData.attributeSummary,
    paymentMethod,
    walletProofUploading,
    walletProofImageUrl,
    walletPaymentSettings,
    walletTransferRef,
    effectiveShippingCost: pricingData.effectiveShippingCost,
    resolvedSubtotal: pricingData.resolvedSubtotal,
    total: pricingData.total,
    companyId,
    marketplacePreviewThemeId,
    quickOrderFingerprint: pricingData.quickOrderFingerprint,
    trackInitiateCheckoutEvent,
    trackAddToCartEvent,
    storefrontSettings,
    resetCheckout,
    setAlternatePhone,
    setQuantity,
    addItem,
    prefersArabicCopy,
    fallbackCustomerName,
  });

  const handleWalletProofFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      submitData.setValidationErrors([
        prefersArabicCopy
          ? 'صيغة الملف يجب أن تكون صورة (JPG/PNG).'
          : 'The file must be an image (JPG/PNG).',
      ]);
      return;
    }
    setWalletProofUploading(true);
    try {
      const res = await storefrontApi.uploadWalletProof(file);
      const url = res?.data?.imageUrl || res?.imageUrl;
      if (!url) {
        submitData.setValidationErrors([
          prefersArabicCopy
            ? 'فشل رفع صورة الإيصال. حاول مرة أخرى.'
            : 'Failed to upload the receipt. Try again.',
        ]);
        return;
      }
      setWalletProofImageUrl(String(url));
      submitData.setValidationErrors((prev) => prev.filter((e) => !e.includes('صورة')));
    } catch (err) {
      console.error('[WALLET-PROOF] Upload failed:', err);
      submitData.setValidationErrors([
        prefersArabicCopy
          ? 'فشل رفع صورة الإيصال. حاول مرة أخرى.'
          : 'Failed to upload the receipt. Try again.',
      ]);
    } finally {
      setWalletProofUploading(false);
    }
  };

  const handleFieldChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;
    if (name === 'governorate' && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('sf-gov-manual-selection', 'true');
    }
    updateFormData({ [name]: value });
  };

  const hasCheckoutDraftSignal = Boolean(
    (resolvedFullName && resolvedFullName.trim().length >= 2) ||
    (contactPhone && contactPhone.replace(/\D/g, '').length >= 5) ||
    (resolvedAddress && resolvedAddress.trim().length >= 4),
  );

  useEffect(() => {
    if (checkoutDraftTimerRef.current) {
      clearTimeout(checkoutDraftTimerRef.current);
    }

    if (!pricingData.isSelectionReady || !companyId || !hasCheckoutDraftSignal) {
      return undefined;
    }

    const draftItems: CartItem[] = [];

    if (pricingData.activeQuantityOffer) {
      const builtOfferItems = buildQuantityOfferCartItems({
        product,
        quantityOfferSelection: pricingData.activeQuantityOffer,
      });

      if (builtOfferItems?.items?.length) {
        draftItems.push(...builtOfferItems.items);
      }
    } else if (pricingData.trackingItem) {
      draftItems.push(pricingData.trackingItem);
    }

    if (!draftItems.length) {
      return undefined;
    }

    checkoutDraftTimerRef.current = setTimeout(() => {
      void storefrontApi.saveCheckoutDraft({
        customerName: resolvedFullName || fallbackCustomerName,
        email: '',
        phone: contactPhone,
        address: resolvedAddress,
        city: resolvedGovernorate,
        governorate: resolvedGovernorate,
        notes: buildQuickOrderNote({
          alternatePhone: resolvedAlternatePhone,
          attributeSummary: pricingData.attributeSummary,
          quantityOfferLabel: pricingData.activeQuantityOffer?.offerLabel || '',
          customAttributesSummary,
        }),
        paymentMethod,
        shippingCost: shippingData.shippingCost,
        subtotal: pricingData.resolvedSubtotal,
        total: pricingData.total,
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
    pricingData.isSelectionReady,
    pricingData.activeQuantityOffer,
    pricingData.trackingItem,
    resolvedFullName,
    contactPhone,
    resolvedGovernorate,
    resolvedAddress,
    resolvedAlternatePhone,
    pricingData.attributeSummary,
    shippingData.shippingCost,
    pricingData.resolvedSubtotal,
    pricingData.total,
    customAttributesSummary,
    fallbackCustomerName,
    paymentMethod,
    product,
  ]);

  useEffect(() => {
    if (!themeStyles.shouldEnableMobileStickySubmitBar) {
      setIsStickySubmitVisible(false);
      return;
    }

    const updateStickySubmitVisibility = () => {
      setIsStickySubmitVisible(window.scrollY > 360);
    };

    updateStickySubmitVisibility();
    window.addEventListener('scroll', updateStickySubmitVisibility, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', updateStickySubmitVisibility);
    };
  }, [themeStyles.shouldEnableMobileStickySubmitBar]);

  const showQuantityBlock =
    Boolean(pricingData.activeQuantityOffer)
      ? false
      : typeof sectionSettings?.showQuantity === 'boolean'
        ? sectionSettings.showQuantity
        : themeStyles.isVelaFashionQuickOrder
            ? false
          : themeStyles.isKhemetLuxeQuickOrder
            ? false
          : themeStyles.isMenShoesQuickOrder
            ? false
          : pdpQuickOrderSettings.showQuantity;

  const showOrderSummaryBlock =
    typeof sectionSettings?.showOrderSummary === 'boolean'
      ? sectionSettings.showOrderSummary
      : pdpQuickOrderSettings.showOrderSummary;

  const shippingMethodSummaryLabel = shippingData.cleanShippingMethodTitle
    ? prefersArabicCopy
      ? `طريقة الشحن: ${shippingData.cleanShippingMethodTitle}`
      : `Shipping method: ${shippingData.cleanShippingMethodTitle}`
    : '';

  const shouldShowMobileStickySubmitBar =
    themeStyles.shouldEnableMobileStickySubmitBar && isStickySubmitVisible;

  const shouldRenderInlineTotalRow =
    themeStyles.isRedlineAutoQuickOrder || !shouldShowMobileStickySubmitBar;

  const shouldShowInlineSubmitButton =
    themeStyles.isRedlineAutoQuickOrder || !shouldShowMobileStickySubmitBar;

  const shouldRenderActionArea =
    themeStyles.showAddToCartButton || shouldShowInlineSubmitButton;

  return {
    product,
    hideHeader,
    prefersArabicCopy,
    ...themeStyles,

    // Pricing & Summary
    ...pricingData,

    // Shipping
    ...shippingData,
    shippingMethodSummaryLabel,

    // Submission & Validation
    ...submitData,

    // Fields & State
    formData,
    handleFieldChange,
    showQuantityBlock,
    quantity,
    setQuantity,
    effectiveFullNameField,
    effectivePhoneField,
    effectiveGovernorateField,
    effectiveAddressField,
    effectiveAlternatePhoneField,
    normalizedGovValue,
    resolvedGovernorate,
    alternatePhone,
    setAlternatePhone,
    customAttributes,
    customAttributeValues,
    handleCustomAttributeChange,
    showOrderSummaryBlock,
    shouldRenderInlineTotalRow,
    shouldShowInlineSubmitButton,
    shouldRenderActionArea,
    shouldShowMobileStickySubmitBar,

    // Payment methods
    walletEnabled,
    isCardActive,
    isCodActive,
    paymentMethod,
    setPaymentMethod,
    handleWalletProofFile,
    walletProofUploading,
    walletProofImageUrl,
    walletTransferRef,
    setWalletTransferRef,
    walletFileInputRef,
    walletPaymentSettings,
  };
};

export type PdpQuickOrderController = ReturnType<typeof usePdpQuickOrderController>;
