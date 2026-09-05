import React, { useEffect, useId, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { SidebarSection } from "../../../types/layout";
import { useAuth } from "../../../hooks/useAuthSimple";
import { isSidebarPathActive } from "./matchSidebarPath";
import { CompanyLogo } from "../../ui/CompanyLogo";
import { useRoutePrefetch } from "../../../hooks/useRoutePrefetch";
import { useSidebarNavLink } from "./useSidebarNavLink";


interface ClassicSidebarProps {
  isCollapsed: boolean;
  mobileMode?: boolean;
  toggleSidebar: () => void;
  sections: SidebarSection[];
  collapsedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  currentPath: string;
  t: (key: string) => string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  external?: boolean;
  badge?: string;
  isCollapsed: boolean;
  currentPath: string;
  user: any;
  onClick?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({
  to,
  icon,
  children,
  external,
  badge,
  isCollapsed,
  currentPath,
  user,
  onClick,
}) => {
  const { isActive, href, prefetch } = useSidebarNavLink({
    to,
    external,
    currentPath,
    user,
  });

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
        title={isCollapsed ? (children as string) : undefined}
        onClick={onClick}
      >
        <span className="text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors me-3">
          {React.isValidElement(icon) &&
            React.cloneElement(icon as React.ReactElement, {
              className: "h-5 w-5",
            })}
        </span>
        {!isCollapsed && (
          <span className="text-sm font-medium truncate flex items-center gap-2">
            {children}
            {badge && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                {badge}
              </span>
            )}
          </span>
        )}
      </a>
    );
  }

  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
        isActive
          ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
      } `}
      title={isCollapsed ? (children as string) : undefined}
      onMouseEnter={() => prefetch(to)}
      onClick={onClick}
    >
      <span
        className={`${
          isActive
            ? "text-white"
            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        } transition-colors ${isCollapsed ? "me-0" : "me-3"} `}
      >
        {React.isValidElement(icon) &&
          React.cloneElement(icon as React.ReactElement, {
            className: "h-5 w-5",
          })}
      </span>
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{children}</span>
      )}
    </Link>
  );
};

const ClassicSidebar: React.FC<ClassicSidebarProps> = ({
  isCollapsed,
  mobileMode = false,
  toggleSidebar,
  sections,
  collapsedSections,
  toggleSection,
  currentPath,
  t,
  searchQuery,
  setSearchQuery,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const searchInputId = useId();
  const prefetch = useRoutePrefetch();

  const activeSectionIds = useMemo(() => {
    const set = new Set<string>();
    for (const section of sections) {
      if (
        section.items.some(
          (item) =>
            isSidebarPathActive(currentPath, item.to) ||
            item.children?.some((child) =>
              isSidebarPathActive(currentPath, child.to),
            ),
        )
      ) {
        set.add(section.id);
      }
    }
    return set;
  }, [sections, currentPath]);



  // Close mobile on Escape
  useEffect(() => {
    if (!mobileMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleSidebar();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMode, toggleSidebar]);

  // Mobile accordion rendering
  if (mobileMode) {
    return (
      <div className="business-sidebar-shell" data-mobile="true">
        <div className="business-sidebar-panel" style={{ width: '100%', border: 'none', background: 'transparent', backdropFilter: 'none' }}>
          <div className="business-sidebar-panel-header">
            <div className="business-sidebar-company">
              <div className="business-brand-glyph business-brand-glyph--small">
                {user?.company?.name?.charAt(0) || "M"}
              </div>
              <div className="business-sidebar-company-copy">
                <h2>{t("sidebar.navigation") || "Navigation"}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="business-sidebar-mobile-close"
              aria-label={t("sidebar.close") || "Close"}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="business-sidebar-mobile-groups">
            {sections
              .filter((s) => !s.hidden)
              .map((section) => {
                const hasActiveItem = activeSectionIds.has(section.id);
                const isExpanded = searchQuery.trim().length > 0
                  ? true
                  : collapsedSections[section.id] !== undefined
                    ? !collapsedSections[section.id]
                    : false;

                return (
                  <section
                    key={section.id}
                    className="business-sidebar-mobile-group"
                    data-active={hasActiveItem}
                    data-expanded={isExpanded}
                  >
                    <button
                      type="button"
                      className={`business-sidebar-mobile-group-trigger ${hasActiveItem ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30" : "bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50"} `}
                      aria-expanded={isExpanded}
                      onClick={() => toggleSection(section.id)}
                    >
                      <span className="business-sidebar-mobile-group-copy">
                        <span className="business-sidebar-mobile-group-icon">
                          {React.isValidElement(section.icon) &&
                            React.cloneElement(section.icon as React.ReactElement, {
                              className: "h-5 w-5",
                            })}
                        </span>
                        <span className="business-sidebar-mobile-group-text">
                          <strong className="text-sm font-semibold text-gray-900 dark:text-white">{section.title}</strong>
                          <small className="text-xs text-gray-500 dark:text-gray-400 ml-2">{section.items.filter((i) => !i.hidden).length}</small>
                        </span>
                      </span>
                      <ChevronRightIcon className="business-sidebar-mobile-group-chevron h-5 w-5 text-gray-400" />
                    </button>
                    {isExpanded ? (
                      <div className="business-sidebar-mobile-group-items mt-2 space-y-1">
                          {section.items
                          .filter((i) => !i.hidden)
                          .map((item) => (
                            <div key={item.to} className="space-y-1">
                              <NavLink
                                to={item.to}
                                icon={item.icon}
                                external={!!item.external}
                                isCollapsed={isCollapsed}
                                currentPath={currentPath}
                                user={user}
                                onClick={mobileMode ? toggleSidebar : undefined}
                                {...(item.badge ? { badge: item.badge } : {})}
                              >
                                {item.label}
                              </NavLink>
                              {item.children ? (
                                <div className="ms-8 mt-1.5 space-y-0.5 pl-3 border-s border-gray-200/60 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/30 rounded-r-lg">
                                  {item.children
                                    .filter((c) => !c.hidden)
                                    .map((child) => (
                                      <Link
                                        key={child.to}
                                        to={child.to}
                                        onMouseEnter={() => prefetch(child.to)}
                                        className={`block px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${isSidebarPathActive(currentPath, child.to)
                                          ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                        } `}
                                      >
                                        {child.label}
                                      </Link>
                                    ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}

            {/* Mobile Profile */}
            <div className="business-sidebar-mobile-profile">
              <div className="business-sidebar-mobile-profile-info">
                <div className="business-sidebar-mobile-avatar">
                  {`${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.trim() || "MP"}
                </div>
                <div className="business-sidebar-mobile-profile-text">
                  <span className="business-sidebar-mobile-profile-name">
                    {user?.firstName || t("sidebar.profile")}
                  </span>
                  <small className="business-sidebar-mobile-profile-role">
                    {user?.role || "Operator"}
                  </small>
                </div>
              </div>
              <div className="business-sidebar-mobile-profile-actions">
                <Link
                  to="/profile"
                  className="business-sidebar-mobile-profile-link"
                  onMouseEnter={() => prefetch("/profile")}
                  onClick={() => toggleSidebar()}
                >
                  {t("sidebar.profile")}
                </Link>
                <Link
                  to="/settings"
                  className="business-sidebar-mobile-profile-link"
                  onMouseEnter={() => prefetch("/settings")}
                  onClick={() => toggleSidebar()}
                >
                  {t("sidebar.settings")}
                </Link>
                <button
                  type="button"
                  onClick={() => { logout(); navigate("/auth/login"); }}
                  className="business-sidebar-mobile-profile-link"
                  data-variant="danger"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  {t("sidebar.logout")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop rendering
  return (
    <div
      className={`${isCollapsed ? "w-20" : "w-72"
        } h-full bg-white dark:bg-gray-800 shadow-xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out border-s border-gray-200 dark:border-gray-700`}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <Link to="/company-dashboard" className="flex items-center flex-1 no-underline" onMouseEnter={() => prefetch("/company-dashboard")}>
              <CompanyLogo
                src={user?.company?.logo}
                alt={user?.company?.name}
                className="h-12 w-12 rounded-xl object-cover me-3 shadow-lg border-2 border-gray-200 dark:border-gray-600"
                companyName={user?.company?.name}
              >
                <div className="h-12 w-12 bg-gradient-to-r from-primary-500 to-violet-600 rounded-xl me-3 shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {user?.company?.name?.charAt(0) || "M"}
                  </span>
                </div>
              </CompanyLogo>
              <div>
                <h1 className="text-lg font-extrabold text-gray-900 dark:text-white leading-tight">
                  {user?.company?.name || t("sidebar.platformName")}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("sidebar.platformName")}
                </p>
              </div>
            </Link>
          )}
          <button
            onClick={toggleSidebar}
            aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          >
            {isCollapsed ? (
              <Bars3Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
        {isCollapsed && (
          <Link to="/company-dashboard" className="mt-4 flex justify-center" onMouseEnter={() => prefetch("/company-dashboard")}>
            <CompanyLogo
              src={user?.company?.logo}
              alt={user?.company?.name}
              className="h-10 w-10 rounded-xl object-cover shadow-lg border-2 border-gray-200 dark:border-gray-600"
              companyName={user?.company?.name}
            >
              <div
                className="h-10 w-10 bg-gradient-to-r from-primary-500 to-violet-600 rounded-xl shadow-lg flex items-center justify-center"
                title={user?.company?.name}
              >
                <span className="text-white font-bold text-lg">
                  {user?.company?.name?.charAt(0) || "M"}
                </span>
              </div>
            </CompanyLogo>
          </Link>
        )}
      </div>
      {!isCollapsed && (
        <div className="px-4 mt-2 relative">
          <MagnifyingGlassIcon className="absolute end-7 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id={searchInputId}
            name="sidebarSearch"
            type="text"
            aria-label={t("sidebar.search")}
            placeholder={t("sidebar.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pe-10 ps-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label={t("sidebar.clearSearch")}
              className="absolute start-6 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <XMarkIcon className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>
      )}
      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {sections
          .filter((s) => !s.hidden)
          .map((section) => {
            const isSearching = searchQuery.trim().length > 0;
            const isSectionCollapsed = collapsedSections[section.id] !== false;
            const hasActiveItem = activeSectionIds.has(section.id);
            return (
              <div key={section.id} className="mb-4">
                <button
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={isCollapsed ? true : isSearching ? true : !isSectionCollapsed}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${hasActiveItem && !isCollapsed
                      ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30"
                      : "bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50"
                    } `}
                  title={isCollapsed ? section.title : undefined}
                >
                  <div className="flex items-center">
                    <span className="text-lg me-3 flex-shrink-0">
                      {React.isValidElement(section.icon) &&
                        React.cloneElement(section.icon as React.ReactElement, {
                          className: "h-6 w-6",
                        })}
                    </span>
                    {!isCollapsed && (
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {section.title}
                      </h3>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronRightIcon
                      className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isSectionCollapsed ? "" : "rotate-90"
                        } `}
                    />
                  )}
                </button>
                {(!isSectionCollapsed || isCollapsed || isSearching) && (
                  <div className="mt-2 space-y-1">
                    {section.items
                      .filter((i) => !i.hidden)
                      .map((item) => (
                        <div key={item.to} className="space-y-1">
                          <NavLink
                            to={item.to}
                            icon={item.icon}
                            external={!!item.external}
                            isCollapsed={isCollapsed}
                            currentPath={currentPath}
                            user={user}
                            {...(item.badge ? { badge: item.badge } : {})}
                          >
                            {item.label}
                          </NavLink>
                          {!isCollapsed && item.children ? (
                            <div className="ms-10 mt-1.5 space-y-0.5 pl-3 border-s border-gray-200/60 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-800/30 rounded-r-lg">
                              {item.children
                                .filter((c) => !c.hidden)
                                .map((child) => {
                                  const isChildActive = isSidebarPathActive(currentPath, child.to);
                                  return (
                                    <Link
                                      key={child.to}
                                      to={child.to}
                                      onMouseEnter={() => prefetch(child.to)}
                                      className={`block px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${isChildActive
                                          ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20"
                                          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                                        } `}
                                    >
                                      {child.label}
                                    </Link>
                                  );
                                })}
                            </div>
                          ) : null}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default ClassicSidebar;
