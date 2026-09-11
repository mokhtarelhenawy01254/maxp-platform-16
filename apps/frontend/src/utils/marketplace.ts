import {
  Store, Users, MessageSquare, BarChart3, TrendingUp,
  DollarSign, Package, Sparkles, Heart, Zap, Bot,
  Camera, Megaphone, ShoppingCart, PackageOpen,
  ClipboardList, Truck, HeartHandshake,
  ShoppingBag, FileSpreadsheet, Percent,
  Brain, Shield, Globe, Palette, Headphones, Star, Clock,
  GraduationCap, Building2, BadgeCheck, Flame, Award,
  Rocket, LayoutGrid, CreditCard, Monitor, UserPlus,
  Image, Database, Gamepad2, Layers, CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MarketplaceApp, Category } from "@/types/marketplace";

export { appIcons, appIconsBySlug } from "./marketplaceIcons";

export const categoryIcons: Record<string, LucideIcon> = {
  ECOMMERCE: Store,
  HR: Users,
  COMMUNICATION: MessageSquare,
  CRM: BarChart3,
  ANALYTICS: TrendingUp,
  INTEGRATION: Zap,
  PRODUCTIVITY: Package,
  FINANCE: DollarSign,
  MARKETING: Sparkles,
  MEDICAL: Heart,
  AI: Brain,
  SALES: ShoppingCart,
  ACCOUNTING: FileSpreadsheet,
  WAREHOUSE: PackageOpen,
  SHIPPING: Truck,
  SUPPORT: Headphones,
  WHATSAPP: MessageSquare,
  SEO: Globe,
  THEMES: Palette,
  DESIGN: Palette,
  GAMIFICATION: Gamepad2,
  AUTOMATION: Layers,
  CALENDAR: CalendarDays,
  ORDER_OPS: ClipboardList,
  PAYMENTS: CreditCard,
  PROCUREMENT: ShoppingBag,
  WHOLESALE: Percent,
};

export const categoryCssClass: Record<string, string> = {
  ECOMMERCE: "mp-cat-ecommerce",
  HR: "mp-cat-hr",
  COMMUNICATION: "mp-cat-communication",
  CRM: "mp-cat-crm",
  ANALYTICS: "mp-cat-analytics",
  INTEGRATION: "mp-cat-integration",
  PRODUCTIVITY: "mp-cat-productivity",
  FINANCE: "mp-cat-finance",
  MARKETING: "mp-cat-marketing",
  MEDICAL: "mp-cat-medical",
  AI: "mp-cat-analytics",
  SALES: "mp-cat-ecommerce",
  ACCOUNTING: "mp-cat-finance",
  WAREHOUSE: "mp-cat-productivity",
  SHIPPING: "mp-cat-communication",
  SUPPORT: "mp-cat-hr",
  WHATSAPP: "mp-cat-communication",
  SEO: "mp-cat-marketing",
  THEMES: "mp-cat-marketing",
  DESIGN: "mp-cat-marketing",
  ORDER_OPS: "mp-cat-ecommerce",
  PAYMENTS: "mp-cat-finance",
  PROCUREMENT: "mp-cat-ecommerce",
  WHOLESALE: "mp-cat-ecommerce",
  AUTOMATION: "mp-cat-integration",
  GAMIFICATION: "mp-cat-medical",
};

export function shouldUseTextIcon(icon?: string) {
  const n = icon?.trim();
  if (!n) return false;
  return Array.from(n).length <= 3 && !/^[a-z0-9_\-\s]+$/i.test(n);
}

export function isAddOnApp(app: MarketplaceApp) {
  const r = app.requiredApps;
  if (Array.isArray(r)) return r.filter(Boolean).length > 0;
  if (typeof r === "string") {
    try { return JSON.parse(r).filter(Boolean).length > 0; } catch { return r.split(",").filter(Boolean).length > 0; }
  }
  return false;
}

export function normalizeRequiredApps(requiredApps: MarketplaceApp["requiredApps"]) {
  if (Array.isArray(requiredApps)) return requiredApps.map(a => String(a || "").trim()).filter(Boolean);
  if (typeof requiredApps === "string") {
    try { return JSON.parse(requiredApps).filter(Boolean); } catch { return requiredApps.split(",").map(a => a.trim()).filter(Boolean); }
  }
  return [];
}

