import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, X as XMarkIcon } from "lucide-react";
import { advanceCase, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "../../shared";
import type { OutsourceModalProps } from "../types/dentalCaseDetailTypes";

export function DentalCaseOutsourceModal({
  caseId,
  onClose,
  onSaved,
}: OutsourceModalProps) {
  const [saving, setSaving] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [cost, setCost] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  const save = async () => {
    if (!providerName.trim()) {
      toast.error("يرجى إدخال اسم جهة التنفيذ الخارجية (المعمل أو المركز)");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const summaryParts = [
        `جهة التنفيذ: ${providerName.trim()}`,
        workDescription.trim() && `العمل: ${workDescription.trim()}`,
        cost.trim() && `التكلفة: ${cost.trim()} ج.م`,
        returnDate && `موعد الاستلام: ${returnDate}`,
        trackingNumber.trim() && `رقم الإيصال: ${trackingNumber.trim()}`,
        notes.trim() && `ملاحظات: ${notes.trim()}`,
      ].filter(Boolean);

      const combinedNotes = `[بره المعمل (OUTSOURCED) | ${summaryParts.join(" | ")}]`;

      await advanceCase(caseId, {
        to: "OUTSOURCED",
        reason: `إرسال إلى: ${providerName.trim()}`,
        externalLabName: providerName.trim(),
        outsourceCost: Number(cost) || 0,
        outsourcedAt: new Date().toISOString(),
        expectedReturnAt: returnDate || undefined,
        outsourceNotes: summaryParts.join(" | "),
        notes: combinedNotes,
        dueDate: returnDate || undefined,
      });

      toast.success("تم تحويل الحالة إلى مرحلة (بره المعمل) بنجاح");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.error ||
          e?.message ||
          "فشل إرسال الحالة للجهة الخارجية",
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
      <div
        className={`${MODAL_CONTENT_CLS} max-w-lg w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base sm:text-lg font-bold">
              إرسال الشغل لجهة خارجية (بره المعمل)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              اسم جهة التنفيذ الخارجية (مركز ميلنج / معمل صب / مورد) *
            </label>
            <input
              className={MODAL_INPUT_CLS}
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="مثال: مركز الأمل للميلنج والـ CAD/CAM..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                نوع العمل المطلوب خارجياً
              </label>
              <input
                className={MODAL_INPUT_CLS}
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                placeholder="مثال: خرط زيركون Katana 3D..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                التكلفة المتوقعة (ج.م)
              </label>
              <input
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
                type="number"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="مثال: 150"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                موعد الاستلام المتوقع
              </label>
              <input
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رقم الإيصال / البوليصة
              </label>
              <input
                className={`${MODAL_INPUT_CLS} font-mono tabular-nums`}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="رقم متابعة الاستلام..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات وتعليمات للجهة الخارجية
            </label>
            <textarea
              className={`${MODAL_INPUT_CLS} min-h-[60px] resize-y`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي تعليمات أو مقاسات خاصة مطلوبة من المورد الخارجي..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 mt-5 pt-3 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            تأكيد الإرسال لجهة خارجية
          </button>
        </div>
      </div>
    </div>
  );
}
