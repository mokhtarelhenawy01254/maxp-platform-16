import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StorefrontProductImage from '../../components/StorefrontProductImage';
import { renderHeroAction } from './heroActions';
import { HeroSlide, HeroVariantProps } from './heroTypes';

export const CenteredHero: React.FC<HeroVariantProps> = (props) => (
  <section className="py-12 md:py-16 text-center bg-background">
    <div className="container max-w-4xl space-y-5 md:space-y-7">
      <h1 className="text-3xl md:text-5xl font-black tracking-tight">{props.title}</h1>
      <p className="text-base md:text-lg text-muted-foreground">{props.subtitle}</p>
      {renderHeroAction(
        props.primaryHref,
        props.ctaText || 'تسوّق الآن',
        'bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold text-base inline-block',
      )}
    </div>
  </section>
);

export const GracefulBannerHero: React.FC<HeroVariantProps> = (props) => (
  <section className="relative flex h-[340px] items-center justify-center overflow-hidden bg-[#1a1a1a] text-white md:h-[420px]">
    {props.backgroundImage ? (
      <img
        src={props.backgroundImage}
        alt=""
        loading="eager"
        fetchpriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
    ) : null}
    <div className="absolute inset-0 bg-black/30" />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.35))]" />
    <div className="relative z-10 px-6 text-center">
      <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-[3.4rem]">
        {props.title}
      </h1>
      {props.subtitle ? (
        <p className="mt-4 text-sm text-white/85 md:text-base">{props.subtitle}</p>
      ) : null}
    </div>
  </section>
);

