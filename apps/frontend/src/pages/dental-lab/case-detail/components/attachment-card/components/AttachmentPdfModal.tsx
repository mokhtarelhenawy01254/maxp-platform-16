import { FileText, X as XMarkIcon } from "lucide-react";
import type { DentalCaseAttachment } from "../../../../shared";

interface AttachmentPdfModalProps {
  show: boolean;
  url: string | null;
  attachment: DentalCaseAttachment;
  onClose: () => void;
}

export function AttachmentPdfModal({
  show,
  url,
  attachment,
  onClose,
}: AttachmentPdfModalProps) {
  if (!show || !url) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {attachment.fileName}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums font-mono">
              ({((attachment.size || 0) / 1024).toFixed(0)}KB · PDF)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded flex-shrink-0"
            title="إغلاق"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <iframe src={url} title={attachment.fileName} className="flex-1 w-full bg-white" />
        <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
          <span>الروشتة / الوصفة الطبية</span>
          <a
            href={url}
            download={attachment.fileName}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            تحميل الملف
          </a>
        </div>
      </div>
    </div>
  );
}
