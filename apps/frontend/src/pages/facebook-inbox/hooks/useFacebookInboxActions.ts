import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useConversationActions } from '@/hooks/inbox/useConversationActions';
import { useTagManagement } from '@/hooks/inbox/useTagManagement';
import type {
  InboxConversation,
  InboxMessage,
  InboxTab,
  ConversationStatus,
} from '@/types/inbox.types';
import { getApiError } from '../types/facebookInboxTypes';
import useFacebookInboxScroll from './useFacebookInboxScroll';
import useFacebookInboxMessageSender from './useFacebookInboxMessageSender';

interface UseFacebookInboxActionsParams {
  channel: string;
  companyId: string | null | undefined;
  inboxPath: string;
  selectedConversation: InboxConversation | null;
  selectConversation: (conversation: InboxConversation | null) => void;
  activeTab: InboxTab;
  messages: InboxMessage[];
  addMessage: (msg: InboxMessage) => void;
  loadMessages: (conversationId: string) => void;
  loadMoreMessages: () => void;
  hasMore: boolean;
  loadingMessages: boolean;
  loadConversations: (
    page?: number,
    append?: boolean,
    tab?: InboxTab,
    search?: string,
    channel?: string,
    priorityOnly?: boolean,
  ) => void;
  debouncedSearchQuery: string;
  updateSelectedConversation: (updates: Partial<InboxConversation>) => void;
  updateConversationInList: (id: string, updates: Partial<InboxConversation>) => void;
  debouncedLoadConversations: (tab: InboxTab) => void;
  clearConversationUrlParam: () => void;
  clearSelection: () => void;
  selectedIds: Set<string>;
  replyToMessage: InboxMessage | null;
  setReplyToMessage: (msg: InboxMessage | null) => void;
  setShowTextGallery: (show: boolean) => void;
  setShowImageGallery: (show: boolean) => void;
  setShowProductPicker: (show: boolean) => void;
  setShowBlockModal: (show: boolean) => void;
  setBlockReason: (reason: string) => void;
  blockReason: string;
  setIsBlocked: (blocked: boolean) => void;
  setBlocking: (blocking: boolean) => void;
  blocking: boolean;
  filters: any;
  isConnected: boolean;
  setMessageToForward: (msg: InboxMessage | null) => void;
  setForwardModalOpen: (open: boolean) => void;
  setSnoozeModalOpen: (open: boolean) => void;
  setComposerDraft: (draft: string) => void;
}

