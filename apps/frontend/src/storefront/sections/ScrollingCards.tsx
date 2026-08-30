import React from 'react';
import { buildOptimizedStorefrontImageUrl } from '../utils/productImages';

interface ScrollingCardItem {
  title?: string;
  description?: string;
  image?: string;
  icon?: string;
  bg?: string;
}

interface ScrollingCardsProps {
  section?: { variant?: string };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    cards?: ScrollingCardItem[] | string;
    images?: string[] | string;
  };
}

const SCROLLING_VARIANTS = new Set(['standard', 'layered', 'style2']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return SCROLLING_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

const parseCards = (value: ScrollingCardsProps['settings'] extends undefined ? never : unknown): ScrollingCardItem[] => {
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
      const [title = '', description = '', image = '', icon = '', bg = '#f5f5f5'] = line
        .split('|')
        .map((part) => part.trim());
      return { title, description, image, icon, bg };
    });
};

const DEFAULT_CARDS: ScrollingCardItem[] = [
  { title: 'Premium Quality Fabrics', description: 'Soft, durable materials selected for lasting comfort.', icon: 'shield', bg: '#f3efea' },
  { title: 'Safe & Secure Shopping', description: 'Protected checkout and encrypted payments.', icon: 'lock', bg: '#eaf0f5' },
  { title: 'Free Shipping $500+', description: 'Convenient delivery on qualifying orders.', icon: 'truck', bg: '#f0f1e8' },
  { title: 'Easy 14-Day Returns', description: 'Simple exchange and return policy.', icon: 'rotate', bg: '#f5eaf0' },
];

const ICON_PATHS: Record<string, string> = {
  shield: 'M12 2l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5l8-3z',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  truck: 'M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  rotate: 'M4 12a8 8 0 0 1 14-5m2 5a8 8 0 0 1-14 5',
};

const parseImages = (value: ScrollingCardsProps['settings'] extends undefined ? never : unknown): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const ScrollingCards: React.FC<ScrollingCardsProps> = ({ section, settings }) => {
  const variant = normalizeVariant(section?.variant);
  const badge = settings?.badge || 'Why Choose Us';
  const title = settings?.title || 'Trusted Quality, Designed for Everyday Confidence';
  const subtitle = settings?.subtitle || '';
  const cards = parseCards(settings?.cards);
  const resolvedCards = cards.length > 0 ? cards : DEFAULT_CARDS;
  const isLayered = variant === 'layered' || variant === 'style2';
  const stackImages = parseImages(settings?.images);

  React.useEffect(() => {
    if (!isLayered || stackImages.length < 2) return undefined;
    const sectionEl = document.getElementById('sf-layered-images');
    if (!sectionEl) return undefined;
    let frame = 0;
    const timer = setInterval(() => {
      frame = (frame + 1) % stackImages.length;
      const tiles = sectionEl.querySelectorAll<HTMLElement>('[data-sf-stack-tile]');
      tiles.forEach((tile, index) => {
        const offset = (index + frame) % stackImages.length;
        tile.style.zIndex = String(10 - offset);
        tile.style.transform = `rotate(${offset === 0 ? -2 : offset === 1 ? 2.5 : -1}deg) translate(${offset * -10}px, ${offset * -12}px) scale(${1 - offset * 0.05})`;
        tile.style.opacity = offset > 2 ? '0' : '1';
      });
    }, 3200);
    return () => clearInterval(timer);
  }, [isLayered, stackImages.length]);

  const renderFeatureGrid = () => (
    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {resolvedCards.map((card, index) => (
        <div key={`${card.title}-${index}`} className="flex items-start gap-4 border-b border-black/[0.07] pb-7">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px]"
            style={{ background: card.bg || '#f3efea' }}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#171717]" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d={ICON_PATHS[card.icon || ''] || ICON_PATHS['shield']} />
            </svg>
          </span>
          <div>
            <h3 className="font-heading text-[17px] font-semibold leading-6 text-[#171717]">{card.title}</h3>
            {card.description && <p className="mt-1.5 text-sm leading-6 text-[#575757]">{card.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );

  if (isLayered && stackImages.length >= 2) {
    return (
      <section className="w-full bg-white py-14 md:py-24">
        <div className="container mx-auto grid max-w-[1360px] items-center gap-14 px-5 md:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)]">
          {/* Stacked rotating images */}
          <div id="sf-layered-images" className="relative mx-auto h-[420px] w-full max-w-[400px] md:h-[500px]">
            {stackImages.slice(0, 3).map((src, index) => (
              <div
                key={`${src}-${index}`}
                data-sf-stack-tile
                className="absolute inset-0 overflow-hidden rounded-[18px] border border-black/5 shadow-[0_30px_70px_-38px_rgba(0,0,0,0.45)]"
                style={{
                  zIndex: 10 - index,
                  transform: `rotate(${index === 0 ? -2 : index === 1 ? 2.5 : -1}deg) translate(${index * -10}px, ${index * -12}px) scale(${1 - index * 0.05})`,
                  transition: 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease, z-index 0s',
                  opacity: index > 2 ? 0 : 1,
                }}
              >
                <img src={buildOptimizedStorefrontImageUrl(src, { width: 640 })} alt="" loading="lazy" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          {/* Feature grid */}
          <div>
            <div className="mb-8">
              <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#575757]">
                {badge}
              </span>
              <h2 className="mt-3 font-heading text-2xl font-semibold leading-snug text-[#171717] md:text-[2.1rem]">{title}</h2>
              {subtitle && <p className="mt-2 max-w-xl text-sm leading-7 text-[#575757] md:text-base">{subtitle}</p>}
            </div>
            {renderFeatureGrid()}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-[#efe8e3] py-14 md:py-20">
      <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-md bg-[#e16244]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e16244]">
            {badge}
          </span>
          <h2 className="mt-3 font-heading text-3xl font-semibold text-[#171717] md:text-4xl">{title}</h2>
          {subtitle && <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-[#575757] md:text-base">{subtitle}</p>}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-6 [scrollbar-width:thin]">
          {resolvedCards.map((card, index) => {
            const bg = card.bg || (index % 2 === 0 ? '#f3efea' : '#eaf0f5');
            const imageUrl = card.image ? buildOptimizedStorefrontImageUrl(card.image, { width: 640 }) : '';
            return (
              <div
                key={`${card.title}-${index}`}
                className="relative w-[15rem] shrink-0 overflow-hidden rounded-[15px] md:w-[17rem]"
                style={{ background: bg }}
              >
                {imageUrl ? (
                  <div className="h-40 overflow-hidden">
                    <img src={imageUrl} alt={card.title || 'card'} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <div className={imageUrl ? 'p-5' : 'flex h-[13rem] flex-col justify-between p-5'}>
                  {card.icon && !imageUrl ? (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-[#8a6a3c]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d={ICON_PATHS[card.icon] || ICON_PATHS['shield']} />
                      </svg>
                    </span>
                  ) : null}
                  <div className="space-y-2">
                    <h3 className="font-heading text-lg font-semibold text-[#171717]">{card.title}</h3>
                    {card.description && <p className="text-sm leading-6 text-[#575757]">{card.description}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isLayered && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {resolvedCards.map((_, index) => (
              <span key={`dot-${index}`} className="h-1.5 w-1.5 rounded-full bg-[#b06d31]/40" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ScrollingCards;
