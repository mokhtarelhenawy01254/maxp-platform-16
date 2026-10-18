import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import bulkStatusUpdateService, {
  BulkStatusResultRow,
} from "../../../services/bulkStatusUpdateService";

export function useBulkStatusUpdate() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);
  const [results, setResults] = useState<BulkStatusResultRow[]>([]);
  const [filterQuery, setFilterQuery] = useState("");

  const handleDownloadTemplate = async () => {
    try {
      await bulkStatusUpdateService.downloadTemplate();
      toast.success(
        t("bulkStatus.templateDownloaded", "تم تحميل القالب بنجاح")
      );
    } catch (error: any) {
      toast.error(
        error?.message || t("bulkStatus.uploadFailed", "تعذر تحميل القالب")
      );
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
        toast.success(
          t("bulkStatus.allUpdated", "تم تحديث كل الطلبات بنجاح")
        );
      } else {
        toast.warning(
          t("bulkStatus.partialUpdated", "تم التحديث جزئيًا — راجع النتائج")
        );
      }
    } catch (error: any) {
      toast.error(
        error?.message || t("bulkStatus.uploadFailed", "تعذر معالجة الملف")
      );
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return {
    fileInputRef,
    processing,
    fileName,
    summary,
    results,
    filterQuery,
    setFilterQuery,
    handleDownloadTemplate,
    handleFileChange,
  };
}

export default useBulkStatusUpdate;
