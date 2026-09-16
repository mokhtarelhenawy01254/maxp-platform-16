import React from "react";
import { Apple, Share, PlusSquare, X, CheckCircle2 } from "lucide-react";

interface IosInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IosInstallModal: React.FC<IosInstallModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="إغلاق النافذة"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shrink-0 shadow-sm">
            <Apple className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 id="ios-install-title" className="text-base sm:text-lg font-bold text-wrap-balance leading-tight">
              تثبيت MaxP على الآيفون
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              خطوات سريعة لإضافة التطبيق إلى شاشتك الرئيسية
            </p>
          </div>
        </div>

        <div className="space-y-3 my-5">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs tabular-nums">
              1
            </div>
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-semibold block text-slate-800 dark:text-slate-200">
                افتح الرابط في متصفح Safari
              </span>
              <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 mt-0.5">
                اضغط على زر المشاركة بالأسفل <Share className="w-3.5 h-3.5 inline text-blue-600 dark:text-blue-400" />
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs tabular-nums">
              2
            </div>
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-semibold block text-slate-800 dark:text-slate-200">
                اختر &ldquo;إضافة إلى الشاشة الرئيسية&rdquo;
              </span>
              <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 mt-0.5">
                مرر قائمة الخيارات واضغط على <PlusSquare className="w-3.5 h-3.5 inline text-blue-600 dark:text-blue-400" /> Add to Home Screen
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs tabular-nums">
              3
            </div>
            <div className="text-xs sm:text-sm leading-relaxed">
              <span className="font-semibold block text-slate-800 dark:text-slate-200">
                اضغط &ldquo;إضافة&rdquo; (Add)
              </span>
              <span className="text-slate-500 dark:text-slate-400 mt-0.5 block">
                في الزاوية العلوية للشاشة لحفظ أيقونة التطبيق
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تشغيل بكامل الشاشة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تنبيهات فورية بالطلبات</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white transition-all shadow-xs"
        >
          فهمت الخطوات
        </button>
      </div>
    </div>
  );
};
