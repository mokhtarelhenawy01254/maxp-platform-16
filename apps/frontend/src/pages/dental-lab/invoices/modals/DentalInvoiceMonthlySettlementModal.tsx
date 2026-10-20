import type { DentalLabDoctor } from "../../shared";
import { MODAL_CONTENT_CLS } from "../../shared";
import { DentalInvoiceSettlementVoucherModal } from "./DentalInvoiceSettlementVoucherModal";
import { useMonthlySettlement } from "./settlement/hooks/useMonthlySettlement";
import { SettlementHeader } from "./settlement/components/SettlementHeader";
import { SettlementFilterBar } from "./settlement/components/SettlementFilterBar";
import { SettlementSummaryStrip } from "./settlement/components/SettlementSummaryStrip";
import { SettlementTable } from "./settlement/components/SettlementTable";
import { SettlementReopenModal } from "./settlement/components/SettlementReopenModal";

export interface DentalInvoiceMonthlySettlementModalProps {
  initialDoctorId?: string;
  doctors: DentalLabDoctor[];
  onClose: () => void;
  onUpdated: () => void;
}

export function DentalInvoiceMonthlySettlementModal({
  initialDoctorId,
  doctors,
  onClose,
  onUpdated,
}: DentalInvoiceMonthlySettlementModalProps) {
  const {
    period,
    setPeriod,
    filterDoctorId,
    setFilterDoctorId,
    loading,
    saving,
    settlements,
    summary,
    loadData,
    handleCloseSingle,
    handleCloseAll,
    reopenTarget,
    setReopenTarget,
    reopenReason,
    setReopenReason,
    reopening,
    handleConfirmReopen,
    voucherSettlement,
    setVoucherSettlement,
    handleShareWhatsApp,
  } = useMonthlySettlement({
    initialDoctorId,
    onUpdated,
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-5xl my-4 sm:my-6 max-h-[92vh] flex flex-col p-3 sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <SettlementHeader period={period} onClose={onClose} />

        {/* Filters Bar & Actions */}
        <SettlementFilterBar
          period={period}
          onPeriodChange={setPeriod}
          doctorId={filterDoctorId}
          onDoctorIdChange={setFilterDoctorId}
          doctors={doctors}
          onRefresh={loadData}
          onCloseAll={handleCloseAll}
          saving={saving}
          loading={loading}
          hasSettlements={settlements.length > 0}
        />

        {/* Summary Metric Strip */}
        <SettlementSummaryStrip summary={summary} />

        {/* Table list */}
        <SettlementTable
          settlements={settlements}
          loading={loading}
          period={period}
          saving={saving}
          onCloseSingle={handleCloseSingle}
          onOpenReopen={(s) => {
            setReopenTarget(s);
            setReopenReason("");
          }}
          onOpenVoucher={setVoucherSettlement}
          onShareWhatsApp={handleShareWhatsApp}
        />

        {/* Reopen Audit Modal */}
        <SettlementReopenModal
          reopenTarget={reopenTarget}
          period={period}
          reason={reopenReason}
          onReasonChange={setReopenReason}
          onClose={() => setReopenTarget(null)}
          onConfirm={handleConfirmReopen}
          reopening={reopening}
        />

        {/* Voucher Preview & Print */}
        {voucherSettlement && (
          <DentalInvoiceSettlementVoucherModal
            settlement={voucherSettlement}
            onClose={() => setVoucherSettlement(null)}
          />
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t dark:border-gray-800 mt-2">
          <span className="text-[11px] text-gray-400">
            * يتم ترحيل الرصيد الختامي آلياً كرصيد أول مدة لشهر القادم.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalInvoiceMonthlySettlementModal;
