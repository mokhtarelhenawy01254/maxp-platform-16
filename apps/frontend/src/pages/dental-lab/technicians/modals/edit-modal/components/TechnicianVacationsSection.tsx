import type { Dispatch, SetStateAction } from "react";
import { Palmtree, Plus, Trash2 } from "lucide-react";
import { MODAL_INPUT_CLS } from "../../../../shared";
import type { TechnicianForm } from "../../types/technicianTypes";

interface TechnicianVacationsSectionProps {
  modal: TechnicianForm;
  setModal: Dispatch<SetStateAction<TechnicianForm | null>>;
}

export function TechnicianVacationsSection({ modal, setModal }: TechnicianVacationsSectionProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="sm:col-span-2 border-t dark:border-gray-700/80 pt-4 mt-2">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Palmtree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
            الإجازات الاستثنائية والتفرغ (Exceptional Vacations)
          </h4>
        </div>
        <button
          type="button"
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setModal({
              ...modal,
              vacations: [
                ...modal.vacations,
                { startDate: today, endDate: today, reason: "" },
              ],
            });
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة فترة إجازة</span>
        </button>
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
        يتم استبعاد الفني آلياً من التوزيع الذكي والمحرك خلال فترات الإجازة المحددة لحماية سلاسة العمل.
      </p>

      {modal.vacations.length === 0 ? (
        <div className="p-3 text-center border border-dashed rounded-lg border-gray-200 dark:border-gray-700/80 text-xs text-gray-400 dark:text-gray-500">
          لا توجد إجازات استثنائية مسجلة حالياً (الفني متاح للعمل حسب جدوله الأسبوعي).
        </div>
      ) : (
        <div className="space-y-2">
          {modal.vacations.map((vac, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/40"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">من تاريخ *</span>
                  <input
                    type="date"
                    className={`${inputCls} py-1 text-xs font-mono`}
                    value={vac.startDate}
                    onChange={(e) => {
                      const next = [...modal.vacations];
                      next[idx] = { ...next[idx], startDate: e.target.value };
                      setModal({ ...modal, vacations: next });
                    }}
                    required
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">إلى تاريخ *</span>
                  <input
                    type="date"
                    className={`${inputCls} py-1 text-xs font-mono`}
                    value={vac.endDate}
                    onChange={(e) => {
                      const next = [...modal.vacations];
                      next[idx] = { ...next[idx], endDate: e.target.value };
                      setModal({ ...modal, vacations: next });
                    }}
                    required
                  />
                </div>
              </div>
              <div className="flex-[1.5]">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-0.5">السبب / ملاحظات</span>
                <input
                  type="text"
                  className={`${inputCls} py-1 text-xs`}
                  placeholder="سبب الإجازة (اختياري، مثلاً: راحة مرضية، سفر، ظرف عائلي)"
                  value={vac.reason || ""}
                  onChange={(e) => {
                    const next = [...modal.vacations];
                    next[idx] = { ...next[idx], reason: e.target.value };
                    setModal({ ...modal, vacations: next });
                  }}
                />
              </div>
              <div className="sm:self-end flex justify-end pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = modal.vacations.filter((_, i) => i !== idx);
                    setModal({ ...modal, vacations: next });
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                  title="حذف هذه الإجازة"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
