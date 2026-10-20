import { MODAL_INPUT_CLS } from "../../shared";
import type {
  DentalLabCase,
  DentalLabDoctor,
  DentalTechnician,
  DentalWorkType,
} from "../../shared";
import { useDentalCaseCreateForm } from "../hooks/useDentalCaseCreateForm";
import { CaseCreateDrawerHeader } from "./create-drawer/components/CaseCreateDrawerHeader";
import { CaseCreateClinicDoctorSection } from "./create-drawer/components/CaseCreateClinicDoctorSection";
import { CaseCreatePatientWorkTypeSection } from "./create-drawer/components/CaseCreatePatientWorkTypeSection";
import { CaseCreateOdontogramSection } from "./create-drawer/components/CaseCreateOdontogramSection";
import { CaseCreateMaterialDatesSection } from "./create-drawer/components/CaseCreateMaterialDatesSection";
import { CaseCreatePricingNotesSection } from "./create-drawer/components/CaseCreatePricingNotesSection";
import { CaseCreateDrawerFooter } from "./create-drawer/components/CaseCreateDrawerFooter";

export interface DentalCaseCreateModalProps {
  initial?: DentalLabCase | null;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export function DentalCaseCreateModal({
  initial,
  doctors,
  workTypes,
  technicians,
  onClose,
  onSaved,
}: DentalCaseCreateModalProps) {
  const {
    saving,
    doctorId,
    setDoctorId,
    doctorName,
    setDoctorName,
    technicianId,
    setTechnicianId,
    workTypeId,
    priceSnapshot,
    setPriceSnapshot,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    teeth,
    setTeeth,
    selectedTeeth,
    setSelectedTeeth,
    unitsCount,
    setUnitsCount,
    shade,
    setShade,
    material,
    setMaterial,
    lotNumber,
    setLotNumber,
    materialBrand,
    setMaterialBrand,
    warrantyYears,
    setWarrantyYears,
    receivedDate,
    setReceivedDate,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    discount,
    setDiscount,
    notes,
    setNotes,
    onWorkTypeChange,
    onTeethChange,
    save,
  } = useDentalCaseCreateForm({ initial, workTypes, onSaved });

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls =
    "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex justify-end animate-in fade-in duration-200"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-850 h-full shadow-2xl flex flex-col border-r dark:border-gray-700 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <CaseCreateDrawerHeader
          initial={initial}
          saving={saving}
          onClose={onClose}
        />

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <CaseCreateClinicDoctorSection
            doctorId={doctorId}
            setDoctorId={setDoctorId}
            doctorName={doctorName}
            setDoctorName={setDoctorName}
            doctors={doctors}
            inputCls={inputCls}
            labelCls={labelCls}
          />

          <CaseCreatePatientWorkTypeSection
            patientName={patientName}
            setPatientName={setPatientName}
            patientPhone={patientPhone}
            setPatientPhone={setPatientPhone}
            workTypeId={workTypeId}
            onWorkTypeChange={onWorkTypeChange}
            workTypes={workTypes}
            technicianId={technicianId}
            setTechnicianId={setTechnicianId}
            technicians={technicians}
            inputCls={inputCls}
            labelCls={labelCls}
          />

          <CaseCreateOdontogramSection
            selectedTeeth={selectedTeeth}
            onTeethChange={onTeethChange}
            teeth={teeth}
            setTeeth={setTeeth}
            setSelectedTeeth={setSelectedTeeth}
            unitsCount={unitsCount}
            setUnitsCount={setUnitsCount}
            shade={shade}
            setShade={setShade}
            inputCls={inputCls}
            labelCls={labelCls}
          />

          <CaseCreateMaterialDatesSection
            material={material}
            setMaterial={setMaterial}
            materialBrand={materialBrand}
            setMaterialBrand={setMaterialBrand}
            lotNumber={lotNumber}
            setLotNumber={setLotNumber}
            warrantyYears={warrantyYears}
            setWarrantyYears={setWarrantyYears}
            receivedDate={receivedDate}
            setReceivedDate={setReceivedDate}
            dueDate={dueDate}
            setDueDate={setDueDate}
            priority={priority}
            setPriority={setPriority}
            inputCls={inputCls}
            labelCls={labelCls}
          />

          <CaseCreatePricingNotesSection
            priceSnapshot={priceSnapshot}
            setPriceSnapshot={setPriceSnapshot}
            discount={discount}
            setDiscount={setDiscount}
            notes={notes}
            setNotes={setNotes}
            inputCls={inputCls}
            labelCls={labelCls}
          />
        </div>

        {/* Drawer Actions Footer */}
        <CaseCreateDrawerFooter
          initialExists={Boolean(initial)}
          saving={saving}
          onClose={onClose}
          onSave={save}
        />
      </div>
    </div>
  );
}

export default DentalCaseCreateModal;
