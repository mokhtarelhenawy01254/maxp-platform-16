import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  AlertCircle,
  Check,
  Search,
} from "lucide-react";
import bulkStatusUpdateService, { BulkStatusResultRow } from "../../services/bulkStatusUpdateService";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const BulkStatusUpdatePage: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [results, setResults] = useState<BulkStatusResultRow[]>([]);
  const [filterQuery, setFilterQuery] = useState("");

  const handleDownloadTemplate = async () => {
    try {
      await bulkStatusUpdateService.downloadTemplate();
      toast.success(t("bulkStatus.templateDownloaded", "تم تحميل القالب بنجاح"));
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

  const filteredResults = results.filter((r) =>
    r.orderNumber.toLowerCase().includes(filterQuery.toLowerCase()) ||
    (r.error && r.error.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  const successPercent = summary && summary.total > 0
    ? Math.round((summary.success / summary.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {t("bulkStatus.title", "تحديث حالات الطلبات جماعياً")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("bulkStatus.description", "استيراد ملف Excel لتحديث حالات آلاف الطلبات بنقرة واحدة مع توثيق فوري للنتائج")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="h-8 gap-1.5 text-xs border-border/70"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>تحميل القالب النموذجي</span>
          </Button>
        </div>
      </div>

      {/* Action Steps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Step 1: Download Template */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <CardTitle className="text-sm font-semibold">
                  {t("bulkStatus.step1Title", "تحميل قالب الإكسيل")}
                </CardTitle>
              </div>
              <Badge variant="outline" className="text-[11px] font-mono border-border/70">
                .xlsx / .csv
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("bulkStatus.step1Desc", "يتضمن القالب النموذجي عمودين أساسيين: رقم الطلب (orderNumber) والحالة المستهدفة (status) طبقاً لقواعد النظام.")}
            </p>
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 font-mono text-[11px] space-y-1">
              <div className="text-muted-foreground">أعمدة الملف المطلوبة:</div>
              <div className="text-foreground font-semibold">orderNumber, status</div>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="secondary"
              size="sm"
              className="w-full gap-2 text-xs h-9"
            >
              <Download className="h-4 w-4" />
              <span>تحميل القالب (.xlsx)</span>
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Upload File */}
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <CardTitle className="text-sm font-semibold">
                  {t("bulkStatus.step2Title", "رفع ومعالجة الملف")}
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                حد أقصى 2000 صف
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors space-y-2"
            >
              <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground/80" />
              <div className="text-xs font-semibold text-foreground">
                {fileName ? fileName : t("bulkStatus.chooseFile", "اضغط لاختيار ملف Excel أو CSV")}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("bulkStatus.step2Desc", "يقبل الامتدادات: .xlsx, .xls, .csv")}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              size="sm"
              className="w-full gap-2 text-xs h-9"
            >
              <RefreshCw className={`h-4 w-4 ${processing ? "animate-spin" : ""}`} />
              <span>{processing ? t("bulkStatus.processing", "جاري المعالجة والتحديث...") : "اختيار ورفع الملف"}</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Summary KPI Ribbon if uploaded */}
      {summary && (
        <Card className="bg-card border-border/70 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>ملخص نتائج المعالجة</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">
                نسبة النجاح {successPercent}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/40">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${successPercent}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${100 - successPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="text-xs text-muted-foreground">إجمالي الصفوف</div>
                <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
                  {summary.total.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className="text-xs text-emerald-600 dark:text-emerald-400">ناجحة ومحدثة</div>
                <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {summary.success.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
                <div className="text-xs text-rose-600 dark:text-rose-400">فشلت / مرفوضة</div>
                <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                  {summary.failed.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <Card className="bg-card border-border/70 shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 sm:px-6 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>سجل تفاصيل معالجة الطلبات</span>
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="بحث برقم الطلب..."
                className="w-full pr-8 pl-3 py-1 text-xs bg-background border border-border/70 rounded-md text-foreground focus:outline-hidden"
              />
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-medium">
                <tr>
                  <th className="px-4 sm:px-6 py-3">رقم الطلب</th>
                  <th className="px-4 sm:px-6 py-3">الحالة المطلوبة</th>
                  <th className="px-4 sm:px-6 py-3">حالة العملية</th>
                  <th className="px-4 sm:px-6 py-3">ملاحظات / سبب الخطأ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {filteredResults.map((r, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 sm:px-6 py-3 font-mono font-medium text-primary">
                      #{r.orderNumber}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      {r.success ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" /> تم التحديث
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold text-[11px]">
                          <XCircle className="h-3.5 w-3.5" /> فشل التحديث
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-muted-foreground text-[11px]">
                      {r.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BulkStatusUpdatePage;
