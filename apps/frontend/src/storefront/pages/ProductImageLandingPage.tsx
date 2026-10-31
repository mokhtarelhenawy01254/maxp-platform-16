import React from "react";
import { Link } from "react-router-dom";
import { buildStorefrontPath } from "../utils/paths";
import LandingStickyCta from "./product-image-landing/components/LandingStickyCta";
import LandingDynamicSectionRenderer from "./product-image-landing/sections/LandingDynamicSectionRenderer";
import useProductImageLandingController from "./product-image-landing/useProductImageLandingController";
import "./ProductImageLandingPage.css";

export const ProductImageLandingPage: React.FC = () => {
  const controller = useProductImageLandingController();

  if (controller.isLandingLoading) {
    return (
      <section className="product-image-landing product-image-landing--empty" dir="rtl">
        <div className="pil-empty-panel">
          <p>جاري تجهيز صفحة الهبوط...</p>
        </div>
      </section>
    );
  }

  if (
    !controller.activeProduct ||
    (!controller.heroImage && controller.campaignSlices.length === 0) ||
    controller.landingError
  ) {
    return (
      <section className="product-image-landing product-image-landing--empty" dir="rtl">
        <div className="pil-empty-panel">
          <p>{controller.landingError || "فشل تحميل المنتج"}</p>
          <Link
            to={buildStorefrontPath(
              controller.location.pathname,
              `/product/${controller.id || ""}`,
              controller.location.search,
            )}
          >
            العودة لصفحة المنتج
          </Link>
        </div>
      </section>
    );
  }

  return (
    <article
      className="product-image-landing"
      dir="rtl"
      style={controller.landingStyle.cssVars as React.CSSProperties}
    >
      {controller.sectionsToRender.map((section, idx) => (
        <LandingDynamicSectionRenderer
          key={section.id || idx}
          section={section}
          idx={idx}
          controller={controller}
        />
      ))}

      <LandingStickyCta
        isStickyReady={controller.isStickyReady}
        isFormInView={controller.isFormInView}
        orderFinalTotal={controller.orderFinalTotal}
        currency={controller.currency}
        whatsappPhone={controller.whatsappPhone}
        productName={controller.activeProduct.name}
      />
    </article>
  );
};

export default ProductImageLandingPage;
