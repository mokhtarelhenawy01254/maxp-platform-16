import React, { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  User,
  Wallet,
  X,
} from "lucide-react";
import { resolveBrandingLogoUrl, useCompanyBranding } from "../../hooks/useCompanyBranding";
import { clearPortalSession, extractCompanyIdFromToken } from "../../utils/portalSessionManager";
import { PortalInstallBanner } from "../../components/common/PortalInstallBanner";
import { PortalPushToggle } from "../../components/common/PortalPushToggle";
import { cartCount, clearPortalAuth, getPortalToken, getStoredDentist } from "./shared";

const navItems = [
  { to: "/dental-portal/dashboard", labelKey: "layout.home", icon: LayoutDashboard },
  { to: "/dental-portal/catalog", labelKey: "layout.store", icon: ShoppingBag },
  { to: "/dental-portal/cart", labelKey: "cart.badge", icon: ShoppingCart },
  { to: "/dental-portal/cases", labelKey: "layout.myCases", icon: ClipboardList },
  { to: "/dental-portal/invoices", labelKey: "layout.myInvoices", icon: Wallet },
];

const DentalPortalLayout: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const [menuOpen, setMenuOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(() => cartCount());
  const [logoError, setLogoError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = getPortalToken();
  const dentist = getStoredDentist();
  const branding = useCompanyBranding(extractCompanyIdFromToken(token));

  const accentColor = branding.accent?.trim() || "#4f46e5";
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(branding.logo) : null;
  const brandTitle = branding.name?.trim() || t("dentalPortal.portalName");

  useEffect(() => {
    setLogoError(false);
  }, [branding.logo]);

  useEffect(() => {
    const update = () => setBadgeCount(cartCount());
    window.addEventListener("dental-cart-changed", update);
    return () => window.removeEventListener("dental-cart-changed", update);
  }, []);

  if (!token) return <Navigate to="/dental-portal/login" replace />;

  const handleLogout = () => {
    clearPortalSession("dental");
    clearPortalAuth();
    navigate("/dental-portal/login", { replace: true });
  };

  const renderNavLink = (item: (typeof navItems)[number], closeOnClick = false) => {
    const Icon = item.icon;
    const isActive = location.pathname.startsWith(item.to);
    const isCart = item.to === "/dental-portal/cart";
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => {
          if (closeOnClick) setMenuOpen(false);
        }}
        style={isActive ? { backgroundColor: `${accentColor}16`, color: accentColor } : undefined}
        className={`flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          isActive ? "font-semibold" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Icon size={18} className="shrink-0" />
        <span className="truncate">{t(`dentalPortal.${item.labelKey}`)}</span>
        {isCart && badgeCount > 0 ? (
          <span className="ms-auto rounded-full px-2 py-0.5 text-xs font-bold text-white tabular-nums" style={{ backgroundColor: accentColor }}>
            {badgeCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 flex flex-col" style={{ "--portal-primary": accentColor, "--auth-accent": accentColor } as React.CSSProperties}>
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
          <Link
            to="/dental-portal/dashboard"
            className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 text-base sm:text-lg font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={{ color: accentColor }}
          >
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={brandTitle} onError={() => setLogoError(true)} className="size-8 shrink-0 rounded-lg border border-gray-200 bg-white object-cover" />
            ) : (
              <Stethoscope size={24} className="shrink-0" />
            )}
            <span className="min-w-0 truncate">{brandTitle}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">{navItems.map((item) => renderNavLink(item))}</nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <PortalPushToggle portal="dental" accentColor={accentColor} />
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <User size={16} className="text-gray-400 shrink-0" />
              <span className="font-medium text-gray-800 truncate max-w-[130px]">{dentist?.name || t("dentalPortal.layout.doctor")}</span>
              {dentist?.clinicName ? <span className="text-gray-400 truncate max-w-[120px]">— {dentist.clinicName}</span> : null}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <LogOut size={18} className="shrink-0" />
              <span className="hidden sm:inline">{t("dentalPortal.layout.logout")}</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden cursor-pointer"
              aria-label={t("dentalPortal.layout.menu")}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav className="space-y-1 border-t bg-white px-4 py-2 md:hidden">
            {navItems.map((item) => renderNavLink(item, true))}
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <LogOut size={18} />
              {t("dentalPortal.layout.logout")}
            </button>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-4 py-5 lg:py-8">
        <PortalInstallBanner
          portal="dental"
          companyId={branding.companyId}
          companyName={brandTitle}
          companyLogo={branding.logo}
          accentColor={accentColor}
          className="mb-4"
        />
        <Outlet />
      </main>

      <footer className="border-t bg-white py-4 text-center text-xs text-gray-400">{t("dentalPortal.layout.footer")}</footer>
    </div>
  );
};

export default DentalPortalLayout;
