import { Receipt } from "lucide-react";
import { INVOICE_STATUS_MAP } from "./shared";

export interface PatientInvoice {
  id: string;
  invoiceNumber: string;
  appointmentId?: string;
  total: number;
  discount: number;
  amountPaid: number;
  net: number;
  remaining: number;
  status: string;
  createdAt: string;
  payments?: { id: string; amount: number; method: string; paidAt: string }[];
}

interface Props {
  invoices?: PatientInvoice[];
  financialSummary?: {
    invoiceCount: number;
    totalBilled: number;
    totalPaid: number;
    outstanding: number;
    unpaidInvoices: number;
  };
  totalAppointmentsCount?: number;
}

const fmtMoney = (n?: number) =>
  n != null ? `${Number(n).toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ج.م` : "—";

export default function PatientDetailInvoicesTable({
  invoices = [],
  financialSummary,
  totalAppointmentsCount = 0,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Financial Summary Strip */}
      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3">
          <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-foreground">
            {totalAppointmentsCount}
          </p>
          <p className="text-[11px] text-muted-foreground">عدد الزيارات</p>
        </div>
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3">
          <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {fmtMoney(financialSummary?.totalPaid)}
          </p>
          <p className="text-[11px] text-muted-foreground">إجمالي المسدد</p>
        </div>
        <div className="bg-muted/30 border border-border/60 rounded-xl p-3">
          <p className="text-base sm:text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
            {fmtMoney(financialSummary?.outstanding)}
          </p>
          <p className="text-[11px] text-muted-foreground">المبلغ المتبقي</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="space-y-2">
        <h4 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-primary" />
          <span>سجل الفواتير السريرية ({invoices.length})</span>
        </h4>
        {invoices.length === 0 ? (
          <p className="text-center py-6 text-xs text-muted-foreground bg-muted/20 border border-border/60 rounded-xl">
            لا توجد فواتير مسجلة لهذا المريض
          </p>
        ) : (
          <div className="overflow-x-auto border border-border/70 rounded-xl bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground">
                  {["رقم الفاتورة", "التاريخ", "الإجمالي", "المسدد", "المتبقي", "الحالة"].map((h) => (
                    <th key={h} className="text-right py-2 px-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono tabular-nums text-muted-foreground">
                      {String(inv.createdAt).split("T")[0]}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums font-semibold">{fmtMoney(inv.total)}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {fmtMoney(inv.amountPaid)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      {fmtMoney(inv.remaining)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${INVOICE_STATUS_MAP[inv.status]?.color || "bg-muted text-muted-foreground border-border/60"}`}>
                        {INVOICE_STATUS_MAP[inv.status]?.label || inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