export function getPrice(app: MarketplaceApp, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (app.pricingModel === "FREE") return t('marketplace.freePrice');
  if (app.pricingModel === "PAY_PER_USE") return app.unitPrice ? `${app.unitPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perUnit')}` : t('marketplace.payPerUse');
  if (app.monthlyPrice) return `${app.monthlyPrice} ${t('marketplace.currencyUnit')}${t('marketplace.perMonth')}`;
  return t('marketplace.contactUs');
}

export function getAvailableBadges(app: MarketplaceApp) {
  const badges: string[] = [];
  if (app.isOfficial) badges.push("OFFICIAL");
  if (app.isVerified) badges.push("VERIFIED");
  if (app.isAiPowered) badges.push("AI_POWERED");
  if (app.isNew) badges.push("NEW");
  if (app.isRecentlyUpdated) badges.push("UPDATED");
  if (app.isBestSeller) badges.push("BEST_SELLER");
  if (app.isTrending) badges.push("TRENDING");
  if (app.isEnterpriseReady) badges.push("ENTERPRISE_READY");
  if (app.isEditorChoice) badges.push("EDITOR_CHOICE");
  return badges;
}

export function formatInstallCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export const APP_ROUTE_MAP: Record<string, string> = {
  "store": "/products",
  "store-basic": "/products",
  "store-pro": "/products",
  "quantity-offers-pro": "/products",
  "conversion-suite": "/my-apps/conversion-suite/settings",
  "ugc-reviews-pro": "/my-apps/ugc-reviews-pro/settings",
  "commerce-advanced": "/my-apps/commerce-advanced/settings",
  "order-core": "/orders",
  "inventory-pro": "/inventory",
  "multi-warehouse-pro": "/inventory/warehouses",
  "facebook-pages-connect": "/marketing/facebook",
  "facebook-post": "/marketing/facebook-post",
  "facebook-ads-pro": "/advertising/facebook-ads",
  "instagram-business": "/instagram-inbox",
  "telegram-business": "/telegram",
  "telegram-integration": "/telegram",
  "tiktok-integrations": "/tiktok-inbox",
  "whatsapp-business": "/whatsapp",
  "whatsapp-cloud-api": "/whatsapp",
  "ai-chat-pro": "/admin/ai-hub",
  "ai-chat-basic": "/admin/ai-hub",
  "voice-agent-ai": "/ai-agent",
  "invoicing-pro": "/invoices",
  "orders-analytics": "/analytics/orders",
  "analytics-basic": "/analytics/orders",
  "pixel-tracker-pro": "/settings/pixels",
  "snapchat-pixel-pro": "/settings/pixels",
  "tiktok-pixel-pro": "/settings/pixels",
  "google-ads-pro": "/settings/pixels",
  "marketing-hub": "/marketing",
  "campaign-manager-pro": "/marketing",
  "ad-auto-rules": "/marketing",
  "blog-pro": "/articles",
  "order-shipping-turbo": "/shipping",
  "procurement-pro": "/procurement/dashboard",
  "hr-basic": "/hr",
  "unified-inbox": "/unified-inbox",
  "abandoned-cart-recovery": "/orders",
  "order-automation": "/orders/automation",
  "bulk-search": "/bulk-search",
  "customer-blocks": "/settings/customer-blocks",
  "customer-loyalty-pro": "/customers",
  "crm-lite": "/customers",
  "crm-basic": "/customers",
  "pos-pro": "/pos",
  "coupons-pro": "/coupons",
  "wholesale-pro": "/wholesale",
  "affiliate-pro": "/affiliates/dashboard",
  "amazon-affiliate-pro": "/amazon-affiliate",
  "medical-system": "/doctor/dashboard",
  "dental-lab-app": "/dental-lab",
  "dental-materials-pro": "/dental-lab/materials",
  "booking-app": "/appointments",
  "notification-automation": "/notifications/settings",
  "executable-mindmap": "/mindmap",
  "order-preparation": "/orders/preparation",
  "order-preparation-hold": "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP",
  // Financial & Calculator Tools
  "break-even": "/tools/break-even",
  "product-break-even": "/tools/product-break-even",
  "pricing-strategy": "/tools/pricing-strategy",
  "profitability-engine": "/tools/profitability-engine",
  "campaign-calculator": "/tools/campaign-prediction",
  "ad-budget-planner": "/tools/ad-budget-planner",
  "discount-impact": "/tools/discount-impact",
  "shipping-optimizer": "/tools/shipping-optimizer",
  "monthly-pnl": "/tools/monthly-pnl",
  "clv-calculator": "/tools/clv-calculator",
  "upsell-planner": "/tools/upsell-planner",
  "refund-rate": "/tools/refund-rate",
  // HR Suite
  "hr-core": "/hr",
  "hr-attendance-pro": "/hr/attendance",
  "hr-payroll": "/hr/payroll",
  "hr-recruitment": "/hr/recruitment",
  "hr-assets": "/hr/assets",
  // Order Operations
  "manual-orders-pro": "/orders/manual",
  "bulk-orders": "/orders/bulk",
  "agent-workspace": "/orders/workspace",
  "quick-status": "/orders/quick-status",
  "status-summary": "/orders/status-summary",
  "returns-settings": "/returns/settings",
  "order-workflow": "/settings/order-workflow",
  "order-confirmation-distribution": "/orders/confirmations",
  "order-accounting-sources": "/analytics/orders",
  "order-source-tracking": "/analytics/orders",
  // Marketing & Tracking
  "google-tag-manager": "/advertising/google-tag-manager",
  "campaign-attribution": "/advertising/facebook-ads/attribution",
  "marketing-agency-pro": "/agency",
  "facebook-catalog-shop": "/marketing/facebook",
  "facebook-pixel-capi": "/settings/pixels",
  "bot-automation": "/automation/bot-studio",
  "woocommerce-pro": "/products/import-woocommerce",
  // Specialized Verticals & Finance
  "academy-app": "/academy/dashboard",
  "radiology-app": "/radiology",
  "order-invoicing": "/invoices",
  "product-presentations": "/products",
  "cod-deposit": "/settings/cod-deposit",
};

