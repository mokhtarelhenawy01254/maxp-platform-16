import React from "react";
import { useTranslation } from "react-i18next";
import type { DoctorForm } from "../../types/doctorsTypes";

export interface DoctorEditGeneralFieldsProps {
  modal: DoctorForm;
  onChange: (fields: Partial<DoctorForm>) => void;
  inputCls: string;
  labelCls: string;
}

export const DoctorEditGeneralFields: React.FC<DoctorEditGeneralFieldsProps> = ({
  modal,
  onChange,
  inputCls,
  labelCls,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label className={labelCls}>{t("dentalLab.common.name")} *</label>
        <input
          className={inputCls}
          value={modal.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>{t("dentalLab.common.phone")}</label>
        <input
          className={`${inputCls} font-mono`}
          value={modal.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          dir="ltr"
        />
      </div>
      <div>
        <label className={labelCls}>{t("dentalLab.doctors.clinicName")}</label>
        <input
          className={inputCls}
          value={modal.clinicName}
          onChange={(e) => onChange({ clinicName: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>
          {t("dentalLab.doctors.governorate")}
        </label>
        <input
          className={inputCls}
          value={modal.governorate}
          onChange={(e) => onChange({ governorate: e.target.value })}
        />
      </div>
      <div>
        <label className={labelCls}>{t("dentalLab.doctors.portalPin")}</label>
        <input
          className={`${inputCls} font-mono`}
          value={modal.portalPin}
          onChange={(e) => onChange({ portalPin: e.target.value })}
          dir="ltr"
        />
      </div>
      <div>
        <label className={labelCls}>
          {t("dentalLab.doctors.creditLimit")}
        </label>
        <input
          className={`${inputCls} font-mono tabular-nums`}
          type="number"
          value={modal.creditLimit}
          onChange={(e) => onChange({ creditLimit: Number(e.target.value) })}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>{t("dentalLab.common.notes")}</label>
        <textarea
          className={`${inputCls} min-h-[70px] resize-y`}
          value={modal.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </>
  );
};

export default DoctorEditGeneralFields;
