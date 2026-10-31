import React from "react";
import type { Product } from "../../../hooks/useProducts";

export interface LandingHeadingSectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
}

export const LandingHeadingSection: React.FC<LandingHeadingSectionProps> = ({
  section,
  idx,
  activeProduct,
}) => {
  const content = section.content || {};
  const title = content.title || content.heading || activeProduct.name;
  const subtitle = content.subtitle || content.subheading;
  const align = content.alignment || content.titleAlign || "center";
  const HeadingTag =
    content.headingLevel === "h1"
      ? "h1"
      : content.headingLevel === "h3"
        ? "h3"
        : "h2";

  return (
    <section
      key={section.id || idx}
      className="pil-heading-section"
      style={{
        backgroundColor: content.bgColor || "transparent",
        backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
        padding: "24px 16px 12px",
        maxWidth: 760,
        margin: "0 auto",
        textAlign: align as any,
      }}
    >
      {content.badge && (
        <span
          style={{
            display: "inline-block",
            background: "#eff6ff",
            color: "#2563eb",
            border: "1px solid #bfdbfe",
            padding: "3px 12px",
            borderRadius: 20,
            fontSize: "0.8rem",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {content.badge}
        </span>
      )}
      <HeadingTag
        style={{
          margin: 0,
          fontSize:
            HeadingTag === "h1"
              ? "1.65rem"
              : HeadingTag === "h3"
                ? "1.2rem"
                : "1.45rem",
          fontWeight: 800,
          color: content.textColor || "#0f172a",
          lineHeight: 1.35,
        }}
      >
        {title}
      </HeadingTag>
      {subtitle && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.95rem",
            color: "#475569",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </p>
      )}
    </section>
  );
};

export default LandingHeadingSection;
