import type { ComponentType } from "react";
import {
  Settings,
  Package,
  Truck,
  MessageSquare,
  Megaphone,
  BarChart3,
  Users,
  MoreHorizontal,
} from "lucide-react";

export interface AppExplanation {
  id: string;
  title: string;
  content: string;
  slug: string;
  order: number;
  targetRoute?: string;
  videoUrl?: string | null;
}

export interface RouteGroup {
  key: string;
  labelKey: string;
  labelFallback: string;
  prefixes: string[];
}

/** تجميع الشروحات حسب أول جزء من المسار — ترتيب المجموعات ثابت ومقصود */
export const ROUTE_GROUPS: RouteGroup[] = [
  {
    key: "start",
    labelKey: "explanations.groupStart",
    labelFallback: "البداية والإعدادات",
    prefixes: ["/company-dashboard", "/apps", "/settings", "/payments", "/marketplace", "/notifications"],
  },
  {
    key: "products",
    labelKey: "explanations.groupProducts",
    labelFallback: "المنتجات والمخزون",
    prefixes: ["/products", "/categories", "/inventory", "/procurement"],
  },
  {
    key: "orders",
    labelKey: "explanations.groupOrders",
    labelFallback: "الطلبات والشحن",
    prefixes: ["/orders", "/shipping-companies", "/returns"],
  },
  {
    key: "customers",
    labelKey: "explanations.groupCustomers",
    labelFallback: "العملاء والمحادثات",
    prefixes: ["/customers", "/whatsapp", "/unified-inbox"],
  },
  {
    key: "marketing",
    labelKey: "explanations.groupMarketing",
    labelFallback: "التسويق والعروض",
    prefixes: ["/advertising", "/coupons", "/wholesale", "/affiliates"],
  },
  {
    key: "finance",
    labelKey: "explanations.groupFinance",
    labelFallback: "المالية والتقارير",
    prefixes: ["/analytics", "/reports", "/treasury-expenses", "/invoices"],
  },
  {
    key: "team",
    labelKey: "explanations.groupTeam",
    labelFallback: "الفريق والتشغيل",
    prefixes: ["/hr", "/admin/agent-profiles", "/academy"],
  },
];

export const OTHER_GROUP: RouteGroup = {
  key: "other",
  labelKey: "explanations.groupOther",
  labelFallback: "أخرى",
  prefixes: [],
};

export const GROUP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  start: Settings,
  products: Package,
  orders: Truck,
  customers: MessageSquare,
  marketing: Megaphone,
  finance: BarChart3,
  team: Users,
  other: MoreHorizontal,
};

export const groupOf = (route?: string): string => {
  if (!route) return "other";
  let best: { key: string; len: number } | null = null;
  for (const group of ROUTE_GROUPS) {
    for (const prefix of group.prefixes) {
      const matches = route === prefix || route.startsWith(prefix + "/");
      if (matches && (!best || prefix.length > best.len)) {
        best = { key: group.key, len: prefix.length };
      }
    }
  }
  return best?.key ?? "other";
};
