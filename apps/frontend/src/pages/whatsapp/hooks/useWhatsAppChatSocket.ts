import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { indexedDBStorage } from '@/services/indexedDBStorage';
import {
  requestBrowserNotificationPermission,
  showBrowserNotification as showNativeBrowserNotification,
} from '@/utils/browserNotifications';
import { apiClient as api } from '@/services/apiClient';
import type { Contact, Message } from '@/hooks/useWhatsAppQueries';
import { getContactDisplayPhone } from '../whatsappContactDisplay';
import type {
  ConversationsCache,
  IncomingMessageEvent,
  MessagesCache,
  MessageStatusEventPayload,
  NotificationEventPayload,
  NotificationSettingsState,
  TypingEventPayload,
} from '../chat/types/whatsappChatTypes';

interface UseWhatsAppChatSocketParams {
  socket: any;
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  selectedSession: string;
  setSelectedSession: (sessionId: string) => void;
  conversations: Contact[];
  normalizeContactJid: (jid: string) => string;
  setTypingUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
  markAsReadMutation: {
    mutate: (
      variables: { sessionId: string; remoteJid: string },
      options?: { onError?: (error: unknown) => void },
    ) => void;
  };
}

export function useWhatsAppChatSocket({
  socket,
  selectedContact,
  setSelectedContact,
  selectedSession,
  setSelectedSession,
  conversations,
  normalizeContactJid,
  setTypingUsers,
  markAsReadMutation,
}: UseWhatsAppChatSocketParams) {
  const queryClient = useQueryClient();

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettingsState>({
      notificationSound: true,
      browserNotifications: true,
    });

  const loadContactsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingMarkAsReadRef = useRef<{ sessionId: string; remoteJid: string } | null>(null);

  const selectedContactRef = useRef(selectedContact);
  const selectedSessionRef = useRef(selectedSession);
  const notificationSettingsRef = useRef(notificationSettings);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
    selectedSessionRef.current = selectedSession;
    notificationSettingsRef.current = notificationSettings;
  }, [selectedContact, selectedSession, notificationSettings]);

  const loadNotificationSettings = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/settings');
      if ((res as any).data?.settings) {
        notificationSettingsRef.current = {
          notificationSound: (res as any).data.settings.notificationSound !== false,
          browserNotifications: (res as any).data.settings.browserNotifications !== false,
        };
      }
    } catch (e) {
      console.error('Error loading notification settings:', e);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await requestBrowserNotificationPermission();
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch((e) => console.log('Audio play failed', e));
    } catch (e) {
      console.error('Error playing notification sound:', e);
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    const notificationOptions = {
      title,
      body,
      icon: icon || '/favicon.ico',
      tag: 'whatsapp-message',
      requireInteraction: false,
      silent: false,
      autoCloseMs: 5000,
    };

    const wasShown = showNativeBrowserNotification(notificationOptions);
    if (wasShown) return;

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'denied') {
      void requestBrowserNotificationPermission().then((permission) => {
        if (permission === 'granted') {
          showNativeBrowserNotification(notificationOptions);
        }
      });
    }
  }, []);

  const markAsReadRef = useRef(markAsReadMutation);
  useEffect(() => {
    markAsReadRef.current = markAsReadMutation;
  }, [markAsReadMutation]);

  const debouncedMarkAsRead = useCallback(
    (sessionId: string, remoteJid: string) => {
      const pending = pendingMarkAsReadRef.current;
      if (
        pending &&
        pending.sessionId === sessionId &&
        pending.remoteJid === remoteJid &&
        markAsReadTimeoutRef.current
      ) {
        return;
      }

      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }

      pendingMarkAsReadRef.current = { sessionId, remoteJid };

      markAsReadTimeoutRef.current = setTimeout(() => {
        const pendingCall = pendingMarkAsReadRef.current;
        if (pendingCall) {
          markAsReadRef.current.mutate(
            {
              sessionId: pendingCall.sessionId,
              remoteJid: pendingCall.remoteJid,
            },
            {
              onError: (error: any) => {
                const errorMessage = error?.response?.data?.error || error?.message || '';
                if (errorMessage.includes('timeout')) {
                  console.warn('Mark as read timeout (silent):', pendingCall.remoteJid);
                } else {
                  console.error('Mark as read error:', error);
                }
              },
            },
          );
          pendingMarkAsReadRef.current = null;
        }
        markAsReadTimeoutRef.current = null;
      }, 600);
    },
    [],
  );

  // Sync selected contact details with conversation changes
  useEffect(() => {
    if (!selectedContact) return;

    const normalizedSelectedJid = normalizeContactJid(selectedContact.jid);
    const syncedContact = conversations.find(
      (contact) =>
        contact.sessionId === selectedContact.sessionId &&
        normalizeContactJid(contact.jid) === normalizedSelectedJid,
    );

    if (!syncedContact) return;

    const hasConversationStateChange =
      syncedContact.unreadCount !== selectedContact.unreadCount ||
      syncedContact.lastMessageAt !== selectedContact.lastMessageAt ||
      syncedContact.isArchived !== selectedContact.isArchived ||
      syncedContact.isPinned !== selectedContact.isPinned ||
      syncedContact.isMuted !== selectedContact.isMuted ||
      syncedContact.isBlocked !== selectedContact.isBlocked ||
      syncedContact.name !== selectedContact.name ||
      syncedContact.pushName !== selectedContact.pushName ||
      syncedContact.profilePicUrl !== selectedContact.profilePicUrl ||
      syncedContact.leadCategoryId !== selectedContact.leadCategoryId;

    if (!hasConversationStateChange) return;

    setSelectedContact({
      ...selectedContact,
      ...syncedContact,
    });
  }, [conversations, normalizeContactJid, selectedContact, setSelectedContact]);

  // Load initial notification settings
  useEffect(() => {
    void loadNotificationSettings();
    void requestNotificationPermission();
  }, [loadNotificationSettings, requestNotificationPermission]);

  // Main socket event bindings
  useEffect(() => {
    if (!socket) return;

    const normalizeJid = normalizeContactJid;

    const findConversationsCache = (sessionKey: string): ConversationsCache | null => {
      const entries = queryClient.getQueriesData<ConversationsCache>({
        queryKey: ['whatsapp', 'conversations', sessionKey],
      });
      for (const [, data] of entries) {
        if (data?.pages?.length) return data;
      }
      return null;
    };

    const handleNewMessage = (data: IncomingMessageEvent) => {
      const { sessionId, message } = data;
      const msgJid = normalizeJid(message.remoteJid);
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      if (message.fromMe) return;

      const isCurrentChat =
        currentContact &&
        msgJid === currentJid &&
        (currentSession === 'all' || sessionId === currentSession);

      if (isCurrentChat) {
        const targetSid =
          currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        queryClient.setQueryData<MessagesCache>(
          ['whatsapp', 'messages', currentContact.jid, targetSid],
          (old) => {
            if (!old) return old;
            const lastPage = old.pages[old.pages.length - 1];
            if (!lastPage) return old;
            if (lastPage.messages.some((m: Message) => m.messageId === message.messageId)) {
              return old;
            }
            const newPages = [...old.pages];
            newPages[newPages.length - 1] = {
              ...lastPage,
              messages: [...lastPage.messages, message],
            };
            return { ...old, pages: newPages };
          },
        );

        if (currentContact && !message.fromMe) {
          const targetSessionId =
            currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);
          if (targetSessionId) {
            debouncedMarkAsRead(targetSessionId, currentContact.jid);
          }
        }

        if (notificationSettingsRef.current.notificationSound) {
          playNotificationSound();
        }
      } else {
        if (currentSession === 'all' || sessionId === currentSession) {
          const sessionKey = currentSession === 'all' ? 'all' : currentSession;
          const conversationsQuery = findConversationsCache(sessionKey);
          const currentContacts = conversationsQuery?.pages?.[0]?.conversations ?? [];
          const contactName =
            currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid)?.name ||
            currentContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid)?.pushName ||
            getContactDisplayPhone({ jid: message.remoteJid });
          const messageText = message.content
            ? message.content.length > 50
              ? `${message.content.substring(0, 50)}...`
              : message.content
            : message.messageType === 'IMAGE'
              ? 'صورة'
              : message.messageType === 'VIDEO'
                ? 'فيديو'
                : message.messageType === 'AUDIO'
                  ? 'صوت'
                  : message.messageType === 'DOCUMENT'
                    ? 'ملف'
                    : 'رسالة جديدة';

          toast.info(messageText, {
            duration: 5000,
            action: {
              label: 'فتح المحادثة',
              onClick: () => {
                const innerKey = currentSession === 'all' ? 'all' : currentSession;
                const innerQuery = findConversationsCache(innerKey);
                const innerContacts = innerQuery?.pages?.[0]?.conversations ?? [];
                const contact = innerContacts.find((c: Contact) => normalizeJid(c.jid) === msgJid);
                if (contact) {
                  setSelectedContact(contact);
                }
              },
            },
          });

          if (notificationSettingsRef.current.notificationSound) {
            playNotificationSound();
          }

          if (notificationSettingsRef.current.browserNotifications) {
            showBrowserNotification(`رسالة جديدة من ${contactName}`, messageText);
          }
        }
      }

      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueriesData<ConversationsCache>(
        { queryKey: ['whatsapp', 'conversations', sessionKey] },
        (old) => {
          if (!old || !old.pages || old.pages.length === 0) return old;
          const firstPage = old.pages[0];
          if (!firstPage) return old;
          const contactIndex = firstPage.conversations.findIndex(
            (c: Contact) => normalizeJid(c.jid) === msgJid,
          );
          if (contactIndex > -1) {
            const contact = firstPage.conversations[contactIndex];
            if (!contact) return old;
            const updatedContact = {
              ...contact,
              lastMessage: {
                content: message.content,
                messageType: message.messageType,
                fromMe: message.fromMe,
                timestamp: message.timestamp,
              },
              lastMessageAt: message.timestamp,
              unreadCount: isCurrentChat ? 0 : (contact.unreadCount || 0) + 1,
            };
            const newContacts = [...firstPage.conversations];
            newContacts.splice(contactIndex, 1);
            const pinned = newContacts.filter((c: Contact) => c.isPinned);
            const unpinned = newContacts.filter((c: Contact) => !c.isPinned);
            if (updatedContact.isPinned) pinned.unshift(updatedContact);
            else unpinned.unshift(updatedContact);
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  conversations: [...pinned, ...unpinned],
                },
                ...old.pages.slice(1),
              ],
            };
          } else if (data.contact) {
            const newContact: Contact = {
              ...data.contact,
              lastMessage: {
                content: message.content,
                messageType: message.messageType,
                fromMe: message.fromMe,
                timestamp: message.timestamp,
              },
              lastMessageAt: message.timestamp,
              unreadCount: isCurrentChat ? 0 : 1,
            };
            const pinned = firstPage.conversations.filter((c: Contact) => c.isPinned);
            const unpinned = firstPage.conversations.filter((c: Contact) => !c.isPinned);
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  conversations: [...pinned, newContact, ...unpinned],
                },
                ...old.pages.slice(1),
              ],
            };
          }
          return old;
        },
      );

      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
      }
      loadContactsTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'conversations'],
          refetchType: 'active',
        });
      }, 500);
    };

    const handleNotification = (data: NotificationEventPayload) => {
      const { contactName, message, messageType, soundEnabled, notificationsEnabled, sessionId } =
        data;
      const currentSession = selectedSessionRef.current;
      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      const conversationsQuery = findConversationsCache(sessionKey);
      const currentContacts = conversationsQuery?.pages?.[0]?.conversations ?? [];
      const currentNotificationSettings = notificationSettingsRef.current;

      const messageText =
        message ||
        (messageType === 'IMAGE'
          ? 'صورة'
          : messageType === 'VIDEO'
            ? 'فيديو'
            : messageType === 'AUDIO'
              ? 'صوت'
              : messageType === 'DOCUMENT'
                ? 'ملف'
                : 'رسالة جديدة');

      toast.info(messageText, {
        duration: 5000,
        action: {
          label: 'فتح المحادثة',
          onClick: () => {
            if (sessionId && sessionId !== currentSession) {
              setSelectedSession(sessionId);
            }
            const contact = currentContacts.find(
              (c: Contact) => c.name === contactName || c.pushName === contactName,
            );
            if (contact) {
              setSelectedContact(contact);
            }
          },
        },
      });

      const shouldShowNotification =
        notificationsEnabled !== undefined
          ? notificationsEnabled
          : currentNotificationSettings.browserNotifications;
      if (shouldShowNotification) {
        showBrowserNotification(`رسالة جديدة من ${contactName}`, messageText);
      }

      const shouldPlaySound =
        soundEnabled !== undefined ? soundEnabled : currentNotificationSettings.notificationSound;
      if (shouldPlaySound) {
        playNotificationSound();
      }
    };

    const handleMessageStatus = (data: MessageStatusEventPayload) => {
      const { messageId, status, remoteJid, sessionId } = data;
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;

      const msgJid = remoteJid
        ? normalizeContactJid(remoteJid)
        : currentContact
          ? normalizeContactJid(currentContact.jid)
          : '';
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      if (
        currentContact &&
        msgJid === currentJid &&
        (currentSession === 'all' || sessionId === currentSession)
      ) {
        const targetSid =
          currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        queryClient.setQueryData<MessagesCache>(
          ['whatsapp', 'messages', currentContact.jid, targetSid],
          (old) => {
            if (!old) return old;
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m: Message) =>
                m.messageId === messageId ? { ...m, status } : m,
              ),
            }));
            return { ...old, pages: newPages };
          },
        );
      }
    };

    const handleMessageSent = (data: IncomingMessageEvent) => {
      const { sessionId, message } = data;
      const currentContact = selectedContactRef.current;
      const currentSession = selectedSessionRef.current;

      const msgJid = normalizeJid(message.remoteJid);
      const currentJid = currentContact ? normalizeJid(currentContact.jid) : '';

      if (
        currentContact &&
        msgJid === currentJid &&
        (currentSession === 'all' || sessionId === currentSession)
      ) {
        const targetSid =
          currentContact.sessionId || (currentSession === 'all' ? sessionId : currentSession);

        queryClient.setQueryData<MessagesCache>(
          ['whatsapp', 'messages', currentContact.jid, targetSid],
          (old) => {
            if (!old) return old;
            const lastPage = old.pages[old.pages.length - 1];
            if (!lastPage) return old;
            if (lastPage.messages.some((m: Message) => m.messageId === message.messageId)) {
              return old;
            }
            const newPages = [...old.pages];
            newPages[newPages.length - 1] = {
              ...lastPage,
              messages: [...lastPage.messages, message],
            };
            return { ...old, pages: newPages };
          },
        );
      }

      const sessionKey = currentSession === 'all' ? 'all' : currentSession;
      queryClient.setQueriesData<ConversationsCache>(
        { queryKey: ['whatsapp', 'conversations', sessionKey] },
        (old) => {
          if (!old || !old.pages || old.pages.length === 0) return old;
          const firstPage = old.pages[0];
          if (!firstPage) return old;
          const contactIndex = firstPage.conversations.findIndex(
            (c: Contact) => normalizeJid(c.jid) === msgJid,
          );
          if (contactIndex > -1) {
            const contact = firstPage.conversations[contactIndex];
            if (!contact) return old;
            const updatedContact = {
              ...contact,
              lastMessage: {
                content: message.content,
                messageType: message.messageType,
                fromMe: message.fromMe,
                timestamp: message.timestamp,
              },
              lastMessageAt: message.timestamp,
              unreadCount: 0,
            };
            const newContacts = [...firstPage.conversations];
            newContacts.splice(contactIndex, 1);
            const pinned = newContacts.filter((c: Contact) => c.isPinned);
            const unpinned = newContacts.filter((c: Contact) => !c.isPinned);
            if (updatedContact.isPinned) pinned.unshift(updatedContact);
            else unpinned.unshift(updatedContact);
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  conversations: [...pinned, ...unpinned],
                },
                ...old.pages.slice(1),
              ],
            };
          }
          return old;
        },
      );

      indexedDBStorage.removeItem(`whatsapp_conversations_${sessionId}`).catch(console.error);
      indexedDBStorage.removeItem('whatsapp_conversations_all').catch(console.error);

      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
      }
      loadContactsTimeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'conversations'],
          refetchType: 'active',
        });
      }, 500);
    };

    const handleUserTyping = (data: TypingEventPayload) => {
      const currentContact = selectedContactRef.current;
      const jid = data.jid;
      if (currentContact && jid && jid === currentContact.jid) {
        setTypingUsers((prev) => new Set(prev).add(jid));
      }
    };

    const handleUserStoppedTyping = (data: TypingEventPayload) => {
      const jid = data.jid;
      if (jid) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(jid);
          return newSet;
        });
      }
    };

    const handlePollUpdated = (data: {
      sessionId: string;
      messageId: string;
      remoteJid: string;
      interactiveData: any;
    }) => {
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid =
        currentContact.sessionId ||
        (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(
        ['whatsapp', 'messages', currentContact.jid, targetSid],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => {
              if (m.messageId === data.messageId) {
                return {
                  ...m,
                  interactiveData:
                    typeof data.interactiveData === 'string'
                      ? data.interactiveData
                      : JSON.stringify(data.interactiveData),
                };
              }
              return m;
            }),
          }));
          return { ...old, pages: newPages };
        },
      );
    };

    const handleMessagePinned = (data: {
      sessionId: string;
      remoteJid: string;
      messageId: string;
      duration: number;
    }) => {
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid =
        currentContact.sessionId ||
        (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(
        ['whatsapp', 'messages', currentContact.jid, targetSid],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => {
              if (m.messageId === data.messageId) {
                const meta =
                  typeof m.metadata === 'string'
                    ? JSON.parse(m.metadata || '{}')
                    : m.metadata || {};
                return {
                  ...m,
                  isPinned: true,
                  metadata: { ...meta, isPinned: true, pinDuration: data.duration },
                };
              }
              return m;
            }),
          }));
          return { ...old, pages: newPages };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', currentContact.jid] });
    };

    const handleMessageUnpinned = (data: {
      sessionId: string;
      remoteJid: string;
      messageId: string;
    }) => {
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid =
        currentContact.sessionId ||
        (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(
        ['whatsapp', 'messages', currentContact.jid, targetSid],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => {
              if (m.messageId === data.messageId) {
                const meta =
                  typeof m.metadata === 'string'
                    ? JSON.parse(m.metadata || '{}')
                    : m.metadata || {};
                return {
                  ...m,
                  isPinned: false,
                  metadata: { ...meta, isPinned: false },
                };
              }
              return m;
            }),
          }));
          return { ...old, pages: newPages };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', currentContact.jid] });
    };

    const handleMessageReaction = (data: {
      sessionId: string;
      remoteJid: string;
      messageId: string;
      reactions: Record<string, string>;
      emoji?: string | null;
      reactorKey?: string;
      fromMe?: boolean;
    }) => {
      if (!data?.messageId) return;
      const currentContact = selectedContactRef.current;
      if (!currentContact) return;
      const targetSid =
        currentContact.sessionId ||
        (selectedSessionRef.current === 'all' ? data.sessionId : selectedSessionRef.current);
      queryClient.setQueryData<MessagesCache>(
        ['whatsapp', 'messages', currentContact.jid, targetSid],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) => {
              if (m.messageId === data.messageId) {
                const meta =
                  typeof m.metadata === 'string'
                    ? JSON.parse(m.metadata || '{}')
                    : m.metadata || {};
                return {
                  ...m,
                  reactions: data.reactions,
                  metadata: { ...meta, reactions: data.reactions },
                };
              }
              return m;
            }),
          }));
          return { ...old, pages: newPages };
        },
      );
    };

    const handleConversationRead = (data: { sessionId?: string; remoteJid?: string; jid?: string }) => {
      const readJid = data.jid || data.remoteJid;
      if (!readJid) return;
      const targetNormJid = normalizeJid(readJid);

      setSelectedContact((prev) => {
        if (!prev) return prev;
        if (normalizeJid(prev.jid) === targetNormJid) {
          return { ...prev, unreadCount: 0 };
        }
        return prev;
      });

      queryClient.setQueriesData<ConversationsCache>(
        { queryKey: ['whatsapp', 'conversations'] },
        (old) => {
          if (!old?.pages?.length) return old;
          let changed = false;
          const pages = old.pages.map((page) => {
            if (!Array.isArray(page.conversations)) return page;
            let pageChanged = false;
            let unreadDiff = 0;
            const conversations = page.conversations.map((c: Contact) => {
              if (normalizeJid(c.jid) === targetNormJid) {
                if ((c.unreadCount || 0) > 0) {
                  unreadDiff++;
                }
                pageChanged = true;
                changed = true;
                return { ...c, unreadCount: 0 };
              }
              return c;
            });
            if (pageChanged) {
              const updatedCounts = page.counts
                ? {
                    ...page.counts,
                    unread: Math.max(0, (page.counts.unread || 0) - unreadDiff),
                  }
                : page.counts;
              return { ...page, conversations, counts: updatedCounts };
            }
            return page;
          });
          return changed ? { ...old, pages } : old;
        },
      );
    };

    socket.on('whatsapp:message:new', handleNewMessage);
    socket.on('whatsapp:message:reaction', handleMessageReaction);
    socket.on('whatsapp:message:status', handleMessageStatus);
    socket.on('whatsapp:message:sent', handleMessageSent);
    socket.on('whatsapp:notification:new', handleNotification);
    socket.on('whatsapp:poll_updated', handlePollUpdated);
    socket.on('whatsapp:message:pinned', handleMessagePinned);
    socket.on('whatsapp:message:unpinned', handleMessageUnpinned);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('whatsapp:conversation:read', handleConversationRead);

    return () => {
      socket.off('whatsapp:message:new', handleNewMessage);
      socket.off('whatsapp:message:reaction', handleMessageReaction);
      socket.off('whatsapp:message:status', handleMessageStatus);
      socket.off('whatsapp:message:sent', handleMessageSent);
      socket.off('whatsapp:notification:new', handleNotification);
      socket.off('whatsapp:poll_updated', handlePollUpdated);
      socket.off('whatsapp:message:pinned', handleMessagePinned);
      socket.off('whatsapp:message:unpinned', handleMessageUnpinned);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('whatsapp:conversation:read', handleConversationRead);

      if (loadContactsTimeoutRef.current) {
        clearTimeout(loadContactsTimeoutRef.current);
        loadContactsTimeoutRef.current = null;
      }
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
  }, [
    socket,
    queryClient,
    debouncedMarkAsRead,
    normalizeContactJid,
    playNotificationSound,
    showBrowserNotification,
    setSelectedContact,
    setTypingUsers,
  ]);

  return {
    debouncedMarkAsRead,
  };
}
