import React from "react";
import { ArrowLeft, Sparkles, ShoppingBag } from "lucide-react";

interface ClothingEditorialNavbarProps {
  onFreeRegister: () => void;
  onLogin: () => void;
  currentMode: "editorial" | "cockpit";
  onToggleMode: (mode: "editorial" | "cockpit") => void;
}

export const ClothingEditorialNavbar: React.FC<ClothingEditorialNavbarProps> = ({
  onFreeRegister,
  onLogin,
  currentMode,
  onToggleMode,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/[0.06] bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-black tracking-wider text-base">MAXP</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 text-zinc-700 font-bold uppercase tracking-wider">
                APPAREL OS
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              منظومة متاجر الأزياء وبراندات الملابس
            </span>
          </div>
        </div>

        {/* Anchors desktop */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm text-zinc-600 font-semibold">
          <a href="#editorial-hero" className="hover:text-black transition-colors">
            متجر الزبائن
          </a>
          <a href="#shop-the-look" className="hover:text-black transition-colors">
            حل أزمات التشغيل
          </a>
          <a href="#editorial-tools" className="hover:text-black transition-colors">
            الـ 17 أداة
          </a>
          <a href="#editorial-pricing" className="hover:text-black transition-colors">
            خطط الأسعار
          </a>
        </nav>

        {/* Actions + Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Aesthetic Toggle Switch */}
          <div className="hidden lg:flex items-center bg-black/5 p-1 rounded-xl border border-black/5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onToggleMode("editorial")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentMode === "editorial"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-zinc-500 hover:text-black"
              }`}
            >
              الستايل الفاشون الفاتح
            </button>
            <button
              type="button"
              onClick={() => onToggleMode("cockpit")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentMode === "cockpit"
                  ? "bg-black text-white shadow-sm font-bold"
                  : "text-zinc-500 hover:text-black"
              }`}
            >
              غرفة العمليات الداكنة
            </button>
          </div>

          <button
            onClick={onLogin}
            type="button"
            className="text-xs sm:text-sm text-zinc-600 hover:text-black px-2 sm:px-3 py-1.5 font-semibold"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={onFreeRegister}
            type="button"
            className="cse-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <span>افتح متجرك 0 ج.م</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
