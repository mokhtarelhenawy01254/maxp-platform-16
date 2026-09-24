import {
  InfiniteData,
  useQuery,
  useInfiniteQuery,
  UseQueryOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { apiClient as api } from "../services/apiClient";
import { indexedDBStorage } from "../services/indexedDBStorage";

/**
 * WhatsApp Queries Hooks
 *
 * Custom hooks for fetching WhatsApp data using TanStack Query
 * with IndexedDB persistence for large-scale data (10K+ conversations)
 */

export type WhatsAppProvider = "BAILEYS" | "META_CLOUD";

export type WhatsAppSidebarFilter = "all" | "unreplied" | "unread" | "groups" | "statuses";

export interface WhatsAppConversationCounts {
  all: number;
  unread: number;
  groups: number;
  unreplied: number;
  archived: number;
}

export interface Session {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: string;
  liveStatus: string;
  provider?: WhatsAppProvider;
  metaPhoneNumberId?: string | null;
  metaWabaId?: string | null;
  metaBusinessId?: string | null;
  metaAccessToken?: string | null;
  metaTokenExpiresAt?: string | null;
  metaWebhookVerifyToken?: string | null;
  metaWebhookSecret?: string | null;
  metaDisplayPhoneNumber?: string | null;
  metaQualityRating?: string | null;
  metaMessagingLimit?: number | null;
  metaApiVersion?: string | null;
  callShieldEnabled?: boolean;
  callShieldMessage?: string | null;
}

export interface Contact {
  id: string;
  sessionId: string;
  jid: string;
  phoneNumber: string;
  name: string | null;
  pushName: string | null;
  profilePicUrl: string | null;
  isGroup: boolean;
  isNewsletter: boolean;
  category: string | null;
  leadCategoryId?: string | null;
  leadCategory?: { id: string; name: string; color: string | null } | null;
  labels?: string[];
  unreadCount: number;
  lastMessageAt: string | null;
  lastCustomerMessageAt?: string | null;
  window?: {
    isOpen: boolean;
    windowExpiresAt: string | null;
    remainingSeconds: number;
    remainingLabel: string;
  } | null;
  isArchived: boolean;
  isPinned: boolean;
  isMuted: boolean;
  isBlocked?: boolean;
  session: {
    name: string;
    phoneNumber: string | null;
    provider?: string | null;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    conversations?: Array<{ id: string; aiEnabled: boolean }>;
  } | null;
  lastMessage?: {
    content: string | null;
    messageType: string;
    fromMe: boolean;
    senderId?: string | null;
    senderName?: string | null;
    timestamp: string;
  };
  matchedMessage?: {
    content: string | null;
    messageType: string;
    fromMe: boolean;
    timestamp: string;
  } | null;
  window: {
    isOpen: boolean;
    remainingSeconds: number;
    remainingLabel: string;
    windowExpiresAt: string | null;
  };
}

export interface Message {
  id: string;
  messageId: string;
  remoteJid: string;
  fromMe: boolean;
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  quotedMessageId: string | null;
  quotedContent: string | null;
  status: string;
  timestamp: string;
  isAIResponse: boolean;
  aiConfidence: number | null;
  senderId?: string;
  senderName?: string;
  participant?: string;
  participantName?: string;
  metadata?: any;
  interactiveData?: string;
  isPinned?: boolean;
  reactions?: Record<string, string>;
}

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string;
}

