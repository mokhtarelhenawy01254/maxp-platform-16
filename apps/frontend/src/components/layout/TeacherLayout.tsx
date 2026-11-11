import React, { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  Wallet,
} from "lucide-react";
import { PortalAppShell, type PortalNavItem } from "./PortalAppShell";
import { PortalPushToggle } from "../common/PortalPushToggle";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";
import {
  clearPortalSession,
  extractCompanyIdFromToken,
  getActivePortalToken,
} from "../../utils/portalSessionManager";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS: PortalNavItem[] = [
  { path: "/teacher/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/teacher/schedule", label: "جدول الحصص", icon: CalendarDays },
  { path: "/teacher/payments", label: "المرتبات", icon: Wallet },
  { path: "/teacher/availability", label: "أوقات العمل", icon: Clock },
];

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const token = getActivePortalToken("teacher");
  const companyId = extractCompanyIdFromToken(token);
  const branding = useCompanyBranding(companyId);

  const teacher = useMemo(() => {
    try {
      const raw = localStorage.getItem("teacher");
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, []);

  if (!token) {
    return <Navigate to="/teacher/login" replace />;
  }

  const handleLogout = () => {
    clearPortalSession("teacher");
    navigate("/teacher/login", { replace: true });
  };

  return (
    <PortalAppShell
      portalTitle="بوابة المدرس"
      portalSubtitle="الحصص والجدول الدراسي"
      homePath="/teacher/dashboard"
      userName={teacher["name"] || "مدرس"}
      navItems={NAV_ITEMS}
      branding={branding}
      portalType="teacher"
      headerActions={<PortalPushToggle portal="teacher" accentColor={branding.accent} />}
      logoutLabel="تسجيل خروج"
      onLogout={handleLogout}
    >
      {children}
    </PortalAppShell>
  );
};

export default TeacherLayout;
