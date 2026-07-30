import { toast } from 'react-hot-toast';
/**
 * 🏗️ Shop Composition Types
 * Enables JSON-driven page composition for storefront themes.
 */

import type { FormEvent, ReactNode } from "react";
import type { StorefrontLayoutFamily } from "../utils/storefrontPageAssignments";

// ═══════════════════════════════════════════════
// Section Types
// ═══════════════════════════════════════════════

export type ShopSectionType =
  | "shop-hero"
  | "shop-toolbar"
  | "shop-sidebar"
  | "shop-product-grid"
  | "shop-pagination"
  | "shop-newsletter"
  | "shop-featured-carousel"
  | "shop-category-nav"
  | "shop-promo-banner"
  | "shop-empty-state"
  // Expanded library
  | "commerce-shoppable-lookbook"
  | "commerce-bundle-builder"
  | "content-split-story"
  | "conversion-urgency-timer-banner"
  | "nav-trending-searches"
  | "commerce-comparison-matrix"
  | "commerce-quick-order-table"
  | "conversion-ugc-mosaic"
  | "conversion-guarantee-strip"
  | "nav-category-masonry-bento"
  // Batch 4
  | "commerce-flash-drop"
  | "content-founder-note"
  | "content-values-ticker"
  | "conversion-social-proof-toast"
  | "nav-visual-categories-rail"
  // Batch 5
  | "content-interactive-timeline"
  | "content-video-ambient"
  | "conversion-gated-lead-magnet"
  | "nav-inpage-mega-hub"
  | "nav-contextual-breadcrumbs-jump"
  | "shop-catalog-header"
  | "shop-pdp-breadcrumbs"
  | "shop-pdp-related"
  | "shop-pdp-main"
  | "shop-pdp-artisan"
  | "shop-featured-collection"
  | "shop-category-grid"
  | "shop-promo"
  // Phase 7: Atomic Primitives Layer
  | "atomic-section";

export interface ShopSectionBase {
  id: string;
  type: ShopSectionType;
  visible?: boolean;
  order?: number;
}

export type ShopHeroVariant =
  | "editorial-lookbook"
  | "split-conversion"
  | "minimal-index"
  | "banner-stack"
  | "immersive-story"
  | "guided-discovery"
  | "ethereal-glow"
  | "femme-chic"
  | "rose-atelier"
  | "aura-zen";

export type ShopProductGridVariant =
  | "classic-catalog"
  | "editorial-masonry"
  | "comparison-matrix"
  | "quick-shop-dense"
  | "shop-the-look"
  | "discovery-feed";

export type ShopFeaturedCarouselVariant =
  | "new-arrivals-strip"
  | "spotlight-slides"
  | "shop-the-look-rail"
  | "comparison-rail"
  | "drop-countdown"
  | "chaptered-carousel";

export type ShopNewsletterVariant =
  | "inline-capture"
  | "benefit-club"
  | "early-access-waitlist"
  | "preference-quiz"
  | "editorial-digest"
  | "loyalty-concierge"
  | "femme-chic"
  | "rose-atelier";

