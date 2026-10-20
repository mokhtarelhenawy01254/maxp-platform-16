import React from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronDown,
  Check,
  Layers3,
  LayoutGrid,
  List,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchBar, CategorySidebar } from "@/components/marketplace";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Category, MarketplaceApp } from "@/types/marketplace";

interface CategoryDisplayItem {
  id: string;
  name: string;
  icon: typeof Package;
  count: number;
}

interface MarketplaceControlRowProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "ALL" | "INSTALLED" | "NOT_INSTALLED";
  onStatusFilterChange: (filter: "ALL" | "INSTALLED" | "NOT_INSTALLED") => void;
  appsCount: number;
  installedAppsCount: number;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  categories: Category[];
  availableCategories: Category[];
  categoryDisplay: CategoryDisplayItem[];
  filteredAppsCount: number;
  hubFilteredCount: number;
  activeHubNameAr?: string;
  selectedSystemHub: string;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function MarketplaceControlRow({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  appsCount,
  installedAppsCount,
  selectedCategory,
  onCategorySelect,
  categories,
  availableCategories,
  categoryDisplay,
  filteredAppsCount,
  hubFilteredCount,
  activeHubNameAr,
  selectedSystemHub,
  viewMode,
  onViewModeChange,
}: MarketplaceControlRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
      {/* Search Bar (inline on sm+) */}
      <div className="flex-1 min-w-[240px] hidden sm:block">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder={t("marketplace.searchPlaceholder", "ابحث عن التطبيقات، المميزات، أو الفئات...")}
        />
      </div>

      {/* Status Segmented Buttons */}
      <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0 text-xs font-semibold">
        <button
          type="button"
          onClick={() => onStatusFilterChange("ALL")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all",
            statusFilter === "ALL"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          الكل ({appsCount})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("INSTALLED")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1",
            statusFilter === "INSTALLED"
              ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CheckCircle2 size={12} />
          المثبتة ({installedAppsCount})
        </button>
        <button
          type="button"
          onClick={() => onStatusFilterChange("NOT_INSTALLED")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all",
            statusFilter === "NOT_INSTALLED"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          غير مثبتة
        </button>
      </div>

      {/* Category dropdown (desktop) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold shrink-0 border transition-all",
              selectedCategory
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border/40 hover:border-primary/40 text-foreground",
            )}
          >
            <Layers3 size={14} />
            <span>
              {selectedCategory
                ? categories.find((c) => (c.category || "").toUpperCase() === selectedCategory.toUpperCase())
                    ?.name || selectedCategory
                : "التصنيفات"}
            </span>
            {selectedCategory && (
              <span className="text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded-full bg-primary-foreground/20">
                {filteredAppsCount}
              </span>
            )}
            <ChevronDown size={13} className={cn("opacity-70", selectedCategory && "text-primary-foreground")} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto w-56 rounded-xl">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {activeHubNameAr && selectedSystemHub !== "ALL"
              ? `تصنيفات ${activeHubNameAr}`
              : "كل التصنيفات"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onCategorySelect(selectedCategory)}
            className={cn("text-xs font-bold gap-2", !selectedCategory && "bg-muted/60")}
          >
            <Package size={13} className="text-primary" />
            <span className="flex-1">كل التصنيفات</span>
            <span className="text-[10px] tabular-nums font-mono text-muted-foreground">{hubFilteredCount}</span>
            {!selectedCategory && <Check size={13} className="text-primary" />}
          </DropdownMenuItem>
          {categoryDisplay.map((cat) => {
            const Icon = cat.icon;
            const active = cat.id === selectedCategory;
            return (
              <DropdownMenuItem
                key={cat.id}
                onClick={() => onCategorySelect(active ? "" : cat.id)}
                className={cn("text-xs font-bold gap-2", active && "bg-muted/60")}
              >
                <Icon size={13} className="text-primary" />
                <span className="flex-1 truncate">{cat.name}</span>
                <span className="text-[10px] tabular-nums font-mono text-muted-foreground">{cat.count}</span>
                {active && <Check size={13} className="text-primary" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* All Categories Drawer Sheet Trigger (mobile only) */}
      <CategorySidebar
        isMobile
        categories={availableCategories}
        selectedCategory={selectedCategory}
        onSelect={onCategorySelect}
        className="sm:hidden h-10 px-3 rounded-xl border-border/40 font-bold shrink-0"
      />

      {/* Grid / List View Switcher */}
      <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/50 border border-border/30 shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            viewMode === "grid"
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          title="عرض شبكي (Grid View)"
          aria-label="Grid View"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            viewMode === "list"
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          title="عرض قائمة (List View)"
          aria-label="List View"
        >
          <List size={16} />
        </button>
      </div>
    </div>
  );
}
