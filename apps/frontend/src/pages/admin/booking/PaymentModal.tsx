import { useState } from "react";
import { X, CreditCard, RotateCcw, AlertCircle, CheckCircle2 } from "lucide-react";
import { BookingInvoice, PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "./shared";
import { toast } from "sonner";

interface Props {
  invoice: BookingInvoice;
  onClose: () => void;
  onSave: (d: { amount: number; method: string; notes?: string }) => Promise<void>;
  onPayback?: (d: { amount: number; method: string; reason: string }) => Promise<void>;
}

export default function PaymentModal({ invoice, onClose, onSave, onPayback }: Props) {
  const [mode, setMode] = useState<"pay" | "payback">("pay");
  const [form, setForm] = useState({ amount: invoice.remaining ? String(invoice.remaining) : "", method: "CASH", notes: "", reason: "" });
  const [paybackForm, setPaybackForm] = useState({ amount: invoice.amountPaid ? String(invoice.amountPaid) : "", method: "CASH", reason: "" });
  const [busy, setBusy] = useState(false);

  const amount = Number(form.amount) || 0;
  const valid = amount > 0 && amount <= invoice.remaining;

  const paybackAmount = Number(paybackForm.amount) || 0;
  const paybackValid = paybackAmount > 0 && paybackAmount <= (invoice.amountPaid || 0) && paybackForm.reason.trim().length > 0;

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave({ amount, method: form.method, notes: form.notes.trim() || undefined });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل تسجيل الدفع");
    } finally { setBusy(false); }
  };

  const handlePayback = async () => {
    if (!onPayback) return;
    setBusy(true);
    try {
      await onPayback({ amount: paybackAmount, method: paybackForm.method, reason: paybackForm.reason.trim() });
      onClose();
    } catch {
      // error toast is shown by parent
    } finally { setBusy(false); }
  };

  const inputCls = "w-full bg-background border border-border/70 rounded-xl px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden text-card-foreground animate-in fade-in-0 zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${mode === "pay" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"}`}>
              {mode === "pay" ? <CreditCard className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {mode === "pay" ? "تسجيل دفعة جديدة" : "تسجيل عملية استرداد"}
              </h3>
              <p className="text-xs text-muted-foreground font-mono tabular-nums">{invoice.invoiceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {(invoice.amountPaid || 0) > 0 && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted/30 border border-border/60 rounded-xl">
              <button
                type="button"
                onClick={() => setMode("pay")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === "pay"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                تسجيل دفعة
              </button>
              <button
                type="button"
                onClick={() => setMode("payback")}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === "payback"
                    ? "bg-destructive text-destructive-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                استرداد مالي
              </button>
            </div>
          )}

          {mode === "pay" ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">المبلغ المطلوب سداده *</label>
                  <input
                    type="number"
                    className={`${inputCls} font-mono tabular-nums`}
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">طريقة الدفع</label>
                  <select className={inputCls} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">ملاحظات التحصيل (اختياري)</label>
                <input className={inputCls} placeholder="مثال: تحويل فودافون كاش، رقم إيصال..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="p-3 bg-muted/30 border border-border/70 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="font-sans text-muted-foreground">المتبقي على الفاتورة:</span>
                <span className="font-bold text-destructive tabular-nums text-sm">{invoice.remaining?.toLocaleString()} ج.م</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">مبلغ الاسترداد *</label>
                  <input
                    type="number"
                    className={`${inputCls} font-mono tabular-nums`}
                    value={paybackForm.amount}
                    onChange={e => setPaybackForm({ ...paybackForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">طريقة الاسترداد</label>
                  <select className={inputCls} value={paybackForm.method} onChange={e => setPaybackForm({ ...paybackForm, method: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">سبب الاسترداد *</label>
                <input
                  className={inputCls}
                  value={paybackForm.reason}
                  onChange={e => setPaybackForm({ ...paybackForm, reason: e.target.value })}
                  placeholder="سبب الاسترداد مطلوب للرقابة المالية"
                />
              </div>

              <div className="p-3 bg-muted/30 border border-border/70 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="font-sans text-muted-foreground">المبلغ المسدد القابل للاسترداد:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">{(invoice.amountPaid || 0).toLocaleString()} ج.م</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-foreground border border-border/70 rounded-xl hover:bg-muted/50 transition-colors">
            إلغاء
          </button>
          {mode === "pay" ? (
            <button
              onClick={handleSave}
              disabled={!valid || busy}
              className="px-5 py-2 text-xs font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
            >
              {busy ? "جارٍ الحفظ..." : "تسجيل الدفع"}
            </button>
          ) : (
            <button
              onClick={handlePayback}
              disabled={!paybackValid || busy}
              className="px-5 py-2 text-xs font-medium bg-destructive text-destructive-foreground rounded-xl hover:bg-destructive/90 shadow-xs transition-colors disabled:opacity-50"
            >
              {busy ? "جارٍ الحفظ..." : "تأكيد الاسترداد"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
