import React from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import type {
  DentalLabCase,
  DentalLabDoctor,
  DentalTechnician,
  DentalTechnicianRole,
  DentalWorkType,
} from "../../shared";

export type Step = 1 | 2 | 3;

export interface QuickOrderModalProps {
  onClose: () => void;
  onSaved: (created: DentalLabCase) => void;
  preselectedDoctor?: DentalLabDoctor | null;
}

export function fmtBytes(n?: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function fileIcon(name: string): React.ReactNode {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  }
  if (ext === "pdf") {
    return <FileText className="w-4 h-4 text-red-500" />;
  }
  if (["stl", "ply", "dxf", "dcm"].includes(ext)) {
    return (
      <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 rounded font-mono">
        3D
      </span>
    );
  }
  if (["json", "txt"].includes(ext)) {
    return <FileText className="w-4 h-4 text-amber-500" />;
  }
  return <FileText className="w-4 h-4 text-gray-400" />;
}

export function stepLabel(step: Step): string {
  if (step === 1) return "الطبيب والعيادة";
  if (step === 2) return "الخدمة والأسنان واللون";
  return "المريض والملفات";
}

export function calculateDynamicDueDate(
  workType?: DentalWorkType | null,
  priority: "NORMAL" | "URGENT" | "STAT" = "NORMAL",
  baseDateStr?: string
): { dateStr: string; reason: string } {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  if (isNaN(base.getTime())) base.setTime(Date.now());

  let leadDays =
    workType && typeof workType.leadTimeDays === "number" && workType.leadTimeDays > 0
      ? workType.leadTimeDays
      : 3;

  let reason = `${workType?.name || "المدة القياسية"} (${leadDays} أيام عمل)`;

  if (priority === "URGENT") {
    const reduced =
      workType && typeof workType.urgentLeadTimeDays === "number" && workType.urgentLeadTimeDays > 0
        ? workType.urgentLeadTimeDays
        : Math.max(1, Math.ceil(leadDays * 0.5));
    reason = `${workType?.name || "نوع العمل"} (مستعجل: ${reduced} أيام بدل ${leadDays})`;
    leadDays = reduced;
  } else if (priority === "STAT") {
    leadDays = 1;
    reason = `${workType?.name || "نوع العمل"} (طارئ جداً: يوم واحد)`;
  }

  const result = new Date(base);
  result.setDate(result.getDate() + leadDays);
  return {
    dateStr: result.toISOString().split("T")[0],
    reason,
  };
}

export function getDefaultDueDate(
  workType?: DentalWorkType | null,
  priority: "NORMAL" | "URGENT" | "STAT" = "NORMAL"
): string {
  return calculateDynamicDueDate(workType, priority).dateStr;
}

export interface DoctorCardProps {
  doctor: DentalLabDoctor;
  selected: boolean;
  onSelect: () => void;
}

export interface NewDoctorInlineProps {
  onCreated: (d: DentalLabDoctor) => void;
  onCancel: () => void;
}

export interface StepIndicatorProps {
  current: Step;
}

export interface QuickOrderStepDoctorProps {
  doctorSearch: string;
  onDoctorSearchChange: (val: string) => void;
  filteredDoctors: DentalLabDoctor[];
  selectedDoctor: DentalLabDoctor | null;
  onSelectDoctor: (doc: DentalLabDoctor) => void;
  treatingDoctorName: string;
  onTreatingDoctorNameChange: (val: string) => void;
  customDoctorInput: boolean;
  onCustomDoctorInputChange: (val: boolean) => void;
  showNewDoctor: boolean;
  onShowNewDoctorChange: (val: boolean) => void;
  doctorsLoading: boolean;
  bypassCreditCheck: boolean;
  onBypassCreditCheckChange: (val: boolean) => void;
  onDoctorCreated: (doc: DentalLabDoctor) => void;
}

export interface QuickOrderStepWorkTypeProps {
  workTypes: DentalWorkType[];
  selectedServiceIds: string[];
  onToggleService: (id: string, allowMulti?: boolean) => void;
  selectedTeeth: string[];
  onTeethChange: (teeth: string[]) => void;
  unitsCount: number;
  onUnitsCountChange: (cnt: number) => void;
  shade: string;
  onShadeChange: (sh: string) => void;
  customShade: string;
  onCustomShadeChange: (sh: string) => void;
  material: string;
  onMaterialChange: (mat: string) => void;
  impressionType: string;
  onImpressionTypeChange: (imp: string) => void;
  caseIntent: string;
  onCaseIntentChange: (intent: string) => void;
  priceSnapshot: number;
  onPriceSnapshotChange: (price: number) => void;
  discount?: number;
  onDiscountChange?: (disc: number) => void;
  primaryService?: DentalWorkType | null;
  doctorPricingMap?: Record<string, number>;
  refsLoading?: boolean;
}

export interface QuickOrderStepPatientFilesProps {
  patientName: string;
  onPatientNameChange: (val: string) => void;
  patientPhone: string;
  onPatientPhoneChange: (val: string) => void;
  receivedDate: string;
  onReceivedDateChange: (val: string) => void;
  dueDate: string;
  onDueDateChange: (val: string) => void;
  dueDateReason: string;
  isDueDateUserModified: boolean;
  priority: "NORMAL" | "URGENT" | "STAT";
  onPriorityChange: (val: "NORMAL" | "URGENT" | "STAT") => void;
  technicians: DentalTechnician[];
  selectedTechnicianId: string;
  onSelectedTechnicianIdChange: (val: string) => void;
  selectedTechnicianRole: DentalTechnicianRole;
  onSelectedTechnicianRoleChange: (val: DentalTechnicianRole) => void;
  notes: string;
  onNotesChange: (val: string) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  onDragOverChange: (val: boolean) => void;
  upProgress: Record<string, number>;
  upStatus: Record<string, "uploading" | "done" | "error">;
  upTotalPct: number;
  upDoneCount: number;
  selectedDoctor: DentalLabDoctor | null;
  primaryWorkType: DentalWorkType | null;
  selectedTeeth: string[];
  unitsCount: number;
  shade: string;
  customShade: string;
  priceSnapshot: number;
  discount: number;
}

export interface QuickOrderSuccessViewProps {
  createdCase: DentalLabCase;
  createdAttachmentsCount: number;
  printingPanLabel: boolean;
  onPrintPanLabel: () => void;
  onPrintWorkOrder: () => void;
  onClose: () => void;
}
