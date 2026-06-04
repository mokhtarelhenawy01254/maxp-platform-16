import React from 'react';
import { useStorefrontTheme } from '../engine/ThemeProvider';

/* ────────────── types ────────────── */

interface ServiceCardConfig {
  icon?: string;
  title: string;
  description: string;
  color?: string;        // bg color override — e.g. "green", "brown", "dark", "beige", "teal"
  iconBg?: string;       // icon circle color override
  image?: string;        // full card image URL — renders as image card instead of icon card
  imageAlt?: string;     // alt text for image card
  eyebrow?: string;
  ctaText?: string;
  size?: 'standard' | 'featured' | 'wide' | 'tall';
}

interface ServicesGridProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    badge?: string;
    columns?: number;
    variant?: string;
    items?: ServiceCardConfig[];
    [key: string]: unknown;
  };
}

/* ────────────── icon bank ────────────── */

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  leaf: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89-.82 1.67-3.52C9.7 12 14 10 17 8z" />
      <path d="M6 15c2-2 4.5-3.5 8-4" />
      <path d="M21 3s-3-.5-6 1c-3 1.5-5 4-6 7 3-1 6-2 9-1" />
    </svg>
  ),
  flower: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a4 4 0 0 1 0 8" />
      <path d="M12 14a4 4 0 0 1 0 8" />
      <path d="M2 12a4 4 0 0 1 8 0" />
      <path d="M14 12a4 4 0 0 1 8 0" />
      <path d="M4.93 4.93a4 4 0 0 1 5.66 5.66" />
      <path d="M13.41 13.41a4 4 0 0 1 5.66 5.66" />
      <path d="M4.93 19.07a4 4 0 0 0 5.66-5.66" />
      <path d="M13.41 10.59a4 4 0 0 0 5.66-5.66" />
    </svg>
  ),
  target: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  grid: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  search: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  shield: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  document: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  list: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  sprout: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 20h10" />
      <path d="M12 20v-8" />
      <path d="M12 12c-2-4-6-4-8-2 2-6 8-7 8-7s6 1 8 7c-2-2-6-2-8 2z" />
    </svg>
  ),
};

const ICON_KEYS = Object.keys(ICON_MAP);

/* ────────────── colour presets ────────────── */

const COLOR_PRESETS: Record<string, { bg: string; iconBg: string; text: string; descText: string }> = {
  green:  { bg: 'bg-gradient-to-br from-emerald-600/90 to-emerald-800/95', iconBg: 'bg-emerald-400/25 ring-emerald-300/40', text: 'text-white', descText: 'text-emerald-100/80' },
  teal:   { bg: 'bg-gradient-to-br from-teal-600/90 to-teal-800/95',       iconBg: 'bg-teal-400/25 ring-teal-300/40',    text: 'text-white', descText: 'text-teal-100/80' },
  dark:   { bg: 'bg-gradient-to-br from-stone-700/95 to-stone-900/95',     iconBg: 'bg-stone-400/20 ring-stone-300/30',   text: 'text-white', descText: 'text-stone-300/80' },
  brown:  { bg: 'bg-gradient-to-br from-amber-700/85 to-amber-900/90',     iconBg: 'bg-amber-400/20 ring-amber-300/30',   text: 'text-white', descText: 'text-amber-100/80' },
  beige:  { bg: 'bg-gradient-to-br from-amber-100/95 to-orange-100/90',    iconBg: 'bg-amber-600/15 ring-amber-400/30',   text: 'text-amber-950', descText: 'text-amber-800/70' },
  sage:   { bg: 'bg-gradient-to-br from-lime-200/90 to-emerald-100/85',    iconBg: 'bg-emerald-600/15 ring-emerald-400/30', text: 'text-emerald-950', descText: 'text-emerald-800/70' },
  olive:  { bg: 'bg-gradient-to-br from-lime-700/85 to-green-800/90',      iconBg: 'bg-lime-300/20 ring-lime-200/30',     text: 'text-white', descText: 'text-lime-100/80' },
  cyan:   { bg: 'bg-[linear-gradient(135deg,rgba(4,20,28,0.98),rgba(7,44,50,0.92))]', iconBg: 'bg-cyan-400/20 ring-cyan-300/35', text: 'text-white', descText: 'text-cyan-100/75' },
  magenta:{ bg: 'bg-[linear-gradient(135deg,rgba(30,5,26,0.98),rgba(74,6,56,0.92))]', iconBg: 'bg-fuchsia-400/20 ring-fuchsia-300/35', text: 'text-white', descText: 'text-fuchsia-100/75' },
  violet: { bg: 'bg-[linear-gradient(135deg,rgba(15,10,38,0.98),rgba(43,20,94,0.92))]', iconBg: 'bg-violet-400/20 ring-violet-300/35', text: 'text-white', descText: 'text-violet-100/75' },
  blue:   { bg: 'bg-[linear-gradient(135deg,rgba(8,15,36,0.98),rgba(10,35,87,0.92))]', iconBg: 'bg-sky-400/20 ring-sky-300/35', text: 'text-white', descText: 'text-sky-100/75' },
};

