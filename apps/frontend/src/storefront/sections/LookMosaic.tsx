import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface LookMosaicItem {
  title?: string;
  subtitle?: string;
  image?: string;
  priceLabel?: string;
  pieces?: string[];
  link?: string;
}

interface LookMosaicSettings {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  looks?: LookMosaicItem[];
  [key: string]: unknown;
}

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const toHref = (pathname: string, search: string, raw?: string): string => {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (isExternalHref(trimmed)) return trimmed;
  return buildStorefrontPath(pathname, trimmed.startsWith('/') ? trimmed : `/${trimmed}`, search);
};

const toPieces = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  if (typeof value === 'string') return value.split('|').map((s) => s.trim()).filter(Boolean);
  return [];
};

const LookMosaic: React.FC<{
  section?: { variant?: string; [key: string]: unknown };
  settings?: LookMosaicSettings;
}> = ({ settings }) => {
  const location = useLocation();
  const title = settings?.title || 'لوكات اليوم';
  const subtitle = settings?.subtitle || '';
  const ctaText = settings?.ctaText || 'شوفي كل اللوكات';
  const ctaHref = toHref(location.pathname, location.search, settings?.ctaLink);
  const looks = (settings?.looks || []).filter((l) => l && (l.image || l.title)).slice(0, 6);

  if (looks.length === 0) return null;

  const lead = looks[0];
  const rest = looks.slice(1);

  return (
    <section className="relative w-full overflow-hidden py-10 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            {subtitle ? (
              <p className="inline-flex text-[11px] font-black uppercase tracking-[0.24em] text-primary">{subtitle}</p>
            ) : null}
            <h2 className="font-heading text-[1.9rem] font-black leading-tight tracking-tight text-foreground md:text-4xl">
              {title}
            </h2>
          </div>
          {ctaHref ? (
            <Link
              to={ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {ctaText}
            </Link>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {/* Lead look — spans 7 cols on desktop */}
          <Link
            to={toHref(location.pathname, location.search, lead.link) || '#'}
            className="group relative md:col-span-7 block min-h-[24rem] overflow-hidden rounded-[1.5rem] border border-primary/10 bg-secondary shadow-[0_28px_70px_-50px_hsl(var(--primary)/0.55)]"
          >
            {lead.image ? (
              <img src={lead.image} alt={lead.title || ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
            ) : (
              <div className="absolute inset-0 bg-secondary" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,28,24,0.02)_0%,rgba(10,28,24,0.72)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 md:p-8">
              {lead.priceLabel ? (
                <span className="inline-flex w-fit rounded-full bg-accent px-3 py-1 text-[11px] font-black tracking-[0.14em] text-accent-foreground">
                  {lead.priceLabel}
                </span>
              ) : null}
              <h3 className="font-heading text-2xl font-black leading-tight text-white md:text-3xl">{lead.title}</h3>
              {lead.subtitle ? <p className="max-w-md text-sm leading-6 text-white/82">{lead.subtitle}</p> : null}
              <div className="mt-1 flex flex-wrap gap-2">
                {toPieces(lead.pieces).map((p, idx) => (
                  <span key={idx} className="inline-flex rounded-full border border-white/25 bg-white/14 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </Link>

          {/* Rest — stacked 5 cols on desktop */}
          <div className="grid grid-cols-2 gap-4 md:col-span-5">
            {rest.map((look, idx) => {
              const href = toHref(location.pathname, location.search, look.link) || '#';
              return (
                <Link
                  key={idx}
                  to={href}
                  className={`group relative block overflow-hidden rounded-[1.25rem] border border-primary/10 bg-secondary ${
                    idx === 0 ? 'col-span-2 min-h-[11rem]' : 'min-h-[9rem]'
                  }`}
                >
                  {look.image ? (
                    <img src={look.image} alt={look.title || ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                  ) : (
                    <div className="absolute inset-0 bg-secondary" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,28,24,0.05)_0%,rgba(10,28,24,0.68)_100%)]" />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
                    {look.priceLabel ? (
                      <span className="inline-flex w-fit rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-black tracking-[0.12em] text-accent-foreground">
                        {look.priceLabel}
                      </span>
                    ) : null}
                    <h4 className="font-heading text-base font-black leading-snug text-white">{look.title}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {toPieces(look.pieces).slice(0, 3).map((p, pidx) => (
                        <span key={pidx} className="inline-flex rounded-full border border-white/20 bg-white/12 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                          {p}
                        </span>
                      ))}
                    </div>
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

export default LookMosaic;
