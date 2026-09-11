import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowLeft, Sparkles } from "lucide-react";

interface LandingNavProps {
  onPreloadAuth?: () => void;
  onPreloadRegister?: () => void;
}

export const LandingNav: React.FC<LandingNavProps> = ({
  onPreloadAuth,
  onPreloadRegister,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "الأدوات", href: "#tools" },
    { label: "المنصة الذكية", href: "#modules" },
    { label: "التكاملات", href: "#integrations" },
    { label: "لماذا Max P؟", href: "#comparison" },
    { label: "حاسبة التوفير", href: "#calculator" },
    { label: "الأسئلة الشائعة", href: "#faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-3 sm:pt-4 pointer-events-none">
      <nav
        className={`pointer-events-auto mx-auto max-w-6xl transition-all duration-300 rounded-2xl sm:rounded-full border px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between ${
          scrolled
            ? "bg-slate-950/85 backdrop-blur-xl border-white/15 shadow-2xl shadow-black/40"
            : "bg-slate-950/60 backdrop-blur-md border-white/10"
        }`}
        aria-label="التنقل الرئيسي"
      >
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-amber-600 text-white font-black text-xs shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
            P
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-wider text-base text-white flex items-center gap-1.5">
              MAX P
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                AI OS
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-slate-300 hover:text-white transition-colors py-1 hover:border-b-2 hover:border-red-500/80"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/auth/login"
            className="hidden sm:inline-flex text-xs font-bold text-slate-300 hover:text-white transition-colors px-3 py-2"
            onMouseEnter={onPreloadAuth}
            onFocus={onPreloadAuth}
          >
            تسجيل دخول
          </Link>

          <Link
            to="/auth/register"
            className="relative group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-600 via-red-500 to-amber-600 px-4 sm:px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:shadow-red-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden"
            onMouseEnter={onPreloadRegister}
            onFocus={onPreloadRegister}
          >
            <span className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500 -skew-x-12" />
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>ابدأ مجاناً</span>
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="القائمة"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto lg:hidden mx-auto max-w-6xl mt-2 rounded-2xl bg-slate-950/95 backdrop-blur-2xl border border-white/15 p-5 shadow-2xl space-y-4"
          >
            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-medium text-slate-200 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-center"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
              <Link
                to="/auth/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center text-xs font-bold text-slate-300 rounded-xl bg-white/5 border border-white/10"
              >
                تسجيل دخول
              </Link>
              <Link
                to="/auth/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2.5 text-center text-xs font-bold text-white rounded-xl bg-gradient-to-r from-red-600 to-amber-600 shadow-md shadow-red-600/30"
              >
                إنشاء حساب مجاناً
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
