/**
 * Shared Constants & Caches
 */
const PRODUCT_LAUNCH_ALLOWED_HOSTS = [
  "maxp.online",
  "mokhtarelhenawy.online",
];
const PRODUCT_LAUNCH_DEV_HOSTS = [
  "localhost",
  "127.0.0.1",
];


const PRODUCT_LAUNCH_METADATA_PRODUCT_SELECT = Object.freeze({
  id: true,
  name: true,
  description: true,
  sku: true,
  price: true,
  comparePrice: true,
  category: {
    select: {
      name: true,
    },
  },
  isActive: true,
  isHidden: true,
  stock: true,
  trackInventory: true,
  mainImage: true,
  images: true,
  slug: true,
  productVariants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      metadata: true,
    },
  },
});


const SUPPORTED_FULL_AD_CREATIVE_TYPES = new Set([
  "SINGLE_IMAGE",
  "SINGLE_VIDEO",
  "CAROUSEL",
  "EXISTING_POST",
]);

const PURCHASE_ACTION_TYPES = [
  "offsite_conversion.fb_pixel_purchase",
  "omni_purchase",
  "purchase",
];

const CONVERSION_ACTION_TYPES = [
  ...PURCHASE_ACTION_TYPES,
  "offsite_conversion.fb_pixel_lead",
  "lead",
  "complete_registration",
];

const FULL_AD_MINIMUM_BUDGET_BY_CURRENCY = {
  EGP: 200,
};


const ACTIVE_PUBLISH_CONFIRMATION_TOKEN = "ACTIVE_PUBLISH_CONFIRMED";
const PUBLISH_REQUEST_LOCK_TTL_MS = 20 * 60 * 1000;

const AD_ACCOUNTS_CACHE_TTL_MS = 60 * 1000;
const adAccountsMemoryCache = new Map();
const PERFORMANCE_CACHE_TTL_MS = 60 * 1000;
const performanceSummaryMemoryCache = new Map();


const FACEBOOK_PAGE_RECOMMENDED_PERMISSIONS = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "business_management",
  "ads_management",
  "ads_read",
];


module.exports = {
  PRODUCT_LAUNCH_ALLOWED_HOSTS,
  PRODUCT_LAUNCH_DEV_HOSTS,
  PRODUCT_LAUNCH_METADATA_PRODUCT_SELECT,
  SUPPORTED_FULL_AD_CREATIVE_TYPES,
  PURCHASE_ACTION_TYPES,
  CONVERSION_ACTION_TYPES,
  FULL_AD_MINIMUM_BUDGET_BY_CURRENCY,
  ACTIVE_PUBLISH_CONFIRMATION_TOKEN,
  PUBLISH_REQUEST_LOCK_TTL_MS,
  AD_ACCOUNTS_CACHE_TTL_MS,
  adAccountsMemoryCache,
  PERFORMANCE_CACHE_TTL_MS,
  performanceSummaryMemoryCache,
  FACEBOOK_PAGE_RECOMMENDED_PERMISSIONS,
};
