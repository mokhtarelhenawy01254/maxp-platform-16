import {
  Store, Users, MessageSquare, BarChart3, TrendingUp,
  DollarSign, Package, Sparkles, Heart, Zap, Bot,
  Camera, Megaphone, ShoppingCart, PackageOpen,
  ClipboardList, Truck, HeartHandshake,
  ShoppingBag, FileSpreadsheet,
  Brain, Shield, Globe, Palette, Headphones, Star, Clock,
  GraduationCap, Building2, BadgeCheck, Flame,
  Rocket, LayoutGrid, CreditCard, Monitor, UserPlus,
  Image, Database,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MarketplaceApp } from "@/types/marketplace";

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
  { id: "AI", labelKey: "marketplace.categories.ai", icon: Brain },
  { id: "MARKETING", labelKey: "marketplace.categories.marketing", icon: Sparkles },
  { id: "SALES", labelKey: "marketplace.categories.sales", icon: ShoppingCart },
  { id: "CRM", labelKey: "marketplace.categories.crm", icon: HeartHandshake },
  { id: "ACCOUNTING", labelKey: "marketplace.categories.accounting", icon: FileSpreadsheet },
  { id: "FINANCE", labelKey: "marketplace.categories.finance", icon: DollarSign },
  { id: "ANALYTICS", labelKey: "marketplace.categories.analytics", icon: TrendingUp },
  { id: "HR", labelKey: "marketplace.categories.hr", icon: Users },
  { id: "WAREHOUSE", labelKey: "marketplace.categories.warehouse", icon: PackageOpen },
  { id: "SHIPPING", labelKey: "marketplace.categories.shipping", icon: Truck },
  { id: "SUPPORT", labelKey: "marketplace.categories.support", icon: Headphones },
  { id: "WHATSAPP", labelKey: "marketplace.categories.whatsapp", icon: MessageSquare },
  { id: "SEO", labelKey: "marketplace.categories.seo", icon: Globe },
  { id: "INTEGRATION", labelKey: "marketplace.categories.integration", icon: Zap },
  { id: "THEMES", labelKey: "marketplace.categories.themes", icon: Palette },
];

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
