import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { MODAL_INPUT_CLS } from "../../shared";
import { sectionCardCls, labelCls } from "../types/settingsTypes";

interface GeneralSettingsSectionProps {
  labName: string;
  setLabName: (val: string) => void;
  address: string;
  setAddress: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
}

export function GeneralSettingsSection({
  labName,
  setLabName,
  address,
  setAddress,
  phone,
  setPhone,
}: GeneralSettingsSectionProps) {
  const { t } = useTranslation();
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div className={`${sectionCardCls} space-y-4`}>
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <h3 className="font-semibold">
          {t("dentalLab.settings.workOrderHeader")}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>{t("dentalLab.settings.labName")}</label>
          <input
            className={inputCls}
            value={labName}
            onChange={(e) => setLabName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>{t("dentalLab.settings.address")}</label>
          <input
            className={inputCls}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>{t("dentalLab.settings.phone")}</label>
          <input
            className={`${inputCls} font-mono`}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
}

export default GeneralSettingsSection;
