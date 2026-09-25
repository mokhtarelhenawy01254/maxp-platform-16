import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import {
  Bars3Icon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { Sparkles } from "lucide-react";
import { MerchantCopilotHost, toggleMerchantCopilot } from "../merchant-copilot";
import "../../styles/hr-theme.css";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { useAuth } from "../../hooks/useAuthSimple";
import { tokenManager } from "../../utils/tokenManager";
import { getSidebarConfig } from "../../config/sidebar";
import { useVisualTheme } from "../../contexts/VisualThemeContext";
import { BUSINESS_THEME_ID } from "../../config/themes";
import { SidebarLayoutType } from "../../types/layout";
import SidebarLayoutFactory from "./sidebar/SidebarLayoutFactory";
import ThreeTierSidebar from "./sidebar/ThreeTierSidebar";
import { useSidebarBadges } from "./sidebar/useSidebarBadges";
import { shouldUseSuperAdminShell } from "./layoutMode";
import CompanySwitcher from "../common/CompanySwitcher";
import LanguageSwitcher from "../common/LanguageSwitcher";
import NotificationDropdown from "../notifications/NotificationDropdown";
import ThemeToggle from "../ui/theme-toggle";
import { apiClient } from "../../services/apiClient";
import type { ApiRequestConfig } from "../../services/apiClient";
import socketService from "../../services/socketService";
import ActiveUsersMonitor from "../ActiveUsersMonitor";
import { SidebarSettingsProvider, useSidebarSettings } from "../../contexts/SidebarSettingsContext";
import PageExplanations from "../common/PageExplanations";
import { useTemplate } from "../../templates/useTemplate";
import TemplateSlot from "../../templates/TemplateSlot";
import { buildStoreUrl } from "../../utils/storeUrl";
import { hasStoreApp } from "../../utils/storeShortcut";
import HeaderWalletShortcut from "../wallet/HeaderWalletShortcut";
import AppUpdateIndicator from "../common/AppUpdateIndicator";
import RouteErrorBoundary from "../common/RouteErrorBoundary";
import { envConfig } from "../../config/environment";

const SuperAdminLayout = React.lazy(() => import("./SuperAdminLayout"));
const AppDashboardPage = React.lazy(() => import("./app-dashboard/AppDashboardPage"));
const AppShell = React.lazy(() => import("./app-dashboard/AppShell"));

interface LayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

type SidebarIconComponent = React.ElementType<{ className?: string }>;
type ActiveUsersResponse = {
  data?: {
    count?: number;
  };
};

const ContentSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="space-y-2">
      <div className="h-7 w-48 bg-gray-200 rounded" />
      <div className="h-4 w-72 bg-gray-200 rounded" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="h-28 bg-gray-200 rounded-xl" />
      <div className="h-28 bg-gray-200 rounded-xl" />
      <div className="h-28 bg-gray-200 rounded-xl" />
    </div>
    <div className="h-60 bg-gray-200 rounded-xl" />
    <div className="space-y-3">
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
    </div>
  </div>
);

const ADMIN_ROUTE_TITLES: Array<{ prefix: string; title: string }> = [
  { prefix: "/dashboard", title: "لوحة التحكم" },
  { prefix: "/orders", title: "إدارة الطلبات والمبيعات" },
  { prefix: "/products", title: "إدارة المنتجات والمخزون" },
  { prefix: "/customers", title: "إدارة العملاء" },
  { prefix: "/leads", title: "العملاء المحتملين (Leads)" },
  { prefix: "/conversations", title: "صندوق الوارد والمحادثات" },
  { prefix: "/whatsapp-chat", title: "محادثات واتساب" },
  { prefix: "/whatsapp", title: "واتساب للأعمال" },
  { prefix: "/comments", title: "الردود التلقائية والتعليقات" },
  { prefix: "/posts", title: "إدارة المنشورات" },
  { prefix: "/marketing", title: "التسويق والحملات" },
  { prefix: "/inventory", title: "المخزون والمستودعات" },
  { prefix: "/cafe", title: "نظام الكافيهات والمطاعم" },
  { prefix: "/analytics", title: "التحليلات والتقارير" },
  { prefix: "/reports", title: "التقارير المالية والتشغيلية" },
  { prefix: "/treasury-expenses", title: "الخزينة والنفقات ورأس المال" },
  { prefix: "/finance", title: "الحسابات والمالية" },
  { prefix: "/accounting", title: "النظام المحاسبي" },
  { prefix: "/hr", title: "الموارد البشرية والموظفين" },
  { prefix: "/settings/storefront", title: "تصميم وتنسيق المتجر" },
  { prefix: "/settings/store", title: "إدارة المتجر" },
  { prefix: "/settings", title: "الإعدادات" },
  { prefix: "/profile", title: "الملف الشخصي" },
  { prefix: "/affiliates", title: "نظام التسويق بالعمولة" },
  { prefix: "/team", title: "فريق العمل والصلاحيات" },
  { prefix: "/integrations", title: "الربط والخدمات السحابية" },
  { prefix: "/landing-pages", title: "صفحات الهبوط" },
  { prefix: "/funnels", title: "مسارات البيع (Funnels)" },
  { prefix: "/shipping", title: "شركات الشحن والتوصيل" },
  { prefix: "/discounts", title: "كوبونات الخصم والعروض" },
  { prefix: "/categories", title: "أقسام وتصنيفات المتجر" },
  { prefix: "/reviews", title: "آراء وتقييمات العملاء" },
  { prefix: "/super-admin", title: "إدارة المنصة المتقدمة" },
  { prefix: "/app", title: "لوحة تحكم التطبيقات" },
];

