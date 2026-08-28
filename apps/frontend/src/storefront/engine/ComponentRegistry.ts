import React from 'react';
import { STOREFRONT_SECTION_MANIFEST } from '../sections/manifest';

// ALL sections are now lazy-loaded for optimal code splitting.
// Previously HeroBanner (99KB), PromoStrip, ShopCommandBar were eager — this
// caused them to ship in every storefront route even when unused (e.g. PDP).
const HeroBanner = React.lazy(() => import('../sections/HeroBanner'));
const PromoStrip = React.lazy(() => import('../sections/PromoStrip'));
const ShopCommandBar = React.lazy(() => import('../sections/ShopCommandBar'));
const ProductGrid = React.lazy(() => import('../sections/ProductGrid'));
const Newsletter = React.lazy(() => import('../sections/Newsletter'));
const LookbookShowcase = React.lazy(() => import('../sections/LookbookShowcase'));
const FeaturedCollections = React.lazy(() => import('../sections/FeaturedCollections'));
const FiltersSidebar = React.lazy(() => import('../sections/FiltersSidebar'));
const ShopPromoRail = React.lazy(() => import('../sections/ShopPromoRail'));
const ProductGallery = React.lazy(() => import('../sections/ProductGallery'));
const ProductInfo = React.lazy(() => import('../sections/ProductInfo'));
const QuantityOffersSection = React.lazy(() => import('../sections/QuantityOffersSection'));
const ConversionStack = React.lazy(() => import('../sections/ConversionStack'));
const SizeGuide = React.lazy(() => import('../sections/SizeGuide'));
const BoughtTogetherSection = React.lazy(() => import('../sections/BoughtTogetherSection'));
const RelatedProducts = React.lazy(() => import('../sections/RelatedProducts'));
const ReviewsSection = React.lazy(() => import('../sections/ReviewsSection'));
const CartItems = React.lazy(() => import('../sections/CartItems'));
const OrderSummary = React.lazy(() => import('../sections/OrderSummary'));
const CheckoutForm = React.lazy(() => import('../sections/CheckoutForm'));
const PaymentSection = React.lazy(() => import('../sections/PaymentSection'));
const PdpCheckout = React.lazy(() => import('../sections/PdpCheckout'));
const HeroWithSidebar = React.lazy(() => import('../sections/HeroWithSidebar'));
const GlassmorphicGrid = React.lazy(() => import('../sections/GlassmorphicGrid'));
const StoryParallax = React.lazy(() => import('../sections/StoryParallax'));
const OrderConfirmation = React.lazy(() => import('../sections/OrderConfirmation'));
const ServicesGrid = React.lazy(() => import('../sections/ServicesGrid'));
const FeaturesBar = React.lazy(() => import('../sections/FeaturesBar'));
const MemberRegistration = React.lazy(() => import('../sections/MemberRegistration'));
const ShoppingIntents = React.lazy(() => import('../sections/ShoppingIntents'));
const OfferBento = React.lazy(() => import('../sections/OfferBento'));
const InfoContentSection = React.lazy(() => import('../sections/InfoContentSection'));
const JournalStrip = React.lazy(() => import('../sections/JournalStrip'));
const ShoeFitFinder = React.lazy(() => import('../sections/ShoeFitFinder'));
const TikTokFeedSection = React.lazy(() => import('../sections/TikTokFeedSection'));
const AffiliateDisclosure = React.lazy(() => import('../sections/AffiliateDisclosure'));
const AffiliateTopPicks = React.lazy(() => import('../sections/AffiliateTopPicks'));
const ArticleGrid = React.lazy(() => import('../sections/ArticleGrid'));
const AffiliateQuiz = React.lazy(() => import('../sections/AffiliateQuiz'));
const AffiliateFaq = React.lazy(() => import('../sections/AffiliateFaq'));
const AffiliateToc = React.lazy(() => import('../sections/AffiliateToc'));
const AffiliateProTip = React.lazy(() => import('../sections/AffiliateProTip'));
const AffiliateSources = React.lazy(() => import('../sections/AffiliateSources'));
const AffiliateBreadcrumbs = React.lazy(() => import('../sections/AffiliateBreadcrumbs'));
const AffiliateArticleSeo = React.lazy(() => import('../sections/AffiliateArticleSeo'));

const baseComponentRegistry: Record<
  string,
  React.ComponentType<any>
> = {
  'promo-strip': PromoStrip,
  'hero-banner': HeroBanner,
  'featured-collections': FeaturedCollections,
  'featured-products': ProductGrid,
  'lookbook-showcase': LookbookShowcase,
  'newsletter': Newsletter,
  'hero-sidebar': HeroWithSidebar,
  'tech-grid': GlassmorphicGrid,
  'story-parallax': StoryParallax,
  'product-grid': ProductGrid,
  'filters-sidebar': FiltersSidebar,
  'shop-command-bar': ShopCommandBar,
  'shop-promo-rail': ShopPromoRail,
  'product-gallery': ProductGallery,
  'product-info': ProductInfo,
  'quantity-offers': QuantityOffersSection,
  'conversion-stack': ConversionStack,
  'size-guide': SizeGuide,
  'bought-together': BoughtTogetherSection,
  'related-products': RelatedProducts,
  reviews: ReviewsSection,
  'cart-items': CartItems,
  'order-summary': OrderSummary,
  'checkout-form': CheckoutForm,
  payment: PaymentSection,
  'pdp-checkout': PdpCheckout,
  'order-confirmation': OrderConfirmation,
  'services-grid': ServicesGrid,
  'features-bar': FeaturesBar,
  'shopping-intents': ShoppingIntents,
  'offer-bento': OfferBento,
  'shoe-fit-finder': ShoeFitFinder,
  'journal-strip': JournalStrip,
  'info-content': InfoContentSection,
  'member-registration': MemberRegistration,
  'tiktok-feed': TikTokFeedSection,
  'affiliate-disclosure': AffiliateDisclosure,
  'affiliate-top-picks': AffiliateTopPicks,
  'article-grid': ArticleGrid,
  'affiliate-quiz': AffiliateQuiz,
  'affiliate-faq': AffiliateFaq,
  'affiliate-toc': AffiliateToc,
  'affiliate-pro-tip': AffiliateProTip,
  'affiliate-sources': AffiliateSources,
  'affiliate-breadcrumbs': AffiliateBreadcrumbs,
  'affiliate-article-seo': AffiliateArticleSeo,
};

/**
 * Central registry mapping JSON section IDs to React components.
 * The PageComposer reads `theme.pages.<pageType>.sections` array and
 * resolves each string key through this map.
 */
export const ComponentRegistry: Record<
  string,
  React.ComponentType<any>
> = Object.entries(STOREFRONT_SECTION_MANIFEST).reduce(
  (registry, [sectionId, sectionConfig]) => {
    const sectionComponent = baseComponentRegistry[sectionConfig.component];
    if (sectionComponent) {
      registry[sectionId] = sectionComponent;
    }
    return registry;
  },
  { ...baseComponentRegistry },
);
