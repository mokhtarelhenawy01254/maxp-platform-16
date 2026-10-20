import { User, Users } from "lucide-react";
import { type DentalLabCase, ROLE_CONFIG } from "../../shared";

interface InspectorTechniciansListProps {
  caseData: DentalLabCase;
  onAssign: (c: DentalLabCase) => void;
}

export function InspectorTechniciansList({
  caseData,
  onAssign,
}: InspectorTechniciansListProps) {
  return (
    <div className="p-3 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-purple-500" />
          <span>الفنيون المسندون</span>
        </span>
        <button
          type="button"
          onClick={() => onAssign(caseData)}
          className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
        >
          + إضافة فني
        </button>
      </div>

      {caseData.assignments && caseData.assignments.length > 0 ? (
        <div className="space-y-1.5">
          {caseData.assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </span>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {a.technician?.name || a.technicianId}
                  </p>
                  <span className="text-[10px] text-slate-500">
                    {ROLE_CONFIG[a.role]?.label || a.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400 text-[11px]">
          لم يتم إسناد أي فني على هذه الحالة بعد
        </div>
      )}
    </div>
  );
}

export default InspectorTechniciansList;
