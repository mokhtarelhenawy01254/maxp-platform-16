import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, UserPlus, X as XMarkIcon } from "lucide-react";
import { createDoctor, MODAL_INPUT_CLS } from "../../shared";
import type { NewDoctorInlineProps } from "../types/quickOrderTypes";

export function NewDoctorInline({ onCreated, onCancel }: NewDoctorInlineProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [saving, setSaving] = useState(false);

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  const save = async () => {
    if (!name.trim()) {
      toast.error("اسم الطبيب مطلوب");
      return;
    }
    setSaving(true);
    try {
      const created = await createDoctor({
        name: name.trim(),
        phone: phone.trim() || undefined,
        clinicName: clinicName.trim() || undefined,
        isActive: true,
      });
      toast.success("تمت إضافة الطبيب بنجاح");
      onCreated(created);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل حفظ الطبيب");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/10 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" />
          إضافة طبيب وعيادة جديدة فوراً
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="إلغاء الإضافة"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          className={inputCls}
          placeholder="اسم الطبيب (د. فلان) *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          className={inputCls}
          placeholder="رقم الهاتف (01xxxxxxxxx)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          dir="ltr"
        />
        <input
          className={`${inputCls} sm:col-span-2`}
          placeholder="اسم العيادة أو المركز الطبي"
          value={clinicName}
          onChange={(e) => setClinicName(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1 shadow-sm transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          حفظ واختيار الطبيب
        </button>
      </div>
    </div>
  );
}

export default NewDoctorInline;
