import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import { buildOptimizedStorefrontImageUrl, buildResponsiveStorefrontImage } from '../utils/productImages';

interface StoryParallaxProps {
  section?: {
    variant?: string;
  };
  settings?: {
    title?: string;
    content?: string;
    badge?: string;
    image?: string;
    imageAlt?: string;
    video?: string;
    overlayOpacity?: number;
    ctaText?: string;
    ctaLink?: string;
  };
}

const STORY_VARIANTS = new Set(['standard', 'split-editorial']);

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const normalizeStoryVariant = (value: unknown): 'standard' | 'split-editorial' => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return STORY_VARIANTS.has(normalizedValue)
    ? (normalizedValue as 'standard' | 'split-editorial')
    : 'standard';
};

const StoryParallax: React.FC<StoryParallaxProps> = ({ section, settings }) => {
  const location = useLocation();
  const variant = normalizeStoryVariant(section?.variant);
  const title = settings?.title || 'فن الحرفية المصرية';
  const content =
    settings?.content ||
    'كل زوج من الأحذية يمر بـ 30 مرحلة من التصنيع اليدوي لضمان الكمال.';
  const badge = settings?.badge || 'تراثنا';
  const image =
    settings?.image ||
    'https://images.unsplash.com/photo-1540324155974-7523202daa3f?auto=format&fit=crop&q=80&w=2070';
  const imageAlt = settings?.imageAlt || title;
  const overlayOpacity = settings?.overlayOpacity ?? 0.45;
  const ctaText = settings?.ctaText || 'اقرئي القصة كاملة';
  const ctaLink =
    typeof settings?.ctaLink === 'string' && settings.ctaLink.trim()
      ? buildStorefrontPath(
          location.pathname,
          settings.ctaLink.trim().startsWith('/')
            ? settings.ctaLink.trim()
            : `/${settings.ctaLink.trim()}`,
          location.search,
        )
      : '';

  const responsiveImage = buildResponsiveStorefrontImage(image, {
    widths: [360, 720, 1080],
    fallbackWidth: 720,
    sizes: '(min-width: 768px) 48vw, calc(100vw - 4rem)',
  });
  const optimizedBgUrl = buildOptimizedStorefrontImageUrl(image, { width: 1920 });

  const renderCta = (className: string) => {
    if (!ctaLink || !ctaText.trim()) {
      return null;
    }

    return isExternalHref(ctaLink) ? (
      <a href={ctaLink} target="_blank" rel="noreferrer" className={className}>
        {ctaText}
      </a>
    ) : (
      <Link to={ctaLink} className={className}>
        {ctaText}
      </Link>
    );
  };

  if (variant === 'split-editorial') {
    return (
      <section className="w-full bg-[linear-gradient(180deg,#f7f2ec_0%,#f3ece4_48%,#fbf8f4_100%)] py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:gap-12">
            <div className="space-y-5 text-start">
              <span className="inline-flex w-fit border-b border-[#b89763] pb-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#846841]">
                {badge}
              </span>
              <h2 className="font-heading text-[2.2rem] font-semibold leading-[1.2] tracking-tight text-[#173126] md:text-[2.8rem]">
                {title}
              </h2>
              <p className="max-w-xl text-base leading-8 text-[#5f554d] md:text-lg">
                {content}
              </p>
              {renderCta(
                'inline-flex items-center gap-2 border-b border-[#173126] pb-1 text-sm font-semibold text-[#173126] transition-colors hover:text-[#8a6a3c] hover:border-[#8a6a3c]',
              )}
            </div>

            <div className="relative overflow-hidden border-s-4 border-[#d3b47f] bg-[#e8ddd0] p-4 shadow-[0_30px_70px_-54px_rgba(58,41,29,0.28)]">
              <img
                src={responsiveImage.src}
                srcSet={responsiveImage.srcSet}
                sizes={responsiveImage.sizes}
                alt={imageAlt}
                loading="lazy"
                className="h-[22rem] w-full object-cover md:h-[31rem]"
              />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative my-12 flex min-h-[500px] w-full items-center justify-center overflow-hidden md:my-20">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
        style={{ backgroundImage: `url(${optimizedBgUrl})` }}
        data-storefront-story-background
      />
      <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />

      <div className="container relative z-10 px-4 text-center">
        <div className="inline-block max-w-4xl rounded-[3rem] border border-white/30 bg-white/20 px-10 py-16 backdrop-blur-3xl shadow-[0_30px_100px_-50px_rgba(0,0,0,0.5)] md:py-24">
          <span className="mb-6 block text-xs font-bold uppercase tracking-[.3em] text-primary opacity-80">
            {badge}
          </span>
          <h2 className="mb-4 font-heading text-3xl font-extrabold leading-[1.1] tracking-tight text-white md:text-5xl lg:text-7xl">
            {title}
          </h2>
          <p className="mx-auto max-w-2xl text-lg font-medium leading-relaxed text-white/80 md:text-xl">
            {content}
          </p>
          <div className="mt-8 flex justify-center">
            <div className="h-[2px] w-12 rounded-full bg-primary/60" />
          </div>

          {renderCta(
            'group mx-auto mt-12 flex items-center gap-4 text-xs font-bold uppercase tracking-[.4em] text-white transition-colors hover:text-primary',
          )}
        </div>
      </div>

      <div className="absolute right-20 top-20 h-32 w-32 rounded-full bg-primary/30 opacity-20 blur-3xl" />
      <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-secondary/30 opacity-20 blur-[100px]" />
    </section>
  );
};

export default StoryParallax;
