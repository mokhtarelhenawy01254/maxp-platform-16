import { useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  DentalLabDoctor,
  DentalTechnicianRole,
} from "../../shared";

export const QUICK_ORDER_DRAFT_KEY = "maxp_dental_quick_order_draft_v1";

export interface QuickOrderDraftState {
  selectedDoctor: DentalLabDoctor | null;
  setSelectedDoctor: (d: DentalLabDoctor | null) => void;
  treatingDoctorName: string;
  setTreatingDoctorName: (name: string) => void;
  selectedServiceIds: string[];
  setSelectedServiceIds: (ids: string[]) => void;
  selectedTeeth: string[];
  setSelectedTeeth: (teeth: string[]) => void;
  unitsCount: number;
  setUnitsCount: (n: number) => void;
  shade: string;
  setShade: (s: string) => void;
  customShade: string;
  setCustomShade: (s: string) => void;
  material: string;
  setMaterial: (m: string) => void;
  impressionType: string;
  setImpressionType: (t: string) => void;
  caseIntent: string;
  setCaseIntent: (i: string) => void;
  priceSnapshot: number;
  setPriceSnapshot: (p: number) => void;
  discount: number;
  setDiscount: (d: number) => void;
  patientName: string;
  setPatientName: (n: string) => void;
  patientPhone: string;
  setPatientPhone: (p: string) => void;
  receivedDate: string;
  setReceivedDate: (d: string) => void;
  dueDate: string;
  setDueDate: (d: string) => void;
  priority: "NORMAL" | "URGENT" | "STAT";
  setPriority: (p: "NORMAL" | "URGENT" | "STAT") => void;
  notes: string;
  setNotes: (n: string) => void;
  selectedTechnicianId: string;
  setSelectedTechnicianId: (id: string) => void;
  selectedTechnicianRole: DentalTechnicianRole;
  setSelectedTechnicianRole: (r: DentalTechnicianRole) => void;
  preselectedDoctor?: DentalLabDoctor | null;
  defaultDueDate: string;
  setStep: (step: 1 | 2 | 3) => void;
}

export function useQuickOrderDraft(props: QuickOrderDraftState) {
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft once on mount
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(QUICK_ORDER_DRAFT_KEY);
      if (savedDraft) {
        const d = JSON.parse(savedDraft);
        if (d && typeof d === "object") {
          if (d.doctor && !props.preselectedDoctor) props.setSelectedDoctor(d.doctor);
          if (d.treatingDoctorName) props.setTreatingDoctorName(d.treatingDoctorName);
          if (Array.isArray(d.selectedServiceIds) && d.selectedServiceIds.length > 0)
            props.setSelectedServiceIds(d.selectedServiceIds);
          if (Array.isArray(d.selectedTeeth)) props.setSelectedTeeth(d.selectedTeeth);
          if (d.unitsCount) props.setUnitsCount(d.unitsCount);
          if (d.shade) props.setShade(d.shade);
          if (d.customShade) props.setCustomShade(d.customShade);
          if (d.material) props.setMaterial(d.material);
          if (d.impressionType) props.setImpressionType(d.impressionType);
          if (d.caseIntent) props.setCaseIntent(d.caseIntent);
          if (d.priceSnapshot) props.setPriceSnapshot(d.priceSnapshot);
          if (d.discount) props.setDiscount(d.discount);
          if (d.patientName) props.setPatientName(d.patientName);
          if (d.patientPhone) props.setPatientPhone(d.patientPhone);
          if (d.receivedDate) props.setReceivedDate(d.receivedDate);
          if (d.dueDate) props.setDueDate(d.dueDate);
          if (d.priority) props.setPriority(d.priority);
          if (d.notes) props.setNotes(d.notes);
          if (d.technicianId) props.setSelectedTechnicianId(d.technicianId);
          if (d.technicianRole) props.setSelectedTechnicianRole(d.technicianRole);
          setDraftRestored(true);
        }
      }
    } catch {
      // ignore
    }
  }, [props.preselectedDoctor]);

  // Debounced auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        props.selectedDoctor ||
        props.selectedServiceIds.length > 0 ||
        props.patientName.trim()
      ) {
        try {
          const draft = {
            doctor: props.selectedDoctor,
            treatingDoctorName: props.treatingDoctorName,
            selectedServiceIds: props.selectedServiceIds,
            selectedTeeth: props.selectedTeeth,
            unitsCount: props.unitsCount,
            shade: props.shade,
            customShade: props.customShade,
            material: props.material,
            impressionType: props.impressionType,
            caseIntent: props.caseIntent,
            priceSnapshot: props.priceSnapshot,
            discount: props.discount,
            patientName: props.patientName,
            patientPhone: props.patientPhone,
            receivedDate: props.receivedDate,
            dueDate: props.dueDate,
            priority: props.priority,
            notes: props.notes,
            technicianId: props.selectedTechnicianId,
            technicianRole: props.selectedTechnicianRole,
          };
          sessionStorage.setItem(QUICK_ORDER_DRAFT_KEY, JSON.stringify(draft));
        } catch {
          // ignore
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    props.selectedDoctor,
    props.treatingDoctorName,
    props.selectedServiceIds,
    props.selectedTeeth,
    props.unitsCount,
    props.shade,
    props.customShade,
    props.material,
    props.impressionType,
    props.caseIntent,
    props.priceSnapshot,
    props.discount,
    props.patientName,
    props.patientPhone,
    props.receivedDate,
    props.dueDate,
    props.priority,
    props.notes,
    props.selectedTechnicianId,
    props.selectedTechnicianRole,
  ]);

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(QUICK_ORDER_DRAFT_KEY);
      setDraftRestored(false);
      if (!props.preselectedDoctor) props.setSelectedDoctor(null);
      props.setSelectedServiceIds([]);
      props.setSelectedTeeth([]);
      props.setUnitsCount(1);
      props.setShade("");
      props.setCustomShade("");
      props.setMaterial("");
      props.setImpressionType("SILICONE");
      props.setCaseIntent("FINAL");
      props.setPriceSnapshot(0);
      props.setDiscount(0);
      props.setPatientName("");
      props.setPatientPhone("");
      props.setReceivedDate(new Date().toISOString().split("T")[0]);
      props.setDueDate(props.defaultDueDate);
      props.setPriority("NORMAL");
      props.setNotes("");
      props.setSelectedTechnicianId("");
      props.setSelectedTechnicianRole("CAD_DESIGNER");
      props.setStep(props.preselectedDoctor ? 2 : 1);
      toast.info("تم تفريغ المسودة وإعادة تعيين النموذج");
    } catch {
      // ignore
    }
  };

  const removeSavedDraft = () => {
    try {
      sessionStorage.removeItem(QUICK_ORDER_DRAFT_KEY);
    } catch {
      // ignore
    }
  };

  return {
    draftRestored,
    clearDraft,
    removeSavedDraft,
  };
}

export default useQuickOrderDraft;
