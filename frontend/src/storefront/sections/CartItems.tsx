import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import QuantitySelector from '../components/QuantitySelector';
import CartUpsellHost from '../components/CartUpsellHost';
import { useCartStore } from '../store/useCartStore';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { formatStorefrontCurrency } from '../utils/currency';
import { buildStorefrontPath } from '../utils/paths';
import StorefrontProductImage from '../components/StorefrontProductImage';
import { getCartItemImageCandidates } from '../utils/productImages';
import {
  getCartDisplayEntries,
  getDisplayAttributes,
} from '../utils/cartQuantityOffers';
import {
  localizeBiteRushAttributeEntries,
  localizeBiteRushName,
} from '../utils/biteRushCopy';
import { motion } from 'framer-motion';
import { Truck, Timer } from 'lucide-react';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { isPharmacyThemeId } from '../utils/pharmacyThemes';

interface CartItemsProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    emptyTitle?: string;
    emptyText?: string;
    continueShoppingText?: string;
    productLabel?: string;
    priceLabel?: string;
    quantityLabel?: string;
    totalLabel?: string;
    removeLabel?: string;
    headerBadge?: string;
    serviceHighlights?: string[] | string;
    serviceNoteLabel?: string;
    serviceNote?: string;
    showUpsell?: string | boolean;
    [key: string]: unknown;
  };
}

