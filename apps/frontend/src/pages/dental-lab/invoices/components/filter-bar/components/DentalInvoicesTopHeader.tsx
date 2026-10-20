import React from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  CreditCard,
  Download,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export interface DentalInvoicesTopHeaderProps {
  onCreateInvoice: () => void;
  onExportExcel: () => void;
  onBatchInvoice: () => void;
  onOpenSettlement: (doctorId?: string) => void;
  onRefresh: () => void;
  selectedDoctorId: string;
  uninvoicedCasesCount?: number;
}

export const DentalInvoicesTopHeader: React.FC<DentalInvoicesTopHeaderProps> = ({
  onCreateInvoice,
  onExportExcel,
  onBatchInvoice,
  onOpenSettlement,
  onRefresh,
  selectedDoctorId,
  uninvoicedCasesCount = 0,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <span>{t("dentalLab.invoices.title")}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          إدارة ومتابعة فواتير الأطباء ودورات التحصيل والفوترة الشهرية
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onCreateInvoice}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t("dentalLab.invoices.newInvoice")}</span>
        </button>

        <button
          type="button"
          onClick={onExportExcel}
          className="flex items-center gap-1.5 px-3 py-2 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg text-xs sm:text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm"
          title="تصدير الفواتير المعروضة إلى Excel"
        >
          <Download className="w-4 h-4" />
          <span>تصدير Excel</span>
        </button>

        {uninvoicedCasesCount > 0 && (
          <button
            type="button"
            onClick={onBatchInvoice}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-xs sm:text-sm font-semibold hover:from-amber-600 hover:to-orange-600 shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>فوترة مجمعة ({uninvoicedCasesCount} حالة)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onOpenSettlement(selectedDoctorId || undefined)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
        >
          <CalendarClock className="w-4 h-4" />
          <span>تقفيل المستحقات الشهرية</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-2 border dark:border-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
          <span>{t("dentalLab.common.refresh")}</span>
        </button>
      </div>
    </div>
  );
};
