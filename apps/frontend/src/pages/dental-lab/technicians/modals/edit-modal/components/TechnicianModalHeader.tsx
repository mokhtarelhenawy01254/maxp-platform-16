import { X as XMarkIcon } from "lucide-react";

interface TechnicianModalHeaderProps {
  isEditing: boolean;
  error: string | null;
  onClose: () => void;
}

export function TechnicianModalHeader({ isEditing, error, onClose }: TechnicianModalHeaderProps) {
  return (
    <>
      <div className="flex justify-between items-center mb-4 border-b pb-3 dark:border-gray-700">
        <h3 className="font-semibold text-lg">
          {isEditing ? "تعديل بيانات عضو فريق العمل" : "إضافة فني جديد وحساب المنصة"}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="إغلاق"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
    </>
  );
}
