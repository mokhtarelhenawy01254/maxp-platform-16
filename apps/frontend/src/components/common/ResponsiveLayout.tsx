import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  Bell,
  User,
  Search,
  Settings,
  BarChart3,
  MessageSquare,
  Users,
  ShoppingBag,
  Package,
  TrendingUp,
  HelpCircle,
  FileText,
  Layers,
} from "lucide-react";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  title = "لوحة التحكم",
  showSearch = true,
  showNotifications = true,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const navigationItems = [
    { name: "لوحة التحكم", href: "/company-dashboard", icon: BarChart3 },
    { name: "المحادثات", href: "/conversations", icon: MessageSquare },
    { name: "العملاء", href: "/customers", icon: Users },
    { name: "المنتجات", href: "/products", icon: ShoppingBag },
    { name: "الطلبات", href: "/orders", icon: Package },
    { name: "التقارير", href: "/analytics/orders", icon: TrendingUp },
    { name: "الأسئلة الشائعة", href: "/admin/faqs", icon: HelpCircle },
    { name: "السياسات", href: "/admin/policies", icon: FileText },
    { name: "الإعدادات", href: "/settings", icon: Settings },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mobile Header */}
      <header className="bg-card/95 backdrop-blur-md border-b border-border/70 lg:hidden sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-base font-bold text-foreground">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {showNotifications && (
              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted relative transition cursor-pointer"
                aria-label="الإشعارات"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
              </button>
            )}
            <button
              type="button"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
              aria-label="الملف الشخصي"
            >
              <User size={18} />
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                size={16}
              />
              <input
                type="text"
                placeholder="البحث..."
                className="w-full pl-3 pr-9 py-2 border border-border/70 rounded-xl bg-muted/40 text-xs focus:ring-2 focus:ring-primary/40 focus:border-transparent text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-card lg:border-l lg:border-border/70 z-30">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Logo */}
            <div className="flex items-center gap-2.5 h-16 px-6 border-b border-border/60">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers size={20} />
              </div>
              <h1 className="text-base font-bold text-foreground tracking-tight">منصة التواصل</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-muted-foreground rounded-xl hover:bg-muted/60 hover:text-foreground transition-colors group"
                  >
                    <Icon size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="flex-shrink-0 p-4 border-t border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-xs">
                  <User size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">أحمد محمد</p>
                  <p className="text-[11px] text-muted-foreground truncate">مدير النظام</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex flex-col w-64 h-full bg-card border-l border-border/70 shadow-2xl">
              {/* Logo */}
              <div className="flex items-center gap-2.5 h-16 px-6 border-b border-border/60">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Layers size={20} />
                </div>
                <h1 className="text-base font-bold text-foreground">منصة التواصل</h1>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold text-muted-foreground rounded-xl hover:bg-muted/60 hover:text-foreground transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon size={16} />
                      <span>{item.name}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 lg:mr-64">
          {/* Desktop Header */}
          <header className="hidden lg:flex lg:items-center lg:justify-between lg:px-6 lg:py-4 lg:bg-card/95 lg:backdrop-blur-md lg:border-b lg:border-border/70 sticky top-0 z-20">
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
              {showSearch && (
                <div className="relative">
                  <Search
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="البحث..."
                    className="w-72 pl-3 pr-9 py-2 border border-border/70 rounded-xl bg-muted/40 text-xs focus:ring-2 focus:ring-primary/40 focus:border-transparent text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              )}

              {showNotifications && (
                <button
                  type="button"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted relative transition cursor-pointer"
                  aria-label="الإشعارات"
                >
                  <Bell size={18} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                </button>
              )}

              <button
                type="button"
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                aria-label="الإعدادات"
              >
                <Settings size={18} />
              </button>

              <div className="flex items-center gap-2.5 ps-3 border-s border-border/60">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-xs">
                  <User size={16} />
                </div>
                <span className="text-xs font-semibold text-foreground">
                  أحمد محمد
                </span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default ResponsiveLayout;
