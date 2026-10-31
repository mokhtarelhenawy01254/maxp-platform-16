import React from "react";

export interface LandingHtmlSectionProps {
  section: any;
  idx: number;
}

export const LandingHtmlSection: React.FC<LandingHtmlSectionProps> = ({
  section,
  idx,
}) => {
  const content = section.content || {};
  const code = content.htmlCode || content.htmlContent;
  if (!code) return null;

  return (
    <section
      key={section.id || idx}
      className="pil-html-block"
      style={{ maxWidth: 760, margin: "24px auto", padding: "0 16px" }}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
};

export default LandingHtmlSection;
