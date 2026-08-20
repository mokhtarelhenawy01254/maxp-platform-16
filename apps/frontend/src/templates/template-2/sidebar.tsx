import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { SidebarSection } from "../../types/layout";
import { useAuth } from "../../hooks/useAuthSimple";
import { isSidebarPathActive } from "../../components/layout/sidebar/matchSidebarPath";

interface LinearSidebarProps {
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

const LinearSidebar: React.FC<LinearSidebarProps> = ({
  isCollapsed,
  mobileMode = false,
  toggleSidebar,
  sections,
  currentPath,
  t,
  searchQuery,
  setSearchQuery,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "#08090a" }}>
      {/* Logo Area */}
      <div className="flex items-center h-16 px-4 border-b border-[#23252a] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold" style={{ background: "#5e6ad2", color: "#ffffff" }}>M</div>
          <span className="text-sm font-semibold" style={{ color: "#f7f8f8" }}>MaxP</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: "#8a8f98" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("sidebar.search")}
            className="w-full h-8 pl-8 pr-2 rounded-md text-xs outline-none border-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#f7f8f8",
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <XMarkIcon className="h-3 w-3" style={{ color: "#8a8f98" }} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
        {visibleSectionsWithItems.map((section) => (
          <div key={section.id} className="mb-1">
            <div className="px-2 py-1.5">
              <span className="text-[11px] font-medium tracking-wider uppercase" style={{ color: "#62666d" }}>
                {section.title}
              </span>
            </div>
            {section.visibleItems.map((item) => {
              const isActive = !item.external && isSidebarPathActive(currentPath, item.to);
              return (
                <Link
                  key={`${item.to}::${item.label}`}
                  to={item.to}
                  onClick={() => {
                    if (mobileMode) toggleSidebar();
                  }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-75"
                  style={{
                    background: isActive ? "rgba(94,106,210,0.12)" : "transparent",
                    color: isActive ? "#828fff" : "#8a8f98",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {item.icon ? (
                    <span className="flex items-center justify-center w-4 h-4 shrink-0">
                      {React.isValidElement(item.icon)
                        ? React.cloneElement(item.icon as React.ReactElement, { className: "h-4 w-4" })
                        : item.icon}
                    </span>
                  ) : null}
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span
                      className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ background: "rgba(94,106,210,0.15)", color: "#828fff" }}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom ΓÇö User */}
      <div className="shrink-0 border-t border-[#23252a] px-3 py-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-all duration-75"
          style={{ color: "#8a8f98" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          onClick={handleLogout}
        >
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium shrink-0"
            style={{ background: "#5e6ad2", color: "#ffffff" }}
          >
            {user?.firstName?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs truncate" style={{ color: "#f7f8f8" }}>{user?.firstName || t("sidebar.profile")}</span>
            <span className="text-[10px] truncate" style={{ color: "#62666d" }}>{user?.role || "Operator"}</span>
          </div>
          <ChevronRightIcon className="h-3.5 w-3.5 ml-auto shrink-0" style={{ color: "#62666d" }} />
        </div>
      </div>
    </div>
  );

  if (mobileMode) {
    return sidebarContent;
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{
        width: isCollapsed ? "56px" : "260px",
        background: "#08090a",
        borderRight: "1px solid #23252a",
        transition: "width 150ms ease",
        overflow: "hidden",
      }}
    >
      {isCollapsed ? (
        /* Collapsed: Show only logo + icons */
        <div className="flex flex-col h-full items-center py-3 px-2 space-y-4">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold" style={{ background: "#5e6ad2", color: "#ffffff" }}>M</div>
          <div className="flex flex-col items-center space-y-1 flex-1 overflow-y-auto">
            {visibleSectionsWithItems.flatMap((section) =>
              section.visibleItems.map((item) => {
                const isActive = isSidebarPathActive(currentPath, item.to);
                return (
                  <Link
                    key={`${item.to}::${item.label}`}
                    to={item.to}
                    className="flex items-center justify-center w-9 h-9 rounded-md transition-all duration-75"
                    style={{
                      background: isActive ? "rgba(94,106,210,0.15)" : "transparent",
                      color: isActive ? "#828fff" : "#8a8f98",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {item.icon
                      ? React.isValidElement(item.icon)
                        ? React.cloneElement(item.icon as React.ReactElement, { className: "h-5 w-5" })
                        : item.icon
                      : null}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      ) : (
        sidebarContent
      )}
    </div>
  );
};

export default LinearSidebar;
