import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../../../../components/ui/button";

interface HRUnsavedDialogProps {
  open: boolean;
  onCancel: () => void;
  onSaveFirst: () => void;
  onConfirmWithoutSave: () => void;
}

export const HRUnsavedDialog: React.FC<HRUnsavedDialogProps> = ({
  open,
  onCancel,
  onSaveFirst,
  onConfirmWithoutSave,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              تغييرات غير محفوظة
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              لديك تغييرات غير محفوظة. هل تريد المتابعة دون حفظ؟
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
              >
                إلغاء
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveFirst}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                حفظ أولاً
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onConfirmWithoutSave}
              >
                متابعة دون حفظ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
