import React from "react";
import { ArrowLeft, Sparkles, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { TasteMode } from "./types";
import { WHATSAPP_CONSULT_URL } from "./clothingTasteData";

interface ClothingTasteNavbarProps {
  onFreeRegister: () => void;
  onLogin: () => void;
  onOpenAudit: () => void;
  mode: TasteMode;
  onToggleMode: (mode: TasteMode) => void;
}

export const ClothingTasteNavbar: React.FC<ClothingTasteNavbarProps> = ({
  onFreeRegister,
  onLogin,
  onOpenAudit,
  mode,
  onToggleMode,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#090A0F]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand & Technical Sub-label */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold text-lg tracking-tight text-white font-sans">
              MaxP <span className="text-blue-500 text-xs font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">APPAREL OS</span>
            </span>
          </div>
          <span className="hidden md:inline-block h-4 w-px bg-white/10" />
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>0% عمولة • ربط بوسطة وفروع المحل</span>
          </span>
        </div>

        {/* Action Controls & Taste-Skill Lens Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Audit Matrix Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenAudit}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-medium transition-all"
            title="فحص معايير المهارة الهندسية"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">تشريح الفروقات</span>
            <span className="sm:hidden">الفروقات</span>
          </button>

          {/* Interactive Skill Mode Toggle (Taste vs Slop) */}
          <div className="inline-flex items-center rounded-lg bg-white/5 p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => onToggleMode("taste")}
              className={`py-1 px-2.5 rounded-md text-xs font-bold transition-all ${
                mode === "taste"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>✨ المهارة</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleMode("slop")}
              className={`py-1 px-2.5 rounded-md text-xs font-bold transition-all ${
                mode === "slop"
                  ? "bg-purple-600 text-white shadow-sm shadow-purple-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>🤖 قبل المهارة</span>
            </button>
          </div>

          {/* Direct WhatsApp Concierge */}
          <a
            href={WHATSAPP_CONSULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
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

          {/* Primary CTA (desktop only, mobile uses sticky bar) */}
          <button
            type="button"
            onClick={onFreeRegister}
            className="cst-nav-cta-desktop cst-btn-primary text-xs py-2 px-3.5 whitespace-nowrap min-h-[36px]"
          >
            <span>افتح متجرك 0 ج.م</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
};
