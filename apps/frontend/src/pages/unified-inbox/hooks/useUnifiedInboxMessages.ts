import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/services/apiClient';
import type {
  UnifiedConversation,
  UnifiedMessage,
} from '../types/unifiedInboxTypes';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | { code: string; message: string };
  message?: string;
}

interface UploadResponse {
  success?: boolean;
  filePath?: string;
  fullUrl?: string;
}

export const useUnifiedInboxMessages = (
  selectedConversation: UnifiedConversation | null,
  setConversations: React.Dispatch<
    React.SetStateAction<UnifiedConversation[]>
  >,
  setSelectedConversation: React.Dispatch<
    React.SetStateAction<UnifiedConversation | null>
  >,
) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<
    Array<{ url: string; name: string; type: string }>
  >([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyToMsg, setReplyToMsg] = useState<UnifiedMessage | null>(null);

  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesAbortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async (conv: UnifiedConversation) => {
    messagesAbortRef.current?.abort();
    const ac = new AbortController();
    messagesAbortRef.current = ac;

    try {
      setLoadingMessages(true);
      const params = new URLSearchParams();
      params.set('platform', conv.platform);
      if (conv.metadata?.['sessionId']) {
        params.set('sessionId', conv.metadata['sessionId']);
      }
      if (conv.metadata?.['jid']) {
        params.set('jid', conv.metadata['jid']);
      }

      const response = await apiClient.get<ApiResponse<UnifiedMessage[]>>(
        `/api/v1/unified-inbox/conversations/${conv.id}/messages?${params.toString()}`,
        { signal: ac.signal },
      );

      if (response.data?.success) {
        setMessages(response.data.data || []);
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error: any) {
      if (ac.signal.aborted) return;
      console.error('Error loading messages:', error);
    } finally {
      if (messagesAbortRef.current === ac) {
        setLoadingMessages(false);
      }
    }
  }, [scrollToBottom]);

  const loadQuickReplies = useCallback(async () => {
    try {
      const [qrResponse, textsResponse] = await Promise.all([
        apiClient
          .get<ApiResponse<any[]>>('/api/v1/unified-inbox/quick-replies')
          .catch(() => null),
        apiClient.get<{ texts: any[] }>('/user/text-gallery').catch(() => null),
      ]);

      let combined: any[] = [];
      if (qrResponse?.data?.success) {
        combined = [...(qrResponse.data.data || [])];
      }
      if (textsResponse?.data?.texts) {
        const sortedTexts = [...textsResponse.data.texts].sort((a: any, b: any) => {
          if (!!a.isPinned === !!b.isPinned) {
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          }
          return a.isPinned ? -1 : 1;
        });

        const formattedTexts = sortedTexts.map((tItem: any) => ({
          id: `saved-text-${tItem.id}`,
          title: tItem.title || t('unifiedInbox.untitled', 'بدون عنوان'),
          content: tItem.content,
          imageUrls: tItem.imageUrls,
        }));
        combined = [...combined, ...formattedTexts];
      }
      setQuickReplies(combined);
    } catch (error) {
      console.error('Error loading quick replies:', error);
    }
  }, [t]);

  const handleSendMessage = useCallback(async () => {
    if (!selectedConversation) return;
    if (!newMessage.trim() && attachments.length === 0) return;

    setSending(true);
    setSendError(null);
    try {
      const sentMessages: any[] = [];
      const hasText = newMessage.trim().length > 0;
      const payloads: any[] = [];

      if (hasText) {
        const firstAtt = attachments[0];
        const firstPayload: any = {
          content: newMessage.trim(),
          platform: selectedConversation.platform,
        };
        if (firstAtt) {
          firstPayload.type = firstAtt.type;
          firstPayload.mediaUrl = firstAtt.url;
          firstPayload.mediaFileName = firstAtt.name;
        }
        payloads.push(firstPayload);

        for (let i = 1; i < attachments.length; i++) {
          const att = attachments[i];
          if (!att) continue;
          payloads.push({
            content: '',
            platform: selectedConversation.platform,
            type: att.type,
            mediaUrl: att.url,
            mediaFileName: att.name,
          });
        }
      } else {
        for (const att of attachments) {
          payloads.push({
            content: '',
            platform: selectedConversation.platform,
            type: att.type,
            mediaUrl: att.url,
            mediaFileName: att.name,
          });
        }
      }

      for (let i = 0; i < payloads.length; i++) {
        const body = payloads[i];

        if (i === 0 && replyToMsg) {
          body.quotedMessageId = replyToMsg.id;
          body.quotedContent = replyToMsg.content;
        }

        if (selectedConversation.metadata?.['sessionId']) {
          body.sessionId = selectedConversation.metadata['sessionId'];
        }
        if (selectedConversation.metadata?.['jid']) {
          body.jid = selectedConversation.metadata['jid'];
        }

        const realId = selectedConversation.id;
        const response = await apiClient.post<ApiResponse<UnifiedMessage>>(
          `/api/v1/unified-inbox/conversations/${realId}/messages`,
          body,
        );

        if (response.data?.success) {
          sentMessages.push(response.data.data);
        }

        if (i < payloads.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }

      if (sentMessages.length > 0) {
        setMessages((prev) => [...prev, ...sentMessages]);
        setNewMessage('');
        setAttachments([]);
        setReplyToMsg(null);
        setTimeout(() => scrollToBottom(), 100);

        const previewText =
          attachments.length > 0
            ? `${attachments.length} attachments`
            : newMessage.trim();

        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  lastMessage: previewText,
                  lastMessageTime: new Date().toISOString(),
                  lastMessageIsFromCustomer: false,
                  aiEnabled: false,
                }
              : c,
          ),
        );
        setSelectedConversation((prev) =>
          prev ? { ...prev, aiEnabled: false } : null,
        );
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        t('unifiedInbox.sendFailed', 'فشل إرسال الرسالة');
      setSendError(msg);
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  }, [
    selectedConversation,
    newMessage,
    attachments,
    replyToMsg,
    setConversations,
    setSelectedConversation,
    scrollToBottom,
    t,
  ]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;

        if (file.size > 20 * 1024 * 1024) {
          setSendError(t('unifiedInbox.fileTooLarge', 'الملف أكبر من 20 ميجابايت'));
          setTimeout(() => setSendError(null), 5000);
          continue;
        }

        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await apiClient.post<UploadResponse>(
            '/api/v1/upload',
            formData,
            {
              headers: { 'Content-Type': 'multipart/form-data' },
            },
          );

          if (response.data?.success || response.data?.filePath) {
            const filePath = response.data.filePath;
            const fullUrl =
              response.data.fullUrl || `${window.location.origin}${filePath}`;

            let type = 'document';
            if (file.type.startsWith('image/')) {
              type = 'image';
            } else if (file.type.startsWith('video/')) {
              type = 'video';
            } else if (file.type.startsWith('audio/')) {
              type = 'audio';
            }

            setAttachments((prev) => [
              ...prev,
              { url: fullUrl, name: file.name, type },
            ]);
          } else {
            setSendError(t('unifiedInbox.uploadFailed', 'فشل رفع الملف'));
            setTimeout(() => setSendError(null), 5000);
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          setSendError(t('unifiedInbox.uploadFailed', 'فشل رفع الملف'));
          setTimeout(() => setSendError(null), 5000);
        } finally {
          setUploadingFile(false);
        }
      }
    },
    [t],
  );

  const submitCorrection = useCallback(
    async (msgId: string) => {
      if (!correctionText.trim() || !selectedConversation) return;
      setSavingCorrection(true);
      try {
        await apiClient.post<ApiResponse>(
          `/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}/correct`,
          { correction: correctionText.trim() },
        );
        setEditingMessageId(null);
        setCorrectionText('');
        loadMessages(selectedConversation);
      } catch (error: any) {
        console.error('Error submitting correction:', error);
      } finally {
        setSavingCorrection(false);
      }
    },
    [correctionText, selectedConversation, loadMessages],
  );

  const handleMsgStar = useCallback(
    async (msgId: string) => {
      if (!selectedConversation) return;
      try {
        await apiClient.put(
          `/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}/star`,
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, isStarred: !m.isStarred } : m,
          ),
        );
      } catch (err) {
        console.error('Error starring message:', err);
      }
    },
    [selectedConversation],
  );

  const handleMsgReact = useCallback(
    async (msgId: string, reaction: string) => {
      if (!selectedConversation) return;
      try {
        await apiClient.put(
          `/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}/reaction`,
          { reaction },
        );
      } catch (err) {
        console.error('Error reacting to message:', err);
      }
    },
    [selectedConversation],
  );

  const handleMsgDelete = useCallback(
    async (msgId: string) => {
      if (!selectedConversation) return;
      try {
        await apiClient.delete(
          `/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}`,
        );
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      } catch (err) {
        console.error('Error deleting message:', err);
      }
    },
    [selectedConversation],
  );

  const handleMsgReply = useCallback((msg: UnifiedMessage) => {
    setReplyToMsg(msg);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMsg(null);
  }, []);

  const handleQuickReplySelect = useCallback((reply: any) => {
    setNewMessage((prev) =>
      prev ? prev + '\n' + (reply.content || '') : reply.content || '',
    );
    if (reply.imageUrls && reply.imageUrls.length > 0) {
      const newAtts = reply.imageUrls.map((url: string) => ({
        url,
        name: url.split('/').pop() || 'image',
        type: 'image',
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
    }
    setShowQuickReplies(false);
  }, []);

  useEffect(() => {
    loadQuickReplies();
  }, [loadQuickReplies]);

  useEffect(() => {
    return () => {
      messagesAbortRef.current?.abort();
    };
  }, []);

  return {
    messages,
    setMessages,
    loadingMessages,
    sending,
    sendError,
    setSendError,
    newMessage,
    setNewMessage,
    attachments,
    setAttachments,
    uploadingFile,
    replyToMsg,
    setReplyToMsg,
    quickReplies,
    showQuickReplies,
    setShowQuickReplies,
    editingMessageId,
    setEditingMessageId,
    correctionText,
    setCorrectionText,
    savingCorrection,
    messagesEndRef,
    messagesContainerRef,
    loadMessages,
    loadQuickReplies,
    handleSendMessage,
    handleFileSelect,
    submitCorrection,
    handleMsgStar,
    handleMsgReact,
    handleMsgDelete,
    handleMsgReply,
    handleCancelReply,
    handleQuickReplySelect,
    scrollToBottom,
  };
};
