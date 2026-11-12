import React from "react";
import { Search, Star, Filter, BarChart3 } from "lucide-react";
import { InboxTab } from "../../../types/inbox.types";
import { useTranslation } from "react-i18next";

export interface InboxVerticalBadge {
  label: string;
  className?: string;
}

interface InboxTabsProps {
  activeTab: InboxTab;
  onTabChange: (tab: InboxTab) => void;
  counts: {
    all: number;
    unreplied: number;
    done: number;
    main: number;
    general: number;
    requests: number;
    spam: number;
    priority?: number;
  };
  onSearch: (query: string) => void;
  onToggleFilters?: () => void;
  onShowStats?: () => void;
  isPriorityOnly?: boolean;
  onTogglePriority?: () => void;
  priorityCount?: number;
  verticalBadge?: InboxVerticalBadge;
  hasActiveFilters?: boolean;
  showFilterButton?: boolean;
}

const InboxTabs: React.FC<InboxTabsProps> = ({
  activeTab,
  onTabChange,
  counts,
  onSearch,
  onToggleFilters,
  onShowStats,
  isPriorityOnly = false,
  onTogglePriority,
  priorityCount,
  verticalBadge,
  hasActiveFilters = false,
  showFilterButton = false,
}) => {
  const { t } = useTranslation();

  const tabs: { id: InboxTab; label: string; count: number }[] = [
    {
      id: "all",
      label: String(t("inbox.tabs.all", "الكل")),
      count: counts.all,
    },
    {
      id: "unreplied",
      label: String(t("inbox.tabs.unreplied", "لم يتم الرد")),
      count: counts.unreplied,
    },
    {
      id: "done",
      label: String(t("inbox.tabs.done", "مكتملة")),
      count: counts.done,
    },
    {
      id: "main",
      label: String(t("inbox.tabs.main", "الرئيسية")),
      count: counts.main,
    },
    {
      id: "general",
      label: String(t("inbox.tabs.general", "عامة")),
      count: counts.general,
    },
    {
      id: "requests",
      label: String(t("inbox.tabs.requests", "طلبات")),
      count: counts.requests,
    },
    {
      id: "spam",
      label: String(t("inbox.tabs.spam", "غير مرغوب")),
      count: counts.spam,
    },
    {
      id: "priority",
      label: String(t("inbox.tabs.priority", "الأولوية")),
      count: counts.priority || 0,
    },
  ];

  const iconBtnBase =
    "relative inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2 text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-pointer";

  return (
    <div className="border-b border-border/50 bg-card/80 px-3 sm:px-4 py-2 text-foreground">
      <div className="flex items-center justify-between gap-2.5">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-1 min-w-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab.id === "priority" && (
                  <Star
                    className={`w-3.5 h-3.5 ${
                      isActive ? "fill-primary-foreground" : "text-amber-500"
                    }`}
                  />
                )}
                <span>{tab.label}</span>
                {(tab.count > 0 || tab.id === "all") && (
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[10px] font-mono tabular-nums ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* End Controls: Specialty Badge + Quick Search + Icon Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {verticalBadge?.label && (
            <span
              className={`hidden lg:inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${
                verticalBadge.className ||
                "bg-muted/60 text-muted-foreground border-border/50"
              }`}
            >
              {verticalBadge.label}
            </span>
          )}

          {/* Inline Quick Search */}
          <div className="hidden sm:flex items-center relative w-44 md:w-48 shrink-0">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder={String(t("inbox.searchPlaceholder", "بحث..."))}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full h-8 bg-background border border-border/60 rounded-lg pr-8 pl-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
            />
          </div>

          {onTogglePriority && (
            <button
              type="button"
              onClick={onTogglePriority}
              aria-pressed={isPriorityOnly}
              aria-label={String(t("inbox.priorityFilter", "تصفية بالأولوية"))}
              title={String(t("inbox.priorityFilter", "تصفية بالأولوية"))}
              className={`${iconBtnBase} ${
                isPriorityOnly
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-300"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isPriorityOnly ? "fill-amber-500 text-amber-500" : ""
                }`}
              />
              {typeof priorityCount === "number" && priorityCount > 0 && (
                <span className="text-[10px] font-mono tabular-nums">
                  {priorityCount}
                </span>
              )}
            </button>
          )}

          {showFilterButton && onToggleFilters && (
            <button
              type="button"
              onClick={onToggleFilters}
              aria-label={String(t("inbox.filters", "الفلاتر"))}
              title={String(t("inbox.filters", "الفلاتر"))}
              className={`${iconBtnBase} w-8 px-0 ${
                hasActiveFilters
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              {hasActiveFilters && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          )}

          {onShowStats && (
            <button
              type="button"
              onClick={onShowStats}
              aria-label={String(t("inbox.stats", "الإحصائيات"))}
              title={String(t("inbox.stats", "الإحصائيات"))}
              className={`${iconBtnBase} w-8 px-0 border-border/60 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/40`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxTabs;
