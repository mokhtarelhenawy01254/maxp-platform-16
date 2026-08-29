import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface HoverCardItem {
  title?: string;
  description?: string;
  image?: string;
  ctaText?: string;
  link?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

interface HoverCardsProps {
  section?: { variant?: string };
  settings?: {
    heading?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    cards?: HoverCardItem[] | string;
  };
}

const HOVER_VARIANTS = new Set(['standard', 'editorial']);

const normalizeVariant = (value: unknown): 'standard' | 'editorial' => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return HOVER_VARIANTS.has(normalizedValue)
    ? (normalizedValue as 'standard' | 'editorial')
    : 'standard';
};

const parseCards = (value: HoverCardsProps['settings'] extends undefined ? never : unknown): HoverCardItem[] => {
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
      const [title = '', description = '', image = '', ctaText = 'Shop Now', link = '/shop', gradientFrom = '', gradientTo = ''] =
        line.split('|').map((part) => part.trim());
      return { title, description, image, ctaText, link, gradientFrom, gradientTo };
    });
};

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const renderCta = (
  label: string | undefined,
  href: string | undefined,
  className: string,
  pathname: string,
  search: string,
) => {
  const resolvedLabel = label || 'Shop Now';
  if (!href) {
    return null;
  }

  const internalLink = buildStorefrontPath(pathname, href.startsWith('/') ? href : `/${href}`, search);
  return isExternalHref(href) ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {resolvedLabel}
    </a>
  ) : (
    <Link to={internalLink} className={className}>
      {resolvedLabel}
    </Link>
  );
};

const DEFAULT_CARDS: HoverCardItem[] = [
  {
    title: 'Women in Style',
    description: 'Effortless pieces for every mood and moment.',
    image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/fashion-portrait-young-elegant-woman_1_3.png?v=1787656064&width=500',
    ctaText: 'Shop Now',
    link: '/shop?category=womens',
    gradientFrom: '#634A01',
    gradientTo: '#120707',
  },
  {
    title: 'Men in Style',
    description: 'Confident looks for every occasion.',
    image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/fashion-portrait-young-elegant-woman_1_2.png?v=1787656064&width=500',
    ctaText: 'Shop Now',
    link: '/shop?category=mens',
    gradientFrom: '#4A3A2F',
    gradientTo: '#100C08',
  },
  {
    title: 'Little Style',
    description: 'Fun, comfortable styles for little trendsetters.',
    image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/fashion-portrait-young-elegant-woman_6.png?v=1787656064&width=500',
    ctaText: 'Shop Now',
    link: '/shop?category=kids',
    gradientFrom: '#7A4A6B',
    gradientTo: '#15070F',
  },
];

const HoverCards: React.FC<HoverCardsProps> = ({ section, settings }) => {
  const location = useLocation();
  const variant = normalizeVariant(section?.variant);
  const heading = settings?.heading || 'Style Made for Every You';
  const description =
    settings?.description ||
    'Discover fashion made for every moment. Explore thoughtfully curated styles for women, men, and kids designed to bring effortless style and everyday confidence to every look.';
  const ctaText = settings?.ctaText || 'Shop Now';
  const ctaLink = settings?.ctaLink || '/collections';
  const cards = parseCards(settings?.cards);
  const resolvedCards = cards.length > 0 ? cards : DEFAULT_CARDS;

  const cardClasses =
    variant === 'editorial'
      ? 'hover:flex-[2.6] hover:grow-[2.6]'
      : 'hover:scale-[1.03]';

  return (
    <section className="w-full bg-white">
      <style>{`
        .sf-hover-cards { position: relative; }
        .sf-hover-card { transition: flex-grow .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1), box-shadow .6s; overflow: hidden; position: relative; cursor: pointer; }
        .sf-hover-card:hover .sf-card-title { transform: translateY(-2px); }
        .sf-card-mask { width: 92px; position: absolute; inset-block: 0; z-index: 0; }
        .sf-hover-card-inner { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; padding: 1.75rem; }
        .sf-hover-card-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
        .sf-hover-card-shade { position: absolute; inset: 0; z-index: 2; background: linear-gradient(160deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.55) 100%); }
        .sf-hover-card-content { position: relative; z-index: 3; }
      `}</style>
      <div className="sf-hover-cards mx-auto max-w-[176rem]">
        <div className="grid items-center gap-8 px-5 py-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-10 md:py-16 lg:px-10">
          <div className="space-y-5">
            <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
              Curated Collection
            </span>
            <h2 className="font-heading text-[2.4rem] font-semibold leading-[1.15] tracking-tight text-[#171717] md:text-[3.4rem]">
              {heading}
            </h2>
            <p className="max-w-md text-base leading-7 text-[#575757] md:text-lg">{description}</p>
            {renderCta(
              ctaText,
              ctaLink,
              'inline-flex items-center gap-2 rounded-lg bg-[#171717] px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#e16244]',
              location.pathname,
              location.search,
            )}
          </div>

          <div className="flex h-[28rem] gap-3 md:h-[36rem] lg:h-[40rem]">
            {resolvedCards.map((card, index) => {
              const gradient = `radial-gradient(${card.gradientFrom || '#634A01'}, ${card.gradientTo || '#120707'} 60%)`;

              return (
                <div
                  key={`${card.title}-${index}`}
                  className={`sf-hover-card group flex-1 ${cardClasses}`}
                  style={{ background: gradient }}
                >
                  <svg
                    className="sf-card-mask"
                    viewBox="0 0 92 899"
                    preserveAspectRatio="none"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M41.12 36.63C45.94 14.79 65.44 0 87.8 0H92V899H87.8C65.44 899 45.94 884.21 41.12 862.37C26.75 797.26 0 649.2 0 449.5C0 249.8 26.75 101.74 41.12 36.63Z"
                      fill="currentColor"
                      opacity="0.18"
                    />
                  </svg>
                  <div className="sf-hover-card-inner">
                    {card.image && (
                      <img
                        src={card.image}
                        alt={card.title || 'card'}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        className="sf-hover-card-img"
                      />
                    )}
                    <div className="sf-hover-card-shade" />
                    <div className="sf-hover-card-content mt-auto">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/80">
                        {String(index + 1).padStart(2, '0')}
                      </p>
                      <h3 className="sf-card-title mt-2 font-heading text-2xl font-semibold text-white transition-transform duration-500 md:text-3xl">
                        {card.title}
                      </h3>
                      {card.description && (
                        <p className="mt-2 max-h-0 overflow-hidden text-sm leading-6 text-white/85 opacity-0 transition-all duration-500 group-hover:max-h-20 group-hover:opacity-100">
                          {card.description}
                        </p>
                      )}
                      <div className="mt-3 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                        {renderCta(
                          card.ctaText,
                          card.link,
                          'inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#171717] transition-colors hover:bg-[#b06d31] hover:text-white',
                          location.pathname,
                          location.search,
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HoverCards;
