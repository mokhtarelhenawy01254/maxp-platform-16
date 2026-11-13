import React from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { ShoppingBag, FileText, Tag, PlusCircle, Building2 } from 'lucide-react';
import { PortalPushToggle } from '../../components/common/PortalPushToggle';

export const WholesalePortalHub: React.FC = () => {
  const location = useLocation();

  const tabs = [
    { to: '/wholesale-portal/orders', label: 'طلباتي', icon: ShoppingBag },
    { to: '/wholesale-portal/statement', label: 'رصيدي وكشف حسابي', icon: FileText },
    { to: '/wholesale-portal/prices', label: 'أسعاري', icon: Tag },
    { to: '/wholesale-portal/new-order', label: 'طلب جديد', icon: PlusCircle },
  ];

  // If directly at /wholesale-portal, redirect to /wholesale-portal/orders
  if (location.pathname === '/wholesale-portal' || location.pathname === '/wholesale-portal/') {
    return <Navigate to="/wholesale-portal/orders" replace />;
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Top Wholesale Portal Navigation Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname.startsWith(tab.to);

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </NavLink>
            );
          })}
          <PortalPushToggle portal="wholesale" className="ms-auto shrink-0" />
        </div>
      </div>

      {/* Nested Route View */}
      <Outlet />
    </div>
  );
};

export default WholesalePortalHub;
