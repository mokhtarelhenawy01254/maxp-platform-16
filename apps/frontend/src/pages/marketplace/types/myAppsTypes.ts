import type { InstalledApp } from "@/types/marketplace";
import {
  Package, Store, Sparkles, MessageSquare, Bot,
  TrendingUp, Layers, Truck, DollarSign, Users,
  Shield, Zap, AppWindow, CheckCircle2, Clock, X
} from "lucide-react";

export interface ApiResponse {
  success: boolean;
  data: InstalledApp[];
}

export const APP_ROUTE_MAP: Record<string, string> = {
  "quantity-offers-pro": "/products",
  "conversion-suite": "/my-apps/conversion-suite/settings",
  "ugc-reviews-pro": "/my-apps/ugc-reviews-pro/settings",
  "commerce-advanced": "/my-apps/commerce-advanced/settings",
  "whatsapp-business": "/whatsapp",
  "whatsapp-cloud-api": "/whatsapp",
  "telegram-business": "/telegram",
  "telegram-integration": "/telegram",
  "instagram-business": "/instagram-inbox",
  "tiktok-integrations": "/tiktok-inbox",
  "facebook-ads-pro": "/advertising/facebook-ads",
  "facebook-pages-connect": "/marketing/facebook",
  "facebook-post": "/marketing/facebook-post",
  "ai-chat-basic": "/admin/ai-hub",
  "ai-chat-pro": "/admin/ai-hub",
  "orders-analytics": "/analytics/orders",
  "analytics-basic": "/analytics/orders",
  "inventory-pro": "/inventory",
  "pos-pro": "/pos",
  "coupons-pro": "/coupons",
  "wholesale-pro": "/wholesale",
  "affiliate-pro": "/affiliates/dashboard",
  "amazon-affiliate-pro": "/amazon-affiliate",
  "blog-pro": "/articles",
  "order-shipping-turbo": "/shipping",
  "procurement-pro": "/procurement",
  "hr-basic": "/hr",
  "unified-inbox": "/unified-inbox",
  "abandoned-cart-recovery": "/orders",
  "order-automation": "/orders/automation",
  "bulk-search": "/bulk-search",
  "customer-blocks": "/settings/customer-blocks",
  "customer-loyalty-pro": "/customers",
  "crm-lite": "/customers",
  "crm-basic": "/customers",
  "medical-system": "/doctor/dashboard",
  "dental-lab-app": "/dental-lab",
  "dental-materials-pro": "/dental-lab/materials",
  "booking-app": "/appointments",
  "notification-automation": "/notifications/settings",
  "executable-mindmap": "/mindmap",
  "order-preparation": "/orders/preparation",
  "order-preparation-hold": "/orders/preparation?pageSize=96&activeStage=ON_HOLD_PREP",
  "treasury-expenses-pro": "/treasury-expenses",
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

export const CATEGORY_CONFIG: Record<string, { labelAr: string; icon: typeof Package }> = {
  ECOMMERCE: { labelAr: "المتجر والمنتجات", icon: Store },
  ORDER_OPS: { labelAr: "الطلبات والتنفيذ", icon: Package },
  MARKETING: { labelAr: "التسويق والإعلانات", icon: Sparkles },
  COMMUNICATION: { labelAr: "المحادثات والتواصل", icon: MessageSquare },
  AI: { labelAr: "الذكاء الاصطناعي", icon: Bot },
  ANALYTICS: { labelAr: "التحليلات والتقارير", icon: TrendingUp },
  WAREHOUSE: { labelAr: "المخزون والمستودعات", icon: Layers },
  SHIPPING: { labelAr: "الشحن والتوصيل", icon: Truck },
  FINANCE: { labelAr: "المالية والفواتير", icon: DollarSign },
  HR: { labelAr: "الموارد البشرية", icon: Users },
  SUPPORT: { labelAr: "خدمة العملاء", icon: Shield },
  CRM: { labelAr: "إدارة العملاء", icon: Users },
  INTEGRATION: { labelAr: "التكاملات والربط", icon: Zap },
  THEMES: { labelAr: "القوالب والمظهر", icon: AppWindow },
};

export const STATUS_CONFIG = {
  ACTIVE: {
    labelKey: "active",
    fallbackLabel: "نشط",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    barClass: "bg-emerald-500",
    icon: CheckCircle2,
  },
  TRIAL: {
    labelKey: "trial",
    fallbackLabel: "فترة تجريبية",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    barClass: "bg-amber-500",
    icon: Clock,
  },
  CANCELLED: {
    labelKey: "cancelled",
    fallbackLabel: "متوقف",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    barClass: "bg-destructive/60",
    icon: X,
  },
  EXPIRED: {
    labelKey: "expired",
    fallbackLabel: "انتهى الاشتراك",
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    barClass: "bg-destructive",
    icon: X,
  },
} as const;

export type StatusFilter = "ALL" | "ACTIVE" | "TRIAL" | "CANCELLED" | "EXPIRED";
export type SortOption = "newest" | "name" | "usage" | "trial_ending";

export function getDaysRemaining(trialEndsAt?: string): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  const now = Date.now();
  const diff = end - now;
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export interface StarterAppItem {
  slug: string;
  name: string;
  desc: string;
  icon: typeof MessageSquare;
  badge: string;
  category: string;
}

export const STARTER_APPS: StarterAppItem[] = [
  {
    slug: "whatsapp-business",
    name: "واتساب للأعمال والرد الآلي",
    desc: "أتمتة إشعارات الطلبات والشحن والرد على استفسارات العملاء فوراً.",
    icon: MessageSquare,
    badge: "الأكثر طلباً",
    category: "COMMUNICATION",
  },
  {
    slug: "quantity-offers-pro",
    name: "عروض الكميات المتقدمة",
    desc: "زيادة متوسط قيمة السلة بحزم وتخفيضات الكميات التلقائية.",
    icon: Store,
    badge: "مضاعفة المبيعات",
    category: "ECOMMERCE",
  },
  {
    slug: "orders-analytics",
    name: "تحليلات الطلبات الذكية",
    desc: "لوحة مؤشرات تفاعلية لمتابعة حالات الطلبات والمدفوعات والإلغاءات.",
    icon: TrendingUp,
    badge: "رؤية حية",
    category: "ANALYTICS",
  },
  {
    slug: "conversion-suite",
    name: "حزمة تعزيز التحويلات",
    desc: "أشرطة التخفيض، وعدادات الطوارئ، وتنبيهات الشراء المباشر للزوار.",
    icon: Zap,
    badge: "رفع التحويل",
    category: "MARKETING",
  },
];

export interface MyAppsStats {
  total: number;
  active: number;
  trial: number;
  expiringSoon: number;
  monthlyTotalCost: number;
}
