import React from "react";

export interface BulkActionsProps {
  selectedTasksCount: number;
  handleBulkStatusChange: (status: string) => void;
  handleBulkDelete: () => void;
  onClearSelection: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedTasksCount,
  handleBulkStatusChange,
  handleBulkDelete,
  onClearSelection,
}) => {
  if (selectedTasksCount === 0) return null;

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-indigo-700 dark:text-indigo-300">
          تم تحديد {selectedTasksCount} مهمة
        </span>
        <div className="flex space-x-2 space-x-reverse">
          <button
            onClick={() => handleBulkStatusChange("in_progress")}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            بدء التنفيذ
          </button>
          <button
            onClick={() => handleBulkStatusChange("completed")}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            إكمال
          </button>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
          >
            حذف
          </button>
          <button
            onClick={onClearSelection}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            إلغاء التحديد
          </button>
        </div>
      </div>
    </div>
  );
};
