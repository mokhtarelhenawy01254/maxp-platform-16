import { useState } from "react";
import { BookingInvoice, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "./shared";
import { toast } from "sonner";

import { X } from 'lucide-react'
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
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣");
    } finally { setBusy(false); }
  };

  const handlePayback = async () => {
    if (!onPayback) return;
    setBusy(true);
    try {
      await onPayback({ amount: paybackAmount, method: paybackForm.method, reason: paybackForm.reason.trim() });
      onClose();
    } catch {
      // error toast is shown by the parent (InvoicesTab); keep the modal open so the user can retry
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">╪¬╪│╪¼┘è┘ä ╪»┘ü╪╣╪⌐ ΓÇö {invoice.invoiceNumber}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        {(invoice.amountPaid || 0) > 0 && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode("pay")} className={`px-4 py-2 rounded-lg text-sm ${mode === "pay" ? "bg-blue-600 text-white" : "border dark:border-gray-600 text-gray-700 dark:text-gray-300"}`}>╪»┘ü╪╣</button>
            <button onClick={() => setMode("payback")} className={`px-4 py-2 rounded-lg text-sm ${mode === "payback" ? "bg-red-600 text-white" : "border dark:border-gray-600 text-gray-700 dark:text-gray-300"}`}>╪º╪│╪¬╪▒╪»╪º╪»</button>
          </div>
        )}
        {mode === "pay" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à╪¿┘ä╪║ *</label><input type="number" className={MODAL_INPUT_CLS} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪»┘ü╪╣</label>
                <select className={MODAL_INPUT_CLS} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                </select>
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à┘ä╪º╪¡╪╕╪º╪¬</label><input className={MODAL_INPUT_CLS} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm flex justify-between"><span>╪º┘ä┘à╪¬╪¿┘é┘è</span><span className="font-bold">{invoice.remaining}</span></div>
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">╪Ñ┘ä╪║╪º╪í</button>
              <button onClick={handleSave} disabled={!valid || busy} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">╪¬╪│╪¼┘è┘ä ╪º┘ä╪»┘ü╪╣</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à╪¿┘ä╪║ ╪º┘ä╪º╪│╪¬╪▒╪»╪º╪» *</label><input type="number" className={MODAL_INPUT_CLS} value={paybackForm.amount} onChange={e => setPaybackForm({ ...paybackForm, amount: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪»┘ü╪╣</label>
                <select className={MODAL_INPUT_CLS} value={paybackForm.method} onChange={e => setPaybackForm({ ...paybackForm, method: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                </select>
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪│╪¿╪¿ ╪º┘ä╪º╪│╪¬╪▒╪»╪º╪» *</label><input className={MODAL_INPUT_CLS} value={paybackForm.reason} onChange={e => setPaybackForm({ ...paybackForm, reason: e.target.value })} placeholder="╪│╪¿╪¿ ╪º┘ä╪º╪│╪¬╪▒╪»╪º╪» ┘à╪╖┘ä┘ê╪¿" /></div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm flex justify-between"><span>╪º┘ä┘à╪¿┘ä╪║ ╪º┘ä┘à╪│╪»╪» ╪º┘ä┘é╪º╪¿┘ä ┘ä┘ä╪º╪│╪¬╪▒╪»╪º╪»</span><span className="font-bold">{invoice.amountPaid || 0}</span></div>
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">╪Ñ┘ä╪║╪º╪í</button>
              <button onClick={handlePayback} disabled={!paybackValid || busy} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">╪¬╪ú┘â┘è╪» ╪º┘ä╪º╪│╪¬╪▒╪»╪º╪»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
