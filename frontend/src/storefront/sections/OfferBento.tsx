import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';
import { buildVersionedStorefrontStaticAssetUrl } from '../utils/productImages';
import StorefrontProductImage from '../components/StorefrontProductImage';
import { getDefaultRegisteredVariantId, hasRegisteredVariant } from '../variants';

interface OfferCard {
  label?: string;
  title: string;
  subtitle: string;
  ctaText?: string;
  link: string;
  tone?: string;
  stat?: string;
  image?: string;
}

interface OfferBentoProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    cards?: unknown;
    [key: string]: unknown;
  };
}

const DEFAULT_CARDS: OfferCard[] = [
  {
    label: 'اختيار اليوم',
    title: 'الأكثر طلبًا هذا الأسبوع',
    subtitle: 'منتجات عليها طلب أعلى وتناسب من يريد شراءً أسرع.',
    ctaText: 'شاهد المنتجات',
    link: '/shop?sort=popular',
    tone: 'primary',
    stat: 'الأكثر طلبًا',
  },
  {
    label: 'عروض موفرة',
    title: 'وفر أكثر عند الجمع',
    subtitle: 'اختيارات بأسعار أوضح وباقات تسهّل القرار من أول نظرة.',
    ctaText: 'اذهب للعروض',
    link: '/sale',
    tone: 'accent',
    stat: 'عروض يومية',
  },
  {
    label: 'خدمة أوضح',
    title: 'الشحن والمتابعة قبل الدفع',
    subtitle: 'اعرف التوصيل والمتابعة وسياسة الطلب قبل تأكيد الشراء.',
    ctaText: 'اعرف أكثر',
    link: '/shipping',
    tone: 'slate',
    stat: 'شحن خلال 48 ساعة',
  },
];

const TONE_CLASS_MAP: Record<string, string> = {
  primary:
    'border-primary/12 bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),rgba(255,255,255,0.96)_55%,hsl(var(--secondary)/0.92))] text-foreground',
  accent:
    'border-amber-200 bg-[linear-gradient(135deg,rgba(251,191,36,0.24),rgba(255,255,255,0.98)_58%,rgba(255,247,237,0.94))] text-foreground',
  slate:
    'border-slate-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.09),rgba(255,255,255,0.98)_58%,rgba(241,245,249,0.96))] text-foreground',
};

const isOfferCard = (value: unknown): value is OfferCard =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof (value as OfferCard).title === 'string' &&
  typeof (value as OfferCard).subtitle === 'string' &&
  typeof (value as OfferCard).link === 'string';

