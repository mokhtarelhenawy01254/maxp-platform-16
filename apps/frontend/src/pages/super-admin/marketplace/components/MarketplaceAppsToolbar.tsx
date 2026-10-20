import React from "react";
import {
  ShoppingBag,
  Download,
  DollarSign,
  Star,
  Search,
  X,
  Plus,
  Upload,
  Wrench,
  RefreshCw,
  LayoutGrid,
  Columns3,
  List,
  Layers,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../../components/ui/tooltip";
import { categoryLabels, getCategoryColor } from "../utils/marketplaceCategoryUtils";

export type ViewMode = "grid" | "compact" | "table" | "grouped";
export type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "FEATURED" | "PAID" | "FREE";

export interface MarketplaceAppsToolbarProps {
  totalApps: number;
  totalInstallations: number;
  totalMonthlyRevenue: number;
  activeApps: number;
  featuredApps: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (s: StatusFilter) => void;
  statusCounts: Record<string, number>;
  filteredAppsCount: number;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
  categories: string[];
  appsCountByCategory: (cat: string) => number;
  onResetFilters: () => void;
  onAddNewApp: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleCatalogTools: () => void;
}

export const MarketplaceAppsToolbar: React.FC<MarketplaceAppsToolbarProps> = ({
  totalApps,
  totalInstallations,
  totalMonthlyRevenue,
  activeApps,
  featuredApps,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  viewMode,
  onViewModeChange,
  statusFilter,
  setStatusFilter,
  statusCounts,
  filteredAppsCount,
  categoryFilter,
  setCategoryFilter,
  categories,
  appsCountByCategory,
  onResetFilters,
  onAddNewApp,
  onExport,
  onImport,
  onToggleCatalogTools,
}) => {
  return (
    <>
      {/* Statistics Dashboard */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 text-white shadow-lg shadow-blue-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-blue-100">إجمالي التطبيقات</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold tabular-nums font-mono">
            {totalApps}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-fuchsia-800 p-5 text-white shadow-lg shadow-purple-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <Download className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-purple-100">إجمالي التثبيتات</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold tabular-nums font-mono">
            {totalInstallations.toLocaleString("ar-EG")}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-emerald-100">إيرادات شهرية</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold tabular-nums font-mono">
            {totalMonthlyRevenue.toLocaleString("ar-EG")} ج.م
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-red-700 p-5 text-white shadow-lg shadow-rose-900/20 transition-all duration-300 hover:scale-[1.02]">
          <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white opacity-10 blur-2xl" />
          <div className="relative z-10 mb-3 inline-flex rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
            <Star className="h-5 w-5" />
          </div>
          <p className="relative z-10 text-sm font-medium text-rose-100">التطبيقات النشطة</p>
          <p className="relative z-10 mt-0.5 text-2xl font-extrabold tabular-nums font-mono">
            {activeApps}
          </p>
          <p className="relative z-10 text-xs font-medium text-rose-200/90 tabular-nums font-mono">
            {featuredApps} مميز
          </p>
        </div>
      </div>

      {/* Filters, Search & View Controls */}
      <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-4 space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="apps-search"
                className="w-full pr-9 pl-8"
                placeholder="البحث بالاسم، المعرّف (slug)، الفئة، أو المسار..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="w-full sm:w-[170px] shrink-0">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v ?? "installations")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="installations">الأكثر تثبيتاً</SelectItem>
                  <SelectItem value="price">الأعلى سعراً</SelectItem>
                  <SelectItem value="rating">الأعلى تقييماً</SelectItem>
                  <SelectItem value="name">الاسم أبجدياً</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            <div className="inline-flex items-center rounded-xl border border-border bg-muted/60 p-1 shadow-inner">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onViewModeChange("grid")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "grid"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">مفصلة</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>شبكة بطاقات مفصلة</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onViewModeChange("compact")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "compact"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <Columns3 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">مدمجة</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>بطاقات مدمجة خفيفة</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onViewModeChange("table")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "table"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">جدول</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>جدول بيانات إداري متكامل</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onViewModeChange("grouped")}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        viewMode === "grouped"
                          ? "bg-background text-primary shadow-sm ring-1 ring-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">فئات</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>تجميع حسب الفئات</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="default" onClick={onAddNewApp}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة
              </Button>
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 ml-1" />
                تصدير
              </Button>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <Button variant="outline" size="sm" render={<span />}>
                  <Upload className="h-4 w-4 ml-1" />
                  استيراد
                </Button>
                <input type="file" hidden accept=".json" onChange={onImport} />
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCatalogTools}
                className="text-muted-foreground hover:bg-muted"
                title="أدوات المطور"
              >
                <Wrench className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Status Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-medium text-muted-foreground ml-1 hidden sm:inline">
              الحالة:
            </span>
            {[
              { id: "ALL", label: "الكل", count: statusCounts.ALL || 0 },
              { id: "ACTIVE", label: "النشطة", count: statusCounts.ACTIVE || 0 },
              { id: "INACTIVE", label: "المعطلة", count: statusCounts.INACTIVE || 0 },
              { id: "FEATURED", label: "المميزة", count: statusCounts.FEATURED || 0 },
              { id: "PAID", label: "المدفوعة", count: statusCounts.PAID || 0 },
              { id: "FREE", label: "المجانية", count: statusCounts.FREE || 0 },
            ].map((st) => {
              const active = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id as StatusFilter)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[0.65rem] font-bold tabular-nums font-mono ${
                      active
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background/80 text-foreground/70"
                    }`}
                  >
                    {st.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-auto sm:mr-0">
            <span>
              عرض{" "}
              <strong className="text-foreground tabular-nums font-mono">
                {filteredAppsCount}
              </strong>{" "}
              من{" "}
              <span className="tabular-nums font-mono">{totalApps}</span> تطبيق
            </span>
            {onResetFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
              >
                إعادة ضبط
              </Button>
            )}
          </div>
        </div>

        {/* Category Scrollbar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
          {categories.map((cat) => {
            const count = appsCountByCategory(cat);
            const isSelected = categoryFilter === cat;
            const color = cat === "ALL" ? "var(--muted-foreground)" : getCategoryColor(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: isSelected ? "#ffffff" : color }}
                />
                <span>{categoryLabels[cat] || cat}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[0.68rem] tabular-nums font-mono ${
                    isSelected
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/80 text-foreground/70"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MarketplaceAppsToolbar;
