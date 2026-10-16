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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-card border border-border/70 rounded-2xl p-5 sm:p-6 shadow-xl text-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="إغلاق النافذة"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0 shadow-2xs">
            <Apple className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 id="ios-install-title" className="text-base font-semibold leading-tight text-foreground">
              تثبيت MaxP على الآيفون
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              خطوات سريعة لإضافة التطبيق إلى شاشتك الرئيسية
            </p>
          </div>
        </div>

        <div className="space-y-2.5 my-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
            <div className="size-6.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold font-mono text-xs tabular-nums">
              1
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block text-foreground">
                افتح الرابط في متصفح Safari
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                اضغط على زر المشاركة بالأسفل <Share className="size-3.5 inline text-primary" />
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
            <div className="size-6.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold font-mono text-xs tabular-nums">
              2
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block text-foreground">
                اختر &ldquo;إضافة إلى الشاشة الرئيسية&rdquo;
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                مرر قائمة الخيارات واضغط على <PlusSquare className="size-3.5 inline text-primary" /> Add to Home Screen
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
            <div className="size-6.5 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold font-mono text-xs tabular-nums">
              3
            </div>
            <div className="text-xs leading-relaxed">
              <span className="font-semibold block text-foreground">
                اضغط &ldquo;إضافة&rdquo; (Add)
              </span>
              <span className="text-muted-foreground mt-0.5 block">
                في الزاوية العلوية للشاشة لحفظ أيقونة التطبيق
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تشغيل بكامل الشاشة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>تنبيهات فورية بالطلبات</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground transition-all shadow-2xs"
        >
          فهمت الخطوات
        </button>
      </div>
    </div>
  );
};

export default IosInstallModal;
