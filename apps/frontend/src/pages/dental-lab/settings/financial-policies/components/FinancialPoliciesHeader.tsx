import { DollarSign, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FinancialPoliciesHeaderProps {
  saving: boolean;
  isGracePeriodActive: boolean;
  onSave: () => void;
}

export function FinancialPoliciesHeader({
  saving,
  isGracePeriodActive,
  onSave,
}: FinancialPoliciesHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <DollarSign className="size-5 text-emerald-500" />
            الطبقة المالية والترحيل الموحّد (Financial Posting)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ربط ومزامنة فواتير الحالات وسدادات الموردين ومستحقات الفنيين وتكاليف الأوت سورس مع الخزينة
          </p>
        </div>
        <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
          {saving ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          حفظ إعدادات الترحيل
        </Button>
      </div>

      {isGracePeriodActive && (
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 flex items-center gap-3">
          <ShieldCheck className="size-5 text-blue-500 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-blue-700 dark:text-blue-300">
              فترة الأمان التجريبية (Grace Period) مفعّلة حالياً
            </span>
            <p className="text-muted-foreground mt-0.5">
              تم تحويل بعض الأوضاع إلى AUTO. بحسب معايير الأمان المالية، تخضع الحركات أول 7 أيام لوضع CONFIRM (موافقة بنقرة واحدة) للتأكد من استقرار الأرقام قبل الترحيل الآلي الكامل.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
