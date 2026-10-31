import React from "react";
import type { Product } from "../../../hooks/useProducts";
import { getPrimaryProductImage } from "../../../utils/productImages";

export interface LandingImageOnlySectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
}

export const LandingImageOnlySection: React.FC<LandingImageOnlySectionProps> = ({
  section,
  idx,
  activeProduct,
}) => {
  const content = section.content || {};
  const imgUrl =
    content.imageUrl ||
    content.mainImage ||
    getPrimaryProductImage(activeProduct);
  if (!imgUrl) return null;

  const isFull = content.variant === "full" || content.isFullWidth;
  const isCircle = Boolean(content.isCircle);
  const borderRadius = isCircle ? "50%" : isFull ? 0 : (content.borderRadius ?? 12);
  const link = content.linkUrl;

  const imgEl = (
    <picture>
      {content.mobileImage && (
        <source media="(max-width: 640px)" srcSet={content.mobileImage} />
      )}
      <img
        src={imgUrl}
        alt={content.altText || content.caption || activeProduct.name}
        className="pil-img-only-el"
        style={{
          width: isCircle ? 220 : "100%",
          height: isCircle ? 220 : "auto",
          aspectRatio: isCircle ? "1/1" : undefined,
          margin: isCircle ? "0 auto" : undefined,
          display: "block",
          borderRadius,
          objectFit: "cover",
          maxHeight: content.maxHeight || "none",
        }}
        loading="lazy"
      />
    </picture>
  );

  return (
    <section
      key={section.id || idx}
      className={`pil-image-only-section ${isFull ? "is-fullwidth" : "is-contained"}`}
      style={{
        backgroundColor: content.bgColor || "transparent",
        backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
        padding: isFull ? "0" : "16px",
        maxWidth: isFull ? "100%" : 760,
        margin: "0 auto",
      }}
    >
      {link ? (
        <a
          href={link}
          onClick={(e) => {
            if (link.startsWith("#")) {
              e.preventDefault();
              const target = document.querySelector(link);
              if (target) target.scrollIntoView({ behavior: "smooth" });
            }
          }}
          style={{ display: "block" }}
        >
          {imgEl}
        </a>
      ) : (
        imgEl
      )}
      {content.caption && (
        <p
          className="pil-img-only-caption"
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "0.85rem",
            marginTop: 8,
          }}
        >
          {content.caption}
        </p>
      )}
    </section>
  );
};

export default LandingImageOnlySection;
