import React from "react";
import { useTranslation } from "react-i18next";
import {
  fmtMoney,
  ROLE_CONFIG,
  type DentalTechnician,
  type DentalWorkType,
} from "../../../../shared";

interface CaseCreatePatientWorkTypeSectionProps {
  patientName: string;
  setPatientName: (val: string) => void;
  patientPhone: string;
  setPatientPhone: (val: string) => void;
  workTypeId: string;
  onWorkTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  workTypes: DentalWorkType[];
  technicianId: string;
  setTechnicianId: (val: string) => void;
  technicians: DentalTechnician[];
  inputCls: string;
  labelCls: string;
}

export const CaseCreatePatientWorkTypeSection: React.FC<
  CaseCreatePatientWorkTypeSectionProps
> = ({
  patientName,
  setPatientName,
  patientPhone,
  setPatientPhone,
  workTypeId,
  onWorkTypeChange,
  workTypes,
  technicianId,
  setTechnicianId,
  technicians,
  inputCls,
  labelCls,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>
            {t("dentalLab.common.patientName")} *
          </label>
          <input
            className={inputCls}
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="اسم المريض"
            required
          />
        </div>
        <div>
          <label className={labelCls}>هاتف المريض</label>
          <input
            className={inputCls}
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            dir="ltr"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>نوع الشغل / التركيبة *</label>
          <select
            className={inputCls}
            value={workTypeId}
            onChange={onWorkTypeChange}
          >
            <option value="">— اختر نوع الشغل —</option>
            {workTypes
              .filter((w) => w.isActive)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (
                  {w.pricingMode === "FLAT"
                    ? `${fmtMoney(Number(w.price))} مقطوع`
                    : `${fmtMoney(Number(w.price))} / سن`}
                  )
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>الفني المبدئي (إسناد اختياري)</label>
          <select
            className={inputCls}
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
          >
            <option value="">— بدون إسناد حالياً —</option>
            {technicians
              .filter((t) => t.active)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({ROLE_CONFIG[t.role]?.label || t.role})
                </option>
              ))}
          </select>
        </div>
      </div>
    </>
  );
};

export default CaseCreatePatientWorkTypeSection;
