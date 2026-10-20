import { fmtMoney } from "../../../../shared";

interface InvoiceFinancialTotalsCardProps {
  total: number;
  paid: number;
  remaining: number;
  displayNote?: string;
}

export function InvoiceFinancialTotalsCard({
  total,
  paid,
  remaining,
  displayNote,
}: InvoiceFinancialTotalsCardProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border dark:border-gray-700/60 tabular-nums">
        <div>
          <span className="text-gray-400">الإجمالي</span>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono">
            {fmtMoney(total)} ج.م
          </p>
        </div>
        <div>
          <span className="text-gray-400">المسدد</span>
          <p className="text-base font-bold text-green-600 dark:text-green-400 font-mono">
            {fmtMoney(paid)} ج.م
          </p>
        </div>
        <div>
          <span className="text-gray-400">المتبقي</span>
          <p className="text-base font-bold text-red-600 font-mono">{fmtMoney(remaining)} ج.م</p>
        </div>
      </div>

      {displayNote && (
        <div className="p-2.5 bg-amber-50/60 dark:bg-amber-900/20 rounded-lg text-amber-900 dark:text-amber-300">
          <span className="font-semibold">ملاحظات:</span> {displayNote}
        </div>
      )}
    </>
  );
}
