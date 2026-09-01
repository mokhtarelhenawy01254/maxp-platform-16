export interface HeroSticker {
  label: string;
  position?: "left-mid" | "left-bottom" | "right-mid" | "right-bottom";
  tone?: "primary" | "outline" | "default";
}

export interface HeroFloatingCard {
  badge?: string;
  title?: string;
  value?: string;
  description?: string;
  tone?: "indigo" | "glass" | "default";
}

export interface HeroBannerHighlight {
  label: string;
  value: string;
}

export interface HeroSlide {
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

export interface HeroVariantProps {
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
