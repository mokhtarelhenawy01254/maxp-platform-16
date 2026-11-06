import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Asset, DocumentType, DocumentUploadForm } from "./types";

interface DocumentUploadModalProps {
  open: boolean;
  assets: Asset[];
  assetsLoading: boolean;
  documentTypes: DocumentType[];
  uploadForm: DocumentUploadForm;
  onUploadFormChange: (form: DocumentUploadForm) => void;
  selectedFile: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  onUpload: () => void;
  onClose: () => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  open,
  assets,
  assetsLoading,
  documentTypes,
  uploadForm,
  onUploadFormChange,
  selectedFile,
  onFileChange,
  uploading,
  onUpload,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />
        <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
              رفع مستند جديد
            </h4>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اختر الأصل *
              </label>
              {assetsLoading ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 text-sm flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
                  جاري تحميل الأصول...
                </div>
              ) : assets.length === 0 ? (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 text-sm">
                  لا توجد أصول متاحة. يرجى إضافة أصول أولاً من تبويب "إدارة
                  الأصول"
                </div>
              ) : (
                <select
                  className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  value={uploadForm.assetId}
                  onChange={(e) =>
                    onUploadFormChange({
                      ...uploadForm,
                      assetId: e.target.value,
                    })
                  }
                >
                  <option value="">-- اختر الأصل --</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} {asset.code ? `(${asset.code})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                نوع المستند *
              </label>
              <select
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                value={uploadForm.documentType}
                onChange={(e) =>
                  onUploadFormChange({
                    ...uploadForm,
                    documentType: e.target.value,
                  })
                }
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اختر ملف
              </label>
              <input
                type="file"
                onChange={onFileChange}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900 dark:file:text-indigo-200"
              />
              {selectedFile && (
                <p className="mt-1 text-sm text-green-600">
                  تم اختيار: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="text-center text-gray-400 text-sm">أو</div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                رابط الملف
              </label>
              <input
                type="url"
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                value={uploadForm.fileUrl}
                onChange={(e) =>
                  onUploadFormChange({
                    ...uploadForm,
                    fileUrl: e.target.value,
                  })
                }
                placeholder="https://..."
                dir="ltr"
                disabled={!!selectedFile}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                اسم الملف
              </label>
              <input
                type="text"
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                value={uploadForm.fileName}
                onChange={(e) =>
                  onUploadFormChange({
                    ...uploadForm,
                    fileName: e.target.value,
                  })
                }
                placeholder="مثال: فاتورة_شراء_لابتوب.pdf"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                الوصف (اختياري)
              </label>
              <textarea
                className="block w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2.5 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                rows={2}
                value={uploadForm.description}
                onChange={(e) =>
                  onUploadFormChange({
                    ...uploadForm,
                    description: e.target.value,
                  })
                }
                placeholder="وصف اختياري للمستند"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={onUpload}
                disabled={uploading || !uploadForm.assetId}
                className="px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {uploading ? "جاري الرفع..." : "رفع المستند"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