interface ConversationsResponse {
  conversations: Contact[];
  counts?: WhatsAppConversationCounts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch WhatsApp sessions
 */
export const useWhatsAppSessions = (
  options?: Omit<UseQueryOptions<Session[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<Session[], Error>({
    queryKey: ["whatsapp", "sessions"],
    queryFn: async () => {
      // Try to load from IndexedDB cache first
      const cacheKey = "whatsapp_sessions";
      try {
        const cached = await indexedDBStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const { data, timestamp } = parsed;
          const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
          if (Date.now() - timestamp < CACHE_TTL) {
            // Return cached data immediately, then fetch fresh data
            setTimeout(async () => {
              try {
                const response = await api.get<{ sessions?: Session[] }>("/whatsapp/sessions");
                const fetchedSessions = response.data.sessions || [];
                const sessionsWithAll =
                  fetchedSessions.length > 0 &&
                  !fetchedSessions.some((s: Session) => s.id === "all")
                    ? [
                        {
                          id: "all",
                          name: "كل الجلسات",
                          phoneNumber: null,
                          status: "connected",
                          liveStatus: "connected",
                        },
                        ...fetchedSessions,
                      ]
                    : fetchedSessions;

                await indexedDBStorage.setItem(
                  cacheKey,
                  JSON.stringify({
                    data: sessionsWithAll,
                    timestamp: Date.now(),
                  }),
                );
              } catch (error) {
                console.error("Error fetching fresh sessions:", error);
              }
            }, 100);
            return data;
          }
        }
      } catch (error) {
        console.error("Error loading sessions from cache:", error);
      }

      // Fetch from API
      const response = await api.get<{ sessions?: Session[] }>("/whatsapp/sessions");
      const fetchedSessions = response.data.sessions || [];

      // Add "All Sessions" option if there are sessions
      const sessionsWithAll =
        fetchedSessions.length > 0 &&
        !fetchedSessions.some((s: Session) => s.id === "all")
          ? [
              {
                id: "all",
                name: "كل الجلسات",
                phoneNumber: null,
                status: "connected",
                liveStatus: "connected",
              },
              ...fetchedSessions,
            ]
          : fetchedSessions;

      // Cache in IndexedDB
      try {
        await indexedDBStorage.setItem(
          cacheKey,
          JSON.stringify({
            data: sessionsWithAll,
            timestamp: Date.now(),
          }),
        );
      } catch (error) {
        console.error("Error caching sessions:", error);
      }

      return sessionsWithAll;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch WhatsApp conversations with infinite scroll pagination
 */
export const useWhatsAppConversations = (
  sessionId: string,
  limit: number = 30,
  filters: { filter?: WhatsAppSidebarFilter; search?: string; archived?: boolean } = {},
  options?: Omit<
    UseInfiniteQueryOptions<
      ConversationsResponse,
      Error,
      InfiniteData<ConversationsResponse, number>,
      readonly unknown[],
      number
    >,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
  >,
) => {
  return useInfiniteQuery<
    ConversationsResponse,
    Error,
    InfiniteData<ConversationsResponse, number>,
    readonly unknown[],
    number
  >({
    queryKey: [
      "whatsapp",
      "conversations",
      sessionId,
      limit,
      filters.filter || "all",
      filters.search || "",
      filters.archived || false,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const cacheKey = `whatsapp_conversations_${sessionId}`;
      let response;
      try {
        response = await api.get<ConversationsResponse>("/whatsapp/conversations", {
          params: {
            sessionId,
            page: pageParam,
            limit,
            filter: filters.filter === "all" ? undefined : filters.filter,
            search: filters.search || undefined,
            archived: filters.archived || undefined,
          },
        });
      } catch (error) {
        if (pageParam === 1) {
          try {
            const cached = await indexedDBStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed?.data?.conversations) {
                return parsed.data;
              }
            }
          } catch (cacheError) {
            console.error("Error loading cached conversations:", cacheError);
          }
        }
        throw error;
      }

      const result = {
        conversations: response.data.conversations || [],
        counts: response.data.counts,
        pagination: response.data.pagination || {},
      };

      // Cache first page in IndexedDB
      if (pageParam === 1) {
        try {
          await indexedDBStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: result,
              timestamp: Date.now(),
            }),
          );
        } catch (error) {
          console.error("Error caching conversations:", error);
        }
      }

      return result;
    },
    enabled: !!sessionId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination && pagination.page < pagination.totalPages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch WhatsApp messages with infinite scroll
 */
export const useWhatsAppMessages = (
  jid: string | null,
  sessionId: string | null,
  options?: Omit<
    UseInfiniteQueryOptions<
      MessagesResponse,
      Error,
      InfiniteData<MessagesResponse, number>,
      readonly unknown[],
      number
    >,
    "queryKey" | "queryFn" | "getNextPageParam" | "initialPageParam"
  >,
) => {
  return useInfiniteQuery<
    MessagesResponse,
    Error,
    InfiniteData<MessagesResponse, number>,
    readonly unknown[],
    number
  >({
    queryKey: ["whatsapp", "messages", jid, sessionId],
    queryFn: async ({ pageParam = 1 }) => {
      if (!jid || !sessionId) {
        throw new Error("JID and Session ID are required");
      }

      const cacheKey = `whatsapp_messages_${jid}_${sessionId}`;
      let response;
      try {
        response = await api.get<MessagesResponse>(
          `/whatsapp/conversations/${encodeURIComponent(jid)}/messages`,
          {
            params: { sessionId, page: pageParam, limit: 50 },
          },
        );
      } catch (error) {
        if (pageParam === 1) {
          try {
            const cached = await indexedDBStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed?.data?.messages)) {
                return parsed.data;
              }
            }
          } catch (cacheError) {
            console.error("Error loading cached messages:", cacheError);
          }
        }
        throw error;
      }

      const result = {
        messages: response.data.messages || [],
        pagination: response.data.pagination || {},
      };

      // Cache first page in IndexedDB
      if (pageParam === 1) {
        try {
          await indexedDBStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: result,
              timestamp: Date.now(),
            }),
          );
        } catch (error) {
          console.error("Error caching messages:", error);
        }
      }

      return result;
    },
    enabled: !!jid && !!sessionId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination && pagination.page < pagination.totalPages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    refetchIntervalInBackground: false,
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch WhatsApp quick replies
 */
export const useWhatsAppQuickReplies = (
  options?: Omit<UseQueryOptions<QuickReply[], Error>, "queryKey" | "queryFn">,
) => {
  return useQuery<QuickReply[], Error>({
    queryKey: ["whatsapp", "quick-replies"],
    queryFn: async () => {
      const response = await api.get<{ quickReplies?: QuickReply[] }>("/whatsapp/quick-replies");
      return response.data.quickReplies || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (quick replies don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};