const resolveDashboardTitle = (pathname: string): string => {
  for (const item of ADMIN_ROUTE_TITLES) {
    if (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)) {
      return item.title;
    }
  }
  return "لوحة التحكم";
};

const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const currentCompany = useMemo(
    () => (user?.companies ?? []).find((c) => c.isCurrent) || user?.company,
    [user],
  );

  const resolveLogoUrl = useCallback((src: string | null | undefined): string => {
    if (!src) return "/logo.png";
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
      return src;
    }
    const cleanPath = src.startsWith("/") ? src : `/${src}`;
    return `${envConfig.backendUrl}${cleanPath}`;
  }, []);

  const { currentTheme } = useVisualTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { templateId } = useTemplate();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isI18nReady, setIsI18nReady] = useState(i18n.isInitialized);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showActiveUsers, setShowActiveUsers] = useState(false);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >(() => {
    const saved = localStorage.getItem("sidebar-collapsed-sections");
    return saved ? JSON.parse(saved) : {};
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [isOrderSearchOpen, setIsOrderSearchOpen] = useState(false);

  const { settings: sidebarSettings, userSettings, userLayout } = useSidebarSettings();

  const getCompanySettings = () => {
    const settings = user?.company?.settings;
    if (!settings) return {};
    if (typeof settings === "string") {
      try {
        return JSON.parse(settings);
      } catch (e) {
        return {};
      }
    }
    return settings;
  };

  const companySettings = getCompanySettings();
  const hasEcommerce = user?.company?.activeApps?.includes('ecommerce-basic');
  const showSearchInHeader = companySettings.showOrderSearchInHeader !== false && !!hasEcommerce;
  const hasStore = hasStoreApp(user?.company?.activeApps as string[]);

  const storeUrl = useMemo(() => {
    const slug = user?.company?.slug || "";
    const customDomain = user?.company?.customDomain;
    const companyId = user?.companyId || user?.company?.id;
    return buildStoreUrl(slug, "/shop", customDomain || undefined, companyId || undefined);
  }, [user]);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const useSuperAdminShell = shouldUseSuperAdminShell(
    user?.role,
    location.pathname,
  );

  // Active Users Monitor Logic (shared with SuperAdminLayout)
  useEffect(() => {
    const fetchActiveUsersCount = async (): Promise<void> => {
      if (!isSuperAdmin) return;
      try {
        const requestConfig = {
          _skipErrorToast: true,
          _skipTransientRetry: true,
        } satisfies ApiRequestConfig;
        const response = await apiClient.get<ActiveUsersResponse>(
          "/system/active-users",
          requestConfig,
        );
        if (response.status === 200) {
          setActiveUsersCount(response.data?.data?.count ?? 0);
        }
      } catch (error) {
        // Silent fail for background polling
      }
    };

    if (user && isSuperAdmin && !useSuperAdminShell) {
      fetchActiveUsersCount();
      const interval = setInterval(fetchActiveUsersCount, 30000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [user, isSuperAdmin, useSuperAdminShell]);

  const shouldRemovePadding =
    fullWidth ||
    location.pathname === "/orders" ||
    location.pathname.startsWith("/orders/analytics") ||
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/whatsapp") ||
    location.pathname.startsWith("/whatsapp-chat") ||
    location.pathname.startsWith("/facebook-inbox") ||
    location.pathname.startsWith("/instagram-inbox") ||
    location.pathname.startsWith("/tiktok-inbox") ||
    location.pathname.startsWith("/unified-inbox") ||
    location.pathname.startsWith("/conversations") ||
    location.pathname.startsWith("/marketplace/agents") ||
    location.pathname.startsWith("/agents/market") ||
    location.pathname.startsWith("/advertising/marketing-studio") ||
    location.pathname.startsWith("/advertising/creative-studio") ||
    location.pathname.startsWith("/advertising/facebook-pixel") ||
    location.pathname.startsWith("/inventory/studio") ||
    location.pathname.startsWith("/products/studio") ||
    location.pathname.startsWith("/settings/turbo-tickets") ||
    location.pathname.startsWith("/admin/agent-chat") ||
    location.pathname.startsWith("/admin/agent-profiles") ||
    location.pathname.startsWith("/tickets");
  const resolvedUserLayout = userLayout || (user?.company?.sidebarLayout as SidebarLayoutType);
  const currentLayout = resolvedUserLayout || "three-tier";
  const companyScopeKey = user?.companyId || user?.company?.id || "no-company";
  const isHorizontalLayout = currentLayout === "horizontal";
  const isMerchantUser = user?.role === "MERCHANT";
  const isAffiliateUser = user?.role === "AFFILIATE";
  const isExternalPortalUser = isMerchantUser || isAffiliateUser;
  const sidebarCurrentPath = `${location.pathname}${location.search}`;
  const mobileMenuLabel = isMobileMenuOpen
    ? t("header.closeMenu")
    : t("header.openMenu");
  const shellThemeId = currentTheme?.id || BUSINESS_THEME_ID;
  const initials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.trim();

  useEffect(() => {
    if (i18n.isInitialized) {
      setIsI18nReady(true);
      return;
    }

    const checkI18n = setInterval(() => {
      if (i18n.isInitialized) {
        setIsI18nReady(true);
        clearInterval(checkI18n);
      }
    }, 200);
  }, []);

  // Presence heartbeat: connect socket globally so every authenticated user
  // who opens the site is tracked as online for the HR "Online Team" page.
  useEffect(() => {
    if (user && user.id && (user.companyId || user.company?.id)) {
      socketService.connect();
    }
    return () => {
      // Do not disconnect here - other components (inbox pages) share the socket.
    };
  }, [user?.id, user?.companyId, user?.company?.id]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Body scroll lock when mobile menu is open
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.classList.add("sidebar-mobile-open");
    } else {
      document.body.classList.remove("sidebar-mobile-open");
    }
    return () => {
      document.body.classList.remove("sidebar-mobile-open");
    };
  }, [isMobile, isMobileMenuOpen]);

  // Close mobile menu on Escape key
  useEffect(() => {
    if (!isMobile || !isMobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isMobileMenuOpen]);

  // Synchronize browser tab title and enforce noindex for dashboard routes
  useEffect(() => {
    const sectionTitle = resolveDashboardTitle(location.pathname);
    const companyName = user?.company?.name;
    const previousTitle = document.title;
    document.title = companyName
      ? `${sectionTitle} | ${companyName} | MaxP`
      : `${sectionTitle} | MaxP`;

    let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    let createdRobotsTag = false;
    if (!metaRobots) {
      metaRobots = document.createElement("meta");
      metaRobots.setAttribute("name", "robots");
      document.head.appendChild(metaRobots);
      createdRobotsTag = true;
    }
    const previousContent = metaRobots.getAttribute("content");
    metaRobots.setAttribute("content", "noindex, nofollow");

    return () => {
      document.title = previousTitle;
      if (createdRobotsTag && metaRobots?.parentNode) {
        metaRobots.parentNode.removeChild(metaRobots);
      } else if (metaRobots && previousContent !== null) {
        metaRobots.setAttribute("content", previousContent);
      }
    };
  }, [location.pathname, user?.company?.name]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const nextState = {
        ...prev,
        [sectionId]: prev[sectionId] === false ? true : false,
      };
      localStorage.setItem(
        "sidebar-collapsed-sections",
        JSON.stringify(nextState),
      );
      return nextState;
    });
  };

  const toggleSidebar = () => {
    const nextCollapsed = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextCollapsed);
    localStorage.setItem("sidebar-collapsed", nextCollapsed.toString());
  };

  const handleMobileToggle = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const renderSidebarIcon = useCallback((icon: unknown) => {
    if (React.isValidElement(icon)) {
      return icon;
    }

    if (!icon) {
      return null;
    }

    return React.createElement(icon as SidebarIconComponent, {
      className: "h-5 w-5",
    });
  }, []);

  const sidebarBadges = useSidebarBadges();

  const assignedApps = useMemo(() => {
    const settings = (user as { settings?: string | Record<string, unknown> | null } | null)?.settings;
    if (!settings) return undefined;
    try {
      const parsed = typeof settings === "string" ? JSON.parse(settings) : settings;
      const apps = parsed?.assignedApps;
      return Array.isArray(apps) ? (apps as string[]) : undefined;
    } catch {
      return undefined;
    }
  }, [user]);

  const menuSections = useMemo(() => {
    if (!isI18nReady || useSuperAdminShell) {
      return [];
    }

    const config = getSidebarConfig(t, user ?? {}, sidebarSettings ?? undefined, userSettings, assignedApps);

    return config.map((section) => ({
      ...section,
      icon: renderSidebarIcon(section.icon),
      items: section.items.map((item) => ({
        ...item,
        icon: renderSidebarIcon(item.icon),
        badge:
          item.to === "/orders"
            ? sidebarBadges.newOrders
            : item.to === "/tickets" || item.to === "/settings/turbo-tickets"
            ? sidebarBadges.unreadTickets
            : item.badge,
      })),
    }));
  }, [isI18nReady, renderSidebarIcon, t, useSuperAdminShell, user, sidebarSettings, userSettings, sidebarBadges, assignedApps]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return menuSections;

    const query = searchQuery.toLowerCase();
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.to.toLowerCase().includes(query) ||
            section.title.toLowerCase().includes(query) ||
            (item.children &&
              item.children.some(
                (child) =>
                  child.label.toLowerCase().includes(query) ||
                  child.to.toLowerCase().includes(query),
              )),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [menuSections, searchQuery]);



  if (useSuperAdminShell) {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
        <SuperAdminLayout fullWidth={fullWidth} activeUsersCount={activeUsersCount}>{children}</SuperAdminLayout>
      </React.Suspense>
    );
  }

  if (isSuperAdmin && (location.pathname === "/apps" || location.pathname.startsWith("/apps/"))) {
    return <Navigate to="/super-admin/dashboard" replace />;
  }

  const isValidSuperAdminSession = (): boolean => {
    const superAuth = localStorage.getItem("superAuth");
    const superUserStr = localStorage.getItem("superUser");
    if (!superAuth || !superUserStr) return false;
    try {
      const superUser = JSON.parse(superUserStr);
      if (superUser.role !== "SUPER_ADMIN") return false;
      const payload = JSON.parse(atob(superAuth.split(".")[1]));
      if (payload.exp * 1000 < Date.now()) return false;
      return true;
    } catch { return false; }
  };

  const handleBackToCompanies = () => {
    if (!isValidSuperAdminSession()) {
      localStorage.removeItem("superAuth");
      localStorage.removeItem("superUser");
      return;
    }
    const superAuth = localStorage.getItem("superAuth")!;
    const superUser = localStorage.getItem("superUser")!;

    tokenManager.setAccessToken(superAuth);
    localStorage.setItem("user", superUser);
    localStorage.removeItem("superAuth");
    localStorage.removeItem("superUser");
    window.location.href = "/super-admin/companies-v2";
  };

  const getSupportWhatsAppNumber = (): string => {
    try {
      if (typeof process !== "undefined" && process.env?.VITE_SUPPORT_WHATSAPP_NUMBER) {
        return process.env.VITE_SUPPORT_WHATSAPP_NUMBER;
      }
      const runtimeEnv = (typeof window !== "undefined" && (window as any)?.__ENV__) || {};
      return runtimeEnv.VITE_SUPPORT_WHATSAPP_NUMBER || "201123087745";
    } catch {
      return "201123087745";
    }
  };

  const profileMenu = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsProfileMenuOpen((prev) => !prev)}
        className={`business-shell-profile-button ${
          isMobile ? "business-shell-profile-button--compact" : ""
        }`.trim()}
        aria-label={
          initials
            ? `${t("sidebar.profile")} ${initials}`
            : t("sidebar.profile")
        }
      >
        <div className="business-shell-avatar">{initials || "MP"}</div>
        {!isMobile ? (
          <div className="business-shell-profile-text">
            <span>{user?.firstName || t("sidebar.profile")}</span>
            <small>{user?.role || "Operator"}</small>
          </div>
        ) : null}
        {!isMobile ? (
          <ChevronDownIcon className="h-4 w-4 business-shell-chevron" />
        ) : null}
      </button>

      {isProfileMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsProfileMenuOpen(false)}
          />
          <div
            className={`business-shell-menu absolute mt-2 w-64 max-w-[calc(100vw-1.5rem)] z-50 rounded-2xl shadow-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-gray-900 p-2 ${
              i18n.dir() === 'rtl' ? 'left-0' : 'right-0'
            }`}
            style={{
              maxHeight: 'calc(100vh - 4.5rem)',
              overflowY: 'auto'
            }}
          >
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {initials || "MP"}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {user?.firstName ? `${user.firstName} ${user?.lastName || ''}`.trim() : (user?.company?.name || "Max P User")}
                  </p>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || "operator@company.com"}
                  </span>
                  {user?.company?.name ? (
                    <span className="inline-block mt-0.5 text-[10px] text-primary-600 dark:text-primary-400 font-semibold truncate">
                      🏢 {user.company.name}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Link
                to="/profile"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors no-underline"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                <UserCircleIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                <span>{t("sidebar.profile")}</span>
              </Link>
              {!isExternalPortalUser ? (
                <Link
                  to="/settings"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors no-underline"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  <Cog6ToothIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                  <span>{t("sidebar.settings")}</span>
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors text-start"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 text-red-500 shrink-0" />
                <span>{t("sidebar.logout")}</span>
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  const headerBlock = (
    <>
      {isValidSuperAdminSession() ? (
        <div
          role="status"
          aria-live="polite"
          className="impersonation-top-banner w-full bg-amber-500/15 dark:bg-amber-950/80 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 px-3 py-1.5 sm:px-4 sm:py-2 z-30 transition-all duration-200"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-base select-none" role="img" aria-label="key">🔑</span>
              <span className="truncate font-semibold">
                {t("sidebar.superAdminLogin").replace(/🔑/g, "").trim()}
              </span>
            </div>
            <button
              type="button"
              onClick={handleBackToCompanies}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <span>{t("sidebar.backToCompanies")}</span>
              <span className="text-[10px] rtl:rotate-180">➜</span>
            </button>
          </div>
        </div>
      ) : null}
      <header
        className="app-header-theme business-shell-header"
        data-mobile={isMobile ? "true" : "false"}
      >
      <div className={`business-shell-header-main ${location.pathname === '/apps' ? 'px-3 py-1.5' : 'px-4 py-2'} md:py-2.5 lg:px-6`}>
        <div className="business-shell-header-primary">
          <div className="business-shell-heading-row flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleMobileToggle}
              aria-label={mobileMenuLabel}
              title={mobileMenuLabel}
              className="business-icon-button business-mobile-menu-toggle shrink-0"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            {(isMobile || location.pathname === '/apps') && (
              <Link to="/apps" className="flex items-center gap-2 select-none min-w-0" aria-label="Apps">
                <img
                  src={resolveLogoUrl(currentCompany?.logo)}
                  alt={currentCompany?.name || "MaxP"}
                  className="h-8 xs:h-9 sm:h-10 w-auto max-w-[110px] xs:max-w-[140px] sm:max-w-[160px] object-contain rounded-md shrink-0 drop-shadow-sm transition-transform active:scale-95"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith("/logo.png")) {
                      target.src = "/logo.png";
                    }
                  }}
                />
                <span className="font-extrabold text-xs xs:text-sm tracking-tight text-gray-900 dark:text-white truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px]">
                  {currentCompany?.name || "MaxP"}
                </span>
              </Link>
            )}
          </div>
        </div>

        <div className="business-shell-actions flex items-center gap-1.5 sm:gap-2">
          {user?.hasMultipleCompanies && !isExternalPortalUser ? (
            <div
              className={`business-shell-company-switcher ${isMobile ? "flex-shrink-0" : ""}`}
              style={isMobile ? { marginInline: "0.2rem" } : undefined}
            >
              <CompanySwitcher collapsed={isMobile} />
            </div>
          ) : null}

          <div className="business-shell-utility-row flex items-center gap-1.5">
            <div className="hidden sm:flex items-center gap-1.5">
              <HeaderWalletShortcut />
              {hasStore && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="business-icon-button"
                  title={t("header.visitStore", "المتجر")}
                  aria-label={t("header.visitStore", "المتجر")}
                >
                  <BuildingStorefrontIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                </a>
              )}
              {showSearchInHeader && (
                <div className="relative flex items-center">
                  {isOrderSearchOpen ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (orderSearchQuery.trim()) {
                          navigate(`/orders?search=${encodeURIComponent(orderSearchQuery.trim())}`);
                          setOrderSearchQuery("");
                          setIsOrderSearchOpen(false);
                        }
                      }}
                      className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2.5 py-1 shadow-sm transition-all duration-300 w-44 sm:w-60"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder={t("header.searchOrders", "بحث عن طلب...")}
                        className="w-full bg-transparent border-0 p-0 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsOrderSearchOpen(false);
                          setOrderSearchQuery("");
                        }}
                        className="p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsOrderSearchOpen(true)}
                      className="business-icon-button relative"
                      title={t("header.searchOrders", "بحث عن طلب...")}
                    >
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  )}
                </div>
              )}
              <ThemeToggle />
              <LanguageSwitcher
                className="business-shell-language-switcher"
              />
            </div>

            <AppUpdateIndicator />
            <button
              type="button"
              onClick={toggleMerchantCopilot}
              className="business-icon-button relative group flex items-center gap-1.5 px-2.5 py-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full border border-emerald-500/20 transition-all duration-200"
              title="مساعد المتجر التنفيذي (Ctrl + J)"
              aria-label="مساعد المتجر التنفيذي"
            >
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span className="hidden md:inline text-xs font-medium text-emerald-600 dark:text-emerald-400">
                المساعد الذكي
              </span>
              <span className="hidden lg:inline text-[10px] font-mono opacity-70 bg-emerald-500/20 px-1 py-0.5 rounded">
                Ctrl+J
              </span>
            </button>
            <NotificationDropdown className="business-shell-notification-slot shrink-0" />

            <a
              href={`https://wa.me/${getSupportWhatsAppNumber()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center justify-center w-9 h-9 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
              title={t("header.whatsapp") || "الدعم عبر واتساب"}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>

            <div className="hidden sm:inline-flex">
              <PageExplanations />
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowActiveUsers(true)}
                className="hidden sm:inline-flex business-icon-button relative group"
                title={t("sidebar.activeUsers") || "المستخدمين النشطين"}
              >
                <UsersIcon className="h-5 w-5" />
                {activeUsersCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 group-hover:scale-110 transition-transform">
                    {activeUsersCount}
                  </span>
                )}
              </button>
            )}

            {isMobile ? (
              <div className="business-shell-mobile-profile-slot shrink-0">
                {profileMenu}
              </div>
            ) : null}
          </div>

          {!isMobile ? (
            <div className="business-shell-profile-row">{profileMenu}</div>
          ) : null}
        </div>
      </div>
    </header>
    </>
  );

  // App Dashboard Layout
  if (currentLayout === 'app-dashboard') {
    const normalizedPathname = location.pathname.replace(/\/+$/, '') || '/';
    const isAppsDashboard = normalizedPathname === '/apps';
    return (
      <div
        className={isAppsDashboard ? 'app-dashboard-root' : 'app-dashboard-app-root'}
        data-theme={BUSINESS_THEME_ID}
        data-visual-theme={shellThemeId}
        data-template={templateId}
      >
        {isAppsDashboard && headerBlock}
        {isAppsDashboard && isMobile && (
          <div
            className="business-mobile-overlay"
            data-open={isMobileMenuOpen ? 'true' : 'false'}
            dir={i18n.dir()}
          >
            <div
              className="business-mobile-backdrop"
              data-open={isMobileMenuOpen ? 'true' : 'false'}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div
              className={`business-mobile-drawer ${
                i18n.dir() === 'rtl' ? 'right-0' : 'left-0'
              }`}
              data-open={isMobileMenuOpen ? 'true' : 'false'}
              dir={i18n.dir()}
              role="dialog"
              aria-modal="true"
              aria-label={t('sidebar.navigation') || 'Navigation'}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <TemplateSlot
                name="sidebar"
                props={{
                  layout: currentLayout,
                  isCollapsed: false,
                  mobileMode: true,
                  toggleSidebar: () => setIsMobileMenuOpen(false),
                  sections: filteredSections,
                  collapsedSections,
                  toggleSection,
                  currentPath: sidebarCurrentPath,
                  t,
                  searchQuery,
                  setSearchQuery,
                }}
              >
                <ThreeTierSidebar
                  isCollapsed={false}
                  mobileMode={true}
                  toggleSidebar={() => setIsMobileMenuOpen(false)}
                  sections={filteredSections}
                  collapsedSections={collapsedSections}
                  toggleSection={toggleSection}
                  currentPath={sidebarCurrentPath}
                  t={t}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </TemplateSlot>
            </div>
          </div>
        )}

        {isAppsDashboard ? (
          <React.Suspense fallback={headerBlock || <div className="min-h-screen" />}>
            <div key={normalizedPathname} className="motion-safe:animate-fade-in">
              <AppDashboardPage
                userId={user?.id}
                companyId={user?.companyId || user?.company?.id}
                allSections={menuSections}
              />
            </div>
          </React.Suspense>
        ) : (
          <React.Suspense fallback={<div className="min-h-screen" />}>
            <AppShell allSections={menuSections}>
              <div key={normalizedPathname} className="motion-safe:animate-fade-in">
                {children}
              </div>
            </AppShell>
          </React.Suspense>
        )}
      </div>
    );
  }

  // For non-app-dashboard layouts, still render AppShell for /apps/:appId routes
  const isAppSubRoute = location.pathname.startsWith('/apps/') && location.pathname !== '/apps';
  if (isAppSubRoute) {
    return (
      <div className="app-dashboard-app-root" data-theme={BUSINESS_THEME_ID} data-visual-theme={shellThemeId} data-template={templateId}>
        {headerBlock}
        <AppShell allSections={menuSections} showMobileHeader={false}>
          {children}
        </AppShell>
      </div>
    );
  }

  return (
    <div
      className="business-shell-root h-full h-[100dvh] w-full"
      style={{ height: '100dvh', minHeight: '100dvh' }}
      data-theme={BUSINESS_THEME_ID}
      data-visual-theme={shellThemeId}
      data-template={templateId}
    >
      {isHorizontalLayout ? (
        <div className="flex flex-col h-screen h-[100dvh] w-full overflow-hidden">
          <div className="hidden lg:block">
            <TemplateSlot
              name="sidebar"
              props={{
                layout: currentLayout,
                isCollapsed: isSidebarCollapsed,
                mobileMode: false,
                toggleSidebar,
                sections: filteredSections,
                collapsedSections,
                toggleSection,
                currentPath: sidebarCurrentPath,
                t,
                searchQuery,
                setSearchQuery,
              }}
            >
              <SidebarLayoutFactory
                layout={currentLayout}
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={toggleSidebar}
                sections={filteredSections}
                collapsedSections={collapsedSections}
                toggleSection={toggleSection}
                currentPath={sidebarCurrentPath}
                t={t}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </TemplateSlot>
          </div>

          {/* Mobile drawer for horizontal layout */}
          {isMobile ? (
            <div
              className="business-mobile-overlay"
              data-open={isMobileMenuOpen ? "true" : "false"}
              dir={i18n.dir()}
            >
              <div
                className="business-mobile-backdrop"
                data-open={isMobileMenuOpen ? "true" : "false"}
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div
                className={`business-mobile-drawer ${
                  i18n.dir() === "rtl" ? "right-0" : "left-0"
                }`}
                data-open={isMobileMenuOpen ? "true" : "false"}
                dir={i18n.dir()}
                role="dialog"
                aria-modal="true"
                aria-label={t("sidebar.navigation") || "Navigation"}
                style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
              >
                <TemplateSlot
                  name="sidebar"
                  props={{
                    isCollapsed: false,
                    mobileMode: true,
                    toggleSidebar: () => setIsMobileMenuOpen(false),
                    sections: filteredSections,
                    collapsedSections,
                    toggleSection,
                    currentPath: sidebarCurrentPath,
                    t,
                    searchQuery,
                    setSearchQuery,
                  }}
                >
                  <ThreeTierSidebar
                    isCollapsed={false}
                    mobileMode={true}
                    toggleSidebar={() => setIsMobileMenuOpen(false)}
                    sections={filteredSections}
                    collapsedSections={collapsedSections}
                    toggleSection={toggleSection}
                    currentPath={sidebarCurrentPath}
                    t={t}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                </TemplateSlot>
              </div>
            </div>
          ) : null}

          <div className="flex-1 w-full flex flex-col overflow-hidden h-full min-h-0">
            <TemplateSlot name="header">{headerBlock}</TemplateSlot>

             <main
                  className={`business-shell-main flex-1 flex flex-col ${
                    shouldRemovePadding ? "p-0 overflow-hidden min-h-0 h-full max-h-full" : "p-4 md:p-6 overflow-y-auto min-h-0"
                  } hr-theme`}
                  style={shouldRemovePadding ? { height: '100%', minHeight: 0, flex: '1 1 0%' } : undefined}
                >

                 {location.pathname === '/apps' ? (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <AppDashboardPage
                       userId={user?.id}
                       companyId={user?.companyId || user?.company?.id}
                       allSections={menuSections}
                       isLoading={!isI18nReady}
                     />
                   </React.Suspense>
                 ) : (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <RouteErrorBoundary routeKey={location.pathname}>
                       <React.Fragment key={companyScopeKey}>{children}</React.Fragment>
                     </RouteErrorBoundary>
                   </React.Suspense>
                 )}
               </main>
            </div>
         </div>
       ) : (
         <div className="flex w-full h-screen h-[100dvh] overflow-hidden">
          <div className="hidden lg:block h-full">
              <TemplateSlot
                name="sidebar"
                props={{
                  layout: currentLayout,
                  isCollapsed: isSidebarCollapsed,
                  mobileMode: false,
                  toggleSidebar,
                  sections: filteredSections,
                  collapsedSections,
                  toggleSection,
                  currentPath: sidebarCurrentPath,
                  t,
                  searchQuery,
                  setSearchQuery,
                }}
              >
                <SidebarLayoutFactory
                  layout={currentLayout}
                  isCollapsed={isSidebarCollapsed}
                  mobileMode={false}
                  toggleSidebar={toggleSidebar}
                  sections={filteredSections}
                  collapsedSections={collapsedSections}
                  toggleSection={toggleSection}
                  currentPath={sidebarCurrentPath}
                  t={t}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </TemplateSlot>
            </div>

            {/* Mobile drawer: always rendered when mobile, controlled via CSS transitions */}
            {isMobile ? (
              <div
                className="business-mobile-overlay"
                data-open={isMobileMenuOpen ? "true" : "false"}
                dir={i18n.dir()}
              >
                <div
                  className="business-mobile-backdrop"
                  data-open={isMobileMenuOpen ? "true" : "false"}
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div
                  className={`business-mobile-drawer ${
                    i18n.dir() === "rtl" ? "right-0" : "left-0"
                  }`}
                  data-open={isMobileMenuOpen ? "true" : "false"}
                  dir={i18n.dir()}
                  role="dialog"
                  aria-modal="true"
                  aria-label={t("sidebar.navigation") || "Navigation"}
                  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                  <TemplateSlot
                    name="sidebar"
                    props={{
                      layout: currentLayout,
                      isCollapsed: false,
                      mobileMode: true,
                      toggleSidebar: () => setIsMobileMenuOpen(false),
                      sections: filteredSections,
                      collapsedSections,
                      toggleSection,
                      currentPath: sidebarCurrentPath,
                      t,
                      searchQuery,
                      setSearchQuery,
                    }}
                  >
                    <SidebarLayoutFactory
                      layout={currentLayout}
                      isCollapsed={false}
                      mobileMode={true}
                      toggleSidebar={() => setIsMobileMenuOpen(false)}
                      sections={filteredSections}
                      collapsedSections={collapsedSections}
                      toggleSection={toggleSection}
                      currentPath={sidebarCurrentPath}
                      t={t}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                    />
                  </TemplateSlot>
                </div>
              </div>
            ) : null}

            <div className="flex-1 w-full flex flex-col overflow-hidden h-full min-h-0">
              <TemplateSlot name="header">{headerBlock}</TemplateSlot>

               <main
                  className={`business-shell-main flex-1 flex flex-col ${
                    shouldRemovePadding ? "p-0 overflow-hidden min-h-0 h-full max-h-full" : "p-4 md:p-6 overflow-y-auto min-h-0"
                  } hr-theme`}
                  style={shouldRemovePadding ? { height: '100%', minHeight: 0, flex: '1 1 0%' } : undefined}
              >
                 {location.pathname === '/apps' ? (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <AppDashboardPage
                       userId={user?.id}
                       companyId={user?.companyId || user?.company?.id}
                       allSections={menuSections}
                       isLoading={!isI18nReady}
                     />
                   </React.Suspense>
                 ) : (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <RouteErrorBoundary routeKey={location.pathname}>
                       <React.Fragment key={companyScopeKey}>{children}</React.Fragment>
                     </RouteErrorBoundary>
                   </React.Suspense>
                 )}
               </main>
           </div>
         </div>
       )}

        {isSuperAdmin && showActiveUsers && (
         <ActiveUsersMonitor
           isOpen={showActiveUsers}
           onClose={() => setShowActiveUsers(false)}
         />
       )}
     </div>
   );
 };

const LayoutWithSidebarSettings: React.FC<LayoutProps> = (props) => {
  return (
    <SidebarSettingsProvider>
      <Layout {...props} />
      <MerchantCopilotHost />
    </SidebarSettingsProvider>
  );
};

const MemoizedLayout = React.memo(LayoutWithSidebarSettings);

export default MemoizedLayout;
