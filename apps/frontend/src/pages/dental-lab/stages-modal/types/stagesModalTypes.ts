import {
  type DentalWorkType,
  type WorkTypeStageTemplateItem,
} from "../../shared";

export interface DentalWorkTypeStagesModalProps {
  workType: DentalWorkType;
  onClose: () => void;
  onSaved?: () => void;
}

export const CANONICAL_PRESETS: WorkTypeStageTemplateItem[] = [
  {
    name: "الاستلام",
    requiredRole: "RECEPTION_LOGISTICS",
    slaHours: 12,
    stageWage: 0,
    isRequired: true,
    sortOrder: 0,
  },
  {
    name: "التصميم",
    requiredRole: "CAD_DESIGNER",
    slaHours: 24,
    stageWage: 0,
    isRequired: true,
    sortOrder: 1,
  },
  {
    name: "التصنيع",
    requiredRole: "CERAMIST",
    slaHours: 48,
    stageWage: 0,
    isRequired: true,
    sortOrder: 2,
  },
  {
    name: "مراجعة الجودة",
    requiredRole: "QC_INSPECTOR",
    slaHours: 12,
    stageWage: 0,
    isRequired: true,
    sortOrder: 3,
  },
  {
    name: "التسليم",
    requiredRole: "RECEPTION_LOGISTICS",
    slaHours: 12,
    stageWage: 0,
    isRequired: true,
    sortOrder: 4,
  },
];

export const ROLE_OPTIONS = [
  { value: "CAD_DESIGNER", label: "مصمم CAD/CAM (تصميم)" },
  { value: "CERAMIST", label: "فني سيراميك وبورسلين (تصنيع)" },
  { value: "MODEL_WAX", label: "فني كاستات وشمع (Model & Wax)" },
  { value: "METAL_CASTING", label: "فني صب معادن وسباكة (Casting)" },
  { value: "FINISHING_POLISHING", label: "فني فينشنج وتلميع (Finishing)" },
  { value: "QC_INSPECTOR", label: "أخصائي مراقبة جودة (QC)" },
  { value: "RECEPTION_LOGISTICS", label: "استقبال ولوجستيات (تسليم/استلام)" },
  { value: "SUPERVISOR", label: "مشرف الإنتاج (Master Tech)" },
  { value: "GENERAL_TECHNICIAN", label: "فني أسنان عام (General)" },
];
