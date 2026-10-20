import { useState, useRef, useCallback, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';
import type {
  UnifiedConversation,
  StatusFilter,
} from '../types/unifiedInboxTypes';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  pagination?: { totalPages: number; page?: number; total?: number };
}

export const useUnifiedInboxData = (
  selectedConversation: UnifiedConversation | null,
  setSelectedConversation: React.Dispatch<
    React.SetStateAction<UnifiedConversation | null>
  >,
) => {
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [activeTab, setActiveTab] = useState('all');

  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectMode, setSelectMode] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadConversations = useCallback(
    async (pageNum?: number, append?: boolean) => {
      const targetPage = pageNum ?? 1;
      const isAppend = append ?? false;

      try {
        if (!isAppend) setLoading(true);
        else setLoadingMore(true);

        const params = new URLSearchParams();

        if (selectedPlatforms.length > 0) {
          params.set('platform', selectedPlatforms.join(','));
        } else {
          params.set('platform', 'all');
        }

        if (searchQuery) params.set('search', searchQuery);
        if (activeTab !== 'all') params.set('tab', activeTab);
        if (activeFilter === 'followUp') params.set('isPinned', 'true');
        if (activeFilter === 'unread') params.set('unreadOnly', 'true');
        params.set('limit', '50');
        params.set('page', String(targetPage));

        const response = await apiClient.get<
          ApiResponse<UnifiedConversation[]>
        >(`/api/v1/unified-inbox/conversations?${params.toString()}`);

        if (response.data?.success) {
          const newData = response.data.data || [];
          const pagination = response.data.pagination || { totalPages: 0 };
          const hasNext = pagination.totalPages > targetPage;

          setHasMore(hasNext);
          pageRef.current = targetPage;

          if (isAppend) {
            setConversations((prev) => {
              const existingIds = new Set(prev.map((c) => c.id));
              const fresh = newData.filter((c) => !existingIds.has(c.id));
              return [...prev, ...fresh];
            });
          } else {
            setConversations(newData);
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedPlatforms, searchQuery, activeFilter, activeTab],
  );

  const loadMoreConversations = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadConversations(pageRef.current + 1, true);
  }, [hasMore, loadingMore, loadConversations]);

  const handleConversationListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
        loadMoreConversations();
      }
    },
    [loadMoreConversations],
  );

  const toggleSelectConv = useCallback((id: string) => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedConvIds(new Set());
    setSelectMode(false);
  }, []);

  const handleRefresh = useCallback(() => {
    loadConversations();
  }, [loadConversations]);

  const handleToggleConvStar = useCallback(
    async (convId: string, currentlyPinned: boolean) => {
      const newPinned = !currentlyPinned;
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, isPinned: newPinned } : c)),
      );
      if (selectedConversation?.id === convId) {
        setSelectedConversation((prev) =>
          prev ? { ...prev, isPinned: newPinned } : null,
        );
      }
      try {
        await apiClient.put(`/api/v1/unified-inbox/conversations/${convId}`, {
          isPinned: newPinned,
        });
      } catch (err) {
        console.error('Error toggling star:', err);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, isPinned: currentlyPinned } : c,
          ),
        );
      }
    },
    [selectedConversation, setSelectedConversation],
  );

  const handleBulkUpdate = useCallback(
    async (status: string) => {
      if (selectedConvIds.size === 0) return;
      try {
        await Promise.all(
          Array.from(selectedConvIds).map((id) =>
            apiClient.put(`/api/v1/unified-inbox/conversations/${id}`, {
              status,
            }),
          ),
        );
        setConversations((prev) =>
          prev.filter((c) => !selectedConvIds.has(c.id)),
        );
        if (
          selectedConversation &&
          selectedConvIds.has(selectedConversation.id)
        ) {
          setSelectedConversation(null);
        }
        clearSelection();
      } catch (err) {
        console.error('Error bulk update:', err);
      }
    },
    [selectedConvIds, selectedConversation, setSelectedConversation, clearSelection],
  );

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    setConversations,
    loading,
    loadingMore,
    hasMore,
    searchQuery,
    localSearchQuery,
    selectedPlatforms,
    setSelectedPlatforms,
    activeFilter,
    setActiveFilter,
    activeTab,
    setActiveTab,
    selectedConvIds,
    selectMode,
    setSelectMode,
    toggleSelectConv,
    clearSelection,
    loadConversations,
    loadMoreConversations,
    handleConversationListScroll,
    handleRefresh,
    handleToggleConvStar,
    handleBulkUpdate,
    handleSearchChange,
  };
};
