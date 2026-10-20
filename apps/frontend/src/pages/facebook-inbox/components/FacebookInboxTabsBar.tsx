import React from 'react';
import InboxTabs from '@/components/facebook-inbox/InboxTabs/InboxTabs';
import type { InboxTab } from '@/types/inbox.types';
import type { FilterState } from '@/components/facebook-inbox/FilterPanel/FilterPanel';
import type { TabCountsState } from '../types/facebookInboxTypes';

interface FacebookInboxTabsBarProps {
  hasSelectedConversation: boolean;
  activeTab: InboxTab;
  onTabChange: (newTab: InboxTab) => void;
  counts: TabCountsState;
  onSearch: (query: string) => void;
  onToggleFilters: () => void;
  onShowStats: () => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  priorityCount: number;
}

export const FacebookInboxTabsBar: React.FC<FacebookInboxTabsBarProps> = ({
  hasSelectedConversation,
  activeTab,
  onTabChange,
  counts,
  onSearch,
  onToggleFilters,
  onShowStats,
  filters,
  setFilters,
  priorityCount,
}) => {
  return (
    <div className={hasSelectedConversation ? 'hidden md:block' : ''}>
      <InboxTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        counts={counts}
        onSearch={onSearch}
        onToggleFilters={onToggleFilters}
        onShowStats={onShowStats}
        isPriorityOnly={Boolean(filters.priorityOnly)}
        onTogglePriority={() =>
          setFilters((prev) => ({
            ...prev,
            priorityOnly: !prev.priorityOnly,
          }))
        }
        priorityCount={priorityCount}
      />
    </div>
  );
};

export default FacebookInboxTabsBar;