export interface DynamicShopSettings {
  styles?: string;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════
// Atomic UI Primitives Types
// ═══════════════════════════════════════════════

export type LocalizedValue = string | { en: string; ar: string; [key: string]: string };

export type AtomicElementType = 
  | "container" 
  | "text" 
  | "image" 
  | "button"
  | "commerce-gallery"
  | "commerce-product-info"
  | "commerce-buy-box"
  | "commerce-technical-specs";

export interface AtomicElementBase {
  type: AtomicElementType;
  id?: string;
  styles?: string;       // Tailwind utility classes
  visible?: boolean;
}

export interface AtomicTextElement extends AtomicElementBase {
  type: "text";
  content: LocalizedValue;
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
}

export interface AtomicImageElement extends AtomicElementBase {
  type: "image";
  src: string;
  alt?: LocalizedValue;
  link?: string;
}

export interface AtomicButtonElement extends AtomicElementBase {
  type: "button";
  label: LocalizedValue;
  action?: string;      // URL or action token
  variant?: "solid" | "outline" | "ghost" | "link";
}

export interface AtomicContainerElement extends AtomicElementBase {
  type: "container";
  tag?: "div" | "section" | "article" | "header" | "footer";
  children?: AtomicElement[];
}

export interface AtomicCommerceGalleryElement extends AtomicElementBase {
  type: "commerce-gallery";
  variant?: "slider" | "grid" | "filmstrip" | "single";
}

export interface AtomicCommerceProductInfoElement extends AtomicElementBase {
  type: "commerce-product-info";
}

export interface AtomicCommerceBuyBoxElement extends AtomicElementBase {
  type: "commerce-buy-box";
}

export interface AtomicCommerceTechnicalSpecsElement extends AtomicElementBase {
  type: "commerce-technical-specs";
  title?: LocalizedValue;
}

export type AtomicElement =
  | AtomicTextElement
  | AtomicImageElement
  | AtomicButtonElement
  | AtomicContainerElement
  | AtomicCommerceGalleryElement
  | AtomicCommerceProductInfoElement
  | AtomicCommerceBuyBoxElement
  | AtomicCommerceTechnicalSpecsElement;


// ═══════════════════════════════════════════════
// Section Settings Interfaces
// ═══════════════════════════════════════════════

export interface ShopHeroSettings extends DynamicShopSettings {
  eyebrow?: LocalizedValue;
  title?: LocalizedValue;
  description?: LocalizedValue;
  style?: string;
  variant?: ShopHeroVariant;
  showCount?: boolean;
  backgroundImage?: string;
  primaryCtaLabel?: LocalizedValue;
  secondaryCtaLabel?: LocalizedValue;
  suggestedSearches?: LocalizedValue[];
  subtitle?: LocalizedValue;
}

export interface ShopToolbarSettings extends DynamicShopSettings {
  showSearch?: boolean;
  showSort?: boolean;
  showViewToggle?: boolean;
  showFilters?: boolean;
  style?: string;
}

export interface ShopSidebarSettings extends DynamicShopSettings {
  variant?: "standard" | "luxury" | "minimal";
  position?: "left" | "right";
  showCategories?: boolean;
  showPriceFilter?: boolean;
  categoryStyle?: "list" | "grid" | "dropdown";
  showSticky?: boolean;
}

export interface ShopProductGridSettings extends DynamicShopSettings {
  columns?: number;
  mobileColumns?: number;
  gap?: "sm" | "md" | "lg";
  variant?: ShopProductGridVariant;
  productCardVariant?:
    | "default"
    | "vogue"
    | "minimal"
    | "creative"
    | "brutal"
    | "fashion"
    | "luxury"
    | "elessi";
  showBadges?: boolean;
  showAddToCart?: boolean;
  imageHoverAction?: "zoom" | "second-image" | "none";
}

export interface ShopPaginationSettings extends DynamicShopSettings {
  type?: "numbers" | "load-more" | "infinite";
  showPageInfo?: boolean;
}

export interface ShopNewsletterSettings extends DynamicShopSettings {
  title?: LocalizedValue;
  subtitle?: LocalizedValue;
  style?: string;
  variant?: ShopNewsletterVariant;
  benefits?: LocalizedValue[];
  disclaimer?: LocalizedValue;
  socialProof?: LocalizedValue;
  backgroundColor?: string;
}

export interface ShopFeaturedCarouselSettings extends DynamicShopSettings {
  title?: LocalizedValue;
  subtitle?: LocalizedValue;
  limit?: number;
  variant?: ShopFeaturedCarouselVariant;
  autoplay?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  chapterBy?: "category" | "price-range" | "featured";
}

export interface ShopCategoryNavSettings extends DynamicShopSettings {
  layout?: string;
  showAll?: boolean;
  columns?: number;
}

export interface ShopPromoBannerSettings extends DynamicShopSettings {
  message?: string;
  style?: string;
  dismissible?: boolean;
}

export interface ShopEmptyStateSettings extends DynamicShopSettings {
  message?: string;
  showResetButton?: boolean;
  illustration?: string;
}

export interface ShopCatalogHeaderSettings extends DynamicShopSettings {
  variant?:
    | "standard"
    | "minimal"
    | "editorial"
    | "immersive"
    | "split"
    | "luxury"
    | "ethereal-glow"
    | "atelier-nova";
  title?: LocalizedValue;
  subtitle?: LocalizedValue;
  description?: LocalizedValue;
  badge?: LocalizedValue;
  eyebrow?: LocalizedValue;
  metricLabel?: LocalizedValue;
  breadcrumbRootLabel?: LocalizedValue;
}

export interface ShopCategoryGridSettings extends DynamicShopSettings {
  variant?: "standard" | "rose-atelier" | "bento";
  eyebrow?: LocalizedValue;
  title?: LocalizedValue;
  items?: Array<{
    title: LocalizedValue;
    description?: LocalizedValue;
    image: string;
    link: string;
  }>;
}

export interface ShopPDPBreadcrumbsSettings extends DynamicShopSettings {
  variant?: "standard" | "minimal" | "editorial" | "luxury";
  showHome?: boolean;
  separator?: string;
  rootLabel?: LocalizedValue;
  collectionLabel?: LocalizedValue;
}

export interface ShopPDPRelatedSettings extends DynamicShopSettings {
  variant?: "standard" | "luxury" | "grid" | "carousel";
  title?: LocalizedValue;
  limit?: number;
}

export interface ShopPDPMainSettings extends DynamicShopSettings {
  variant?: "default" | "luxury" | "ethereal" | "femme-chic" | "rose-atelier" | "elessi" | "atelier-nova";
  tone?: string;
  layoutDirection?: "row" | "row-reverse" | "col" | "col-reverse";
  galleryColSpan?: number;
  infoColSpan?: number;
  gapClass?: string;
  containerPaddingClass?: string;
  elements?: AtomicElement[];
}

export interface ShopPDPArtisanSettings extends DynamicShopSettings {
  variant?: "luxury" | "standard" | "atelier-nova";
  title?: LocalizedValue;
  description?: LocalizedValue;
  artisanImage?: string;
  highlights?: LocalizedValue[];
  blocks?: Array<{
    title: LocalizedValue;
    description: LocalizedValue;
    icon?: string;
  }>;
  features?: Array<{
    label: LocalizedValue;
    icon?: string;
  }>;
}

export interface ShopFeaturedCollectionSettings extends DynamicShopSettings {
  variant?: "standard" | "femme-chic" | "rose-atelier" | "ethereal";
  heading?: LocalizedValue;
  subheading?: LocalizedValue;
  collectionHandle?: string;
  limit?: number;
}

export interface ShopPromoSettings extends DynamicShopSettings {
  variant?: "standard" | "rose-atelier" | "split";
  eyebrow?: LocalizedValue;
  title?: LocalizedValue;
  description?: LocalizedValue;
  image?: string;
  buttonLabel?: LocalizedValue;
  buttonLink?: string;
  featureOne?: LocalizedValue;
  featureTwo?: LocalizedValue;
}

export interface CommerceLookbookHotspot {
  x: number;
  y: number;
  productId: string;
}

export interface CommerceLookbookSettings extends DynamicShopSettings {
  bgImage?: string;
  hotspots?: CommerceLookbookHotspot[];
  animationType?: "pulse" | "scale";
}

export interface CommerceBundleBuilderStep {
  title: string;
  categoryId?: string;
}

export interface CommerceBundleBuilderSettings extends DynamicShopSettings {
  stepsDefinition?: CommerceBundleBuilderStep[];
  bundleDiscountPercentage?: number;
  layoutType?: "horizontal" | "vertical";
}

export interface ContentSplitStorySettings extends DynamicShopSettings {
  mediaType?: "image" | "video";
  mediaUrl?: string;
  title?: string;
  body?: string;
  mediaAlignment?: "left" | "right";
  ctaText?: string;
  ctaLink?: string;
}

export interface ConversionUrgencyBannerSettings extends DynamicShopSettings {
  message?: string;
  deadlineTimestamp?: string;
  themeType?: "danger" | "exclusive" | "dark";
  ctaText?: string;
}

export interface NavTrendingSearchesSettings extends DynamicShopSettings {
  trendingTerms?: string[];
  visualStyle?: "outline" | "filled" | "underline";
}

export interface CommerceComparisonMatrixSettings extends DynamicShopSettings {
  title?: string;
  subtitle?: string;
  productIds?: string[];
  specificationKeys?: string[];
  highlightWinnerClass?: string;
}

export interface CommerceQuickOrderTableSettings extends DynamicShopSettings {
  title?: string;
  subtitle?: string;
  columnsVisibility?: Array<"image" | "sku" | "stock">;
  requireLogin?: boolean;
}

export interface ConversionUgcMosaicSettings extends DynamicShopSettings {
  title?: string;
  subtitle?: string;
  layoutStyle?: "masonry" | "grid";
}

export interface ConversionGuaranteeStripBadge {
  icon?: string;
  title: string;
  subtitle?: string;
}

export interface ConversionGuaranteeStripSettings extends DynamicShopSettings {
  shapeToggle?: "circle" | "square";
  badges?: ConversionGuaranteeStripBadge[];
}

export interface NavCategoryMasonryBentoItem {
  title: string;
  subtitle?: string;
  image?: string;
  link?: string;
  span?: "both" | "col-span-2" | "row-span-2" | "none";
}

export interface NavCategoryMasonryBentoSettings extends DynamicShopSettings {
  bentoLayout?: "pattern-1" | "pattern-2";
  title?: string;
  subtitle?: string;
  categories?: NavCategoryMasonryBentoItem[];
}

export interface CommerceFlashDropSettings extends DynamicShopSettings {
  launchTimestamp: string;
  title: string;
  subtitle?: string;
  lockedStateContent?: string;
  stockBar?: { total: number; remaining: number };
  productId?: string;
}

export interface ContentFounderNoteSettings extends DynamicShopSettings {
  founderName: string;
  founderRole?: string;
  avatarUrl?: string;
  signatureImage?: string;
  noteBody: string;
  fontFamilyToggle?: "handwriting" | "serif";
}

export interface ContentValuesTickerSettings extends DynamicShopSettings {
  messages: string[];
  speedMs?: number;
  direction?: "left" | "right";
  backgroundColor?: string;
  textColor?: string;
}

export interface ConversionSocialProofToastSettings extends DynamicShopSettings {
  delayBetweenToasts?: number;
  positionContext?: "bottom-left" | "bottom-right";
  mockDataEnabled?: boolean;
}

export interface NavVisualCategoriesRailSettings extends DynamicShopSettings {
  categories: Array<{ title: string; image: string; link: string }>;
  shapeStyle?: "circle" | "pillow" | "square";
  hideScrollbars?: boolean;
}

export interface ContentInteractiveTimelineMilestone {
  year: string;
  title: string;
  description: string;
  image?: string;
}

export interface ContentInteractiveTimelineSettings extends DynamicShopSettings {
  milestones: ContentInteractiveTimelineMilestone[];
  scrollSnapType?: "mandatory" | "proximity";
}

export interface ContentVideoAmbientSettings extends DynamicShopSettings {
  videoSrc: string;
  fallbackImageSrc?: string;
  opacityFilter?: number;
  overlayText?: string;
}

export interface ConversionGatedLeadMagnetSettings extends DynamicShopSettings {
  title: string;
  description: string;
  blurIntensity?: number;
  unlockRequirement: "email" | "phone" | "registration";
  buttonText?: string;
}

export interface NavInPageMegaHubCategory {
  title: string;
  links: Array<{ label: string; url: string }>;
}

export interface NavInPageMegaHubSettings extends DynamicShopSettings {
  title?: string;
  categories: NavInPageMegaHubCategory[];
  columnsCount?: number;
}

export interface NavContextualBreadcrumbsJumpSettings extends DynamicShopSettings {
  enableSiblingDropdowns?: boolean;
  designVariant?: "sticky-bottom" | "inline-block";
}

export interface AtomicSectionSettings extends DynamicShopSettings {
  elements?: AtomicElement[];
}

// ═══════════════════════════════════════════════
// Section Config Types
// ═══════════════════════════════════════════════

export interface ShopHeroSection extends ShopSectionBase {
  type: "shop-hero";
  settings?: ShopHeroSettings;
}

export interface ShopToolbarSection extends ShopSectionBase {
  type: "shop-toolbar";
  settings?: ShopToolbarSettings;
}

export interface ShopSidebarSection extends ShopSectionBase {
  type: "shop-sidebar";
  settings?: ShopSidebarSettings;
}

export interface ShopProductGridSection extends ShopSectionBase {
  type: "shop-product-grid";
  settings?: ShopProductGridSettings;
}

export interface ShopCatalogHeaderSection extends ShopSectionBase {
  type: "shop-catalog-header";
  settings?: ShopCatalogHeaderSettings;
}

export interface ShopPDPBreadcrumbsSection extends ShopSectionBase {
  type: "shop-pdp-breadcrumbs";
  settings?: ShopPDPBreadcrumbsSettings;
}

export interface ShopPDPRelatedSection extends ShopSectionBase {
  type: "shop-pdp-related";
  settings?: ShopPDPRelatedSettings;
}

export interface ShopPDPMainSection extends ShopSectionBase {
  type: "shop-pdp-main";
  settings?: ShopPDPMainSettings;
}

export interface ShopPDPArtisanSection extends ShopSectionBase {
  type: "shop-pdp-artisan";
  settings?: ShopPDPArtisanSettings;
}

export interface ShopFeaturedCollectionSection extends ShopSectionBase {
  type: "shop-featured-collection";
  settings?: ShopFeaturedCollectionSettings;
}

export interface ShopCategoryGridSection extends ShopSectionBase {
  type: "shop-category-grid";
  settings?: ShopCategoryGridSettings;
}

export interface ShopPromoSection extends ShopSectionBase {
  type: "shop-promo";
  settings?: ShopPromoSettings;
}

export interface ShopPaginationSection extends ShopSectionBase {
  type: "shop-pagination";
  settings?: ShopPaginationSettings;
}

export interface ShopNewsletterSection extends ShopSectionBase {
  type: "shop-newsletter";
  settings?: ShopNewsletterSettings;
}

export interface ShopFeaturedCarouselSection extends ShopSectionBase {
  type: "shop-featured-carousel";
  settings?: ShopFeaturedCarouselSettings;
}

export interface ShopCategoryNavSection extends ShopSectionBase {
  type: "shop-category-nav";
  settings?: ShopCategoryNavSettings;
}

export interface ShopPromoBannerSection extends ShopSectionBase {
  type: "shop-promo-banner";
  settings?: ShopPromoBannerSettings;
}

export interface ShopEmptyStateSection extends ShopSectionBase {
  type: "shop-empty-state";
  settings?: ShopEmptyStateSettings;
}

export interface CommerceLookbookSection extends ShopSectionBase {
  type: "commerce-shoppable-lookbook";
  settings?: CommerceLookbookSettings;
}

export interface CommerceBundleBuilderSection extends ShopSectionBase {
  type: "commerce-bundle-builder";
  settings?: CommerceBundleBuilderSettings;
}

export interface ContentSplitStorySection extends ShopSectionBase {
  type: "content-split-story";
  settings?: ContentSplitStorySettings;
}

export interface ConversionUrgencyBannerSection extends ShopSectionBase {
  type: "conversion-urgency-timer-banner";
  settings?: ConversionUrgencyBannerSettings;
}

export interface NavTrendingSearchesSection extends ShopSectionBase {
  type: "nav-trending-searches";
  settings?: NavTrendingSearchesSettings;
}

export interface CommerceComparisonMatrixSection extends ShopSectionBase {
  type: "commerce-comparison-matrix";
  settings?: CommerceComparisonMatrixSettings;
}

export interface CommerceQuickOrderTableSection extends ShopSectionBase {
  type: "commerce-quick-order-table";
  settings?: CommerceQuickOrderTableSettings;
}

export interface ConversionUgcMosaicSection extends ShopSectionBase {
  type: "conversion-ugc-mosaic";
  settings?: ConversionUgcMosaicSettings;
}

export interface ConversionGuaranteeStripSection extends ShopSectionBase {
  type: "conversion-guarantee-strip";
  settings?: ConversionGuaranteeStripSettings;
}

export interface NavCategoryMasonryBentoSection extends ShopSectionBase {
  type: "nav-category-masonry-bento";
  settings?: NavCategoryMasonryBentoSettings;
}

export interface CommerceFlashDropSection extends ShopSectionBase {
  type: "commerce-flash-drop";
  settings?: CommerceFlashDropSettings;
}

export interface ContentFounderNoteSection extends ShopSectionBase {
  type: "content-founder-note";
  settings?: ContentFounderNoteSettings;
}

export interface ContentValuesTickerSection extends ShopSectionBase {
  type: "content-values-ticker";
  settings?: ContentValuesTickerSettings;
}

export interface ConversionSocialProofToastSection extends ShopSectionBase {
  type: "conversion-social-proof-toast";
  settings?: ConversionSocialProofToastSettings;
}

export interface NavVisualCategoriesRailSection extends ShopSectionBase {
  type: "nav-visual-categories-rail";
  settings?: NavVisualCategoriesRailSettings;
}

export interface ContentInteractiveTimelineSection extends ShopSectionBase {
  type: "content-interactive-timeline";
  settings?: ContentInteractiveTimelineSettings;
}

export interface ContentVideoAmbientSection extends ShopSectionBase {
  type: "content-video-ambient";
  settings?: ContentVideoAmbientSettings;
}

export interface ConversionGatedLeadMagnetSection extends ShopSectionBase {
  type: "conversion-gated-lead-magnet";
  settings?: ConversionGatedLeadMagnetSettings;
}

export interface NavInPageMegaHubSection extends ShopSectionBase {
  type: "nav-inpage-mega-hub";
  settings?: NavInPageMegaHubSettings;
}

export interface NavContextualBreadcrumbsJumpSection extends ShopSectionBase {
  type: "nav-contextual-breadcrumbs-jump";
  settings?: NavContextualBreadcrumbsJumpSettings;
}

export interface AtomicSection extends ShopSectionBase {
  type: "atomic-section";
  settings?: AtomicSectionSettings;
}

// ═══════════════════════════════════════════════
// Union Types
// ═══════════════════════════════════════════════

export type ShopSectionConfig =
  | ShopHeroSection
  | ShopToolbarSection
  | ShopSidebarSection
  | ShopProductGridSection
  | ShopCatalogHeaderSection
  | ShopPaginationSection
  | ShopNewsletterSection
  | ShopFeaturedCarouselSection
  | ShopCategoryNavSection
  | ShopPromoBannerSection
  | ShopEmptyStateSection
  | ShopPDPBreadcrumbsSection
  | ShopPDPRelatedSection
  | ShopPDPMainSection
  | ShopPDPArtisanSection
  | ShopFeaturedCollectionSection
  | ShopCategoryGridSection
  | ShopPromoSection
  | CommerceLookbookSection
  | CommerceBundleBuilderSection
  | ContentSplitStorySection
  | ConversionUrgencyBannerSection
  | NavTrendingSearchesSection
  | CommerceComparisonMatrixSection
  | CommerceQuickOrderTableSection
  | ConversionUgcMosaicSection
  | ConversionGuaranteeStripSection
  | NavCategoryMasonryBentoSection
  | CommerceFlashDropSection
  | ContentFounderNoteSection
  | ContentValuesTickerSection
  | ConversionSocialProofToastSection
  | NavVisualCategoriesRailSection
  | ContentInteractiveTimelineSection
  | ContentVideoAmbientSection
  | ConversionGatedLeadMagnetSection
  | NavInPageMegaHubSection
  | NavContextualBreadcrumbsJumpSection
  | AtomicSection;


// ═══════════════════════════════════════════════
// Composition Config
// ═══════════════════════════════════════════════

export interface ShopCompositionConfig {
  layoutFamily: StorefrontLayoutFamily;
  sections: ShopSectionConfig[];
  layout?: {
    maxWidth?: string;
    padding?: string;
    backgroundColor?: string;
  };
}

// ═══════════════════════════════════════════════
// Context Type for Sections
// ═══════════════════════════════════════════════

export interface ShopSectionContext {
  shop: {
    products: any[];
    categories: any[];
    loading: boolean;
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
    storefrontSettings: Record<string, unknown>;
    activeFilters: unknown;
    priceRange?: { min: number; max: number };
    quickViewProductId: string | null;
    selectedCategory: string;
    sortBy: string;
    shopStudioConfig?: any;
    stitchSearchInput: string;
    setQuickViewProductId: (id: string | null) => void;
    setActiveFilters: (filters: unknown) => void;
    setStitchSearchInput: (input: string) => void;
    handleCategoryChange: (categoryId: string) => void;
    handleSortChange: (sort: string) => void;
    handlePageChange: (newPage: number) => void;
    loadNextPage: () => void;
    handleSearchSubmit: (event?: FormEvent | string) => void;
    addToCart: (product: any, variantId?: string, quantity?: number) => Promise<void>;
    canLoadMore?: boolean;
    advancedFiltersElement?: ReactNode;
  };
  themeTokens?: any;
  toneStyles?: Record<string, string>;
  companyId?: string | null;
}
