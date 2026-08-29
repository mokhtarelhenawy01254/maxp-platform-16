import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface CollectionTabTab {
  label?: string;
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
}

interface CollectionTabProps {
  section?: { variant?: string };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    tabs?: CollectionTabTab[] | string;
    columns?: number | string;
    mobileColumns?: number | string;
    showArrows?: boolean | string;
    ctaText?: string;
    ctaLink?: string;
  };
}

const TAB_VARIANTS = new Set(['standard', 'split', 'pills']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return TAB_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

const parseTabs = (value: CollectionTabProps['settings'] extends undefined ? never : unknown): CollectionTabTab[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = '', title = '', subtitle = '', image = '', link = ''] = line
        .split('|')
        .map((part) => part.trim());
      return { label, title, subtitle, image, link };
    });
};

const DEFAULT_TABS: CollectionTabTab[] = [
  { label: 'Winter', title: 'Winter Collection', subtitle: 'Layered warmth for the cold season.', image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Vector_3.svg?v=1784620486' },
  { label: 'Spring', title: 'Spring Collection', subtitle: 'Light fabrics and soft color.', image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Vector_4.svg?v=1784620486' },
  { label: 'Summer', title: 'Summer Essentials', subtitle: 'Breathable, airy basics for longer days.', image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/sunny-day_1_1.svg?v=1784620486' },
  { label: 'Autumn', title: 'Autumn Layers', subtitle: 'Earthy tones and transition pieces.', image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Vector_5.svg?v=1784620486' },
];

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const CollectionTab: React.FC<CollectionTabProps> = ({ section, settings }) => {
  const location = useLocation();
  const variant = normalizeVariant(section?.variant);
  const badge = settings?.badge || 'Style for Every Season';
  const title = settings?.title || 'Style for Every Season';
  const subtitle =
    settings?.subtitle ||
    'Discover timeless fashion, seasonal essentials, and effortless styles made for every time of the year.';
  const tabs = parseTabs(settings?.tabs);
  const resolvedTabs = tabs.length > 0 ? tabs : DEFAULT_TABS;
  const columns = Math.max(2, Number(settings?.columns) || 3);
  const showArrows = String(settings?.showArrows) === 'true';
  const ctaText = settings?.ctaText || 'Explore More';
  const ctaLink = settings?.ctaLink || '/shop';

  const [activeTab, setActiveTab] = useState(0);

  const gridStyle = {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    ['--mobile-columns' as string]: String(settings?.mobileColumns || '2'),
  };

  const renderGrid = () => (
    <div className="grid gap-4 max-md:grid-cols-[var(--mobile-columns)]" style={{ ...gridStyle, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {resolvedTabs.map((tab, index) => {
        const internalLink = buildStorefrontPath(
          location.pathname,
          (tab.link || ctaLink).startsWith('/') ? (tab.link || ctaLink) : `/${tab.link || ctaLink}`,
          location.search,
        );
        return (
          <div
            key={`${tab.title}-${index}`}
            className="group relative overflow-hidden rounded-[15px] border border-black/5 bg-black/[0.39] transition-all duration-500 hover:bg-white hover:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.4)]"
            style={{ ['--preview-text' as string]: index === activeTab ? '#000' : '#fff' }}
          >
            {tab.image && (
              <div className="relative h-44 w-full overflow-hidden md:h-52">
                <img
                  src={tab.image}
                  alt={tab.title || tab.label || 'tab'}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}
            <div className="p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">{tab.label}</p>
              <h3 className="mt-1 font-heading text-lg font-semibold text-white transition-colors group-hover:text-[#171717]">
                {tab.title}
              </h3>
              <p className="mt-1 text-sm leading-6 text-white/75 transition-colors group-hover:text-[#575757]">
                {tab.subtitle}
              </p>
              <Link
                to={internalLink}
                className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85 transition-colors group-hover:text-[#e16244]"
              >
                {ctaText} →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (variant === 'pills') {
    return (
      <section className="w-full bg-white py-14 md:py-20">
        <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-md bg-[#e16244]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e16244]">
              {badge}
            </span>
            <h2 className="mt-3 font-heading text-3xl font-semibold text-[#171717] md:text-4xl">{title}</h2>
            {subtitle && <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-[#575757] md:text-base">{subtitle}</p>}
          </div>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {resolvedTabs.map((tab, index) => (
              <button
                key={`${tab.title}-${index}`}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                  index === activeTab
                    ? 'bg-[#171717] text-white'
                    : 'bg-[#e9e9e9] text-[#171717] hover:bg-[#d8d8d8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {renderGrid()}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white py-14 md:py-20">
      <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
        <div className="mb-8 flex flex-col items-start gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-2">
            <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
              {badge}
            </span>
            <h2 className="font-heading text-3xl font-semibold text-[#171717] md:text-4xl">{title}</h2>
            {subtitle && <p className="text-sm leading-7 text-[#575757] md:text-base">{subtitle}</p>}
          </div>
          {typeof ctaLink === 'string' && ctaLink.trim() && (
            <Link
              to={buildStorefrontPath(location.pathname, ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`, location.search)}
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#171717] transition-colors hover:text-[#e16244]"
            >
              {ctaText} →
            </Link>
          )}
        </div>
        {renderGrid()}
        {showArrows && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button type="button" onClick={() => setActiveTab((prev) => (prev - 1 + resolvedTabs.length) % resolvedTabs.length)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171717] shadow transition-colors hover:bg-[#171717] hover:text-white" aria-label="Previous">
              ←
            </button>
            <button type="button" onClick={() => setActiveTab((prev) => (prev + 1) % resolvedTabs.length)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#171717] shadow transition-colors hover:bg-[#171717] hover:text-white" aria-label="Next">
              →
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CollectionTab;
