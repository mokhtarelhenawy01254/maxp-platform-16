import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRightCircle, Loader2, X as XMarkIcon } from "lucide-react";
import {
  advanceCase,
  CASE_STATUS_MAP,
  nextStatusOf,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "../../shared";
import {
  FALLBACK_BADGE,
  type AdvanceModalProps,
} from "../types/dentalCaseDetailTypes";

const renderBadge = (
  map: Record<string, { label: string; color: string }>,
  value?: string,
  fallback?: string,
) => {
  if (!value) return null;
  const meta = map[value] ?? { ...FALLBACK_BADGE, label: fallback ?? value };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${meta.color}`}
    >
      {meta.label}
    </span>
  );
};

export function DentalCaseAdvanceModal({
  caseData,
  next: propNext,
  technicians,
  onClose,
  onSaved,
}: AdvanceModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const defaultNext = propNext || nextStatusOf(caseData.status);
  const [reason, setReason] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  const availableTargets = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    const current = caseData.status;
    if (current === "RECEIVED") {
      list.push({ id: "DESIGN", label: "تصميم CAD/CAM" });
      list.push({ id: "MANUFACTURING", label: "بدء التصنيع والمعالجة" });
      list.push({ id: "OUTSOURCED", label: "إرسال لمعمل خارجي" });
    } else if (current === "DESIGN") {
      list.push({ id: "MANUFACTURING", label: "بدء التصنيع والإنتاج" });
      list.push({ id: "OUTSOURCED", label: "إرسال لمعمل خارجي" });
      list.push({ id: "QC", label: "فحص الجودة (QC)" });
    } else if (current === "MANUFACTURING") {
      list.push({ id: "QC", label: "فحص الجودة (QC)" });
      list.push({ id: "READY", label: "جاهز للتسليم (اكتمال الشغل)" });
      list.push({ id: "OUTSOURCED", label: "إرسال لمعمل خارجي" });
    } else if (current === "OUTSOURCED") {
      list.push({ id: "QC", label: "فحص الجودة (استلام من الخارجي)" });
      list.push({ id: "READY", label: "جاهز للتسليم مباشرة" });
      list.push({ id: "MANUFACTURING", label: "عودة للتصنيع الداخلي" });
    } else if (current === "QC") {
      list.push({ id: "READY", label: "جاهز للتسليم (اجتياز الجودة)" });
      list.push({ id: "DELIVERED", label: "تم التسليم للعيادة" });
    } else if (current === "READY") {
      list.push({ id: "DELIVERED", label: "تم التسليم للعيادة / الطبيب" });
      list.push({ id: "CLOSED", label: "إغلاق وتصفية الحالة" });
    } else if (current === "DELIVERED") {
      list.push({ id: "CLOSED", label: "إغلاق الحالة" });
    }
    return list;
  }, [caseData.status]);

  const [targetStatus, setTargetStatus] = useState<string>(
    defaultNext || availableTargets[0]?.id || "",
  );

  const save = async () => {
    if (saving || !targetStatus) return;
    setSaving(true);
    try {
      await advanceCase(caseData.id, {
        to: targetStatus,
        reason: reason.trim() || undefined,
        assigneeId: assigneeId || undefined,
      });
      toast.success(t("dentalLab.detail.advanced"));
      onSaved();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("dentalLab.common.noData"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div className={MODAL_CONTENT_CLS} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">
            {t("dentalLab.cases.advanceTitle")}
          </h3>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">
              الحالة الحالية:
            </span>
            {renderBadge(CASE_STATUS_MAP, caseData.status)}
            <ArrowRightCircle className="w-5 h-5 text-gray-400" />
            {targetStatus ? (
              renderBadge(CASE_STATUS_MAP, targetStatus)
            ) : (
              <span className="text-sm text-gray-400">
                {t("dentalLab.common.noData")}
              </span>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              المرحلة أو الحالة المراد الانتقال إليها *
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
            >
              {availableTargets.map((tgt) => (
                <option key={tgt.id} value={tgt.id}>
                  {tgt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.cases.advanceReason")}
            </label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ملاحظات سبب النقل (اختياري)..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.cases.advanceAssignee")}
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">— إسناد لفني محدد (اختياري) —</option>
              {technicians
                .filter((x) => x.isActive)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {t("dentalLab.common.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !targetStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("dentalLab.common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
