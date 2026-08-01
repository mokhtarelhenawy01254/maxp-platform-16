import { useState } from "react";
;
import { BookingInvoice, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "./shared";

import { X } from 'lucide-react'
interface Props {
  invoice: BookingInvoice;
  onClose: () => void;
  onSave: (d: { amount: number; method: string; notes?: string }) => Promise<void>;
}

export default function PaymentModal({ invoice, onClose, onSave }: Props) {
  const [form, setForm] = useState({ amount: invoice.remaining ? String(invoice.remaining) : "", method: "CASH", notes: "" });
  const amount = Number(form.amount) || 0;
  const valid = amount > 0 && amount <= invoice.remaining;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">تسجيل دفعة — {invoice.invoiceNumber}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ *</label><input type="number" className={MODAL_INPUT_CLS} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
              <select className={MODAL_INPUT_CLS} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label><input className={MODAL_INPUT_CLS} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm flex justify-between"><span>المتبقي</span><span className="font-bold">{invoice.remaining}</span></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={() => onSave({ amount, method: form.method, notes: form.notes.trim() || undefined })} disabled={!valid} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">تسجيل الدفع</button>
        </div>
      </div>
    </div>
  );
}
