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
      toast.error(error?.message || t("bulkStatus.uploadFailed", "╪¬╪╣╪░╪▒ ╪¬╪¡┘à┘è┘ä ╪º┘ä┘é╪º┘ä╪¿"));
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
        toast.success(t("bulkStatus.allUpdated", "╪¬┘à ╪¬╪¡╪»┘è╪½ ┘â┘ä ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪¿┘å╪¼╪º╪¡"));
      } else {
        toast.warning(t("bulkStatus.partialUpdated", "╪¬┘à ╪º┘ä╪¬╪¡╪»┘è╪½ ╪¼╪▓╪ª┘è┘ï╪º ΓÇö ╪▒╪º╪¼╪╣ ╪º┘ä┘å╪¬╪º╪ª╪¼"));
      }
    } catch (error: any) {
      toast.error(error?.message || t("bulkStatus.uploadFailed", "╪¬╪╣╪░╪▒ ┘à╪╣╪º┘ä╪¼╪⌐ ╪º┘ä┘à┘ä┘ü"));
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("bulkStatus.title", "╪¬╪¡╪»┘è╪½ ╪¼┘à╪º╪╣┘è ┘ä╪¡╪º┘ä╪⌐ ╪º┘ä╪╖┘ä╪¿╪º╪¬")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("bulkStatus.description", "╪¡┘à┘æ┘ä ┘é╪º┘ä╪¿ Excel╪î ╪ú╪»╪«┘ä ╪ú╪▒┘é╪º┘à ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘ê╪º┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪¼╪»┘è╪»╪⌐╪î ╪½┘à ╪º╪▒┘ü╪╣ ╪º┘ä┘à┘ä┘ü.")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="h-6 w-6 text-indigo-500" />
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white">
                {t("bulkStatus.step1Title", "1. ╪¡┘à┘æ┘ä ╪º┘ä┘é╪º┘ä╪¿")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("bulkStatus.step1Desc", "┘à┘ä┘ü ┘è╪¡╪¬┘ê┘è ╪╣┘à┘ê╪»┘è┘å: ╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿ (orderNumber) ┘ê╪º┘ä╪¡╪º┘ä╪⌐ (status)")}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {t("bulkStatus.downloadTemplate", "╪¬╪¡┘à┘è┘ä ╪º┘ä┘é╪º┘ä╪¿")}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start gap-3">
            <CloudArrowUpIcon className="h-6 w-6 text-green-500" />
            <div className="flex-1">
              <h2 className="font-bold text-gray-900 dark:text-white">
                {t("bulkStatus.step2Title", "2. ╪º╪▒┘ü╪╣ ╪º┘ä┘à┘ä┘ü")}
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {fileName
                  ? fileName
                  : t("bulkStatus.step2Desc", "╪¡╪» ╪ú┘é╪╡┘ë 2000 ╪╡┘ü. ┘ü┘é╪╖ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╡╪º┘ä╪¡╪⌐ ╪│┘è╪¬┘à ╪¬╪¡╪»┘è╪½┘ç╪º.")}
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
              {processing ? t("bulkStatus.processing", "╪¼╪º╪▒┘è ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐...") : t("bulkStatus.chooseFile", "╪º╪«╪¬┘è╪º╪▒ ╪º┘ä┘à┘ä┘ü")}
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
            <div className="text-xs text-gray-500 dark:text-gray-400">{t("bulkStatus.total", "╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è")}</div>
            <div className="mt-1 text-2xl font-black text-gray-900 dark:text-white">{summary.total}</div>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50/50 p-4 shadow-sm dark:border-green-900/30 dark:bg-green-950/20">
            <div className="text-xs text-green-700 dark:text-green-300">{t("bulkStatus.success", "╪¬┘à ╪º┘ä╪¬╪¡╪»┘è╪½")}</div>
            <div className="mt-1 text-2xl font-black text-green-600 dark:text-green-400">{summary.success}</div>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-4 shadow-sm dark:border-red-900/30 dark:bg-red-950/20">
            <div className="text-xs text-red-700 dark:text-red-300">{t("bulkStatus.failed", "┘ü╪┤┘ä")}</div>
            <div className="mt-1 text-2xl font-black text-red-600 dark:text-red-400">{summary.failed}</div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
            {t("bulkStatus.results", "┘å╪¬╪º╪ª╪¼ ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐")}
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-right text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pl-4">{t("bulkStatus.orderNumber", "╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿")}</th>
                  <th className="py-2">{t("bulkStatus.status", "╪º┘ä╪¡╪º┘ä╪⌐")}</th>
                  <th className="py-2">{t("bulkStatus.result", "╪º┘ä┘å╪¬┘è╪¼╪⌐")}</th>
                  <th className="py-2 pr-4">{t("bulkStatus.reason", "╪º┘ä╪│╪¿╪¿")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={index} className="border-b border-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-200">
                    <td className="py-2 pl-4 font-bold">{row.orderNumber || "ΓÇö"}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2">
                      {row.success ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircleIcon className="h-4 w-4" />
                          {t("bulkStatus.success", "╪¬┘à ╪º┘ä╪¬╪¡╪»┘è╪½")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <XCircleIcon className="h-4 w-4" />
                          {t("bulkStatus.failed", "┘ü╪┤┘ä")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{row.message || "ΓÇö"}</td>
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
