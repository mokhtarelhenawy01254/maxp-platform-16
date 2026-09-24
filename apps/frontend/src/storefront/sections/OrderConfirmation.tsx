import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { storefrontApi } from '../../utils/storefrontApi';
import { buildStorefrontPath } from '../utils/paths';
import Button from '../components/Button';
import OrderStepTimeline from '../components/OrderStepTimeline';
import PostPurchaseUpsellBlock from '../components/PostPurchaseUpsellBlock';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useStorefrontFacebookTracking } from '../hooks/useStorefrontFacebookTracking';
import { buildCartItemId, useCartStore, type CartItem } from '../store/useCartStore';
import { formatStorefrontCurrency } from '../utils/currency';
import { trackConversionSuiteUsage } from '../utils/conversionSuiteTracking';
import {
  getOrderItemAttributes,
  groupOrderQuantityOfferItems,
  type OrderQuantityOfferItem,
} from '../utils/orderQuantityOffers';
import {
  localizeBiteRushAttributeRecord,
  localizeBiteRushName,
} from '../utils/biteRushCopy';
import {
  getMarketplacePreviewPurchaseTracking,
  getMarketplacePreviewTrackedOrder,
} from '../preview/marketplacePreviewOrder';
import { resolvePreviewThemeId } from '../preview/previewContext';
import { isPharmacyThemeId } from '../utils/pharmacyThemes';
import { isKhemetLuxeTheme } from '../utils/navigationGuards';
import {
  clearStoredPurchaseTracking,
  getStoredPurchaseTracking,
  hasMarkedPurchaseTracked,
  markPurchaseTracked,
} from '../utils/purchaseTrackingStorage';
import { getStatusDisplay } from '../../utils/statusRegistry';

interface PurchaseTrackingItem {
  id: string;
  productId?: string;
  variantId?: string;
  name?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  attributes?: Record<string, string>;
  metadata?: unknown;
  quantityOffer?: {
    groupId?: string;
    offerId?: string;
    offerLabel?: string;
    offerQuantity?: number;
    slotIndex?: number;
    freeShipping?: boolean;
  };
}

interface PurchaseTrackingState {
  eventId?: string;
  orderNumber: string;
  total: number;
  phone?: string;
  customerName?: string;
  paymentMethod?: string;
  items: PurchaseTrackingItem[];
}

interface TrackedOrderSummary {
  orderNumber: string;
  status?: string;
  paymentMethod?: string;
  total?: number;
  finalTotal?: number;
  shippingAddress?: unknown;
  items?: PurchaseTrackingItem[];
  storePromotionDiscount?: number;
  storePromotionLabel?: string;
}

interface OrderConfirmationProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    description?: string;
    continueShoppingText?: string;
    orderNumberPrefix?: string;
    supportText?: string;
    supportEmail?: string;
    whatsappNumber?: string;
    whatsappMessage?: string;
    showTimeline?: boolean;
    showRecommended?: boolean;
    showTrackOrder?: boolean;
    showReorder?: boolean;
    recommendedTitle?: string;
    recommendedSubtitle?: string;
    recommendedLimit?: number | string;
    recommendedBadge?: string;
    recommendedCtaLabel?: string;
    recommendedChooseOptionsLabel?: string;
    recommendedVariantChoicesLabel?: string;
    recommendedVariant?: string;
    statusLabel?: string;
    whatsappSupportLabel?: string;
    trackOrderTitle?: string;
    trackOrderDescription?: string;
    trackOrderButtonText?: string;
    trackOrderPhoneLabel?: string;
    trackOrderPhonePlaceholder?: string;
    reorderTitle?: string;
    reorderDescription?: string;
    reorderButtonText?: string;
    reorderSuccessText?: string;
    [key: string]: unknown;
  };
}

const normalizeOrderConfirmationVariant = (
  value: unknown,
):
  | 'standard'
  | 'market-aftercare'
  | 'nature-aftercare'
  | 'command-aftercare'
  | 'boutique-aftercare'
  | 'soft-thanks' => {
  if (typeof value !== 'string') {
    return 'standard';
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'market-aftercare') {
    return 'market-aftercare';
  }

  if (normalizedValue === 'nature-aftercare') {
    return 'nature-aftercare';
  }

  if (normalizedValue === 'command-aftercare') {
    return 'command-aftercare';
  }

  if (normalizedValue === 'boutique-aftercare') {
    return 'boutique-aftercare';
  }

  if (normalizedValue === 'soft-thanks') {
    return 'soft-thanks';
  }

  return 'standard';
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const getOrderStatusText = (status?: string, t?: (key: string) => string, _prefersArabicCopy = false) => {
  if (!status) return '';
  const info = getStatusDisplay(status);
  return t?.(info.labelKey) || info.label;
};

const getOrderStatusClassName = (status?: string) => {
  if (!status) return 'bg-gray-100 text-gray-800';
  return getStatusDisplay(status).colorClass;
};

const getPaymentMethodText = (value?: string, prefersArabicCopy = false) =>
  ({
    cod: prefersArabicCopy ? 'الدفع عند الاستلام' : 'Cash on delivery',
    cash: prefersArabicCopy ? 'الدفع عند الاستلام' : 'Cash on delivery',
    card: prefersArabicCopy ? 'الدفع بالبطاقة' : 'Card payment',
    credit_card: prefersArabicCopy ? 'الدفع بالبطاقة' : 'Card payment',
    wallet: prefersArabicCopy ? 'المحفظة الرقمية' : 'Digital wallet',
    bank_transfer: prefersArabicCopy ? 'تحويل بنكي' : 'Bank transfer',
  }[String(value || '').trim().toLowerCase()] || value || (prefersArabicCopy ? 'الدفع عند إتمام الطلب' : 'Checkout payment'));

export const resolveShippingLocation = (shippingAddress: unknown): string => {
  if (!shippingAddress) return '';
  if (typeof shippingAddress === 'string') {
    const trimmedAddress = shippingAddress.trim();
    if (!trimmedAddress) return '';

    try {
      const parsedAddress = JSON.parse(trimmedAddress);
      const resolvedAddress = resolveShippingLocation(parsedAddress);
      if (resolvedAddress) return resolvedAddress;
    } catch (_) {
      // Legacy orders may store this field as plain text.
    }

    return trimmedAddress;
  }
  if (typeof shippingAddress !== 'object' || Array.isArray(shippingAddress)) return '';
  const data = shippingAddress as Record<string, unknown>;
  const fullAddress = String(data['address'] || '').trim();
  if (fullAddress) {
    return fullAddress;
  }

  return Array.from(
    new Set(
      [data['governorate'], data['city'], data['street'], data['addressLine1']]
        .map((value) => String(value || '').trim())
        .filter(Boolean),
    ),
  ).join(', ');
};

type NormalizedOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

type TimelineStep = 'placed' | 'preparing' | 'shipped' | 'delivered';

type PcHubStatusExperience = {
  timelineStep: TimelineStep;
  heroTitle: string;
  heroDescription: string;
  pillLabel: string;
  spotlightEyebrow: string;
  spotlightTitle: string;
  spotlightDescription: string;
  chips: string[];
  pillClassName: string;
  pulseClassName: string;
  dotClassName: string;
  spotlightCardClassName: string;
  spotlightBadgeClassName: string;
  chipClassName: string;
};

const normalizeOrderStatus = (status?: string): NormalizedOrderStatus => {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'CONFIRMED') return 'CONFIRMED';
  if (normalized === 'SHIPPED') return 'SHIPPED';
  if (normalized === 'DELIVERED') return 'DELIVERED';
  if (normalized === 'CANCELLED') return 'CANCELLED';
  return 'PROCESSING';
};

const resolveTimelineStepFromStatus = (status: NormalizedOrderStatus): TimelineStep => {
  if (status === 'PENDING') return 'placed';
  if (status === 'SHIPPED') return 'shipped';
  if (status === 'DELIVERED') return 'delivered';
  return 'preparing';
};

