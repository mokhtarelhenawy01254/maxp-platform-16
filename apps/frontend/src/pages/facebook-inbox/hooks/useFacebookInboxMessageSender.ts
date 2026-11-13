import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { apiClient, retryConversationMessage } from '@/services/apiClient';
import { useSendMessage } from '@/hooks/inbox/useSendMessage';
import type {
  InboxConversation,
  InboxMessage,
  InboxTab,
} from '@/types/inbox.types';

interface UseFacebookInboxMessageSenderParams {
  companyId: string | null | undefined;
  selectedConversation: InboxConversation | null;
  activeTab: InboxTab;
  isConnected: boolean;
  replyToMessage: InboxMessage | null;
  setReplyToMessage: (msg: InboxMessage | null) => void;
  updateSelectedConversation: (updates: Partial<InboxConversation>) => void;
  updateConversationInList?: (id: string, updates: Partial<InboxConversation>) => void;
  addMessage: (msg: InboxMessage) => void;
  updateMessage?: (id: string, updater: (prev: InboxMessage) => InboxMessage) => void;
  loadMessages: (conversationId: string) => void;
  debouncedLoadConversations: (tab: InboxTab) => void;
  setShowTextGallery: (show: boolean) => void;
  setShowImageGallery: (show: boolean) => void;
  setShowProductPicker: (show: boolean) => void;
}

