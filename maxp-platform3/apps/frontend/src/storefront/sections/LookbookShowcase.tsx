import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';
import { parseCategoryLookbookCards } from '../utils/dynamicSectionContent';
import { buildVersionedStorefrontStaticAssetUrl } from '../utils/productImages';
import { resolveSectionVariant } from '../variants';

interface LookbookShowcaseProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    limit?: number;
    categoryCards?: string;
    variant?: string;
    [key: string]: unknown;
  };
}

type LookbookCard = {
  id: string;
  title: string;
  subtitle: string;
  mood: string;
  image: string;
  link: string;
};

const LOOKBOOK_CARDS: Omit<LookbookCard, 'link'>[] = [
  {
    id: 'desk-to-dinner',
    title: 'من المكتب إلى العشاء',
    subtitle: 'كعب مريح ولمسة لامعة تكمل يومك من الصباح حتى المساء.',
    mood: 'ستايل يومي راقٍ',
    image: '/placeholders/luxury-shoes/pump-black.png',
  },
  {
    id: 'weekend-sneakers',
    title: 'عطلة بخطوة خفيفة',
    subtitle: 'سنيكرز أبيض ناعم يناسب الجينز والفساتين اليومية.',
    mood: 'راحة أنيقة',
    image: '/placeholders/luxury-shoes/sneaker-white.png',
  },
  {
    id: 'soft-flats',
    title: 'فلات للعمل والحركة',
    subtitle: 'موديلات عملية تحافظ على شكل مرتب بدون مجهود زائد.',
    mood: 'Smart Casual',
    image: '/placeholders/luxury-shoes/flats.png',
  },
  {
    id: 'after-hours',
    title: 'بعد الثامنة',
    subtitle: 'تفاصيل أغمق وخطوط أوضح لمناسبات المساء والخروجات.',
    mood: 'Evening Edit',
    image: '/placeholders/luxury-shoes/boots.png',
  },
];

const normalizeKey = (value: string): string => value.trim().toLowerCase();

const resolveCategoryImage = (categoryName: string, fallbackIndex: number): string => {
  const normalized = normalizeKey(categoryName);
  if (normalized.includes('heel') || normalized.includes('كعب')) {
    return '/placeholders/luxury-shoes/pump-black.png';
  }
  if (normalized.includes('sandal') || normalized.includes('صندل')) {
    return '/placeholders/luxury-shoes/sneakers.png';
  }
  if (normalized.includes('sneaker') || normalized.includes('سنيكر')) {
    return '/placeholders/luxury-shoes/sneaker-white.png';
  }
  if (normalized.includes('flat') || normalized.includes('فلات')) {
    return '/placeholders/luxury-shoes/flats.png';
  }
  return LOOKBOOK_CARDS[fallbackIndex % LOOKBOOK_CARDS.length]!.image;
};

