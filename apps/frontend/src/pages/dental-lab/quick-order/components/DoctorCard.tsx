import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Stethoscope,
  Users2,
} from "lucide-react";
import { fmtMoney } from "../../shared";
import type { DoctorCardProps } from "../types/quickOrderTypes";

export function DoctorCard({ doctor, selected, onSelect }: DoctorCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full text-right rounded-xl border-2 p-3 transition text-start",
        selected
          ? "border-blue-500 bg-blue-50/70 dark:bg-blue-900/25 ring-1 ring-blue-400"
          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <Stethoscope className="w-4 h-4 text-blue-600" />
          {doctor.name}
        </div>
        {selected && <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />}
      </div>
      {doctor.clinicName && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
          <Building2 className="w-3.5 h-3.5 text-gray-400" />
          {doctor.clinicName}
        </div>
      )}
      {doctor.phone && (
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono" dir="ltr">
          {doctor.phone}
        </div>
      )}
      {Array.isArray(doctor.doctors) && doctor.doctors.length > 0 && (
        <div className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-1 font-medium font-mono tabular-nums">
          <Users2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>يضم {doctor.doctors.length} أطباء بالعيادة</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-[11px]">
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1.5 text-center">
          <div className="text-gray-400">الرصيد المعلق</div>
          <div
            className={`font-bold font-mono tabular-nums ${
              Number(doctor.outstanding) > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-600"
            }`}
            dir="ltr"
          >
            {fmtMoney(doctor.outstanding)}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1.5 text-center">
          <div className="text-gray-400">حالات نشطة</div>
          <div className="font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums" dir="ltr">
            {doctor.activeCases ?? 0}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/40 rounded p-1.5 text-center">
          <div className="text-gray-400">حد الائتمان</div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums" dir="ltr">
            {doctor.creditLimit ? fmtMoney(doctor.creditLimit) : "—"}
          </div>
        </div>
      </div>
      {doctor.creditExceeded && (
        <div className="text-[11px] text-red-600 dark:text-red-400 font-semibold mt-1.5 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>تنبيه: الطبيب تجاوز حد الائتمان المسموح</span>
        </div>
      )}
    </button>
  );
}

export default DoctorCard;
