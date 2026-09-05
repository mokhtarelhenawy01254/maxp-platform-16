import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XMarkIcon,
  PrinterIcon,
  RocketLaunchIcon,
  TrashIcon,
  ArrowPathIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
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
  onCreateTurboShipments: () => void;
  /** Create QP Express shipments for the whole selection. */
  onCreateQpExpressShipments?: () => void;
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
  onDelete,
}) => {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={String(t("orders.bulkActionsBar"))}
      className="data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=open]:fade-in-0 sticky top-2 z-20 mb-3 flex flex-col gap-2.5 rounded-2xl border border-primary/30 bg-white/95 p-2.5 shadow-[0_18px_50px_-32px_rgba(37,99,235,0.4)] backdrop-blur-md duration-200 sm:flex-row sm:items-center sm:justify-between sm:p-3 dark:border-primary/30 dark:bg-slate-900/95"
    >
      <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30 sm:h-9 sm:w-9">
            <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground sm:text-sm">
              {t("orders.ordersSelected", { count })}
            </p>
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              {t("orders.bulkActionsHint", { count })}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={busy}
          className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          {t("orders.deselect", { defaultValue: "إلغاء التحديد" })}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
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
            className="h-9 w-full appearance-none rounded-xl border border-border bg-background px-3 pe-8 text-xs font-medium text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50 sm:text-sm"
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
          className="min-h-[36px] justify-center gap-1.5 text-xs font-semibold"
        >
          <PrinterIcon className="h-4 w-4" />
          {printing ? t("orders.printing") : t("orders.printInvoices")}
        </Button>

        {!isTrashView && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateTurboShipments}
            disabled={busy}
            className="min-h-[36px] justify-center gap-1.5 text-xs font-semibold"
          >
            <RocketLaunchIcon className="h-4 w-4" />
            {busy ? t("orders.creating") : t("orders.createTurboShipments")}
          </Button>
        )}

        {!isTrashView && onCreateQpExpressShipments && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCreateQpExpressShipments}
            disabled={busy}
            className="min-h-[36px] justify-center gap-1.5 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
          >
            <TruckIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {busy ? "جاري الشحن..." : "شحن QP Express"}
          </Button>
        )}

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          className={`min-h-[36px] justify-center gap-1.5 text-xs font-semibold ${
            isTrashView ? "col-span-2 sm:col-span-1" : ""
          }`}
        >
          {isTrashView ? (
            <TrashIcon className="h-4 w-4" />
          ) : (
            <ArrowPathIcon className="h-4 w-4" />
          )}
          {busy
            ? t("orders.processing2")
            : t(
                isTrashView
                  ? "orders.deleteSelectedPermanently"
                  : "orders.deleteSelected",
              )}
        </Button>
      </div>
    </div>
  );
};

export default BulkActionBar;
