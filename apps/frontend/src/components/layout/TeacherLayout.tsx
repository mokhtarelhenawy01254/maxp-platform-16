import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays, Wallet, Clock, LayoutDashboard, LogOut, Menu, X, User
} from "lucide-react";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const teacher = JSON.parse(localStorage.getItem('teacher') || '{}');

  const navItems = [
    { path: '/teacher/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { path: '/teacher/schedule', label: 'جدول الحصص', icon: CalendarDays },
    { path: '/teacher/payments', label: 'المرتبات', icon: Wallet },
    { path: '/teacher/availability', label: 'أوقات العمل', icon: Clock },
  ];

  const handleLogout = () => {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacher');
    navigate('/teacher/login', { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <header className="bg-white shadow-sm border-b lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-md hover:bg-gray-100">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link to="/teacher/dashboard" className="text-lg font-bold text-red-600">بوابة المدرس</Link>
          <div className="w-10" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'block' : 'hidden'} lg:block fixed lg:sticky top-0 right-0 z-40 w-64 h-screen bg-white shadow-lg border-l`}>
          <div className="p-6 border-b">
            <Link to="/teacher/dashboard" className="text-xl font-bold text-red-600 block mb-1">بوابة المدرس</Link>
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <User size={16} />
              <span>{teacher.name || 'مدرس'}</span>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-red-50 text-red-700' : 'text-gray-700 hover:bg-gray-100'
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

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
