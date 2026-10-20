import { Plus } from "lucide-react";
import type { DentalInvoice } from "../../../../shared";
import { fmtDateTime, fmtMoney } from "../../../../shared";

interface InvoicePaymentHistorySectionProps {
  payments?: DentalInvoice["payments"];
  remaining: number;
  onAddPayment: () => void;
}

export function InvoicePaymentHistorySection({
  payments,
  remaining,
  onAddPayment,
}: InvoicePaymentHistorySectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-gray-900 dark:text-gray-100">
          سجل الدفعات المسددة ({payments?.length || 0})
        </span>
        {remaining > 0 && (
          <button
            type="button"
            onClick={onAddPayment}
            className="text-xs text-green-600 font-bold hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> إضافة دفعة
          </button>
        )}
      </div>

      {!payments || payments.length === 0 ? (
        <p className="text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border dark:border-gray-700">
          لم يتم تسجيل أي دفعات لهذه الفاتورة بعد
        </p>
      ) : (
        <div className="border dark:border-gray-700 rounded-xl overflow-hidden divide-y dark:divide-gray-700 tabular-nums">
          {payments.map((p) => (
            <div
              key={p.id}
              className="p-2.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/40"
            >
              <div>
                <p className="font-bold text-green-700 dark:text-green-400 font-mono">
                  {fmtMoney(p.amount)} ج.م
                </p>
                <p className="text-[11px] text-gray-400">
                  {fmtDateTime(p.createdAt)} • طريقة: <span className="font-semibold">{p.method || "CASH"}</span>
                </p>
              </div>
              {p.note && (
                <span className="text-[11px] text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  {p.note}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
