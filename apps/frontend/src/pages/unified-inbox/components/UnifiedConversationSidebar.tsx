import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import type {
  UnifiedConversation,
  StatusFilter,
} from '../types/unifiedInboxTypes';
import { formatUnifiedTime } from '../utils/unifiedInboxUtils';

interface UnifiedConversationSidebarProps {
  conversations: UnifiedConversation[];
  selectedConversation: UnifiedConversation | null;
  selectConversation: (conv: UnifiedConversation) => void;
  loading: boolean;
  loadingMore: boolean;
  localSearchQuery: string;
  onSearchChange: (value: string) => void;
  activeFilter: StatusFilter;
  setActiveFilter: (filter: StatusFilter) => void;
  selectMode: boolean;
  selectedConvIds: Set<string>;
  toggleSelectConv: (id: string) => void;
  clearSelection: () => void;
  onBulkUpdate: (status: string) => void;
  onToggleConvStar: (id: string, isPinned: boolean) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export const UnifiedConversationSidebar: React.FC<UnifiedConversationSidebarProps> = ({
  conversations,
  selectedConversation,
  selectConversation,
  loading,
  loadingMore,
  localSearchQuery,
  onSearchChange,
  activeFilter,
  setActiveFilter,
  selectMode,
  selectedConvIds,
  toggleSelectConv,
  clearSelection,
  onBulkUpdate,
  onToggleConvStar,
  onScroll,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className="business-inbox-column business-inbox-column--list">
      {/* Header with Search and Filter chips */}
      <div className="business-inbox-header">
        <div className="business-inbox-search-wrap mb-3">
          <MagnifyingGlassIcon
            className={`business-inbox-search-icon ${
              isRtl ? 'right-3 left-auto' : 'left-3 right-auto'
            }`}
          />
          <input
            type="text"
            id="inbox-search"
            name="inbox-search"
            placeholder={t('unifiedInbox.searchPlaceholder', 'بحث في المحادثات...')}
            aria-label={t('unifiedInbox.searchPlaceholder', 'بحث في المحادثات...')}
            value={localSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`business-inbox-search ${
              isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4 text-left'
            }`}
            autoComplete="off"
          />
        </div>

        {/* Filter chips under search */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className="inbox-filter-chip text-xs"
            style={{ borderRadius: '999px', padding: '0.25rem 0.75rem' }}
            data-active={activeFilter === 'all'}
          >
            {t('unifiedInbox.filters.all', 'الكل')}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className="inbox-filter-chip text-xs"
            style={{ borderRadius: '999px', padding: '0.25rem 0.75rem' }}
            data-active={activeFilter === 'unread'}
          >
            {t('unifiedInbox.filters.unread', 'غير مقروءة')}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('followUp')}
            className="inbox-filter-chip text-xs"
            style={{ borderRadius: '999px', padding: '0.25rem 0.75rem' }}
            data-active={activeFilter === 'followUp'}
          >
            {t('unifiedInbox.filters.followUp', 'متابعة')}
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedConvIds.size > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            background:
              'color-mix(in srgb, var(--color-primary) 8%, var(--color-background))',
            borderBottom: '1px solid var(--business-card-border)',
          }}
        >
          <span
            className="text-xs font-medium tabular-nums font-mono"
            style={{ color: 'var(--color-foreground)' }}
          >
            {selectedConvIds.size} {t('unifiedInbox.selected', 'محدد')}
          </span>
          <button
            type="button"
            onClick={() => onBulkUpdate('resolved')}
            className="inbox-filter-chip text-xs"
            style={{ padding: '0.25rem 0.6rem' }}
          >
            {t('unifiedInbox.markAsResolved', 'تحديد كمكتمل')}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="inbox-filter-chip text-xs"
            style={{ padding: '0.25rem 0.6rem' }}
            aria-label={t('common.cancel', 'إلغاء')}
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto" onScroll={onScroll}>
        {loading ? (
          <div className="business-inbox-empty h-40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                style={{
                  borderColor:
                    'color-mix(in srgb, var(--color-primary) 24%, transparent)',
                  borderTopColor: 'transparent',
                }}
              />
              <span className="text-sm text-muted-foreground">
                {t('unifiedInbox.loading', 'جاري التحميل...')}
              </span>
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="business-inbox-empty h-40 flex flex-col items-center justify-center text-center p-4">
            <ChatBubbleLeftRightIcon
              className="w-12 h-12 mb-2"
              style={{
                color:
                  'color-mix(in srgb, var(--color-primary) 24%, var(--color-muted-foreground))',
              }}
            />
            <p className="text-sm text-muted-foreground">
              {t('unifiedInbox.noConversations', 'لا توجد محادثات')}
            </p>
          </div>
        ) : (
          <>
            {conversations.map((conv) => {
              const isSelected = selectedConvIds.has(conv.id);
              return (
                <div
                  role="button"
                  tabIndex={0}
                  key={conv.id}
                  onClick={(e) => {
                    if (selectMode) {
                      e.preventDefault();
                      toggleSelectConv(conv.id);
                      return;
                    }
                    selectConversation(conv);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (selectMode) {
                        toggleSelectConv(conv.id);
                      } else {
                        selectConversation(conv);
                      }
                    }
                  }}
                  className="business-conversation-card w-full text-left cursor-pointer"
                  data-state={
                    isSelected
                      ? 'selected'
                      : selectedConversation?.id === conv.id
                        ? 'selected'
                        : conv.unreadCount > 0
                          ? 'attention'
                          : 'idle'
                  }
                >
                  <div className="flex items-start gap-3">
                    <div className="relative flex-shrink-0">
                      {selectMode && (
                        <div
                          className="absolute inset-0 z-10 flex items-center justify-center"
                          style={{
                            background: isSelected
                              ? 'color-mix(in srgb, var(--color-primary) 20%, transparent)'
                              : 'color-mix(in srgb, var(--color-background) 70%, transparent)',
                            borderRadius: '999px',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectConv(conv.id);
                          }}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                                : 'border-gray-400'
                            }`}
                          >
                            {isSelected && (
                              <CheckIcon className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      )}
                      {conv.contactAvatar ? (
                        <img
                          src={conv.contactAvatar}
                          alt={conv.contactName}
                          className="business-conversation-avatar"
                          width={40}
                          height={40}
                          style={{
                            opacity: selectMode && isSelected ? 0.7 : 1,
                          }}
                        />
                      ) : (
                        <div
                          className="business-conversation-fallback"
                          style={{
                            opacity: selectMode && isSelected ? 0.7 : 1,
                          }}
                        >
                          {conv.contactName?.charAt(0) || '?'}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 text-[10px] font-mono px-1 rounded bg-card border border-border shadow-xs ${
                          isRtl ? '-left-0.5' : '-right-0.5'
                        }`}
                      >
                        {conv.platform === 'whatsapp'
                          ? 'WA'
                          : conv.platform === 'instagram'
                            ? 'IG'
                            : conv.platform === 'telegram'
                              ? 'TG'
                              : 'FB'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <h3
                            className={`font-semibold text-sm truncate ${
                              isRtl ? 'text-right' : 'text-left'
                            }`}
                            style={{ color: 'var(--color-foreground)' }}
                            translate="no"
                          >
                            {conv.contactName || t('unifiedInbox.unknown', 'غير معروف')}
                          </h3>
                          {conv.lastOrderNumber && (
                            <span
                              className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono tabular-nums leading-none"
                              style={{
                                background:
                                  'color-mix(in srgb, var(--color-primary) 12%, var(--color-background))',
                                color: 'var(--color-primary)',
                                border:
                                  '1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)',
                              }}
                              title={t('unifiedInbox.lastOrder', {
                                id: conv.lastOrderNumber,
                              })}
                            >
                              #{conv.lastOrderNumber}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[11px] font-mono tabular-nums flex-shrink-0 ${
                            isRtl ? 'mr-2' : 'ml-2'
                          }`}
                          style={{ color: 'var(--color-muted-foreground)' }}
                        >
                          {formatUnifiedTime(
                            conv.lastMessageTime,
                            i18n.language,
                            t('unifiedInbox.yesterday', 'أمس'),
                          )}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate leading-5 ${
                          isRtl ? 'text-right' : 'text-left'
                        }`}
                        style={{ color: 'var(--color-muted-foreground)' }}
                        translate="no"
                      >
                        {conv.lastMessageIsFromCustomer
                          ? ''
                          : `${t('unifiedInbox.you', 'أنت')}: `}
                        {conv.lastMessage || t('unifiedInbox.noMessages', 'لا توجد رسائل')}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <span
                          className="business-platform-indicator text-[11px]"
                          data-platform={conv.platform}
                        >
                          {conv.platform === 'whatsapp'
                            ? 'WhatsApp'
                            : conv.platform === 'instagram'
                              ? 'Instagram'
                              : conv.platform === 'telegram'
                                ? 'Telegram'
                                : 'Messenger'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleConvStar(conv.id, conv.isPinned);
                            }}
                            className="p-0.5 rounded hover:opacity-80 transition-opacity"
                            aria-label={
                              conv.isPinned
                                ? t('unifiedInbox.unstar', 'إلغاء التمييز')
                                : t('unifiedInbox.star', 'تمييز بنجمة')
                            }
                          >
                            {conv.isPinned ? (
                              <StarSolidIcon
                                className="w-3.5 h-3.5"
                                style={{ color: 'var(--business-warning)' }}
                              />
                            ) : (
                              <StarOutlineIcon
                                className="w-3.5 h-3.5"
                                style={{
                                  color: 'var(--color-muted-foreground)',
                                }}
                              />
                            )}
                          </button>
                          {conv.unreadCount > 0 && (
                            <span
                              className="text-[10px] font-mono tabular-nums font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 text-white"
                              style={{ background: 'var(--business-danger)' }}
                            >
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div
                  className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
                  style={{
                    borderColor:
                      'color-mix(in srgb, var(--color-primary) 24%, transparent)',
                    borderTopColor: 'transparent',
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UnifiedConversationSidebar;
