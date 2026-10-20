import React from "react";
import { MODAL_CONTENT_CLS } from "./shared";
import { StepIndicator } from "./quick-order/components/StepIndicator";
import { QuickOrderModalHeader } from "./quick-order/components/QuickOrderModalHeader";
import { QuickOrderModalFooter } from "./quick-order/components/QuickOrderModalFooter";
import { QuickOrderStepDoctor } from "./quick-order/steps/QuickOrderStepDoctor";
import { QuickOrderStepWorkType } from "./quick-order/steps/QuickOrderStepWorkType";
import { QuickOrderStepPatientFiles } from "./quick-order/steps/QuickOrderStepPatientFiles";
import { useQuickOrderWizard } from "./quick-order/hooks/useQuickOrderWizard";
import type { QuickOrderModalProps } from "./quick-order/types/quickOrderTypes";

export function QuickOrderModal({
  onClose,
  onSaved,
  preselectedDoctor,
}: QuickOrderModalProps) {
  const wizard = useQuickOrderWizard({
    preselectedDoctor,
    onClose,
    onSaved,
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3"
      onClick={() => !wizard.submitting && wizard.handleCancel()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[92vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <QuickOrderModalHeader
          draftRestored={wizard.draftRestored}
          clearDraft={wizard.clearDraft}
          submitting={wizard.submitting}
          submittingAndPrint={wizard.submittingAndPrint}
          onCancel={wizard.handleCancel}
        />

        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <StepIndicator current={wizard.step} />

          {/* STEP 1: DOCTOR & FINANCIAL STATUS */}
          {wizard.step === 1 && (
            <QuickOrderStepDoctor
              doctorSearch={wizard.doctorSearch}
              onDoctorSearchChange={wizard.setDoctorSearch}
              filteredDoctors={wizard.allDoctors}
              selectedDoctor={wizard.selectedDoctor}
              onSelectDoctor={wizard.setSelectedDoctor}
              treatingDoctorName={wizard.treatingDoctorName}
              onTreatingDoctorNameChange={wizard.setTreatingDoctorName}
              customDoctorInput={wizard.customDoctorInput}
              onCustomDoctorInputChange={wizard.setCustomDoctorInput}
              showNewDoctor={wizard.showNewDoctor}
              onShowNewDoctorChange={wizard.setShowNewDoctor}
              doctorsLoading={wizard.doctorsLoading}
              bypassCreditCheck={wizard.bypassCreditCheck}
              onBypassCreditCheckChange={wizard.setBypassCreditCheck}
              onDoctorCreated={(doc) => {
                wizard.setAllDoctors((prev) => [doc, ...prev]);
                wizard.setSelectedDoctor(doc);
                wizard.setShowNewDoctor(false);
              }}
            />
          )}

          {/* STEP 2: SERVICES, ODONTOGRAM, SHADES & INTENT */}
          {wizard.step === 2 && (
            <QuickOrderStepWorkType
              workTypes={wizard.workTypes}
              selectedServiceIds={wizard.selectedServiceIds}
              onToggleService={wizard.toggleService}
              selectedTeeth={wizard.selectedTeeth}
              onTeethChange={wizard.handleTeethChange}
              unitsCount={wizard.unitsCount}
              onUnitsCountChange={wizard.handleManualUnitsChange}
              shade={wizard.shade}
              onShadeChange={wizard.setShade}
              customShade={wizard.customShade}
              onCustomShadeChange={wizard.setCustomShade}
              material={wizard.material}
              onMaterialChange={wizard.setMaterial}
              impressionType={wizard.impressionType}
              onImpressionTypeChange={wizard.setImpressionType}
              caseIntent={wizard.caseIntent}
              onCaseIntentChange={wizard.setCaseIntent}
              priceSnapshot={wizard.priceSnapshot}
              onPriceSnapshotChange={wizard.setPriceSnapshot}
              discount={wizard.discount}
              onDiscountChange={wizard.setDiscount}
              primaryService={wizard.primaryWorkType}
              doctorPricingMap={wizard.doctorPricingMap}
              refsLoading={wizard.refsLoading}
            />
          )}

          {/* STEP 3: PATIENT, DUE DATE, 3D FILES & DISPATCH */}
          {wizard.step === 3 && (
            <QuickOrderStepPatientFiles
              patientName={wizard.patientName}
              onPatientNameChange={wizard.setPatientName}
              patientPhone={wizard.patientPhone}
              onPatientPhoneChange={wizard.setPatientPhone}
              receivedDate={wizard.receivedDate}
              onReceivedDateChange={wizard.setReceivedDate}
              dueDate={wizard.dueDate}
              onDueDateChange={wizard.setDueDate}
              dueDateReason={wizard.dueDateReason}
              isDueDateUserModified={wizard.isDueDateUserModified}
              priority={wizard.priority}
              onPriorityChange={wizard.setPriority}
              technicians={wizard.technicians}
              selectedTechnicianId={wizard.selectedTechnicianId}
              onSelectedTechnicianIdChange={wizard.setSelectedTechnicianId}
              selectedTechnicianRole={wizard.selectedTechnicianRole}
              onSelectedTechnicianRoleChange={wizard.setSelectedTechnicianRole}
              notes={wizard.notes}
              onNotesChange={wizard.setNotes}
              files={wizard.files}
              onFilesChange={wizard.setFiles}
              fileInputRef={wizard.fileInputRef}
              dragOver={wizard.dragOver}
              onDragOverChange={wizard.setDragOver}
              upProgress={wizard.upProgress}
              upStatus={wizard.upStatus}
              upTotalPct={wizard.upTotalPct}
              upDoneCount={wizard.upDoneCount}
              selectedDoctor={wizard.selectedDoctor}
              primaryWorkType={wizard.primaryWorkType}
              selectedTeeth={wizard.selectedTeeth}
              unitsCount={wizard.unitsCount}
              shade={wizard.shade}
              customShade={wizard.customShade}
              priceSnapshot={wizard.priceSnapshot}
              discount={wizard.discount}
            />
          )}
        </div>

        <QuickOrderModalFooter
          step={wizard.step}
          setStep={wizard.setStep}
          selectedDoctor={wizard.selectedDoctor}
          selectedServiceIds={wizard.selectedServiceIds}
          patientName={wizard.patientName}
          submitting={wizard.submitting}
          submittingAndPrint={wizard.submittingAndPrint}
          onCancel={wizard.handleCancel}
          submitOrder={wizard.submitOrder}
        />
      </div>
    </div>
  );
}

export default QuickOrderModal;
