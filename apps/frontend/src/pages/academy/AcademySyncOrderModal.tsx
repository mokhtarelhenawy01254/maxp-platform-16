import React, { FormEvent } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface AcademySyncOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  syncOrderNumber: string;
  setSyncOrderNumber: (val: string) => void;
  syncing: boolean;
  syncResult: { success: boolean; message: string } | null;
}

export const AcademySyncOrderModal: React.FC<AcademySyncOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  syncOrderNumber,
  setSyncOrderNumber,
  syncing,
  syncResult,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border/70 rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 text-foreground" dir="rtl">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">مزامنة طلب مدفوع</h2>
              <p className="text-xs text-muted-foreground">تسجيل الطالب تلقائياً لطلب تم سداده مسبقاً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium mb-1.5">
              رقم الطلب (Order Number أو ID)
            </label>
            <input
              type="text"
              value={syncOrderNumber}
              onChange={(e) => setSyncOrderNumber(e.target.value)}
              placeholder="مثال: ORD-1002 أو رقم الأوردر"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border/70 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              يقوم النظام بالبحث في بنود الطلب عن أي كورس مرتبط بمنتجات الطلب، وتسجيل الطالب فوراً دون تكرار.
            </p>
          </div>

          {syncResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                syncResult.success
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-destructive/10 text-destructive border border-destructive/20'
              }`}
            >
              {syncResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition"
            >
              إغلاق
            </button>
            <button
              type="submit"
              disabled={syncing || !syncOrderNumber.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition active:scale-[0.98] disabled:opacity-50"
            >
              {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>{syncing ? 'جاري المزامنة...' : 'بدء المزامنة'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