export function getAppDestination(app: { slug: string; mainRoute?: string | null }): string {
  if (app.mainRoute && typeof app.mainRoute === "string" && app.mainRoute.trim()) {
    return app.mainRoute.trim();
  }
  if (APP_ROUTE_MAP[app.slug]) {
    return APP_ROUTE_MAP[app.slug];
  }
  return `/my-apps/${app.slug}/settings`;
}

const sectionIcons: Record<string, LucideIcon> = {
  FEATURED: Star,
  POPULAR: Flame,
  TRENDING: TrendingUp,
  NEW: Rocket,
  RECENTLY_UPDATED: Clock,
  STAFF_PICKS: BadgeCheck,
  AI_RECOMMENDED: Brain,
  BEST_RATED: Star,
  OFFICIAL: BadgeCheck,
  FREE: Package,
  PREMIUM: Sparkles,
  EDITOR_CHOICE: Award,
};

export function getSectionIcon(type: string): LucideIcon {
  return sectionIcons[type] || LayoutGrid;
}

export const allCategories = [
  { id: "ECOMMERCE", labelKey: "marketplace.categories.ecommerce", icon: Store },
  { id: "ORDER_OPS", labelKey: "marketplace.categories.orderOps", icon: ClipboardList },
  { id: "WHOLESALE", labelKey: "marketplace.categories.wholesale", icon: Percent },
  { id: "AI", labelKey: "marketplace.categories.ai", icon: Brain },
  { id: "MARKETING", labelKey: "marketplace.categories.marketing", icon: Sparkles },
  { id: "SALES", labelKey: "marketplace.categories.sales", icon: ShoppingCart },
  { id: "CRM", labelKey: "marketplace.categories.crm", icon: HeartHandshake },
  { id: "ACCOUNTING", labelKey: "marketplace.categories.accounting", icon: FileSpreadsheet },
  { id: "FINANCE", labelKey: "marketplace.categories.finance", icon: DollarSign },
  { id: "PAYMENTS", labelKey: "marketplace.categories.payments", icon: CreditCard },
  { id: "PROCUREMENT", labelKey: "marketplace.categories.procurement", icon: ShoppingBag },
  { id: "ANALYTICS", labelKey: "marketplace.categories.analytics", icon: TrendingUp },
  { id: "HR", labelKey: "marketplace.categories.hr", icon: Users },
  { id: "WAREHOUSE", labelKey: "marketplace.categories.warehouse", icon: PackageOpen },
  { id: "SHIPPING", labelKey: "marketplace.categories.shipping", icon: Truck },
  { id: "SUPPORT", labelKey: "marketplace.categories.support", icon: Headphones },
  { id: "WHATSAPP", labelKey: "marketplace.categories.whatsapp", icon: MessageSquare },
  { id: "SEO", labelKey: "marketplace.categories.seo", icon: Globe },
  { id: "INTEGRATION", labelKey: "marketplace.categories.integration", icon: Zap },
  { id: "THEMES", labelKey: "marketplace.categories.themes", icon: Palette },
  { id: "PRODUCTIVITY", labelKey: "marketplace.categories.productivity", icon: Package },
  { id: "COMMUNICATION", labelKey: "marketplace.categories.communication", icon: MessageSquare },
  { id: "GAMIFICATION", labelKey: "marketplace.categories.gamification", icon: Gamepad2 },
  { id: "MEDICAL", labelKey: "marketplace.categories.medical", icon: Heart },
  { id: "DESIGN", labelKey: "marketplace.categories.design", icon: Palette },
];

