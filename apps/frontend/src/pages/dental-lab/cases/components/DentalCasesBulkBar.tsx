import {
  ArrowRightCircle,
  ArrowRightLeft,
  Loader2,
  RotateCcw,
  Trash2,
  UserPlus,
} from "lucide-react";
import type {
  DentalCasePriority,
  DentalLabDoctor,
  DentalTechnician,
} from "../../shared";
import { CASE_STATUSES, ROLE_CONFIG } from "../../shared";

export interface DentalCasesBulkBarProps {
  selectedCaseIds: Set<string>;
  onClearSelection: () => void;
  viewMode: "ACTIVE" | "OVERDUE" | "TRASH";
  bulkStatusTarget: string;
  onBulkStatusTargetChange: (val: string) => void;
  bulkTechTarget: string;
  onBulkTechTargetChange: (val: string) => void;
  bulkPriorityTarget: DentalCasePriority | "";
  onBulkPriorityTargetChange: (val: DentalCasePriority | "") => void;
  bulkDoctorTarget: string;
  onBulkDoctorTargetChange: (val: string) => void;
  bulkBusy: boolean;
  technicians: DentalTechnician[];
  doctors: DentalLabDoctor[];
  onBulkAdvance: () => void;
  onBulkAssign: () => void;
  onBulkPriority: () => void;
  onBulkTransferDoctor: () => void;
  onBulkTrash: () => void;
  onBulkRestore: () => void;
}

export function DentalCasesBulkBar({
  selectedCaseIds,
  onClearSelection,
  viewMode,
  bulkStatusTarget,
  onBulkStatusTargetChange,
  bulkTechTarget,
  onBulkTechTargetChange,
  bulkPriorityTarget,
  onBulkPriorityTargetChange,
  bulkDoctorTarget,
  onBulkDoctorTargetChange,
  bulkBusy,
  technicians,
  doctors,
  onBulkAdvance,
  onBulkAssign,
  onBulkPriority,
  onBulkTransferDoctor,
  onBulkTrash,
  onBulkRestore,
}: DentalCasesBulkBarProps) {
  if (selectedCaseIds.size === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl border border-gray-700/80 flex items-center gap-3 flex-wrap max-w-[95vw] animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 pr-2 border-l border-gray-700">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
        <span className="text-xs font-bold whitespace-nowrap font-mono">
          تم تحديد {selectedCaseIds.size} حالة
        </span>
        <button
          onClick={onClearSelection}
          className="text-[11px] text-gray-400 hover:text-white underline mr-1"
        >
          إلغاء
        </button>
      </div>

      {viewMode !== "TRASH" ? (
        <>
          {/* Bulk Advance Status */}
          <div className="flex items-center gap-1.5">
            <select
              className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={bulkStatusTarget}
              onChange={(e) => onBulkStatusTargetChange(e.target.value)}
              disabled={bulkBusy}
            >
              <option value="">ترقية المرحلة إلى...</option>
              {CASE_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onBulkAdvance}
              disabled={bulkBusy || !bulkStatusTarget}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
            >
              {bulkBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRightCircle className="w-3.5 h-3.5" />
              )}
              تطبيق
            </button>
          </div>

          {/* Bulk Assign Technician */}
          <div className="flex items-center gap-1.5">
            <select
              className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              value={bulkTechTarget}
              onChange={(e) => onBulkTechTargetChange(e.target.value)}
              disabled={bulkBusy}
            >
              <option value="">إسناد للفني...</option>
              {technicians
                .filter((t) => t.isActive)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (
                    {String(ROLE_CONFIG[t.role]?.label || t.role || "").replace(
                      /\s*\/\s*(Master|QC)\s*$/i,
                      ""
                    )}
                    )
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={onBulkAssign}
              disabled={bulkBusy || !bulkTechTarget}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
            >
              {bulkBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              إسناد
            </button>
          </div>

          {/* Bulk Priority */}
          <div className="flex items-center gap-1.5">
            <select
              className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              value={bulkPriorityTarget}
              onChange={(e) =>
                onBulkPriorityTargetChange(e.target.value as DentalCasePriority)
              }
              disabled={bulkBusy}
            >
              <option value="">الأولوية...</option>
              <option value="NORMAL">عادي</option>
              <option value="URGENT">مستعجل</option>
              <option value="STAT">طارئ فوري</option>
            </select>
            <button
              type="button"
              onClick={onBulkPriority}
              disabled={bulkBusy || !bulkPriorityTarget}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
            >
              تحديث
            </button>
          </div>

          {/* Bulk Transfer to Doctor / Clinic */}
          <div className="flex items-center gap-1.5">
            <select
              className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[170px]"
              value={bulkDoctorTarget}
              onChange={(e) => onBulkDoctorTargetChange(e.target.value)}
              disabled={bulkBusy}
            >
              <option value="">نقل لطبيب / عيادة...</option>
              {doctors
                .filter((d) => d.isActive)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.clinicName ? `${d.clinicName} • ${d.name}` : d.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={onBulkTransferDoctor}
              disabled={bulkBusy || !bulkDoctorTarget}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
              title="نقل الحالات المحددة لعيادة أو دكتور آخر مع تحديث فواتيرها"
            >
              {bulkBusy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-3.5 h-3.5" />
              )}
              نقل للعيادة
            </button>
          </div>

          {/* Bulk Trash */}
          <button
            type="button"
            onClick={onBulkTrash}
            disabled={bulkBusy}
            className="px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 mr-auto shadow-sm transition font-mono"
            title="نقل الحالات المحددة إلى المهملات"
          >
            <Trash2 className="w-3.5 h-3.5" />
            حذف ({selectedCaseIds.size})
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onBulkRestore}
          disabled={bulkBusy}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1 shadow-sm transition font-mono"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          استعادة الحالات المحددة ({selectedCaseIds.size})
        </button>
      )}
    </div>
  );
}

export default DentalCasesBulkBar;
