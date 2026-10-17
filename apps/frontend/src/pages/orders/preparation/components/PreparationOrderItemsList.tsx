import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { getOrderDocumentQuantityOffer } from "../../../../utils/orderDocumentQuantityOffers";
import type {
  ItemInsight,
  PreparationOrder,
  PreparationQueueSettings,
} from "../types";

interface PreparationOrderItemsListProps {
  order: PreparationOrder;
  selectedWarehouseId: string;
  transferingItemKey: string | null;
  preparationSettings: PreparationQueueSettings;
  onQuickTransfer: (orderNumber: string, item: ItemInsight) => void;
}

const PreparationOrderItemsList = ({
  order,
  selectedWarehouseId,
  transferingItemKey,
  preparationSettings,
  onQuickTransfer,
}: PreparationOrderItemsListProps) => {
  const { t } = useTranslation();
  const canPrepare = order.merchantFulfillment?.canPrepare !== false;
  const itemInsights = order.itemInsights || [];

  return (
    <>
      {/* Section title */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("preparation.itemsList.title")}
        </h3>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {t("preparation.itemsList.itemsCount", { count: itemInsights.length })}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {itemInsights.map((item) => {
          const quantityOffer = getOrderDocumentQuantityOffer(item);
          const slotIndex = Number(quantityOffer?.slotIndex);
          const resolvedSlotIndex =
            Number.isFinite(slotIndex) && slotIndex > 0 ? slotIndex : null;

          const isShort = item.shortage > 0;
          const isTransfering =
            transferingItemKey === `${order.orderNumber}-${item.productId}`;

          return (
            <div
              key={`${order.orderNumber}-${item.id}-${item.productId}`}
              className={`rounded-lg border p-2.5 transition-colors ${
                isShort
                  ? "border-rose-500/30 bg-rose-500/[0.04]"
                  : "border-border/60 bg-muted/20"
              }`}
            >
              {/* Item top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.displayName}
                    </p>
                    {item.color || item.size ? (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {item.color ? (
                          <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-foreground font-mono">
                            <span
                              className="inline-block h-2 w-2 rounded-full border border-border/60"
                              style={{
                                backgroundColor: ['احمر','red'].includes(item.color.toLowerCase()) ? '#ef4444' :
                                  ['ازرق','blue'].includes(item.color.toLowerCase()) ? '#3b82f6' :
                                  ['اخضر','green'].includes(item.color.toLowerCase()) ? '#22c55e' :
                                  ['اسود','black'].includes(item.color.toLowerCase()) ? '#111827' :
                                  ['ابيض','white'].includes(item.color.toLowerCase()) ? '#f9fafb' :
                                  ['اصفر','yellow'].includes(item.color.toLowerCase()) ? '#eab308' :
                                  ['بنى','brown'].includes(item.color.toLowerCase()) ? '#92400e' :
                                  ['رمادى','gray','grey'].includes(item.color.toLowerCase()) ? '#6b7280' :
                                  ['فضى','silver'].includes(item.color.toLowerCase()) ? '#9ca3af' :
                                  ['ذهبى','golden','gold'].includes(item.color.toLowerCase()) ? '#d97706' :
                                  '#e5e7eb'
                              }}
                            />
                            {item.color}
                          </span>
                        ) : null}
                        {item.size ? (
                          <span className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-foreground font-mono">
                            {item.size}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {quantityOffer ? (
                      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                        {t("preparation.itemsList.quantityOffer")}
                      </span>
                    ) : null}
                    {resolvedSlotIndex ? (
                      <span className="rounded border border-border/60 bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                        {t("preparation.itemsList.slot", { slot: resolvedSlotIndex })}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {t("preparation.itemsList.required", { count: item.quantityNumber })}
                    {item.bestWarehouseName ? ` • ${t("preparation.itemsList.bestWarehouse", { name: item.bestWarehouseName })}` : ""}
                  </p>
                  {quantityOffer?.offerLabel ? (
                    <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                      {String(quantityOffer.offerLabel)}
                    </p>
                  ) : null}
                </div>

                {/* Shortage / available badge */}
                <span
                  className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums ${
                    isShort
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isShort ? t("preparation.itemsList.shortage", { count: item.shortage }) : t("preparation.itemsList.available")}
                </span>
              </div>

              {/* Inventory mini-stats */}
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {t("preparation.itemsList.availableStock")}{" "}
                  <strong className="font-mono font-semibold tabular-nums text-foreground">{item.availableInScope}</strong>
                </span>
                <span className="text-border/60">|</span>
                <span>
                  {t("preparation.itemsList.reserved")}{" "}
                  <strong className="font-mono font-semibold tabular-nums text-foreground">{item.reservedInScope}</strong>
                </span>
                <span className="text-border/60">|</span>
                <span>
                  {t("preparation.itemsList.coverage")}{" "}
                  <strong className="font-mono font-semibold tabular-nums text-foreground">{t("preparation.itemsList.warehouses", { count: item.warehouseCount })}</strong>
                </span>
              </div>

              {/* Quick transfer */}
              {canPrepare &&
              isShort &&
              preparationSettings.allowCrossWarehouseTransfer ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onQuickTransfer(order.orderNumber, item)}
                    disabled={!selectedWarehouseId || isTransfering}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 transition active:scale-[0.98] hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300 max-sm:min-h-[40px] max-sm:flex-1"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${isTransfering ? "animate-spin" : ""}`}
                    />
                    {t("preparation.itemsList.quickTransfer")}
                  </button>

                  {!selectedWarehouseId ? (
                    <span className="text-xs text-muted-foreground">
                      {t("preparation.itemsList.selectWarehouseHint")}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default PreparationOrderItemsList;
