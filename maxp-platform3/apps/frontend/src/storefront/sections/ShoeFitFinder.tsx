import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';
import { buildVersionedStorefrontStaticAssetUrl } from '../utils/productImages';
import StorefrontProductImage from '../components/StorefrontProductImage';

type FitRoute = {
  label?: string;
  title: string;
  description: string;
  image?: string;
  ctaText?: string;
  link: string;
};

interface ShoeFitFinderProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    primaryCtaText?: string;
    primaryCtaLink?: string;
    routes?: unknown;
    [key: string]: unknown;
  };
}

const DEFAULT_ROUTES: FitRoute[] = [
  {
    label: 'مشاوير طويلة',
    title: 'راحة تمشي معاكي اليوم كله',
    description: 'سنيكرز خفيف وثابت للجامعة، الشغل، والمشاوير السريعة.',
    image: '/placeholders/luxury-shoes/sneaker-white.png',
    ctaText: 'سنيكرز مريح',
    link: '/shop?category=sneakers',
  },
  {
    label: 'شغل وخروجة',
    title: 'شكل مرتب من غير تعب',
    description: 'لوفر وفلات بخط نضيف يناسب اليوم العملي والخروجة الهادية.',
    image: '/placeholders/luxury-shoes/flats.png',
    ctaText: 'فلات ولوفر',
    link: '/shop?category=flats',
  },
  {
    label: 'مناسبة',
    title: 'ارتفاع محسوب وصورة أقوى',
    description: 'كعب وصنادل بتفاصيل أنثوية واضحة للمناسبات والسهرات.',
    image: '/placeholders/luxury-shoes/pump-black.png',
    ctaText: 'اختيارات مناسبة',
    link: '/shop?category=heels',
  },
  {
    label: 'هدية',
    title: 'اختيارات آمنة وسريعة',
    description: 'موديلات سهلة في المقاس واللون لما القرار محتاج يبقى مضمون.',
    image: '/placeholders/luxury-shoes/hero.png',
    ctaText: 'الأكثر طلبًا',
    link: '/shop?sort=popular',
  },
];

const isFitRoute = (value: unknown): value is FitRoute =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  typeof (value as FitRoute).title === 'string' &&
  typeof (value as FitRoute).description === 'string' &&
  typeof (value as FitRoute).link === 'string';

const parseRoutes = (value: unknown): FitRoute[] => {
  if (Array.isArray(value)) {
    const routes = value.filter(isFitRoute).map((route) => ({
      label: route.label?.trim(),
      title: route.title.trim(),
      description: route.description.trim(),
      image: route.image?.trim(),
      ctaText: route.ctaText?.trim(),
      link: route.link.trim(),
    }));

    if (routes.length > 0) {
      return routes;
    }
  }

  if (typeof value === 'string' && value.trim()) {
    const routes = value
      .split(/\r?\n/)
      .map((line) => line.split('|').map((part) => part.trim()))
      .filter((parts) => parts.some(Boolean))
      .map(([label, title, description, image, ctaText, link]) => ({
        label: label || undefined,
        title: title || '',
        description: description || '',
        image: image || undefined,
        ctaText: ctaText || undefined,
        link: link || '/shop',
      }))
      .filter((route) => route.title && route.description && route.link);

    if (routes.length > 0) {
      return routes;
    }
  }

  return DEFAULT_ROUTES;
};

const ShoeFitFinder: React.FC<ShoeFitFinderProps> = ({ settings }) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const routes = useMemo(
    () =>
      parseRoutes(settings?.routes)
        .slice(0, 4)
        .map((route) => ({
          ...route,
          image: route.image ? buildVersionedStorefrontStaticAssetUrl(route.image) : route.image,
        })),
    [settings?.routes],
  );
  const badge = settings?.badge || 'اختيار أسرع';
  const title = settings?.title || 'اختاري الحذاء حسب يومك';
  const subtitle =
    settings?.subtitle ||
    'بدل ما تدوري بين كل المنتجات، ابدئي من استخدامك اليومي وبعدها اختاري المقاس واللون.';
  const primaryCtaText = settings?.primaryCtaText || 'شاهدي كل الأحذية';
  const primaryCtaLink =
    typeof settings?.primaryCtaLink === 'string' && settings.primaryCtaLink.trim()
      ? settings.primaryCtaLink.trim()
      : '/shop';
  const primaryHref = buildStorefrontPath(
    location.pathname,
    primaryCtaLink.startsWith('/') ? primaryCtaLink : `/${primaryCtaLink}`,
    location.search,
  );

  return (
    <section className="relative overflow-hidden bg-[#fffaf6] py-10 md:py-14" dir={theme.direction}>
      <div className="container px-4 md:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr] lg:items-stretch">
          <div className="flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-lg bg-[#183f31] p-6 text-[#fff8ee] shadow-[0_28px_82px_-58px_rgba(24,63,49,0.72)] md:p-8">
            <div className="space-y-4 text-start">
              <span className="inline-flex w-fit rounded-full bg-[#f3dfbe] px-3 py-1 text-[11px] font-black text-[#183f31]">
                {badge}
              </span>
              <h2 className="font-heading text-3xl font-black leading-tight md:text-4xl">
                {title}
              </h2>
              <p className="max-w-md text-sm leading-7 text-[#f7eadc]/82 md:text-base">
                {subtitle}
              </p>
            </div>

            <div className="mt-7 grid gap-2 text-start text-xs text-[#f7eadc]/78 sm:grid-cols-3">
              <span className="rounded-full border border-white/12 px-3 py-2">راحة</span>
              <span className="rounded-full border border-white/12 px-3 py-2">ستايل</span>
              <span className="rounded-full border border-white/12 px-3 py-2">مقاس أوضح</span>
            </div>

            <Link
              to={primaryHref}
              className="mt-7 inline-flex w-fit items-center rounded-full bg-[#79b900] px-5 py-3 text-sm font-black text-white transition-colors hover:bg-[#6aa300]"
            >
              {primaryCtaText}
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {routes.map((route, index) => {
              const href = buildStorefrontPath(
                location.pathname,
                route.link.startsWith('/') ? route.link : `/${route.link}`,
                location.search,
              );

              return (
                <Link
                  key={`${route.title}-${index}`}
                  to={href}
                  className="group grid min-h-[10.5rem] grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 overflow-hidden rounded-lg border border-[#eadbcf] bg-white p-3 text-start shadow-[0_22px_60px_-50px_rgba(47,37,29,0.28)] transition-all hover:-translate-y-0.5 hover:border-[#d0b08d] md:min-h-[12rem] md:grid-cols-[7.5rem_minmax(0,1fr)]"
                >
                  <div className="relative h-full min-h-[8rem] overflow-hidden rounded-md bg-[#f3ede7]">
                    {route.image ? (
                      <StorefrontProductImage
                        candidates={[route.image]}
                        alt={route.title}
                        loading="lazy"
                        fetchpriority="low"
                        deferUntilVisible
                        deferRootMargin="700px 0px"
                        requestedWidth={280}
                        imageQuality={72}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 space-y-2">
                    {route.label ? (
                      <span className="inline-flex rounded-full bg-[#f4eee7] px-2.5 py-1 text-[10px] font-black text-[#7d6146]">
                        {route.label}
                      </span>
                    ) : null}
                    <h3 className="text-base font-black leading-6 text-[#1f1916]">
                      {route.title}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-6 text-[#7b6d68]">
                      {route.description}
                    </p>
                    <span className="inline-flex text-xs font-black text-[#183f31]">
                      {route.ctaText || 'تسوقي الآن'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShoeFitFinder;
