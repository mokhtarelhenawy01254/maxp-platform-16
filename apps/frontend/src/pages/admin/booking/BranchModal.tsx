import { useState } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { tToast } from "../../../utils/i18n-toast";
import { BookingBranch, BranchFormData, MODAL_CONTENT_CLS, MODAL_INPUT_CLS, DAYS } from "./shared";

const compressImage = (file: File, maxW = 1200, quality = 0.8): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxW) { height = (height * maxW) / width; width = maxW; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('فشل تحميل الصورة')); };
    img.src = URL.createObjectURL(file);
  });

interface Props {
  branch?: Partial<BookingBranch> | null;
  onClose: () => void;
  onSave: (d: BranchFormData) => Promise<void>;
}

const tryParseGenderDays = (v: unknown): { male: string[]; female: string[] } | null => {
  if (!v) return null;
  const obj = typeof v === 'string' ? (() => { try { return JSON.parse(v); } catch { return null; } })() : v;
  if (!obj || typeof obj !== 'object') return null;
  return { male: obj.male || [], female: obj.female || [] };
};

export default function BranchModal({ branch, onClose, onSave }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "الاسم مطلوب";
    if (!form.address.trim()) e.address = "العنوان مطلوب";
    if (!(form.workingDays || "").split(",").filter(Boolean).length) e.workingDays = "اختر يوم عمل على الأقل";
    
    const validPhones = (form.phones || []).map(p => p.trim()).filter(Boolean);
    const phoneRegex = /^[0-9+\-\s]+$/;
    for (const p of validPhones) {
      if (!phoneRegex.test(p)) {
        e.phones = "يرجى إدخال أرقام هواتف صالحة فقط (أرقام، مسافات، علامة + أو -)";
        break;
      }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const initForm = () => {
    const defaults = { name: "", address: "", phones: [] as string[], workingDays: "sat,mon,wed", workStart: "09:00", workEnd: "22:00", maleDays: [] as string[], femaleDays: [] as string[], isActive: true, maxBookingsPerSlot: 1 };
    let initialPhones = (branch?.phones || []).filter(Boolean);
    if (initialPhones.length === 0 && branch?.phone) initialPhones = [branch.phone];
    if (!branch?.workingDays || typeof branch.workingDays === 'string') {
      const gd = tryParseGenderDays(branch?.genderDays);
      return { ...defaults, ...branch, phones: initialPhones, maleDays: gd?.male || [], femaleDays: gd?.female || [] };
    }
    const obj = branch.workingDays as Record<string, string>;
    const dayKeys = Object.keys(obj).filter(k => obj[k]);
    const times = dayKeys.length > 0 && dayKeys[0] ? (obj[dayKeys[0]] || "").split('-') : [];
    const gd = tryParseGenderDays(branch.genderDays);
    return {
      ...defaults, ...branch,
      workingDays: dayKeys.join(","),
      workStart: times[0] || "09:00",
      workEnd: times[1] || "22:00",
      phones: initialPhones,
      maleDays: gd?.male || [],
      femaleDays: gd?.female || [],
    };
  };
  const [form, setForm] = useState<BranchFormData>(() => initForm() as unknown as BranchFormData);
  const toggleWorkingDay = (d: string) => {
    const current = ((form.workingDays as string) || "").split(",").filter(Boolean);
    const next = current.includes(d) ? current.filter((x: string) => x !== d) : [...current, d];
    setForm({ ...form, workingDays: next.join(",") });
  };
  const toggleGenderDay = (type: "male" | "female", d: string) => {
    const key = type === "male" ? "maleDays" : "femaleDays";
    const current = form[key] || [];
    const next = current.includes(d) ? current.filter((x: string) => x !== d) : [...current, d];
    setForm({ ...form, [key]: next });
  };
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{branch?.id ? "تعديل فرع" : "إضافة فرع"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label><input className={MODAL_INPUT_CLS} value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: "" }); }} />{errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label><textarea className={MODAL_INPUT_CLS} rows={3} placeholder="مثال: ١٢ شارع النيل، الدور الثالث، بجوار الصيدلية" value={form.address || ""} onChange={e => { setForm({ ...form, address: e.target.value }); if (errors.address) setErrors({ ...errors, address: "" }); }} />{errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}</div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الموقع</label><input className={MODAL_INPUT_CLS} placeholder="رابط الخريطة أو عنوان الموقع" value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">صورة علامة مميزة</label>
            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800/40 transition cursor-pointer flex flex-col items-center justify-center gap-1">
              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) { tToast.error("BranchModal.msg_d137"); return; }
                if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { tToast.error("BranchModal.msg_b798"); return; }
                try { setForm({ ...form, landmarkImage: await compressImage(file) }); }
                catch { tToast.error("BranchModal.msg_6f5e"); }
              }} />
              <span className="text-gray-400 dark:text-gray-500 text-2xl">📸</span>
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">انقر هنا لاختيار صورة</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">الحد الأقصى للتحميل 2MB (JPG/PNG/WEBP)</span>
            </div>
            {form.landmarkImage && (
              <div className="mt-3 relative inline-block">
                <img src={form.landmarkImage} className="h-24 w-24 object-cover rounded-xl border-2 border-blue-500 shadow-sm" alt="علامة مميزة" />
                <button type="button" onClick={() => setForm({ ...form, landmarkImage: undefined })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center shadow hover:bg-red-600 transition">✕</button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أرقام الهاتف</label>
            <div className="space-y-2">
              {(form.phones || []).map((p: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <input className={`${MODAL_INPUT_CLS} flex-1`} dir="ltr" placeholder="010xxxxxxxx" value={p} onChange={e => {
                    const next = [...(form.phones || [])];
                    next[i] = e.target.value;
                    setForm({ ...form, phones: next });
                    if (errors.phones) setErrors({ ...errors, phones: "" });
                  }} />
                  <button type="button" onClick={() => setForm({ ...form, phones: (form.phones || []).filter((_, idx) => idx !== i) })} className="px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="حذف الرقم"><TrashIcon className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, phones: [...(form.phones || []), ""] })} className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700">+ إضافة رقم هاتف</button>
              {errors.phones && <p className="text-xs text-red-500 mt-1">{errors.phones}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">أيام العمل</label>
            {errors.workingDays && <p className="text-xs text-red-500 mb-1">{errors.workingDays}</p>}
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d => (
                <button type="button" key={d.value} onClick={() => toggleWorkingDay(d.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border dark:border-gray-600 ${(form.workingDays || "").split(",").includes(d.value) ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بداية العمل</label><input type="time" className={MODAL_INPUT_CLS} value={form.workStart} onChange={e => setForm({ ...form, workStart: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نهاية العمل</label><input type="time" className={MODAL_INPUT_CLS} value={form.workEnd} onChange={e => setForm({ ...form, workEnd: e.target.value })} /></div>
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">فصل الحجز حسب الجنس (اختياري)</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">اتركهم فاضيين لو الفرع بيستقبل الرجال والسيدات في كل الأيام.</p>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 block">أيام الرجال</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => {
                    const isWorkingDay = (form.workingDays || "").split(",").includes(d.value);
                    return (
                      <button type="button" key={d.value} disabled={!isWorkingDay} onClick={() => toggleGenderDay("male", d.value)}
                        title={!isWorkingDay ? "يجب اختيار هذا اليوم كأحد أيام العمل أولاً" : ""}
                        className={`px-3 py-1.5 rounded-lg text-sm border dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed ${(form.maleDays || []).includes(d.value) ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}>{d.label}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-pink-600 dark:text-pink-400 mb-1 block">أيام السيدات</span>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => {
                    const isWorkingDay = (form.workingDays || "").split(",").includes(d.value);
                    return (
                      <button type="button" key={d.value} disabled={!isWorkingDay} onClick={() => toggleGenderDay("female", d.value)}
                        title={!isWorkingDay ? "يجب اختيار هذا اليوم كأحد أيام العمل أولاً" : ""}
                        className={`px-3 py-1.5 rounded-lg text-sm border dark:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed ${(form.femaleDays || []).includes(d.value) ? "bg-pink-600 text-white border-pink-600" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}>{d.label}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحد الأقصى للحجوزات لكل وقت</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">عدد الحجوزات المسموح بها في نفس الساعة (الافتراضي: ١)</p>
            <input type="number" min={1} max={99} className={MODAL_INPUT_CLS} value={form.maxBookingsPerSlot ?? 1} onChange={e => setForm({ ...form, maxBookingsPerSlot: Math.max(1, Number(e.target.value)) })} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
          <button onClick={() => { if (validate()) onSave(form); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">حفظ</button>
        </div>
      </div>
    </div>
  );
}
