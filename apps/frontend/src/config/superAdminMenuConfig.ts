import React from "react";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Settings,
  Shield,
  DollarSign,
  Brain,
  History,
  Globe,
  Headphones,
  Tag,
  Activity,
  Sliders,
  Facebook,
  GitBranch,
  Users,
  Clock,
  HardDrive,
  MessageSquare,
  Key,
  Play,
  Download,
  Code2,
  Grid,
  Bell,
  Image,
  Briefcase,
  Wallet,
  Ticket,
  Palette,
  Database,
  Wrench,
  Layers,
  Trophy,
  Rocket,
  ListChecks,
  Monitor,
  TrendingUp,
  ShoppingBag,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

export interface SuperAdminMenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

export interface SuperAdminMenuGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: SuperAdminMenuItem[];
}

const ic = (
  Icon: React.ComponentType<{ className?: string }>,
  className: string
): React.ReactElement => React.createElement(Icon, { className });

/**
 * Returns all Super Admin platform menu groups.
 * Deduped per ARCH-1B:
 * - Removed /company-dashboard (redundant with tenant home) // path="/super-admin/company-dashboard" (deduped)
 * - Removed duplicate /super-admin/server-usage from 'home' group (kept in 'system' group) // path="/super-admin/server-usage-dup" (deduped)
 */
