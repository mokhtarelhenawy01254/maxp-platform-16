import React from "react";
import { Truck, FileText, Landmark, ExternalLink } from "lucide-react";
import { JsonRecord } from "../../types/appSettingsTypes";

interface InternalCourierFleetTreasurySectionProps {
  courierRemittance: JsonRecord;
  treasuryAccounts: Array<{ id: string; name: string; type: string; balance: number }>;
  updateAtPath: (path: string, value: unknown) => void;
  navigate: (path: string) => void;
}

export const InternalCourierFleetTreasurySection: React.FC<InternalCourierFleetTreasurySectionProps> = ({
  courierRemittance,
  treasuryAccounts,
  updateAtPath,
  navigate,
}) => {
  return (
    <>
      {/* Quick Launch Cockpit Strip */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <h3 className="text-sm font-semibold text-foreground">شاشات تشغيل أسطول المناديب</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              الوصول المباشر إلى المنظومة اليومية لإدارة المناديب، مانيفستات التوزيع، وتسويات الخزينة.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            تطبيق نشط ومرتبط بالخزينة
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => navigate('/shipping/couriers')}
            className="group flex flex-col items-start p-3.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/70 hover:border-border transition text-right w-full"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition">
                <Truck className="h-4 w-4" />
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition" />
            </div>
            <span className="mt-2.5 text-xs font-semibold text-foreground">أسطول المناديب والبيانات</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">تسجيل المناديب، بيانات المركبات، ونسب العمولات</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/shipping/delivery-runs')}
            className="group flex flex-col items-start p-3.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/70 hover:border-border transition text-right w-full"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition">
                <FileText className="h-4 w-4" />
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition" />
            </div>
            <span className="mt-2.5 text-xs font-semibold text-foreground">رحلات التوزيع والمانيفست</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">تجميع الطرود، كشوف التسليم المطبوعة بالباركود</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/shipping/courier-settlements')}
            className="group flex flex-col items-start p-3.5 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/70 hover:border-border transition text-right w-full"
          >
            <div className="flex items-center justify-between w-full">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition">
                <Landmark className="h-4 w-4" />
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition" />
            </div>
            <span className="mt-2.5 text-xs font-semibold text-foreground">تسويات وتوريد الخزينة</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">مطابقة الكاش المحصل، تصفية العهد، والترحيل للخزينة</span>
          </button>
        </div>
      </div>

      {/* Financial Remittance & Treasury Settings */}
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/40">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">إعدادات التوريد المالي والخزينة</h3>
            <p className="text-xs text-muted-foreground">تحديد الخزينة الافتراضية وقواعد معالجة الفروقات النقدية للمناديب</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              الخزينة النقدية الافتراضية للتوريد
            </label>
            <select
              value={String(courierRemittance["defaultTreasuryAccountId"] || "")}
              onChange={(e) => updateAtPath("remittance.defaultTreasuryAccountId", e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">-- اختر الخزينة الافتراضية --</option>
              {treasuryAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'CASH' ? 'خزينة نقدية' : 'حساب بنكي'}) - رصيد: {Number(acc.balance || 0).toLocaleString()} ج.م
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              سيتم تحديد هذه الخزينة تلقائياً في شاشة تسوية الوردية لتسريع التوريد دون الحاجة لاختيارها في كل مرة.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              سياسة معالجة العجز المالي الميداني
            </label>
            <select
              value={String(courierRemittance["shortagePolicy"] || "DEDUCT_FROM_COURIER")}
              onChange={(e) => updateAtPath("remittance.shortagePolicy", e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="DEDUCT_FROM_COURIER">تسجيل العجز كمديونية/سلفة في ذمة المندوب</option>
              <option value="RECORD_AS_EXPENSE">قيد العجز كمصروف تسوية تشغيلي تلقائياً</option>
              <option value="HOLD_SETTLEMENT">حظر إغلاق الوردية حتى سداد المبلغ كاملاً</option>
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              الإجراء التلقائي للنظام عندما يكون المبلغ المسلم أقل من الكاش المحصل الميداني.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierRemittance["requireTreasuryNoteOnVariance"] ?? true)}
              onChange={(e) => updateAtPath("remittance.requireTreasuryNoteOnVariance", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">إلزام كتابة سبب الفارق المالي</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                منع إتمام التسوية عند وجود أي عجز أو زيادة بدون تسجيل ملاحظة تدقيقية تفسر سبب الفارق.
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 cursor-pointer transition">
            <input
              type="checkbox"
              checked={Boolean(courierRemittance["allowPartialRemittance"] ?? true)}
              onChange={(e) => updateAtPath("remittance.allowPartialRemittance", e.target.checked)}
              className="mt-0.5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <span className="text-xs font-medium text-foreground block">السماح بالتوريد الجزئي وترحيل الباقي</span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                تمكين أمين الخزينة من استلام جزء من الكاش المتوفر وترحيل المبلغ المتبقي لليوم التالي.
              </span>
            </div>
          </label>
        </div>
      </div>
    </>
  );
};
