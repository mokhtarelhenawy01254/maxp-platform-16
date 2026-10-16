import React from "react";
import { Search, Star, MessageSquare, CheckCircle2, Clock, Inbox, MailWarning, Sparkles } from "lucide-react";
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
}) => {
  const { t } = useTranslation();

  const tabs: { id: InboxTab; label: string; count: number; icon?: React.ReactNode }[] = [
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

  return (
    <div className="border-b border-border/70 bg-card/60 px-4 py-2 text-foreground">
      <div className="flex items-center justify-between gap-3">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar flex-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all active:scale-[0.98] ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab.id === "priority" && (
                  <Star className={`w-3.5 h-3.5 ${isActive ? "fill-primary-foreground" : "text-amber-500"}`} />
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

        {/* Inline Quick Search if needed */}
        <div className="hidden sm:flex items-center relative w-48 shrink-0">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={String(t("inbox.searchPlaceholder", "بحث..."))}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-background border border-border/70 rounded-md pr-8 pl-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>
    </div>
  );
};

export default InboxTabs;
