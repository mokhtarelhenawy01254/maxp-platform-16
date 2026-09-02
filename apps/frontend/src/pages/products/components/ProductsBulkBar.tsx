import React from "react";
import {
  TrashIcon,
  XMarkIcon,
  EyeSlashIcon,
  EyeIcon,
  ArrowPathIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";

interface ProductsBulkBarProps {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onConvertToPresentations: () => void;
  onEnableTrack?: () => void;
  onDisableTrack?: () => void;
}

const ProductsBulkBar: React.FC<ProductsBulkBarProps> = ({
  selectedCount,
  onDelete,
  onClear,
  onHide,
  onUnhide,
  onConvertToPresentations,
  onEnableTrack,
  onDisableTrack,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-indigo-50/95 dark:bg-indigo-950/60 backdrop-blur-sm border border-indigo-200/80 dark:border-indigo-800/60 rounded-xl p-2.5 sm:p-3.5 shadow-md space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between animate-slide-up">
      {/* Top row on mobile / Left side on desktop */}
      <div className="flex items-center justify-between sm:justify-start gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs sm:text-sm font-bold shadow-xs">
          <span>تم تحديد</span>
          <span className="font-mono px-1 bg-white/20 rounded">{selectedCount}</span>
          <span>منتج</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 bg-white/80 dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xs"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          <span>إلغاء</span>
        </button>
      </div>

      {/* Action Buttons: Horizontal scrollable strip on mobile, flex row on desktop */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 pt-0.5 sm:pb-0">
        <button
          type="button"
          onClick={onConvertToPresentations}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-purple-700 transition-all shadow-xs shrink-0 active:scale-95"
        >
          <ArrowPathIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>حوّل لعروض</span>
        </button>

        {onEnableTrack && (
          <button
            type="button"
            onClick={onEnableTrack}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-teal-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-teal-700 transition-all shadow-xs shrink-0 active:scale-95"
            title="تفعيل تتبع المخزون"
          >
            <CubeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>تفعيل التتبع</span>
          </button>
        )}

        {onDisableTrack && (
          <button
            type="button"
            onClick={onDisableTrack}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-700 transition-all shadow-xs shrink-0 active:scale-95"
            title="إيقاف تتبع المخزون"
          >
            <CubeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
            <span>إيقاف التتبع</span>
          </button>
        )}

        <button
          type="button"
          onClick={onHide}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-orange-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-orange-600 transition-all shadow-xs shrink-0 active:scale-95"
        >
          <EyeSlashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>إخفاء</span>
        </button>

        <button
          type="button"
          onClick={onUnhide}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-all shadow-xs shrink-0 active:scale-95"
        >
          <EyeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>إظهار</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-red-700 transition-all shadow-xs shrink-0 active:scale-95"
        >
          <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>حذف</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-2 bg-gray-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-gray-600 transition-all shadow-xs shrink-0 active:scale-95"
        >
          <XMarkIcon className="h-4 w-4" />
          <span>إلغاء التحديد</span>
        </button>
      </div>
    </div>
  );
};

export default ProductsBulkBar;
