import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { WORK_TYPE_CATEGORIES, MODAL_INPUT_CLS } from "../../shared";
import { sectionCardCls, CATEGORY_LABEL } from "../types/settingsTypes";

interface StagesSettingsSectionProps {
  stageTemplates: Record<string, string[]>;
  updateStage: (cat: string, index: number, value: string) => void;
  addStage: (cat: string) => void;
  removeStage: (cat: string, index: number) => void;
}

export function StagesSettingsSection({
  stageTemplates,
  updateStage,
  addStage,
  removeStage,
}: StagesSettingsSectionProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className={`${sectionCardCls} space-y-4`}>
      <div>
        <h3 className="font-semibold">
          {t("dentalLab.settings.stageTemplates")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dentalLab.settings.stageTemplatesHint")}
        </p>
      </div>
      <div className="space-y-4">
        {WORK_TYPE_CATEGORIES.map((cat) => {
          const stages = stageTemplates[cat] ?? [];
          return (
            <div key={cat} className="border dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {CATEGORY_LABEL(t, cat)}
              </p>
              {stages.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  {t("dentalLab.common.noData")}
                </p>
              )}
              <div className="space-y-2">
                {stages.map((stage, i) => (
                  <div key={`${cat}-${i}`} className="flex items-center gap-2">
                    <input
                      className={inputCls}
                      value={stage}
                      onChange={(e) => updateStage(cat, i, e.target.value)}
                      placeholder={`${t("dentalLab.settings.stageName")} ${
                        i + 1
                      }`}
                    />
                    <button
                      onClick={() => removeStage(cat, i)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg"
                      title={t("dentalLab.settings.removeStage")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addStage(cat)}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Plus className="w-3.5 h-3.5" />
                {t("dentalLab.settings.addStage")}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StagesSettingsSection;
