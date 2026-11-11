import React, { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  LayoutDashboard,
  Users,
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

interface DoctorLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS: PortalNavItem[] = [
  { path: "/doctor/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/doctor/schedule", label: "الجدول الأسبوعي", icon: CalendarDays },
  { path: "/doctor/patients", label: "مرضاي", icon: Users },
  { path: "/doctor/payments", label: "المدفوعات", icon: Wallet },
  { path: "/doctor/availability", label: "أوقات العمل", icon: Clock },
];

const DoctorLayout: React.FC<DoctorLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const token = getActivePortalToken("doctor");
  const companyId = extractCompanyIdFromToken(token);
  const branding = useCompanyBranding(companyId);

  const doctor = useMemo(() => {
    try {
      const raw = localStorage.getItem("doctor");
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, []);

  if (!token) {
    return <Navigate to="/doctor/login" replace />;
  }

  const userName =
    `${doctor["title"] ? `${doctor["title"]} ` : ""}${doctor["name"] || "طبيب العيادة"}`.trim();

  const handleLogout = () => {
    clearPortalSession("doctor");
    navigate("/doctor/login", { replace: true });
  };

  return (
    <PortalAppShell
      portalTitle="بوابة الطبيب"
      portalSubtitle="إدارة المواعيد والمرضى"
      homePath="/doctor/dashboard"
      userName={userName}
      userSubtitle="متصل الآن"
      navItems={NAV_ITEMS}
      branding={branding}
      portalType="doctor"
      headerActions={<PortalPushToggle portal="doctor" accentColor={branding.accent} />}
      logoutLabel="تسجيل الخروج"
      onLogout={handleLogout}
    >
      {children}
    </PortalAppShell>
  );
};

export default DoctorLayout;
