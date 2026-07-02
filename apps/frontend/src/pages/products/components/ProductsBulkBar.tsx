import React from "react";
import {
  TrashIcon,
  XMarkIcon,
  EyeSlashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

interface ProductsBulkBarProps {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
  onHide: () => void;
  onUnhide: () => void;
}

const ProductsBulkBar: React.FC<ProductsBulkBarProps> = ({
  selectedCount,
  onDelete,
  onClear,
  onHide,
  onUnhide,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-indigo-50/80 dark:bg-indigo-900/30 backdrop-blur-sm border border-indigo-200 dark:border-indigo-700/50 rounded-xl p-4 flex items-center justify-between shadow-md">
      <span className="text-indigo-700 dark:text-indigo-300 font-bold">
        تم تحديد {selectedCount} منتج
      </span>
      <div className="flex items-center space-x-3 space-x-reverse">
        <button
          onClick={onHide}
          className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
        >
          <EyeSlashIcon className="h-4 w-4 ml-1" />
          إخفاء
        </button>
        <button
          onClick={onUnhide}
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <EyeIcon className="h-4 w-4 ml-1" />
          إظهار
        </button>
        <button
          onClick={onDelete}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
        >
          <TrashIcon className="h-4 w-4 ml-1" />
          حذف
        </button>
        <button
          onClick={onClear}
          className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-semibold hover:bg-gray-600 transition-colors shadow-sm"
        >
          <XMarkIcon className="h-4 w-4 ml-1" />
          إلغاء التحديد
        </button>
      </div>
    </div>
  );
};

export default ProductsBulkBar;