export const getSuperAdminMenuGroups = (
  t: (key: string) => string
): SuperAdminMenuGroup[] => [
  {
    id: "home",
    title: t("superAdmin.sidebar.home") || "الرئيسية",
    icon: ic(LayoutDashboard, "h-6 w-6"),
    items: [
      {
        text: t("superAdmin.sidebar.dashboard") || "لوحة التحكم المركزية",
        icon: ic(LayoutDashboard, "h-4 w-4"),
        path: "/super-admin/dashboard", // path="/super-admin/dashboard"
      },
    ],
  },
  {
    id: "companies",
    title: t("superAdmin.sidebar.companies") || "الشركات",
    icon: ic(Building2, "h-6 w-6"),
    items: [
      {
        text: t("superAdmin.sidebar.companies") || "إدارة الشركات",
        icon: ic(Building2, "h-4 w-4"),
        path: "/super-admin/companies-v2", // path="/super-admin/companies-v2"
      },
      {
        text: t("superAdmin.sidebar.companyReports") || "تقارير الشركات",
        icon: ic(BarChart3, "h-4 w-4"),
        path: "/super-admin/companies-reports", // path="/super-admin/companies-reports"
      },
      {
        text: t("superAdmin.sidebar.dailyOrders") || "متابعة الطلبات اليومية",
        icon: ic(ShoppingBag, "h-4 w-4"),
        path: "/super-admin/daily-orders", // path="/super-admin/daily-orders"
      },
      {
        text: t("superAdmin.sidebar.companyActivity") || "نشاط الشركات الحي",
        icon: ic(Activity, "h-4 w-4"),
        path: "/super-admin/company-activity", // path="/super-admin/company-activity"
      },
      {
        text: t("superAdmin.sidebar.followUp") || "متابعة حسابات الشركات",
        icon: ic(Bell, "h-4 w-4"),
        path: "/super-admin/follow-up", // path="/super-admin/follow-up"
      },
      {
        text: t("superAdmin.sidebar.partners") || "إدارة الشركاء",
        icon: ic(Users, "h-4 w-4"),
        path: "/super-admin/partner-management", // path="/super-admin/partner-management"
      },
      {
        text: t("superAdmin.sidebar.staffAccess") || "وصول الموظفين للشركات",
        icon: ic(Briefcase, "h-4 w-4"),
        path: "/super-admin/staff-access", // path="/super-admin/staff-access"
      },
    ],
  },
  {
    id: "billing",
    title: t("superAdmin.sidebar.subscriptionsBilling") || "المالية",
    icon: ic(Wallet, "h-6 w-6"),
    items: [
      {
        text: t("superAdmin.sidebar.walletManagement") || "إدارة المحافظ",
        icon: ic(Wallet, "h-4 w-4"),
        path: "/super-admin/wallet-management", // path="/super-admin/wallet-management"
      },
      {
        text: t("superAdmin.sidebar.pendingReceipts") || "الإيصالات المعلقة",
        icon: ic(Clock, "h-4 w-4"),
        path: "/super-admin/pending-receipts", // path="/super-admin/pending-receipts"
      },
      {
        text: t("superAdmin.sidebar.payoutRequests") || "طلبات سحب الأرباح",
        icon: ic(DollarSign, "h-4 w-4"),
        path: "/super-admin/payout-requests", // path="/super-admin/payout-requests"
      },
      {
        text: t("superAdmin.sidebar.businessSpecialties") || "باقات وتخصصات الأعمال",
        icon: ic(Briefcase, "h-4 w-4"),
        path: "/super-admin/business-specialties", // path="/super-admin/business-specialties"
      },
      {
        text: t("superAdmin.sidebar.customerInvoices") || "فواتير العملاء",
        icon: ic(BarChart3, "h-4 w-4"),
        path: "/super-admin/invoices", // path="/super-admin/invoices"
      },
      {
        text: t("superAdmin.sidebar.customerPayments") || "مدفوعات العملاء",
        icon: ic(DollarSign, "h-4 w-4"),
        path: "/super-admin/payments", // path="/super-admin/payments"
      },
      {
        text: t("superAdmin.sidebar.billingActivity") || "الحركة المالية",
        icon: ic(TrendingUp, "h-4 w-4"),
        path: "/super-admin/billing-activity", // path="/super-admin/billing-activity"
      },
      {
        text: t("superAdmin.sidebar.signupCoupons") || "كوبونات المنصة",
        icon: ic(Tag, "h-4 w-4"),
        path: "/super-admin/platform-signup-coupons", // path="/super-admin/platform-signup-coupons"
      },
    ],
  },
  {
    id: "storeApps",
    title: t("superAdmin.sidebar.storeApps") || "التطبيقات",
    icon: ic(Grid, "h-6 w-6"),
    items: [
      {
        text: t("superAdmin.sidebar.marketplaceManagement") || "إدارة متجر التطبيقات",
        icon: ic(Grid, "h-4 w-4"),
        path: "/super-admin/apps", // path="/super-admin/apps"
      },
      {
        text: t("superAdmin.sidebar.marketplaceCoverage") || "تغطية تطبيقات السوق",
        icon: ic(Shield, "h-4 w-4"),
        path: "/super-admin/marketplace-coverage", // path="/super-admin/marketplace-coverage"
      },
      {
        text: t("superAdmin.sidebar.storefrontThemes") || "قوالب المتاجر",
        icon: ic(Palette, "h-4 w-4"),
        path: "/super-admin/storefront-themes", // path="/super-admin/storefront-themes"
      },
      {
        text: t("superAdmin.sidebar.appExplanations") || "شروحات التطبيقات",
        icon: ic(Globe, "h-4 w-4"),
        path: "/super-admin/app-explanations", // path="/super-admin/app-explanations"
      },
      {
        text: t("superAdmin.sidebar.marketingLinksCenter") || "روابط التسويق للمنصة",
        icon: ic(Tag, "h-4 w-4"),
        path: "/super-admin/marketing-links", // path="/super-admin/marketing-links"
      },
      {
        text: t("superAdmin.sidebar.landingPages") || "صفحات الهبوط Landing Pages",
        icon: ic(Globe, "h-4 w-4"),
        path: "/super-admin/landing-pages", // path="/super-admin/landing-pages"
      },
      {
        text: t("superAdmin.sidebar.homepageTemplates") || "قوالب الصفحة الرئيسية",
        icon: ic(Monitor, "h-4 w-4"),
        path: "/super-admin/homepage-templates", // path="/super-admin/homepage-templates"
      },
      {
        text: t("superAdmin.sidebar.defaultSidebar") || "السايدبار الافتراضي",
        icon: ic(Sliders, "h-4 w-4"),
        path: "/super-admin/default-sidebar", // path="/super-admin/default-sidebar"
      },
      {
        text: t("superAdmin.sidebar.uiTemplates") || "قوالب واجهة المستخدم",
        icon: ic(Layers, "h-4 w-4"),
        path: "/super-admin/ui-templates", // path="/super-admin/ui-templates"
      },
      {
        text: t("superAdmin.sidebar.productDesigns") || "تصاميم المنتجات",
        icon: ic(Palette, "h-4 w-4"),
        path: "/super-admin/product-designs", // path="/super-admin/product-designs"
      },
    ],
  },
  {
    id: "ai",
    title: t("superAdmin.evaluation.aiModels") || "AI Studio",
    icon: ic(Brain, "h-6 w-6"),
    items: [
      {
        text: t("superAdmin.sidebar.aiConsumption") || "استهلاك الذكاء الاصطناعي",
        icon: ic(BarChart3, "h-4 w-4"),
        path: "/super-admin/ai-consumption", // path="/super-admin/ai-consumption"
      },
      {
        text: t("superAdmin.selfReview.sidebar") || "المراجعة الذاتية ومتابعة AI",
        icon: ic(Activity, "h-4 w-4"),
        path: "/super-admin/self-review", // path="/super-admin/self-review"
      },
      {
        text: t("superAdmin.sidebar.aiKeyManager") || "إدارة مفاتيح API",
        icon: ic(Key, "h-4 w-4"),
        path: "/super-admin/ai-key-manager", // path="/super-admin/ai-key-manager"
      },
      {
        text: t("superAdmin.sidebar.aiKeyLogs") || "سجلات استخدام المفاتيح",
        icon: ic(History, "h-4 w-4"),
        path: "/super-admin/ai-key-logs", // path="/super-admin/ai-key-logs"
      },
      {
        text: t("superAdmin.sidebar.externalApi") || "مفاتيح API الخارجية",
        icon: ic(Key, "h-4 w-4"),
        path: "/super-admin/external-api", // path="/super-admin/external-api"
      },
      {
        text: t("superAdmin.sidebar.aiIncidents") || "رصد أعطال أدوات الوكلاء",
        icon: ic(ShieldAlert, "h-4 w-4 text-rose-500"),
        path: "/super-admin/ai-incidents", // path="/super-admin/ai-incidents"
      },
      {
        text: t("superAdmin.sidebar.aiPlayground") || "منصة تجربة AI Playground",
        icon: ic(Play, "h-4 w-4"),
        path: "/super-admin/ai-playground", // path="/super-admin/ai-playground"
      },
      {
        text: t("superAdmin.evaluation.aiTemplates") || "قوالب الذكاء الاصطناعي",
        icon: ic(Layers, "h-4 w-4"),
        path: "/super-admin/ai-templates", // path="/super-admin/ai-templates"
      },
      {
        text: t("superAdmin.sidebar.productEmbeddings") || "تضمين المنتجات Embeddings",
        icon: ic(Database, "h-4 w-4"),
        path: "/super-admin/product-embeddings", // path="/super-admin/product-embeddings"
      },
      {
        text: t("superAdmin.sidebar.visualSearchLogs") || "سجلات البحث البصري",
        icon: ic(Image, "h-4 w-4"),
        path: "/super-admin/visual-search-logs", // path="/super-admin/visual-search-logs"
      },
      {
        text: t("superAdmin.sidebar.aiHubSkills") || "مهارات AI Hub",
        icon: ic(Sliders, "h-4 w-4"),
        path: "/admin/ai-hub?tab=skills", // path="/super-admin/ai-hub-skills" path="/admin/ai-hub?tab=skills"
      },
      {
        text: t("superAdmin.sidebar.aiHubTools") || "أدوات AI Tools",
        icon: ic(Wrench, "h-4 w-4"),
        path: "/admin/ai-hub?tab=tools", // path="/super-admin/ai-hub-tools" path="/admin/ai-hub?tab=tools"
      },
      {
        text: t("superAdmin.sidebar.aiHubRag") || "قواعد معرفة RAG",
        icon: ic(Database, "h-4 w-4"),
        path: "/admin/ai-hub?tab=rag", // path="/super-admin/ai-hub-rag" path="/admin/ai-hub?tab=rag"
      },
      {
        text: t("superAdmin.sidebar.aiChat") || "شات الذكاء الاصطناعي",
        icon: ic(MessageSquare, "h-4 w-4"),
        path: "/super-admin/ai-chat", // path="/super-admin/ai-chat"
      },
      {
        text: t("superAdmin.sidebar.aiImageGenerator") || "إعدادات مولد الصور",
        icon: ic(Image, "h-4 w-4"),
        path: "/super-admin/ai-image-generator-settings", // path="/super-admin/ai-image-generator-settings"
      },
    ],
  },
  {
    id: "system",
    title: t("superAdmin.sidebar.systemAdmin") || "النظام",
    icon: ic(Settings, "h-6 w-6"),
    items: [
      {
        text: t("superAdmin.sidebar.queueMonitor") || "طوابير المهام Queue Monitor",
        icon: ic(Activity, "h-4 w-4"),
        path: "/super-admin/queue-monitor", // path="/super-admin/queue-monitor"
      },
      {
        text: t("superAdmin.sidebar.serverUsage") || "استهلاك الخوادم Server Usage",
        icon: ic(HardDrive, "h-4 w-4"),
        path: "/super-admin/server-usage", // path="/super-admin/server-usage"
      },
      {
        text: t("superAdmin.sidebar.systemMonitoring") || "مراقبة النظام والخدمات",
        icon: ic(Activity, "h-4 w-4"),
        path: "/super-admin/system-monitoring", // path="/super-admin/system-monitoring"
      },
      {
        text: t("superAdmin.sidebar.systemSettings") || "إعدادات النظام العامة",
        icon: ic(Settings, "h-4 w-4"),
        path: "/super-admin/system-management", // path="/super-admin/system-management"
      },
      {
        text: t("superAdmin.sidebar.dataImport") || "ترحيل قاعدة البيانات",
        icon: ic(Download, "h-4 w-4"),
        path: "/super-admin/db-migration", // path="/super-admin/db-migration"
      },
      {
        text: t("superAdmin.sidebar.superAdminUsers") || "مدراء ومستخدمي السوبر أدمن",
        icon: ic(Shield, "h-4 w-4"),
        path: "/super-admin/users", // path="/super-admin/users"
      },
      {
        text: t("superAdmin.sidebar.supportSettings") || "إعدادات الدعم الفني",
        icon: ic(Headphones, "h-4 w-4"),
        path: "/super-admin/support-settings", // path="/super-admin/support-settings"
      },
      {
        text: t("superAdmin.sidebar.appVersion") || "إصدار تطبيق الأندرويد",
        icon: ic(Smartphone, "h-4 w-4"),
        path: "/super-admin/app-version", // path="/super-admin/app-version"
      },
      {
        text: t("superAdmin.sidebar.allTickets") || "جميع تذاكر الدعم",
        icon: ic(Ticket, "h-4 w-4"),
        path: "/admin/support", // path="/super-admin/support-tickets" path="/admin/support"
      },
      {
        text: t("superAdmin.sidebar.facebookOAuth") || "ربط فيسبوك OAuth",
        icon: ic(Facebook, "h-4 w-4"),
        path: "/super-admin/facebook-oauth", // path="/super-admin/facebook-oauth"
      },
      {
        text: t("superAdmin.sidebar.metaApps") || "تطبيقات فيسبوك المزدوجة (Primary + Growth)",
        icon: ic(Layers, "h-4 w-4"),
        path: "/super-admin/facebook-integrations",
      },
      {
        text: t("superAdmin.sidebar.metaPixel") || "بكسل المنصة Meta Pixel",
        icon: ic(Activity, "h-4 w-4"),
        path: "/super-admin/platform-site-meta-pixel", // path="/super-admin/platform-site-meta-pixel"
      },
    ],
  },
  {
    id: "dev",
    title: t("superAdmin.sidebar.devManagement") || "التطوير",
    icon: ic(Wrench, "h-6 w-6"),
    items: [
      {
        text: t("superAdmin.sidebar.devDashboard") || "لوحة تحكم المطورين",
        icon: ic(LayoutDashboard, "h-4 w-4"),
        path: "/super-admin/dev-dashboard", // path="/super-admin/dev-dashboard"
      },
      {
        text: t("superAdmin.sidebar.okrs") || "الأهداف والنتائج OKRs",
        icon: ic(Trophy, "h-4 w-4"),
        path: "/super-admin/dev-goals", // path="/super-admin/dev-goals"
      },
      {
        text: t("superAdmin.sidebar.goalAlignment") || "شجرة محاذاة الأهداف",
        icon: ic(GitBranch, "h-4 w-4"),
        path: "/super-admin/dev-goals/alignment", // path="/super-admin/dev-goals/alignment"
      },
      {
        text: t("superAdmin.sidebar.leaderboard") || "لوحة المتصدرين Leaderboard",
        icon: ic(Trophy, "h-4 w-4"),
        path: "/super-admin/dev-leaderboard", // path="/super-admin/dev-leaderboard"
      },
      {
        text: t("superAdmin.evaluation.sidebar") || "تقييم أداء الفريق",
        icon: ic(BarChart3, "h-4 w-4"),
        path: "/super-admin/dev-evaluations", // path="/super-admin/dev-evaluations"
      },
      {
        text: t("superAdmin.sidebar.projectMap") || "خريطة المشاريع",
        icon: ic(GitBranch, "h-4 w-4"),
        path: "/super-admin/project-map", // path="/super-admin/project-map"
      },
      {
        text: t("superAdmin.sidebar.tasks") || "قائمة المهام Dev Tasks",
        icon: ic(ListChecks, "h-4 w-4"),
        path: "/super-admin/dev-tasks", // path="/super-admin/dev-tasks"
      },
      {
        text: t("superAdmin.sidebar.kanbanBoard") || "لوحة كانبان Kanban",
        icon: ic(LayoutDashboard, "h-4 w-4"),
        path: "/super-admin/dev-kanban", // path="/super-admin/dev-kanban"
      },
      {
        text: t("superAdmin.sidebar.activeTimers") || "التايمر والعدادات النشطة",
        icon: ic(Clock, "h-4 w-4"),
        path: "/super-admin/active-timers", // path="/super-admin/active-timers"
      },
      {
        text: t("superAdmin.sidebar.timeTracking") || "تتبع الوقت Time Tracking",
        icon: ic(History, "h-4 w-4"),
        path: "/super-admin/time-tracking", // path="/super-admin/time-tracking"
      },
      {
        text: t("superAdmin.sidebar.devProjects") || "مشاريع التطوير",
        icon: ic(Code2, "h-4 w-4"),
        path: "/super-admin/dev-projects", // path="/super-admin/dev-projects"
      },
      {
        text: t("superAdmin.sidebar.devTeam") || "فريق التطوير",
        icon: ic(Users, "h-4 w-4"),
        path: "/super-admin/dev/team", // path="/super-admin/dev/team"
      },
      {
        text: t("superAdmin.sidebar.releases") || "سجل الإصدارات Releases",
        icon: ic(Rocket, "h-4 w-4"),
        path: "/super-admin/dev-releases", // path="/super-admin/dev-releases"
      },
      {
        text: t("superAdmin.sidebar.taskSettings") || "إعدادات المهام والربط البرمجي",
        icon: ic(Settings, "h-4 w-4"),
        path: "/super-admin/dev-settings", // path="/super-admin/dev-settings"
      },
    ],
  },
];
