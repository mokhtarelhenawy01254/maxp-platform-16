import { useEffect, useMemo, useState } from "react";
import { BookingInvoice, BookingPatient, CashierShift, INVOICE_STATUS_MAP, PAYMENT_METHOD_LABEL, api, fetchJson } from "./shared";
import { Banknote, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from "sonner";
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

const EXPENSE_SPLIT_LABEL: Record<string, { label: string; color: string }> = {
  PATIENT: { label: "المريض", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  INSURANCE: { label: "التأمين", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  BOTH: { label: "مشترك", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
};

const fmt = (n: number) => Number(n || 0).toFixed(2);

export default function InvoicesTab({
  invoices, patients, search, onSearchChange, statusFilter, onStatusFilterChange,
  onNew, onEdit, onPay, onDelete,
  invoiceModal, onInvoiceModalClose, onInvoiceSave,
  paymentInvoice, onPaymentClose, onPaymentSave,
}: Props) {
  const [shift, setShift] = useState<CashierShift | null>(null);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [closingBalance, setClosingBalance] = useState("");
  const [shiftBusy, setShiftBusy] = useState(false);

  const fetchCurrentShift = async () => {
    try {
      const data = await fetchJson<CashierShift | null>(api("invoices/cashier-shifts/current"));
      setShift(data);
    } catch { setShift(null); }
  };

  useEffect(() => { void fetchCurrentShift(); }, []);

  const openShift = async () => {
    setShiftBusy(true);
    try {
      const data = await fetchJson<CashierShift>(api("invoices/cashier-shifts"), {
        method: "POST",
        body: JSON.stringify({ openingBalance: Number(openingBalance) || 0 }),
      });
      setShift(data);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "فشل فتح الشيفت"); }
    finally { setShiftBusy(false); }
  };

  const closeShift = async () => {
    if (!shift) return;
    setShiftBusy(true);
    try {
      const data = await fetchJson<CashierShift>(api(`invoices/cashier-shifts/${shift.id}/close`), {
        method: "PUT",
        body: JSON.stringify({ closingBalance: Number(closingBalance) || 0 }),
      });
      setShift(data);
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "فشل إغلاق الشيفت"); }
    finally { setShiftBusy(false); }
  };

  const handlePayback = async (d: { amount: number; method: string; reason: string }) => {
    if (!paymentInvoice) return;
    try {
      await fetchJson(api(`invoices/${paymentInvoice.id}/payback`), {
        method: "POST",
        body: JSON.stringify(d),
      });
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "فشل الاسترداد");
      throw e;
    }
  };

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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <p className="font-bold text-sm">{shift ? `الشيفت مفتوح — ${shift.cashierName}` : "لا يوجد شيفت مفتوح"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {shift ? `رصيد البداية: ${fmt(shift.openingBalance)}` : "افتح شيفت لبدء التحصيل"}
            </p>
          </div>
          {shift ? (
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">رصيد الإغلاق</label>
                <input type="number" className="w-32 border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100" value={closingBalance} onChange={e => setClosingBalance(e.target.value)} />
              </div>
              <button onClick={closeShift} disabled={shiftBusy} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">إغلاق الشيفت</button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">رصيد البداية</label>
                <input type="number" className="w-32 border dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} />
              </div>
              <button onClick={openShift} disabled={shiftBusy} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">فتح شيفت</button>
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400 dark:text-gray-500">لا توجد فواتير</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm">{["رقم الفاتورة", "المريض", "الإجمالي", "الخصم", "الصافي", "المسدد", "المتبقي", "الحالة", "الدفعات", ""].map(h => <th key={h} className="text-right py-3 px-4">{h}</th>)}</tr></thead>
            <tbody>{filtered.map(inv => (
              <tr key={inv.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                <td className="py-3 px-4 font-medium" dir="ltr">{inv.invoiceNumber}</td>
                <td className="py-3 px-4">{inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName || ""}` : "—"}<span className="block text-xs text-gray-400 dark:text-gray-500" dir="ltr">{inv.patient?.phone || ""}</span></td>
                <td className="py-3 px-4">{fmt(inv.total)}</td>
                <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{fmt(inv.discount)}</td>
                <td className="py-3 px-4 font-medium">{fmt(inv.net ?? Math.max(0, inv.total - inv.discount + (inv.additionAmount || 0)))}</td>
                <td className="py-3 px-4 text-green-600 dark:text-green-400">{fmt(inv.amountPaid)}</td>
                <td className="py-3 px-4 font-medium text-red-600 dark:text-red-400">{fmt(inv.remaining)}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${INVOICE_STATUS_MAP[inv.status]?.color || ""}`}>{INVOICE_STATUS_MAP[inv.status]?.label || inv.status}</span>
                  {inv.expenseSplit && (
                    <span className={`block mt-1 px-2 py-0.5 rounded-full text-xs w-fit ${EXPENSE_SPLIT_LABEL[inv.expenseSplit]?.color || "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"}`}>
                      {EXPENSE_SPLIT_LABEL[inv.expenseSplit]?.label || inv.expenseSplit}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                  {inv.payments?.length ? inv.payments.map(p => <div key={p.id} className={p.amount < 0 ? "text-red-500" : ""}>{fmt(p.amount)} {PAYMENT_METHOD_LABEL[p.method] || p.method}{p.reason ? ` — ${p.reason}` : ""}</div>) : "—"}
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
      {paymentInvoice && <PaymentModal invoice={paymentInvoice} onClose={onPaymentClose} onSave={onPaymentSave} onPayback={handlePayback} />}
    </div>
  );
}
