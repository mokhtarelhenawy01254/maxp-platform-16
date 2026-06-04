import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';
import { getDefaultRegisteredVariantId, hasRegisteredVariant } from '../variants';
import { resolveSectionContentAlign } from '../utils/contentAlignment';

interface ShopPromoRailProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    spotlightLabel?: string;
    spotlightTitle?: string;
    spotlightText?: string;
    ctaText?: string;
    ctaLink?: string;
    trustItems?: string;
    highlights?: string;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

interface RailItem {
  title: string;
  description: string;
}

interface HighlightItem {
  label: string;
  value: string;
}

const parseRailItems = (value: unknown, fallback: RailItem[]): RailItem[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const parsed = value
    .split(/\r?\n/)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean))
    .map(([title, description]) => ({ title: title || '', description: description || '' }))
    .filter((item) => item.title && item.description);

  return parsed.length > 0 ? parsed : fallback;
};

const parseHighlights = (
  value: unknown,
  fallback: HighlightItem[],
): HighlightItem[] => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const parsed = value
    .split(/\r?\n/)
    .map((line) => line.split('|').map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean))
    .map(([label, val]) => ({ label: label || '', value: val || '' }))
    .filter((item) => item.label && item.value);

  return parsed.length > 0 ? parsed : fallback;
};

type ShopPromoRailVariant = 'trust-rail' | 'campaign-rail' | 'stylist-rail';

const SHOP_PROMO_RAIL_FAMILY = 'ShopPromoRail';
const SHOP_PROMO_RAIL_DEFAULT =
  (getDefaultRegisteredVariantId(SHOP_PROMO_RAIL_FAMILY) as
    | ShopPromoRailVariant
    | undefined) || 'trust-rail';

const normalizeShopPromoRailVariant = (
  rawVariant: unknown,
): ShopPromoRailVariant => {
  const value = String(rawVariant || '').trim().toLowerCase();
  if (
    (value === 'trust-rail' || value === 'campaign-rail' || value === 'stylist-rail') &&
    hasRegisteredVariant(SHOP_PROMO_RAIL_FAMILY, value)
  ) {
    return value as ShopPromoRailVariant;
  }
  return SHOP_PROMO_RAIL_DEFAULT;
};

