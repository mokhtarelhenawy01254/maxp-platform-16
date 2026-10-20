import { MODAL_CONTENT_CLS } from "../../shared";
import type { LedgerModalProps } from "./ledger-modal/types";
import { useTechnicianLedger } from "./ledger-modal/hooks/useTechnicianLedger";
import { TechnicianLedgerModalHeader } from "./ledger-modal/components/TechnicianLedgerModalHeader";
import { TechnicianLedgerSummaryStrip } from "./ledger-modal/components/TechnicianLedgerSummaryStrip";
import { TechnicianLedgerTable } from "./ledger-modal/components/TechnicianLedgerTable";
import { TechnicianLedgerModalFooter } from "./ledger-modal/components/TechnicianLedgerModalFooter";

export type { LedgerModalProps };

export function TechnicianLedgerModal({
  tech,
  onClose,
  onAddPayout,
  onDataChanged,
}: LedgerModalProps) {
  const {
    loading,
    payouts,
    summary,
    deletingId,
    handleDelete,
    handlePrint,
  } = useTechnicianLedger(tech.id, onDataChanged);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 print:p-0 print:bg-white print:static"
      onClick={onClose}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:shadow-none print:border-none print:p-0`}
        onClick={(e) => e.stopPropagation()}
      >
        <TechnicianLedgerModalHeader
          tech={tech}
          onPrint={handlePrint}
          onAddPayout={onAddPayout}
          onClose={onClose}
        />

        <TechnicianLedgerSummaryStrip summary={summary} />

        <TechnicianLedgerTable
          loading={loading}
          payouts={payouts}
          deletingId={deletingId}
          onDelete={handleDelete}
        />

        <TechnicianLedgerModalFooter onClose={onClose} />
      </div>
    </div>
  );
}

export default TechnicianLedgerModal;
