import React from "react";
import { Store, ShieldCheck } from "lucide-react";

interface ClothingStoreFooterProps {
  onFreeRegister: () => void;
}

export const ClothingStoreFooter: React.FC<ClothingStoreFooterProps> = ({
  onFreeRegister,
}) => {
  return (
    <footer className="py-12 bg-[#030406] border-t border-white/5 text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <Store className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">MaxP Fashion Suite</div>
              <div className="text-[11px] text-gray-500">
                منظومة تجارة الأزياء والملابس السحابية
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-white transition-colors">
              المميزات
            </a>
            <a href="#tools" className="hover:text-white transition-colors">
              الأدوات الـ 17
            </a>
            <a href="#pricing" className="hover:text-white transition-colors">
              الأسعار
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              الأسئلة
            </a>
          </div>

          <div>
            <button
              onClick={onFreeRegister}
              type="button"
              className="csn-btn-primary text-xs py-2 px-3.5"
            >
              افتح متجرك الآن 0 ج.م
            </button>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
          <div>
            © {new Date().getFullYear()} MaxP Platform. جميع الحقوق محفوظة لرواد الأعمال وأصحاب المتاجر.
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>بنية تحتية سحابية آمنة 100% مع تشفير كامل للبيانات</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
