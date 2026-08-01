import { useState } from "react";
import { X } from "lucide-react";
import { BookingDoctor, BookingBranch, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface Props {
  doctor?: Partial<BookingDoctor> | null;
  branches: BookingBranch[];
  onClose: () => void;
  onSave: (d: Partial<BookingDoctor>) => Promise<void>;
}

export default function DoctorModal({ doctor, branches, onClose, onSave }: Props) {
  const [form, setForm] = useState({ title: "دكتور", name: "", branchId: "", specialty: "", phone: "", email: "", password: "", consultationFee: "", commissionRate: "", isActive: true, ...doctor });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{doctor?.id ? "تعديل طبيب" : "إضافة طبيب"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اللقب</label><input className={MODAL_INPUT_CLS} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label><input className={MODAL_INPUT_CLS} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الفرع</label>
            <select className={MODAL_INPUT_CLS} value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
              <option value="">اختر الفرع</option>
              {branches.filter(b => b.isActive).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التخصص</label><input className={MODAL_INPUT_CLS} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label><input className={MODAL_INPUT_CLS} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رسوم الكشف</label><input type="number" className={MODAL_INPUT_CLS} value={form.consultationFee} onChange={e => setForm({ ...form, consultationFee: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نسبة العمولة %</label><input type="number" className={MODAL_INPUT_CLS} value={form.commissionRate} onChange={e => setForm({ ...form, commissionRate: e.target.value })} /></div>
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">بيانات بوابة الطبيب</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{doctor?.id ? "كلمة مرور جديدة (اتركها فارغة للاحتفاظ)" : "كلمة المرور"}</label><input type="password" className={MODAL_INPUT_CLS} dir="ltr" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={() => { if (!form.name?.trim() || !form.branchId) return; onSave({
            ...form,
            consultationFee: form.consultationFee ? Number(form.consultationFee) : undefined,
            commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
            password: form.password || undefined,
          }); }} disabled={!form.name?.trim() || !form.branchId} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}
