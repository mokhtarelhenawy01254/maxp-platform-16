import type { LucideIcon } from "lucide-react";

export interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  nameEn?: string;
  category: string;
  description: string;
  descriptionEn?: string;
  icon?: string;
  logo?: string;
  coverImage?: string;
  screenshots?: string[];
  images?: string[] | null;
  demoVideo?: string;
  livePreviewUrl?: string;
  pricingModel: "FREE" | "SUBSCRIPTION" | "PAY_PER_USE";
  unitPrice?: number;
  unitName?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  setupFee?: number;
  trialDays: number;
  features: Record<string, unknown> | unknown[];
  positioning?: Record<string, unknown> | null;
  limitations?: unknown;
  isActive: boolean;
  isFeatured: boolean;
  isPopular: boolean;
  isOfficial?: boolean;
  isVerified?: boolean;
  isAiPowered?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isEnterpriseReady?: boolean;
  isEditorChoice?: boolean;
  isRecentlyUpdated?: boolean;
  installCount: number;
  rating?: number;
  reviewCount: number;
  requiredApps?: string[] | string | null;
  changelog?: ChangelogEntry[];
  faq?: FAQEntry[];
  developer?: DeveloperInfo;
  privacyPolicy?: string;
  termsUrl?: string;
  supportEmail?: string;
  supportUrl?: string;
  docsUrl?: string;
  version?: string;
  lastUpdate?: string;
  compatibility?: string[];
  tags?: string[];
  activePricingModel?: string;
  isInstalled?: boolean;
  isIncludedInPlan?: boolean;
  reviews?: Review[];
  mainRoute?: string | null;
  adminRoute?: string | null;
  pricingRules?: PricingRule[];
  relatedApps?: string[];
  frequentlyInstalledWith?: string[];
  _count?: {
    installations: number;
    reviews: number;
  };
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface FAQEntry {
  question: string;
  answer: string;
}

export interface DeveloperInfo {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  joinDate?: string;
  totalApps?: number;
  totalDownloads?: number;
  averageRating?: number;
  website?: string;
  supportEmail?: string;
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
  isVerified: boolean;
  helpfulVotes?: number;
  developerReply?: string;
  createdAt: string;
  user?: {
    name: string;
    avatar?: string;
  };
}

export interface Category {
  category: string;
  name: string;
  nameEn: string;
  icon: string;
  count: number;
}

export interface PricingRule {
  id: string;
  name: string;
  description?: string;
  price: number;
  model: "MONTHLY" | "YEARLY" | "LIFETIME" | "TRIAL" | "ENTERPRISE" | "CUSTOM";
  discount?: number;
  couponCode?: string;
  promotionalLabel?: string;
}

export interface AppBundle {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice?: number;
  discount: number;
  isActive: boolean;
  apps: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    monthlyPrice: number;
    logo?: string;
  }>;
}

export interface InstalledApp {
  id: string;
  status: "ACTIVE" | "TRIAL" | "CANCELLED" | "EXPIRED";
  isExpired?: boolean;
  activePricingModel: string;
  trialEndsAt?: string;
  validUntil?: string;
  totalSpent: number;
  monthlyUsage?: {
    totalCost: number;
    totalQuantity: number;
  };
  createdAt: string;
  app: MarketplaceApp;
  usageLogs?: Array<{
    id: string;
    feature?: string | null;
    quantity: number;
    totalCost: number | string;
    createdAt: string;
    metadata?: Record<string, unknown> | null;
  }>;
}

export interface MarketplaceSpecialty {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  icon?: string | null;
}

export type AppBadgeType =
  | "OFFICIAL"
  | "VERIFIED"
  | "AI_POWERED"
  | "NEW"
  | "UPDATED"
  | "BEST_SELLER"
  | "TRENDING"
  | "ENTERPRISE_READY"
  | "EDITOR_CHOICE"
  | "FREE"
  | "PREMIUM"
  | "TRIAL"
  | "DISCOUNT";

export interface AppBadge {
  type: AppBadgeType;
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export type ToolCollectionId = "ALL" | "FEATURED" | "POPULAR" | "TRENDING" | "FREE";

export type SectionType =
  | "FEATURED"
  | "POPULAR"
  | "TRENDING"
  | "NEW"
  | "RECENTLY_UPDATED"
  | "STAFF_PICKS"
  | "AI_RECOMMENDED"
  | "BEST_RATED"
  | "OFFICIAL"
  | "FREE"
  | "PREMIUM"
  | "EDITOR_CHOICE"
  | "RECOMMENDED_FOR_YOU"
  | "SIMILAR"
  | "FREQUENTLY_INSTALLED";

export type SortOption = "featured" | "popular" | "newest" | "price_low" | "price_high" | "rating" | "installs" | "updated";

export interface MarketplaceFilters {
  category?: string;
  priceModel?: "FREE" | "PAID" | "ALL";
  minRating?: number;
  isAiPowered?: boolean;
  isOfficial?: boolean;
  isNew?: boolean;
  isRecentlyUpdated?: boolean;
  developer?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  compatibility?: string[];
  collection?: ToolCollectionId;
}

declare global {
  interface JSON {
    parse(text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown): unknown;
  }
}
