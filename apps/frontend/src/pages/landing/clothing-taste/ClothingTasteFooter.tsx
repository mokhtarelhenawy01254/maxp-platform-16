import React from "react";
import { ArrowLeft } from "lucide-react";
import { WHATSAPP_CONSULT_URL } from "./clothingTasteData";

interface ClothingTasteFooterProps {
  onFreeRegister: () => void;
}

export const ClothingTasteFooter: React.FC<ClothingTasteFooterProps> = ({
  onFreeRegister,
}) => {
  return (
    <footer className="py-12 border-t border-black/[0.08] bg-[#F4F0E8] text-right">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-black/[0.08]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span className="font-black text-lg text-[#141416]">MaxP الأزياء والملابس</span>
            </div>
            <p className="text-xs text-zinc-600 max-w-md leading-relaxed">
              المنظومة السحابية المخصصة لتجار وبراندات الأزياء في مصر والوطن العربي: متجر أونلاين سريع، كاشير فروع سحابي، وتكامل شحن بوسطة.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={WHATSAPP_CONSULT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="cst-btn-secondary text-xs py-2.5 px-4 font-bold"
            >
              استشارة واتساب
            </a>
            <button
              type="button"
              onClick={onFreeRegister}
              className="cst-btn-primary text-xs py-2.5 px-5 font-bold"
            >
              <span>افتح متجرك (0 ج.م)</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-sans">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} MaxP Platform.
          </div>
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-black transition-colors">شروط الخدمة</a>
            <a href="/privacy" className="hover:text-black transition-colors">سياسة الخصوصية</a>
            <a
              href={WHATSAPP_CONSULT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-700 transition-colors font-medium"
            >
              الدعم الفني عبر واتساب
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
