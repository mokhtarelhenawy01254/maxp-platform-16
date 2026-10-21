import type { ProductWorkflow } from "../utils/workflow";

export type WorkflowAction =
  | "save_draft"
  | "submit_review"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish";

export type ProductAttribute = {
  id: string;
  name: string;
  slug: string;
  values: string[];
  visible?: boolean;
  forVariations?: boolean;
  requiredForOrder?: boolean;
};

export type ProductMetadata = Record<string, unknown> & {
  workflow?: ProductWorkflow;
  shippingClass?: string;
  excludeFromFreeShipping?: boolean;
  barcode?: string;
  isPreOrder?: boolean;
  preOrderDate?: string;
  preOrderMessage?: string;
  externalUrl?: string;
  affiliateUrl?: string;
  externalButtonLabel?: string;
  affiliateButtonLabel?: string;
  externalVendor?: string;
  partnerName?: string;
  vendorName?: string;
  externalDescription?: string;
  affiliateDescription?: string;
  externalOnly?: boolean;
  externalAffiliateOnly?: boolean;
  isExternalProduct?: boolean;
  affiliateVisibility?: string;
  affiliateVisibleAffiliateIds?: unknown;
  visibleAffiliateIds?: unknown;
  allowedAffiliateIds?: unknown;
  attributes?: ProductAttribute[];
  aiOrderOptions?: {
    requiredAttributes?: string[];
    attributeLabels?: Record<string, string>;
  };
  relatedProducts?: string[];
  upsellProducts?: string[];
  crossSellProducts?: string[];
  variantSettings?: unknown;
};

export type ProductCategory = {
  id: string;
  name?: string;
  title?: string;
  [key: string]: unknown;
};

export type ProductListItem = {
  id: string;
  name?: string;
  title?: string;
  [key: string]: unknown;
};

export type ProductImageSource =
  | string
  | {
      fullUrl?: string;
      url?: string;
      path?: string;
    };

export type VariantMetadata = Record<string, unknown> & {
  image?: string;
  description?: string;
  weight?: number;
  dimensions?: Record<string, unknown>;
  shippingClass?: string;
  allowBackorders?: boolean;
  lowStockThreshold?: number;
  attributeValues?: Record<string, string>;
};

export type EditableVariant = {
  id?: string;
  name?: string;
  type?: string;
  sku?: string;
  price?: string | number;
  comparePrice?: string | number;
  cost?: string | number;
  images?: string | ProductImageSource[];
  stock?: number;
  trackInventory?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  image?: string;
  description?: string;
  weight?: string | number;
  dimensions?: string | Record<string, unknown>;
  shippingClass?: string;
  allowBackorders?: boolean;
  lowStockThreshold?: number;
  attributeValues?: string | Record<string, string>;
  metadata?: string | VariantMetadata | null;
};

export type MerchantInventorySnapshot = {
  canEditStock?: boolean;
  stockLocationLabel?: string;
  availableForSale?: number;
} | null;

export type EditableProduct = {
  id?: string;
  companyId?: string;
  workflow?: ProductWorkflow | null;
  isActive?: boolean;
  metadata?: string | ProductMetadata | null;
  category?: string;
  categoryId?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  price?: string | number;
  comparePrice?: string | number;
  cost?: string | number;
  regularPrice?: string | number;
  salePrice?: string | number;
  sku?: string;
  stock?: string | number;
  trackInventory?: boolean;
  lowStockThreshold?: number;
  tags?: string;
  weight?: string | number;
  dimensions?: string | Record<string, unknown>;
  isFeatured?: boolean;
  isHidden?: boolean;
  showFakeStock?: boolean;
  featuredPriority?: number;
  shippingClass?: string;
  excludeFromFreeShipping?: boolean;
  affiliateCommission?: string | number;
  commissionType?: string;
  allowAffiliateMarkup?: boolean;
  mainImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  barcode?: string;
  images?: string | ProductImageSource[];
  variants?: EditableVariant[];
  inventorySnapshot?: MerchantInventorySnapshot;
  merchantContext?: {
    canEditStock?: boolean;
    stockLocationLabel?: string;
    inventorySnapshot?: MerchantInventorySnapshot;
  } | null;
};

export type TabItem = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
};
