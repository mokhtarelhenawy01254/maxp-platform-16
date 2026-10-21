import React from "react";

interface InventoryFilterPanelProps {
  filters: {
    warehouseId: string;
    lowStock: boolean;
    outOfStock: boolean;
  };
  warehouses: { id: string; name: string }[];
  onFilterChange: (filters: {
    warehouseId: string;
    lowStock: boolean;
    outOfStock: boolean;
  }) => void;
  onResetFilters: () => void;
}

export const InventoryFilterPanel: React.FC<InventoryFilterPanelProps> = ({
  filters,
  warehouses,
  onFilterChange,
  onResetFilters,
}) => {
  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4 shadow-2xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            بحث عن منتج
          </label>
          <input
            type="text"
            placeholder="ابحث باسم المنتج أو الـ SKU..."
            className="w-full px-3 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            المستودع
          </label>
          <select
            value={filters.warehouseId}
            onChange={(e) =>
              onFilterChange({ ...filters, warehouseId: e.target.value })
            }
            className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 cursor-pointer transition-all"
          >
            <option value="">جميع المستودعات</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            إعادة تعيين
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(e) =>
              onFilterChange({ ...filters, lowStock: e.target.checked })
            }
            className="rounded border-gray-300 dark:border-gray-600 text-slate-900 focus:ring-slate-500 dark:bg-gray-700"
          />
          <span>مخزون منخفض فقط</span>
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={filters.outOfStock}
            onChange={(e) =>
              onFilterChange({ ...filters, outOfStock: e.target.checked })
            }
            className="rounded border-gray-300 dark:border-gray-600 text-slate-900 focus:ring-slate-500 dark:bg-gray-700"
          />
          <span>نفد المخزون فقط</span>
        </label>
      </div>
    </div>
  );
};
