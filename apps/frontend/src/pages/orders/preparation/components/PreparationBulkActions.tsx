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
    <section className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {/* Title + count */}
        <span className="text-sm font-semibold text-gray-700">إجراءات جماعية</span>

        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
          <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
          محدد الآن: {selectedOrdersCount} طلب
        </span>

        {/* Divider */}
        <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />

        {/* Status select */}
        <select
          value={bulkStatus}
          onChange={(e) => onBulkStatusChange(e.target.value)}
          disabled={!preparationEnabled || !bulkStatusUpdateEnabled}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-amber-400 focus:bg-white sm:max-w-xs"
        >
          <option value="">اختر المرحلة المستهدفة</option>
          {statusOptions.map((status) => (
            <option key={status.code} value={status.code}>
              {statusLabelMap.get(status.code) || status.fallbackName}
            </option>
          ))}
        </select>

        {/* Apply */}
        <button
          onClick={onApply}
          disabled={
            !preparationEnabled ||
            !bulkStatusUpdateEnabled ||
            !bulkStatus ||
            selectedOrdersCount === 0 ||
            bulkUpdating
          }
          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkUpdating ? (
            <ArrowPathIcon className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          تطبيق على المحدد
        </button>

        {/* Clear */}
        <button
          onClick={onClear}
          disabled={selectedOrdersCount === 0 && !bulkStatus}
          className="inline-flex items-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          مسح التحديد
        </button>
      </div>

      {!bulkStatusUpdateEnabled ? (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          تم إيقاف تحديث المراحل جماعيًا من إعدادات تجهيز الطلبات.
        </div>
      ) : null}
    </section>
  );
};

export default PreparationBulkActions;
