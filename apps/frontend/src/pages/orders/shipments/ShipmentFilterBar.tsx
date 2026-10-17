import React from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ShipmentFilterBarProps {
  localSearch: string;
  setLocalSearch: (val: string) => void;
  localDateFrom: string;
  setLocalDateFrom: (val: string) => void;
  localDateTo: string;
  setLocalDateTo: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
}

export const ShipmentFilterBar: React.FC<ShipmentFilterBarProps> = ({
  localSearch,
  setLocalSearch,
  localDateFrom,
  setLocalDateFrom,
  localDateTo,
  setLocalDateTo,
  onSubmit,
  onClearSearch,
}) => {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
      <div className="relative sm:col-span-6">
        <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث برقم الطلب، كود البوليصة، اسم العميل، هاتف العميل، المندوب، أو الفرع..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full pl-8 pr-9 py-2 text-xs border border-border/70 rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors"
        />
        {localSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            title="مسح البحث"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative sm:col-span-2">
        <input
          type="date"
          value={localDateFrom}
          onChange={(e) => setLocalDateFrom(e.target.value)}
          className="w-full px-2.5 py-2 text-xs border border-border/70 rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary font-mono tabular-nums transition-colors"
          title="من تاريخ"
        />
      </div>

      <div className="relative sm:col-span-2">
        <input
          type="date"
          value={localDateTo}
          onChange={(e) => setLocalDateTo(e.target.value)}
          className="w-full px-2.5 py-2 text-xs border border-border/70 rounded-xl bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary font-mono tabular-nums transition-colors"
          title="إلى تاريخ"
        />
      </div>

      <div className="sm:col-span-2 flex items-center">
        <button
          type="submit"
          className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold transition-colors shadow-2xs"
        >
          تصفية البيان
        </button>
      </div>
    </form>
  );
};
