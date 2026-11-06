import React from "react";
import {
  DocumentIcon,
  PhotoIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { AssetDocument, DocumentType } from "./types";
import {
  buildFileUrl,
  formatDate,
  formatFileSize,
  getDocumentTypeLabel,
} from "./helpers";

interface DocumentsGridSectionProps {
  filteredDocuments: AssetDocument[];
  documentTypes: DocumentType[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  hasActiveFilters: boolean;
  onOpenUploadModal: () => void;
  onOpenLightbox: (src: string) => void;
  onDelete: (docId: string) => void;
  onLoadMore: () => void;
}

export const DocumentsGridSection: React.FC<DocumentsGridSectionProps> = ({
  filteredDocuments,
  documentTypes,
  loading,
  loadingMore,
  hasMore,
  hasActiveFilters,
  onOpenUploadModal,
  onOpenLightbox,
  onDelete,
  onLoadMore,
}) => {
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "image":
        return <PhotoIcon className="h-10 w-10 text-blue-500" />;
      case "invoice":
        return <DocumentTextIcon className="h-10 w-10 text-green-500" />;
      case "warranty":
        return <ShieldCheckIcon className="h-10 w-10 text-purple-500" />;
      case "manual":
        return <BookOpenIcon className="h-10 w-10 text-orange-500" />;
      default:
        return <DocumentIcon className="h-10 w-10 text-gray-500" />;
    }
  };

  if (filteredDocuments.length === 0 && !loading) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <DocumentIcon className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          {hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد مستندات"}
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
          ابدأ برفع مستندات لأصولك
        </p>
        <button
          onClick={onOpenUploadModal}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-xs"
        >
          رفع أول مستند
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDocuments.map((doc) => (
          <div
            key={doc.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {getDocumentIcon(doc.documentType)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-white truncate">
                  {doc.fileName}
                </h4>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">
                  {getDocumentTypeLabel(doc.documentType, documentTypes)}
                </p>
                {doc.asset && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <ComputerDesktopIcon className="h-3.5 w-3.5" />
                    {doc.asset.name}
                  </div>
                )}
              </div>
            </div>

            {doc.description && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {doc.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="text-xs text-gray-400 font-mono tabular-nums">
                {formatDate(doc.uploadedAt)}
                {doc.fileSize ? ` • ${formatFileSize(doc.fileSize)}` : ""}
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <a
                href={
                  doc.mimeType?.startsWith("image/")
                    ? undefined
                    : buildFileUrl(doc.fileUrl)
                }
                target={
                  doc.mimeType === "application/pdf" ? "_blank" : undefined
                }
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (doc.mimeType?.startsWith("image/")) {
                    e.preventDefault();
                    onOpenLightbox(buildFileUrl(doc.fileUrl));
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <EyeIcon className="h-4 w-4" />
                {doc.mimeType?.startsWith("image/")
                  ? "عرض الصورة"
                  : doc.mimeType === "application/pdf"
                    ? "فتح PDF"
                    : "معاينة"}
              </a>
              <a
                href={buildFileUrl(doc.fileUrl)}
                download={doc.fileName}
                aria-label="تحميل المستند"
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </a>
              <button
                onClick={() => onDelete(doc.id)}
                aria-label="حذف المستند"
                className="flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && filteredDocuments.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-sm rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            {loadingMore ? "جاري التحميل..." : "تحميل المزيد"}
          </button>
        </div>
      )}
    </>
  );
};
