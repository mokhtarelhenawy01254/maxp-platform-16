import { useMemo } from "react";
;
import { BookingInvoice, BookingPatient, INVOICE_STATUS_MAP, PAYMENT_METHOD_LABEL } from "./shared";
import { Banknote, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import InvoiceModal from "./InvoiceModal";
import PaymentModal from "./PaymentModal";

interface Props {
  invoices: BookingInvoice[];
  patients: BookingPatient[];
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onNew: () => void;
  onEdit: (inv: Partial<BookingInvoice>) => void;
  onPay: (inv: BookingInvoice) => void;
  onDelete: (id: string) => void;
  invoiceModal: Partial<BookingInvoice> | null | undefined;
  onInvoiceModalClose: () => void;
  onInvoiceSave: (d: Partial<BookingInvoice> & { initialPayment?: number; method?: string }) => Promise<void>;
  paymentInvoice: BookingInvoice | null;
  onPaymentClose: () => void;
  onPaymentSave: (d: { amount: number; method: string; notes?: string }) => Promise<void>;
}

const fmt = (n: number) => Number(n || 0).toFixed(2);

export default function InvoicesTab({
  invoices, patients, search, onSearchChange, statusFilter, onStatusFilterChange,
  onNew, onEdit, onPay, onDelete,
  invoiceModal, onInvoiceModalClose, onInvoiceSave,
  paymentInvoice, onPaymentClose, onPaymentSave,
}: Props) {
  const filtered = useMemo(() => invoices.filter(inv => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const p = inv.patient;
    return (inv.invoiceNumber || "").toLowerCase().includes(q)
      || (p?.firstName || "").toLowerCase().includes(q)
      || (p?.lastName || "").toLowerCase().includes(q)
      || (p?.phone || "").toLowerCase().includes(q);
  }), [invoices, search, statusFilter]);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">المدفوعات والتحصيل</h2>
        <div className="flex flex-wrap gap-3">
          <select className="border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100" value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)}>
            <option value="">كل الحالات</option>
            {Object.entries(INVOICE_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="relative"><Search className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 dark:text-gray-500" /><input className="border dark:border-gray-600 rounded-lg pr-9 pl-3 py-2 text-sm w-48 dark:bg-gray-800 dark:text-gray-100" placeholder="بحث..." value={search} onChange={e => onSearchChange(e.target.value)} /></div>
          <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" />فاتورة جديدة</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد فواتير</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["رقم الفاتورة", "المريض", "الإجمالي", "الخصم", "المسدد", "المتبقي", "الحالة", "الدفعات", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(inv => (
              <tr key={inv.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <td className="py-3 px-4 font-medium" dir="ltr">{inv.invoiceNumber}</td>
                <td className="py-3 px-4">{inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName || ""}` : "—"}<span className="block text-xs text-gray-400 dark:text-gray-500" dir="ltr">{inv.patient?.phone || ""}</span></td>
                <td className="py-3 px-4">{fmt(inv.total)}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{fmt(inv.discount)}</td>
                <td className="py-3 px-4 text-green-600 dark:text-green-400">{fmt(inv.amountPaid)}</td>
                <td className="py-3 px-4 font-medium text-red-600 dark:text-red-400">{fmt(inv.remaining)}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs ${INVOICE_STATUS_MAP[inv.status]?.color || ""}`}>{INVOICE_STATUS_MAP[inv.status]?.label || inv.status}</span></td>
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                  {inv.payments?.length ? inv.payments.map(p => <div key={p.id}>{fmt(p.amount)} {PAYMENT_METHOD_LABEL[p.method] || p.method}</div>) : "—"}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1 justify-end">
                    {inv.remaining > 0 && inv.status !== "REFUNDED" && (
                      <button onClick={() => onPay(inv)} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="تسجيل دفعة"><Banknote className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => onEdit(inv)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="تعديل"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(inv.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {invoiceModal !== undefined && <InvoiceModal invoice={invoiceModal} patients={patients} onClose={onInvoiceModalClose} onSave={onInvoiceSave} />}
      {paymentInvoice && <PaymentModal invoice={paymentInvoice} onClose={onPaymentClose} onSave={onPaymentSave} />}
    </div>
  );
}
