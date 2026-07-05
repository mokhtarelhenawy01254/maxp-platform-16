import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, Wallet, Users, LayoutDashboard, LogOut, Menu, X, ShoppingCart } from "lucide-react";

interface ParentLayoutProps {
  children: React.ReactNode;
}

const ParentLayout: React.FC<ParentLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const parent = JSON.parse(localStorage.getItem('parent') || '{}');

  const navItems = [
    { path: '/parent/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { path: '/parent/children', label: 'أبنائي', icon: Users },
    { path: '/parent/sessions', label: 'الحصص', icon: CalendarDays },
    { path: '/parent/enrollments', label: 'التسجيلات', icon: Wallet },
    { path: '/parent/wallet', label: 'المحفظة', icon: Wallet },
    { path: '/parent/buy-package', label: 'شراء باقة', icon: ShoppingCart },
  ];

  const handleLogout = () => {
    localStorage.removeItem('parentToken');
    localStorage.removeItem('parent');
    navigate('/parent/login', { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-gray-100">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link to="/parent/dashboard" className="text-lg font-bold text-emerald-600">بوابة ولي الأمر</Link>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:sticky top-0 right-0 z-40 w-64 h-screen bg-white shadow-lg border-l`}>
          <div className="p-6 border-b">
            <Link to="/parent/dashboard" className="text-xl font-bold text-emerald-600 block mb-1">بوابة ولي الأمر</Link>
            <p className="text-sm text-gray-500">{parent.firstName} {parent.lastName}</p>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}>
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
              <LogOut size={20} />
              تسجيل خروج
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="flex-1 p-4 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ParentLayout;
