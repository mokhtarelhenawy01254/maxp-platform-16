import { MODAL_CONTENT_CLS } from "../../shared";
import type { DentalInvoiceDetailModalProps } from "./detail-modal/types";
import { useInvoiceConsolidatedData } from "./detail-modal/hooks/useInvoiceConsolidatedData";
import { InvoiceDetailModalHeader } from "./detail-modal/components/InvoiceDetailModalHeader";
import { InvoiceDoctorPatientCard } from "./detail-modal/components/InvoiceDoctorPatientCard";
import { InvoiceConsolidatedTable } from "./detail-modal/components/InvoiceConsolidatedTable";
import { InvoiceSingleCaseCard } from "./detail-modal/components/InvoiceSingleCaseCard";
import { InvoiceFinancialTotalsCard } from "./detail-modal/components/InvoiceFinancialTotalsCard";
import { InvoicePaymentHistorySection } from "./detail-modal/components/InvoicePaymentHistorySection";
import { InvoiceDetailModalFooter } from "./detail-modal/components/InvoiceDetailModalFooter";

export type { DentalInvoiceDetailModalProps };

export function DentalInvoiceDetailModal({
  invoice,
  onClose,
  onAddPayment,
  onPdf,
  onPaymentLink,
}: DentalInvoiceDetailModalProps) {
  const {
    consolidatedData,
    items,
    casesCount,
    totalUnits,
    displayNote,
  } = useInvoiceConsolidatedData(invoice);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div className={`${MODAL_CONTENT_CLS} max-w-3xl my-6`} onClick={(e) => e.stopPropagation()}>
        <InvoiceDetailModalHeader invoice={invoice} onClose={onClose} />

        <div className="space-y-4 max-h-[72vh] overflow-y-auto px-0.5 text-xs">
          <InvoiceDoctorPatientCard
            invoice={invoice}
            consolidatedData={consolidatedData}
            casesCount={casesCount}
            totalUnits={totalUnits}
          />

          {consolidatedData && items.length > 0 && (
            <InvoiceConsolidatedTable
              items={items}
              casesCount={casesCount}
              totalUnits={totalUnits}
              total={invoice.total}
            />
          )}

          {!consolidatedData && invoice.case && (
            <InvoiceSingleCaseCard invoiceCase={invoice.case} />
          )}

          <InvoiceFinancialTotalsCard
            total={invoice.total}
            paid={invoice.paid}
            remaining={invoice.remaining}
            displayNote={displayNote}
          />

          <InvoicePaymentHistorySection
            payments={invoice.payments}
            remaining={invoice.remaining}
            onAddPayment={onAddPayment}
          />
        </div>

        <InvoiceDetailModalFooter
          invoice={invoice}
          onPdf={onPdf}
          onPaymentLink={onPaymentLink}
          onAddPayment={onAddPayment}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export default DentalInvoiceDetailModal;
