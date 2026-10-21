import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient as api } from '@/services/apiClient';
import { tToast } from '@/utils/i18n-toast';
import { buildWhatsAppMediaUrl } from '../utils/mediaUrl';
import {
  useSendMessage,
  useSendMedia,
  useDeleteConversation,
  useDeleteConversationsBulk,
  useDeleteAllConversations,
  useArchiveConversation,
} from '@/hooks/useWhatsAppMutations';
import { usePostStatus } from '@/hooks/useWhatsAppStatuses';
import type { Contact, Message } from '@/hooks/useWhatsAppQueries';
import type {
  ButtonsData,
  CatalogProduct,
  ConfirmDialogState,
  ListData,
  LocationData,
  MessageContextMenuPosition,
  MessagesCache,
  PollData,
} from '../chat/types/whatsappChatTypes';
import type { InteractiveButtonInput } from '../components/InteractiveButtonsModal';

interface UseWhatsAppChatActionsParams {
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null | ((prev: Contact | null) => Contact | null)) => void;
  selectedSession: string;
  activeSessionId: string;
  targetSessionId: string | null;
  user: { id?: string } | null;
  visibleMessages: Message[];
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  replyingTo: Message | null;
  setReplyingTo: React.Dispatch<React.SetStateAction<Message | null>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setOrdersRefreshToken: React.Dispatch<React.SetStateAction<number>>;
  setShowImageGallery: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useWhatsAppChatActions({
  selectedContact,
  setSelectedContact,
  selectedSession,
  activeSessionId,
  targetSessionId,
  user,
  visibleMessages,
  newMessage,
  setNewMessage,
  replyingTo,
  setReplyingTo,
  fileInputRef,
  setOrdersRefreshToken,
  setShowImageGallery,
}: UseWhatsAppChatActionsParams) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const sendMessageMutation = useSendMessage();
  const sendMediaMutation = useSendMedia();
  const deleteConversationMutation = useDeleteConversation();
  const deleteConversationsBulkMutation = useDeleteConversationsBulk();
  const deleteAllConversationsMutation = useDeleteAllConversations();
  const archiveConversationMutation = useArchiveConversation();
  const { mutate: postStatus, isPending: postingStatus } = usePostStatus();

  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  // Context Menu state
  const [messageContextMenu, setMessageContextMenu] = useState<MessageContextMenuPosition | null>(null);
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<Message | null>(null);

  // Confirm dialog state
  const [confirmData, setConfirmData] = useState<ConfirmDialogState>({
    open: false,
    title: '',
    content: '',
    onConfirm: () => {},
  });

  // Handle outside click/escape/resize for context menu
  useEffect(() => {
    if (!messageContextMenu) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMessageContextMenu(null);
    };
    const handleResize = () => setMessageContextMenu(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [messageContextMenu]);

  const handleMessageContextMenu = useCallback((event: React.MouseEvent, message: Message) => {
    event.preventDefault();
    setMessageContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
    setSelectedMessageForMenu(message);
  }, []);

  // History sync
  const handleSyncHistory = useCallback(async () => {
    if (!selectedSession || selectedSession === 'all' || isSyncingHistory) return;
    try {
      setIsSyncingHistory(true);
      const response = await api.post(`/whatsapp/sessions/${selectedSession}/history-sync`);
      const message = response.data?.alreadyRunning
        ? 'المزامنة تعمل بالفعل لهذه الجلسة'
        : 'تم طلب المزامنة. سيظهر التقدم في إعدادات واتساب.';
      toast.success(message);
      await queryClient.invalidateQueries({ queryKey: ['whatsapp', 'sessions'] });
    } catch {
      tToast.error("whatsappChat.unable_request_sync_791e");
    } finally {
      setIsSyncingHistory(false);
    }
  }, [selectedSession, isSyncingHistory, queryClient]);

  // Send message
  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = typeof textToSend === 'string' ? textToSend : newMessage;
      if (!text.trim() || !selectedContact || !selectedSession || sendMessageMutation.isPending) return;

      if (!user?.id) {
        tToast.error("whatsappChat.msg_18a1");
        return;
      }

      const targetSid = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
      if (!targetSid) {
        tToast.error("whatsappChat.msg_1f79");
        return;
      }

      sendMessageMutation.mutate(
        {
          sessionId: targetSid,
          to: selectedContact.jid,
          text,
          quotedMessageId: replyingTo?.messageId,
          userId: user?.id,
        },
        {
          onSuccess: () => {
            setNewMessage('');
            setReplyingTo(null);
          },
          onError: () => {
            tToast.error("whatsappChat.error_error_during_d123");
          },
        },
      );
    },
    [newMessage, selectedContact, selectedSession, sendMessageMutation, replyingTo, user?.id, setNewMessage, setReplyingTo],
  );

  // Send file direct
  const handleSendFileDirect = useCallback(
    async (file: File) => {
      if (!file || !selectedContact || !selectedSession) return;
      if (file.size > 100 * 1024 * 1024) {
        toast.error('حجم الملف يتجاوز الحد الأقصى المسموح (100 ميجابايت)');
        return;
      }

      const targetSid = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
      if (!targetSid) {
        tToast.error("whatsappChat.msg_1f79");
        return;
      }

      const isVoice = file.name?.startsWith('voice-') || file.type?.startsWith('audio/');
      const formData = new FormData();
      formData.append('sessionId', targetSid);
      formData.append('to', selectedContact.jid);
      formData.append('file', file, file.name || (isVoice ? 'voice_note.webm' : 'attachment'));
      if (isVoice) {
        formData.append('ptt', 'true');
      }
      if (replyingTo?.messageId) {
        formData.append('quotedMessageId', replyingTo.messageId);
      }
      if (user?.id) {
        formData.append('userId', user.id);
      }

      setIsDirectUploading(true);
      try {
        await api.post('/whatsapp/messages/upload-send', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        tToast.success("whatsappChat.success_send_ba8a");
        setReplyingTo(null);
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      } catch (error) {
        console.error('Failed to upload/send file:', error);
        tToast.error("whatsappChat.failed_send_8f23");
      } finally {
        setIsDirectUploading(false);
      }
    },
    [selectedContact, selectedSession, replyingTo, user?.id, setReplyingTo, queryClient],
  );

  // File input change
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0 || !selectedContact || !selectedSession) return;

      const targetSid = selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
      if (!targetSid) {
        tToast.error("whatsappChat.msg_1f79");
        return;
      }

      const file = files[0];
      if (!file) return;

      if (file.size > 100 * 1024 * 1024) {
        toast.error('حجم الملف يتجاوز الحد الأقصى المسموح (100 ميجابايت)');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (file.type.startsWith('video/') || file.size > 5 * 1024 * 1024) {
        toast.info('جاري رفع ومعالجة الوسائط، يرجى الانتظار...');
      }

      sendMediaMutation.mutate(
        {
          sessionId: targetSid,
          to: selectedContact.jid,
          file,
          userId: user?.id,
        },
        {
          onSuccess: () => {
            toast.success('تم إرسال الوسائط بنجاح');
          },
          onError: () => {
            tToast.error("whatsappChat.error_error_during_be74");
          },
        },
      );

      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [selectedContact, selectedSession, sendMediaMutation, user?.id, fileInputRef],
  );

  // Send reaction
  const handleSendReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!selectedSession || !selectedContact) return;
      const targetSid = selectedContact.sessionId || selectedSession;

      const existingMsg = visibleMessages.find((m) => m.messageId === messageId);
      let existingReactions: Record<string, string> = {};
      if (existingMsg?.reactions && typeof existingMsg.reactions === 'object') {
        existingReactions = { ...existingMsg.reactions };
      } else if (existingMsg?.metadata) {
        try {
          const meta =
            typeof existingMsg.metadata === 'string'
              ? JSON.parse(existingMsg.metadata)
              : existingMsg.metadata;
          if (meta?.reactions && typeof meta.reactions === 'object') {
            existingReactions = { ...meta.reactions };
          }
        } catch {}
      }
      const currentReaction = existingReactions['me'];
      const emojiToSend = currentReaction === emoji ? '' : emoji;

      // Optimistic update
      queryClient.setQueriesData<MessagesCache>(
        { queryKey: ['whatsapp', 'messages', selectedContact.jid] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => {
                if (m.messageId !== messageId) return m;
                const prev = { ...(m.reactions || {}) };
                if (emojiToSend) {
                  prev['me'] = emojiToSend;
                } else {
                  delete prev['me'];
                }
                const meta =
                  typeof m.metadata === 'object' && m.metadata !== null ? { ...m.metadata } : {};
                meta.reactions = prev;
                return {
                  ...m,
                  reactions: prev,
                  metadata: meta,
                };
              }),
            })),
          };
        },
      );

      try {
        const res = await api.post('/whatsapp/messages/send-reaction', {
          sessionId: targetSid,
          to: selectedContact.jid,
          messageId,
          emoji: emojiToSend,
        });
        if ((res as any)?.data?.reactions) {
          queryClient.setQueriesData<MessagesCache>(
            { queryKey: ['whatsapp', 'messages', selectedContact.jid] },
            (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((m) => {
                    if (m.messageId !== messageId) return m;
                    const serverReactions = (res as any).data.reactions;
                    return {
                      ...m,
                      reactions: serverReactions,
                      metadata: {
                        ...(typeof m.metadata === 'object' && m.metadata !== null
                          ? m.metadata
                          : {}),
                        reactions: serverReactions,
                      },
                    };
                  }),
                })),
              };
            },
          );
        }
        tToast.success("whatsappChat.success_send_3257");
      } catch {
        tToast.error("whatsappChat.failed_send_869b");
        queryClient.invalidateQueries({
          queryKey: ['whatsapp', 'messages', selectedContact.jid],
        });
      }
    },
    [selectedSession, selectedContact, visibleMessages, queryClient],
  );

  // Pin & Unpin
  const handlePinMessage = useCallback(
    async (message: Message, duration: number = 86400) => {
      if (!selectedContact) return;
      const sid = selectedContact.sessionId || activeSessionId;
      if (!sid) {
        tToast.error('لم يتم تحديد جلسة نشطة');
        return;
      }

      try {
        await api.post(`/whatsapp/messages/${message.messageId}/pin`, {
          sessionId: sid,
          jid: selectedContact.jid,
          duration,
        });
        tToast.success('تم تثبيت الرسالة بنجاح');
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', selectedContact.jid] });
      } catch {
        tToast.error('فشل تثبيت الرسالة');
      } finally {
        setMessageContextMenu(null);
        setSelectedMessageForMenu(null);
      }
    },
    [selectedContact, activeSessionId, queryClient],
  );

  const handleUnpinMessage = useCallback(
    async (messageId: string) => {
      if (!selectedContact) return;
      const sid = selectedContact.sessionId || activeSessionId;
      if (!sid) {
        tToast.error('لم يتم تحديد جلسة نشطة');
        return;
      }

      try {
        await api.delete(`/whatsapp/messages/${messageId}/pin`, {
          data: {
            sessionId: sid,
            jid: selectedContact.jid,
          },
        });
        tToast.success('تم إلغاء تثبيت الرسالة');
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'pinned', selectedContact.jid] });
      } catch {
        tToast.error('فشل إلغاء تثبيت الرسالة');
      } finally {
        setMessageContextMenu(null);
        setSelectedMessageForMenu(null);
      }
    },
    [selectedContact, activeSessionId, queryClient],
  );

  // Reply & Copy
  const handleReply = useCallback(
    (message: Message) => {
      setReplyingTo(message);
      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
    },
    [setReplyingTo],
  );

  const handleCopy = useCallback((message: Message) => {
    if (message?.content) {
      navigator.clipboard.writeText(message.content);
      tToast.success("whatsappChat.success_copy_3ea5");
      setMessageContextMenu(null);
      setSelectedMessageForMenu(null);
    }
  }, []);

  // Star message
  const handleStarMessage = useCallback(
    async (message: Message) => {
      if (!selectedSession || !selectedContact) return;
      const targetSid = selectedContact.sessionId || selectedSession;
      try {
        await api.post('/whatsapp/messages/star', {
          sessionId: targetSid,
          key: {
            remoteJid: message.remoteJid,
            id: message.messageId,
            fromMe: message.fromMe,
          },
        });
        tToast.success("whatsappChat.msg_6131");
        setMessageContextMenu(null);
        setSelectedMessageForMenu(null);
      } catch {
        tToast.error("whatsappChat.msg_5a7e");
      }
    },
    [selectedSession, selectedContact],
  );

  // Delete message
  const handleDeleteMessage = useCallback(
    async (message: Message) => {
      if (!selectedSession || !selectedContact) return;
      if (!window.confirm('هل أنت متأكد من حذف هذه الرسالة للجميع؟')) return;

      try {
        await api.post('/whatsapp/messages/delete', {
          sessionId: selectedSession,
          to: message.remoteJid,
          key: {
            id: message.messageId,
            remoteJid: message.remoteJid,
            fromMe: message.fromMe,
          },
        });
        tToast.success("whatsappChat.success_delete_57de");

        queryClient.setQueryData<MessagesCache>(
          ['whatsapp', 'messages', selectedContact.jid, targetSessionId],
          (old) => {
            if (!old) return old;
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m: Message) => m.messageId !== message.messageId),
            }));
            return { ...old, pages: newPages };
          },
        );

        setMessageContextMenu(null);
        setSelectedMessageForMenu(null);
      } catch {
        tToast.error("whatsappChat.failed_delete_f800");
      }
    },
    [selectedSession, selectedContact, targetSessionId, queryClient],
  );

  // Forward
  const handleForwardMessage = useCallback(
    async (targetJids: string[]) => {
      if (!selectedSession || !selectedMessageForMenu || targetJids.length === 0) return;

      try {
        await Promise.all(
          targetJids.map((jid) =>
            api.post('/whatsapp/messages/forward', {
              sessionId: selectedSession,
              to: jid,
              messageId: selectedMessageForMenu.messageId,
            }),
          ),
        );
        tToast.success("whatsappChat.msg_29a7");
        setSelectedMessageForMenu(null);
      } catch {
        tToast.error("whatsappChat.msg_71a8");
      }
    },
    [selectedSession, selectedMessageForMenu],
  );

  // Chat Actions: Clear, Delete, Bulk Delete, Delete All, Archive, Pin, Mute, Mark Unread, Block, Unblock
  const handleClearChat = useCallback(
    (contact: Contact) => {
      if (!selectedSession) return;
      setConfirmData({
        open: true,
        title: t('whatsapp.dialogs.clearChatTitle'),
        content: t('whatsapp.dialogs.clearChatContent'),
        onConfirm: async () => {
          try {
            await api.post(`/whatsapp/conversations/${contact.jid}/clear`, {
              sessionId: selectedSession,
            });
            toast.success(t('whatsapp.dialogs.success'));
            if (selectedContact?.jid === contact.jid && targetSessionId) {
              queryClient.setQueryData<MessagesCache>(
                ['whatsapp', 'messages', contact.jid, targetSessionId],
                (old) => {
                  if (!old) return old;
                  return {
                    ...old,
                    pages: [
                      { messages: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } },
                    ],
                  };
                },
              );
            }
          } catch {
            tToast.error("whatsappChat.failed_clear_cdd5");
          }
          setConfirmData((prev) => ({ ...prev, open: false }));
        },
      });
    },
    [selectedSession, t, selectedContact?.jid, targetSessionId, queryClient],
  );

  const handleDeleteChat = useCallback(
    (contact: Contact) => {
      if (!selectedSession) return;
      setConfirmData({
        open: true,
        title: t('whatsapp.dialogs.deleteChatTitle'),
        content: t('whatsapp.dialogs.deleteChatContent'),
        onConfirm: () => {
          deleteConversationMutation.mutate(
            {
              conversationId: contact.id,
              jid: contact.jid,
              sessionId: contact.sessionId || selectedSession,
            },
            {
              onSuccess: () => {
                if (selectedContact?.jid === contact.jid) {
                  setSelectedContact(null);
                }
                setConfirmData((prev) => ({ ...prev, open: false }));
              },
            },
          );
        },
      });
    },
    [selectedSession, t, deleteConversationMutation, selectedContact?.jid, setSelectedContact],
  );

  const handleBulkDeleteChats = useCallback(
    (jids: string[], sessionId: string) => {
      setConfirmData({
        open: true,
        title: 'حذف المحادثات المحددة',
        content: `هل أنت متأكد من حذف ${jids.length} محادثة نهائياً؟`,
        onConfirm: () => {
          deleteConversationsBulkMutation.mutate(
            {
              sessionId,
              jids,
            },
            {
              onSuccess: () => {
                if (selectedContact && jids.includes(selectedContact.jid)) {
                  setSelectedContact(null);
                }
                toast.success(`تم حذف ${jids.length} محادثة بنجاح`);
                setConfirmData((prev) => ({ ...prev, open: false }));
              },
              onError: () => {
                tToast.error("whatsappChat.failed_delete_6e98");
              },
            },
          );
        },
      });
    },
    [deleteConversationsBulkMutation, selectedContact, setSelectedContact],
  );

  const handleDeleteAllChats = useCallback(
    (sessionId?: string) => {
      setConfirmData({
        open: true,
        title: t('whatsapp.dialogs.deleteAllChatsTitle'),
        content: t('whatsapp.dialogs.deleteAllChatsContent'),
        onConfirm: () => {
          deleteAllConversationsMutation.mutate(
            { sessionId },
            {
              onSuccess: () => {
                setSelectedContact(null);
                toast.success(t('whatsapp.dialogs.deleteAllChatsSuccess'));
                setConfirmData((prev) => ({ ...prev, open: false }));
              },
              onError: () => {
                tToast.error("whatsappChat.failed_delete_6e98");
              },
            },
          );
        },
      });
    },
    [deleteAllConversationsMutation, t, setSelectedContact],
  );

  const handleArchiveChat = useCallback(
    async (contact: Contact) => {
      if (!selectedSession) return;
      archiveConversationMutation.mutate({
        jid: contact.jid,
        sessionId: contact.sessionId || selectedSession,
        isArchived: !contact.isArchived,
      });
    },
    [selectedSession, archiveConversationMutation],
  );

  const handlePinChat = useCallback(
    async (contact: Contact) => {
      if (!selectedSession) return;
      try {
        await api.post(`/whatsapp/chats/pin`, {
          sessionId: contact.sessionId || selectedSession,
          jid: contact.jid,
          pin: !contact.isPinned,
        });
        toast.success(contact.isPinned ? 'تم إلغاء التثبيت' : 'تم التثبيت');
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      } catch {
        tToast.error("whatsappChat.failed_update_status_9511");
      }
    },
    [selectedSession, queryClient],
  );

  const handleMuteChat = useCallback(
    async (contact: Contact) => {
      if (!selectedSession) return;
      try {
        await api.post(`/whatsapp/chats/mute`, {
          sessionId: contact.sessionId || selectedSession,
          jid: contact.jid,
          mute: !contact.isMuted,
        });
        toast.success(contact.isMuted ? 'تم إلغاء كتم الصوت' : 'تم كتم الصوت');
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      } catch {
        tToast.error("whatsappChat.failed_update_status_73cc");
      }
    },
    [selectedSession, queryClient],
  );

  const handleMarkUnread = useCallback(
    async (contact: Contact) => {
      const sessionId =
        contact.sessionId ||
        (selectedSession === 'all' ? null : selectedSession) ||
        activeSessionId;
      if (!sessionId || !contact.jid) return;

      const isUnread = (contact.unreadCount || 0) > 0;
      try {
        if (isUnread) {
          await api.post('/whatsapp/messages/read', {
            sessionId,
            remoteJid: contact.jid,
          });
          queryClient.setQueriesData<any>(
            { queryKey: ['whatsapp', 'conversations'] },
            (old: any) => {
              if (!old?.pages?.length) return old;
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  conversations: (page.conversations || []).map((c: Contact) =>
                    c.jid === contact.jid ? { ...c, unreadCount: 0 } : c,
                  ),
                  counts: page.counts
                    ? { ...page.counts, unread: Math.max(0, (page.counts.unread || 0) - 1) }
                    : page.counts,
                })),
              };
            },
          );
          setSelectedContact((prev) =>
            prev && prev.jid === contact.jid ? { ...prev, unreadCount: 0 } : prev,
          );
          tToast.success("whatsapp.sidebar.markedAsReadSuccess", "تم تحديد المحادثة كمقروءة");
        } else {
          await api.post('/whatsapp/chats/unread', {
            sessionId,
            jid: contact.jid,
            unread: true,
          });
          queryClient.setQueriesData<any>(
            { queryKey: ['whatsapp', 'conversations'] },
            (old: any) => {
              if (!old?.pages?.length) return old;
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  conversations: (page.conversations || []).map((c: Contact) =>
                    c.jid === contact.jid ? { ...c, unreadCount: 1 } : c,
                  ),
                  counts: page.counts
                    ? { ...page.counts, unread: (page.counts.unread || 0) + 1 }
                    : page.counts,
                })),
              };
            },
          );
          setSelectedContact((prev) =>
            prev && prev.jid === contact.jid ? { ...prev, unreadCount: 1 } : prev,
          );
          tToast.success("whatsappChat.success_select_9a6b", "تم تحديد المحادثة كغير مقروءة");
        }
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      } catch {
        tToast.error("whatsappChat.failed_select_status_be9a");
      }
    },
    [selectedSession, activeSessionId, setSelectedContact, queryClient],
  );

  const handleBlockContact = useCallback(
    async (contact: Contact) => {
      if (!selectedSession) return;
      try {
        await api.post('/whatsapp/contacts/block', {
          sessionId: contact.sessionId || selectedSession,
          jid: contact.jid,
        });
        toast.success('تم حظر جهة الاتصال');
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      } catch {
        toast.error('فشل حظر جهة الاتصال');
      }
    },
    [selectedSession, queryClient],
  );

  const handleUnblockContact = useCallback(
    async (contact: Contact) => {
      if (!selectedSession) return;
      try {
        await api.post('/whatsapp/contacts/unblock', {
          sessionId: contact.sessionId || selectedSession,
          jid: contact.jid,
        });
        toast.success('تم إلغاء حظر جهة الاتصال');
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      } catch {
        toast.error('فشل إلغاء حظر جهة الاتصال');
      }
    },
    [selectedSession, queryClient],
  );

  const handleToggleAi = useCallback(
    async (contact: Contact, aiEnabled: boolean) => {
      if (!contact.customer?.conversations || contact.customer.conversations.length === 0) {
        tToast.error("whatsappChat.msg_e1cd");
        return;
      }
      const conversationId = contact.customer.conversations[0]!.id;
      try {
        await api.put(`/conversations/${conversationId}`, { aiEnabled });
        toast.success(aiEnabled ? 'تم تفعيل الرد الآلي' : 'تم إيقاف الرد الآلي');
        setSelectedContact((prev: Contact | null) => {
          if (!prev || prev.id !== contact.id) return prev;
          return {
            ...prev,
            customer: prev.customer
              ? {
                  ...prev.customer,
                  conversations: prev.customer.conversations
                    ? [{ ...prev.customer.conversations[0], aiEnabled }]
                    : [],
                }
              : null,
          };
        });
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
      } catch (error) {
        console.error(error);
        tToast.error("whatsappChat.failed_update_status_7075");
      }
    },
    [queryClient, setSelectedContact],
  );

  // Specialized interactive messages
  const handleSendPoll = useCallback(
    async (pollData: PollData) => {
      if (!selectedSession || !selectedContact || !pollData.question.trim()) return;
      const targetSid = selectedContact.sessionId || selectedSession;
      const validOptions = pollData.options.filter((o) => o.trim());
      if (validOptions.length < 2) {
        tToast.warning("whatsappChat.msg_ef4e");
        return;
      }
      try {
        await api.post('/whatsapp/messages/send-poll', {
          sessionId: targetSid,
          to: selectedContact.jid,
          pollData: {
            name: pollData.question,
            values: validOptions,
            selectableCount: pollData.selectableCount,
          },
        });
        tToast.success("whatsappChat.success_send_3f0b");
      } catch {
        tToast.error("whatsappChat.failed_send_8954");
      }
    },
    [selectedSession, selectedContact],
  );

  const handleSendButtons = useCallback(
    async (buttonsData: ButtonsData) => {
      if (!selectedSession || !selectedContact || !buttonsData.text.trim()) return;
      const targetSid = selectedContact.sessionId || selectedSession;
      const validButtons = buttonsData.buttons.filter((b) => b.text.trim());
      if (validButtons.length === 0 || validButtons.length > 3) {
        tToast.warning("whatsappChat.msg_292e");
        return;
      }
      try {
        await api.post('/whatsapp/messages/send-buttons', {
          sessionId: targetSid,
          to: selectedContact.jid,
          text: buttonsData.text,
          buttons: validButtons.map((b, i) => ({
            buttonId: `btn_${i}`,
            buttonText: { displayText: b.text },
            type: 1,
          })),
          footer: buttonsData.footer || undefined,
        });
        tToast.success("whatsappChat.success_send_714a");
      } catch {
        tToast.error("whatsappChat.failed_send_0a36");
      }
    },
    [selectedSession, selectedContact],
  );

  const handleSendList = useCallback(
    async (listData: ListData) => {
      if (!selectedSession || !selectedContact || !listData.text.trim()) return;
      const targetSid = selectedContact.sessionId || selectedSession;
      try {
        await api.post('/whatsapp/messages/send-list', {
          sessionId: targetSid,
          to: selectedContact.jid,
          text: listData.text,
          buttonText: listData.buttonText,
          title: listData.title,
          sections: listData.sections.map((s) => ({
            title: s.title,
            rows: s.rows
              .filter((r) => r.title.trim())
              .map((r) => ({
                rowId: r.id,
                title: r.title,
                description: r.description,
              })),
          })),
        });
        tToast.success("whatsappChat.success_send_30e0");
      } catch {
        tToast.error("whatsappChat.failed_send_775a");
      }
    },
    [selectedSession, selectedContact],
  );

  const handleSendProduct = useCallback(
    async (product: CatalogProduct) => {
      if (!selectedSession || !selectedContact) return;
      const targetSid = selectedContact.sessionId || selectedSession;
      try {
        await api.post('/whatsapp/messages/send-product', {
          sessionId: targetSid,
          to: selectedContact.jid,
          product: {
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency || 'EGP',
            imageUrl: product.imageUrl,
          },
        });
        tToast.success("whatsappChat.success_send_2909");
      } catch {
        tToast.error("whatsappChat.failed_send_f8fe");
      }
    },
    [selectedSession, selectedContact],
  );

  const handleSendLocation = useCallback(
    async (locationData: LocationData) => {
      if (!selectedSession || !selectedContact || !locationData.latitude || !locationData.longitude)
        return;
      const targetSid = selectedContact.sessionId || selectedSession;
      try {
        await api.post('/whatsapp/messages/send-location', {
          sessionId: targetSid,
          to: selectedContact.jid,
          location: {
            degreesLatitude: parseFloat(locationData.latitude),
            degreesLongitude: parseFloat(locationData.longitude),
            name: locationData.address || 'موقعي',
            address: locationData.address,
          },
        });
        tToast.success("whatsappChat.success_send_6ef9");
      } catch {
        tToast.error("whatsappChat.failed_send_84ec");
      }
    },
    [selectedSession, selectedContact],
  );

  const handleSendTemplate = useCallback(
    async (template: any, variables: Record<string, string>) => {
      if (!selectedSession || !selectedContact || !template) return;
      const targetSid =
        selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
      if (!targetSid) {
        tToast.error("whatsappChat.msg_1f79");
        return;
      }

      const bodyParameters: any[] = [];
      const sortedKeys = Object.keys(variables).sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      for (const key of sortedKeys) {
        bodyParameters.push({ type: 'text', text: variables[key] || '' });
      }

      const components: any[] = [];
      if (bodyParameters.length > 0) {
        components.push({ type: 'body', parameters: bodyParameters });
      }

      try {
        await api.post('/whatsapp-templates/messages/send-template', {
          sessionId: targetSid,
          to: selectedContact.jid,
          templateName: template.name,
          languageCode: template.language || 'ar',
          components: components.length > 0 ? components : undefined,
        });
        tToast.success("whatsappChat.success_send_0910");
      } catch {
        tToast.error("whatsappChat.failed_send_b7e9");
      }
    },
    [selectedSession, selectedContact],
  );

  const handlePostStatusAction = useCallback(
    async (content: string) => {
      if (!content.trim() || !selectedSession || selectedSession === 'all') return;
      postStatus(
        { sessionId: selectedSession, content },
        {
          onSuccess: () => {
            tToast.success("whatsappChat.success_publish_5ce3");
          },
          onError: () => {
            tToast.error("whatsappChat.failed_publish_960d");
          },
        },
      );
    },
    [selectedSession, postStatus],
  );

  const handleSendInteractive = useCallback(
    async (data: { title?: string; text: string; footer?: string; buttons: InteractiveButtonInput[] }) => {
      if (!selectedContact) return;
      const sid = selectedContact.sessionId || activeSessionId;
      if (!sid) {
        tToast.error('يرجى اختيار جلسة نشطة لإرسال الأزرار');
        return;
      }

      try {
        await api.post('/whatsapp/messages/send-interactive', {
          sessionId: sid,
          to: selectedContact.jid,
          ...data,
        });
        tToast.success('تم إرسال الرسالة التفاعلية بنجاح');
        queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages', selectedContact.jid] });
      } catch (error: any) {
        const msg = error?.response?.data?.message || 'فشل إرسال الرسالة التفاعلية';
        tToast.error(msg);
      }
    },
    [selectedContact, activeSessionId, queryClient],
  );

  const handleSendProductImages = useCallback(
    async (
      product: { id: string; name: string; price: number | string },
      images: Array<{ url: string; filename: string }>,
      includeDetails: boolean,
    ) => {
      if (!selectedContact || images.length === 0) return;
      const targetSid =
        selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
      if (!targetSid) {
        tToast.error("whatsappChat.msg_1f79");
        return;
      }

      for (let i = 0; i < images.length; i++) {
        const img = images[i]!;
        const isFirst = i === 0;
        let caption = '';
        if (isFirst && includeDetails) {
          caption = `*${product.name}*\nالسعر: ${product.price} ج.م`;
        }
        try {
          const fullUrl = buildWhatsAppMediaUrl(img.url);
          const res = await fetch(fullUrl || img.url);
          const blob = await res.blob();
          const file = new File([blob], img.filename || 'product.jpg', {
            type: blob.type || 'image/jpeg',
          });
          await sendMediaMutation.mutateAsync({
            sessionId: targetSid,
            to: selectedContact.jid,
            file,
            caption,
            userId: user?.id,
          });
          if (images.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        } catch (error) {
          console.error('Error sending product image:', error);
        }
      }
      toast.success('تم إرسال صور المنتج بنجاح');
    },
    [selectedContact, selectedSession, user?.id, sendMediaMutation],
  );

  const handleSelectImageFromGallery = useCallback(
    async (image: { url: string; filename: string }) => {
      if (!selectedContact || !image.url) return;
      const targetSid =
        selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
      if (!targetSid) {
        tToast.error("whatsappChat.msg_1f79");
        return;
      }
      setShowImageGallery(false);
      try {
        const fullUrl = buildWhatsAppMediaUrl(image.url);
        const res = await fetch(fullUrl || image.url);
        const blob = await res.blob();
        const file = new File([blob], image.filename || 'gallery_image.jpg', {
          type: blob.type || 'image/jpeg',
        });
        await sendMediaMutation.mutateAsync({
          sessionId: targetSid,
          to: selectedContact.jid,
          file,
          caption: '',
          userId: user?.id,
        });
        toast.success('تم إرسال الصورة بنجاح');
      } catch (error) {
        console.error('Error sending image from gallery:', error);
        toast.error('فشل إرسال الصورة من الحافظة');
      }
    },
    [selectedContact, selectedSession, user?.id, sendMediaMutation, setShowImageGallery],
  );

  const handleSelectMultipleImagesFromGallery = useCallback(
    async (images: Array<{ url: string; filename: string }>) => {
      if (!selectedContact || images.length === 0) return;
      const targetSid =
        selectedContact.sessionId || (selectedSession === 'all' ? null : selectedSession);
      if (!targetSid) {
        tToast.error("whatsappChat.msg_1f79");
        return;
      }

      setShowImageGallery(false);
      let successCount = 0;
      for (const image of images) {
        try {
          const fullUrl = buildWhatsAppMediaUrl(image.url);
          const res = await fetch(fullUrl || image.url);
          const blob = await res.blob();
          const file = new File([blob], image.filename || 'gallery_image.jpg', {
            type: blob.type || 'image/jpeg',
          });
          await sendMediaMutation.mutateAsync({
            sessionId: targetSid,
            to: selectedContact.jid,
            file,
            caption: '',
            userId: user?.id,
          });
          successCount++;
          if (images.length > 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error('Error sending gallery image:', error);
        }
      }

      if (successCount > 0) {
        toast.success(`تم إرسال ${successCount} صورة بنجاح`);
      } else {
        toast.error('فشل إرسال الصور من الحافظة');
      }
    },
    [selectedContact, selectedSession, user?.id, sendMediaMutation, setShowImageGallery],
  );

  return {
    isDirectUploading,
    isSyncingHistory,
    confirmData,
    setConfirmData,
    messageContextMenu,
    setMessageContextMenu,
    selectedMessageForMenu,
    setSelectedMessageForMenu,
    handleMessageContextMenu,
    handleSyncHistory,
    handleSendMessage,
    handleSendFileDirect,
    handleFileUpload,
    handleSendReaction,
    handlePinMessage,
    handleUnpinMessage,
    handleReply,
    handleCopy,
    handleStarMessage,
    handleDeleteMessage,
    handleForwardMessage,
    handleClearChat,
    handleDeleteChat,
    handleBulkDeleteChats,
    handleDeleteAllChats,
    handleArchiveChat,
    handlePinChat,
    handleMuteChat,
    handleMarkUnread,
    handleBlockContact,
    handleUnblockContact,
    handleToggleAi,
    handleSendPoll,
    handleSendButtons,
    handleSendList,
    handleSendProduct,
    handleSendLocation,
    handleSendTemplate,
    handlePostStatusAction,
    postingStatus,
    handleSendInteractive,
    handleSendProductImages,
    handleSelectImageFromGallery,
    handleSelectMultipleImagesFromGallery,
    sendMessageMutation,
    sendMediaMutation,
  };
}
