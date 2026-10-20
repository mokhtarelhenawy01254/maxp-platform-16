import { useEffect, useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type {
  DentalCasePriority,
  DentalLabCase,
  DentalWorkType,
} from "../../shared";
import {
  createCase,
  fetchDoctorPricing,
  updateCase,
} from "../../shared";

export interface UseDentalCaseCreateFormOptions {
  initial?: DentalLabCase | null;
  workTypes: DentalWorkType[];
  onSaved: () => void;
}

export function useDentalCaseCreateForm({
  initial,
  workTypes,
  onSaved,
}: UseDentalCaseCreateFormOptions) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId] = useState(initial?.doctorId ?? "");
  const [doctorName, setDoctorName] = useState(initial?.doctorName ?? "");
  const [technicianId, setTechnicianId] = useState(initial?.assignments?.[0]?.technicianId ?? "");
  const [workTypeId, setWorkTypeId] = useState(initial?.workTypeId ?? "");
  const [workTypeName, setWorkTypeName] = useState(initial?.workTypeName ?? "");
  const [priceSnapshot, setPriceSnapshot] = useState(initial?.priceSnapshot ?? 0);
  const [patientName, setPatientName] = useState(initial?.patientName ?? "");
  const [patientPhone, setPatientPhone] = useState(initial?.patientPhone ?? "");
  const [teeth, setTeeth] = useState(initial?.teeth ?? "");
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>(
    initial?.teeth ? initial.teeth.split(/[,،\s]+/).filter(Boolean) : []
  );
  const [unitsCount, setUnitsCount] = useState<number>(() => {
    if (initial?.unitsCount && initial.unitsCount > 0) return initial.unitsCount;
    if (initial?.teeth) {
      const parsed = initial.teeth.split(/[,،\s]+/).filter(Boolean);
      if (parsed.length > 0) return parsed.length;
    }
    return 1;
  });
  const [shade, setShade] = useState(initial?.shade ?? "");
  const [material, setMaterial] = useState(initial?.material ?? "");
  const [lotNumber, setLotNumber] = useState(initial?.lotNumber ?? "");
  const [materialBrand, setMaterialBrand] = useState(initial?.materialBrand ?? "");
  const [warrantyYears, setWarrantyYears] = useState(initial?.warrantyYears ?? 0);
  const [receivedDate, setReceivedDate] = useState(
    initial?.receivedDate
      ? initial.receivedDate.slice(0, 10)
      : new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ? initial.dueDate.slice(0, 10) : ""
  );
  const [priority, setPriority] = useState(initial?.priority ?? "NORMAL");
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [doctorPricingMap, setDoctorPricingMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (doctorId) {
      fetchDoctorPricing(doctorId)
        .then((map) => setDoctorPricingMap(map || {}))
        .catch(() => setDoctorPricingMap({}));
    } else {
      setDoctorPricingMap({});
    }
  }, [doctorId]);

  const resolveUnitPrice = (wt: DentalWorkType | undefined) => {
    if (!wt) return 0;
    if (doctorPricingMap[wt.id] != null) return Number(doctorPricingMap[wt.id]);
    return Number(wt.price) || 0;
  };

  const onWorkTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setWorkTypeId(id);
    const wt = workTypes.find((w) => w.id === id);
    setWorkTypeName(wt?.name ?? "");
    if (wt) {
      const cnt = unitsCount > 0 ? unitsCount : 1;
      const unitP = resolveUnitPrice(wt);
      setPriceSnapshot(wt.pricingMode === "FLAT" ? unitP : unitP * cnt);
    }
  };

  const onTeethChange = (arr: string[]) => {
    setSelectedTeeth(arr);
    const count = arr.length > 0 ? arr.length : 1;
    setUnitsCount(count);
    setTeeth(arr.join(", "));
    const wt = workTypes.find((w) => w.id === workTypeId);
    if (wt && wt.pricingMode !== "FLAT") {
      const unitP = resolveUnitPrice(wt);
      setPriceSnapshot(unitP * count);
    }
  };

  useEffect(() => {
    if (!initial && workTypeId) {
      const wt = workTypes.find((w) => w.id === workTypeId);
      if (wt) {
        const cnt = unitsCount > 0 ? unitsCount : 1;
        const unitP = resolveUnitPrice(wt);
        setPriceSnapshot(wt.pricingMode === "FLAT" ? unitP : unitP * cnt);
      }
    }
  }, [doctorPricingMap, initial, unitsCount, workTypeId, workTypes]);

  useEffect(() => {
    if (!initial && workTypeId) {
      const wt = workTypes.find((w) => w.id === workTypeId);
      if (wt) {
        let leadDays =
          typeof wt.leadTimeDays === "number" && wt.leadTimeDays > 0
            ? wt.leadTimeDays
            : 3;
        if (priority === "URGENT") {
          leadDays =
            typeof wt.urgentLeadTimeDays === "number" && wt.urgentLeadTimeDays > 0
              ? wt.urgentLeadTimeDays
              : Math.max(1, Math.ceil(leadDays * 0.5));
        } else if (priority === "STAT") {
          leadDays = 1;
        }
        const target = new Date(receivedDate || Date.now());
        target.setDate(target.getDate() + leadDays);
        setDueDate(target.toISOString().split("T")[0] || "");
      }
    }
  }, [initial, priority, receivedDate, workTypeId, workTypes]);

  const save = async () => {
    if (saving) return;
    if (!patientName.trim()) {
      toast.error(t("dentalLab.common.name"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        doctorId: doctorId || undefined,
        doctorName: doctorName.trim() || undefined,
        technicianId: technicianId || undefined,
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        workTypeId: workTypeId || undefined,
        workTypeName: workTypeName || undefined,
        teeth: teeth.trim() || undefined,
        unitsCount: Number(unitsCount) > 0 ? Number(unitsCount) : 1,
        shade: shade.trim() || undefined,
        material: material.trim() || undefined,
        lotNumber: lotNumber.trim() || undefined,
        materialBrand: materialBrand.trim() || undefined,
        warrantyYears: Number(warrantyYears) >= 0 ? Number(warrantyYears) : 0,
        priceSnapshot: Number(priceSnapshot) || 0,
        discount: Number(discount) || 0,
        receivedDate: receivedDate || undefined,
        dueDate: dueDate || undefined,
        priority: priority as DentalCasePriority,
        notes: notes.trim() || undefined,
      };
      if (initial) {
        await updateCase(initial.id, payload);
        toast.success(t("dentalLab.common.saved"));
      } else {
        await createCase(payload);
        toast.success(t("dentalLab.common.saved"));
      }
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
    doctorName,
    setDoctorName,
    technicianId,
    setTechnicianId,
    workTypeId,
    setWorkTypeId,
    workTypeName,
    setWorkTypeName,
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
  };
}
