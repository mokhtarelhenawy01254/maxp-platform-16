import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useCartStore } from '../../store/useCartStore';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import { useStorefrontLocale } from '../../i18n';
import { buildStorefrontPath } from '../../utils/paths';
import { getCartDisplayEntries, getDisplayAttributes } from '../../utils/cartQuantityOffers';
import { localizeBiteRushAttributeEntries, localizeBiteRushName } from '../../utils/biteRushCopy';
import { isPharmacyThemeId } from '../../utils/pharmacyThemes';
import { isKhemetLuxeTheme } from '../../utils/navigationGuards';
import type { CartItemsProps } from './cartItemsTypes';
import {
  getHeaderWrapperClassName,
  getListWrapperClassName,
  getRowClassName,
  normalizeVariant,
  parseBooleanSetting,
} from './cartItemsHelpers';

export const useCartItemsController = ({ section, settings }: CartItemsProps) => {
  const { items, updateQuantity, removeItem, removeQuantityOfferGroup } = useCartStore();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const { isRTL } = useStorefrontLocale();
  const prefersArabicCopy = isRTL;
  const isNovaMobile = theme.id === 'nova-mobile';
  const isBiteRush = theme.id === 'restaurant-demo';
  const isPharmacy = isPharmacyThemeId(theme.id);
  const isButcherCart = theme.id === 'butcher-counter-eg';
  const isSproutRoom = theme.id === 'elessi-sprout-room';
  const location = useLocation();
  const pharmacyBrandName = theme.header?.brandName || theme.name;
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);
  const displayEntries = useMemo(() => getCartDisplayEntries(items), [items]);

  const cartTotal = useMemo(() => {
    return displayEntries.reduce((sum, entry) => {
      if (entry.type === 'single') return sum + entry.pricing.lineSubtotal;
      return sum + entry.group.subtotal;
    }, 0);
  }, [displayEntries]);

  const freeShippingThreshold = isSproutRoom ? 1500 : isPharmacy ? 1200 : isButcherCart ? 5000 : 1000;
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'EGP';
  const variant = normalizeVariant(section?.variant);
  const isMarketCart = variant === 'market-basket';
  const isNatureCart = variant === 'nature-cart';
  const isCommandCart = variant === 'command-cart';
  const isWomenFashionCart = theme.id === 'women-fashion-eg' && variant === 'wardrobe-cart';
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const isWardrobeKhemet = isKhemetLuxe && variant === 'wardrobe-cart';
  const hasServiceCartTone = isCommandCart || isMarketCart || isNatureCart || isButcherCart;
  const title = settings?.title || 'سلة التسوق';
  const subtitle =
    settings?.subtitle ||
    (isSproutRoom
      ? 'راجع النباتات والأصص المختارة، عدّل الكميات، ثم انتقل للدفع بعد التأكد من حجم كل قطعة.'
      : isMarketCart
        ? 'راجع اختياراتك، عدّل الكميات، ثم أكمل الطلب بخطوة واضحة وسريعة.'
        : isNatureCart
          ? 'راجع المنتجات المختارة وعدّل الكميات بهدوء قبل متابعة الطلب.'
          : isCommandCart
            ? 'راجع الأجهزة والإضافات، ولو محتاج فاتورة أو تأكيد توافق سجّل ملاحظتك قبل اعتماد الطلب.'
            : 'راجع المنتجات اللي اخترتها، عدّل الكميات، وأكمل عملية الشراء لما تكون جاهز.');
  const emptyTitle = settings?.emptyTitle || (prefersArabicCopy ? 'السلة فاضية' : 'Your cart is empty');
  const emptyText = settings?.emptyText || (prefersArabicCopy ? 'يبدو إنك لسه ما ضفت أي منتج للسلة.' : 'You have not added any items to your cart yet.');
  const continueShoppingText = settings?.continueShoppingText || (prefersArabicCopy ? 'كمّل تسوق' : 'Continue Shopping');
  const productLabel = settings?.productLabel || (prefersArabicCopy ? 'المنتج' : 'Product');
  const priceLabel = settings?.priceLabel || (prefersArabicCopy ? 'السعر' : 'Price');
  const quantityLabel = settings?.quantityLabel || (prefersArabicCopy ? 'الكمية' : 'Quantity');
  const totalLabel = settings?.totalLabel || (prefersArabicCopy ? 'الإجمالي' : 'Subtotal');
  const removeLabel = settings?.removeLabel || (prefersArabicCopy ? 'إزالة المنتج' : 'Remove');
  const couponPlaceholder = settings?.couponPlaceholder;
  const couponButtonText = settings?.couponButtonText;
  const headerBadge =
    settings?.headerBadge ||
    (isSproutRoom
      ? 'Plant cart'
      : isMarketCart
        ? 'سلة المراجعة'
        : isNatureCart
          ? 'مراجعة هادئة'
          : isCommandCart
            ? 'محطة المراجعة الأخيرة'
            : undefined);
  const rawServiceHighlights = settings?.serviceHighlights;
  const serviceHighlights = (
    Array.isArray(rawServiceHighlights)
      ? rawServiceHighlights
      : typeof rawServiceHighlights === 'string'
        ? rawServiceHighlights.split(/,|\n/)
        : isMarketCart
          ? ['تأكيد قبل التنفيذ', 'شحن واضح', 'دعم سريع']
          : isNatureCart
            ? ['تغليف مناسب', 'مراجعة هادئة', 'متابعة حتى الاستلام']
            : ['تغليف محمي', 'ضمان على القطع المعتمدة', 'مساعدة توافق قبل الإرسال']
  )
    .map((item) => String(item).trim())
    .filter(Boolean);
  const serviceNoteLabel = settings?.serviceNoteLabel || 'قبل ما نؤكد الطلب';
  const serviceNote =
    settings?.serviceNote ||
    (isSproutRoom
      ? 'لو محتاج تنسيق هدية أو ملاحظة خاصة بالعناية بالنبات أثناء الشحن، اتركها في الخطوة التالية وسنراجعها قبل التجهيز.'
      : isMarketCart
        ? 'لو عندك علامة مميزة أو وقت مناسب للتواصل، اترك ملاحظتك في الخطوة التالية وسنراجعها قبل التنفيذ.'
        : isNatureCart
          ? 'لو عندك طلب خاص بالتغليف أو التوصيل أو الاستلام، اتركه في الخطوة التالية وسنراجعه قبل التجهيز.'
          : 'لو محتاج فاتورة باسم شركة أو مراجعة توافق قطعة مع جهازك، اترك ملاحظتك في الخطوة التالية وسنراجعها قبل الشحن.');
  const imageSizeClassName =
    isWomenFashionCart ? 'h-16 w-16' :
    variant === 'compact' ? 'h-16 w-16' :
    isWardrobeKhemet ? 'h-36 w-36 sm:h-40 sm:w-40' :
    variant === 'command-cart' ? 'h-[5.25rem] w-[5.25rem]' :
    variant === 'market-basket' ? 'h-[4.75rem] w-[4.75rem]' :
    variant === 'nature-cart' ? 'h-[4.75rem] w-[4.75rem]' :
    variant === 'wardrobe-cart' ? 'h-[4.5rem] w-[4.5rem]' :
    variant === 'playful-basket' ? 'h-24 w-24' : 'h-20 w-20';
  const shouldShowCartMomentum =
    !isSproutRoom &&
    (isNovaMobile || isBiteRush || isPharmacy || isCommandCart || isMarketCart || isNatureCart);
  const showUpsell = parseBooleanSetting(settings?.showUpsell, true);
  const headerWrapperClassName = isSproutRoom
    ? 'mb-6 border-b border-[#d8e6d8] pb-5'
    : isBiteRush
    ? 'mb-6 rounded-[2.2rem] border border-[#f8c08c] bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_50%,#ffe7d4_100%)] p-6 shadow-[0_30px_80px_-58px_rgba(247,115,22,0.34)]'
    : isPharmacy
      ? 'mb-6 rounded-[2.2rem] border border-[#99f6e4] bg-[linear-gradient(135deg,#f8fffd_0%,#ffffff_52%,#e5faf5_100%)] p-6 shadow-[0_30px_80px_-58px_rgba(20,184,166,0.22)]'
    : isMarketCart
      ? 'mb-6 rounded-[2.1rem] border border-[#f0d4b0] bg-[linear-gradient(135deg,#fffdf8_0%,#ffffff_52%,#fff0de_100%)] p-6 shadow-[0_30px_80px_-58px_rgba(154,93,34,0.16)]'
    : isNatureCart
      ? 'mb-6 rounded-[2.1rem] border border-[#dbe3d4] bg-[linear-gradient(135deg,#fbfdf9_0%,#ffffff_52%,#eef5ea_100%)] p-6 shadow-[0_30px_80px_-58px_rgba(26,51,40,0.14)]'
    : isWomenFashionCart
      ? 'mb-5 rounded-[1.55rem] border border-[#ead9d8] bg-[linear-gradient(135deg,#fffdfc_0%,#ffffff_56%,#fff6f3_100%)] p-4 shadow-[0_24px_70px_-58px_rgba(107,33,49,0.14)] sm:p-5'
      : getHeaderWrapperClassName(variant);
  const listWrapperClassName = isSproutRoom
    ? 'overflow-hidden border border-[#d8e6d8] bg-white'
    : isBiteRush || isPharmacy || isMarketCart || isNatureCart
      ? 'space-y-4'
      : isWomenFashionCart
        ? 'space-y-3'
      : getListWrapperClassName(variant);
  const rowClassName = isSproutRoom
    ? 'grid grid-cols-1 items-center gap-4 border-b border-[#d8e6d8] px-4 py-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto]'
    : isBiteRush
    ? 'grid grid-cols-1 items-center gap-5 rounded-[1.8rem] border border-[#f8c08c] bg-[linear-gradient(135deg,#fffdfb_0%,#fff3e7_100%)] px-4 py-5 shadow-[0_22px_60px_-48px_rgba(247,115,22,0.26)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]'
    : isPharmacy
      ? 'grid grid-cols-1 items-center gap-5 rounded-[1.8rem] border border-[#99f6e4] bg-[linear-gradient(135deg,#fcfffe_0%,#effbf8_100%)] px-4 py-5 shadow-[0_22px_60px_-48px_rgba(20,184,166,0.18)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]'
    : isMarketCart
      ? 'grid grid-cols-1 items-center gap-5 rounded-[1.8rem] border border-[#f0d4b0] bg-[linear-gradient(135deg,#fffdf8_0%,#fff6ec_100%)] px-4 py-5 shadow-[0_22px_60px_-48px_rgba(154,93,34,0.14)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]'
    : isNatureCart
      ? 'grid grid-cols-1 items-center gap-5 rounded-[1.8rem] border border-[#dbe3d4] bg-[linear-gradient(135deg,#ffffff_0%,#f3f7f0_100%)] px-4 py-5 shadow-[0_22px_60px_-48px_rgba(26,51,40,0.14)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]'
    : isWomenFashionCart
      ? 'grid grid-cols-1 items-center gap-4 rounded-[1.45rem] border border-[#ead9d8] bg-white px-3.5 py-4 shadow-[0_18px_52px_-46px_rgba(107,33,49,0.12)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]'
    : isWardrobeKhemet
      ? 'grid grid-cols-1 items-center gap-4 rounded-[1.5rem] border border-[#eadfd0] bg-white px-4 py-5 shadow-[0_22px_62px_-54px_rgba(65,35,58,0.2)] md:grid-cols-[minmax(0,1fr)_auto_auto_auto]'
      : getRowClassName(variant);
  const imageWrapperClassName = isSproutRoom
    ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border border-[#d8e6d8] bg-[#f4f8f2] text-xs text-[#6b8a74]`
    : isBiteRush
    ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#fff1e2] text-xs text-[#a14a14] shadow-inner`
    : isPharmacy
      ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[#e6fffa] text-xs text-[#115e59] shadow-inner`
      : isMarketCart
        ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-[#f0d4b0] bg-[#fff8ef] text-xs text-[#8b6037] shadow-inner`
      : isNatureCart
        ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-[#dbe3d4] bg-[#f4f8f2] text-xs text-[#4a6843] shadow-inner`
      : isCommandCart
        ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-[#ead8b1] bg-[linear-gradient(135deg,#fffaf0_0%,#fff1d8_100%)] text-xs text-[#6d5527]`
      : isWomenFashionCart
        ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] border border-[#f1dfdc] bg-[#fff7f5] text-xs text-[#8b3d33]`
      : isWardrobeKhemet
        ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-[#efe4df] bg-[#f8f7f6] text-xs shadow-[0_16px_34px_-28px_rgba(65,35,58,0.24)]`
      : variant === 'wardrobe-cart'
        ? `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-[#f1dfdc] bg-[#fff7f5] text-xs text-[#8b3d33]`
        : `${imageSizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-muted text-xs text-muted-foreground`;
  const removeButtonClassName = isSproutRoom
    ? 'flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e6d8] bg-white text-[#56715e] transition-colors hover:border-[#97b08f] hover:bg-[#f7fbf6] hover:text-[#203528]'
    : isBiteRush
    ? 'flex h-10 w-10 items-center justify-center rounded-full border border-[#111111]/10 bg-white text-[#8a4b1f] transition-colors hover:border-[#ef4444]/30 hover:bg-[#fff1ef] hover:text-[#ef4444]'
    : isPharmacy
      ? 'flex h-10 w-10 items-center justify-center rounded-full border border-[#0f766e]/12 bg-white text-[#115e59] transition-colors hover:border-[#0f766e]/30 hover:bg-[#ecfeff] hover:text-[#0f766e]'
      : isMarketCart
        ? 'flex h-10 w-10 items-center justify-center rounded-full border border-[#f0d4b0] bg-white text-[#8b6037] transition-colors hover:border-[#c9874a] hover:bg-[#fff8ef] hover:text-[#6b4423]'
      : isNatureCart
        ? 'flex h-10 w-10 items-center justify-center rounded-full border border-[#dbe3d4] bg-white text-[#4a6843] transition-colors hover:border-[#88a876] hover:bg-[#f6f8f2] hover:text-[#1f3a2d]'
      : isCommandCart
        ? 'flex h-10 w-10 items-center justify-center rounded-full border border-[#ead8b1] bg-white text-[#6d5527] transition-colors hover:border-[#d2b06b] hover:bg-[#fff8ea] hover:text-[#2b2a25]'
      : 'flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive';
  const continueShoppingClassName = isSproutRoom
    ? 'mt-4 rounded-full bg-[#203528] px-6 py-3 font-black text-[#f4fbf5] transition-opacity hover:opacity-90'
    : isBiteRush
    ? 'mt-4 rounded-full bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] px-6 py-3 font-black text-white shadow-[0_22px_60px_-36px_rgba(239,68,68,0.55)] transition-opacity hover:opacity-90'
    : isPharmacy
      ? 'mt-4 rounded-full bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] px-6 py-3 font-black text-white shadow-[0_22px_60px_-36px_rgba(15,118,110,0.4)] transition-opacity hover:opacity-90'
      : isMarketCart
        ? 'mt-4 rounded-full bg-[linear-gradient(135deg,#6b4423_0%,#c9874a_100%)] px-6 py-3 font-black text-white shadow-[0_22px_60px_-36px_rgba(154,93,34,0.32)] transition-opacity hover:opacity-90'
      : isNatureCart
        ? 'mt-4 rounded-full bg-[linear-gradient(135deg,#1a3328_0%,#476343_100%)] px-6 py-3 font-black text-white shadow-[0_22px_60px_-36px_rgba(26,51,40,0.28)] transition-opacity hover:opacity-90'
      : isCommandCart
        ? 'mt-4 rounded-full bg-[linear-gradient(135deg,#1f1f1b_0%,#725523_55%,#d5ac58_100%)] px-6 py-3 font-black text-white shadow-[0_22px_60px_-36px_rgba(90,62,24,0.42)] transition-opacity hover:opacity-90'
      : isWomenFashionCart
        ? 'mt-4 rounded-full bg-[linear-gradient(135deg,#3d2a2f_0%,#8f4d41_100%)] px-6 py-3 font-black text-white shadow-[0_22px_60px_-36px_rgba(107,33,49,0.24)] transition-opacity hover:opacity-90'
      : isWardrobeKhemet
        ? 'mt-4 border-b-2 border-[#221a15] pb-0.5 text-sm font-bold text-[#221a15] transition-colors hover:border-[#7b5a2f] hover:text-[#7b5a2f]'
        : 'mt-4 rounded-[var(--radius)] bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90';
  const countBadgeClassName = isSproutRoom
    ? 'inline-flex w-fit rounded-full border border-[#d8e6d8] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#43604b]'
    : isBiteRush
    ? 'inline-flex w-fit rounded-full bg-[#111111] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white'
    : isPharmacy
      ? 'inline-flex w-fit rounded-full bg-[#0f766e] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white'
      : isMarketCart
        ? 'inline-flex w-fit rounded-full border border-[#f0d4b0] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8b6037]'
      : isNatureCart
        ? 'inline-flex w-fit rounded-full border border-[#dbe3d4] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#4a6843]'
      : isCommandCart
        ? 'inline-flex w-fit rounded-full border border-[#ead8b1] bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#6d5527]'
      : isWomenFashionCart
        ? 'inline-flex w-fit rounded-full border border-[#f3c8c1] bg-[#fff2ee] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8b3d33]'
    : variant === 'wardrobe-cart'
      ? 'inline-flex w-fit rounded-full border border-[#f3c8c1] bg-[#fff2ee] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8b3d33]'
      : 'inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary';

  const getItemName = (item: { name?: string; productId?: string; id?: string }) =>
    isBiteRush ? localizeBiteRushName(item.name, item.productId, item.id) : String(item.name || '').trim();

  const getAttributeEntries = (attributes?: Record<string, string>) => {
    const entries = getDisplayAttributes(attributes, theme.direction === 'rtl');
    return isBiteRush ? localizeBiteRushAttributeEntries(entries) : entries;
  };

  return {
    items,
    updateQuantity,
    removeItem,
    removeQuantityOfferGroup,
    theme,
    isNovaMobile,
    isBiteRush,
    isPharmacy,
    isButcherCart,
    isSproutRoom,
    pharmacyBrandName,
    shopPath,
    displayEntries,
    cartTotal,
    freeShippingThreshold,
    currency,
    variant,
    isMarketCart,
    isNatureCart,
    isCommandCart,
    isWomenFashionCart,
    isWardrobeKhemet,
    hasServiceCartTone,
    title,
    subtitle,
    emptyTitle,
    emptyText,
    continueShoppingText,
    productLabel,
    priceLabel,
    quantityLabel,
    totalLabel,
    removeLabel,
    couponPlaceholder,
    couponButtonText,
    headerBadge,
    serviceHighlights,
    serviceNoteLabel,
    serviceNote,
    shouldShowCartMomentum,
    showUpsell,
    headerWrapperClassName,
    listWrapperClassName,
    rowClassName,
    imageWrapperClassName,
    removeButtonClassName,
    continueShoppingClassName,
    countBadgeClassName,
    getItemName,
    getAttributeEntries,
  };
};