export const LegacyImageSliderHero: React.FC<HeroVariantProps> = (props) => {
  const preparedSlides = (
    props.slides?.filter((slide) => Boolean(slide.image?.trim())) || []
  ).length
    ? (props.slides?.filter((slide) =>
        Boolean(slide.image?.trim()),
      ) as HeroSlide[])
    : [
        {
          image: props.backgroundImage,
          alt: props.title,
          title: props.title,
          subtitle: props.subtitle,
          eyebrow: props.eyebrow,
          ctaText: props.ctaText,
          ctaLink: props.primaryHref,
          secondaryCtaText: props.secondaryCtaText,
          secondaryCtaLink: props.secondaryHref,
        },
      ].filter((slide) => Boolean(slide.image?.trim()));
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [preparedSlides.length]);

  useEffect(() => {
    if (preparedSlides.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % preparedSlides.length);
    }, 5200);

    return () => window.clearInterval(intervalId);
  }, [preparedSlides.length]);

  if (!preparedSlides.length) {
    return null;
  }

  const activeSlide = preparedSlides[activeIndex] || preparedSlides[0];
  const hasOverlayContent = Boolean(
    activeSlide?.eyebrow?.trim() ||
    activeSlide?.title?.trim() ||
    activeSlide?.subtitle?.trim() ||
    activeSlide?.ctaText?.trim() ||
    activeSlide?.secondaryCtaText?.trim(),
  );
  const shellHeight = props.compact
    ? 'h-[12rem] sm:h-[14rem] lg:h-[17rem]'
    : 'h-[18rem] sm:h-[24rem] lg:h-[33rem]';

  return (
    <section
      className={`w-full bg-white ${props.compact ? 'py-4 md:py-5' : 'py-0'}`}
    >
      <div className={props.compact ? 'container px-4 md:px-6' : 'w-full'}>
        <div className={`relative overflow-hidden bg-[#f4f4f4] ${shellHeight}`}>
          {preparedSlides.map((slide, index) => (
            <div
              key={`${slide.image}-${index}`}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.image}
                alt={
                  slide.alt || slide.title || props.title || 'Storefront banner'
                }
                className="h-full w-full object-cover"
              />
            </div>
          ))}

          {hasOverlayContent ? (
            <>
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.54)_0%,rgba(0,0,0,0.14)_38%,rgba(0,0,0,0)_68%)]" />
              <div className="absolute inset-0 flex items-end">
                <div className="w-full px-5 py-6 sm:max-w-[32rem] sm:px-8 sm:py-8 lg:px-12 lg:py-12">
                  {activeSlide?.eyebrow ? (
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/82">
                      {activeSlide.eyebrow}
                    </p>
                  ) : null}
                  {activeSlide?.title ? (
                    <h1 className="mt-3 font-heading text-[2rem] font-black uppercase leading-[0.94] tracking-[0.04em] text-white sm:text-[2.6rem] lg:text-[3.6rem]">
                      {activeSlide.title}
                    </h1>
                  ) : null}
                  {activeSlide?.subtitle ? (
                    <p className="mt-3 max-w-xl text-sm leading-7 text-white/82 sm:text-base">
                      {activeSlide.subtitle}
                    </p>
                  ) : null}
                  {activeSlide?.ctaText || activeSlide?.secondaryCtaText ? (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {renderHeroAction(
                        activeSlide?.ctaLink,
                        activeSlide?.ctaText,
                        'inline-flex min-h-[44px] items-center justify-center bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#f0f0f0]',
                      )}
                      {renderHeroAction(
                        activeSlide?.secondaryCtaLink,
                        activeSlide?.secondaryCtaText,
                        'inline-flex min-h-[44px] items-center justify-center border border-white/58 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/12',
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {preparedSlides.length > 1 ? (
            <>
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
                {preparedSlides.map((slide, index) => (
                  <button
                    key={`${slide.image}-dot-${index}`}
                    type="button"
                    aria-label={`Go to slide ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      index === activeIndex
                        ? 'w-7 bg-white'
                        : 'bg-white/52 hover:bg-white/76'
                    }`}
                  />
                ))}
              </div>
              {!props.compact ? (
                <>
                  <button
                    type="button"
                    aria-label="Previous slide"
                    onClick={() =>
                      setActiveIndex(
                        (current) =>
                          (current - 1 + preparedSlides.length) %
                          preparedSlides.length,
                      )
                    }
                    className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-black/24 text-white backdrop-blur transition-colors hover:bg-black/42 md:flex"
                  >
                    <span aria-hidden="true">‹</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Next slide"
                    onClick={() =>
                      setActiveIndex(
                        (current) => (current + 1) % preparedSlides.length,
                      )
                    }
                    className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-black/24 text-white backdrop-blur transition-colors hover:bg-black/42 md:flex"
                  >
                    <span aria-hidden="true">›</span>
                  </button>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export const RetailCommandHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.panel.image || props.backgroundImage;
  return (
    <section className="bg-[#f4edd7] py-20">
      <div className="container grid lg:grid-cols-2 items-center gap-12">
        <div className="space-y-8">
          <span className="bg-[#ffd400] text-black px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest">
            PC HUB
          </span>
          <h1 className="text-6xl font-black text-[#1f242c]">{props.title}</h1>
          <p className="text-xl text-[#3f4754]">{props.subtitle}</p>
          <div className="flex gap-4">
            <Link
              to={props.primaryHref}
              className="bg-[#1f242c] text-[#fff7df] px-10 py-4 rounded-full font-black uppercase tracking-wider"
            >
              {props.ctaText}
            </Link>
          </div>
        </div>
        <div className="relative">
          {heroImage && (
            <img src={heroImage} className="rounded-[2rem] shadow-2xl" alt="" />
          )}
        </div>
      </div>
    </section>
  );
};

export const RetailDirectBannerHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const quickTags = (props.highlights || []).slice(0, 3);

  return (
    <section className="bg-background py-4 md:py-6">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden rounded-[1rem] border-2 border-[#111111] bg-[#f2a324] shadow-none">
          <div className="grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="flex flex-col justify-between gap-4 px-4 py-4 text-right text-[#111111] sm:px-5 sm:py-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="inline-flex rounded-full border border-[#111111] bg-[#fff4db] px-3 py-1 text-[10px] font-black tracking-[0.14em] text-[#111111]">
                    {props.eyebrow || 'ستايل ستور'}
                  </span>
                  {props.panel.metricValue ? (
                    <span className="inline-flex rounded-full border border-[#111111] bg-white px-3 py-1 text-[10px] font-black text-[#111111]">
                      {props.panel.metricValue}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h1 className="max-w-[24rem] font-heading text-[1.7rem] font-black leading-[1.02] tracking-tight sm:text-[2.35rem]">
                    {props.title}
                  </h1>
                  <p className="max-w-[24rem] text-sm leading-6 text-[#111111]/80">
                    {props.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2.5">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  'inline-flex items-center justify-center rounded-[0.8rem] border-2 border-[#111111] bg-[#111111] px-4 py-2.5 text-sm font-black text-white',
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  'inline-flex items-center justify-center rounded-[0.8rem] border-2 border-[#111111] bg-white px-4 py-2.5 text-sm font-black text-[#111111]',
                )}
              </div>
            </div>

            <div className="relative min-h-[14rem] border-t-2 border-[#111111] bg-[#fff7e6] sm:min-h-[18rem] sm:border-e-2 sm:border-t-0">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={props.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#111111] bg-[#fff4d8] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#111111]" />
              <span className="h-2.5 w-2.5 rounded-full border border-[#111111]/35 bg-white/60" />
              <span className="h-2.5 w-2.5 rounded-full border border-[#111111]/35 bg-white/60" />
            </div>

            {quickTags.length ? (
              <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] font-black text-[#111111]">
                {quickTags.map((item) => (
                  <span
                    key={`${item.label}-${item.value}`}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span className="text-[#7b4e00]">{item.label}</span>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export const SpeedBannerHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const highlights = (props.highlights || []).slice(0, 3);

  return (
    <section className="bg-[hsl(var(--background))] py-6 md:py-10">
      <div className="container px-4 md:px-6">
        <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_24px_54px_-32px_rgba(217,93,31,0.22)]">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]" />
          
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] items-stretch">
            <div className="relative z-10 flex flex-col justify-center p-7 md:p-10 lg:p-14 text-right">
              {props.eyebrow && (
                <span className="mb-4 inline-flex w-fit self-end rounded-full bg-[hsl(var(--primary)/0.08)] px-4 py-1.5 text-[10px] font-black tracking-wide text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary)/0.15)]">
                  {props.eyebrow}
                </span>
              )}
              
              <h1 className="font-heading text-[2.4rem] font-black leading-[1.08] tracking-tight text-[hsl(var(--foreground))] sm:text-[3.2rem] md:text-[3.8rem] lg:text-[4.2rem]">
                {props.title}
              </h1>
              
              <p className="mt-6 max-w-[32rem] self-end text-sm leading-7 text-[hsl(var(--muted-foreground))] md:text-base">
                {props.subtitle}
              </p>

              <div className="mt-8 flex flex-wrap justify-end gap-3.5">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  'inline-flex min-h-[48px] items-center justify-center rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-black text-[hsl(var(--primary-foreground))] shadow-[0_18px_40px_-14px_rgba(217,93,31,0.46)] transition-all hover:scale-[1.02] active:scale-[0.98]',
                )}
                {renderHeroAction(
                  props.secondaryHref,
                  props.secondaryCtaText,
                  'inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-[hsl(var(--border))] bg-[hsl(var(--background))] px-8 py-3 text-sm font-black text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--secondary))] active:scale-[0.98]',
                )}
              </div>

              {highlights.length > 0 && (
                <div className="mt-10 flex flex-wrap justify-end gap-x-6 gap-y-3">
                  {highlights.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        <span className="text-[hsl(var(--foreground))]">{item.value}</span> {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative h-[22rem] lg:h-auto min-h-[22rem] lg:min-h-[34rem] overflow-hidden border-t-2 lg:border-t-0 lg:border-r-2 border-[hsl(var(--border))]">
              {heroImage ? (
                <StorefrontProductImage
                  candidates={[heroImage]}
                  alt={props.title}
                  loading="eager"
                  fetchpriority="high"
                  requestedWidth={1200}
                  responsiveWidths={[640, 960, 1200, 1600]}
                  responsiveSizes="(max-width: 1023px) 100vw, 45vw"
                  imageQuality={78}
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[hsl(var(--secondary)/0.5)]">
                  <span className="text-4xl opacity-20">🇪🇬</span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--card)/0.4)_0%,transparent_15%),linear-gradient(0deg,hsl(var(--card)/0.4)_0%,transparent_15%)]" />
              
              {props.panel.metricValue && (
                <div className="absolute bottom-6 left-6 rounded-2xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] p-4 shadow-xl backdrop-blur-md text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                    {props.panel.metricLabel || 'مختارات بلدي'}
                  </p>
                  <p className="mt-1 text-lg font-black text-[hsl(var(--foreground))]">
                    {props.panel.metricValue}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
