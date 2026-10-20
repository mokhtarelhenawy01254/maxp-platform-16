import { useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/apiClient';
import { parseInboxConversationMetadata } from '@/utils/inboxConversationMetadata';
import type { InboxConversation, InboxTab } from '@/types/inbox.types';
import { getApiError } from '../types/facebookInboxTypes';

interface UseFacebookInboxUrlSyncParams {
  companyId: string | null | undefined;
  conversations: InboxConversation[];
  selectConversation: (conversation: InboxConversation | null) => void;
  addConversationToList: (conv: InboxConversation) => void;
}

export function useFacebookInboxUrlSync({
  companyId,
  conversations,
  selectConversation,
  addConversationToList,
}: UseFacebookInboxUrlSyncParams) {
  const { t } = useTranslation();
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const clearConversationUrlParam = useCallback(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('conversation')) return;
    currentUrl.searchParams.delete('conversation');
    const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

  const loadSpecificConversation = useCallback(
    async (conversationId: string) => {
      if (!companyId || !conversationId) return;

      try {
        const existingConversation = conversationsRef.current.find(
          (c) => c.id === conversationId,
        );
        if (existingConversation) {
          selectConversation(existingConversation);
          return;
        }

        const response = await apiClient.get(
          `/conversations/${conversationId}`,
          { params: { companyId } },
        );

        const convData = response.data?.data || response.data;
        if (!convData) {
          clearConversationUrlParam();
          return;
        }

        const metadata = parseInboxConversationMetadata(convData.metadata);

        const formattedConversation: InboxConversation = {
          id: convData.id,
          customerId: convData.customerId,
          customerName:
            convData.customer?.name ||
            convData.customerName ||
            t('conversations.customer'),
          customerAvatar: convData.customer?.avatar || convData.customerAvatar,
          lastMessage: convData.lastMessage || t('conversations.noMessages'),
          lastMessageTime: new Date(
            convData.lastMessageTime || convData.updatedAt,
          ),
          unreadCount: convData.unreadCount || 0,
          platform: 'facebook' as const,
          tab: (() => {
            const status = (convData.status || 'active').toLowerCase();
            if (status === 'resolved' || status === 'done') return 'done';
            if (
              status === 'active' ||
              status === 'open' ||
              status === 'pending'
            ) {
              const metadataTab = metadata?.tab || metadata?.inboxTab;
              if (
                metadataTab &&
                ['main', 'general', 'requests', 'spam'].includes(metadataTab)
              ) {
                return metadataTab as InboxTab;
              }
              return 'main';
            }
            return 'all';
          })(),
          status: (() => {
            const status = (convData.status || 'active').toLowerCase();
            if (status === 'resolved' || status === 'done') return 'done';
            if (status === 'pending') return 'pending';
            return 'open';
          })(),
          assignedTo: convData.assignedTo || null,
          assignedToName: convData.assignedToName || null,
          tags: convData.tags || [],
          priority: convData.priority || false,
          snoozedUntil: convData.snoozedUntil
            ? new Date(convData.snoozedUntil)
            : metadata?.snoozedUntil
              ? new Date(metadata.snoozedUntil as string)
              : null,
          archived: convData.archived || false,
          muted: convData.muted || false,
          lastStatusChange: new Date(
            convData.lastStatusChange || convData.updatedAt,
          ),
          firstResponseTime: convData.firstResponseTime || null,
          avgResponseTime: convData.avgResponseTime || null,
          pageName: convData.pageName,
          pageId: convData.pageId,
          metadata,
          lastMessageIsFromCustomer: convData.lastMessageIsFromCustomer,
          hasUnreadMessages: convData.hasUnreadMessages,
          postId: (() => {
            if (convData.postId) return convData.postId;
            if (metadata?.postId) return metadata.postId;
            return null;
          })(),
          postDetails: null,
          postDetailsUnavailable: false,
        };

        addConversationToList(formattedConversation);
        selectConversation(formattedConversation);
      } catch (error: unknown) {
        const status = getApiError(error).response?.status;
        if (status === 404 || status === 403) {
          clearConversationUrlParam();
        }
      }
    },
    [companyId, selectConversation, addConversationToList, clearConversationUrlParam, t],
  );

  const urlConversationLoadedRef = useRef(false);
  useEffect(() => {
    if (urlConversationLoadedRef.current || !companyId) return;
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('conversation');
    if (conversationId) {
      urlConversationLoadedRef.current = true;
      setTimeout(() => {
        loadSpecificConversation(conversationId);
      }, 500);
    }
  }, [companyId, loadSpecificConversation]);

  return {
    clearConversationUrlParam,
    loadSpecificConversation,
  };
}

export default useFacebookInboxUrlSync;
