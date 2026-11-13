import { toast } from "sonner";
import { ChevronUp, ChevronDown, RotateCcw, Lock, GraduationCap } from "lucide-react";
import { Switch } from "../../../components/ui/switch";
import { SECTION_ICON_MAP } from "./educationSettingsPresets";
import type { EducationTabConfig } from "./types";

interface EducationSectionRowProps {
  tab: EducationTabConfig;
  index: number;
  total: number;
  isEn: boolean;
  onMove: (index: number, direction: "up" | "down") => void;
  onToggleVisibility: (index: number) => void;
  onLabel: (index: number, lang: "ar" | "en", value: string) => void;
  onReset: (index: number) => void;
}

export function EducationSectionRow({
  tab,
  index,
  total,
  isEn,
  onMove,
  onToggleVisibility,
  onLabel,
  onReset,
}: EducationSectionRowProps) {
  const Icon = SECTION_ICON_MAP[tab.iconName] || GraduationCap;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const isCustomized = tab.labelAr !== tab.defaultLabelAr || tab.labelEn !== tab.defaultLabelEn;
  const currentLabel = isEn
    ? tab.labelEn || tab.defaultLabelEn || tab.labelAr
    : tab.labelAr || tab.defaultLabelAr;

  const handleVisibility = () => {
    if (tab.locked) {
      toast.info(
        isEn
          ? "This tab is required to ensure settings access"
          : "هذا التاب أساسي لا يمكن إخفاؤه لضمان الوصول للإعدادات",
      );
      return;
    }
    onToggleVisibility(index);
  };

  return (
    <div
      className={`flex flex-col xl:flex-row xl:items-center gap-2 xl:gap-3 py-2.5 ${
        tab.visible ? "" : "opacity-55"
      }`}
    >
      {/* Order + Reorder */}
      <div className="flex items-center gap-1 shrink-0">
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMove(index, "up")}
            disabled={isFirst}
            aria-label={isEn ? "Move up" : "تحريك لأعلى"}
            title={isEn ? "Move up" : "تحريك لأعلى"}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, "down")}
            disabled={isLast}
            aria-label={isEn ? "Move down" : "تحريك لأسفل"}
            title={isEn ? "Move down" : "تحريك لأسفل"}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
        <span className="w-6 text-center text-[10px] text-muted-foreground tabular-nums">
          #{index + 1}
        </span>
        <Icon
          className={`w-4 h-4 shrink-0 ${tab.visible ? "text-primary/70" : "text-muted-foreground/50"}`}
          aria-hidden="true"
        />
      </div>

      {/* Current label */}
      <div className="flex items-center gap-1.5 min-w-0 xl:w-40 shrink-0">
        <span className="text-xs font-semibold text-foreground truncate" title={currentLabel}>
          {currentLabel}
        </span>
        {tab.locked && (
          <Lock
            className="w-3 h-3 text-muted-foreground shrink-0"
            aria-label={isEn ? "Locked tab" : "تاب أساسي"}
          />
        )}
      </div>

      {/* AR / EN label editors */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <input
          type="text"
          value={tab.labelAr}
          onChange={(e) => onLabel(index, "ar", e.target.value)}
          placeholder={tab.defaultLabelAr}
          title={`${isEn ? "Default" : "الأصل"}: ${tab.defaultLabelAr}`}
          maxLength={60}
          aria-label={`${currentLabel} — ${isEn ? "Arabic label" : "الاسم بالعربية"}`}
          className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <input
          type="text"
          value={tab.labelEn}
          onChange={(e) => onLabel(index, "en", e.target.value)}
          placeholder={tab.defaultLabelEn}
          title={`${isEn ? "Default" : "الأصل"}: ${tab.defaultLabelEn}`}
          maxLength={60}
          dir="ltr"
          aria-label={`${currentLabel} — ${isEn ? "English label" : "الاسم بالإنجليزية"}`}
          className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Reset + Visibility */}
      <div className="flex items-center justify-end gap-1.5 shrink-0">
        {isCustomized && (
          <button
            type="button"
            onClick={() => onReset(index)}
            aria-label={isEn ? "Reset to default" : "استعادة الاسم الأصلي"}
            title={isEn ? "Reset to default" : "استعادة الاسم الأصلي"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        <Switch
          size="sm"
          checked={tab.visible}
          onCheckedChange={() => handleVisibility()}
          aria-label={
            tab.visible
              ? isEn
                ? `Hide ${currentLabel}`
                : `إخفاء ${currentLabel}`
              : isEn
                ? `Show ${currentLabel}`
                : `إظهار ${currentLabel}`
          }
        />
      </div>
    </div>
  );
}

// Fallback when iconName has no mapping → GraduationCap (imported above)

export default EducationSectionRow;
