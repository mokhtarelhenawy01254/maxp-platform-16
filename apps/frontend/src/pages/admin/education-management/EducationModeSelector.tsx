import { Briefcase, School, Check } from "lucide-react";

export type EducationMode = "COURSES" | "ACADEMIC";

interface EducationModeSelectorProps {
  mode: EducationMode;
  isEn: boolean;
  disabled?: boolean;
  onChange: (mode: EducationMode) => void;
}

const MODE_OPTIONS: Array<{
  id: EducationMode;
  icon: typeof School;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
}> = [
  {
    id: "COURSES",
    icon: Briefcase,
    nameAr: "أكاديمية كورسات وباقات",
    nameEn: "Courses & Packages Academy",
    descAr: "إخفاء المواد الدراسية وإنشاء الباقات مباشرة",
    descEn: "Subjects hidden, packages created directly",
  },
  {
    id: "ACADEMIC",
    icon: School,
    nameAr: "سنتر دراسي ومواد تعليمية",
    nameEn: "Academic Center & Subjects",
    descAr: "تفعيل المواد الدراسية وربط الباقات بها",
    descEn: "Subjects enabled, packages bound to them",
  },
];

export function EducationModeSelector({ mode, isEn, disabled, onChange }: EducationModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5" role="radiogroup" aria-label={isEn ? "Operation mode" : "نمط التشغيل"}>
      {MODE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => !selected && onChange(opt.id)}
            className={`relative flex items-center gap-2.5 rounded-xl border p-3 text-start transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
              selected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <Icon className={`w-4.5 h-4.5 shrink-0 ${selected ? "text-primary" : "text-muted-foreground"}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-foreground truncate">
                {isEn ? opt.nameEn : opt.nameAr}
              </span>
              <span className="block text-[11px] text-muted-foreground truncate">
                {isEn ? opt.descEn : opt.descAr}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={`w-4.5 h-4.5 shrink-0 rounded-full border flex items-center justify-center ${
                selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
              }`}
            >
              {selected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default EducationModeSelector;
