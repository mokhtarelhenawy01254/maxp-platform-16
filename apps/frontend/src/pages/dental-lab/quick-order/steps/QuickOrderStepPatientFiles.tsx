import type { QuickOrderStepPatientFilesProps } from "./patient-files/types";
import { QuickOrderPatientDatesFields } from "./patient-files/components/QuickOrderPatientDatesFields";
import { QuickOrderNotesField } from "./patient-files/components/QuickOrderNotesField";
import { QuickOrderTechnicianAssignCard } from "./patient-files/components/QuickOrderTechnicianAssignCard";
import { QuickOrderFilesDropzone } from "./patient-files/components/QuickOrderFilesDropzone";
import { QuickOrderSummaryPricingCard } from "./patient-files/components/QuickOrderSummaryPricingCard";

export type { QuickOrderStepPatientFilesProps };

export function QuickOrderStepPatientFiles({
  patientName,
  onPatientNameChange,
  patientPhone,
  onPatientPhoneChange,
  receivedDate,
  onReceivedDateChange,
  dueDate,
  onDueDateChange,
  dueDateReason,
  priority,
  onPriorityChange,
  technicians,
  selectedTechnicianId,
  onSelectedTechnicianIdChange,
  selectedTechnicianRole,
  onSelectedTechnicianRoleChange,
  notes,
  onNotesChange,
  files,
  onFilesChange,
  fileInputRef,
  dragOver,
  onDragOverChange,
  upStatus,
  selectedDoctor,
  primaryWorkType,
  selectedTeeth,
  unitsCount,
  shade,
  customShade,
  priceSnapshot,
  discount,
}: QuickOrderStepPatientFilesProps) {
  return (
    <div className="space-y-4">
      <QuickOrderPatientDatesFields
        patientName={patientName}
        onPatientNameChange={onPatientNameChange}
        patientPhone={patientPhone}
        onPatientPhoneChange={onPatientPhoneChange}
        receivedDate={receivedDate}
        onReceivedDateChange={onReceivedDateChange}
        dueDate={dueDate}
        onDueDateChange={onDueDateChange}
        dueDateReason={dueDateReason}
        priority={priority}
        onPriorityChange={onPriorityChange}
      />

      <QuickOrderNotesField
        notes={notes}
        onNotesChange={onNotesChange}
      />

      <QuickOrderTechnicianAssignCard
        technicians={technicians}
        selectedTechnicianId={selectedTechnicianId}
        onSelectedTechnicianIdChange={onSelectedTechnicianIdChange}
        selectedTechnicianRole={selectedTechnicianRole}
        onSelectedTechnicianRoleChange={onSelectedTechnicianRoleChange}
      />

      <QuickOrderFilesDropzone
        files={files}
        onFilesChange={onFilesChange}
        fileInputRef={fileInputRef}
        dragOver={dragOver}
        onDragOverChange={onDragOverChange}
        upStatus={upStatus}
      />

      <QuickOrderSummaryPricingCard
        selectedDoctor={selectedDoctor}
        primaryWorkType={primaryWorkType}
        selectedTeeth={selectedTeeth}
        unitsCount={unitsCount}
        shade={shade}
        customShade={customShade}
        priceSnapshot={priceSnapshot}
        discount={discount}
        priority={priority}
        dueDate={dueDate}
        technicians={technicians}
        selectedTechnicianId={selectedTechnicianId}
      />
    </div>
  );
}

export default QuickOrderStepPatientFiles;
