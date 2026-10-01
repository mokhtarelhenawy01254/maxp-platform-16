import React, { useState, useId, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Search,
  X,
  ChevronRight,
  ChevronLeft,
  ListChecks,
  Monitor,
  TrendingUp,
  ShoppingBag,
  ShieldAlert,
} from "lucide-react";
import i18n from "../../i18n";
import { cn } from "@/lib/utils";
import { matchesSuperAdminNavigationPath } from "./layoutMode";

export const drawerWidth = 336; // 80px rail + 256px panel
export const collapsedDrawerWidth = 80; // 80px rail only

export interface SuperAdminSidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

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

export const getMenuGroups = (t: (key: string) => string): SuperAdminMenuGroup[] => [
  {
    id: "home",
    title: t("superAdmin.sidebar.home") || "الرئيسية",
    icon: <LayoutDashboard className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.dashboard") || "لوحة التحكم المركزية",
        icon: <LayoutDashboard className="h-4 w-4" />,
        path: "/super-admin/dashboard",
      },
      {
        text: t("superAdmin.sidebar.serverUsage") || "مراقبة الموارد والخوادم",
        icon: <HardDrive className="h-4 w-4" />,
        path: "/super-admin/server-usage",
      },
    ],
  },
  {
    id: "companies",
    title: t("superAdmin.sidebar.companies") || "الشركات",
    icon: <Building2 className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.companies") || "إدارة الشركات",
        icon: <Building2 className="h-4 w-4" />,
        path: "/super-admin/companies-v2",
      },
      {
        text: t("superAdmin.sidebar.companyReports") || "تقارير الشركات",
        icon: <BarChart3 className="h-4 w-4" />,
        path: "/super-admin/companies-reports",
      },
      {
        text: t("superAdmin.sidebar.dailyOrders") || "متابعة الطلبات اليومية",
        icon: <ShoppingBag className="h-4 w-4" />,
        path: "/super-admin/daily-orders",
      },
      {
        text: t("superAdmin.sidebar.companyActivity") || "نشاط الشركات الحي",
        icon: <Activity className="h-4 w-4" />,
        path: "/super-admin/company-activity",
      },
      {
        text: t("superAdmin.sidebar.followUp") || "متابعة حسابات الشركات",
        icon: <Bell className="h-4 w-4" />,
        path: "/super-admin/follow-up",
      },
      {
        text: t("superAdmin.sidebar.partners") || "إدارة الشركاء",
        icon: <Users className="h-4 w-4" />,
        path: "/super-admin/partner-management",
      },
      {
        text: t("superAdmin.sidebar.staffAccess") || "وصول الموظفين للشركات",
        icon: <Briefcase className="h-4 w-4" />,
        path: "/super-admin/staff-access",
      },
    ],
  },
  {
    id: "whatsapp",
    title: t("superAdmin.sidebar.whatsappPlatform") || "واتساب",
    icon: <MessageSquare className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.whatsappOverview") || "نظرة عامة على واتساب",
        icon: <MessageSquare className="h-4 w-4" />,
        path: "/super-admin/whatsapp",
      },
      {
        text: t("superAdmin.sidebar.whatsappCompanies") || "شركات واتساب المربوطة",
        icon: <Building2 className="h-4 w-4" />,
        path: "/super-admin/whatsapp/companies",
      },
      {
        text: t("superAdmin.sidebar.whatsappAutomations") || "أتمتة وحملات واتساب",
        icon: <Sliders className="h-4 w-4" />,
        path: "/super-admin/whatsapp/automations",
      },
      {
        text: t("superAdmin.sidebar.whatsappLogs") || "سجلات رسائل واتساب",
        icon: <History className="h-4 w-4" />,
        path: "/super-admin/whatsapp/logs",
      },
    ],
  },
  {
    id: "billing",
    title: t("superAdmin.sidebar.subscriptionsBilling") || "المالية",
    icon: <Wallet className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.walletManagement") || "إدارة المحافظ",
        icon: <Wallet className="h-4 w-4" />,
        path: "/super-admin/wallet-management",
      },
      {
        text: t("superAdmin.sidebar.pendingReceipts") || "الإيصالات المعلقة",
        icon: <Clock className="h-4 w-4" />,
        path: "/super-admin/pending-receipts",
      },
      {
        text: "طلبات سحب الأرباح",
        icon: <DollarSign className="h-4 w-4" />,
        path: "/super-admin/payout-requests",
      },
      {
        text: t("superAdmin.sidebar.businessSpecialties") || "باقات وتخصصات الأعمال",
        icon: <Briefcase className="h-4 w-4" />,
        path: "/super-admin/business-specialties",
      },
      {
        text: t("superAdmin.sidebar.customerInvoices") || "فواتير العملاء",
        icon: <BarChart3 className="h-4 w-4" />,
        path: "/super-admin/invoices",
      },
      {
        text: t("superAdmin.sidebar.customerPayments") || "مدفوعات العملاء",
        icon: <DollarSign className="h-4 w-4" />,
        path: "/super-admin/payments",
      },
      {
        text: t("superAdmin.sidebar.revenueAnalytics") || "نظرة عامة على الإيرادات",
        icon: <TrendingUp className="h-4 w-4" />,
        path: "/super-admin/billing-overview",
      },
      {
        text: t("superAdmin.sidebar.signupCoupons") || "كوبونات المنصة",
        icon: <Tag className="h-4 w-4" />,
        path: "/super-admin/platform-signup-coupons",
      },
    ],
  },
  {
    id: "storeApps",
    title: t("superAdmin.sidebar.storeApps") || "التطبيقات",
    icon: <Grid className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.marketplaceManagement") || "إدارة متجر التطبيقات",
        icon: <Grid className="h-4 w-4" />,
        path: "/super-admin/apps",
      },
      {
        text: t("superAdmin.sidebar.marketplaceCoverage") || "تغطية تطبيقات السوق",
        icon: <Shield className="h-4 w-4" />,
        path: "/super-admin/marketplace-coverage",
      },
      {
        text: t("superAdmin.sidebar.storefrontThemes") || "قوالب المتاجر",
        icon: <Palette className="h-4 w-4" />,
        path: "/super-admin/storefront-themes",
      },
      {
        text: t("superAdmin.sidebar.appExplanations") || "شروحات التطبيقات",
        icon: <Globe className="h-4 w-4" />,
        path: "/super-admin/app-explanations",
      },
      {
        text: t("superAdmin.sidebar.marketingLinksCenter") || "روابط التسويق للمنصة",
        icon: <Tag className="h-4 w-4" />,
        path: "/super-admin/marketing-links",
      },
      {
        text: t("superAdmin.sidebar.landingPages") || "صفحات الهبوط Landing Pages",
        icon: <Globe className="h-4 w-4" />,
        path: "/super-admin/landing-pages",
      },
      {
        text: t("superAdmin.sidebar.homepageTemplates") || "قوالب الصفحة الرئيسية",
        icon: <Monitor className="h-4 w-4" />,
        path: "/super-admin/homepage-templates",
      },
      {
        text: t("superAdmin.sidebar.defaultSidebar") || "السايدبار الافتراضي",
        icon: <Sliders className="h-4 w-4" />,
        path: "/super-admin/default-sidebar",
      },
      {
        text: t("superAdmin.sidebar.uiTemplates") || "قوالب واجهة المستخدم",
        icon: <Layers className="h-4 w-4" />,
        path: "/super-admin/ui-templates",
      },
      {
        text: t("superAdmin.sidebar.productDesigns") || "تصاميم المنتجات",
        icon: <Palette className="h-4 w-4" />,
        path: "/super-admin/product-designs",
      },
    ],
  },
  {
    id: "ai",
    title: t("superAdmin.evaluation.aiModels") || "AI Studio",
    icon: <Brain className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.aiConsumption") || "استهلاك الذكاء الاصطناعي",
        icon: <BarChart3 className="h-4 w-4" />,
        path: "/super-admin/ai-consumption",
      },
      {
        text: t("superAdmin.selfReview.sidebar") || "المراجعة الذاتية ومتابعة AI",
        icon: <Activity className="h-4 w-4" />,
        path: "/super-admin/self-review",
      },
      {
        text: t("superAdmin.sidebar.aiKeyManager") || "إدارة مفاتيح API",
        icon: <Key className="h-4 w-4" />,
        path: "/super-admin/ai-key-manager",
      },
      {
        text: t("superAdmin.sidebar.aiKeyLogs") || "سجلات استخدام المفاتيح",
        icon: <History className="h-4 w-4" />,
        path: "/super-admin/ai-key-logs",
      },
      {
        text: "مفاتيح API الخارجية",
        icon: <Key className="h-4 w-4" />,
        path: "/super-admin/external-api",
      },
      {
        text: "رصد أعطال أدوات الوكلاء",
        icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
        path: "/super-admin/ai-incidents",
      },
      {
        text: t("superAdmin.sidebar.aiPlayground") || "منصة تجربة AI Playground",
        icon: <Play className="h-4 w-4" />,
        path: "/super-admin/ai-playground",
      },
      {
        text: t("superAdmin.evaluation.aiTemplates") || "قوالب الذكاء الاصطناعي",
        icon: <Layers className="h-4 w-4" />,
        path: "/super-admin/ai-templates",
      },
      {
        text: t("superAdmin.sidebar.productEmbeddings") || "تضمين المنتجات Embeddings",
        icon: <Database className="h-4 w-4" />,
        path: "/super-admin/product-embeddings",
      },
      {
        text: t("superAdmin.sidebar.visualSearchLogs") || "سجلات البحث البصري",
        icon: <Image className="h-4 w-4" />,
        path: "/super-admin/visual-search-logs",
      },
      {
        text: t("superAdmin.sidebar.aiHubSkills") || "مهارات AI Hub",
        icon: <Sliders className="h-4 w-4" />,
        path: "/admin/ai-hub?tab=skills",
      },
      {
        text: t("superAdmin.sidebar.aiHubTools") || "أدوات AI Tools",
        icon: <Wrench className="h-4 w-4" />,
        path: "/admin/ai-hub?tab=tools",
      },
      {
        text: t("superAdmin.sidebar.aiHubRag") || "قواعد معرفة RAG",
        icon: <Database className="h-4 w-4" />,
        path: "/admin/ai-hub?tab=rag",
      },
      {
        text: t("superAdmin.sidebar.aiChat") || "شات الذكاء الاصطناعي",
        icon: <MessageSquare className="h-4 w-4" />,
        path: "/super-admin/ai-chat",
      },
      {
        text: t("superAdmin.sidebar.aiImageGenerator") || "إعدادات مولد الصور",
        icon: <Image className="h-4 w-4" />,
        path: "/super-admin/ai-image-generator-settings",
      },
    ],
  },
  {
    id: "system",
    title: t("superAdmin.sidebar.systemAdmin") || "النظام",
    icon: <Settings className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.queueMonitor") || "طوابير المهام Queue Monitor",
        icon: <Activity className="h-4 w-4" />,
        path: "/super-admin/queue-monitor",
      },
      {
        text: t("superAdmin.sidebar.serverUsage") || "استهلاك الخوادم Server Usage",
        icon: <HardDrive className="h-4 w-4" />,
        path: "/super-admin/server-usage",
      },
      {
        text: t("superAdmin.sidebar.systemMonitoring") || "مراقبة النظام والخدمات",
        icon: <Activity className="h-4 w-4" />,
        path: "/super-admin/system-monitoring",
      },
      {
        text: t("superAdmin.sidebar.systemSettings") || "إعدادات النظام العامة",
        icon: <Settings className="h-4 w-4" />,
        path: "/super-admin/system-management",
      },
      {
        text: t("superAdmin.sidebar.dataImport") || "ترحيل قاعدة البيانات",
        icon: <Download className="h-4 w-4" />,
        path: "/super-admin/db-migration",
      },
      {
        text: t("superAdmin.sidebar.superAdminUsers") || "مدراء ومستخدمي السوبر أدمن",
        icon: <Shield className="h-4 w-4" />,
        path: "/super-admin/users",
      },
      {
        text: t("superAdmin.sidebar.supportSettings") || "إعدادات الدعم الفني",
        icon: <Headphones className="h-4 w-4" />,
        path: "/super-admin/support-settings",
      },
      {
        text: t("superAdmin.sidebar.allTickets") || "جميع تذاكر الدعم",
        icon: <Ticket className="h-4 w-4" />,
        path: "/admin/support",
      },
      {
        text: t("superAdmin.sidebar.facebookOAuth") || "ربط فيسبوك OAuth",
        icon: <Facebook className="h-4 w-4" />,
        path: "/super-admin/facebook-oauth",
      },
      {
        text: t("superAdmin.sidebar.metaPixel") || "بكسل المنصة Meta Pixel",
        icon: <Activity className="h-4 w-4" />,
        path: "/super-admin/platform-site-meta-pixel",
      },
    ],
  },
  {
    id: "dev",
    title: t("superAdmin.sidebar.devManagement") || "التطوير",
    icon: <Wrench className="h-6 w-6" />,
    items: [
      {
        text: t("superAdmin.sidebar.devDashboard") || "لوحة تحكم المطورين",
        icon: <LayoutDashboard className="h-4 w-4" />,
        path: "/super-admin/dev-dashboard",
      },
      {
        text: t("superAdmin.sidebar.okrs") || "الأهداف والنتائج OKRs",
        icon: <Trophy className="h-4 w-4" />,
        path: "/super-admin/dev-goals",
      },
      {
        text: t("superAdmin.sidebar.goalAlignment") || "شجرة محاذاة الأهداف",
        icon: <GitBranch className="h-4 w-4" />,
        path: "/super-admin/dev-goals/alignment",
      },
      {
        text: t("superAdmin.sidebar.leaderboard") || "لوحة المتصدرين Leaderboard",
        icon: <Trophy className="h-4 w-4" />,
        path: "/super-admin/dev-leaderboard",
      },
      {
        text: t("superAdmin.evaluation.sidebar") || "تقييم أداء الفريق",
        icon: <BarChart3 className="h-4 w-4" />,
        path: "/super-admin/dev-evaluations",
      },
      {
        text: t("superAdmin.sidebar.projectMap") || "خريطة المشاريع",
        icon: <GitBranch className="h-4 w-4" />,
        path: "/super-admin/project-map",
      },
      {
        text: t("superAdmin.sidebar.tasks") || "قائمة المهام Dev Tasks",
        icon: <ListChecks className="h-4 w-4" />,
        path: "/super-admin/dev-tasks",
      },
      {
        text: t("superAdmin.sidebar.kanbanBoard") || "لوحة كانبان Kanban",
        icon: <LayoutDashboard className="h-4 w-4" />,
        path: "/super-admin/dev-kanban",
      },
      {
        text: t("superAdmin.sidebar.activeTimers") || "التايمر والعدادات النشطة",
        icon: <Clock className="h-4 w-4" />,
        path: "/super-admin/active-timers",
      },
      {
        text: t("superAdmin.sidebar.timeTracking") || "تتبع الوقت Time Tracking",
        icon: <History className="h-4 w-4" />,
        path: "/super-admin/time-tracking",
      },
      {
        text: t("superAdmin.sidebar.devProjects") || "مشاريع التطوير",
        icon: <Code2 className="h-4 w-4" />,
        path: "/super-admin/dev-projects",
      },
      {
        text: t("superAdmin.sidebar.devTeam") || "فريق التطوير",
        icon: <Users className="h-4 w-4" />,
        path: "/super-admin/dev/team",
      },
      {
        text: t("superAdmin.sidebar.releases") || "سجل الإصدارات Releases",
        icon: <Rocket className="h-4 w-4" />,
        path: "/super-admin/dev-releases",
      },
      {
        text: t("superAdmin.sidebar.taskSettings") || "إعدادات المهام والربط البرمجي",
        icon: <Settings className="h-4 w-4" />,
        path: "/super-admin/dev-settings",
      },
    ],
  },
];