const COLOR_CYCLE = ['green', 'dark', 'brown', 'sage', 'teal', 'beige', 'olive'];

const resolveColor = (color: string | undefined, index: number) =>
  COLOR_PRESETS[color || ''] || COLOR_PRESETS[COLOR_CYCLE[index % COLOR_CYCLE.length]!]!;

/* ────────────── defaults ────────────── */

const DEFAULT_ITEMS: ServiceCardConfig[] = [
  { icon: 'flower',   title: 'العناية الطبيعية',    description: 'مكونات عضوية مختارة بعناية من أفضل المزارع المحلية لضمان نقاء المنتج.', color: 'green'  },
  { icon: 'leaf',     title: 'الاستدامة',           description: 'نلتزم بممارسات صديقة للبيئة في كل مرحلة من مراحل الإنتاج والتوزيع.', color: 'dark'   },
  { icon: 'sprout',   title: 'منتجات نباتية',       description: 'جميع منتجاتنا مصنوعة من مواد نباتية 100% بدون أي اختبارات حيوانية.',  color: 'brown'  },
  { icon: 'target',   title: 'الجودة المضمونة',      description: 'معايير صارمة للتصنيع مع فحص شامل لكل دفعة قبل الوصول لعملائنا.', color: 'sage'   },
  { icon: 'search',   title: 'شفافية كاملة',        description: 'تتبع كامل لسلسلة التوريد ومعلومات مفصّلة عن تركيبة كل منتج.',  color: 'teal'   },
  { icon: 'document', title: 'شهادات معتمدة',       description: 'حاصلون على شهادات دولية في الزراعة العضوية ومعايير الاستدامة.', color: 'beige'  },
];

const DEFAULT_AIRLUME_ITEMS: ServiceCardConfig[] = [
  {
    icon: 'target',
    title: 'Real-Time Fare Signals',
    description: 'Monitor price swings, seat pressure, and book when the fare reaches the right value.',
    color: 'brand',
    eyebrow: 'Fare Forecast',
    ctaText: 'Explore',
    size: 'featured',
  },
  {
    icon: 'grid',
    title: 'Smart Route Optimization',
    description: 'Compare faster, cheaper, and smoother itineraries in a single recommendation layer.',
    color: 'soft-blue',
  },
  {
    icon: 'shield',
    title: 'Dynamic Loyalty Points Tracking',
    description: 'See how far your points go before you commit to a route.',
    color: 'soft-slate',
  },
  {
    icon: 'search',
    title: 'Personalized Flight Alerts',
    description: 'Receive alerts for price drops on routes that matter to you.',
    color: 'soft-sky',
  },
  {
    icon: 'document',
    title: 'Integrated Rewards Redemption',
    description: 'Understand credits, upgrades, and savings without leaving the booking flow.',
    color: 'soft-slate',
  },
  {
    icon: 'list',
    title: 'Airline Comparison Engine',
    description: 'Compare cabins, stopovers, baggage, and loyalty value in one clean panel.',
    color: 'soft-blue',
  },
  {
    icon: 'search',
    title: 'Set & Service Recommendations',
    description: 'Bundle lounge access, flexibility, and add-ons based on your itinerary.',
    color: 'soft-sky',
  },
  {
    icon: 'shield',
    title: 'Secure One-Click Checkout',
    description: 'Finish booking with saved traveler profiles and protected payment logic.',
    color: 'soft-slate',
  },
];

/* ────────────── component ────────────── */

