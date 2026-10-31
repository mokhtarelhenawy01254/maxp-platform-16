import React from "react";

export interface LandingTextSectionProps {
  section: any;
  idx: number;
  landingTitle?: string;
  productName: string;
}

export const LandingTextSection: React.FC<LandingTextSectionProps> = ({
  section,
  idx,
  landingTitle,
  productName,
}) => {
  const content = section.content || {};
  const heading = content.heading || landingTitle || productName;
  const subheading = content.subheading;
  const bodyText = content.bodyText;

  if (!heading && !bodyText) return null;

  return (
    <section key={section.id || idx} className="pil-text-story" aria-label="تفاصيل المنتج">
      <div className="pil-section-heading">
        <span>مواصفات وتفاصيل</span>
        <h2>{heading}</h2>
      </div>
      {subheading ? <p className="pil-text-subheading">{subheading}</p> : null}
      {bodyText ? (
        <div className="pil-text-body">
          {bodyText.split("\n").map((paragraph: string, pIdx: number) =>
            paragraph.trim() ? <p key={pIdx}>{paragraph}</p> : null,
          )}
        </div>
      ) : null}
    </section>
  );
};

export default LandingTextSection;
