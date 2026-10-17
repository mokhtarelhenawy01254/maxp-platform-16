import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { SOURCE_LABEL_KEYS } from "../constants";
import { getAgeLabel } from "../helpers";
import { summarizeOrderDocumentItems } from "../../../../utils/orderDocumentQuantityOffers";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import type {
  PreparationOrder,
  ShortageFollowUpVisual,
} from "../types";

interface PreparationOrderCardHeaderProps {
  order: PreparationOrder;
  selected: boolean;
  statusLabelMap: Map<string, string>;
  shortageFollowUpVisual: ShortageFollowUpVisual | null;
  problemHoldReason?: string;
  onEditProblemReason?: (orderNumber: string) => void;
  formatPrice: (value: number) => string;
  formatDate: (value: string) => string;
  onToggleSelection: (orderNumber: string) => void;
}

const PreparationOrderCardHeader = ({
  order,
  selected,
  statusLabelMap,
  shortageFollowUpVisual,
  problemHoldReason = "",
  onEditProblemReason,
  formatPrice,
  formatDate,
  onToggleSelection,
}: PreparationOrderCardHeaderProps) => {
  const { t } = useTranslation();
  const itemSummary = summarizeOrderDocumentItems(order.items);
  const merchantFulfillment = order.merchantFulfillment;
  const canPrepare = merchantFulfillment?.canPrepare !== false;
  const canViewFullDetails = merchantFulfillment?.canViewFullDetails !== false;
  const isMerchantScopedOrder = Boolean(merchantFulfillment);

  return (
    <div className="border-b border-border/60 bg-muted/20 px-3.5 py-2.5">
      {/* Top row: checkbox + order number + badges + meta stats */}
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelection(order.orderNumber)}
          disabled={!canPrepare}
          className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-border/70 text-primary focus:ring-primary/40 dark:border-border/70"
        />

        <div className="min-w-0 flex-1">
          {/* Order number + stage badge + source */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isMerchantScopedOrder ? (
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                #{order.orderNumber}
              </span>
            ) : (
              <Link
                to={`/orders/${encodeURIComponent(order.orderNumber)}`}
                className="font-mono text-sm font-semibold tabular-nums text-foreground transition-colors hover:text-primary"
              >
                #{order.orderNumber}
              </Link>
            )}

            {(() => {
              const statusInfo = getStatusDisplay(order.normalizedStatus);
              return (
                <span
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-medium font-mono tabular-nums ${statusInfo.colorClass}`}
                  aria-label={statusInfo.labelKey}
                >
                  {t(statusInfo.labelKey) || statusInfo.label}
                </span>
              );
            })()}

            <span className="rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {t(SOURCE_LABEL_KEYS[(order.sourceType || "unknown").toLowerCase()]) ||
                order.sourceType}
            </span>

            {merchantFulfillment ? (
              <span
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                  canPrepare
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border/60 bg-muted/60 text-muted-foreground"
                }`}
              >
                {canPrepare ? t("preparation.table.merchantPrep") : t("preparation.table.companyPrep")}
              </span>
            ) : null}

            {shortageFollowUpVisual ? (
              <span className={shortageFollowUpVisual.badgeClass}>
                {shortageFollowUpVisual.label}
              </span>
            ) : null}
          </div>

          {/* Customer + location */}
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{order.customerName}</span>
            {order.customerPhone ? <span className="font-mono tabular-nums text-muted-foreground"> — {order.customerPhone}</span> : ""}
            <span className="mx-1.5 text-muted-foreground/40">•</span>
            <span>
              {getAgeLabel(order.createdAt)}
              {canViewFullDetails && (order.governorate || order.city)
                ? ` • ${order.governorate || order.city}`
                : ""}
            </span>
          </p>

          {order.stage === "ON_HOLD_PREP" ? (
            <button
              type="button"
              onClick={() => onEditProblemReason?.(order.orderNumber)}
              className="mt-1.5 block w-full text-left line-clamp-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 transition hover:border-amber-500/50"
              title={String(t("preparation.problemPanel.edit"))}
            >
              <AlertTriangle className="ml-1 inline h-3 w-3 shrink-0 align-[-2px]" />
              {problemHoldReason || t("preparation.problemPanel.addReason")}
            </button>
          ) : null}
        </div>

        {/* Right-side compact stats */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("preparation.table.units")}</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-foreground">{order.totalUnits}</p>
          </div>

          {canViewFullDetails && (
            <>
              <div className="h-6 w-px bg-border/60" />
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("preparation.table.value")}</p>
                <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formatPrice(order.totalValue)}
                </p>
              </div>
            </>
          )}

          <div className="h-6 w-px bg-border/60" />

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("preparation.table.warehouse")}</p>
            <p className="max-w-[80px] truncate text-xs font-medium text-muted-foreground">
              {order.recommendedWarehouseName || t("preparation.table.notDefined")}
            </p>
          </div>

          <div className="h-6 w-px bg-border/60" />

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("preparation.table.lastUpdate")}</p>
            <p className="font-mono text-xs font-medium tabular-nums text-muted-foreground">
              {formatDate(order.updatedAt || order.createdAt)}
            </p>
          </div>

          <div className="h-6 w-px bg-border/60" />

          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("preparation.table.shippingCode")}</p>
            <p className="max-w-[100px] truncate font-mono text-xs font-medium tabular-nums text-muted-foreground" dir="ltr">
              {order.turboTrackingNumber ||
                (order.shipments?.length
                  ? order.shipments
                      .map((s) => s.trackingNumber)
                      .filter(Boolean)
                      .join(", ")
                  : null) || "—"}
            </p>
          </div>

          <div className="h-6 w-px bg-border/60" />

          <div
            className={`rounded-md border px-2 py-0.5 text-center text-[11px] font-medium font-mono tabular-nums ${
              order.isReady
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {order.isReady
              ? t("preparation.table.ready")
              : t("preparation.table.shortage", { count: order.missingItemsCount })}
          </div>
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="mt-2.5 flex flex-wrap gap-2 lg:hidden">
        <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
          {order.totalUnits} {t("preparation.table.unitsLabel")}
        </span>
        {canViewFullDetails && (
          <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
            {formatPrice(order.totalValue)}
          </span>
        )}
        <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
          {order.recommendedWarehouseName || t("preparation.table.notAssigned")}
        </span>
        <span
          className={`rounded-md border px-2 py-0.5 font-mono text-xs font-medium tabular-nums ${
            order.isReady
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          {order.isReady ? t("preparation.table.readyToPrepare") : t("preparation.table.needsReview", { count: order.missingItemsCount })}
        </span>
      </div>

      {/* Quantity offer notice */}
      {itemSummary.hasQuantityOffers ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-1.5">
          <span className="rounded border border-amber-500/30 bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300">
            {t("preparation.table.quantityOffer")}
          </span>
          <span className="text-xs font-semibold text-foreground">
            {itemSummary.primaryLabel}
          </span>
          {itemSummary.secondaryLabel && (
            <span className="text-xs text-muted-foreground">{itemSummary.secondaryLabel}</span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PreparationOrderCardHeader;
