import React from "react";
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
  HeartPulse,
  Users,
  ChevronLeft,
} from "lucide-react";

interface DoctorLayoutProps {
  children: React.ReactNode;
}

const DoctorLayout: React.FC<DoctorLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const doctor = JSON.parse(localStorage.getItem("doctor") || "{}");

  const navItems = [
    { path: "/doctor/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
    { path: "/doctor/schedule", label: "الجدول الأسبوعي", icon: CalendarDays },
    { path: "/doctor/patients", label: "مرضاي", icon: Users },
    { path: "/doctor/payments", label: "المدفوعات", icon: Wallet },
    { path: "/doctor/availability", label: "أوقات العمل", icon: Clock },
  ];

  const handleLogout = () => {
    localStorage.removeItem("doctorToken");
    localStorage.removeItem("doctor");
    navigate("/doctor/login", { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground antialiased font-sans">
      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-xl border border-border/70 p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground active:scale-95"
          aria-label="القائمة الجانبية"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link to="/doctor/dashboard" className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <HeartPulse size={16} />
          </div>
          <span>بوابة الطبيب</span>
        </Link>
        <div className="w-9" />
      </header>

      <div className="flex">
        {/* Desktop & Mobile Sidebar Chassis */}
        <aside
          className={`${
            sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
          } fixed inset-y-0 right-0 z-40 flex w-64 flex-col border-l border-border/70 bg-card transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen`}
        >
          {/* Header & Doctor ID Card */}
          <div className="border-b border-border/60 p-5">
            <Link
              to="/doctor/dashboard"
              className="flex items-center gap-2.5 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-xs">
                <HeartPulse size={18} />
              </div>
              <div>
                <span className="block text-sm leading-tight">بوابة الطبيب</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Clinical Console
                </span>
              </div>
            </Link>

            {/* Doctor Profile Telemetry Strip */}
            <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 font-mono text-xs font-semibold text-primary">
                  <User size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">
                    {doctor.title ? `${doctor.title} ` : ""}
                    {doctor.name || "طبيب العيادة"}
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>متصل الآن</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 p-3.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? "border border-primary/20 bg-primary/10 font-semibold text-primary shadow-xs"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? "text-primary" : "text-muted-foreground"} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronLeft size={14} className="text-primary/70" />}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer Logout */}
          <div className="border-t border-border/60 p-3.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-background px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/20 active:scale-[0.98]"
            >
              <LogOut size={15} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>

        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Viewport Single-Surface Chassis */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DoctorLayout;
