import {
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import type { PreparationStatusOption } from "../types";

interface PreparationBulkActionsProps {
  selectedOrdersCount: number;
  bulkStatus: string;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  bulkUpdating: boolean;
  preparationEnabled: boolean;
  bulkStatusUpdateEnabled: boolean;
  onBulkStatusChange: (value: string) => void;
  onApply: () => void;
  onClear: () => void;
}

const PreparationBulkActions = ({
  selectedOrdersCount,
  bulkStatus,
  statusOptions,
  statusLabelMap,
  bulkUpdating,
  preparationEnabled,
  bulkStatusUpdateEnabled,
  onBulkStatusChange,
  onApply,
  onClear,
}: PreparationBulkActionsProps) => {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            إجراءات جماعية للمخزن
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            اختَر أكثر من طلب وحرّكهم دفعة واحدة لنفس المرحلة لتقليل العمل
            اليدوي.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
          محدد الآن: {selectedOrdersCount} طلب
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <select
          value={bulkStatus}
          onChange={(event) => onBulkStatusChange(event.target.value)}
          disabled={!preparationEnabled || !bulkStatusUpdateEnabled}
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white lg:max-w-sm"
        >
          <option value="">اختر المرحلة المستهدفة</option>
          {statusOptions.map((status) => (
            <option key={status.code} value={status.code}>
              {statusLabelMap.get(status.code) || status.fallbackName}
            </option>
          ))}
        </select>

        <button
          onClick={onApply}
          disabled={
            !preparationEnabled ||
            !bulkStatusUpdateEnabled ||
            !bulkStatus ||
            selectedOrdersCount === 0 ||
            bulkUpdating
          }
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkUpdating ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          تطبيق على المحدد
        </button>

        <button
          onClick={onClear}
          disabled={selectedOrdersCount === 0 && !bulkStatus}
          className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          مسح التحديد
        </button>
      </div>

      {!bulkStatusUpdateEnabled ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          تم إيقاف تحديث المراحل جماعيًا من إعدادات تجهيز الطلبات.
        </div>
      ) : null}
    </section>
  );
};

export default PreparationBulkActions;
