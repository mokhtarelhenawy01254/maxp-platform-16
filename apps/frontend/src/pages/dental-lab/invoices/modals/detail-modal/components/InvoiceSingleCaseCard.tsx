import type { DentalInvoice } from "../../../../shared";
import { fmtMoney } from "../../../../shared";

interface InvoiceSingleCaseCardProps {
  invoiceCase: NonNullable<DentalInvoice["case"]>;
}

export function InvoiceSingleCaseCard({ invoiceCase }: InvoiceSingleCaseCardProps) {
  return (
    <div className="p-3 bg-blue-50/40 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/40">
      <span className="font-bold text-gray-800 dark:text-gray-200 block mb-2">
        تفاصيل العمل الفني بالحالة:
      </span>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div>
          <span className="text-gray-400">نوع الشغل:</span>
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {invoiceCase.workTypeName || "—"}
          </p>
        </div>
        <div>
          <span className="text-gray-400">عدد الوحدات:</span>
          <p className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {invoiceCase.unitsCount || 1} وحدة
          </p>
        </div>
        <div>
          <span className="text-gray-400">سعر الوحدة:</span>
          <p className="font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {fmtMoney(invoiceCase.unitPrice)} ج.م
          </p>
        </div>
        <div>
          <span className="text-gray-400">الأسنان:</span>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{invoiceCase.teeth || "—"}</p>
        </div>
        <div>
          <span className="text-gray-400">اللون (Shade):</span>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{invoiceCase.shade || "—"}</p>
        </div>
        <div>
          <span className="text-gray-400">الخامة:</span>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{invoiceCase.material || "—"}</p>
        </div>
      </div>
    </div>
  );
}
