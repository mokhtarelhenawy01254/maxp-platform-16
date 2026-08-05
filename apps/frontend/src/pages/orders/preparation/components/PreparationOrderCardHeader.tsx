import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
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
    <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
      {/* Top row: checkbox + order number + badges + meta stats */}
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelection(order.orderNumber)}
          disabled={!canPrepare}
          className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-500 dark:text-amber-400"
        />

        <div className="min-w-0 flex-1">
          {/* Order number + stage badge + source */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isMerchantScopedOrder ? (
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                #{order.orderNumber}
              </span>
            ) : (
              <Link
                to={`/orders/${encodeURIComponent(order.orderNumber)}`}
                className="text-sm font-bold text-gray-900 hover:text-amber-700 dark:text-gray-100 dark:hover:text-amber-400"
              >
                #{order.orderNumber}
              </Link>
            )}

            {(() => {
              const statusInfo = getStatusDisplay(order.normalizedStatus);
              return (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusInfo.colorClass}`}
                  aria-label={statusInfo.labelKey}
                >
                  {t(statusInfo.labelKey) || statusInfo.label}
                </span>
              );
            })()}

            <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
              {t(SOURCE_LABEL_KEYS[(order.sourceType || "unknown").toLowerCase()]) ||
                order.sourceType}
            </span>

            {merchantFulfillment ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                  canPrepare
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : "border-gray-200 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
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
          <p className="mt-1 text-xs font-medium text-gray-700 dark:text-gray-300">
            {order.customerName}
            {order.customerPhone ? ` — ${order.customerPhone}` : ""}
            <span className="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
            <span className="text-gray-400 dark:text-gray-500">
              {getAgeLabel(order.createdAt)}
              {canViewFullDetails && (order.governorate || order.city)
                ? ` • ${order.governorate || order.city}`
                : ""}
            </span>
          </p>

          {order.stage === "ON_HOLD_PREP" ? (
            <p className="mt-1.5 line-clamp-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <ExclamationTriangleIcon className="ml-1 inline h-3 w-3 shrink-0 align-[-2px]" />
              {problemHoldReason || t("preparation.problemPanel.addReason")}
            </p>
          ) : null}
        </div>

        {/* Right-side compact stats */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{t("preparation.table.units")}</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{order.totalUnits}</p>
          </div>

          {canViewFullDetails && (
            <>
              <div className="h-8 w-px bg-gray-100 dark:bg-gray-700" />
              <div className="text-center">
                <p className="text-[10px] text-gray-400 dark:text-gray-500">{t("preparation.table.value")}</p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {formatPrice(order.totalValue)}
                </p>
              </div>
            </>
          )}

          <div className="h-8 w-px bg-gray-100 dark:bg-gray-700" />

          <div className="text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{t("preparation.table.warehouse")}</p>
            <p className="max-w-[80px] truncate text-xs font-semibold text-gray-700 dark:text-gray-300">
              {order.recommendedWarehouseName || t("preparation.table.notDefined")}
            </p>
          </div>

          <div className="h-8 w-px bg-gray-100 dark:bg-gray-700" />

          <div className="text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{t("preparation.table.lastUpdate")}</p>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {formatDate(order.updatedAt || order.createdAt)}
            </p>
          </div>

          <div className="h-8 w-px bg-gray-100 dark:bg-gray-700" />

          <div className="text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{t("preparation.table.shippingCode")}</p>
            <p className="max-w-[100px] truncate text-xs font-medium text-gray-700 dark:text-gray-300" dir="ltr">
              {order.turboTrackingNumber ||
                (order.shipments?.length
                  ? order.shipments
                      .map((s) => s.trackingNumber)
                      .filter(Boolean)
                      .join(", ")
                  : null) || "—"}
            </p>
          </div>

          <div className="h-8 w-px bg-gray-100 dark:bg-gray-700" />

          <div
            className={`rounded-lg px-2 py-1 text-center text-[11px] font-semibold ${
              order.isReady
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
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
        <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {order.totalUnits} {t("preparation.table.unitsLabel")}
        </span>
        {canViewFullDetails && (
          <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {formatPrice(order.totalValue)}
          </span>
        )}
        <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {order.recommendedWarehouseName || t("preparation.table.notAssigned")}
        </span>
        <span
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            order.isReady ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
          }`}
        >
          {order.isReady ? t("preparation.table.readyToPrepare") : t("preparation.table.needsReview", { count: order.missingItemsCount })}
        </span>
      </div>

      {/* Quantity offer notice */}
      {itemSummary.hasQuantityOffers ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
          <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-gray-800 dark:text-amber-300">
            {t("preparation.table.quantityOffer")}
          </span>
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
            {itemSummary.primaryLabel}
          </span>
          {itemSummary.secondaryLabel && (
            <span className="text-xs text-amber-700 dark:text-amber-400">{itemSummary.secondaryLabel}</span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default PreparationOrderCardHeader;
