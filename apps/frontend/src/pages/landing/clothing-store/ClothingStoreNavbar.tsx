import React from "react";
import { ArrowLeft, Store, ShieldCheck } from "lucide-react";

interface ClothingStoreNavbarProps {
  onFreeRegister: () => void;
  onLogin: () => void;
}

export const ClothingStoreNavbar: React.FC<ClothingStoreNavbarProps> = ({
  onFreeRegister,
  onLogin,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#050608]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white">
            <Store className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-wide text-base">MaxP</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                الأزياء
              </span>
            </div>
            <span className="text-[11px] text-gray-400 hidden sm:inline">
              منظومة متاجر الملابس وبراندات الموضة
            </span>
          </div>
        </div>

        {/* Anchors desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400 font-medium">
          <a
            href="#features"
            className="hover:text-white transition-colors cursor-pointer"
          >
            ربط الفروع والمخزون
          </a>
          <a
            href="#tools"
            className="hover:text-white transition-colors cursor-pointer"
          >
            الأدوات الـ 17
          </a>
          <a
            href="#pricing"
            className="hover:text-white transition-colors cursor-pointer"
          >
            خطط الأسعار
          </a>
          <a
            href="#lead-form"
            className="hover:text-white transition-colors cursor-pointer"
          >
            طلب استشارة
          </a>
          <a
            href="#faq"
            className="hover:text-white transition-colors cursor-pointer"
          >
            الأسئلة الشائعة
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onLogin}
            type="button"
            className="text-xs sm:text-sm text-gray-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 transition-all font-medium"
          >
            تسجيل الدخول
          </button>
          <button
            onClick={onFreeRegister}
            type="button"
            className="csn-btn-primary text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <span>افتح متجرك 0 ج.م</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
