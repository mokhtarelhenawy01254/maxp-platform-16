import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { Box, Download, Eye, FileText, X as XMarkIcon } from "lucide-react";
import type { DentalCaseAttachment } from "../../../../shared";

interface AttachmentCardActionsProps {
  attachment: DentalCaseAttachment;
  url: string | null;
  is3D: boolean;
  isPdf: boolean;
  isHtml: boolean;
  onOpen3d: (e: MouseEvent) => void;
  onOpenPdf: (e: MouseEvent) => void;
  onOpenHtml: (e: MouseEvent) => void;
  onOpen: () => void;
  onRemove: () => void;
}

export function AttachmentCardActions({
  attachment,
  url,
  is3D,
  isPdf,
  isHtml,
  onOpen3d,
  onOpenPdf,
  onOpenHtml,
  onOpen,
  onRemove,
}: AttachmentCardActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="p-2 flex items-center justify-between gap-2">
      <span className="text-xs truncate font-mono" title={attachment.fileName}>
        {attachment.fileName}
      </span>
      <div className="flex items-center gap-1">
        {is3D && url && (
          <button
            onClick={onOpen3d}
            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
            title="معاينة 3D"
            aria-label="3D Preview"
          >
            <Box className="w-3.5 h-3.5" />
          </button>
        )}
        {isPdf && url && (
          <button
            onClick={onOpenPdf}
            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            title="معاينة الـPDF"
            aria-label="PDF Preview"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        )}
        {isHtml && url && (
          <button
            onClick={onOpenHtml}
            className="p-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded"
            title="معاينة تقرير / عارض HTML"
            aria-label="HTML Preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onOpen}
          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
          title={t("dentalLab.detail.download")}
          aria-label="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
          title={t("dentalLab.common.delete")}
          aria-label="Delete"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
