import { fmtMoney, type TechnicianPayoutSummary } from "../../../../shared";

interface TechnicianLedgerSummaryStripProps {
  summary: TechnicianPayoutSummary | null;
}

export function TechnicianLedgerSummaryStrip({ summary }: TechnicianLedgerSummaryStripProps) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700 shrink-0">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
            أجر الإنتاج المكتسب
          </span>
          <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
            {fmtMoney(summary?.totalEarned ?? 0)} ج.م
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5 font-mono tabular-nums">
            {summary?.completedStages ?? 0} مرحلة ({summary?.completedUnits ?? 0} وحدة)
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
            إجمالي ما صُرف للفني
          </span>
          <span className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums">
            {fmtMoney(summary?.totalPaid ?? 0)} ج.م
          </span>
          <span className="text-[10px] text-gray-400 block mt-0.5 font-mono tabular-nums">
            سلف: {fmtMoney(summary?.totalAdvances ?? 0)} ج.م
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
            المكافآت والحوافز
          </span>
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            +{fmtMoney(summary?.totalBonuses ?? 0)} ج.م
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 block">
            الخصومات والتوالف
          </span>
          <span className="text-base font-bold text-red-600 dark:text-red-400 font-mono tabular-nums">
            -{fmtMoney(summary?.totalDeductions ?? 0)} ج.م
          </span>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border-2 border-emerald-500/40 col-span-2 sm:col-span-1">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
            صافي المستحق القائم
          </span>
          <span
            className={`text-lg font-bold block font-mono tabular-nums ${
              Number(summary?.netDue ?? 0) > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-700 dark:text-gray-300"
            }`}
          >
            {fmtMoney(summary?.netDue ?? 0)} ج.م
          </span>
        </div>
      </div>
    </div>
  );
}
