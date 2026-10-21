import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { buildStorefrontPath } from '../utils/paths';

interface PromoStripProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    badge?: string;
    message?: string;
    saleLabel?: string;
    shippingLabel?: string;
    returnLabel?: string;
    ctaText?: string;
    ctaLink?: string;
    [key: string]: unknown;
  };
}

const isExternalHref = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);

const PromoStrip: React.FC<PromoStripProps> = ({ section, settings }) => {
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const isSoleaFemme = theme.id === 'solea-femme';
  const isWomenFashion = theme.id === 'women-fashion-eg';
  const isFakhama = theme.id === 'fakhama-elite';
  const isSmartBazaar = theme.id === 'smart-bazaar';
  const isKhemetLuxe = theme.id === 'khemet-luxe-eg' || theme.id === 'khemet-luxe-v2';
  const rawVariant = String(settings?.variant || section?.variant || '').trim().toLowerCase();
  const isBenefitRibbon = rawVariant === 'benefit-ribbon';
  const isSaleSignal = rawVariant === 'sale-signal';
  const isButcherProofMarquee = rawVariant === 'butcher-proof-marquee';
  const badge = settings?.['badge'] || 'عرض خاص';
  const message =
    (settings?.['message'] as string) ||
    'شحن سريع، عروض مختارة، وخيارات دفع مرنة لشراء أسرع.';
  const saleLabel = (settings?.['saleLabel'] as string) || 'خصومات يومية';
  const shippingLabel = (settings?.['shippingLabel'] as string) || 'شحن سريع';
  const returnLabel = (settings?.['returnLabel'] as string) || 'استبدال سهل';
  const ctaText = (settings?.['ctaText'] as string) || 'تسوقي الآن';
  const rawCtaLink = typeof settings?.['ctaLink'] === 'string' ? settings['ctaLink'].trim() : '';
  const ctaHref = rawCtaLink
    ? isExternalHref(rawCtaLink)
      ? rawCtaLink
      : buildStorefrontPath(
          location.pathname,
          rawCtaLink.startsWith('/') ? rawCtaLink : `/${rawCtaLink}`,
          location.search,
        )
    : '';
  const chips = [saleLabel, shippingLabel, returnLabel].filter(Boolean);

  if (isButcherProofMarquee) {
    return (
      <section className="relative overflow-hidden border-y border-[#37312c] bg-[#080706] text-[#f4ead8]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0_1px,transparent_1px_18px)]" />
        <div className="container relative z-10 px-4 py-5 md:px-6">
          <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
            <span className="inline-flex w-fit border border-[#8b6b3e] bg-[#15110f] px-3 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
              {badge}
            </span>
            <p className="max-w-4xl text-sm font-bold leading-7 text-[#d6cbbb] md:text-base">
              {message}
            </p>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {chips.map((chip, index) => (
                <span
                  key={`${chip}-${index}`}
                  className={`inline-flex border px-3 py-2 text-xs font-black ${
                    index === 0
                      ? 'border-[#8f1d2b] bg-[#5f1118] text-[#fff4dc]'
                      : 'border-[#37312c] bg-[#15110f] text-[#b7ab9c]'
                  }`}
                >
                  {chip}
                </span>
              ))}
              {ctaHref ? (
                isExternalHref(ctaHref) ? (
                  <a
                    href={ctaHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center border border-[#8b6b3e] bg-[#d7b674] px-4 py-2 text-xs font-black text-[#120d0b] transition-colors hover:bg-[#f0d18d]"
                  >
                    {ctaText}
                  </a>
                ) : (
                  <Link
                    to={ctaHref}
                    className="inline-flex items-center justify-center border border-[#8b6b3e] bg-[#d7b674] px-4 py-2 text-xs font-black text-[#120d0b] transition-colors hover:bg-[#f0d18d]"
                  >
                    {ctaText}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isSaleSignal) {
    return (
      <section className="w-full border-y border-[#efd7d2] bg-[linear-gradient(90deg,#fff8f5_0%,#fff0ea_52%,#fff9f6_100%)] py-3 md:py-4">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
              <span className="inline-flex w-fit rounded-full bg-[#4b2332] px-3 py-1 text-[10px] font-black tracking-[0.22em] text-white">
                {badge}
              </span>
              <p className="max-w-2xl text-sm font-medium leading-7 text-[#5f4750] lg:text-[15px]">
                {message}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {chips.map((chip, index) => (
                <span
                  key={`${chip}-${index}`}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                    index === 0
                      ? 'bg-[#4b2332] text-white'
                      : 'border border-[#eed9d4] bg-white text-[#7b5a57]'
                  }`}
                >
                  {index === 0 ? (
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white/70" />
                  ) : (
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                  )}
                  {chip}
                </span>
              ))}

              {ctaHref ? (
                isExternalHref(ctaHref) ? (
                  <a
                    href={ctaHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-[#e6c8c1] bg-white px-4 py-2 text-xs font-black text-[#4b2332] transition-all hover:-translate-y-0.5 hover:border-[#cf9f94]"
                  >
                    {ctaText}
                  </a>
                ) : (
                  <Link
                    to={ctaHref}
                    className="inline-flex items-center justify-center rounded-full border border-[#e6c8c1] bg-white px-4 py-2 text-xs font-black text-[#4b2332] transition-all hover:-translate-y-0.5 hover:border-[#cf9f94]"
                  >
                    {ctaText}
                  </Link>
                )
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isWomenFashion && isBenefitRibbon) {
    return (
      <section className="w-full py-3 md:py-4">
        <div className="container px-4 md:px-6">
          <div className="border-y border-[#ead9d6] bg-[linear-gradient(90deg,rgba(255,250,248,0.96)_0%,rgba(255,244,239,0.88)_52%,rgba(255,253,250,0.96)_100%)] px-1 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
                <span className="inline-flex w-fit rounded-full bg-[#3f2432] px-3 py-1 text-[10px] font-black tracking-[0.22em] text-white shadow-[0_16px_40px_-30px_rgba(63,36,50,0.55)]">
                  {badge}
                </span>
                <p className="max-w-2xl text-sm font-medium leading-7 text-[#5f4750] lg:text-[15px]">
                  {message}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {chips.map((chip, index) => (
                  <span
                    key={`${chip}-${index}`}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums ${
                      index === 0
                        ? 'bg-[#fdece5] text-[#a04d3f]'
                        : 'border border-[#ecd7d0] bg-white text-[#6c565a]'
                    }`}
                  >
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                    {chip}
                  </span>
                ))}

                {ctaHref ? (
                  isExternalHref(ctaHref) ? (
                    <a
                      href={ctaHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full border border-[#ecd7d0] bg-white px-4 py-2 text-xs font-black text-[#4c2d39] active:scale-[0.97] transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-[#dcaea5]"
                    >
                      {ctaText}
                    </a>
                  ) : (
                    <Link
                      to={ctaHref}
                      className="inline-flex items-center justify-center rounded-full border border-[#ecd7d0] bg-white px-4 py-2 text-xs font-black text-[#4c2d39] active:scale-[0.97] transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-[#dcaea5]"
                    >
                      {ctaText}
                    </Link>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`w-full border-y ${
        isBenefitRibbon
          ? 'border-[#ead9d8] bg-[linear-gradient(90deg,#fffaf8_0%,#fff3ef_48%,#fffaf8_100%)]'
          : isSoleaFemme
          ? 'border-primary/10 bg-[linear-gradient(90deg,hsl(var(--secondary)/0.92),hsl(var(--background)),hsl(var(--secondary)/0.92))]'
          : isSmartBazaar
            ? 'border-primary/10 bg-[linear-gradient(90deg,hsl(var(--background)),hsl(var(--secondary)/0.86),hsl(var(--background)))]'
          : isFakhama
            ? 'border-primary/20 bg-[linear-gradient(45deg,hsl(var(--primary)/0.03),hsl(var(--background)),hsl(var(--primary)/0.03))]'
            : 'border-border bg-secondary/65'
      }`}
    >
      <div className={`container px-4 md:px-6 ${isBenefitRibbon || isSoleaFemme || isFakhama || isSmartBazaar ? 'py-5' : 'py-3'}`}>
        <div
          className={`flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between ${
            isBenefitRibbon
              ? 'rounded-[1.8rem] border border-[#f0d7d2] bg-white/88 px-5 py-4 shadow-[0_24px_70px_-56px_rgba(107,33,49,0.16)] backdrop-blur'
              : isSoleaFemme
              ? 'rounded-[1.75rem] border border-white/65 bg-white/60 px-4 py-3 shadow-[0_20px_60px_-40px_hsl(var(--primary)/0.7)] backdrop-blur'
              : isSmartBazaar
                ? 'rounded-[1.75rem] border border-primary/10 bg-[linear-gradient(135deg,hsl(var(--foreground))_0%,hsl(var(--primary)/0.96)_42%,hsl(var(--primary))_100%)] px-5 py-4 shadow-[0_26px_90px_-58px_hsl(var(--primary)/0.85)]'
              : isFakhama
                ? 'rounded-none border-s-4 border-primary bg-background px-6 py-4 shadow-xl shadow-primary/5'
                : ''
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div
              className={`inline-flex w-fit items-center rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${
                isBenefitRibbon
                  ? 'bg-[#3f2432] text-white shadow-[0_16px_40px_-28px_rgba(63,36,50,0.55)]'
                  : isSoleaFemme
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/15'
                  : isSmartBazaar
                    ? 'bg-accent text-accent-foreground shadow-lg shadow-black/15'
                  : isFakhama
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary text-primary-foreground'
              }`}
            >
              {badge}
            </div>
            <p className={`text-sm font-medium ${
              isBenefitRibbon
                ? 'max-w-2xl font-heading text-[#4c2d39]'
                : isSoleaFemme || isFakhama
                ? 'max-w-2xl text-foreground font-heading'
                : isSmartBazaar
                  ? 'max-w-2xl text-white/92'
                  : 'text-foreground'
            }`}>
              {message}
            </p>
            <div className="flex flex-wrap gap-2.5">
              {chips.map((chip, index) => (
                <span
                  key={`${chip}-${index}`}
                  className={`inline-flex items-center px-3.5 py-1 text-xs font-bold tracking-tight ${
                    isBenefitRibbon
                      ? index === 0
                        ? 'rounded-full bg-[#fee9e2] text-[#8b3d33] shadow-sm'
                        : 'rounded-full bg-white text-[#6d4c4a] ring-1 ring-[#f0d7d2]'
                      : isSoleaFemme
                      ? index === 0
                        ? 'rounded-full bg-accent/90 text-accent-foreground shadow-sm'
                        : 'rounded-full bg-background/90 text-foreground ring-1 ring-primary/10 backdrop-blur'
                      : isSmartBazaar
                        ? index === 0
                          ? 'rounded-full bg-background text-foreground shadow-sm'
                          : 'rounded-full bg-white/10 text-white ring-1 ring-white/15 backdrop-blur'
                      : isFakhama
                        ? index === 0
                          ? 'rounded-none bg-accent text-accent-foreground shadow-md'
                          : 'rounded-none bg-primary/5 text-primary border border-primary/20'
                      : isKhemetLuxe
                        ? index === 0
                          ? 'rounded-full border border-[#c5a470]/50 bg-[#c5a470]/15 text-[#183f31] dark:text-[#f2d79b]'
                          : 'rounded-full border border-border/60 bg-background/80 text-foreground/80'
                        : index === 0
                          ? 'rounded-full bg-accent text-accent-foreground'
                          : 'rounded-full bg-background text-muted-foreground ring-1 ring-border'
                  }`}
                >
                  {isBenefitRibbon ? (
                    <span className="me-2 inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                  ) : isSoleaFemme ? (
                    <span className="me-2 inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                  ) : isFakhama ? (
                    <span className="me-2 inline-flex h-1 w-1 rounded-full bg-primary opacity-50" />
                  ) : isKhemetLuxe ? (
                    <span className="me-2 inline-flex h-1 w-1 rounded-full bg-[#c5a470]" />
                  ) : null}
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {ctaHref ? (
            isExternalHref(ctaHref) ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center justify-center px-5 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all active:scale-[0.97] ${
                  isBenefitRibbon
                    ? 'rounded-full border border-[#f0d7d2] bg-[#3f2432] text-white shadow-[0_18px_48px_-28px_rgba(63,36,50,0.55)] hover:bg-[#5a3247]'
                    : isSoleaFemme
                    ? 'rounded-full border border-primary/15 bg-background/92 text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                    : isSmartBazaar
                      ? 'rounded-full border border-white/15 bg-white/12 text-white backdrop-blur hover:bg-accent hover:text-accent-foreground'
                    : isFakhama
                      ? 'rounded-none bg-foreground text-background hover:bg-primary hover:text-primary-foreground'
                    : isKhemetLuxe
                      ? 'rounded-full border border-[#183f31]/30 bg-[#183f31] text-[#fff8ee] hover:bg-[#112d23] shadow-xs'
                      : 'rounded-full border border-primary/20 bg-background text-foreground hover:bg-primary hover:text-primary-foreground'
                }`}
              >
                {ctaText}
              </a>
            ) : (
              <Link
                to={ctaHref}
                className={`inline-flex items-center justify-center px-5 py-2 text-xs font-black uppercase tracking-[0.15em] transition-all active:scale-[0.97] ${
                  isBenefitRibbon
                    ? 'rounded-full border border-[#f0d7d2] bg-[#3f2432] text-white shadow-[0_18px_48px_-28px_rgba(63,36,50,0.55)] hover:bg-[#5a3247]'
                    : isSoleaFemme
                    ? 'rounded-full border border-primary/15 bg-background/92 text-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                    : isSmartBazaar
                      ? 'rounded-full border border-white/15 bg-white/12 text-white backdrop-blur hover:bg-accent hover:text-accent-foreground'
                    : isFakhama
                      ? 'rounded-none bg-foreground text-background hover:bg-primary hover:text-primary-foreground'
                    : isKhemetLuxe
                      ? 'rounded-full border border-[#183f31]/30 bg-[#183f31] text-[#fff8ee] hover:bg-[#112d23] shadow-xs'
                      : 'rounded-full border border-primary/20 bg-background text-foreground hover:bg-primary hover:text-primary-foreground'
                }`}
              >
                {ctaText}
              </Link>
            )
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default PromoStrip;
