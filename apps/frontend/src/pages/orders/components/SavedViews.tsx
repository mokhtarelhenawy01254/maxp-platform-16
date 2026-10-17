import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bookmark,
  Trash2,
  Plus,
} from "lucide-react";
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
        className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-[0.97]"
      >
        <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="hidden sm:inline">{t("orders.savedViews")}</span>
        {views.length > 0 && (
          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold font-mono tabular-nums text-primary">
            {views.length}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="z-50 w-72 border border-border/70 bg-card p-2 text-card-foreground shadow-lg rounded-xl"
      >
        <div className="max-h-[360px] overflow-y-auto p-1.5">
          <div className="mb-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("orders.savedViews")}
          </div>

          {views.length === 0 && (
            <p className="px-1.5 py-2 text-xs text-muted-foreground">
              {t("orders.noSavedViews")}
            </p>
          )}

          {views.map((view) => (
            <div
              key={view.id}
              className="group flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-muted/50 transition-colors"
            >
              <button
                type="button"
                onClick={() => apply(view)}
                className="min-w-0 flex-1 truncate text-start text-xs font-semibold text-foreground hover:text-primary transition-colors"
              >
                {view.name}
              </button>
              <button
                type="button"
                title={String(t("orders.deleteSavedView"))}
                onClick={() => remove(view.id)}
                className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="mt-2 border-t border-border/60 pt-2">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                placeholder={String(t("orders.savedViewNamePlaceholder"))}
                className="min-w-0 flex-1 rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs text-foreground outline-hidden focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={save}
                disabled={!name.trim() || !hasActiveFilters}
                title={String(t("orders.saveCurrentView"))}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SavedViews;
