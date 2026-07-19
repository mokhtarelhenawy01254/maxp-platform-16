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
    <div className="space-y-1.5">
      {order.notes ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold shrink-0">ملاحظات:</span>
          <span>{order.notes}</span>
        </div>
      ) : null}

      {!order.isReady ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>يحتاج مراجعة مخزون أو تحويل من مخزن آخر قبل إكمال التجهيز.</span>
        </div>
      ) : null}

      {order.stage === "STOCK_SHORTAGE" ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>طلب مؤجل بسبب العجز — لن يدخل التشغيل اليومي حتى إرجاعه للتجهيز.</span>
        </div>
      ) : null}

      {shortageFollowUpVisual ? (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${shortageFollowUpVisual.alertClass}`}>
          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{shortageFollowUpVisual.alertText}</span>
        </div>
      ) : null}
    </div>
  );
};

export default PreparationOrderNotices;
