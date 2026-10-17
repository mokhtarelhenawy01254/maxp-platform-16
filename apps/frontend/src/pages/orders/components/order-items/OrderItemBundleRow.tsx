import React from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { useCurrency } from "../../../../hooks/useCurrency";
import { OrderItem } from "../types";
import {
  QuantityOfferGroup,
  OrderItemMetadata,
} from "./orderItemsTypes";
import {
  getOrderItemMetadata,
  getProductImage,
  normalizeVariantBadges,
} from "./orderItemsHelpers";

interface OrderItemBundleRowProps {
  group: QuantityOfferGroup;
}

export const OrderItemBundleRow: React.FC<OrderItemBundleRowProps> = ({
  group,
}) => {
  const { formatPrice } = useCurrency();

  const renderVariantBadges = (
    item: OrderItem,
    itemMetadata: OrderItemMetadata,
  ) => {
    const variantValues = normalizeVariantBadges(item, itemMetadata);

    return variantValues.color || variantValues.size ? (
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {variantValues.color && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs sm:text-sm font-semibold border border-blue-200 dark:border-blue-800">
            اللون: {variantValues.color}
          </span>
        )}
        {variantValues.size && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-md text-xs sm:text-sm font-semibold border border-purple-200 dark:border-purple-800">
            المقاس: {variantValues.size}
          </span>
        )}
      </div>
    ) : null;
  };

  return (
    <div
      key={group.groupId}
      className="p-6 bg-amber-50/70 dark:bg-amber-950/10"
    >
      <div className="rounded-2xl border border-amber-200 bg-white/80 p-5 shadow-sm dark:border-amber-900/40 dark:bg-gray-900/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                عرض كميات
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {group.offerLabel}
              </span>
              {group.freeShipping ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  شحن مجاني
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium font-mono tabular-nums">
                {group.selectedPieces}/{group.offerQuantity || group.selectedPieces} قطع مختارة
              </span>
              <span>•</span>
              <span>
                إجمالي العرض:{" "}
                <span className="font-bold text-amber-700 dark:text-amber-300 font-mono tabular-nums">
                  {formatPrice(group.total)}
                </span>
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-900/40 dark:bg-amber-900/20">
            <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
              عدد القطع
            </div>
            <div className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-200 font-mono tabular-nums">
              {group.offerQuantity || group.selectedPieces}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {group.items.map(({ item, index, slotIndex }, itemPosition) => {
            const itemMetadata = getOrderItemMetadata(item);
            const productImage = getProductImage(item);
            const lineTotal =
              Number(item.price || 0) * Number(item.quantity || 1);

            return (
              <div
                key={`${group.groupId}-${item.id || item.productId || index}-${slotIndex || index}`}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <PhotoIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {item.productName}
                          </h4>
                          {item.productSku && (
                            <span className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 text-[10px] font-bold font-mono text-blue-600 dark:text-blue-400">
                              {item.productSku}
                            </span>
                          )}
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                            القطعة {slotIndex || itemPosition + 1}
                          </span>
                        </div>
                        <div className="mt-2">
                          {renderVariantBadges(item, itemMetadata)}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          الإجمالي
                        </div>
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                          {formatPrice(lineTotal)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                          الكمية: {item.quantity || 1}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
