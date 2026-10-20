import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient as api } from '@/services/apiClient';
import { tToast } from '@/utils/i18n-toast';
import useDebounce from '@/hooks/useDebounce';
import {
  useWhatsAppSessions,
  useWhatsAppConversations,
  useWhatsAppMessages,
  type Contact,
  type Message,
  type Session,
  type WhatsAppSidebarFilter,
  type WhatsAppConversationCounts,
} from '@/hooks/useWhatsAppQueries';
import { useVirtualMessages, useInfiniteScroll } from '@/hooks/useVirtualScroll';
import type { CatalogProduct } from '../chat/types/whatsappChatTypes';

export function useWhatsAppChatData() {
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [chatFilter, setChatFilter] = useState<WhatsAppSidebarFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<{
    name: string;
    status: string;
    profilePicUrl: string;
  } | null>(null);
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [starredMessages, setStarredMessages] = useState<Message[]>([]);
  const [starredMessagesOpen, setStarredMessagesOpen] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollMessageIdRef = useRef<string | null>(null);
  const isSearchingForMessageRef = useRef(false);

  // TanStack Query Hooks
  const { data: sessions = [], isLoading: loadingSessions } = useWhatsAppSessions();

  // Auto-select first session when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !selectedSession) {
      setSelectedSession(sessions[0]!.id);
    }
  }, [sessions, selectedSession]);

  const {
    data: conversationsData,
    isLoading: loadingConversations,
    isFetchingNextPage: isLoadingMoreConversations,
    fetchNextPage: fetchNextConversationsPage,
    hasNextPage: hasMoreConversations,
    isError: conversationsError,
    refetch: refetchConversations,
  } = useWhatsAppConversations(selectedSession || 'all', 30, {
    filter: chatFilter,
    search: debouncedSearch,
    archived: showArchived,
  });

  const conversations = useMemo(() => {
    if (!conversationsData) return [];
    return conversationsData.pages.flatMap((page) => page.conversations || []);
  }, [conversationsData]);

  const conversationCounts = useMemo<WhatsAppConversationCounts>(() => {
    const counts = conversationsData?.pages?.[0]?.counts;
    return counts || { all: 0, unread: 0, groups: 0, unreplied: 0, archived: 0 };
  }, [conversationsData]);

  const targetSessionId = useMemo(() => {
    if (!selectedContact || !selectedSession) return null;
    return selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
  }, [selectedContact, selectedSession]);

  const {
    data: messagesData,
    isLoading: loadingMessages,
    fetchNextPage: fetchNextMessagesPage,
    hasNextPage: hasMoreMessages,
    isError: messagesError,
    refetch: refetchMessages,
  } = useWhatsAppMessages(selectedContact?.jid || null, targetSessionId);

  const messages = useMemo(() => {
    if (!messagesData) return [];
    const allMessages = messagesData.pages.flatMap((page) => page.messages || []);
    return allMessages.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });
  }, [messagesData]);

  const visibleMessages = useMemo(() => {
    const reactionsByTargetId = new Map<string, Record<string, string>>();
    for (const m of messages) {
      if (m.messageType === 'REACTION' && m.quotedMessageId && m.content) {
        const targetId = m.quotedMessageId;
        const reactorKey = m.fromMe ? 'me' : m.participant || m.remoteJid || 'customer';
        const existing = reactionsByTargetId.get(targetId) || {};
        existing[reactorKey] = m.content;
        reactionsByTargetId.set(targetId, existing);
      }
    }

    return messages
      .filter((m) => m.messageType !== 'REACTION')
      .map((m) => {
        let metaReactions: Record<string, string> = {};
        if (m.metadata) {
          try {
            const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
            if (meta?.reactions && typeof meta.reactions === 'object' && !Array.isArray(meta.reactions)) {
              metaReactions = { ...meta.reactions };
            }
          } catch {}
        }
        if (m.reactions && typeof m.reactions === 'object' && !Array.isArray(m.reactions)) {
          metaReactions = { ...metaReactions, ...m.reactions };
        }

        const extra = reactionsByTargetId.get(m.messageId);
        const merged = extra ? { ...metaReactions, ...extra } : metaReactions;
        const hasReactions = Object.keys(merged).length > 0;

        if (hasReactions) {
          let updatedMeta = m.metadata;
          if (typeof updatedMeta === 'object' && updatedMeta !== null) {
            updatedMeta = { ...updatedMeta, reactions: merged };
          }
          return {
            ...m,
            metadata: updatedMeta,
            reactions: merged,
          };
        }
        return m;
      });
  }, [messages]);

  const { data: remotePinnedMessage } = useQuery<Message | null>({
    queryKey: ['whatsapp', 'pinned', selectedContact?.jid, targetSessionId],
    queryFn: async () => {
      if (!selectedContact?.jid) return null;
      try {
        const res = await api.get(
          `/whatsapp/conversations/${encodeURIComponent(selectedContact.jid)}/pinned`,
          {
            params: targetSessionId ? { sessionId: targetSessionId } : undefined,
          },
        );
        return (res as any).data?.pinnedMessage || null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(selectedContact?.jid),
    staleTime: 30000,
  });

  const currentPinnedMessage = useMemo(() => {
    const pinnedInVisible = [...visibleMessages].reverse().find((m) => {
      let meta: any = m.metadata;
      if (typeof meta === 'string') {
        try {
          meta = JSON.parse(meta);
        } catch {
          meta = {};
        }
      }
      return m.isPinned === true || meta?.isPinned === true;
    });
    if (pinnedInVisible) return pinnedInVisible;
    return remotePinnedMessage || null;
  }, [visibleMessages, remotePinnedMessage]);

  const activeSessionId = useMemo(() => {
    if (selectedSession && selectedSession !== 'all') {
      return selectedSession;
    }

    const isConnected = (s: Session) => {
      const status = String(s.status || '').toLowerCase();
      const liveStatus = String(s.liveStatus || '').toLowerCase();
      return status === 'connected' || liveStatus === 'connected';
    };

    const connectedSession = sessions.find((s) => s.id !== 'all' && isConnected(s));
    if (connectedSession) return connectedSession.id;

    const firstReal = sessions.find((s) => s.id !== 'all');
    return firstReal?.id || '';
  }, [selectedSession, sessions]);

  // Virtualizer for messages
  const { virtualizer: messagesVirtualizer } = useVirtualMessages(
    visibleMessages,
    messagesContainerRef,
    {
      estimateSize: 60,
      overscan: 10,
      scrollToBottom: true,
      reverse: false,
    },
  );

  useInfiniteScroll(
    messagesContainerRef,
    () => {
      if (hasMoreMessages && !loadingMessages) {
        fetchNextMessagesPage();
      }
    },
    { threshold: 200, enabled: Boolean(selectedContact) },
  );

  const handleScrollToMessage = useCallback(
    (messageId: string) => {
      const index = visibleMessages.findIndex((m) => m.messageId === messageId);
      if (index !== -1) {
        messagesVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      } else {
        pendingScrollMessageIdRef.current = messageId;
        if (!isSearchingForMessageRef.current && hasMoreMessages) {
          isSearchingForMessageRef.current = true;
          fetchNextMessagesPage();
        }
      }
    },
    [visibleMessages, messagesVirtualizer, hasMoreMessages, fetchNextMessagesPage],
  );

  useEffect(() => {
    const targetId = pendingScrollMessageIdRef.current;
    if (!targetId) return;

    const index = visibleMessages.findIndex((m) => m.messageId === targetId);
    if (index !== -1) {
      pendingScrollMessageIdRef.current = null;
      isSearchingForMessageRef.current = false;
      const timer = setTimeout(() => {
        messagesVirtualizer.scrollToIndex(index, { align: 'center', behavior: 'smooth' });
        setHighlightedMessageId(targetId);
        setTimeout(() => setHighlightedMessageId(null), 3000);
      }, 300);
      return () => clearTimeout(timer);
    }
    if (hasMoreMessages && !loadingMessages) {
      fetchNextMessagesPage();
    } else if (!hasMoreMessages) {
      pendingScrollMessageIdRef.current = null;
      isSearchingForMessageRef.current = false;
    }
    return undefined;
  }, [visibleMessages, hasMoreMessages, loadingMessages, fetchNextMessagesPage, messagesVirtualizer]);

  // User Profile
  const fetchUserProfile = useCallback(async () => {
    if (!selectedSession || selectedSession === 'all') return;
    try {
      const response = await api.get('/whatsapp/profile', { params: { sessionId: selectedSession } });
      if ((response as any).data?.success) {
        const profile = (response as any).data.profile || {};
        setCurrentUserProfile({
          name: profile.name || profile.profileName || '',
          status: profile.status || profile.profileStatus || '',
          profilePicUrl: profile.profilePicUrl || profile.profilePictureUrl || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession && selectedSession !== 'all') {
      void fetchUserProfile();
    }
  }, [selectedSession, fetchUserProfile]);

  // Labels
  useEffect(() => {
    if (!activeSessionId) return;
    api
      .get('/whatsapp/labels', { params: { sessionId: activeSessionId } })
      .then((res) => setLabels(res.data.labels || []))
      .catch((err) => console.error('Error loading labels:', err));
  }, [activeSessionId]);

  // Catalog Products
  const loadProducts = useCallback(async () => {
    if (!selectedSession || selectedSession === 'all') return;
    try {
      const res = await api.get('/whatsapp/catalog/products', {
        params: { sessionId: selectedSession },
      });
      setProducts((res as any).data?.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, [selectedSession]);

  // Starred Messages
  const loadStarredMessages = useCallback(async () => {
    if (!selectedSession || !selectedContact) return;
    const targetSid = selectedContact.sessionId || selectedSession;
    try {
      const res = await api.get('/whatsapp/messages/starred', {
        params: { sessionId: targetSid, jid: selectedContact.jid },
      });
      setStarredMessages((res as any).data?.messages || []);
      setStarredMessagesOpen(true);
    } catch {
      tToast.error("whatsappChat.failed_load_229c");
    }
  }, [selectedSession, selectedContact]);

  // Template Messages
  const handleOpenTemplateDialog = useCallback(async () => {
    if (!selectedSession) return;
    const sessionId =
      selectedContact?.sessionId || (selectedSession === 'all' ? null : selectedSession);
    if (!sessionId) {
      tToast.error("whatsappChat.msg_f28c");
      return;
    }
    setLoadingTemplates(true);
    try {
      const res = await api.get('/whatsapp-templates/templates', {
        params: { sessionId },
      });
      const allTemplates = (res as any).data?.templates || (res as any).data?.data || [];
      setTemplates(allTemplates.filter((t: any) => t.status === 'APPROVED'));
    } catch {
      tToast.error("whatsappChat.failed_load_055c");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [selectedSession, selectedContact]);

  return {
    sessions,
    loadingSessions,
    selectedSession,
    setSelectedSession,
    activeSessionId,
    selectedContact,
    setSelectedContact,
    targetSessionId,
    conversations,
    conversationCounts,
    loadingConversations,
    isLoadingMoreConversations,
    hasMoreConversations,
    conversationsError,
    refetchConversations,
    fetchNextConversationsPage,
    chatFilter,
    setChatFilter,
    searchTerm,
    setSearchTerm,
    showArchived,
    setShowArchived,
    visibleMessages,
    loadingMessages,
    messagesError,
    refetchMessages,
    fetchNextMessagesPage,
    hasMoreMessages,
    messagesVirtualizer,
    messagesContainerRef,
    handleScrollToMessage,
    highlightedMessageId,
    currentPinnedMessage,
    currentUserProfile,
    labels,
    products,
    loadProducts,
    starredMessages,
    loadStarredMessages,
    starredMessagesOpen,
    setStarredMessagesOpen,
    templates,
    loadingTemplates,
    handleOpenTemplateDialog,
  };
}
