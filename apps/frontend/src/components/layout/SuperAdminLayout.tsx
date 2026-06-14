import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "../../hooks/useAuthSimple";
import { useTheme } from "../../hooks/useTheme";
import { apiClient } from "../../services/apiClient";
import ActiveUsersMonitor from "../ActiveUsersMonitor";
import SuperAdminSidebar, { menuGroups } from "./SuperAdminSidebar";
import SuperAdminHeader from "./SuperAdminHeader";
import { matchesSuperAdminNavigationPath } from "./layoutMode";

const drawerWidth = 280;
const collapsedDrawerWidth = 88;

interface SuperAdminLayoutProps { children: React.ReactNode; fullWidth?: boolean; }
type User = { firstName?: string | null; lastName?: string | null; email?: string | null; role?: string | null; } | null;

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children, fullWidth = false }) => {
  const navigate = useNavigate(); const location = useLocation();
  const { user, logout, isLoading } = useAuth(); const u = user as User;
  const { t } = useTranslation();
  const { actualTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showActive, setShowActive] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const isDark = actualTheme === "dark";

  const fetchCount = useCallback(async () => {
    try { const r = await apiClient.get("/system/active-users", { _skipErrorToast: true, _skipTransientRetry: true }); setActiveCount(r.status === 200 ? (r.data.data?.count || 0) : 0); }
    catch { setActiveCount(0); }
  }, []);

  useEffect(() => { if (u?.role === "SUPER_ADMIN" && !isLoading) { fetchCount(); const i = setInterval(fetchCount, 30000); return () => clearInterval(i); } }, [u?.role, isLoading, fetchCount]);
  useEffect(() => { if (isLoading) return; if (!u || u.role !== "SUPER_ADMIN") { const t = setTimeout(() => navigate("/auth/login"), 100); return () => clearTimeout(t); } }, [u, isLoading, navigate]);

  if (isLoading) return <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}><p style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{t("superAdmin.dashboardLoading")}</p></div>;
  if (!u || u.role !== "SUPER_ADMIN") return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6" dir="rtl" style={{ backgroundColor: isDark ? "#0f172a" : "#f8fafc", color: isDark ? "#f1f5f9" : "#1e293b" }}>
      <AlertTriangle className="size-12 text-destructive" /><h1 className="text-2xl font-bold text-destructive">{t("superAdmin.unauthorized")}</h1>
      <p className="text-lg" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>{t("superAdmin.superAdminOnly")}</p>
      <p className="text-sm" style={{ color: isDark ? "#64748b" : "#94a3b8" }}>{t("superAdmin.redirecting")}</p>
    </div>
  );

  const cw = isCollapsed ? collapsedDrawerWidth : drawerWidth;
  const title = menuGroups.find((g) => g.items.some((i) => matchesSuperAdminNavigationPath(location.pathname, i.path)))?.title || t("superAdmin.controlPanel");

  return (
    <div className="flex min-h-screen overflow-x-hidden" dir="rtl" style={{ backgroundColor: isDark ? "#0f172a" : "#f8fafc" }}>
      <SuperAdminHeader currentDrawerWidth={cw} isDark={isDark} isCollapsed={isCollapsed} onCollapseToggle={() => setIsCollapsed(!isCollapsed)}
        onMobileMenuOpen={() => setMobileOpen(true)} activeUsersCount={activeCount} onShowActiveUsers={() => setShowActive(true)} user={u} title={title} />
      <SuperAdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} user={u} isDark={isDark} handleProfileMenuOpen={() => {}} />
      <main className="flex-1 overflow-x-hidden pt-16 transition-all duration-300" style={{ width: `calc(100% - ${cw}px)` }}>
        <div className="w-full px-4 py-6 sm:px-8" style={{ maxWidth: fullWidth ? "none" : "1400px", margin: fullWidth ? 0 : "0 auto" }}>{children}</div>
      </main>
      {showActive && <ActiveUsersMonitor isOpen={showActive} onClose={() => setShowActive(false)} />}
    </div>
  );
};

export default SuperAdminLayout;
