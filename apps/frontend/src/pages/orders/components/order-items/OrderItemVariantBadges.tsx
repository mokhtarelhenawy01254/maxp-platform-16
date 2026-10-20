import React from "react";
import type { OrderItem } from "../types";
import type { OrderItemMetadata } from "./orderItemsTypes";
import { normalizeVariantBadges } from "./orderItemsHelpers";

export interface OrderItemVariantBadgesProps {
  item: OrderItem;
  itemMetadata: OrderItemMetadata;
  index: number;
  isEditing: boolean;
  onItemChange: (index: number, field: string, value: unknown) => void;
}

export const OrderItemVariantBadges: React.FC<OrderItemVariantBadgesProps> = ({
  item,
  itemMetadata,
  index,
  isEditing,
  onItemChange,
}) => {
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
