import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { TransferDataState, InventoryItem } from "./types";

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transferData: TransferDataState;
  onTransferDataChange: (data: TransferDataState) => void;
  onSubmit: () => void;
  inventory: InventoryItem[];
  warehouses: { id: string; name: string }[];
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  transferData,
  onTransferDataChange,
  onSubmit,
  inventory,
  warehouses,
}) => {
  if (!isOpen) return null;

  const currentAvailable =
    inventory.find(
      (i) =>
        i.productId === transferData.productId &&
        i.warehouseId === transferData.fromWarehouseId,
    )?.available || 0;

  const fromWarehouseName =
    inventory.find(
      (i) => i.warehouseId === transferData.fromWarehouseId,
    )?.warehouseName || "";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            نقل مخزون بين المستودعات
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl text-xs text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            سيتم نقل الكمية المحددة من مستودع المصدر إلى مستودع الوجهة بشكل مباشر.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                من مستودع
              </label>
              <input
                type="text"
                value={fromWarehouseName}
                disabled
                className="w-full px-3 py-2 text-sm border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                إلى مستودع *
              </label>
              <select
                value={transferData.toWarehouseId}
                onChange={(e) =>
                  onTransferDataChange({
                    ...transferData,
                    toWarehouseId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="">اختر الوجهة</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                الكمية *
              </label>
              <input
                type="number"
                value={transferData.quantity}
                onChange={(e) =>
                  onTransferDataChange({
                    ...transferData,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white tabular-nums font-mono"
                max={currentAvailable}
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                الدفعة (Batch)
              </label>
              <input
                type="text"
                value={transferData.batchNumber}
                disabled
                className="w-full px-3 py-2 text-sm border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg tabular-nums font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات التحويل
            </label>
            <textarea
              value={transferData.notes}
              onChange={(e) =>
                onTransferDataChange({
                  ...transferData,
                  notes: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="ملاحظات التحويل..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="px-5 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-sm transition-all cursor-pointer"
          >
            بدء النقل
          </button>
        </div>
      </div>
    </div>
  );
};
