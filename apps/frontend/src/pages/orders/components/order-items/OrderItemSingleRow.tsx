import React from "react";
import {
  TrashIcon,
  ExclamationCircleIcon,
  MinusIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PhotoIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import { useCurrency } from "../../../../hooks/useCurrency";
import { OrderItem } from "../types";
import { isPostPurchaseOfferItem } from "../../../../utils/postPurchaseOfferBadge";
import {
  OrderItemMetadata,
  QuantityOfferDisplay,
} from "./orderItemsTypes";
import {
  getOrderItemMetadata,
  getProductImage,
  getStockInfo,
  getQuantityOfferSummary,
  normalizeVariantBadges,
} from "./orderItemsHelpers";

interface OrderItemSingleRowProps {
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
  const itemTotal = (item.price || 0) * (item.quantity || 1);
  const hasQuantityError = validationErrors[`quantity_${index}`];
  const hasPriceError = validationErrors[`price_${index}`];
  const quantityOfferSummary = getQuantityOfferSummary(item);

  console.log("[OrderItemsCard] renderSingleItem:", {
    productName: item.productName,
    productSku: item.productSku,
  });

  const renderVariantBadges = () => {
    const variantValues = normalizeVariantBadges(item, itemMetadata);

    if (isEditing) {
      return (
        <div className="flex items-center gap-2 flex-wrap mt-2">
          <div className="flex items-center gap-1.5 bg-blue-50/80 dark:bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">اللون:</span>
            <input
              type="text"
              value={item.productColor ?? variantValues.color ?? ""}
              onChange={(e) => onItemChange(index, "productColor", e.target.value)}
              placeholder="اللون..."
              className="w-24 sm:w-28 px-1.5 py-0.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-blue-300 dark:border-blue-700 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-purple-50/80 dark:bg-purple-900/20 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">المقاس:</span>
            <input
              type="text"
              value={item.productSize != null ? String(item.productSize) : (variantValues.size ?? "")}
              onChange={(e) => onItemChange(index, "productSize", e.target.value)}
              placeholder="المقاس..."
              className="w-20 sm:w-24 px-1.5 py-0.5 text-xs font-semibold bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-purple-300 dark:border-purple-700 rounded focus:ring-1 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>
      );
    }

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

              {renderVariantBadges()}
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

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center sm:items-end mt-3 pt-2 sm:pt-0 border-t border-gray-100 dark:border-gray-800 sm:border-t-0 bg-gray-50/70 dark:bg-gray-800/40 p-2 sm:p-0 rounded-xl sm:bg-transparent sm:dark:bg-transparent">
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:mb-1.5">
                السعر
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="number"
                    value={item.price || 0}
                    onChange={(e) => handlePriceChange(index, e.target.value)}
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    className={`w-full px-2 py-1.5 sm:px-3 sm:py-2 border rounded-lg text-xs sm:text-sm font-semibold font-mono tabular-nums dark:bg-gray-700 dark:text-gray-100 ${
                      hasPriceError
                        ? "border-red-500 dark:border-red-400"
                        : "border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    }`}
                  />
                  {hasPriceError && (
                    <p className="mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <ExclamationCircleIcon className="w-3 h-3" />
                      {hasPriceError}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-base font-bold text-gray-900 dark:text-gray-100 font-mono tabular-nums">
                  {formatPrice(item.price || 0)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:mb-1.5">
                الكمية
              </label>
              {isEditing ? (
                <div>
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        decrementQuantity(index, item.quantity || 1)
                      }
                      disabled={item.quantity <= 1}
                      className="p-1 sm:p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md sm:rounded-lg transition-colors"
                    >
                      <MinusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-300" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity || 1}
                      onChange={(e) =>
                        handleQuantityChange(
                          index,
                          parseInt(e.target.value) || 1,
                        )
                      }
                      min="1"
                      max="9999"
                      className={`w-10 sm:w-16 px-1 py-1.5 sm:px-2 sm:py-2 border rounded-md sm:rounded-lg text-center text-xs sm:text-sm font-bold font-mono tabular-nums dark:bg-gray-700 dark:text-gray-100 ${
                        hasQuantityError
                          ? "border-red-500 dark:border-red-400"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        incrementQuantity(index, item.quantity || 1)
                      }
                      className="p-1 sm:p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md sm:rounded-lg transition-colors"
                    >
                      <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                  {hasQuantityError && (
                    <p className="mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400 flex items-center gap-1 justify-center">
                      <ExclamationCircleIcon className="w-3 h-3" />
                      {hasQuantityError}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-base font-bold text-gray-900 dark:text-gray-100 font-mono tabular-nums">
                  {item.quantity || 1}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:mb-1.5">
                الإجمالي
              </label>
              <p className="text-xs sm:text-lg font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                {formatPrice(itemTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
