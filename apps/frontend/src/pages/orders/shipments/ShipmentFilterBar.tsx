import React from "react";
import { Search, X, Calendar } from "lucide-react";

export interface ShipmentFilterBarProps {
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
      {/* Search Input */}
      <div className="relative sm:col-span-6">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث برقم الطلب، كود البوليصة، اسم العميل، هاتف العميل، المندوب، أو الفرع..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="w-full h-10 pe-9 ps-9 text-xs sm:text-sm border border-border/70 rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-start"
        />
        {localSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute end-2.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            title="مسح البحث"
            aria-label="مسح البحث"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Date From */}
      <div className="relative sm:col-span-2">
        <div className="relative">
          <input
            type="date"
            aria-label="من تاريخ"
            value={localDateFrom}
            onChange={(e) => setLocalDateFrom(e.target.value)}
            className="w-full h-10 px-3 text-xs sm:text-sm border border-border/70 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tabular-nums transition-colors"
            title="من تاريخ"
          />
        </div>
      </div>

      {/* Date To */}
      <div className="relative sm:col-span-2">
        <div className="relative">
          <input
            type="date"
            aria-label="إلى تاريخ"
            value={localDateTo}
            onChange={(e) => setLocalDateTo(e.target.value)}
            className="w-full h-10 px-3 text-xs sm:text-sm border border-border/70 rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tabular-nums transition-colors"
            title="إلى تاريخ"
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="sm:col-span-2 flex items-center">
        <button
          type="submit"
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
        >
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>تصفية البيان</span>
        </button>
      </div>
    </form>
  );
};

export default ShipmentFilterBar;
