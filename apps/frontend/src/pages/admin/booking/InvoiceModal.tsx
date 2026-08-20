import { useState } from "react";
import { BookingInvoice, BookingPatient, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, PAYMENT_METHODS, PAYMENT_METHOD_LABEL } from "./shared";
import { toast } from "sonner";

import { X } from 'lucide-react'
interface Props {
  invoice?: Partial<BookingInvoice> | null;
  patients: BookingPatient[];
  onClose: () => void;
  onSave: (d: Partial<BookingInvoice> & { initialPayment?: number; method?: string }) => Promise<void>;
}

const EXPENSE_SPLITS = [
  { value: "PATIENT", label: "╪º┘ä┘à╪▒┘è╪╢" },
  { value: "INSURANCE", label: "╪º┘ä╪¬╪ú┘à┘è┘å" },
  { value: "BOTH", label: "┘à╪┤╪¬╪▒┘â" },
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
      toast.error(e instanceof Error ? e.message : "┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{invoice?.id ? "╪¬╪╣╪»┘è┘ä ┘ü╪º╪¬┘ê╪▒╪⌐" : "┘ü╪º╪¬┘ê╪▒╪⌐ ╪¼╪»┘è╪»╪⌐"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à╪▒┘è╪╢ *</label>
            <select className={MODAL_INPUT_CLS} value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })}>
              <option value="">╪º╪«╪¬╪▒ ╪º┘ä┘à╪▒┘è╪╢</option>
              {patients.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName || ""} {p.phone ? `(${p.phone})` : ""}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à╪¿┘ä╪║ ╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è *</label><input type="number" className={MODAL_INPUT_CLS} value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä╪«╪╡┘à</label><input type="number" className={MODAL_INPUT_CLS} value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} /></div>
          </div>
          {discount > 0 && (
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪│╪¿╪¿ ╪º┘ä╪«╪╡┘à *</label><input className={MODAL_INPUT_CLS} value={form.discountReason} onChange={e => setForm({ ...form, discountReason: e.target.value })} placeholder="╪│╪¿╪¿ ╪º┘ä╪«╪╡┘à ┘à╪╖┘ä┘ê╪¿" /></div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪Ñ╪╢╪º┘ü╪⌐</label><input type="number" className={MODAL_INPUT_CLS} value={form.additionAmount} onChange={e => setForm({ ...form, additionAmount: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪▒┘é┘à ╪º┘ä╪¬╪░┘â╪▒╪⌐</label><input className={MODAL_INPUT_CLS} value={form.ticketNumber} onChange={e => setForm({ ...form, ticketNumber: e.target.value })} /></div>
          </div>
          {addition > 0 && (
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪│╪¿╪¿ ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ *</label><input className={MODAL_INPUT_CLS} value={form.additionReason} onChange={e => setForm({ ...form, additionReason: e.target.value })} placeholder="╪│╪¿╪¿ ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐ ┘à╪╖┘ä┘ê╪¿" /></div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à╪¿┘ä╪║ ╪º┘ä╪¬╪ú┘à┘è┘å</label><input type="number" className={MODAL_INPUT_CLS} value={form.insuranceAmount} onChange={e => setForm({ ...form, insuranceAmount: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪¬┘é╪│┘è┘à ╪º┘ä┘à╪╡╪º╪▒┘è┘ü</label>
              <select className={MODAL_INPUT_CLS} value={form.expenseSplit} onChange={e => setForm({ ...form, expenseSplit: e.target.value })}>
                {EXPENSE_SPLITS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪┤╪▒┘â╪⌐ ╪º┘ä╪¬╪ú┘à┘è┘å</label><input className={MODAL_INPUT_CLS} value={form.insuranceCompanyId} onChange={e => setForm({ ...form, insuranceCompanyId: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪¬╪º╪▒┘è╪« ╪º┘ä╪º╪│╪¬╪¡┘é╪º┘é</label><input type="date" className={MODAL_INPUT_CLS} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">┘à┘ä╪º╪¡╪╕╪º╪¬</label><textarea className={MODAL_INPUT_CLS} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {!invoice?.id && (
            <div className="border-t dark:border-gray-700 pt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">╪»┘ü╪╣╪⌐ ╪ú┘ê┘ä┘ë (╪º╪«╪¬┘è╪º╪▒┘è)</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º┘ä┘à╪¿┘ä╪║</label><input type="number" className={MODAL_INPUT_CLS} value={form.initialPayment} onChange={e => setForm({ ...form, initialPayment: e.target.value })} /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪╖╪▒┘è┘é╪⌐ ╪º┘ä╪»┘ü╪╣</label>
                  <select className={MODAL_INPUT_CLS} value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span>╪º┘ä╪╡╪º┘ü┘è (╪¿╪╣╪» ╪º┘ä╪«╪╡┘à ┘ê╪º┘ä╪Ñ╪╢╪º┘ü╪⌐)</span><span className="font-bold">{net}</span></div>
            {form.initialPayment && <div className="flex justify-between mt-1"><span>╪º┘ä┘à╪¬╪¿┘é┘è</span><span className="font-bold">{Math.max(0, net - initialPayment)}</span></div>}
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">╪Ñ┘ä╪║╪º╪í</button>
          <button onClick={handleSave} disabled={!valid || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">╪¡┘ü╪╕</button>
        </div>
      </div>
    </div>
  );
}
