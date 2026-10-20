import React from 'react';
import { Courier, CourierInput } from '../../../../services/courierService';

interface CourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCourier: Courier | null;
  formData: CourierInput;
  setFormData: React.Dispatch<React.SetStateAction<CourierInput>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => Promise<void>;
}

export const CourierModal: React.FC<CourierModalProps> = ({
  isOpen,
  onClose,
  editingCourier,
  formData,
  setFormData,
  saving,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base sm:text-lg">
            {editingCourier ? 'تعديل بيانات المندوب' : 'إضافة مندوب توصيل داخلي'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
          >
            ✕
          </button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">اسم المندوب *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
                placeholder="مثال: أحمد عبد الله"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">رقم الهاتف *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none font-mono tabular-nums"
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">الرقم القومي (اختياري)</label>
              <input
                type="text"
                value={formData.nationalId || ''}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none font-mono tabular-nums"
                placeholder="14 رقم"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">وسيلة الانتقال</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              >
                <option value="MOTORCYCLE">دراجة نارية / موتوسيكل</option>
                <option value="CAR">سيارة ملاكي</option>
                <option value="VAN">فان / نقل بضائع</option>
                <option value="BICYCLE">دراجة هوائية</option>
                <option value="ON_FOOT">راجل / مشياً</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">رقم اللوحة / المركبة</label>
              <input
                type="text"
                value={formData.plateNumber || ''}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none font-mono"
                placeholder="مثال: أ ب ج 123"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">عمولة التوصيل للطرد (ج.م)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.commissionAmount || 0}
                onChange={(e) =>
                  setFormData({ ...formData, commissionAmount: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">المناطق / خطوط السير المغطاة</label>
            <input
              type="text"
              value={formData.governorates || ''}
              onChange={(e) => setFormData({ ...formData, governorates: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              placeholder="مثال: القاهرة، مدينة نصر، مصر الجديدة، التجمع"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">ملاحظات داخلية</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              placeholder="أي تفاصيل خاصة بالمندوب..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-50 font-medium"
            >
              {saving ? 'جاري الحفظ...' : editingCourier ? 'حفظ التعديلات' : 'إضافة المندوب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
