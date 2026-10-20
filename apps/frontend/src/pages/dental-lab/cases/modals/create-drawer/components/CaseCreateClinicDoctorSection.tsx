import React from "react";
import type { DentalLabDoctor } from "../../../../shared";

interface CaseCreateClinicDoctorSectionProps {
  doctorId: string;
  setDoctorId: (id: string) => void;
  doctorName: string;
  setDoctorName: (name: string) => void;
  doctors: DentalLabDoctor[];
  inputCls: string;
  labelCls: string;
}

export const CaseCreateClinicDoctorSection: React.FC<
  CaseCreateClinicDoctorSectionProps
> = ({
  doctorId,
  setDoctorId,
  doctorName,
  setDoctorName,
  doctors,
  inputCls,
  labelCls,
}) => {
  const selectedClinic = doctors.find((d) => d.id === doctorId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>العيادة / المركز الطبي *</label>
        <select
          className={inputCls}
          value={doctorId}
          onChange={(e) => {
            const newDocId = e.target.value;
            setDoctorId(newDocId);
            const found = doctors.find((d) => d.id === newDocId);
            if (found) {
              setDoctorName(found.doctors?.[0]?.name || found.name);
            } else {
              setDoctorName("");
            }
          }}
        >
          <option value="">— اختر العيادة / الحساب —</option>
          {doctors
            .filter((d) => d.isActive)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.clinicName ? `${d.clinicName} (${d.name})` : d.name}
              </option>
            ))}
        </select>
      </div>

      {selectedClinic?.doctors && selectedClinic.doctors.length > 0 ? (
        <div>
          <label className={labelCls}>الطبيب المعالج داخل العيادة</label>
          <select
            className={inputCls}
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          >
            <option value={selectedClinic.name}>
              {selectedClinic.name} (الطبيب الرئيسي)
            </option>
            {selectedClinic.doctors.map((doc) => (
              <option key={doc.id} value={doc.name}>
                {doc.name} {doc.specialty ? `(${doc.specialty})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className={labelCls}>اسم الطبيب المعالج</label>
          <input
            className={inputCls}
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            placeholder="د. اسم الطبيب"
          />
        </div>
      )}
    </div>
  );
};

export default CaseCreateClinicDoctorSection;
