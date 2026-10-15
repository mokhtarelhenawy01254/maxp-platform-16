import { useEffect, useMemo, useState } from "react";
import { BookingInvoice, BookingPatient, CashierShift, INVOICE_STATUS_MAP, PAYMENT_METHOD_LABEL, api, fetchJson } from "./shared";
import { Banknote, Pencil, Plus, Search, Trash2, Receipt, ShieldCheck, Wallet, ArrowUpRight } from "lucide-react";
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
  PATIENT: { label: "المريض", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20" },
  INSURANCE: { label: "التأمين", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20" },
  BOTH: { label: "مشترك", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20" },
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
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">المدفوعات والتحصيل</h2>
          <p className="text-xs text-muted-foreground">إدارة الفواتير والتحصيل المالي والشيفتات اليومية</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border border-border/70 rounded-xl px-3 py-1.5 text-xs bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
          >
            <option value="">كل الحالات</option>
            {Object.entries(INVOICE_STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
            <input
              className="border border-border/70 rounded-xl pr-8 pl-3 py-1.5 text-xs w-44 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              placeholder="بحث برقم الفاتورة أو العميل..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>فاتورة جديدة</span>
          </button>
        </div>
      </div>

      {/* Cashier Shift Status Card */}
      <div className="bg-card border border-border/70 rounded-xl p-3.5 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${shift ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border/60"}`}>
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">
                  {shift ? `الشيفت مفتوح — ${shift.cashierName}` : "لا يوجد شيفت مفتوح حالياً"}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${shift ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                  {shift ? "نشط" : "مغلق"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {shift ? (
                  <span>رصيد البداية: <strong className="font-mono tabular-nums text-foreground">{fmt(shift.openingBalance)} ج.م</strong></span>
                ) : (
                  "افتح شيفت جديد لبدء تحصيل المدفوعات"
                )}
              </p>
            </div>
          </div>

          {shift ? (
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-0.5">رصيد الإغلاق</label>
                <input
                  type="number"
                  className="w-28 border border-border/70 rounded-lg px-2.5 py-1 text-xs font-mono tabular-nums bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={closingBalance}
                  onChange={e => setClosingBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={closeShift}
                disabled={shiftBusy}
                className="mt-4 px-3 py-1 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium rounded-lg hover:bg-destructive/20 disabled:opacity-50 transition-colors"
              >
                إغلاق الشيفت
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-0.5">رصيد البداية</label>
                <input
                  type="number"
                  className="w-28 border border-border/70 rounded-lg px-2.5 py-1 text-xs font-mono tabular-nums bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <button
                onClick={openShift}
                disabled={shiftBusy}
                className="mt-4 px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                فتح شيفت
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoices List Table */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-xl py-12 text-center text-muted-foreground">
          <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
          <p className="text-xs">لا توجد فواتير مطابقة للبحث</p>
        </div>
      ) : (
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground text-[11px] font-medium">
                  {["رقم الفاتورة", "العميل / المريض", "الإجمالي", "الخصم", "الصافي", "المسدد", "المتبقي", "الحالة", "الدفعات", ""].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-foreground font-medium" dir="ltr">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-foreground">
                        {inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName || ""}` : "—"}
                      </span>
                      {inv.patient?.phone && (
                        <span className="block text-[10px] text-muted-foreground font-mono tabular-nums" dir="ltr">
                          {inv.patient.phone}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-foreground">{fmt(inv.total)}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-muted-foreground">{fmt(inv.discount)}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-foreground">
                      {fmt(inv.net ?? Math.max(0, inv.total - inv.discount + (inv.additionAmount || 0)))}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                      {fmt(inv.amountPaid)}
                    </td>
                    <td className="py-2.5 px-3 font-mono tabular-nums font-semibold text-destructive">
                      {fmt(inv.remaining)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${INVOICE_STATUS_MAP[inv.status]?.color || "bg-muted text-muted-foreground"}`}>
                        {INVOICE_STATUS_MAP[inv.status]?.label || inv.status}
                      </span>
                      {inv.expenseSplit && (
                        <span className={`block mt-1 px-2 py-0.5 rounded-full text-[10px] w-fit ${EXPENSE_SPLIT_LABEL[inv.expenseSplit]?.color || "bg-muted text-muted-foreground"}`}>
                          {EXPENSE_SPLIT_LABEL[inv.expenseSplit]?.label || inv.expenseSplit}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-muted-foreground font-mono tabular-nums">
                      {inv.payments?.length ? (
                        inv.payments.map(p => (
                          <div key={p.id} className={p.amount < 0 ? "text-destructive" : ""}>
                            {fmt(p.amount)} {PAYMENT_METHOD_LABEL[p.method] || p.method}
                            {p.reason ? ` — ${p.reason}` : ""}
                          </div>
                        ))
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 justify-end">
                        {inv.remaining > 0 && inv.status !== "REFUNDED" && (
                          <button
                            onClick={() => onPay(inv)}
                            className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="تسجيل دفعة"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(inv)}
                          className="p-1 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(inv.id)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {invoiceModal !== undefined && (
        <InvoiceModal
          invoice={invoiceModal}
          patients={patients}
          onClose={onInvoiceModalClose}
          onSave={onInvoiceSave}
        />
      )}
      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          onClose={onPaymentClose}
          onSave={onPaymentSave}
          onPayback={handlePayback}
        />
      )}
    </div>
  );
}