const ShopPromoRail: React.FC<ShopPromoRailProps> = ({
  section,
  settings,
}) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const isSmartBazaar = theme.id === 'smart-bazaar';
  const isPcHub = theme.id === 'pc-hub-eg';
  const isRtl = theme.direction === 'rtl';
  const variant = normalizeShopPromoRailVariant(section?.variant);

  const trustItems = useMemo(
    () =>
      parseRailItems(settings?.trustItems, [
        {
          title: 'شحن سريع',
          description: 'توصيل داخل مصر خلال 48 ساعة على المنتجات المتاحة.',
        },
        {
          title: 'قرار شراء أوضح',
          description: 'اعرف الخصم الحالي، الشحن، والدفع قبل ما تكمل الطلب.',
        },
        {
          title: 'استبدال أسهل',
          description: 'سياسة واضحة على المنتجات المؤهلة تقلل التردد قبل الشراء.',
        },
      ]),
    [settings?.trustItems],
  );

  const highlightItems = useMemo(
    () =>
      parseHighlights(settings?.highlights, [
        { label: 'خصم اليوم', value: '15%' },
        { label: 'الشحن المجاني', value: '750+ ج.م' },
        { label: 'التوصيل', value: 'خلال 48 ساعة' },
      ]),
    [settings?.highlights],
  );

  const badge =
    settings?.badge ||
    (variant === 'campaign-rail'
      ? 'عروض الأسبوع'
      : variant === 'stylist-rail'
        ? 'اختيار الستايل'
        : 'الثقة والخصومات');
  const title =
    settings?.title ||
    (isRtl
      ? variant === 'stylist-rail'
        ? 'اختيارات تساعدك تكمّلي اللوك بسرعة'
        : 'عروض وخدمة تساعدك تحسم الطلب'
      : 'Offers and service that help shoppers decide');
  const subtitle =
    settings?.subtitle ||
    (isRtl
      ? variant === 'stylist-rail'
        ? 'هذا المسار يوضح أين تبدأي، ما الذي يستحق العروض، وأين تظهر القطع المكملة بدون تشتيت.'
        : 'راجع الخصم الحالي، حد الشحن المجاني، وخيارات الدفع قبل ما تكمل السلة.'
      : 'Review the live offer, free-shipping threshold, and payment options before checkout.');
  const spotlightLabel =
    settings?.spotlightLabel ||
    (variant === 'campaign-rail'
      ? 'حملة الأسبوع'
      : variant === 'stylist-rail'
        ? 'ترشيح الستايلست'
        : 'عرض اليوم');
  const spotlightTitle =
    settings?.spotlightTitle ||
    (isRtl
      ? variant === 'campaign-rail'
        ? 'خصومات مجددة على الأقسام الأسرع'
        : variant === 'stylist-rail'
          ? 'ابدئي من القطعة الأساسية ثم أضيفي ما يكمل الإطلالة'
        : 'أضف قطعة إضافية ووفر فورًا'
      : variant === 'campaign-rail'
        ? 'Fresh deals across the fastest categories'
        : 'Add one more item and save instantly');
  const spotlightText =
    settings?.spotlightText ||
    (isRtl
      ? variant === 'stylist-rail'
        ? 'قسّمنا التصفح بين القطعة الأساسية، القطع المكملة، والعروض حتى يبقى قرار الشراء أخف على الموبايل.'
        : 'استفد من خصم سريع مع شحن واضح وخيارات دفع تناسبك قبل نهاية الأسبوع.'
      : 'Use the current discount with clear shipping and payment options before the week ends.');
  const ctaText = settings?.ctaText || (isRtl ? 'شاهد العروض' : 'View Offers');
  const ctaLink = settings?.ctaLink || '/sale';
  const contentAlign = resolveSectionContentAlign(
    settings?.contentAlign,
    theme.tokens.layout?.contentAlign,
  );
  const isCentered = contentAlign === 'center';

  return (
    <aside className="sticky top-28 space-y-4">
      <div
          className={`rounded-[calc(var(--radius)+0.35rem)] border p-5 ${
            variant === 'stylist-rail'
              ? 'border-[#ead8cf] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(250,242,236,0.96))] shadow-[0_30px_90px_-64px_rgba(76,42,44,0.28)]'
              : isPcHub
              ? 'border-[#dfe4ea] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,222,0.94))] shadow-[0_30px_90px_-62px_rgba(31,36,44,0.22)]'
              : isSmartBazaar
              ? 'border-primary/12 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.72))] shadow-[0_28px_90px_-62px_hsl(var(--primary)/0.42)]'
              : 'border-border bg-card shadow-[0_22px_70px_-48px_rgba(15,23,42,0.35)]'
        }`}
      >
        <span
            className={`inline-flex rounded-[var(--button-radius)] px-3 py-1 text-[11px] font-bold tracking-[0.12em] ${
              variant === 'stylist-rail'
                ? 'border border-[#eed8cf] bg-[#2f232d] text-white'
                : isPcHub
                ? 'border border-[#1f242c]/10 bg-[#1f242c] text-[#fff4d1]'
                : isSmartBazaar
                ? 'border border-primary/12 bg-primary text-primary-foreground'
                : 'border border-primary/10 bg-primary/5 text-primary'
          }`}
        >
          {badge}
        </span>
        <div className={`mt-4 space-y-2 ${isCentered ? 'text-center' : ''}`}>
          <h3 className="font-heading text-xl font-black leading-tight text-foreground">
            {title}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-5 space-y-3">
          {trustItems.map((item) => (
            <div
              key={`${item.title}-${item.description}`}
                className={`rounded-[calc(var(--radius)-0.15rem)] border p-4 ${
                  variant === 'stylist-rail'
                    ? 'border-[#ead8cf] bg-white/88'
                    : isPcHub
                    ? 'border-[#d9dee5] bg-white shadow-[0_20px_42px_-34px_rgba(31,36,44,0.18)]'
                    : isSmartBazaar
                    ? 'border-primary/10 bg-background/84 shadow-sm'
                    : 'border-border bg-background/70'
              } ${isCentered ? 'text-center' : ''}`}
            >
              <div className="text-sm font-bold text-foreground">{item.title}</div>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div
          className={`overflow-hidden rounded-[calc(var(--radius)+0.35rem)] border p-5 ${
            variant === 'stylist-rail'
              ? 'border-[#e8d7cf] bg-[linear-gradient(180deg,#fff8f4,rgba(244,219,210,0.38),#fffdfb)] shadow-[0_30px_90px_-56px_rgba(143,77,65,0.34)]'
              : isPcHub
              ? 'border-[#e4d8b3] bg-[linear-gradient(180deg,rgba(255,247,214,0.9),rgba(255,255,255,0.98)_44%,rgba(255,249,232,0.92))] shadow-[0_30px_84px_-56px_rgba(186,140,26,0.28)]'
              : isSmartBazaar
              ? 'border-amber-200 bg-[linear-gradient(180deg,rgba(255,204,117,0.28),rgba(255,255,255,0.98)_46%,rgba(255,247,237,0.92))] shadow-[0_30px_90px_-58px_rgba(217,119,6,0.42)]'
              : variant === 'campaign-rail'
              ? 'border-accent/20 bg-[linear-gradient(180deg,hsl(var(--accent)/0.16),#ffffff,hsl(var(--primary)/0.06))] shadow-[0_28px_80px_-52px_rgba(217,119,6,0.34)]'
              : 'border-primary/12 bg-[linear-gradient(180deg,hsl(var(--primary)/0.08),hsl(var(--accent)/0.12),#ffffff)] shadow-[0_28px_80px_-52px_rgba(41,82,255,0.45)]'
        }`}
      >
        <div className={`space-y-2 ${isCentered ? 'text-center' : ''}`}>
          <div className="text-xs font-bold tracking-[0.12em] text-primary">
            {spotlightLabel}
          </div>
          <h3 className="font-heading text-xl font-black text-foreground">
            {spotlightTitle}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">{spotlightText}</p>
        </div>

        <div className="mt-5 grid gap-2">
          {highlightItems.map((item) => (
            <div
              key={`${item.label}-${item.value}`}
              className={`flex items-center justify-between rounded-[calc(var(--radius)+0.35rem)] border px-4 py-3 text-sm shadow-sm backdrop-blur ${
                variant === 'stylist-rail'
                  ? 'border-[#eedcd3] bg-white'
                  : isPcHub
                  ? 'border-[#f0e1aa] bg-white/90'
                  : isSmartBazaar
                  ? 'border-white/85 bg-background/86'
                  : 'border-white/70 bg-white/80'
              }`}
            >
              <span className="font-semibold text-muted-foreground">{item.label}</span>
              <span className="font-black text-foreground">{item.value}</span>
            </div>
          ))}
        </div>

        <Link
          to={buildStorefrontPath(location.pathname, ctaLink, location.search)}
          className={`mt-5 inline-flex w-full items-center justify-center rounded-[var(--button-radius)] px-4 py-3 text-sm font-black transition-opacity hover:opacity-95 ${
            variant === 'stylist-rail'
              ? 'bg-[linear-gradient(135deg,#2f232d_0%,#8f4d41_100%)] text-white'
              : isPcHub
              ? 'bg-[#1f242c] text-[#fff4d1] shadow-[0_20px_42px_-30px_rgba(31,36,44,0.55)]'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          {ctaText}
        </Link>
      </div>
    </aside>
  );
};

export default ShopPromoRail;
