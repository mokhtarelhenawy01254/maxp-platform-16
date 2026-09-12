import React from "react";
import { Search, SlidersHorizontal, BarChart3, Star } from "lucide-react";
import { InboxTab } from "../../../types/inbox.types";
import { useTranslation } from "react-i18next";

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
  onToggleFilters: () => void;
  onShowStats?: () => void;
  isPriorityOnly?: boolean;
  onTogglePriority?: () => void;
  priorityCount?: number;
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
  priorityCount = 0,
}) => {
  const { t } = useTranslation();

  const tabs = [
    {
      id: "all" as InboxTab,
      label: t("inbox.tabs.all"),
      count: counts.all,
    },
    {
      id: "unreplied" as InboxTab,
      label: t("inbox.tabs.unreplied"),
      count: counts.unreplied,
    },
    {
      id: "done" as InboxTab,
      label: t("inbox.tabs.done"),
      count: counts.done,
    },
    {
      id: "main" as InboxTab,
      label: t("inbox.tabs.main"),
      count: counts.main,
    },
    {
      id: "general" as InboxTab,
      label: t("inbox.tabs.general"),
      count: counts.general,
    },
    {
      id: "requests" as InboxTab,
      label: t("inbox.tabs.requests"),
      count: counts.requests,
    },
    {
      id: "spam" as InboxTab,
      label: t("inbox.tabs.spam"),
      count: counts.spam,
    },
  ];

  return (
    <div className="business-inbox-header">
      <div className="business-inbox-header-row business-inbox-header-row--tabs">
        <div className="business-inbox-tabs business-inbox-tabs--scroll flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="business-inbox-tab"
              data-active={activeTab === tab.id ? "true" : "false"}
            >
              <span>{tab.label}</span>
              {(tab.count > 0 || tab.id === "all") && (
                <span className="business-inbox-tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search, Filter, and Stats buttons */}
        <div className="business-inbox-toolbar">
          {/* Stats Button */}
          {onShowStats && (
            <button
              onClick={onShowStats}
              className="business-chip-button dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:bg-white/20"
              title={String(t("inbox.statistics"))}
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          )}

          {/* Search */}
          <div className="business-inbox-search-wrap">
            <Search className="business-inbox-search-icon right-3 left-auto w-5 h-5 dark:text-slate-400" />
            <input
              type="text"
              placeholder={String(t("inbox.searchPlaceholder"))}
              onChange={(e) => onSearch(e.target.value)}
              className="business-inbox-search w-full pr-10 pl-4 md:w-64 dark:bg-white/5 dark:text-white dark:border-white/15 dark:placeholder-slate-400"
            />
          </div>

          {/* Priority Filter Toggle */}
          {onTogglePriority && (
            <button
              onClick={onTogglePriority}
              className={`business-chip-button transition-all duration-200 ${
                isPriorityOnly
                  ? "bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40"
                  : "dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:bg-white/20 hover:text-amber-500 hover:border-amber-400"
              }`}
              title={isPriorityOnly ? "إلغاء تصفية الأولوية" : `تصفية المحادثات ذات الأولوية (⭐) ${priorityCount > 0 ? `(${priorityCount})` : ""}`}
            >
              <Star className={`w-5 h-5 ${isPriorityOnly ? "fill-white text-white" : "text-amber-500 fill-amber-500/20"}`} />
            </button>
          )}

          {/* Filters Toggle */}
          <button
            onClick={onToggleFilters}
            className="business-chip-button dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:bg-white/20"
            title={String(t("inbox.advancedFilters"))}
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InboxTabs;
