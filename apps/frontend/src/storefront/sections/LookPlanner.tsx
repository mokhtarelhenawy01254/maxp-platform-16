import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface LookPlannerLook {
  title?: string;
  image?: string;
  price?: string;
  pieces?: string[];
  occasions?: string[];
  moods?: string[];
  link?: string;
}

interface LookPlannerSettings {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  occasions?: Array<{ label?: string }>;
  moods?: Array<{ label?: string }>;
  looks?: LookPlannerLook[];
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

const toList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  if (typeof value === 'string') return value.split('|').map((s) => s.trim()).filter(Boolean);
  return [];
};

const LookPlanner: React.FC<{
  section?: { variant?: string; [key: string]: unknown };
  settings?: LookPlannerSettings;
}> = ({ section, settings }) => {
  const location = useLocation();
  const isChips = section?.variant?.trim().toLowerCase() === 'chips';
  const title = settings?.title || 'ابنِ لوكك';
  const subtitle = settings?.subtitle || '';
  const ctaText = settings?.ctaText || 'كل اللوكات';
  const ctaHref = toHref(location.pathname, location.search, settings?.ctaLink);

  const occasions = (settings?.occasions || []).map((o) => o?.label).filter(Boolean) as string[];
  const moods = (settings?.moods || []).map((m) => m?.label).filter(Boolean) as string[];
  const looks = (settings?.looks || []).filter((l) => l && (l.image || l.title));

  const [occasion, setOccasion] = useState<string>(occasions[0] || '');
  const [mood, setMood] = useState<string>(moods[0] || '');

  const matches = useMemo(() => {
    return looks.filter((look) => {
      const lo = toList(look.occasions as unknown);
      const lm = toList(look.moods as unknown);
      const matchOccasion = occasion ? lo.includes(occasion) : true;
      const matchMood = mood ? lm.includes(mood) : true;
      return matchOccasion && matchMood;
    });
  }, [looks, occasion, mood]);

  const shown = matches.length > 0 ? matches : looks;

  return (
    <section className="relative w-full overflow-hidden py-10 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="mb-8 max-w-2xl space-y-3">
          {subtitle ? (
            <p className="inline-flex text-[11px] font-black uppercase tracking-[0.24em] text-primary">{subtitle}</p>
          ) : null}
          <h2 className="font-heading text-[1.9rem] font-black leading-tight tracking-tight text-foreground md:text-4xl">
            {title}
          </h2>
        </div>

        {/* Occasion + mood selector */}
        <div className="mb-8 space-y-4">
          {occasions.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">المناسبة:</span>
              {occasions.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setOccasion(label)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    occasion === label
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-primary/15 bg-card text-foreground hover:bg-secondary/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {moods.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">المزاج:</span>
              {moods.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMood(label)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    mood === label
                      ? 'bg-accent text-accent-foreground'
                      : 'border border-primary/15 bg-card text-foreground hover:bg-secondary/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Result cards */}
        <div className={isChips ? 'grid grid-cols-2 gap-3 md:grid-cols-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
          {shown.slice(0, isChips ? 8 : 6).map((look, idx) => {
            const href = toHref(location.pathname, location.search, look.link) || '#';
            return (
              <Link
                key={idx}
                to={href}
                className={`group relative block overflow-hidden rounded-[1.35rem] border border-primary/10 bg-secondary ${
                  isChips ? 'min-h-[12rem]' : 'min-h-[17rem]'
                }`}
              >
                {look.image ? (
                  <img src={look.image} alt={look.title || ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                ) : (
                  <div className="absolute inset-0 bg-secondary" />
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,28,24,0.04)_0%,rgba(10,28,24,0.7)_100%)]" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
                  {look.price ? (
                    <span className="inline-flex w-fit rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-black tracking-[0.12em] text-accent-foreground">
                      {look.price}
                    </span>
                  ) : null}
                  <h3 className="font-heading text-lg font-black leading-snug text-white">{look.title}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {toList(look.pieces as unknown).slice(0, 3).map((p, pidx) => (
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

        {ctaHref ? (
          <div className="mt-8 text-center">
            <Link to={ctaHref} className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-6 py-3 text-sm font-bold text-foreground transition-colors hover:bg-secondary/70">
              {ctaText}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default LookPlanner;
