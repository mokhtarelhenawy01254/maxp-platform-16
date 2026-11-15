import React from 'react';
import { Building2, AlertCircle, ShoppingBag, Users, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FactoryPortalLoginCardProps {
  authError: string | null;
  inputToken: string;
  setInputToken: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FactoryPortalLoginCard: React.FC<FactoryPortalLoginCardProps> = ({
  authError,
  inputToken,
  setInputToken,
  onSubmit,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-foreground flex flex-col justify-center items-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 shadow-xl space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Building2 className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-foreground">بوابة المصانع الشريكة (التشغيل للغير)</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            هذه البوابة مخصصة لمصانع وورش التشغيل المسند إليها مراحل إنتاج (قص، خياطة، تطريز، كوي وتعبئة) لمتابعة التكليفات وتأكيد الاستلام وتحديث الكميات.
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs text-right flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3 text-right">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              رمز الدخول الخاص بالمصنع (Token):
            </label>
            <input
              type="text"
              placeholder="أدخل الرمز أو الصق رابط البوابة المباشر..."
              value={inputToken}
              onChange={(e) => {
                let val = e.target.value.trim();
                if (val.includes('token=')) {
                  val = val.split('token=')[1]?.split('&')[0] || val;
                }
                setInputToken(val);
              }}
              className="w-full p-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono text-center"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!inputToken.trim()}
            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow hover:bg-primary/95 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            دخول إلى تكليفات المصنع
          </button>
        </form>

        <div className="text-[11px] text-muted-foreground pt-1">
          يتم توليد رمز ورابط الدخول لكل مصنع شريك من شاشة إدارة الإنتاج (المصانع الشركاء).
        </div>

        {/* Quick Portals Links for Merchants and Clients */}
        <div className="pt-3 border-t border-border/60 text-xs text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground text-right text-xs">هل تبحث عن بوابة أخرى؟</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-right">
            <Link
              to="/wholesale-portal"
              className="p-3 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-foreground text-xs">بوابة تجار الجملة</span>
                  <span className="text-[10px] text-muted-foreground">كشف الحساب والطلبات</span>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              to="/customer-portal"
              className="p-3 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-foreground text-xs">بوابة عملاء التصنيع</span>
                  <span className="text-[10px] text-muted-foreground">متابعة العينات والإنتاج</span>
                </div>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
