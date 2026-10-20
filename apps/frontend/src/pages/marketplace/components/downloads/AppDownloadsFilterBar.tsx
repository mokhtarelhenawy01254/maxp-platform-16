import React from "react";
import { Search, Laptop, Smartphone, Apple, LayoutGrid, List, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DownloadsPlatformTab = "all" | "desktop" | "mobile" | "android" | "ios";

interface AppDownloadsFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeTab: DownloadsPlatformTab;
  onTabChange: (tab: DownloadsPlatformTab) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  tabCounts: {
    all: number;
    desktop: number;
    mobile: number;
    android: number;
    ios: number;
  };
}

export function AppDownloadsFilterBar({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  tabCounts,
}: AppDownloadsFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="ابحث عن التطبيقات، الامتدادات (.exe, .apk)…"
          className="h-10 pr-10 pl-10 rounded-xl bg-card border-border/40 text-xs sm:text-sm focus-visible:ring-primary/20"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Platform Filter Pills with Smooth Scroll */}
      <div className="flex items-center p-1 rounded-xl bg-muted/50 border border-border/40 overflow-x-auto scrollbar-none text-xs font-semibold shrink-0">
        <button
          type="button"
          onClick={() => onTabChange("all")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
            activeTab === "all"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          الكل ({tabCounts.all})
        </button>
        <button
          type="button"
          onClick={() => onTabChange("desktop")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
            activeTab === "desktop"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Laptop className="size-3.5" />
          <span>سطح المكتب ({tabCounts.desktop})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("android")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
            activeTab === "android"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Smartphone className="size-3.5" />
          <span>أندرويد ({tabCounts.android})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("ios")}
          className={cn(
            "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] duration-160 ease-out",
            activeTab === "ios"
              ? "bg-background text-foreground shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Apple className="size-3.5" />
          <span>آبل iOS ({tabCounts.ios})</span>
        </button>
      </div>

      {/* View Mode Toggle: Grid vs List (Matching MyApps & Marketplace) */}
      <div className="hidden sm:flex items-center p-1 rounded-xl bg-muted/50 border border-border/40 shrink-0">
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "p-1.5 rounded-lg transition-all active:scale-[0.97] duration-160 ease-out",
            viewMode === "grid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          title="عرض شبكي (Bento Grid)"
        >
          <LayoutGrid size={15} />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          className={cn(
            "p-1.5 rounded-lg transition-all active:scale-[0.97] duration-160 ease-out",
            viewMode === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          title="عرض قائمة تفصيلية (Dense List)"
        >
          <List size={15} />
        </button>
      </div>
    </div>
  );
}
