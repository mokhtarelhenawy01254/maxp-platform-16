import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useCheckoutStore } from '../store/useCheckoutStore';
import { useCheckout } from '../hooks/useCheckout';
import { useCartStore } from '../store/useCartStore';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { formatStorefrontCurrency } from '../utils/currency';
import { buildStorefrontPath } from '../utils/paths';
import { isKhemetLuxeTheme } from '../utils/navigationGuards';
import { storefrontApi } from '../../utils/storefrontApi';
import { useStorefrontFacebookTracking } from '../hooks/useStorefrontFacebookTracking';
import { trackConversionSuiteUsage } from '../utils/conversionSuiteTracking';
import { getOrderAttributionPayload } from '../utils/orderAttribution';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { useCheckoutShippingQuote } from '../hooks/useCheckoutShippingQuote';
import TierProgressBanner from '../components/TierProgressBanner';
import { isValidStorefrontPhone } from '../utils/phoneValidation';
import { toast } from 'sonner';

interface PaymentSectionProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    summaryTitle?: string;
    summaryDescription?: string;
    confirmOrderText?: string;
    payButtonPrefix?: string;
    processingText?: string;
    shippingPromptText?: string;
    enterGovernorateText?: string;
    subtotalLabel?: string;
    shippingLabel?: string;
    totalLabel?: string;
    calculatingText?: string;
    shippingCalculatedText?: string;
    noShippingChargeText?: string;
    shippingErrorText?: string;
    governorateRequiredText?: string;
    invalidEmailText?: string;
    invalidPhoneText?: string;
    securityText?: string;
    enabledMethods?: string[];
    codLabel?: string;
    codDesc?: string;
    cardLabel?: string;
    cardDesc?: string;
    walletLabel?: string;
    walletDesc?: string;
    assuranceBadge?: string;
    assuranceTitle?: string;
    assuranceItems?: string[] | string;
    postConfirmStepsTitle?: string;
    postConfirmSteps?: string[] | string;
    showSummaryCard?: string | boolean;
    showHeaderBadge?: string | boolean;
    showAssuranceCard?: string | boolean;
    showNextSteps?: string | boolean;
    [key: string]: unknown;
  };
}

const normalizeVariant = (
  value: unknown,
):
  | 'standard'
  | 'cards'
  | 'minimal'
  | 'market-payment'
  | 'nature-payment'
  | 'command-payment'
  | 'boutique-payment' => {
  if (typeof value !== 'string') {
    return 'standard';
  }

  const normalizedValue = value.trim().toLowerCase();
  if (
    normalizedValue === 'cards' ||
    normalizedValue === 'minimal' ||
    normalizedValue === 'standard' ||
    normalizedValue === 'market-payment' ||
    normalizedValue === 'nature-payment' ||
    normalizedValue === 'command-payment' ||
    normalizedValue === 'boutique-payment'
  ) {
    return normalizedValue;
  }

  return 'standard';
};

const parseListSetting = (value: unknown, fallback: string[]) => {
  const items = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/,|\n/)
      : fallback;

  return items.map((item) => String(item).trim()).filter(Boolean);
};

const parseBooleanSetting = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === 'true') {
      return true;
    }
    if (normalizedValue === 'false') {
      return false;
    }
  }

  return fallback;
};

const getMethodCardClassName = (
  variant:
    | 'standard'
    | 'cards'
    | 'minimal'
    | 'market-payment'
    | 'nature-payment'
    | 'command-payment'
    | 'boutique-payment',
  active: boolean,
) => {
  const stateClassName = active
    ? 'border-primary bg-primary/5 ring-1 ring-primary'
    : 'border-border bg-card hover:bg-muted';

  switch (variant) {
    case 'cards':
      return `w-full rounded-[1.25rem] border p-4 text-start transition-all duration-200 ${stateClassName}`;
    case 'minimal':
      return `w-full rounded-[0.95rem] border p-3 text-start transition-all duration-200 ${stateClassName}`;
    case 'market-payment':
      return `w-full rounded-[1.6rem] border p-4 text-start transition-all duration-200 ${stateClassName}`;
    case 'nature-payment':
      return `w-full rounded-[1.6rem] border p-4 text-start transition-all duration-200 ${stateClassName}`;
    case 'command-payment':
      return `w-full rounded-[1.6rem] border p-4 text-start transition-all duration-200 ${stateClassName}`;
    case 'boutique-payment':
      return `w-full rounded-[1.6rem] border p-4 text-start transition-all duration-200 ${stateClassName}`;
    default:
      return `w-full rounded-[var(--radius)] border p-4 text-start transition-all duration-200 ${stateClassName}`;
  }
};

const getSummaryWrapperClassName = (
  variant:
    | 'standard'
    | 'cards'
    | 'minimal'
    | 'market-payment'
    | 'nature-payment'
    | 'command-payment'
    | 'boutique-payment',
) => {
  switch (variant) {
    case 'cards':
      return 'rounded-[1.35rem] border border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.22))] p-5 space-y-3';
    case 'minimal':
      return 'rounded-[1rem] border border-border/70 bg-background p-4 space-y-3';
    case 'market-payment':
      return 'rounded-[1.7rem] border border-[#f0d4b0] bg-[linear-gradient(180deg,#fffdf8_0%,#fff6ec_100%)] p-5 space-y-4 shadow-[0_24px_70px_-54px_rgba(154,93,34,0.14)]';
    case 'nature-payment':
      return 'rounded-[1.7rem] border border-[#dbe3d4] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8f2_100%)] p-5 space-y-4 shadow-[0_24px_70px_-54px_rgba(26,51,40,0.14)]';
    case 'command-payment':
      return 'rounded-[1.7rem] border border-[#ead8b1] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7e9_100%)] p-5 space-y-4 shadow-[0_24px_70px_-54px_rgba(90,62,24,0.18)]';
    case 'boutique-payment':
      return 'rounded-[1.7rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfc_0%,#fff7f4_100%)] p-5 space-y-4 shadow-[0_24px_70px_-54px_rgba(107,33,49,0.14)]';
    default:
      return 'rounded-[var(--radius)] border border-border/50 bg-muted/30 p-4 space-y-3';
  }
};

const isSameAmount = (left: number, right: number) =>
  Math.abs(left - right) < 0.01;