const SuperAdminSidebar: React.FC<SuperAdminSidebarProps> = ({
  mobileOpen,
  setMobileOpen,
  isCollapsed,
  setIsCollapsed,
  user,
}) => {
  const location = useLocation();
  const searchInputId = useId();
  const [searchQuery, setSearchQuery] = useState("");

  const menuGroups = useMemo(() => getMenuGroups(i18n.t.bind(i18n)), []);

  // Find which group currently contains the active route
  const activeGroupIdFromRoute = useMemo(() => {
    const found = menuGroups.find((g) =>
      g.items.some((item) =>
        matchesSuperAdminNavigationPath(location.pathname, item.path, location.search)
      )
    );
    return found?.id || "home";
  }, [location.pathname, location.search, menuGroups]);

  const [activeGroupId, setActiveGroupId] = useState<string>(activeGroupIdFromRoute);

  useEffect(() => {
    if (activeGroupIdFromRoute) {
      setActiveGroupId(activeGroupIdFromRoute);
    }
  }, [activeGroupIdFromRoute]);

  const activeGroup = useMemo(
    () => menuGroups.find((g) => g.id === activeGroupId) || menuGroups[0],
    [menuGroups, activeGroupId]
  );

  // Filter items by search query across either the active group or all groups
  const displayedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return activeGroup?.items || [];
    }
    // If searching, search across all groups for maximum convenience
    const allMatches: SuperAdminMenuItem[] = [];
    menuGroups.forEach((g) => {
      g.items.forEach((item) => {
        if (item.text.toLowerCase().includes(q)) {
          allMatches.push(item);
        }
      });
    });
    return allMatches;
  }, [searchQuery, activeGroup, menuGroups]);

  const isRtl = i18n.dir() === "rtl";

  return (
    <>
      {/* Desktop Three-Tier Dual-Rail Sidebar */}
      <aside
        className="hidden sm:flex shrink-0 h-full business-sidebar-shell select-none"
        dir={i18n.dir()}
        aria-label="Super Admin Navigation"
      >
        {/* Tier 1: Icon Rail (Width 80px) */}
        <div className="business-sidebar-rail w-20 flex flex-col items-center py-6 shrink-0 z-20">
          <div className="business-sidebar-brand-block mb-6 shrink-0">
            <Link to="/super-admin/dashboard" className="block" title="MAX-P Control">
              <div className="business-brand-glyph" data-admin="true">
                <Shield className="h-6 w-6 text-white" />
              </div>
            </Link>
          </div>

          <div className="business-sidebar-rail-scroll flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1">
            {menuGroups.map((group) => {
              const isActive = activeGroupId === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    setActiveGroupId(group.id);
                    if (isCollapsed) setIsCollapsed(false);
                  }}
                  className="business-sidebar-rail-item w-full flex flex-col items-center py-2.5 px-1 bg-transparent border-0 cursor-pointer"
                  data-active={isActive}
                  title={group.title}
                >
                  <span className="business-sidebar-rail-icon flex items-center justify-center">{group.icon}</span>
                  <span className="business-sidebar-rail-label text-[11px] font-semibold text-center mt-1 leading-tight">{group.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier 2: Submenu Panel (Width 256px, collapsible) */}
        <div
          className="business-sidebar-panel flex flex-col h-full overflow-hidden"
          data-collapsed={isCollapsed}
        >
          <div className="business-sidebar-panel-header flex items-center justify-between p-4 border-b shrink-0">
            <div className="business-sidebar-company flex items-center gap-3 min-w-0">
              <div className="business-brand-glyph business-brand-glyph--small shrink-0">
                {user?.firstName?.charAt(0) || "M"}
              </div>
              <div className="business-sidebar-company-copy min-w-0">
                <h2 className="text-foreground text-sm font-bold truncate">التحكم الذكي</h2>
                <p className="text-xs text-muted-foreground truncate">{searchQuery ? "نتائج البحث" : activeGroup?.title || "إدارة النظام"}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="business-icon-button business-icon-button--sm shrink-0"
              aria-label={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
              title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              {isRtl ? (
                isCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              ) : (
                isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Search Box */}
          <div className="business-sidebar-search-wrap relative px-3 py-2 border-b shrink-0">
            <label htmlFor={searchInputId} className="sr-only">
              البحث في القوائم
            </label>
            <Search className="business-sidebar-search-icon" />
            <input
              id={searchInputId}
              type="text"
              autoComplete="off"
              placeholder="البحث في القوائم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="business-sidebar-search"
            />
            {!searchQuery && (
              <span className="pointer-events-none absolute inset-inline-end-4 top-1/2 -translate-y-1/2 rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                /
              </span>
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="business-sidebar-clear-search"
                aria-label="مسح البحث"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Submenu Items List */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
            {displayedItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                لا توجد عناصر مطابقة للبحث
              </div>
            ) : (
              displayedItems.map((item) => {
                const isItemActive = matchesSuperAdminNavigationPath(
                  location.pathname,
                  item.path,
                  location.search
                );
                return (
                  <Link
                    key={item.path + item.text}
                    to={item.path}
                    className="business-sidebar-nav-link"
                    data-active={isItemActive}
                    aria-current={isItemActive ? "page" : undefined}
                  >
                    <span className="business-sidebar-nav-icon">{item.icon}</span>
                    <span className="business-sidebar-nav-text flex-1 truncate">{item.text}</span>
                    {isItemActive && (
                      <span className="size-1.5 rounded-full bg-white/90 shadow-sm shrink-0" />
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Responsive for screen < 640px) */}
      <div
        className="business-mobile-overlay sm:hidden"
        data-open={mobileOpen ? "true" : "false"}
        dir={i18n.dir()}
      >
        <div
          className="business-mobile-backdrop"
          data-open={mobileOpen ? "true" : "false"}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "business-mobile-drawer",
            isRtl ? "right-0" : "left-0"
          )}
          data-open={mobileOpen ? "true" : "false"}
          role="dialog"
          aria-modal="true"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="business-brand-glyph business-brand-glyph--small">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold">التحكم الذكي</h2>
                <p className="text-xs text-muted-foreground">إدارة النظام المركزي</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="business-icon-button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mobile Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute inset-inline-start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث في القوائم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-border bg-background"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-inline-end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {menuGroups.map((group) => {
              const items = searchQuery.trim()
                ? group.items.filter((i) =>
                    i.text.toLowerCase().includes(searchQuery.trim().toLowerCase())
                  )
                : group.items;

              if (items.length === 0) return null;

              return (
                <div key={group.id} className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-2">
                    {group.icon}
                    <span>{group.title}</span>
                  </div>
                  {items.map((item) => {
                    const isItemActive = matchesSuperAdminNavigationPath(
                      location.pathname,
                      item.path,
                      location.search
                    );
                    return (
                      <Link
                        key={item.path + item.text}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className="business-sidebar-nav-link"
                        data-active={isItemActive}
                      >
                        <span className="business-sidebar-nav-icon">{item.icon}</span>
                        <span className="business-sidebar-nav-text">{item.text}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default SuperAdminSidebar;
