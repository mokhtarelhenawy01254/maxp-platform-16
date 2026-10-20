import React from "react";
import {
  TrashIcon,
  EllipsisVerticalIcon,
  PhotoIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { OrderItem } from "../types";
import { isPostPurchaseOfferItem } from "../../../../utils/postPurchaseOfferBadge";
import {
  getOrderItemMetadata,
  getProductImage,
  getStockInfo,
  getQuantityOfferSummary,
} from "./orderItemsHelpers";
import { OrderItemVariantBadges } from "./OrderItemVariantBadges";
import { OrderItemPriceQtyFields } from "./OrderItemPriceQtyFields";

export interface OrderItemSingleRowProps {
  item: OrderItem;
  index: number;
  isEditing: boolean;
  openMenuIndex: number | null;
  setOpenMenuIndex: (index: number | null) => void;
  validationErrors: { [key: string]: string };
  onItemChange: (index: number, field: string, value: unknown) => void;
  handlePriceChange: (index: number, value: string) => void;
  handleQuantityChange: (index: number, value: number) => void;
  incrementQuantity: (index: number, currentQty: number) => void;
  decrementQuantity: (index: number, currentQty: number) => void;
  handleDeleteClick: (index: number, item: OrderItem) => void;
}

export const OrderItemSingleRow: React.FC<OrderItemSingleRowProps> = ({
  item,
  index,
  isEditing,
  openMenuIndex,
  setOpenMenuIndex,
  validationErrors,
  onItemChange,
  handlePriceChange,
  handleQuantityChange,
  incrementQuantity,
  decrementQuantity,
  handleDeleteClick,
}) => {
  const { formatPrice } = useCurrency();
  const itemMetadata = getOrderItemMetadata(item);
  const productImage = getProductImage(item);
  const stockInfo = getStockInfo(item);
  const quantityOfferSummary = getQuantityOfferSummary(item);

  return (
    <div
      key={`${item.id || item.productId || "item"}-${index}`}
      className="p-3.5 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            {productImage ? (
              <img
                src={productImage}
                alt={item.productName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PhotoIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
                  {item.productName}
                </h4>
                {isPostPurchaseOfferItem(item) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 shadow-xs">
                    <GiftIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>عرض بعد الشراء</span>
                    {item.originalPrice && Number(item.originalPrice) > Number(item.price) && (
                      <span className="font-normal text-[11px] opacity-80 font-mono tabular-nums">
                        (سعر العرض {item.price} بدلاً من {item.originalPrice})
                      </span>
                    )}
                  </span>
                )}
              </div>

              {item.productSku && (
                <div className="inline-flex items-center gap-1.5 rounded bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 mb-2">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">SKU</span>
                  <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300">
                    {item.productSku}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                {stockInfo.stock > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      stockInfo.status === "available"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : stockInfo.status === "low"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        stockInfo.status === "available"
                          ? "bg-emerald-500"
                          : stockInfo.status === "low"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                    />
                    <span>
                      {stockInfo.status === "available"
                        ? "متوفر"
                        : stockInfo.status === "low"
                          ? `متبقي ${stockInfo.stock}`
                          : "نفذ"}
                    </span>
                  </span>
                )}
              </div>

              {quantityOfferSummary ? (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs sm:text-sm font-semibold text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                    عرض كميات
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs sm:text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {quantityOfferSummary.offerLabel}
                  </span>
                  {quantityOfferSummary.freeShipping ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs sm:text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                      شحن مجاني
                    </span>
                  ) : null}
                </div>
              ) : null}

              <OrderItemVariantBadges
                item={item}
                itemMetadata={itemMetadata}
                index={index}
                isEditing={isEditing}
                onItemChange={onItemChange}
              />
            </div>

            {isEditing && (
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenuIndex(openMenuIndex === index ? null : index)
                  }
                  className="p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>

                {openMenuIndex === index && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenMenuIndex(null)}
                    />
                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(index, item)}
                        className="w-full px-4 py-2 text-right text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>حذف المنتج</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <OrderItemPriceQtyFields
            item={item}
            index={index}
            isEditing={isEditing}
            validationErrors={validationErrors}
            handlePriceChange={handlePriceChange}
            handleQuantityChange={handleQuantityChange}
            incrementQuantity={incrementQuantity}
            decrementQuantity={decrementQuantity}
            formatPrice={formatPrice}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderItemSingleRow;
