import marketplaceAppSlugs from "../../data/marketplaceAppSlugs.json";

// Pure slug-alias logic (no React/env imports) so it can be unit-tested by any runner.
export const APP_SLUG_ALIASES: Record<string, string[]> = {
  // Break-even calculators
  // product-break-even is its own catalog app; the old route name must not fall back to break-even
  "product-break-even-calculator": ["product-break-even"],
  "project-break-even-calculator": ["break-even"],
  "break-even": ["project-break-even-calculator", "product-break-even-calculator"],

  // Financial & analytics tools
  "monthly-pnl-calculator": ["monthly-pnl"],
  "monthly-pnl": ["monthly-pnl-calculator"],
  "pricing-strategy-calculator": ["pricing-strategy"],
  "discount-impact-calculator": ["discount-impact"],
  "refund-rate-calculator": ["refund-rate"],
  "orders-analytics": ["analytics-basic", "analytics-advanced", "analytics"],
  "analytics-basic": ["orders-analytics", "analytics-advanced", "analytics"],

  // Agency & marketing
  "agency-system": ["marketing-agency-pro"],
  "marketing-agency-pro": ["agency-system"],

  // Appointments & Bookings
  "booking-appointments": ["booking-app", "service-request-app"],
  "booking-app": ["service-request-app", "service-requests", "medical-system", "booking-appointments"],

  // Accounting & ERP
  "accounting-app": ["accounting"],
  "accounting": ["accounting-app"],

  // Manufacturing
  "manufacturing-app": ["manufacturing"],
  "cat-app-manufacturing": ["manufacturing"],
  "manufacturing": ["manufacturing-app", "cat-app-manufacturing"],

  // Social & Publishing
  "youtube-publish": ["tiktok-integrations"],

  // Communication & Messaging
  "whatsapp-business": [
    "whatsapp-integration",
    "whatsapp-inbox",
    "whatsapp-settings",
    "whatsapp-notifications",
    "whatsapp-templates",
    "whatsapp-routing",
    "unified-inbox",
  ],
  "whatsapp-cloud-api": ["whatsapp-business", "whatsapp-integration", "unified-inbox"],
  "whatsapp-integration": ["whatsapp-business", "whatsapp-inbox", "unified-inbox"],
  "telegram-business": ["telegram-integration", "telegram"],
  "telegram-integration": ["telegram-business", "telegram"],
  "crm-lite": ["crm-basic", "crm"],
  "crm-basic": ["crm-lite", "crm"],
  "unified-inbox": [
    "whatsapp-business",
    "whatsapp-integration",
    "whatsapp-inbox",
    "facebook-pages-connect",
    "instagram-business",
    "tiktok-integrations",
    "telegram-business",
    "telegram-integration",
    "crm-lite",
    "crm-basic",
  ],

  // HR
  "hr-core": ["hr-basic", "hr-pro", "hr-attendance-pro", "hr-payroll", "hr-assets", "hr-recruitment"],
  "hr-basic": ["hr-core", "hr-pro", "hr-attendance-pro", "hr-payroll", "hr-assets", "hr-recruitment"],

  // Healthcare & Dental
  "dental-lab-app": ["dental-lab"],
  "dental-lab": ["dental-lab-app"],

  // Shipping & Operations
  "order-shipping-turbo": [
    "order-shipping-hub",
    "order-shipping",
    "order-shipping-bosta",
    "order-shipping-qpexpress",
  ],
  "order-shipping-hub": ["order-shipping-turbo"],
  "order-shipping": ["order-shipping-turbo"],
  "order-shipping-bosta": ["order-shipping-turbo"],
  "order-shipping-qpexpress": ["order-shipping-turbo"],
  "pos-pro": ["cafe-restaurant-pro", "store-pro", "ecommerce-pro"],
  "business-tools": ["tasks", "tasks-management", "projects"],
  "affiliate-pro": ["affiliate-program"],
};

export function getCandidateSlugs(slug: string): string[] {
  const normalized = slug.trim().toLowerCase();
  const aliases = APP_SLUG_ALIASES[normalized] || [];
  return Array.from(new Set([normalized, ...aliases]));
}

const CATALOG_SLUGS = new Set<string>(
  (Array.isArray(marketplaceAppSlugs) ? (marketplaceAppSlugs as string[]) : []).map((s) =>
    s.trim().toLowerCase()
  )
);

/**
 * The slug a "go to marketplace" link should point at.
 * A slug that exists in the catalog always wins — only a name the catalog does not
 * have (the legacy/ghost route names) falls back to its first alias.
 */
export function resolveCanonicalSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (CATALOG_SLUGS.has(normalized)) {
    return normalized;
  }
  const aliases = APP_SLUG_ALIASES[normalized];
  if (aliases && aliases.length > 0) {
    return aliases[0];
  }
  return normalized;
}
