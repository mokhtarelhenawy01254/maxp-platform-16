import React from "react";
import {
  CubeIcon,
  EyeIcon,
  ArrowPathIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import { useDateFormat } from "../../../../hooks/useDateFormat";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { InventoryItem } from "./types";

interface InventoryItemsTableProps {
  inventory: InventoryItem[];
  onViewDetails: (item: InventoryItem) => void;
  onOpenTransfer: (item: InventoryItem) => void;
  onOpenSupply: (item: InventoryItem) => void;
  onOpenDispense: (item: InventoryItem) => void;
}

export const InventoryItemsTable: React.FC<InventoryItemsTableProps> = ({
  inventory,
  onViewDetails,
  onOpenTransfer,
  onOpenSupply,
  onOpenDispense,
}) => {
  const { formatDate } = useDateFormat();
  const { formatPrice } = useCurrency();

  const getStockStatus = (item: InventoryItem) => {
    if (item.available === 0) {
      return {
        status: "نفد المخزون",
        color:
          "text-rose-700 bg-rose-50 border border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-300",
        dot: "bg-rose-500",
      };
    }

    if (item.available <= (item.reorderPoint || 0)) {
      return {
        status: "مخزون منخفض",
        color:
          "text-amber-700 bg-amber-50 border border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300",
        dot: "bg-amber-500",
      };
    }

    return {
      status: "متوفر",
      color:
        "text-emerald-700 bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-2xs rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-800">
      {/* Mobile View (< sm:) */}
      <div className="block sm:hidden divide-y divide-gray-100 dark:divide-gray-700/60 p-3 space-y-3">
        {inventory.map((item) => {
          const stockStatus = getStockStatus(item);
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800/90 rounded-xl p-3.5 border border-gray-200/80 dark:border-gray-700/60 space-y-2.5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                    {item.productName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.sku && (
                      <span dir="ltr" className="font-mono text-[11px] tabular-nums">
                        {item.sku}
                      </span>
                    )}
                    <span>•</span>
                    <span>{item.warehouseName}</span>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${stockStatus.color}`}
                >
                  {stockStatus.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-700/40 p-2.5 rounded-lg text-center">
                <div>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">الإجمالي</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums font-mono">
                    {item.quantity}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">المتاح</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                    {item.available}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">السعر</span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums font-mono">
                    {formatPrice(item.price)}
                  </span>
                  {item.cost !== undefined && item.cost !== null && item.cost > 0 ? (
                    <span className="block text-[10px] text-gray-400 dark:text-gray-500 tabular-nums font-mono">
                      تكلفة: {formatPrice(item.cost)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-gray-400 dark:text-gray-500 text-[11px] tabular-nums font-mono">
                  {item.batchNumber ? `دفعة: ${item.batchNumber}` : "بدون دفعة"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewDetails(item)}
                    className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer"
                    title="تفاصيل"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  {item.canEditStock !== false && (
                    <>
                      <button
                        type="button"
                        onClick={() => onOpenTransfer(item)}
                        className="p-1.5 rounded-lg text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 cursor-pointer"
                        title="نقل"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenSupply(item)}
                        className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 cursor-pointer"
                        title="توريد"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDispense(item)}
                        className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 cursor-pointer"
                        title="صرف"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table (sm: and above) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50/80 dark:bg-gray-900/80">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                المنتج / SKU
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                المستودع
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                الدفعة / الصلاحية
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                الكمية
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                المتاح
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                الحالة
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                السعر
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                الإجراءات
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/60 dark:bg-gray-800/60 divide-y divide-gray-200 dark:divide-gray-700">
            {inventory.map((item) => {
              const stockStatus = getStockStatus(item);

              return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800/80 last:border-0"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                      {item.productName}
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 font-mono tabular-nums">
                      {item.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                    <div>{item.warehouseName}</div>
                    {item.stockLocationLabel && (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">
                        {item.stockLocationLabel}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                    <div>{item.batchNumber || "---"}</div>
                    {item.expiryDate && (
                      <div className="text-[10px] text-rose-500">
                        {formatDate(item.expiryDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white font-mono tabular-nums font-bold">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-semibold">
                    {item.available}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${stockStatus.color}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${stockStatus.dot}`} />
                      {stockStatus.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white font-mono tabular-nums font-semibold">
                    <div>{formatPrice(item.price)}</div>
                    {item.cost !== undefined && item.cost !== null && item.cost > 0 ? (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 font-normal">
                        تكلفة: {formatPrice(item.cost)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                    <div className="flex items-center space-x-1.5 space-x-reverse">
                      <button
                        type="button"
                        onClick={() => onViewDetails(item)}
                        className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
                        title="عرض التفاصيل"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {item.canEditStock !== false && (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenTransfer(item)}
                            className="p-1.5 text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                            title="نقل مخزن"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenSupply(item)}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                            title="توريد"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDispense(item)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                            title="صرف"
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inventory.length === 0 && (
        <div className="text-center py-16">
          <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-2 text-base font-bold text-gray-900 dark:text-white">
            لا توجد بيانات مخزون حالياً
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            ابدأ بإضافة منتجاتك أو سجل كميات المخزون المتاحة.
          </p>
        </div>
      )}
    </div>
  );
};
