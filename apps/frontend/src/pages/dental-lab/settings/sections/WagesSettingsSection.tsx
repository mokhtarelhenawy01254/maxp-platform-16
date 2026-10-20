import { useTranslation } from "react-i18next";
import { Coins } from "lucide-react";
import { MODAL_INPUT_CLS } from "../../shared";
import { sectionCardCls, labelCls } from "../types/settingsTypes";

interface WagesSettingsSectionProps {
  wageDefault: number;
  setWageDefault: (val: number) => void;
}

export function WagesSettingsSection({
  wageDefault,
  setWageDefault,
}: WagesSettingsSectionProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm font-mono tabular-nums`;

  return (
    <div className={`${sectionCardCls} space-y-4`}>
      <div className="flex items-center gap-2">
        <Coins className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <div>
          <h3 className="font-semibold">{t("dentalLab.settings.wages.title")}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dentalLab.settings.wages.hint")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            {t("dentalLab.settings.wages.defaultPerStage")}
          </label>
          <input
            className={inputCls}
            type="number"
            min={0}
            step="0.01"
            value={wageDefault}
            onChange={(e) => setWageDefault(Number(e.target.value))}
            dir="ltr"
          />
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t("dentalLab.settings.wages.note")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default WagesSettingsSection;
