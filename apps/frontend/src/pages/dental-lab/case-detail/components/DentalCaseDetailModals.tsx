import React from "react";
import DentalCaseAdvanceModal from "../modals/DentalCaseAdvanceModal";
import DentalCaseEditModal from "../modals/DentalCaseEditModal";
import DentalCaseAssignStageModal from "../modals/DentalCaseAssignStageModal";
import {
  DentalCaseSendToTryInModal,
  DentalCaseReturnFromTryInModal,
} from "../modals/DentalCaseTryInModals";
import DentalCaseOutsourceModal from "../modals/DentalCaseOutsourceModal";
import DentalCasePaymentModal from "../modals/DentalCasePaymentModal";
import DentalCaseQualityModal from "../modals/DentalCaseQualityModal";
import DentalCaseRefabricationModal from "../modals/DentalCaseRefabricationModal";
import DentalCaseMaterialConsumeModal from "../modals/DentalCaseMaterialConsumeModal";
import type { DentalLabCaseDetail } from "../../shared";
import type { useDentalCaseDetail } from "../hooks/useDentalCaseDetail";

export interface DentalCaseDetailModalsProps {
  c: DentalLabCaseDetail;
  next: string | null;
  detailState: ReturnType<typeof useDentalCaseDetail>;
}

export const DentalCaseDetailModals: React.FC<DentalCaseDetailModalsProps> = ({
  c,
  next,
  detailState,
}) => {
  return (
    <>
      {detailState.advanceOpen && next && (
        <DentalCaseAdvanceModal
          caseData={c}
          next={next}
          technicians={detailState.technicians}
          onClose={() => detailState.setAdvanceOpen(false)}
          onSaved={() => {
            detailState.setAdvanceOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.statusOpen && (
        <DentalCaseEditModal
          caseData={c}
          doctors={detailState.doctors}
          workTypes={detailState.workTypes}
          onClose={() => detailState.setStatusOpen(false)}
          onSaved={() => {
            detailState.setStatusOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.assignStage && (
        <DentalCaseAssignStageModal
          caseId={c.id}
          stage={
            (c.stages || []).find((s) => s.id === detailState.assignStage?.id) ||
            detailState.assignStage
          }
          technicians={detailState.technicians}
          onClose={() => detailState.setAssignStage(null)}
          onSaved={() => detailState.refresh()}
        />
      )}

      {detailState.tryInSendOpen && (
        <DentalCaseSendToTryInModal
          caseId={c.id}
          onClose={() => detailState.setTryInSendOpen(false)}
          onSaved={() => {
            detailState.setTryInSendOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.tryInReturnOpen && (
        <DentalCaseReturnFromTryInModal
          caseId={c.id}
          onClose={() => detailState.setTryInReturnOpen(false)}
          onSaved={() => {
            detailState.setTryInReturnOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.outsourceOpen && (
        <DentalCaseOutsourceModal
          caseId={c.id}
          onClose={() => detailState.setOutsourceOpen(false)}
          onSaved={() => {
            detailState.setOutsourceOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.paymentInvoice && (
        <DentalCasePaymentModal
          invoice={detailState.paymentInvoice}
          onClose={() => detailState.setPaymentInvoice(null)}
          onSaved={() => {
            detailState.setPaymentInvoice(null);
            detailState.refresh();
          }}
        />
      )}

      {detailState.qualityOpen && (
        <DentalCaseQualityModal
          caseId={c.id}
          onClose={() => detailState.setQualityOpen(false)}
          onSaved={() => {
            detailState.setQualityOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.refabOpen && (
        <DentalCaseRefabricationModal
          caseId={c.id}
          onClose={() => detailState.setRefabOpen(false)}
          onSaved={() => {
            detailState.setRefabOpen(false);
            detailState.refresh();
          }}
        />
      )}

      {detailState.materialConsumeOpen && (
        <DentalCaseMaterialConsumeModal
          materialsList={detailState.materialsList}
          selectedMatId={detailState.selectedMatId}
          selectedStockId={detailState.selectedStockId}
          consumeUnits={detailState.consumeUnits}
          consumeNotes={detailState.consumeNotes}
          materialBusy={detailState.materialBusy}
          onSelectMatId={detailState.setSelectedMatId}
          onSelectStockId={detailState.setSelectedStockId}
          onChangeUnits={detailState.setConsumeUnits}
          onChangeNotes={detailState.setConsumeNotes}
          onSubmit={detailState.handleConsumeSubmit}
          onClose={() => !detailState.materialBusy && detailState.setMaterialConsumeOpen(false)}
        />
      )}
    </>
  );
};

export default DentalCaseDetailModals;
