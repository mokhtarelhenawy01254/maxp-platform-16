import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star, MessageSquare } from 'lucide-react';
import BulkActionsBar from '@/components/facebook-inbox/BulkActionsBar/BulkActionsBar';
import FilterPanel, {
  FilterState,
} from '@/components/facebook-inbox/FilterPanel/FilterPanel';
import ConversationItem from '@/components/facebook-inbox/ConversationList/ConversationItem';
import type { InboxConversation } from '@/types/inbox.types';

interface FacebookConversationSidebarProps {
  showSidebar: boolean;
  selectedIds: Set<string>;
  clearSelection: () => void;
  onBulkMarkDone: () => void;
  onBulkAssign: () => void;
  onBulkTags: () => void;
  showFilters: boolean;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onCloseFilters: () => void;
  onResetFilters: () => void;
  loading: boolean;
  error: string | null;
  conversations: InboxConversation[];
  filteredConversations: InboxConversation[];
  selectedConversation: InboxConversation | null;
  toggleSelection: (id: string) => void;
  onSelectConversation: (conversation: InboxConversation) => void;
  hasMoreConversations: boolean;
  onLoadMoreConversations: () => void;
}

export const FacebookConversationSidebar: React.FC<FacebookConversationSidebarProps> = ({
  showSidebar,
  selectedIds,
  clearSelection,
  onBulkMarkDone,
  onBulkAssign,
  onBulkTags,
  showFilters,
  filters,
  setFilters,
  onCloseFilters,
  onResetFilters,
  loading,
  error,
  conversations,
  filteredConversations,
  selectedConversation,
  toggleSelection,
  onSelectConversation,
  hasMoreConversations,
  onLoadMoreConversations,
}) => {
  const { t } = useTranslation();

  const isAnyFilterActive = Boolean(
    filters.priorityOnly ||
      filters.unreadOnly ||
      filters.assignedTo !== 'all' ||
      filters.startDate ||
      filters.endDate,
  );

  return (
    <div
      className={`
        ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        absolute md:relative
        inset-y-0 left-0
        w-full sm:w-80 md:w-72 lg:w-80
        z-30
        business-inbox-column business-inbox-column--list flex flex-col
        bg-card/80 border-e border-border/50
        transition-transform duration-300 ease-in-out
      `}
    >
      {/* Bulk Actions Bar Overlay */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onMarkAsDone={onBulkMarkDone}
        onAssign={onBulkAssign}
        onAddTags={onBulkTags}
      />

      <FilterPanel
        isOpen={showFilters}
        filters={filters}
        onFilterChange={setFilters}
        onClose={onCloseFilters}
        onReset={onResetFilters}
      />

      {/* Quick Filters Bar */}
      <div className="px-3 py-2 border-b border-border/50 flex items-center justify-between gap-2 bg-muted/30">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                unreadOnly: !prev.unreadOnly,
              }))
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 active:scale-[0.97] select-none flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${
              filters.unreadOnly
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-background text-foreground border border-border/60 hover:bg-muted/60 hover:border-primary/40'
            }`}
            title={
              filters.unreadOnly
                ? t('facebookInbox.cancelUnreadFilter', 'إلغاء فلتر غير المقروءة')
                : t('facebookInbox.unreadOnlyFilter', 'إظهار الرسائل غير المقروءة فقط')
            }
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            <span>{t('facebookInbox.unread', 'غير مقروءة')}</span>
          </button>
        </div>

        {isAnyFilterActive && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-[11px] text-muted-foreground hover:text-destructive font-medium transition-colors whitespace-nowrap flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 cursor-pointer"
            title={t('facebookInbox.clearAllFilters', 'إلغاء جميع الفلاتر')}
          >
            {t('facebookInbox.resetFilters', 'مسح الفلاتر')}
          </button>
        )}
      </div>

      {/* Scrollable Conversation List */}
      <div
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          const target = e.currentTarget;
          const { scrollTop, scrollHeight, clientHeight } = target;
          if (
            scrollHeight - scrollTop - clientHeight < 200 &&
            hasMoreConversations &&
            !loading
          ) {
            onLoadMoreConversations();
          }
        }}
      >
        {loading && conversations.length === 0 ? (
          <div className="business-inbox-empty h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center p-8 text-sm text-destructive">
            {error}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="business-inbox-empty p-8 text-center">
            {filters.priorityOnly ? (
              <>
                <div className="flex justify-center mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Star className="h-7 w-7 stroke-[1.5]" />
                  </div>
                </div>
                <p className="font-semibold text-foreground">
                  {t('facebookInbox.noPriorityConversations', 'لا توجد محادثات ذات أولوية')}
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {t(
                    'facebookInbox.priorityHint',
                    'يمكنك تمييز أي محادثة بنجمة من داخل الشات لتظهر هنا',
                  )}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, priorityOnly: false }))
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.97] transition-all shadow-xs mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                >
                  {t('facebookInbox.showAllConversations', 'عرض جميع المحادثات')}
                </button>
              </>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 stroke-[1.5]" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('facebookInbox.noConversations')}
                </p>
              </>
            )}
          </div>
        ) : (
          <div>
            {Array.from(
              new Map(
                filteredConversations.map((conv) => [conv.id, conv]),
              ).values(),
            ).map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversation?.id === conv.id}
                isMultiSelected={selectedIds.has(conv.id)}
                onToggleSelection={(e) => {
                  e.stopPropagation();
                  toggleSelection(conv.id);
                }}
                onClick={() => onSelectConversation(conv)}
              />
            ))}

            {loading && conversations.length > 0 && (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacebookConversationSidebar;
