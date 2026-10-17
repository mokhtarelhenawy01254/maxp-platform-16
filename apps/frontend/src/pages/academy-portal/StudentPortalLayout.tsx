import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, BookOpen, LogIn, LogOut, User, Compass } from "lucide-react";
import { useCompanyBranding } from "../../hooks/useCompanyBranding";

interface StudentPortalLayoutProps {
  children: React.ReactNode;
}

const StudentPortalLayout: React.FC<StudentPortalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const branding = useCompanyBranding();
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [studentPhone, setStudentPhone] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);

  const portalTitle = branding.name ? `أكاديمية ${branding.name}` : "أكاديمية MaxP";

  useEffect(() => {
    // Robots indexing policy:
    // 1. Subdomain tenant portals (*.maxp.online) remain strictly noindex until future rollout.
    // 2. Private portal pages on apex (/portal/login, /portal/my-courses, lesson player) remain strictly noindex.
    // 3. Public catalog and course landing pages on apex (maxp.online) are indexable (index, follow).
    const host = (typeof window !== "undefined" ? window.location.hostname || "" : "").toLowerCase();
    const isApex = host === "maxp.online" || host === "www.maxp.online" || host === "localhost" || host === "127.0.0.1";
    const path = location.pathname;
    const isPrivatePage =
      path === "/portal/login" ||
      path.startsWith("/portal/login/") ||
      path === "/portal/my-courses" ||
      path.startsWith("/portal/my-courses/") ||
      path.includes("/lesson/") ||
      path.includes("/learn/") ||
      path.includes("/watch/");

    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }

    if (isApex && !isPrivatePage) {
      meta.content = "index, follow";
    } else {
      meta.content = "noindex, nofollow";
    }

    // 🔒 حالة الدخول الحقيقية = وجود توكن الطالب (مش مجرد حفظ الاسم بعد الدفع)
    setLoggedIn(Boolean(localStorage.getItem("studentToken")));
    setStudentPhone(localStorage.getItem("studentPhone"));
    setStudentName(localStorage.getItem("studentName"));
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentPhone");
    localStorage.removeItem("studentName");
    setLoggedIn(false);
    setStudentPhone(null);
    setStudentName(null);
    navigate("/portal/catalog");
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xs border-b border-border/70 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-6">
            <Link to="/portal/catalog" className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity">
              {branding.logo ? (
                <img
                  src={branding.logo}
                  alt={portalTitle}
                  className="w-9 h-9 rounded-xl object-contain bg-background border border-border/70 p-0.5 shadow-2xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-bold text-sm sm:text-base tracking-tight leading-tight">{portalTitle}</span>
                <span className="text-[11px] text-muted-foreground font-medium">بوابة الطالب الذكية</span>
              </div>
            </Link>

            {/* Main Nav Links */}
            <nav className="hidden sm:flex items-center gap-1.5 mr-2">
              <Link
                to="/portal/catalog"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive("/portal/catalog") || location.pathname === "/portal"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>الكتالوج</span>
              </Link>
              <Link
                to="/portal/my-courses"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive("/portal/my-courses")
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>كورساتي</span>
              </Link>
            </nav>
          </div>

          {/* Right Controls: User Profile or Login */}
          <div className="flex items-center gap-2.5">
            {loggedIn ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-foreground text-right">{studentName || "طالب ماكس بي"}</span>
                  <span className="text-[11px] font-mono text-muted-foreground text-right tabular-nums" dir="ltr">{studentPhone}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                  <User className="w-4 h-4" />
                </div>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/portal/login"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs active:scale-[0.98]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول الطالب</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Surface */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Nav (الموبايل مش ليه نافيجيشن غير من هنا) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xs border-t border-border/70 shadow-lg">
        <div className="grid grid-cols-2 h-14">
          <Link
            to="/portal/catalog"
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              isActive("/portal/catalog") || location.pathname === "/portal"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>الكتالوج</span>
          </Link>
          <Link
            to="/portal/my-courses"
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
              isActive("/portal/my-courses") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>كورساتي</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/70 bg-card py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{portalTitle}</span>
            <span>—</span>
            <span>بوابة تعليمية مخصصة لأصحاب المشاريع والطلاب</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono tabular-nums">
            <span>جميع الحقوق محفوظة {branding.name ? `لشركة ${branding.name} ومنصة MaxP` : "لمنصة MaxP"} © {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentPortalLayout;
