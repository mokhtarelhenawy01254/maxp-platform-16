import React from "react";
import {
  Banknote,
  Download,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Printer,
  X as XMarkIcon,
} from "lucide-react";
import type { DentalLabDoctor } from "../../../../shared";

interface StatementScreenHeaderProps {
  doctor: DentalLabDoctor;
  onShareWhatsApp: () => void;
  onExportExcel: () => void;
  onDownloadPdf: () => void;
  downloadingPdf: boolean;
  onPrint: () => void;
  onBulkPayment: () => void;
  onClose: () => void;
}

export const StatementScreenHeader: React.FC<StatementScreenHeaderProps> = ({
  doctor,
  onShareWhatsApp,
  onExportExcel,
  onDownloadPdf,
  downloadingPdf,
  onPrint,
  onBulkPayment,
  onClose,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between pb-3 border-b dark:border-gray-800 mb-4 gap-3 print:hidden">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
            كشف حساب الطبيب: {doctor.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {doctor.clinicName ? `${doctor.clinicName} • ` : ""}
            {doctor.phone ? `هاتف: ${doctor.phone}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onShareWhatsApp}
          className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-green-100"
          title="إرسال كشف الحساب عبر الواتساب"
        >
          <MessageCircle className="w-4 h-4 text-green-600" />
          <span>واتساب</span>
        </button>
        <button
          type="button"
          onClick={onExportExcel}
          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-100"
          title="تصدير كشف الحساب كملف Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Excel</span>
        </button>
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={downloadingPdf}
          className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-100 disabled:opacity-50"
          title="تنزيل كشف الحساب كملف PDF رسمي عالي الدقة"
        >
          {downloadingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : (
            <Download className="w-4 h-4 text-blue-600" />
          )}
          <span>PDF رسمي</span>
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="px-3 py-1.5 border dark:border-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
          title="طباعة ورقية نظيفة"
        >
          <Printer className="w-4 h-4 text-gray-600" />
          <span>طباعة</span>
        </button>
        <button
          type="button"
          onClick={onBulkPayment}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700"
        >
          <Banknote className="w-4 h-4" />
          <span>تحصيل دفعة</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg dark:text-gray-300"
          aria-label="إغلاق"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default StatementScreenHeader;
