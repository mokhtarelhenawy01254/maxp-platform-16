import React from "react";
import { X as XMarkIcon } from "lucide-react";

export interface DentalCaseEditHeaderProps {
  caseNumber?: string;
  saving: boolean;
  onClose: () => void;
}

export const DentalCaseEditHeader: React.FC<DentalCaseEditHeaderProps> = ({
  caseNumber,
  saving,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between mb-5 border-b dark:border-gray-700 pb-3">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          تعديل بيانات الحالة بالكامل
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          رقم الحالة:{" "}
          <span className="font-mono font-semibold tabular-nums">{caseNumber}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => !saving && onClose()}
        disabled={saving}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300 disabled:opacity-50 transition-colors"
        aria-label="Close"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
