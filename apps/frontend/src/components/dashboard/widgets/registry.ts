import { ShoppingBag as ShoppingCartIcon, MessageSquare as ChatBubbleLeftRightIcon, Star as SparklesIcon, Circle as UserGroupIcon, Circle as CubeIcon, DollarSign as CurrencyDollarIcon, Activity as ChartBarIcon, File as DocumentTextIcon, Store as BuildingStorefrontIcon, Eye as EyeIcon, Bell as BellIcon, Check as CheckCircleIcon, Circle as BuildingOffice2Icon, Circle as CalendarDaysIcon, Heart as HeartIcon, Truck as TruckIcon, Circle as ScaleIcon, Circle as HandRaisedIcon, Circle as UserPlusIcon, Circle as NewspaperIcon, Circle as AcademicCapIcon } from 'lucide-react';
;
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
    titleKey: "companyDashboard.widgets.ecommerce.title",
    icon: ShoppingCartIcon,
    color: "var(--color-primary)",
    priority: 1,
    colSpan: 2,
    href: "/orders",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      const orders = d.orderHealth?.newOrders ?? d.counts?.orders ?? 0;
      const revenue = d.financials?.totalRevenue ?? 0;
      const customers = d.counts?.customers ?? 0;
      return {
        status: "active",
        metrics: [
          { label: "companyDashboard.widgets.ecommerce.orders", value: fmt(orders), trend: pctDelta(d.orderHealth?.trackedOrders, d.previousPeriod?.trackedOrders) },
          { label: "companyDashboard.widgets.ecommerce.revenue", value: fmt(revenue) },
          { label: "companyDashboard.widgets.ecommerce.customers", value: fmt(customers), trend: pctDelta(d.recentActivity?.newCustomers, d.previousPeriod?.newCustomers) },
        ],
      };
    },
  },

  // 💬 WhatsApp
  {
    appSlug: "whatsapp-business",
    id: "whatsapp",
    titleKey: "companyDashboard.widgets.whatsapp.title",
    icon: ChatBubbleLeftRightIcon,
    color: "#25D366",
    priority: 2,
    colSpan: 2,
    href: "/whatsapp",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      const conversations = d.counts?.conversations ?? 0;
      const newConv = d.recentActivity?.newConversations ?? 0;
      return {
        status: "active",
        statusLabel: "companyDashboard.widgets.whatsapp.connected",
        metrics: [
          { label: "companyDashboard.widgets.whatsapp.conversations", value: fmt(conversations) },
          { label: "companyDashboard.widgets.whatsapp.new", value: fmt(newConv) },
        ],
      };
    },
  },

  // 🤖 AI
  {
    appSlug: "ai-chat-basic",
    id: "ai",
    titleKey: "companyDashboard.widgets.ai.title",
    icon: SparklesIcon,
    color: "#8B5CF6",
    priority: 3,
    colSpan: 2,
    href: "/admin/ai-hub",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.interactionsToday && !appData?.sessions) return null;
      return {
        status: "active",
        metrics: [
          { label: "companyDashboard.widgets.ai.interactions", value: fmt(appData.interactionsToday as number) },
          { label: "companyDashboard.widgets.ai.sessions", value: fmt(appData.sessions as number) },
        ],
      };
    },
  },

  // 👥 CRM / Customers
  {
    appSlug: "crm-basic",
    id: "crm",
    titleKey: "companyDashboard.widgets.crm.title",
    icon: UserGroupIcon,
    color: "var(--color-primary)",
    priority: 4,
    href: "/customers",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      return {
        status: "active",
        metrics: [
          { label: "companyDashboard.widgets.crm.customers", value: fmt(d.counts?.customers) },
          { label: "companyDashboard.widgets.crm.new", value: fmt(d.recentActivity?.newCustomers) },
        ],
      };
    },
  },

  // 🏢 HR
  {
    appSlug: "hr-basic",
    id: "hr",
    titleKey: "companyDashboard.widgets.hr.title",
    icon: BuildingOffice2Icon,
    color: "#EC4899",
    priority: 5,
    href: "/hr",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.activeEmployees && !appData?.presentToday) return null;
      return {
        status: "active",
        metrics: [
          { label: "companyDashboard.widgets.hr.employees", value: fmt(appData.activeEmployees as number) },
          { label: "companyDashboard.widgets.hr.present", value: fmt(appData.presentToday as number) },
          { label: "companyDashboard.widgets.hr.onLeave", value: fmt(appData.onLeave as number) },
        ],
      };
    },
  },

  // 📈 Marketing
  {
    appSlug: "facebook-ads-pro",
    id: "marketing",
    titleKey: "companyDashboard.widgets.marketing.title",
    icon: CurrencyDollarIcon,
    color: "#F59E0B",
    priority: 6,
    colSpan: 2,
    href: "/advertising/facebook-ads",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.campaigns && !appData?.activeCampaigns) return null;
      return {
        status: (appData.activeCampaigns as number) > 0 ? "active" : "inactive",
        metrics: [
          { label: "companyDashboard.widgets.marketing.campaigns", value: fmt(appData.campaigns as number) },
          { label: "companyDashboard.widgets.marketing.active", value: fmt(appData.activeCampaigns as number) },
        ],
      };
    },
  },

  // 📊 Analytics
  {
    appSlug: "analytics-basic",
    id: "analytics",
    titleKey: "companyDashboard.widgets.analytics.title",
    icon: ChartBarIcon,
    color: "#06B6D4",
    priority: 7,
    href: "/analytics/orders",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      return {
        status: "active",
        metrics: [
          { label: "companyDashboard.widgets.analytics.visits", value: fmt(d.metrics?.visits), trend: pctDelta(d.metrics?.visits, d.previousPeriod?.visits) },
          { label: "companyDashboard.widgets.analytics.conversion", value: d.metrics?.conversionRate != null ? `${d.metrics.conversionRate}%` : "—" },
        ],
      };
    },
  },

  // 📦 Products
  {
    appSlug: "store",
    id: "products",
    titleKey: "companyDashboard.widgets.products.title",
    icon: CubeIcon,
    color: "#10B981",
    priority: 8,
    href: "/products",
    fetchData: (d): WidgetData | null => {
      if (!d) return null;
      return {
        status: d.inventory && (d.inventory.outOfStockCount > 0 || d.inventory.lowStockCount > 0) ? "warning" : "active",
        metrics: [
          { label: "companyDashboard.widgets.products.total", value: fmt(d.counts?.products) },
          { label: "companyDashboard.widgets.products.lowStock", value: fmt(d.inventory?.lowStockCount) },
        ],
      };
    },
  },

  // 🏥 Medical
  {
    appSlug: "medical-system",
    id: "medical",
    titleKey: "companyDashboard.widgets.medical.title",
    icon: HeartIcon,
    color: "#EF4444",
    priority: 9,
    href: "/admin/booking/dashboard",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.appointmentsToday) return null;
      return {
        status: (appData.appointmentsToday as number) > 0 ? "active" : "inactive",
        metrics: [
          { label: "companyDashboard.widgets.medical.appointments", value: fmt(appData.appointmentsToday as number) },
        ],
      };
    },
  },

  // 📚 Education
  {
    appSlug: "education-app",
    id: "education",
    titleKey: "companyDashboard.widgets.education.title",
    icon: AcademicCapIcon,
    color: "#8B5CF6",
    priority: 10,
    href: "/admin/education/dashboard",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.activeStudents && !appData?.sessionsToday) return null;
      return {
        status: "active",
        metrics: [
          { label: "companyDashboard.widgets.education.students", value: fmt(appData.activeStudents as number) },
          { label: "companyDashboard.widgets.education.sessions", value: fmt(appData.sessionsToday as number) },
        ],
      };
    },
  },

  // 🏨 Hotel
  {
    appSlug: "hotel-app",
    id: "hotel",
    titleKey: "companyDashboard.widgets.hotel.title",
    icon: BuildingStorefrontIcon,
    color: "#F59E0B",
    priority: 11,
    href: "/admin/hotel",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.checkedIn && !appData?.occupiedRooms) return null;
      return {
        status: (appData.occupiedRooms as number) > 0 ? "active" : "inactive",
        metrics: [
          { label: "companyDashboard.widgets.hotel.checkedIn", value: fmt(appData.checkedIn as number) },
          { label: "companyDashboard.widgets.hotel.occupied", value: fmt(appData.occupiedRooms as number) },
          { label: "companyDashboard.widgets.hotel.available", value: fmt(appData.availableRooms as number) },
        ],
      };
    },
  },

  // 📅 Booking
  {
    appSlug: "booking-app",
    id: "booking",
    titleKey: "companyDashboard.widgets.booking.title",
    icon: CalendarDaysIcon,
    color: "#06B6D4",
    priority: 12,
    href: "/admin/booking/dashboard",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.appointmentsToday) return null;
      return {
        status: (appData.appointmentsToday as number) > 0 ? "active" : "inactive",
        metrics: [
          { label: "companyDashboard.widgets.booking.appointments", value: fmt(appData.appointmentsToday as number) },
        ],
      };
    },
  },

  // 📦 Procurement
  {
    appSlug: "procurement-pro",
    id: "procurement",
    titleKey: "companyDashboard.widgets.procurement.title",
    icon: TruckIcon,
    color: "#10B981",
    priority: 13,
    href: "/procurement/dashboard",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.pendingOrders && !appData?.activeSuppliers) return null;
      return {
        status: (appData.pendingOrders as number) > 0 ? "warning" : "active",
        metrics: [
          { label: "companyDashboard.widgets.procurement.pending", value: fmt(appData.pendingOrders as number) },
          { label: "companyDashboard.widgets.procurement.suppliers", value: fmt(appData.activeSuppliers as number) },
        ],
      };
    },
  },

  // 🔄 Wholesale
  {
    appSlug: "wholesale-pro",
    id: "wholesale",
    titleKey: "companyDashboard.widgets.wholesale.title",
    icon: ScaleIcon,
    color: "#8B5CF6",
    priority: 14,
    href: "/wholesale/dashboard",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.activeCustomers) return null;
      return {
        status: "active",
        metrics: [
          { label: "companyDashboard.widgets.wholesale.customers", value: fmt(appData.activeCustomers as number) },
        ],
      };
    },
  },

  // 🤝 Affiliate
  {
    appSlug: "affiliate-program",
    id: "affiliate",
    titleKey: "companyDashboard.widgets.affiliate.title",
    icon: UserPlusIcon,
    color: "#EC4899",
    priority: 15,
    href: "/affiliates/management",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.activeAffiliates) return null;
      return {
        status: (appData.activeAffiliates as number) > 0 ? "active" : "inactive",
        metrics: [
          { label: "companyDashboard.widgets.affiliate.active", value: fmt(appData.activeAffiliates as number) },
          { label: "companyDashboard.widgets.affiliate.pending", value: fmt(appData.pendingCommissions as number) },
        ],
      };
    },
  },

  // 🤝 Partners
  {
    appSlug: "partner-program",
    id: "partners",
    titleKey: "companyDashboard.widgets.partners.title",
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
    titleKey: "companyDashboard.widgets.competitors.title",
    icon: EyeIcon,
    color: "#6B7280",
    priority: 17,
    href: "/competitors",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.tracked) return null;
      return {
        status: (appData.tracked as number) > 0 ? "active" : "inactive",
        metrics: [
          { label: "companyDashboard.widgets.competitors.tracked", value: fmt(appData.tracked as number) },
        ],
      };
    },
  },

  // ✅ Tasks
  {
    appSlug: "business-tools",
    id: "tasks",
    titleKey: "companyDashboard.widgets.tasks.title",
    icon: CheckCircleIcon,
    color: "#10B981",
    priority: 18,
    href: "/tasks",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.openTasks && !appData?.completedThisWeek) return null;
      return {
        status: (appData.openTasks as number) > 0 ? "warning" : "active",
        metrics: [
          { label: "companyDashboard.widgets.tasks.open", value: fmt(appData.openTasks as number) },
          { label: "companyDashboard.widgets.tasks.completed", value: fmt(appData.completedThisWeek as number) },
        ],
      };
    },
  },

  // 🔔 Notifications
  {
    appSlug: "notification-automation",
    id: "notifications",
    titleKey: "companyDashboard.widgets.notifications.title",
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
    titleKey: "companyDashboard.widgets.forms.title",
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
    titleKey: "companyDashboard.widgets.telegram.title",
    icon: NewspaperIcon,
    color: "#229ED9",
    priority: 21,
    href: "/telegram/pro",
    fetchData: (_d, appData): WidgetData | null => {
      if (!appData?.groups) return null;
      return {
        status: (appData.groups as number) > 0 ? "active" : "inactive",
        metrics: [
          { label: "companyDashboard.widgets.telegram.groups", value: fmt(appData.groups as number) },
        ],
      };
    },
  },
];

export function getWidgetsForApps(activeApps: string[]): WidgetDefinition[] {
  const activeLower = activeApps.map((a) => a.toLowerCase());
  return widgetRegistry
    .filter((w) => activeLower.includes(w.appSlug))
    .sort((a, b) => a.priority - b.priority);
}
