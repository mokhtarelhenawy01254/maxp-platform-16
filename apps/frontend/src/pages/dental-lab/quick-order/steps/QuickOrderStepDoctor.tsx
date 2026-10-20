import { AlertTriangle, Loader2, Plus, Search, Stethoscope } from "lucide-react";
import { fmtMoney, MODAL_INPUT_CLS } from "../../shared";
import { DoctorCard } from "../components/DoctorCard";
import { NewDoctorInline } from "../components/NewDoctorInline";
import type { QuickOrderStepDoctorProps } from "../types/quickOrderTypes";

export function QuickOrderStepDoctor({
  doctorSearch,
  onDoctorSearchChange,
  filteredDoctors,
  selectedDoctor,
  onSelectDoctor,
  treatingDoctorName,
  onTreatingDoctorNameChange,
  customDoctorInput,
  onCustomDoctorInputChange,
  showNewDoctor,
  onShowNewDoctorChange,
  doctorsLoading,
  bypassCreditCheck,
  onBypassCreditCheckChange,
  onDoctorCreated,
}: QuickOrderStepDoctorProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          اختر الطبيب أو العيادة المرسلة لأمر الشغل:
        </p>
        {!showNewDoctor && (
          <button
            type="button"
            onClick={() => onShowNewDoctorChange(true)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            طبيب / عيادة جديدة
          </button>
        )}
      </div>

      {showNewDoctor && (
        <NewDoctorInline
          onCreated={onDoctorCreated}
          onCancel={() => onShowNewDoctorChange(false)}
        />
      )}

      <div className="relative">
        <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" />
        <input
          className={`${inputCls} pr-9`}
          placeholder="بحث باسم الطبيب، العيادة، أو رقم الهاتف..."
          value={doctorSearch}
          onChange={(e) => onDoctorSearchChange(e.target.value)}
          autoFocus
        />
      </div>

      {selectedDoctor && (
        <div className="p-3.5 rounded-xl border-2 border-blue-500 bg-blue-50/40 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                د
              </div>
              <div>
                <div className="font-bold text-sm text-blue-900 dark:text-blue-100">
                  {selectedDoctor.name}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  {selectedDoctor.clinicName || "عيادة خاصة"}
                </div>
              </div>
            </div>
            <div className="text-end">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">الرصيد المستحق: </span>
              <span className="font-bold text-sm text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {fmtMoney(selectedDoctor.outstanding)} ج.م
              </span>
            </div>
          </div>

          {selectedDoctor.creditExceeded && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>
                  تحذير: الطبيب تجاوز حد الائتمان المحدد ({fmtMoney(selectedDoctor.creditLimit)} ج.م)
                </span>
              </div>
              <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={bypassCreditCheck}
                  onChange={(e) => onBypassCreditCheckChange(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500"
                />
                موافقة على الاستثناء
              </label>
            </div>
          )}

          {/* تحديد الطبيب المعالج داخل العيادة / المركز */}
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>الطبيب المعالج داخل العيادة / المركز:</span>
              </label>
              <span className="text-[10px] text-gray-500">يظهر في كارتة الحالة وتفاصيل الفاتورة</span>
            </div>

            {Array.isArray(selectedDoctor.doctors) &&
            selectedDoctor.doctors.length > 0 &&
            !customDoctorInput ? (
              <div className="flex items-center gap-2">
                <select
                  className={`${inputCls} text-xs flex-1`}
                  value={treatingDoctorName}
                  onChange={(e) => {
                    if (e.target.value === "__CUSTOM__") {
                      onCustomDoctorInputChange(true);
                      onTreatingDoctorNameChange("");
                    } else {
                      onTreatingDoctorNameChange(e.target.value);
                    }
                  }}
                >
                  <option value="">
                    -- {selectedDoctor.name} (الطبيب الرئيسي / الحساب المالي الموحد) --
                  </option>
                  {selectedDoctor.doctors.map((doc, idx) => (
                    <option key={doc.id || idx} value={doc.name}>
                      {doc.name} {doc.specialty ? `(${doc.specialty})` : ""}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ كتابة اسم طبيب آخر غير مسجل بالعيادة...</option>
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  className={`${inputCls} text-xs flex-1`}
                  placeholder="اسم الطبيب المعالج (مثال: د. شريف)"
                  value={treatingDoctorName}
                  onChange={(e) => onTreatingDoctorNameChange(e.target.value)}
                />
                {Array.isArray(selectedDoctor.doctors) && selectedDoctor.doctors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onCustomDoctorInputChange(false)}
                    className="px-2 py-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline shrink-0 font-medium"
                  >
                    اختر من أطباء العيادة
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {doctorsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400">لا يوجد أطباء مطابقين للبحث</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[40vh] overflow-y-auto">
          {filteredDoctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              selected={selectedDoctor?.id === doc.id}
              onSelect={() => onSelectDoctor(doc)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default QuickOrderStepDoctor;
