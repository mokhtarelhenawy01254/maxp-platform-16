import { useState } from "react";
;
import { BookingPatient, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, tryParseJSON } from "./shared";

import { X } from 'lucide-react'
interface Props {
  patient?: Partial<BookingPatient> | null;
  onClose: () => void;
  onSave: (d: Partial<BookingPatient>) => Promise<void>;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const toList = (v: unknown): string => {
  const arr = tryParseJSON<string[]>(v) || (Array.isArray(v) ? v : null);
  return arr ? arr.join("، ") : "";
};

const fromList = (s: string): string[] | undefined => {
  const items = s.split(/[،,;]/).map(x => x.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
};

const toDateInput = (d?: string): string => {
  if (!d) return "";
  return d.split("T")[0] || d;
};

export default function PatientModal({ patient, onClose, onSave }: Props) {
  const [form, setForm] = useState<{
    firstName: string; lastName: string; phone: string; email: string;
    gender: string; birthDate: string; bloodType: string;
    allergies: string; chronicDiseases: string; medications: string;
    notes: string; isActive: boolean; password: string;
  }>({
    firstName: patient?.firstName || "",
    lastName: patient?.lastName || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    gender: patient?.gender || "",
    birthDate: toDateInput(patient?.birthDate),
    bloodType: patient?.bloodType || "",
    allergies: toList(patient?.allergies),
    chronicDiseases: toList(patient?.chronicDiseases),
    medications: toList(patient?.medications),
    notes: patient?.notes || "",
    isActive: patient?.isActive ?? true,
    password: "",
  });

  const valid = form.firstName.trim() !== "";

  const handleSave = () => {
    onSave({
      ...patient,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      gender: form.gender || undefined,
      birthDate: form.birthDate || undefined,
      bloodType: form.bloodType || undefined,
      allergies: fromList(form.allergies),
      chronicDiseases: fromList(form.chronicDiseases),
      medications: fromList(form.medications),
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
      password: form.password || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={MODAL_CONTENT_CLS} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{patient?.id ? "تعديل مريض" : "إضافة مريض"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الأول *</label><input className={MODAL_INPUT_CLS} value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم الأخير</label><input className={MODAL_INPUT_CLS} value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الجنس</label>
              <select className={MODAL_INPUT_CLS} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="">غير محدد</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الميلاد</label><input type="date" className={MODAL_INPUT_CLS} value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فصيلة الدم</label>
              <select className={MODAL_INPUT_CLS} value={form.bloodType} onChange={e => setForm({ ...form, bloodType: e.target.value })}>
                <option value="">غير محدد</option>
                {BLOOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحساسية (افصل بفاصلة)</label><input className={MODAL_INPUT_CLS} value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أمراض مزمنة (افصل بفاصلة)</label><input className={MODAL_INPUT_CLS} value={form.chronicDiseases} onChange={e => setForm({ ...form, chronicDiseases: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أدوية حالية (افصل بفاصلة)</label><input className={MODAL_INPUT_CLS} value={form.medications} onChange={e => setForm({ ...form, medications: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label><textarea className={MODAL_INPUT_CLS} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{patient?.id ? "كلمة مرور بوابة المريض (اتركها فارغة للاحتفاظ)" : "كلمة مرور بوابة المريض (اختياري)"}</label><input type="password" className={MODAL_INPUT_CLS} dir="ltr" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
          {patient?.id && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              مريض نشط
            </label>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={handleSave} disabled={!valid} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}
