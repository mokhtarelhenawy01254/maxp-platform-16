import {
  Package,
  Sparkles,
  ShoppingBag,
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  Truck,
  MessageSquare,
  Zap,
  LayoutGrid,
  Store,
  Heart,
  ClipboardList,
  CreditCard,
  Percent,
  Gamepad2,
  Palette,
  Brain,
} from "lucide-react";
import type {
  MarketplaceApp,
  Category,
  MarketplaceFilters,
  ToolCollectionId,
} from "@/types/marketplace";

export const MARKETPLACE_APPS_FETCH_LIMIT = 200;
export const DISPLAY_INCREMENT = 20;

export function matchesCollection(app: MarketplaceApp, col: ToolCollectionId) {
  if (col === "ALL") return true;
  if (col === "FEATURED") return app.isFeatured;
  return true;
}

export function matchesFilters(app: MarketplaceApp, filters: MarketplaceFilters) {
  if (app.isPublic === false || app.isActive === false || app.slug === "multi-warehouse-pro") {
    return false;
  }
  if (filters.priceModel && filters.priceModel !== "ALL") {
    if (filters.priceModel === "FREE" && app.pricingModel !== "FREE") return false;
    if (filters.priceModel === "PAID" && app.pricingModel === "FREE") return false;
  }
  if (filters.minRating && (app.rating ?? 0) < filters.minRating) return false;
  if (filters.isAiPowered && !app.isAiPowered) return false;
  if (filters.isOfficial && !app.isOfficial) return false;
  if (filters.isNew && !app.isNew) return false;
  if (filters.isRecentlyUpdated && !app.isRecentlyUpdated) return false;
  return true;
}

export function matchesSearch(app: MarketplaceApp, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    app.name,
    app.nameEn,
    app.description,
    app.descriptionEn,
    app.category,
    app.slug,
    ...(app.tags || []),
    app.developer?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function getCategoryDisplayCategories(
  categories: Category[],
  categoryCounts: Record<string, number> = {},
) {
  const categoryIconsMap: Record<string, typeof Package> = {
    AI: Brain,
    MARKETING: Sparkles,
    SALES: ShoppingBag,
    CRM: BarChart3,
    ACCOUNTING: DollarSign,
    FINANCE: DollarSign,
    ANALYTICS: TrendingUp,
    HR: Users,
    WAREHOUSE: Package,
    SHIPPING: Truck,
    SUPPORT: MessageSquare,
    WHATSAPP: MessageSquare,
    SEO: TrendingUp,
    INTEGRATION: Zap,
    THEMES: LayoutGrid,
    ECOMMERCE: Store,
    MEDICAL: Heart,
    ORDER_OPS: ClipboardList,
    PAYMENTS: CreditCard,
    PROCUREMENT: ShoppingBag,
    WHOLESALE: Percent,
    PRODUCTIVITY: Package,
    COMMUNICATION: MessageSquare,
    GAMIFICATION: Gamepad2,
    DESIGN: Palette,
  };

  return categories.map((c) => {
    const catUpper = (c.category || "").toUpperCase();
    return {
      id: c.category,
      name: c.name,
      icon: categoryIconsMap[catUpper] || Package,
      count: categoryCounts[catUpper] ?? c.count ?? 0,
    };
  });
}
