import React from "react";
import { Upload, X, RefreshCw } from "lucide-react";

interface BenchUploadModalProps {
  uploadCaseId: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  uploadFile: File | null;
  onFileChange: (file: File | null) => void;
  uploading: boolean;
}

export const BenchUploadModal: React.FC<BenchUploadModalProps> = ({
  uploadCaseId,
  onClose,
  onSubmit,
  uploadFile,
  onFileChange,
  uploading,
}) => {
  if (!uploadCaseId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bench-upload-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <h4
            id="bench-upload-modal-title"
            className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>رفع مخرجات المرحلة أو صور توثيق</span>
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
            aria-label="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="bench-upload-file-input"
              className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1"
            >
              اختر الملف (صورة، STL، أو PDF)
            </label>
            <input
              id="bench-upload-file-input"
              type="file"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              {uploading && <RefreshCw className="w-3 h-3 animate-spin" />}
              <span>رفع وتأكيد</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BenchUploadModal;
