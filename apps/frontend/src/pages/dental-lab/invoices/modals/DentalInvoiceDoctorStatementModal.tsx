import { Loader2 } from "lucide-react";
import { MODAL_CONTENT_CLS, type DentalLabDoctor } from "../../shared";
import { useDoctorStatement } from "./statement/hooks/useDoctorStatement";
import { StatementPrintableHeader } from "./statement/components/StatementPrintableHeader";
import { StatementScreenHeader } from "./statement/components/StatementScreenHeader";
import { StatementDateFilter } from "./statement/components/StatementDateFilter";
import { StatementTotalsSummary } from "./statement/components/StatementTotalsSummary";
import { StatementInvoicesTable } from "./statement/components/StatementInvoicesTable";
import { StatementCasesTable } from "./statement/components/StatementCasesTable";
import { StatementPrintableFooter } from "./statement/components/StatementPrintableFooter";

export interface DentalInvoiceDoctorStatementModalProps {
  doctor: DentalLabDoctor;
  onClose: () => void;
  onBulkPayment: () => void;
}

export function DentalInvoiceDoctorStatementModal({
  doctor,
  onClose,
  onBulkPayment,
}: DentalInvoiceDoctorStatementModalProps) {
  const {
    statement,
    loading,
    from,
    setFrom,
    to,
    setTo,
    tab,
    setTab,
    downloadingPdf,
    handlePrint,
    handleDownloadPdf,
    handleExportStatementExcel,
    handleShareWhatsApp,
    handleClearDates,
  } = useDoctorStatement({ doctor });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:p-0 print:static print:bg-white print:z-auto print:block"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-4xl my-6 print:max-w-none print:w-full print:m-0 print:shadow-none print:p-6 print:border-none print:bg-white print:text-black`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Printable Official Header */}
        <StatementPrintableHeader doctor={doctor} from={from} to={to} />

        {/* Screen Header */}
        <StatementScreenHeader
          doctor={doctor}
          onShareWhatsApp={handleShareWhatsApp}
          onExportExcel={handleExportStatementExcel}
          onDownloadPdf={handleDownloadPdf}
          downloadingPdf={downloadingPdf}
          onPrint={handlePrint}
          onBulkPayment={onBulkPayment}
          onClose={onClose}
        />

        {/* Date Filter Bar */}
        <StatementDateFilter
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onClear={handleClearDates}
        />

        {/* Totals Summary */}
        <StatementTotalsSummary statement={statement} />

        {/* Tab switch */}
        <div className="flex items-center gap-2 border-b dark:border-gray-800 mb-3 print:hidden">
          <button
            type="button"
            onClick={() => setTab("invoices")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === "invoices"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            سجل الفواتير ({statement?.invoices?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setTab("cases")}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors ${
              tab === "cases"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            سجل الحالات ({statement?.cases?.length || 0})
          </button>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : tab === "invoices" ? (
          <StatementInvoicesTable invoices={statement?.invoices || []} />
        ) : (
          <StatementCasesTable cases={statement?.cases || []} />
        )}

        {/* Printable Official Signatures & Stamp */}
        <StatementPrintableFooter />

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t dark:border-gray-800 mt-4 print:hidden">
          <span className="text-xs text-gray-400">
            تم إنشاء كشف الحساب آلياً من منصة MaxP Dental Lab
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceDoctorStatementModal;
