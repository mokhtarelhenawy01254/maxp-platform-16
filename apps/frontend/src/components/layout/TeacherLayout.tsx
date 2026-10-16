import React, { useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Wallet,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User,
  GraduationCap,
} from "lucide-react";

interface TeacherLayoutProps {
  children: React.ReactNode;
}

const TeacherLayout: React.FC<TeacherLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const teacher = useMemo(() => {
    try {
      const raw = localStorage.getItem('teacher');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const navItems = [
    { path: '/teacher/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { path: '/teacher/schedule', label: 'جدول الحصص', icon: CalendarDays },
    { path: '/teacher/payments', label: 'المرتبات', icon: Wallet },
    { path: '/teacher/availability', label: 'أوقات العمل', icon: Clock },
  ];

  const handleLogout = () => {
    try {
      localStorage.removeItem('teacherToken');
      localStorage.removeItem('teacher');
    } catch {}
    navigate('/teacher/login', { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Mobile header */}
      <header className="bg-card/95 backdrop-blur-md border-b border-border/70 lg:hidden sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label={sidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link
            to="/teacher/dashboard"
            className="flex items-center gap-2 text-sm font-bold text-foreground"
          >
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <GraduationCap size={18} />
            </div>
            <span>بوابة المدرس</span>
          </Link>
          <div className="w-8" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'block' : 'hidden'
          } lg:block fixed lg:sticky top-0 right-0 z-40 w-64 h-screen bg-card border-l border-border/70 shadow-sm flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-5 border-b border-border/60">
            <Link
              to="/teacher/dashboard"
              className="flex items-center gap-2.5 text-base font-bold text-foreground"
            >
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <GraduationCap size={20} />
              </div>
              <span className="tracking-tight">بوابة المدرس</span>
            </Link>
            <div className="flex items-center gap-2 mt-3.5 p-2 rounded-lg bg-muted/40 text-xs text-muted-foreground border border-border/50">
              <User size={14} className="text-primary flex-shrink-0" />
              <span className="truncate font-medium text-foreground">
                {teacher.name || 'مدرس'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="p-3 border-t border-border/60">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
