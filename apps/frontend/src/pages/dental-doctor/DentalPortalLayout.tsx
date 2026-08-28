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

import {
  cartCount,
  clearPortalAuth,
  getPortalToken,
  getStoredDentist,
} from "./shared";

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
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [badgeCount, setBadgeCount] = useState(() => cartCount());
  const navigate = useNavigate();
  const location = useLocation();
  const dentist = getStoredDentist();

  useEffect(() => {
    const update = () => setBadgeCount(cartCount());
    window.addEventListener("dental-cart-changed", update);
    return () => window.removeEventListener("dental-cart-changed", update);
  }, []);

  if (!getPortalToken()) {
    return <Navigate to="/dental-portal/login" replace />;
  }

  const handleLogout = () => {
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
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <Icon size={18} />
        {t(`dentalPortal.${item.labelKey}`)}
        {isCart && badgeCount > 0 ? (
          <span className="ms-auto rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
            {badgeCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link
            to="/dental-portal/dashboard"
            className="flex items-center gap-2 text-lg font-bold text-indigo-700"
          >
            <Stethoscope size={24} />
            <span>{t("dentalPortal.portalName")}</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => renderNavLink(item))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <User size={16} className="text-gray-400" />
              <span className="font-medium text-gray-800">
                {dentist?.name || t("dentalPortal.layout.doctor")}
              </span>
              {dentist?.clinicName ? (
                <span className="text-gray-400">— {dentist.clinicName}</span>
              ) : null}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">
                {t("dentalPortal.layout.logout")}
              </span>
            </button>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label={t("dentalPortal.layout.menu")}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="space-y-1 border-t bg-white px-4 py-2 md:hidden">
            {navItems.map((item) => renderNavLink(item, true))}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={18} />
              {t("dentalPortal.layout.logout")}
            </button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 lg:py-8">
        <Outlet />
      </main>

      <footer className="border-t bg-white py-4 text-center text-xs text-gray-400">
        {t("dentalPortal.layout.footer")}
      </footer>
    </div>
  );
};

export default DentalPortalLayout;