import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import bulkStatusUpdateService, { BulkStatusResultRow } from "../../services/bulkStatusUpdateService";

const BulkStatusUpdatePage: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [results, setResults] = useState<BulkStatusResultRow[]>([]);

  const handleDownloadTemplate = async () => {
    try {
      await bulkStatusUpdateService.downloadTemplate();
    } catch (error: any) {
      toast.error(error?.message || t("bulkStatus.uploadFailed", "تعذر تحميل القالب"));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSummary(null);
    setResults([]);

    try {
      setProcessing(true);
      const res = await bulkStatusUpdateService.uploadFile(file);
      setSummary(res.data.summary);
      setResults(res.data.results);
      if (res.data.summary.failed === 0) {
        toast.success(t("bulkStatus.allUpdated", "تم تحديث كل الطلبات بنجاح"));
      } else {
        toast.warning(t("bulkStatus.partialUpdated", "تم التحديث جزئيًا — راجع النتائج"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("bulkStatus.uploadFailed", "تعذر معالجة الملف"));
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("bulkStatus.title", "تحديث جماعي لحالة الطلبات")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("bulkStatus.description", "حمّل قالب Excel، أدخل أرقام الطلبات والحالات الجديدة، ثم ارفع الملف.")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="h-6 w-6 text-indigo-500" />
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white">
                {t("bulkStatus.step1Title", "1. حمّل القالب")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("bulkStatus.step1Desc", "ملف يحتوي عمودين: رقم الطلب (orderNumber) والحالة (status)")}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {t("bulkStatus.downloadTemplate", "تحميل القالب")}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start gap-3">
            <CloudArrowUpIcon className="h-6 w-6 text-green-500" />
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white">
                {t("bulkStatus.step2Title", "2. ارفع الملف")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {fileName
                  ? fileName
                  : t("bulkStatus.step2Desc", "حد أقصى 2000 صف. فقط الطلبات الصالحة سيتم تحديثها.")}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              {processing ? t("bulkStatus.processing", "جاري المعالجة...") : t("bulkStatus.chooseFile", "اختيار الملف")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">{t("bulkStatus.total", "الإجمالي")}</div>
            <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{summary.total}</div>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 shadow-sm dark:border-green-900/30 dark:bg-green-950/20">
            <div className="text-xs text-green-700 dark:text-green-300">{t("bulkStatus.success", "تم التحديث")}</div>
            <div className="mt-1 text-2xl font-black text-green-600 dark:text-green-400">{summary.success}</div>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 shadow-sm dark:border-red-900/30 dark:bg-red-950/20">
            <div className="text-xs text-red-700 dark:text-red-300">{t("bulkStatus.failed", "فشل")}</div>
            <div className="mt-1 text-2xl font-black text-red-600 dark:text-red-400">{summary.failed}</div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
            {t("bulkStatus.results", "نتائج المعالجة")}
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pl-4">{t("bulkStatus.orderNumber", "رقم الطلب")}</th>
                  <th className="py-2">{t("bulkStatus.status", "الحالة")}</th>
                  <th className="py-2">{t("bulkStatus.result", "النتيجة")}</th>
                  <th className="py-2 pr-4">{t("bulkStatus.reason", "السبب")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={index} className="border-b border-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                    <td className="py-2 pl-4 font-bold">{row.orderNumber || "—"}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2">
                      {row.success ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircleIcon className="h-4 w-4" />
                          {t("bulkStatus.success", "تم التحديث")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircleIcon className="h-4 w-4" />
                          {t("bulkStatus.failed", "فشل")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{row.message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkStatusUpdatePage;