const LookbookShowcase: React.FC<LookbookShowcaseProps> = ({ section, settings }) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const { categories } = useCategories();
  const variant = resolveSectionVariant(
    'LookbookShowcase',
    settings?.variant || section?.variant,
    'standard',
  );
  const isBoutiqueStoryboard = variant === 'boutique-storyboard';
  const badge = settings?.badge || 'Lookbook';
  const title = settings?.title || 'إطلالات كاملة تبدأ من الحذاء';
  const subtitle =
    settings?.subtitle ||
    'أفكار سريعة لتنسيق الأحذية حسب المناسبة حتى يتحول التصفح إلى قرار شراء أسرع.';
  const ctaText = settings?.ctaText || 'تسوقي التشكيلة';
  const ctaLink =
    typeof settings?.ctaLink === 'string' && settings.ctaLink.trim()
      ? settings.ctaLink.trim()
      : '/shop';
  const limit =
    typeof settings?.limit === 'number' && settings.limit > 0
      ? settings.limit
      : 4;
  const configuredCards = parseCategoryLookbookCards(settings?.categoryCards);
  const ctaHref = buildStorefrontPath(
    location.pathname,
    ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`,
    location.search,
  );
  const cards: LookbookCard[] = (
    configuredCards.length > 0
      ? configuredCards.slice(0, limit).map((card, index) => {
          const category = categories.find((entry) => {
            const candidateKeys = [entry.id, entry.slug, entry.name].filter(Boolean).map(normalizeKey);
            return candidateKeys.includes(normalizeKey(card.categoryKey));
          });
          const linkTarget =
            card.link ||
            (category ? `/shop?category=${encodeURIComponent(category.id)}` : '/shop');

          return {
            id: `${card.categoryKey}-${index}`,
            title: card.title,
            subtitle: card.subtitle,
            mood: card.mood,
            image: card.image || category?.image || resolveCategoryImage(card.categoryKey, index),
            link: buildStorefrontPath(
              location.pathname,
              linkTarget.startsWith('/') ? linkTarget : `/${linkTarget}`,
              location.search,
            ),
          };
        })
      : categories.length > 0
        ? categories.slice(0, limit).map((category, index) => ({
            id: category.id,
            title: category.name,
            subtitle:
              category.description?.trim() ||
              'تنسيق سريع ومقترحات تساعدك على الوصول للموديل المناسب أسرع.',
            mood: 'تنسيق المجموعة',
            image: category.image?.trim() || resolveCategoryImage(category.name, index),
            link: buildStorefrontPath(
              location.pathname,
              `/shop?category=${encodeURIComponent(category.id)}`,
              location.search,
            ),
          }))
        : LOOKBOOK_CARDS.slice(0, limit).map((card, index) => ({
            ...card,
            link: buildStorefrontPath(location.pathname, '/shop', location.search),
            id: `${card.id}-${index}`,
          }))
  ).map((card) => ({
    ...card,
    image: buildVersionedStorefrontStaticAssetUrl(card.image),
  }));
  const sectionClassName = isBoutiqueStoryboard
    ? 'w-full bg-[radial-gradient(circle_at_top,_rgba(220,188,193,0.22),_transparent_34%),linear-gradient(180deg,#fdf9f6_0%,#fcf5f1_100%)] py-16 md:py-24'
    : 'w-full bg-background border-y border-border/50 py-16 md:py-24';
  const badgeClassName = isBoutiqueStoryboard
    ? 'inline-flex w-fit rounded-full border border-[#e7d7d2] bg-white/85 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.24em] text-[#a06e76] uppercase shadow-[0_14px_36px_-28px_rgba(86,45,48,0.35)] backdrop-blur'
    : 'inline-flex w-fit rounded-full border border-border bg-background/80 px-3 py-1 text-xs font-black tracking-[0.18em] text-muted-foreground uppercase backdrop-blur';
  const titleClassName = isBoutiqueStoryboard
    ? 'max-w-3xl text-[2.15rem] font-semibold tracking-[-0.03em] text-[#221917] md:text-[3rem] font-heading'
    : 'max-w-2xl text-3xl font-black tracking-tight text-foreground md:text-4xl font-heading';
  const subtitleClassName = isBoutiqueStoryboard
    ? 'max-w-2xl text-sm leading-8 text-[#756763] md:text-[15px]'
    : 'max-w-2xl text-sm leading-7 text-muted-foreground md:text-base';
  const ctaClassName = isBoutiqueStoryboard
    ? 'inline-flex items-center justify-center rounded-full border border-[#dccbc5] bg-white/88 px-5 py-2.5 text-sm font-semibold text-[#2f221f] shadow-[0_18px_46px_-34px_rgba(52,29,25,0.3)] transition-transform hover:-translate-y-0.5'
    : 'inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/10 transition-transform hover:-translate-y-0.5';
  const gridClassName = isBoutiqueStoryboard
    ? 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:auto-rows-[230px] xl:grid-cols-3'
    : 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:auto-rows-[260px] xl:grid-cols-4';
  const cardFrameClassName = isBoutiqueStoryboard
    ? 'group relative overflow-hidden rounded-[1.7rem] border border-[#eadbd5] bg-[#f5ede9] shadow-[0_28px_72px_-46px_rgba(53,29,25,0.32)] transition-transform duration-300 hover:-translate-y-1'
    : 'group relative overflow-hidden rounded-[calc(var(--radius)+0.25rem)] border border-border bg-card';
  const moodClassName = isBoutiqueStoryboard
    ? 'inline-flex w-fit rounded-full border border-[#ead9d3] bg-white/88 px-3 py-1 text-[11px] font-semibold text-[#8f6671] backdrop-blur'
    : 'inline-flex w-fit rounded-full bg-background/85 px-3 py-1 text-[11px] font-bold text-foreground backdrop-blur';
  const panelClassName = isBoutiqueStoryboard
    ? 'max-w-xl rounded-[1.35rem] bg-[#fff9f6]/88 p-4 shadow-[0_24px_64px_-46px_rgba(58,31,27,0.38)] backdrop-blur md:p-5'
    : '';
  const cardTitleClassName = isBoutiqueStoryboard
    ? 'text-[1.25rem] font-semibold leading-tight text-[#201715] font-heading md:text-[1.55rem]'
    : 'text-xl font-black leading-tight text-white font-heading md:text-2xl';
  const cardSubtitleClassName = isBoutiqueStoryboard
    ? 'max-w-md text-sm leading-7 text-[#6f625d]'
    : 'max-w-md text-sm leading-6 text-white/80';
  const cardCtaClassName = isBoutiqueStoryboard
    ? 'inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#2d211f]'
    : 'inline-flex w-fit items-center gap-2 text-sm font-bold text-white';
  const imageOverlayClassName = isBoutiqueStoryboard
    ? 'absolute inset-0 bg-gradient-to-t from-[#f6ece8]/94 via-[#f6ece8]/28 to-transparent'
    : 'absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent';
  const cardShellClassName = isBoutiqueStoryboard
    ? 'relative flex h-full flex-col justify-between p-5 md:p-6'
    : 'relative flex h-full flex-col justify-end gap-3 p-5 md:p-6';
  const isRtl = theme.direction === 'rtl';

  return (
    <section className={sectionClassName}>
      <div className="container px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <span className={badgeClassName}>
              {badge}
            </span>
            <div className="space-y-2">
              <h2 className={titleClassName}>
                {title}
              </h2>
              <p className={subtitleClassName}>
                {subtitle}
              </p>
            </div>
          </div>

          <Link
            to={ctaHref}
            className={ctaClassName}
          >
            {ctaText}
          </Link>
        </div>

        <div className={gridClassName}>
          {cards.map((card, index) => (
            <Link
              key={card.id}
              to={card.link}
              className={`${cardFrameClassName} ${
                index === 0 ? 'xl:col-span-2 xl:row-span-2' : ''
              }`}
            >
              <div className="absolute inset-0 bg-muted">
                <img
                  src={card.image}
                  alt={card.title}
                  loading="lazy"
                  width="400"
                  height="400"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className={imageOverlayClassName} />
              <div className={cardShellClassName}>
                <span className={moodClassName}>
                  {card.mood}
                </span>
                <div className={panelClassName}>
                  <div className="space-y-2">
                    <h3 className={cardTitleClassName}>
                      {card.title}
                    </h3>
                    <p className={cardSubtitleClassName}>
                      {card.subtitle}
                    </p>
                  </div>
                  <span className={`${cardCtaClassName} mt-4`}>
                    {isBoutiqueStoryboard
                      ? isRtl
                        ? 'شاهدي التنسيق'
                        : 'See the edit'
                      : 'تسوقي هذا الستايل'}
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
                      className="rtl:rotate-180"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LookbookShowcase;
