import React from 'react';
import type { Product } from '../hooks/useProduct';
import type { StorefrontTheme } from '../types/theme.types';

export interface ProductInfoProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    addToCartText?: string;
    buyNowText?: string;
    descriptionTitle?: string;
    shippingTitle?: string;
    shippingText?: string;
    shippingInteraction?: string;
    shippingTriggerText?: string;
    shippingModalTitle?: string;
    sizeGuideInteraction?: string;
    sizeGuideModalTitle?: string;
    showGuarantees?: boolean | string;
    guaranteesTitle?: string;
    guaranteesSubtitle?: string;
    guaranteeItems?: string;
    guaranteeStyle?: string;
    sizeGuideText?: string;
    sizeGuideLink?: string;
    fitNote?: string;
    sizeGuideLayout?: string;
    isFakhama?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ProductInfoController {
  id: string | undefined;
  variant: string;
  theme: StorefrontTheme;
  settings?: Record<string, any>;
  sectionSettings?: Record<string, any>;
  product: Product | null | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  currency: string;
  homePath: string;
  shopPath: string;
  prefersArabicCopy: boolean;
  usesCommerceHeaderLabel: boolean;

  // Prices and discounts
  activePrice: number;
  activeComparePrice: number | null;
  displayPrice: string;
  originalPrice: string | null;
  discount: number | null;
  effectivePrice: number;

  // Variant & options selection
  selectedVariant: any;
  selectedAttributes: Record<string, string>;
  setSelectedAttributes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  variantSettings: any;
  isStrictlyOutOfStock: boolean;
  stockStatusLabel: string;
  selectedOptionSummary: string;
  inventoryCountdownText: string;

  // Quantity and actions
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  handleAddToCart: () => Promise<void>;
  handleBuyNow: () => Promise<void>;
  handleShareAction: (platformId: string) => Promise<void>;

  // Copy and button labels
  addToCartText: string;
  buyNowText: string;
  addToCartButtonClassName: string;
  buyNowButtonClassName: string;
  descriptionTitle: string;
  shippingTitle: string;
  shippingText: string;
  shippingInteraction: string;
  sizeGuideInteraction: string;
  guaranteesTitle: string;
  guaranteesSubtitle: string;
  guaranteeItems: any[];
  guaranteeStyle: 'strip' | 'grid' | 'minimal';
  showGuarantees: boolean;
  canOpenSizeGuide: boolean;
  sizeGuideText: string;
  rawSizeGuideHref: string;
  isExternalSizeGuideHref: boolean;
  sizeGuideDialog: React.ReactNode;
  shippingPolicyDialog: React.ReactNode;
  questionDialog: React.ReactNode;
  openQuestionModal: () => void;
  openShippingModal: () => void;
  openSizeGuideModal: () => void;

  // Conversion modules & tickers
  isSoldCounterEnabled: boolean;
  isPurchaseFomoEnabled: boolean;
  isLowStockNoticeEnabled: boolean;
  isStickyAddToCartEnabled: boolean;
  showStickyCta: boolean;
  currentViewerCount: number;
  recentSalesCount: number;
  stockLevelCount: number;
  saleCountdown: {
    hours: string;
    minutes: string;
    seconds: string;
  } | null;
  cashbackPreview: { cashback: number; currency: string } | null;

  // Theme variant flags
  isAirlume: boolean;
  isNovaMobile: boolean;
  isCairoStride: boolean;
  isFakhama: boolean;
  isZenOrganic: boolean;
  isIntruderNft: boolean;
  isMenShoesEg: boolean;
  isBiteRush: boolean;
  isCutlineClub: boolean;
  isLegacyDefaultOld: boolean;
  isElessiPackTheme: boolean;
  isPcHubCommandSpecs: boolean;
  isWomenStyleLedger: boolean;
  isWomenUtilityRail: boolean;
  isStyleStoreUtilityRail: boolean;
  isGracefulInfo: boolean;
  isVelaFashionDirectBuybox: boolean;
  isAtelierBuybox: boolean;
  isButcherAtelier: boolean;
  isWomenProductInfoVariant: boolean;
  isPerfumeScentBrief: boolean;
  isElessiBagBuybox: boolean;
  isElessiBuybox: boolean;
  isElessiSpecBuybox: boolean;
  isElessiGarageBuybox: boolean;
  isElessiGiftBuybox: boolean;
  isElessiPetBuybox: boolean;
  isElessiWatchBuybox: boolean;
  isElessiCareBuybox: boolean;
  isElessiOrganicBuybox: boolean;
  isElessiPlantBuybox: boolean;
  isElessiBikeBuybox: boolean;
  isElessiDigitalBuybox: boolean;
  isRedlineAuto: boolean;
  isAnyElessiBuybox: boolean;
  isMarketplaceBazaar?: boolean;
  isKhemetInlineQuickOrderBuybox: boolean;
  mergedInlinePdpQuickOrder?: React.ReactNode;
  inlineQuantityOffers?: React.ReactNode;
  isPrimaryQuantityOffersDecision?: boolean;

  // External / affiliate
  externalProductConfig: {
    url: string;
    label: string;
    vendor: string;
    description: string;
    externalOnly: boolean;
  };
  externalOnlyProduct: boolean;
  showExternalAffiliateCta: boolean;
  renderExternalPurchaseCta: (layout: 'inline' | 'card' | 'block') => React.ReactNode;
  renderAmazonBuyCta: (layout?: 'inline' | 'card') => React.ReactNode;

  // Layout & UI elements
  specs: Array<{ label: string; value: string }>;
  shortDescription: string;
  descriptionPreviewText: string;
  safeDescription: string;
  breadcrumbHomeLabel: string;
  breadcrumbShopLabel: string;
  productCategoryLabel: string;
  productTagValues: string[];
  reviewsAverageRating: number;
  reviewsCount: number;
  shouldRenderStandaloneBuyBox: boolean;
  shouldRenderPrimaryBuyBox: boolean;
  isCartOpen: boolean;
  hasEmbeddedPdpCheckout: boolean;
  inlinePdpQuickOrderFallback?: React.ReactNode;
  commonVariantSelector: React.ReactNode;
  commonActions: React.ReactNode;
  commonHeader?: React.ReactNode;
  commonPrice?: React.ReactNode;
}
