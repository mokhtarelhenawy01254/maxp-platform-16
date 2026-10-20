import { useEffect, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Box,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  X as XMarkIcon,
} from "lucide-react";
import DentalModelViewer from "../../DentalModelViewer";
import {
  deleteCaseAttachment,
  fetchCaseFileBlob,
  type DentalCaseAttachment,
} from "../../shared";

interface DentalCaseAttachmentCardProps {
  attachment: DentalCaseAttachment;
  onDeleted: () => void;
}

export default function DentalCaseAttachmentCard({
  attachment,
  onDeleted,
}: DentalCaseAttachmentCardProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [showHtml, setShowHtml] = useState(false);

  // 3D-viewable: STL/PLY/OBJ/DCM
  const fileExt = (attachment.fileName || "").split(".").pop()?.toLowerCase() || "";
  const is3D = ["stl", "ply", "obj", "dcm"].includes(fileExt);
  const isPdf = fileExt === "pdf";
  const isHtml = fileExt === "html" || fileExt === "htm";
  const isImage =
    (attachment.mimeType?.startsWith("image/") || (!attachment.mimeType && !failed)) &&
    !is3D &&
    !isPdf &&
    !isHtml;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    if (attachment.storedName) {
      fetchCaseFileBlob(attachment.storedName)
        .then((blob) => {
          if (cancelled) return;
          const finalBlob =
            isHtml && blob.type !== "text/html"
              ? new Blob([blob], { type: "text/html;charset=utf-8" })
              : blob;
          objectUrl = URL.createObjectURL(finalBlob);
          setUrl(objectUrl);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    } else {
      setFailed(true);
    }
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.storedName, isHtml]);

  const remove = async () => {
    if (!window.confirm(t("dentalLab.common.confirmDelete"))) return;
    try {
      await deleteCaseAttachment(attachment.caseId ?? "", attachment.id);
      toast.success(t("dentalLab.detail.fileDeleted"));
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    }
  };

  const open = () => {
    if (url) window.open(url, "_blank");
  };

  const open3d = (e: MouseEvent) => {
    e.stopPropagation();
    if (url) setShow3d(true);
  };

  const openPdf = (e: MouseEvent) => {
    e.stopPropagation();
    if (url) setShowPdf(true);
  };

  const openHtml = (e: MouseEvent) => {
    e.stopPropagation();
    if (url) setShowHtml(true);
  };

  return (
    <div className="border dark:border-gray-700 rounded-lg overflow-hidden group relative">
      <div
        className="h-28 bg-gray-100 dark:bg-gray-900 flex items-center justify-center cursor-pointer"
        onClick={is3D && url ? open3d : isPdf && url ? openPdf : isHtml && url ? openHtml : open}
        title={
          is3D
            ? "اضغط للمعاينة 3D"
            : isPdf
            ? "اضغط لمعاينة الـPDF"
            : isHtml
            ? "اضغط لمعاينة عارض / تقرير HTML"
            : "اضغط للتحميل"
        }
      >
        {url && isImage ? (
          <img src={url} alt={attachment.fileName} className="h-full w-full object-cover" />
        ) : isHtml ? (
          <div className="flex flex-col items-center justify-center p-2 text-center text-teal-600 dark:text-teal-400">
            <Globe className="w-8 h-8 mb-1" />
            <span className="text-[10px] font-semibold">عارض 3D / تقرير HTML</span>
          </div>
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center p-2 text-center text-red-500">
            <FileText className="w-8 h-8 mb-1" />
            <span className="text-[10px] font-semibold">ملف PDF</span>
          </div>
        ) : failed ? (
          <FileText className="w-8 h-8 text-gray-400" />
        ) : (
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        )}
        {is3D && (
          <div className="absolute top-1 right-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">
            3D
          </div>
        )}
        {isPdf && (
          <div className="absolute top-1 right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">
            PDF
          </div>
        )}
        {isHtml && (
          <div className="absolute top-1 right-1 bg-teal-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold font-mono">
            HTML 3D
          </div>
        )}
      </div>

      <div className="p-2 flex items-center justify-between gap-2">
        <span className="text-xs truncate font-mono" title={attachment.fileName}>
          {attachment.fileName}
        </span>
        <div className="flex items-center gap-1">
          {is3D && url && (
            <button
              onClick={open3d}
              className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
              title="معاينة 3D"
              aria-label="3D Preview"
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          )}
          {isPdf && url && (
            <button
              onClick={openPdf}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
              title="معاينة الـPDF"
              aria-label="PDF Preview"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
          )}
          {isHtml && url && (
            <button
              onClick={openHtml}
              className="p-1 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded"
              title="معاينة تقرير / عارض HTML"
              aria-label="HTML Preview"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={open}
            className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
            title={t("dentalLab.detail.download")}
            aria-label="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={remove}
            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            title={t("dentalLab.common.delete")}
            aria-label="Delete"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Viewer Modal — Google <model-viewer> for STL/PLY/OBJ/DCM */}
      {show3d && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShow3d(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <Box className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {attachment.fileName}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums font-mono">
                  ({((attachment.size || 0) / 1024 / 1024).toFixed(1)}MB · {fileExt.toUpperCase()})
                </span>
              </div>
              <button
                onClick={() => setShow3d(false)}
                className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 rounded flex-shrink-0"
                title="إغلاق"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 relative min-h-[500px]">
              {fileExt === "dcm" ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
                  ملف DICOM (DCM) لا يُعاين هنا — حمّله وافتحه في عارض DICOM المتخصص.
                </div>
              ) : url ? (
                <DentalModelViewer url={url} ext={fileExt} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  جاري تحميل النموذج 3D...
                </div>
              )}
            </div>
            <div className="p-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between">
              <span>اسحب لتدوير · عجلة للتقريب · نقرة مزدوجة للإعادة</span>
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
      )}

      {/* HTML Viewer Modal — Sandboxed interactive webview for Exocad / 3Shape */}
      {showHtml && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowHtml(false)}
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
                  onClick={() => setShowHtml(false)}
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
      )}

      {/* PDF Viewer Modal */}
      {showPdf && url && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowPdf(false)}
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
                onClick={() => setShowPdf(false)}
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
      )}
    </div>
  );
}
