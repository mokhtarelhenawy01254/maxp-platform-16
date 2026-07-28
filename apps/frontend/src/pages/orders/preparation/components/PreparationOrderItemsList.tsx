import { useTranslation } from "react-i18next";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
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

  return (
    <>
      {/* Section title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {t("preparation.itemsList.title")}
        </h3>
        <span className="text-xs text-gray-400">{t("preparation.itemsList.itemsCount", { count: order.itemInsights.length })}</span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {order.itemInsights.map((item) => {
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
              className={`rounded-xl border p-3 ${
                isShort
                  ? "border-rose-100 bg-rose-50/40"
                  : "border-gray-100 bg-gray-50/60"
              }`}
            >
              {/* Item top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.displayName}
                    </p>
                    {item.color || item.size ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {item.color ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50/60 px-1.5 py-0.5 text-[11px] font-medium text-rose-700">
                            <span className="inline-block h-2 w-2 rounded-full border border-rose-200" style={{
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
                            }} />
                            {item.color}
                          </span>
                        ) : null}
                        {item.size ? (
                          <span className="rounded-md bg-blue-50/60 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                            {item.size}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    {quantityOffer ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {t("preparation.itemsList.quantityOffer")}
                      </span>
                    ) : null}
                    {resolvedSlotIndex ? (
                      <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        {t("preparation.itemsList.slot", { slot: resolvedSlotIndex })}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {t("preparation.itemsList.required", { count: item.quantityNumber })}
                    {item.bestWarehouseName ? ` • ${t("preparation.itemsList.bestWarehouse", { name: item.bestWarehouseName })}` : ""}
                  </p>
                  {quantityOffer?.offerLabel ? (
                    <p className="mt-1 text-xs font-medium text-amber-800">
                      {String(quantityOffer.offerLabel)}
                    </p>
                  ) : null}
                </div>

                {/* Shortage / available badge */}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isShort
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isShort ? t("preparation.itemsList.shortage", { count: item.shortage }) : t("preparation.itemsList.available")}
                </span>
              </div>

              {/* Inventory mini-stats */}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>
                  {t("preparation.itemsList.availableStock")}{" "}
                  <strong className="text-gray-800">{item.availableInScope}</strong>
                </span>
                <span className="text-gray-200">|</span>
                <span>
                  {t("preparation.itemsList.reserved")}{" "}
                  <strong className="text-gray-800">{item.reservedInScope}</strong>
                </span>
                <span className="text-gray-200">|</span>
                <span>
                  {t("preparation.itemsList.coverage")}{" "}
                  <strong className="text-gray-800">{t("preparation.itemsList.warehouses", { count: item.warehouseCount })}</strong>
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition active:scale-95 hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-[40px] max-sm:flex-1"
                  >
                    <ArrowPathIcon
                      className={`h-3.5 w-3.5 ${isTransfering ? "animate-spin" : ""}`}
                    />
                    {t("preparation.itemsList.quickTransfer")}
                  </button>

                  {!selectedWarehouseId ? (
                    <span className="text-xs text-gray-400">
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
