import { CSSProperties } from 'react';
import { Product } from '../../hooks/useProducts';
import { StorefrontTheme } from '../../types/theme.types';

export type ProductCardVariant =
  | 'standard'
  | 'minimal'
  | 'overlay'
  | 'compact'
  | 'luxury'
  | 'editorial'
  | 'glass'
  | 'list'
  | 'playful'
  | 'retail-air'
  | 'retail-direct'
  | 'pastel-fashion'
  | 'fastly-offer'
  | 'boutique-air'
  | 'editorial-bare'
  | 'plant-bare'
  | 'harvest-crate'
  | 'butcher-black-label'
  | 'carry-frame'
  | 'pedal-frame'
  | 'signal-rack'
  | 'marketplace-row';

export interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  styleOverrides?: CSSProperties;
  quickViewLabel?: string;
  addToWishlistLabel?: string;
  imageLoading?: 'lazy' | 'eager';
  imageFetchPriority?: 'high' | 'low' | 'auto';
}

export interface ProductCardController {
  // Identity & Theme
  product: Product;
  name: string;
  features: Record<string, any>;
  variant: ProductCardVariant;
  theme: StorefrontTheme;
  isRtl: boolean;
  settings: any;
  storefrontSettings: any;
  currency: string;
  productPath: string;
  shouldForceDocumentNavigation: boolean;
  styleOverrides?: CSSProperties;

  // Specific Theme Flags
  isAirlume: boolean;
  isSoleaFemme: boolean;
  isFakhama: boolean;
  isDistrictMarket: boolean;
  isPerfumeEg: boolean;
  isVelaFashion: boolean;
  isFastlyTheme: boolean;
  isZenOrganic: boolean;
  isBiteRush: boolean;
  isCafeDemo: boolean;
  isClosetOs: boolean;
  isElegantLuxe: boolean;
  isKhemetLuxe: boolean;
  isButcherCounter: boolean;
  isPharmacy: boolean;
  isRedLine: boolean;
  isVelaAccessoryDrivenCard: boolean;
  prefersArabicCopy: boolean;

  // Stock & Inventory
  hasVariantChoices: boolean;
  stockQuantity: number | null;
  isStrictlyOutOfStock: boolean;
  isLowStock: boolean;

  // Pricing & Ratings
  formattedPrice: string;
  numericPrice: number;
  numericComparePrice?: number;
  hasDiscount: boolean;
  discountPercentage: number | null;
  formattedComparePrice: string | null;
  savingsAmount: number | null;
  formattedSavings: string | null;
  ratingValue: number | null;
  reviewCount: number | null;

  // Images & Visuals
  imageCandidates: string[];
  resolvedImageLoading: 'lazy' | 'eager';
  resolvedImageFetchPriority?: 'high' | 'low';
  renderImageFallback: (className?: string) => React.ReactNode;
  FloatingIcons: React.FC<{ forceVisible?: boolean }>;
  DiscountBadge: React.FC<{ className?: string; showSavings?: boolean }>;
  UrgencyBadge: React.FC<{ className?: string }>;
  CardShell: React.FC<{
    children: React.ReactNode;
    className: string;
    style?: CSSProperties;
  }>;
  productCardStyles: (overrides?: CSSProperties) => CSSProperties;

  // Labels & Summaries
  categoryLabel: string;
  finalQuickViewLabel: string;
  finalWishlistLabel: string;
  detailLabel: string;
  actionLabel: string;
  shopperSummary: string;
  listSummary: string;
  luxuryTopBadge: string;
  luxuryAssistLabel: string;
  luxurySummary: string;
  cutlineClubRailCode: string;
  cutlineClubPosterTag: string;
  cutlineClubListSummary: string;
  closetOsSlotLabel: string;
  closetOsCareLabel: string;
  closetOsPlannerSummary: string;
  carryColorOptions: string[];
  carrySizeOptions: string[];
  carryCardSummary: string;
  featuredBadgeLabel: string;
  editorialEyebrow: string;

  // State & Handlers
  isHovered: boolean;
  setIsHovered: (h: boolean) => void;
  isQuickViewOpen: boolean;
  setIsQuickViewOpen: (o: boolean) => void;
  isWishlisted: boolean;
  handlePrefetch: () => void;
  openProductPath: () => void;
  handleAddToCart: (e: React.MouseEvent) => void;
  handleQuickBuy: (e: React.MouseEvent) => void;
  handleQuickView: (e: React.MouseEvent) => void;
  handleWishlist: (e: React.MouseEvent) => void;
}
