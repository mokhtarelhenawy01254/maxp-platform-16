import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, X as XMarkIcon } from "lucide-react";
import {
  flagRefabrication,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
  type RefabricationStage,
} from "../../shared";
import {
  REFAB_STAGES,
  REMAKE_ROOT_CAUSES,
  type RefabricationModalProps,
} from "../types/dentalCaseDetailTypes";

export function DentalCaseRefabricationModal({
  caseId,
  onClose,
  onSaved,
}: RefabricationModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState("");
  const [stageFrom, setStageFrom] = useState<RefabricationStage>("DESIGN");
  const [rootCauseCategory, setRootCauseCategory] = useState("DOCTOR_IMPRESSION");
  const [isBillable, setIsBillable] = useState(false);

  const save = async () => {
    if (saving) return;
    if (!reason.trim()) {
      toast.error(t("dentalLab.detail.refabReasonRequired"));
      return;
    }
    setSaving(true);
    try {
      await flagRefabrication(caseId, {
        reason: reason.trim(),
        stageFrom,
        rootCauseCategory,
        isBillable,
      });
      toast.success(t("dentalLab.detail.refabFlagged"));
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
            {t("dentalLab.detail.refabModalTitle")}
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
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.detail.refabReason")} *
            </label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر سبب الإعادة بالتفصيل..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              السبب الجذري للمشكلة (Root Cause)
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={rootCauseCategory}
              onChange={(e) => setRootCauseCategory(e.target.value)}
            >
              {REMAKE_ROOT_CAUSES.map((rc) => (
                <option key={rc.id} value={rc.id}>
                  {rc.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t("dentalLab.detail.refabStageFrom")}
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={stageFrom}
              onChange={(e) =>
                setStageFrom(e.target.value as RefabricationStage)
              }
            >
              {REFAB_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.labelKey as any)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isBillable"
              checked={isBillable}
              onChange={(e) => setIsBillable(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label
              htmlFor="isBillable"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
            >
              إعادة مدفوعة (تحميل تكلفة الإعادة على الطبيب)
            </label>
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
            disabled={saving}
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
