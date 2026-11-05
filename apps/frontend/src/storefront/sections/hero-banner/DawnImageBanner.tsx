import React from "react";
import { HeroVariantProps } from "./heroTypes";

/**
 * Shopify Dawn image-banner replica:
 * full-bleed image, 40% dark overlay, content anchored bottom-center,
 * large heading and one outlined (secondary) button.
 */
export const DawnImageBanner: React.FC<HeroVariantProps> = (props) => {
  const image = props.backgroundImage || props.slides?.[0]?.image || "";

  return (
    <section className="relative flex min-h-[70vh] items-end justify-center overflow-hidden bg-neutral-900 text-white md:min-h-[85vh]">
      {image ? (
        <img
          src={image}
          alt={props.title || ""}
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full px-6 pb-14 text-center md:pb-20">
        {props.eyebrow ? (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/80">
            {props.eyebrow}
          </p>
        ) : null}
        {props.title ? (
          <h1 className="font-heading text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            {props.title}
          </h1>
        ) : null}
        {props.subtitle ? (
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/85 md:text-base">{props.subtitle}</p>
        ) : null}
        {props.ctaText ? (
          <a
            href={props.primaryHref || "/shop"}
            className="mt-7 inline-flex items-center justify-center border border-white/80 px-9 py-3 text-sm font-medium transition hover:bg-white hover:text-neutral-900"
          >
            {props.ctaText}
          </a>
        ) : null}
      </div>
    </section>
  );
};
