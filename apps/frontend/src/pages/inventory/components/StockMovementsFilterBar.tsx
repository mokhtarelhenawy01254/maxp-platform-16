import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';

interface StockMovementsFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
}

export const StockMovementsFilterBar: React.FC<StockMovementsFilterBarProps> = ({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}) => {
  return (
    <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="relative flex-1">
        <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث باسم المنتج، SKU، أو رقم المرجع..."
          className="h-8 pr-9 pl-3 text-xs bg-background border-border/70"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground outline-hidden"
        >
          <option value="">كل أنواع الحركات</option>
          <option value="IN">وارد (IN)</option>
          <option value="OUT">صادر (OUT)</option>
          <option value="ADJUSTMENT">تعديل جرد (ADJUSTMENT)</option>
          <option value="TRANSFER">مناقلة بين الفروع (TRANSFER)</option>
          <option value="RETURN">مرتجع (RETURN)</option>
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-8 px-2 text-xs rounded-md border border-border/70 bg-background text-foreground outline-hidden font-mono"
          />
          <span className="text-muted-foreground text-xs">إلى</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-8 px-2 text-xs rounded-md border border-border/70 bg-background text-foreground outline-hidden font-mono"
          />
        </div>
      </div>
    </div>
  );
};
