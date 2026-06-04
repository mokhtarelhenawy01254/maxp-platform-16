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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">عناصر الطلب</h3>
        <span className="text-xs text-gray-500">{order.itemInsights.length} عنصر</span>
      </div>

      <div className="space-y-3">
        {order.itemInsights.map((item) => {
          const quantityOffer = getOrderDocumentQuantityOffer(item);
          const slotIndex = Number(quantityOffer?.slotIndex);
          const resolvedSlotIndex =
            Number.isFinite(slotIndex) && slotIndex > 0 ? slotIndex : null;

          return (
            <div
              key={`${order.orderNumber}-${item.id}-${item.productId}`}
              className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900">{item.displayName}</p>
                    {quantityOffer ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                        عرض كميات
                      </span>
                    ) : null}
                    {resolvedSlotIndex ? (
                      <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">
                        القطعة {resolvedSlotIndex}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    مطلوب {item.quantityNumber} قطعة
                    {item.bestWarehouseName ? ` • أفضل توفر: ${item.bestWarehouseName}` : ""}
                  </p>
                  {quantityOffer?.offerLabel ? (
                    <p className="mt-2 text-xs font-medium text-amber-800">
                      {String(quantityOffer.offerLabel)}
                    </p>
                  ) : null}
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    item.shortage > 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {item.shortage > 0 ? `عجز ${item.shortage}` : "متاح بالكامل"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white bg-white px-3 py-2">
                  <p className="text-xs text-gray-500">المتاح</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {item.availableInScope}
                  </p>
                </div>
                <div className="rounded-xl border border-white bg-white px-3 py-2">
                  <p className="text-xs text-gray-500">المحجوز</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {item.reservedInScope}
                  </p>
                </div>
                <div className="rounded-xl border border-white bg-white px-3 py-2">
                  <p className="text-xs text-gray-500">التغطية</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {item.warehouseCount} مخزن
                  </p>
                </div>
              </div>

              {canPrepare &&
              item.shortage > 0 &&
              preparationSettings.allowCrossWarehouseTransfer ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onQuickTransfer(order.orderNumber, item)}
                    disabled={
                      !selectedWarehouseId ||
                      transferingItemKey === `${order.orderNumber}-${item.productId}`
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-amber-800 transition hover:border-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {transferingItemKey === `${order.orderNumber}-${item.productId}` ? (
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowPathIcon className="h-4 w-4" />
                    )}
                    نقل سريع للعجز
                  </button>

                  {!selectedWarehouseId ? (
                    <span className="text-xs text-gray-500">
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
