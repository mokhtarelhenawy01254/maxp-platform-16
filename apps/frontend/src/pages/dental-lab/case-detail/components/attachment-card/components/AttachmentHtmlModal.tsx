import { ExternalLink, Globe, X as XMarkIcon } from "lucide-react";
import type { DentalCaseAttachment } from "../../../../shared";

interface AttachmentHtmlModalProps {
  show: boolean;
  url: string | null;
  attachment: DentalCaseAttachment;
  onClose: () => void;
}

export function AttachmentHtmlModal({
  show,
  url,
  attachment,
  onClose,
}: AttachmentHtmlModalProps) {
  if (!show || !url) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {attachment.fileName}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums font-mono">
              ({((attachment.size || 0) / 1024 / 1024).toFixed(1)}MB · HTML)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 dark:hover:bg-teal-900/50 rounded font-medium flex items-center gap-1"
            >
              <span>فتح في نافذة كاملة</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded"
              title="إغلاق"
              aria-label="Close"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white dark:bg-gray-900 relative">
          <iframe
            src={url}
            title={attachment.fileName}
            className="w-full h-full border-0 rounded-b-xl"
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
