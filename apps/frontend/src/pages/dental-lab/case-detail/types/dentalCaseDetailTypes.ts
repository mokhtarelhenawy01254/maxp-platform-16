import type { ReactNode } from "react";
import type {
  DentalLabCaseDetail,
  DentalTechnician,
  DentalLabDoctor,
  DentalWorkType,
  DentalCaseStage,
  DentalInvoice,
  DentalMaterial,
  RefabricationStage,
} from "../../shared";

export type UploadItem = {
  id: string;
  file: File;
  kind: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number; // 0..100
  error?: string;
  attachmentId?: string;
};

export const FALLBACK_BADGE = {
  label: "",
  color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

export const REFAB_STAGES: { id: RefabricationStage; labelKey: string }[] = [
  { id: "DESIGN", labelKey: "dentalLab.status.DESIGN" },
  { id: "MANUFACTURING", labelKey: "dentalLab.status.MANUFACTURING" },
  { id: "QC", labelKey: "dentalLab.status.QC" },
  { id: "RECEIVED", labelKey: "dentalLab.status.RECEIVED" },
];

export const REMAKE_ROOT_CAUSES = [
  { id: "DOCTOR_IMPRESSION", label: "مقاس / طبعة الطبيب غير دقيقة (Doctor Impression)" },
  { id: "DOCTOR_PREPARATION", label: "تحضير وبرد السن غير كافٍ (Doctor Preparation)" },
  { id: "LAB_CAD_DESIGN", label: "خطأ تصميم CAD بالمعمل (Lab CAD Design)" },
  { id: "LAB_FIT_MARGIN", label: "عدم مطابقة الحواف بالمعمل (Lab Fit & Margins)" },
  { id: "LAB_SHADE_COLOR", label: "اختلاف اللون والجماليات (Lab Shade/Color)" },
  { id: "MATERIAL_FAILURE", label: "كسر أو عيب في المادة الخام (Material Defect)" },
  { id: "PATIENT_CHANGE", label: "تغيير رغبة المريض (Patient Request)" },
  { id: "OTHER", label: "سبب آخر (Other)" },
];

export const TRYIN_STAGES = [
  { id: "WAX_TRY_IN", label: "بروفة شمع (Wax Try-in)" },
  { id: "METAL_TRY_IN", label: "بروفة شاسيه معدن (Metal Try-in)" },
  { id: "BISQUE_TRY_IN", label: "بروفة بسكويت/خزف (Bisque Try-in)" },
  { id: "FRAME_TRY_IN", label: "بروفة فريم زيركون (Zirconia Frame Try-in)" },
  { id: "CUSTOM_TRY_IN", label: "بروفة مخصصة (Custom Try-in)" },
];

export const STAGE_ASSIGNEE_ROLES: {
  id: string;
  label: string;
  shortLabel: string;
  badgeCls: string;
}[] = [
  {
    id: "PRIMARY",
    label: "فني رئيسي (Primary)",
    shortLabel: "رئيسي",
    badgeCls:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  {
    id: "ASSISTANT",
    label: "مساعد (Assistant)",
    shortLabel: "مساعد",
    badgeCls:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  {
    id: "QC",
    label: "مراجعة وفحص جودة (QC)",
    shortLabel: "فحص جودة",
    badgeCls:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  {
    id: "FINISHER",
    label: "تشطيب وتلميع (Finisher)",
    shortLabel: "تشطيب",
    badgeCls:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  {
    id: "OTHER",
    label: "دور آخر (Other)",
    shortLabel: "آخر",
    badgeCls:
      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  },
];

export interface AdvanceModalProps {
  caseData: DentalLabCaseDetail;
  next: string;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export interface AssignStageModalProps {
  caseId: string;
  stage: DentalCaseStage;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export interface EditCaseModalProps {
  caseData: DentalLabCaseDetail;
  doctors: DentalLabDoctor[];
  workTypes: DentalWorkType[];
  onClose: () => void;
  onSaved: () => void;
}

export interface PaymentModalProps {
  invoice: DentalInvoice;
  onClose: () => void;
  onSaved: () => void;
}

export interface QualityCheckModalProps {
  caseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface RefabricationModalProps {
  caseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface SendToTryInModalProps {
  caseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface ReturnFromTryInModalProps {
  caseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface OutsourceModalProps {
  caseId: string;
  onClose: () => void;
  onSaved: () => void;
}

export interface MaterialConsumeModalProps {
  isOpen: boolean;
  materialBusy: boolean;
  materialsList: DentalMaterial[];
  selectedMatId: string;
  selectedStockId: string;
  consumeUnits: number;
  consumeNotes: string;
  setSelectedMatId: (id: string) => void;
  setSelectedStockId: (id: string) => void;
  setConsumeUnits: (units: number) => void;
  setConsumeNotes: (notes: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

export interface DentalCaseCardProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}
