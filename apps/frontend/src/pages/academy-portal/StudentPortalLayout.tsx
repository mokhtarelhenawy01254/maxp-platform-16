import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, BookOpen, LogIn, LogOut, User, Compass } from "lucide-react";
import { resolveBrandingLogoUrl, useCompanyBranding } from "../../hooks/useCompanyBranding";
import { clearPortalSession, extractCompanyIdFromToken, getActivePortalToken } from "../../utils/portalSessionManager";
import { PortalInstallBanner } from "../../components/common/PortalInstallBanner";
import { PortalPushToggle } from "../../components/common/PortalPushToggle";

interface StudentPortalLayoutProps {
  children: React.ReactNode;
}

const StudentPortalLayout: React.FC<StudentPortalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeToken = getActivePortalToken("student");
  const branding = useCompanyBranding(extractCompanyIdFromToken(activeToken));
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [studentPhone, setStudentPhone] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<boolean>(false);

  const portalTitle = branding.name ? `أكاديمية ${branding.name}` : "أكاديمية MaxP";
  const accentColor = branding.accent?.trim() || "";
  const resolvedLogo = !logoError ? resolveBrandingLogoUrl(branding.logo) : null;

  useEffect(() => {
    setLogoError(false);
  }, [branding.logo]);

  useEffect(() => {
    // Robots policy: public apex catalog/course pages are indexable; subdomain & private routes stay noindex.
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
    meta.content = isApex && !isPrivatePage ? "index, follow" : "noindex, nofollow";

    // حالة الدخول الحقيقية = وجود توكن العضو (مش مجرد حفظ الاسم بعد الدفع)
    setLoggedIn(Boolean(localStorage.getItem("studentToken")));
    setStudentPhone(localStorage.getItem("studentPhone"));
    setStudentName(localStorage.getItem("studentName"));
  }, [location.pathname]);

  // تتبع مسار جلسة العضو في صفحات الأكاديمية لحساب دقيق لمدة الزيارة ومصادر الإحالة
  useEffect(() => {
    try {
      import("../../storefront/utils/storefrontSessionTracker")
        .then(({ recordPageVisit }) => recordPageVisit(location.pathname + location.search))
        .catch(() => {});
    } catch {
      // Ignore tracker import failure
    }
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    clearPortalSession("student");
    setLoggedIn(false);
    setStudentPhone(null);
    setStudentName(null);
    navigate("/portal/catalog");
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);
  const catalogActive = isActive("/portal/catalog") || location.pathname === "/portal";
  const myCoursesActive = isActive("/portal/my-courses");
  const showInstallBanner = !location.pathname.includes("/lesson/");

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased"
      dir="rtl"
      style={accentColor ? ({ "--portal-primary": accentColor, "--auth-accent": accentColor } as React.CSSProperties) : undefined}
    >
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xs border-b border-border/70 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <Link to="/portal/catalog" className="flex min-w-0 items-center gap-2.5 rounded-xl text-foreground hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {resolvedLogo ? (
                <img src={resolvedLogo} alt={portalTitle} onError={() => setLogoError(true)} className="w-9 h-9 shrink-0 rounded-xl object-contain bg-background border border-border/70 p-0.5 shadow-2xs" />
              ) : (
                <div className="w-9 h-9 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs" style={accentColor ? { backgroundColor: accentColor } : undefined}>
                  <GraduationCap className="w-5 h-5" />
                </div>
              )}
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-bold text-sm sm:text-base tracking-tight leading-tight">{portalTitle}</span>
                <span className="truncate text-[11px] text-muted-foreground font-medium">أكاديمية أصحاب الأعمال</span>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-1.5 mr-2">
              <Link
                to="/portal/catalog"
                style={catalogActive && accentColor ? { backgroundColor: `${accentColor}16`, color: accentColor, borderColor: `${accentColor}33` } : undefined}
                className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  catalogActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>الكتالوج</span>
              </Link>
              <Link
                to="/portal/my-courses"
                style={myCoursesActive && accentColor ? { backgroundColor: `${accentColor}16`, color: accentColor, borderColor: `${accentColor}33` } : undefined}
                className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  myCoursesActive ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>كورساتي</span>
              </Link>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {loggedIn ? <PortalPushToggle portal="student" accentColor={accentColor || undefined} /> : null}
            {loggedIn ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-foreground text-right truncate max-w-[140px]">{studentName || "عضو MaxP"}</span>
                  <span className="text-[11px] font-mono text-muted-foreground text-right tabular-nums" dir="ltr">{studentPhone}</span>
                </div>
                <div
                  className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20"
                  style={accentColor ? { backgroundColor: `${accentColor}18`, color: accentColor, borderColor: `${accentColor}33` } : undefined}
                >
                  <User className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                  className="min-h-[44px] min-w-[44px] p-2 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/portal/login"
                style={accentColor ? { backgroundColor: accentColor } : undefined}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>دخول الأعضاء</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6 pb-20 sm:pb-6">
        {showInstallBanner ? (
          <PortalInstallBanner
            portal="student"
            companyId={branding.companyId}
            companyName={portalTitle}
            companyLogo={branding.logo}
            accentColor={accentColor || undefined}
            className="mb-5"
          />
        ) : null}
        {children}
      </main>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xs border-t border-border/70 shadow-lg">
        <div className="grid grid-cols-2 min-h-[52px]">
          <Link
            to="/portal/catalog"
            style={catalogActive && accentColor ? { color: accentColor } : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              catalogActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>الكتالوج</span>
          </Link>
          <Link
            to="/portal/my-courses"
            style={myCoursesActive && accentColor ? { color: accentColor } : undefined}
            className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              myCoursesActive ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>كورساتي</span>
          </Link>
        </div>
      </nav>

      <footer className="mt-auto border-t border-border/70 bg-card py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="w-4 h-4 shrink-0 text-primary" style={accentColor ? { color: accentColor } : undefined} />
            <span className="font-semibold text-foreground truncate">{portalTitle}</span>
            <span>—</span>
            <span className="truncate">أكاديمية تعليمية مخصصة لأصحاب المشاريع والشركات</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] tabular-nums">
            <span>جميع الحقوق محفوظة {branding.name ? `لشركة ${branding.name} ومنصة MaxP` : "لمنصة MaxP"} © {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentPortalLayout;
