import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  DentalLabCase,
  DentalLabWorkType,
  DentalCasePriority,
  DentalCaseStatus,
} from "../../../../shared";
import { advanceCase, updateCase } from "../../../../shared";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface UseDentalCaseEditFormProps {
  caseData: DentalLabCase;
  workTypes: DentalLabWorkType[];
  onSaved: () => void;
}

export function useDentalCaseEditForm({
  caseData,
  workTypes,
  onSaved,
}: UseDentalCaseEditFormProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(caseData.doctorId || "");
  const [patientName, setPatientName] = useState(caseData.patientName || "");
  const [patientPhone, setPatientPhone] = useState(caseData.patientPhone || "");
  const [workTypeId, setWorkTypeId] = useState(caseData.workTypeId || "");
  const [workTypeName, setWorkTypeName] = useState(caseData.workTypeName || "");
  const [unitsCount, setUnitsCount] = useState<number>(caseData.unitsCount || 1);
  const [unitPrice, setUnitPrice] = useState<number>(caseData.unitPrice || 0);
  const [priceSnapshot, setPriceSnapshot] = useState<number>(caseData.priceSnapshot || 0);
  const [discount, setDiscount] = useState<number>(caseData.discount || 0);
  const [receivedDate, setReceivedDate] = useState(
    caseData.receivedDate ? caseData.receivedDate.slice(0, 10) : ""
  );
  const [dueDate, setDueDate] = useState(caseData.dueDate ? caseData.dueDate.slice(0, 10) : "");
  const [priority, setPriority] = useState<DentalCasePriority>(
    (caseData.priority as DentalCasePriority) || "NORMAL"
  );
  const [status, setStatus] = useState<DentalCaseStatus>(
    (caseData.status as DentalCaseStatus) || "RECEIVED"
  );
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(
    caseData.teeth ? caseData.teeth.split(/[,،\s]+/).filter(Boolean) : []
  );
  const [teeth, setTeeth] = useState(caseData.teeth || "");
  const [shade, setShade] = useState(caseData.shade || "");
  const [material, setMaterial] = useState(caseData.material || "");
  const [lotNumber, setLotNumber] = useState(caseData.lotNumber || "");
  const [materialBrand, setMaterialBrand] = useState(caseData.materialBrand || "");
  const [warrantyYears, setWarrantyYears] = useState(caseData.warrantyYears || 0);
  const [notes, setNotes] = useState(caseData.notes || "");

  const onWorkTypeChange = (wtId: string) => {
    setWorkTypeId(wtId);
    const wt = workTypes.find((w) => w.id === wtId);
    if (wt) {
      setWorkTypeName(wt.name);
      const pr = Number(wt.price) || 0;
      setUnitPrice(pr);
      setPriceSnapshot(round2(pr * (unitsCount || 1)));
      if (wt.defaultMaterial && !material) setMaterial(wt.defaultMaterial);
      if (wt.materialBrand && !materialBrand) setMaterialBrand(wt.materialBrand);
      if (wt.defaultWarrantyYears != null && !warrantyYears)
        setWarrantyYears(wt.defaultWarrantyYears);
    }
  };

  const handleUnitsCountChange = (count: number) => {
    const validCount = Math.max(1, count);
    setUnitsCount(validCount);
    if (unitPrice > 0) {
      setPriceSnapshot(round2(validCount * unitPrice));
    }
  };

  const handleUnitPriceChange = (price: number) => {
    const validPrice = Math.max(0, price);
    setUnitPrice(validPrice);
    if (unitsCount > 0) {
      setPriceSnapshot(round2(unitsCount * validPrice));
    }
  };

  const save = async () => {
    if (saving) return;
    if (!patientName.trim()) {
      toast.error(t("dentalLab.common.name"));
      return;
    }
    setSaving(true);
    try {
      if (status !== caseData.status) {
        await advanceCase(caseData.id, { status: status as DentalCaseStatus });
      }
      await updateCase(caseData.id, {
        doctorId: doctorId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: workTypeId || undefined,
        workTypeName: workTypeName.trim() || undefined,
        unitsCount: Math.max(1, Number(unitsCount) || 1),
        unitPrice: Math.max(0, Number(unitPrice) || 0),
        priceSnapshot: Math.max(0, Number(priceSnapshot) || 0),
        discount: Math.max(0, Number(discount) || 0),
        receivedDate: receivedDate || undefined,
        dueDate: dueDate || undefined,
        priority: priority as DentalCasePriority,
        teeth: teeth.trim() || undefined,
        shade: shade.trim() || undefined,
        material: material.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        materialBrand: materialBrand.trim() || undefined,
        warrantyYears: Number(warrantyYears) >= 0 ? Number(warrantyYears) : 0,
        notes: notes.trim() || undefined,
      });
      toast.success(t("dentalLab.common.saved"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    doctorId,
    setDoctorId,
    patientName,
    setPatientName,
    patientPhone,
    setPatientPhone,
    workTypeId,
    workTypeName,
    unitsCount,
    unitPrice,
    priceSnapshot,
    setPriceSnapshot,
    discount,
    setDiscount,
    receivedDate,
    setReceivedDate,
    dueDate,
    setDueDate,
    priority,
    setPriority,
    status,
    setStatus,
    selectedTeeth,
    setSelectedTeeth,
    teeth,
    setTeeth,
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
    notes,
    setNotes,
    onWorkTypeChange,
    handleUnitsCountChange,
    handleUnitPriceChange,
    save,
  };
}
