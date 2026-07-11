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
  const canPrepare = order.merchantFulfillment?.canPrepare !== false;

  return (
    <>
      {/* Section title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          عناصر الطلب
        </h3>
        <span className="text-xs text-gray-400">{order.itemInsights.length} عنصر</span>
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
                    {quantityOffer ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        عرض كميات
                      </span>
                    ) : null}
                    {resolvedSlotIndex ? (
                      <span className="rounded-full border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        قطعة {resolvedSlotIndex}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    مطلوب {item.quantityNumber} قطعة
                    {item.bestWarehouseName ? ` • أفضل توفر: ${item.bestWarehouseName}` : ""}
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
                  {isShort ? `عجز ${item.shortage}` : "متاح ✓"}
                </span>
              </div>

              {/* Inventory mini-stats */}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                <span>
                  متاح:{" "}
                  <strong className="text-gray-800">{item.availableInScope}</strong>
                </span>
                <span className="text-gray-200">|</span>
                <span>
                  محجوز:{" "}
                  <strong className="text-gray-800">{item.reservedInScope}</strong>
                </span>
                <span className="text-gray-200">|</span>
                <span>
                  تغطية:{" "}
                  <strong className="text-gray-800">{item.warehouseCount} مخزن</strong>
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowPathIcon
                      className={`h-3.5 w-3.5 ${isTransfering ? "animate-spin" : ""}`}
                    />
                    نقل سريع للعجز
                  </button>

                  {!selectedWarehouseId ? (
                    <span className="text-xs text-gray-400">
                      حدّد مخزن الوجهة من الفلاتر أولًا لتفعيل النقل
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
