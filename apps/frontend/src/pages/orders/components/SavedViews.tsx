import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BookmarkIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import type { OrdersFilters } from "../Orders";

export interface SavedOrderView {
  id: string;
  name: string;
  filters: Partial<OrdersFilters>;
  createdAt: number;
}

interface SavedViewsProps {
  filters: OrdersFilters;
  onApplyFilters: (next: Partial<OrdersFilters>) => void;
}

const STORAGE_KEY = "orders:list:saved-views:v1";

const readStored = (): SavedOrderView[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Which filter keys are meaningful to persist in a saved view.
const PERSISTABLE_KEYS: (keyof OrdersFilters)[] = [
  "status",
  "paymentStatus",
  "sourceType",
  "merchantId",
  "affiliateId",
  "fulfillmentSource",
  "merchantOperationStatus",
  "merchantSettlementStatus",
  "search",
  "startDate",
  "endDate",
  "extractionMethod",
  "minConfidence",
  "onlyUnseen",
  "timeRange",
];

const extractPersistable = (filters: OrdersFilters): Partial<OrdersFilters> => {
  const out: Partial<OrdersFilters> = {};
  for (const key of PERSISTABLE_KEYS) {
    const value = filters[key];
    if (Array.isArray(value)) {
      if (value.length > 0) (out as Record<string, unknown>)[key] = value;
    } else if (value) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
};

export const SavedViews: React.FC<SavedViewsProps> = ({ filters, onApplyFilters }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedOrderView[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setViews(readStored());
  }, []);

  const hasActiveFilters = useMemo(() => {
    const p = extractPersistable(filters);
    return Object.keys(p).length > 0;
  }, [filters]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const payload = extractPersistable(filters);
    if (Object.keys(payload).length === 0) return;
    const next: SavedOrderView[] = [
      ...views,
      { id: `${Date.now()}`, name: trimmed, filters: payload, createdAt: Date.now() },
    ];
    setViews(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setName("");
  };

  const remove = (id: string) => {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const apply = (view: SavedOrderView) => {
    onApplyFilters(view.filters);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-expanded={open}
        title={String(t("orders.savedViews"))}
        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-blue-700 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-200"
      >
        <BookmarkIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{t("orders.savedViews")}</span>
        {views.length > 0 && (
          <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[11px] font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
            {views.length}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="z-50 w-72 border border-slate-200/80 bg-white p-2 shadow-lg dark:border-slate-700/80 dark:bg-slate-900"
      >
        <div className="max-h-[360px] overflow-y-auto p-2">
          <div className="mb-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("orders.savedViews")}
          </div>

          {views.length === 0 && (
            <p className="px-1.5 py-2 text-xs text-slate-500 dark:text-slate-400">
              {t("orders.noSavedViews")}
            </p>
          )}

          {views.map((view) => (
            <div
              key={view.id}
              className="group flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800/60"
            >
              <button
                type="button"
                onClick={() => apply(view)}
                className="min-w-0 flex-1 truncate rounded-md px-1 py-1.5 text-left text-sm font-medium text-slate-700 hover:text-blue-700 dark:text-slate-200 dark:hover:text-blue-200"
              >
                {view.name}
              </button>
              <button
                type="button"
                title={String(t("orders.deleteSavedView"))}
                onClick={() => remove(view.id)}
                className="rounded-md p-1.5 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                placeholder={String(t("orders.savedViewNamePlaceholder"))}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500"
              />
              <button
                type="button"
                onClick={save}
                disabled={!name.trim() || !hasActiveFilters}
                title={String(t("orders.saveCurrentView"))}
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