const ServicesGrid: React.FC<ServicesGridProps> = ({ section, settings }) => {
  const { theme } = useStorefrontTheme();
  const isZenOrganic = theme.id === 'zen-organic';
  const isAirlumeAi = theme.id === 'airlume-ai';
  const variant =
    typeof section?.variant === 'string'
      ? section.variant
      : typeof settings?.variant === 'string'
        ? settings.variant
        : '';
  const isMixedHighlight = variant === 'mixed-highlight' || isAirlumeAi;

  const badge    = settings?.badge    || (isAirlumeAi ? 'Travel Features Section' : isZenOrganic ? '✦ قيمنا' : '✦ خدماتنا');
  const title    = settings?.title    || (isAirlumeAi ? 'Smarter Travel Features, Effortless With Airlume' : isZenOrganic ? 'ما يميّزنا' : 'خدماتنا ومميزاتنا');
  const subtitle = settings?.subtitle || (isAirlumeAi ? 'Enjoy seamless booking, sharper flight signals, and personalized rewards inside one travel flow.' : 'نؤمن بأن الطبيعة هي مصدر كل جمال حقيقي، لذلك نقدم منتجات نقية بأعلى معايير الجودة.');
  const columns  = typeof settings?.columns === 'number' && settings.columns > 0 ? Math.min(settings.columns, 4) : 3;
  const configuredItems = Array.isArray(settings?.items)
    ? settings?.items
    : [];
  const items    = configuredItems.length > 0
    ? configuredItems
    : isAirlumeAi
      ? DEFAULT_AIRLUME_ITEMS
      : DEFAULT_ITEMS;

  const gridCols =
    columns === 2 ? 'md:grid-cols-2' :
    columns === 4 ? 'sm:grid-cols-2 xl:grid-cols-4' :
                    'sm:grid-cols-2 lg:grid-cols-3';

  if (isMixedHighlight) {
    const getMosaicSpanClass = (item: ServiceCardConfig, index: number) => {
      const size = item.size || (index === 0 ? 'featured' : item.image ? 'tall' : 'standard');

      if (size === 'featured') {
        return 'md:col-span-2 md:row-span-2 min-h-[22rem] md:min-h-[28rem]';
      }

      if (size === 'wide') {
        return 'md:col-span-2 min-h-[17rem]';
      }

      if (size === 'tall') {
        return 'md:row-span-2 min-h-[22rem]';
      }

      return 'min-h-[15rem]';
    };

    const resolveMosaicSurface = (item: ServiceCardConfig, index: number) => {
      const size = item.size || (index === 0 ? 'featured' : 'standard');
      if (size === 'featured') {
        return {
          shell:
            'border-transparent bg-[radial-gradient(circle_at_top_right,rgba(126,170,255,0.3),transparent_36%),linear-gradient(180deg,#0a1773_0%,#1430af_42%,#2144dd_100%)] text-white shadow-[0_40px_120px_-55px_rgba(45,96,255,0.95)]',
          icon:
            'border-white/16 bg-white/10 text-white shadow-[0_18px_60px_-35px_rgba(255,255,255,0.95)]',
          eyebrow: 'text-white/62',
          description: 'text-white/76',
          cta: 'text-white',
        };
      }

      const tone = item.color || (index % 3 === 0 ? 'soft-blue' : index % 3 === 1 ? 'soft-slate' : 'soft-sky');

      if (tone === 'soft-blue') {
        return {
          shell: 'border-slate-200 bg-white text-slate-950 shadow-[0_24px_70px_-48px_rgba(44,80,166,0.35)]',
          icon: 'border-blue-100 bg-blue-50 text-blue-700',
          eyebrow: 'text-blue-500',
          description: 'text-slate-500',
          cta: 'text-blue-700',
        };
      }

      if (tone === 'soft-sky') {
        return {
          shell: 'border-sky-100 bg-[linear-gradient(180deg,#ffffff_0%,#f4f9ff_100%)] text-slate-950 shadow-[0_24px_70px_-48px_rgba(55,120,181,0.22)]',
          icon: 'border-sky-100 bg-sky-50 text-sky-700',
          eyebrow: 'text-sky-500',
          description: 'text-slate-500',
          cta: 'text-sky-700',
        };
      }

      return {
        shell: 'border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] text-slate-950 shadow-[0_24px_70px_-50px_rgba(31,41,55,0.22)]',
        icon: 'border-slate-200 bg-slate-50 text-slate-700',
        eyebrow: 'text-slate-400',
        description: 'text-slate-500',
        cta: 'text-slate-700',
      };
    };

    return (
      <section className="relative overflow-hidden bg-[#f7faff] py-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(69,111,255,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(247,250,255,1))]" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4 md:px-6">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            {badge ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-blue-600 shadow-sm">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                {badge}
              </span>
            ) : null}
            {title ? (
              <h2 className="mt-5 font-heading text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-500 md:text-lg">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => {
              const IconComponent = ICON_MAP[item.icon || ''] || ICON_MAP[ICON_KEYS[index % ICON_KEYS.length]!]!;
              const surface = resolveMosaicSurface(item, index);
              const spanClass = getMosaicSpanClass(item, index);
              const size = item.size || (index === 0 ? 'featured' : item.image ? 'tall' : 'standard');

              if (item.image) {
                return (
                  <div
                    key={`${item.title}-${index}`}
                    className={`group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_90px_-55px_rgba(30,52,120,0.4)] ${spanClass}`}
                  >
                    <img
                      src={item.image}
                      alt={item.imageAlt || item.title}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,17,55,0.1),rgba(9,17,55,0.68))]" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      {item.eyebrow ? (
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/55">
                          {item.eyebrow}
                        </p>
                      ) : null}
                      <h3 className="mt-2 text-xl font-black text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 max-w-sm text-sm leading-6 text-white/72">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`${item.title}-${index}`}
                  className={`group relative flex flex-col overflow-hidden rounded-[2rem] border p-6 transition-transform duration-500 hover:-translate-y-1 md:p-7 ${spanClass} ${surface.shell}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${surface.icon}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    {item.eyebrow ? (
                      <p className={`text-[10px] font-black uppercase tracking-[0.28em] ${surface.eyebrow}`}>
                        {item.eyebrow}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-6 flex flex-1 flex-col">
                    <h3 className={`max-w-[16ch] font-heading text-xl font-black tracking-[-0.03em] ${size === 'featured' ? 'md:text-3xl' : 'md:text-[1.35rem]'}`}>
                      {item.title}
                    </h3>
                    <p className={`mt-3 max-w-sm text-sm leading-7 md:text-[15px] ${surface.description}`}>
                      {item.description}
                    </p>

                    {item.ctaText ? (
                      <div className={`mt-auto pt-6 text-sm font-black uppercase tracking-[0.24em] ${surface.cta}`}>
                        {item.ctaText} <span aria-hidden="true">→</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden py-16 bg-background">
      <div className="container px-4 md:px-6 relative z-10 max-w-5xl mx-auto">
        {/* Render header ONLY if not zen-organic, because the reference has no header */}
        {!isZenOrganic && (title || subtitle) && (
          <div className="mb-12 flex flex-col items-center text-center space-y-4">
            {badge && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/90 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.28em] text-primary shadow-sm backdrop-blur-sm">
                {badge}
              </span>
            )}
            {title && (
              <h2 className="max-w-3xl font-heading text-3xl font-extrabold tracking-tight text-balance text-foreground md:text-4xl lg:text-5xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* The Grid */}
        <div className={`grid grid-cols-1 gap-6 md:gap-8 ${gridCols}`}>
          {items.map((item, idx) => {
            /* ── image card variant (bottom-left in ref) ── */
            if (item.image) {
              return (
                <div
                  key={`${item.title}-${idx}`}
                  className="group relative overflow-hidden rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 hover:-translate-y-1 min-h-[280px]"
                >
                  <img
                    src={item.image}
                    alt={item.imageAlt || item.title || 'Service Image'}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Subtle gradient to ensure any text is readable, though the reference has no text overlay on the image */}
                </div>
              );
            }

            /* ── standard precise icon card ── */
            let bgClass = '';
            // Map colors specifically for Zen Organic design reference
            if (idx === 0) bgClass = 'bg-[#89a877]';
            else if (idx === 1) bgClass = 'bg-[#684c3c]';
            else if (idx === 2) bgClass = 'bg-[#ab855c]';
            else if (idx === 4) bgClass = 'bg-[#5b3f2e]';
            else if (idx === 5) bgClass = 'bg-[#ceab88]';
            else bgClass = resolveColor(item.color, idx).bg;

            const IconComponent = ICON_MAP[item.icon || ''] || ICON_MAP[ICON_KEYS[idx % ICON_KEYS.length]!]!;

            return (
              <div
                key={`${item.title}-${idx}`}
                className={`group relative flex min-h-[280px] flex-col items-center justify-center rounded-[2.5rem] p-8 text-center shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] transition-transform duration-500 hover:-translate-y-1 md:p-10 ${bgClass}`}
              >
                {/* 3D Depressed Icon Holder */}
                <div className="relative mb-6">
                  {/* Inner shadow simulator */}
                  <div className={`absolute inset-0 rounded-full ${
                    'bg-black/30 shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)] mix-blend-multiply'
                  }`} />
                  <div className="relative z-10 flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full text-white">
                    <IconComponent className="h-7 w-7" />
                  </div>
                </div>

                {/* typography */}
                <div className="z-10 w-full space-y-3">
                  <h3 className="font-sans text-lg font-bold tracking-tight text-white drop-shadow-sm">
                    {item.title}
                  </h3>
                  <p className="font-medium text-[0.65rem] leading-relaxed text-white/80 sm:text-xs">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesGrid;
