import { useState, type FormEvent } from "react";
import { Building2, Loader2, X } from "lucide-react";
import { MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "../../shared";
import type { AddSupplierModalProps } from "../types/materialsTypes";

export function AddSupplierModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: AddSupplierModalProps) {
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setName("");
    setContactPerson("");
    setPhone("");
    setCity("");
    setNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className={MODAL_CONTENT_CLS}>
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>إضافة مورد / شركة خامات جديدة</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              يتم حفظ المورد في قاعدة بيانات الموردين الموحدة للمنظومة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              اسم الشركة أو المورد *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: شركة دلتا للزيركون ومستلزمات الأسنان"
              className={MODAL_INPUT_CLS}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                مسؤول المبيعات / المندوب
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. م. أحمد خليل"
                className={MODAL_INPUT_CLS}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
                رقم الهاتف / الواتساب
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010xxxxxxxx"
                className={`${MODAL_INPUT_CLS} font-mono`}
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              المدينة / المقر
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="القاهرة، الإسكندرية، المنصورة..."
              className={MODAL_INPUT_CLS}
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-300">
              ملاحظات أو شروط السداد
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: سداد آجل 15 يوم، خصم 5% على كميات أقراص الزيركون..."
              className={MODAL_INPUT_CLS}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? "جاري الحفظ..." : "حفظ المورد"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSupplierModal;
