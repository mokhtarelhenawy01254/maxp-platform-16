import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/services/apiClient';
import type { FilterState } from '@/components/facebook-inbox/FilterPanel/FilterPanel';
import type {
  InboxConversation,
  InboxMessage,
  InboxTab,
} from '@/types/inbox.types';
import type { InboxApiMessage } from '../types/facebookInboxTypes';

interface UseFacebookInboxSearchParams {
  conversations: InboxConversation[];
  selectedConversation: InboxConversation | null;
  messages: InboxMessage[];
  filters: FilterState;
  activeTab: InboxTab;
  userId?: string;
}

export function useFacebookInboxSearch({
  conversations,
  selectedConversation,
  messages,
  filters,
  activeTab,
  userId,
}: UseFacebookInboxSearchParams) {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const [conversationMessages, setConversationMessages] = useState<
    Map<string, InboxMessage[]>
  >(new Map());
  const [loadingMessagesForSearch, setLoadingMessagesForSearch] = useState<
    Set<string>
  >(new Set());

  const loadAllMessagesForConversation = useCallback(
    async (conversationId: string) => {
      if (loadingMessagesForSearch.has(conversationId)) return;
      if (conversationMessages.has(conversationId)) return;

      if (selectedConversation?.id === conversationId && messages.length > 0) {
        setConversationMessages((prev) => new Map(prev).set(conversationId, messages));
        return;
      }

      setLoadingMessagesForSearch((prev) => new Set(prev).add(conversationId));

      try {
        let allMessages: InboxMessage[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await apiClient.get(
            `/conversations/${conversationId}/messages`,
            { params: { page, limit: 50 } },
          );

          const data = (response.data?.data ||
            response.data ||
            []) as InboxApiMessage[];

          if (data.length === 0) {
            hasMore = false;
            break;
          }

          const parsed: InboxMessage[] = data.map((msg) => ({
            id: msg.id || '',
            content: msg.content || '',
            senderId: msg.senderId || msg.sender?.id || '',
            senderName:
              msg.senderName ||
              msg.sender?.name ||
              (msg.isFromCustomer
                ? t('facebookInbox.customer')
                : t('facebookInbox.employee')),
            timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()),
            type: (msg.type || 'text') as InboxMessage['type'],
            isFromCustomer: msg.isFromCustomer || false,
            status: (msg.status || 'sent') as InboxMessage['status'],
            conversationId: conversationId,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            isAIResponse:
              msg.isAIResponse || (!msg.isFromCustomer && !msg.senderId),
          }));

          allMessages = [...allMessages, ...parsed];
          if (data.length < 50) {
            hasMore = false;
          } else {
            page++;
          }
        }

        setConversationMessages((prev) => new Map(prev).set(conversationId, allMessages));
      } catch {
        // Silently catch search errors
      } finally {
        setLoadingMessagesForSearch((prev) => {
          const next = new Set(prev);
          next.delete(conversationId);
          return next;
        });
      }
    },
    [selectedConversation?.id, messages, loadingMessagesForSearch, conversationMessages, t],
  );

  useEffect(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') return;
    const searchLower = debouncedSearchQuery.toLowerCase().trim();

    const matching = conversations.filter((conv) => {
      const matchesName = conv.customerName.toLowerCase().includes(searchLower);
      const matchesMessage = conv.lastMessage.toLowerCase().includes(searchLower);
      return matchesName || matchesMessage;
    });

    matching.forEach((conv) => {
      if (!conversationMessages.has(conv.id)) {
        loadAllMessagesForConversation(conv.id);
      }
    });
  }, [debouncedSearchQuery, conversations, conversationMessages, loadAllMessagesForConversation]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesName = conv.customerName.toLowerCase().includes(query);
        const matchesMessage = conv.lastMessage.toLowerCase().includes(query);

        let matchesMessagesContent = false;
        const loadedMessages = conversationMessages.get(conv.id);
        if (loadedMessages && loadedMessages.length > 0) {
          matchesMessagesContent = loadedMessages.some((msg) =>
            (msg.content || '').toLowerCase().includes(query),
          );
        } else if (
          selectedConversation?.id === conv.id &&
          messages.length > 0
        ) {
          matchesMessagesContent = messages.some((msg) =>
            (msg.content || '').toLowerCase().includes(query),
          );
        }

        if (!matchesName && !matchesMessage && !matchesMessagesContent) {
          return false;
        }
      }

      if (filters.unreadOnly && conv.unreadCount === 0) return false;
      if (
        (filters.priorityOnly || activeTab === 'priority') &&
        !conv.priority
      ) {
        return false;
      }

      if (filters.assignedTo === 'me' && conv.assignedTo !== userId) {
        return false;
      }
      if (filters.assignedTo === 'unassigned' && conv.assignedTo !== null) {
        return false;
      }

      if (filters.startDate || filters.endDate) {
        const convDate = new Date(conv.lastMessageTime);
        if (filters.startDate && convDate < filters.startDate) return false;
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (convDate > endOfDay) return false;
        }
      }

      return true;
    });
  }, [
    conversations,
    debouncedSearchQuery,
    filters,
    activeTab,
    userId,
    selectedConversation?.id,
    messages,
    conversationMessages,
  ]);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filteredConversations,
  };
}

export default useFacebookInboxSearch;
