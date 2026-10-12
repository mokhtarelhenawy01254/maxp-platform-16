import React from "react";
import { ArrowLeft, ShieldCheck, MessageCircle, SlidersHorizontal } from "lucide-react";
import { TasteMode } from "./types";
import { WHATSAPP_CONSULT_URL } from "./clothingTasteData";

interface ClothingTasteNavbarProps {
  onFreeRegister: () => void;
  onLogin: () => void;
  onOpenAudit: () => void;
  mode: TasteMode;
  onToggleMode: (mode: TasteMode) => void;
  showDevTools?: boolean;
}

export const ClothingTasteNavbar: React.FC<ClothingTasteNavbarProps> = ({
  onFreeRegister,
  onLogin,
  onOpenAudit,
  mode,
  onToggleMode,
  showDevTools = false,
}) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090A0F]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand & Technical Trust Sub-label */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold text-lg tracking-tight text-white font-sans">
              MaxP <span className="text-blue-500 text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">APPAREL OS</span>
            </span>
          </div>

          <span className="hidden lg:inline-block h-4 w-px bg-white/10" />

          {/* Quick Anchor Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-5 text-xs text-zinc-400 font-medium">
            <button type="button" onClick={() => scrollTo("editorial-hero")} className="hover:text-white transition-colors">
              المزايا
            </button>
            <button type="button" onClick={() => scrollTo("lookbook")} className="hover:text-white transition-colors">
              الكاشير والفروع
            </button>
            <button type="button" onClick={() => scrollTo("tools-matrix")} className="hover:text-white transition-colors">
              الأدوات (17)
            </button>
            <button type="button" onClick={() => scrollTo("pricing")} className="hover:text-white transition-colors">
              الأسعار
            </button>
            <button type="button" onClick={() => scrollTo("consultation")} className="hover:text-white transition-colors">
              طلب استشارة
            </button>
          </nav>
        </div>

        {/* Action Controls & Navigation CTAs */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Developer / Evaluation Lens (Only shown if debug=audit or dev mode) */}
          {showDevTools && (
            <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={onOpenAudit}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
                title="تشريح الفروقات الهندسية"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                type="button"
                onClick={() => onToggleMode(mode === "taste" ? "slop" : "taste")}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  mode === "taste" ? "bg-white text-black" : "bg-purple-600 text-white"
                }`}
              >
                {mode === "taste" ? "✨ المهارة" : "🤖 قبل المهارة"}
              </button>
            </div>
          )}

          {/* Direct WhatsApp Concierge */}
          <a
            href={WHATSAPP_CONSULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-colors px-2 py-1"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>استشارة واتساب</span>
          </a>

          {/* Login Link */}
          <button
            type="button"
            onClick={onLogin}
            className="hidden sm:inline-block text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1"
          >
            تسجيل الدخول
          </button>

          {/* Primary Dominant CTA (Desktop only, mobile uses sticky bar) */}
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
