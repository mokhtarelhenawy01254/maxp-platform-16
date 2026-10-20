import { useTranslation } from "react-i18next";
import { MODAL_INPUT_CLS } from "../../shared";
import { sectionCardCls, labelCls } from "../types/settingsTypes";

interface WhatsappSettingsSectionProps {
  readyTemplate: string;
  setReadyTemplate: (val: string) => void;
  receivedTemplate: string;
  setReceivedTemplate: (val: string) => void;
  overdueTemplate: string;
  setOverdueTemplate: (val: string) => void;
}

export function WhatsappSettingsSection({
  readyTemplate,
  setReadyTemplate,
  receivedTemplate,
  setReceivedTemplate,
  overdueTemplate,
  setOverdueTemplate,
}: WhatsappSettingsSectionProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className={`${sectionCardCls} space-y-4`}>
      <div>
        <h3 className="font-semibold">
          {t("dentalLab.settings.whatsappTemplates")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dentalLab.settings.whatsappHint")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className={labelCls}>
            {t("dentalLab.settings.readyTemplate")}
          </label>
          <textarea
            className={`${inputCls} min-h-[70px] resize-y`}
            value={readyTemplate}
            onChange={(e) => setReadyTemplate(e.target.value)}
            placeholder={t("dentalLab.settings.readyPlaceholder")}
          />
        </div>
        <div>
          <label className={labelCls}>
            {t("dentalLab.settings.receivedTemplate")}
          </label>
          <textarea
            className={`${inputCls} min-h-[70px] resize-y`}
            value={receivedTemplate}
            onChange={(e) => setReceivedTemplate(e.target.value)}
            placeholder={t("dentalLab.settings.receivedPlaceholder")}
          />
        </div>
        <div>
          <label className={labelCls}>
            {t("dentalLab.settings.overdueTemplate")}
          </label>
          <textarea
            className={`${inputCls} min-h-[70px] resize-y`}
            value={overdueTemplate}
            onChange={(e) => setOverdueTemplate(e.target.value)}
            placeholder={t("dentalLab.settings.overduePlaceholder")}
          />
        </div>
      </div>
    </div>
  );
}

export default WhatsappSettingsSection;