const normalizeVariant = (
  value: unknown,
):
  | 'standard'
  | 'editorial'
  | 'compact'
  | 'market-basket'
  | 'nature-cart'
  | 'playful-basket'
  | 'wardrobe-cart'
  | 'command-cart' => {
  if (typeof value !== 'string') {
    return 'standard';
  }

  const normalizedValue = value.trim().toLowerCase();
  if (
    normalizedValue === 'editorial' ||
    normalizedValue === 'compact' ||
    normalizedValue === 'standard' ||
    normalizedValue === 'market-basket' ||
    normalizedValue === 'nature-cart' ||
    normalizedValue === 'playful-basket' ||
    normalizedValue === 'wardrobe-cart' ||
    normalizedValue === 'command-cart'
  ) {
    return normalizedValue;
  }

  return 'standard';
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

const getHeaderWrapperClassName = (
  variant:
    | 'standard'
    | 'editorial'
    | 'compact'
    | 'market-basket'
    | 'nature-cart'
    | 'playful-basket'
    | 'wardrobe-cart'
    | 'command-cart',
) => {
  switch (variant) {
    case 'editorial':
      return 'mb-6 rounded-[1.5rem] border border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.22))] p-5';
    case 'compact':
      return 'mb-4 rounded-[1rem] border border-border bg-card p-4';
    case 'market-basket':
      return 'mb-6 rounded-[1.9rem] border border-[#f0d4b0] bg-[linear-gradient(180deg,#fffdf8_0%,#fff6ec_100%)] p-5 shadow-[0_24px_80px_-64px_rgba(154,93,34,0.14)]';
    case 'nature-cart':
      return 'mb-6 rounded-[1.9rem] border border-[#dbe3d4] bg-[linear-gradient(180deg,#ffffff_0%,#f4f8f2_100%)] p-5 shadow-[0_24px_80px_-64px_rgba(26,51,40,0.14)]';
    case 'command-cart':
      return 'mb-6 rounded-[2rem] border border-[#e7d7b6] bg-[linear-gradient(135deg,#fffdf8_0%,#fff7e7_54%,#ffffff_100%)] p-5 shadow-[0_34px_96px_-72px_rgba(90,62,24,0.26)] sm:p-6';
    case 'wardrobe-cart':
      return 'mb-6 rounded-[1.8rem] border border-[#ead9d8] bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f7_100%)] p-5 shadow-[0_24px_80px_-64px_rgba(107,33,49,0.16)]';
    case 'playful-basket':
      return 'mb-8 rounded-[2.5rem] bg-sky-100 p-8 text-center dark:bg-sky-900/30';
    default:
      return 'mb-6';
  }
};

const getListWrapperClassName = (
  variant:
    | 'standard'
    | 'editorial'
    | 'compact'
    | 'market-basket'
    | 'nature-cart'
    | 'playful-basket'
    | 'wardrobe-cart'
    | 'command-cart',
) => {
  switch (variant) {
    case 'editorial':
      return 'overflow-hidden rounded-[1.6rem] border border-border bg-card shadow-[0_24px_80px_-65px_hsl(var(--foreground)/0.45)]';
    case 'compact':
      return 'overflow-hidden rounded-[1rem] border border-border bg-card';
    case 'market-basket':
      return 'space-y-4';
    case 'nature-cart':
      return 'space-y-4';
    case 'command-cart':
      return 'space-y-4';
    case 'wardrobe-cart':
      return 'space-y-4';
    case 'playful-basket':
      return 'space-y-6';
    default:
      return 'space-y-1';
  }
};

const getRowClassName = (
  variant:
    | 'standard'
    | 'editorial'
    | 'compact'
    | 'market-basket'
    | 'nature-cart'
    | 'playful-basket'
    | 'wardrobe-cart'
    | 'command-cart',
) => {
  switch (variant) {
    case 'editorial':
      return 'grid grid-cols-1 items-center gap-4 border-b border-border/70 px-5 py-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto]';
    case 'compact':
      return 'grid grid-cols-1 items-center gap-3 border-b border-border px-4 py-4 md:grid-cols-[2fr_1fr_1fr_1fr_auto]';
    case 'market-basket':
      return 'grid grid-cols-1 items-center gap-5 rounded-[1.8rem] border border-[#f0d4b0] bg-white/95 px-4 py-5 shadow-[0_22px_70px_-58px_rgba(154,93,34,0.14)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]';
    case 'nature-cart':
      return 'grid grid-cols-1 items-center gap-5 rounded-[1.8rem] border border-[#dbe3d4] bg-white/95 px-4 py-5 shadow-[0_22px_70px_-58px_rgba(26,51,40,0.14)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]';
    case 'command-cart':
      return 'grid grid-cols-1 items-center gap-5 rounded-[1.9rem] border border-[#ebdcc0] bg-white/95 px-4 py-5 shadow-[0_28px_86px_-74px_rgba(90,62,24,0.26)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]';
    case 'wardrobe-cart':
      return 'grid grid-cols-1 items-center gap-5 rounded-[1.7rem] border border-[#ead9d8] bg-white px-4 py-5 shadow-[0_22px_70px_-58px_rgba(107,33,49,0.14)] md:grid-cols-[2fr_1fr_1fr_1fr_auto]';
    case 'playful-basket':
      return 'grid grid-cols-1 items-center gap-6 rounded-[2.5rem] border-4 border-white bg-white/60 p-6 shadow-xl backdrop-blur-md transition-transform hover:-rotate-1 active:scale-[0.98] md:grid-cols-[2fr_1fr_1fr_1fr_auto] dark:border-slate-800 dark:bg-slate-900/60';
    default:
      return 'grid grid-cols-1 items-center gap-4 border-b border-border px-4 py-5 md:grid-cols-[2fr_1fr_1fr_1fr_auto]';
  }
};

const FreeShippingProgress = ({
  total,
  threshold,
  currency,
  isBiteRush = false,
  isPharmacy = false,
  isCommandCart = false,
}: {
  total: number;
  threshold: number;
  currency: string;
  isBiteRush?: boolean;
  isPharmacy?: boolean;
  isCommandCart?: boolean;
}) => {
  const progress = Math.min((total / threshold) * 100, 100);
  const remaining = Math.max(threshold - total, 0);
  const title =
    progress >= 100
      ? isPharmacy
        ? 'مبروك! التوصيل علينا'
        : isCommandCart
          ? 'تم تفعيل الشحن المحمي'
        : 'مبروك! شحنك مجاني'
      : isPharmacy
        ? 'توصيل مجاني للطلبات الأكبر'
        : isCommandCart
          ? 'شحن محمي للأجهزة'
        : 'خدمة الشحن المجاني';
  const description =
    progress >= 100
      ? isPharmacy
        ? 'الطلب الحالي وصل لحد التوصيل المجاني وبدأنا نجهزه براحة أكثر.'
        : isCommandCart
          ? 'الطلب الحالي أصبح مؤهلًا لشحن محمي مع متابعة قبل التسليم.'
        : 'لقد وصلت لحد الشحن المجاني بنجاح'
      : isPharmacy
        ? `أضف ${formatStorefrontCurrency(remaining, currency)} ليصل الطلب مجانًا حتى باب البيت`
        : isCommandCart
          ? `أضف ${formatStorefrontCurrency(remaining, currency)} لتفعيل شحن محمي مجاني للأجهزة والإكسسوارات`
        : `أضف ${formatStorefrontCurrency(remaining, currency)} إضافية للحصول على شحن مجاني`;
  
  return (
    <div
      className={`mb-8 rounded-[2rem] p-6 backdrop-blur-sm ${
        isBiteRush
          ? 'border border-[#f8c08c] bg-[linear-gradient(135deg,#fffaf4_0%,#fff1e4_100%)] shadow-[0_22px_55px_-42px_rgba(247,115,22,0.3)]'
          : isPharmacy
            ? 'border border-[#99f6e4] bg-[linear-gradient(135deg,#f8fffd_0%,#eafaf6_100%)] shadow-[0_22px_55px_-42px_rgba(20,184,166,0.22)]'
          : isCommandCart
            ? 'border border-[#e7d7b6] bg-[linear-gradient(135deg,#fffdf8_0%,#fff7e7_100%)] shadow-[0_22px_55px_-42px_rgba(90,62,24,0.18)]'
          : 'border border-border/50 bg-secondary/30'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isBiteRush
                ? 'bg-[#111111] text-white'
                : isPharmacy
                  ? 'bg-[#0f766e] text-white'
                  : isCommandCart
                    ? 'bg-[#1f1f1b] text-[#f5d68b]'
                  : 'bg-primary/10 text-primary'
            }`}
          >
            <Truck size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-foreground uppercase tracking-widest">
              {title}
            </h4>
            <p className="text-[11px] text-muted-foreground font-medium">
              {description}
            </p>
          </div>
        </div>
        <span
          className={`text-xs font-black ${
            isPharmacy ? 'text-[#0f766e]' : isCommandCart ? 'text-[#6d5527]' : 'text-primary'
          }`}
        >
          {Math.round(progress)}%
        </span>
      </div>
      
      <div
        className={`relative h-3 w-full overflow-hidden rounded-full p-[2px] ${
          isBiteRush
            ? 'border border-[#f8c08c] bg-white/90'
            : isPharmacy
              ? 'border border-[#99f6e4] bg-white/90'
              : isCommandCart
                ? 'border border-[#ecdab4] bg-white/90'
              : 'border border-border/50 bg-background'
        }`}
      >
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${
              isBiteRush
                ? 'bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] shadow-[0_0_15px_rgba(249,115,22,0.45)]'
                : isPharmacy
                  ? 'bg-[linear-gradient(135deg,#14b8a6_0%,#0f766e_100%)] shadow-[0_0_15px_rgba(20,184,166,0.35)]'
                  : isCommandCart
                    ? 'bg-[linear-gradient(135deg,#2b2a25_0%,#8d6a2c_52%,#f0c56a_100%)] shadow-[0_0_15px_rgba(141,106,44,0.35)]'
                : 'bg-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]'
            }`}
          />
      </div>
    </div>
  );
};

const CartTimer = ({
  isBiteRush = false,
  isPharmacy = false,
  isCommandCart = false,
}: {
  isBiteRush?: boolean;
  isPharmacy?: boolean;
  isCommandCart?: boolean;
}) => {
  const [timeLeft, setTimeLeft] = React.useState(600); // 10 minutes

  React.useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
        className={`mb-6 flex items-center justify-center gap-2 rounded-full px-4 py-3 ${
          isBiteRush
            ? 'border border-[#f8c08c] bg-[linear-gradient(135deg,#fff6ec_0%,#fff0df_100%)]'
            : isPharmacy
              ? 'border border-[#99f6e4] bg-[linear-gradient(135deg,#f5fffd_0%,#ecfbf8_100%)]'
              : isCommandCart
                ? 'border border-[#ead8b1] bg-[linear-gradient(135deg,#fffaf0_0%,#fff3da_100%)]'
            : 'border border-amber-200/50 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/20'
        }`}
      >
        <Timer
          size={14}
          className={
            isPharmacy
              ? 'animate-pulse text-[#0f766e]'
              : isCommandCart
                ? 'animate-pulse text-[#8d6a2c]'
                : 'text-amber-600 animate-pulse'
          }
        />
        <span
          className={`text-[11px] font-black uppercase tracking-widest ${
            isBiteRush
              ? 'text-[#8a4b1f]'
              : isPharmacy
                ? 'text-[#115e59]'
                : isCommandCart
                  ? 'text-[#6d5527]'
              : 'text-amber-900 dark:text-amber-200'
          }`}
        >
          {isPharmacy
            ? 'محتويات الطلب محفوظة لك لمدة:'
            : isCommandCart
              ? 'حجز المخزون والمراجعة محفوظ لك لمدة:'
              : 'العربة محجوزة لك لمدة:'}{' '}
          {minutes}:{seconds
          .toString()
          .padStart(2, '0')}
        </span>
    </div>
  );
};

const CartItems: React.FC<CartItemsProps> = ({ section, settings }) => {
  const { items, updateQuantity, removeItem, removeQuantityOfferGroup } = useCartStore();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const isNovaMobile = theme.id === 'nova-mobile';
  const isBiteRush = theme.id === 'restaurant-demo';
  const isPharmacy = isPharmacyThemeId(theme.id);
  const isButcherCart = theme.id === 'butcher-counter-eg';
  const isSproutRoom = theme.id === 'elessi-sprout-room';
  const location = useLocation();
  const pharmacyBrandName = theme.header?.brandName || theme.name;
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);
  const displayEntries = React.useMemo(() => getCartDisplayEntries(items), [items]);
  
  const cartTotal = React.useMemo(() => {
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
  const emptyTitle = settings?.emptyTitle || 'السلة فاضية';
  const emptyText =
    settings?.emptyText || 'يبدو إنك لسه ما ضفت أي منتج للسلة.';
  const continueShoppingText =
    settings?.continueShoppingText || 'كمّل تسوق';
  const productLabel = settings?.productLabel || 'المنتج';
  const priceLabel = settings?.priceLabel || 'السعر';
  const quantityLabel = settings?.quantityLabel || 'الكمية';
  const totalLabel = settings?.totalLabel || 'الإجمالي';
  const removeLabel = settings?.removeLabel || 'إزالة المنتج';
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

  if (items.length === 0) {
    return (
      <section
        className={`w-full py-20 ${
          isBiteRush
            ? 'bg-[radial-gradient(circle_at_top,#fff3e1_0%,#fffaf4_42%,#fff_78%)]'
            : isSproutRoom
              ? 'bg-[radial-gradient(circle_at_top,#eef5ea_0%,#fbfaf5_48%,#fff_82%)]'
            : isPharmacy
              ? 'bg-[radial-gradient(circle_at_top,#e9fbf6_0%,#f8fffd_45%,#fff_82%)]'
              : isMarketCart
                ? 'bg-[radial-gradient(circle_at_top,#fff6ea_0%,#fffdf8_45%,#fff_82%)]'
              : isNatureCart
                ? 'bg-[radial-gradient(circle_at_top,#eef5ea_0%,#f8fbf7_45%,#fff_82%)]'
              : 'bg-background'
        }`}
      >
        <div
          className={`container flex flex-col items-center space-y-4 px-4 text-center md:px-6 ${
            isBiteRush
              ? 'rounded-[2.2rem] border border-[#f8c08c] bg-white/75 py-12 shadow-[0_30px_80px_-60px_rgba(247,115,22,0.28)]'
              : isSproutRoom
                ? 'rounded-[2rem] border border-[#d8e6d8] bg-white/90 py-12 shadow-[0_26px_74px_-60px_rgba(32,53,40,0.14)]'
              : isPharmacy
                ? 'rounded-[2.2rem] border border-[#99f6e4] bg-white/85 py-12 shadow-[0_30px_80px_-60px_rgba(20,184,166,0.22)]'
                : isMarketCart
                  ? 'rounded-[2.2rem] border border-[#f0d4b0] bg-white/88 py-12 shadow-[0_30px_80px_-60px_rgba(154,93,34,0.16)]'
                : isNatureCart
                  ? 'rounded-[2.2rem] border border-[#dbe3d4] bg-white/88 py-12 shadow-[0_30px_80px_-60px_rgba(26,51,40,0.14)]'
                : ''
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={
              isBiteRush
                ? 'text-[#f97316]/40'
                : isPharmacy
                  ? 'text-[#14b8a6]/35'
                  : isMarketCart
                    ? 'text-[#c9874a]/35'
                  : isNatureCart
                    ? 'text-[#476343]/30'
                  : 'text-muted-foreground/40'
            }
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          <h2 className="font-heading text-xl font-bold text-foreground">
            {emptyTitle}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">{emptyText}</p>
          <Link
            to={shopPath}
            className={continueShoppingClassName}
          >
            {continueShoppingText}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
        className={`w-full ${
          variant === 'wardrobe-cart'
            ? 'bg-[linear-gradient(180deg,#fffdfc_0%,#fff8f7_48%,#ffffff_100%)]'
            : isSproutRoom
              ? 'bg-[linear-gradient(180deg,#fbfaf5_0%,#eef5ea_42%,#ffffff_100%)]'
            : isNatureCart
              ? 'bg-[linear-gradient(180deg,#f8fbf7_0%,#eef5ea_42%,#ffffff_100%)]'
            : isMarketCart
              ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#fff7ef_44%,#ffffff_100%)]'
            : isCommandCart
              ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#fff8ee_44%,#ffffff_100%)]'
            : 'bg-background'
        }`}
      >
        <div className={headerWrapperClassName}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
            {isBiteRush ? (
              <span className="inline-flex rounded-full bg-[#111111] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                سلة BiteRush
              </span>
            ) : isSproutRoom ? (
              <span className="inline-flex rounded-full border border-[#d8e6d8] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#43604b]">
                {headerBadge}
              </span>
            ) : isPharmacy ? (
                <span className="inline-flex rounded-full bg-[#0f766e] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                  {`سلة ${pharmacyBrandName}`}
                </span>
            ) : isMarketCart ? (
              <span className="inline-flex rounded-full border border-[#f0d4b0] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b6037]">
                {headerBadge}
              </span>
            ) : isNatureCart ? (
              <span className="inline-flex rounded-full border border-[#dbe3d4] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#4a6843]">
                {headerBadge}
              </span>
            ) : isCommandCart ? (
              <span className="inline-flex rounded-full border border-[#e7d7b6] bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#6d5527]">
                {headerBadge}
              </span>
            ) : isWomenFashionCart ? (
              <span className="inline-flex rounded-full border border-[#f3c8c1] bg-[#fff2ee] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#8b3d33]">
                مراجعة السلة
              </span>
            ) : variant === 'wardrobe-cart' ? (
              <span className="inline-flex rounded-full border border-[#f3c8c1] bg-[#fff2ee] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#8b3d33]">
                مراجعة السلة
              </span>
            ) : null}
            <h2
              className={`font-heading font-black tracking-tight text-foreground ${
                isWomenFashionCart ? 'text-xl sm:text-[1.65rem]' : 'text-2xl'
              }`}
            >
              {title}
            </h2>
            <p
              className={`max-w-2xl text-sm text-muted-foreground ${
                isWomenFashionCart ? 'leading-6' : 'leading-7'
              }`}
            >
              {subtitle}
            </p>
            {hasServiceCartTone && serviceHighlights.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {serviceHighlights.map((item) => (
                  <span
                    key={item}
                    className={`inline-flex rounded-full border bg-white/95 px-3 py-1 text-[11px] font-semibold ${
                      isMarketCart
                        ? 'border-[#f0d4b0] text-[#8b6037]'
                        : isNatureCart
                          ? 'border-[#dbe3d4] text-[#4a6843]'
                          : 'border-[#ead8b1] text-[#6d5527]'
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <span className={countBadgeClassName}>
            {displayEntries.length}{' '}
            {isPharmacy
              ? 'عناصر جاهزة'
              : isMarketCart
                ? 'عناصر للمراجعة'
                : isNatureCart
                  ? 'اختيارات جاهزة'
                  : isCommandCart
                    ? 'وحدات للمراجعة'
                    : 'منتجات'}
          </span>
        </div>
        {hasServiceCartTone ? (
          <div
            className={`mt-4 rounded-[1.4rem] bg-white/88 p-4 text-sm shadow-[0_18px_50px_-42px_rgba(90,62,24,0.16)] ${
              isMarketCart
                ? 'border border-[#f0d4b0] text-[#7b5531] shadow-[0_18px_50px_-42px_rgba(154,93,34,0.12)]'
                : isNatureCart
                  ? 'border border-[#dbe3d4] text-[#4a6843] shadow-[0_18px_50px_-42px_rgba(26,51,40,0.12)]'
                  : 'border border-[#ecdcbf] text-[#5b4a28]'
            }`}
          >
            <p
              className={`text-[11px] font-black uppercase tracking-[0.18em] ${
                isMarketCart
                  ? 'text-[#a36a34]'
                  : isNatureCart
                    ? 'text-[#5b7c54]'
                    : 'text-[#8d6a2c]'
              }`}
            >
              {serviceNoteLabel}
            </p>
            <p className="mt-1 leading-7">{serviceNote}</p>
          </div>
        ) : null}
      </div>

      {shouldShowCartMomentum && (
        <div className="px-4 md:px-0">
          <CartTimer
            isBiteRush={isBiteRush}
            isPharmacy={isPharmacy}
            isCommandCart={isCommandCart}
          />
          <FreeShippingProgress 
            total={cartTotal} 
            threshold={isCommandCart ? 25000 : freeShippingThreshold} 
            currency={currency} 
            isBiteRush={isBiteRush}
            isPharmacy={isPharmacy}
            isCommandCart={isCommandCart}
          />
        </div>
      )}

      <div className={listWrapperClassName}>
        {variant !== 'playful-basket' && !isBiteRush && !isPharmacy && !isCommandCart && !isMarketCart && !isNatureCart && (
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <span>{productLabel}</span>
            <span>{priceLabel}</span>
            <span>{quantityLabel}</span>
            <span>{totalLabel}</span>
            <span className="w-10">&nbsp;</span>
          </div>
        )}

        {displayEntries.map((entry) =>
          entry.type === 'single' ? (() => {
            const itemName = getItemName(entry.item);
            const attributeEntries = getAttributeEntries(entry.item.attributes);

            return (
            <div key={entry.key} className={rowClassName}>
              <div className={`flex ${isWomenFashionCart ? 'items-start gap-3.5' : 'items-center gap-4'}`}>
                <div className={imageWrapperClassName}>
                  <StorefrontProductImage
                    candidates={getCartItemImageCandidates(entry.item)}
                    alt={itemName}
                    loading="lazy"
                    width="80"
                    height="80"
                    className="h-full w-full object-cover"
                    fallback="IMG"
                  />
                </div>
                <div className={isWomenFashionCart ? 'space-y-0.5' : undefined}>
                  <h3
                    className={`font-heading text-sm text-foreground ${
                      isWomenFashionCart ? 'font-bold leading-5' : 'font-semibold'
                    }`}
                  >
                    {itemName}
                  </h3>
                  {hasServiceCartTone ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          isButcherCart
                            ? 'border-[#c5a059]/40 bg-[#3f0c0d] text-[#c5a059]'
                          : isMarketCart
                            ? 'border-[#f0d4b0] bg-[#fff2df] text-[#8b6037]'
                            : isNatureCart
                              ? 'border-[#dbe3d4] bg-[#edf5e8] text-[#4a6843]'
                              : 'border-[#ead8b1] bg-[#fff8ea] text-[#6d5527]'
                        }`}
                      >
                        {isButcherCart
                          ? (theme.direction === 'rtl' ? 'درجة الأتيليه' : 'ATELIER GRADE')
                          : isMarketCart
                          ? 'تجهيز واضح'
                          : isNatureCart
                            ? 'متابعة هادئة'
                            : 'فحص قبل الشحن'}
                      </span>
                      <span
                        className={`inline-flex rounded-full border bg-white px-2.5 py-1 text-[10px] font-semibold ${
                          isButcherCart
                            ? 'border-[#c5a059]/40 text-[#3f0c0d]'
                          : isMarketCart
                            ? 'border-[#f0d4b0] text-[#9a6c41]'
                            : isNatureCart
                              ? 'border-[#dbe3d4] text-[#5b7c54]'
                              : 'border-[#efdfbe] text-[#7c6430]'
                        }`}
                      >
                        {isButcherCart
                           ? (theme.direction === 'rtl' ? 'مقطع يدويًا' : 'HAND-CUT SELECTION')
                           : isNatureCart ? 'تغليف مناسب' : 'تغليف محمي'}
                      </span>
                    </div>
                  ) : null}
                  {attributeEntries.map(([key, value]) => (
                    <p
                      key={key}
                      className={`text-xs text-muted-foreground ${
                        isWomenFashionCart ? 'mt-0 leading-5' : 'mt-0.5'
                      }`}
                    >
                      {key}: {value}
                    </p>
                  ))}
                  {entry.pricing.totalDiscount > 0 ? (
                    <p className="mt-1 text-xs font-medium text-emerald-600">
                      تم تطبيق خصم الكمية
                    </p>
                  ) : null}
                </div>
              </div>

              <div className={`text-foreground ${isWomenFashionCart ? 'text-[13px]' : 'text-sm'}`}>
                <span className="mr-2 text-xs text-muted-foreground md:hidden">
                  {priceLabel}:
                </span>
                <span>{formatStorefrontCurrency(entry.pricing.effectiveUnitPrice, currency)}</span>
                {entry.pricing.totalDiscount > 0 ? (
                  <span className="ml-2 text-xs text-muted-foreground line-through">
                    {formatStorefrontCurrency(entry.pricing.baseUnitPrice, currency)}
                  </span>
                ) : null}
              </div>

              <div>
                <QuantitySelector
                  value={entry.item.quantity}
                  onChange={(quantity) => updateQuantity(entry.item.id, quantity)}
                />
              </div>

              <div className={`font-semibold text-foreground ${isWomenFashionCart ? 'text-[13px]' : 'text-sm'}`}>
                <span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">
                  {totalLabel}:
                </span>
                {formatStorefrontCurrency(entry.pricing.lineSubtotal, currency)}
              </div>

              <button
                onClick={() => removeItem(entry.item.id)}
                className={removeButtonClassName}
                aria-label={`${removeLabel} ${itemName}`}
                title={removeLabel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )})() : (
            <div key={entry.key} className={rowClassName}>
              <div className="space-y-3 md:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                    isBiteRush
                      ? 'bg-[#111111] text-white'
                      : isPharmacy
                        ? 'bg-[#0f766e] text-white'
                        : isWomenFashionCart
                          ? 'border border-[#f3c8c1] bg-[#fff2ee] text-[#8b3d33]'
                          : 'bg-primary/10 text-primary'
                  }`}>
                    {isPharmacy ? 'عرض موفّر' : 'عرض الكمية'}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isBiteRush
                      ? 'border border-[#f8c08c] bg-[#fff1e2] text-[#8a4b1f]'
                      : isPharmacy
                        ? 'border border-[#99f6e4] bg-[#e6fffa] text-[#115e59]'
                        : isWomenFashionCart
                          ? 'border border-[#f1dfdc] bg-white text-[#8b5f59]'
                          : 'bg-secondary text-foreground'
                  }`}>
                    {entry.group.selectedPieces} قطعة
                  </span>
                  {entry.group.freeShipping ? (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-black text-emerald-600">
                      شحن مجاني
                    </span>
                  ) : null}
                </div>
                <div>
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    {entry.group.offerLabel}
                  </h3>
                  <div className={`mt-3 ${isWomenFashionCart ? 'space-y-2.5' : 'space-y-3'}`}>
                    {entry.group.items.map(({ item }, index) => {
                      const itemName = getItemName(item);
                      const attributeEntries = getAttributeEntries(item.attributes);

                      return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-[1rem] ${
                          isWomenFashionCart ? 'p-2.5' : 'p-3'
                        } ${
                          isBiteRush
                            ? 'border border-[#f8c08c] bg-white/80'
                            : isPharmacy
                              ? 'border border-[#99f6e4] bg-white/90'
                            : isWomenFashionCart
                              ? 'border border-[#f1dfdc] bg-[#fffaf8]'
                              : 'border border-border/60 bg-background/60'
                        }`}
                      >
                        <div
                          className={`${variant === 'compact' ? 'h-12 w-12' : 'h-14 w-14'} flex shrink-0 items-center justify-center overflow-hidden rounded-[0.85rem] ${
                            isBiteRush
                              ? 'bg-[#fff1e2] text-[#a14a14]'
                              : isPharmacy
                                ? 'bg-[#e6fffa] text-[#115e59]'
                                : 'bg-muted text-xs text-muted-foreground'
                          }`}
                        >
                          <StorefrontProductImage
                            candidates={getCartItemImageCandidates(item)}
                            alt={itemName}
                            loading="lazy"
                            width="56"
                            height="56"
                            className="h-full w-full object-cover"
                            fallback="IMG"
                          />
                        </div>
                        <div className={isWomenFashionCart ? 'space-y-0.5' : 'space-y-1'}>
                          <p className="text-xs font-black text-foreground">
                            القطعة {item.quantityOffer?.slotIndex || index + 1}
                          </p>
                          {attributeEntries.map(([key, value]) => (
                            <p key={key} className="text-xs text-muted-foreground">
                              {key}: {value}
                            </p>
                          ))}
                          {item.quantity > 1 ? (
                            <p className="text-xs text-muted-foreground">الكمية: {item.quantity}</p>
                          ) : null}
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </div>

              <div className="text-sm text-foreground">
                <span className="mr-2 text-xs text-muted-foreground md:hidden">
                  {priceLabel}:
                </span>
                <span>عرض خاص</span>
              </div>

              <div className="text-sm text-foreground">
                <span className="mr-2 text-xs text-muted-foreground md:hidden">
                  {quantityLabel}:
                </span>
                <span>{entry.group.selectedPieces}</span>
              </div>

              <div className="text-sm font-semibold text-foreground">
                <span className="mr-2 text-xs font-normal text-muted-foreground md:hidden">
                  {totalLabel}:
                </span>
                <span>{formatStorefrontCurrency(entry.group.subtotal, currency)}</span>
                {entry.group.totalDiscount > 0 ? (
                  <p className="mt-1 text-xs font-medium text-emerald-600">
                    وفرت {formatStorefrontCurrency(entry.group.totalDiscount, currency)}
                  </p>
                ) : null}
              </div>

              <button
                onClick={() => removeQuantityOfferGroup(entry.group.groupId)}
                className={removeButtonClassName}
                aria-label={`${removeLabel} ${entry.group.offerLabel}`}
                title={removeLabel}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ),
        )}
      </div>

      {showUpsell ? <CartUpsellHost open={items.length > 0} layout="inline" /> : null}
    </section>
  );
};

export default CartItems;
