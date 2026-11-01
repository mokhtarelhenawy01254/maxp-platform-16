import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { storefrontApi } from '../../../utils/storefrontApi';
import { buildStorefrontPath } from '../../utils/paths';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { useStorefrontFacebookTracking } from '../../hooks/useStorefrontFacebookTracking';
import { buildCartItemId, useCartStore, type CartItem } from '../../store/useCartStore';
import { trackConversionSuiteUsage } from '../../utils/conversionSuiteTracking';
import {
  getOrderItemAttributes,
  groupOrderQuantityOfferItems,
  type OrderQuantityOfferItem,
} from '../../utils/orderQuantityOffers';
import {
  localizeBiteRushAttributeRecord,
  localizeBiteRushName,
} from '../../utils/biteRushCopy';
import {
  getMarketplacePreviewPurchaseTracking,
  getMarketplacePreviewTrackedOrder,
} from '../../preview/marketplacePreviewOrder';
import { resolvePreviewThemeId } from '../../preview/previewContext';
import { isPharmacyThemeId } from '../../utils/pharmacyThemes';
import { isKhemetLuxeTheme } from '../../utils/navigationGuards';
import {
  clearStoredPurchaseTracking,
  getStoredPurchaseTracking,
  hasMarkedPurchaseTracked,
  markPurchaseTracked,
} from '../../utils/purchaseTrackingStorage';
import {
  asRecord,
  asTrimmedString,
  getPcHubStatusExperience,
  normalizeOrderConfirmationVariant,
  normalizeOrderStatus,
  resolveShippingLocation,
  type OrderConfirmationProps,
  type PurchaseTrackingState,
  type TrackedOrderSummary,
} from './types';

export function sanitizeOrderConfirmationCopy<T extends string | undefined>(text: T): T {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/لكِ/g, 'لك')
    .replace(/تابعي التسوق/g, 'متابعة التسوق')
    .replace(/كمّلي التسوق/g, 'مواصلة التسوق')
    .replace(/شاهدي تنسيقات أخرى/g, 'تصفح المزيد من المنتجات')
    .replace(/شاهدي بقية المجموعة/g, 'تصفح بقية المجموعة')
    .replace(/ارجعي للتسوق/g, 'العودة للتسوق')
    .replace(/معاكي/g, 'معك')
    .replace(/تحتاجين مساعدة؟/g, 'تحتاج مساعدة؟')
    .replace(/هل تحتاجين مساعدة؟/g, 'هل تحتاج مساعدة؟')
    .replace(/تحتاجين تعديل المقاس/g, 'تحتاج تعديل المقاس')
    .replace(/تواصلي معنا/g, 'تواصل معنا')
    .replace(/إذا احتجتِ/g, 'إذا احتجت')
    .replace(/لو محتاجة/g, 'لو محتاج')
    .replace(/لو حبيتي/g, 'لو حبيت')
    .replace(/لو حابة/g, 'لو حابب')
    .replace(/تابعي حالة الطلب/g, 'متابعة حالة الطلب')
    .replace(/راجعي حالة الطلب/g, 'متابعة حالة الطلب')
    .replace(/أدخلي نفس/g, 'أدخل نفس')
    .replace(/اكتبي نفس/g, 'اكتب نفس')
    .replace(/اعرضي آخر/g, 'اعرض آخر')
    .replace(/اعرضي حالة/g, 'اعرض حالة')
    .replace(/تحققي من/g, 'تحقق من')
    .replace(/أعيدي نفس/g, 'أعد نفس')
    .replace(/كرري نفس/g, 'كرر نفس')
    .replace(/رجّعي نفس/g, 'أعد نفس')
    .replace(/رجعيها/g, 'أعدها')
    .replace(/أضيفي نفس/g, 'أضف نفس')
    .replace(/أضيفي للسلة/g, 'أضف للسلة')
    .replace(/أضيفيها للسلة/g, 'أضفها للسلة')
    .replace(/شاهدي التفاصيل/g, 'عرض التفاصيل')
    .replace(/شوفي التفاصيل/g, 'عرض التفاصيل')
    .replace(/شاهدي المقاسات/g, 'عرض المقاسات')
    .replace(/اختاري المقاس/g, 'اختر المقاس')
    .replace(/لو تحبين/g, 'لو تحب')
    .replace(/تتوقعينها/g, 'تتوقعها') as T;
}

