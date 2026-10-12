import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import StorefrontProductImage from "../components/StorefrontProductImage";
import { buildStorefrontPath } from "../utils/paths";
import { resolveSectionVariant } from "../variants";
import { useStorefrontTheme } from "../engine/ThemeProvider";

const isExternalHref = (href: string) =>
  /^(https?:\/\/|mailto:|tel:)/i.test(href);

interface HeroSticker {
  label: string;
  position?: "left-mid" | "left-bottom" | "right-mid" | "right-bottom";
  tone?: "primary" | "outline" | "default";
}

interface HeroFloatingCard {
  badge?: string;
  title?: string;
  value?: string;
  description?: string;
  tone?: "indigo" | "glass" | "default";
}

interface HeroBannerHighlight {
  label: string;
  value: string;
}

interface HeroSlide {
  image?: string;
  imageUrl?: string;
  backgroundImage?: string;
  alt?: string;
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

interface HeroVariantProps {
  title: string;
  subtitle: string;
  ctaText: string;
  primaryHref: string;
  secondaryCtaText: string;
  secondaryHref: string;
  backgroundImage: string;
  eyebrow?: string;
  highlights: HeroBannerHighlight[];
  floatingCards: HeroFloatingCard[];
  stickers: HeroSticker[];
  contentAlign?: "left" | "center";
  panel: {
    image?: string;
    title?: string;
    subtitle?: string;
    note?: string;
    metricLabel?: string;
    metricValue?: string;
    eyebrow?: string;
  };
  primaryActionClassName?: string;
  secondaryActionClassName?: string;
  slides?: HeroSlide[];
  compact?: boolean;
}

const renderHeroAction = (
  href: string | null | undefined,
  label: string | undefined,
  className: string,
) => {
  if (!href || !label?.trim()) return null;
  if (href.startsWith("#")) {
    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
        }}
        className={className}
      >
        {label}
      </a>
    );
  }
  return isExternalHref(href) ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {label}
    </a>
  ) : (
    <Link to={href} className={className}>
      {label}
    </Link>
  );
};

interface HeroBannerProps {
  section: any;
  settings: any;
}

import {
  ButcherCounterHero,
  ButcherAtelierHero,
} from "./hero-banner/ButcherHeroes";
import { DentalPrecisionHero } from "./hero-banner/DentalPrecisionHero";

