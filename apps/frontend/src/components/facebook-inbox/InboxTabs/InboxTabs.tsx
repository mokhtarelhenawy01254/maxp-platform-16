import React from "react";
import { Search } from "lucide-react";
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
  onToggleFilters?: () => void;
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
    {
      id: "priority" as InboxTab,
      label: t("inbox.tabs.priority", "الأولوية ⭐"),
      count: counts.priority || 0,
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

        {/* Search */}
        <div className="business-inbox-toolbar">
          <div className="business-inbox-search-wrap">
            <Search className="business-inbox-search-icon right-3 left-auto w-5 h-5 dark:text-slate-400" />
            <input
              type="text"
              placeholder={String(t("inbox.searchPlaceholder"))}
              onChange={(e) => onSearch(e.target.value)}
              className="business-inbox-search w-full pr-10 pl-4 md:w-64 dark:bg-white/5 dark:text-white dark:border-white/15 dark:placeholder-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxTabs;
