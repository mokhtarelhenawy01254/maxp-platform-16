import { UserCheck } from "lucide-react";
import {
  MODAL_INPUT_CLS,
  ROLE_CONFIG,
  type DentalTechnician,
  type DentalTechnicianRole,
} from "../../../../shared";

interface QuickOrderTechnicianAssignCardProps {
  technicians: DentalTechnician[];
  selectedTechnicianId: string;
  onSelectedTechnicianIdChange: (v: string) => void;
  selectedTechnicianRole: DentalTechnicianRole;
  onSelectedTechnicianRoleChange: (v: DentalTechnicianRole) => void;
}

export function QuickOrderTechnicianAssignCard({
  technicians,
  selectedTechnicianId,
  onSelectedTechnicianIdChange,
  selectedTechnicianRole,
  onSelectedTechnicianRoleChange,
}: QuickOrderTechnicianAssignCardProps) {
  const inputCls = `${MODAL_INPUT_CLS} text-sm`;
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900 dark:text-blue-200">
          <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>إسناد أمر الشغل لفني المعمل (اختياري)</span>
        </div>
        <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
          يظهر فوراً في بوابة الفني
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="technician-select" className={labelCls}>الفني المسؤول</label>
          <select
            id="technician-select"
            className={inputCls}
            value={selectedTechnicianId}
            onChange={(e) => {
              const id = e.target.value;
              onSelectedTechnicianIdChange(id);
              const tech = technicians.find((t) => t.id === id);
              if (tech?.role) onSelectedTechnicianRoleChange(tech.role);
            }}
          >
            <option value="">-- بدون إسناد (سيتم التعيين لاحقاً) --</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{" "}
                {t.role && ROLE_CONFIG[t.role]?.label
                  ? `(${ROLE_CONFIG[t.role].label})`
                  : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="technician-role-select" className={labelCls}>دور الفني في هذه الحالة</label>
          <select
            id="technician-role-select"
            className={inputCls}
            disabled={!selectedTechnicianId}
            value={selectedTechnicianRole}
            onChange={(e) =>
              onSelectedTechnicianRoleChange(
                e.target.value as DentalTechnicianRole
              )
            }
          >
            <option value="CAD_DESIGNER">تصميم كاد (CAD Designer)</option>
            <option value="CAM_OPERATOR">تفريز وكام (CAM Operator)</option>
            <option value="CERAMIST">خزف وسيراميك (Ceramist)</option>
            <option value="ORTHODONTIC">تقويم (Orthodontic)</option>
            <option value="CASTING_WAX">صب وشمع (Wax & Casting)</option>
            <option value="MODEL_MAKER">صب قوالب (Model Maker)</option>
            <option value="FINISHING_POLISHING">فينشنج وتلميع (Finishing & Polish)</option>
            <option value="QC_INSPECTOR">مراقبة جودة (QC Inspector)</option>
            <option value="GENERAL_TECHNICIAN">فني أسنان عام (General)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