const getPcHubStatusExperience = (
  status: NormalizedOrderStatus,
  prefersArabicCopy = false,
): PcHubStatusExperience => {
  const base = {
    timelineStep: resolveTimelineStepFromStatus(status),
    spotlightEyebrow: prefersArabicCopy ? 'الوضع الحالي' : 'Current state',
  };

  switch (status) {
    case 'PENDING':
      return {
        ...base,
        heroTitle: prefersArabicCopy ? 'طلبك قيد المراجعة الأولى' : 'Your order is in initial review',
        heroDescription: prefersArabicCopy
          ? 'استلمنا الطلب ونراجع الهاتف والعنوان والموديل المطلوب قبل إدخاله إلى مرحلة التجهيز.'
          : 'We received the order and are reviewing the phone, address, and selected model before prep.',
        pillLabel: prefersArabicCopy ? 'قيد المراجعة' : 'In review',
        spotlightTitle: prefersArabicCopy ? 'نراجع البيانات قبل التجهيز' : 'Reviewing the details before prep',
        spotlightDescription: prefersArabicCopy
          ? 'الخطوة التالية هي تثبيت بيانات التواصل والعنوان حتى ينتقل الطلب إلى تجهيز القطع والشحن.'
          : 'The next step is confirming the contact and address details before prep begins.',
        chips: prefersArabicCopy
          ? ['تأكيد الهاتف', 'مراجعة العنوان', 'جاهز للتجهيز']
          : ['Phone check', 'Address review', 'Ready for prep'],
        pillClassName:
          'flex items-center gap-2 rounded-full border border-[#f3d08c] bg-[#fff6dc] px-4 py-2 text-[#8a5a06] shadow-inner',
        pulseClassName: 'absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75',
        dotClassName: 'relative inline-flex h-2 w-2 rounded-full bg-amber-500',
        spotlightCardClassName:
          'mt-8 rounded-[1.8rem] border border-[#f2d38d] bg-[linear-gradient(180deg,#fffaf0_0%,#fff1ce_100%)] p-5 text-start shadow-[0_22px_60px_-44px_rgba(180,83,9,0.2)]',
        spotlightBadgeClassName:
          'inline-flex items-center gap-2 rounded-full border border-[#f3d08c] bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8a5a06]',
        chipClassName:
          'rounded-full border border-[#eed79f] bg-white/86 px-3 py-1 text-xs font-semibold text-[#8a5a06]',
      };
    case 'SHIPPED':
      return {
        ...base,
        heroTitle: prefersArabicCopy ? 'طلبك خرج للشحن' : 'Your order is out for delivery',
        heroDescription: prefersArabicCopy
          ? 'تم تجهيز الطلب وخرج للشحن. خلي موبايلك متاحًا لأن شركة الشحن قد تتواصل معك في أي وقت.'
          : 'The order was prepared and is now on its way. Keep your phone available for delivery updates.',
        pillLabel: prefersArabicCopy ? 'خرج للشحن' : 'Out for delivery',
        spotlightTitle: prefersArabicCopy ? 'الشحنة في الطريق إليك' : 'The shipment is on the way',
        spotlightDescription: prefersArabicCopy
          ? 'الخطوة التالية المتوقعة هي تواصل المندوب أو محاولة التسليم على العنوان المسجل في الطلب.'
          : 'The next expected step is a courier contact or delivery attempt at the saved address.',
        chips: prefersArabicCopy
          ? ['تواصل المندوب', 'الهاتف متاح', 'استلام ومراجعة']
          : ['Courier contact', 'Phone available', 'Receive & inspect'],
        pillClassName:
          'flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sky-700 shadow-inner',
        pulseClassName: 'absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-75',
        dotClassName: 'relative inline-flex h-2 w-2 rounded-full bg-sky-500',
        spotlightCardClassName:
          'mt-8 rounded-[1.8rem] border border-sky-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eaf4ff_100%)] p-5 text-start shadow-[0_22px_60px_-44px_rgba(59,130,246,0.2)]',
        spotlightBadgeClassName:
          'inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700',
        chipClassName:
          'rounded-full border border-sky-200 bg-white/90 px-3 py-1 text-xs font-semibold text-sky-700',
      };
    case 'DELIVERED':
      return {
        ...base,
        heroTitle: prefersArabicCopy ? 'تم تسليم طلبك بنجاح' : 'Your order was delivered successfully',
        heroDescription: prefersArabicCopy
          ? 'وصلت التجهيزة بنجاح. لو محتاج نفس الطلب مرة أخرى أو ملحقات تكمله فكل شيء جاهز من نفس الصفحة.'
          : 'Your setup has arrived. Reorder the same setup or add matching accessories from this page.',
        pillLabel: prefersArabicCopy ? 'تم التسليم' : 'Delivered',
        spotlightTitle: prefersArabicCopy ? 'اكتملت الرحلة الأساسية' : 'The main journey is complete',
        spotlightDescription: prefersArabicCopy
          ? 'يمكنك الآن إعادة نفس التجهيزة، أو إضافة شاشة وملحقات تكمل الاستخدام الفعلي بعد الاستلام.'
          : 'You can now reorder the same setup or add a display and accessories that match real usage.',
        chips: prefersArabicCopy
          ? ['إعادة الطلب', 'ملحقات مكملة', 'دعم ما بعد البيع']
          : ['Reorder', 'Matching add-ons', 'After-sales support'],
        pillClassName:
          'flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 shadow-inner',
        pulseClassName: 'absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75',
        dotClassName: 'relative inline-flex h-2 w-2 rounded-full bg-emerald-500',
        spotlightCardClassName:
          'mt-8 rounded-[1.8rem] border border-emerald-200 bg-[linear-gradient(180deg,#f7fffb_0%,#e8fff2_100%)] p-5 text-start shadow-[0_22px_60px_-44px_rgba(16,185,129,0.18)]',
        spotlightBadgeClassName:
          'inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700',
        chipClassName:
          'rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-700',
      };
    case 'CANCELLED':
      return {
        ...base,
        heroTitle: prefersArabicCopy ? 'تم إيقاف تنفيذ الطلب' : 'The order was halted',
        heroDescription: prefersArabicCopy
          ? 'إذا كان هذا غير متوقع، راجعنا على واتساب لنوضح السبب أو نساعدك في إعادة تجهيز الطلب.'
          : 'If this is unexpected, contact us on WhatsApp so we can clarify the reason or help rebuild the order.',
        pillLabel: prefersArabicCopy ? 'تم الإيقاف' : 'Cancelled',
        spotlightTitle: prefersArabicCopy ? 'الطلب لا يتحرك الآن' : 'The order is not progressing now',
        spotlightDescription: prefersArabicCopy
          ? 'أفضل خطوة تالية هي مراجعة الفريق لمعرفة السبب وتصحيح البيانات أو إعادة الطلب عند الحاجة.'
          : 'The best next step is reviewing the issue with the team and fixing the details if needed.',
        chips: prefersArabicCopy
          ? ['مراجعة الدعم', 'تحديث البيانات', 'طلب جديد عند الحاجة']
          : ['Support review', 'Update details', 'New order if needed'],
        pillClassName:
          'flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 shadow-inner',
        pulseClassName: 'absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-300 opacity-75',
        dotClassName: 'relative inline-flex h-2 w-2 rounded-full bg-rose-500',
        spotlightCardClassName:
          'mt-8 rounded-[1.8rem] border border-rose-200 bg-[linear-gradient(180deg,#fff9fa_0%,#ffe8eb_100%)] p-5 text-start shadow-[0_22px_60px_-44px_rgba(244,63,94,0.18)]',
        spotlightBadgeClassName:
          'inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-rose-700',
        chipClassName:
          'rounded-full border border-rose-200 bg-white/90 px-3 py-1 text-xs font-semibold text-rose-700',
      };
    case 'CONFIRMED':
    case 'PROCESSING':
    default:
      return {
        ...base,
        heroTitle: prefersArabicCopy ? 'تم تسجيل طلبك وجارٍ مراجعته' : 'Your order is now under review',
        heroDescription: prefersArabicCopy
          ? 'رقم الطلب عندك جاهز، ونحن نراجع التوفر والتغليف والشحن قبل التنفيذ حتى تستلم التجهيزة بشكل واضح وآمن.'
          : 'Your order number is ready and we are reviewing stock, protection, and shipping before fulfillment.',
        pillLabel: prefersArabicCopy ? 'مراجعة وتجهيز' : 'Review & prep',
        spotlightTitle: prefersArabicCopy ? 'نثبت التوفر ونجهز الشحنة' : 'Confirming stock and preparing shipment',
        spotlightDescription: prefersArabicCopy
          ? 'الخطوة الحالية هي مراجعة القطع والإضافات والتغليف قبل تسليم الطلب إلى الشحن.'
          : 'We are currently reviewing the items, add-ons, and packaging before handoff to shipping.',
        chips: prefersArabicCopy
          ? ['مراجعة التوفر', 'تجهيز القطع', 'تغليف محمي']
          : ['Stock review', 'Item prep', 'Protected packaging'],
        pillClassName:
          'flex items-center gap-2 rounded-full border border-[#e7d99f] bg-[#111827] px-4 py-2 text-[#f8d76a] shadow-inner',
        pulseClassName: 'absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75',
        dotClassName: 'relative inline-flex h-2 w-2 rounded-full bg-[#f5c94b]',
        spotlightCardClassName:
          'mt-8 rounded-[1.8rem] border border-[#ead89d] bg-[linear-gradient(180deg,#fffef8_0%,#fff4d7_100%)] p-5 text-start shadow-[0_22px_60px_-44px_rgba(15,23,42,0.18)]',
        spotlightBadgeClassName:
          'inline-flex items-center gap-2 rounded-full border border-[#ead89d] bg-white/80 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8a5a06]',
        chipClassName:
          'rounded-full border border-[#eed79f] bg-white/86 px-3 py-1 text-xs font-semibold text-[#8a5a06]',
      };
  }
};

