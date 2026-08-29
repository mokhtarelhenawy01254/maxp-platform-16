import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';
import { buildOptimizedStorefrontImageUrl } from '../utils/productImages';

interface CountdownProps {
  section?: { variant?: string };
  settings?: {
    heading?: string;
    description?: string;
    image?: string;
    ctaText?: string;
    ctaLink?: string;
    endAt?: string | number;
    counterBg?: string;
    counterText?: string;
    layout?: string;
  };
}

const COUNTDOWN_VARIANTS = new Set(['standard', 'layered', 'inline']);

const normalizeVariant = (value: unknown): string => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return COUNTDOWN_VARIANTS.has(normalizedValue) ? normalizedValue : 'standard';
};

type TimeParts = { days: number; hours: number; minutes: number; seconds: number };

const computeRemaining = (endAt: string | number | undefined): TimeParts => {
  if (typeof endAt === 'number') {
    const totalSeconds = Math.max(0, Math.floor(endAt / 1000));
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }

  if (typeof endAt === 'string' && endAt.trim()) {
    const endTime = Date.parse(endAt);
    const delta = !Number.isNaN(endTime)
      ? Math.max(0, Math.floor((endTime - Date.now()) / 1000))
      : 0;
    return {
      days: Math.floor(delta / 86400),
      hours: Math.floor((delta % 86400) / 3600),
      minutes: Math.floor((delta % 3600) / 60),
      seconds: delta % 60,
    };
  }

  return { days: 6, hours: 23, minutes: 58, seconds: 29 };
};

const pad = (value: number): string => String(value).padStart(2, '0');

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const Countdown: React.FC<CountdownProps> = ({ section, settings }) => {
  const location = useLocation();
  const variant = normalizeVariant(section?.variant);
  const heading = settings?.heading || 'New Season Layers';
  const description =
    settings?.description ||
    'Lightweight jackets and versatile layers made for effortless everyday styling.';
  const ctaText = settings?.ctaText || 'Shop Jacket';
  const ctaLink = settings?.ctaLink || '/products/classic-varsity-jacket';
  const counterBg = settings?.counterBg || '#4c3636';
  const counterText = settings?.counterText || '#ffffff';

  const resolvedEndAt = settings?.endAt ?? Date.now() + (6 * 24 * 3600 + 23 * 3600 + 58 * 60 + 29) * 1000;
  const [now, setNow] = useState(() => Date.now());

  const target = useMemo(() => computeRemaining(resolvedEndAt), []);
  const [parts, setParts] = useState<TimeParts>(() =>
    computeRemaining(typeof resolvedEndAt === 'number' ? resolvedEndAt - Date.now() : resolvedEndAt),
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const remaining = computeRemaining(typeof resolvedEndAt === 'number' ? resolvedEndAt - now : resolvedEndAt);
    setParts(remaining);
  }, [now, resolvedEndAt]);

  const image = settings?.image;
  const bgUrl = image ? buildOptimizedStorefrontImageUrl(image, { width: 1920 }) : '';

  const counterCells = [
    { label: 'Days', value: pad(parts.days) },
    { label: 'Hours', value: pad(parts.hours) },
    { label: 'Minutes', value: pad(parts.minutes) },
    { label: 'Seconds', value: pad(parts.seconds) },
  ];

  const ctaLinkResolved = buildStorefrontPath(
    location.pathname,
    ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`,
    location.search,
  );

  const renderCounter = () => (
    <div className="flex gap-3">
      {counterCells.map((cell) => (
        <div
          key={cell.label}
          className="flex min-w-[4.4rem] flex-col items-center rounded-lg px-4 py-3"
          style={{ background: counterBg, color: counterText }}
        >
          <span className="font-heading text-2xl font-semibold tabular-nums md:text-3xl">{cell.value}</span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.18em] opacity-80">{cell.label}</span>
        </div>
      ))}
    </div>
  );

  return (
    <section className="w-full bg-white">
      <style>{`
        .sf-countdown-block { position: relative; overflow: hidden; }
        .sf-countdown-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
        .sf-countdown-shade { position: absolute; inset: 0; z-index: 1; background: linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,.35)); }
        .sf-countdown-content { position: relative; z-index: 2; }
      `}</style>
      <div className={`sf-countdown-block py-12 md:py-16 ${variant === 'inline' ? 'px-5' : ''}`}>
        {bgUrl && (
          <>
            <img src={bgUrl} alt="" className="sf-countdown-bg" loading="lazy" />
            <div className="sf-countdown-shade" />
          </>
        )}
        <div className="sf-countdown-content container mx-auto max-w-[176rem] px-5 md:px-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl space-y-3 text-white">
              {variant === 'layered' && (
                <span className="inline-block rounded-md bg-white/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] backdrop-blur">
                  Countdown
                </span>
              )}
              <p className="font-heading text-3xl font-semibold md:text-4xl">{heading}</p>
              {description && <p className="text-sm leading-6 text-white/85 md:text-base">{description}</p>}
            </div>
            <div className="flex flex-col items-start gap-4 md:items-end">
              {renderCounter()}
              <Link
                to={isExternalHref(ctaLink) ? ctaLink : ctaLinkResolved}
                className="inline-flex rounded-lg bg-white px-7 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#171717] transition-colors hover:bg-[#b06d31] hover:text-white"
              >
                {ctaText}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Countdown;
