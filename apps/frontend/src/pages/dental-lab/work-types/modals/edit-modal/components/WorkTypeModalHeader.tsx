import React from "react";
import { FileText, X as XMarkIcon } from "lucide-react";

interface WorkTypeModalHeaderProps {
  isEdit: boolean;
  saving: boolean;
  onClose: () => void;
}

export const WorkTypeModalHeader: React.FC<WorkTypeModalHeaderProps> = ({
  isEdit,
  saving,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between p-4 sm:p-5 border-b dark:border-gray-700 shrink-0">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-bold">
          {isEdit ? "تعديل نوع الشغل" : "إضافة نوع شغل جديد (2026 Ready)"}
        </h3>
      </div>
      <button
        type="button"
        onClick={() => !saving && onClose()}
        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
        aria-label="إغلاق"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default WorkTypeModalHeader;
