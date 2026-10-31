import React from "react";
import type { Product } from "../../../hooks/useProducts";
import { getPrimaryProductImage } from "../../../utils/productImages";
import { formatPrice } from "../productImageLandingHelpers";

export interface LandingFeaturedProductSectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
  activePrice: number;
  currency: string;
}

export const LandingFeaturedProductSection: React.FC<LandingFeaturedProductSectionProps> = ({
  section,
  idx,
  activeProduct,
  activePrice,
  currency,
}) => {
  const content = section.content || {};
  const featImg =
    content.imageUrl ||
    content.mainImage ||
    getPrimaryProductImage(activeProduct);
  const featTitle = content.productName || activeProduct.name;
  const featPrice =
    content.price != null ? Number(content.price) : activePrice;
  const featOldPrice =
    content.oldPrice != null
      ? Number(content.oldPrice)
      : activeProduct.comparePrice
        ? Number(activeProduct.comparePrice)
        : Math.round(featPrice * 1.35);
  const featBadge =
    content.featuredBadge || content.badge || "عرض خاص ومميز 🔥";
  const bullets =
    content.featuredBullets || content.bullets || [
      "خامات أصلية عالية الجودة تدوم لسنوات",
      "تصميم عصري وأداء فائق الراحة طوال اليوم",
      "معاينة كاملة للشحنة قبل دفع أي مبلغ للمندوب",
    ];
  const cta = content.ctaText || "اطلب الآن واستفد من الخصم 🚚";

  return (
    <section
      key={section.id || idx}
      className="pil-featured-product-section"
      style={{
        backgroundColor: content.bgColor || "#ffffff",
        backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
        padding: "24px 16px",
        maxWidth: 760,
        margin: "16px auto",
      }}
    >
      <div
        className="pil-featured-card"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
          border: "2px solid #86efac",
          borderRadius: 18,
          padding: "24px 20px",
          boxShadow: "0 10px 25px -5px rgba(22, 163, 74, 0.12)",
          position: "relative",
        }}
      >
        {featBadge && (
          <span
            style={{
              position: "absolute",
              top: -12,
              right: 20,
              background: "#16a34a",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 800,
              padding: "4px 14px",
              borderRadius: 20,
              boxShadow: "0 4px 10px rgba(22, 163, 74, 0.3)",
            }}
          >
            {featBadge}
          </span>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            gap: 20,
            alignItems: "center",
          }}
        >
          {featImg && (
            <img
              src={featImg}
              alt={featTitle}
              style={{
                width: "100%",
                maxHeight: 220,
                objectFit: "contain",
                borderRadius: 12,
              }}
            />
          )}
          <div>
            <h3
              style={{
                margin: "0 0 10px",
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {featTitle}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <strong
                style={{
                  fontSize: "1.4rem",
                  color: "#16a34a",
                  fontWeight: 800,
                }}
              >
                {formatPrice(featPrice, currency)}
              </strong>
              {featOldPrice > featPrice && (
                <del style={{ fontSize: "0.95rem", color: "#94a3b8" }}>
                  {formatPrice(featOldPrice, currency)}
                </del>
              )}
              {featOldPrice > featPrice && (
                <span
                  style={{
                    fontSize: "0.78rem",
                    background: "#fee2e2",
                    color: "#ef4444",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 6,
                  }}
                >
                  وفر {Math.round(((featOldPrice - featPrice) / featOldPrice) * 100)}%
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {bullets.map((b: string, bIdx: number) => (
                <div
                  key={bIdx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.88rem",
                    color: "#334155",
                  }}
                >
                  <span style={{ color: "#16a34a", fontWeight: 800 }}>✓</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("order");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "14px 20px",
            background: "#16a34a",
            color: "#ffffff",
            fontSize: "1.05rem",
            fontWeight: 800,
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(22, 163, 74, 0.35)",
          }}
        >
          {cta}
        </button>
      </div>
    </section>
  );
};

export default LandingFeaturedProductSection;
