import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import { buildOptimizedStorefrontImageUrl } from '../utils/productImages';

interface BackgroundVideoProps {
  section?: { variant?: string };
  settings?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    video?: string;
    poster?: string;
    opacity?: number | string;
    ctaText?: string;
    ctaLink?: string;
    bars?: string[];
  };
}

const VIDEO_VARIANTS = new Set(['standard', 'full-bleed', 'banners']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return VIDEO_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

const DEFAULT_BARS = ['30%', '45%', '60%'];

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const BackgroundVideo: React.FC<BackgroundVideoProps> = ({ section, settings }) => {
  const location = useLocation();
  const variant = normalizeVariant(section?.variant);
  const badge = settings?.badge || 'Discover the Story';
  const title = settings?.title || 'Discover the Story Behind Every Collection';
  const subtitle = settings?.subtitle || '';
  const poster = settings?.poster;
  const opacity = Number(settings?.opacity) || 20;
  const ctaText = settings?.ctaText || 'Shop Now';
  const ctaLink = settings?.ctaLink || '/shop';
  const bars = Array.isArray(settings?.bars) && settings.bars.length > 0 ? settings.bars : DEFAULT_BARS;
  const posterUrl = poster ? buildOptimizedStorefrontImageUrl(poster, { width: 1600 }) : '';

  const ctaResolved = buildStorefrontPath(
    location.pathname,
    ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`,
    location.search,
  );

  return (
    <section className="w-full bg-[#e3e4ef]">
      <style>{`
        .sf-video-bg { position: relative; overflow: hidden; }
        .sf-video-media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
        .sf-video-shade { position: absolute; inset: 0; z-index: 1; background: radial-gradient(rgba(27,68,114,.55), rgba(0,0,0,.55) 70%); }
        .sf-video-content { position: relative; z-index: 2; }
        .sf-animated-bar { animation: sfBarPulse 2.6s ease-in-out infinite; transform-origin: bottom; }
        @keyframes sfBarPulse { 0%, 100% { transform: scaleY(.6); opacity: .7; } 50% { transform: scaleY(1); opacity: 1; } }
      `}</style>
      <div className="sf-video-bg">
        {settings?.video ? (
          <video className="sf-video-media" src={settings.video} poster={poster} autoPlay muted loop playsInline />
        ) : posterUrl ? (
          <>
            <img src={posterUrl} alt="" className="sf-video-media" loading="lazy" />
            <div className="sf-video-shade" style={{ opacity: opacity / 100 }} />
          </>
        ) : (
          <div className="sf-video-media bg-[linear-gradient(120deg,#e3e4ef,#f8ece7)]" />
        )}

        {variant === 'banners' ? (
          <div className="sf-video-content container mx-auto flex min-h-[26rem] max-w-[176rem] items-center px-5 py-16 md:px-10">
            <div className="flex flex-1 flex-col items-center gap-8">
              {bars.map((height, index) => (
                <div key={`bar-${index}`} className="flex h-40 items-end gap-4">
                  <span className="sf-animated-bar w-14 rounded-t-xl bg-white/90" style={{ height }} />
                  <span className="sf-animated-bar w-16 rounded-t-xl bg-white/75" style={{ height, animationDelay: `${index * 0.3}s` }} />
                </div>
              ))}
            </div>
            <div className="max-w-xl space-y-4">
              <span className="inline-block font-heading text-4xl font-bold tracking-tight text-[#1b4472]">{title}</span>
              {subtitle && <p className="text-lg leading-8 text-[#1b4472]/85">{subtitle}</p>}
              <Link
                to={isExternalHref(ctaLink) ? ctaLink : ctaResolved}
                className="inline-flex rounded-lg bg-[#1b4472] px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#0f2c4d]"
              >
                {ctaText}
              </Link>
            </div>
          </div>
        ) : (
          <div className="sf-video-content container mx-auto flex min-h-[24rem] max-w-[176rem] flex-col items-center justify-center px-5 py-20 text-center md:px-10">
            <span className="mb-4 inline-block rounded-full border border-white/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/90">
              {badge}
            </span>
            <h2 className="max-w-3xl font-heading text-3xl font-bold leading-tight text-white md:text-5xl">{title}</h2>
            {subtitle && <p className="mt-4 max-w-2xl text-base leading-8 text-white/85 md:text-lg">{subtitle}</p>}
            <Link
              to={isExternalHref(ctaLink) ? ctaLink : ctaResolved}
              className="mt-8 inline-flex rounded-lg bg-white px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#171717] transition-colors hover:bg-[#176060] hover:text-white"
            >
              {ctaText}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default BackgroundVideo;
