import { AlertTriangle as ExclamationTriangleIcon } from 'lucide-react';
import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
;

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  isDangerous = false,
  isLoading = false,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <div className="sm:flex sm:items-start">
          <div
            className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${isDangerous ? "bg-red-100 dark:bg-red-900/20" : "bg-blue-100 dark:bg-blue-900/20"}`}
          >
            <ExclamationTriangleIcon
              className={`h-6 w-6 ${isDangerous ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`}
              aria-hidden="true"
            />
          </div>
          <div className="mt-3 text-center sm:mt-0 sm:mr-4 sm:text-right">
            <DialogTitle className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {message}
            </DialogDescription>
          </div>
        </div>
        <div className="-mx-4 -mb-4 mt-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-gray-50 dark:bg-gray-700/50 p-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            className={`inline-flex w-full justify-center rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
              isDangerous
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "جاري التنفيذ..." : confirmText}
          </button>
          <button
            type="button"
            className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-base font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            onClick={onClose}
            ref={cancelButtonRef}
            disabled={isLoading}
          >
            {cancelText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