export function useFacebookInboxActions({
  channel,
  companyId,
  inboxPath,
  selectedConversation,
  selectConversation,
  activeTab,
  messages,
  addMessage,
  loadMessages,
  loadMoreMessages,
  hasMore,
  loadingMessages,
  loadConversations,
  debouncedSearchQuery,
  updateSelectedConversation,
  updateConversationInList,
  debouncedLoadConversations,
  clearConversationUrlParam,
  clearSelection,
  selectedIds,
  replyToMessage,
  setReplyToMessage,
  setShowTextGallery,
  setShowImageGallery,
  setShowProductPicker,
  setShowBlockModal,
  setBlockReason,
  blockReason,
  setIsBlocked,
  setBlocking,
  blocking,
  filters,
  isConnected,
  setMessageToForward,
  setForwardModalOpen,
  setSnoozeModalOpen,
  setComposerDraft,
}: UseFacebookInboxActionsParams) {
  const { t } = useTranslation();

  const {
    updateStatus,
    assignConversation,
    markAsDone,
    togglePriority,
    bulkUpdate,
    deleteConversation,
    deleteMessage,
    forwardMessage,
    toggleMessageStar,
    toggleMessageReaction,
    snoozeConversation,
    updating,
  } = useConversationActions();

  const { addTags, updating: updatingTags } = useTagManagement();
  const [copiedLink, setCopiedLink] = useState(false);

  // Sub-hook 1: Scroll & message lookup
  const scrollData = useFacebookInboxScroll({
    selectedConversation,
    messages,
    hasMore,
    loadingMessages,
    loadMoreMessages,
  });

  // Sub-hook 2: Message sending (text, files, gallery, product picker)
  const senderData = useFacebookInboxMessageSender({
    companyId,
    selectedConversation,
    activeTab,
    isConnected,
    replyToMessage,
    setReplyToMessage,
    updateSelectedConversation,
    addMessage,
    loadMessages,
    debouncedLoadConversations,
    setShowTextGallery,
    setShowImageGallery,
    setShowProductPicker,
  });

  // Bulk actions
  const handleBulkMarkDone = useCallback(async () => {
    if (!companyId || selectedIds.size === 0) return;
    if (
      !window.confirm(
        t('conversations.bulkMarkDoneConfirm', { count: selectedIds.size }),
      )
    ) {
      return;
    }

    try {
      await bulkUpdate(Array.from(selectedIds), 'mark_done', null, companyId);
      debouncedLoadConversations(activeTab);
      clearSelection();
      alert(t('conversations.endConversationsSuccess'));
    } catch {
      alert(t('conversations.operationFailed'));
    }
  }, [
    selectedIds,
    companyId,
    bulkUpdate,
    activeTab,
    debouncedLoadConversations,
    clearSelection,
    t,
  ]);

  // Status & Assignment
  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!selectedConversation || !companyId) return;
      try {
        await updateStatus(selectedConversation.id, status, companyId);
        debouncedLoadConversations(activeTab);
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    },
    [selectedConversation, companyId, updateStatus, activeTab, debouncedLoadConversations],
  );

  const handleAssignment = useCallback(
    async (userId: string | null) => {
      if (!selectedConversation || !companyId) return;
      try {
        await assignConversation(selectedConversation.id, userId, companyId);
        debouncedLoadConversations(activeTab);
      } catch (error) {
        console.error('Failed to assign conversation:', error);
      }
    },
    [selectedConversation, companyId, assignConversation, activeTab, debouncedLoadConversations],
  );

  const handleMarkDone = useCallback(async () => {
    if (!selectedConversation || !companyId) return;
    try {
      await markAsDone(selectedConversation.id, companyId);
      debouncedLoadConversations(activeTab);
    } catch (error) {
      console.error('Failed to mark conversation as done:', error);
    }
  }, [selectedConversation, companyId, markAsDone, activeTab, debouncedLoadConversations]);

  const handleTogglePriority = useCallback(async () => {
    if (!selectedConversation || !companyId) return;
    try {
      await togglePriority(
        selectedConversation.id,
        !selectedConversation.priority,
        companyId,
      );
      debouncedLoadConversations(activeTab);
    } catch (error) {
      console.error('Failed to toggle priority:', error);
    }
  }, [selectedConversation, companyId, togglePriority, activeTab, debouncedLoadConversations]);

  // AI Active state and toggle
  const isAiPaused = Boolean(
    selectedConversation?.aiPausedUntil &&
      new Date(selectedConversation.aiPausedUntil).getTime() > Date.now(),
  );
  const isAiActive = selectedConversation
    ? selectedConversation.aiEnabled !== false && !isAiPaused
    : true;

  const handleToggleAi = useCallback(async () => {
    if (!selectedConversation) return;

    const isCurrentlyPaused = Boolean(
      selectedConversation.aiPausedUntil &&
        new Date(selectedConversation.aiPausedUntil).getTime() > Date.now(),
    );
    const isCurrentlyActive =
      selectedConversation.aiEnabled !== false && !isCurrentlyPaused;
    const nextAiEnabled = !isCurrentlyActive;

    updateConversationInList(selectedConversation.id, {
      aiEnabled: nextAiEnabled,
      aiPausedUntil: nextAiEnabled ? null : selectedConversation.aiPausedUntil,
    });

    try {
      await apiService.updateConversation(selectedConversation.id, {
        aiEnabled: nextAiEnabled,
      });
      toast.success(
        nextAiEnabled
          ? t(
              'facebookInbox.aiEnabledSuccess',
              'تم تشغيل الرد الآلي للذكاء الاصطناعي لهذه المحادثة',
            )
          : t(
              'facebookInbox.aiDisabledSuccess',
              'تم إيقاف الذكاء الاصطناعي عن هذه المحادثة (التحكم يدوي)',
            ),
      );
    } catch (err) {
      console.error('Failed to toggle AI status:', err);
      toast.error(
        t('facebookInbox.aiToggleFailed', 'تعذر تغيير حالة الذكاء الاصطناعي'),
      );
      updateConversationInList(selectedConversation.id, {
        aiEnabled: !nextAiEnabled,
        aiPausedUntil: selectedConversation.aiPausedUntil,
      });
    }
  }, [selectedConversation, updateConversationInList, t]);

  const handleTagsChange = useCallback(
    async (tags: string[]) => {
      if (!selectedConversation || !companyId) return;
      try {
        await addTags(selectedConversation.id, tags, companyId);
        debouncedLoadConversations(activeTab);
      } catch (error) {
        console.error('Failed to update tags:', error);
      }
    },
    [selectedConversation, companyId, addTags, activeTab, debouncedLoadConversations],
  );

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation || !companyId) return;

    const confirmed = window.confirm(
      t('conversations.deleteConversationConfirm', {
        name: selectedConversation.customerName,
      }),
    );
    if (!confirmed) return;

    try {
      await deleteConversation(selectedConversation.id, companyId);
      selectConversation(null);
      clearConversationUrlParam();
      clearSelection();
      loadConversations(
        1,
        false,
        activeTab,
        debouncedSearchQuery.trim() || undefined,
        channel,
        filters.priorityOnly,
      );
      alert(t('conversations.deleteConversationSuccess'));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert(t('conversations.deleteConversationFailed'));
    }
  }, [
    selectedConversation,
    companyId,
    deleteConversation,
    selectConversation,
    clearConversationUrlParam,
    clearSelection,
    loadConversations,
    activeTab,
    debouncedSearchQuery,
    channel,
    filters.priorityOnly,
    t,
  ]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedConversation || !companyId) return;
      if (!window.confirm(t('conversations.deleteMessageConfirm'))) return;

      try {
        await deleteMessage(selectedConversation.id, messageId, companyId);
        loadMessages(selectedConversation.id);
        alert(t('conversations.deleteMessageSuccess'));
      } catch {
        alert(t('conversations.deleteMessageFailed'));
      }
    },
    [selectedConversation, companyId, deleteMessage, loadMessages, t],
  );

  const handleForwardRequest = useCallback(
    (message: InboxMessage) => {
      setMessageToForward(message);
      setForwardModalOpen(true);
    },
    [setMessageToForward, setForwardModalOpen],
  );

  const handleForward = useCallback(
    async (_targetConversationId: string) => {
      setForwardModalOpen(false);
      alert(t('conversations.messageForwarded'));
    },
    [setForwardModalOpen, t],
  );

  const handleStarMessage = useCallback(
    async (messageId: string, isStarred: boolean) => {
      if (!selectedConversation || !companyId) return;
      try {
        await toggleMessageStar(selectedConversation.id, messageId, isStarred, companyId);
      } catch (error) {
        console.error('Failed to star message:', error);
      }
    },
    [selectedConversation, companyId, toggleMessageStar],
  );

  const handleMessageReaction = useCallback(
    async (messageId: string, reaction: string | null) => {
      if (!selectedConversation || !companyId) return;
      try {
        await toggleMessageReaction(selectedConversation.id, messageId, reaction, companyId);
      } catch (error) {
        console.error('Failed to set reaction:', error);
      }
    },
    [selectedConversation, companyId, toggleMessageReaction],
  );

  const handleReplyToMessage = useCallback(
    (message: InboxMessage) => {
      setReplyToMessage(message);
    },
    [setReplyToMessage],
  );

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, [setReplyToMessage]);

  const handleSnoozeConfirm = useCallback(
    async (until: Date) => {
      if (!selectedConversation || !companyId) return;
      try {
        await snoozeConversation(selectedConversation.id, until, companyId);
        setSnoozeModalOpen(false);
        debouncedLoadConversations(activeTab);
        alert(t('conversations.conversationSnoozed'));
      } catch {
        alert(t('conversations.snoozeFailed'));
      }
    },
    [
      selectedConversation,
      companyId,
      snoozeConversation,
      activeTab,
      debouncedLoadConversations,
      setSnoozeModalOpen,
      t,
    ],
  );

  const handleBlockCustomer = useCallback(async () => {
    if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
      alert(t('conversations.pageOrCustomerUnavailable'));
      return;
    }

    try {
      setBlocking(true);
      await apiService.blockCustomerOnPage(
        selectedConversation.customerId,
        selectedConversation.pageId,
        blockReason || undefined,
      );
      setIsBlocked(true);
      setShowBlockModal(false);
      setBlockReason('');
      alert(t('conversations.blockCustomerSuccess'));
    } catch (error: unknown) {
      alert(getApiError(error).message || t('conversations.blockCustomerFailed'));
    } finally {
      setBlocking(false);
    }
  }, [
    selectedConversation?.pageId,
    selectedConversation?.customerId,
    blockReason,
    setBlocking,
    setIsBlocked,
    setShowBlockModal,
    setBlockReason,
    t,
  ]);

  const handleUnblockCustomer = useCallback(async () => {
    if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
      alert(t('conversations.pageOrCustomerUnavailable'));
      return;
    }

    if (!window.confirm(t('conversations.unblockConfirmMessage'))) return;

    try {
      setBlocking(true);
      await apiService.unblockCustomerOnPage(
        selectedConversation.customerId,
        selectedConversation.pageId,
      );
      setIsBlocked(false);
      alert(t('conversations.unblockCustomerSuccess'));
    } catch (error: unknown) {
      alert(getApiError(error).message || t('conversations.unblockCustomerFailed'));
    } finally {
      setBlocking(false);
    }
  }, [
    selectedConversation?.pageId,
    selectedConversation?.customerId,
    setBlocking,
    setIsBlocked,
    t,
  ]);

  const handleCopyConversationLink = useCallback(
    (conversationId: string) => {
      const conversationLink = `${window.location.origin}${inboxPath}?conversation=${conversationId}`;
      navigator.clipboard
        .writeText(conversationLink)
        .then(() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        })
        .catch((err) => {
          console.error('Failed to copy link:', err);
          alert(`${t('inbox.conversationLink')}:\n${conversationLink}`);
        });
    },
    [inboxPath, t],
  );

  return {
    sending: senderData.sending,
    uploadingFile: senderData.uploadingFile,
    updating,
    updatingTags,
    copiedLink,
    messagesContainerRef: scrollData.messagesContainerRef,
    handleScroll: scrollData.handleScroll,
    repliedMessages: scrollData.repliedMessages,
    messagesById: scrollData.messagesById,
    handleScrollToMessage: scrollData.handleScrollToMessage,
    handleSendMessage: senderData.handleSendMessage,
    handleSendFile: senderData.handleSendFile,
    handleSendFiles: senderData.handleSendFiles,
    handleSelectTextFromGallery: senderData.handleSelectTextFromGallery,
    handleSendQuickReply: senderData.handleSendQuickReply,
    handleSelectImageFromGallery: senderData.handleSelectImageFromGallery,
    handleSelectMultipleImagesFromGallery:
      senderData.handleSelectMultipleImagesFromGallery,
    handleSendProductImages: senderData.handleSendProductImages,
    handleBulkMarkDone,
    handleStatusChange,
    handleAssignment,
    handleMarkDone,
    handleTogglePriority,
    isAiPaused,
    isAiActive,
    handleToggleAi,
    handleTagsChange,
    handleDeleteConversation,
    handleDeleteMessage,
    handleForwardRequest,
    handleForward,
    handleStarMessage,
    handleMessageReaction,
    handleReplyToMessage,
    handleCancelReply,
    handleSnoozeConfirm,
    handleBlockCustomer,
    handleUnblockCustomer,
    handleCopyConversationLink,
  };
}

export default useFacebookInboxActions;
