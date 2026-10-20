import { useTranslation } from "react-i18next";
import { BellRing } from "lucide-react";
import { MODAL_INPUT_CLS } from "../../shared";
import { sectionCardCls, labelCls } from "../types/settingsTypes";
import { ToggleRow } from "../components/ToggleRow";

interface DunningSettingsSectionProps {
  dunningAgingDays: number;
  setDunningAgingDays: (val: number) => void;
  dunningEnabled: boolean;
  setDunningEnabled: (val: boolean) => void;
}

export function DunningSettingsSection({
  dunningAgingDays,
  setDunningAgingDays,
  dunningEnabled,
  setDunningEnabled,
}: DunningSettingsSectionProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm font-mono tabular-nums`;

  return (
    <div className={`${sectionCardCls} space-y-4`}>
      <div className="flex items-center gap-2">
        <BellRing className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <div>
          <h3 className="font-semibold">{t("dentalLab.settings.dunning.title")}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dentalLab.settings.dunning.hint")}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            {t("dentalLab.settings.dunning.agingDays")}
          </label>
          <input
            className={inputCls}
            type="number"
            min={1}
            value={dunningAgingDays}
            onChange={(e) => setDunningAgingDays(Number(e.target.value))}
            dir="ltr"
          />
        </div>
      </div>
      <ToggleRow
        label={t("dentalLab.settings.dunning.enabled")}
        hint={t("dentalLab.settings.dunning.enabled_hint")}
        checked={dunningEnabled}
        onChange={setDunningEnabled}
      />
    </div>
  );
}

export default DunningSettingsSection;
