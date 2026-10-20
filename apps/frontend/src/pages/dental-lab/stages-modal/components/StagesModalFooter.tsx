import { CheckCircle2, Loader2 } from "lucide-react";

interface StagesModalFooterProps {
  saving: boolean;
  loading: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function StagesModalFooter({
  saving,
  loading,
  onClose,
  onSave,
}: StagesModalFooterProps) {
  return (
    <div className="flex items-center justify-between p-4 border-t dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/40">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 hidden sm:block">
        أي حالة جديدة يتم إنشاؤها لهذا النوع ستأخذ تسلسل المراحل هذا تلقائياً مع أدوارها وSLA المحددة.
      </p>
      <div className="flex items-center gap-2.5 ms-auto">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 border dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || loading}
          className="px-5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          حفظ قالب المراحل
        </button>
      </div>
    </div>
  );
}

export default StagesModalFooter;