const DropBoardHero: React.FC<HeroVariantProps> = (props) => {
  const leadImage = props.backgroundImage || props.panel.image || "";

  return (
    <section className="relative overflow-hidden bg-background py-16">
      <div className="container relative z-10 px-4 md:px-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-6">
            {props.eyebrow && (
              <span className="inline-block text-accent font-black uppercase tracking-widest">
                {props.eyebrow}
              </span>
            )}
            <h1 className="text-5xl font-black md:text-6xl">{props.title}</h1>
            <p className="text-muted-foreground text-lg">{props.subtitle}</p>
            <div className="flex gap-4">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "bg-primary text-primary-foreground px-8 py-3 rounded-md font-bold",
              )}
              {renderHeroAction(
                props.secondaryHref,
                props.secondaryCtaText,
                "border border-border px-8 py-3 rounded-md font-bold",
              )}
            </div>
          </div>
          <div className="relative aspect-video">
            {leadImage && (
              <img
                src={leadImage}
                className="rounded-2xl object-cover w-full h-full"
                alt=""
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const LayeredParallaxSkyHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.panel.image || props.backgroundImage;
  const highlightItems =
    props.highlights.length > 0
      ? props.highlights.slice(0, 3)
      : [
          { label: "اختيار أسرع", value: "صور حقيقية" },
          { label: "أعمار مناسبة", value: "3+ سنوات" },
          { label: "لعب يومي", value: "تعلم + حركة" },
        ];

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#e8f8ff_0%,#fef8d6_100%)] py-12 md:py-16 lg:py-20">
      <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
      <div className="absolute -left-12 top-20 h-32 w-32 rounded-full bg-white/70 blur-2xl" />
      <div className="absolute right-10 top-12 h-20 w-20 rounded-full bg-[#ffd768]/50 blur-xl" />
      <div className="absolute left-1/3 top-8 h-14 w-36 rounded-full bg-white/80 blur-sm" />
      <div className="absolute right-1/4 top-28 h-12 w-28 rounded-full bg-white/65 blur-sm" />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,30rem)] lg:gap-12">
          <div className="space-y-6 text-start">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#0f6d88] shadow-[0_18px_36px_-28px_rgba(15,109,136,0.3)] backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff9f43]" />
              {props.eyebrow || props.panel.eyebrow || "عالم اللعب الآمن"}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-[15ch] font-heading text-4xl font-black leading-[1.02] tracking-tight text-[#123047] md:text-6xl">
                {props.title}
              </h1>
              <p className="max-w-[34rem] text-base leading-8 text-[#335163] md:text-lg">
                {props.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex items-center justify-center rounded-full bg-[#ffb703] px-7 py-3.5 text-sm font-black text-[#1e1b15] shadow-[0_20px_40px_-24px_rgba(255,183,3,0.7)] transition hover:-translate-y-0.5 hover:bg-[#ffa800]",
              )}
              {renderHeroAction(
                props.secondaryHref,
                props.secondaryCtaText,
                "inline-flex items-center justify-center rounded-full border border-[#85c8dd] bg-white/75 px-7 py-3.5 text-sm font-bold text-[#16435a] backdrop-blur transition hover:border-[#59b3d0] hover:bg-white",
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {highlightItems.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-[1.35rem] border border-white/70 bg-white/80 px-4 py-4 shadow-[0_18px_40px_-32px_rgba(18,48,71,0.28)] backdrop-blur"
                >
                  <p className="text-[11px] font-black tracking-[0.16em] text-[#0f6d88]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-black text-[#163142]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-8 hidden h-24 w-24 rounded-full border-4 border-white/80 bg-[#ff8fab]/40 md:block" />
            <div className="absolute -right-4 bottom-6 hidden h-20 w-20 rounded-full border-4 border-white/80 bg-[#90e0ef]/50 md:block" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/85 p-3 shadow-[0_30px_70px_-38px_rgba(18,48,71,0.32)] backdrop-blur">
              <div className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#fffdf7_0%,#e5f7ff_100%)]">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={props.panel.title || props.title}
                    className="h-[21rem] w-full object-cover md:h-[28rem]"
                  />
                ) : (
                  <div className="flex h-[21rem] items-center justify-center bg-[radial-gradient(circle_at_top,#ffffff_0%,#fef3c7_38%,#d9f4ff_100%)] md:h-[28rem]">
                    <div className="rounded-full bg-white/85 px-6 py-4 text-center shadow-[0_20px_48px_-30px_rgba(18,48,71,0.28)]">
                      <p className="text-sm font-black text-[#0f6d88]">
                        لعب + تعلم + أمان
                      </p>
                      <p className="mt-2 text-2xl font-black text-[#163142]">
                        اختيارات جاهزة لكل يوم
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {props.panel.title ||
              props.panel.note ||
              props.panel.metricValue ? (
                <div className="absolute inset-x-5 bottom-5 rounded-[1.4rem] border border-white/80 bg-white/92 px-4 py-4 shadow-[0_20px_44px_-28px_rgba(18,48,71,0.28)] backdrop-blur">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[#183547]">
                        {props.panel.title || "صور واضحة تساعدك على الاختيار"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#496474]">
                        {props.panel.note ||
                          "منتجات مناسبة للبيت، الهدية، والنشاط اليومي بدون صور مفبركة."}
                      </p>
                    </div>
                    {props.panel.metricValue ? (
                      <div className="rounded-full bg-[#fff3b8] px-4 py-2 text-center text-sm font-black text-[#7a5400]">
                        <span className="block text-[10px] tracking-[0.16em] text-[#a17300]">
                          {props.panel.metricLabel || "مختارات"}
                        </span>
                        <span>{props.panel.metricValue}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const LegacyImageSliderHero: React.FC<HeroVariantProps> = (props) => {
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
    ? "h-[12rem] sm:h-[14rem] lg:h-[17rem]"
    : "h-[18rem] sm:h-[24rem] lg:h-[33rem]";

  return (
    <section
      className={`w-full bg-white ${props.compact ? "py-4 md:py-5" : "py-0"}`}
    >
      <div className={props.compact ? "container px-4 md:px-6" : "w-full"}>
        <div className={`relative overflow-hidden bg-[#f4f4f4] ${shellHeight}`}>
          {preparedSlides.map((slide, index) => (
            <div
              key={`${slide.image}-${index}`}
              className={`absolute inset-0 transition-opacity duration-700 ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={slide.image}
                alt={
                  slide.alt || slide.title || props.title || "Storefront banner"
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
                        "inline-flex min-h-[44px] items-center justify-center bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-black transition-colors hover:bg-[#f0f0f0]",
                      )}
                      {renderHeroAction(
                        activeSlide?.secondaryCtaLink,
                        activeSlide?.secondaryCtaText,
                        "inline-flex min-h-[44px] items-center justify-center border border-white/58 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition-colors hover:bg-white/12",
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
                        ? "w-7 bg-white"
                        : "bg-white/52 hover:bg-white/76"
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

const RetailCommandHero: React.FC<HeroVariantProps> = (props) => {
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

const RunwayGridHero: React.FC<HeroVariantProps> = (props) => (
  <section className="py-24 bg-secondary/30">
    <div className="container grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-8">
        <h1 className="text-6xl font-black tracking-tight">{props.title}</h1>
        <p className="text-xl text-muted-foreground">{props.subtitle}</p>
        <Link
          to={props.primaryHref}
          className="bg-primary text-primary-foreground px-12 py-4 rounded-full font-black"
        >
          SHOP THE COLLECTION
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="aspect-[3/4] bg-muted rounded-2xl overflow-hidden">
          {props.backgroundImage && (
            <img
              src={props.backgroundImage}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
        </div>
        <div className="aspect-[3/4] bg-muted rounded-2xl overflow-hidden mt-12">
          {props.panel.image && (
            <img
              src={props.panel.image}
              className="w-full h-full object-cover"
              alt=""
            />
          )}
        </div>
      </div>
    </div>
  </section>
);

const WardrobePlannerHero: React.FC<HeroVariantProps> = (props) => (
  <section className="bg-primary py-24 text-primary-foreground">
    <div className="container grid lg:grid-cols-2 gap-16 items-center">
      <div className="space-y-8">
        <h1 className="text-7xl font-black leading-none">{props.title}</h1>
        <p className="text-xl opacity-80">{props.subtitle}</p>
        <Link
          to={props.primaryHref}
          className="bg-accent text-accent-foreground px-10 py-4 rounded-full font-bold"
        >
          PLAN NOW
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {props.floatingCards.slice(0, 4).map((card, i) => (
          <div key={i} className="bg-white/10 p-6 rounded-3xl backdrop-blur-md">
            <div className="text-accent font-black uppercase tracking-widest text-xs">
              {card.badge || "DAY " + (i + 1)}
            </div>
            <div className="text-2xl font-black mt-2">
              {card.title || card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const ModestCascadeHero: React.FC<HeroVariantProps> = (props) => {
  const leadImage = props.backgroundImage || props.panel.image;
  const supportImage = props.panel.image || props.backgroundImage;
  const routeHighlights = props.highlights.slice(0, 3);
  const layerCards = props.floatingCards.slice(0, 3);

  return (
    <section className="overflow-hidden bg-[linear-gradient(180deg,#fcf8f1_0%,#f7efe4_100%)] py-8 md:py-10 lg:py-14">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden rounded-[2.2rem] border border-[#e7dccf] bg-[radial-gradient(circle_at_top,rgba(191,154,120,0.12),transparent_36%),linear-gradient(135deg,#fffdf9_0%,#f7efe4_100%)] shadow-[0_36px_90px_-62px_rgba(71,47,34,0.24)]">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="px-5 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10">
              <div className="space-y-6">
                {props.eyebrow ? (
                  <span className="inline-flex rounded-full border border-[#d8c3b5] bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#866252] shadow-[0_16px_34px_-28px_rgba(71,47,34,0.18)]">
                    {props.eyebrow}
                  </span>
                ) : null}

                <div className="space-y-4">
                  <h1 className="font-heading text-[2.45rem] font-semibold leading-[1.04] tracking-tight text-[#2d221d] md:text-[4.1rem]">
                    {props.title}
                  </h1>
                  <p className="max-w-[34rem] text-sm leading-8 text-[#6f6159] md:text-base">
                    {props.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {renderHeroAction(
                    props.primaryHref,
                    props.ctaText,
                    "inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#2d221d] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#191310]",
                  )}
                  {renderHeroAction(
                    props.secondaryHref || props.primaryHref,
                    props.secondaryCtaText,
                    "inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#dac8ba] bg-white px-7 py-3 text-sm font-black text-[#5f4c42] transition-colors hover:border-[#b88b72] hover:text-[#2d221d]",
                  )}
                </div>

                {routeHighlights.length ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {routeHighlights.map((item) => (
                      <div
                        key={`${item.label}-${item.value}`}
                        className="rounded-[1.1rem] border border-[#eadfd4] bg-white/88 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(71,47,34,0.12)]"
                      >
                        <p className="text-[10px] font-black tracking-[0.2em] text-[#9b7764]">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#2d221d]">
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="relative min-h-[24rem] border-t border-[#e7dccf] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(244,233,222,0.96))] px-5 py-6 md:px-8 md:py-8 lg:min-h-[34rem] lg:border-s lg:border-t-0 lg:px-10 lg:py-10">
              <div className="absolute inset-x-[18%] top-[12%] h-[44%] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,181,152,0.34),rgba(255,255,255,0)_74%)]" />
              <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,0.82fr)]">
                <div className="relative overflow-hidden rounded-[1.8rem] border border-white/80 bg-[#efe4d8] shadow-[0_24px_62px_-42px_rgba(71,47,34,0.24)]">
                  {leadImage ? (
                    <img
                      src={leadImage}
                      alt={props.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(45,34,29,0.08)_100%)]" />
                  <div className="absolute inset-x-4 bottom-4 rounded-[1.2rem] border border-white/70 bg-white/86 px-4 py-4 backdrop-blur">
                    <p className="text-[10px] font-black tracking-[0.2em] text-[#9b7764]">
                      {props.panel.eyebrow || "Layer one"}
                    </p>
                    <p className="mt-2 font-heading text-[1.1rem] font-semibold text-[#2d221d]">
                      {props.panel.title || props.title}
                    </p>
                    {props.panel.subtitle ? (
                      <p className="mt-2 text-xs leading-6 text-[#6f6159]">
                        {props.panel.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {layerCards.map((card, index) => (
                    <div
                      key={`${card.title || card.value}-${index}`}
                      className={`rounded-[1.45rem] border px-4 py-4 shadow-[0_22px_52px_-40px_rgba(71,47,34,0.18)] ${
                        index === 0
                          ? "border-[#ead7ca] bg-white/90"
                          : index === 1
                            ? "border-[#e4d3c7] bg-[#fbf5ee]"
                            : "border-[#decdbf] bg-[#f1e5d8]"
                      }`}
                    >
                      {card.badge ? (
                        <p className="text-[10px] font-black tracking-[0.2em] text-[#9b7764]">
                          {card.badge}
                        </p>
                      ) : null}
                      <p className="mt-2 font-heading text-[1.05rem] font-semibold text-[#2d221d]">
                        {card.title || card.value}
                      </p>
                      {card.value || card.description ? (
                        <p className="mt-2 text-xs leading-6 text-[#6f6159]">
                          {card.value && card.description
                            ? `${card.value} - ${card.description}`
                            : card.value || card.description}
                        </p>
                      ) : null}
                    </div>
                  ))}

                  {supportImage ? (
                    <div className="relative flex-1 overflow-hidden rounded-[1.55rem] border border-white/80 bg-[#ecdfd2] shadow-[0_20px_48px_-38px_rgba(71,47,34,0.16)]">
                      <img
                        src={supportImage}
                        alt={props.panel.title || props.title}
                        className="h-full min-h-[10rem] w-full object-cover"
                      />
                      {props.panel.metricValue ? (
                        <div className="absolute bottom-4 left-4 rounded-[1rem] border border-white/70 bg-white/88 px-4 py-3 backdrop-blur">
                          <p className="text-[10px] font-black tracking-[0.2em] text-[#9b7764]">
                            {props.panel.metricLabel || "Coverage note"}
                          </p>
                          <p className="mt-1 text-lg font-black text-[#2d221d]">
                            {props.panel.metricValue}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SoftShowcaseHero: React.FC<HeroVariantProps> = (props) => (
  <section className="py-20 bg-[#f8fafc]">
    <div className="container bg-white rounded-[3rem] p-12 shadow-sm grid lg:grid-cols-2 items-center gap-12">
      <div className="space-y-8">
        <h1 className="text-5xl font-semibold text-slate-900">{props.title}</h1>
        <p className="text-xl text-slate-500">{props.subtitle}</p>
        <div className="text-4xl font-bold text-red-500">
          {props.panel.metricValue || "EGP 0.00"}
        </div>
        {renderHeroAction(
          props.primaryHref,
          props.ctaText || "تسوّق الآن",
          "bg-[#facc15] text-black px-10 py-4 rounded-full font-bold inline-block",
        )}
      </div>
      <div className="flex justify-center">
        {props.panel.image && (
          <img
            src={props.panel.image}
            className="h-96 w-96 object-contain"
            alt=""
          />
        )}
      </div>
    </div>
  </section>
);

const BoutiqueMuseHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const callouts = (props.highlights || []).slice(0, 3);
  const notes = (props.floatingCards || []).slice(0, 2);

  return (
    <section className="bg-[#fbf7f3] py-8 md:py-10 lg:py-14">
      <div className="container px-4 md:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,31rem)]">
          <div className="space-y-6 text-start">
            {props.eyebrow ? (
              <span className="inline-flex rounded-full border border-[#ead7d2] bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-[#a47a72] shadow-[0_18px_36px_-30px_rgba(59,33,28,0.18)]">
                {props.eyebrow}
              </span>
            ) : null}
            <div className="space-y-4">
              <h1 className="font-heading text-[2.8rem] font-semibold leading-[1.05] tracking-tight text-[#201915] md:text-[4.15rem]">
                {props.title}
              </h1>
              <p className="max-w-[34rem] text-base leading-8 text-[#736863] md:text-lg">
                {props.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex min-h-[46px] items-center justify-center border border-[#201915] bg-white px-6 py-3 text-sm font-semibold tracking-[0.08em] text-[#201915] transition-colors hover:bg-[#201915] hover:text-white",
              )}
              {renderHeroAction(
                props.secondaryHref,
                props.secondaryCtaText,
                "inline-flex min-h-[46px] items-center justify-center border border-[#ead7d2] bg-transparent px-6 py-3 text-sm font-medium text-[#7f706b] transition-colors hover:border-[#201915] hover:text-[#201915]",
              )}
            </div>

            {callouts.length ? (
              <div className="flex flex-wrap gap-3 pt-2">
                {callouts.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="min-w-[8.75rem] rounded-[1rem] border border-[#eadfd7] bg-white/92 px-4 py-3 shadow-[0_18px_38px_-32px_rgba(59,33,28,0.12)]"
                  >
                    <p className="text-[10px] font-semibold tracking-[0.22em] text-[#a77d75]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#201915]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative mx-auto flex w-full max-w-[31rem] items-center justify-center">
            <div className="absolute inset-x-[8%] top-[7%] aspect-square rounded-full bg-[radial-gradient(circle_at_center,rgba(229,184,197,0.95),rgba(245,227,233,0.72)_55%,rgba(251,247,243,0)_76%)]" />
            <div className="absolute inset-0 opacity-70">
              <div className="absolute start-6 top-12 h-3 w-3 border border-[#edd8d2]" />
              <div className="absolute end-8 top-8 h-4 w-4 border border-[#edd8d2]" />
              <div className="absolute end-10 top-28 h-2.5 w-2.5 border border-[#edd8d2]" />
              <div className="absolute start-12 bottom-24 h-2.5 w-2.5 border border-[#edd8d2]" />
              <div className="absolute end-16 bottom-20 h-3 w-3 border border-[#edd8d2]" />
            </div>
            {heroImage ? (
              <img
                src={heroImage}
                alt={props.title}
                className="relative z-10 max-h-[34rem] w-full object-contain drop-shadow-[0_34px_60px_rgba(118,80,83,0.18)]"
              />
            ) : null}
            {notes.length ? (
              <div className="absolute inset-y-6 end-0 hidden w-40 flex-col justify-between lg:flex">
                {notes.map((note, index) => (
                  <div
                    key={`${note.title || note.value}-${index}`}
                    className="rounded-[1.2rem] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_20px_44px_-34px_rgba(59,33,28,0.18)] backdrop-blur"
                  >
                    {note.badge ? (
                      <p className="text-[10px] font-semibold tracking-[0.2em] text-[#b06767]">
                        {note.badge}
                      </p>
                    ) : null}
                    <p className="mt-2 font-heading text-[1.1rem] font-semibold text-[#201915]">
                      {note.title || note.value}
                    </p>
                    {note.description ? (
                      <p className="mt-2 text-xs leading-6 text-[#7b6d68]">
                        {note.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

const RetailDirectBannerHero: React.FC<HeroVariantProps> = (props) => {
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
                    {props.eyebrow || "ستايل ستور"}
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
                  "inline-flex items-center justify-center rounded-[0.8rem] border-2 border-[#111111] bg-[#111111] px-4 py-2.5 text-sm font-black text-white",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex items-center justify-center rounded-[0.8rem] border-2 border-[#111111] bg-white px-4 py-2.5 text-sm font-black text-[#111111]",
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

const FashionBillboardHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const quickTags = (props.highlights || []).slice(0, 3);
  const titleWordmark = props.title || "Vela Fashion";

  return (
    <section className="bg-[#f0f0f0] py-4 md:py-5">
      <div className="container px-4 md:px-6">
        <div className="rounded-[1rem] bg-[#efefef] px-4 py-5 shadow-[0_20px_46px_-42px_rgba(17,17,17,0.16)] sm:px-6 sm:py-6">
          <div className="grid items-center gap-5 sm:grid-cols-[11.5rem_minmax(0,1fr)] sm:gap-6">
            <div className="justify-self-center">
              <div className="space-y-3 text-center text-[0.7rem] font-black uppercase tracking-[0.34em] text-white/92">
                <div>NEW</div>
                <div className="mx-auto w-full max-w-[11.5rem] overflow-hidden rounded-[0.9rem] border-[6px] border-white bg-[#f5ddd7] shadow-[0_20px_44px_-34px_rgba(0,0,0,0.24)]">
                  {heroImage ? (
                    <img
                      src={heroImage}
                      alt={props.title}
                      className="h-[13.5rem] w-full object-cover"
                    />
                  ) : null}
                  <div className="flex items-center justify-between bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#cb5d57]">
                    <span>{props.eyebrow || "new drop"}</span>
                    <span>sale</span>
                  </div>
                </div>
                <div>COLLECTION</div>
              </div>
            </div>

            <div className="space-y-4 text-right">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {quickTags.slice(0, 2).map((item) => (
                  <span
                    key={`${item.label}-${item.value}`}
                    className="inline-flex rounded-full border border-[#dfd2cb] bg-white px-3 py-1 text-[10px] font-black text-[#7a5d63]"
                  >
                    {item.value}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                <h1 className="font-heading text-[2.05rem] font-black leading-[0.96] tracking-tight text-[#2c2426] sm:text-[2.5rem]">
                  {titleWordmark}
                </h1>
                <p className="max-w-[24rem] text-sm leading-7 text-[#69575d]">
                  {props.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2.5">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex items-center justify-center rounded-[0.85rem] bg-[#2c2426] px-5 py-3 text-sm font-black text-white",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex items-center justify-center rounded-[0.85rem] border border-[#ddd2ca] bg-white px-5 py-3 text-sm font-black text-[#2c2426]",
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const SplitPanelHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.panel.image || props.backgroundImage;
  const panelNotes = [
    props.panel.note,
    props.panel.metricValue,
    props.panel.metricLabel,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const fallbackPanelNotes = ["صور أقرب للحقيقة", "دفع مرن", "توصيل أوضح"];
  const resolvedPanelNotes = panelNotes.length
    ? panelNotes
    : fallbackPanelNotes;
  const isCompact = props.compact;
  const visibleCompactNotes = resolvedPanelNotes.slice(0, 2);

  return (
    <section
      className={`bg-background ${isCompact ? "py-4 md:py-5" : "py-12 md:py-16"}`}
    >
      <div className="container px-4 md:px-6">
        <div
          className={`grid rounded-[calc(var(--radius)+0.65rem)] border border-border/70 bg-card shadow-[0_28px_100px_-70px_rgba(15,23,42,0.3)] lg:items-stretch ${
            isCompact
              ? "gap-3 p-3 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:p-4"
              : "gap-5 p-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:p-7"
          }`}
        >
          <div
            className={`flex flex-col justify-between ${
              isCompact ? "gap-3.5" : "gap-6"
            }`}
          >
            <div className={isCompact ? "space-y-3" : "space-y-5"}>
              {props.eyebrow ? (
                <span className="inline-flex rounded-[calc(var(--button-radius)-0.1rem)] border border-border bg-secondary px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-primary">
                  {props.eyebrow}
                </span>
              ) : null}
              <div className={isCompact ? "space-y-2" : "space-y-3"}>
                <h1
                  className={`font-heading font-black leading-[0.95] tracking-[0.02em] text-foreground ${
                    isCompact
                      ? "text-[1.7rem] sm:text-[2rem] md:text-[2.7rem]"
                      : "text-[2.3rem] uppercase sm:text-[2.8rem] md:text-[4.4rem]"
                  }`}
                >
                  {props.title}
                </h1>
                <p
                  className={`max-w-2xl text-muted-foreground ${
                    isCompact
                      ? "text-[13px] leading-5 md:text-[0.92rem]"
                      : "text-sm leading-7 md:text-base"
                  }`}
                >
                  {props.subtitle}
                </p>
              </div>
            </div>

            {isCompact ? (
              visibleCompactNotes.length ? (
                <div className="flex flex-wrap gap-2">
                  {visibleCompactNotes.map((item, index) => (
                    <span
                      key={`${item}-${index}`}
                      className={`inline-flex items-center rounded-[var(--button-radius)] px-3 py-1.5 text-[11px] font-bold ${
                        index === 0
                          ? "border border-primary/12 bg-primary/8 text-primary"
                          : "border border-border/70 bg-background text-foreground"
                      }`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {(props.highlights || []).slice(0, 3).map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-[var(--radius)] border border-border/70 bg-background px-4 py-4"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-black text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div
              className={
                isCompact
                  ? "flex flex-wrap gap-2"
                  : "flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              }
            >
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex min-h-[42px] w-full items-center justify-center rounded-[var(--button-radius)] bg-primary px-5 py-2.5 text-[13px] font-black text-primary-foreground shadow-[0_22px_52px_-38px_rgba(15,23,42,0.58)] sm:w-auto",
              )}
              {renderHeroAction(
                props.secondaryHref || props.primaryHref,
                props.secondaryCtaText,
                "inline-flex min-h-[42px] w-full items-center justify-center rounded-[var(--button-radius)] border border-border bg-background px-5 py-2.5 text-[13px] font-black text-foreground sm:w-auto",
              )}
            </div>
          </div>

          <div
            className={
              isCompact
                ? "grid gap-3"
                : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]"
            }
          >
            <div className="relative overflow-hidden rounded-[calc(var(--radius)+0.35rem)] bg-secondary">
              {heroImage ? (
                <StorefrontProductImage
                  candidates={[heroImage]}
                  alt={props.title}
                  loading="eager"
                  fetchpriority="high"
                  requestedWidth={1400}
                  responsiveWidths={[640, 960, 1280, 1600]}
                  responsiveSizes="(max-width: 1023px) 100vw, 46vw"
                  imageQuality={76}
                  className={`h-full w-full object-cover ${
                    isCompact
                      ? "min-h-[12rem] md:min-h-[14.5rem]"
                      : "min-h-[22rem]"
                  }`}
                />
              ) : null}
              <div
                className={`absolute inset-x-3 bottom-3 rounded-[var(--radius)] bg-[hsl(var(--primary)/0.82)] text-primary-foreground backdrop-blur ${
                  isCompact ? "px-3.5 py-2.5" : "px-4 py-4"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary-foreground/70">
                  {props.panel.eyebrow || "المسار العملي"}
                </p>
                <p
                  className={`mt-2 font-black ${
                    isCompact ? "text-base md:text-lg" : "text-xl"
                  }`}
                >
                  {props.panel.title || "ابدأ من الفئة الأقرب لاحتياجك"}
                </p>
                <p
                  className={`mt-2 text-primary-foreground/78 ${
                    isCompact ? "text-xs leading-5" : "text-sm leading-6"
                  }`}
                >
                  {props.panel.subtitle ||
                    "صور أوضح ورسائل مباشرة تساعد على الحسم بسرعة من غير تشتيت."}
                </p>
              </div>
            </div>

            {!isCompact ? (
              <div className="grid gap-3">
                {resolvedPanelNotes.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className={`rounded-[var(--radius)] border px-4 py-4 text-sm font-bold ${
                      index === resolvedPanelNotes.length - 1
                        ? "border-primary/20 bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

const StyleLedgerHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const panelImage = props.panel.image || props.backgroundImage;
  const notes = (props.floatingCards || []).slice(0, 2);

  return (
    <section className="bg-background py-8 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="grid gap-4 rounded-[calc(var(--radius)+0.8rem)] border border-border/65 bg-card p-4 shadow-[0_34px_100px_-70px_rgba(76,42,44,0.2)] lg:grid-cols-[0.94fr_1.06fr] lg:gap-5 lg:p-7">
          <div className="order-2 grid gap-3 lg:order-1 lg:gap-4">
            <div className="relative overflow-hidden rounded-[calc(var(--radius)+0.3rem)] bg-secondary">
              {heroImage ? (
                <StorefrontProductImage
                  candidates={[heroImage]}
                  alt={props.title}
                  loading="eager"
                  fetchpriority="high"
                  requestedWidth={1440}
                  responsiveWidths={[640, 960, 1280, 1600]}
                  responsiveSizes="(max-width: 1023px) 100vw, 44vw"
                  imageQuality={74}
                  className="h-[18rem] w-full object-cover md:h-[26rem]"
                />
              ) : null}
              <div className="absolute inset-x-4 bottom-4 rounded-[calc(var(--radius)-0.1rem)] bg-card/94 px-4 py-4 shadow-[0_24px_60px_-44px_rgba(76,42,44,0.32)] backdrop-blur">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                  {props.panel.eyebrow || "جاهزة للحسم"}
                </p>
                <p className="mt-2 text-xl font-black text-foreground">
                  {props.panel.title || "ابدئي من اللبس أو الحذاء أو العرض"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {props.panel.subtitle ||
                    "قرار أسرع لأن الصور والعروض والطلب السريع على نفس المسار."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {notes.map((card, index) => (
                <div
                  key={`${card.title}-${index}`}
                  className={`${index > 0 ? "hidden sm:block" : ""} rounded-[var(--radius)] border border-border/70 bg-background px-4 py-3.5 sm:px-4 sm:py-4`}
                >
                  {card.badge ? (
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                      {card.badge}
                    </p>
                  ) : null}
                  <p className="mt-2 text-base font-black text-foreground">
                    {card.title || card.value}
                  </p>
                  {card.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {card.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 flex flex-col justify-between gap-4 lg:order-2 lg:gap-6">
            <div className="space-y-4 lg:space-y-5">
              {props.eyebrow ? (
                <span className="inline-flex rounded-[calc(var(--button-radius)-0.15rem)] border border-border bg-secondary px-3 py-1 text-[11px] font-black tracking-[0.22em] text-primary">
                  {props.eyebrow}
                </span>
              ) : null}
              <div className="space-y-3">
                <h1 className="font-heading text-[2.6rem] font-black leading-[1.02] tracking-tight text-foreground md:text-[4.1rem]">
                  {props.title}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                  {props.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(props.highlights || []).slice(0, 4).map((item) => (
                  <span
                    key={`${item.label}-${item.value}`}
                    className="inline-flex items-center gap-2 rounded-[calc(var(--button-radius)-0.15rem)] border border-border bg-background px-3 py-2 text-xs font-bold text-foreground"
                  >
                    <span className="text-primary">{item.label}</span>
                    <span className="font-black">{item.value}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 lg:hidden">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[46px] items-center justify-center rounded-[var(--button-radius)] bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-[0_24px_60px_-42px_rgba(76,42,44,0.34)]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[46px] items-center justify-center rounded-[var(--button-radius)] border border-border bg-card px-5 py-3 text-sm font-black text-foreground",
                )}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-4">
              <div className="hidden overflow-hidden rounded-[var(--radius)] border border-border/70 bg-secondary lg:block">
                {panelImage ? (
                  <StorefrontProductImage
                    candidates={[panelImage]}
                    alt={props.panel.title || props.title}
                    loading="lazy"
                    fetchpriority="low"
                    requestedWidth={960}
                    responsiveWidths={[480, 720, 960, 1200]}
                    responsiveSizes="(max-width: 1023px) 100vw, 28vw"
                    imageQuality={72}
                    className="h-full min-h-[13rem] w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="space-y-4 rounded-[var(--radius)] border border-border/70 bg-background px-4 py-5">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary">
                  {props.panel.metricValue || "قبل أول click"}
                </p>
                <p className="text-lg font-black text-foreground">
                  {props.panel.note ||
                    "مسار واضح يقودك من القطعة الأساسية إلى ما يكملها بدون لف طويل."}
                </p>
                <div className="hidden flex-wrap gap-3 lg:flex">
                  {renderHeroAction(
                    props.primaryHref,
                    props.ctaText,
                    "inline-flex items-center justify-center rounded-[var(--button-radius)] bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-[0_24px_60px_-42px_rgba(76,42,44,0.34)]",
                  )}
                  {renderHeroAction(
                    props.secondaryHref || props.primaryHref,
                    props.secondaryCtaText,
                    "inline-flex items-center justify-center rounded-[var(--button-radius)] border border-border bg-card px-6 py-3 text-sm font-black text-foreground",
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ScentPortraitHero: React.FC<HeroVariantProps> = (props) => (
  <section className="overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--secondary))_48%,hsl(var(--background))_100%)] py-12 md:py-16">
    <div className="container px-4 md:px-6">
      <div className="grid gap-6 overflow-hidden rounded-[calc(var(--radius)+0.9rem)] border border-border/75 bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--secondary)/0.65)_100%)] p-5 shadow-[0_36px_110px_-76px_rgba(15,23,42,0.22)] lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-center lg:p-8">
        <div className="space-y-5">
          <span className="inline-flex rounded-[var(--button-radius)] border border-border bg-card/92 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-primary">
            {props.eyebrow || "برفنات أصلية"}
          </span>
          <div className="space-y-3">
            <h1 className="font-heading text-[2.2rem] font-black leading-[1.05] tracking-tight text-foreground md:text-[3.5rem]">
              {props.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              {props.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(props.highlights || []).slice(0, 3).map((item) => (
              <span
                key={`${item.label}-${item.value}`}
                className="inline-flex items-center gap-2 rounded-[var(--button-radius)] border border-border bg-card px-3 py-2 text-xs font-bold text-foreground shadow-[0_16px_40px_-34px_rgba(15,23,42,0.16)]"
              >
                <span className="text-primary">{item.label}</span>
                <span className="font-black text-foreground">{item.value}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {renderHeroAction(
              props.primaryHref,
              props.ctaText || "اكتشفي العطور",
              "inline-flex items-center justify-center rounded-[var(--button-radius)] bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-[0_22px_70px_-40px_rgba(15,23,42,0.34)] transition-all hover:-translate-y-0.5",
            )}
            {renderHeroAction(
              props.secondaryHref || props.primaryHref,
              props.secondaryCtaText,
              "inline-flex items-center justify-center rounded-[var(--button-radius)] border border-border bg-card px-6 py-3 text-sm font-black text-foreground transition-colors hover:border-primary/30 hover:bg-background",
            )}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_11rem]">
          <div className="relative overflow-hidden rounded-[calc(var(--radius)+0.25rem)] border border-border/75 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.86),hsl(var(--background)))] shadow-[0_30px_90px_-64px_rgba(15,23,42,0.24)]">
            <div className="absolute inset-x-5 top-5 flex items-center justify-between gap-3">
              <span className="inline-flex rounded-[var(--button-radius)] border border-border bg-card/88 px-3 py-1 text-[11px] font-black text-primary backdrop-blur">
                {props.panel.metricValue || "50 مل و100 مل"}
              </span>
              <span className="inline-flex rounded-[var(--button-radius)] bg-accent px-3 py-1 text-[11px] font-black text-accent-foreground">
                صور حقيقية
              </span>
            </div>
            <div className="grid min-h-[22rem] gap-6 p-5 md:min-h-[26rem] md:grid-cols-[0.92fr_1.08fr] md:p-7">
              <div className="space-y-3 self-end">
                <span className="inline-flex rounded-[var(--button-radius)] border border-border bg-card/92 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-primary">
                  {props.panel.metricValue || "قرار أوضح"}
                </span>
                <h2 className="font-heading text-[1.55rem] font-black leading-tight text-foreground md:text-[2rem]">
                  {props.panel.title || "حجم أوضح وهدايا أسهل"}
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  {props.panel.subtitle ||
                    "زجاجة واحدة أو مجموعة هدية مع فرق السعر والحجم ظاهرين من أول نظرة."}
                </p>
              </div>
              <div className="relative flex items-center justify-center">
                {props.panel.image ? (
                  <img
                    src={props.panel.image}
                    alt={props.title}
                    className="h-[18rem] w-full rounded-[1.6rem] object-cover shadow-[0_30px_90px_-58px_rgba(61,41,44,0.36)] md:h-[22rem]"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              props.panel.note || "أحجام واضحة",
              props.panel.eyebrow || "تغليف هدايا",
              "أصالة موضحة",
            ].map((note) => (
              <div
                key={note}
                className="rounded-[var(--radius)] border border-border bg-card/92 px-4 py-4 text-sm font-bold text-foreground shadow-[0_18px_50px_-42px_rgba(15,23,42,0.16)]"
              >
                {note}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);

const NatureBreezeHero: React.FC<HeroVariantProps> = (props) => (
  <section className="relative py-32 overflow-hidden">
    <div className="absolute inset-0 bg-green-50/50 -z-10" />
    <div className="container grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-8">
        <span className="bg-green-100 text-green-700 px-6 py-2 rounded-full font-bold">
          🌿 {props.eyebrow || "Pure Living"}
        </span>
        <h1 className="text-7xl font-black text-slate-900">{props.title}</h1>
        <p className="text-xl text-slate-600">{props.subtitle}</p>
        <Link
          to={props.primaryHref}
          className="bg-green-600 text-white px-12 py-5 rounded-full font-bold shadow-xl shadow-green-200 inline-block"
        >
          EXPLORE NATURE
        </Link>
      </div>
      <div className="relative aspect-square bg-green-200 rounded-full flex items-center justify-center text-9xl">
        🪴
      </div>
    </div>
  </section>
);

const ElessiSpotlightHero: React.FC<HeroVariantProps> = (props) => {
  const leadImage = props.backgroundImage || props.panel.image || "";
  const notes = (props.floatingCards || [])
    .map((item) => item.title || item.value || item.description || "")
    .filter(Boolean)
    .slice(0, 3);

  return (
    <section className="bg-[linear-gradient(180deg,#fffdfb_0%,#f8f1ea_34%,#fffdfb_100%)] py-14 md:py-18">
      <div className="container px-4 md:px-6">
        <div className="grid gap-5 rounded-[2rem] border border-[#eaded4] bg-white/94 p-5 shadow-[0_34px_100px_-72px_rgba(47,34,24,0.28)] lg:grid-cols-[1.04fr_0.96fr] lg:p-7">
          <div className="flex flex-col justify-between gap-6">
            <div className="space-y-4">
              {props.eyebrow ? (
                <span className="inline-flex rounded-full border border-[#eaded4] bg-[#fff7f1] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#7b4e33]">
                  {props.eyebrow}
                </span>
              ) : null}
              <h1 className="font-heading text-[2.8rem] font-black leading-[0.95] tracking-tight text-[#241713] md:text-[4.3rem]">
                {props.title}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#6f5b51] md:text-base">
                {props.subtitle}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(props.highlights || []).slice(0, 3).map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-[1.3rem] border border-[#efe4da] bg-[#fffaf6] px-4 py-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8f7668]">
                    {item.label}
                  </p>
                  <p className="mt-2 text-base font-black text-[#241713]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex items-center justify-center rounded-full bg-[#241713] px-6 py-3 text-sm font-black text-[#fff6ef] shadow-[0_24px_60px_-42px_rgba(36,23,19,0.6)]",
              )}
              {renderHeroAction(
                props.secondaryHref || props.primaryHref,
                props.secondaryCtaText,
                "inline-flex items-center justify-center rounded-full border border-[#eaded4] bg-white px-6 py-3 text-sm font-black text-[#241713]",
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="relative overflow-hidden rounded-[1.8rem] bg-[#f7efe8]">
              {leadImage ? (
                <img
                  src={leadImage}
                  alt={props.title}
                  className="h-full min-h-[22rem] w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-x-4 bottom-4 rounded-[1.3rem] bg-white/92 px-4 py-4 shadow-[0_18px_44px_-34px_rgba(47,34,24,0.24)] backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8f7668]">
                  {props.panel.eyebrow || "catalog cue"}
                </p>
                <p className="mt-2 text-lg font-black text-[#241713]">
                  {props.panel.title ||
                    "ابدأ من القطعة الأساسية ثم أكمل الإطلالة أو المجموعة"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#6f5b51]">
                  {props.panel.subtitle ||
                    "تشكيل أقرب للحسم مع صور أوضح واختصارات وصول أسرع."}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {(notes.length
                ? notes
                : [
                    props.panel.note || "",
                    props.panel.metricValue || "",
                    props.panel.metricLabel || "",
                  ]
              )
                .filter(Boolean)
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className={`rounded-[1.25rem] border px-4 py-4 text-sm font-bold ${
                      index === 2
                        ? "border-[#241713] bg-[#241713] text-[#fff6ef]"
                        : "border-[#eaded4] bg-white text-[#241713]"
                    }`}
                  >
                    {item}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiDualMerchHero: React.FC<HeroVariantProps> = (props) => {
  const cards = (props.highlights || []).slice(0, 3);
  const leadImage = props.backgroundImage || props.panel.image || "";

  return (
    <section className="bg-[linear-gradient(180deg,#fffdf8_0%,#f4ece4_44%,#fffdf8_100%)] py-14 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.96fr_1.04fr]">
          <div className="space-y-5 rounded-[1.9rem] border border-[#eaded4] bg-white/94 p-5 shadow-[0_30px_92px_-68px_rgba(47,34,24,0.24)] md:p-6">
            {props.eyebrow ? (
              <span className="inline-flex rounded-full border border-[#e8d9cc] bg-[#fff6ee] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#7b4e33]">
                {props.eyebrow}
              </span>
            ) : null}
            <h1 className="font-heading text-[2.6rem] font-black leading-[0.96] tracking-tight text-[#241713] md:text-[4rem]">
              {props.title}
            </h1>
            <p className="text-sm leading-7 text-[#6f5b51] md:text-base">
              {props.subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex items-center justify-center rounded-full bg-[#241713] px-6 py-3 text-sm font-black text-[#fff6ef]",
              )}
              {renderHeroAction(
                props.secondaryHref || props.primaryHref,
                props.secondaryCtaText,
                "inline-flex items-center justify-center rounded-full border border-[#eaded4] bg-white px-6 py-3 text-sm font-black text-[#241713]",
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="relative overflow-hidden rounded-[2rem] bg-[#f7efe8] shadow-[0_34px_96px_-70px_rgba(47,34,24,0.28)]">
              {leadImage ? (
                <img
                  src={leadImage}
                  alt={props.title}
                  className="h-full min-h-[24rem] w-full object-cover"
                />
              ) : null}
            </div>

            <div className="grid gap-3">
              {cards.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className={`rounded-[1.45rem] border px-4 py-4 shadow-[0_18px_42px_-34px_rgba(47,34,24,0.18)] ${
                    index === 0
                      ? "border-[#241713] bg-[#241713] text-[#fff6ef]"
                      : "border-[#eaded4] bg-white text-[#241713]"
                  }`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.2em] ${index === 0 ? "text-[#f6cf9f]" : "text-[#8f7668]"}`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-2 text-lg font-black">{item.value}</p>
                  <p
                    className={`mt-2 text-sm leading-6 ${index === 0 ? "text-[#f7e9d9]/78" : "text-[#6f5b51]"}`}
                  >
                    {index === 0
                      ? props.panel.subtitle ||
                        "كتلة بيع تقود المستخدم للمنتج أو المجموعة أو الهدية بسرعة."
                      : props.panel.note || "مسار بيع أوضح بدون تخمة بصرية."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiPromoCascadeHero: React.FC<HeroVariantProps> = (props) => {
  const panels = (props.highlights || []).slice(0, 4);

  return (
    <section className="bg-[linear-gradient(135deg,#1d1713_0%,#3a2d22_52%,#7d4f2e_100%)] py-14 text-white md:py-18">
      <div className="container px-4 md:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.98fr_1.02fr]">
          <div className="space-y-5 rounded-[2rem] border border-white/12 bg-white/[0.06] p-5 backdrop-blur md:p-6">
            {props.eyebrow ? (
              <span className="inline-flex rounded-full border border-[#f4d6ad]/30 bg-[#f4d6ad]/14 px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#f8d9aa]">
                {props.eyebrow}
              </span>
            ) : null}
            <h1 className="font-heading text-[2.8rem] font-black leading-[0.94] tracking-tight md:text-[4.2rem]">
              {props.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-white/76 md:text-base">
              {props.subtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex items-center justify-center rounded-full bg-[#f4d6ad] px-6 py-3 text-sm font-black text-[#221813]",
              )}
              {renderHeroAction(
                props.secondaryHref || props.primaryHref,
                props.secondaryCtaText,
                "inline-flex items-center justify-center rounded-full border border-white/16 bg-white/[0.06] px-6 py-3 text-sm font-black text-white",
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {panels.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={`rounded-[1.6rem] border p-5 shadow-[0_26px_72px_-48px_rgba(0,0,0,0.35)] ${
                  index === 0
                    ? "border-[#f4d6ad]/35 bg-[#f4d6ad] text-[#221813] sm:col-span-2"
                    : "border-white/12 bg-white/[0.06] text-white"
                }`}
              >
                <p
                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${index === 0 ? "text-[#6c4327]" : "text-white/60"}`}
                >
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-black">{item.value}</p>
                <p
                  className={`mt-2 text-sm leading-6 ${index === 0 ? "text-[#5b3b26]" : "text-white/72"}`}
                >
                  {index === 0
                    ? props.panel.title ||
                      "أقوى عرض أو فئة يجب أن تظهر أولًا قبل باقي المسارات."
                    : props.panel.note ||
                      "لوحة بيع قابلة للاستخدام للعروض أو الفئات أو التجميعات."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiUtilityStageHero: React.FC<HeroVariantProps> = (props) => {
  const quickRoutes = (props.highlights || []).slice(0, 4);
  const leadImage = props.panel.image || props.backgroundImage || "";

  return (
    <section className="bg-[linear-gradient(180deg,#fffef9_0%,#f2ead8_30%,#f8fafc_100%)] py-14 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="grid gap-5 rounded-[2rem] border border-[#dfe4ea] bg-white/96 p-5 shadow-[0_34px_100px_-74px_rgba(31,36,44,0.28)] lg:grid-cols-[1.04fr_0.96fr] lg:p-7">
          <div className="space-y-5">
            {props.eyebrow ? (
              <span className="inline-flex rounded-full border border-[#1f242c]/12 bg-[#1f242c] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#fff1b8]">
                {props.eyebrow}
              </span>
            ) : null}
            <h1 className="font-heading text-[2.7rem] font-black leading-[0.95] tracking-tight text-[#1f242c] md:text-[4rem]">
              {props.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[#4c5563] md:text-base">
              {props.subtitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickRoutes.map((item) => (
                <span
                  key={`${item.label}-${item.value}`}
                  className="rounded-full border border-[#1f242c]/10 bg-[#fff6d9] px-4 py-2 text-xs font-black text-[#1f242c]"
                >
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex items-center justify-center rounded-full bg-[#1f242c] px-6 py-3 text-sm font-black text-[#fff4d1]",
              )}
              {renderHeroAction(
                props.secondaryHref || props.primaryHref,
                props.secondaryCtaText,
                "inline-flex items-center justify-center rounded-full border border-[#1f242c]/12 bg-white px-6 py-3 text-sm font-black text-[#1f242c]",
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="relative overflow-hidden rounded-[1.8rem] bg-[#f4edd7]">
              {leadImage ? (
                <img
                  src={leadImage}
                  alt={props.title}
                  className="h-full min-h-[22rem] w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-x-4 bottom-4 rounded-[1.3rem] bg-[#1f242c] px-4 py-4 text-[#fff4d1]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#facc15]">
                  {props.panel.eyebrow || "decision lane"}
                </p>
                <p className="mt-2 text-lg font-black">
                  {props.panel.title ||
                    "ابدأ من الفئة أو الاستخدام أو العرض الأنسب"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#fff4d1]/76">
                  {props.panel.subtitle ||
                    "معيار شراء أوضح وتفاصيل أقرب للحسم من أول شاشة."}
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                props.panel.note,
                props.panel.metricValue,
                props.panel.metricLabel,
              ]
                .filter(Boolean)
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className={`rounded-[1.2rem] border px-4 py-4 text-sm font-bold ${
                      index === 1
                        ? "border-[#facc15]/30 bg-[#fff4d1] text-[#1f242c]"
                        : "border-[#dfe4ea] bg-white text-[#4c5563]"
                    }`}
                  >
                    {item}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiSoftDepartmentsHero: React.FC<HeroVariantProps> = (props) => {
  const routes = (props.highlights || []).slice(0, 4);
  const leadImage = props.backgroundImage || props.panel.image || "";

  return (
    <section className="bg-[linear-gradient(180deg,#fdfcf9_0%,#edf5ef_34%,#fdfcf9_100%)] py-14 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="grid gap-5 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
          <div className="space-y-5">
            {props.eyebrow ? (
              <span className="inline-flex rounded-full border border-[#d8e6d8] bg-white px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#43604b]">
                {props.eyebrow}
              </span>
            ) : null}
            <h1 className="font-heading text-[2.8rem] font-black leading-[0.95] tracking-tight text-[#203528] md:text-[4.2rem]">
              {props.title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[#56715e] md:text-base">
              {props.subtitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {routes.map((item) => (
                <span
                  key={`${item.label}-${item.value}`}
                  className="rounded-full border border-[#d8e6d8] bg-white px-4 py-2 text-xs font-black text-[#203528]"
                >
                  {item.value}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "inline-flex items-center justify-center rounded-full bg-[#203528] px-6 py-3 text-sm font-black text-[#f4fbf5]",
              )}
              {renderHeroAction(
                props.secondaryHref || props.primaryHref,
                props.secondaryCtaText,
                "inline-flex items-center justify-center rounded-full border border-[#d8e6d8] bg-white px-6 py-3 text-sm font-black text-[#203528]",
              )}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#d8e6d8] bg-white p-3 shadow-[0_34px_100px_-74px_rgba(32,53,40,0.22)]">
            {leadImage ? (
              <img
                src={leadImage}
                alt={props.title}
                className="h-[24rem] w-full rounded-[1.4rem] object-cover md:h-[28rem]"
              />
            ) : null}
            <div className="absolute inset-x-7 bottom-7 rounded-[1.3rem] bg-white/94 px-4 py-4 shadow-[0_18px_48px_-38px_rgba(32,53,40,0.22)] backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6b8a74]">
                {props.panel.eyebrow || "care route"}
              </p>
              <p className="mt-2 text-lg font-black text-[#203528]">
                {props.panel.title ||
                  "مسارات أقرب للعناية أو الاستخدام اليومي أو الهدية"}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#56715e]">
                {props.panel.subtitle ||
                  "اكتشاف أسرع من غير تخمة بصرية أو أقسام متزاحمة."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiOrganicHarvestHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image || "";
  const detailImage = props.panel.image || props.backgroundImage || "";
  const routes = (props.highlights || []).slice(0, 3);

  return (
    <section className="overflow-hidden border-b border-[#e6ddcf] bg-[#faf7f1] py-5 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden border border-[#e4d8c8] bg-white shadow-[0_26px_72px_-58px_rgba(48,61,32,0.24)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,0.74fr)_minmax(0,1.26fr)]">
            <div className="order-2 flex flex-col justify-center gap-5 px-5 py-7 text-start md:px-8 md:py-9 lg:order-1 lg:px-10 lg:py-12">
              {props.eyebrow ? (
                <span className="inline-flex w-fit text-[10px] font-black uppercase tracking-[0.26em] text-[#9d6f42] md:text-[11px]">
                  {props.eyebrow}
                </span>
              ) : null}

              <div className="space-y-3">
                <h1 className="font-heading text-[2.2rem] font-semibold leading-[0.98] tracking-tight text-[#24311f] sm:text-[2.55rem] md:text-[3.55rem] lg:text-[4.2rem]">
                  {props.title}
                </h1>
                <p className="max-w-[31rem] text-sm leading-7 text-[#5f6957] md:text-[15px] md:leading-8">
                  {props.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-[0.75rem] bg-[#24311f] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-[#192016]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-[0.75rem] border border-[#ddd0bf] bg-white px-6 py-3 text-sm font-black text-[#5b4d3f] transition-colors hover:border-[#d39c4d] hover:text-[#8c5d1e]",
                )}
              </div>

              {routes.length ? (
                <div className="hidden flex-wrap gap-2 pt-1 md:flex">
                  {routes.map((item) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="inline-flex rounded-[0.7rem] border border-[#e9dece] bg-[#fff9f2] px-3.5 py-2 text-[10px] font-black tracking-[0.16em] text-[#6c5b49]"
                    >
                      {item.value}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="order-1 relative min-h-[18rem] overflow-hidden border-b border-[#eadfcd] bg-[linear-gradient(180deg,#f6efe3_0%,#fcfaf6_100%)] lg:order-2 lg:min-h-[34rem] lg:border-b-0 lg:border-s">
              <div className="absolute inset-0">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={props.title}
                    className="h-full w-full object-cover object-center"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(251,247,241,0.08)_0%,rgba(251,247,241,0.02)_24%,rgba(36,49,31,0.16)_100%)] lg:bg-[linear-gradient(90deg,rgba(251,247,241,0.12)_0%,rgba(251,247,241,0)_36%,rgba(36,49,31,0.18)_100%)]" />
              </div>

              <div className="absolute start-4 top-4 z-10 max-w-[12rem] rounded-[0.85rem] border border-white/80 bg-white/92 px-3.5 py-3 shadow-[0_20px_44px_-30px_rgba(45,59,39,0.22)] backdrop-blur md:start-6 md:top-6 md:max-w-[14rem] md:px-4 md:py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#bf7a25]">
                  {props.panel.eyebrow || "fresh delivery"}
                </p>
                <p className="mt-2 font-heading text-[1.05rem] font-semibold leading-tight text-[#24311f] md:text-[1.2rem]">
                  {props.panel.title || props.title}
                </p>
                {props.panel.subtitle ? (
                  <p className="mt-2 text-[11px] leading-5 text-[#67705e] md:text-xs md:leading-6">
                    {props.panel.subtitle}
                  </p>
                ) : null}
                {props.panel.metricValue ? (
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-[1.2rem] font-black text-[#24311f] md:text-[1.35rem]">
                      {props.panel.metricValue}
                    </span>
                    <span className="pb-0.5 text-[11px] font-bold text-[#8b7d6d]">
                      {props.panel.metricLabel}
                    </span>
                  </div>
                ) : null}
              </div>

              {detailImage ? (
                <div className="absolute bottom-4 end-4 hidden w-[12.5rem] overflow-hidden rounded-[0.9rem] border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(45,59,39,0.18)] backdrop-blur md:block md:bottom-6 md:end-6">
                  <img
                    src={detailImage}
                    alt={props.panel.title || props.title}
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </div>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 z-10 hidden border-t border-white/35 bg-[rgba(248,243,233,0.94)] px-5 py-3 backdrop-blur md:block md:px-8">
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-black tracking-[0.18em] text-[#6c5b49]">
                  {routes.map((item, index) => (
                    <React.Fragment key={`${item.label}-${item.value}`}>
                      {index > 0 ? <span className="opacity-35">/</span> : null}
                      <span>{item.value}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};



const ElessiPlantSliderHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image || "";
  const detailImage = props.panel.image || props.backgroundImage || "";
  const routeChips = props.highlights.slice(0, 3);

  return (
    <section className="overflow-hidden bg-[#f8f7f1] py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="relative overflow-hidden border border-[#dfe7de] bg-[#fffefb] shadow-[0_34px_96px_-78px_rgba(33,59,45,0.2)]">
          <div className="pointer-events-none absolute inset-x-[8%] bottom-0 h-[24%] bg-[repeating-linear-gradient(90deg,rgba(208,218,208,0.32)_0px,rgba(208,218,208,0.32)_1px,transparent_1px,transparent_104px)] opacity-75" />
          <div className="pointer-events-none absolute left-[7%] top-[10%] h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(225,234,223,0.88),rgba(225,234,223,0)_70%)] blur-3xl" />
          <div className="pointer-events-none absolute right-[18%] top-[18%] h-40 w-40 rounded-full border border-[#d7e4d4]/80" />

          <div className="relative grid gap-6 px-5 py-6 md:px-7 md:py-7 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:px-10 lg:py-10">
            <div className="order-1 flex min-h-[17rem] items-end justify-center lg:min-h-[31rem]">
              <div className="relative w-full max-w-[44rem]">
                <div className="overflow-hidden rounded-[2rem] border border-[#e4ece2] bg-[linear-gradient(180deg,#fdfdfa_0%,#f4f7f1_100%)] px-4 pb-3 pt-6 shadow-[0_28px_80px_-64px_rgba(33,59,45,0.2)] sm:px-6 lg:px-10 lg:pb-6 lg:pt-8">
                  {heroImage ? (
                    <img
                      src={heroImage}
                      alt={props.title}
                      className="relative z-10 mx-auto max-h-[17rem] w-full object-contain sm:max-h-[22rem] lg:max-h-[27rem]"
                    />
                  ) : null}
                </div>

                <div className="absolute bottom-3 left-3 z-20 hidden max-w-[15rem] overflow-hidden rounded-[1.4rem] border border-[#dde7da] bg-white/96 shadow-[0_20px_48px_-32px_rgba(33,59,45,0.24)] backdrop-blur sm:block lg:bottom-5 lg:left-5">
                  {detailImage ? (
                    <img
                      src={detailImage}
                      alt={props.panel.title || props.title}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : null}
                  <div className="space-y-2 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7d946c]">
                      {props.panel.eyebrow || "Indoor pick"}
                    </p>
                    <p className="font-heading text-[1.05rem] font-semibold leading-6 text-[#254232]">
                      {props.panel.title || props.title}
                    </p>
                    {props.panel.subtitle ? (
                      <p className="text-xs leading-6 text-[#6d7b6f]">
                        {props.panel.subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-2 space-y-5 text-start lg:max-w-[30rem]">
              {props.eyebrow ? (
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#8f998a] md:text-[11px]">
                  {props.eyebrow}
                </p>
              ) : null}

              <h1 className="font-heading text-[2.45rem] font-semibold leading-[0.96] tracking-tight text-[#52614d] sm:text-[2.9rem] md:text-[4.25rem]">
                {props.title}
              </h1>

              <p className="max-w-[29rem] text-sm leading-7 text-[#7e8a7d] md:text-base md:leading-8">
                {props.subtitle}
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-[1rem] bg-[#7d9f38] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-[#6e8b31]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-[1rem] border border-[#d9e4d6] bg-white px-6 py-3 text-sm font-black text-[#284233] transition-colors hover:border-[#7d9f38]",
                )}
              </div>

              {routeChips.length ? (
                <div className="hidden flex-wrap gap-2 pt-2 md:flex">
                  {routeChips.map((item) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="inline-flex rounded-full border border-[#dde7da] bg-[#fbfcf8] px-4 py-2 text-[11px] font-black tracking-[0.16em] text-[#6b7b6c]"
                    >
                      {item.value}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative flex items-center justify-center gap-2 pb-4 pt-1">
            <span className="h-2.5 w-9 rounded-full bg-[#788172]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d8ddd4]" />
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiBikeHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image || "";
  const detailImage = props.panel.image || props.backgroundImage || "";
  const routeChips = props.highlights.slice(0, 3);

  return (
    <section className="overflow-hidden border-b border-[#e3e7eb] bg-white py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden border border-[#e3e7eb] bg-white">
          <div className="grid lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
            <div className="order-2 flex flex-col justify-center gap-5 px-6 py-7 text-start md:px-10 md:py-14 lg:order-1 lg:gap-6">
              {props.eyebrow ? (
                <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.28em] text-[#7d8894]">
                  {props.eyebrow}
                </span>
              ) : null}

              <div className="space-y-4">
                <h1 className="font-heading text-[2.3rem] font-semibold leading-[1.03] tracking-tight text-[#1d2a33] sm:text-[2.8rem] md:text-[4.7rem]">
                  {props.title}
                </h1>
                <p className="max-w-[32rem] text-sm leading-7 text-[#60717f] md:text-base md:leading-8">
                  {props.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-[0.7rem] bg-[#1d2a33] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#121d24]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-[0.7rem] border border-[#d9dee4] bg-white px-7 py-3 text-sm font-black text-[#31414d] transition-colors hover:border-[#d97706] hover:text-[#b45309]",
                )}
              </div>

              {routeChips.length ? (
                <div className="hidden flex-wrap gap-2 pt-1 md:flex">
                  {routeChips.map((item) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="inline-flex rounded-full border border-[#e3e7eb] bg-[#f8fafb] px-4 py-2 text-[11px] font-bold tracking-[0.16em] text-[#60717f]"
                    >
                      {item.value}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="order-1 relative min-h-[18rem] overflow-hidden border-b border-[#e3e7eb] bg-[#f7f9fb] lg:order-2 lg:min-h-[34rem] lg:border-b-0 lg:border-s">
              <div className="absolute inset-0">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={props.title}
                    className="h-full w-full object-cover object-center"
                  />
                ) : null}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(247,249,251,0.24)_0%,rgba(247,249,251,0)_34%,rgba(29,42,51,0.08)_100%)]" />
              </div>

              <div className="absolute bottom-4 left-4 z-10 max-w-[15rem] border border-white/80 bg-white/92 px-4 py-4 shadow-[0_20px_44px_-30px_rgba(18,34,48,0.22)] backdrop-blur md:bottom-8 md:left-8">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#d97706]">
                  {props.panel.eyebrow || "Ready to ride"}
                </p>
                <p className="mt-2 font-heading text-[1.2rem] font-semibold leading-tight text-[#1d2a33]">
                  {props.panel.title || props.title}
                </p>
                {props.panel.subtitle ? (
                  <p className="mt-2 text-xs leading-6 text-[#60717f]">
                    {props.panel.subtitle}
                  </p>
                ) : null}
                {props.panel.metricValue ? (
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-[1.35rem] font-black text-[#1d2a33]">
                      {props.panel.metricValue}
                    </span>
                    <span className="pb-0.5 text-[11px] font-bold text-[#7d8894]">
                      {props.panel.metricLabel}
                    </span>
                  </div>
                ) : null}
              </div>

              {detailImage ? (
                <div className="absolute bottom-5 right-5 hidden w-[12rem] overflow-hidden border border-white/80 bg-white/90 shadow-[0_18px_40px_-28px_rgba(18,34,48,0.18)] backdrop-blur md:block">
                  <img
                    src={detailImage}
                    alt={props.panel.title || props.title}
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CenteredHero: React.FC<HeroVariantProps> = (props) => (
  <section className="py-32 text-center bg-background">
    <div className="container max-w-4xl space-y-10">
      <h1 className="text-6xl font-black tracking-tight">{props.title}</h1>
      <p className="text-xl text-muted-foreground">{props.subtitle}</p>
      {renderHeroAction(
        props.primaryHref,
        props.ctaText || "تسوّق الآن",
        "bg-primary text-primary-foreground px-10 py-4 rounded-full font-bold text-lg inline-block",
      )}
    </div>
  </section>
);

/* Soft Graceful — full-bleed image banner with centered title + breadcrumb
   (matches the Texture collections/journal page header). */
const GracefulBannerHero: React.FC<HeroVariantProps> = (props) => (
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

const ElessiDigitalLaunchHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const detailImage = props.panel.image || props.backgroundImage;
  const leadHighlights = props.highlights.slice(0, 3);

  return (
    <section className="overflow-hidden bg-white py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden border border-[#e4e9f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_100%)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="flex flex-col justify-center gap-6 px-6 py-8 text-start md:px-10 md:py-12">
              {props.eyebrow ? (
                <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.28em] text-[#7a8595]">
                  {props.eyebrow}
                </span>
              ) : null}

              <div className="space-y-4">
                <h1 className="font-heading text-[2.8rem] font-semibold leading-[0.98] tracking-tight text-[#161c26] md:text-[4.65rem]">
                  {props.title}
                </h1>
                <p className="max-w-[34rem] text-sm leading-8 text-[#536172] md:text-base">
                  {props.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] items-center justify-center bg-[#161c26] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#0d1219]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center border border-[#d8dee8] bg-white px-7 py-3 text-sm font-black text-[#243042] transition-colors hover:border-[#f59e0b] hover:text-[#b45309]",
                )}
              </div>

              {leadHighlights.length ? (
                <div className="space-y-3 border-t border-[#e4e9f0] pt-4">
                  {leadHighlights.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="flex items-center gap-3 text-sm font-semibold text-[#516170]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                      {item.value}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative min-h-[21rem] overflow-hidden border-t border-[#e4e9f0] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(241,245,249,0.92)_56%,rgba(226,232,240,0.78))] lg:min-h-[34rem] lg:border-s lg:border-t-0">
              <div className="absolute inset-0">
                {heroImage ? (
                  <img
                    src={heroImage}
                    alt={props.title}
                    className="h-full w-full object-cover opacity-[0.14]"
                  />
                ) : null}
              </div>
              <div className="absolute inset-x-[16%] top-[10%] h-[58%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.98),rgba(255,255,255,0.76)_52%,rgba(255,255,255,0)_78%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0)_0%,rgba(148,163,184,0.08)_100%)]" />
              <div className="relative z-10 flex h-full items-end justify-center px-6 py-8 md:px-10 md:py-12">
                {detailImage ? (
                  <img
                    src={detailImage}
                    alt={props.panel.title || props.title}
                    className="max-h-[18rem] w-full max-w-[30rem] object-contain drop-shadow-[0_28px_56px_rgba(15,23,42,0.18)] md:max-h-[27rem]"
                  />
                ) : null}
              </div>
              <div className="absolute right-5 top-5 hidden max-w-[14rem] border-l border-[#dce3ec] ps-5 text-right md:block md:right-8 md:top-8">
                <p className="text-sm font-semibold text-[#243042]">
                  {props.panel.title || props.title}
                </p>
                {props.panel.subtitle ? (
                  <p className="mt-2 text-sm leading-6 text-[#607184]">
                    {props.panel.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="absolute bottom-5 right-5 border border-[#dce3ec] bg-white/94 px-4 py-3 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.14)] md:bottom-8 md:right-8">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7a8595]">
                  {props.panel.metricLabel || "Ready to ship"}
                </p>
                <p className="mt-2 text-lg font-black text-[#161c26]">
                  {props.panel.metricValue || "48H"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiBagHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const detailImage = props.panel.image || props.backgroundImage;
  const routeChips = props.highlights.slice(0, 3);

  return (
    <section className="bg-[#f7f5f2] py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden border border-[#d9d2ca] bg-[#fcfbf8] shadow-[0_32px_96px_-82px_rgba(40,32,26,0.14)]">
          <div className="grid lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
            <div className="order-2 flex flex-col justify-center gap-5 px-5 py-6 text-start md:px-8 md:py-8 lg:order-2 lg:gap-6 lg:px-10 lg:py-12">
              {props.eyebrow ? (
                <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.24em] text-[#927256]">
                  {props.eyebrow}
                </span>
              ) : null}

              <div className="space-y-4">
                <h1 className="font-heading text-[2.2rem] font-semibold leading-[0.94] tracking-tight text-[#18110d] sm:text-[2.5rem] md:text-[3.2rem] lg:text-[4.65rem]">
                  {props.title}
                </h1>
                <p className="max-w-[32rem] text-sm leading-7 text-[#65544b] md:text-base md:leading-8">
                  {props.subtitle}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] w-full items-center justify-center rounded-[0.55rem] bg-[#18110d] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#090705]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] w-full items-center justify-center rounded-[0.55rem] border border-[#d7cbc0] bg-transparent px-7 py-3 text-sm font-black text-[#3a2a23] transition-colors hover:border-[#b68a69] hover:text-[#7a5335]",
                )}
              </div>

              {routeChips.length ? (
                <div className="hidden border-t border-[#e3d7cd] pt-4 md:grid md:gap-3 lg:grid-cols-3">
                  {routeChips.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="space-y-2 border-s border-[#d8ccc1] pe-3 text-sm text-[#5f4c43]"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9a755b]">
                        {item.label}
                      </p>
                      <p className="font-semibold leading-6 text-[#1f1713]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="order-1 relative min-h-[15rem] overflow-hidden border-b border-[#e3d7cd] bg-[linear-gradient(180deg,#fbfaf7_0%,#f3efe9_100%)] md:min-h-[18rem] lg:order-1 lg:min-h-[34rem] lg:border-b-0 lg:border-e">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_54%_24%,rgba(255,255,255,0.98),rgba(255,255,255,0)_40%)]" />
              <div className="absolute inset-x-[10%] top-[12%] h-[56%] rounded-[999px] border border-[#d8ccc1] md:inset-x-[14%] md:top-[14%]" />
              <div className="absolute left-[17%] top-[25%] hidden h-[28%] w-[18%] rounded-[999px] border border-[#e4d8ce] bg-white/30 lg:block" />
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={props.title}
                  className="absolute bottom-0 left-[1%] hidden h-[56%] w-auto max-w-[38%] object-contain opacity-22 mix-blend-multiply md:block md:h-[62%]"
                />
              ) : null}
              <div className="absolute right-5 top-4 text-[10px] font-black uppercase tracking-[0.22em] text-[#ab7f5f] md:right-8 md:top-8">
                {props.panel.eyebrow || "Selected accessories"}
              </div>
              <div className="relative z-10 flex h-full items-center justify-center px-6 py-7 md:px-10 md:py-12">
                {detailImage ? (
                  <img
                    src={detailImage}
                    alt={props.panel.title || props.title}
                    className="max-h-[11rem] w-full max-w-[11rem] object-contain drop-shadow-[0_36px_82px_rgba(61,44,34,0.2)] mix-blend-multiply md:max-h-[16rem] md:max-w-[16rem] lg:max-h-[28rem] lg:max-w-[24rem]"
                  />
                ) : null}
              </div>
              <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 border-t border-[#d7c9be] pt-2 text-right md:inset-x-8 md:bottom-8 md:gap-5 md:pt-3">
                <div className="max-w-[12rem] md:max-w-[14rem]">
                  <p className="font-heading text-[1rem] font-semibold leading-tight text-[#18110d] md:text-[1.2rem]">
                    {props.panel.title || props.title}
                  </p>
                  {props.panel.subtitle ? (
                    <p className="mt-1 hidden text-xs leading-6 text-[#6a5850] md:block">
                      {props.panel.subtitle}
                    </p>
                  ) : null}
                </div>
                {props.panel.metricValue ? (
                  <div className="shrink-0 text-left">
                    <span className="text-[1.15rem] font-black text-[#18110d] md:text-[1.4rem]">
                      {props.panel.metricValue}
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8c6a53]">
                      {props.panel.metricLabel}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiBeautyRitualHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image || "";
  const detailImage = props.panel.image || props.backgroundImage || "";
  const ritualSteps = props.highlights.slice(0, 3);

  return (
    <section className="bg-[linear-gradient(180deg,#fffafb_0%,#fcf4f7_50%,#fffafb_100%)] py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden border border-[#ead7df] bg-[linear-gradient(180deg,#fffdfd_0%,#fff7fa_58%,#fffdfd_100%)] shadow-[0_30px_96px_-82px_rgba(109,66,85,0.12)]">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
            <div className="order-1 relative min-h-[16rem] overflow-hidden border-b border-[#ecd8df] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(252,240,245,0.94)_58%,rgba(244,223,231,0.86))] md:min-h-[18rem] lg:min-h-[34rem] lg:border-b-0 lg:border-s">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(255,255,255,0.98),rgba(255,255,255,0)_42%)]" />
              <div className="absolute left-[10%] top-[10%] h-[62%] w-[78%] rounded-[2.4rem] border border-[#ead6de] bg-white/18" />
              <div className="absolute left-[12%] top-[18%] h-[24%] w-[18%] rounded-[999px] border border-[#efdbe4] bg-white/26" />
              <div className="absolute right-[8%] top-[6%] text-[6.5rem] font-semibold leading-none text-[#f5d5e3]/72 md:text-[8rem] lg:text-[11rem]">
                G
              </div>
              {heroImage ? (
                <div className="absolute bottom-5 right-5 hidden w-[10rem] overflow-hidden rounded-[1.55rem] border border-white/78 bg-white/90 shadow-[0_22px_48px_-34px_rgba(104,62,83,0.16)] md:block md:bottom-8 md:right-8">
                  <img
                    src={heroImage}
                    alt={props.panel.title || props.title}
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="relative z-10 flex h-full items-center justify-center px-6 py-7 md:px-8 md:py-10">
                {detailImage ? (
                  <img
                    src={detailImage}
                    alt={props.panel.title || props.title}
                    className="max-h-[12rem] w-full max-w-[9rem] object-contain drop-shadow-[0_34px_72px_rgba(96,59,78,0.18)] mix-blend-multiply md:max-h-[18rem] md:max-w-[12rem] lg:max-h-[27rem] lg:max-w-[15rem]"
                  />
                ) : null}
              </div>
              <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-4 border-t border-[#e6d3dc] pt-3 md:inset-x-8 md:bottom-8">
                <div className="max-w-[12rem] md:max-w-[14rem]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b15f85]">
                    {props.panel.eyebrow || "Glow picks"}
                  </p>
                  <p className="mt-2 font-heading text-[1rem] font-semibold leading-tight text-[#341f2b] md:text-[1.2rem]">
                    {props.panel.title || "درجة اليوم أو الهدية على رف واحد"}
                  </p>
                  {props.panel.subtitle ? (
                    <p className="mt-2 hidden text-xs leading-6 text-[#7b6570] md:block">
                      {props.panel.subtitle}
                    </p>
                  ) : null}
                </div>
                {props.panel.metricValue ? (
                  <div className="shrink-0 rounded-full border border-[#eed9e3] bg-white/84 px-4 py-2 text-sm font-black text-[#8f496d]">
                    {props.panel.metricValue}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="order-2 flex flex-col justify-center gap-5 px-5 py-6 md:px-8 md:py-8 lg:gap-6 lg:px-10 lg:py-12">
              {props.eyebrow ? (
                <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.24em] text-[#b15f85]">
                  {props.eyebrow}
                </span>
              ) : null}

              <div className="space-y-4">
                <h1 className="font-heading text-[2.2rem] font-semibold leading-[0.95] tracking-tight text-[#341f2b] sm:text-[2.5rem] md:text-[3.3rem] lg:text-[4.55rem]">
                  {props.title}
                </h1>
                <p className="max-w-[30rem] text-sm leading-7 text-[#725f69] md:text-base md:leading-8">
                  {props.subtitle}
                </p>
              </div>

              {ritualSteps.length ? (
                <div className="hidden flex-wrap gap-2 border-t border-[#ead8df] pt-4 md:flex">
                  {ritualSteps.map((item, index) => (
                    <span
                      key={`${item.label}-${item.value}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ecd7df] bg-white/84 px-4 py-2 text-[11px] font-black tracking-[0.14em] text-[#7f5c6d]"
                    >
                      <span className="text-[#c45f8b]">{index + 1}</span>
                      <span>{item.value}</span>
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-[#341f2b] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#21131b]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-[#e1ced7] bg-white px-7 py-3 text-sm font-black text-[#5a3d4b] transition-colors hover:border-[#d06f98] hover:text-[#9f4d75]",
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiGarageCommandHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image || "";
  const quickRoutes = props.highlights.slice(0, 3);

  return (
    <section className="bg-[linear-gradient(180deg,#fbf7f2_0%,#f3ece5_46%,#fbf7f2_100%)] py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden border border-[#ddcfc3] bg-white">
          <div className="grid lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)]">
            <div className="relative min-h-[20rem] overflow-hidden border-b border-[#e6dad0] bg-[#f3ece5] lg:min-h-[34rem] lg:border-b-0 lg:border-e">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={props.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,18,18,0.08)_0%,rgba(18,18,18,0)_42%,rgba(18,18,18,0.22)_100%)]" />
              <div className="absolute bottom-5 left-5 rounded-full bg-[#f97316] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_38px_-24px_rgba(249,115,22,0.72)] md:bottom-8 md:left-8">
                {props.panel.eyebrow || "Fitment first"}
              </div>
            </div>

            <div className="flex flex-col justify-center gap-6 px-6 py-8 md:px-10 md:py-12">
              {props.eyebrow ? (
                <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.28em] text-[#9c6540]">
                  {props.eyebrow}
                </span>
              ) : null}

              <div className="space-y-4">
                <h1 className="font-heading text-[2.65rem] font-semibold leading-[1.01] tracking-tight text-[#241814] md:text-[4.35rem]">
                  {props.title}
                </h1>
                <p className="max-w-[30rem] text-sm leading-8 text-[#6a5950] md:text-base">
                  {props.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#241814] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#130d0b]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#ddcfc3] bg-white px-7 py-3 text-sm font-black text-[#3c2a22] transition-colors hover:border-[#f97316] hover:text-[#c25e18]",
                )}
              </div>

              {quickRoutes.length ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {quickRoutes.map((item) => (
                    <div
                      key={`${item.label}-${item.value}`}
                      className="rounded-[1rem] border border-[#e6dad0] bg-[#faf5ef] px-4 py-3"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a36d47]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-black text-[#241814]">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {props.panel.title || props.panel.subtitle ? (
                <div className="border-t border-[#e6dad0] pt-4">
                  <p className="text-sm font-black text-[#241814]">
                    {props.panel.title ||
                      "ابدأ من نوع القطعة ثم ضيّق التوافق قبل الإضافة"}
                  </p>
                  {props.panel.subtitle ? (
                    <p className="mt-2 text-sm leading-7 text-[#6a5950]">
                      {props.panel.subtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiJewelSalonHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.panel.image || props.backgroundImage || "";
  const supportImage = props.backgroundImage || props.panel.image || "";
  const routeHighlights = props.highlights.slice(0, 3);
  const sideCards = [
    {
      label: props.panel.metricLabel || "التوصيل",
      value: props.panel.metricValue || "48 ساعة",
      description: props.panel.subtitle || "مسار بيع أهدأ لكن أوضح للحسم.",
    },
    {
      label: routeHighlights[0]?.label || "الأقسام",
      value: routeHighlights[0]?.value || "4",
      description: "ابدئي من خاتم، طقم، أو هدية جاهزة.",
    },
    {
      label: routeHighlights[1]?.label || "الإهداء",
      value: routeHighlights[1]?.value || "سريع",
      description:
        props.panel.title || "قطعة توقيع أو هدية لا تبعدك عن القرار.",
    },
  ];

  return (
    <section className="bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1e9_42%,#fffdfa_100%)] py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden rounded-[2.25rem] border border-[#eadfd4] bg-white/96 shadow-[0_36px_96px_-70px_rgba(58,39,33,0.18)]">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[11rem_minmax(0,0.82fr)_minmax(0,1fr)] lg:px-7 lg:py-7">
            <div className="order-3 grid gap-3 lg:order-1 lg:auto-rows-fr">
              {sideCards.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className={`rounded-[1.45rem] border px-4 py-4 ${
                    index === 0
                      ? "border-[#3b2722] bg-[#2b1b17] text-white"
                      : "border-[#eadfd4] bg-[#fffaf5] text-[#32231f]"
                  }`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.22em] ${index === 0 ? "text-[#f3cb98]" : "text-[#a37b67]"}`}
                  >
                    {item.label}
                  </p>
                  <p className="mt-3 text-[1.65rem] font-black leading-none">
                    {item.value}
                  </p>
                  <p
                    className={`mt-3 text-xs leading-6 ${index === 0 ? "text-white/76" : "text-[#7a6760]"}`}
                  >
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="order-2 relative overflow-hidden rounded-[1.9rem] bg-[linear-gradient(180deg,#f6eee6_0%,#fffdfa_100%)] lg:order-2">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={props.title}
                  className="h-full min-h-[16rem] w-full object-cover md:min-h-[23rem]"
                />
              ) : null}
              <div className="absolute inset-x-4 bottom-4 rounded-[1.2rem] border border-white/75 bg-white/88 px-4 py-4 shadow-[0_20px_40px_-28px_rgba(58,39,33,0.18)] backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a37b67]">
                  {props.panel.eyebrow || "مختارات التوقيع"}
                </p>
                <p className="mt-2 text-sm font-black text-[#32231f] md:text-base">
                  {props.panel.title || "ابدئي من خاتم توقيع أو هدية جاهزة"}
                </p>
              </div>
            </div>

            <div className="order-1 flex flex-col justify-center gap-5 px-1 lg:order-3 lg:px-2">
              {props.eyebrow ? (
                <span className="inline-flex w-fit rounded-full border border-[#eadfd4] bg-[#fffaf5] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#a37b67]">
                  {props.eyebrow}
                </span>
              ) : null}
              <h1 className="font-heading text-[2.8rem] font-semibold leading-[0.95] tracking-tight text-[#32231f] md:text-[4.55rem]">
                {props.title}
              </h1>
              <p className="max-w-[34rem] text-sm leading-8 text-[#7a6760] md:text-base">
                {props.subtitle}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {routeHighlights.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-[1.2rem] border border-[#eadfd4] bg-[#fffaf5] px-4 py-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a37b67]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-black text-[#32231f]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#32231f] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#1e1411]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#d8c9bd] bg-white px-7 py-3 text-sm font-black text-[#4d3931] transition-colors hover:border-[#caa27b] hover:text-[#8e6241]",
                )}
              </div>
              {supportImage ? (
                <div className="hidden overflow-hidden rounded-[1.4rem] border border-[#eadfd4] bg-[#fffaf5] lg:block">
                  <img
                    src={supportImage}
                    alt={props.panel.title || props.title}
                    className="h-28 w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ElessiPetSunroomHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image || "";
  const supportImage = props.panel.image || props.backgroundImage || "";
  const routeHighlights = props.highlights.slice(0, 3);

  return (
    <section className="bg-[linear-gradient(180deg,#fffdf9_0%,#f6efe3_38%,#fffdf9_100%)] py-6 md:py-8">
      <div className="container px-4 md:px-6">
        <div className="overflow-hidden rounded-[2.25rem] border border-[#e4d5c4] bg-white shadow-[0_36px_96px_-72px_rgba(71,47,34,0.2)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            <div className="order-2 relative min-h-[16rem] overflow-hidden bg-[linear-gradient(180deg,#f5e8d7_0%,#fffaf4_100%)] md:min-h-[22rem] lg:order-1 lg:min-h-[22rem]">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={props.title}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,244,0.18)_0%,rgba(255,250,244,0)_34%,rgba(28,20,15,0.18)_100%)]" />
              <div className="absolute bottom-5 left-5 max-w-[18rem] rounded-[1.35rem] border border-white/75 bg-white/90 px-4 py-4 shadow-[0_18px_42px_-28px_rgba(71,47,34,0.18)] backdrop-blur md:bottom-8 md:left-8">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#a8734e]">
                  {props.panel.eyebrow || "طلبات تتكرر"}
                </p>
                <p className="mt-2 text-sm font-black text-[#2f241e] md:text-base">
                  {props.panel.title ||
                    "ابدأ من الطعام أو اللعب أو العناية اليومية"}
                </p>
                {props.panel.subtitle ? (
                  <p className="mt-2 text-xs leading-6 text-[#6d5a4f] md:text-sm">
                    {props.panel.subtitle}
                  </p>
                ) : null}
              </div>
              {supportImage ? (
                <div className="absolute bottom-5 right-5 hidden w-[11rem] overflow-hidden rounded-[1.2rem] border border-white/75 bg-white/92 shadow-[0_16px_34px_-26px_rgba(71,47,34,0.16)] md:block">
                  <img
                    src={supportImage}
                    alt={props.panel.title || props.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ) : null}
            </div>

            <div className="order-1 flex flex-col justify-center gap-5 px-6 py-8 md:px-10 md:py-12 lg:order-2">
              {props.eyebrow ? (
                <span className="inline-flex w-fit rounded-full border border-[#e4d5c4] bg-[#fffaf4] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#a8734e]">
                  {props.eyebrow}
                </span>
              ) : null}
              <h1 className="font-heading text-[2.75rem] font-semibold leading-[0.98] tracking-tight text-[#2f241e] md:text-[4.45rem]">
                {props.title}
              </h1>
              <p className="max-w-[34rem] text-sm leading-8 text-[#6d5a4f] md:text-base">
                {props.subtitle}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {routeHighlights.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-[1.2rem] border border-[#e4d5c4] bg-[#fffaf4] px-4 py-3"
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a8734e]">
                      {item.label}
                    </p>
                    <p className="mt-2 text-sm font-black text-[#2f241e]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#2f241e] px-7 py-3 text-sm font-black text-white transition-colors hover:bg-[#1d1511]",
                )}
                {renderHeroAction(
                  props.secondaryHref || props.primaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#dbc8b3] bg-white px-7 py-3 text-sm font-black text-[#4a3930] transition-colors hover:border-[#d58d59] hover:text-[#a05a2c]",
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CinematicPlinthHero: React.FC<HeroVariantProps> = (props) => {
  const { theme } = useStorefrontTheme();
  const isRedLine =
    theme.id === 'redline-auto' ||
    Boolean(theme.tokens?.colors?.primary?.startsWith('0 84%'));
  const heroImage = props.backgroundImage || props.panel.image || '';
  const leadHighlights = props.highlights.slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-[#07080a] text-white">
      <div className="absolute inset-0">
        {heroImage ? (
          <StorefrontProductImage
            candidates={[heroImage]}
            alt={props.title}
            loading="eager"
            fetchpriority="high"
            decoding="async"
            requestedWidth={1280}
            responsiveWidths={[640, 960, 1280, 1600]}
            responsiveSizes="100vw"
            imageQuality={85}
            className="h-full w-full object-cover object-center"
          />
        ) : null}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,8,10,0.35)_0%,rgba(7,8,10,0.65)_40%,rgba(7,8,10,0.94)_100%)]" />
        {isRedLine ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(225,29,72,0.14),transparent_44%),radial-gradient(circle_at_bottom,rgba(225,29,72,0.22),transparent_54%)]" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_45%)]" />
        )}
      </div>

      {/* Main Asymmetric Hero Stage */}
      <div className="relative z-10 flex min-h-[32rem] sm:min-h-[38rem] lg:min-h-[44rem] items-center px-4 py-12 md:px-8 lg:px-12">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Editorial Text Content (Start / Right in RTL) */}
            <div className="lg:col-span-7 text-start space-y-6">
              {(props.eyebrow || props.panel.eyebrow) && (
                <span
                  className={`inline-flex border-b pb-1.5 text-[11px] font-bold uppercase tracking-[0.28em] ${
                    isRedLine
                      ? 'border-primary/60 text-primary drop-shadow-[0_2px_8px_rgba(225,29,72,0.4)]'
                      : 'border-white/30 text-white/80'
                  }`}
                >
                  {props.eyebrow || props.panel.eyebrow}
                </span>
              )}

              <h1 className="font-heading text-4xl sm:text-6xl lg:text-[4.25rem] font-black leading-[1.06] tracking-tight text-white drop-shadow-[0_16px_36px_rgba(0,0,0,0.6)] text-balance">
                {props.title}
              </h1>

              <p className="max-w-xl text-base sm:text-lg leading-relaxed text-white/85 text-pretty drop-shadow-sm">
                {props.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                {renderHeroAction(
                  props.primaryHref,
                  props.ctaText,
                  isRedLine
                    ? 'inline-flex items-center justify-center rounded-full border border-primary/50 bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-[0_14px_32px_-8px_rgba(225,29,72,0.7)] transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.97]'
                    : 'inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-bold text-black shadow-[0_16px_36px_-8px_rgba(255,255,255,0.3)] transition-all hover:bg-neutral-100 hover:scale-[1.02] active:scale-[0.97]',
                )}
                {renderHeroAction(
                  props.secondaryHref,
                  props.secondaryCtaText,
                  'inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40 active:scale-[0.97]',
                )}
              </div>
            </div>

            {/* Architectural Specimen Showcase Tile (Desktop End / Left in RTL) */}
            <div className="lg:col-span-5 hidden lg:flex flex-col justify-end items-end">
              <div className="rounded-2xl border border-white/15 bg-black/40 backdrop-blur-md p-6 max-w-sm text-start space-y-3 shadow-2xl">
                <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/60 block">
                  كولكشن 2026 الحصري
                </span>
                <p className="text-lg font-bold text-white tracking-tight">
                  شياكة وراحة لكل يوم
                </p>
                <p className="text-xs text-white/80 leading-relaxed">
                  خامات ممتازة وتقفيل مصري متقن يجمع بين أناقة المناسبات وعملية الاستخدام اليومي.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Docked Architectural Trust Bar */}
      {leadHighlights.length > 0 ? (
        <div className="relative z-10 border-t border-white/10 bg-black/50 backdrop-blur-md py-4">
          <div className="container mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-start divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-white/10">
              {leadHighlights.map((item, idx) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className={`flex items-center gap-3 ${idx > 0 ? 'pt-3 sm:pt-0 sm:pe-6' : ''}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
                  <div>
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/60">
                      {item.label}
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

const SpeedBannerHero: React.FC<HeroVariantProps> = (props) => {
  const heroImage = props.backgroundImage || props.panel.image;
  const highlights = (props.highlights || []).slice(0, 3);

  return (
    <section className="bg-[hsl(var(--background))] py-6 md:py-10">
      <div className="container px-4 md:px-6">
        <div className="relative overflow-hidden rounded-[1.5rem] border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_24px_54px_-32px_rgba(217,93,31,0.22)]">
          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')]" />
          
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] items-stretch">
            {/* Content Side */}
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
                  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-[hsl(var(--primary))] px-8 py-3 text-sm font-black text-[hsl(var(--primary-foreground))] shadow-[0_18px_40px_-14px_rgba(217,93,31,0.46)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                )}
                {renderHeroAction(
                  props.secondaryHref,
                  props.secondaryCtaText,
                  "inline-flex min-h-[48px] items-center justify-center rounded-full border-2 border-[hsl(var(--border))] bg-[hsl(var(--background))] px-8 py-3 text-sm font-black text-[hsl(var(--foreground))] transition-all hover:bg-[hsl(var(--secondary))] active:scale-[0.98]"
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

            {/* Image Side */}
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
              
              {/* Image Overlay Gradient */}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--card)/0.4)_0%,transparent_15%),linear-gradient(0deg,hsl(var(--card)/0.4)_0%,transparent_15%)]" />
              
              {/* Floating Badge on Image */}
              {props.panel.metricValue && (
                <div className="absolute bottom-6 left-6 rounded-2xl border-2 border-[hsl(var(--border))] bg-[hsl(var(--card)/0.92)] p-4 shadow-xl backdrop-blur-md text-left">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--primary))]">
                    {props.panel.metricLabel || "مختارات بلدي"}
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

const GroomingProHero: React.FC<HeroVariantProps> = (props) => {
  const bg = props.backgroundImage || props.panel.image;
  return (
    <section
      className="relative flex min-h-[360px] items-center justify-center overflow-hidden px-4 py-16 text-center"
      style={bg ? { backgroundColor: "#19212B", backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundColor: "#19212B" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,20,35,.72)_0%,rgba(10,20,35,.60)_50%,rgba(10,20,35,.75)_100%)]" />
      <div className="relative z-10 mx-auto w-full max-w-[700px]">
        {props.eyebrow ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{props.eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-[2.4rem] font-extrabold leading-[1.2] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,.65)]">
          {props.title}
        </h1>
        {props.subtitle ? (
          <p className="mx-auto mt-3 max-w-[580px] text-[17px] leading-[1.6] text-white/95 drop-shadow-[0_1px_8px_rgba(0,0,0,.55)]">
            {props.subtitle}
          </p>
        ) : null}
        {props.ctaText ? (
          <div className="mt-6">
            {renderHeroAction(
              props.primaryHref,
              props.ctaText,
              "inline-block rounded-[6px] bg-white px-7 py-3 text-[15px] font-bold text-[#19212B] shadow-[0_4px_14px_rgba(0,0,0,.2)] transition-transform hover:-translate-y-0.5",
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
};

const HeroBanner: React.FC<HeroBannerProps> = ({ section, settings }) => {
  const location = useLocation();
  const resolveScopedHref = (href: unknown, fallback = ""): string => {
    const value =
      typeof href === "string" && href.trim()
        ? href.trim()
        : typeof fallback === "string"
          ? fallback
          : "";

    if (!value) {
      return "";
    }

    return buildStorefrontPath(
      location.pathname,
      value.startsWith("/") ? value : `/${value}`,
      location.search,
    );
  };
  const variant = resolveSectionVariant<string>(
    "HeroBanner",
    settings?.variant || section?.variant,
    "centered",
  );
  const title = settings?.title || "Welcome to our store";
  const subtitle = settings?.subtitle || "";

  const props: HeroVariantProps = {
    title,
    subtitle,
    ctaText: settings?.primaryCtaText || settings?.ctaText || "تسوّق الآن",
    primaryHref: resolveScopedHref(
      settings?.primaryCtaLink || settings?.ctaLink || "/shop",
    ),
    secondaryCtaText: settings?.secondaryCtaText || "",
    secondaryHref: resolveScopedHref(settings?.secondaryCtaLink),
    backgroundImage:
      settings?.backgroundImage || settings?.imageUrl || settings?.image || "",
    eyebrow: settings?.eyebrow,
    highlights: settings?.highlights || [],
    floatingCards: settings?.floatingCards || [],
    stickers: settings?.stickers || [],
    slides: Array.isArray(settings?.slides)
      ? settings.slides.map((slide: HeroSlide) => ({
          image:
            slide?.image || slide?.imageUrl || slide?.backgroundImage || "",
          alt: slide?.alt,
          title: slide?.title,
          subtitle: slide?.subtitle,
          eyebrow: slide?.eyebrow,
          ctaText: slide?.ctaText,
          ctaLink: resolveScopedHref(slide?.ctaLink),
          secondaryCtaText: slide?.secondaryCtaText,
          secondaryCtaLink: resolveScopedHref(slide?.secondaryCtaLink),
        }))
      : [],
    compact: settings?.compact === true,
    panel: {
      image: settings?.panelImage,
      title: settings?.panelTitle,
      subtitle: settings?.panelSubtitle,
      note: settings?.panelNote,
      eyebrow: settings?.panelEyebrow,
      metricValue: settings?.panelMetricValue,
      metricLabel: settings?.panelMetricLabel,
    },
  };

  if (variant === "legacy-image-slider")
    return <LegacyImageSliderHero {...props} />;
  if (variant === "drop-board") return <DropBoardHero {...props} />;
  if (variant === "layered-parallax-sky")
    return <LayeredParallaxSkyHero {...props} />;
  if (variant === "cinematic-plinth") return <CinematicPlinthHero {...props} />;
  if (variant === "speed-banner") return <SpeedBannerHero {...props} />;
  if (variant === "split-panel") return <SplitPanelHero {...props} />;
  if (variant === "fashion-billboard")
    return <FashionBillboardHero {...props} />;
  if (variant === "style-ledger") return <StyleLedgerHero {...props} />;
  if (variant === "graceful-banner") return <GracefulBannerHero {...props} />;
  if (variant === "retail-command") return <RetailCommandHero {...props} />;
  if (variant === "runway-grid") return <RunwayGridHero {...props} />;
  if (variant === "wardrobe-planner") return <WardrobePlannerHero {...props} />;
  if (variant === "modest-cascade") return <ModestCascadeHero {...props} />;
  if (variant === "soft-showcase") return <SoftShowcaseHero {...props} />;
  if (variant === "boutique-muse") return <BoutiqueMuseHero {...props} />;
  if (variant === "retail-direct-banner")
    return <RetailDirectBannerHero {...props} />;
  if (variant === "scent-portrait") return <ScentPortraitHero {...props} />;
  if (variant === "nature-breeze") return <NatureBreezeHero {...props} />;
  if (variant === "elessi-bag-hero") return <ElessiBagHero {...props} />;
  if (variant === "elessi-spotlight") return <ElessiSpotlightHero {...props} />;
  if (variant === "elessi-dual-merch")
    return <ElessiDualMerchHero {...props} />;
  if (variant === "elessi-promo-cascade")
    return <ElessiPromoCascadeHero {...props} />;
  if (variant === "elessi-utility-stage")
    return <ElessiUtilityStageHero {...props} />;
  if (variant === "elessi-soft-departments")
    return <ElessiSoftDepartmentsHero {...props} />;
  if (variant === "elessi-organic-harvest")
    return <ElessiOrganicHarvestHero {...props} />;
  if (variant === "butcher-counter") return <ButcherCounterHero {...props} />;
  if (variant === "butcher-atelier") return <ButcherAtelierHero {...props} />;
  if (variant === "elessi-plant-slider")
    return <ElessiPlantSliderHero {...props} />;
  if (variant === "elessi-bike-hero") return <ElessiBikeHero {...props} />;
  if (variant === "elessi-digital-launch")
    return <ElessiDigitalLaunchHero {...props} />;
  if (variant === "elessi-beauty-ritual")
    return <ElessiBeautyRitualHero {...props} />;
  if (variant === "elessi-garage-command")
    return <ElessiGarageCommandHero {...props} />;
  if (variant === "elessi-jewel-salon")
    return <ElessiJewelSalonHero {...props} />;
  if (variant === "elessi-pet-sunroom")
    return <ElessiPetSunroomHero {...props} />;
  if (variant === "grooming-hero") return <GroomingProHero {...props} />;
  if (variant === "dental-precision-hero") return <DentalPrecisionHero {...props} />;

  return <CenteredHero {...props} />;
};

export default HeroBanner;
