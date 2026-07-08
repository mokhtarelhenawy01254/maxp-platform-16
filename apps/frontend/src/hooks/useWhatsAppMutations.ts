import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient as api } from "../services/apiClient";
import { indexedDBStorage } from "../services/indexedDBStorage";
import { Message, Contact } from "./useWhatsAppQueries";
import {
  updateConversationPages,
  type ConversationsCacheData,
} from "./whatsappMutationCache";

/**
 * WhatsApp Mutations Hooks
 *
 * Custom hooks for mutations (send, delete, update) with optimistic updates
 */

interface SendMessageParams {
  sessionId: string;
  to: string;
  text: string;
  quotedMessageId?: string;
  userId?: string;
}

interface SendMediaParams {
  sessionId: string;
  to: string;
  file: File;
  caption?: string;
  userId?: string;
}

interface MarkAsReadParams {
  sessionId: string;
  remoteJid: string;
}

interface SendMessageContext {
  previousMessages?: unknown;
}

interface DeleteConversationParams {
  conversationId: string;
  jid: string;
  sessionId: string;
}

interface ArchiveConversationParams {
  jid: string;
  sessionId: string;
  isArchived: boolean;
}

const updateAllConversationCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  remoteJid: string,
  updater: (contact: Contact) => Contact,
) => {
  queryClient.setQueriesData<ConversationsCacheData | undefined>(
    { queryKey: ["whatsapp", "conversations"] },
    (old) => updateConversationPages(old, remoteJid, updater),
  );
};

const removeConversationStorageCaches = (sessionId: string) => {
  const keys = new Set([
    `whatsapp_conversations_${sessionId}`,
    "whatsapp_conversations_all",
  ]);

  keys.forEach((key) => {
    indexedDBStorage.removeItem(key).catch(console.error);
  });
};

/**
 * Hook to send a text message with optimistic update
 */
export const useSendMessage = (
  options?: Omit<
    UseMutationOptions<any, Error, SendMessageParams, SendMessageContext>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, SendMessageParams, SendMessageContext>({
    mutationFn: async (params) => {
      const response = await api.post("/whatsapp/messages/send", params);
      return response.data;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["whatsapp", "messages", variables.to, variables.sessionId],
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData([
        "whatsapp",
        "messages",
        variables.to,
        variables.sessionId,
      ]);

      const now = new Date().toISOString();
      const temporaryId = `temp-${Date.now()}`;

      // Optimistically update messages
      const optimisticMessage: Message = {
        id: temporaryId,
        messageId: temporaryId,
        remoteJid: variables.to,
        fromMe: true,
        messageType: "TEXT",
        content: variables.text,
        mediaUrl: null,
        mediaType: null,
        mediaFileName: null,
        quotedMessageId: variables.quotedMessageId || null,
        quotedContent: null,
        status: "PENDING",
        timestamp: now,
        isAIResponse: false,
        aiConfidence: null,
      };

      queryClient.setQueryData(
        ["whatsapp", "messages", variables.to, variables.sessionId],
        (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: any, index: number) => {
            if (index === old.pages.length - 1) {
              return {
                ...page,
                messages: [...(page.messages || []), optimisticMessage],
              };
            }
            return page;
          });
          return { ...old, pages: newPages };
        },
      );

      updateAllConversationCaches(queryClient, variables.to, (conv) => ({
        ...conv,
        lastMessage: {
          content: variables.text,
          messageType: "TEXT",
          fromMe: true,
          timestamp: now,
        },
        lastMessageAt: now,
        unreadCount: 0,
      }));

      return { previousMessages };
    },
    onError: (_error, variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["whatsapp", "messages", variables.to, variables.sessionId],
          context.previousMessages,
        );
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidate to refetch with real data
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "messages", variables.to, variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversations"],
      });

      // Invalidate IndexedDB cache
      const cacheKey = `whatsapp_messages_${variables.to}_${variables.sessionId}`;
      indexedDBStorage.removeItem(cacheKey).catch(console.error);
      removeConversationStorageCaches(variables.sessionId);
    },
    ...options,
  });
};

/**
 * Hook to send media with optimistic update
 */
