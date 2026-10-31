import React from "react";
import type { Product } from "../../../hooks/useProducts";
import VideoReelPlayer from "../components/VideoReelPlayer";

export interface LandingVideoReelSectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
}

export const LandingVideoReelSection: React.FC<LandingVideoReelSectionProps> = ({
  section,
  idx,
  activeProduct,
}) => {
  const content = section.content || {};
  const videoUrl = content.videoUrl;
  const thumbnail =
    content.videoThumbnail || activeProduct.mainImage || "";
  const caption =
    content.videoCaption ||
    "شاهد تجربة المنتج والأنبوكسينغ على الطبيعة بدون فلاتر";

  return (
    <section
      key={section.id || idx}
      className="pil-video-reel-section"
      aria-label="فيديو المنتج"
    >
      <div className="pil-section-heading">
        <span>تجربة واقعية 100%</span>
        <h2>{section.title || "المنتج على الطبيعة بحركة حقيقية"}</h2>
      </div>
      <VideoReelPlayer
        videoUrl={videoUrl}
        thumbnail={thumbnail}
        caption={caption}
      />
    </section>
  );
};

export default LandingVideoReelSection;
