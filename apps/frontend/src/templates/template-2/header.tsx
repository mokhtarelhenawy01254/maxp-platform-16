import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../hooks/useAuthSimple";
import ThemeToggle from "../../components/ui/theme-toggle";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import NotificationDropdown from "../../components/notifications/NotificationDropdown";

const LinearHeader: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  const initials =
    `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.trim() || "U";

  return (
    <header
      className="flex items-center justify-between h-14 px-4 lg:px-6 shrink-0"
      style={{
        background: "rgba(15, 16, 17, 0.8)",
        borderBottom: "1px solid #23252a",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Left side ΓÇö breadcrumb or title */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium" style={{ color: "#f7f8f8" }}>
          {t("sidebar.dashboard")}
        </span>
      </div>

      {/* Right side ΓÇö actions */}
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <LanguageSwitcher />
        <NotificationDropdown />

        {/* Profile */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-all duration-75"
            style={{
              background: isProfileOpen ? "rgba(255,255,255,0.05)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!isProfileOpen) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseLeave={(e) => {
              if (!isProfileOpen) e.currentTarget.style.background = "transparent";
            }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium"
              style={{ background: "#5e6ad2", color: "#ffffff" }}
            >
              {initials}
            </div>
            <ChevronDownIcon className="h-3.5 w-3.5" style={{ color: "#8a8f98" }} />
          </button>

          {isProfileOpen ? (
            <div
              className="absolute right-0 top-full mt-1.5 w-56 rounded-lg py-1 shadow-lg z-50"
              style={{
                background: "#18191a",
                border: "1px solid #23252a",
                boxShadow: "0 16px 32px rgba(0,0,0,0.4)",
              }}
            >
              <div className="px-3 py-2 border-b border-[#23252a]">
                <p className="text-sm font-medium" style={{ color: "#f7f8f8" }}>
                  {user?.firstName || t("sidebar.profile")}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#62666d" }}>
                  {user?.email || ""}
                </p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => { navigate("/profile"); setIsProfileOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm transition-all duration-75"
                  style={{ color: "#f7f8f8" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {t("sidebar.profile")}
                </button>
                <button
                  type="button"
                  onClick={() => { navigate("/settings"); setIsProfileOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm transition-all duration-75"
                  style={{ color: "#f7f8f8" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {t("sidebar.settings")}
                </button>
                <div className="border-t border-[#23252a] my-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-1.5 text-sm transition-all duration-75"
                  style={{ color: "#ef4444" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {t("sidebar.logout")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default LinearHeader;
