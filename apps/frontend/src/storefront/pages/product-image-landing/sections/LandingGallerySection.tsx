import React from "react";
import type { Product } from "../../../hooks/useProducts";

export interface LandingGallerySectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
}

export const LandingGallerySection: React.FC<LandingGallerySectionProps> = ({
  section,
  idx,
  activeProduct,
}) => {
  const content = section.content || {};
  const title = content.galleryTitle || "لقطات حية للمنتج على الطبيعة";
  const images =
    content.galleryImages && content.galleryImages.length > 0
      ? content.galleryImages
      : activeProduct.images &&
          Array.isArray(activeProduct.images) &&
          activeProduct.images.length > 0
        ? activeProduct.images.map((src: string) => ({
            url: src,
            caption: activeProduct.name,
          }))
        : [];

  if (!images.length) return null;

  return (
    <section
      key={section.id || idx}
      className="pil-gallery-section"
      aria-label="معرض الصور الحية"
    >
      <div className="pil-section-heading">
        <span>على الطبيعة</span>
        <h2>{title}</h2>
      </div>
      <div className="pil-gallery-grid">
        {images.map((img: any, gIdx: number) => (
          <div key={gIdx} className="pil-gallery-card">
            <img
              src={img.url}
              alt={img.caption || activeProduct.name}
              loading="lazy"
            />
            {img.caption && (
              <span className="pil-gallery-caption">{img.caption}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default LandingGallerySection;
