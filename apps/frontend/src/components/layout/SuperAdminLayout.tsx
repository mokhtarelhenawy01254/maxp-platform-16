import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { useVisualTheme } from "../../contexts/VisualThemeContext";
import i18n from "../../i18n";
import ActiveUsersMonitor from "../ActiveUsersMonitor";
import SuperAdminSidebar, { getMenuGroups, drawerWidth, collapsedDrawerWidth } from "./SuperAdminSidebar";
import SuperAdminHeader from "./SuperAdminHeader";
import { matchesSuperAdminNavigationPath } from "./layoutMode";

interface SuperAdminLayoutProps { children: React.ReactNode; fullWidth?: boolean; activeUsersCount?: number; }
type User = { firstName?: string | null; lastName?: string | null; email?: string | null; role?: string | null; } | null;

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children, fullWidth = false, activeUsersCount = 0 }) => {
  const navigate = useNavigate(); const location = useLocation();
  const { user, isLoading } = useAuth(); const u = user as User;
  const { t } = useTranslation();
  const { currentTheme } = useVisualTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showActive, setShowActive] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!u || u.role !== "SUPER_ADMIN") {
      const t = setTimeout(() => navigate("/auth/login"), 100);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [u, isLoading, navigate]);

  useEffect(() => {
    if (location.pathname.startsWith("/super-admin/")) {
      localStorage.setItem("superAdmin_lastPath", location.pathname);
    }
  }, [location.pathname]);

  if (isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">{t("superAdmin.dashboardLoading")}</p>
    </div>
  );

  if (!u || u.role !== "SUPER_ADMIN") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 bg-background text-foreground" dir={i18n.dir()}>
      <AlertTriangle className="size-12 text-destructive" />
      <h1 className="text-2xl font-bold text-destructive">{t("superAdmin.unauthorized")}</h1>
      <p className="text-lg text-muted-foreground">{t("superAdmin.superAdminOnly")}</p>
    </div>
  );

  const cw = isCollapsed ? collapsedDrawerWidth : drawerWidth;
  const title = getMenuGroups(t).find((g) => g.items.some((i) => matchesSuperAdminNavigationPath(location.pathname, i.path, location.search)))?.title || t("superAdmin.controlPanel");

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={i18n.dir()} data-theme={currentTheme.id}>
      <SuperAdminHeader currentDrawerWidth={cw} isCollapsed={isCollapsed} onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
        onMobileMenuOpen={() => setMobileOpen(true)} activeUsersCount={activeUsersCount} onShowActiveUsers={() => setShowActive(true)} user={u} title={title} />
      <SuperAdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} user={u} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 transition-all duration-300" style={{ width: `calc(100% - ${cw}px)` }}>
        <div className="w-full px-4 py-6 sm:px-8">{children}</div>
      </main>
      {showActive && <ActiveUsersMonitor isOpen={showActive} onClose={() => setShowActive(false)} />}
    </div>
  );
};

export default SuperAdminLayout;
