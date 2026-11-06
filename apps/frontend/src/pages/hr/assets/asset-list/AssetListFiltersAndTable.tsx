import React from "react";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import {
  AssetCategoryOption,
  AssetItemRecord,
  AssetListFiltersState,
  AssigningAssetState,
} from "./types";
import { getAssetStatusClassName, getAssetStatusLabel } from "./helpers";

interface AssetListFiltersAndTableProps {
  assets: AssetItemRecord[];
  loading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  filters: AssetListFiltersState;
  onFiltersChange: (filters: AssetListFiltersState) => void;
  categories: AssetCategoryOption[];
  selectedIds: string[];
  onSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  formatPrice: (val: number | string) => string;
  onAssignAsset: (asset: AssigningAssetState) => void;
  onCloneAsset: (id: string) => void;
  onEditAsset: (asset: AssetItemRecord) => void;
  onDeleteAsset: (id: string) => void;
}

export const AssetListFiltersAndTable: React.FC<
  AssetListFiltersAndTableProps
> = ({
  assets,
  loading,
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  categories,
  selectedIds,
  onSelectAll,
  onToggleSelect,
  formatPrice,
  onAssignAsset,
  onCloneAsset,
  onEditAsset,
  onDeleteAsset,
}) => {
  return (
    <>
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 md:space-x-reverse">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pr-10 pl-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              placeholder="بحث بالاسم، الكود، الرقم التسلسلي..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <div className="flex space-x-2 space-x-reverse">
            <select
              value={filters.status}
              onChange={(e) =>
                onFiltersChange({ ...filters, status: e.target.value })
              }
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع الحالات</option>
              <option value="AVAILABLE">متاح</option>
              <option value="IN_USE">في الاستخدام</option>
              <option value="MAINTENANCE">في الصيانة</option>
              <option value="RETIRED">تالف/مكهن</option>
              <option value="LOST">مفقود</option>
            </select>

            <select
              value={filters.categoryId}
              onChange={(e) =>
                onFiltersChange({ ...filters, categoryId: e.target.value })
              }
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">جميع التصنيفات</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-right w-12">
                <input
                  type="checkbox"
                  checked={
                    assets.length > 0 && selectedIds.length === assets.length
                  }
                  onChange={onSelectAll}
                  className="h-4 w-4 rounded border-white/30 text-violet-400 focus:ring-violet-400 focus:ring-offset-0 bg-white/10 cursor-pointer"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                الأصل
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                التصنيف
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                الحالة
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                العهدة الحالية
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-bold text-white uppercase tracking-wider"
              >
                القيمة
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                  </div>
                </td>
              </tr>
            ) : assets.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {search || filters.status || filters.categoryId
                    ? "لا توجد نتائج مطابقة للبحث/الفلاتر"
                    : "لا توجد أصول مسجلة حالياً"}
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <tr
                    key={asset.id}
                    className={`transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? "bg-violet-50/70 dark:bg-violet-900/20 ring-1 ring-inset ring-violet-200 dark:ring-violet-700/30"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest("button, input, a")
                      ) {
                        return;
                      }
                      onToggleSelect(asset.id);
                    }}
                  >
                    <td
                      className="px-4 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(asset.id)}
                        className="h-4 w-4 rounded border-border/70 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-2 text-sm leading-tight">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {asset.name}
                        </span>
                        {asset.code && (
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs text-gray-700 dark:text-gray-200 font-mono tabular-nums">
                            {asset.code}
                          </span>
                        )}
                        {asset.model && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {asset.model}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {asset.category?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAssetStatusClassName(asset.status)}`}
                      >
                        {getAssetStatusLabel(asset.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {asset.currentHolder ? (
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold ml-2">
                            {asset.currentHolder.firstName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">
                              {asset.currentHolder.firstName}{" "}
                              {asset.currentHolder.lastName}
                            </div>
                            <div className="text-xs font-mono tabular-nums">
                              {asset.currentHolder.employeeNumber}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono tabular-nums">
                      {asset.purchaseValue
                        ? formatPrice(asset.purchaseValue)
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2 space-x-reverse">
                        {asset.status === "AVAILABLE" ? (
                          <button
                            onClick={() =>
                              onAssignAsset({ ...asset, type: "assign" })
                            }
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 bg-indigo-50 dark:bg-indigo-900/40 p-1.5 rounded-xl hover:bg-indigo-100 transition-all"
                            title="تسليم عهدة"
                          >
                            <UserPlusIcon className="h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onAssignAsset({ ...asset, type: "return" })
                            }
                            className="text-orange-600 dark:text-orange-400 hover:text-orange-900 bg-orange-50 dark:bg-orange-900/40 p-1.5 rounded-xl hover:bg-orange-100 transition-all"
                            title="استرجاع عهدة"
                          >
                            <ArrowUturnLeftIcon className="h-5 w-5" />
                          </button>
                        )}

                        <button
                          onClick={() => onCloneAsset(asset.id)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 bg-amber-50 dark:bg-amber-900/40 p-1.5 rounded-xl hover:bg-amber-100 transition-all"
                          title="استنساخ"
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => onEditAsset(asset)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 bg-blue-50 dark:bg-blue-900/40 p-1.5 rounded-xl hover:bg-blue-100 transition-all"
                          title="تعديل"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() => onDeleteAsset(asset.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 bg-red-50 dark:bg-red-900/40 p-1.5 rounded-xl hover:bg-red-100 transition-all"
                          title="حذف"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
