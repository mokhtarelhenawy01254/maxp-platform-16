import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { SHORTAGE_REASON_OPTIONS, STAGE_DEFINITIONS } from "../constants";
import type {
  ShortageFollowUpFilter,
  ShortageReasonFilter,
  StageCounts,
  StageFilter,
  StockFilter,
  WarehouseOption,
} from "../types";

interface PreparationFiltersProps {
  activeStage: StageFilter;
  stageCounts: StageCounts;
  visibleOrdersCount: number;
  search: string;
  selectedWarehouseId: string;
  stockFilter: StockFilter;
  shortageReasonFilter: ShortageReasonFilter;
  shortageOwnerFilter: string;
  shortageOwnerOptions: string[];
  shortageFollowUpFilter: ShortageFollowUpFilter;
  warehouses: WarehouseOption[];
  onActiveStageChange: (stage: StageFilter) => void;
  onSearchChange: (value: string) => void;
  onSelectedWarehouseChange: (value: string) => void;
  onStockFilterChange: (value: StockFilter) => void;
  onShortageReasonFilterChange: (value: ShortageReasonFilter) => void;
  onShortageOwnerFilterChange: (value: string) => void;
  onShortageFollowUpFilterChange: (value: ShortageFollowUpFilter) => void;
}

const PreparationFilters = ({
  activeStage,
  stageCounts,
  visibleOrdersCount,
  search,
  selectedWarehouseId,
  stockFilter,
  shortageReasonFilter,
  shortageOwnerFilter,
  shortageOwnerOptions,
  shortageFollowUpFilter,
  warehouses,
  onActiveStageChange,
  onSearchChange,
  onSelectedWarehouseChange,
  onStockFilterChange,
  onShortageReasonFilterChange,
  onShortageOwnerFilterChange,
  onShortageFollowUpFilterChange,
}: PreparationFiltersProps) => {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              فلترة رحلة التجهيز
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              اختَر المرحلة، المخزن، أو حالة المخزون للوصول السريع للطلبات
              التي يحتاجها فريق المخزن الآن.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-semibold">{visibleOrdersCount}</span> طلب ظاهر
            في هذه المرحلة
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onActiveStageChange("ALL")}
            className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
              activeStage === "ALL"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
            }`}
          >
            الكل ({stageCounts.ALL})
          </button>

          {STAGE_DEFINITIONS.map((stage) => (
            <button
              key={stage.key}
              onClick={() => onActiveStageChange(stage.key)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                activeStage === stage.key
                  ? `${stage.colorClass} border-current`
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
              }`}
              title={stage.description}
            >
              {stage.label} ({stageCounts[stage.key]})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
          <label className="xl:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              بحث سريع
            </span>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="رقم الطلب، اسم العميل، الهاتف، المنتج..."
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-4 pr-10 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white"
              />
            </div>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              المخزن
            </span>
            <select
              value={selectedWarehouseId}
              onChange={(event) => onSelectedWarehouseChange(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white"
            >
              <option value="">كل المخازن</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              حالة المخزون
            </span>
            <select
              value={stockFilter}
              onChange={(event) =>
                onStockFilterChange(event.target.value as StockFilter)
              }
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white"
            >
              <option value="all">الكل</option>
              <option value="ready">جاهزة بالكامل</option>
              <option value="shortage">بها نواقص</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              سبب العجز
            </span>
            <select
              value={shortageReasonFilter}
              onChange={(event) =>
                onShortageReasonFilterChange(
                  event.target.value as ShortageReasonFilter,
                )
              }
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white"
            >
              <option value="all">كل الأسباب</option>
              {SHORTAGE_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              مسؤول المتابعة
            </span>
            <input
              list="preparation-shortage-owners"
              value={shortageOwnerFilter}
              onChange={(event) => onShortageOwnerFilterChange(event.target.value)}
              placeholder="كل المسؤولين"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white"
            />
            <datalist id="preparation-shortage-owners">
              {shortageOwnerOptions.map((owner) => (
                <option key={owner} value={owner} />
              ))}
            </datalist>
          </label>

          <label>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              موعد المتابعة
            </span>
            <select
              value={shortageFollowUpFilter}
              onChange={(event) =>
                onShortageFollowUpFilterChange(
                  event.target.value as ShortageFollowUpFilter,
                )
              }
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-amber-400 focus:bg-white"
            >
              <option value="all">كل المواعيد</option>
              <option value="today">متابعة اليوم</option>
              <option value="overdue">متأخرة</option>
              <option value="without_date">بدون موعد</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
};

export default PreparationFilters;
