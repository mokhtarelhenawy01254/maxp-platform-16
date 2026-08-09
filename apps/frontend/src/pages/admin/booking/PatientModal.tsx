import { useEffect, useState } from "react";
import { BookingPatient, ReferringPhysician, PriceList, PATIENT_STATUS_MAP, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, tryParseJSON, api, fetchJson } from "./shared";
import MedicalHistoryChecklist, { MedicalHistoryValue } from "./MedicalHistoryChecklist";

import { X } from 'lucide-react'
interface Props {
  patient?: Partial<BookingPatient> | null;
  onClose: () => void;
  onSave: (d: Partial<BookingPatient>) => Promise<void>;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MARITAL_STATUS = [
  { value: "", label: "غير محدد" },
  { value: "SINGLE", label: "أعزب/عزباء" },
  { value: "MARRIED", label: "متزوج/متزوجة" },
  { value: "DIVORCED", label: "مطلق/مطلقة" },
  { value: "WIDOW", label: "أرمل/أرملة" },
];

const SOURCES = [
  { value: "", label: "غير محدد" },
  { value: "whatsapp", label: "واتساب" },
  { value: "facebook", label: "فيسبوك" },
  { value: "web", label: "موقع إلكتروني" },
  { value: "dashboard", label: "لوحة التحكم" },
  { value: "physician", label: "طبيب محوّل" },
  { value: "walkin", label: "زيارة مباشرة" },
];

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

const parseMedicalHistory = (v: unknown): MedicalHistoryValue | null => {
  const parsed = tryParseJSON<MedicalHistoryValue>(v);
  if (parsed && parsed.conditions && Array.isArray(parsed.conditions)) return parsed;
  return null;
};

export default function PatientModal({ patient, onClose, onSave }: Props) {
  const [form, setForm] = useState<{
    firstName: string; lastName: string; phone: string; email: string;
    gender: string; birthDate: string; bloodType: string;
    nationalId: string; nationalIdImage: string; address: string;
    allergies: string; chronicDiseases: string; medications: string;
    notes: string; isActive: boolean; password: string;
    status: string; source: string; maritalStatus: string; occupation: string; city: string;
    referringPhysicianId: string;
    priceListId: string;
    medicalHistory: MedicalHistoryValue | null;
  }>({
    firstName: patient?.firstName || "",
    lastName: patient?.lastName || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    gender: patient?.gender || "",
    birthDate: toDateInput(patient?.birthDate),
    bloodType: patient?.bloodType || "",
    nationalId: patient?.nationalId || "",
    nationalIdImage: patient?.nationalIdImage || "",
    address: patient?.address || "",
    allergies: toList(patient?.allergies),
    chronicDiseases: toList(patient?.chronicDiseases),
    medications: toList(patient?.medications),
    notes: patient?.notes || "",
    isActive: patient?.isActive ?? true,
    password: "",
    status: (patient?.status || "ACTIVE") as string,
    source: patient?.source || "",
    maritalStatus: patient?.maritalStatus || "",
    occupation: patient?.occupation || "",
    city: patient?.city || "",
    referringPhysicianId: patient?.referringPhysicianId || "",
    priceListId: patient?.priceListId || "",
    medicalHistory: parseMedicalHistory(patient?.medicalHistory),
  });

  const [referringPhysicians, setReferringPhysicians] = useState<ReferringPhysician[]>([]);
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetchJson<ReferringPhysician[]>(api("referring-physicians")),
      fetchJson<PriceList[]>(api("price-lists")),
    ]).then(([physicians, lists]) => {
      if (physicians.status === "fulfilled") setReferringPhysicians(physicians.value);
      if (lists.status === "fulfilled") setPriceLists(lists.value);
    }).catch(() => { /* keep empty lists */ });
  }, []);

  const valid = form.firstName.trim() !== "";

  const handleNationalIdImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, nationalIdImage: String(reader.result) });
    reader.readAsDataURL(file);
  };

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
      nationalId: form.nationalId.trim() || undefined,
      nationalIdImage: form.nationalIdImage || undefined,
      address: form.address.trim() || undefined,
      allergies: fromList(form.allergies),
      chronicDiseases: fromList(form.chronicDiseases),
      medications: fromList(form.medications),
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
      password: form.password || undefined,
      status: form.status || undefined,
      source: form.source || undefined,
      maritalStatus: form.maritalStatus || undefined,
      occupation: form.occupation.trim() || undefined,
      city: form.city.trim() || undefined,
      referringPhysicianId: form.referringPhysicianId || undefined,
      priceListId: form.priceListId || undefined,
      medicalHistory: form.medicalHistory
        ? { conditions: form.medicalHistory.conditions, allergies: form.medicalHistory.allergies }
        : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
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
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرقم القومي (اختياري)</label><input className={MODAL_INPUT_CLS} dir="ltr" value={form.nationalId} onChange={e => setForm({ ...form, nationalId: e.target.value })} placeholder="14 رقماً" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label><input className={MODAL_INPUT_CLS} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="العنوان الكامل" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">صورة البطاقة (اختياري)</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer border dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                {form.nationalIdImage ? "تغيير الصورة" : "📸 اختر صورة البطاقة"}
                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleNationalIdImage(f); }} />
              </label>
              {form.nationalIdImage && (
                <div className="relative shrink-0">
                  <img src={form.nationalIdImage} alt="بطاقة" className="w-16 h-12 object-cover rounded-lg border dark:border-gray-600" />
                  <button type="button" onClick={() => setForm({ ...form, nationalIdImage: "" })} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-4">×</button>
                </div>
              )}
            </div>
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
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة</label>
              <select className={MODAL_INPUT_CLS} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(PATIENT_STATUS_MAP).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحالة الاجتماعية</label>
              <select className={MODAL_INPUT_CLS} value={form.maritalStatus} onChange={e => setForm({ ...form, maritalStatus: e.target.value })}>
                {MARITAL_STATUS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مصدر الإحالة</label>
              <select className={MODAL_INPUT_CLS} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المهنة</label><input className={MODAL_INPUT_CLS} value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المدينة</label><input className={MODAL_INPUT_CLS} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الطبيب المحوّل</label>
            <select className={MODAL_INPUT_CLS} value={form.referringPhysicianId} onChange={e => setForm({ ...form, referringPhysicianId: e.target.value })}>
              <option value="">بدون</option>
              {referringPhysicians.map(r => <option key={r.id} value={r.id}>{r.name}{r.specialty ? ` (${r.specialty})` : ""}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قائمة الأسعار</label>
            <select className={MODAL_INPUT_CLS} value={form.priceListId} onChange={e => setForm({ ...form, priceListId: e.target.value })}>
              <option value="">الافتراضية</option>
              {priceLists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحساسية (افصل بفاصلة)</label><input className={MODAL_INPUT_CLS} value={form.allergies} onChange={e => setForm({ ...form, allergies: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أمراض مزمنة (افصل بفاصلة)</label><input className={MODAL_INPUT_CLS} value={form.chronicDiseases} onChange={e => setForm({ ...form, chronicDiseases: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أدوية حالية (افصل بفاصلة)</label><input className={MODAL_INPUT_CLS} value={form.medications} onChange={e => setForm({ ...form, medications: e.target.value })} /></div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">التاريخ الطبي</p>
            <MedicalHistoryChecklist value={form.medicalHistory} onChange={v => setForm({ ...form, medicalHistory: v })} />
          </div>
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
