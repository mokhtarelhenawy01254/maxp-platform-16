// @vitest-environment jsdom
/**
 * Shipping Client Portal Shell (SHIP-W2C)
 * Internal navigation — No top navbar (NAV-1 Law compliant)
 */
import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { PortalPushToggle } from '../../components/common/PortalPushToggle';
import { tokenManager } from '../../utils/tokenManager';

const NAV_ITEMS = [
  { to: '/client-portal/shipping', label: 'لوحة التحكم', end: true },
  { to: '/client-portal/shipping/shipments', label: 'شحناتي' },
  { to: '/client-portal/shipping/new', label: 'شحنة جديدة' },
  { to: '/client-portal/shipping/pickups', label: 'البيكاب' },
  { to: '/client-portal/shipping/settlements', label: 'التسويات والكشوف' },
  { to: '/client-portal/shipping/bulk', label: 'رفع مجمّع' },
];

export default function ClientPortalShell() {
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      tokenManager.clearTokens();
    } catch {}
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    } catch {}
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-semibold text-gray-900 text-base">بوابة العميل — الشحن</span>
        <div className="flex items-center gap-2">
          <PortalPushToggle portal="client" />
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-48 bg-white border-l border-gray-200 flex flex-col py-4 gap-1 shrink-0">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-2.5 text-sm font-medium rounded-none transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
