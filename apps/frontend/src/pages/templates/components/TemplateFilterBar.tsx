import React from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import type {
  FilterChip,
  SortMode,
  TemplateScopeConfig,
  StatusWithTemplate,
  TabDef,
  TemplateSlot,
} from "../types";

export interface TemplateFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeChip: FilterChip;
  setActiveChip: (chip: FilterChip) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  showInternal: boolean;
  setShowInternal: (show: boolean) => void;
  internalCount: number;
  config: TemplateScopeConfig;
  activeTabDef?: TabDef;
  activeTab: string;
  filteredStatuses: StatusWithTemplate[];
  visibleStatuses: StatusWithTemplate[];
  topCreateEvent: string;
  setTopCreateEvent: (event: string) => void;
  handleTopCreate: (slot: TemplateSlot) => void;
  noun: { singular: string; plural: string };
  t: (key: string, fallback: string) => string;
}

export default function TemplateFilterBar({
  searchQuery,
  setSearchQuery,
  activeChip,
  setActiveChip,
  sortMode,
  setSortMode,
  showInternal,
  setShowInternal,
  internalCount,
  config,
  activeTabDef,
  activeTab,
  filteredStatuses,
  visibleStatuses,
  topCreateEvent,
  setTopCreateEvent,
  handleTopCreate,
  noun,
  t,
}: TemplateFilterBarProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الكود..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pe-9 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <svg
            className="absolute end-3 top-2.5 h-4 w-4 text-slate-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>

        {config.features.enableFilterChips && (
          <div className="flex flex-wrap items-center gap-1">
            {([
              { key: "all", labelKey: "orders.statusChips.all", label: "الكل" },
              { key: "custom", labelKey: "orders.statusChips.custom", label: "مخصصة" },
              { key: "meta_bound", labelKey: "orders.statusChips.metaBound", label: "مربوطة بميتا" },
              { key: "no_template", labelKey: "orders.statusChips.noTemplate", label: "بدون قالب" },
              { key: "disabled", labelKey: "orders.statusChips.disabled", label: "متوقفة" },
            ] as const).map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setActiveChip(chip.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeChip === chip.key
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {t(chip.labelKey, chip.label)}
              </button>
            ))}
          </div>
        )}

        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {config.features.sortModes.includes("statusType") && <option value="statusType">حسب التبويب</option>}
          {config.features.sortModes.includes("alphabetical") && <option value="alphabetical">أبجدي</option>}
          {config.features.sortModes.includes("recent") && <option value="recent">آخر تعديل</option>}
        </select>

        {config.features.enableInternalToggle && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              checked={showInternal}
              onChange={(e) => setShowInternal(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            عرض الحالات الداخلية ({internalCount})
          </label>
        )}
      </div>

      {config.scope === "customers" && activeTabDef?.kind === "list" && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-2">
            {filteredStatuses.length > 0 ? (
              <select
                value={topCreateEvent || filteredStatuses[0]?.code || ""}
                onChange={(e) => setTopCreateEvent(e.target.value)}
                aria-label="نوع الحدث"
                className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                {filteredStatuses.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} {s.hasTemplate || s.hasMetaTemplate ? "— به قالب" : "— بدون قالب"}
                  </option>
                ))}
                {activeTab === "occasions" && (
                  <option value="__new_occasion__">＋ مناسبة جديدة…</option>
                )}
                {activeTab === "products" && (
                  <option value="__new_product__">＋ قالب منتج جديد…</option>
                )}
              </select>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {activeTab === "occasions"
                  ? "لا توجد مناسبات بعد — أنشئ أول مناسبة"
                  : activeTab === "products"
                    ? "لا توجد قوالب منتجات بعد"
                    : "لا توجد أحداث في هذا التبويب"}
              </span>
            )}
            <button
              type="button"
              disabled={filteredStatuses.length === 0 && !topCreateEvent}
              onClick={() => handleTopCreate("meta")}
              title="تأليف قالب وإرساله لميتا للمراجعة والاعتماد"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-4 w-4" />
              إنشاء قالب ميتا
            </button>
            <button
              type="button"
              disabled={filteredStatuses.length === 0 && !topCreateEvent}
              onClick={() => handleTopCreate("regular")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-indigo-800/40 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
            >
              <PlusIcon className="h-4 w-4" />
              إنشاء قالب عادي
            </button>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {visibleStatuses.length} {noun.plural} في هذا التبويب
          </span>
        </div>
      )}
    </>
  );
}
