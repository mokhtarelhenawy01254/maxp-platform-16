import React from "react";
import type { useProductImageLandingController } from "../useProductImageLandingController";
import LandingBannerSection from "./LandingBannerSection";
import LandingBeforeAfterSection from "./LandingBeforeAfterSection";
import LandingBreakdownSection from "./LandingBreakdownSection";
import LandingBuyButtonSection from "./LandingBuyButtonSection";
import LandingCarouselSection from "./LandingCarouselSection";
import LandingComparisonSection from "./LandingComparisonSection";
import LandingCountdownSection from "./LandingCountdownSection";
import LandingFeaturedProductSection from "./LandingFeaturedProductSection";
import LandingFeaturesSection from "./LandingFeaturesSection";
import LandingGallerySection from "./LandingGallerySection";
import LandingHeadingSection from "./LandingHeadingSection";
import LandingHowItWorksSection from "./LandingHowItWorksSection";
import LandingHtmlSection from "./LandingHtmlSection";
import LandingImageOnlySection from "./LandingImageOnlySection";
import LandingLiveProofSection from "./LandingLiveProofSection";
import LandingMediaSection from "./LandingMediaSection";
import LandingOrderFormSection from "./LandingOrderFormSection";
import LandingReviewsSection from "./LandingReviewsSection";
import LandingTextSection from "./LandingTextSection";
import LandingVideoReelSection from "./LandingVideoReelSection";
import LandingYoutubeSection from "./LandingYoutubeSection";
import LandingFaqSection from "./LandingFaqSection";

export interface LandingDynamicSectionRendererProps {
  section: any;
  idx: number;
  controller: ReturnType<typeof useProductImageLandingController>;
}

export const LandingDynamicSectionRenderer: React.FC<LandingDynamicSectionRendererProps> = ({
  section,
  idx,
  controller,
}) => {
  if (!section || section.enabled === false) return null;
  const type = section.type;

  switch (type) {
    case "BANNERS":
      return (
        <LandingBannerSection
          key={section.id || idx}
          section={section}
          idx={idx}
          bannerSection={controller.bannerSection}
        />
      );

    case "MEDIA":
      return (
        <LandingMediaSection
          key={section.id || idx}
          section={section}
          idx={idx}
          allProductImages={controller.allProductImages}
          activeHeroImageIndex={controller.activeHeroImageIndex}
          setActiveHeroImageIndex={controller.setActiveHeroImageIndex}
          productName={controller.activeProduct?.name || ""}
        />
      );

    case "TEXT":
      return (
        <LandingTextSection
          key={section.id || idx}
          section={section}
          idx={idx}
          landingTitle={controller.activeLanding?.title}
          productName={controller.activeProduct?.name || ""}
        />
      );

    case "BREAKDOWN":
      return (
        <LandingBreakdownSection
          key={section.id || idx}
          section={section}
          idx={idx}
          productName={controller.activeProduct?.name || ""}
        />
      );

    case "COMPARISON":
      return (
        <LandingComparisonSection
          key={section.id || idx}
          section={section}
          idx={idx}
          productName={controller.activeProduct?.name || ""}
        />
      );

    case "GALLERY":
      if (!controller.activeProduct) return null;
      return (
        <LandingGallerySection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
        />
      );

    case "LIVE_PROOF":
      return (
        <LandingLiveProofSection
          key={section.id || idx}
          section={section}
          idx={idx}
          productName={controller.activeProduct?.name || ""}
        />
      );

    case "FEATURES":
      return (
        <LandingFeaturesSection
          key={section.id || idx}
          section={section}
          idx={idx}
          landingBenefitCards={controller.landingBenefitCards}
        />
      );

    case "COUNTDOWN":
      return (
        <LandingCountdownSection
          key={section.id || idx}
          section={section}
          idx={idx}
          countdownSection={controller.countdownSection}
        />
      );

    case "FORM":
      if (!controller.activeProduct) return null;
      return (
        <LandingOrderFormSection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeConfig={controller.activeConfig}
          activeProduct={controller.activeProduct}
          orderFinalTotal={controller.orderFinalTotal}
          currency={controller.currency}
          activeBundle={controller.activeBundle}
          sizeOptions={controller.sizeOptions}
          colorOptions={controller.colorOptions}
          customAttributeGroups={controller.customAttributeGroups}
          activeSections={controller.sectionsToRender}
          bundleTiers={controller.bundleTiers}
          selectedBundleQty={controller.selectedBundleQty}
          setSelectedBundleQty={controller.setSelectedBundleQty}
          activePrice={controller.activePrice}
          bundleItems={controller.bundleItems}
          selectedColor={controller.selectedColor}
          selectedSize={controller.selectedSize}
          selectedCustomAttributes={controller.selectedCustomAttributes}
          updateBundleItem={controller.updateBundleItem}
          setSelectedColor={controller.setSelectedColor}
          setSelectedSize={controller.setSelectedSize}
          setSelectedCustomAttributes={controller.setSelectedCustomAttributes}
          formState={controller.formState}
          updateFormField={controller.updateFormField}
          formError={controller.formError}
          handleSubmit={controller.handleSubmit}
          handleFormFirstInteraction={controller.handleFormFirstInteraction}
          isSubmitting={controller.isSubmitting}
          whatsappPhone={controller.whatsappPhone}
        />
      );

    case "REVIEWS":
      return (
        <LandingReviewsSection
          key={section.id || idx}
          section={section}
          idx={idx}
          reviewsSection={controller.reviewsSection}
        />
      );

    case "FAQ":
      return (
        <LandingFaqSection
          key={section.id || idx}
          section={section}
          idx={idx}
          faqSection={controller.faqSection}
        />
      );

    case "BEFORE_AFTER":
      if (!controller.activeProduct) return null;
      return (
        <LandingBeforeAfterSection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
        />
      );

    case "VIDEO_REEL":
      if (!controller.activeProduct) return null;
      return (
        <LandingVideoReelSection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
        />
      );

    case "HTML":
      return (
        <LandingHtmlSection
          key={section.id || idx}
          section={section}
          idx={idx}
        />
      );

    case "IMAGE_ONLY":
      if (!controller.activeProduct) return null;
      return (
        <LandingImageOnlySection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
        />
      );

    case "CAROUSEL":
      if (!controller.activeProduct) return null;
      return (
        <LandingCarouselSection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
        />
      );

    case "HOW_IT_WORKS":
      return (
        <LandingHowItWorksSection
          key={section.id || idx}
          section={section}
          idx={idx}
        />
      );

    case "FEATURED_PRODUCT":
      if (!controller.activeProduct) return null;
      return (
        <LandingFeaturedProductSection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
          activePrice={controller.activePrice}
          currency={controller.currency}
        />
      );

    case "YOUTUBE_VIDEO":
      return (
        <LandingYoutubeSection
          key={section.id || idx}
          section={section}
          idx={idx}
        />
      );

    case "BUY_BUTTON":
      if (!controller.activeProduct) return null;
      return (
        <LandingBuyButtonSection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
          whatsappPhone={controller.whatsappPhone}
        />
      );

    case "HEADING":
      if (!controller.activeProduct) return null;
      return (
        <LandingHeadingSection
          key={section.id || idx}
          section={section}
          idx={idx}
          activeProduct={controller.activeProduct}
        />
      );

    default:
      return null;
  }
};

export default LandingDynamicSectionRenderer;
