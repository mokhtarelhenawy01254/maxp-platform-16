import React, { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
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

interface PatientLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS: PortalNavItem[] = [
  { path: "/patient/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/patient/appointments", label: "مواعيدي", icon: CalendarDays },
  { path: "/patient/history", label: "تاريخي الطبي", icon: ClipboardList },
  { path: "/patient/invoices", label: "فواتيري", icon: Wallet },
];

const PatientLayout: React.FC<PatientLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const token = getActivePortalToken("patient");
  const companyId = extractCompanyIdFromToken(token);
  const branding = useCompanyBranding(companyId);

  const patient = useMemo(() => {
    try {
      const raw = localStorage.getItem("patient");
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, []);

  if (!token) {
    return <Navigate to="/patient/login" replace />;
  }

  const userName = patient["firstName"]
    ? `${patient["firstName"]} ${patient["lastName"] || ""}`.trim()
    : patient["name"] || "ملف المريض";

  const handleLogout = () => {
    clearPortalSession("patient");
    navigate("/patient/login", { replace: true });
  };

  return (
    <PortalAppShell
      portalTitle="بوابة المريض"
      portalSubtitle="المواعيد والملف الطبي"
      homePath="/patient/dashboard"
      userName={userName}
      userSubtitle="ملف نشط"
      navItems={NAV_ITEMS}
      branding={branding}
      portalType="patient"
      headerActions={<PortalPushToggle portal="patient" accentColor={branding.accent} />}
      logoutLabel="تسجيل الخروج"
      onLogout={handleLogout}
    >
      {children}
    </PortalAppShell>
  );
};

export default PatientLayout;
