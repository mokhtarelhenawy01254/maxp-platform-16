import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  Check,
  CheckSquare,
  Loader2,
  Sparkles,
  Square,
  X as XMarkIcon,
} from "lucide-react";
import {
  batchCreateMonthlyInvoices,
  fetchUninvoicedSummary,
  fmtMoney,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  type UninvoicedSummaryResult,
} from "../../shared";

interface DentalInvoiceBatchModalProps {
  summary: UninvoicedSummaryResult;
  onClose: () => void;
  onSaved: () => void;
}

export function DentalInvoiceBatchModal({
  summary,
  onClose,
  onSaved,
}: DentalInvoiceBatchModalProps) {
  const [includeAllStatuses, setIncludeAllStatuses] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<UninvoicedSummaryResult>(summary);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>(() =>
    summary.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id))
  );
  const [mode, setMode] = useState<"PER_CASE" | "CONSOLIDATED">("PER_CASE");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(10);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleIncludeAllToggle = async (checked: boolean) => {
    setIncludeAllStatuses(checked);
    setLoadingSummary(true);
    try {
      const res = await fetchUninvoicedSummary(checked);
      setCurrentSummary(res);
      setSelectedDoctorIds(
        res.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id))
      );
    } catch {
      toast.error("فشل تحديث ملخص الحالات");
    } finally {
      setLoadingSummary(false);
    }
  };

  const allSelected =
    currentSummary.doctors.length > 0 &&
    selectedDoctorIds.length === currentSummary.doctors.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDoctorIds([]);
    } else {
      setSelectedDoctorIds(
        currentSummary.doctors.map((d) => d.doctorId).filter((id): id is string => Boolean(id))
      );
    }
  };

  const toggleDoctor = (id: string | null) => {
    if (!id) return;
    setSelectedDoctorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedStats = useMemo(() => {
    const filtered = currentSummary.doctors.filter(
      (d) => d.doctorId && selectedDoctorIds.includes(d.doctorId)
    );
    const cases = filtered.reduce((sum, d) => sum + d.casesCount, 0);
    const amount = filtered.reduce((sum, d) => sum + d.totalAmount, 0);
    return { doctorsCount: filtered.length, cases, amount };
  }, [currentSummary, selectedDoctorIds]);

  const handleRunBatch = async () => {
    if (selectedDoctorIds.length === 0) {
      toast.error("يرجى اختيار طبيب واحد على الأقل لإصدار الفواتير له");
      return;
    }
    setSubmitting(true);
    try {
      const res = await batchCreateMonthlyInvoices({
        doctorIds: selectedDoctorIds,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
        mode,
        includeAllStatuses,
      });
      toast.success(
        `تم إنشاء ${res.createdCount} فاتورة بنجاح لـ ${res.invoicedCasesCount} حالة!`
      );
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إنشاء الفواتير المجمعة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={() => !submitting && onClose()}
    >
      <div className={`${MODAL_CONTENT_CLS} max-w-2xl my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 border-b dark:border-gray-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-lg">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">إصدار الفواتير الشهرية المجمعة</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                تجميع الحالات المكتملة أو قيد التشغيل وإصدار مطالبات رسمية للأطباء
              </p>
            </div>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-0.5">
          {/* Include all statuses toggle */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeAllStatuses}
                onChange={(e) => handleIncludeAllToggle(e.target.checked)}
                disabled={loadingSummary || submitting}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                تضمين كافة الحالات المسجلة (حتى تحت التشغيل والتصميم)
              </span>
            </label>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {loadingSummary
                ? "جارٍ التحديث..."
                : includeAllStatuses
                ? "شامل جميع الحالات غير المفوترة"
                : "الحالات الجاهزة/المكتملة فقط"}
            </span>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border dark:border-gray-700/50">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                نمط إصدار الفواتير
              </label>
              <select
                className={`${MODAL_INPUT_CLS} text-sm`}
                value={mode}
                onChange={(e) => setMode(e.target.value as "PER_CASE" | "CONSOLIDATED")}
              >
                <option value="PER_CASE">
                  فاتورة مستقلة لكل حالة (إصدار فاتورة برقم منفصل لكل كارتة)
                </option>
                <option value="CONSOLIDATED">
                  فاتورة شهرية مجمعة لكل طبيب (تضم كافة الحالات مفصلة بالمرضى والوحدات والأسعار)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                تاريخ استحقاق الفواتير
              </label>
              <input
                type="date"
                className={`${MODAL_INPUT_CLS} text-sm`}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                ملاحظات تظهر على الفواتير الصادرة
              </label>
              <input
                className={`${MODAL_INPUT_CLS} text-sm`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: مطالبات دورية لشهر ..."
              />
            </div>
          </div>

          {/* Doctors Selection Header */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>{allSelected ? "إلغاء تحديد الكل" : "تحديد جميع الأطباء"}</span>
              </button>
            </div>
            <span className="text-xs text-gray-500 font-mono tabular-nums">
              المحدد:{" "}
              <strong className="text-gray-900 dark:text-gray-100">
                {selectedStats.doctorsCount} طبيب
              </strong>{" "}
              ({selectedStats.cases} حالة) بإجمالي{" "}
              <strong className="text-blue-600 dark:text-blue-400">
                {fmtMoney(selectedStats.amount)} ج.م
              </strong>
            </span>
          </div>

          {/* Doctor Rows */}
          <div className="border dark:border-gray-700 rounded-xl divide-y dark:divide-gray-700 max-h-56 overflow-y-auto">
            {currentSummary.doctors.map((doc) => {
              const isSelected = Boolean(
                doc.doctorId && selectedDoctorIds.includes(doc.doctorId)
              );
              return (
                <div
                  key={doc.doctorId || doc.doctorName}
                  onClick={() => toggleDoctor(doc.doctorId)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50/60 dark:bg-blue-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {doc.doctorName}
                      </p>
                      <p className="text-xs text-gray-500 font-mono tabular-nums">
                        {doc.clinicName ? `${doc.clinicName} • ` : ""}
                        {doc.casesCount} حالة غير مفوترة
                      </p>
                    </div>
                  </div>
                  <div className="text-left font-mono tabular-nums">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {fmtMoney(doc.totalAmount)} ج.م
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800 mt-4">
          <div className="text-xs text-gray-500">
            سيتم إنشاء الفواتير بنمط{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {mode === "PER_CASE"
                ? "فاتورة منفصلة لكل حالة"
                : "فاتورة شهرية مجمعة شاملة الحالات"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleRunBatch}
              disabled={submitting || selectedDoctorIds.length === 0}
              className="px-5 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold disabled:opacity-50 flex items-center gap-2 shadow-sm font-mono tabular-nums"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {submitting
                ? "جاري الإصدار..."
                : mode === "PER_CASE"
                ? `إصدار (${selectedStats.cases}) فاتورة`
                : `إصدار فواتير مجمعة لـ (${selectedStats.doctorsCount}) طبيب`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceBatchModal;

