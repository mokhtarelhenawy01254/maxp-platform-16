import React from 'react';
import { buildOptimizedStorefrontImageUrl } from '../utils/productImages';

interface SocialGalleryProps {
  section?: { variant?: string };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    handle?: string;
    images?: string[] | string;
  };
}

const SOCIAL_VARIANTS = new Set(['standard', 'grid', 'marquee']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return SOCIAL_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

const DEFAULT_IMAGES = [
  'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/47f164fdd70cd02bbb66b1dcb7c26a2fba4828af.jpg?v=1784544334&width=600',
  'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle_45382.png?v=1784544330&width=600',
  'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle_45379.png?v=1784544329&width=600',
  'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle_45380.png?v=1784544330&width=600',
  'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/181d35ac45c081698fb605a0ea26ecd2e95158dc.jpg?v=1784544331&width=600',
  'https://texture-a2xirfpg.myshopify.com/cdn/shop/files/Rectangle_45446.png?v=1784783015&width=600',
];

const parseImages = (value: SocialGalleryProps['settings'] extends undefined ? never : unknown): string[] => {
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

const SocialGallery: React.FC<SocialGalleryProps> = ({ section, settings }) => {
  const variant = normalizeVariant(section?.variant);
  const badge = settings?.badge || 'Styled By Our Community';
  const title = settings?.title || 'Styled By Our Community';
  const subtitle = settings?.subtitle || 'Instagram · Follow Us';
  const handle = settings?.handle || '@Graceful';
  const images = parseImages(settings?.images);
  const resolvedImages = images.length > 0 ? images : DEFAULT_IMAGES;
  const isMarquee = variant === 'marquee';
  const socialHandleHref = handle.startsWith('@')
    ? `https://instagram.com/${handle.slice(1)}`
    : handle.startsWith('http')
      ? handle
      : `https://instagram.com/${handle}`;

  const renderTile = (src: string, index: number) => (
    <div key={`${src}-${index}`} className="group relative aspect-square shrink-0 overflow-hidden">
      <img
        src={buildOptimizedStorefrontImageUrl(src, { width: 400 })}
        alt="community"
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/30 group-hover:opacity-100">
        <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  );

  if (isMarquee) {
    const doubled = [...resolvedImages, ...resolvedImages];
    return (
      <section className="w-full bg-white py-12 md:py-16">
        <div className="mb-8 text-center">
          <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
            {badge}
          </span>
          <h2 className="mt-3 font-heading text-3xl font-semibold text-[#171717] md:text-4xl">{title}</h2>
          <p className="mt-1 text-sm text-[#575757]">{subtitle}</p>
        </div>
        <style>{`
          .sf-social-track { display: flex; width: max-content; animation: sfSocialScroll 28s linear infinite; }
          .sf-social-track:hover { animation-play-state: paused; }
          @keyframes sfSocialScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @media (prefers-reduced-motion: reduce) { .sf-social-track { animation: none; } }
        `}</style>
        <div className="relative overflow-hidden">
          <div className="sf-social-track gap-3">
            {doubled.map((src, index) => {
              const tile = renderTile(src, index % resolvedImages.length);
              return React.cloneElement(tile as React.ReactElement, { key: `marquee-${index}` });
            })}
            <span className="sr-only">{handle}</span>
          </div>
          {/* Center Instagram card */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <a
              href={socialHandleHref}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto flex w-56 flex-col items-center gap-2 rounded-2xl bg-white/95 px-6 py-7 text-center shadow-[0_30px_70px_-30px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-transform duration-300 hover:scale-[1.03]"
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="url(#sfIgGrad)" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="4.2" stroke="url(#sfIgGrad)" strokeWidth="1.8" />
                <circle cx="17.2" cy="6.8" r="1.2" fill="#e1306c" />
                <defs>
                  <linearGradient id="sfIgGrad" x1="3" y1="21" x2="21" y2="3">
                    <stop stopColor="#f9ce34" />
                    <stop offset="0.5" stopColor="#ee2a7b" />
                    <stop offset="1" stopColor="#6228d7" />
                  </linearGradient>
                </defs>
              </svg>
              <p className="text-sm font-bold text-[#171717]">Instagram</p>
              <p className="-mt-1 text-xs text-[#8a8a8a]">Follow Us</p>
              <span className="mt-1 inline-flex rounded-lg bg-[#171717] px-4 py-2 text-[11px] font-semibold text-white">
                {handle}
              </span>
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full bg-white py-12 md:py-16">
      <div className="container mx-auto max-w-[176rem] px-5 md:px-10">
        <div className="mb-8 text-center">
          <span className="inline-block border-b border-[#e16244] pb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#e16244]">
            {badge}
          </span>
          <h2 className="mt-3 font-heading text-3xl font-semibold text-[#171717] md:text-4xl">{title}</h2>
          <p className="mt-1 text-sm text-[#575757]">{subtitle}</p>
        </div>
        <div className={`grid gap-3 ${variant === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'flex overflow-x-auto'}`}>
          {resolvedImages.map((src, index) => renderTile(src, index))}
        </div>
      </div>
    </section>
  );
};

export default SocialGallery;
