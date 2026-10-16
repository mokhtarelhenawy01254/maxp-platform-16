import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Wallet,
  Users,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParentLayoutProps {
  children: React.ReactNode;
}

export const ParentLayout: React.FC<ParentLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('parentToken');

  const getParent = () => {
    try {
      return JSON.parse(localStorage.getItem('parent') || '{}');
    } catch {
      return {};
    }
  };

  const parent = getParent();

  useEffect(() => {
    if (!token) navigate('/parent/login', { replace: true });
  }, [token, navigate]);

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
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mobile Header Bar */}
      <header className="bg-card border-b border-border/60 lg:hidden sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="القائمة"
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <Link to="/parent/dashboard" className="text-sm font-bold text-primary flex items-center gap-1.5">
            <GraduationCap className="size-4" />
            <span>بوابة ولي الأمر</span>
          </Link>
          <div className="size-8" />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop & Mobile Drawer Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 right-0 z-40 w-64 h-screen bg-card border-l rtl:border-r rtl:border-l-0 border-border/60 shadow-2xs flex flex-col transition-transform duration-200 select-none",
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          )}
        >
          <div className="p-5 border-b border-border/60">
            <Link to="/parent/dashboard" className="text-base font-bold text-primary flex items-center gap-2 mb-1">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <GraduationCap className="size-4" />
              </span>
              <span>بوابة ولي الأمر</span>
            </Link>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {parent.firstName ? `${parent.firstName} ${parent.lastName || ''}` : 'ولي الأمر'}
            </p>
          </div>

          <nav className="p-3 space-y-1 flex-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-[0.98]",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-2xs"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border/60">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3.5 py-2 w-full rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-4 shrink-0" />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 lg:p-6 min-h-screen min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ParentLayout;
