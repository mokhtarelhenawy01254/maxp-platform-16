import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, BookOpen, LogIn, LogOut, User, Compass } from "lucide-react";

interface StudentPortalLayoutProps {
  children: React.ReactNode;
}

const StudentPortalLayout: React.FC<StudentPortalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [studentPhone, setStudentPhone] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);

  useEffect(() => {
    // Enforce noindex on production for student portal until official rollout
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";

    const phone = localStorage.getItem("studentPhone");
    const name = localStorage.getItem("studentName");
    setStudentPhone(phone);
    setStudentName(name);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("studentToken");
    localStorage.removeItem("studentPhone");
    localStorage.removeItem("studentName");
    setStudentPhone(null);
    setStudentName(null);
    navigate("/portal/catalog");
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-6">
            <Link to="/portal/catalog" className="flex items-center gap-2.5 text-slate-900 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight leading-tight">أكاديمية MaxP</span>
                <span className="text-[11px] text-slate-500 font-medium">بوابة الطالب الذكية</span>
              </div>
            </Link>

            {/* Main Nav Links */}
            <nav className="hidden sm:flex items-center gap-1.5 mr-2">
              <Link
                to="/portal/catalog"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive("/portal/catalog") || location.pathname === "/portal"
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>الكتالوج</span>
              </Link>
              <Link
                to="/portal/my-courses"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive("/portal/my-courses")
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>كورساتي</span>
              </Link>
            </nav>
          </div>

          {/* Right Controls: User Profile or Login */}
          <div className="flex items-center gap-2.5">
            {studentPhone ? (
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 text-right">{studentName || "طالب ماكس بي"}</span>
                  <span className="text-[11px] font-mono text-slate-500 text-right dir-ltr tabular-nums">{studentPhone}</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200">
                  <User className="w-4 h-4" />
                </div>
                <button
                  onClick={handleLogout}
                  title="تسجيل الخروج"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/portal/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>دخول الطالب</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Surface */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-slate-700">أكاديمية MaxP</span>
            <span>—</span>
            <span>بوابة تعليمية مخصصة لأصحاب المشاريع</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>جميع الحقوق محفوظة لمنصة MaxP © {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentPortalLayout;
