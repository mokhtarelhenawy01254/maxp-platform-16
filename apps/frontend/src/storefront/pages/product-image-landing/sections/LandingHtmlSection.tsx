import React from "react";
import { sanitizeStorefrontHtml } from "../../../utils/html";

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
  const safeHtml = sanitizeStorefrontHtml(code);
  if (!safeHtml) return null;

  return (
    <section
      key={section.id || idx}
      className="pil-html-block"
      style={{ maxWidth: 760, margin: "24px auto", padding: "0 16px" }}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
};

export default LandingHtmlSection;
