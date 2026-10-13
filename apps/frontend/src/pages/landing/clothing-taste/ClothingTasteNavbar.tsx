import React from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { WHATSAPP_CONSULT_URL } from "./clothingTasteData";

interface ClothingTasteNavbarProps {
  onFreeRegister: () => void;
  onLogin: () => void;
}

export const ClothingTasteNavbar: React.FC<ClothingTasteNavbarProps> = ({
  onFreeRegister,
  onLogin,
}) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand & Boutique Identity */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <span className="font-black text-lg tracking-tight text-[#141416] font-sans">
              MaxP <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/5 border border-black/10 text-zinc-800">الأزياء والملابس</span>
            </span>
          </div>

          <span className="hidden lg:inline-block h-4 w-px bg-black/10" />

          {/* Quick Anchor Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs text-zinc-600 font-medium">
            <button type="button" onClick={() => scrollTo("editorial-hero")} className="hover:text-black transition-colors">
              المزايا
            </button>
            <button type="button" onClick={() => scrollTo("lookbook")} className="hover:text-black transition-colors">
              الكاشير والفروع
            </button>
            <button type="button" onClick={() => scrollTo("tools-matrix")} className="hover:text-black transition-colors">
              الأدوات (17)
            </button>
            <button type="button" onClick={() => scrollTo("pricing")} className="hover:text-black transition-colors">
              الأسعار
            </button>
            <button type="button" onClick={() => scrollTo("consultation")} className="hover:text-black transition-colors">
              طلب استشارة
            </button>
          </nav>
        </div>

        {/* Action Controls & Navigation CTAs */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Direct WhatsApp Concierge */}
          <a
            href={WHATSAPP_CONSULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-black transition-colors px-2 py-1 font-medium"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>استشارة واتساب</span>
          </a>

          {/* Login Link */}
          <button
            type="button"
            onClick={onLogin}
            className="hidden sm:inline-block text-xs text-zinc-600 hover:text-black transition-colors px-2 py-1 font-medium"
          >
            تسجيل الدخول
          </button>

          {/* Primary Dominant CTA */}
          <button
            type="button"
            onClick={onFreeRegister}
            className="cst-nav-cta-desktop cst-btn-primary text-xs py-2 px-4 whitespace-nowrap min-h-[38px] font-bold"
          >
            <span>ابدأ متجرك مجاناً (0 ج.م)</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
};
