import React from "react";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { STOCK_STATUS_META, StockStatus } from "./availabilityTypes";

interface AvailabilityFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  preOrderFilter: string;
  setPreOrderFilter: (v: string) => void;
  trackFilter: string;
  setTrackFilter: (v: string) => void;
  stockFilter: string;
  setStockFilter: (v: string) => void;
  categories: string[];
  onResetPage: () => void;
}

export const AvailabilityFilterBar: React.FC<AvailabilityFilterBarProps> = ({
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  preOrderFilter,
  setPreOrderFilter,
  trackFilter,
  setTrackFilter,
  stockFilter,
  setStockFilter,
  categories,
  onResetPage,
}) => {
  return (
    <div className="p-3 sm:p-4 border-b border-border/70 bg-muted/20">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onResetPage();
            }}
            placeholder="بحث باسم المنتج أو SKU..."
            className="w-full xl:w-64 ps-9 pe-3 h-9 text-xs sm:text-sm rounded-xl border border-border/70 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-colors text-start"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              setCategoryFilter(v ?? "all");
              onResetPage();
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs border-border/70 bg-background text-foreground rounded-xl">
              <SelectValue>
                {categoryFilter === "all" ? "كل الأقسام" : categoryFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Pre-Order Filter */}
          <Select
            value={preOrderFilter}
            onValueChange={(v) => {
              setPreOrderFilter(v ?? "all");
              onResetPage();
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs border-border/70 bg-background text-foreground rounded-xl">
              <SelectValue>
                {preOrderFilter === "all"
                  ? "الطلب المسبق: الكل"
                  : preOrderFilter === "on"
                  ? "طلب مسبق: مفعل"
                  : "طلب مسبق: معطل"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الطلب المسبق: الكل</SelectItem>
              <SelectItem value="on">مفعل</SelectItem>
              <SelectItem value="off">معطل</SelectItem>
            </SelectContent>
          </Select>

          {/* Tracking Filter */}
          <Select
            value={trackFilter}
            onValueChange={(v) => {
              setTrackFilter(v ?? "all");
              onResetPage();
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs border-border/70 bg-background text-foreground rounded-xl">
              <SelectValue>
                {trackFilter === "all"
                  ? "تتبع المخزون: الكل"
                  : trackFilter === "on"
                  ? "تتبع: مفعل"
                  : "تتبع: معطل"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">تتبع المخزون: الكل</SelectItem>
              <SelectItem value="on">مفعل</SelectItem>
              <SelectItem value="off">معطل</SelectItem>
            </SelectContent>
          </Select>

          {/* Stock Status Filter */}
          <Select
            value={stockFilter}
            onValueChange={(v) => {
              setStockFilter(v ?? "all");
              onResetPage();
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs border-border/70 bg-background text-foreground rounded-xl">
              <SelectValue>
                {stockFilter === "all"
                  ? "حالة المخزون: الكل"
                  : STOCK_STATUS_META[stockFilter as StockStatus]?.label || stockFilter}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">حالة المخزون: الكل</SelectItem>
              <SelectItem value="in-stock">{STOCK_STATUS_META["in-stock"].label}</SelectItem>
              <SelectItem value="low-stock">{STOCK_STATUS_META["low-stock"].label}</SelectItem>
              <SelectItem value="out-of-stock">{STOCK_STATUS_META["out-of-stock"].label}</SelectItem>
              <SelectItem value="untracked">{STOCK_STATUS_META.untracked.label}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
