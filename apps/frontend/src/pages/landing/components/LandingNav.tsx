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
    { label: "الأنظمة الستة", href: "#systems-slider" },
    { label: "مسار اليوم 24h", href: "#order-flow" },
    { label: "التكاملات", href: "#integrations" },
    { label: "حاسبة الوفر", href: "#calculator" },
    { label: "الأسئلة الشائعة", href: "#faq" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-3 sm:pt-5 pointer-events-none">
      <div className="mx-auto max-w-6xl pointer-events-auto">
        {/* Single-Depth Pure Glass Nav (Zero Double-Bezel) */}
        <nav
          className={`rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all duration-300 ${
            scrolled
              ? "bg-black/80 border border-white/[0.12] shadow-2xl backdrop-blur-xl"
              : "bg-black/40 border border-white/[0.06] backdrop-blur-md"
          }`}
          aria-label="التنقل الرئيسي"
        >
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-8 h-8 rounded-full bg-white text-black font-black text-sm flex items-center justify-center tracking-tighter">
              P
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-white text-base tracking-tight">
                MAX P
              </span>
              <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-2 py-0.5 rounded-full hidden sm:inline-block">
                Business OS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              onClick={handleLeadClick("nav_login", "/login")}
              onMouseEnter={onPreloadAuth}
              onFocus={onPreloadAuth}
              className="hidden sm:inline-flex text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              تسجيل الدخول
            </Link>

            <Link
              to="/auth/register"
              onClick={handleLeadClick("nav_register", "/auth/register")}
              onMouseEnter={onPreloadRegister}
              onFocus={onPreloadRegister}
              className="inline-flex items-center gap-1.5 rounded-full bg-white text-black font-bold px-4 py-1.5 text-xs hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <span>تجربة مجانية</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="فتح القائمة"
              className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu (Clean & Open) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 rounded-2xl bg-black/95 border border-white/10 backdrop-blur-2xl p-4 shadow-2xl space-y-3"
            >
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm font-medium text-zinc-300 hover:text-white py-2 px-3 rounded-lg hover:bg-white/[0.05] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  to="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-bold text-black bg-white px-4 py-2 rounded-full"
                >
                  ابدأ مجاناً
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default LandingNav;
