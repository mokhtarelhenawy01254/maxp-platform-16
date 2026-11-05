import React from "react";
import { HeroVariantProps } from "./heroTypes";

/**
 * EasyOrders / EMY-style hero.
 * Centered promo eyebrow (green) + big black headline, then an RTL masonry grid:
 * one tall image on the right and two stacked images on the left, 16px radius.
 */
export const EasyOrdersMasonryHero: React.FC<HeroVariantProps> = (props) => {
  const fromSlides = (props.slides || [])
    .map((slide) => slide.image || slide.imageUrl || slide.backgroundImage)
    .filter((value): value is string => Boolean(value && value.trim()));

  const hero = fromSlides[0] || props.backgroundImage || "";
  const first = fromSlides[1] || props.panel?.image || hero;
  const second = fromSlides[2] || props.panel?.image || hero;

  return (
    <section className="bg-white py-8 md:py-12" dir="rtl">
      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="text-center">
          {props.eyebrow ? (
            <p className="text-sm font-semibold text-emerald-600">{props.eyebrow}</p>
          ) : null}
          {props.title ? (
            <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-neutral-900 md:text-5xl">
              {props.title}
            </h1>
          ) : null}
          {props.subtitle ? (
            <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500 md:text-base">
              {props.subtitle}
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid grid-cols-[1.8fr_1fr] gap-3 md:gap-4">
          <div className="order-1 aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100">
            {hero ? (
              <img
                src={hero}
                alt={props.title || ""}
                loading="eager"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="order-2 grid grid-rows-2 gap-3 md:gap-4">
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
              {first ? (
                <img src={first} alt="" loading="eager" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100">
              {second ? (
                <img src={second} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : null}
            </div>
          </div>
        </div>

        {props.ctaText ? (
          <div className="mt-6 text-center">
            <a
              href={props.primaryHref || "/shop"}
              className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              {props.ctaText}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
};
