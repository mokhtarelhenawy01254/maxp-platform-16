import React from 'react';
import { Search, Check } from 'lucide-react';

interface SettlementStatusOption {
  value: string;
  fallback: string;
}

interface SettlementFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusOptions: SettlementStatusOption[];
  selectedCount: number;
  onBulkSettle: () => void;
  processing: boolean;
}

export const SettlementFilterBar: React.FC<SettlementFilterBarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  selectedCount,
  onBulkSettle,
  processing,
}) => {
  return (
    <div className="bg-card p-3 rounded-2xl border border-border/70 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="البحث برقم الطلب، التتبع، أو اسم العميل..."
            className="w-full pr-9 pl-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground focus:outline-hidden"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.fallback}
              </option>
            ))}
          </select>

          {selectedCount > 0 && (
            <button
              type="button"
              onClick={onBulkSettle}
              disabled={processing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs active:scale-[0.97] disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                تسوية المحددة (<span className="font-mono tabular-nums">{selectedCount}</span>)
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
