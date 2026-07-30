import { ChevronRight as ChevronRightIcon, Circle as ArrowRightOnRectangleIcon, Search as MagnifyingGlassIcon, X as XMarkIcon } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
;

import { SidebarSection } from "../../../types/layout";
import { buildStoreUrl } from "../../../utils/storeUrl";
import { useAuth } from "../../../hooks/useAuthSimple";
import { envConfig } from "../../../config/environment";
import { isSidebarPathActive } from "./matchSidebarPath";
import { CompanyLogo } from "../../ui/CompanyLogo";
import { useRoutePrefetch } from "../../../hooks/useRoutePrefetch";

interface MinimalSidebarProps {
  isCollapsed: boolean;
  mobileMode?: boolean;
  toggleSidebar: () => void;
  sections: SidebarSection[];
  collapsedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  currentPath: string;
  t: (key: string) => string;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
}

const MinimalSidebar: React.FC<MinimalSidebarProps> = ({
  sections,
  currentPath,
  t,
  mobileMode = false,
  toggleSidebar,
  collapsedSections = {},
  toggleSection,
  searchQuery,
  setSearchQuery,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const prefetch = useRoutePrefetch();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const [dir, setDir] = useState('rtl');

  // Separate position states for section popup vs search popup
  const [sectionPopupPos, setSectionPopupPos] = useState<{ top: number; left: number } | null>(null);
  const [searchPopupPos, setSearchPopupPos] = useState<{ top: number; left: number } | null>(null);

  // Helper for navigation links
  const NavLink: React.FC<{
    to: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    external?: boolean;
    badge?: string;
  }> = ({ to, icon, children, external, badge }) => {
    const isActive = !external && isSidebarPathActive(currentPath, to);

    if (external) {
      const slug = user?.company?.slug;
      const companyId = user?.companyId || user?.company?.id;
      const customDomain = user?.company?.customDomain;
      let shopUrl = to;

      if (slug && slug.trim().length > 0) {
        shopUrl = buildStoreUrl(
          slug,
          to,
          customDomain || undefined,
          companyId || undefined,
        );
      }

      return (
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-3 py-2 rounded-md transition-all duration-200 group text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => { if (mobileMode) toggleSidebar(); }}
        >
          <span className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3">
            {React.isValidElement(icon) &&
              React.cloneElement(icon as React.ReactElement, {
                className: "h-4 w-4",
              })}
          </span>
          <span className="text-sm font-medium truncate flex-1">
            {children}
          </span>
        </a>
      );
    }

    return (
      <Link
        to={to}
        className={`flex items-center px-3 py-2 rounded-md transition-all duration-200 group ${isActive
            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          } `}
        onMouseEnter={() => prefetch(to)}
        onClick={() => { if (mobileMode) toggleSidebar(); }}
      >
        <span
          className={`${isActive ? "text-blue-500 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"} mr-3`}
        >
          {React.isValidElement(icon) &&
            React.cloneElement(icon as React.ReactElement, {
              className: "h-4 w-4",
            })}
        </span>
        <span className="text-sm font-medium truncate flex-1">{children}</span>
        {badge && (
          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
            {badge}
          </span>
        )}
      </Link>
    );
  };

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
                const hasActiveItem = section.items.some(
                  (item) => isSidebarPathActive(currentPath, item.to),
                );
                const isExpanded = collapsedSections[section.id] !== undefined
                  ? !collapsedSections[section.id]
                  : hasActiveItem;

                return (
                  <section
                    key={section.id}
                    className="business-sidebar-mobile-group"
                    data-active={hasActiveItem}
                    data-expanded={isExpanded}
                  >
                    <button
                      type="button"
                      className="business-sidebar-mobile-group-trigger"
                      aria-expanded={isExpanded}
                      onClick={() => toggleSection(section.id)}
                    >
                      <span className="business-sidebar-mobile-group-copy">
                        <span className="business-sidebar-mobile-group-icon">
                          {React.isValidElement(section.icon) &&
                            React.cloneElement(section.icon as React.ReactElement, {
                              className: "h-4 w-4",
                            })}
                        </span>
                        <span className="business-sidebar-mobile-group-text">
                          <strong>{section.title}</strong>
                          <small>{section.items.filter((i) => !i.hidden).length}</small>
                        </span>
                      </span>
                      <ChevronRightIcon className="business-sidebar-mobile-group-chevron h-4 w-4" />
                    </button>
                    {isExpanded ? (
                      <div className="business-sidebar-mobile-group-items">
                        {section.items
                          .filter((i) => !i.hidden)
                          .map((item) => (
                            <div key={item.to}>
                              <NavLink
                                to={item.to}
                                icon={item.icon}
                                external={!!item.external}
                                {...(item.badge ? { badge: item.badge } : {})}
                              >
                                {item.label}
                              </NavLink>
                              {item.children ? (
                                <div className="business-sidebar-children">
                                  {item.children
                                    .filter((c) => !c.hidden)
                                    .map((child) => (
                                      <Link
                                        key={child.to}
                                        to={child.to}
                                        className="business-sidebar-child-link"
                                        data-active={isSidebarPathActive(currentPath, child.to)}
                                        onMouseEnter={() => prefetch(child.to)}
                                        onClick={() => toggleSidebar()}
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

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery?.(e.target.value);
  }, [setSearchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery?.("");
  }, [setSearchQuery]);

  // Close search popup on Escape
  useEffect(() => {
    if (!searchOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchPopupPos(null);
        clearSearch();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, clearSearch]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const openPopup = (sectionId: string) => {
    setHoveredSection(sectionId);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = undefined;
    }
    const btn = sectionRefs.current[sectionId];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const isRtl = document.documentElement.dir === 'rtl';
      setDir(isRtl ? 'rtl' : 'ltr');
      const popupHeight = 320;
      const top = Math.min(rect.top, window.innerHeight - popupHeight - 8);
      setSectionPopupPos({
        top: Math.max(8, top),
        left: isRtl ? window.innerWidth - rect.left : rect.left + rect.width,
      });
    }
  };

  const closePopup = useCallback(() => {
    searchTimeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
      setSectionPopupPos(null);
    }, 200);
  }, []);

  return (
    <div className="flex flex-col w-20 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 py-4 shadow-xl z-30">
      {/* Company Logo */}
      <Link to="/company-dashboard" className="flex items-center justify-center mb-6 no-underline" onMouseEnter={() => prefetch("/company-dashboard")}>
        <CompanyLogo
          src={user?.company?.logo}
          alt={user?.company?.name}
          className="h-12 w-12 rounded-xl object-cover shadow-lg border-2 border-gray-200 dark:border-gray-600"
          title={user?.company?.name}
          companyName={user?.company?.name}
        >
          <div
            className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
            title={user?.company?.name}
          >
            {user?.company?.name?.charAt(0) || "M"}
          </div>
        </CompanyLogo>
      </Link>

      {/* Search Icon */}
      <div className="px-2 mb-2 relative">
        <button
          ref={searchBtnRef}
          onClick={() => {
            if (searchOpen) { setSearchOpen(false); setSearchPopupPos(null); return; }
            setSearchOpen(true);
            const btn = searchBtnRef.current;
            if (btn) {
              const rect = btn.getBoundingClientRect();
              const isRtl = document.documentElement.dir === 'rtl';
              setDir(isRtl ? 'rtl' : 'ltr');
              setSearchPopupPos({
                top: rect.top,
                left: isRtl ? window.innerWidth - rect.left : rect.left + rect.width,
              });
            }
          }}
          className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative ${searchOpen || (searchQuery && searchQuery.length > 0)
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          title={t("sidebar.search")}
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>
        {searchOpen && searchPopupPos && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setSearchOpen(false); setSearchPopupPos(null); clearSearch(); }} />
            <div
              className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50"
              style={{
                [dir === 'rtl' ? 'right' : 'left']: searchPopupPos.left + 'px',
                top: searchPopupPos.top + 'px',
                width: '16rem',
              }}
            >
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={t("sidebar.searchInMenu")}
                  value={searchQuery || ""}
                  onChange={handleSearchChange}
                  className="w-full pr-9 pl-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    <XMarkIcon className="h-3 w-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section Icon Buttons */}
      <div className="flex-1 w-full px-2 overflow-y-auto no-scrollbar space-y-2">
        {sections
          .filter((s) => !s.hidden)
          .map((section) => {
            const isActive = section.items.some(
              (item) => isSidebarPathActive(currentPath, item.to),
            );

            return (
              <div
                key={section.id}
                ref={el => { sectionRefs.current[section.id] = el; }}
                onMouseEnter={() => openPopup(section.id)}
                onMouseLeave={closePopup}
              >
                <button
                  onClick={() => {
                    const firstItem = section.items.find((i) => !i.hidden);
                    if (firstItem) navigate(firstItem.to);
                  }}
                  className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative ${isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                >
                  {React.isValidElement(section.icon) &&
                    React.cloneElement(section.icon as React.ReactElement, {
                      className: `h-6 w-6 ${isActive ? "scale-110" : "group-hover:scale-110"} transition-transform`,
                    })}
                  {isActive && (
                    <div className="absolute ltr:right-0 rtl:left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full" />
                  )}
                </button>
              </div>
            );
          })}
      </div>

      {/* Popup — rendered at sidebar root level, outside scroll container */}
      {hoveredSection && sectionPopupPos && (() => {
        const section = sections.find(s => s.id === hoveredSection);
        if (!section) return null;
        return (
          <div
            className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50"
            style={{
              [dir === 'rtl' ? 'right' : 'left']: sectionPopupPos.left + 'px',
              top: sectionPopupPos.top + 'px',
              width: '16rem',
            }}
            onMouseEnter={() => openPopup(section.id)}
            onMouseLeave={closePopup}
          >
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {section.items.filter(i => !i.hidden).map((item) => (
                <div key={item.to} className="space-y-1">
                  <NavLink to={item.to} icon={item.icon} external={!!item.external} {...(item.badge ? { badge: item.badge } : {})}>
                    {item.label}
                  </NavLink>
                  {item.children && (
                    <div className="mr-8 mt-0.5 space-y-0.5 border-r border-gray-100 dark:border-gray-700/50 pr-1">
                      {item.children.filter(c => !c.hidden).map((child) => {
                        const isChildActive = isSidebarPathActive(currentPath, child.to);
                        return (
                          <Link
                            key={child.to}
                            to={child.to}
                            onMouseEnter={() => prefetch(child.to)}
                            className={`block px-2 py-1 text-[11px] font-medium rounded transition-all duration-200 ${isChildActive ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"}`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MinimalSidebar;
