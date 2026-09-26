import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../useAuthSimple";
import { useCompany } from "../../contexts/CompanyContext";
import { apiClient } from "../../services/apiClient";
import { InboxConversation, InboxTab } from "../../types/inbox.types";
import { parseInboxConversationMetadata } from "../../utils/inboxConversationMetadata";

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type:
    | "text"
    | "image"
    | "file"
    | "video"
    | "audio"
    | "template"
    | "IMAGE"
    | "FILE"
    | "VIDEO"
    | "AUDIO"
    | "TEMPLATE";
  isFromCustomer: boolean;
  status: "sending" | "sent" | "delivered" | "read" | "error";
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: any;
  attachments?: any[];
}

// Helper to safely parse dates
const safeDate = (date: any): Date => {
  if (!date) return new Date();
  try {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  } catch (e) {
    return new Date();
  }
};

const serializeConversationMetadata = (metadata: unknown): string => {
  try {
    return JSON.stringify(metadata ?? null);
  } catch (_error) {
    return "";
  }
};

// Helper to parse messages (unified logic)
const parseMessage = (msg: any): Message => {
  let md: any = null;

  if (msg.metadata) {
    try {
      md =
        typeof msg.metadata === "string"
          ? JSON.parse(msg.metadata)
          : msg.metadata;
    } catch (e) {
      // Failed to parse metadata, continue with default values
    }
  }

  // Determine sender name
  let senderName = "العميل";
  if (!msg.isFromCustomer) {
    if (md?.employeeName) {
      senderName = md.employeeName;
    } else if (msg.sender?.name && msg.sender.name !== "موظف") {
      senderName = msg.sender.name;
    } else {
      senderName = "موظف";
    }
  }

  // Parse attachments if string
  let attachments = msg.attachments;
  if (typeof attachments === "string") {
    try {
      attachments = JSON.parse(attachments);
    } catch (e) {
      attachments = [];
    }
  }

  const msgType = msg.type || "text";
  const isMedia = [
    "image",
    "file",
    "video",
    "audio",
    "IMAGE",
    "FILE",
    "VIDEO",
    "AUDIO",
  ].includes(msgType);

  return {
    id: msg.id,
    content: msg.content,
    senderId: msg.senderId === 'ai' || msg.isAIResponse || (!msg.isFromCustomer && !msg.senderId) ? 'ai' : (msg.sender?.id || msg.senderId || "unknown"),
    senderName,
    timestamp: safeDate(msg.timestamp || msg.createdAt),
    type: msgType,
    isFromCustomer: msg.isFromCustomer,
    status: "delivered", // Default to delivered for history
    conversationId: msg.conversationId,
    fileUrl: msg.fileUrl || (isMedia ? msg.content : undefined),
    fileName: msg.fileName,
    fileSize: msg.fileSize,
    metadata: md,
    attachments: attachments,
    isAIResponse: msg.isAIResponse || (!msg.isFromCustomer && !msg.senderId) || false,
  };
};

