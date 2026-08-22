import React, { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { SidebarSection } from "../../../types/layout";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useTheme } from "../../../hooks/useTheme";
import { envConfig } from "../../../config/environment";
import { buildStoreUrl } from "../../../utils/storeUrl";
import { isSidebarPathActive } from "./matchSidebarPath";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { useRoutePrefetch } from "../../../hooks/useRoutePrefetch";


interface ThreeTierSidebarProps {
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

const ThreeTierSidebar: React.FC<ThreeTierSidebarProps> = ({
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
  const { derivedTheme } = useTheme();
  const navigate = useNavigate();
  const searchInputId = useId();
  const prefetch = useRoutePrefetch();
  
  const visibleSectionsWithItems = useMemo(
    () =>
      sections
        .filter((section) => !section.hidden)
        .map((section) => ({
          ...section,
          visibleItems: section.items.filter((item) => !item.hidden),
        }))
        .filter((section) => section.visibleItems.length > 0),
    [sections],
  );

  const findActiveSection = () => {
    return (
      visibleSectionsWithItems.find((section) =>
        section.visibleItems.some((item) =>
          isSidebarPathActive(currentPath, item.to),
        ),
      )?.id ||
      visibleSectionsWithItems[0]?.id ||
      ""
    );
  };

  const routeActiveSectionId =
    visibleSectionsWithItems.find((section) =>
      section.visibleItems.some((item) =>
        isSidebarPathActive(currentPath, item.to),
      ),
    )?.id || "";

  const [activeSectionId, setActiveSectionId] =
    useState<string>(findActiveSection());
  const [expandedMobileSections, setExpandedMobileSections] = useState<
    Record<string, boolean>
  >(() => {
    const activeSectionId = findActiveSection();
    return activeSectionId ? { [activeSectionId]: true } : {};
  });

  useEffect(() => {
    if (routeActiveSectionId) {
      setActiveSectionId((prev) =>
        prev === routeActiveSectionId ? prev : routeActiveSectionId,
      );
      return;
    }
  }, [routeActiveSectionId]);

  useEffect(() => {
    if (visibleSectionsWithItems.length === 0) {
      setActiveSectionId("");
      return;
    }

    setActiveSectionId((prev) =>
      visibleSectionsWithItems.some((section) => section.id === prev)
        ? prev
        : visibleSectionsWithItems[0].id,
    );
  }, [visibleSectionsWithItems]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    if (!mobileMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleSidebar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMode, toggleSidebar]);

  const activeSection = visibleSectionsWithItems.find(
    (section) => section.id === activeSectionId,
  );

  const railLabelKeyOverrides: Record<string, string> = {
    main: "sidebar.dashboardRail",
    facebook: "sidebar.facebookSectionRail",
    whatsapp: "sidebar.whatsappSectionRail",
    telegram: "sidebar.telegramSectionRail",
    orders: "sidebar.ordersRail",
    "orders-analytics": "sidebar.analyticsRail",
    products: "sidebar.productsRail",
    "storefront-design": "sidebar.storefrontSectionRail",
    customers: "sidebar.customersRail",
    procurement: "sidebar.procurementRail",
    affiliate: "sidebar.affiliateSectionRail",
    "platform-partner": "sidebar.partnerManagementRail",
    inventory: "sidebar.inventorySectionRail",
    marketing: "sidebar.marketingSectionRail",
    "my-account": "sidebar.myAccountSectionRail",
    "my-companies": "sidebar.myCompaniesSectionRail",
    hr: "sidebar.hrSectionRail",
    business: "sidebar.businessSectionRail",
    analytics: "sidebar.analyticsRail",
    support: "sidebar.supportSectionRail",
    marketplace: "sidebar.marketplaceRail",
    billing: "sidebar.billingSectionRail",
    notifications: "sidebar.notificationsRail",
    activity: "sidebar.activitySectionRail",
    settings: "sidebar.settingsRail",
    admin: "sidebar.advancedAdminSectionRail",
    system: "sidebar.systemManagementSectionRail",
    "store-management": "sidebar.storeManagementRail",
    legal: "sidebar.legalSectionRail",
  };

  const getRailLabel = (section: SidebarSection) => {
    const overrideKey = railLabelKeyOverrides[section.id];
    return overrideKey && t(overrideKey) !== overrideKey
      ? t(overrideKey)
      : section.title;
  };

  const getSidebarItemKey = (item: SidebarSection["items"][number]) =>
    `${item.to}::${item.label}::${item.external ? "external" : "internal"}`;

  const getSidebarChildKey = (
    child: NonNullable<SidebarSection["items"][number]["children"]>[number],
  ) => `${child.to}::${child.label}`;

  const NavLink: React.FC<{
    to: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    external?: boolean;
    badge?: string;
  }> = ({ to, icon, children, external, badge }) => {
    const isActive = !external && isSidebarPathActive(currentPath, to);
    const prefetch = useRoutePrefetch();

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
          className="business-sidebar-nav-link"
          data-active="false"
          data-external="true"
          onClick={() => {
            if (mobileMode) {
              toggleSidebar();
            }
          }}
        >
          <span className="business-sidebar-nav-icon">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement, {
                  className: "h-4 w-4",
                })
              : icon}
          </span>
          <span className="business-sidebar-nav-text">{children}</span>
          {badge ? (
            <span className="business-sidebar-badge">{badge}</span>
          ) : null}
        </a>
      );
    }

    return (
      <Link
        to={to}
        className="business-sidebar-nav-link"
        data-active={isActive}
        onMouseEnter={() => prefetch(to)}
        onClick={() => {
          if (mobileMode) {
            toggleSidebar();
          }
        }}
      >
        <span className="business-sidebar-nav-icon">
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement, {
                className: "h-4 w-4",
              })
            : icon}
        </span>
        <span className="business-sidebar-nav-text">{children}</span>
        {badge ? <span className="business-sidebar-badge">{badge}</span> : null}
      </Link>
    );
  };

  const isMobileSectionExpanded = (
    sectionId: string,
    hasActiveItem: boolean,
  ) => {
    if (searchQuery.trim()) {
      return true;
    }

    if (Object.keys(expandedMobileSections).length > 0) {
      return !!expandedMobileSections[sectionId];
    }

    if (collapsedSections[sectionId] !== undefined) {
      return !collapsedSections[sectionId];
    }

    return hasActiveItem;
  };

  const handleMobileSectionToggle = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setExpandedMobileSections((prev) => {
      const isCurrentlyExpanded = !!prev[sectionId];
      return isCurrentlyExpanded ? { [sectionId]: false } : { [sectionId]: true };
    });
    toggleSection(sectionId);
  };

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const initials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.trim();

  return (
    <div
      className="business-sidebar-shell"
      data-mobile={mobileMode ? "true" : "false"}
    >
      {!mobileMode ? (
        <div className="business-sidebar-rail">
          <div className="business-sidebar-brand-block">
            <Link to="/company-dashboard" className="block" onMouseEnter={() => prefetch("/company-dashboard")}>
              <CompanyLogo
                src={user?.company?.logo}
                alt={user?.company?.name || "Logo"}
                className="business-sidebar-logo"
                title={user?.company?.name || t("sidebar.platformName")}
                companyName={user?.company?.name}
              >
                <div 
                  className="business-brand-glyph" 
                  title={user?.company?.name || t("sidebar.platformName")}
                  data-admin={user?.role === "SUPER_ADMIN" ? "true" : "false"}
                >
                  {user?.role === "SUPER_ADMIN" ? (
                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                  ) : (
                    user?.company?.name?.charAt(0) || "M"
                  )}
                </div>
              </CompanyLogo>
            </Link>
          </div>

          <div className="business-sidebar-rail-scroll">
            {visibleSectionsWithItems.map((section) => {
              const isActive = activeSectionId === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveSectionId(section.id);
                    if (isCollapsed) toggleSidebar();
                  }}
                  className="business-sidebar-rail-item"
                  data-active={isActive}
                  title={section.title}
                >
                  <span className="business-sidebar-rail-icon">
                    {React.isValidElement(section.icon)
                      ? React.cloneElement(section.icon as React.ReactElement, {
                          className: "business-sidebar-rail-glyph h-7 w-7",
                        })
                      : section.icon}
                  </span>
                  <span className="business-sidebar-rail-label">
                    {getRailLabel(section)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className="business-sidebar-panel"
        data-collapsed={mobileMode ? false : isCollapsed}
      >
        <div className="business-sidebar-panel-header">
          <div className="business-sidebar-company">
            <Link to="/company-dashboard" className="flex items-center gap-3 no-underline" onMouseEnter={() => prefetch("/company-dashboard")}>
              <CompanyLogo
                src={user?.company?.logo}
                alt={user?.company?.name}
                className="business-sidebar-company-logo"
                companyName={user?.company?.name}
              >
                <div className="business-brand-glyph business-brand-glyph--small">
                  {user?.company?.name?.charAt(0) || "M"}
                </div>
              </CompanyLogo>

              <div className="business-sidebar-company-copy">
                <h2 className="text-foreground">
                  {user?.company?.name || (user?.role === "SUPER_ADMIN" ? "التحكم الذكي" : t("sidebar.company"))}
              </h2>
              <p>
                {activeSection?.title || (user?.role === "SUPER_ADMIN" ? "نظام الإدارة المركزية" : "")}
              </p>
            </div>
            </Link>
          </div>

          {mobileMode ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="business-sidebar-mobile-close"
              aria-label={t("sidebar.close") || "Close"}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              className="business-icon-button business-icon-button--sm"
              aria-label={t("sidebar.collapse")}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="business-sidebar-search-wrap">
          <label htmlFor={searchInputId} className="sr-only">
            {t("sidebar.searchInMenu")}
          </label>
          <MagnifyingGlassIcon className="business-sidebar-search-icon" />
          <input
            id={searchInputId}
            name="sidebarSearch"
            type="text"
            autoComplete="off"
            placeholder={t("sidebar.search")}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label={t("sidebar.searchInMenu")}
            className="business-sidebar-search"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="business-sidebar-clear-search"
              aria-label={t("sidebar.clearSearch")}
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          ) : null}
        </div>

        {mobileMode ? (
          <div className="business-sidebar-mobile-groups">
            {visibleSectionsWithItems.map((section) => {
              const hasActiveItem = section.visibleItems.some((item) =>
                isSidebarPathActive(currentPath, item.to),
              );
              const isExpanded = isMobileSectionExpanded(
                section.id,
                hasActiveItem,
              );

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
                    onClick={() => handleMobileSectionToggle(section.id)}
                  >
                    <span className="business-sidebar-mobile-group-copy">
                      <span className="business-sidebar-mobile-group-icon">
                        {React.isValidElement(section.icon)
                          ? React.cloneElement(
                              section.icon as React.ReactElement,
                              {
                                className: "h-4 w-4",
                              },
                            )
                          : section.icon}
                      </span>
                      <span className="business-sidebar-mobile-group-text">
                        <strong>{section.title}</strong>
                        <small>{section.visibleItems.length}</small>
                      </span>
                    </span>

                    <ChevronRightIcon className="business-sidebar-mobile-group-chevron h-4 w-4" />
                  </button>

                  {isExpanded ? (
                    <div className="business-sidebar-mobile-group-items">
                      {section.visibleItems.map((item) => (
                        <div key={getSidebarItemKey(item)} className="space-y-1">
                            <NavLink
                              to={item.to}
                              icon={item.icon}
                              external={!!item.external}
                              badge={item.badge}
                            >
                              {item.label}
                            </NavLink>

                          {item.children ? (
                            <div className="business-sidebar-children">
                              {item.children
                                .filter((child) => !child.hidden)
                                .map((child) => {
                                  const isChildActive = isSidebarPathActive(
                                    currentPath,
                                    child.to,
                                  );

                                  return (
                                  <Link
                                    key={getSidebarChildKey(child)}
                                    to={child.to}
                                    className="business-sidebar-child-link"
                                    data-active={isChildActive}
                                    onMouseEnter={() => prefetch(child.to)}
                                    onClick={() => toggleSidebar()}
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
                  ) : null}
                </section>
              );
            })}

            <div className="business-sidebar-mobile-profile">
              <div className="business-sidebar-mobile-profile-info">
                <div className="business-sidebar-mobile-avatar">
                  {initials || "MP"}
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
                  onClick={handleLogout}
                  className="business-sidebar-mobile-profile-link"
                  data-variant="danger"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  {t("sidebar.logout")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="business-sidebar-links">
            {(activeSection?.visibleItems ?? []).map((item) => (
              <div key={getSidebarItemKey(item)} className="space-y-1">
                  <NavLink
                    to={item.to}
                    icon={item.icon}
                    external={!!item.external}
                    badge={item.badge}
                  >
                    {item.label}
                  </NavLink>

                {item.children ? (
                  <div className="business-sidebar-children">
                    {item.children
                      .filter((child) => !child.hidden)
                      .map((child) => {
                        const isChildActive = isSidebarPathActive(
                          currentPath,
                          child.to,
                        );

                        return (
                          <Link
                            key={getSidebarChildKey(child)}
                            to={child.to}
                            className="business-sidebar-child-link"
                            data-active={isChildActive}
                            onMouseEnter={() => prefetch(child.to)}
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
    </div>
  );
};

export default ThreeTierSidebar;
