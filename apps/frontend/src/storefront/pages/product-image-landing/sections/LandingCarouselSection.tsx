import React from "react";
import type { Product } from "../../../hooks/useProducts";
import LandingCarousel from "../components/LandingCarousel";

export interface LandingCarouselSectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
}

export const LandingCarouselSection: React.FC<LandingCarouselSectionProps> = ({
  section,
  idx,
  activeProduct,
}) => {
  const content = section.content || {};
  const carouselImages =
    content.carouselImages ||
    (content.images ? content.images.map((u: string) => ({ url: u })) : []) ||
    [];
  if (!carouselImages.length && !activeProduct.mainImage) return null;
  const list =
    carouselImages.length > 0
      ? carouselImages
      : [{ url: activeProduct.mainImage }];

  return (
    <section
      key={section.id || idx}
      className="pil-carousel-section"
      style={{
        backgroundColor: content.bgColor || "transparent",
        backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
        padding: "16px",
        maxWidth: 760,
        margin: "0 auto",
      }}
    >
      <LandingCarousel
        images={list}
        autoplay={content.autoplay !== false}
        interval={content.slideInterval || 3}
      />
    </section>
  );
};

export default LandingCarouselSection;
