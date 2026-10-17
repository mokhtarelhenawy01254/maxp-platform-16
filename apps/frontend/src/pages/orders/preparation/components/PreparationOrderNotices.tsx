import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
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
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      {order.notes ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200">
          <span className="font-semibold shrink-0">{t("preparation.notices.notes")}</span>
          <span>{order.notes}</span>
        </div>
      ) : null}

      {!order.isReady ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{t("preparation.notices.needsReview")}</span>
        </div>
      ) : null}

      {order.stage === "STOCK_SHORTAGE" ? (
        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{t("preparation.notices.shortageHold")}</span>
        </div>
      ) : null}

      {order.stage === "ON_HOLD_PREP" ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{t("preparation.notices.problemHold")}</span>
        </div>
      ) : null}

      {shortageFollowUpVisual ? (
        <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${shortageFollowUpVisual.alertClass}`}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{shortageFollowUpVisual.alertText}</span>
        </div>
      ) : null}
    </div>
  );
};

export default PreparationOrderNotices;
