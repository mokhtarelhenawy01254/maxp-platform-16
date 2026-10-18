import React from "react";
import { useTranslation } from "react-i18next";
import { Download, UploadCloud, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";

interface BulkStatusStepsGridProps {
  fileName: string;
  processing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDownloadTemplate: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BulkStatusStepsGrid: React.FC<BulkStatusStepsGridProps> = ({
  fileName,
  processing,
  fileInputRef,
  onDownloadTemplate,
  onFileChange,
}) => {
  const { t } = useTranslation();

  return (
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
            <Badge
              variant="outline"
              className="text-[11px] font-mono border-border/70"
            >
              .xlsx / .csv
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(
              "bulkStatus.step1Desc",
              "يتضمن القالب النموذجي عمودين أساسيين: رقم الطلب (orderNumber) والحالة المستهدفة (status) طبقاً لقواعد النظام."
            )}
          </p>
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20 font-mono text-[11px] space-y-1">
            <div className="text-muted-foreground">أعمدة الملف المطلوبة:</div>
            <div className="text-foreground font-semibold">
              orderNumber, status
            </div>
          </div>
          <Button
            onClick={onDownloadTemplate}
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
            <span className="text-xs text-muted-foreground">حد أقصى 2000 صف</span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors space-y-2"
          >
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground/80" />
            <div className="text-xs font-semibold text-foreground">
              {fileName
                ? fileName
                : t(
                    "bulkStatus.chooseFile",
                    "اضغط لاختيار ملف Excel أو CSV"
                  )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("bulkStatus.step2Desc", "يقبل الامتدادات: .xlsx, .xls, .csv")}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFileChange}
            className="hidden"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            size="sm"
            className="w-full gap-2 text-xs h-9"
          >
            <RefreshCw
              className={`h-4 w-4 ${processing ? "animate-spin" : ""}`}
            />
            <span>
              {processing
                ? t("bulkStatus.processing", "جاري المعالجة والتحديث...")
                : "اختيار ورفع الملف"}
            </span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkStatusStepsGrid;
