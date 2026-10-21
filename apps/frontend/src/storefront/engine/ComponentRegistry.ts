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
const ImageHotspot = React.lazy(() => import('../sections/ImageHotspot'));
const BeforeAfterSlider = React.lazy(() => import('../sections/BeforeAfterSlider'));
const CarModelMatcher = React.lazy(() => import('../sections/CarModelMatcher'));
const AutomotiveBento = React.lazy(() => import('../sections/AutomotiveBento'));
const CombinedListing = React.lazy(() => import('../sections/CombinedListing'));
const HoverCards = React.lazy(() => import('../sections/HoverCards'));
const CountdownSection = React.lazy(() => import('../sections/Countdown'));
const CollectionTab = React.lazy(() => import('../sections/CollectionTab'));
const BackgroundVideo = React.lazy(() => import('../sections/BackgroundVideo'));
const ScrollingCards = React.lazy(() => import('../sections/ScrollingCards'));
const SocialGallery = React.lazy(() => import('../sections/SocialGallery'));
const RichText = React.lazy(() => import('../sections/RichText'));
const FeaturedProduct = React.lazy(() => import('../sections/FeaturedProduct'));
const ReviewsCircle = React.lazy(() => import('../sections/Reviews'));
const ShopTheLook = React.lazy(() => import('../sections/ShopTheLook'));
const LookMosaic = React.lazy(() => import('../sections/LookMosaic'));
const LookPlanner = React.lazy(() => import('../sections/LookPlanner'));
const LookProgress = React.lazy(() => import('../sections/LookProgress'));
const Dental3DShowcase = React.lazy(() => import('../sections/Dental3DShowcase'));
const DentalSampleKit = React.lazy(() => import('../sections/DentalSampleKit'));

// Independent element primitives (Ticket 5C)
const HeadingElement = React.lazy(() => import('../sections/elements/HeadingElement'));
const TextElement = React.lazy(() => import('../sections/elements/TextElement'));
const ImageElement = React.lazy(() => import('../sections/elements/ImageElement'));
const ButtonElement = React.lazy(() => import('../sections/elements/ButtonElement'));
const IconElement = React.lazy(() => import('../sections/elements/IconElement'));
const DividerElement = React.lazy(() => import('../sections/elements/DividerElement'));
const SpacerElement = React.lazy(() => import('../sections/elements/SpacerElement'));
const VideoElement = React.lazy(() => import('../sections/elements/VideoElement'));

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
  'image-hotspot': ImageHotspot,
  'before-after': BeforeAfterSlider,
  'car-model-matcher': CarModelMatcher,
  'automotive-bento': AutomotiveBento,
  'combined-listing': CombinedListing,
  'hover-cards': HoverCards,
  countdown: CountdownSection,
  'collection-tab': CollectionTab,
  'background-video': BackgroundVideo,
  'scrolling-cards': ScrollingCards,
  'social-gallery': SocialGallery,
  richtext: RichText,
  'featured-product': FeaturedProduct,
  'review-circle': ReviewsCircle,
  'shop-the-look': ShopTheLook,
  'look-mosaic': LookMosaic,
  'look-planner': LookPlanner,
  'look-progress': LookProgress,
  'dental-3d-showcase': Dental3DShowcase,
  'dental-sample-kit': DentalSampleKit,

  // Independent element primitives
  heading: HeadingElement,
  text: TextElement,
  image: ImageElement,
  button: ButtonElement,
  icon: IconElement,
  divider: DividerElement,
  spacer: SpacerElement,
  video: VideoElement,
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
