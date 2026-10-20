import React from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, Sparkles } from "lucide-react";
import type { UninvoicedSummaryResult } from "../../../../shared";
import { fmtMoney } from "../../../../shared";

export interface DentalInvoicesUninvoicedBannerProps {
  uninvoicedSummary: UninvoicedSummaryResult;
  onBatchInvoice: () => void;
}

export const DentalInvoicesUninvoicedBanner: React.FC<DentalInvoicesUninvoicedBannerProps> = ({
  uninvoicedSummary,
  onBatchInvoice,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
          <CalendarClock className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
              دورة الفوترة الشهرية وتصفية الحسابات
            </h4>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-mono tabular-nums">
              {uninvoicedSummary.totalCases} حالة معلقة
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            يوجد {uninvoicedSummary.totalCases} حالة مكتملة/مسلمة لـ {uninvoicedSummary.totalDoctors} طبيب بإجمالي{" "}
            <span className="font-bold text-blue-700 dark:text-blue-300 font-mono tabular-nums">
              {fmtMoney(uninvoicedSummary.totalAmount)} {t("dentalLab.common.egp")}
            </span>{" "}
            جاهزة لإصدار فواتيرها بنقرة واحدة.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onBatchInvoice}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        <span>إصدار الفواتير المجمعة الآن</span>
      </button>
    </div>
  );
};