const PaymentSection: React.FC<PaymentSectionProps> = ({
  section,
  settings: sectionSettings,
}) => {
  const { paymentMethod, setPaymentMethod, formData, appliedCoupon } = useCheckoutStore();
  const { placeOrder, isSubmitting, orderSuccess } = useCheckout();
  const { items, getSubtotal } = useCartStore();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { trackInitiateCheckoutEvent } = useStorefrontFacebookTracking();
  const { theme } = useStorefrontTheme();
  const isAirlume = theme.id === 'airlume-ai';
  const isZenOrganic = theme.id === 'zen-organic';
  const isBiteRush = theme.id === 'restaurant-demo';
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const navigate = useNavigate();
  const location = useLocation();
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [usePoints, setUsePoints] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  const trackedCheckoutFingerprintRef = useRef('');
  const checkoutDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const walletEnabled =
    Boolean(walletPaymentSettings?.walletNumber?.trim()) && isWalletActiveInSettings;
  const walletDiscountEnabled = Boolean(walletPaymentSettings?.discountEnabled);
  const walletDiscountPercent = Math.max(
    0,
    Number(walletPaymentSettings?.discountPercent || 0),
  );
  const showWalletDiscountBadge = walletPaymentSettings?.showDiscountBadge !== false;
  const walletDiscountActive =
    walletDiscountEnabled &&
    walletDiscountPercent > 0 &&
    (paymentMethod === 'card' || (paymentMethod === 'wallet' && walletEnabled));
  const [walletProofImageUrl, setWalletProofImageUrl] = useState('');
  const [walletProofUploading, setWalletProofUploading] = useState(false);
  const [walletTransferRef, setWalletTransferRef] = useState('');
  const walletFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleWalletProofFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setValidationErrors(['صيغة الملف يجب أن تكون صورة (JPG/PNG).']);
      return;
    }
    setWalletProofUploading(true);
    try {
      const res = await storefrontApi.uploadWalletProof(file);
      const url = res?.data?.imageUrl || res?.imageUrl;
      if (!url) {
        setValidationErrors(['فشل رفع صورة الإيصال. حاول مرة أخرى.']);
        return;
      }
      setWalletProofImageUrl(String(url));
      setValidationErrors((prev) => prev.filter((e) => !e.includes('صورة')));
    } catch (err) {
      console.error('[WALLET-PROOF] Upload failed:', err);
      setValidationErrors(['فشل رفع صورة الإيصال. حاول مرة أخرى.']);
    } finally {
      setWalletProofUploading(false);
    }
  };

  const subtotal = getSubtotal();
  const walletDiscount =
    walletDiscountActive && (paymentMethod === 'wallet' || paymentMethod === 'card')
      ? (Number(subtotal) || 0) * (walletDiscountPercent / 100)
      : 0;
  const activeCoupon =
    appliedCoupon && isSameAmount(Number(appliedCoupon.orderAmount || 0), subtotal)
      ? appliedCoupon
      : null;
  const couponDiscount = Number(activeCoupon?.discountAmount || 0);
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'EGP';
  const trimmedGovernorate = formData.governorate?.trim();
  const hasCheckoutDraftSignal = Boolean(
    formData.customerName?.trim() ||
    formData.phone?.trim() ||
    formData.email?.trim() ||
    formData.address?.trim() ||
    formData.city?.trim() ||
    trimmedGovernorate ||
    formData.notes?.trim(),
  );
  const requiresShippingSelection = subtotal > 0 && !trimmedGovernorate;
  const isPhoneValid = isValidStorefrontPhone(formData.phone || '');
  const isEmailValid = !formData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const variant = normalizeVariant(section?.variant);
  const isMarketPayment = variant === 'market-payment';
  const isNaturePayment = variant === 'nature-payment';
  const isCommandPayment = variant === 'command-payment';
  const isBoutiquePayment = variant === 'boutique-payment';
  const isWomenFashionPayment = theme.id === 'women-fashion-eg' && isBoutiquePayment;
  const hasNaturePaymentTone = isZenOrganic || isNaturePayment;
  const hasEnhancedPaymentTone =
    isCommandPayment || isBoutiquePayment || isMarketPayment || isNaturePayment;

  const title =
    sectionSettings?.title || (isBiteRush ? 'الدفع الأخير' : 'طريقة الدفع');
  const subtitle =
    sectionSettings?.subtitle ||
    (isBiteRush
      ? 'اختَر وسيلة الدفع، راجع الإجمالي النهائي، ثم اقفل الطلب بخطوة واحدة.'
      : isMarketPayment
        ? 'اختر وسيلة الدفع الأنسب ثم راجع الإجمالي والشحن بخطوة أخيرة واضحة وسريعة.'
      : isNaturePayment
        ? 'اختر وسيلة الدفع المناسبة وسنكمل الطلب بهدوء مع مراجعة واضحة للشحن والإجمالي.'
      : isCommandPayment
        ? 'اختر وسيلة الدفع الأنسب وسنراجع الشحن النهائي قبل اعتماد الطلب.'
      : isBoutiquePayment
        ? 'اختاري الطريقة الأنسب، ثم نكمل الطلب بهدوء مع مراجعة أخيرة واضحة.'
      : 'اختر طريقة الدفع المناسبة وأكمل الطلب بعد مراجعة الشحن والإجمالي.');
  const summaryTitle =
    sectionSettings?.summaryTitle || (isBiteRush ? 'آخر مراجعة قبل الإرسال' : 'ملخص الطلب');
  const summaryDescription =
    sectionSettings?.summaryDescription ||
    (isBiteRush
      ? 'السعر، الشحن، والخصم ظاهرين بوضوح قبل ما تضغط تأكيد.'
      : isMarketPayment
        ? 'ملخص واضح للسعر، الشحن، والخصم قبل تأكيد الطلب النهائي.'
      : isNaturePayment
        ? 'الملخص يظل هادئًا وواضحًا قبل اعتماد الطلب بشكل نهائي.'
      : isCommandPayment
        ? 'السعر النهائي يشمل الشحن الفعلي والخصم ويظهر بوضوح قبل التأكيد.'
      : isBoutiquePayment
        ? 'الملخص يظل واضحًا وهادئًا قبل اعتماد الطلب النهائي.'
      : 'ملخص مباشر يعرض السعر، الشحن، وأي خصم قبل تأكيد الطلب.');
  const confirmOrderText =
    sectionSettings?.confirmOrderText ||
    (isBiteRush
      ? 'أكّد الطلب الآن'
      : isCommandPayment
        ? 'اعتماد الطلب'
        : isMarketPayment
          ? 'تأكيد الطلب'
          : 'تأكيد الطلب');
  const payButtonPrefix =
    sectionSettings?.payButtonPrefix || (isBiteRush ? 'ادفع الآن' : 'ادفع');
  const processingText =
    sectionSettings?.processingText ||
    (isBiteRush ? 'جارٍ تثبيت الطلب وإرساله للمطبخ...' : 'جارٍ إرسال الطلب...');
  const shippingPromptText =
    sectionSettings?.shippingPromptText ||
    (isBiteRush ? 'اختر المحافظة أولًا لنثبت رسوم التوصيل قبل الإرسال.' : 'اختر المحافظة أولًا لحساب الشحن.');
  const enterGovernorateText =
    sectionSettings?.enterGovernorateText || 'اختر المحافظة';
  const subtotalLabel =
    sectionSettings?.subtotalLabel || 'المجموع الفرعي';
  const shippingLabel =
    sectionSettings?.shippingLabel || 'الشحن';
  const totalLabel =
    sectionSettings?.totalLabel || 'الإجمالي';
  const calculatingText =
    sectionSettings?.calculatingText || 'جارٍ الحساب...';
  const shippingCalculatedText =
    sectionSettings?.shippingCalculatedText ||
    (isBiteRush
      ? 'رسوم التوصيل إلى {{governorate}} ظهرت في الإجمالي.'
      : 'تم حساب الشحن إلى {{governorate}} بنجاح.');
  const noShippingChargeText =
    sectionSettings?.noShippingChargeText ||
    (isBiteRush
      ? 'لا توجد رسوم توصيل مضافة لهذه المنطقة حاليًا.'
      : 'لا توجد تكلفة شحن مضافة لهذه المحافظة حاليًا.');
  const shippingErrorText =
    sectionSettings?.shippingErrorText ||
    (isBiteRush
      ? 'تعذر تحديث رسوم التوصيل الآن، وسنؤكدها معك قبل التنفيذ.'
      : 'تعذر حساب الشحن الآن وسيتم تأكيده مع الطلب.');
  const governorateRequiredText =
    sectionSettings?.governorateRequiredText ||
    'اختيار المحافظة مطلوب قبل تأكيد الطلب.';
  const invalidEmailText =
    sectionSettings?.invalidEmailText ||
    'صيغة البريد الإلكتروني غير صحيحة. اتركه فارغًا أو أدخل عنوان صحيح.';
  const invalidPhoneText =
    sectionSettings?.invalidPhoneText ||
    'رقم الهاتف غير صحيح. يرجى إدخال رقم هاتف صحيح (مثال: 01xxxxxxxxx أو +201xxxxxxxxx).';
  const securityText =
    sectionSettings?.securityText ||
    (isBiteRush
      ? 'تأكيد مشفّر وبياناتك محفوظة'
      : isMarketPayment
        ? 'بياناتك محفوظة والتأكيد النهائي يمر بمراجعة واضحة قبل التنفيذ'
      : isNaturePayment
        ? 'بياناتك محفوظة ومراجعة الطلب تتم بهدوء قبل التنفيذ'
      : isCommandPayment
        ? 'بياناتك محفوظة والتأكيد النهائي يمر بمراجعة سريعة قبل التنفيذ'
      : isBoutiquePayment
        ? 'بياناتك محفوظة والتأكيد النهائي يمر بهدوء قبل التنفيذ'
        : 'دفع آمن ومشفّر');
  const assuranceBadge = (sectionSettings?.assuranceBadge as string) || 'طمأنة قبل الدفع';
  const assuranceTitle =
    (sectionSettings?.assuranceTitle as string) ||
    (isMarketPayment
      ? 'قبل ما تؤكد، نراجع الطلب والعنوان والشحن النهائي بخطوات واضحة.'
      : isNaturePayment
        ? 'قبل ما تؤكد، نراجع الطلب والشحن النهائي بهدوء ووضوح.'
        : 'قبل ما تؤكد، نراجع الطلب والعنوان والشحن النهائي خطوة بخطوة.');
  const assuranceItems = parseListSetting(sectionSettings?.assuranceItems, [
    ...(isMarketPayment
      ? [
          'نراجع العنوان وبيانات التواصل',
          'نثبت تكلفة الشحن حسب المحافظة',
          'نرسل متابعة واضحة حتى الاستلام',
        ]
      : isNaturePayment
        ? [
            'نراجع البيانات والعنوان بهدوء',
            'نثبت الشحن النهائي بشكل واضح',
            'نرسل متابعة لطيفة حتى الاستلام',
          ]
        : [
            'نراجع العنوان والموديل المطلوب',
            'نثبت تكلفة الشحن حسب المحافظة',
            'نرسل متابعة واضحة حتى الاستلام',
          ]),
  ]);
  const postConfirmStepsTitle =
    (sectionSettings?.postConfirmStepsTitle as string) || 'بعد تأكيد الطلب';
  const postConfirmSteps = parseListSetting(sectionSettings?.postConfirmSteps, [
    ...(isMarketPayment
      ? [
          'يصلك رقم الطلب فورًا',
          'نراجع التجهيز والعنوان النهائي',
          'ننسق معك الشحن أو التأكيد الأخير',
        ]
      : isNaturePayment
        ? [
            'يصلك رقم الطلب فورًا',
            'نراجع التغليف والتجهيز المناسب',
            'نشاركك تحديثات حتى التسليم',
          ]
        : [
            'يصلك رقم الطلب فورًا',
            'نراجع توفر القطع والتجهيز',
            'ننسق معك الشحن أو التأكيد النهائي',
        ]),
  ]);
  const {
    shippingCost,
    freeShippingDiscount,
    shippingMessage,
    isShippingLoading,
    quantityOfferFreeShippingActive,
    quantityOfferFreeShippingText,
    freeShippingActive: checkoutFreeShippingActive,
  } = useCheckoutShippingQuote({
    shippingPromptText,
    shippingCalculatedText,
    noShippingChargeText,
    shippingErrorText,
    storefrontLoadingText: hasNaturePaymentTone
      ? 'سيتم حساب الشحن بمجرد اكتمال تحميل بيانات المتجر.'
      : 'Shipping will be calculated once storefront details finish loading.',
  });
  const shipping = shippingCost;

  // مزايا مستوى الولاء (شحن مجاني + خصم تلقائي) — كل نظام مستقل (ممكن يشتغلوا مع بعض)
  const tierProgress = useCheckoutStore((s) => s.tierProgress);
  const tiersEnabled = tierProgress?.tiersEnabled === true;
  const autoDiscountEnabled = tierProgress?.autoDiscountEnabled === true;
  const loyaltyFreeShipping = tiersEnabled ? Boolean(tierProgress?.rewards?.freeShipping) : false;
  const loyaltyDiscountPercent = tiersEnabled ? Number(tierProgress?.rewards?.discountPercent || 0) : 0;
  let loyaltyDiscount =
    loyaltyDiscountPercent > 0 ? (Number(subtotal) || 0) * (loyaltyDiscountPercent / 100) : 0;
  let voucherDiscount =
    autoDiscountEnabled && tierProgress?.activeVoucher
      ? (Number(subtotal) || 0) * (Number(tierProgress.activeVoucher.percent) / 100)
      : 0;
  // مطابقة منطق الباك-إند: دمج الخصم حسب discountCombination + حد أقصى
  const combination = tierProgress?.discountCombination || 'ADDITIVE';
  const maxTotalPct = Number(tierProgress?.maxTotalDiscountPercent || 0);
  const base = Number(subtotal) || 0;
  let combined = 0;
  if (combination === 'BEST') {
    combined = Math.max(loyaltyDiscount, voucherDiscount);
  } else if (combination === 'COMPOUND') {
    const lp = base > 0 ? (loyaltyDiscount / base) * 100 : 0;
    const vp = base > 0 ? (voucherDiscount / base) * 100 : 0;
    combined = base * (1 - (1 - lp / 100) * (1 - vp / 100));
  } else {
    combined = loyaltyDiscount + voucherDiscount;
  }
  if (maxTotalPct > 0) {
    const cap = base * (maxTotalPct / 100);
    if (combined > cap) combined = cap;
  }
  if (combined !== loyaltyDiscount + voucherDiscount) {
    loyaltyDiscount = combined;
    voucherDiscount = 0;
  }
  const effectiveShipping =
    loyaltyFreeShipping && Number(shipping) > 0 ? 0 : Number(shipping);

  const total = Math.max(0, subtotal + effectiveShipping - couponDiscount - loyaltyDiscount - voucherDiscount - walletDiscount);
  const summaryShippingValueText = (() => {
    if (isShippingLoading) {
      return calculatingText;
    }

    if (quantityOfferFreeShippingActive) {
      return quantityOfferFreeShippingText.replace(/\.$/, '');
    }

    if (loyaltyFreeShipping && Number(shipping) > 0) {
      return 'مجاني (مستوى الولاء)';
    }

    if (!trimmedGovernorate) {
      return enterGovernorateText;
    }

    if (checkoutFreeShippingActive) {
      return freeShippingDiscount > 0
        ? `-${formatStorefrontCurrency(freeShippingDiscount, currency)}`
        : noShippingChargeText;
    }

    return formatStorefrontCurrency(shipping, currency);
  })();
  const showSummaryCard =
    !isKhemetLuxe && parseBooleanSetting(sectionSettings?.showSummaryCard, true);
  const showHeaderBadge = parseBooleanSetting(
    sectionSettings?.showHeaderBadge,
    hasEnhancedPaymentTone,
  );
  const showAssuranceCard = parseBooleanSetting(
    sectionSettings?.showAssuranceCard,
    hasEnhancedPaymentTone,
  );
  const showNextSteps = parseBooleanSetting(
    sectionSettings?.showNextSteps,
    hasEnhancedPaymentTone,
  );
  const showCompactInlineSummary = isWomenFashionPayment && !showSummaryCard;
  const methodCardClassName = (active: boolean) =>
    `${getMethodCardClassName(variant, active)}${
      isBiteRush
        ? ` border-[#f8c08c] ${
            active
              ? 'bg-[linear-gradient(135deg,#fff4e8_0%,#ffe0c3_100%)] shadow-[0_22px_54px_-40px_rgba(247,115,22,0.5)]'
              : 'bg-[linear-gradient(135deg,#fffdfb_0%,#fff6ec_100%)] shadow-[0_18px_40px_-36px_rgba(247,115,22,0.18)] hover:border-[#f97316] hover:bg-white'
          }`
        : isAirlume
        ? ' border-primary/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.76))] shadow-[0_18px_54px_-44px_rgba(15,23,42,0.28)] hover:border-primary/24 hover:bg-white'
        : isKhemetLuxe
          ? ` border-[#d9c8ad] ${
              active
                ? 'bg-[#fcf7ee] shadow-none ring-0'
                : 'bg-white shadow-none hover:border-[#b89255] hover:bg-[#fcf8f2]'
            } rounded-[0.7rem]`
        : hasNaturePaymentTone
          ? ' border-[#dbe3d4] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,246,241,0.92))] shadow-[0_18px_52px_-44px_rgba(26,51,40,0.2)] hover:border-[#88a876] hover:bg-white'
          : isMarketPayment
            ? ` border-[#f0d4b0] ${
                active
                  ? 'bg-[linear-gradient(135deg,#fff6ea_0%,#ffe8cb_100%)] shadow-[0_22px_54px_-40px_rgba(154,93,34,0.22)] ring-0'
                  : 'bg-white/96 shadow-[0_18px_48px_-42px_rgba(154,93,34,0.1)] hover:border-[#c9874a] hover:bg-[#fffaf3]'
              }`
          : isBoutiquePayment
            ? ` border-[#ead8cf] ${
                active
                  ? 'bg-[linear-gradient(135deg,#fff3ef_0%,#ffe7e1_100%)] shadow-[0_22px_54px_-40px_rgba(107,33,49,0.18)] ring-0'
                  : 'bg-white/96 shadow-[0_18px_48px_-42px_rgba(107,33,49,0.1)] hover:border-[#d77d6a] hover:bg-[#fff8f5]'
              }`
          : isCommandPayment
            ? ` border-[#ead8b1] ${
                active
                  ? 'bg-[linear-gradient(135deg,#fff6df_0%,#fff1cf_100%)] shadow-[0_22px_54px_-40px_rgba(90,62,24,0.26)] ring-0'
                  : 'bg-white/96 shadow-[0_18px_48px_-42px_rgba(90,62,24,0.12)] hover:border-[#d4a64a] hover:bg-[#fffaf0]'
              }`
        : ''
    }`;
  const summaryWrapperClassName = `${getSummaryWrapperClassName(variant)}${
    isWomenFashionPayment
      ? ' rounded-[1.35rem] p-3.5 shadow-[0_18px_52px_-46px_rgba(107,33,49,0.12)]'
      : isBiteRush
      ? ' border-[#f8c08c] bg-[linear-gradient(180deg,#fffaf4_0%,#fff1e4_100%)] shadow-[0_28px_80px_-60px_rgba(247,115,22,0.34)]'
      : isAirlume
      ? ' border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.84))] shadow-[0_28px_80px_-60px_hsl(var(--primary)/0.42)]'
      : isKhemetLuxe
        ? ' bg-transparent shadow-none p-0'
      : hasNaturePaymentTone
        ? ' border-[#dbe3d4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,247,242,0.96))] shadow-[0_28px_80px_-60px_rgba(26,51,40,0.24)]'
        : isMarketPayment
          ? ' border-[#f0d4b0] bg-[linear-gradient(180deg,#fffdf8_0%,#fff6ec_100%)] shadow-[0_28px_80px_-60px_rgba(154,93,34,0.16)]'
        : isBoutiquePayment
          ? ' border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfc_0%,#fff7f4_100%)] shadow-[0_28px_80px_-60px_rgba(107,33,49,0.14)]'
        : isCommandPayment
          ? ' border-[#ead8b1] bg-[linear-gradient(180deg,#fffdf9_0%,#fff7e9_100%)] shadow-[0_28px_80px_-60px_rgba(90,62,24,0.22)]'
      : ''
  }`;
  const confirmButtonClassName = isWomenFashionPayment
    ? 'h-12 rounded-full border-none bg-[linear-gradient(135deg,#3d2a2f_0%,#8f4d41_100%)] text-sm font-black text-white shadow-[0_22px_70px_-34px_rgba(107,33,49,0.28)] transition-all hover:opacity-95 active:scale-[0.98] sm:h-13 sm:text-base'
    : isBiteRush
      ? 'h-14 rounded-full border-none bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-base font-black text-white shadow-[0_28px_90px_-34px_rgba(239,68,68,0.62)] transition-all hover:shadow-[0_34px_94px_-30px_rgba(249,115,22,0.72)] active:scale-[0.98]'
    : isAirlume
      ? 'h-14 rounded-full border-none bg-[linear-gradient(135deg,#0f172a_0%,hsl(var(--primary))_58%,#60a5fa_100%)] text-base font-black text-white shadow-[0_28px_90px_-40px_hsl(var(--primary)/0.7)] transition-all hover:opacity-95 active:scale-[0.98]'
      : isKhemetLuxe
        ? 'h-13 rounded-[0.85rem] border-none bg-[linear-gradient(135deg,#2c241b_0%,#7b6030_48%,#b89255_100%)] text-sm font-black text-white shadow-none transition-all hover:opacity-95 active:scale-[0.98] sm:h-14 sm:text-base'
      : hasNaturePaymentTone
        ? 'h-14 rounded-full border-none bg-[linear-gradient(135deg,#1a3328_0%,#476343_100%)] text-base font-black text-white shadow-[0_28px_80px_-36px_rgba(26,51,40,0.52)] transition-all hover:opacity-95 active:scale-[0.98]'
        : isMarketPayment
          ? 'h-14 rounded-full border-none bg-[linear-gradient(135deg,#6b4423_0%,#c9874a_100%)] text-base font-black text-white shadow-[0_28px_80px_-36px_rgba(154,93,34,0.34)] transition-all hover:opacity-95 active:scale-[0.98]'
        : isBoutiquePayment
          ? 'h-14 rounded-full border-none bg-[linear-gradient(135deg,#3d2a2f_0%,#8f4d41_100%)] text-base font-black text-white shadow-[0_28px_90px_-36px_rgba(107,33,49,0.3)] transition-all hover:opacity-95 active:scale-[0.98]'
        : isCommandPayment
          ? 'h-14 rounded-full border-none bg-[linear-gradient(135deg,#1f1f1b_0%,#725523_52%,#d5ac58_100%)] text-base font-black text-white shadow-[0_28px_90px_-36px_rgba(90,62,24,0.48)] transition-all hover:opacity-95 active:scale-[0.98]'
        : 'h-14 text-base font-bold shadow-xl shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98]';
  const validationBoxClassName = isWomenFashionPayment
    ? 'space-y-2 rounded-[1.2rem] border border-rose-200 bg-[linear-gradient(135deg,#fff9f8_0%,#fff1ee_100%)] p-3.5'
    : isBiteRush
      ? 'space-y-2 rounded-[1.4rem] border border-rose-200 bg-[linear-gradient(135deg,#fff5f5_0%,#fff0ef_100%)] p-4'
    : isMarketPayment
      ? 'space-y-2 rounded-[1.4rem] border border-rose-200 bg-[linear-gradient(135deg,#fffaf8_0%,#fff2ea_100%)] p-4'
    : hasNaturePaymentTone
      ? 'space-y-2 rounded-[1.4rem] border border-rose-200 bg-[linear-gradient(135deg,#f8fbf7_0%,#f1f6ee_100%)] p-4'
    : isBoutiquePayment
      ? 'space-y-2 rounded-[1.4rem] border border-rose-200 bg-[linear-gradient(135deg,#fff9f8_0%,#fff1ee_100%)] p-4'
    : isCommandPayment
      ? 'space-y-2 rounded-[1.4rem] border border-rose-200 bg-[linear-gradient(135deg,#fff7f4_0%,#fff2ef_100%)] p-4'
    : 'space-y-2 rounded-[var(--radius)] border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20';
  const assuranceCardClassName = isWomenFashionPayment
    ? 'rounded-[1.4rem] border border-[#ead8cf] bg-[linear-gradient(135deg,#fffaf8_0%,#fff1ed_100%)] p-4 shadow-[0_18px_54px_-44px_rgba(107,33,49,0.12)]'
    : isKhemetLuxe
      ? 'rounded-[0.95rem] border border-[#e7ddd0] bg-transparent p-0 shadow-none'
    : isCommandPayment
      ? 'rounded-[1.7rem] border border-[#ead8b1] bg-[linear-gradient(135deg,#fffaf0_0%,#fff2d8_100%)] p-5 shadow-[0_22px_70px_-56px_rgba(90,62,24,0.18)]'
    : isBoutiquePayment
      ? 'rounded-[1.7rem] border border-[#ead8cf] bg-[linear-gradient(135deg,#fffaf8_0%,#fff1ed_100%)] p-5 shadow-[0_22px_70px_-56px_rgba(107,33,49,0.14)]'
      : isMarketPayment
        ? 'rounded-[1.7rem] border border-[#f0d4b0] bg-[linear-gradient(135deg,#fffaf3_0%,#fff0de_100%)] p-5 shadow-[0_22px_70px_-56px_rgba(154,93,34,0.14)]'
        : hasNaturePaymentTone
          ? 'rounded-[1.7rem] border border-[#dbe3d4] bg-[linear-gradient(135deg,#fbfdf9_0%,#eef5ea_100%)] p-5 shadow-[0_22px_70px_-56px_rgba(26,51,40,0.14)]'
          : '';
  const nextStepsCardClassName = isWomenFashionPayment
    ? 'rounded-[1.3rem] border border-[#ead8cf] bg-white/95 p-3.5 shadow-[0_16px_44px_-40px_rgba(107,33,49,0.1)]'
    : isKhemetLuxe
      ? 'rounded-[0.95rem] border border-[#e7ddd0] bg-transparent p-0 shadow-none'
    : isCommandPayment
      ? 'rounded-[1.5rem] border border-[#ead8b1] bg-white/95 p-4 shadow-[0_18px_50px_-42px_rgba(90,62,24,0.16)]'
    : isBoutiquePayment
      ? 'rounded-[1.5rem] border border-[#ead8cf] bg-white/95 p-4 shadow-[0_18px_50px_-42px_rgba(107,33,49,0.12)]'
      : isMarketPayment
        ? 'rounded-[1.5rem] border border-[#f0d4b0] bg-white/95 p-4 shadow-[0_18px_50px_-42px_rgba(154,93,34,0.12)]'
        : hasNaturePaymentTone
          ? 'rounded-[1.5rem] border border-[#dbe3d4] bg-white/95 p-4 shadow-[0_18px_50px_-42px_rgba(26,51,40,0.12)]'
          : '';
  const surfaceClassName = `${showCompactInlineSummary ? 'space-y-5' : 'space-y-6'}${
    isWomenFashionPayment
      ? ' rounded-[1.85rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f5_52%,#ffffff_100%)] p-4 shadow-[0_28px_86px_-72px_rgba(107,33,49,0.14)] sm:p-5'
      : isBiteRush
        ? ' rounded-[2rem] border border-[#f7b77d] bg-[linear-gradient(135deg,#fff8f1_0%,#ffffff_45%,#ffe4ce_100%)] p-5 shadow-[0_34px_110px_-78px_rgba(247,115,22,0.48)] sm:p-6'
      : isAirlume
      ? ' rounded-[2rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] p-5 shadow-[0_34px_110px_-78px_hsl(var(--primary)/0.4)] sm:p-6'
      : isKhemetLuxe
        ? ' bg-transparent shadow-none p-0 space-y-10'
      : hasNaturePaymentTone
          ? ' rounded-[2rem] border border-[#dbe3d4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,247,242,0.98))] p-5 shadow-[0_34px_110px_-78px_rgba(26,51,40,0.26)] sm:p-6'
          : isMarketPayment
            ? ' rounded-[2.1rem] border border-[#f0d4b0] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7ef_52%,#ffffff_100%)] p-5 shadow-[0_34px_110px_-78px_rgba(154,93,34,0.16)] sm:p-6'
            : isBoutiquePayment
              ? ' rounded-[2.1rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f5_52%,#ffffff_100%)] p-5 shadow-[0_34px_110px_-78px_rgba(107,33,49,0.14)] sm:p-6'
            : isCommandPayment
              ? ' rounded-[2.2rem] border border-[#ead8b1] bg-[linear-gradient(180deg,#fffdf9_0%,#fff8ec_52%,#ffffff_100%)] p-5 shadow-[0_34px_110px_-78px_rgba(90,62,24,0.18)] sm:p-6'
              : ''
  }`;
  const titleClassName = isWomenFashionPayment
    ? 'font-heading text-base font-bold text-foreground sm:text-lg'
    : isKhemetLuxe
      ? 'font-heading text-[1.12rem] font-bold text-foreground sm:text-[1.18rem]'
    : 'font-heading text-lg font-bold text-foreground';
  const subtitleClassName = isWomenFashionPayment
    ? 'text-sm leading-5 text-muted-foreground'
    : isKhemetLuxe
      ? 'text-sm leading-6 text-[#6f6455]'
    : 'text-sm leading-6 text-muted-foreground';
  const methodStackClassName = isWomenFashionPayment ? 'space-y-2.5' : 'space-y-3';
  const inlineSummaryClassName = isWomenFashionPayment
    ? 'rounded-[1.2rem] border border-[#ead8cf] bg-white/96 p-3.5 shadow-[0_16px_42px_-38px_rgba(107,33,49,0.1)]'
    : summaryWrapperClassName;

  const checkoutFingerprint = useMemo(
    () => items.map((item) => `${item.id}:${item.quantity}:${item.price}`).join('|'),
    [items],
  );

  useEffect(() => {
    if (checkoutDraftTimerRef.current) {
      clearTimeout(checkoutDraftTimerRef.current);
    }

    if (!items.length || !hasCheckoutDraftSignal) {
      return undefined;
    }

    checkoutDraftTimerRef.current = setTimeout(() => {
      void storefrontApi.saveCheckoutDraft({
        customerName: formData.customerName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        governorate: formData.governorate,
        notes: formData.notes,
        paymentMethod,
        couponCode: activeCoupon?.code || undefined,
        shippingCost: shipping,
        subtotal,
        total,
        attribution: getOrderAttributionPayload(storefrontSettings?.companyId) || undefined,
        items: items.map((item) => ({
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
    activeCoupon?.code,
    formData.address,
    formData.city,
    formData.customerName,
    formData.email,
    formData.governorate,
    formData.notes,
    formData.phone,
    hasCheckoutDraftSignal,
    items,
    paymentMethod,
    shipping,
    subtotal,
    total,
  ]);

  useEffect(() => {
    if (!items.length || subtotal <= 0 || !checkoutFingerprint) {
      return;
    }

    if (trackedCheckoutFingerprintRef.current === checkoutFingerprint) {
      return;
    }

    const eventId = trackInitiateCheckoutEvent({
      items: items.map((item) => ({
        id: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      total: subtotal,
    });

    if (eventId !== undefined) {
      trackedCheckoutFingerprintRef.current = checkoutFingerprint;
    }

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'checkout_payment_view',
      dedupeKey: `checkout-payment-view:${checkoutFingerprint}`,
      metadata: {
        subtotal,
        itemCount: items.length,
      },
    });
  }, [checkoutFingerprint, items, storefrontSettings, subtotal, trackInitiateCheckoutEvent]);

  useEffect(() => {
    if (isShippingLoading || !trimmedGovernorate || quantityOfferFreeShippingActive) {
      return;
    }

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'shipping_quote_calculated',
      dedupeKey: `shipping-quote:${storefrontSettings?.company?.id || 'store'}:${trimmedGovernorate}:${subtotal}`,
      metadata: {
        governorate: trimmedGovernorate,
        shippingCost: shipping,
        subtotal,
      },
    });
  }, [
    isShippingLoading,
    quantityOfferFreeShippingActive,
    shipping,
    storefrontSettings,
    storefrontSettings?.company?.id,
    subtotal,
    trimmedGovernorate,
  ]);

  useEffect(() => {
    if (orderSuccess) {
      const resolvedOrderId = orderSuccess.orderNumber || orderSuccess.id || 'success';
      const postPurchaseOffer = (storefrontSettings as any)?.designTokens?.postPurchaseOffer;
      const isOfferActive = Boolean(
        postPurchaseOffer?.enabled &&
        postPurchaseOffer?.productId
      );

      const targetRoute = isOfferActive ? '/order-offer' : '/thank-you';
      const nextPath = buildStorefrontPath(
        location.pathname,
        `${targetRoute}?orderId=${encodeURIComponent(resolvedOrderId)}`,
        location.search,
      );
      navigate(nextPath, {
        state: orderSuccess.purchaseTracking
          ? { purchaseTracking: orderSuccess.purchaseTracking }
          : null,
      });
    }
  }, [location.pathname, location.search, navigate, orderSuccess, storefrontSettings]);

  const validateForm = useCallback((): { errors: string[]; firstInvalidFieldId?: string } => {
    const errors: string[] = [];
    let firstInvalidFieldId: string | undefined;

    if (!formData.customerName?.trim()) {
      errors.push('يرجى إدخال الاسم الكامل.');
      if (!firstInvalidFieldId) firstInvalidFieldId = 'checkout-customer-name';
    }
    if (!formData.phone?.trim()) {
      errors.push('يرجى إدخال رقم الهاتف.');
      if (!firstInvalidFieldId) firstInvalidFieldId = 'checkout-phone';
    } else if (!isPhoneValid) {
      errors.push('رقم الهاتف غير صحيح. يرجى إدخال رقم هاتف صحيح (مثال: 01xxxxxxxxx أو +201xxxxxxxxx).');
      if (!firstInvalidFieldId) firstInvalidFieldId = 'checkout-phone';
    }
    if (!formData.address?.trim()) {
      errors.push('يرجى إدخال عنوان الشحن.');
      if (!firstInvalidFieldId) firstInvalidFieldId = 'checkout-address';
    }
    if (!trimmedGovernorate) {
      errors.push('يرجى اختيار المحافظة.');
      if (!firstInvalidFieldId) firstInvalidFieldId = 'checkout-governorate';
    }
    if (!isEmailValid) {
      errors.push('صيغة البريد الإلكتروني غير صحيحة. اتركه فارغًا أو أدخل عنوان صحيح.');
      if (!firstInvalidFieldId) firstInvalidFieldId = 'checkout-email';
    }
    return { errors, firstInvalidFieldId };
  }, [formData.customerName, formData.phone, formData.address, trimmedGovernorate, isPhoneValid, isEmailValid]);

  const handlePlaceOrder = async () => {
    const { errors, firstInvalidFieldId } = validateForm();
    if (paymentMethod === 'wallet') {
      if (walletProofUploading) {
        errors.push('جارٍ رفع صورة الإيصال، انتظر قليلًا.');
      } else if (!walletProofImageUrl) {
        errors.push('يرجى رفع صورة إيصال التحويل لإتمام الدفع بالمحفظة.');
      }
    }
    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.error(errors[0]);
      if (firstInvalidFieldId) {
        const el = document.getElementById(firstInvalidFieldId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      } else if (paymentMethod === 'wallet' && !walletProofImageUrl) {
        walletFileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    setValidationErrors([]);

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'order_submit_attempt',
      metadata: {
        paymentMethod,
        subtotal,
        shippingCost: effectiveShipping,
        discountAmount: couponDiscount + loyaltyDiscount + walletDiscount,
        total,
        couponApplied: Boolean(activeCoupon?.code),
        loyaltyTier: tierProgress?.tier?.nameAr || tierProgress?.tier?.name || null,
      },
    });

    await placeOrder({
      ...formData,
      paymentMethod,
      couponCode: activeCoupon?.code,
      shippingCost: effectiveShipping,
      subtotal,
      total,
      redeemPoints: usePoints,
      useWallet: useCashback,
      walletAmount: useCashback ? Math.min(Number(tierProgress?.walletBalance || 0), subtotal + effectiveShipping) : 0,
      ...(paymentMethod === 'wallet' && walletProofImageUrl
        ? {
            walletProof: {
              imageUrl: walletProofImageUrl,
              walletNumber: walletPaymentSettings?.walletNumber || undefined,
              transferRef: walletTransferRef.trim() || undefined,
            },
          }
        : {}),
    });
  };

  const allMethodOptions: {
    id: 'cod' | 'card' | 'wallet';
    label: string;
    icon: string;
    desc: string;
  }[] = [
    {
      id: 'cod',
      label: (sectionSettings?.codLabel as string) || 'الدفع عند الاستلام',
      icon: '💵',
      desc:
        (sectionSettings?.codDesc as string) ||
        (isBiteRush
          ? 'اطلب الآن وادفع عند الاستلام من غير أي خطوة إضافية'
          : isMarketPayment
            ? 'اختيار واضح وسهل للطلبات التي تريد تأكيدها عند الاستلام'
          : hasNaturePaymentTone
            ? 'اختيار مريح لو تحب تثبيت الطلب أولًا ثم الدفع عند الاستلام'
          : isCommandPayment
            ? 'الأفضل للطلبات عالية القيمة مع دفع عند الاستلام بعد التأكيد'
          : 'ادفع كاش عند وصول الطلب لباب بيتك'),
    },
    {
      id: 'card',
      label: (sectionSettings?.cardLabel as string) || 'بطاقة ائتمان / خصم',
      icon: '💳',
      desc:
        (sectionSettings?.cardDesc as string) ||
        (isBiteRush
          ? 'ادفع فورًا وخلي الطلب يدخل التحضير مباشرة'
          : isMarketPayment
            ? 'لو تريد إنهاء أسرع وخطوة أقل قبل بدء التجهيز'
          : hasNaturePaymentTone
            ? 'اختيار هادئ لتأكيد أسرع مع مراجعة أقل بعد الطلب'
          : isCommandPayment
            ? 'أنسب لو تريد تسريع تجهيز الطلب والدخول مباشرة في التنفيذ'
          : 'فيزا، ماستركارد، أو أي بطاقة محفوظة'),
    },
    {
      id: 'wallet',
      label:
        (sectionSettings?.walletLabel as string) ||
        (walletPaymentSettings?.recipientName
          ? `تحويل على ${walletPaymentSettings.recipientName}`
          : 'الدفع بالمحفظة (تحويل + رفع إيصال)'),
      icon: '📱',
      desc:
        (sectionSettings?.walletDesc as string) ||
        (walletPaymentSettings?.walletNumber
          ? `حوّل المبلغ على ${walletPaymentSettings.walletNumber} ثم ارفع صورة الإيصال`
          : 'حوّل المبلغ على رقم المحفظة ثم ارفع صورة الإيصال لإثبات الدفع'),
    },
  ];

  const themeEnabledMethods = Array.isArray(sectionSettings?.enabledMethods)
    ? (sectionSettings?.enabledMethods as string[])
    : [];
  const enabledMethods = (dbEnabledMethods && dbEnabledMethods.length > 0 ? dbEnabledMethods : themeEnabledMethods) || [];
  const enabledIds: string[] =
    enabledMethods.length > 0 ? enabledMethods : ['cod'];

  const methodOptions = allMethodOptions.filter((method) =>
    method.id === 'wallet'
      ? enabledIds.includes('wallet') && walletEnabled
      : enabledIds.includes(method.id),
  );

  useEffect(() => {
    const firstMethod = methodOptions[0];
    if (firstMethod && !methodOptions.find((method) => method.id === paymentMethod)) {
      setPaymentMethod(firstMethod.id);
    }
  }, [methodOptions, paymentMethod, setPaymentMethod]);

  if (!items.length) {
    return null;
  }

  return (
    <section className="w-full scroll-mt-24 bg-background">
      <div className={surfaceClassName}>
        <div className="space-y-2">
          {showHeaderBadge && assuranceBadge.trim() ? (
            isBiteRush ? (
            <span className="inline-flex rounded-full bg-[#111111] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
              تأكيد الطلب
            </span>
            ) : isMarketPayment ? (
            <span className="inline-flex rounded-full border border-[#f0d4b0] bg-[#fff8ef] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6037]">
              {assuranceBadge}
            </span>
            ) : hasNaturePaymentTone ? (
            <span className="inline-flex rounded-full border border-[#dbe3d4] bg-[#f6f8f2] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4a6843]">
              {assuranceBadge}
            </span>
            ) : isKhemetLuxe ? (
            <span className="inline-flex rounded-full border border-[#d9c8ad] bg-[#fffaf2] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#725523]">
              {assuranceBadge}
            </span>
            ) : isBoutiquePayment ? (
            <span className="inline-flex rounded-full border border-[#f0ddd5] bg-[#fff7f4] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b5f59]">
              {assuranceBadge}
            </span>
            ) : isCommandPayment ? (
            <span className="inline-flex rounded-full border border-[#ead8b1] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#6d5527]">
              {assuranceBadge}
            </span>
            ) : null
          ) : null}
          <h2 className={titleClassName}>{title}</h2>
          <p className={subtitleClassName}>{subtitle}</p>
        </div>

        {showAssuranceCard ? (
          <div className={assuranceCardClassName}>
            <h3 className="text-sm font-black text-foreground">{assuranceTitle}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {assuranceItems.map((item) => (
                <span
                  key={item}
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    isKhemetLuxe
                      ? 'border-[#d9c8ad] bg-white/92 text-[#725523]'
                      : isBoutiquePayment
                      ? 'border-[#ead8cf] bg-white/92 text-[#8b5f59]'
                      : isMarketPayment
                        ? 'border-[#f0d4b0] bg-white/92 text-[#8b6037]'
                        : hasNaturePaymentTone
                          ? 'border-[#dbe3d4] bg-white/92 text-[#4a6843]'
                      : 'border-[#ead8b1] bg-white/92 text-[#6d5527]'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {walletDiscountEnabled && walletDiscountPercent > 0 && showWalletDiscountBadge ? (
          paymentMethod === 'card' || (paymentMethod === 'wallet' && walletEnabled) ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-300 bg-emerald-100/70 p-3 text-xs font-semibold text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              <span className="text-base shrink-0">🎉</span>
              <span>
                تم تطبيق خصم الدفع الإلكتروني ({walletDiscountPercent}%) بنجاح! وفّرت {formatStorefrontCurrency(walletDiscount, currency)}.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
              <span className="text-base shrink-0">🎁</span>
              <span className="leading-relaxed">
                <strong>عرض خاص:</strong> اختر الدفع بالبطاقة أو المحفظة الإلكترونية واحصل على <strong>خصم {walletDiscountPercent}%</strong> فوراً على إجمالي طلبك!
              </span>
            </div>
          )
        ) : null}

        <div className={methodStackClassName}>
          {methodOptions.map((method) => (
            <button
              key={method.id}
              onClick={() => setPaymentMethod(method.id)}
              className={`${methodCardClassName(paymentMethod === method.id)}${
                isWomenFashionPayment ? ' rounded-[1.35rem] p-3.5' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{method.icon}</span>
                <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{method.label}</p>
                    {hasEnhancedPaymentTone && !isKhemetLuxe ? (
                      <span className={`rounded-full border bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${
                        isBoutiquePayment
                          ? 'border-[#ead8cf] text-[#b06456]'
                          : isMarketPayment
                            ? 'border-[#f0d4b0] text-[#a36a34]'
                            : hasNaturePaymentTone
                              ? 'border-[#dbe3d4] text-[#4a6843]'
                              : 'border-[#ead8b1] text-[#8d6a2c]'
                      }`}>
                        {method.id === 'cod'
                          ? isBoutiquePayment
                            ? 'الأهدأ للتسليم'
                            : isMarketPayment
                              ? 'واضح وسهل'
                              : hasNaturePaymentTone
                                ? 'هادئ ومرن'
                            : 'الأكثر استخدامًا'
                          : method.id === 'card'
                            ? isBoutiquePayment
                              ? 'أسرع إتمام'
                              : isMarketPayment
                                ? 'إنهاء أسرع'
                                : hasNaturePaymentTone
                                  ? 'خطوة أنعم'
                              : 'أسرع تجهيز'
                            : isBoutiquePayment
                              ? 'جاهز من الموبايل'
                              : isMarketPayment
                                ? 'سريع من الموبايل'
                                : hasNaturePaymentTone
                                  ? 'سهل من الموبايل'
                              : 'مرن من الموبايل'}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{method.desc}</p>
                  {walletDiscountEnabled &&
                  walletDiscountPercent > 0 &&
                  showWalletDiscountBadge &&
                  (method.id === 'card' || (method.id === 'wallet' && walletEnabled)) ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      🎁 خصم {walletDiscountPercent}% {method.id === 'wallet' ? 'عند الدفع بالمحفظة' : 'عند الدفع بالبطاقة'}
                    </p>
                  ) : null}
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    paymentMethod === method.id ? 'border-primary' : 'border-border'
                  }`}
                >
                  {paymentMethod === method.id ? (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>

        {paymentMethod === 'wallet' && walletEnabled ? (
          <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800/60 dark:bg-emerald-950/20">
            <div className="flex items-start gap-2 text-sm">
              <span className="text-lg">💳</span>
              <div className="text-emerald-900 dark:text-emerald-100">
                <p className="font-bold">حوّل المبلغ على رقم المحفظة ثم ارفع إيصال التحويل</p>
                <p className="mt-1 text-emerald-800 dark:text-emerald-200">
                  رقم المحفظة: <span className="font-black" dir="ltr">{walletPaymentSettings.walletNumber}</span>
                  {walletPaymentSettings.recipientName ? (
                    <> · المستلم: <span className="font-bold">{walletPaymentSettings.recipientName}</span></>
                  ) : null}
                </p>
                {walletPaymentSettings.instructions ? (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{walletPaymentSettings.instructions}</p>
                ) : null}
                {walletDiscountActive && showWalletDiscountBadge ? (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    🎁 هتاخد خصم {walletDiscountPercent}% على طلبك بالدفع بالمحفظة
                  </p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-emerald-900 dark:text-emerald-100">
                صورة إيصال التحويل <span className="text-red-600">*</span>
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
                  جارٍ رفع الإيصال...
                </p>
              ) : walletProofImageUrl ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  تم رفع الإيصال بنجاح
                  <button type="button" onClick={() => walletFileInputRef.current?.click()} className="text-emerald-800 underline dark:text-emerald-200">
                    استبدال
                  </button>
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-emerald-900 dark:text-emerald-100">
                رقم العملية / مرجع التحويل (اختياري)
              </label>
              <input
                type="text"
                value={walletTransferRef}
                onChange={(e) => setWalletTransferRef(e.target.value)}
                placeholder="مثال: 123456789"
                className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:border-emerald-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        ) : null}

        {paymentMethod === 'card' ? (
          <div
            className={`space-y-3 rounded-2xl border p-4 text-xs transition-all ${
              isKhemetLuxe
                ? 'border-[#d9c8ad] bg-[#fcf8f2] text-[#5c4a32]'
                : isWomenFashionPayment
                  ? 'border-[#ead8cf] bg-[#fffaf8] text-[#6d4a46]'
                  : hasNaturePaymentTone
                    ? 'border-[#dbe3d4] bg-[#f8fbf7] text-[#3d5538]'
                    : 'border-border/80 bg-muted/40 text-foreground'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-bold text-sm text-foreground">
                  الدفع الآمن بالبطاقة البنكية (Visa / Mastercard / Meeza)
                </p>
                <p className="leading-relaxed opacity-90">
                  عند الضغط على تأكيد الطلب، سيتم تحويلك مباشرة لصفحة الدفع الآمنة والمشفرة لإدخال بيانات بطاقتك وإتمام العملية بأمان وسرعة.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40 text-[11px] font-medium opacity-80">
              <span className="inline-flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                دفع مشفر 256-bit
              </span>
              <span>•</span>
              <span>معتمد من البنك المركزي المصري</span>
              <span>•</span>
              <span>حماية كاملة للبيانات</span>
            </div>
          </div>
        ) : null}

        {tierProgress?.activeVoucher ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
            <span className="text-xl">🎁</span>
            <div className="text-sm text-emerald-800 dark:text-emerald-200">
              <p className="font-bold">عندك خصم {tierProgress.activeVoucher.percent}% جاهز على طلبك</p>
              <p className="text-emerald-700 dark:text-emerald-300">
                بيتخصم تلقائياً ✓ · صالح حتى {new Date(tierProgress.activeVoucher.expiresAt).toLocaleDateString('ar-EG')}
              </p>
            </div>
          </div>
        ) : Number(tierProgress?.walletBalance) > 0 ? (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <input
                type="checkbox"
                checked={useCashback}
                onChange={(e) => setUseCashback(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              استخدم كاش باكي في الدفع
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatStorefrontCurrency(Number(tierProgress.walletBalance), currency)}</span>
          </label>
        ) : null}

        {tierProgress?.method === 'POINTS' && Number(tierProgress.currentMetric) > 0 ? (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <input
                type="checkbox"
                checked={usePoints}
                onChange={(e) => setUsePoints(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              استخدم نقاطي في خصم الطلب
            </span>
            <span className="font-bold text-amber-700 dark:text-amber-300">{tierProgress.currentMetric} نقطة</span>
          </label>
        ) : null}

        {showSummaryCard ? (
          <div className={summaryWrapperClassName}>
            <div className="mb-3">
              <TierProgressBanner />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {summaryTitle}
              </h3>
              <p className="text-sm text-muted-foreground">{summaryDescription}</p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{subtotalLabel}</span>
              <span className="font-medium text-foreground">
                {formatStorefrontCurrency(subtotal, currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{shippingLabel}</span>
              <span
                className={`font-medium ${
                  (checkoutFreeShippingActive || loyaltyFreeShipping) && trimmedGovernorate && !isShippingLoading
                    ? 'text-emerald-600'
                    : 'text-foreground'
                }`}
              >
                {summaryShippingValueText}
              </span>
            </div>
            {loyaltyDiscount > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {tiersEnabled ? 'خصم مستوى ' : ''}{loyaltyDiscountPercent}%
                </span>
                <span className="font-medium text-emerald-600">
                  -{formatStorefrontCurrency(loyaltyDiscount, currency)}
                </span>
              </div>
            ) : null}
            {voucherDiscount > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  خصم الكوبون ({tierProgress?.activeVoucher?.percent}%)
                </span>
                <span className="font-medium text-emerald-600">
                  -{formatStorefrontCurrency(voucherDiscount, currency)}
                </span>
              </div>
            ) : null}
            {couponDiscount > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {activeCoupon?.name || activeCoupon?.code || 'كوبون'}
                </span>
                <span className="font-medium text-emerald-600">
                  -{formatStorefrontCurrency(couponDiscount, currency)}
                </span>
              </div>
            ) : null}
            {walletDiscount > 0 && showWalletDiscountBadge ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  خصم الدفع الإلكتروني ({walletDiscountPercent}%)
                </span>
                <span className="font-medium text-emerald-600">
                  -{formatStorefrontCurrency(walletDiscount, currency)}
                </span>
              </div>
            ) : null}
            <div className={`mt-2 flex justify-between border-t pt-4 text-lg font-bold ${
              isBoutiquePayment
                ? 'border-[#ead8cf]'
                : isMarketPayment
                  ? 'border-[#f0d4b0]'
                  : hasNaturePaymentTone
                    ? 'border-[#dbe3d4]'
                    : 'border-border'
            }`}>
              <span className="text-foreground">{totalLabel}</span>
              <span
                className={
                  isBoutiquePayment
                    ? 'text-[#8b5f59]'
                    : isMarketPayment
                      ? 'text-[#8b6037]'
                      : hasNaturePaymentTone
                        ? 'text-[#4a6843]'
                        : 'text-primary'
                }
              >
                {formatStorefrontCurrency(total, currency)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{shippingMessage}</p>
            {requiresShippingSelection ? (
              <p className="text-xs font-medium text-amber-600">{governorateRequiredText}</p>
            ) : null}
            {!isEmailValid ? (
              <p className="text-xs font-medium text-amber-600">{invalidEmailText}</p>
            ) : null}
            {!!formData.phone && !isPhoneValid ? (
              <p className="text-xs font-medium text-amber-600">{invalidPhoneText}</p>
            ) : null}
          </div>
        ) : null}

        {showCompactInlineSummary ? (
          <div className={inlineSummaryClassName}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b5f59]">
                  آخر مراجعة
                </p>
                <p className="text-sm text-[#72545b]">
                  {trimmedGovernorate
                    ? `الشحن إلى ${trimmedGovernorate} ظاهر قبل التأكيد.`
                    : 'اختاري المحافظة لظهور الشحن قبل التأكيد.'}
                </p>
              </div>
              <div className="text-end">
                <p className="text-[11px] text-muted-foreground">{totalLabel}</p>
                <p className="text-base font-black text-[#8b5f59]">
                  {formatStorefrontCurrency(total, currency)}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-[0.95rem] border border-[#f1dfdc] bg-[#fffaf8] px-2 py-2">
                <p className="text-muted-foreground">{subtotalLabel}</p>
                <p className="mt-1 font-bold text-foreground">
                  {formatStorefrontCurrency(subtotal, currency)}
                </p>
              </div>
              <div className="rounded-[0.95rem] border border-[#f1dfdc] bg-[#fffaf8] px-2 py-2">
                <p className="text-muted-foreground">{shippingLabel}</p>
                <p
                  className={`mt-1 font-bold ${
                    checkoutFreeShippingActive && trimmedGovernorate && !isShippingLoading
                      ? 'text-emerald-600'
                      : 'text-foreground'
                  }`}
                >
                  {summaryShippingValueText}
                </p>
              </div>
              <div className="rounded-[0.95rem] border border-[#f1dfdc] bg-[#fffaf8] px-2 py-2">
                <p className="text-muted-foreground">الخصم</p>
                <p className="mt-1 font-bold text-foreground">
                  {couponDiscount > 0
                    ? `-${formatStorefrontCurrency(couponDiscount, currency)}`
                    : walletDiscount > 0 && showWalletDiscountBadge
                      ? `-${formatStorefrontCurrency(walletDiscount, currency)}`
                      : 'لا يوجد'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              {shippingMessage || shippingPromptText}
            </p>
          </div>
        ) : null}

        {validationErrors.length > 0 && (
          <div className={validationBoxClassName}>
            {validationErrors.map((error, index) => (
              <p key={index} className="flex items-start gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
                </svg>
                {error}
              </p>
            ))}
          </div>
        )}

        <Button
          fullWidth
          size="lg"
          onClick={handlePlaceOrder}
          disabled={
            isSubmitting ||
            subtotal === 0
          }
          className={confirmButtonClassName}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              {paymentMethod === 'card' ? 'جارٍ تحويلك لبوابة الدفع الآمنة...' : processingText}
            </div>
          ) : paymentMethod === 'cod' ? (
            confirmOrderText
          ) : (
            `${payButtonPrefix} ${formatStorefrontCurrency(total, currency)}`
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {securityText}
        </div>

        {showNextSteps ? (
          <div className={nextStepsCardClassName}>
            <h3 className="text-sm font-black text-foreground">{postConfirmStepsTitle}</h3>
            <div className="mt-3 space-y-2">
              {postConfirmSteps.map((item, index) => (
                <p
                  key={item}
                  className={`flex items-start gap-2 text-sm ${
                    isKhemetLuxe
                      ? 'text-[#6d5a44]'
                      : isBoutiquePayment
                      ? 'text-[#72545b]'
                      : isMarketPayment
                        ? 'text-[#7b5531]'
                        : hasNaturePaymentTone
                          ? 'text-[#4a6843]'
                          : 'text-[#5b4a28]'
                  }`}
                >
                  <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                    isKhemetLuxe
                      ? 'bg-[#f5ead7] text-[#725523]'
                      : isBoutiquePayment
                      ? 'bg-[#fff1ed] text-[#b06456]'
                      : isMarketPayment
                        ? 'bg-[#fff2df] text-[#a36a34]'
                        : hasNaturePaymentTone
                          ? 'bg-[#edf5e8] text-[#4a6843]'
                          : 'bg-[#fff4d8] text-[#8d6a2c]'
                  }`}>
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PaymentSection;
