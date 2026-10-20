import { type DentalCaseInspectorProps } from "./inspector/types/inspectorTypes";
import { InspectorHeader } from "./inspector/components/InspectorHeader";
import { InspectorActionBar } from "./inspector/components/InspectorActionBar";
import { InspectorStatusBanner } from "./inspector/components/InspectorStatusBanner";
import { InspectorDoctorPatientCards } from "./inspector/components/InspectorDoctorPatientCards";
import { InspectorTechnicalSpecs } from "./inspector/components/InspectorTechnicalSpecs";
import { InspectorTechniciansList } from "./inspector/components/InspectorTechniciansList";
import { InspectorFinancialOverview } from "./inspector/components/InspectorFinancialOverview";
import { InspectorDoctorNotes } from "./inspector/components/InspectorDoctorNotes";

export type { DentalCaseInspectorProps };

export default function DentalCaseInspector({
  caseData,
  onClose,
  onAdvance,
  onAssign,
  onEdit,
  onInvoice,
  onUpload,
  onPrintPanLabel,
  onPrintWorkOrder,
  onTrash,
  isBusy,
  uploadingId,
}: DentalCaseInspectorProps) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all">
      <InspectorHeader caseData={caseData} onClose={onClose} />
      <InspectorActionBar
        caseData={caseData}
        onAdvance={onAdvance}
        onAssign={onAssign}
        onEdit={onEdit}
        onInvoice={onInvoice}
        onUpload={onUpload}
        onPrintPanLabel={onPrintPanLabel}
        onPrintWorkOrder={onPrintWorkOrder}
        onTrash={onTrash}
        isBusy={isBusy}
        uploadingId={uploadingId}
      />
      <div className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs">
        <InspectorStatusBanner caseData={caseData} />
        <InspectorDoctorPatientCards caseData={caseData} />
        <InspectorTechnicalSpecs caseData={caseData} />
        <InspectorTechniciansList caseData={caseData} onAssign={onAssign} />
        <InspectorFinancialOverview caseData={caseData} />
        <InspectorDoctorNotes caseData={caseData} />
      </div>
    </div>
  );
}
