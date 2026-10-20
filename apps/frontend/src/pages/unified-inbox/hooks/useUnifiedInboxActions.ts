import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/apiClient';
import type { ConversationStatus } from '@/types/inbox.types';
import type { UnifiedConversation } from '../types/unifiedInboxTypes';

export const useUnifiedInboxActions = (
  selectedConversation: UnifiedConversation | null,
  setSelectedConversation: React.Dispatch<
    React.SetStateAction<UnifiedConversation | null>
  >,
  setConversations: React.Dispatch<
    React.SetStateAction<UnifiedConversation[]>
  >,
  handleToggleConvStar: (convId: string, isPinned: boolean) => void,
) => {
  const { t } = useTranslation();

  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!selectedConversation) return;
      try {
        await apiClient.put(
          `/api/v1/unified-inbox/conversations/${selectedConversation.id}`,
          { status },
        );
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, status } : c,
          ),
        );
        setSelectedConversation((prev) =>
          prev ? { ...prev, status } : null,
        );
      } catch (err) {
        console.error('Error updating status:', err);
      }
    },
    [selectedConversation, setConversations, setSelectedConversation],
  );

  const handleAssign = useCallback(
    async (userId: string | null, name?: string | null) => {
      if (!selectedConversation) return;
      try {
        await apiClient.put(
          `/api/v1/unified-inbox/conversations/${selectedConversation.id}`,
          { assignedTo: userId },
        );
        const assignee = userId
          ? { id: userId, name: name || '', avatar: null }
          : null;
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? { ...c, assignedTo: assignee }
              : c,
          ),
        );
        setSelectedConversation((prev) =>
          prev ? { ...prev, assignedTo: assignee } : null,
        );
      } catch (err) {
        console.error('Error assigning conversation:', err);
      }
    },
    [selectedConversation, setConversations, setSelectedConversation],
  );

  const handleMarkResolved = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(
        `/api/v1/unified-inbox/conversations/${selectedConversation.id}`,
        { status: 'resolved' },
      );
      setConversations((prev) =>
        prev.filter((c) => c.id !== selectedConversation.id),
      );
      setSelectedConversation(null);
    } catch (err) {
      console.error('Error marking resolved:', err);
    }
  }, [selectedConversation, setConversations, setSelectedConversation]);

  const handleMarkUnread = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(
        `/api/v1/unified-inbox/conversations/${selectedConversation.id}`,
        { unreadCount: 1 },
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id ? { ...c, unreadCount: 1 } : c,
        ),
      );
    } catch (err) {
      console.error('Error marking unread:', err);
    }
  }, [selectedConversation, setConversations]);

  const handleArchiveConversation = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(
        `/api/v1/unified-inbox/conversations/${selectedConversation.id}`,
        { archived: true },
      );
      setConversations((prev) =>
        prev.filter((c) => c.id !== selectedConversation.id),
      );
      setSelectedConversation(null);
    } catch (err) {
      console.error('Error archiving conversation:', err);
    }
  }, [selectedConversation, setConversations, setSelectedConversation]);

  const handleBlockCustomer = useCallback(async () => {
    if (!selectedConversation) return;
    if (
      !window.confirm(
        t('unifiedInbox.blockConfirm', {
          defaultValue: 'هل أنت متأكد من حظر هذا العميل؟',
        }),
      )
    )
      return;
    try {
      await apiClient.put(
        `/api/v1/unified-inbox/customer/${selectedConversation.contactId}/block`,
      );
      setConversations((prev) =>
        prev.filter((c) => c.id !== selectedConversation.id),
      );
      setSelectedConversation(null);
    } catch (err) {
      console.error('Error blocking customer:', err);
    }
  }, [selectedConversation, setConversations, setSelectedConversation, t]);

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation) return;
    if (
      !window.confirm(
        t('unifiedInbox.deleteConfirm', {
          defaultValue: 'هل أنت متأكد من حذف هذه المحادثة؟',
        }),
      )
    )
      return;
    try {
      await apiClient.delete(
        `/api/v1/unified-inbox/conversations/${selectedConversation.id}`,
      );
      setConversations((prev) =>
        prev.filter((c) => c.id !== selectedConversation.id),
      );
      setSelectedConversation(null);
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  }, [selectedConversation, setConversations, setSelectedConversation, t]);

  const handleToggleAi = useCallback(async () => {
    if (!selectedConversation) return;
    const newStatus = selectedConversation.aiEnabled === false;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selectedConversation.id
          ? { ...c, aiEnabled: newStatus }
          : c,
      ),
    );
    setSelectedConversation((prev) =>
      prev ? { ...prev, aiEnabled: newStatus } : null,
    );

    try {
      await apiClient.put(
        `/api/v1/unified-inbox/conversations/${selectedConversation.id}`,
        { aiEnabled: newStatus },
      );
    } catch (err) {
      console.error('Error toggling AI status:', err);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, aiEnabled: !newStatus }
            : c,
        ),
      );
      setSelectedConversation((prev) =>
        prev ? { ...prev, aiEnabled: !newStatus } : null,
      );
    }
  }, [selectedConversation, setConversations, setSelectedConversation]);

  const handleTogglePriority = useCallback(() => {
    if (!selectedConversation) return;
    handleToggleConvStar(
      selectedConversation.id,
      selectedConversation.isPinned,
    );
  }, [selectedConversation, handleToggleConvStar]);

  const handleCopyConversationLink = useCallback(() => {
    if (!selectedConversation) return;
    const link = `${window.location.origin}/unified-inbox?conv=${selectedConversation.id}`;
    navigator.clipboard.writeText(link).catch(() => {});
  }, [selectedConversation]);

  const handleSnooze = useCallback(
    async (until: Date) => {
      if (!selectedConversation) return;
      try {
        await apiClient.post(
          `/api/v1/unified-inbox/conversations/${selectedConversation.id}/snooze`,
          { snoozeUntil: until.toISOString() },
        );
        setConversations((prev) =>
          prev.filter((c) => c.id !== selectedConversation.id),
        );
        setSelectedConversation(null);
      } catch (err) {
        console.error('Error snoozing:', err);
      }
    },
    [selectedConversation, setConversations, setSelectedConversation],
  );

  const handleForwardMessage = useCallback(
    async (forwardMessage: any, targetConversationId: string) => {
      if (!forwardMessage) return;
      try {
        await apiClient.post(
          `/api/v1/unified-inbox/conversations/${targetConversationId}/messages`,
          {
            content: forwardMessage.content,
            type: forwardMessage.type || 'text',
            platform: forwardMessage.platform,
            mediaUrl: forwardMessage.mediaUrl,
            mediaFileName: forwardMessage.mediaFileName,
          },
        );
      } catch (err) {
        console.error('Error forwarding message:', err);
      }
    },
    [],
  );

  return {
    handleStatusChange,
    handleAssign,
    handleMarkResolved,
    handleMarkUnread,
    handleArchiveConversation,
    handleBlockCustomer,
    handleDeleteConversation,
    handleToggleAi,
    handleTogglePriority,
    handleCopyConversationLink,
    handleSnooze,
    handleForwardMessage,
  };
};
