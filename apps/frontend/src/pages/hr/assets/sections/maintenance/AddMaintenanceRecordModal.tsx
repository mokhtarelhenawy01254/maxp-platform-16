import React from "react";
import { NewMaintenanceRecordFormState } from "./types";
import { DateInput } from '../../../../../components/ui/DateInput';

interface AddMaintenanceRecordModalProps {
  open: boolean;
  onClose: () => void;
  assets: any[];
  newRecord: NewMaintenanceRecordFormState;
  onChangeRecord: (val: NewMaintenanceRecordFormState) => void;
  onSubmit: () => void;
}

export const AddMaintenanceRecordModal: React.FC<
  AddMaintenanceRecordModalProps
> = ({ open, onClose, assets, newRecord, onChangeRecord, onSubmit }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-gray-900 dark:text-white">
            تسجيل عملية صيانة / جدولة
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl font-light transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
              اختيار الأصل
            </label>
            <select
              value={newRecord.assetId}
              onChange={(e) =>
                onChangeRecord({ ...newRecord, assetId: e.target.value })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">-- اختر الأصل من القائمة --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
              نوع العملية
            </label>
            <select
              value={newRecord.type}
              onChange={(e) =>
                onChangeRecord({ ...newRecord, type: e.target.value })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
            >
              <option>صيانة دورية</option>
              <option>إصلاح عطل</option>
              <option>تحديث (Upgrade)</option>
              <option>فحص وقائي</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
              الحالة
            </label>
            <select
              value={newRecord.status}
              onChange={(e) =>
                onChangeRecord({
                  ...newRecord,
                  status: e.target.value,
                })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all"
            >
              <option value="COMPLETED">تمت بنجاح (سجل تاريخي)</option>
              <option value="SCHEDULED">مجدولة (تنبيه مستقبلي)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
              التكلفة المتوقعة/الفعلية
            </label>
            <input
              type="number"
              value={newRecord.cost}
              onChange={(e) =>
                onChangeRecord({ ...newRecord, cost: e.target.value })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all font-mono tabular-nums"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
              التاريخ
            </label>
            <DateInput
              value={newRecord.startDate}
              onChange={(e) =>
                onChangeRecord({ ...newRecord, startDate: e.target.value })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-3 text-sm font-bold dark:text-white focus:border-indigo-500 outline-none transition-all font-mono tabular-nums"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
              وصف العملية / ملاحظات
            </label>
            <textarea
              value={newRecord.description}
              onChange={(e) =>
                onChangeRecord({ ...newRecord, description: e.target.value })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-2xl px-5 py-4 text-sm font-bold dark:text-white h-24 outline-none focus:border-indigo-500 transition-all"
              placeholder="اكتب تفاصيل ما تم أو ما سيتم القيام به..."
            ></textarea>
          </div>
        </div>

        <div className="flex gap-4 mt-10">
          <button
            onClick={onSubmit}
            className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-none transform hover:-translate-y-1 transition-all"
          >
            حفظ السجل / الجدولة
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 py-4 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
