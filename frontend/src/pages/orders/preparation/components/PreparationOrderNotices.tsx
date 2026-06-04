import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type {
  PreparationOrder,
  ShortageFollowUpVisual,
} from "../types";

interface PreparationOrderNoticesProps {
  order: PreparationOrder;
  shortageFollowUpVisual: ShortageFollowUpVisual | null;
}

const PreparationOrderNotices = ({
  order,
  shortageFollowUpVisual,
}: PreparationOrderNoticesProps) => {
  return (
    <>
      {order.notes ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">ملاحظات:</span> {order.notes}
        </div>
      ) : null}

      {!order.isReady ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              هذا الطلب يحتاج مراجعة مخزون أو تحويل من مخزن آخر قبل إكمال
              التجهيز.
            </p>
          </div>
        </div>
      ) : null}

      {order.stage === "STOCK_SHORTAGE" ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              هذا الطلب موجود حاليًا في قائمة المؤجل بسبب العجز، ولن يدخل
              التشغيل اليومي حتى يتم إرجاعه للتجهيز.
            </p>
          </div>
        </div>
      ) : null}

      {shortageFollowUpVisual ? (
        <div className={shortageFollowUpVisual.alertClass}>
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{shortageFollowUpVisual.alertText}</p>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default PreparationOrderNotices;
