import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
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
import { shouldUseSuperAdminShell } from "./layoutMode";
import CompanySwitcher from "../common/CompanySwitcher";
import LanguageSwitcher from "../common/LanguageSwitcher";
import NotificationDropdown from "../notifications/NotificationDropdown";
import ThemeToggle from "../ui/theme-toggle";
import { apiClient } from "../../services/apiClient";
import type { ApiRequestConfig } from "../../services/apiClient";
import ActiveUsersMonitor from "../ActiveUsersMonitor";
import { SidebarSettingsProvider, useSidebarSettings } from "../../contexts/SidebarSettingsContext";
import PageExplanations from "../common/PageExplanations";

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

const Layout: React.FC<LayoutProps> = ({ children, fullWidth = false }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { currentTheme } = useVisualTheme();
  const navigate = useNavigate();
  const location = useLocation();

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
    location.pathname.startsWith("/profile") ||
    location.pathname.startsWith("/whatsapp") ||
    location.pathname.startsWith("/whatsapp-chat");
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
    }, 50);

    return () => clearInterval(checkI18n);
  }, []);

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

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const nextState = { ...prev, [sectionId]: !prev[sectionId] };
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

  const menuSections = useMemo(() => {
    if (!isI18nReady || useSuperAdminShell) {
      return [];
    }

    const config = getSidebarConfig(t, user ?? {}, sidebarSettings ?? undefined, userSettings);

    return config.map((section) => ({
      ...section,
      icon: renderSidebarIcon(section.icon),
      items: section.items.map((item) => ({
        ...item,
        icon: renderSidebarIcon(item.icon),
      })),
    }));
  }, [isI18nReady, renderSidebarIcon, t, useSuperAdminShell, user, sidebarSettings, userSettings]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return menuSections;

    const query = searchQuery.toLowerCase();
    return menuSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            section.title.toLowerCase().includes(query),
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
          <div className="business-shell-menu absolute ltr:right-0 rtl:left-0 mt-3 w-56 z-50">
            <div className="business-shell-menu-header">
              <p>{user?.company?.name || "Max P Business OS"}</p>
              <span>{user?.email || "operator@company.com"}</span>
            </div>
            <div className="business-shell-menu-links">
              <Link
                to="/profile"
                className="business-shell-menu-link"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                {t("sidebar.profile")}
              </Link>
              {!isExternalPortalUser ? (
                <Link
                  to="/settings"
                  className="business-shell-menu-link"
                  onClick={() => setIsProfileMenuOpen(false)}
                >
                  {t("sidebar.settings")}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={handleLogout}
                className="business-shell-menu-link"
                data-variant="danger"
              >
                {t("sidebar.logout")}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  const headerBlock = (
    <header
      className="app-header-theme business-shell-header"
      data-mobile={isMobile ? "true" : "false"}
    >
      <div className="business-shell-header-main px-4 py-2 md:py-2.5 lg:px-6">
        <div className="business-shell-header-primary">
          <div className="business-shell-heading-row">
            <button
              type="button"
              onClick={handleMobileToggle}
              aria-label={mobileMenuLabel}
              title={mobileMenuLabel}
              className="business-icon-button business-mobile-menu-toggle"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            {isMobile ? (
              <div className="business-shell-mobile-profile-slot">
                {profileMenu}
              </div>
            ) : null}
          </div>

          {isValidSuperAdminSession() ? (
            <div className="business-shell-chip" data-variant="warning">
              <span>{t("sidebar.superAdminLogin")}</span>
              <button
                type="button"
                onClick={handleBackToCompanies}
                className="business-shell-chip-action"
              >
                {t("sidebar.backToCompanies")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="business-shell-actions">
          {user?.hasMultipleCompanies && !isExternalPortalUser ? (
            <div
              className={`business-shell-company-switcher ${isMobile ? "flex-shrink-0" : ""}`}
              style={isMobile ? { marginInline: "0.25rem 0.8rem" } : undefined}
            >
              <CompanySwitcher collapsed={isMobile} />
            </div>
          ) : null}

          <div className="business-shell-utility-row">
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
            <NotificationDropdown className="business-shell-notification-slot" />
            <a
              href={`https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || "201123087745"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-9 h-9 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200"
              title={t("header.whatsapp") || "الدعم عبر واتساب"}
            >
<<<<<<< Updated upstream
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
=======
              <svg viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor" aria-hidden="true">
                <path d="M16 0C7.164 0 0 7.164 0 16c0 3.098.88 5.992 2.398 8.44L.812 31.188l7.027-1.844A15.926 15.926 0 0016 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm8.496 22.684c-.578 1.633-2.879 3.02-4.715 3.422-1.258.277-2.844.5-8.285-1.781-6.977-2.926-8.539-7.352-8.797-7.688-.258-.34-2.098-2.801-2.098-5.344 0-2.543 1.332-3.793 1.805-4.309s.996-.414 1.328-.414c.332 0 .664.004.957.018.308.015.719-.117 1.125.86.422 1.02 1.434 3.535 1.563 3.789.129.254.215.55.043.887-.172.34-.258.55-.516.848-.258.3-.543.668-.777.895-.258.258-.528.539-.227 1.059.301.52 1.332 2.199 2.863 3.562 1.965 1.746 3.621 2.29 4.137 2.543.516.254.82.211 1.125-.129.301-.34 1.289-1.508 1.632-2.027.344-.516.687-.43 1.16-.258.472.172 2.996 1.414 3.512 1.672.52.258.86.387.992.601.129.215.129 1.227-.449 2.86z" />
>>>>>>> Stashed changes
              </svg>
            </a>
            <PageExplanations />
            
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowActiveUsers(true)}
                className="business-icon-button relative group"
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
          </div>

          {!isMobile ? (
            <div className="business-shell-profile-row">{profileMenu}</div>
          ) : null}
        </div>
      </div>
    </header>
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
      >
        {isAppsDashboard && headerBlock}
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

  return (
    <div
      className="business-shell-root"
      data-theme={BUSINESS_THEME_ID}
      data-visual-theme={shellThemeId}
    >
      {isHorizontalLayout ? (
        <div className="flex flex-col h-screen w-full overflow-hidden">
          <div className="hidden lg:block">
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
                role="dialog"
                aria-modal="true"
                aria-label={t("sidebar.navigation") || "Navigation"}
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
              </div>
            </div>
          ) : null}

          <div className="flex-1 w-full flex flex-col overflow-hidden">
            {headerBlock}

             <main
                 className={`business-shell-main flex-1 flex flex-col ${
                   shouldRemovePadding ? "p-0 overflow-hidden min-h-0" : "p-4 md:p-6 overflow-y-auto"
                 } hr-theme`}
               >
                 {location.pathname === '/apps' ? (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <AppDashboardPage
                       userId={user?.id}
                       companyId={user?.companyId || user?.company?.id}
                       allSections={menuSections}
                     />
                   </React.Suspense>
                 ) : (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <React.Fragment key={companyScopeKey}>{children}</React.Fragment>
                   </React.Suspense>
                 )}
               </main>
            </div>
         </div>
       ) : (
         <div className="flex w-full h-screen overflow-hidden">
           <div className="hidden lg:block h-full">
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
                 role="dialog"
                 aria-modal="true"
                 aria-label={t("sidebar.navigation") || "Navigation"}
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
                </div>
              </div>
            ) : null}

            <div className="flex-1 w-full flex flex-col overflow-hidden">
               {headerBlock}

               <main
                  className={`business-shell-main flex-1 flex flex-col ${
                    shouldRemovePadding ? "p-0 overflow-hidden min-h-0" : "p-4 md:p-6 overflow-y-auto"
                  } hr-theme`}
               >
                 {location.pathname === '/apps' ? (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <AppDashboardPage
                       userId={user?.id}
                       companyId={user?.companyId || user?.company?.id}
                       allSections={menuSections}
                     />
                   </React.Suspense>
                 ) : (
                   <React.Suspense fallback={<ContentSkeleton />}>
                     <React.Fragment key={companyScopeKey}>{children}</React.Fragment>
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
    </SidebarSettingsProvider>
  );
};

const MemoizedLayout = React.memo(LayoutWithSidebarSettings);

export default MemoizedLayout;
