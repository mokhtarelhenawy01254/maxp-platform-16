import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { socketService } from '@/services/socketService';
import {
  requestBrowserNotificationPermission,
  showBrowserNotification as showNativeBrowserNotification,
} from '@/utils/browserNotifications';
import type { InboxConversation, InboxMessage, InboxTab } from '@/types/inbox.types';
import type { SocketInboxMessage } from '../types/facebookInboxTypes';

interface UseFacebookInboxSocketParams {
  socket: any;
  isConnected: boolean;
  channel: string;
  selectedConversation: InboxConversation | null;
  activeTab: InboxTab;
  addMessage: (msg: InboxMessage) => void;
  updateMessage: (id: string, updater: (prev: InboxMessage) => InboxMessage) => void;
  updateConversationInList: (id: string, updates: Partial<InboxConversation>) => void;
  markMessagesAsRead: (watermark: number) => void;
  debouncedLoadConversations: (tab: InboxTab) => void;
  loadMessages: (conversationId: string) => void;
  userId?: string;
}

export function useFacebookInboxSocket({
  socket,
  isConnected,
  channel,
  selectedConversation,
  activeTab,
  addMessage,
  updateMessage,
  updateConversationInList,
  markMessagesAsRead,
  debouncedLoadConversations,
  loadMessages,
  userId,
}: UseFacebookInboxSocketParams) {
  const { t } = useTranslation();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Grace period on initial mount to avoid flickering disconnect
  const [hasConnectionGracePeriodPassed, setHasConnectionGracePeriodPassed] =
    useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasConnectionGracePeriodPassed(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    socketService.playNotificationSound();
  }, [soundEnabled]);

  const showBrowserNotification = useCallback(
    (title: string, body: string, icon?: string) => {
      if (!notificationsEnabled) return;

      const notificationOptions = {
        title,
        body,
        icon: icon || '/favicon.ico',
        tag: 'new-message',
        requireInteraction: false,
        silent: false,
      };

      const wasShown = showNativeBrowserNotification(notificationOptions);
      if (wasShown) return;

      if ('Notification' in window && Notification.permission !== 'denied') {
        void requestBrowserNotificationPermission().then((permission) => {
          if (permission === 'granted') {
            showNativeBrowserNotification(notificationOptions);
          }
        });
      }
    },
    [notificationsEnabled],
  );

  const activeTabRef = useRef<InboxTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (data: SocketInboxMessage) => {
      if (data.channel && data.channel !== channel) return;
      if (
        selectedConversation &&
        data.conversationId === selectedConversation.id
      ) {
        addMessage(data);
      }

      if (data.isFromCustomer) {
        playNotificationSound();
        if (
          !selectedConversation ||
          data.conversationId !== selectedConversation.id
        ) {
          showBrowserNotification(
            t('conversations.newMessageFrom', {
              name: data.customerName || t('conversations.customer'),
            }),
            data.content?.substring(0, 50) || t('conversations.newMessage'),
          );
        }
      }

      debouncedLoadConversations(activeTabRef.current);
    };

    socket.on('new_message', handleNewMessage);

    const handleMessagesRead = (data: {
      conversationId: string;
      watermark: number;
    }) => {
      if (selectedConversation?.id === data.conversationId) {
        markMessagesAsRead(data.watermark);
      }
    };

    socket.on('messages_read', handleMessagesRead);

    const handleReactionUpdated = (data: {
      conversationId: string;
      messageId: string;
      reactions: Record<string, string>;
      userId?: string;
    }) => {
      if (selectedConversation?.id === data.conversationId) {
        updateMessage(data.messageId, (prevMsg) => {
          const prevMeta =
            prevMsg.metadata && typeof prevMsg.metadata === 'object'
              ? { ...prevMsg.metadata }
              : {};
          return {
            ...prevMsg,
            metadata: {
              ...prevMeta,
              reactions: data.reactions,
              myReaction:
                (userId && data.reactions?.[userId]) || prevMeta.myReaction,
            },
          };
        });
      }
    };

    socket.on('message_reaction_updated', handleReactionUpdated);

    const handleAiStatusChanged = (data: {
      conversationId: string;
      channel?: string;
      aiEnabled: boolean;
      aiPausedUntil?: string | null;
    }) => {
      if (data?.conversationId) {
        updateConversationInList(data.conversationId, {
          aiEnabled: data.aiEnabled,
          aiPausedUntil:
            data.aiPausedUntil ?? (data.aiEnabled ? null : undefined),
        });
      }
    };

    socket.on('conversation:ai_status_changed', handleAiStatusChanged);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('message_reaction_updated', handleReactionUpdated);
      socket.off('conversation:ai_status_changed', handleAiStatusChanged);
    };
  }, [
    socket,
    isConnected,
    channel,
    selectedConversation,
    addMessage,
    updateMessage,
    updateConversationInList,
    userId,
    debouncedLoadConversations,
    playNotificationSound,
    showBrowserNotification,
    markMessagesAsRead,
    t,
  ]);

  // Handle external order creation event
  useEffect(() => {
    const handleOrderCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        order: any;
        orderId: string;
        orderNumber?: string;
        conversationId?: string;
        confirmationMessage?: any;
      }>;
      const detail = customEvent.detail;
      if (!detail) return;

      const orderConvId = detail.conversationId || detail.order?.conversationId;
      if (orderConvId && selectedConversation?.id === orderConvId) {
        if (detail.confirmationMessage) {
          addMessage(detail.confirmationMessage);
        } else {
          loadMessages(orderConvId);
        }
      }

      debouncedLoadConversations(activeTabRef.current);
    };

    window.addEventListener('inbox:order-created', handleOrderCreated);
    return () => {
      window.removeEventListener('inbox:order-created', handleOrderCreated);
    };
  }, [selectedConversation?.id, addMessage, loadMessages, debouncedLoadConversations]);

  return {
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    hasConnectionGracePeriodPassed,
    playNotificationSound,
    showBrowserNotification,
  };
}

export default useFacebookInboxSocket;
