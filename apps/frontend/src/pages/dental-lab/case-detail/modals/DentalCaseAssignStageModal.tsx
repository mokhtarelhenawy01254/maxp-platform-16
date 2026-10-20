import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Trash2, Users, UserPlus, X as XMarkIcon } from "lucide-react";
import {
  STAGE_ASSIGNEE_ROLES,
  type AssignStageModalProps,
} from "../types/dentalCaseDetailTypes";
import {
  ROLE_CONFIG,
  addStageAssignee,
  removeStageAssignee,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  type DentalStageAssignee,
} from "../../shared";

export default function DentalCaseAssignStageModal({
  caseId,
  stage,
  technicians,
  onClose,
  onSaved,
}: AssignStageModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [removingTechId, setRemovingTechId] = useState<string | null>(null);

  const [assignees, setAssignees] = useState<DentalStageAssignee[]>(() => {
    if (stage.assignees && stage.assignees.length > 0) return stage.assignees;
    if (stage.assigneeId) {
      return [
        {
          id: `legacy-${stage.assigneeId}`,
          stageId: stage.id,
          technicianId: stage.assigneeId,
          technicianName: stage.assigneeName,
          role: "PRIMARY",
          sharePercent: 100,
          technician: { id: stage.assigneeId, name: stage.assigneeName || "فني مسند" },
        },
      ];
    }
    return [];
  });

  useEffect(() => {
    if (stage.assignees && stage.assignees.length > 0) {
      setAssignees(stage.assignees);
    }
  }, [stage.assignees]);

  const [technicianId, setTechnicianId] = useState("");
  const [role, setRole] = useState("PRIMARY");
  const [notes, setNotes] = useState("");

  const handleAddAssignee = async () => {
    if (!technicianId) {
      toast.error("يرجى اختيار الفني المراد إسناده للمرحلة");
      return;
    }
    setSaving(true);
    try {
      const updatedCase = await addStageAssignee(caseId, stage.id, {
        technicianId,
        role,
        sharePercent: 100,
        notes: notes.trim() || undefined,
      });
      toast.success("تم إسناد الفني للمرحلة بنجاح");
      if (updatedCase && updatedCase.stages) {
        const found = updatedCase.stages.find((s) => s.id === stage.id);
        if (found && found.assignees) {
          setAssignees(found.assignees);
        }
      }
      setTechnicianId("");
      setNotes("");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignee = async (techId: string, techName?: string) => {
    if (!window.confirm(`هل أنت متأكد من إزالة الفني "${techName || "المحدد"}" من هذه المرحلة؟`)) return;
    setRemovingTechId(techId);
    try {
      const updatedCase = await removeStageAssignee(caseId, stage.id, techId);
      toast.success("تم إلغاء إسناد الفني من المرحلة");
      if (updatedCase && updatedCase.stages) {
        const found = updatedCase.stages.find((s) => s.id === stage.id);
        if (found) {
          setAssignees(found.assignees || []);
        } else {
          setAssignees((prev) => prev.filter((a) => a.technicianId !== techId));
        }
      } else {
        setAssignees((prev) => prev.filter((a) => a.technicianId !== techId));
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dentalLab.common.noData"));
    } finally {
      setRemovingTechId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={() => !saving && onClose()}
    >
      <div
        className={`${MODAL_CONTENT_CLS} max-w-lg w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-3">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              إسناد الفنيين لمرحلة: <span className="text-blue-600 dark:text-blue-400">{stage.name}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              يمكنك تعيين أكثر من فني وتحديد دور كل فني (رئيسي، مساعد، فحص جودة، تشطيب)
            </p>
          </div>
          <button
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* List of currently assigned technicians */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
              <span>الفنيون المسندون للمرحلة</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold tabular-nums">
                {assignees.length}
              </span>
            </h4>
          </div>

          {assignees.length === 0 ? (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-dashed border-gray-300 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400">
              لا يوجد فنيون مسندون لهذه المرحلة حتى الآن. اختر فنياً من النموذج أدناه لإسناده.
            </div>
          ) : (
            <div className="space-y-2">
              {assignees.map((asg) => {
                const techName = asg.technician?.name || asg.technicianName || asg.technicianId;
                const roleMeta = STAGE_ASSIGNEE_ROLES.find((r) => r.id === asg.role);
                const isRemoving = removingTechId === asg.technicianId;
                return (
                  <div
                    key={asg.id || asg.technicianId}
                    className="flex items-center justify-between p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {techName}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            roleMeta?.badgeCls ||
                            "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          {roleMeta?.shortLabel || asg.role}
                        </span>
                      </div>
                      {asg.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{asg.notes}</span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(asg.technicianId, techName)}
                      disabled={isRemoving || saving}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition disabled:opacity-50 flex items-center gap-1 text-xs"
                      title="إزالة الفني من المرحلة"
                    >
                      {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add new technician to stage section */}
        <div className="bg-gray-50/80 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700/80 space-y-3.5">
          <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            إضافة فني جديد إلى المرحلة
          </h4>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اختر الفني *
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
            >
              <option value="">— اختر فني —</option>
              {technicians
                .filter((x) => x.isActive)
                .map((x) => {
                  const alreadyAssigned = assignees.some((a) => a.technicianId === x.id);
                  return (
                    <option key={x.id} value={x.id}>
                      {x.name} ({ROLE_CONFIG[x.role]?.label || x.role}) {alreadyAssigned ? "— (مسند بالفعل)" : ""}
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              دور الفني في هذه المرحلة
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {STAGE_ASSIGNEE_ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات وتوجيهات خاصة للفني (اختياري)
            </label>
            <input
              className={MODAL_INPUT_CLS}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: مسؤول عن الفينش النهائي والمقاسات..."
            />
          </div>

          <button
            type="button"
            onClick={handleAddAssignee}
            disabled={saving || !technicianId}
            className="w-full mt-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 transition"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            + إضافة الفني للمرحلة
          </button>
        </div>

        <div className="flex justify-end mt-5 pt-3 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
