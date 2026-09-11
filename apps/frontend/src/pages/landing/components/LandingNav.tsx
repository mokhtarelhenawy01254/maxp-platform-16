import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowLeft } from "lucide-react";
import { trackPlatformSiteLead } from "../../../utils/platformSiteMetaPixel";

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

  const handleLeadClick =
    (eventSource: string, destination: string) => () => {
      trackPlatformSiteLead(eventSource, {
        destination,
        landing_variant: "enterprise-os",
      });
    };

  const navLinks = [
    { label: "المنظومة", href: "#tools" },
    { label: "جولة حية", href: "#modules" },
    { label: "التكاملات", href: "#integrations" },
    { label: "الأثر والفرق", href: "#comparison" },
    { label: "حاسبة الوفورات", href: "#calculator" },
    { label: "الأسئلة الشائعة", href: "#faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 sm:pt-6 pointer-events-none">
      <div className="mx-auto max-w-5xl">
        {/* Double-Bezel Island Nav */}
        <div
          className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] rounded-full p-1 sm:p-1.5 ${
            scrolled
              ? "bg-white/[0.06] border border-white/[0.12] shadow-2xl shadow-black/70 backdrop-blur-2xl"
              : "bg-white/[0.03] border border-white/[0.07] backdrop-blur-md"
          }`}
        >
          <nav
            className="rounded-full bg-zinc-950/80 px-4 sm:px-6 py-2 flex items-center justify-between"
            aria-label="التنقل الرئيسي"
          >
            {/* Brand Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border border-white/10 text-white font-black text-xs group-hover:border-white/25 transition-colors">
                P
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm sm:text-base text-zinc-100 font-mono">
                  MAX P
                </span>
                <span className="text-[10px] text-zinc-400 font-mono border-r border-zinc-800 pr-2 mr-1 hidden sm:inline-block">
                  Business OS
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-7">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                to="/auth/login"
                className="hidden sm:inline-block text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5"
                onMouseEnter={onPreloadAuth}
                onFocus={onPreloadAuth}
              >
                تسجيل الدخول
              </Link>

              {/* Island Button with Nested Trailing Icon */}
              <Link
                to="/auth/register"
                onClick={handleLeadClick("nav_cta_register", "/auth/register")}
                className="group inline-flex items-center justify-between rounded-full bg-zinc-100 hover:bg-white text-zinc-950 font-bold px-4 sm:px-5 py-2 text-xs transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] shadow-md shadow-white/5"
                onMouseEnter={onPreloadRegister}
                onFocus={onPreloadRegister}
              >
                <span>تجربة مجانية</span>
                <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center mr-2 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-0.5">
                  <ArrowLeft className="w-3 h-3" />
                </span>
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="القائمة"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="pointer-events-auto lg:hidden mt-2 p-1.5 rounded-3xl bg-white/[0.06] border border-white/[0.1] backdrop-blur-2xl shadow-2xl"
            >
              <div className="rounded-[calc(1.5rem-0.375rem)] bg-zinc-950 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-center"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="pt-3 border-t border-white/10 flex items-center gap-3">
                  <Link
                    to="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 py-2.5 text-center text-xs font-medium text-zinc-300 rounded-xl bg-white/5 border border-white/10"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLeadClick("nav_mobile_cta_register", "/auth/register")();
                    }}
                    className="flex-1 py-2.5 text-center text-xs font-bold text-zinc-950 rounded-xl bg-white hover:bg-zinc-100 shadow"
                  >
                    بدء التشغيل
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