export const useInboxConversations = () => {
  const { user: _user } = useAuth();
  const { companyId } = useCompany();

  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<InboxConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  // Conversations pagination & filtering
  const [conversationsPage, setConversationsPage] = useState(1);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);

  // Track current tab for pagination to work correctly
  const currentTabRef = useRef<string>("all");

  // Track the last channel filter so "load more" pagination respects it.
  const lastChannelRef = useRef<string | undefined>(undefined);

  // Track the last priority filter so "load more" pagination respects it.
  const lastPriorityRef = useRef<boolean | undefined>(undefined);

  const currentConversationIdRef = useRef<string | null>(null);

  // Store counts from API
  const [apiCounts, setApiCounts] = useState<{
    total: number;
    unreplied: number;
    priority: number;
  }>({ total: 0, unreplied: 0, priority: 0 });

  // Load conversations
  const loadConversations = useCallback(
    async (
      pageNum = 1,
      append = false,
      tab: string = "all",
      search?: string,
      channel?: string,
      priority?: boolean,
    ) => {
      if (!companyId) return;

      try {
        if (pageNum === 1) {
          setLoading(true);
          currentTabRef.current = tab; // Update current tab
        }
        setError(null);

        if (channel) lastChannelRef.current = channel;
        if (priority !== undefined) lastPriorityRef.current = priority;

        const isPriority = priority !== undefined ? priority : (lastPriorityRef.current || false);

        const response = await apiClient.get(`conversations`, {
          params: {
            companyId,
            limit: isPriority ? 200 : 50, // Load all priority chats at once with higher limit
            page: pageNum,
            tab: tab,
            ...(search && search.trim() ? { search: search.trim() } : {}), // 🆕 Add search parameter
            ...(channel ? { channel } : {}), // 🆕 Filter by channel (e.g. INSTAGRAM)
            ...(isPriority ? { priority: "true" } : {}), // 🆕 Server-side priority filter
          },
        });

        const result = response.data || {};
        const data = result.data || result || [];
        const pagination = result.pagination || {};
        const counts = result.counts || {};

        // Update API counts
        if (
          counts.total !== undefined ||
          counts.unreplied !== undefined ||
          counts.priority !== undefined
        ) {
          setApiCounts((prev) => ({
            total: counts.total ?? prev.total,
            unreplied: counts.unreplied ?? prev.unreplied,
            priority: counts.priority ?? prev.priority,
          }));
        }

        // Check for more conversations
        setHasMoreConversations(
          pagination.hasNextPage || pagination.hasMore || false,
        );
        setConversationsPage(pageNum);

        const formattedConversations: InboxConversation[] = data.map(
          (conv: any) => {
            const metadata = parseInboxConversationMetadata(conv.metadata);
            // Determine tab logic moved to backend ideally, mapping here for safety
            // ... logic to determine tab ...
            let currentTab: InboxTab = "all";
            const status = (conv.status || "active").toLowerCase();

            if (status === "resolved" || status === "done") {
              currentTab = "done";
            } else if (
              status === "active" ||
              status === "open" ||
              status === "pending"
            ) {
              const metadataTab = metadata?.tab || metadata?.inboxTab;
              if (
                metadataTab &&
                ["main", "general", "requests", "spam"].includes(metadataTab)
              ) {
                currentTab = metadataTab as InboxTab;
              } else {
                currentTab = "main";
              }
            }

            return {
              id: conv.id,
              customerId: conv.customerId,
              customerName: conv.customer?.name || conv.customerName || "عميل",
              customerAvatar: conv.customer?.avatar || conv.customerAvatar,
              lastMessage: conv.lastMessage || "لا توجد رسائل",
              lastMessageTime: safeDate(conv.lastMessageTime || conv.updatedAt),
              unreadCount: conv.unreadCount || 0,
              platform: "facebook" as const,
              tab: currentTab,
              status:
                status === "resolved" || status === "done"
                  ? "done"
                  : status === "pending"
                    ? "pending"
                    : "open",
              assignedTo: conv.assignedTo || null,
              assignedToName: conv.assignedToName || null,
              tags: conv.tags || [],
              priority: conv.priority || false,
              aiEnabled: conv.aiEnabled !== false,
              aiPausedUntil: conv.aiPausedUntil || (metadata as any)?.aiPausedUntil || null,
              snoozedUntil: conv.snoozedUntil
                ? safeDate(conv.snoozedUntil)
                : metadata?.snoozedUntil
                  ? safeDate(metadata.snoozedUntil)
                  : null,
              archived: conv.archived || false,
              muted: conv.muted || false,
              lastStatusChange: safeDate(
                conv.lastStatusChange || conv.updatedAt,
              ),
              firstResponseTime: conv.firstResponseTime || null,
              avgResponseTime: conv.avgResponseTime || null,
              pageName: conv.pageName,
              pageId: conv.pageId,
              metadata,
              lastMessageIsFromCustomer: conv.lastMessageIsFromCustomer,
              hasUnreadMessages: conv.hasUnreadMessages,
              postId: (() => {
                if (conv.postId) return conv.postId;
                if (metadata?.postId) return metadata.postId;
                return null;
              })(),
              postDetails: null,
              postDetailsUnavailable: false,
            };
          },
        );

        // Deduplicate
        const conversationsMap = new Map<string, InboxConversation>();
        formattedConversations.forEach((conv) => {
          conversationsMap.set(conv.id, conv);
        });
        const deduplicatedConversations = Array.from(conversationsMap.values());

        if (append && pageNum > 1) {
          setConversations((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newConversations = deduplicatedConversations.filter(
              (c) => !existingIds.has(c.id),
            );
            return [...prev, ...newConversations];
          });
        } else {
          setConversations(deduplicatedConversations); // Replace entirely for new page or tab switch
        }
      } catch (err: any) {
        console.error("❌ Error loading conversations:", err);
        setError(err.message || "فشل في تحميل المحادثات");
      } finally {
        if (pageNum === 1) {
          setLoading(false);
        }
      }
    },
    [companyId],
  );

  // Load more conversations - now uses currentTabRef and lastPriorityRef to ensure correct pagination
  const loadMoreConversations = useCallback(() => {
    if (hasMoreConversations && !loading) {
      loadConversations(
        conversationsPage + 1,
        true,
        currentTabRef.current,
        undefined,
        lastChannelRef.current,
        lastPriorityRef.current,
      );
    }
  }, [hasMoreConversations, loading, conversationsPage, loadConversations]);

  // Load messages for a conversation
  const loadMessages = useCallback(
    async (conversationId: string, pageNum = 1) => {
      if (!conversationId || !companyId) return;

      if (pageNum === 1) {
        currentConversationIdRef.current = conversationId;
        setMessages([]);
      } else if (currentConversationIdRef.current !== conversationId) {
        return;
      }

      try {
        setLoadingMessages(true);

        const response = await apiClient.get(
          `/conversations/${conversationId}/messages`,
          {
            params: {
              companyId,
              page: pageNum,
              limit: 50,
            },
          },
        );

        if (currentConversationIdRef.current !== conversationId) return;

        const result = response.data || {};
        const data = result.data || result || [];
        const pagination = result.pagination || {};

        setHasMoreMessages(
          pagination.hasNextPage || pagination.hasMore || false,
        );
        setMessagesPage(pageNum);

        const formattedMessages: Message[] = data.map(parseMessage);

        // Deduplicate
        const messagesMap = new Map<string, Message>();
        formattedMessages.forEach((msg) => messagesMap.set(msg.id, msg));
        const deduplicatedMessages = Array.from(messagesMap.values());

        if (pageNum === 1) {
          setMessages(deduplicatedMessages);
        } else {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = deduplicatedMessages.filter(
              (m) => !existingIds.has(m.id),
            );
            const result = [...newMessages, ...prev];
            return result;
          });
        }
      } catch (err: any) {
        console.error("❌ Error loading messages:", err);
        setError(err.message || "فشل في تحميل الرسائل");
      } finally {
        setLoadingMessages(false);
      }
    },
    [companyId],
  );

  const loadMoreMessages = useCallback(() => {
    if (selectedConversation && hasMoreMessages && !loadingMessages) {
      loadMessages(selectedConversation.id, messagesPage + 1);
    }
  }, [
    selectedConversation,
    hasMoreMessages,
    loadingMessages,
    messagesPage,
    loadMessages,
  ]);

  // Select conversation
  const selectConversation = useCallback(
    async (conversation: InboxConversation | null) => {
      setSelectedConversation(conversation);
      if (conversation) {
        // 🆕 Save selected conversation ID to localStorage for persistence after refresh
        localStorage.setItem("selectedConversationId", conversation.id);

        loadMessages(conversation.id);
        // 🔧 FIX: Always mark conversation as read when opened (even if unreadCount is 0, to sync with backend)
        // This ensures backend state is updated and unreadCount is recalculated
        try {
          const response = await apiClient.post(
            `/conversations/${conversation.id}/read`,
          );
          // Update local state with response data
          // 🔧 FIX: Use unreadCount from response (backend calculates it correctly)
          const newUnreadCount =
            response.data?.unreadCount ??
            response.data?.conversation?.unreadCount ??
            0;
          setSelectedConversation((prev) =>
            prev ? { ...prev, unreadCount: newUnreadCount } : null,
          );
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === conversation.id
                ? { ...conv, unreadCount: newUnreadCount }
                : conv,
            ),
          );
        } catch (error: any) {
          console.error("Failed to mark conversation as read:", error);
        }
      } else {
        // 🆕 Clear saved conversation ID when deselecting
        localStorage.removeItem("selectedConversationId");
        setMessages([]);
        currentConversationIdRef.current = null;
      }
    },
    [loadMessages, companyId, setConversations],
  );

  // Update selected conversation from list updates
  useEffect(() => {
    if (selectedConversation && conversations.length > 0) {
      const updatedConversation = conversations.find(
        (c) => c.id === selectedConversation.id,
      );
      const updatedMetadataSnapshot = serializeConversationMetadata(
        updatedConversation?.metadata,
      );
      const selectedMetadataSnapshot = serializeConversationMetadata(
        selectedConversation.metadata,
      );
      if (
        updatedConversation &&
        (updatedConversation.status !== selectedConversation.status ||
          updatedConversation.assignedTo !== selectedConversation.assignedTo ||
          updatedConversation.assignedToName !==
            selectedConversation.assignedToName ||
          updatedConversation.priority !== selectedConversation.priority ||
          updatedConversation.postId !== selectedConversation.postId ||
          updatedConversation.lastMessage !== selectedConversation.lastMessage ||
          updatedConversation.unreadCount !== selectedConversation.unreadCount ||
          updatedConversation.lastMessageTime.getTime() !==
            selectedConversation.lastMessageTime.getTime() ||
          updatedMetadataSnapshot !== selectedMetadataSnapshot)
      ) {
        const postDetails =
          selectedConversation.postDetails ||
          updatedConversation.postDetails ||
          null;
        setSelectedConversation({
          ...updatedConversation,
          postDetails: postDetails,
        });
      }
    }
  }, [conversations, selectedConversation]);

  // Initial load - load default 'all' tab if not called externally
  // But since component calls it, we might want to skip auto-load or default to something
  useEffect(() => {
    // We let the component trigger the first load to control the tab
  }, []);

  // 🆕 Restore selected conversation from localStorage after conversations are loaded
  const restoredRef = useRef(false);
  useEffect(() => {
    if (
      restoredRef.current ||
      conversations.length === 0 ||
      selectedConversation
    )
      return;

    const savedConversationId = localStorage.getItem("selectedConversationId");
    if (savedConversationId) {
      const savedConversation = conversations.find(
        (c) => c.id === savedConversationId,
      );
      if (savedConversation) {
        console.log("🔄 Restoring saved conversation:", savedConversationId);
        selectConversation(savedConversation);
        restoredRef.current = true;
      }
    }
  }, [conversations, selectedConversation, selectConversation]);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const addMessage = useCallback((newMessage: any) => {
    setMessages((prev) => {
      // Check if message already exists by ID
      if (prev.some((m) => m.id === newMessage.id)) return prev;

      const formatted = parseMessage(newMessage);

      // 🆕 Check for optimistic message with same content (temp_ ID)
      // If we find a temp message with same content, replace it with real message
      const tempIndex = prev.findIndex(
        (m) =>
          m.id.startsWith("temp_") &&
          m.content === formatted.content &&
          !m.isFromCustomer,
      );

      if (tempIndex !== -1) {
        // Replace temp message with real message
        const updated = [...prev];
        updated[tempIndex] = formatted;
        return updated;
      }

      // 🆕 Also check if same content was sent within last 5 seconds (duplicate prevention)
      const now = new Date().getTime();
      const isDuplicate = prev.some(
        (m) =>
          m.content === formatted.content &&
          !m.isFromCustomer &&
          now - new Date(m.timestamp).getTime() < 5000,
      );

      if (isDuplicate) return prev;

      return [...prev, formatted];
    });
  }, []);

  const updateSelectedConversation = useCallback(
    (updates: Partial<InboxConversation>) => {
      setSelectedConversation((prev) =>
        prev ? { ...prev, ...updates } : null,
      );
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === selectedConversation?.id ? { ...conv, ...updates } : conv,
        ),
      );
    },
    [selectedConversation?.id],
  );

  const updateConversationInList = useCallback(
    (conversationId: string, updates: Partial<InboxConversation>) => {
      setSelectedConversation((prev) =>
        prev && prev.id === conversationId ? { ...prev, ...updates } : prev,
      );
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, ...updates } : conv,
        ),
      );
    },
    [],
  );

  // 🆕 Add a single conversation to the list (for URL loading)
  const addConversationToList = useCallback(
    (conversation: InboxConversation) => {
      setConversations((prev) => {
        // Check if conversation already exists
        if (prev.some((c) => c.id === conversation.id)) {
          // Update existing conversation
          return prev.map((c) => (c.id === conversation.id ? conversation : c));
        }
        // Add to beginning of list
        return [conversation, ...prev];
      });
    },
    [],
  );

  // 🆕 Update messages status to 'read' (for read receipts)
  const markMessagesAsRead = useCallback((watermark: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        // Only update outgoing messages (not from customer) that are sent/delivered
        if (
          !msg.isFromCustomer &&
          (msg.status === "sent" || msg.status === "delivered") &&
          new Date(msg.timestamp).getTime() <= watermark
        ) {
          return { ...msg, status: "read" as const };
        }
        return msg;
      }),
    );
  }, []);

  // 🆕 Update a single message in-place without reloading or resetting scroll position
  const updateMessage = useCallback(
    (messageId: string, updater: (prevMessage: Message) => Message) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
      );
    },
    [],
  );

  // 🆕 Remove a single message in-place without reloading or resetting scroll position
  const removeMessage = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  return {
    conversations,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    error,
    selectConversation,
    loadConversations,
    loadMessages,
    loadMoreMessages,
    addMessage,
    updateMessage,
    removeMessage,
    hasMore: hasMoreMessages,
    hasMoreConversations,
    loadMoreConversations,
    updateSelectedConversation,
    updateConversationInList,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    apiCounts,
    // 🆕 Add conversation to list
    addConversationToList,
    // 🆕 Mark messages as read (for read receipts)
    markMessagesAsRead,
  };
};
