import React from "react";
import DentalCaseEditWorkSection from "./DentalCaseEditWorkSection";
import type { EditCaseModalProps } from "../types/dentalCaseDetailTypes";
import { MODAL_CONTENT_CLS } from "../../shared";
import { useDentalCaseEditForm } from "./case-edit/hooks/useDentalCaseEditForm";
import { DentalCaseEditHeader } from "./case-edit/components/DentalCaseEditHeader";
import { DentalCaseEditDoctorPatientSection } from "./case-edit/components/DentalCaseEditDoctorPatientSection";
import { DentalCaseEditFinancialSection } from "./case-edit/components/DentalCaseEditFinancialSection";
import { DentalCaseEditFooter } from "./case-edit/components/DentalCaseEditFooter";

export default function DentalCaseEditModal({
  caseData,
  doctors,
  workTypes,
  onClose,
  onSaved,
}: EditCaseModalProps) {
  const form = useDentalCaseEditForm({
    caseData,
    workTypes,
    onSaved,
  });

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={() => !form.saving && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} !max-w-4xl max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <DentalCaseEditHeader
          caseNumber={caseData.caseNumber}
          saving={form.saving}
          onClose={onClose}
        />

        <div className="space-y-6 text-sm">
          {/* Section 1: Doctor & Patient */}
          <DentalCaseEditDoctorPatientSection
            doctorId={form.doctorId}
            setDoctorId={form.setDoctorId}
            patientName={form.patientName}
            setPatientName={form.setPatientName}
            patientPhone={form.patientPhone}
            setPatientPhone={form.setPatientPhone}
            doctors={doctors}
          />

          {/* Section 2: Work & Units */}
          <DentalCaseEditWorkSection
            workTypeId={form.workTypeId}
            workTypes={workTypes}
            unitsCount={form.unitsCount}
            unitPrice={form.unitPrice}
            shade={form.shade}
            material={form.material}
            materialBrand={form.materialBrand}
            lotNumber={form.lotNumber}
            warrantyYears={form.warrantyYears}
            selectedTeeth={form.selectedTeeth}
            onWorkTypeChange={form.onWorkTypeChange}
            onUnitsCountChange={form.handleUnitsCountChange}
            onUnitPriceChange={form.handleUnitPriceChange}
            onShadeChange={form.setShade}
            onMaterialChange={form.setMaterial}
            onMaterialBrandChange={form.setMaterialBrand}
            onLotNumberChange={form.setLotNumber}
            onWarrantyYearsChange={form.setWarrantyYears}
            onTeethChange={(arr) => {
              form.setSelectedTeeth(arr);
              form.setTeeth(arr.join(", "));
            }}
          />

          {/* Section 3: Financial & Dates */}
          <DentalCaseEditFinancialSection
            priceSnapshot={form.priceSnapshot}
            setPriceSnapshot={form.setPriceSnapshot}
            discount={form.discount}
            setDiscount={form.setDiscount}
            receivedDate={form.receivedDate}
            setReceivedDate={form.setReceivedDate}
            dueDate={form.dueDate}
            setDueDate={form.setDueDate}
            priority={form.priority}
            setPriority={form.setPriority}
            status={form.status}
            setStatus={form.setStatus}
          />

          {/* Section 4: Notes & Footer Buttons */}
          <DentalCaseEditFooter
            notes={form.notes}
            setNotes={form.setNotes}
            saving={form.saving}
            onClose={onClose}
            onSave={form.save}
          />
        </div>
      </div>
    </div>
  );
}
