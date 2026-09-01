import React from "react";
import type { HeroVariantProps } from "./heroTypes";
import { renderHeroAction } from "./heroActions";

export function ButcherCounterHero(props: HeroVariantProps) {
  const leadImage = props.backgroundImage || props.panel.image;
  return (
    <section className="relative overflow-hidden bg-[#3f0c0d] py-16 text-white md:py-24">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[#000]/40" />
        {leadImage && (
          <img
            src={leadImage}
            className="h-full w-full object-cover opacity-50"
            alt={props.title}
          />
        )}
      </div>
      <div className="container relative z-10 px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <span className="inline-flex rounded-full border border-[#c5a059]/30 bg-[#c5a059]/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.3em] text-[#c5a059]">
              {props.eyebrow || "EST. 1983"}
            </span>
            <h1 className="font-heading text-5xl font-black leading-none tracking-tight md:text-7xl">
              {props.title}
            </h1>
            <p className="max-w-xl text-lg opacity-80 md:text-xl">
              {props.subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              {renderHeroAction(
                props.primaryHref,
                props.ctaText,
                "bg-[#c5a059] text-black px-10 py-4 rounded-xl font-black uppercase tracking-wider transition-transform hover:scale-105"
              )}
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] border border-[#c5a059]/20" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#2a2a2a] shadow-2xl">
              {leadImage && (
                <img
                  src={leadImage}
                  className="h-full w-full object-cover"
                  alt=""
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ButcherAtelierHero(props: HeroVariantProps) {
  const heroImage = props.backgroundImage || props.panel.image;
  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-[#121212]">
      <div className="absolute inset-0 z-0">
        {heroImage && (
          <img
            src={heroImage}
            className="h-full w-full object-cover opacity-60 transition-transform duration-[10s] hover:scale-110"
            alt={props.title}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#000] via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000] via-transparent to-[#000]/40" />
      </div>

      <div className="container relative z-10 flex min-h-[85vh] flex-col justify-center px-4 py-20 md:px-6">
        <div className="max-w-4xl space-y-8">
          <div className="flex items-center gap-4">
            <div className="h-px w-12 bg-[#c5a059]" />
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059]">
              {props.eyebrow || "ARTISAN ATELIER"}
            </span>
          </div>

          <h1 className="font-heading text-6xl font-black leading-[0.85] tracking-tighter text-white md:text-8xl lg:text-[10rem]">
            {props.title}
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-white/60 md:text-xl">
            {props.subtitle}
          </p>

          <div className="flex flex-wrap gap-6 pt-6">
            {renderHeroAction(
              props.primaryHref,
              props.ctaText,
              "group relative overflow-hidden rounded-full bg-[#c5a059] px-12 py-5 text-xs font-black uppercase tracking-[0.2em] text-black transition-all hover:bg-[#d4b57e] hover:shadow-[0_0_40px_rgba(197,160,89,0.3)]"
            )}
            {renderHeroAction(
              props.secondaryHref,
              props.secondaryCtaText,
              "group relative overflow-hidden rounded-full border border-white/20 bg-white/5 px-12 py-5 text-xs font-black uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-all hover:bg-white/10"
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 right-0 hidden translate-x-1/2 rotate-90 md:block">
        <span className="text-[10px] font-black uppercase tracking-[1em] text-[#c5a059]/40">
          PREMIUM SELECTION
        </span>
      </div>
    </section>
  );
}
