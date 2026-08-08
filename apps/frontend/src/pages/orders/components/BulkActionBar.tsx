import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  XMarkIcon,
  PrinterIcon,
  RocketLaunchIcon,
  TrashIcon,
  ArrowPathIcon,
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
  onDelete,
}) => {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={String(t("orders.bulkActionsBar"))}
      className="data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[state=open]:fade-in-0 sticky top-2 z-20 mb-3 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 shadow-[0_18px_50px_-32px_rgba(37,99,235,0.5)] backdrop-blur-md duration-200 sm:flex-row sm:items-center sm:justify-between dark:border-primary/30 dark:bg-primary/10"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
          <CheckCircleIcon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t("orders.ordersSelected", { count })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("orders.bulkActionsHint", { count })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          disabled={busy}
          className="ms-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-50"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          {t("orders.deselect", { defaultValue: "إلغاء التحديد" })}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1 sm:flex-none">
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
            className="h-9 w-full appearance-none rounded-xl border border-border bg-background px-3 pe-8 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
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
          className="gap-1.5"
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
            className="gap-1.5"
          >
            <RocketLaunchIcon className="h-4 w-4" />
            {busy ? t("orders.creating") : t("orders.createTurboShipments")}
          </Button>
        )}

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={busy}
          className="gap-1.5"
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
