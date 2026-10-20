import React from "react";
import { MODAL_CONTENT_CLS } from "../../shared";
import type { DentalInvoiceBatchModalProps, DentalInvoiceBatchMode } from "./batch-modal/types";
import { useDentalInvoiceBatchForm } from "./batch-modal/hooks/useDentalInvoiceBatchForm";
import { DentalInvoiceBatchHeader } from "./batch-modal/components/DentalInvoiceBatchHeader";
import { DentalInvoiceBatchOptions } from "./batch-modal/components/DentalInvoiceBatchOptions";
import { DentalInvoiceBatchDoctorList } from "./batch-modal/components/DentalInvoiceBatchDoctorList";
import { DentalInvoiceBatchFooter } from "./batch-modal/components/DentalInvoiceBatchFooter";

export type { DentalInvoiceBatchModalProps, DentalInvoiceBatchMode };

export function DentalInvoiceBatchModal({
  summary,
  onClose,
  onSaved,
}: DentalInvoiceBatchModalProps) {
  const form = useDentalInvoiceBatchForm({ summary, onSaved });

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={() => !form.submitting && onClose()}
    >
      <div className={`${MODAL_CONTENT_CLS} max-w-2xl my-8`} onClick={(e) => e.stopPropagation()}>
        <DentalInvoiceBatchHeader
          submitting={form.submitting}
          onClose={onClose}
        />

        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-0.5">
          <DentalInvoiceBatchOptions
            includeAllStatuses={form.includeAllStatuses}
            onIncludeAllToggle={form.handleIncludeAllToggle}
            loadingSummary={form.loadingSummary}
            submitting={form.submitting}
            mode={form.mode}
            onModeChange={form.setMode}
            dueDate={form.dueDate}
            onDueDateChange={form.setDueDate}
            notes={form.notes}
            onNotesChange={form.setNotes}
          />

          <DentalInvoiceBatchDoctorList
            currentSummary={form.currentSummary}
            selectedDoctorIds={form.selectedDoctorIds}
            allSelected={form.allSelected}
            toggleSelectAll={form.toggleSelectAll}
            toggleDoctor={form.toggleDoctor}
            selectedStats={form.selectedStats}
          />
        </div>

        <DentalInvoiceBatchFooter
          mode={form.mode}
          submitting={form.submitting}
          selectedDoctorIdsCount={form.selectedDoctorIds.length}
          selectedStats={form.selectedStats}
          onClose={onClose}
          onRunBatch={form.handleRunBatch}
        />
      </div>
    </div>
  );
}

export default DentalInvoiceBatchModal;
