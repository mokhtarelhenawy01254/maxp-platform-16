import React from "react";
import { User } from "lucide-react";
import type { DentalLabDoctor } from "../../../../shared";
import { MODAL_INPUT_CLS } from "../../../../shared";

export interface DentalCaseEditDoctorPatientSectionProps {
  doctorId: string;
  setDoctorId: (id: string) => void;
  patientName: string;
  setPatientName: (name: string) => void;
  patientPhone: string;
  setPatientPhone: (phone: string) => void;
  doctors: DentalLabDoctor[];
}

const labelCls = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1";
const sectionTitleCls =
  "text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-700 pb-2 mb-3";

export const DentalCaseEditDoctorPatientSection: React.FC<DentalCaseEditDoctorPatientSectionProps> = ({
  doctorId,
  setDoctorId,
  patientName,
  setPatientName,
  patientPhone,
  setPatientPhone,
  doctors,
}) => {
  return (
    <div className="bg-gray-50/70 dark:bg-gray-800/40 p-4 rounded-xl border dark:border-gray-700/60">
      <h4 className={sectionTitleCls}>
        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span>بيانات الطبيب والمريض</span>
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label htmlFor="edit-case-doctor-select" className={labelCls}>
            الطبيب المعالج *
          </label>
          <select
            id="edit-case-doctor-select"
            className={MODAL_INPUT_CLS}
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
            <option value="">— اختر الطبيب —</option>
            {doctors
              .filter((d) => d.isActive)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.clinicName ? `(${d.clinicName})` : ""}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-case-patient-name" className={labelCls}>
            اسم المريض *
          </label>
          <input
            id="edit-case-patient-name"
            className={MODAL_INPUT_CLS}
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="اسم المريض"
          />
        </div>
        <div>
          <label htmlFor="edit-case-patient-phone" className={labelCls}>
            هاتف المريض
          </label>
          <input
            id="edit-case-patient-phone"
            className={MODAL_INPUT_CLS}
            value={patientPhone}
            onChange={(e) => setPatientPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            dir="ltr"
          />
        </div>
      </div>
    </div>
  );
};