export function useFacebookInboxMessageSender({
  companyId,
  selectedConversation,
  activeTab,
  isConnected,
  replyToMessage,
  setReplyToMessage,
  updateSelectedConversation,
  updateConversationInList,
  addMessage,
  updateMessage,
  loadMessages,
  debouncedLoadConversations,
  setShowTextGallery,
  setShowImageGallery,
  setShowProductPicker,
}: UseFacebookInboxMessageSenderParams) {
  const { t } = useTranslation();

  const { sendTextMessage, sendFileMessage, sending, uploadingFile } =
    useSendMessage();

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversation || !companyId) return;

      const currentReplyTo = replyToMessage;
      setReplyToMessage(null);

      updateSelectedConversation({
        lastMessageIsFromCustomer: false,
        lastMessage:
          content.length > 100 ? `${content.substring(0, 100)}...` : content,
        lastMessageTime: new Date(),
      });

      try {
        await sendTextMessage(
          selectedConversation.id,
          content,
          companyId,
          currentReplyTo,
          (optimisticMsg) => addMessage(optimisticMsg),
          (tempId, realMsg) => {
            if (updateMessage) {
              updateMessage(tempId, () => ({
                ...realMsg,
                deliveryStatus: 'SENT',
                status: 'sent',
              }));
            }
          },
          (tempId, errMsg) => {
            if (updateMessage) {
              updateMessage(tempId, (prev) => ({
                ...prev,
                deliveryStatus: 'FAILED',
                status: 'error',
                failureReason: errMsg,
              }));
            }
            if (updateConversationInList) {
              updateConversationInList(selectedConversation.id, {
                hasFailedDelivery: true,
                lastMessageDeliveryStatus: 'FAILED',
                lastMessageFailureReason: errMsg,
              });
            }
          },
        );

        if (!isConnected) {
          loadMessages(selectedConversation.id);
        }
        if (activeTab === 'unreplied') {
          debouncedLoadConversations('unreplied');
        }
      } catch (error: any) {
        console.error('Failed to send message:', error);
        const errMsg =
          error.response?.data?.message ||
          error.message ||
          t('conversations.messageSendFailed', 'فشل إرسال الرسالة إلى فيسبوك');
        toast.error(errMsg);
        if (updateConversationInList) {
          updateConversationInList(selectedConversation.id, {
            hasFailedDelivery: true,
            lastMessageDeliveryStatus: 'FAILED',
            lastMessageFailureReason: errMsg,
          });
        }
        loadMessages(selectedConversation.id);
      }
    },
    [
      selectedConversation,
      companyId,
      sendTextMessage,
      loadMessages,
      replyToMessage,
      updateSelectedConversation,
      updateConversationInList,
      updateMessage,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      addMessage,
      setReplyToMessage,
      t,
    ],
  );

  const handleSendFile = useCallback(
    async (file: File) => {
      if (!selectedConversation || !companyId) return;
      try {
        await sendFileMessage(selectedConversation.id, file, companyId);
        updateSelectedConversation({
          lastMessageIsFromCustomer: false,
          lastMessage: file.name,
          lastMessageTime: new Date(),
        });
        if (!isConnected) {
          loadMessages(selectedConversation.id);
        }
        if (activeTab === 'unreplied') {
          debouncedLoadConversations('unreplied');
        }
      } catch (error: any) {
        const errMsg =
          error.response?.data?.message ||
          error.message ||
          t('conversations.fileSendFailed', 'فشل إرسال الملف');
        toast.error(errMsg);
      }
    },
    [
      selectedConversation,
      companyId,
      sendFileMessage,
      loadMessages,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      t,
    ],
  );

  const handleSendFiles = useCallback(
    async (files: File[]) => {
      if (!selectedConversation || !companyId || files.length === 0) return;
      try {
        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          let sent = false;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              await sendFileMessage(selectedConversation.id, file, companyId);
              sent = true;
              successCount++;
              break;
            } catch {
              if (attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
            }
          }
          if (sent && i < files.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
        }

        if (successCount > 0) {
          updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage:
              files.length === 1 ? files[0].name : `${successCount} files`,
            lastMessageTime: new Date(),
          });
          if (!isConnected) {
            loadMessages(selectedConversation.id);
          }
          if (activeTab === 'unreplied') {
            debouncedLoadConversations('unreplied');
          }
        }
      } catch {
        alert(t('conversations.fileSendFailed'));
      }
    },
    [
      selectedConversation,
      companyId,
      sendFileMessage,
      loadMessages,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      t,
    ],
  );

  const handleSelectTextFromGallery = useCallback(
    async (text: { content: string; imageUrls?: string[] }) => {
      if (!selectedConversation || !companyId) return;
      setShowTextGallery(false);

      try {
        const messageContent = text.content?.trim() || '';
        const imageUrls = text.imageUrls || [];

        if (messageContent && imageUrls.length === 0) {
          await sendTextMessage(
            selectedConversation.id,
            messageContent,
            companyId,
            replyToMessage,
            (opt) => addMessage(opt),
          );
          updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage: messageContent,
            lastMessageTime: new Date(),
          });
          if (!isConnected) {
            loadMessages(selectedConversation.id);
          }
          if (activeTab === 'unreplied') {
            debouncedLoadConversations('unreplied');
          }
          return;
        }

        if (messageContent) {
          await sendTextMessage(
            selectedConversation.id,
            messageContent,
            companyId,
            replyToMessage,
            (opt) => addMessage(opt),
          );
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        if (imageUrls.length > 0) {
          let successCount = 0;
          for (const imageUrl of imageUrls) {
            const urlParts = imageUrl.split('/');
            const filename = urlParts[urlParts.length - 1] || 'image.jpg';
            for (let attempt = 0; attempt < 2; attempt++) {
              try {
                await apiClient.post(
                  `/conversations/${selectedConversation.id}/send-existing-image`,
                  { imageUrl, filename },
                );
                successCount++;
                break;
              } catch {
                if (attempt === 0) {
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                }
              }
            }
          }
        }

        updateSelectedConversation({
          lastMessageIsFromCustomer: false,
          lastMessage: messageContent || t('facebookInbox.photo'),
          lastMessageTime: new Date(),
        });

        if (!isConnected) {
          setTimeout(() => loadMessages(selectedConversation.id), 500);
        }
        if (activeTab === 'unreplied') {
          debouncedLoadConversations('unreplied');
        }
      } catch {
        alert(t('conversations.textSendFailed'));
      }
    },
    [
      selectedConversation,
      companyId,
      sendTextMessage,
      replyToMessage,
      loadMessages,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      addMessage,
      setShowTextGallery,
      t,
    ],
  );

  const handleSendQuickReply = useCallback(
    async (reply: any) => {
      if (!selectedConversation || !companyId) return;
      if (reply.imageUrls && reply.imageUrls.length > 0) {
        await handleSelectTextFromGallery({
          content: reply.content,
          imageUrls: reply.imageUrls,
        });
      } else {
        await handleSendMessage(reply.content);
      }
    },
    [selectedConversation, companyId, handleSelectTextFromGallery, handleSendMessage],
  );

  const handleSelectImageFromGallery = useCallback(
    async (imageUrl: string, filename: string) => {
      if (!selectedConversation || !companyId) return;
      setShowImageGallery(false);

      try {
        await apiClient.post(
          `/conversations/${selectedConversation.id}/send-existing-image`,
          { imageUrl, filename },
        );
        updateSelectedConversation({
          lastMessageIsFromCustomer: false,
          lastMessage: t('facebookInbox.photo'),
          lastMessageTime: new Date(),
        });
        if (!isConnected) {
          setTimeout(() => loadMessages(selectedConversation.id), 500);
        }
        if (activeTab === 'unreplied') {
          debouncedLoadConversations('unreplied');
        }
      } catch {
        alert(t('conversations.imageSendFailed'));
      }
    },
    [
      selectedConversation,
      companyId,
      loadMessages,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      setShowImageGallery,
      t,
    ],
  );

  const handleSelectMultipleImagesFromGallery = useCallback(
    async (images: Array<{ url: string; filename: string }>) => {
      if (!selectedConversation || !companyId || images.length === 0) return;
      setShowImageGallery(false);

      try {
        let successCount = 0;
        for (const image of images) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              await apiClient.post(
                `/conversations/${selectedConversation.id}/send-existing-image`,
                { imageUrl: image.url, filename: image.filename },
              );
              successCount++;
              break;
            } catch {
              if (attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
            }
          }
        }

        if (successCount > 0) {
          updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage: t('facebookInbox.photos', { count: successCount }),
            lastMessageTime: new Date(),
          });
          if (!isConnected) {
            setTimeout(() => loadMessages(selectedConversation.id), 500);
          }
          if (activeTab === 'unreplied') {
            debouncedLoadConversations('unreplied');
          }
        }
      } catch {
        alert(t('conversations.imagesSendFailed'));
      }
    },
    [
      selectedConversation,
      companyId,
      loadMessages,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      setShowImageGallery,
      t,
    ],
  );

  const handleSendProductImages = useCallback(
    async (
      product: { id: string; name: string; price: number | string },
      images: Array<{ url: string; filename: string }>,
      includeDetails: boolean,
    ) => {
      if (!selectedConversation || !companyId || images.length === 0) return;
      setShowProductPicker(false);

      try {
        if (includeDetails) {
          const detailText = `${product.name}\nالسعر: ${product.price} ج.م`;
          await sendTextMessage(selectedConversation.id, detailText, companyId);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        let successCount = 0;
        for (const image of images) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              await apiClient.post(
                `/conversations/${selectedConversation.id}/send-existing-image`,
                { imageUrl: image.url, filename: image.filename },
              );
              successCount++;
              break;
            } catch {
              if (attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
            }
          }
        }

        if (successCount > 0) {
          updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage: includeDetails
              ? product.name
              : t('facebookInbox.photos', { count: successCount }),
            lastMessageTime: new Date(),
          });
          if (!isConnected) {
            setTimeout(() => loadMessages(selectedConversation.id), 500);
          }
          if (activeTab === 'unreplied') {
            debouncedLoadConversations('unreplied');
          }
        }
      } catch {
        alert(t('conversations.imagesSendFailed'));
      }
    },
    [
      selectedConversation,
      companyId,
      sendTextMessage,
      loadMessages,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      setShowProductPicker,
      t,
    ],
  );

  const handleRetryMessage = useCallback(
    async (message: InboxMessage) => {
      if (!message || !message.id || !selectedConversation?.id) return;

      if (updateMessage) {
        updateMessage(message.id, (prev) => ({
          ...prev,
          deliveryStatus: 'PENDING',
          status: 'sending',
          failureReason: null,
        }));
      }

      try {
        const response = await retryConversationMessage(
          selectedConversation.id,
          message.id,
        );
        const resData = response?.data as any;
        const fbMsgId = resData?.data?.facebookMessageId || resData?.facebookMessageId;

        if (updateMessage) {
          updateMessage(message.id, (prev) => ({
            ...prev,
            deliveryStatus: 'SENT',
            status: 'sent',
            failureReason: null,
            facebookMessageId: fbMsgId || prev.facebookMessageId,
          }));
        }

        if (updateConversationInList) {
          updateConversationInList(selectedConversation.id, {
            hasFailedDelivery: false,
            lastMessageDeliveryStatus: 'SENT',
            lastMessageFailureReason: null,
          });
        }

        loadMessages(selectedConversation.id);
        toast.success(
          t('conversations.messageSentSuccess', 'تم إرسال الرسالة بنجاح إلى فيسبوك'),
        );
      } catch (error: any) {
        console.error('Failed to retry message:', error);
        const errMsg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          t(
            'conversations.messageRetryFailed',
            'فشل إعادة إرسال الرسالة إلى فيسبوك',
          );

        if (updateMessage) {
          updateMessage(message.id, (prev) => ({
            ...prev,
            deliveryStatus: 'FAILED',
            status: 'error',
            failureReason: errMsg,
          }));
        }

        if (updateConversationInList) {
          updateConversationInList(selectedConversation.id, {
            hasFailedDelivery: true,
            lastMessageDeliveryStatus: 'FAILED',
            lastMessageFailureReason: errMsg,
          });
        }

        loadMessages(selectedConversation.id);
        toast.error(errMsg);
      }
    },
    [selectedConversation?.id, updateMessage, updateConversationInList, loadMessages, t],
  );

  return {
    sending,
    uploadingFile,
    handleSendMessage,
    handleSendFile,
    handleSendFiles,
    handleSelectTextFromGallery,
    handleSendQuickReply,
    handleSelectImageFromGallery,
    handleSelectMultipleImagesFromGallery,
    handleSendProductImages,
    handleRetryMessage,
  };
}

export default useFacebookInboxMessageSender;
