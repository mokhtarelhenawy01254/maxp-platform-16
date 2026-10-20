import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X as XMarkIcon } from "lucide-react";
import {
  sendCaseToTryIn,
  returnCaseFromTryIn,
  MODAL_CONTENT_CLS,
  MODAL_INPUT_CLS,
} from "../../shared";
import {
  TRYIN_STAGES,
  type SendToTryInModalProps,
  type ReturnFromTryInModalProps,
} from "../types/dentalCaseDetailTypes";

export function DentalCaseSendToTryInModal({
  caseId,
  onClose,
  onSaved,
}: SendToTryInModalProps) {
  const [saving, setSaving] = useState(false);
  const [tryInStage, setTryInStage] = useState("WAX_TRY_IN");
  const [note, setNote] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await sendCaseToTryIn(caseId, {
        tryInStage,
        note: note.trim() || undefined,
      });
      toast.success("تم تسجيل خروج الحالة للبروفة بنجاح");
      onSaved();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "حدث خطأ في إرسال الحالة للبروفة",
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
          <h3 className="text-lg font-bold">خروج الحالة لإجراء بروفة (Try-in)</h3>
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
              نوع البروفة المطلوبة
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={tryInStage}
              onChange={(e) => setTryInStage(e.target.value)}
            >
              {TRYIN_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات البروفة أو تعليمات الطبيب
            </label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: التأكد من الإطباق ومطابقة خط المنتصف..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} تسجيل خروج
            للبلوفة
          </button>
        </div>
      </div>
    </div>
  );
}

export function DentalCaseReturnFromTryInModal({
  caseId,
  onClose,
  onSaved,
}: ReturnFromTryInModalProps) {
  const [saving, setSaving] = useState(false);
  const [targetStage, setTargetStage] = useState("MANUFACTURING");
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await returnCaseFromTryIn(caseId, {
        targetStage,
        feedbackNotes: feedbackNotes.trim() || undefined,
      });
      toast.success("تم استلام الحالة من البروفة بنجاح واستئناف مسار العمل");
      onSaved();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "حدث خطأ في استلام الحالة من البروفة",
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
            استلام الحالة من البروفة وملاحظات الطبيب
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
              المرحلة المستهدفة لاستئناف العمل
            </label>
            <select
              className={MODAL_INPUT_CLS}
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
            >
              <option value="MANUFACTURING">
                تصنيع / إنهاء (MANUFACTURING)
              </option>
              <option value="DESIGN">إعادة تصميم CAD (DESIGN)</option>
              <option value="QC">فحص الجودة النهائي (QC)</option>
              <option value="READY">جاهزة للتسليم (READY)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات الطبيب والتعديلات المطلوبة
            </label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[80px] resize-y`}
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="مثال: تمت البروفة بنجاح، تقصير الحد القاطع بمقدار 0.5 مم..."
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} استلام ومتابعة
            العمل
          </button>
        </div>
      </div>
    </div>
  );
}
