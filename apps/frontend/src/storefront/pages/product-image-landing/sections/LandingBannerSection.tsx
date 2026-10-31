import React from "react";

export interface LandingBannerSectionProps {
  section: any;
  idx: number;
  bannerSection?: any;
}

export const LandingBannerSection: React.FC<LandingBannerSectionProps> = ({
  section,
  idx,
  bannerSection,
}) => {
  const content = section.content || {};
  const bannerText =
    content.bannerText ||
    content.text ||
    bannerSection?.content?.bannerText ||
    bannerSection?.content?.text;

  if (!bannerText) return null;

  return (
    <div
      key={section.id || idx}
      className="pil-announcement-banner"
      style={{
        backgroundColor:
          content.bannerBg ||
          content.backgroundColor ||
          bannerSection?.content?.bannerBg ||
          "#0284c7",
        color:
          content.textColor ||
          bannerSection?.content?.textColor ||
          "#ffffff",
        padding: "10px 16px",
        textAlign: "center",
        fontWeight: 600,
        fontSize: "0.9rem",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {bannerText}
    </div>
  );
};

export default LandingBannerSection;