export const useOrderConfirmationController = (props: OrderConfirmationProps) => {
  const { section, settings: rawSettings } = props;
  const settings = useMemo(() => {
    if (!rawSettings) return rawSettings;
    const sanitized = { ...rawSettings };
    if (sanitized.title) sanitized.title = sanitizeOrderConfirmationCopy(sanitized.title);
    if (sanitized.description) sanitized.description = sanitizeOrderConfirmationCopy(sanitized.description);
    if (sanitized.continueShoppingText) sanitized.continueShoppingText = sanitizeOrderConfirmationCopy(sanitized.continueShoppingText);
    if (sanitized.supportText) sanitized.supportText = sanitizeOrderConfirmationCopy(sanitized.supportText);
    if (sanitized.trackOrderTitle) sanitized.trackOrderTitle = sanitizeOrderConfirmationCopy(sanitized.trackOrderTitle);
    if (sanitized.trackOrderDescription) sanitized.trackOrderDescription = sanitizeOrderConfirmationCopy(sanitized.trackOrderDescription);
    if (sanitized.trackOrderButtonText) sanitized.trackOrderButtonText = sanitizeOrderConfirmationCopy(sanitized.trackOrderButtonText);
    if (sanitized.reorderTitle) sanitized.reorderTitle = sanitizeOrderConfirmationCopy(sanitized.reorderTitle);
    if (sanitized.reorderDescription) sanitized.reorderDescription = sanitizeOrderConfirmationCopy(sanitized.reorderDescription);
    if (sanitized.reorderButtonText) sanitized.reorderButtonText = sanitizeOrderConfirmationCopy(sanitized.reorderButtonText);
    if (sanitized.recommendedTitle) sanitized.recommendedTitle = sanitizeOrderConfirmationCopy(sanitized.recommendedTitle);
    if (sanitized.recommendedSubtitle) sanitized.recommendedSubtitle = sanitizeOrderConfirmationCopy(sanitized.recommendedSubtitle);
    if (sanitized.recommendedCtaLabel) sanitized.recommendedCtaLabel = sanitizeOrderConfirmationCopy(sanitized.recommendedCtaLabel);
    if (sanitized.recommendedChooseOptionsLabel) sanitized.recommendedChooseOptionsLabel = sanitizeOrderConfirmationCopy(sanitized.recommendedChooseOptionsLabel);
    return sanitized;
  }, [rawSettings]);
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
          ? `استلمنا طلبك في ${storeName}، وهنراجع المقاس والعنوان ونتواصل معك لتأكيد الشحن خلال 24 ساعة.`
          : `We received your order at ${storeName} and will confirm the size, address, and shipping details within 24 hours.`)
      : isRoseBoutique
          ? (prefersArabicCopy
            ? `شكرًا لتسوقك من ${storeName}. سنراجع المقاس والعنوان بهدوء قبل التجهيز، ونرسل لك تحديثات أقرب خطوة بخطوة حتى يصل الطلب بشكل أوضح وأسهل.`
          : `Thanks for shopping with ${storeName}. We are softly reviewing size, address, and preparation details before dispatch.`)
      : (prefersArabicCopy
        ? `شكرًا لتسوقك من ${storeName}. فريقنا بدأ تجهيز طلبك وسيتواصل معك لتأكيد بيانات الشحن.`
        : `Thanks for shopping with ${storeName}. Our team is already preparing your order and will contact you to confirm shipping details.`));
  const continueShoppingText =
    settings?.continueShoppingText ||
    (isPcHub
      ? (prefersArabicCopy ? 'تابع تصفح الأجهزة' : 'Browse more gear')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'مواصلة التسوق' : 'Continue shopping')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'تصفح المزيد من المنتجات' : 'Browse more looks')
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
          ? 'لو حبيت تسأل عن الشحن أو تعدل العنوان، تواصل معنا على'
          : 'Need a shipping or address update? Reach us via')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'إذا احتجت تعديلًا على المقاس أو العنوان تواصل معنا عبر' : 'Need a size or address update? Reach us via')
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
        ? (prefersArabicCopy ? 'متابعة حالة الطلب' : 'Review order status')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'متابعة حالة الطلب' : 'Review order status')
        : (prefersArabicCopy ? 'تتبع هذا الطلب' : 'Track this order'));
  const trackOrderDescription =
    settings?.trackOrderDescription ||
    (isPcHub
      ? (prefersArabicCopy
        ? 'أدخل نفس رقم الموبايل المستخدم وقت الطلب لمعرفة آخر تحديث على المراجعة والتجهيز والشحن.'
        : 'Use the same checkout phone number to see the latest prep, review, and shipping update.')
      : isKhemetLuxe
        ? (prefersArabicCopy
          ? 'اكتب نفس رقم الموبايل المستخدم وقت الطلب لمعرفة آخر تحديث على التأكيد والتجهيز والشحن.'
          : 'Use the same checkout phone number to view the latest confirmation, prep, and shipping update.')
      : isRoseBoutique
          ? (prefersArabicCopy
            ? 'أدخل نفس رقم الموبايل المستخدم وقت الطلب لمعرفة آخر تحديث على المراجعة والتجهيز والشحن.'
            : 'Use the same checkout phone number to review the latest confirmation, prep, and shipping update.')
      : (prefersArabicCopy
        ? 'تحقق من أحدث حالة للطلب باستخدام نفس رقم الهاتف الذي استُخدم أثناء إتمام الطلب.'
        : 'Check the latest order status using the same phone number used during checkout.'));
  const trackOrderButtonText =
    settings?.trackOrderButtonText ||
    (isPcHub
      ? (prefersArabicCopy ? 'اعرض آخر تحديث' : 'Show latest update')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'اعرض حالة الطلب' : 'Show order status')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'اعرض آخر تحديث' : 'Show latest update')
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
        ? (prefersArabicCopy ? 'أعد نفس الاختيارات للسلة' : 'Bring the same picks back to cart')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'أعد نفس الاختيارات بسهولة' : 'Rebuild the same picks easily')
        : (prefersArabicCopy ? 'أعد طلب نفس المنتجات' : 'Reorder the same items'));
  const reorderDescription =
    settings?.reorderDescription ||
    (isPcHub
      ? (prefersArabicCopy
        ? 'ارجّع نفس الجهاز والإضافات إلى السلة مرة واحدة لو تريد تكرار الطلب أو تجهيز طلب مشابه.'
        : 'Return the same device and add-ons to the cart in one step for a repeat setup.')
      : isKhemetLuxe
        ? (prefersArabicCopy
          ? 'لو حبيت تكرر نفس الموديلات أو تعدل المقاس في خطوة جديدة، أعدها للسلة بضغطة واحدة.'
          : 'Bring the same styles back to the cart in one step if you want to repeat or adjust the order.')
      : isRoseBoutique
          ? (prefersArabicCopy
            ? 'لو حبيت تكرر نفس القطع أو تجهز طلبًا قريبًا منها، أعدها إلى السلة بضغطة واحدة.'
            : 'Bring the same pieces back to cart in one step if you want to rebuild a similar order.')
      : (prefersArabicCopy
        ? 'أضف منتجات الطلب الأصلي إلى السلة مرة واحدة وكمّل التجربة بسرعة.'
        : 'Add the original order items back to cart in one step and keep the momentum going.'));
  const reorderButtonText =
    settings?.reorderButtonText ||
    (isPcHub
      ? (prefersArabicCopy ? 'أضف نفس التجهيزة للسلة' : 'Add the same setup to cart')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'أعد المنتجات للسلة' : 'Add the same picks to cart')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'أضف نفس القطع للسلة' : 'Add the same pieces to cart')
        : (prefersArabicCopy ? 'أضف هذه المنتجات مرة أخرى' : 'Add these items again'));
  const reorderSuccessText =
    settings?.reorderSuccessText ||
    (isPcHub
      ? (prefersArabicCopy ? 'رجّعنا نفس التجهيزة إلى السلة.' : 'The same setup is back in the cart.')
      : isKhemetLuxe
        ? (prefersArabicCopy ? 'أعدنا نفس الاختيارات للسلة.' : 'The same picks are back in the cart.')
      : isRoseBoutique
          ? (prefersArabicCopy ? 'أعدنا نفس الاختيارات إلى السلة.' : 'The same picks are back in the cart.')
        : (prefersArabicCopy ? 'تمت إضافة منتجات الطلب إلى السلة.' : 'The order items were added back to cart.'));
  const whatsappUrl = `https://wa.me/${resolvedWhatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
  const homePath = buildStorefrontPath(location.pathname, '/', location.search);

  // Styling classes
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

  return {
    theme,
    prefersArabicCopy,
    isBiteRush,
    isPcHub,
    isSoftAftercare,
    isOfferAccepted,
    currency,
    visibleOrderNumber,
    resolvedOrderReference,
    pcHubStatusExperience,
    effectiveTrackedOrder,
    effectiveStatus,
    title,
    description,
    continueShoppingText,
    orderNumberPrefix,
    supportText,
    supportEmail,
    statusLabel,
    whatsappSupportLabel,
    resolvedWhatsappNumber,
    timelineLabels,
    showTimeline,
    showRecommended,
    showTrackOrder,
    showReorder,
    trackPhone,
    setTrackPhone,
    trackOrderLoading,
    trackOrderError,
    reorderMessage,
    reorderError,
    trackOrderTitle,
    trackOrderDescription,
    trackOrderButtonText,
    trackOrderPhoneLabel,
    trackOrderPhonePlaceholder,
    reorderTitle,
    reorderDescription,
    reorderButtonText,
    reorderableItems,
    reorderQuantity,
    trackedOrderLocation,
    purchaseItems,
    purchaseTotal,
    orderItemsForDisplay,
    quantityOfferSummary,
    summaryBlockCount,
    getDisplayItemName,
    getDisplayItemAttributes,
    handleContinueShopping,
    handleWhatsappSupport,
    handleSupportEmailClick,
    handleTrackOrderSubmit,
    handleReorder,
    sanitizedSettings: settings,
    // Styling classes
    shellClassName,
    containerClassName,
    successBadgeClassName,
    successIconWrapClassName,
    summaryPanelClassName,
    recapPanelClassName,
    utilityCardClassName,
    primaryButtonClassName,
    whatsappButtonClassName,
    emailPanelClassName,
    trackInputClassName,
    subtleButtonClassName,
    successMessageClassName,
    errorMessageClassName,
    statusPillClassName,
    statusPulseClassName,
    statusDotClassName,
    offerGroupCardClassName,
    offerPrimaryChipClassName,
    offerSecondaryChipClassName,
    offerFreeShippingChipClassName,
    nestedPanelClassName,
    nestedCardClassName,
    orderItemCardClassName,
    orderAttributeChipClassName,
    reorderButtonClassName,
    accentOverlineClassName,
    supportLinkClassName,
    titleClassName,
    descriptionClassName,
    recapGridClassName,
    singleSummaryCardClassName,
  };
};

export type OrderConfirmationController = ReturnType<typeof useOrderConfirmationController>;
