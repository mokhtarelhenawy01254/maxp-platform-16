import React, { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  ShoppingCart,
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

interface ParentLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS: PortalNavItem[] = [
  { path: "/parent/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/parent/children", label: "أبنائي", icon: Users },
  { path: "/parent/sessions", label: "الحصص", icon: CalendarDays },
  { path: "/parent/enrollments", label: "التسجيلات", icon: BookOpen },
  { path: "/parent/wallet", label: "المحفظة", icon: Wallet },
  { path: "/parent/buy-package", label: "شراء باقة", icon: ShoppingCart },
];

export const ParentLayout: React.FC<ParentLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const token = getActivePortalToken("parent");
  const companyId = extractCompanyIdFromToken(token);
  const branding = useCompanyBranding(companyId);

  const parent = useMemo(() => {
    try {
      const raw = localStorage.getItem("parent");
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }, []);

  if (!token) {
    return <Navigate to="/parent/login" replace />;
  }

  const userName = parent["firstName"]
    ? `${parent["firstName"]} ${parent["lastName"] || ""}`.trim()
    : parent["name"] || "ولي الأمر";

  const handleLogout = () => {
    clearPortalSession("parent");
    navigate("/parent/login", { replace: true });
  };

  return (
    <PortalAppShell
      portalTitle="بوابة ولي الأمر"
      portalSubtitle="متابعة الأبناء والحصص"
      homePath="/parent/dashboard"
      userName={userName}
      navItems={NAV_ITEMS}
      branding={branding}
      portalType="parent"
      headerActions={<PortalPushToggle portal="parent" accentColor={branding.accent} />}
      logoutLabel="تسجيل خروج"
      onLogout={handleLogout}
    >
      {children}
    </PortalAppShell>
  );
};

export default ParentLayout;
