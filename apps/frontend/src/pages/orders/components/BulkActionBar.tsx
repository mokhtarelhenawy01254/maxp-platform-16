import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  X,
  Printer,
  Rocket,
  Trash2,
  RefreshCw,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface BulkStatusOption {
  code: string;
  name: string;
}

export interface BulkActionBarProps {
  /** How many orders are currently selected. The bar renders nothing when this is 0. */
  count: number;
  /** Available status transitions the admin can apply to the selection. */
  statuses: BulkStatusOption[];
  /** True when the user is viewing the trash folder (swaps restore vs delete action). */
  isTrashView?: boolean;
  /** Disables interactive controls while a long-running bulk op is in flight. */
  busy?: boolean;
  /** Disables just the print button (it has its own loading state). */
  printing?: boolean;
  /** Clear the current selection. */
  onClearSelection: () => void;
  /** Apply a status change to the whole selection. Pass empty string to no-op. */
  onStatusChange: (status: string) => void;
  /** Open the bulk print page. */
  onPrintInvoices: () => void;
  /** Create Turbo shipments for the whole selection. */
  onCreateTurboShipments?: () => void;
  /** Create QP Express shipments for the whole selection. */
  onCreateQpExpressShipments?: () => void;
  /** Create Bosta shipments for the whole selection. */
  onCreateBostaShipments?: () => void;
  /** Soft-delete the selection (or hard-delete when in trash view). */
  onDelete: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count,
  statuses,
  isTrashView = false,
  busy = false,
  printing = false,
  onClearSelection,
  onStatusChange,
  onPrintInvoices,
  onCreateTurboShipments,
  onCreateQpExpressShipments,
  onCreateBostaShipments,
  onDelete,
}) => {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={String(t("orders.bulkActionsBar"))}
      className="data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=open]:fade-in-0 sticky top-2 z-20 mb-3 flex flex-col gap-2.5 rounded-xl border border-primary/30 bg-card/95 p-2.5 text-card-foreground shadow-lg backdrop-blur-md duration-200 sm:flex-row sm:items-center sm:justify-between sm:p-3"
    >
      <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 sm:h-9 sm:w-9">
            <CheckCircle2 className="h-4 w-4 sm:h-4.5 sm:w-4.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground sm:text-sm font-mono tabular-nums">
              {t("orders.ordersSelected", { count })}
            </p>
            <p className="hidden text-[11px] text-muted-foreground sm:block font-mono tabular-nums">
              {t("orders.bulkActionsHint", { count })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={busy}
          className="inline-flex min-h-[30px] items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          <span>{t("orders.deselect", { defaultValue: "إلغاء التحديد" })}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:items-center">
        <div className="col-span-2 relative min-w-[140px] sm:col-span-1 sm:flex-none">
          <select
            aria-label={String(t("orders.updateStatus"))}
            disabled={busy}
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                onStatusChange(val);
                e.target.value = "";
              }
            }}
            className="h-9 w-full appearance-none rounded-lg border border-border/70 bg-background px-3 pe-8 text-xs font-medium text-foreground shadow-xs outline-hidden transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 sm:text-sm"
          >
            <option value="">{t("orders.updateStatus")}</option>
            {statuses.map((status) => (
              <option key={status.code} value={status.code.toLowerCase()}>
                {status.name}
              </option>
            ))}
            {!isTrashView && <option value="trash">{t("orders.trash")}</option>}
            {isTrashView && (
              <option value="restore">{t("orders.restoreFromTrash")}</option>
            )}
          </select>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrintInvoices}
          disabled={printing}
          className="min-h-[36px] justify-center gap-1.5 text-xs font-semibold rounded-lg"
        >
          <Printer className="h-3.5 w-3.5" />
          <span>{printing ? t("orders.printing") : t("orders.printInvoices")}</span>
        </Button>

        {!isTrashView && onCreateTurboShipments && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateTurboShipments}
            disabled={busy}
            className="min-h-[36px] justify-center gap-1.5 text-xs font-semibold rounded-lg"
          >
            <Rocket className="h-3.5 w-3.5" />
            <span>{busy ? t("orders.creating") : t("orders.createTurboShipments")}</span>
          </Button>
        )}

        {!isTrashView && onCreateQpExpressShipments && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateQpExpressShipments}
            disabled={busy}
            className="min-h-[36px] justify-center gap-1.5 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/10"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>{busy ? "جاري الشحن..." : "شحن QP Express"}</span>
          </Button>
        )}

        {!isTrashView && onCreateBostaShipments && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateBostaShipments}
            disabled={busy}
            className="min-h-[36px] justify-center gap-1.5 text-xs font-semibold rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>{busy ? "جاري الشحن..." : "شحن بوستا (Bosta)"}</span>
          </Button>
        )}

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          className={`min-h-[36px] justify-center gap-1.5 text-xs font-semibold rounded-lg ${
            isTrashView ? "col-span-2 sm:col-span-1" : ""
          }`}
        >
          {isTrashView ? (
            <Trash2 className="h-3.5 w-3.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span>
            {busy
              ? t("orders.processing2")
              : t(
                  isTrashView
                    ? "orders.deleteSelectedPermanently"
                    : "orders.deleteSelected",
                )}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default BulkActionBar;
