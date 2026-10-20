import React from "react";
import { fmtDate, type DentalLabDoctor } from "../../../../shared";

interface StatementPrintableHeaderProps {
  doctor: DentalLabDoctor;
  from: string;
  to: string;
}

export const StatementPrintableHeader: React.FC<StatementPrintableHeaderProps> = ({
  doctor,
  from,
  to,
}) => {
  return (
    <div className="hidden print:block pb-4 mb-4 border-b-2 border-slate-900">
      <div className="flex justify-between items-start">
        <div className="text-right">
          <h1 className="text-xl font-bold text-slate-900">
            كشف حساب العميل — معمل الأسنان
          </h1>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            العميل / الطبيب: {doctor.name}{" "}
            {doctor.clinicName ? `(${doctor.clinicName})` : ""}
          </p>
          {doctor.phone && (
            <p className="text-xs text-slate-600">هاتف: {doctor.phone}</p>
          )}
        </div>
        <div className="text-left text-xs text-slate-600 space-y-1 font-mono tabular-nums">
          <p className="font-semibold text-slate-800">
            تاريخ الاستخراج: {new Date().toLocaleDateString("ar-EG")}
          </p>
          {from && <p>الفترة من: {fmtDate(from)}</p>}
          {to && <p>إلى: {fmtDate(to)}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatementPrintableHeader;
