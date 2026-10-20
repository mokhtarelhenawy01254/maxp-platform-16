import React from "react";
import {
  MinusIcon,
  PlusIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import type { OrderItem } from "../types";

export interface OrderItemPriceQtyFieldsProps {
  item: OrderItem;
  index: number;
  isEditing: boolean;
  validationErrors: { [key: string]: string };
  handlePriceChange: (index: number, value: string) => void;
  handleQuantityChange: (index: number, value: number) => void;
  incrementQuantity: (index: number, currentQty: number) => void;
  decrementQuantity: (index: number, currentQty: number) => void;
  formatPrice: (amount: number) => string;
}

export const OrderItemPriceQtyFields: React.FC<OrderItemPriceQtyFieldsProps> = ({
  item,
  index,
  isEditing,
  validationErrors,
  handlePriceChange,
  handleQuantityChange,
  incrementQuantity,
  decrementQuantity,
  formatPrice,
}) => {
  const itemTotal = (item.price || 0) * (item.quantity || 1);
  const hasQuantityError = validationErrors[`quantity_${index}`];
  const hasPriceError = validationErrors[`price_${index}`];

  return (
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
                disabled={(item.quantity || 1) <= 1}
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
  );
};