export interface CategoryGroupDef {
  id: string;
  labelKey: string;
  categories: string[];
}

export const OTHER_CATEGORY_GROUP_ID = "__other__";

export const categoryGroups: CategoryGroupDef[] = [
  {
    id: "commerce",
    labelKey: "marketplace.categories.groups.commerce",
    categories: ["ECOMMERCE", "ORDER_OPS", "WHOLESALE", "CRM", "SALES", "MARKETING"],
  },
  {
    id: "data",
    labelKey: "marketplace.categories.groups.data",
    categories: ["ANALYTICS", "AI"],
  },
  {
    id: "operations",
    labelKey: "marketplace.categories.groups.operations",
    categories: ["PRODUCTIVITY", "WAREHOUSE", "PROCUREMENT", "SHIPPING", "AUTOMATION"],
  },
  {
    id: "finance",
    labelKey: "marketplace.categories.groups.finance",
    categories: ["FINANCE", "ACCOUNTING", "PAYMENTS"],
  },
  {
    id: "hr",
    labelKey: "marketplace.categories.groups.hr",
    categories: ["HR"],
  },
  {
    id: "communication",
    labelKey: "marketplace.categories.groups.communication",
    categories: ["COMMUNICATION", "INTEGRATION", "WHATSAPP", "SUPPORT", "SEO"],
  },
  {
    id: "specialized",
    labelKey: "marketplace.categories.groups.specialized",
    categories: ["MEDICAL", "GAMIFICATION", "THEMES", "DESIGN"],
  },
];

export interface GroupedCategories {
  id: string;
  labelKey: string;
  items: Category[];
}

export function groupCategories(categories: Category[]): GroupedCategories[] {
  const byGroup = new Map<string, Category[]>();
  const other: Category[] = [];
  for (const cat of categories) {
    const group = categoryGroups.find((g) => g.categories.includes(cat.category));
    if (group) {
      const list = byGroup.get(group.id) || [];
      list.push(cat);
      byGroup.set(group.id, list);
    } else {
      other.push(cat);
    }
  }
  const result: GroupedCategories[] = [];
  for (const g of categoryGroups) {
    const items = byGroup.get(g.id);
    if (items && items.length) result.push({ id: g.id, labelKey: g.labelKey, items });
  }
  if (other.length) result.push({ id: OTHER_CATEGORY_GROUP_ID, labelKey: "marketplace.categories.groups.other", items: other });
  return result;
}

export const starterBundles = [
  {
    id: "fashion",
    businessType: "fashionStore",
    icon: ShoppingBag,
    apps: ["store-basic", "crm-basic", "whatsapp-business", "analytics-basic"],
    gradient: "from-pink-500 to-rose-600",
  },
  {
    id: "restaurant",
    businessType: "restaurant",
    icon: Package,
    apps: ["store-basic", "whatsapp-business", "order-core", "crm-basic"],
    gradient: "from-orange-500 to-red-600",
  },
  {
    id: "electronics",
    businessType: "electronics",
    icon: Monitor,
    apps: ["store-basic", "order-core", "analytics-basic", "inventory-pro"],
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    id: "pharmacy",
    businessType: "pharmacy",
    icon: Shield,
    apps: ["store-basic", "order-core", "inventory-pro", "crm-basic"],
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    id: "services",
    businessType: "services",
    icon: Building2,
    apps: ["crm-basic", "appointments-pro", "whatsapp-business", "invoicing-pro"],
    gradient: "from-violet-500 to-purple-600",
  },
  {
    id: "education",
    businessType: "education",
    icon: GraduationCap,
    apps: ["crm-basic", "whatsapp-business", "broadcast-pro", "hr-core"],
    gradient: "from-cyan-500 to-blue-600",
  },
];
