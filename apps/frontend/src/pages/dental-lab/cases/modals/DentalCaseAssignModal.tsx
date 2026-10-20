import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Trash2, User, UserPlus, X as XMarkIcon } from "lucide-react";
import type {
  DentalLabCase,
  DentalTechnician,
  DentalTechnicianRole,
} from "../../shared";
import {
  assignCase,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  removeCaseAssignment,
  ROLE_CONFIG,
} from "../../shared";

export interface DentalCaseAssignModalProps {
  caseData: DentalLabCase;
  technicians: DentalTechnician[];
  onClose: () => void;
  onSaved: () => void;
}

export function DentalCaseAssignModal({
  caseData,
  technicians,
  onClose,
  onSaved,
}: DentalCaseAssignModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [role, setRole] = useState("TECHNICIAN");
  const [currentAssignments, setCurrentAssignments] = useState(caseData.assignments || []);
  const active = technicians.filter((x) => x.isActive);

  const handleAdd = async () => {
    if (saving) return;
    if (!technicianId) {
      toast.error(t("dentalLab.cases.assignTechnician"));
      return;
    }
    setSaving(true);
    try {
      const updated = await assignCase(caseData.id, {
        technicianId,
        role: role as DentalTechnicianRole,
      });
      toast.success(t("dentalLab.detail.assigned"));
      setCurrentAssignments(updated.assignments || []);
      setTechnicianId("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (removingId) return;
    setRemovingId(assignmentId);
    try {
      const updated = await removeCaseAssignment(caseData.id, assignmentId);
      toast.success("تم إلغاء إسناد الفني بنجاح");
      setCurrentAssignments(updated.assignments || []);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل إلغاء الإسناد");
    } finally {
      setRemovingId(null);
    }
  };

  const inputCls = `${MODAL_INPUT_CLS} text-sm`;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div className={`${MODAL_CONTENT_CLS} !max-w-lg`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b dark:border-gray-800">
          <div>
            <h3 className="text-lg font-bold">{t("dentalLab.cases.assignTitle")}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              الحالة:{" "}
              <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                {caseData.caseNumber || caseData.id.slice(0, 8)}
              </span>
              {caseData.patientName && <span> • المريض: {caseData.patientName}</span>}
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Current Assigned Technicians List */}
        <div className="mb-5">
          <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>الفنيون المسندون حالياً على الحالة</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono">
              {currentAssignments.length} فني
            </span>
          </h4>
          {currentAssignments.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-center text-xs text-gray-400">
              لم يتم إسناد أي فني لهذه الحالة بعد
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {currentAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                      <User className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                        {a.technician?.name || a.technicianId}
                      </p>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          ROLE_CONFIG[a.role]?.color || "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {ROLE_CONFIG[a.role]?.label || a.role}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={removingId === a.id}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors disabled:opacity-50"
                    title="إلغاء إسناد هذا الفني"
                    aria-label="إلغاء الإسناد"
                  >
                    {removingId === a.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Technician Form */}
        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
          <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> إسناد فني جديد للحالة
          </h4>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              اختر الفني *
            </label>
            <select
              className={inputCls}
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              <option value="">— اختر الفني —</option>
              {active.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} (
                  {String(ROLE_CONFIG[x.role]?.label || x.role || "").replace(
                    /\s*\/\s*(Master|QC)\s*$/i,
                    ""
                  )}
                  )
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              الدور / التخصص في الحالة
            </label>
            <select
              className={inputCls}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {(Object.keys(ROLE_CONFIG) as (keyof typeof ROLE_CONFIG)[]).map((k) => (
                <option key={k} value={k}>
                  {ROLE_CONFIG[k]?.label || k}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !technicianId}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            إضافة وإسناد الفني
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-3 border-t dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export default DentalCaseAssignModal;
