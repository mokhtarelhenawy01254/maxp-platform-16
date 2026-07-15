import {
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  UserGroupIcon,
  CubeIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  EyeIcon,
  BellIcon,
  CheckCircleIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  HeartIcon,
  TruckIcon,
  ScaleIcon,
  HandRaisedIcon,
  UserPlusIcon,
  NewspaperIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import type { WidgetDefinition, WidgetData } from "./types";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function pctDelta(current: number | null | undefined, prev: number | null | undefined): { value: string; positive: boolean } | undefined {
  const c = current ?? 0;
  const p = prev ?? 0;
  if (p === 0 && c === 0) return undefined;
  if (p === 0) return c > 0 ? { value: "+100%", positive: true } : undefined;
  const pct = ((c - p) / p) * 100;
  if (Math.abs(pct) < 0.5) return undefined;
  return { value: `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`, positive: pct > 0 };
}

export const widgetRegistry: WidgetDefinition[] = [
  // 🛒 Ecommerce
  {
    appSlug: "store",
    id: "ecommerce",
    titleKey: "widgets.ecommerce.title",
    icon: ShoppingCartIcon,
    color: "var(--color-primary)",
    priority: 1,
    href: "/orders",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      const orders = d.orderHealth?.newOrders ?? d.counts?.orders ?? 0;
      const revenue = d.financials?.totalRevenue ?? 0;
      const customers = d.counts?.customers ?? 0;
      return {
        status: "active",
        metrics: [
          { label: "widgets.ecommerce.orders", value: fmt(orders), trend: pctDelta(d.orderHealth?.trackedOrders, d.previousPeriod?.trackedOrders) },
          { label: "widgets.ecommerce.revenue", value: fmt(revenue) },
          { label: "widgets.ecommerce.customers", value: fmt(customers), trend: pctDelta(d.recentActivity?.newCustomers, d.previousPeriod?.newCustomers) },
        ],
      };
    },
  },

  // 💬 WhatsApp
  {
    appSlug: "whatsapp-business",
    id: "whatsapp",
    titleKey: "widgets.whatsapp.title",
    icon: ChatBubbleLeftRightIcon,
    color: "#25D366",
    priority: 2,
    href: "/whatsapp",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      const conversations = d.counts?.conversations ?? 0;
      const newConv = d.recentActivity?.newConversations ?? 0;
      return {
        status: "active",
        statusLabel: "widgets.whatsapp.connected",
        metrics: [
          { label: "widgets.whatsapp.conversations", value: fmt(conversations) },
          { label: "widgets.whatsapp.new", value: fmt(newConv) },
        ],
      };
    },
  },

  // 🤖 AI
  {
    appSlug: "ai-chat-basic",
    id: "ai",
    titleKey: "widgets.ai.title",
    icon: SparklesIcon,
    color: "#8B5CF6",
    priority: 3,
    href: "/admin/ai-hub",
    fetchData: () => null,
  },

  // 👥 CRM / Customers
  {
    appSlug: "crm-basic",
    id: "crm",
    titleKey: "widgets.crm.title",
    icon: UserGroupIcon,
    color: "var(--color-primary)",
    priority: 4,
    href: "/customers",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      return {
        status: "active",
        metrics: [
          { label: "widgets.crm.customers", value: fmt(d.counts?.customers) },
          { label: "widgets.crm.new", value: fmt(d.recentActivity?.newCustomers) },
        ],
      };
    },
  },

  // 🏢 HR
  {
    appSlug: "hr-basic",
    id: "hr",
    titleKey: "widgets.hr.title",
    icon: BuildingOffice2Icon,
    color: "#EC4899",
    priority: 5,
    href: "/hr",
    fetchData: () => null,
  },

  // 📈 Marketing
  {
    appSlug: "facebook-ads-pro",
    id: "marketing",
    titleKey: "widgets.marketing.title",
    icon: CurrencyDollarIcon,
    color: "#F59E0B",
    priority: 6,
    href: "/advertising/facebook-ads",
    fetchData: () => null,
  },

  // 📊 Analytics
  {
    appSlug: "analytics-basic",
    id: "analytics",
    titleKey: "widgets.analytics.title",
    icon: ChartBarIcon,
    color: "#06B6D4",
    priority: 7,
    href: "/analytics/orders",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      return {
        status: "active",
        metrics: [
          { label: "widgets.analytics.visits", value: fmt(d.metrics?.visits), trend: pctDelta(d.metrics?.visits, d.previousPeriod?.visits) },
          { label: "widgets.analytics.conversion", value: d.metrics?.conversionRate != null ? `${d.metrics.conversionRate}%` : "—" },
        ],
      };
    },
  },

  // 📦 Products
  {
    appSlug: "store",
    id: "products",
    titleKey: "widgets.products.title",
    icon: CubeIcon,
    color: "#10B981",
    priority: 8,
    href: "/products",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      return {
        status: d.inventory && (d.inventory.outOfStockCount > 0 || d.inventory.lowStockCount > 0) ? "warning" : "active",
        metrics: [
          { label: "widgets.products.total", value: fmt(d.counts?.products) },
          { label: "widgets.products.lowStock", value: fmt(d.inventory?.lowStockCount) },
        ],
      };
    },
  },

  // 🏥 Medical
  {
    appSlug: "medical-system",
    id: "medical",
    titleKey: "widgets.medical.title",
    icon: HeartIcon,
    color: "#EF4444",
    priority: 9,
    href: "/admin/booking/dashboard",
    fetchData: () => null,
  },

  // 📚 Education
  {
    appSlug: "education-app",
    id: "education",
    titleKey: "widgets.education.title",
    icon: AcademicCapIcon,
    color: "#8B5CF6",
    priority: 10,
    href: "/admin/education/dashboard",
    fetchData: () => null,
  },

  // 🏨 Hotel
  {
    appSlug: "hotel-app",
    id: "hotel",
    titleKey: "widgets.hotel.title",
    icon: BuildingStorefrontIcon,
    color: "#F59E0B",
    priority: 11,
    href: "/admin/hotel",
    fetchData: () => null,
  },

  // 📅 Booking
  {
    appSlug: "booking-app",
    id: "booking",
    titleKey: "widgets.booking.title",
    icon: CalendarDaysIcon,
    color: "#06B6D4",
    priority: 12,
    href: "/admin/booking/dashboard",
    fetchData: () => null,
  },

  // 📦 Procurement
  {
    appSlug: "procurement-pro",
    id: "procurement",
    titleKey: "widgets.procurement.title",
    icon: TruckIcon,
    color: "#10B981",
    priority: 13,
    href: "/procurement/dashboard",
    fetchData: () => null,
  },

  // 🔄 Wholesale
  {
    appSlug: "wholesale-pro",
    id: "wholesale",
    titleKey: "widgets.wholesale.title",
    icon: ScaleIcon,
    color: "#8B5CF6",
    priority: 14,
    href: "/wholesale/dashboard",
    fetchData: () => null,
  },

  // 🤝 Affiliate
  {
    appSlug: "affiliate-program",
    id: "affiliate",
    titleKey: "widgets.affiliate.title",
    icon: UserPlusIcon,
    color: "#EC4899",
    priority: 15,
    href: "/affiliates/management",
    fetchData: () => null,
  },

  // 🤝 Partners
  {
    appSlug: "partner-program",
    id: "partners",
    titleKey: "widgets.partners.title",
    icon: HandRaisedIcon,
    color: "#F59E0B",
    priority: 16,
    href: "/partner-dashboard",
    fetchData: () => null,
  },

  // 🆚 Competitors
  {
    appSlug: "competitor-analysis",
    id: "competitors",
    titleKey: "widgets.competitors.title",
    icon: EyeIcon,
    color: "#6B7280",
    priority: 17,
    href: "/competitors",
    fetchData: () => null,
  },

  // ✅ Tasks
  {
    appSlug: "business-tools",
    id: "tasks",
    titleKey: "widgets.tasks.title",
    icon: CheckCircleIcon,
    color: "#10B981",
    priority: 18,
    href: "/tasks",
    fetchData: () => null,
  },

  // 🔔 Notifications
  {
    appSlug: "notification-automation",
    id: "notifications",
    titleKey: "widgets.notifications.title",
    icon: BellIcon,
    color: "#8B5CF6",
    priority: 19,
    href: "/notifications",
    fetchData: () => null,
  },

  // 📝 Forms
  {
    appSlug: "forms-app",
    id: "forms",
    titleKey: "widgets.forms.title",
    icon: DocumentTextIcon,
    color: "#6B7280",
    priority: 20,
    href: "/admin/forms",
    fetchData: () => null,
  },

  // ✈️ Telegram
  {
    appSlug: "telegram-business",
    id: "telegram",
    titleKey: "widgets.telegram.title",
    icon: NewspaperIcon,
    color: "#229ED9",
    priority: 21,
    href: "/telegram/pro",
    fetchData: () => null,
  },
];

export function getWidgetsForApps(activeApps: string[]): WidgetDefinition[] {
  const activeLower = activeApps.map((a) => a.toLowerCase());
  return widgetRegistry
    .filter((w) => activeLower.includes(w.appSlug))
    .sort((a, b) => a.priority - b.priority);
}