export const useSendMedia = (
  options?: Omit<UseMutationOptions<any, Error, SendMediaParams>, "mutationFn">,
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, SendMediaParams>({
    mutationFn: async (params) => {
      const formData = new FormData();
      formData.append("sessionId", params.sessionId);
      formData.append("to", params.to);
      formData.append("file", params.file);
      if (params.caption) formData.append("caption", params.caption);
      if (params.userId) formData.append("userId", params.userId);

      const response = await api.post(
        "/whatsapp/messages/upload-send",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      const sentMessage = data?.message || {};
      const timestamp = sentMessage.timestamp || new Date().toISOString();
      const messageType = sentMessage.messageType || "MEDIA";
      const content = sentMessage.content ?? variables.caption ?? variables.file.name ?? null;

      updateAllConversationCaches(queryClient, variables.to, (conv) => ({
        ...conv,
        lastMessage: {
          content,
          messageType,
          fromMe: true,
          timestamp,
        },
        lastMessageAt: timestamp,
        unreadCount: 0,
      }));

      // Invalidate queries to refetch
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "messages", variables.to, variables.sessionId],
      });
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversations"],
      });

      // Invalidate IndexedDB cache
      const cacheKey = `whatsapp_messages_${variables.to}_${variables.sessionId}`;
      indexedDBStorage.removeItem(cacheKey).catch(console.error);
      removeConversationStorageCaches(variables.sessionId);
    },
    ...options,
  });
};

/**
 * Hook to mark conversation as read
 */
export const useMarkAsRead = (
  options?: Omit<
    UseMutationOptions<any, Error, MarkAsReadParams>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, MarkAsReadParams>({
    mutationFn: async (params) => {
      // Use shorter timeout for mark as read (10 seconds instead of 30)
      const response = await api.post("/whatsapp/messages/read", params, {
        timeout: 10000,
      });
      return response.data;
    },
    retry: false, // ✅ منع المحاولات المتكررة عند فشل الاتصال
    onMutate: async (variables) => {
      updateAllConversationCaches(queryClient, variables.remoteJid, (conv) => ({
        ...conv,
        unreadCount: 0,
      }));
    },
    onSuccess: (_data, variables) => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversations"],
      });
      removeConversationStorageCaches(variables.sessionId);
    },
    ...options,
  });
};

/**
 * Hook to delete a conversation
 */
export const useDeleteConversation = (
  options?: Omit<
    UseMutationOptions<any, Error, DeleteConversationParams>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, DeleteConversationParams>({
    mutationFn: async (params) => {
      const response = await api.post(
        `/whatsapp/chats/delete`,
        { sessionId: params.sessionId, jid: params.jid }
      );
      return response.data;
    },
    onMutate: async (variables) => {
      // Optimistically remove from list
      queryClient.setQueryData(
        ["whatsapp", "conversations", variables.sessionId, 30],
        (old: any) => {
          if (!old || !old.pages || old.pages.length === 0) return old;
          const firstPage = old.pages[0];
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                conversations: firstPage.conversations.filter(
                  (conv: Contact) => conv.id !== variables.conversationId,
                ),
              },
              ...old.pages.slice(1),
            ],
          };
        },
      );
    },
    onSuccess: (_data, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversations", variables.sessionId],
      });
      queryClient.removeQueries({
        queryKey: ["whatsapp", "messages", variables.jid, variables.sessionId],
      });

      // Remove from IndexedDB cache
      const cacheKey = `whatsapp_messages_${variables.jid}_${variables.sessionId}`;
      indexedDBStorage.removeItem(cacheKey).catch(console.error);
    },
    onError: (_error, variables) => {
      // Rollback on error
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversations", variables.sessionId],
      });
    },
    ...options,
  });
};

/**
 * Hook to archive/unarchive a conversation
 */
export const useArchiveConversation = (
  options?: Omit<
    UseMutationOptions<any, Error, ArchiveConversationParams>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation<any, Error, ArchiveConversationParams>({
    mutationFn: async (params) => {
      const response = await api.post(
        `/whatsapp/chats/archive`,
        {
          sessionId: params.sessionId,
          jid: params.jid,
          archive: params.isArchived,
        },
      );
      return response.data;
    },
    onMutate: async (variables) => {
      // Optimistically update archive status
      queryClient.setQueryData(
        ["whatsapp", "conversations", variables.sessionId, 30],
        (old: any) => {
          if (!old || !old.pages || old.pages.length === 0) return old;
          const firstPage = old.pages[0];
          const updatedConversations = firstPage.conversations.map(
            (conv: Contact) => {
              if (conv.jid === variables.jid) {
                return { ...conv, isArchived: variables.isArchived };
              }
              return conv;
            },
          );
          return {
            ...old,
            pages: [
              {
                ...firstPage,
                conversations: updatedConversations,
              },
              ...old.pages.slice(1),
            ],
          };
        },
      );
    },
    onSuccess: (_data, variables) => {
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["whatsapp", "conversations"],
      });
    },
    ...options,
  });
};
