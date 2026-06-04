import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { SidebarSection } from "../../../types/layout";
import { useAuth } from "../../../hooks/useAuthSimple";
import { buildStoreUrl } from "../../../utils/storeUrl";
import { isSidebarPathActive } from "./matchSidebarPath";

interface HorizontalNavProps {
  sections: SidebarSection[];
  currentPath: string;
  t: (key: string) => string;
}

const HorizontalNav: React.FC<HorizontalNavProps> = ({
  sections,
  currentPath,
}) => {
  const { user } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navId = useId();
  const navRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        navRef.current &&
        event.target instanceof Node &&
        !navRef.current.contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
          className="business-horizontal-link"
          data-active="false"
          role="menuitem"
        >
          <span className="business-horizontal-link-icon">
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement, {
                  className: "h-4 w-4",
                })
              : icon}
          </span>
          <span className="business-horizontal-link-text">{children}</span>
          {badge ? (
            <span className="business-sidebar-badge">{badge}</span>
          ) : null}
        </a>
      );
    }

    return (
      <Link
        to={to}
        className="business-horizontal-link"
        data-active={isActive}
        role="menuitem"
      >
        <span className="business-horizontal-link-icon">
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement, {
                className: "h-4 w-4",
              })
            : icon}
        </span>
        <span className="business-horizontal-link-text">{children}</span>
        {badge ? <span className="business-sidebar-badge">{badge}</span> : null}
      </Link>
    );
  };

  return (
    <div className="app-header-theme business-horizontal-nav" ref={navRef}>
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16 overflow-x-auto no-scrollbar gap-2">
          <div className="flex-shrink-0 ml-4 flex items-center">
            <div className="business-brand-glyph business-brand-glyph--small">
              {user?.company?.name?.charAt(0) || "M"}
            </div>
          </div>

          {sections
            .filter((section) => !section.hidden)
            .map((section) => {
              const isActive = section.items.some((item) =>
                isSidebarPathActive(currentPath, item.to),
              );
              const isOpen = openDropdown === section.id;
              const menuId = `${navId}-${section.id}`;

              return (
                <div
                  key={section.id}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(section.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    type="button"
                    className="business-horizontal-trigger"
                    data-state={isActive || isOpen ? "active" : "idle"}
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    aria-controls={menuId}
                    onClick={() =>
                      setOpenDropdown((current) =>
                        current === section.id ? null : section.id,
                      )
                    }
                  >
                    {React.isValidElement(section.icon)
                      ? React.cloneElement(section.icon as React.ReactElement, {
                          className: "h-5 w-5",
                        })
                      : section.icon}
                    <span>{section.title}</span>
                    <ChevronDownIcon
                      className={`h-3 w-3 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen ? (
                    <div
                      id={menuId}
                      className="business-shell-menu business-horizontal-menu"
                      role="menu"
                    >
                      <div className="business-horizontal-menu-label">
                        {section.title}
                      </div>
                      {section.items
                        .filter((item) => !item.hidden)
                        .map((item) => (
                          <div key={item.to} className="space-y-1">
                            <NavLink
                              to={item.to}
                              icon={item.icon}
                              external={!!item.external}
                              badge={item.badge}
                            >
                              {item.label}
                            </NavLink>

                            {item.children ? (
                              <div className="business-horizontal-children">
                                {item.children
                                  .filter((child) => !child.hidden)
                                  .map((child) => {
                                    const isChildActive = isSidebarPathActive(
                                      currentPath,
                                      child.to,
                                    );

                                    return (
                                      <Link
                                        key={child.to}
                                        to={child.to}
                                        className="business-sidebar-child-link"
                                        data-active={isChildActive}
                                        role="menuitem"
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
                </div>
              );
            })}

          <div className="flex-1" />
        </div>
      </div>
    </div>
  );
};

export default HorizontalNav;
