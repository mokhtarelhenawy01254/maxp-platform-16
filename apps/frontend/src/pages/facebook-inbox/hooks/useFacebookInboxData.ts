import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { apiService } from '@/services/apiService';
import { apiClient } from '@/services/apiClient';
import type { FilterState } from '@/components/facebook-inbox/FilterPanel/FilterPanel';
import type {
  InboxConversation,
  InboxMessage,
  InboxTab,
} from '@/types/inbox.types';
import type { TabCountsState } from '../types/facebookInboxTypes';
import useFacebookInboxUrlSync from './useFacebookInboxUrlSync';
import useFacebookInboxSearch from './useFacebookInboxSearch';

interface UseFacebookInboxDataParams {
  channel: string;
  companyId: string | null | undefined;
  conversations: InboxConversation[];
  selectedConversation: InboxConversation | null;
  selectConversation: (conversation: InboxConversation | null) => void;
  messages: InboxMessage[];
  loadConversations: (
    page?: number,
    append?: boolean,
    tab?: InboxTab,
    search?: string,
    channel?: string,
    priorityOnly?: boolean,
  ) => void;
  addConversationToList: (conv: InboxConversation) => void;
  updateSelectedConversation: (updates: Partial<InboxConversation>) => void;
  apiCounts: { total?: number; unreplied?: number; priority?: number };
  user: any;
}

export function useFacebookInboxData({
  channel,
  companyId,
  conversations,
  selectedConversation,
  selectConversation,
  messages,
  loadConversations,
  addConversationToList,
  updateSelectedConversation,
  apiCounts,
  user,
}: UseFacebookInboxDataParams) {
  const [activeTab, setActiveTab] = useState<InboxTab>('unreplied');
  const [filters, setFilters] = useState<FilterState>({
    unreadOnly: false,
    assignedTo: 'all',
    startDate: null,
    endDate: null,
    priorityOnly: false,
  });

  // Customer block state
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlockStatus, setCheckingBlockStatus] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // Sub-hook 1: URL synchronization
  const { clearConversationUrlParam } = useFacebookInboxUrlSync({
    companyId,
    conversations,
    selectConversation,
    addConversationToList,
  });

  // Sub-hook 2: Search & filtering
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filteredConversations,
  } = useFacebookInboxSearch({
    conversations,
    selectedConversation,
    messages,
    filters,
    activeTab,
    userId: user?.id,
  });

  // Tab counts calculation
  const tabCounts: TabCountsState = useMemo(() => {
    const counts = {
      all: apiCounts.total || 0,
      unreplied: apiCounts.unreplied || 0,
      done: 0,
      main: 0,
      general: 0,
      requests: 0,
      spam: 0,
      priority: 0,
    };

    if (conversations.length > 0) {
      for (const conv of conversations) {
        if (conv.priority) {
          counts.priority++;
        }
        switch (conv.tab) {
          case 'done':
            counts.done++;
            break;
          case 'main':
            counts.main++;
            break;
          case 'general':
            counts.general++;
            break;
          case 'requests':
            counts.requests++;
            break;
          case 'spam':
            counts.spam++;
            break;
        }
      }
    }

    if (!apiCounts.total && conversations.length > 0) {
      counts.all = conversations.length;
    }

    return {
      ...counts,
      priority: apiCounts.priority || counts.priority,
    };
  }, [conversations, apiCounts]);

  const priorityCount = tabCounts.priority;

  // Debounced load conversations
  const loadConversationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadConversationsRef = useRef(loadConversations);
  const debouncedSearchQueryRef = useRef(debouncedSearchQuery);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  debouncedSearchQueryRef.current = debouncedSearchQuery;
  loadConversationsRef.current = loadConversations;

  const debouncedLoadConversations = useCallback(
    (tab: InboxTab) => {
      if (loadConversationsTimeoutRef.current) {
        clearTimeout(loadConversationsTimeoutRef.current);
      }
      loadConversationsTimeoutRef.current = setTimeout(() => {
        const search = debouncedSearchQueryRef.current?.trim();
        const isPriority = filtersRef.current.priorityOnly || tab === 'priority';
        if (search) {
          loadConversationsRef.current(1, false, tab, search, channel, isPriority);
        } else {
          loadConversationsRef.current(1, false, tab, undefined, channel, isPriority);
        }
        loadConversationsTimeoutRef.current = null;
      }, 500);
    },
    [channel],
  );

  // Trigger search / reload on tab or filter change
  const isInitialMount = useRef(true);
  useEffect(() => {
    const isPriority = filters.priorityOnly || activeTab === 'priority';
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const search = debouncedSearchQuery?.trim();
      loadConversationsRef.current(
        1,
        false,
        activeTab,
        search || undefined,
        channel,
        isPriority,
      );
      return;
    }

    const search = debouncedSearchQuery?.trim();
    loadConversationsRef.current(
      1,
      false,
      activeTab,
      search || undefined,
      channel,
      isPriority,
    );
  }, [activeTab, debouncedSearchQuery, filters.priorityOnly, channel]);

  // Check customer block status
  const checkBlockStatus = useCallback(async () => {
    if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
      setIsBlocked(false);
      return;
    }

    try {
      setCheckingBlockStatus(true);
      const status = await apiService.checkCustomerBlockStatus(
        selectedConversation.customerId,
        selectedConversation.pageId,
      );
      setIsBlocked(status.isBlocked);
    } catch {
      setIsBlocked(false);
    } finally {
      setCheckingBlockStatus(false);
    }
  }, [selectedConversation?.pageId, selectedConversation?.customerId]);

  useEffect(() => {
    if (selectedConversation?.pageId && selectedConversation?.customerId) {
      checkBlockStatus();
    } else {
      setIsBlocked(false);
    }
  }, [
    selectedConversation?.id,
    selectedConversation?.pageId,
    selectedConversation?.customerId,
    checkBlockStatus,
  ]);

  // Lazy post details enrichment
  const fetchPostDetails = useCallback(
    async (conversationId: string) => {
      try {
        const response = await apiClient.get(
          `/conversations/${conversationId}/post-details`,
        );
        if (response.data?.success && response.data?.data) {
          updateSelectedConversation({
            postDetails: response.data.data,
            postDetailsUnavailable: false,
          });
          return;
        }
        if (response.data?.success && response.data?.unavailable) {
          updateSelectedConversation({
            postDetails: null,
            postDetailsUnavailable: true,
          });
        }
      } catch {
        updateSelectedConversation({
          postDetails: null,
          postDetailsUnavailable: true,
        });
      }
    },
    [updateSelectedConversation],
  );

  useEffect(() => {
    if (
      selectedConversation?.postId &&
      !selectedConversation?.postDetails &&
      !selectedConversation?.postDetailsUnavailable
    ) {
      fetchPostDetails(selectedConversation.id);
    }
  }, [
    selectedConversation?.id,
    selectedConversation?.postId,
    selectedConversation?.postDetails,
    selectedConversation?.postDetailsUnavailable,
    fetchPostDetails,
  ]);

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filters,
    setFilters,
    tabCounts,
    priorityCount,
    filteredConversations,
    debouncedLoadConversations,
    clearConversationUrlParam,
    isBlocked,
    setIsBlocked,
    checkingBlockStatus,
    blocking,
    setBlocking,
    checkBlockStatus,
  };
}

export default useFacebookInboxData;
