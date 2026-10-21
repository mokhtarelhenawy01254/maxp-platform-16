import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type {
  StockUpdateState,
  InventoryItem,
  StockMovementType,
  StockMovementReason,
} from "./types";

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockUpdate: StockUpdateState;
  onStockUpdateChange: (update: StockUpdateState) => void;
  onSubmit: () => void;
  inventoryProductOptions: InventoryItem[];
  warehouses: { id: string; name: string }[];
}

export const StockUpdateModal: React.FC<StockUpdateModalProps> = ({
  isOpen,
  onClose,
  stockUpdate,
  onStockUpdateChange,
  onSubmit,
  inventoryProductOptions,
  warehouses,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 sm:p-6 w-full max-w-lg border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            تحديث المخزون
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
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              المنتج *
            </label>
            <select
              value={stockUpdate.productId}
              onChange={(e) =>
                onStockUpdateChange({
                  ...stockUpdate,
                  productId: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="">اختر المنتج</option>
              {inventoryProductOptions.map((item) => (
                <option key={item.productId} value={item.productId}>
                  {item.productName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                المستودع *
              </label>
              <select
                value={stockUpdate.warehouseId}
                onChange={(e) =>
                  onStockUpdateChange({
                    ...stockUpdate,
                    warehouseId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                disabled={warehouses.length === 0}
              >
                {warehouses.length === 0 ? (
                  <option value="">لا توجد مخازن متاحة</option>
                ) : (
                  warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                نوع الحركة
              </label>
              <select
                value={stockUpdate.type}
                onChange={(e) =>
                  onStockUpdateChange({
                    ...stockUpdate,
                    type: e.target.value as StockMovementType,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="IN">إدخال (توريد)</option>
                <option value="OUT">إخراج (صرف)</option>
                <option value="ADJUSTMENT_IN">تعديل إضافة</option>
                <option value="ADJUSTMENT_OUT">تعديل سحب</option>
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
                value={stockUpdate.quantity}
                onChange={(e) =>
                  onStockUpdateChange({
                    ...stockUpdate,
                    quantity: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white tabular-nums font-mono"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                السبب
              </label>
              <select
                value={stockUpdate.reason}
                onChange={(e) =>
                  onStockUpdateChange({
                    ...stockUpdate,
                    reason: e.target.value as StockMovementReason,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              >
                <option value="PURCHASE">شراء</option>
                <option value="SALE">بيع</option>
                <option value="ADJUSTMENT">تعديل</option>
                <option value="DAMAGE">تلف</option>
                <option value="RETURN">مرتجع</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                رقم الدفعة (Batch)
              </label>
              <input
                type="text"
                value={stockUpdate.batchNumber}
                onChange={(e) =>
                  onStockUpdateChange({
                    ...stockUpdate,
                    batchNumber: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white tabular-nums font-mono"
                placeholder="رقم الدفعة أو Lot"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                تاريخ الصلاحية
              </label>
              <input
                type="date"
                value={stockUpdate.expiryDate}
                onChange={(e) =>
                  onStockUpdateChange({
                    ...stockUpdate,
                    expiryDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center cursor-pointer bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800">
              <input
                type="checkbox"
                checked={!stockUpdate.isApproved}
                onChange={(e) =>
                  onStockUpdateChange({
                    ...stockUpdate,
                    isApproved: !e.target.checked,
                  })
                }
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700"
              />
              <span className="mr-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
                يتطلب موافقة المدير (حفظ كمسودة)
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              المرجع
            </label>
            <input
              type="text"
              value={stockUpdate.reference}
              onChange={(e) =>
                onStockUpdateChange({
                  ...stockUpdate,
                  reference: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="رقم الطلب أو إذن الاستلام"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات
            </label>
            <textarea
              value={stockUpdate.notes}
              onChange={(e) =>
                onStockUpdateChange({ ...stockUpdate, notes: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="ملاحظات إضافية..."
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
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
          >
            تحديث المخزون
          </button>
        </div>
      </div>
    </div>
  );
};
