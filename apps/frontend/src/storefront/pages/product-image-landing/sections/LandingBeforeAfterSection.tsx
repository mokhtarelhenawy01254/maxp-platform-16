import React from "react";
import type { Product } from "../../../hooks/useProducts";
import BeforeAfterSlider from "../components/BeforeAfterSlider";

export interface LandingBeforeAfterSectionProps {
  section: any;
  idx: number;
  activeProduct: Product;
}

export const LandingBeforeAfterSection: React.FC<LandingBeforeAfterSectionProps> = ({
  section,
  idx,
  activeProduct,
}) => {
  const content = section.content || {};
  const beforeImg = content.beforeImage || activeProduct.mainImage || "";
  const afterImg =
    content.afterImage ||
    (Array.isArray(activeProduct.images)
      ? activeProduct.images[0]
      : activeProduct.mainImage) ||
    "";
  const beforeLabel =
    content.beforeLabel || "أحذية السوق العادية (إجهاد وألم)";
  const afterLabel =
    content.afterLabel || `${activeProduct.name} (راحة وأصالة)`;

  return (
    <section
      key={section.id || idx}
      className="pil-before-after-section"
      aria-label="مقارنة قبل وبعد"
    >
      <div className="pil-section-heading">
        <span>فرق واضح وملموس</span>
        <h2>{section.title || "شاهد الفرق بنفسك قبل وبعد الاستخدام"}</h2>
      </div>
      <BeforeAfterSlider
        beforeImage={beforeImg}
        afterImage={afterImg}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
      />
    </section>
  );
};

export default LandingBeforeAfterSection;
