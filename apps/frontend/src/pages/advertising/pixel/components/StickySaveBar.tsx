import React from "react";
import {
  CheckIcon,
  ArrowPathIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";

interface StickySaveBarProps {
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const StickySaveBar: React.FC<StickySaveBarProps> = ({
  isDirty,
  isSaving,
  onSave,
  onReset,
}) => {
  if (!isDirty) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="pointer-events-auto flex items-center justify-between gap-4 p-2 sm:px-4 sm:py-2.5 rounded-xl bg-gray-950/95 dark:bg-gray-900/95 text-white border border-gray-800/80 shadow-2xl backdrop-blur-md max-w-lg w-full">
        <div className="flex items-center gap-2 pr-1">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-xs font-medium text-gray-200 truncate">
            توجد تعديلات غير محفوظة
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onReset}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors active:scale-[0.97]"
          >
            تراجع
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all active:scale-[0.97] flex items-center gap-1.5 shadow-xs"
          >
            {isSaving ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ…</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
