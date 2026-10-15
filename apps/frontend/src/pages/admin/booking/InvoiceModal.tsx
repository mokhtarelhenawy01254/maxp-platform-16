import { useState } from "react";
import { X, Receipt, DollarSign, Wallet, ShieldCheck, Calendar, AlertCircle } from "lucide-react";
import { BookingInvoice, BookingPatient, PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "./shared";
import { toast } from "sonner";

interface Props {
  invoice?: Partial<BookingInvoice> | null;
  patients: BookingPatient[];
  onClose: () => void;
  onSave: (d: Partial<BookingInvoice> & { initialPayment?: number; method?: string }) => Promise<void>;
}

const EXPENSE_SPLITS = [
  { value: "PATIENT", label: "المريض" },
  { value: "INSURANCE", label: "التأمين" },
  { value: "BOTH", label: "مشترك" },
];

export default function InvoiceModal({ invoice, patients, onClose, onSave }: Props) {
  const [form, setForm] = useState<{
    patientId: string; total: string; discount: string; discountReason: string;
    additionAmount: string; additionReason: string;
    insuranceAmount: string; expenseSplit: string; insuranceCompanyId: string; ticketNumber: string;
    dueDate: string; notes: string;
    initialPayment: string; method: string;
  }>({
    patientId: invoice?.patientId || "",
    total: invoice?.total ? String(invoice.total) : "",
    discount: invoice?.discount ? String(invoice.discount) : "0",
    discountReason: invoice?.discountReason || "",
    additionAmount: invoice?.additionAmount ? String(invoice.additionAmount) : "0",
    additionReason: invoice?.additionReason || "",
    insuranceAmount: invoice?.insuranceAmount ? String(invoice.insuranceAmount) : "0",
    expenseSplit: invoice?.expenseSplit || "PATIENT",
    insuranceCompanyId: invoice?.insuranceCompanyId || "",
    ticketNumber: invoice?.ticketNumber || "",
    dueDate: invoice?.dueDate ? (String(invoice.dueDate).split("T")[0] ?? "") : "",
    notes: invoice?.notes || "",
    initialPayment: "",
    method: "CASH",
  });
  const [saving, setSaving] = useState(false);

  const total = Number(form.total) || 0;
  const discount = Number(form.discount) || 0;
  const addition = Number(form.additionAmount) || 0;
  const initialPayment = Number(form.initialPayment) || 0;
  const net = Math.max(0, total - discount + addition);
  const discountReasonOk = discount > 0 ? form.discountReason.trim().length > 0 : true;
  const additionReasonOk = addition > 0 ? form.additionReason.trim().length > 0 : true;
  const valid = form.patientId && total > 0 && initialPayment >= 0 && initialPayment <= net && discountReasonOk && additionReasonOk;

  const handleSave = async () => {
    if (saving || !valid) return;
    setSaving(true);
    try {
      await onSave({
        ...invoice,
        patientId: form.patientId,
        total,
        discount,
        discountReason: discount > 0 ? form.discountReason.trim() : undefined,
        additionAmount: addition,
        additionReason: addition > 0 ? form.additionReason.trim() : undefined,
        insuranceAmount: Number(form.insuranceAmount) || 0,
        expenseSplit: form.expenseSplit,
        insuranceCompanyId: form.insuranceCompanyId.trim() || undefined,
        ticketNumber: form.ticketNumber.trim() || undefined,
        dueDate: form.dueDate || undefined,
        notes: form.notes.trim() || undefined,
        initialPayment: form.initialPayment ? initialPayment : undefined,
        method: form.method,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ الفاتورة");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-background border border-border/70 rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">{invoice?.id ? "تعديل الفاتورة" : "إنشاء فاتورة جديدة"}</h3>
              <p className="text-xs text-muted-foreground">تفاصيل الرسوم، الخصومات، والتحصيل المالي</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">المريض *</label>
            <select className={inputCls} value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}>
              <option value="">اختر المريض المسجل</option>
              {patients.filter(p => p.isActive).map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName || ""} {p.phone ? `(${p.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">المبلغ الإجمالي *</label>
              <input type="number" className={`${inputCls} font-mono tabular-nums`} value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">قيمة الخصم</label>
              <input type="number" className={`${inputCls} font-mono tabular-nums`} value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} placeholder="0.00" />
            </div>
          </div>

          {discount > 0 && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">سبب الخصم *</label>
              <input className={inputCls} value={form.discountReason} onChange={e => setForm({ ...form, discountReason: e.target.value })} placeholder="مثال: خصم نقابة، عرض خاص..." />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">مبلغ إضافي</label>
              <input type="number" className={`${inputCls} font-mono tabular-nums`} value={form.additionAmount} onChange={e => setForm({ ...form, additionAmount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">رقم التذكرة / الإيصال</label>
              <input className={`${inputCls} font-mono`} value={form.ticketNumber} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} placeholder="TICK-001" />
            </div>
          </div>

          {addition > 0 && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">سبب الإضافة *</label>
              <input className={inputCls} value={form.additionReason} onChange={e => setForm({ ...form, additionReason: e.target.value })} placeholder="مثال: رسوم خدمة إضافية..." />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">مبلغ التأمين المغطى</label>
              <input type="number" className={`${inputCls} font-mono tabular-nums`} value={form.insuranceAmount} onChange={e => setForm({ ...form, insuranceAmount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">تقسيم المصاريف</label>
              <select className={inputCls} value={form.expenseSplit} onChange={e => setForm({ ...form, expenseSplit: e.target.value })}>
                {EXPENSE_SPLITS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">شركة التأمين</label>
              <input className={inputCls} placeholder="اسم الشركة أو الكود" value={form.insuranceCompanyId} onChange={e => setForm({ ...form, insuranceCompanyId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">تاريخ الاستحقاق</label>
              <input type="date" className={`${inputCls} font-mono`} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">ملاحظات الفاتورة</label>
            <textarea className={inputCls} rows={2} placeholder="تفاصيل إضافية عن الفاتورة..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>

          {!invoice?.id && (
            <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-primary" /> دفعة أولى مقدمة (اختياري)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">المبلغ المدفوع مقدماً</label>
                  <input type="number" className={`${inputCls} font-mono tabular-nums`} value={form.initialPayment} onChange={e => setForm({ ...form, initialPayment: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">طريقة الدفع</label>
                  <select className={inputCls} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="bg-muted/30 border border-border/70 rounded-xl p-3.5 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="font-sans text-muted-foreground">الصافي بعد الخصم والإضافة:</span>
              <span className="text-sm font-bold tabular-nums text-foreground">{net.toLocaleString()} ج.م</span>
            </div>
            {form.initialPayment && (
              <div className="flex justify-between items-center text-destructive pt-1 border-t border-border/40">
                <span className="font-sans text-xs">المتبقي المطلوب تحصيله:</span>
                <span className="text-sm font-bold tabular-nums">{Math.max(0, net - initialPayment).toLocaleString()} ج.م</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="px-5 py-2 text-xs font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-xs transition-colors disabled:opacity-50"
          >
            {saving ? "جارٍ الحفظ..." : "حفظ الفاتورة"}
          </button>
        </div>
      </div>
    </div>
  );
}
