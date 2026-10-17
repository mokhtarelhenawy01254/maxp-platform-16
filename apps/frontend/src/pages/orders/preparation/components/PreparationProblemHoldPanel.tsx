import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import type { PreparationOrder, ProblemHoldDetails } from "../types";

interface PreparationProblemHoldPanelProps {
  order: PreparationOrder;
  problemHoldDetails: ProblemHoldDetails;
  rowBusy: boolean;
  formatDate: (value: string) => string;
  onEditProblemReason: (orderNumber: string) => void;
}

const PreparationProblemHoldPanel = ({
  order,
  problemHoldDetails,
  rowBusy,
  formatDate,
  onEditProblemReason,
}: PreparationProblemHoldPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            {t("preparation.problemPanel.title")}
          </h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("preparation.problemPanel.desc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEditProblemReason(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 transition-all active:scale-[0.98] hover:bg-amber-500/20 dark:text-amber-300"
        >
          <Pencil className="h-3 w-3" />
          {problemHoldDetails.reason
            ? t("preparation.problemPanel.edit")
            : t("preparation.problemPanel.addReason")}
        </button>
      </div>

      <div className="mt-2.5 space-y-1.5">
        {problemHoldDetails.reason ? (
          <div className="rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-xs text-foreground">
            {problemHoldDetails.reason}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
            {t("preparation.problemPanel.noReason")}
          </p>
        )}
        <div className="flex flex-wrap gap-3 font-mono text-xs tabular-nums text-muted-foreground">
          {problemHoldDetails.heldAt ? (
            <span>
              {t("preparation.problemPanel.heldAt", {
                date: formatDate(problemHoldDetails.heldAt),
              })}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PreparationProblemHoldPanel;