const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ section, settings }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    browserTrackingEnabled,
    trackPurchaseEvent,
    trackAddToCartEvent,
  } = useStorefrontFacebookTracking();
  const { addItem } = useCartStore();
  const { theme } = useStorefrontTheme();
  const {
    settings: storefrontSettings,
    isLoading: storefrontSettingsLoading,
  } = useStorefrontSettings();
  const prefersArabicCopy = theme.direction === 'rtl';
  const isBiteRush = theme.id === 'restaurant-demo';
  const variant = normalizeOrderConfirmationVariant(section?.variant);
  const isMarketAftercare = variant === 'market-aftercare';
  const isNatureAftercare = variant === 'nature-aftercare';
  const isCommandAftercare = variant === 'command-aftercare';
  const isCafeDemo = theme.id === 'cafe-demo' || isMarketAftercare;
  const isPharmacy = isPharmacyThemeId(theme.id) || isNatureAftercare;
  const isPcHub = theme.id === 'pc-hub-eg' || isCommandAftercare;
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const isRoseBoutique =
    variant === 'boutique-aftercare' || theme.id === 'rose-boutique-eg';
  const isSoftThanks =
    variant === 'soft-thanks' || theme.id === 'vela-fashion-eg';
  const isSoftAftercare = isRoseBoutique || isSoftThanks;
  const previewThemeId = resolvePreviewThemeId();
  const trackedPurchaseRef = useRef('');
  const locationState = location.state as { purchaseTracking?: PurchaseTrackingState } | null;
  const submittedPurchaseTracking = locationState?.purchaseTracking || null;
  const orderQueryParam = searchParams.get('orderId') || searchParams.get('orderNumber') || '';
  const isOfferAccepted = searchParams.get('offerAccepted') === '1' || Boolean((location.state as any)?.offerAccepted);
  const storedPurchaseTracking = useMemo<PurchaseTrackingState | null>(
    () =>
      getStoredPurchaseTracking(
        orderQueryParam,
        storefrontSettings?.companyId,
      ) as PurchaseTrackingState | null,
    [orderQueryParam, storefrontSettings?.companyId],
  );
  const previewPurchaseTracking = useMemo<PurchaseTrackingState | null>(
    () =>
      getMarketplacePreviewPurchaseTracking(
        previewThemeId,
      ) as PurchaseTrackingState | null,
    [previewThemeId],
  );
  const previewTrackedOrder = useMemo<TrackedOrderSummary | null>(
    () => getMarketplacePreviewTrackedOrder(previewThemeId) as TrackedOrderSummary | null,
    [previewThemeId],
  );
  const directPurchaseTracking = submittedPurchaseTracking || storedPurchaseTracking;
  const purchaseTracking = directPurchaseTracking || previewPurchaseTracking || null;
  const submittedTrackedOrder = useMemo<TrackedOrderSummary | null>(() => {
    if (directPurchaseTracking) {
      return {
        orderNumber: directPurchaseTracking.orderNumber,
        paymentMethod: directPurchaseTracking.paymentMethod,
        total: directPurchaseTracking.total,
        finalTotal: directPurchaseTracking.total,
        items: directPurchaseTracking.items,
        storePromotionDiscount: directPurchaseTracking.storePromotionDiscount,
        storePromotionLabel: directPurchaseTracking.storePromotionLabel,
      };
    }

    return null;
  }, [directPurchaseTracking]);
  const seededTrackedOrder = useMemo<TrackedOrderSummary | null>(() => {
    if (submittedTrackedOrder) {
      return submittedTrackedOrder;
    }

    return previewTrackedOrder;
  }, [previewTrackedOrder, submittedTrackedOrder]);
  const purchaseItems = useMemo(
    () => purchaseTracking?.items || [],
    [purchaseTracking?.items],
  );
  const [trackPhone, setTrackPhone] = useState(
    purchaseTracking?.phone || searchParams.get('phone') || '',
  );
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderSummary | null>(null);
  const [trackOrderLoading, setTrackOrderLoading] = useState(false);
  const [trackOrderError, setTrackOrderError] = useState('');
  const [reorderMessage, setReorderMessage] = useState('');
  const [reorderError, setReorderError] = useState('');
  const effectiveTrackedOrder = trackedOrder || seededTrackedOrder;
  const effectiveStatus = normalizeOrderStatus(effectiveTrackedOrder?.status);
  const pcHubStatusExperience = isPcHub
    ? getPcHubStatusExperience(effectiveStatus, prefersArabicCopy)
    : null;

  const visibleOrderNumber = purchaseTracking?.orderNumber || orderQueryParam || '123456';
  const resolvedOrderReference = purchaseTracking?.orderNumber || orderQueryParam || '';
  const purchaseItemCount = purchaseItems.reduce(
    (total, item) => total + Math.max(0, Number(item.quantity || 0)),
    0,
  );
  const purchaseTotal = Number(purchaseTracking?.total || 0);
  const orderItemsForDisplay = useMemo(
    () =>
      Array.isArray(trackedOrder?.items) && trackedOrder.items.length > 0
        ? trackedOrder.items
        : purchaseItems,
    [purchaseItems, trackedOrder?.items],
  );
  const quantityOfferSummary = useMemo(
    () => groupOrderQuantityOfferItems(orderItemsForDisplay),
    [orderItemsForDisplay],
  );
  const summaryBlockCount = quantityOfferSummary.groups.length + (quantityOfferSummary.singles.length > 0 ? 1 : 0);
  const reorderableItems = useMemo(
    () =>
      orderItemsForDisplay.filter((item) => {
        const productId = String(item.productId || item.id || '').trim();
        const name = String(item.name || '').trim();
        return Boolean(productId && name && Number(item.quantity || 0) > 0);
      }),
    [orderItemsForDisplay],
  );
  const reorderQuantity = useMemo(
    () =>
      reorderableItems.reduce(
        (total, item) => total + Math.max(1, Number(item.quantity || 1)),
        0,
      ),
    [reorderableItems],
  );
  const getDisplayItemName = (item: OrderQuantityOfferItem) =>
    isBiteRush
      ? localizeBiteRushName(item.name, item.productId, item.id)
      : String(item.name || '').trim();
  const getDisplayItemAttributes = (item: OrderQuantityOfferItem) => {
    const attributes = getOrderItemAttributes(item);
    return isBiteRush ? localizeBiteRushAttributeRecord(attributes) : attributes;
  };

  const storeName =
    previewThemeId
      ? theme.name
      : storefrontSettings?.storefront?.settings?.storeName ||
        storefrontSettings?.company?.name ||
        theme.name;
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'EGP';
  const companySettings = asRecord(storefrontSettings?.company?.settings);
  const storefrontDisplaySettings = asRecord(storefrontSettings?.storefront?.settings);
  const resolvedWhatsappNumber =
    settings?.whatsappNumber ||
    asTrimmedString(companySettings.whatsappNumber) ||
    asTrimmedString(storefrontDisplaySettings.whatsappNumber) ||
    '';
  const supportEmail =
    settings?.supportEmail ||
    asTrimmedString(companySettings.supportEmail) ||
    asTrimmedString(companySettings.email) ||
    '';
  const title =
    (isPcHub
      ? pcHubStatusExperience?.heroTitle
      : settings?.title) ||
    (isPcHub
      ? (prefersArabicCopy ? 'تم تسجيل طلبك وجارٍ مراجعته' : 'Your order is now under review')
      : isRoseBoutique
        ? (prefersArabicCopy ? 'طلبك من روزا ثبت بنجاح' : 'Your Rosa order is confirmed')
      : (prefersArabicCopy ? 'تم تأكيد طلبك بنجاح!' : 'Order confirmed successfully!'));
  const description =
    (isPcHub ? pcHubStatusExperience?.heroDescription : settings?.description) ||
    (isPcHub
      ? (prefersArabicCopy
        ? `شكرًا لتسوقك من ${storeName}. رقم الطلب جاهز، وفريقنا يراجع التوفر والتغليف والشحن قبل التنفيذ حتى تستلم التجهيزة بشكل واضح وآمن.`
        : `Thanks for shopping with ${storeName}. Your order is logged and our team is reviewing stock, protection, and shipping before fulfillment.`)
      : isKhemetLuxe
        ? (prefersArabicCopy
          ? `استلمنا طلبك في ${storeName}، وهنراجع المقاس والعنوان ونتواصل معاكي لتأكيد الشحن خلال 24 ساعة.`
          : `We received your order at ${storeName} and will confirm the size, address, and shipping details within 24 hours.`)
      : isRoseBoutique
          ? (prefersArabicCopy
            ? `شكرًا لتسوقك من ${storeName}. سنراجع المقاس والعنوان بهدوء قبل التجهيز، ونرسل لكِ تحديثات أقرب خطوة بخطوة حتى يصل الطلب بشكل أوضح وأسهل.`
          : `Thanks for shopping with ${storeName}. We are softly reviewing size, address, and preparation details before dispatch.`)
      : (prefersArabicCopy
        ? `شكرًا لتسوقك من ${storeName}. فريقنا بدأ تجهيز طلبك وسيتواصل معك لتأكيد بيانات الشحن.`
        : `Thanks for shopping with ${storeName}. Our team is already preparing your order and will contact you to confirm shipping details.`));
  const continueShoppingText =
    settings?.continueShoppingText ||
    (isPcHub
      ? (prefersArabicCopy ? 'تابع تصفح الأجهزة' : 'Browse more gear')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'كمّلي التسوق' : 'Continue shopping')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'شاهدي تنسيقات أخرى' : 'Browse more looks')
        : (prefersArabicCopy ? 'مواصلة التسوق' : 'Continue shopping'));
  const orderNumberPrefix = settings?.orderNumberPrefix || (prefersArabicCopy ? 'رقم الطلب:' : 'Order number:');
  const supportText =
    settings?.supportText ||
    (isPcHub
      ? (prefersArabicCopy
        ? 'لو محتاج تعديل موديل أو فاتورة شركة تواصل معنا عبر'
        : 'Need a spec change or company invoice? Reach us via')
      : isKhemetLuxe
        ? (prefersArabicCopy
          ? 'لو حبيتي تسألي عن الشحن أو تعدلي العنوان، كلمينا على'
          : 'Need a shipping or address update? Reach us via')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'إذا احتجتِ تعديلًا على المقاس أو العنوان تواصلي معنا عبر' : 'Need a size or address update? Reach us via')
        : (prefersArabicCopy ? 'تحتاج مساعدة؟ تواصل معنا عبر' : 'Need help? Reach us via'));
  const statusLabel =
    (isPcHub ? pcHubStatusExperience?.pillLabel : settings?.statusLabel) ||
    (isPcHub
      ? (prefersArabicCopy ? 'مراجعة وتجهيز' : 'Review & prep')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'قيد التجهيز' : 'Preparing')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'مراجعة وتجهيز' : 'Reviewing & preparing')
          : (prefersArabicCopy ? 'قيد التجهيز' : 'Preparing'));
  const whatsappSupportLabel =
    settings?.whatsappSupportLabel ||
    (isPcHub
      ? (prefersArabicCopy ? 'راجع الطلب على واتساب' : 'Review on WhatsApp')
      : (prefersArabicCopy ? 'دعم واتساب' : 'WhatsApp support'));
  const whatsappMessage =
    settings?.whatsappMessage ||
    (prefersArabicCopy
      ? `مرحبًا، أود الاستفسار عن طلبي رقم ${visibleOrderNumber}`
      : `Hello, I would like to ask about my order #${visibleOrderNumber}`);
  const showTimeline = settings?.showTimeline !== false;
  const showRecommended = settings?.showRecommended !== false;
  const showTrackOrder = settings?.showTrackOrder !== false;
  const showReorder = settings?.showReorder !== false;
  const trackOrderTitle =
    settings?.trackOrderTitle ||
    (isPcHub
      ? (prefersArabicCopy ? 'تابع حالة التجهيز' : 'Track the prep status')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'راجعي حالة الطلب' : 'Review order status')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'راجعي حالة الطلب' : 'Review order status')
        : (prefersArabicCopy ? 'تتبع هذا الطلب' : 'Track this order'));
  const trackOrderDescription =
    settings?.trackOrderDescription ||
    (isPcHub
      ? (prefersArabicCopy
        ? 'أدخل نفس رقم الموبايل المستخدم وقت الطلب لمعرفة آخر تحديث على المراجعة والتجهيز والشحن.'
        : 'Use the same checkout phone number to see the latest prep, review, and shipping update.')
      : isKhemetLuxe
        ? (prefersArabicCopy
          ? 'اكتبي نفس رقم الموبايل المستخدم وقت الطلب لمعرفة آخر تحديث على التأكيد والتجهيز والشحن.'
          : 'Use the same checkout phone number to view the latest confirmation, prep, and shipping update.')
      : isRoseBoutique
          ? (prefersArabicCopy
            ? 'أدخلي نفس رقم الموبايل المستخدم وقت الطلب لمعرفة آخر تحديث على المراجعة والتجهيز والشحن.'
            : 'Use the same checkout phone number to review the latest confirmation, prep, and shipping update.')
      : (prefersArabicCopy
        ? 'تحقق من أحدث حالة للطلب باستخدام نفس رقم الهاتف الذي استُخدم أثناء إتمام الطلب.'
        : 'Check the latest order status using the same phone number used during checkout.'));
  const trackOrderButtonText =
    settings?.trackOrderButtonText ||
    (isPcHub
      ? (prefersArabicCopy ? 'اعرض آخر تحديث' : 'Show latest update')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'اعرضي حالة الطلب' : 'Show order status')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'اعرضي آخر تحديث' : 'Show latest update')
        : (prefersArabicCopy ? 'تحقق من حالة الطلب' : 'Check order status'));
  const trackOrderPhoneLabel =
    settings?.trackOrderPhoneLabel ||
    (isPcHub
      ? (prefersArabicCopy ? 'رقم الموبايل المستخدم وقت الطلب' : 'Checkout mobile number')
      : (prefersArabicCopy ? 'رقم الهاتف المستخدم في الطلب' : 'Checkout phone number'));
  const trackOrderPhonePlaceholder =
    settings?.trackOrderPhonePlaceholder || (prefersArabicCopy ? '01xxxxxxxxx' : '01xxxxxxxxx');
  const reorderTitle =
    settings?.reorderTitle ||
    (isPcHub
      ? (prefersArabicCopy ? 'أعد نفس التجهيزة بسرعة' : 'Rebuild the same setup fast')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'رجّعي نفس الاختيارات للسلة' : 'Bring the same picks back to cart')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'أعيدي نفس الاختيارات بسهولة' : 'Rebuild the same picks easily')
        : (prefersArabicCopy ? 'أعد طلب نفس المنتجات' : 'Reorder the same items'));
  const reorderDescription =
    settings?.reorderDescription ||
    (isPcHub
      ? (prefersArabicCopy
        ? 'ارجّع نفس الجهاز والإضافات إلى السلة مرة واحدة لو تريد تكرار الطلب أو تجهيز طلب مشابه.'
        : 'Return the same device and add-ons to the cart in one step for a repeat setup.')
      : isKhemetLuxe
        ? (prefersArabicCopy
          ? 'لو حبيتي تكرري نفس الموديلات أو تعدلي المقاس في خطوة جديدة، رجعيها للسلة بضغطة واحدة.'
          : 'Bring the same styles back to the cart in one step if you want to repeat or adjust the order.')
      : isRoseBoutique
          ? (prefersArabicCopy
            ? 'لو حبيتي تكرري نفس القطع أو تبني طلبًا قريبًا منها، رجعيها إلى السلة بضغطة واحدة.'
            : 'Bring the same pieces back to cart in one step if you want to rebuild a similar order.')
      : (prefersArabicCopy
        ? 'أضف منتجات الطلب الأصلي إلى السلة مرة واحدة وكمّل التجربة بسرعة.'
        : 'Add the original order items back to cart in one step and keep the momentum going.'));
  const reorderButtonText =
    settings?.reorderButtonText ||
    (isPcHub
      ? (prefersArabicCopy ? 'أضف نفس التجهيزة للسلة' : 'Add the same setup to cart')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'رجّعي المنتجات للسلة' : 'Add the same picks to cart')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'أضيفي نفس القطع للسلة' : 'Add the same pieces to cart')
        : (prefersArabicCopy ? 'أضف هذه المنتجات مرة أخرى' : 'Add these items again'));
  const reorderSuccessText =
    settings?.reorderSuccessText ||
    (isPcHub
      ? (prefersArabicCopy ? 'رجّعنا نفس التجهيزة إلى السلة.' : 'The same setup is back in the cart.')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'رجعنا نفس الاختيارات للسلة.' : 'The same picks are back in the cart.')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'رجعنا نفس الاختيارات إلى السلة.' : 'The same picks are back in the cart.')
        : (prefersArabicCopy ? 'تمت إضافة منتجات الطلب إلى السلة.' : 'The order items were added back to cart.'));
  const whatsappUrl = `https://wa.me/${resolvedWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  const homePath = buildStorefrontPath(location.pathname, '/', location.search);
  const shellClassName = isBiteRush
    ? 'min-h-[80vh] bg-[radial-gradient(circle_at_top,#fff1de_0%,#fff9f3_34%,#fff_72%)] py-16'
    : isCafeDemo
      ? 'min-h-[80vh] bg-[radial-gradient(circle_at_top,#f7eadc_0%,#fffaf5_34%,#fffdfa_72%)] py-16'
    : isPharmacy
      ? 'min-h-[80vh] bg-[radial-gradient(circle_at_top,#defdf7_0%,#f5fffc_34%,#ffffff_72%)] py-16'
      : isKhemetLuxe
        ? 'min-h-[80vh] bg-[radial-gradient(circle_at_top,#fff6ea_0%,#fffaf5_26%,#fffdf9_54%,#ffffff_100%)] py-12 md:py-16'
      : isSoftAftercare
          ? 'min-h-[80vh] bg-[radial-gradient(circle_at_top,#fff3ef_0%,#fffaf8_34%,#fffdfc_72%)] py-16'
      : isPcHub
        ? 'min-h-[80vh] bg-[radial-gradient(circle_at_top,#fff8dd_0%,#fffef7_28%,#f6f6f2_62%,#ffffff_100%)] py-16'
      : 'min-h-[80vh] bg-background py-16';
  const successBadgeClassName = isBiteRush
    ? 'mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#111111_0%,#f97316_58%,#ef4444_100%)] shadow-[0_30px_90px_-34px_rgba(249,115,22,0.72)] animate-in zoom-in-50 duration-500'
    : isCafeDemo
      ? 'mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#4b2e1f_0%,#6f4a33_52%,#d6a77a_100%)] shadow-[0_30px_90px_-34px_rgba(111,74,51,0.45)] animate-in zoom-in-50 duration-500'
    : isPharmacy
      ? 'mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] shadow-[0_30px_90px_-34px_rgba(20,184,166,0.42)] animate-in zoom-in-50 duration-500'
      : isKhemetLuxe
        ? 'mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#153628_0%,#24493b_46%,#d4b26a_100%)] shadow-[0_34px_100px_-38px_rgba(21,54,40,0.34)] animate-in zoom-in-50 duration-500'
      : isSoftAftercare
          ? 'mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#fff1ed_0%,#d77d6a_52%,#6d3d48_100%)] shadow-[0_30px_90px_-34px_rgba(107,33,49,0.26)] animate-in zoom-in-50 duration-500'
      : isPcHub
        ? 'mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[linear-gradient(135deg,#111827_0%,#1f2937_46%,#f5c94b_100%)] shadow-[0_34px_100px_-36px_rgba(245,201,75,0.58)] animate-in zoom-in-50 duration-500'
      : 'mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 animate-in zoom-in-50 duration-500';
  const successIconWrapClassName = isBiteRush
    ? 'flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#111111] shadow-lg'
    : isCafeDemo
      ? 'flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#4b2e1f] shadow-lg'
    : isPharmacy
      ? 'flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0f766e] shadow-lg'
      : isKhemetLuxe
        ? 'flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#153628] shadow-[0_18px_40px_-20px_rgba(21,54,40,0.18)]'
      : isSoftAftercare
          ? 'flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#6d3d48] shadow-[0_18px_40px_-20px_rgba(107,33,49,0.25)]'
      : isPcHub
        ? 'flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#111827] shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)]'
      : 'flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30';
  const summaryPanelClassName = isBiteRush
    ? 'rounded-[2.2rem] border border-[#f8c08c] bg-[linear-gradient(180deg,#fffdfb_0%,#fff2e6_100%)] p-8 shadow-[0_34px_90px_-56px_rgba(247,115,22,0.34)] animate-in slide-in-from-bottom-4 duration-700 delay-200'
    : isCafeDemo
      ? 'rounded-[2.2rem] border border-[#e6d0bc] bg-[linear-gradient(180deg,#fffdfb_0%,#f6ede3_100%)] p-8 shadow-[0_34px_90px_-56px_rgba(111,74,51,0.2)] animate-in slide-in-from-bottom-4 duration-700 delay-200'
    : isPharmacy
      ? 'rounded-[2.2rem] border border-[#99f6e4] bg-[linear-gradient(180deg,#ffffff_0%,#effbf7_100%)] p-8 shadow-[0_34px_90px_-56px_rgba(20,184,166,0.22)] animate-in slide-in-from-bottom-4 duration-700 delay-200'
      : isKhemetLuxe
        ? 'rounded-[2.25rem] border border-[#e7d6bf] bg-[linear-gradient(180deg,#fffefc_0%,#fff8f1_100%)] p-7 shadow-[0_34px_90px_-56px_rgba(21,54,40,0.12)] animate-in slide-in-from-bottom-4 duration-700 delay-200 md:p-8'
      : isSoftAftercare
          ? 'rounded-[2.2rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffefd_0%,#fff7f4_100%)] p-8 shadow-[0_34px_90px_-56px_rgba(107,33,49,0.14)] animate-in slide-in-from-bottom-4 duration-700 delay-200'
      : isPcHub
        ? 'rounded-[2.25rem] border border-[#e9d897] bg-[linear-gradient(180deg,#0f172a_0%,#172033_10%,#fffef8_10.1%,#fff8e7_100%)] p-8 shadow-[0_36px_100px_-60px_rgba(15,23,42,0.42)] animate-in slide-in-from-bottom-4 duration-700 delay-200'
      : 'rounded-[2rem] border border-border/60 bg-card p-8 shadow-2xl shadow-primary/5 animate-in slide-in-from-bottom-4 duration-700 delay-200';
  const recapPanelClassName = isBiteRush
    ? 'space-y-6 rounded-[2.2rem] border border-[#f8c08c] bg-[linear-gradient(180deg,#fffdfb_0%,#fff4e9_100%)] p-8 text-start shadow-[0_26px_80px_-60px_rgba(247,115,22,0.32)]'
    : isCafeDemo
      ? 'space-y-6 rounded-[2.2rem] border border-[#e6d0bc] bg-[linear-gradient(180deg,#fffdfb_0%,#f7efe6_100%)] p-8 text-start shadow-[0_26px_80px_-60px_rgba(111,74,51,0.18)]'
    : isPharmacy
      ? 'space-y-6 rounded-[2.2rem] border border-[#99f6e4] bg-[linear-gradient(180deg,#ffffff_0%,#f1fcf8_100%)] p-8 text-start shadow-[0_26px_80px_-60px_rgba(20,184,166,0.2)]'
      : isKhemetLuxe
        ? 'space-y-6 rounded-[2.2rem] border border-[#e7d6bf] bg-[linear-gradient(180deg,#fffefb_0%,#fff9f3_100%)] p-7 text-start shadow-[0_26px_80px_-60px_rgba(21,54,40,0.1)] md:p-8'
      : isSoftAftercare
          ? 'space-y-6 rounded-[2.2rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffefd_0%,#fff8f6_100%)] p-8 text-start shadow-[0_26px_80px_-60px_rgba(107,33,49,0.12)]'
      : isPcHub
        ? 'space-y-6 rounded-[2.2rem] border border-[#ead89d] bg-[linear-gradient(180deg,#fffef8_0%,#fff6e1_100%)] p-8 text-start shadow-[0_26px_80px_-58px_rgba(15,23,42,0.2)]'
      : 'space-y-6 rounded-[2rem] border border-border/60 bg-card/80 p-8 text-start shadow-xl shadow-primary/5';
  const utilityCardClassName = isBiteRush
    ? 'space-y-5 rounded-[1.8rem] border border-[#f8c08c] bg-[linear-gradient(180deg,#fffdfb_0%,#fff2e4_100%)] p-6 shadow-[0_18px_55px_-45px_rgba(247,115,22,0.3)]'
    : isCafeDemo
      ? 'space-y-5 rounded-[1.8rem] border border-[#e6d0bc] bg-[linear-gradient(180deg,#fffdfb_0%,#f5ece1_100%)] p-6 shadow-[0_18px_55px_-45px_rgba(111,74,51,0.18)]'
    : isPharmacy
      ? 'space-y-5 rounded-[1.8rem] border border-[#99f6e4] bg-[linear-gradient(180deg,#ffffff_0%,#effbf7_100%)] p-6 shadow-[0_18px_55px_-45px_rgba(20,184,166,0.18)]'
      : isKhemetLuxe
        ? 'space-y-5 rounded-[1.85rem] border border-[#e7d6bf] bg-[linear-gradient(180deg,#fffefc_0%,#fff8f2_100%)] p-6 shadow-[0_20px_55px_-46px_rgba(21,54,40,0.1)]'
      : isRoseBoutique
        ? 'space-y-5 rounded-[1.8rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffefd_0%,#fff7f4_100%)] p-6 shadow-[0_18px_55px_-45px_rgba(107,33,49,0.12)]'
      : isPcHub
        ? 'space-y-5 rounded-[1.9rem] border border-[#ead89d] bg-[linear-gradient(180deg,#fffef9_0%,#fff6e1_100%)] p-6 shadow-[0_20px_60px_-46px_rgba(15,23,42,0.22)]'
      : 'space-y-5 rounded-[1.8rem] border border-border/60 bg-card/70 p-6 shadow-[0_18px_55px_-45px_rgba(15,23,42,0.55)]';
  const primaryButtonClassName = isBiteRush
    ? 'h-14 flex-1 rounded-full border-none bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-base font-black text-white shadow-[0_28px_90px_-34px_rgba(239,68,68,0.62)] transition-all hover:shadow-[0_34px_94px_-30px_rgba(249,115,22,0.72)]'
    : isCafeDemo
      ? 'h-14 flex-1 rounded-full border-none bg-[linear-gradient(135deg,#6f4a33_0%,#d6a77a_100%)] text-base font-black text-white shadow-[0_28px_90px_-34px_rgba(111,74,51,0.34)] transition-all hover:shadow-[0_34px_94px_-30px_rgba(111,74,51,0.4)]'
    : isPharmacy
      ? 'h-14 flex-1 rounded-full border-none bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] text-base font-black text-white shadow-[0_28px_90px_-34px_rgba(15,118,110,0.42)] transition-all hover:shadow-[0_34px_94px_-30px_rgba(20,184,166,0.48)]'
      : isKhemetLuxe
        ? 'h-14 flex-1 rounded-full border border-[#153628] bg-[#153628] text-base font-black text-[#fff8ea] shadow-[0_26px_80px_-34px_rgba(21,54,40,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#123022]'
      : isRoseBoutique
        ? 'h-14 flex-1 rounded-full border-none bg-[linear-gradient(135deg,#5b323b_0%,#8f4d41_100%)] text-base font-black text-white shadow-[0_28px_90px_-34px_rgba(107,33,49,0.3)] transition-all hover:opacity-95'
      : isPcHub
        ? 'h-14 flex-1 rounded-full border border-[#111827] bg-[#111827] text-base font-black text-[#f8d76a] shadow-[0_26px_80px_-34px_rgba(15,23,42,0.42)] transition-all hover:-translate-y-0.5 hover:bg-[#0b1220]'
      : 'h-14 flex-1 rounded-full text-base font-bold shadow-xl shadow-primary/10 transition-all hover:shadow-primary/20';
  const whatsappButtonClassName = isBiteRush
    ? 'flex h-14 flex-1 items-center justify-center gap-3 rounded-full border border-[#111111]/15 bg-[#111111] text-base font-black text-white hover:bg-[#0b0b0b]'
    : isCafeDemo
      ? 'flex h-14 flex-1 items-center justify-center gap-3 rounded-full border border-[#e6d0bc] bg-white text-base font-black text-[#4b2e1f] hover:bg-[#fff5eb]'
    : isPharmacy
      ? 'flex h-14 flex-1 items-center justify-center gap-3 rounded-full border border-[#99f6e4] bg-white text-base font-black text-[#0f766e] hover:bg-[#ecfdf9]'
      : isKhemetLuxe
        ? 'flex h-14 flex-1 items-center justify-center gap-3 rounded-full border border-[#e7d6bf] bg-white text-base font-black text-[#153628] shadow-[0_16px_45px_-34px_rgba(21,54,40,0.12)] hover:border-[#c9aa67] hover:bg-[#fffaf2]'
      : isRoseBoutique
        ? 'flex h-14 flex-1 items-center justify-center gap-3 rounded-full border border-[#ead8cf] bg-white text-base font-black text-[#6d3d48] shadow-[0_16px_45px_-34px_rgba(107,33,49,0.12)] hover:border-[#b06456] hover:bg-[#fff7f4]'
      : isPcHub
        ? 'flex h-14 flex-1 items-center justify-center gap-3 rounded-full border border-[#e4d59c] bg-white text-base font-black text-[#111827] shadow-[0_16px_45px_-34px_rgba(15,23,42,0.25)] hover:border-[#111827] hover:bg-[#fff8de]'
      : 'flex h-14 flex-1 items-center justify-center gap-3 rounded-full border-emerald-500/30 text-base font-bold text-emerald-600 hover:border-emerald-500/50 hover:bg-emerald-50';
  const emailPanelClassName = isBiteRush
    ? 'rounded-full border border-[#f8c08c] bg-white/88 px-6 py-3 text-sm text-[#8a4b1f]'
    : isCafeDemo
      ? 'rounded-full border border-[#e6d0bc] bg-white/92 px-6 py-3 text-sm text-[#6f4a33]'
    : isPharmacy
      ? 'rounded-full border border-[#99f6e4] bg-white/92 px-6 py-3 text-sm text-[#0f766e]'
      : isKhemetLuxe
        ? 'rounded-full border border-[#e7d6bf] bg-white/94 px-6 py-3 text-sm text-[#6f5a47] shadow-[0_14px_36px_-30px_rgba(21,54,40,0.08)]'
      : isRoseBoutique
        ? 'rounded-full border border-[#ead8cf] bg-white/92 px-6 py-3 text-sm text-[#72545b] shadow-[0_14px_36px_-30px_rgba(107,33,49,0.1)]'
      : isPcHub
        ? 'rounded-full border border-[#eadca8] bg-white/92 px-6 py-3 text-sm text-[#475467] shadow-[0_16px_40px_-34px_rgba(15,23,42,0.24)]'
      : 'rounded-full border border-border/40 bg-muted/30 px-6 py-3 text-sm text-muted-foreground';
  const trackInputClassName = isBiteRush
    ? 'h-12 flex-1 rounded-full border border-[#f8c08c] bg-white px-4 text-sm text-[#111111] outline-none transition-all focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20'
    : isCafeDemo
      ? 'h-12 flex-1 rounded-full border border-[#e6d0bc] bg-white px-4 text-sm text-[#2c1d14] outline-none transition-all focus:border-[#6f4a33] focus:ring-2 focus:ring-[#6f4a33]/18'
    : isPharmacy
      ? 'h-12 flex-1 rounded-full border border-[#99f6e4] bg-white px-4 text-sm text-[#0f172a] outline-none transition-all focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/18'
      : isKhemetLuxe
        ? 'h-12 flex-1 rounded-full border border-[#e7d6bf] bg-white px-4 text-sm text-[#153628] outline-none transition-all focus:border-[#153628] focus:ring-2 focus:ring-[#c9aa67]/24'
      : isRoseBoutique
        ? 'h-12 flex-1 rounded-full border border-[#ead8cf] bg-white px-4 text-sm text-[#3d2a2f] outline-none transition-all focus:border-[#b06456] focus:ring-2 focus:ring-[#b06456]/18'
      : isPcHub
        ? 'h-12 flex-1 rounded-full border border-[#e7d89e] bg-white px-4 text-sm text-[#111827] outline-none transition-all focus:border-[#111827] focus:ring-2 focus:ring-[#f5c94b]/35'
      : 'h-12 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20';
  const subtleButtonClassName = isBiteRush
    ? 'h-12 rounded-full border border-[#111111] bg-[#111111] px-6 font-black text-white hover:bg-[#f97316] hover:border-[#f97316]'
    : isCafeDemo
      ? 'h-12 rounded-full border border-[#4b2e1f] bg-[#4b2e1f] px-6 font-black text-white hover:bg-[#6f4a33] hover:border-[#6f4a33]'
    : isPharmacy
      ? 'h-12 rounded-full border border-[#0f766e] bg-[#0f766e] px-6 font-black text-white hover:bg-[#14b8a6] hover:border-[#14b8a6]'
      : isKhemetLuxe
        ? 'h-12 rounded-full border border-[#153628] bg-[#153628] px-6 font-black text-[#fff8ea] hover:bg-[#123022] hover:border-[#123022]'
      : isRoseBoutique
        ? 'h-12 rounded-full border border-[#6d3d48] bg-[#6d3d48] px-6 font-black text-white hover:bg-[#8f4d41] hover:border-[#8f4d41]'
      : isPcHub
        ? 'h-12 rounded-full border border-[#111827] bg-[#111827] px-6 font-black text-[#f8d76a] hover:bg-[#0b1220]'
      : 'h-12 rounded-full px-6 font-bold';
  const successMessageClassName = isBiteRush
    ? 'rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
    : isPcHub
      ? 'rounded-[1.2rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700'
    : 'rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700';
  const errorMessageClassName = isBiteRush
    ? 'rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'
    : isPcHub
      ? 'rounded-[1.2rem] border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700'
    : 'rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700';
  const containerClassName = isPcHub
    ? 'container max-w-5xl space-y-10 px-4 text-center'
    : isKhemetLuxe
      ? 'container max-w-5xl space-y-8 px-4 text-center md:space-y-10'
    : isRoseBoutique
      ? 'container max-w-5xl space-y-10 px-4 text-center'
    : 'container max-w-4xl space-y-10 px-4 text-center';
  const statusPillClassName = isPcHub
    ? (pcHubStatusExperience?.pillClassName || 'flex items-center gap-2 rounded-full border border-[#e7d99f] bg-[#111827] px-4 py-2 text-[#f8d76a] shadow-inner')
    : isKhemetLuxe
      ? 'flex items-center gap-2 rounded-full border border-[#e7d6bf] bg-[#fff8ec] px-4 py-2 text-[#153628] shadow-inner'
    : isRoseBoutique
      ? 'flex items-center gap-2 rounded-full border border-[#ead8cf] bg-[#fff5f2] px-4 py-2 text-[#7b4b57] shadow-inner'
    : 'flex items-center gap-2 rounded-full border border-primary/10 bg-secondary px-4 py-2 shadow-inner';
  const statusPulseClassName = isPcHub
    ? (pcHubStatusExperience?.pulseClassName || 'absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75')
    : isKhemetLuxe
      ? 'absolute inline-flex h-full w-full animate-ping rounded-full bg-[#d4b26a] opacity-75'
    : isRoseBoutique
      ? 'absolute inline-flex h-full w-full animate-ping rounded-full bg-[#e6a092] opacity-75'
    : 'absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75';
  const statusDotClassName = isPcHub
    ? (pcHubStatusExperience?.dotClassName || 'relative inline-flex h-2 w-2 rounded-full bg-[#f5c94b]')
    : isKhemetLuxe
      ? 'relative inline-flex h-2 w-2 rounded-full bg-[#c9aa67]'
    : isRoseBoutique
      ? 'relative inline-flex h-2 w-2 rounded-full bg-[#b06456]'
    : 'relative inline-flex h-2 w-2 rounded-full bg-emerald-500';
  const timelineLabels = isPcHub
    ? {
        placed: prefersArabicCopy ? 'تم الطلب' : 'Placed',
        preparing: prefersArabicCopy ? 'جاري المراجعة' : 'In review',
        shipped: prefersArabicCopy ? 'خرج للشحن' : 'Shipped',
        delivered: prefersArabicCopy ? 'تم التسليم' : 'Delivered',
      }
    : undefined;
  const offerGroupCardClassName = isPcHub
    ? 'space-y-4 rounded-[1.6rem] border border-[#e7d58f] bg-white/92 p-5 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.18)]'
    : isKhemetLuxe
      ? 'space-y-4 rounded-[1.6rem] border border-[#eadbc7] bg-white/96 p-5 shadow-[0_20px_55px_-42px_rgba(21,54,40,0.08)]'
    : isRoseBoutique
      ? 'space-y-4 rounded-[1.6rem] border border-[#ead8cf] bg-white/96 p-5 shadow-[0_20px_55px_-42px_rgba(107,33,49,0.1)]'
    : 'space-y-4 rounded-[1.6rem] border border-primary/20 bg-background p-5 shadow-sm';
  const offerPrimaryChipClassName = isPcHub
    ? 'rounded-full bg-[#111827] px-2.5 py-1 text-[11px] font-black text-[#f5d067]'
    : isKhemetLuxe
      ? 'rounded-full bg-[#153628] px-2.5 py-1 text-[11px] font-black text-[#fff5de]'
    : isRoseBoutique
      ? 'rounded-full bg-[#fff1ed] px-2.5 py-1 text-[11px] font-black text-[#8f4d41]'
    : 'rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-black text-primary';
  const offerSecondaryChipClassName = isPcHub
    ? 'rounded-full bg-[#f5ead0] px-2.5 py-1 text-[11px] font-bold text-[#111827]'
    : isKhemetLuxe
      ? 'rounded-full bg-[#fff3db] px-2.5 py-1 text-[11px] font-bold text-[#6f5a47]'
    : isRoseBoutique
      ? 'rounded-full bg-[#fff8f5] px-2.5 py-1 text-[11px] font-bold text-[#72545b]'
    : 'rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-foreground';
  const offerFreeShippingChipClassName = isPcHub
    ? 'rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-black text-emerald-700'
    : isKhemetLuxe
      ? 'rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700'
    : isRoseBoutique
      ? 'rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-700'
    : 'rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-600';
  const nestedPanelClassName = isPcHub
    ? 'space-y-4 rounded-[1.45rem] border border-[#eadca8] bg-white/90 p-5 shadow-[0_16px_45px_-36px_rgba(15,23,42,0.16)]'
    : isKhemetLuxe
      ? 'space-y-4 rounded-[1.45rem] border border-[#eadbc7] bg-white/94 p-5 shadow-[0_16px_45px_-36px_rgba(21,54,40,0.08)]'
    : isRoseBoutique
      ? 'space-y-4 rounded-[1.45rem] border border-[#ead8cf] bg-white/92 p-5 shadow-[0_16px_45px_-36px_rgba(107,33,49,0.1)]'
    : 'space-y-4 rounded-[1.4rem] border border-border/60 bg-background/80 p-5';
  const nestedCardClassName = isPcHub
    ? 'rounded-[1rem] border border-[#efe2bd] bg-[#fffaf0] px-4 py-3 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.14)]'
    : isKhemetLuxe
      ? 'rounded-[1rem] border border-[#efe4d5] bg-[#fffdf9] px-4 py-3 shadow-[0_12px_32px_-28px_rgba(21,54,40,0.06)]'
    : isRoseBoutique
      ? 'rounded-[1rem] border border-[#efe2dc] bg-[#fffaf8] px-4 py-3 shadow-[0_12px_32px_-28px_rgba(107,33,49,0.08)]'
    : 'rounded-[1rem] border border-border/60 bg-card px-4 py-3';
  const orderItemCardClassName = isPcHub
    ? 'rounded-[1rem] border border-[#efe2bd] bg-[#fffcf4] px-4 py-3 shadow-sm'
    : isKhemetLuxe
      ? 'rounded-[1rem] border border-[#efe4d5] bg-[#fffdfa] px-4 py-3 shadow-sm'
    : isRoseBoutique
      ? 'rounded-[1rem] border border-[#efe2dc] bg-[#fffdfc] px-4 py-3 shadow-sm'
    : 'rounded-[1rem] border border-border/60 bg-card px-4 py-3';
  const orderAttributeChipClassName = isPcHub
    ? 'rounded-full border border-[#e7dbb4] bg-white px-3 py-1 text-xs font-medium text-[#475467]'
    : isKhemetLuxe
      ? 'rounded-full border border-[#eadbc7] bg-white px-3 py-1 text-xs font-medium text-[#6f5a47]'
    : isRoseBoutique
      ? 'rounded-full border border-[#ead8cf] bg-white px-3 py-1 text-xs font-medium text-[#72545b]'
    : 'rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground';
  const reorderButtonClassName =
    isBiteRush
      ? 'h-12 w-full rounded-full border-none bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] font-black text-white'
      : isRoseBoutique
      ? 'h-12 w-full rounded-full border border-[#6d3d48] bg-[#6d3d48] font-black text-white shadow-[0_22px_60px_-40px_rgba(107,33,49,0.22)]'
      : isKhemetLuxe
        ? 'h-12 w-full rounded-full border border-[#153628] bg-[#153628] font-black text-[#fff8ea] shadow-[0_22px_60px_-40px_rgba(21,54,40,0.18)]'
      : isPcHub
        ? 'h-12 w-full rounded-full border border-[#111827] bg-[#111827] font-black text-[#f8d76a] shadow-[0_22px_60px_-40px_rgba(15,23,42,0.28)]'
        : 'h-12 w-full rounded-full font-bold';
  const accentOverlineClassName = isKhemetLuxe
    ? 'text-[#9d7440]'
    : isSoftAftercare
      ? 'text-[#b06456]'
      : 'text-primary/70';
  const supportLinkClassName = isSoftAftercare
      ? isKhemetLuxe
        ? 'font-semibold text-[#153628] hover:underline'
        : 'font-semibold text-[#8f4d41] hover:underline'
      : 'font-semibold text-primary hover:underline';
  const titleClassName = isSoftAftercare
      ? isKhemetLuxe
        ? 'font-heading text-4xl font-black tracking-tight text-[#1f1a16] md:text-5xl'
        : 'font-heading text-4xl font-black tracking-tight text-foreground md:text-5xl'
      : 'font-heading text-4xl font-black tracking-tight text-foreground underline decoration-primary/20 underline-offset-8 md:text-5xl';
  const descriptionClassName = isSoftAftercare
      ? isKhemetLuxe
        ? 'mx-auto max-w-2xl text-lg font-medium leading-relaxed text-[#6f5a47]'
        : 'mx-auto max-w-2xl text-lg font-medium leading-relaxed text-[#72545b]'
      : 'mx-auto max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground';
  const recapGridClassName = isPcHub
    ? summaryBlockCount <= 1
      ? 'mx-auto grid w-full max-w-3xl gap-4'
      : 'grid gap-4 lg:grid-cols-2'
    : isKhemetLuxe
      ? summaryBlockCount <= 1
        ? 'mx-auto grid w-full max-w-3xl gap-4'
        : 'grid gap-4 lg:grid-cols-2'
    : isRoseBoutique
      ? summaryBlockCount <= 1
        ? 'mx-auto grid w-full max-w-3xl gap-4'
        : 'grid gap-4 lg:grid-cols-2'
    : 'grid gap-4 lg:grid-cols-2';
  const singleSummaryCardClassName =
    (isPcHub || isRoseBoutique || isKhemetLuxe) && summaryBlockCount <= 1
      ? `${offerGroupCardClassName} min-h-[20rem] justify-center`
      : offerGroupCardClassName;

  useEffect(() => {
    if (purchaseTracking?.phone && !trackPhone.trim()) setTrackPhone(purchaseTracking.phone);
  }, [purchaseTracking?.phone, trackPhone]);

  useEffect(() => {
    if (seededTrackedOrder && !trackedOrder) {
      setTrackedOrder(seededTrackedOrder);
    }
  }, [seededTrackedOrder, trackedOrder]);

  useEffect(() => {
    if (!purchaseTracking || storefrontSettingsLoading || !browserTrackingEnabled) return;
    const trackingKey = purchaseTracking.eventId || purchaseTracking.orderNumber;
    if (!trackingKey || trackedPurchaseRef.current === trackingKey) return;
    if (hasMarkedPurchaseTracked(purchaseTracking, storefrontSettings?.companyId)) {
      trackedPurchaseRef.current = trackingKey;
      clearStoredPurchaseTracking(purchaseTracking.orderNumber, storefrontSettings?.companyId);
      return;
    }

    const eventId = trackPurchaseEvent(
      {
        orderNumber: purchaseTracking.orderNumber,
        items: purchaseTracking.items,
        total: purchaseTracking.total,
      },
      purchaseTracking.eventId,
    );
    if (eventId !== undefined) {
      trackedPurchaseRef.current = trackingKey;
      markPurchaseTracked(purchaseTracking, storefrontSettings?.companyId);
      clearStoredPurchaseTracking(purchaseTracking.orderNumber, storefrontSettings?.companyId);
    }
  }, [
    browserTrackingEnabled,
    purchaseTracking,
    storefrontSettings?.companyId,
    storefrontSettingsLoading,
    trackPurchaseEvent,
  ]);

  useEffect(() => {
    if (!resolvedOrderReference) return;
    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'thank_you_view',
      dedupeKey: `thank-you-view:${resolvedOrderReference}`,
      metadata: {
        orderNumber: resolvedOrderReference,
        total: purchaseTotal || undefined,
        itemCount: purchaseItemCount || undefined,
      },
    });
  }, [purchaseItemCount, purchaseTotal, resolvedOrderReference, storefrontSettings]);

  const handleContinueShopping = () => {
    if (resolvedOrderReference) {
      void trackConversionSuiteUsage(storefrontSettings, {
        feature: 'thank_you_continue_shopping',
        metadata: { orderNumber: resolvedOrderReference, total: purchaseTotal || undefined },
      });
    }
    navigate(homePath);
  };

  const handleWhatsappSupport = () => {
    if (resolvedOrderReference) {
      void trackConversionSuiteUsage(storefrontSettings, {
        feature: 'thank_you_whatsapp_click',
        metadata: {
          orderNumber: resolvedOrderReference,
          hasWhatsappNumber: Boolean(resolvedWhatsappNumber),
          total: purchaseTotal || undefined,
        },
      });
    }
    if (!resolvedWhatsappNumber) return;
    window.open(whatsappUrl, '_blank');
  };

  const handleSupportEmailClick = () => {
    if (!resolvedOrderReference) return;
    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'thank_you_support_email_click',
      metadata: { orderNumber: resolvedOrderReference, hasSupportEmail: Boolean(supportEmail) },
    });
  };

  const handleTrackOrderSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const normalizedPhone = trackPhone.trim();
    setTrackOrderError('');

    if (!resolvedOrderReference) {
      setTrackedOrder(null);
      setTrackOrderError(
        prefersArabicCopy
          ? 'مرجع الطلب غير متاح في هذه اللحظة.'
          : 'The order reference is not available yet.',
      );
      return;
    }

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'thank_you_track_order_click',
      metadata: {
        orderNumber: resolvedOrderReference,
        hasPhone: Boolean(normalizedPhone),
      },
    });

    if (!normalizedPhone) {
      setTrackedOrder(null);
      setTrackOrderError(
        prefersArabicCopy
          ? 'أدخل رقم الهاتف المستخدم وقت إتمام الطلب.'
          : 'Enter the phone number used in checkout to track the order.',
      );
      return;
    }

    if (submittedPurchaseTracking?.phone && submittedTrackedOrder) {
      if (normalizedPhone !== submittedPurchaseTracking.phone.trim()) {
        setTrackedOrder(null);
        setTrackOrderError(
          prefersArabicCopy
            ? `استخدم رقم الهاتف ${submittedPurchaseTracking.phone} المستخدم وقت إتمام الطلب.`
            : `Use the checkout phone ${submittedPurchaseTracking.phone} to view this order.`,
        );
        return;
      }

      setTrackedOrder(submittedTrackedOrder);
      return;
    }

    try {
      setTrackOrderLoading(true);
      const response = await storefrontApi.trackOrder(resolvedOrderReference, normalizedPhone);

      if (response?.success && response?.data) {
        const resolvedTrackedOrder = response.data as TrackedOrderSummary;
        const resolvedTrackedTotal = Number(
          resolvedTrackedOrder.finalTotal || resolvedTrackedOrder.total || purchaseTotal,
        );

        setTrackedOrder(resolvedTrackedOrder);

        void trackConversionSuiteUsage(storefrontSettings, {
          feature: 'thank_you_track_order_success',
          dedupeKey: `thank-you-track-order-success:${resolvedOrderReference}:${normalizedPhone}`,
          metadata: {
            orderNumber: resolvedOrderReference,
            status: resolvedTrackedOrder.status || undefined,
            paymentMethod: resolvedTrackedOrder.paymentMethod || undefined,
            total:
              resolvedTrackedTotal > 0 ? Number(resolvedTrackedTotal.toFixed(2)) : undefined,
          },
        });

        return;
      }

      setTrackedOrder(null);
      const previewExpectedPhone =
        typeof (response?.data as { expectedPhone?: unknown } | undefined)?.expectedPhone ===
        'string'
          ? String((response?.data as { expectedPhone?: string }).expectedPhone || '')
          : '';
      setTrackOrderError(
        response?.error === 'PREVIEW_PHONE_MISMATCH' && previewExpectedPhone
          ? prefersArabicCopy
            ? `استخدم رقم الهاتف ${previewExpectedPhone} المرتبط بهذا الطلب.`
            : `Use the phone ${previewExpectedPhone} linked to this order.`
          : response?.error ||
              (prefersArabicCopy
                ? 'تعذّر تتبع الطلب الآن.'
                : 'Unable to track the order right now.'),
      );
    } catch (error) {
      console.error('Failed to track order from thank-you page:', error);
      setTrackedOrder(null);
      setTrackOrderError(
        prefersArabicCopy
          ? 'تعذّر تتبع الطلب الآن.'
          : 'Unable to track the order right now.',
      );
    } finally {
      setTrackOrderLoading(false);
    }
  };

  const handleReorder = () => {
    setReorderMessage('');
    setReorderError('');

    if (!resolvedOrderReference) {
      setReorderError(
        prefersArabicCopy
          ? 'مرجع الطلب غير متاح في هذه اللحظة.'
          : 'The order reference is not available yet.',
      );
      return;
    }

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'thank_you_reorder_click',
      metadata: {
        orderNumber: resolvedOrderReference,
        itemCount: reorderableItems.length || undefined,
        quantity: reorderQuantity || undefined,
      },
    });

    if (!reorderableItems.length) {
      setReorderError(
        prefersArabicCopy
          ? 'عناصر الطلب الأصلي غير متاحة حاليًا لإعادة الطلب السريعة.'
          : 'The original order items are not available for quick reorder.',
      );
      return;
    }

    let addedItems = 0;
    let addedQuantity = 0;
    const regeneratedGroupIds = new Map<string, string>();

    reorderableItems.forEach((item) => {
      const productId = String(item.productId || item.id || '').trim();
      const name = getDisplayItemName(item);
      const quantity = Math.max(1, Number(item.quantity || 1));
      const price = Number(item.price || 0);
      const quantityOffer = item.quantityOffer;
      const attributes = getDisplayItemAttributes(item);
      const nextGroupId =
        quantityOffer?.groupId
          ? regeneratedGroupIds.get(quantityOffer.groupId) ||
            `${quantityOffer.groupId}-${Date.now()}-${regeneratedGroupIds.size + 1}`
          : null;

      if (quantityOffer?.groupId && nextGroupId && !regeneratedGroupIds.has(quantityOffer.groupId)) {
        regeneratedGroupIds.set(quantityOffer.groupId, nextGroupId);
      }

      if (!productId || !name) return;
      const offerQuantity = Number(quantityOffer?.offerQuantity || 0);
      const cartQuantityOffer: CartItem['quantityOffer'] =
        quantityOffer?.groupId &&
        quantityOffer.offerId &&
        quantityOffer.offerLabel &&
        offerQuantity > 0
          ? {
              ...quantityOffer,
              groupId: nextGroupId || quantityOffer.groupId,
              offerId: quantityOffer.offerId,
              offerLabel: quantityOffer.offerLabel,
              offerQuantity,
            }
          : undefined;
      const cartItemId = buildCartItemId({
        id: item.id,
        productId,
        variantId: item.variantId || undefined,
        attributes,
      });

      addItem({
        id: cartItemId,
        productId,
        variantId: item.variantId || undefined,
        name,
        price,
        basePrice: price,
        quantity,
        imageUrl: item.imageUrl,
        attributes,
        quantityOffer: cartQuantityOffer,
      });

      trackAddToCartEvent({ id: productId, name, price, quantity });

      addedItems += 1;
      addedQuantity += quantity;
    });

    if (!addedItems) {
      setReorderError(
        prefersArabicCopy
          ? 'عناصر الطلب الأصلي غير متاحة حاليًا لإعادة الطلب السريعة.'
          : 'The original order items are not available for quick reorder.',
      );
      return;
    }

    setReorderMessage(reorderSuccessText);

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'thank_you_reorder_completed',
      metadata: {
        orderNumber: resolvedOrderReference,
        itemCount: addedItems,
        quantity: addedQuantity,
        total: purchaseTotal || undefined,
      },
    });
  };

  const trackedOrderLocation = resolveShippingLocation(effectiveTrackedOrder?.shippingAddress);

  return (
    <section className={shellClassName}>
      <div className={containerClassName}>
        <div className="space-y-6">
          <div className={successBadgeClassName}>
            <div className={successIconWrapClassName}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className={titleClassName}>
              {title}
            </h1>
            <p className={descriptionClassName}>
              {description}
            </p>
          </div>
        </div>

        <div className={summaryPanelClassName}>
          <div className="mb-8 flex flex-col items-center justify-between gap-4 border-b border-border/40 pb-8 md:flex-row">
            <div className="text-start">
              <p className={`mb-1 text-xs font-black uppercase tracking-[0.2em] ${accentOverlineClassName}`}>
                {orderNumberPrefix}
              </p>
              <p className="font-mono text-3xl font-black text-foreground">#{visibleOrderNumber}</p>
            </div>
            <div className={statusPillClassName}>
              <span className="relative flex h-2 w-2">
                <span className={statusPulseClassName} />
                <span className={statusDotClassName} />
              </span>
              <span className={`text-xs font-bold ${isPcHub ? 'text-current' : 'text-foreground'}`}>{statusLabel}</span>
            </div>
          </div>

          {isOfferAccepted ? (
            <div className="rounded-2xl border border-emerald-300/80 bg-emerald-500/10 p-4 sm:p-5 text-emerald-950 dark:text-emerald-100 flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm font-bold">
                ✓
              </div>
              <div className="space-y-0.5">
                <h3 className="font-black text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                  🎉 رائع! تمت إضافة العرض الخاص بنجاح إلى شحنتك
                </h3>
                <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                  تم تحديث بيانات طلبك وسيتم تجهيز وشحن العرض الإضافي داخل نفس الطرد.
                </p>
              </div>
            </div>
          ) : null}

          {showTimeline ? (
            <OrderStepTimeline currentStep={pcHubStatusExperience?.timelineStep || 'placed'} labels={timelineLabels} />
          ) : null}

          {isPcHub && pcHubStatusExperience ? (
            <div className={pcHubStatusExperience.spotlightCardClassName}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <span className={pcHubStatusExperience.spotlightBadgeClassName}>
                    {pcHubStatusExperience.spotlightEyebrow}
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-foreground">
                      {pcHubStatusExperience.spotlightTitle}
                    </h3>
                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                      {pcHubStatusExperience.spotlightDescription}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:max-w-[20rem] lg:justify-end">
                  {pcHubStatusExperience.chips.map((chip) => (
                    <span key={chip} className={pcHubStatusExperience.chipClassName}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {orderItemsForDisplay.length > 0 ? (
          <div className={recapPanelClassName}>
            <div className="space-y-2">
                <p className={`text-xs font-black uppercase tracking-[0.22em] ${accentOverlineClassName}`}>
                  {isSoftAftercare ? 'القطع المختارة' : 'ملخص الطلب'}
                </p>
                <h2 className="font-heading text-2xl font-black tracking-tight text-foreground">
                  {isSoftAftercare ? 'تفاصيل الطلب والاختيارات' : 'ملخص المنتجات والعروض'}
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {isSoftAftercare
                    ? 'نراجع هنا القطع التي ثبتت في الطلب حتى تبقى الصورة كاملة وواضحة قبل التوصيل.'
                    : 'كل عرض كميات يظهر هنا كباقة واحدة، مع القطع التي تم اختيارها داخل العرض.'}
                </p>
            </div>

            <div className={recapGridClassName}>
              {quantityOfferSummary.groups.map((group) => (
                <div
                  key={group.groupId}
                  className={singleSummaryCardClassName}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={offerPrimaryChipClassName}>
                          عرض كميات
                        </span>
                        <span className={offerSecondaryChipClassName}>
                          {group.selectedPieces} قطعة
                        </span>
                        {group.freeShipping ? (
                          <span className={offerFreeShippingChipClassName}>
                            شحن مجاني
                          </span>
                        ) : null}
                      </div>
                      <h3 className="text-base font-black text-foreground">
                        {group.offerLabel}
                      </h3>
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">إجمالي العرض</p>
                      <p className="text-lg font-black text-foreground">
                        {formatStorefrontCurrency(group.total, currency)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item, index) => (
                      <div
                        key={`${group.groupId}-${item.id}-${index}`}
                        className={orderItemCardClassName}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              القطعة {item.quantityOffer?.slotIndex || index + 1}
                            </p>
                            <p className="text-xs text-muted-foreground">{getDisplayItemName(item)}</p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatStorefrontCurrency(
                              Number(item.price || 0) * Number(item.quantity || 0),
                              currency,
                            )}
                          </p>
                        </div>
                        {Object.entries(getDisplayItemAttributes(item)).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(getDisplayItemAttributes(item)).map(([key, value]) => (
                              <span
                                key={`${group.groupId}-${item.id}-${key}`}
                                className={orderAttributeChipClassName}
                              >
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {quantityOfferSummary.singles.length > 0 ? (
                <div className={singleSummaryCardClassName}>
                  <div className="space-y-1">
                      <p className={`text-xs font-black uppercase tracking-[0.22em] ${accentOverlineClassName}`}>
                        {isSoftAftercare ? 'كل قطعة على حدة' : 'المنتجات الفردية'}
                      </p>
                      <h3 className="text-base font-black text-foreground">
                        {isSoftAftercare ? 'القطع التي ثبتت في الطلب' : 'القطع التي تم طلبها منفصلة'}
                      </h3>
                  </div>

                  <div className="space-y-3">
                    {quantityOfferSummary.singles.map((item, index) => (
                      <div
                        key={`single-${item.id}-${index}`}
                        className={orderItemCardClassName}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-foreground">{getDisplayItemName(item)}</p>
                            <p className="text-xs text-muted-foreground">
                              الكمية: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {formatStorefrontCurrency(
                              Number(item.price || 0) * Number(item.quantity || 0),
                              currency,
                            )}
                          </p>
                        </div>
                        {Object.entries(getDisplayItemAttributes(item)).length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(getDisplayItemAttributes(item)).map(([key, value]) => (
                              <span
                                key={`single-${item.id}-${key}`}
                                className={orderAttributeChipClassName}
                              >
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-8 pt-4">
          <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              className={primaryButtonClassName}
              onClick={handleContinueShopping}
            >
              {continueShoppingText}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={whatsappButtonClassName}
              onClick={handleWhatsappSupport}
              disabled={!resolvedWhatsappNumber}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.554 4.189 1.604 6.02L0 24l6.136-1.61c1.785.973 3.801 1.488 5.918 1.489h.005c6.634 0 12.032-5.396 12.035-12.032.001-3.214-1.252-6.234-3.528-8.51" />
              </svg>
              {whatsappSupportLabel}
            </Button>
          </div>

          {supportEmail ? (
            <div className={emailPanelClassName}>
              <p>
                {supportText}{' '}
                <a
                  href={`mailto:${supportEmail}`}
                  className={supportLinkClassName}
                  onClick={handleSupportEmailClick}
                >
                  {supportEmail}
                </a>
              </p>
            </div>
          ) : null}
        </div>

        {showTrackOrder || showReorder ? (
          <div className="grid gap-6 border-t border-border/40 pt-10 text-start lg:grid-cols-[1.1fr_0.9fr]">
            {showTrackOrder ? (
              <div className={utilityCardClassName}>
                <div className="space-y-2">
                  <p className={`text-xs font-black uppercase tracking-[0.22em] ${accentOverlineClassName}`}>
                    {prefersArabicCopy ? 'تحديثات الطلب' : 'Order updates'}
                  </p>
                  <h2 className="font-heading text-2xl font-black tracking-tight text-foreground">
                    {trackOrderTitle}
                  </h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {trackOrderDescription}
                  </p>
                </div>

                <form className="space-y-3" onSubmit={handleTrackOrderSubmit}>
                  <label
                    htmlFor="thank-you-track-phone"
                    className="block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    {trackOrderPhoneLabel}
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="thank-you-track-phone"
                      type="tel"
                      value={trackPhone}
                      onChange={(event) => setTrackPhone(event.target.value)}
                      placeholder={trackOrderPhonePlaceholder}
                      className={trackInputClassName}
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      className={subtleButtonClassName}
                      disabled={!resolvedOrderReference || trackOrderLoading}
                    >
                      {trackOrderLoading ? (prefersArabicCopy ? 'جارٍ التحقق...' : 'Checking...') : trackOrderButtonText}
                    </Button>
                  </div>
                </form>

                {trackOrderError ? (
                  <div className={errorMessageClassName}>
                    {trackOrderError}
                  </div>
                ) : null}

                {effectiveTrackedOrder ? (
                  <div className={nestedPanelClassName}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className={`text-xs font-black uppercase tracking-[0.18em] ${accentOverlineClassName}`}>
                          {prefersArabicCopy ? 'آخر حالة' : 'Latest status'}
                        </div>
                        <div className="mt-1 font-mono text-lg font-black text-foreground">
                          #{effectiveTrackedOrder.orderNumber}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusClassName(
                          effectiveTrackedOrder.status,
                        )}`}
                      >
                        {getOrderStatusText(effectiveTrackedOrder.status, undefined, prefersArabicCopy)}
                      </span>
                    </div>

                    {isPcHub && pcHubStatusExperience ? (
                      <div className={`${nestedCardClassName} space-y-2`}>
                        <div className={`text-xs font-black uppercase tracking-[0.18em] ${accentOverlineClassName}`}>
                          {pcHubStatusExperience.spotlightEyebrow}
                        </div>
                        <h3 className="text-sm font-black text-foreground">
                          {pcHubStatusExperience.spotlightTitle}
                        </h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {pcHubStatusExperience.spotlightDescription}
                        </p>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className={nestedCardClassName}>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {prefersArabicCopy ? 'طريقة الدفع' : 'Payment'}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground">
                        {getPaymentMethodText(effectiveTrackedOrder.paymentMethod, prefersArabicCopy)}
                        </div>
                      </div>
                      {effectiveTrackedOrder.storePromotionDiscount ? (
                        <div className={nestedCardClassName}>
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                            {effectiveTrackedOrder.storePromotionLabel || (prefersArabicCopy ? 'خصم الكمية' : 'Qty discount')}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-green-600">
                            -{formatStorefrontCurrency(effectiveTrackedOrder.storePromotionDiscount, currency)}
                          </div>
                        </div>
                      ) : null}
                      <div className={nestedCardClassName}>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {prefersArabicCopy ? 'إجمالي الطلب' : 'Order total'}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground">
                          {formatStorefrontCurrency(
                            Number(effectiveTrackedOrder.finalTotal || effectiveTrackedOrder.total || purchaseTotal),
                            currency,
                          )}
                        </div>
                      </div>
                      <div className={nestedCardClassName}>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {prefersArabicCopy ? 'عدد الأصناف' : 'Items'}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground">
                          {Number(effectiveTrackedOrder.items?.length || purchaseItems.length || 0)}
                        </div>
                      </div>
                    </div>

                    {trackedOrderLocation ? (
                      <div className={nestedCardClassName}>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {prefersArabicCopy ? 'عنوان التوصيل' : 'Shipping destination'}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-foreground">
                          {trackedOrderLocation}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {showReorder ? (
              <div className={utilityCardClassName}>
                <div className="space-y-2">
                  <p className={`text-xs font-black uppercase tracking-[0.22em] ${accentOverlineClassName}`}>
                    {isRoseBoutique
                      ? (prefersArabicCopy ? 'إعادة التنسيق' : 'Rebuild the look')
                      : (prefersArabicCopy ? 'إعادة الطلب' : 'Reorder flow')}
                  </p>
                  <h2 className="font-heading text-2xl font-black tracking-tight text-foreground">
                    {reorderTitle}
                  </h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    {reorderDescription}
                  </p>
                </div>

                <div className={nestedPanelClassName}>
                    <div className={`flex items-center justify-between gap-3 ${nestedCardClassName}`}>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {prefersArabicCopy ? 'أصناف جاهزة' : 'Ready items'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {prefersArabicCopy
                            ? 'الأصناف التي يمكن إعادتها إلى السلة فورًا.'
                            : 'Products that can go back to cart instantly.'}
                        </div>
                      </div>
                    <div className="text-2xl font-black text-foreground">
                      {reorderableItems.length}
                    </div>
                  </div>

                    <div className={`flex items-center justify-between gap-3 ${nestedCardClassName}`}>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {prefersArabicCopy ? 'إجمالي الكمية' : 'Total quantity'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {prefersArabicCopy
                            ? 'الكمية التي ستعود إلى السلة في الخطوة التالية.'
                            : 'Quantity that will be added in the next step.'}
                        </div>
                      </div>
                    <div className="text-2xl font-black text-foreground">
                      {reorderQuantity}
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className={reorderButtonClassName}
                  onClick={handleReorder}
                  disabled={!reorderableItems.length}
                >
                  {reorderButtonText}
                </Button>

                {reorderMessage ? (
                  <div className={successMessageClassName}>
                    {reorderMessage}
                  </div>
                ) : null}

                {reorderError ? (
                  <div className={errorMessageClassName}>
                    {reorderError}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {showRecommended ? (
          <div className="animate-in fade-in-0 border-t border-border/40 pt-20 duration-1000 delay-500">
            <PostPurchaseUpsellBlock
              orderReference={resolvedOrderReference}
              purchaseItems={purchaseItems}
              settings={{
                title: settings?.recommendedTitle || (prefersArabicCopy ? 'ممكن يعجبك كمان' : 'You may also like'),
                subtitle:
                  settings?.recommendedSubtitle ||
                  (isPcHub
                    ? (prefersArabicCopy
                      ? 'شاشات وملحقات وترقيات أقرب لنفس قرار الشراء لو حبيت تكمل الطلب من نفس الرحلة.'
                      : 'Displays, add-ons, and upgrades that fit the same buying decision.')
                    : isRoseBoutique
                      ? (prefersArabicCopy
                        ? 'إكسسوارات وطبقات خفيفة قريبة من الطلب الحالي، لو حبيتي تضيفي لمسة أخيرة.'
                        : 'Light layers and accessories that stay close to the same boutique mood.')
                    : (prefersArabicCopy
                      ? 'إضافات مناسبة للطلب الحالي لو حبيت تزود حاجة خفيفة.'
                      : 'Relevant add-ons that fit the order that was just created.')),
                limit: settings?.recommendedLimit || 4,
                badge:
                  settings?.recommendedBadge ||
                  (isPcHub
                    ? (prefersArabicCopy ? 'ترشيحات ما بعد الاعتماد' : 'Post-order picks')
                    : isRoseBoutique
                      ? (prefersArabicCopy ? 'تنسيقات إضافية' : 'Styling add-ons')
                    : (prefersArabicCopy ? 'اقتراحات بعد الطلب' : 'Post-purchase upsell')),
                ctaLabel:
                  settings?.recommendedCtaLabel ||
                  (isPcHub
                    ? (prefersArabicCopy ? 'أضف بسرعة' : 'Quick add')
                    : isRoseBoutique
                      ? (prefersArabicCopy ? 'أضيفيها للسلة' : 'Add to cart')
                      : (prefersArabicCopy ? 'أضف للسلة' : 'Add to cart')),
                chooseOptionsLabel:
                  settings?.recommendedChooseOptionsLabel ||
                  (isPcHub
                    ? (prefersArabicCopy ? 'راجع الخيارات' : 'Review options')
                    : isRoseBoutique
                      ? (prefersArabicCopy ? 'شاهدي التفاصيل' : 'View details')
                      : (prefersArabicCopy ? 'اختر الإضافات' : 'Choose options')),
                variantChoicesLabel:
                  settings?.recommendedVariantChoicesLabel ||
                  (isPcHub
                    ? (prefersArabicCopy ? 'خيارات الجهاز' : 'Device options')
                    : (prefersArabicCopy ? 'مقاسات متاحة' : 'Available sizes')),
                variant:
                  settings?.recommendedVariant ||
                  (isRoseBoutique ? 'boutique-afterglow' : 'standard'),
              }}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default OrderConfirmation;
