import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Printer,
  Truck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import type {
  PreparationOrder,
  PreparationQueueSettings,
  PreparationStatusOption,
} from "../types";

interface PreparationOrderActionsProps {
  order: PreparationOrder;
  statusOptions: PreparationStatusOption[];
  statusLabelMap: Map<string, string>;
  currentSelection: string;
  actionLabel: string;
  rowBusy: boolean;
  printingOrderNumber: string | null;
  preparationSettings: PreparationQueueSettings;
  onStatusSelectionChange: (orderNumber: string, nextStatus: string) => void;
  onSingleStatusUpdate: (orderNumber: string, nextStatus: string) => void;
  onMarkAsShortageHold: (orderNumber: string) => void;
  onReleaseShortageHold: (orderNumber: string) => void;
  onMarkAsShortageFailed: (orderNumber: string) => void;
  onHoldAsProblem: (orderNumber: string) => void;
  onReleaseProblemHold: (orderNumber: string) => void;
  onPrintPreparationSlip: (orderNumber: string) => void;
}

const PreparationOrderActions = ({
  order,
  statusOptions,
  statusLabelMap,
  currentSelection,
  actionLabel,
  rowBusy,
  printingOrderNumber,
  preparationSettings,
  onStatusSelectionChange,
  onSingleStatusUpdate,
  onMarkAsShortageHold,
  onReleaseShortageHold,
  onMarkAsShortageFailed,
  onHoldAsProblem,
  onReleaseProblemHold,
  onPrintPreparationSlip,
}: PreparationOrderActionsProps) => {
  const { t } = useTranslation();
  const merchantFulfillment = order.merchantFulfillment;
  const canPrepare = merchantFulfillment?.canPrepare !== false;
  const isPrinting = printingOrderNumber === order.orderNumber;
  const isProblemHeld = order.stage === "ON_HOLD_PREP";
  const canHoldAsProblem =
    !isProblemHeld &&
    order.stage !== "READY_TO_SHIP" &&
    order.normalizedStatus !== preparationSettings.handoffStatus;

  if (!canPrepare) {
    return (
      <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2.5">
        <p className="text-xs text-muted-foreground">
          {t("preparation.actionLabels.viewOnlyDesc")}
        </p>
        <span className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {t("preparation.actionLabels.viewOnly")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
      {/* Status select */}
      <select
        value={currentSelection}
        onChange={(e) => onStatusSelectionChange(order.orderNumber, e.target.value)}
        disabled={!preparationSettings.enabled}
        className="flex-1 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs text-foreground outline-none transition focus:ring-1 focus:ring-primary/40 sm:max-w-[180px] max-sm:min-h-[40px]"
      >
        {statusOptions.map((status) => (
          <option key={status.code} value={status.code}>
            {statusLabelMap.get(status.code) || status.fallbackName}
          </option>
        ))}
      </select>

      {/* Apply action */}
      <button
        onClick={() => onSingleStatusUpdate(order.orderNumber, currentSelection)}
        disabled={!preparationSettings.enabled || rowBusy}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground transition-all active:scale-[0.98] hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
      >
        {rowBusy ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        {actionLabel}
      </button>

      {/* Shortage hold */}
      {order.missingItemsCount > 0 && order.stage !== "STOCK_SHORTAGE" ? (
        <button
          type="button"
          onClick={() => onMarkAsShortageHold(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 transition-all active:scale-[0.98] hover:bg-rose-500/20 disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.holdShortage")}
        </button>
      ) : null}

      {/* Release shortage hold */}
      {order.stage === "STOCK_SHORTAGE" ? (
        <button
          type="button"
          onClick={() => onReleaseShortageHold(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 transition-all active:scale-[0.98] hover:bg-indigo-500/20 disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.returnToPreparation")}
        </button>
      ) : null}

      {/* Mark as final shortage (SHORTAGE_FAILED) */}
      {order.stage === "STOCK_SHORTAGE" ? (
        <button
          type="button"
          onClick={() => onMarkAsShortageFailed(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300 transition-all active:scale-[0.98] hover:bg-purple-500/20 disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <XCircle className="h-3.5 w-3.5" />
          {t("preparation.shortagePanel.markAsShortageFailed")}
        </button>
      ) : null}

      {/* Hold as problem */}
      {canHoldAsProblem ? (
        <button
          type="button"
          onClick={() => onHoldAsProblem(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 transition-all active:scale-[0.98] hover:bg-amber-500/20 disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <Pause className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.holdProblem")}
        </button>
      ) : null}

      {/* Release problem hold */}
      {isProblemHeld ? (
        <button
          type="button"
          onClick={() => onReleaseProblemHold(order.orderNumber)}
          disabled={rowBusy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 transition-all active:scale-[0.98] hover:bg-indigo-500/20 disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("preparation.actionLabels.releaseProblem")}
        </button>
      ) : null}

      {/* Ready to ship badge */}
      {order.normalizedStatus === preparationSettings.handoffStatus ||
      order.stage === "READY_TO_SHIP" ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <Truck className="h-3.5 w-3.5" />
          {t("preparation.k_10")}
        </span>
      ) : null}

      {/* Print */}
      <button
        type="button"
        onClick={() => onPrintPreparationSlip(order.orderNumber)}
        disabled={isPrinting}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all active:scale-[0.98] hover:bg-muted/50 disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
      >
        {isPrinting ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Printer className="h-3.5 w-3.5" />
        )}
        {t("preparation.actionLabels.print")}
      </button>

      {/* Open order */}
      {!merchantFulfillment ? (
        <Link
          to={`/orders/${encodeURIComponent(order.orderNumber)}`}
          className="inline-flex items-center justify-center rounded-lg border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all active:scale-[0.98] hover:text-foreground hover:bg-muted/50 max-sm:min-h-[40px] max-sm:flex-1"
        >
          {t("preparation.actionLabels.openOrder")}
        </Link>
      ) : null}
    </div>
  );
};

export default PreparationOrderActions;
