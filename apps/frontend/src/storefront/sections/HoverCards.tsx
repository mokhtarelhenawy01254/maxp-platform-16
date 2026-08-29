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
    gradientFrom?: string;
    gradientTo?: string;
  };
}

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

const DEFAULT_CARDS: HoverCardItem[] = [
  {
    title: 'Women in Style',
    description: 'Effortless pieces for every mood and moment.',
    image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/fashion-portrait-young-elegant-woman_1_3.png?v=1787656064&width=500',
    ctaText: 'Shop Now',
    link: '/shop?category=womens',
  },
  {
    title: 'Men in Style',
    description: 'Confident looks for every occasion.',
    image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/fashion-portrait-young-elegant-woman_1_2.png?v=1787656064&width=500',
    ctaText: 'Shop Now',
    link: '/shop?category=mens',
  },
  {
    title: 'Little Style',
    description: 'Fun, comfortable styles for little trendsetters.',
    image: 'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/fashion-portrait-young-elegant-woman_6.png?v=1787656064&width=500',
    ctaText: 'Shop Now',
    link: '/shop?category=kids',
  },
];

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const HoverCards: React.FC<HoverCardsProps> = ({ section: _section, settings }) => {
  const location = useLocation();
  const heading = settings?.heading || 'Style Made for Every You';
  const description =
    settings?.description ||
    'Discover fashion made for every moment. Explore thoughtfully curated styles for women, men, and kids designed to bring effortless style and everyday confidence to every look.';
  const ctaText = settings?.ctaText || 'Shop Now';
  const ctaLink = settings?.ctaLink || '/collections';
  const cards = parseCards(settings?.cards);
  const resolvedCards = cards.length > 0 ? cards : DEFAULT_CARDS;

  const gradientFrom = settings?.gradientFrom || '#194C21';
  const gradientTo = settings?.gradientTo || '#071009';
  const bgGradient = `radial-gradient(${gradientFrom}, ${gradientTo} 100%)`;

  const ctaResolved = isExternalHref(ctaLink)
    ? ctaLink
    : buildStorefrontPath(location.pathname, ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`, location.search);

  return (
    <section className="relative w-full overflow-hidden text-white" style={{ background: bgGradient }}>
      <style>{`
        .sf-hover-wrap { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.3fr); min-height: 38rem; }
        .sf-hover-cards { display: flex; }
        .sf-hover-card { position: relative; flex: 1; min-width: 0; overflow: hidden; cursor: pointer; transition: flex .5s cubic-bezier(.22,1,.36,1); }
        .sf-hover-card:hover { flex: 1.5; }
        .sf-hover-card-imgwrap { position: absolute; inset: 0; }
        .sf-hover-card-imgwrap img { width: 100%; height: 100%; object-fit: contain; object-position: 50% 50%; }
        .sf-hover-card-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.45) 100%); }
        .sf-hover-card-content { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 2rem; z-index: 2; }
        .sf-card-title { font-family: "Montserrat", sans-serif; font-weight: 500; transition: opacity .35s, transform .35s; }
        .sf-card-desc { opacity: 0; transform: translateY(10px); transition: opacity .4s, transform .4s; }
        .sf-hover-card:hover .sf-card-title { opacity: 0; }
        .sf-hover-card:hover .sf-card-desc { opacity: 1; transform: translateY(0); }
        @media (max-width: 768px) {
          .sf-hover-wrap { grid-template-columns: 1fr; }
          .sf-hover-cards { flex-direction: column; }
          .sf-hover-card { min-height: 12rem; }
          .sf-hover-card:hover { flex: 1; }
          .sf-card-desc { opacity: 1; transform: none; }
          .sf-card-title { opacity: 1; }
        }
      `}</style>
      <div className="sf-hover-wrap">
        <div className="relative z-10 flex flex-col items-start justify-center px-6 py-16 md:px-12">
          <h2 className="font-heading text-[1.6rem] font-semibold leading-snug text-white md:text-[1.55rem]" style={{ fontFamily: '"Montserrat", sans-serif' }}>
            {heading}
          </h2>
          <p className="mt-4 max-w-sm text-base leading-7 text-white/90">{description}</p>
          <Link
            to={ctaResolved}
            className="mt-8 inline-flex rounded-lg bg-white px-8 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-black transition-colors hover:bg-[#b06d31] hover:text-white"
          >
            {ctaText}
          </Link>
        </div>

        <div className="sf-hover-cards">
          {resolvedCards.map((card, index) => (
            <div
              key={`${card.title}-${index}`}
              className="sf-hover-card"
            >
              <svg className="absolute -right-[2px] top-0 z-[3] h-full w-3 text-[#98DDA3]" viewBox="0 0 92 899" preserveAspectRatio="none" aria-hidden="true">
                <path d="M41.12 36.63C45.94 14.79 65.44 0 87.8 0H92V899H87.8C65.44 899 45.94 884.21 41.12 862.37C26.75 797.26 0 649.2 0 449.5C0 249.8 26.75 101.74 41.12 36.63Z" fill="#98DDA3" opacity="0.25" />
              </svg>
              {card.image && (
                <div className="sf-hover-card-imgwrap">
                  <img src={card.image} alt={card.title || 'card'} loading={index === 0 ? 'eager' : 'lazy'} />
                </div>
              )}
              <div className="sf-hover-card-shade" />
              <div className="sf-hover-card-content">
                <p className="sf-card-title text-2xl font-semibold text-white md:text-3xl" style={{ fontFamily: '"Montserrat", sans-serif' }}>
                  {card.title}
                </p>
                <div>
                  <p className="sf-card-desc text-sm leading-6 text-white/90">
                    {card.description}
                    <Link
                      to={card.link ? buildStorefrontPath(location.pathname, card.link.startsWith('/') ? card.link : `/${card.link}`, location.search) : ctaResolved}
                      className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white underline-offset-4 hover:underline"
                    >
                      {card.ctaText || 'Shop Now'}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HoverCards;
