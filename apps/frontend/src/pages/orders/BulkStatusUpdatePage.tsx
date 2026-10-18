import React from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Download } from "lucide-react";
import { Button } from "../../components/ui/button";
import { BulkStatusStepsGrid } from "./bulk-status/BulkStatusStepsGrid";
import { BulkStatusSummaryRibbon } from "./bulk-status/BulkStatusSummaryRibbon";
import { BulkStatusResultsTable } from "./bulk-status/BulkStatusResultsTable";
import { useBulkStatusUpdate } from "./bulk-status/useBulkStatusUpdate";

export const BulkStatusUpdatePage: React.FC = () => {
  const { t } = useTranslation();
  const {
    fileInputRef,
    processing,
    fileName,
    summary,
    results,
    filterQuery,
    setFilterQuery,
    handleDownloadTemplate,
    handleFileChange,
  } = useBulkStatusUpdate();

  return (
    <div
      className="min-h-screen bg-background text-foreground p-4 sm:p-6 space-y-6 max-w-7xl mx-auto"
      dir="rtl"
    >
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
                {t(
                  "bulkStatus.description",
                  "استيراد ملف Excel لتحديث حالات آلاف الطلبات بنقرة واحدة مع توثيق فوري للنتائج"
                )}
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
      <BulkStatusStepsGrid
        fileName={fileName}
        processing={processing}
        fileInputRef={fileInputRef}
        onDownloadTemplate={handleDownloadTemplate}
        onFileChange={handleFileChange}
      />

      {/* Summary KPI Ribbon if uploaded */}
      {summary && <BulkStatusSummaryRibbon summary={summary} />}

      {/* Results Table */}
      {results.length > 0 && (
        <BulkStatusResultsTable
          results={results}
          filterQuery={filterQuery}
          onFilterQueryChange={setFilterQuery}
        />
      )}
    </div>
  );
};

export default BulkStatusUpdatePage;
