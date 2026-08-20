import { useTranslation } from "react-i18next";
import { RadiologyStage, RADIOLOGY_STAGE_META } from "./shared";

/** Badge يعرض اسم المرحلة الأساسية للحالة بلونها (Stage stepper) */
export function StageBadge({ stage, className = "" }: { stage: RadiologyStage; className?: string }) {
  const { t } = useTranslation();
  const meta = RADIOLOGY_STAGE_META[stage] || RADIOLOGY_STAGE_META.RECEPTION;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${meta.color} ${className}`}>
      {t(meta.label)}
    </span>
  );
}

export default StageBadge;