const parseCards = (value: unknown): OfferCard[] => {
  if (Array.isArray(value)) {
    const parsed = value.filter(isOfferCard).map((card) => ({
      label: card.label?.trim(),
      title: card.title.trim(),
      subtitle: card.subtitle.trim(),
      ctaText: card.ctaText?.trim(),
      link: card.link.trim(),
      tone: card.tone?.trim(),
      stat: card.stat?.trim(),
      image: card.image?.trim(),
    }));
    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = value
      .split(/\r?\n/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts.some(Boolean))
      .map(([label, title, subtitle, ctaText, link, tone, stat, image]) => ({
        label: label || undefined,
        title: title || '',
        subtitle: subtitle || '',
        ctaText: ctaText || undefined,
        link: link || '/shop',
        tone: tone || undefined,
        stat: stat || undefined,
        image: image || undefined,
      }))
      .filter((card) => card.title && card.subtitle && card.link);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return DEFAULT_CARDS;
};

const normalizeOfferText = (value: string): string =>
  value.trim().toLowerCase();

const resolveOfferSignals = (
  card: OfferCard,
  index: number,
  themeId?: string,
): string[] => {
  const content = normalizeOfferText(
    `${card.label || ''} ${card.title} ${card.subtitle} ${card.stat || ''}`,
  );

  if (themeId === 'restaurant-demo') {
    if (content.includes('كومبو') || content.includes('combo') || content.includes('value')) {
      return ['وجبة + بطاطس + مشروب', 'قرار أسرع', 'قيمة أعلى'];
    }

    if (content.includes('ليل') || content.includes('night') || content.includes('late')) {
      return ['طلبات ما بعد الدوام', 'إضافات جاهزة', 'سحب أسرع للسلة'];
    }

    return index === 0
      ? ['برجر smash', 'الأكثر طلبًا اليوم', 'زر طلب مباشر']
      : ['توصيل ساخن', 'رسالة أوضح', 'رفع متوسط الطلب'];
  }

  if (themeId === 'khemet-luxe-eg') {
    if (
      content.includes('2+1') ||
      content.includes('الثالث') ||
      content.includes('عرض')
    ) {
      return ['اختاري 3 أزواج', 'وفري في الطلب', 'مقاسات متاحة'];
    }

    if (
      content.includes('الأكثر') ||
      content.includes('popular') ||
      content.includes('طلب')
    ) {
      return ['موديلات رائجة', 'صور واضحة', 'اختيار أسرع'];
    }

    if (
      content.includes('مقاس') ||
      content.includes('نفاد') ||
      content.includes('new')
    ) {
      return ['مقاسات محدودة', 'طلب مباشر', 'توصيل أسرع'];
    }

    return ['صور واضحة', 'مقاسات أسهل', 'طلب من نفس الصفحة'];
  }

  if (
    content.includes('شحن') ||
    content.includes('استبدال') ||
    content.includes('ثقة') ||
    content.includes('آمن')
  ) {
    return ['الدفع عند الاستلام', 'استبدال حتى 14 يوم', 'متابعة واضحة للطلب'];
  }

  if (
    content.includes('عرض') ||
    content.includes('خصم') ||
    content.includes('سعر') ||
    content.includes('اقتصادي')
  ) {
    return ['خصم حتى 25%', 'منتجات أقل من 299 ج.م', 'عروض متجددة أسبوعيًا'];
  }

  if (
    content.includes('الأكثر') ||
    content.includes('سريع') ||
    content.includes('طلب')
  ) {
    return ['منظمات وعلب تخزين', 'هدايا عملية', 'تجهيز خلال 48 ساعة'];
  }

  return index === 0
    ? ['منتجات عملية', 'أسعار أوضح', 'قرار أسرع']
    : ['شحن واضح', 'توصيل أسرع', 'طلب مباشر'];
};

const resolveDistrictMarketOfferImage = (
  card: OfferCard,
  index: number,
): string => {
  const content = normalizeOfferText(
    `${card.label || ''} ${card.title} ${card.subtitle} ${card.stat || ''}`,
  );

  if (
    content.includes('شحن') ||
    content.includes('استبدال') ||
    content.includes('ثقة') ||
    content.includes('دفع')
  ) {
    return '/assets/themes/district-market/feature-clarity.webp';
  }

  if (
    content.includes('عرض') ||
    content.includes('خصم') ||
    content.includes('سعر')
  ) {
    return '/assets/themes/district-market/lane-deals.webp';
  }

  if (
    content.includes('الأكثر') ||
    content.includes('طلب') ||
    content.includes('حركة')
  ) {
    return '/assets/themes/district-market/lane-essentials.webp';
  }

  return index === 0
    ? '/assets/themes/district-market/hero-scene.webp'
    : '/assets/themes/district-market/lane-home.webp';
};

const resolveCampaignStackImage = (card: OfferCard, index: number): string => {
  if (card.image?.trim()) {
    return buildVersionedStorefrontStaticAssetUrl(card.image.trim());
  }

  const fallback = [
    '/placeholders/luxury-shoes/sneaker-white.png',
    '/placeholders/luxury-shoes/flats.png',
    '/placeholders/luxury-shoes/hero.png',
  ][index % 3]!;

  return buildVersionedStorefrontStaticAssetUrl(fallback);
};

const resolveDistrictMarketOfferCaption = (
  card: OfferCard,
  index: number,
): string => {
  const content = normalizeOfferText(
    `${card.label || ''} ${card.title} ${card.subtitle} ${card.stat || ''}`,
  );

  if (
    content.includes('شحن') ||
    content.includes('استبدال') ||
    content.includes('ثقة') ||
    content.includes('دفع')
  ) {
    return 'رسائل الخدمة الأساسية تظهر قبل الدخول إلى الدفع.';
  }

  if (
    content.includes('عرض') ||
    content.includes('خصم') ||
    content.includes('سعر')
  ) {
    return 'خصم واضح يسهل المقارنة بدل الزحام بين كروت كثيرة.';
  }

  if (
    content.includes('الأكثر') ||
    content.includes('طلب') ||
    content.includes('حركة')
  ) {
    return 'منتجات عملية يرى العميل أنها تتحرك فعلًا داخل المتجر.';
  }

  return index === 0
    ? 'مدخل أسرع لقرار الشراء داخل المتجر.'
    : 'طبقة أوضح للحسم بعد أول تصفح.';
};

type TechBundleMeta = {
  eyebrow: string;
  packageTitle: string;
  items: string[];
  note: string;
};

const resolveTechBundleMeta = (
  card: OfferCard,
  index: number,
): TechBundleMeta => {
  const content = normalizeOfferText(
    `${card.label || ''} ${card.title} ${card.subtitle} ${card.stat || ''}`,
  );

  if (
    content.includes('laptop') ||
    content.includes('شغل') ||
    content.includes('study') ||
    content.includes('جامعة')
  ) {
    return {
      eyebrow: 'Work / Study',
      packageTitle: 'Setup for daily work',
      items: ['Laptop', 'Mouse', 'Bag / Sleeve'],
      note: 'يركز على الحركة اليومية والسعر الواضح والإضافات الأساسية فقط.',
    };
  }

  if (
    content.includes('desktop') ||
    content.includes('gaming') ||
    content.includes('creator') ||
    content.includes('تجميع')
  ) {
    return {
      eyebrow: 'Creator / Gaming',
      packageTitle: 'High-load bundle',
      items: ['Desktop', 'Monitor', 'Cooling / Power'],
      note: 'مبني على الأداء والتوافق بدل المقارنة بين قطع كثيرة غير مرتبة.',
    };
  }

  if (
    content.includes('dock') ||
    content.includes('accessor') ||
    content.includes('upgrade') ||
    content.includes('إكسسوارات')
  ) {
    return {
      eyebrow: 'Desk Upgrade',
      packageTitle: 'Fast add-ons',
      items: ['Dock / Hub', 'Keyboard', 'Mouse / Audio'],
      note: 'إضافات صغيرة ترفع قيمة الطلب وتكمل المكتب أو اللابتوب بسرعة.',
    };
  }

  return [
    {
      eyebrow: 'Quick Route',
      packageTitle: 'Ready bundle',
      items: ['Core item', 'Key add-on', 'Clear next step'],
      note: 'باقة تقود العميل نحو قرار أوضح داخل الصفحة.',
    },
    {
      eyebrow: 'Focused Path',
      packageTitle: 'Use-case bundle',
      items: ['Primary product', 'Support accessory', 'Faster CTA'],
      note: 'محتوى بيع أقرب للاستخدام الحقيقي من مجرد عرض عام.',
    },
  ][index % 2]!;
};

type OfferBentoVariant =
  | 'category-promo'
  | 'daily-picks'
  | 'campaign-stack'
  | 'editorial-columns'
  | 'combo-deals'
  | 'bundle-matrix'
  | 'boutique-duo'
  | 'vela-fashion-mosaic';

const OFFER_BENTO_FAMILY = 'OfferBento';
const OFFER_BENTO_DEFAULT =
  (getDefaultRegisteredVariantId(OFFER_BENTO_FAMILY) as OfferBentoVariant | undefined) ||
  'category-promo';

const normalizeOfferBentoVariant = (rawVariant: unknown): OfferBentoVariant => {
  const value = String(rawVariant || '').trim().toLowerCase();
  if (
    (
      value === 'category-promo' ||
      value === 'daily-picks' ||
      value === 'campaign-stack' ||
      value === 'editorial-columns' ||
      value === 'combo-deals' ||
      value === 'bundle-matrix' ||
      value === 'boutique-duo' ||
      value === 'vela-fashion-mosaic'
    ) &&
    hasRegisteredVariant(OFFER_BENTO_FAMILY, value)
  ) {
    return value as OfferBentoVariant;
  }
  return OFFER_BENTO_DEFAULT;
};

const OfferBento: React.FC<OfferBentoProps> = ({ section, settings }) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const variant = normalizeOfferBentoVariant(section?.variant);
  const isBiteRush = theme.id === 'restaurant-demo';
  const isDistrictMarket = theme.id === 'district-market';
  const badge =
    settings?.badge ||
    (variant === 'campaign-stack'
      ? 'حملة هذا الأسبوع'
      : variant === 'daily-picks'
        ? 'اختيارات اليوم'
        : variant === 'combo-deals'
          ? 'Combo Deals'
          : variant === 'bundle-matrix'
            ? 'باقات جاهزة'
            : variant === 'boutique-duo'
              ? ''
            : 'عروض هذا الأسبوع');
  const title =
    typeof settings?.title === 'string'
      ? settings?.title
      : variant === 'boutique-duo'
        ? ''
        : 'اختيارات سريعة قبل أن تنفد الكمية';
  const subtitle =
    typeof settings?.subtitle === 'string'
      ? settings?.subtitle
      : variant === 'boutique-duo'
        ? ''
        : 'ركن مرتب للعروض الأكثر جاذبية مع سعر أوضح ورسائل ثقة جاهزة تساعد العميل على الحسم.';
  const hideSubtitle = settings?.hideSubtitle === true;
  const cards = useMemo(() => parseCards(settings?.cards), [settings?.cards])
    .slice(0, variant === 'vela-fashion-mosaic' ? 5 : variant === 'boutique-duo' ? 2 : 3)
    .map((card) => ({
      ...card,
      image: card.image ? buildVersionedStorefrontStaticAssetUrl(card.image) : card.image,
    }));
  const isVelaFashionMosaic = variant === 'vela-fashion-mosaic';

  return (
    <section className={`relative w-full overflow-hidden py-10 md:py-14 ${
      isBiteRush ? 'bg-[#fff7f1]' : 'bg-background'
    }`}>
      <div className="container px-4 md:px-6">
        {variant !== 'boutique-duo' || badge || title || subtitle ? (
          <div className={`mb-8 ${variant === 'boutique-duo' ? 'max-w-2xl text-center mx-auto' : 'max-w-3xl text-start'} space-y-3`}>
            {badge ? (
              <span className={`inline-flex w-fit ${
                isVelaFashionMosaic
                  ? 'font-heading text-[17px] font-normal text-[#0abb45]'
                  : isBiteRush
                  ? 'bg-white text-[#dc2626] shadow-md'
                  : variant === 'boutique-duo'
                    ? 'rounded-full border border-[#ead8d2] bg-white px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#b06767]'
                    : 'rounded-full border border-primary/12 bg-primary/5 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-primary'
              }`}>
                {badge}
              </span>
            ) : null}
            {title ? (
              <h2 className={`font-heading font-black md:text-4xl ${
                isVelaFashionMosaic
                  ? 'text-2xl font-bold text-[#131316]'
                  : isBiteRush
                  ? 'text-4xl uppercase italic text-[#171717]'
                  : variant === 'boutique-duo'
                    ? 'text-[2rem] font-semibold text-[#201915]'
                    : 'text-3xl text-foreground'
              }`}>
                {title}
              </h2>
            ) : null}
            {subtitle && !hideSubtitle ? (
              <p className={`text-sm leading-7 md:text-base ${
                isBiteRush
                  ? 'text-[#5f5f5f]'
                  : variant === 'boutique-duo'
                    ? 'text-[#7b6d68]'
                    : 'text-muted-foreground'
              }`}>
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}

        {variant === 'vela-fashion-mosaic' ? (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
              {cards[0] ? (() => {
                const leadCard = cards[0];
                const href = buildStorefrontPath(
                  location.pathname,
                  leadCard.link.startsWith('/') ? leadCard.link : `/${leadCard.link}`,
                  location.search,
                );

                return (
                  <Link
                    to={href}
                    className="group relative block min-h-[17rem] overflow-hidden rounded-[1.35rem] border border-[#ece4df] bg-[#f3ede8] shadow-[0_30px_78px_-58px_rgba(23,23,23,0.28)] lg:min-h-[27rem]"
                  >
                    {leadCard.image ? (
                      <img
                        src={leadCard.image}
                        alt={leadCard.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    ) : null}
                  </Link>
                );
              })() : null}

              <div className="grid gap-4 sm:grid-cols-2">
                {cards.slice(1, 5).map((card, index) => {
                  const href = buildStorefrontPath(
                    location.pathname,
                    card.link.startsWith('/') ? card.link : `/${card.link}`,
                    location.search,
                  );
                  const tallCard = index === 0 || index === 3;

                  return (
                    <Link
                      key={`${card.title}-${index}`}
                      to={href}
                      className={`group relative overflow-hidden rounded-[1.35rem] border border-[#ece4df] bg-[#f3ede8] shadow-[0_26px_62px_-54px_rgba(23,23,23,0.24)] ${
                        tallCard ? 'min-h-[14rem] lg:min-h-[13rem]' : 'min-h-[14rem] lg:min-h-[13rem]'
                      }`}
                    >
                      {card.image ? (
                        <img
                          src={card.image}
                          alt={card.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isDistrictMarket ? (
          <div className="overflow-hidden rounded-[1.85rem] border border-primary/10 bg-card shadow-[0_24px_80px_-60px_hsl(var(--primary)/0.32)]">
            <div className="grid grid-cols-1 xl:grid-cols-[1.18fr_0.82fr]">
              {cards[0] ? (() => {
                const leadCard = cards[0];
                const href = buildStorefrontPath(
                  location.pathname,
                  leadCard.link.startsWith('/') ? leadCard.link : `/${leadCard.link}`,
                  location.search,
                );
                const signals = resolveOfferSignals(leadCard, 0, theme.id);

                return (
                  <Link
                    to={href}
                    className="group relative grid h-full gap-5 border-b border-primary/10 bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),rgba(255,255,255,0.98)_52%,hsl(var(--secondary)/0.96))] px-5 py-6 transition-colors duration-300 hover:bg-[linear-gradient(135deg,hsl(var(--primary)/0.17),rgba(255,255,255,0.99)_48%,hsl(var(--secondary)/0.96))] sm:px-6 sm:py-7 xl:grid-cols-[minmax(0,1fr)_15rem] xl:border-b-0 xl:border-s"
                  >
                    <div className="flex min-w-0 flex-col gap-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <span className="inline-flex text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                            {leadCard.label || 'المدخل الأسرع'}
                          </span>
                          <h3 className="max-w-xl font-heading text-[1.8rem] font-black tracking-tight text-foreground sm:text-[2rem]">
                            {leadCard.title}
                          </h3>
                        </div>
                        {leadCard.stat ? (
                          <span className="rounded-full bg-foreground px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-background">
                            {leadCard.stat}
                          </span>
                        ) : null}
                      </div>

                      <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                        {leadCard.subtitle}
                      </p>

                      <div className="grid gap-2 text-sm text-foreground/78 sm:grid-cols-2">
                        {signals.map((signal) => (
                          <div
                            key={`${leadCard.title}-${signal}`}
                            className="flex items-start gap-2 rounded-2xl bg-background/74 px-3 py-2"
                          >
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                            <span className="leading-6">{signal}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-auto flex flex-wrap items-center gap-3">
                        <span className="inline-flex rounded-full border border-primary/12 bg-background/84 px-3 py-1 text-[11px] font-black tracking-[0.16em] text-primary">
                          {resolveDistrictMarketOfferCaption(leadCard, 0)}
                        </span>
                        <div className="inline-flex items-center gap-2 text-sm font-black text-primary">
                          {leadCard.ctaText || 'شاهد التفاصيل'}
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/15 bg-background/76 transition-transform duration-300 group-hover:-translate-x-1">
                            ←
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative min-h-[15rem] overflow-hidden rounded-[1.4rem] border border-[#ead8cb] bg-[linear-gradient(180deg,#fffbf6,#f3e6d9)] shadow-[0_18px_42px_-28px_rgba(61,37,25,0.22)]">
                      <img
                        src={resolveDistrictMarketOfferImage(leadCard, 0)}
                        alt={leadCard.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(61,37,25,0.14))]" />
                      <div className="absolute inset-x-4 bottom-4 rounded-[1rem] border border-white/60 bg-white/88 px-4 py-3 shadow-[0_18px_36px_-28px_rgba(61,37,25,0.32)] backdrop-blur">
                        <span className="inline-flex text-[11px] font-black tracking-[0.18em] text-[#a65a2a]">
                          {leadCard.stat || 'قرار أسرع'}
                        </span>
                        <p className="mt-1 text-sm leading-6 text-[#5f4b3f]">
                          {resolveDistrictMarketOfferCaption(leadCard, 0)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })() : null}

              <div className="divide-y divide-primary/10">
                {cards.slice(1).map((card, index) => {
                  const href = buildStorefrontPath(
                    location.pathname,
                    card.link.startsWith('/') ? card.link : `/${card.link}`,
                    location.search,
                  );
                  const signals = resolveOfferSignals(card, index + 1, theme.id).slice(0, 2);

                  return (
                    <Link
                      key={`${card.title}-${index + 1}`}
                      to={href}
                      className="group grid h-full gap-4 px-5 py-5 transition-colors duration-300 hover:bg-secondary/60 sm:px-6 sm:py-6 md:grid-cols-[minmax(0,1fr)_7.5rem]"
                    >
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-2">
                            <span className="inline-flex text-[11px] font-black uppercase tracking-[0.22em] text-primary/78">
                              {card.label || `مسار 0${index + 2}`}
                            </span>
                            <h3 className="max-w-lg font-heading text-[1.25rem] font-black tracking-tight text-foreground">
                              {card.title}
                            </h3>
                          </div>
                          {card.stat ? (
                            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-foreground/62">
                              {card.stat}
                            </span>
                          ) : null}
                        </div>

                        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                          {card.subtitle}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {signals.map((signal) => (
                            <span
                              key={`${card.title}-${signal}`}
                              className="inline-flex rounded-full border border-primary/10 bg-background/78 px-3 py-1 text-[11px] font-bold text-foreground/78"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>

                        <div className="inline-flex items-center gap-2 text-sm font-black text-primary">
                          {card.ctaText || 'شاهد التفاصيل'}
                          <span className="transition-transform duration-300 group-hover:-translate-x-1">
                            ←
                          </span>
                        </div>
                      </div>

                      <div className="relative min-h-[7.5rem] overflow-hidden rounded-[1.15rem] border border-[#ead8cb] bg-[linear-gradient(180deg,#fffbf6,#f3e6d9)] shadow-[0_14px_32px_-26px_rgba(61,37,25,0.2)]">
                        <img
                          src={resolveDistrictMarketOfferImage(card, index + 1)}
                          alt={card.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(61,37,25,0.12))]" />
                        <div className="absolute inset-x-3 bottom-3 rounded-[0.9rem] border border-white/60 bg-white/84 px-3 py-2 text-[11px] font-black leading-5 text-[#6a5648] backdrop-blur">
                          {resolveDistrictMarketOfferCaption(card, index + 1)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : variant === 'editorial-columns' ? (
          <div className="grid grid-cols-1 border-y border-[#e7d8c8] md:grid-cols-[1.14fr_0.93fr_0.93fr]">
            {cards.map((card, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                card.link.startsWith('/') ? card.link : `/${card.link}`,
                location.search,
              );
              const signals = resolveOfferSignals(card, index, theme.id).slice(
                0,
                index === 0 ? 3 : 2,
              );

              return (
                <Link
                  key={`${card.title}-${index}`}
                  to={href}
                  className={`group relative px-0 py-8 transition-colors duration-300 hover:bg-[#fbf5ef]/72 md:px-8 md:py-10 ${
                    index > 0 ? 'border-t border-[#e7d8c8] md:border-t-0' : ''
                  } ${index < cards.length - 1 ? 'md:border-s md:border-[#e7d8c8]' : ''}`}
                >
                  <div className={`${index === 0 ? 'max-w-xl' : 'max-w-sm'} space-y-4 text-start`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-3">
                        <span className="inline-flex border-b border-[#c8a66d] pb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a6d45]">
                          {card.label || `Angle 0${index + 1}`}
                        </span>
                        <h3
                          className={`font-heading font-semibold leading-tight tracking-tight text-[#1f1916] ${
                            index === 0 ? 'text-[2.2rem] md:text-[2.5rem]' : 'text-[1.6rem] md:text-[1.85rem]'
                          }`}
                        >
                          {card.title}
                        </h3>
                      </div>
                      {card.stat ? (
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a6446]">
                          {card.stat}
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm leading-7 text-[#695c53] md:text-[15px]">
                      {card.subtitle}
                    </p>

                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-[#4f453f]">
                      {signals.map((signal) => (
                        <span
                          key={`${card.title}-${signal}`}
                          className="inline-flex items-center gap-2"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#b89154]" />
                          {signal}
                        </span>
                      ))}
                    </div>

                    <span className="inline-flex items-center gap-2 border-b border-[#1f1916] pb-1 text-sm font-semibold text-[#1f1916] transition-colors group-hover:border-[#8a6a3c] group-hover:text-[#8a6a3c]">
                      {card.ctaText || 'شاهدي التفاصيل'}
                      <span aria-hidden="true">←</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : variant === 'bundle-matrix' ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.24fr_0.94fr_0.94fr]">
            {cards.map((card, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                card.link.startsWith('/') ? card.link : `/${card.link}`,
                location.search,
              );
              const meta = resolveTechBundleMeta(card, index);
              const isLead = index === 0;
              const toneClass =
                card.tone === 'accent'
                  ? 'bg-[linear-gradient(180deg,#fff6d6,#fffdf3)] border-[#efcf67]'
                  : card.tone === 'slate'
                    ? 'bg-[linear-gradient(180deg,#edf0f4,#ffffff)] border-[#cfd5df]'
                    : 'bg-[linear-gradient(180deg,#f7f1df,#fffdf6)] border-[#d7c89e]';

              return (
                <Link
                  key={`${card.title}-${index}`}
                  to={href}
                  className={`group overflow-hidden rounded-[1.9rem] border p-5 shadow-[0_28px_90px_-66px_rgba(31,36,44,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_110px_-70px_rgba(31,36,44,0.3)] ${
                    isLead ? 'bg-[#1f242c] text-[#fff4d1] xl:col-span-1' : toneClass
                  }`}
                >
                  <div className={`grid h-full gap-4 ${isLead ? 'lg:grid-cols-[minmax(0,1fr)_15rem]' : ''}`}>
                    <div className="flex h-full min-w-0 flex-col gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] ${
                              isLead
                                ? 'border border-white/10 bg-white/8 text-[#ffd400]'
                                : 'border border-[#1f242c]/10 bg-white/82 text-[#1f242c]'
                            }`}
                          >
                            {meta.eyebrow}
                          </span>
                          <h3
                            className={`max-w-[16ch] font-heading text-[1.6rem] font-black tracking-tight ${
                              isLead ? 'text-white' : 'text-[#1f242c]'
                            }`}
                          >
                            {card.title}
                          </h3>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                            isLead
                              ? 'bg-[#ffd400] text-[#1f242c]'
                              : 'bg-[#1f242c] text-[#fff4d1]'
                          }`}
                        >
                          {card.stat || meta.packageTitle}
                        </span>
                      </div>

                      <p
                        className={`max-w-xl text-sm leading-7 ${
                          isLead ? 'text-white/76' : 'text-[#49505c]'
                        }`}
                      >
                        {card.subtitle}
                      </p>

                      <div className="grid gap-2 sm:grid-cols-3">
                        {meta.items.map((item) => (
                          <div
                            key={`${card.title}-${item}`}
                            className={`rounded-[1.1rem] px-3 py-3 text-[11px] font-black uppercase tracking-[0.16em] ${
                              isLead
                                ? 'border border-white/10 bg-white/[0.05] text-white/84'
                                : 'border border-[#1f242c]/8 bg-white/84 text-[#1f242c]'
                            }`}
                          >
                            {item}
                          </div>
                        ))}
                      </div>

                      <div
                        className={`rounded-[1.25rem] border px-4 py-3 ${
                          isLead
                            ? 'border-white/10 bg-black/20 text-[#fff4d1]'
                            : 'border-[#1f242c]/8 bg-white/86 text-[#1f242c]'
                        }`}
                      >
                        <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isLead ? 'text-[#ffd400]' : 'text-[#6b7280]'}`}>
                          Bundle logic
                        </p>
                        <p className={`mt-2 text-sm leading-6 ${isLead ? 'text-white/76' : 'text-[#4b5563]'}`}>
                          {meta.note}
                        </p>
                      </div>

                      <div className={`mt-auto inline-flex items-center gap-2 text-sm font-black ${isLead ? 'text-[#ffd400]' : 'text-[#1f242c]'}`}>
                        {card.ctaText || 'شاهد التفاصيل'}
                        <span
                          className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-x-1 ${
                            isLead
                              ? 'border border-white/10 bg-white/[0.06] text-white'
                              : 'border border-[#1f242c]/12 bg-white/88 text-[#1f242c]'
                          }`}
                        >
                          ←
                        </span>
                      </div>
                    </div>

                    {isLead ? (
                      <div className="grid gap-3">
                        <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-4 py-4 shadow-[0_24px_70px_-56px_rgba(255,212,0,0.45)]">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffd400]">
                            Package
                          </p>
                          <p className="mt-3 text-xl font-black text-white">
                            {meta.packageTitle}
                          </p>
                        </div>
                        <div className="rounded-[1.35rem] border border-white/10 bg-black/24 px-4 py-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/58">
                            Why this path
                          </p>
                          <p className="mt-3 text-sm leading-6 text-white/76">
                            {meta.note}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : variant === 'boutique-duo' ? (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {cards.slice(0, 2).map((card, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                card.link.startsWith('/') ? card.link : `/${card.link}`,
                location.search,
              );
              const toneClass =
                card.tone === 'ivory'
                  ? 'bg-[linear-gradient(135deg,#ffffff,#f6efea)] border-[#ead8d2]'
                  : 'bg-[linear-gradient(135deg,#fff7f8,#f4eeea)] border-[#ead8d2]';

              return (
                <Link
                  key={`${card.title}-${index}`}
                  to={href}
                  className={`group overflow-hidden rounded-[1.6rem] border ${toneClass} shadow-[0_30px_72px_-54px_rgba(59,33,28,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_36px_82px_-52px_rgba(59,33,28,0.26)]`}
                >
                  <div className="grid min-h-[15rem] gap-4 p-5 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center md:p-6">
                    <div className="space-y-4 text-start">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          {card.label ? (
                            <span className="inline-flex text-[11px] font-black tracking-[0.2em] text-[#b06767]">
                              {card.label}
                            </span>
                          ) : null}
                          <h3 className="max-w-[18rem] font-heading text-[1.7rem] font-semibold leading-tight text-[#201915]">
                            {card.title}
                          </h3>
                        </div>
                        {card.stat ? (
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#201915] shadow-[0_12px_24px_-18px_rgba(59,33,28,0.16)]">
                            {card.stat}
                          </span>
                        ) : null}
                      </div>
                      <p className="max-w-md text-sm leading-7 text-[#756762]">
                        {card.subtitle}
                      </p>
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#201915]">
                        {card.ctaText || 'شاهدي التفاصيل'}
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ead8d2] bg-white transition-transform duration-300 group-hover:-translate-x-1">
                          ←
                        </span>
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-[1.35rem] bg-[#efe7e2]">
                      {card.image ? (
                        <img
                          src={card.image}
                          alt={card.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="aspect-[5/4] w-full bg-[linear-gradient(135deg,#f5eeea,#ebe2dd)]" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : variant === 'campaign-stack' ? (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.26fr)_minmax(18rem,0.74fr)]">
            {cards[0] ? (() => {
              const card = cards[0];
              const href = buildStorefrontPath(
                location.pathname,
                card.link.startsWith('/') ? card.link : `/${card.link}`,
                location.search,
              );
              const signals = resolveOfferSignals(card, 0, theme.id).slice(0, 3);
              const image = resolveCampaignStackImage(card, 0);

              return (
                <Link
                  to={href}
                  className="group grid min-h-[28rem] overflow-hidden rounded-lg border border-[#ead8c9] bg-[#fffaf4] text-start shadow-[0_28px_86px_-66px_rgba(47,37,29,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#cfaa72] md:grid-cols-[minmax(0,0.92fr)_minmax(20rem,1.08fr)]"
                >
                  <div className="flex min-w-0 flex-col justify-between gap-8 p-5 md:p-7">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="inline-flex rounded-full bg-[#183f31] px-3 py-1.5 text-[11px] font-black text-[#fff8ee]">
                          {card.stat || card.label || 'عرض اليوم'}
                        </span>
                        {card.label ? (
                          <span className="text-xs font-bold text-[#8a6a3c]">
                            {card.label}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="max-w-[16ch] font-heading text-3xl font-black leading-tight text-[#1f1916] md:text-[2.85rem]">
                        {card.title}
                      </h3>
                      <p className="max-w-xl text-sm leading-7 text-[#6d5f55] md:text-[15px]">
                        {card.subtitle}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {signals.map((signal) => (
                          <span
                            key={`${card.title}-${signal}`}
                            className="inline-flex rounded-full border border-[#e2cbb3] bg-white/86 px-3 py-1 text-[11px] font-bold text-[#2d241f]"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#79b900] px-4 py-3 text-sm font-black text-white transition-colors group-hover:bg-[#6aa300]">
                        {card.ctaText || 'تسوقي الآن'}
                        <span
                          aria-hidden="true"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/18 transition-transform duration-300 group-hover:-translate-x-1"
                        >
                          ←
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="relative min-h-[18rem] overflow-hidden bg-[#efe5db] md:min-h-full">
                    <StorefrontProductImage
                      candidates={[image]}
                      alt={card.title}
                      loading="lazy"
                      fetchpriority="low"
                      deferUntilVisible
                      deferRootMargin="700px 0px"
                      requestedWidth={720}
                      imageQuality={72}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(31,25,22,0.02),rgba(31,25,22,0.18))]" />
                    <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-[#1f1916] shadow-[0_16px_38px_-26px_rgba(31,25,22,0.55)]">
                      {card.label || 'جاهز للطلب'}
                    </div>
                  </div>
                </Link>
              );
            })() : null}

            <div className="grid gap-3">
              {cards.slice(1).map((card, index) => {
                const cardIndex = index + 1;
                const href = buildStorefrontPath(
                  location.pathname,
                  card.link.startsWith('/') ? card.link : `/${card.link}`,
                  location.search,
                );
                const signals = resolveOfferSignals(card, cardIndex, theme.id).slice(0, 2);
                const image = resolveCampaignStackImage(card, cardIndex);

                return (
                  <Link
                    key={`${card.title}-${cardIndex}`}
                    to={href}
                    className="group grid min-h-[14rem] overflow-hidden rounded-lg border border-[#ead8c9] bg-white text-start shadow-[0_22px_62px_-54px_rgba(47,37,29,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#cfaa72] sm:grid-cols-[minmax(0,1fr)_11.25rem]"
                  >
                    <div className="flex min-w-0 flex-col justify-between gap-4 p-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex rounded-full bg-[#f4eee7] px-3 py-1 text-[11px] font-black text-[#7d6146]">
                            {card.stat || card.label || `اختيار ${cardIndex + 1}`}
                          </span>
                          {card.label ? (
                            <span className="text-[11px] font-bold text-[#8a6a3c]">
                              {card.label}
                            </span>
                          ) : null}
                        </div>
                        <h3 className="font-heading text-[1.45rem] font-black leading-tight text-[#1f1916]">
                          {card.title}
                        </h3>
                        <p className="line-clamp-2 text-xs leading-6 text-[#74665f]">
                          {card.subtitle}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {signals.map((signal) => (
                            <span
                              key={`${card.title}-${signal}`}
                              className="inline-flex rounded-full border border-[#ead8c9] bg-[#fffaf4] px-2.5 py-1 text-[10px] font-bold text-[#3a2d25]"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                        <div className="inline-flex items-center gap-2 text-sm font-black text-[#183f31]">
                          {card.ctaText || 'شاهدي الاختيارات'}
                          <span
                            aria-hidden="true"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#cdb79f] bg-[#fffaf4] transition-transform duration-300 group-hover:-translate-x-1"
                          >
                            ←
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="relative min-h-[12rem] overflow-hidden bg-[#f2e9df] sm:min-h-full">
                      <StorefrontProductImage
                        candidates={[image]}
                        alt={card.title}
                        loading="lazy"
                        fetchpriority="low"
                        deferUntilVisible
                        deferRootMargin="700px 0px"
                        requestedWidth={360}
                        imageQuality={72}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(31,25,22,0.2))]" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${variant === 'daily-picks' ? 'gap-4 xl:grid-cols-3' : variant === 'combo-deals' ? 'gap-4 xl:grid-cols-[1.15fr_1fr_1fr]' : 'gap-4 xl:grid-cols-[1.25fr_0.9fr_0.9fr]'}`}>
            {cards.map((card, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                card.link.startsWith('/') ? card.link : `/${card.link}`,
                location.search,
              );
              const signals = resolveOfferSignals(card, index, theme.id);

              return (
                <Link
                  key={`${card.title}-${index}`}
                  to={href}
                  className={`group relative min-h-[240px] overflow-hidden border p-6 transition-all duration-300 hover:-translate-y-1 ${variant === 'campaign-stack' ? 'xl:first:col-span-2' : ''} ${
                    isBiteRush
                      ? (index === 0
                          ? 'rounded-[2rem] border-[#171717] bg-[#171717] text-white shadow-[0_30px_80px_-42px_rgba(23,23,23,0.75)]'
                          : index === 1
                            ? 'rounded-[2rem] border-[#ff6b2c]/30 bg-[linear-gradient(135deg,#ff6b2c,#ff874f)] text-white shadow-[0_28px_70px_-38px_rgba(255,107,44,0.58)]'
                            : 'rounded-[2rem] border-[#ffd6c4] bg-white text-[#171717] shadow-[0_28px_70px_-42px_rgba(17,17,17,0.18)]')
                      : `${TONE_CLASS_MAP[card.tone || 'primary'] || TONE_CLASS_MAP['primary']} hover:shadow-[0_30px_90px_-62px_hsl(var(--primary)/0.48)]`
                  }`}
                >
                  <div className={`absolute -top-10 end-0 h-40 w-40 rounded-full blur-2xl ${
                    isBiteRush
                      ? index === 0
                        ? 'bg-[radial-gradient(circle_at_center,rgba(255,107,44,0.35),transparent_70%)]'
                        : 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.22),transparent_70%)]'
                      : 'bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.18),transparent_70%)]'
                  }`} />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                          isBiteRush
                            ? index === 0
                              ? 'border border-white/15 bg-white/10 text-orange-200'
                              : index === 1
                                ? 'border border-white/25 bg-white/10 text-white'
                                : 'border border-[#171717]/10 bg-[#fff7f1] text-[#dc2626]'
                            : 'border border-white/60 bg-background/84 text-primary backdrop-blur'
                        }`}>
                          {card.label || `عرض 0${index + 1}`}
                        </span>
                        <h3 className={`max-w-sm font-heading text-2xl font-black tracking-tight ${
                          isBiteRush ? (index === 2 ? 'text-[#171717]' : 'text-white') : 'text-foreground'
                        }`}>
                          {card.title}
                        </h3>
                      </div>
                      {card.stat ? (
                        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${
                          isBiteRush
                            ? index === 2
                              ? 'bg-[#171717] text-white'
                              : 'bg-white text-[#171717]'
                            : 'bg-foreground text-background'
                        }`}>
                          {card.stat}
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      <p className={`max-w-md text-sm leading-7 ${
                        isBiteRush ? (index === 2 ? 'text-[#5f5f5f]' : 'text-white/82') : 'text-muted-foreground'
                      }`}>
                        {card.subtitle}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {signals.map((signal) => (
                          <span
                            key={`${card.title}-${signal}`}
                            className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${
                              isBiteRush
                                ? index === 2
                                  ? 'border border-[#171717]/10 bg-[#fff7f1] text-[#171717]'
                                  : 'border border-white/15 bg-white/10 text-white'
                                : 'border border-primary/10 bg-background/88 text-foreground'
                            }`}
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                      <div className={`inline-flex items-center gap-2 text-sm font-black ${
                        isBiteRush ? (index === 2 ? 'text-[#dc2626]' : 'text-white') : 'text-primary'
                      }`}>
                        {card.ctaText || 'شاهد التفاصيل'}
                        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-x-1 ${
                          isBiteRush
                            ? index === 2
                              ? 'border border-[#171717]/10 bg-white'
                              : 'border border-white/15 bg-white/10'
                            : 'border border-primary/15 bg-background/75'
                        }`}>
                          ←
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default OfferBento;
