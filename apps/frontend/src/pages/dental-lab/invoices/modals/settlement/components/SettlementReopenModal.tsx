import React from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { MODAL_INPUT_CLS, type DentalMonthlySettlement } from "../../../../shared";

interface SettlementReopenModalProps {
  reopenTarget: DentalMonthlySettlement | null;
  period: string;
  reason: string;
  onReasonChange: (val: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  reopening: boolean;
}

export const SettlementReopenModal: React.FC<SettlementReopenModalProps> = ({
  reopenTarget,
  period,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
  reopening,
}) => {
  if (!reopenTarget) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settlement-reopen-modal-title"
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl p-5 max-w-md w-full shadow-2xl border dark:border-gray-700 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-amber-600">
          <ShieldAlert className="w-5 h-5" />
          <h4
            id="settlement-reopen-modal-title"
            className="font-bold text-sm"
          >
            إعادة فتح شهر {period} للتعديل المحاسبي
          </h4>
        </div>
        <p className="text-xs text-gray-500">
          أنت على وشك إلغاء تجميد حساب د.{" "}
          <strong>{reopenTarget.doctorName}</strong> لشهر {period}. يلزم تسجيل
          سبب إعادة الفتح لأغراض التدقيق المالي.
        </p>
        <div>
          <label
            htmlFor="reopen-reason-textarea"
            className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1"
          >
            سبب إعادة الفتح *
          </label>
          <textarea
            id="reopen-reason-textarea"
            rows={3}
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="مثال: إضافة دفعة متأخرة أو تصحيح خصم بناءً على مراجعة الطبيب..."
            className={MODAL_INPUT_CLS}
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-700 rounded-lg"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={reopening || !reason.trim()}
            className="px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            {reopening && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>تأكيد إعادة الفتح</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettlementReopenModal;
