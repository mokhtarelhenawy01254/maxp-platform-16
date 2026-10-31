import React from "react";
import PureMediaStage from "../components/PureMediaStage";

export interface LandingMediaSectionProps {
  section: any;
  idx: number;
  allProductImages: string[];
  activeHeroImageIndex: number;
  setActiveHeroImageIndex: (idx: number) => void;
  productName: string;
}

export const LandingMediaSection: React.FC<LandingMediaSectionProps> = ({
  section,
  idx,
  allProductImages,
  activeHeroImageIndex,
  setActiveHeroImageIndex,
  productName,
}) => {
  const content = section.content || {};
  const sectionImages =
    Array.isArray(content.images) && content.images.length > 0
      ? content.images
      : allProductImages;

  return (
    <section
      key={section.id || idx}
      className="pil-pure-media-section"
      aria-label="معرض صور المنتج"
      style={{
        backgroundColor: content.bgColor || "transparent",
        backgroundImage: content.bgImage ? `url(${content.bgImage})` : undefined,
      }}
    >
      <PureMediaStage
        images={sectionImages}
        activeIndex={activeHeroImageIndex}
        onIndexChange={setActiveHeroImageIndex}
        productName={productName}
      />

      {sectionImages.length > 1 && (
        <div
          className="pil-hero-gallery-bar"
          role="region"
          aria-label="معرض زوايا وصور المنتج"
          style={{ marginTop: 12 }}
        >
          <div className="pil-hero-thumbs-strip" role="tablist">
            {sectionImages.map((img: string, tIdx: number) => (
              <button
                key={tIdx}
                type="button"
                className={`pil-hero-thumb ${activeHeroImageIndex === tIdx ? "is-active" : ""}`}
                onClick={() => setActiveHeroImageIndex(tIdx)}
                aria-label={`عرض الصورة ${tIdx + 1}`}
              >
                <img src={img} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default LandingMediaSection;
