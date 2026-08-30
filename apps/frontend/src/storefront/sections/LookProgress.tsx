import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buildStorefrontPath } from '../utils/paths';

interface LookProgressPiece {
  title?: string;
  image?: string;
  price?: string;
}

interface LookProgressTier {
  threshold?: number | string;
  label?: string;
  discount?: string;
}

interface LookProgressSettings {
  title?: string;
  subtitle?: string;
  progressHint?: string;
  ctaText?: string;
  ctaLink?: string;
  pieces?: LookProgressPiece[];
  tiers?: LookProgressTier[];
  [key: string]: unknown;
}

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const LookProgress: React.FC<{
  section?: { variant?: string; [key: string]: unknown };
  settings?: LookProgressSettings;
}> = ({ section, settings }) => {
  const location = useLocation();
  const isCompact = section?.variant?.trim().toLowerCase() === 'compact';
  const title = settings?.title || 'كمّلي اللوك ووفّري';
  const subtitle = settings?.subtitle || '';
  const progressHint = settings?.progressHint || 'علّمي على القطع اللي عايزاها وشوفي الخصم يكبر';
  const ctaText = settings?.ctaText || 'أضيفي اللوك كامل';
  const ctaHref = (() => {
    const raw = settings?.ctaLink;
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (isExternalHref(trimmed)) return trimmed;
    return buildStorefrontPath(location.pathname, trimmed.startsWith('/') ? trimmed : `/${trimmed}`, location.search);
  })();

  const pieces = (settings?.pieces || []).filter((p) => p && p.title);
  const tiers = (settings?.tiers || []).filter((t) => t && t.label);

  const [added, setAdded] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setAdded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const progress = pieces.length > 0 ? Math.round((added.size / pieces.length) * 100) : 0;
  const nextTier = useMemo(() => {
    return tiers.find((t) => {
      const n = Number(t.threshold ?? 0);
      return added.size < n;
    });
  }, [tiers, added]);

  if (pieces.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden rounded-[1.6rem] border border-primary/10 bg-card py-8 md:py-12">
      <div className="px-5 md:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl space-y-2">
            <h2 className="font-heading text-[1.6rem] font-black leading-tight tracking-tight text-foreground md:text-3xl">
              {title}
            </h2>
            {subtitle ? <p className="text-sm leading-7 text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-primary">{added.size} / {pieces.length}</span>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progress hint */}
        <p className="mb-5 text-sm font-bold text-foreground/80">{progressHint}</p>

        {/* Pieces */}
        <div className={isCompact ? 'grid grid-cols-2 gap-3 md:grid-cols-4' : 'grid gap-3 sm:grid-cols-2 md:grid-cols-4'}>
          {pieces.map((piece, idx) => {
            const active = added.has(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggle(idx)}
                className={`group relative flex flex-col overflow-hidden rounded-[1.1rem] border text-start transition-all ${
                  active ? 'border-primary bg-primary/6' : 'border-primary/12 bg-background hover:border-primary/30'
                }`}
              >
                <div className={`relative ${isCompact ? 'h-24' : 'h-32'} overflow-hidden`}>
                  {piece.image ? (
                    <img src={piece.image} alt={piece.title || ''} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-secondary" />
                  )}
                  <span
                    className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black transition-colors ${
                      active ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-foreground/70 backdrop-blur-sm'
                    }`}
                  >
                    {active ? '✓' : idx + 1}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <span className="text-sm font-bold leading-snug text-foreground">{piece.title}</span>
                  {piece.price ? <span className="text-xs font-black text-accent">{piece.price}</span> : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Tiers */}
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {tiers.map((tier, idx) => {
            const n = Number(tier.threshold ?? 0);
            const unlocked = added.size >= n;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between rounded-[1rem] border px-4 py-3 transition-all ${
                  unlocked ? 'border-accent bg-accent/10' : 'border-primary/12 bg-background'
                }`}
              >
                <span className="text-sm font-bold text-foreground">{tier.label}</span>
                <span className={`text-sm font-black ${unlocked ? 'text-accent' : 'text-muted-foreground'}`}>
                  {tier.discount || `خصم ${tier.threshold}`}
                </span>
              </div>
            );
          })}
        </div>

        {nextTier ? (
          <p className="mt-4 text-sm font-bold text-primary">
            ضيفي {Math.max(0, Number(nextTier.threshold ?? 0) - added.size)} قطع تانية عشان تاخدي «{nextTier.discount || nextTier.label}»
          </p>
        ) : null}

        {ctaHref ? (
          <div className="mt-6">
            <Link
              to={ctaHref}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-black text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              {ctaText}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default LookProgress;
