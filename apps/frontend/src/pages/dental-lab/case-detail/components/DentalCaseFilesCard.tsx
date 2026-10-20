import type { ChangeEvent, DragEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Box,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  UploadCloud,
  XCircle,
} from "lucide-react";
import DentalCaseCard from "./DentalCaseCard";
import DentalCaseAttachmentCard from "./DentalCaseAttachmentCard";
import type { UploadItem } from "../types/dentalCaseDetailTypes";
import { downloadAllFiles, type DentalCaseAttachment } from "../../shared";

const ACCEPT_ATTR = ".stl,.ply,.obj,.jpg,.jpeg,.png,.webp,.pdf,.dcm,.html,.htm";

interface DentalCaseFilesCardProps {
  caseId: string;
  caseNumber: string;
  attachments: DentalCaseAttachment[];
  uploading: boolean;
  uploadItems: UploadItem[];
  uploadDragOver: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  designReviewInputRef: RefObject<HTMLInputElement | null>;
  handleUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDesignReviewUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleUploadDragOver: (e: DragEvent<HTMLDivElement>) => void;
  handleUploadDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  handleUploadDrop: (e: DragEvent<HTMLDivElement>) => void;
  retryUpload: (itemId: string) => void;
  clearFinishedUploads: () => void;
  onRefresh: () => void;
}

export default function DentalCaseFilesCard({
  caseId,
  caseNumber,
  attachments,
  uploading,
  uploadItems,
  uploadDragOver,
  fileInputRef,
  designReviewInputRef,
  handleUpload,
  handleDesignReviewUpload,
  handleUploadDragOver,
  handleUploadDragLeave,
  handleUploadDrop,
  retryUpload,
  clearFinishedUploads,
  onRefresh,
}: DentalCaseFilesCardProps) {
  const { t } = useTranslation();

  return (
    <DentalCaseCard
      title={t("dentalLab.detail.files")}
      icon={<ImageIcon className="w-5 h-5" />}
      action={
        <div className="flex items-center gap-2">
          {attachments.length > 0 && (
            <button
              onClick={async () => {
                try {
                  await downloadAllFiles(caseId, `${caseNumber}-files.zip`);
                  toast.success("تم تجهيز ملف ZIP");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
              title="تحميل كل الملفات دفعة واحدة (ZIP)"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل الكل (ZIP)
            </button>
          )}
          <button
            onClick={() => designReviewInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
            title="رفع تصميم ثلاثي الأبعاد (HTML Exocad أو STL) لاعتماده من الطبيب قبل البدء بالتفريز"
          >
            <Box className="w-3.5 h-3.5" />
            رفع تصميم 3D للاعتماد
          </button>
          <input
            ref={designReviewInputRef}
            type="file"
            className="hidden"
            accept=".html,.htm,.stl,.ply,.obj"
            onChange={handleDesignReviewUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {t("dentalLab.detail.uploadFile")}
          </button>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept={ACCEPT_ATTR}
        onChange={handleUpload}
      />

      {/* Drag-and-drop zone */}
      <div
        onDragOver={handleUploadDragOver}
        onDragLeave={handleUploadDragLeave}
        onDrop={handleUploadDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 px-4 py-6 mb-4 border-2 border-dashed rounded-lg cursor-pointer transition ${
          uploadDragOver
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
      >
        <UploadCloud
          className={`w-8 h-8 ${uploadDragOver ? "text-blue-500" : "text-gray-400"}`}
        />
        <p className="text-sm text-gray-600 dark:text-gray-300 text-center font-medium">
          {uploadDragOver ? "إفلت الملفات هنا" : "اسحب الملفات هنا أو اضغط للاختيار"}
        </p>
        <p className="text-xs text-gray-400 text-center font-mono">
          STL, PLY, OBJ, HTML (Exocad 3D), JPG, PNG, PDF, DCM — حد أقصى 50MB للملف
        </p>
      </div>

      {/* Active / finished upload queue */}
      {uploadItems.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {uploading ? "جاري الرفع..." : "نتائج الرفع"}
            </span>
            {!uploading && (
              <button
                onClick={clearFinishedUploads}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                مسح المكتمل
              </button>
            )}
          </div>

          {/* Total upload progress */}
          {(() => {
            const totalBytes = uploadItems.reduce((s, it) => s + it.file.size, 0);
            const loadedBytes = uploadItems.reduce(
              (s, it) => s + (it.file.size * (it.progress || 0)) / 100,
              0
            );
            const doneCount = uploadItems.filter((it) => it.status === "done").length;
            const totalPct = totalBytes > 0 ? Math.round((loadedBytes * 100) / totalBytes) : 0;
            return (
              <div className="border dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between gap-2 mb-1.5 font-mono tabular-nums">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    الإجمالي: {totalPct}%
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {doneCount}/{uploadItems.length} ملف مكتمل ·{" "}
                    {uploadItems.filter((it) => it.status === "error").length > 0
                      ? `${uploadItems.filter((it) => it.status === "error").length} فشل · `
                      : ""}
                    {Math.round(loadedBytes / 1024 / 1024)}MB /{" "}
                    {Math.round(totalBytes / 1024 / 1024)}MB
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      totalPct >= 100 ? "bg-green-500" : "bg-indigo-500"
                    }`}
                    style={{ width: `${totalPct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {uploadItems.map((it) => (
            <div
              key={it.id}
              className="border dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-xs truncate font-mono" title={it.file.name}>
                    {it.file.name}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 font-mono tabular-nums">
                    ({(it.file.size / 1024 / 1024).toFixed(1)}MB · {it.kind})
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {it.status === "uploading" && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  )}
                  {it.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                  {it.status === "error" && (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retryUpload(it.id);
                        }}
                        className="text-[10px] text-blue-600 hover:underline"
                        title={it.error}
                      >
                        إعادة
                      </button>
                    </>
                  )}
                  {it.status === "queued" && (
                    <span className="text-[10px] text-gray-400">في الانتظار</span>
                  )}
                </div>
              </div>
              {(it.status === "uploading" || it.status === "done") && (
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        it.status === "done" ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${it.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 flex-shrink-0 w-8 text-left font-mono tabular-nums">
                    {it.progress}%
                  </span>
                </div>
              )}
              {it.status === "error" && it.error && (
                <p className="text-[10px] text-red-500 mt-1 truncate" title={it.error}>
                  {it.error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">{t("dentalLab.detail.noFiles")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {attachments.map((a) => (
            <DentalCaseAttachmentCard key={a.id} attachment={a} onDeleted={onRefresh} />
          ))}
        </div>
      )}
    </DentalCaseCard>
  );
}
