import { CreditCard } from "lucide-react";
import { type DentalLabCase, fmtMoney } from "../../shared";

interface InspectorFinancialOverviewProps {
  caseData: DentalLabCase;
}

export function InspectorFinancialOverview({
  caseData,
}: InspectorFinancialOverviewProps) {
  const total = Number(caseData.total) || 0;
  const paid = Number(caseData.paid) || 0;
  const remaining = Number(caseData.remaining) || 0;
  const isPaidFull = total > 0 && remaining <= 0;
  const isPartial = paid > 0 && remaining > 0;

  return (
    <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5">
        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
          <span>الحساب والمستحقات</span>
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isPaidFull
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              : isPartial
              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
          }`}
        >
          {isPaidFull
            ? "مسدد بالكامل"
            : isPartial
            ? "مسدد جزئياً"
            : "غير مسدد"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center pt-1">
        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <span className="text-slate-400 block text-[10px]">الإجمالي</span>
          <span className="font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200 text-xs">
            {fmtMoney(total)}
          </span>
        </div>

        <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg">
          <span className="text-emerald-600 dark:text-emerald-400 block text-[10px]">المدفوع</span>
          <span className="font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300 text-xs">
            {fmtMoney(paid)}
          </span>
        </div>

        <div className="p-2 bg-rose-50/60 dark:bg-rose-950/20 rounded-lg">
          <span className="text-rose-600 dark:text-rose-400 block text-[10px]">المتبقي</span>
          <span className="font-bold font-mono tabular-nums text-rose-700 dark:text-rose-300 text-xs">
            {fmtMoney(remaining)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default InspectorFinancialOverview;
