import { BadgePercent, CheckCircle2, Loader2 } from "lucide-react";
import { fmtMoney, MODAL_INPUT_CLS } from "../../shared";
import type { DoctorPricingTabProps } from "../types/doctorDetailTypes";

export function DoctorPricingTab({
  workTypes,
  pricingMap,
  onPricingChange,
  loading,
  saving,
  onSave,
}: DoctorPricingTabProps) {
  return (
    <div className="space-y-4">
      {/* Top Header Card with Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-indigo-600" />
            قائمة الأسعار المخصصة للطبيب (Rate Sheet)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            حدد أسعاراً خاصة لهذا الطبيب تختلف عن السعر الافتراضي للمعمل. الحقل الفارغ يعتمد السعر الافتراضي تلقائياً.
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{saving ? "جاري الحفظ..." : "حفظ قائمة الأسعار"}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-b dark:border-gray-700 text-right">
                  <th className="py-3 px-4">نوع الشغل / الخدمة</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4">السعر الافتراضي للمعمل</th>
                  <th className="py-3 px-4">السعر المخصص للدكتور (ج.م)</th>
                  <th className="py-3 px-4">الفارق / الخصم</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {workTypes.map((w) => {
                  const customVal = pricingMap[w.id];
                  const numCustom = customVal !== "" && customVal != null ? Number(customVal) : null;
                  const hasCustom = numCustom !== null && !isNaN(numCustom);
                  const diff = hasCustom ? numCustom - w.price : 0;

                  return (
                    <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-gray-100">
                        {w.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">{w.category || "عام"}</td>
                      <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-300 font-mono tabular-nums">
                        {fmtMoney(w.price)} ج.م
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          placeholder={`الافتراضي (${w.price})`}
                          value={pricingMap[w.id] ?? ""}
                          onChange={(e) => onPricingChange(w.id, e.target.value)}
                          className={`${MODAL_INPUT_CLS} w-36 text-sm py-1 font-semibold font-mono tabular-nums ${
                            hasCustom ? "border-indigo-400 bg-indigo-50/20" : ""
                          }`}
                        />
                      </td>
                      <td className="py-3 px-4 text-xs font-mono tabular-nums">
                        {hasCustom ? (
                          diff < 0 ? (
                            <span className="text-emerald-600 font-bold">
                              خصم {fmtMoney(Math.abs(diff))} ج.م (
                              {Math.round((Math.abs(diff) / w.price) * 100)}%)
                            </span>
                          ) : diff > 0 ? (
                            <span className="text-amber-600 font-bold">
                              زيادة {fmtMoney(diff)} ج.م
                            </span>
                          ) : (
                            <span className="text-gray-400 font-sans">نفس السعر</span>
                          )
                        ) : (
                          <span className="text-gray-400 font-sans">سعر المعمل الافتراضي</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorPricingTab;
