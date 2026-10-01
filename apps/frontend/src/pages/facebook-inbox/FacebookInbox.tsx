import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useTranslation } from "react-i18next";
import InboxTabs from "../../components/facebook-inbox/InboxTabs/InboxTabs";
import ConversationItem from "../../components/facebook-inbox/ConversationList/ConversationItem";
import MessageBubble from "../../components/facebook-inbox/MessageBubble/MessageBubble";
import MessageInput from "../../components/facebook-inbox/MessageInput/MessageInput";
import ConversationActionsBar from "../../components/facebook-inbox/ConversationActionsBar/ConversationActionsBar";
import { NotesPanel } from "../../components/facebook-inbox/NotesPanel/NotesPanel";
import FilterPanel, {
  FilterState,
} from "../../components/facebook-inbox/FilterPanel/FilterPanel";
import StatsDashboard from "../../components/facebook-inbox/StatsDashboard/StatsDashboard";
import CustomerProfile from "../../components/facebook-inbox/CustomerProfile/CustomerProfile";
import BulkActionsBar from "../../components/facebook-inbox/BulkActionsBar/BulkActionsBar";
import ForwardModal from "../../components/facebook-inbox/Modals/ForwardModal";
import SnoozeModal from "../../components/facebook-inbox/Modals/SnoozeModal";
import QuickOrderModal from "../../components/facebook-inbox/Modals/QuickOrderModal";
import TextGalleryModal from "../../components/facebook-inbox/TextGallery/TextGalleryModal";
import ImageGalleryModal from "../../components/facebook-inbox/ImageGallery/ImageGalleryModal";
import ProductImagePickerModal from "../../components/facebook-inbox/ProductImagePicker/ProductImagePickerModal";
import {
  InboxTab,
  ConversationStatus,
  InboxMessage,
  InboxConversation,
} from "../../types/inbox.types";
import { useInboxConversations } from "../../hooks/inbox/useInboxConversations";
import { useSendMessage } from "../../hooks/inbox/useSendMessage";
import { useConversationActions } from "../../hooks/inbox/useConversationActions";
import { useTagManagement } from "../../hooks/inbox/useTagManagement";
import useSocket from "../../hooks/useSocket";
import { useCompany } from "../../contexts/CompanyContext";
import {
  requestBrowserNotificationPermission,
  showBrowserNotification as showNativeBrowserNotification,
} from "../../utils/browserNotifications";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  StickyNote,
  Menu,
  ArrowRight,
  Copy,
  Check,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Bot,
} from "lucide-react";
import {
  CheckCircleIcon,
  ClockIcon,
  NoSymbolIcon,
  ShoppingCartIcon,
  StarIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { toast } from "sonner";
import { useDebounce } from "../../hooks/useDebounce";
import { apiService } from "../../services/apiService";
import { socketService } from "../../services/socketService";
import { parseInboxConversationMetadata } from "../../utils/inboxConversationMetadata";
import { getInboxCustomerAvatarUrl } from "../../utils/imageUrl";

const FACEBOOK_INBOX_PROFILE_COLUMN_STORAGE_KEY =
  "facebookInboxProfileColumnVisible";

type ApiErrorLike = {
  response?: {
    status?: number;
  };
  message?: string;
};

type InboxApiMessage = Partial<Omit<InboxMessage, "metadata" | "timestamp">> & {
  createdAt?: string | Date;
  timestamp?: string | Date;
  metadata?: string | Record<string, unknown> | null;
  sender?: {
    id?: string;
    name?: string;
  };
  senderName?: string;
};

type SocketInboxMessage = InboxMessage & {
  customerName?: string;
  channel?: string;
};

const getApiError = (error: unknown): ApiErrorLike => {
  if (typeof error === "object" && error !== null) {
    return error as ApiErrorLike;
  }

  return {};
};

  const FacebookInbox: React.FC<{
    channel?: string;
    platform?: string;
    inboxPath?: string;
  }> = ({
    channel = "FACEBOOK",
    platform = "facebook",
    inboxPath = "/facebook-inbox",
  }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { socket, isConnected } = useSocket();

  // فترة سماح لبدء الاتصال الأولي (تمنع ظهور وميض "غير متصل" على أول ثانية عند فتح الصفحة)
  const [hasConnectionGracePeriodPassed, setHasConnectionGracePeriodPassed] =
    useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasConnectionGracePeriodPassed(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Conversations management
  const {
    conversations,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    error,
    selectConversation,
    loadMessages,
    loadConversations,
    loadMoreMessages,
    addMessage,
    updateMessage,
    removeMessage,
    hasMore,
    // Conversations pagination
    hasMoreConversations,
    loadMoreConversations,
    // Update selected conversation
    updateSelectedConversation,
    updateConversationInList,
    // Selection
    selectedIds,
    toggleSelection,
    clearSelection,
    // ðŸ†• API counts for accurate tab counts
    apiCounts,
    // 🆕 Add conversation to list
    addConversationToList,
    // 🆕 Mark messages as read (for read receipts)
    markMessagesAsRead,
  } = useInboxConversations();

  // Send message
  const { sendTextMessage, sendFileMessage, sending, uploadingFile } =
    useSendMessage();

  // Conversation actions
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

  // Tag management
  const { addTags, updating: updatingTags } = useTagManagement();

  // Local state - Default to 'unreplied' tab
  const [activeTab, setActiveTab] = useState<InboxTab>("unreplied");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search for better performance
  const [showFilters, setShowFilters] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true); // Ù„Ù„ØªØ­ÙƒÙ… ÙÙŠ Ø¥Ø¸Ù‡Ø§Ø±/Ø¥Ø®ÙØ§Ø¡ Sidebar Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showDesktopContextColumn, setShowDesktopContextColumn] = useState(
    () => {
      if (typeof window === "undefined") {
        return true;
      }

      try {
        return (
          window.localStorage.getItem(
            FACEBOOK_INBOX_PROFILE_COLUMN_STORAGE_KEY,
          ) !== "false"
        );
      } catch {
        return true;
      }
    },
  );
  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);
  const [showDesktopMoreMenu, setShowDesktopMoreMenu] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [isWideDesktop, setIsWideDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1280 : false,
  );
  const [filters, setFilters] = useState<FilterState>({
    unreadOnly: false,
    assignedTo: "all",
    startDate: null,
    endDate: null,
    priorityOnly: false,
  });

  // Forwarding State
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<InboxMessage | null>(
    null,
  );
  const [replyToMessage, setReplyToMessage] = useState<InboxMessage | null>(
    null,
  );
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);

  // Text Gallery State
  const [showTextGallery, setShowTextGallery] = useState(false);
  const [composerDraft, setComposerDraft] = useState<string>("");

  // Image Gallery State
  const [showImageGallery, setShowImageGallery] = useState(false);

  // ðŸ†• Product Image Picker State
  const [showProductPicker, setShowProductPicker] = useState(false);

  // ðŸ†• Quick Order Modal State
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);

  // ðŸ†• Block Customer States
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlockStatus, setCheckingBlockStatus] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  // ðŸ†• Sound & Notifications States
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ðŸ†• Copy Link State
  const [copiedLink, setCopiedLink] = useState(false);

  // ðŸ†• Advanced Search States
  const [loadingMessagesForSearch, setLoadingMessagesForSearch] = useState<
    Set<string>
  >(new Set());
  const [conversationMessages, setConversationMessages] = useState<
    Map<string, InboxMessage[]>
  >(new Map());
  const selectedConversationAvatarUrl = getInboxCustomerAvatarUrl(
    selectedConversation?.customerId,
    selectedConversation?.customerAvatar,
  );

  // ðŸ†• Load specific conversation from URL
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations; // Keep ref updated

  const clearConversationUrlParam = useCallback(() => {
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has("conversation")) {
      return;
    }

    currentUrl.searchParams.delete("conversation");
    const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  const loadSpecificConversation = useCallback(
    async (conversationId: string) => {
      if (!companyId || !conversationId) return;

      try {
        console.log(
          "ðŸ”„ [URL-LOAD] Loading specific conversation from URL:",
          conversationId,
        );

        // Check if conversation is already loaded (use ref to avoid dependency)
        const existingConversation = conversationsRef.current.find(
          (c) => c.id === conversationId,
        );
        if (existingConversation) {
          console.log(
            "âœ… [URL-LOAD] Conversation already loaded, selecting it",
          );
          selectConversation(existingConversation);
          return;
        }

        // Load conversation from API
        const response = await apiClient.get(
          `/conversations/${conversationId}`,
          {
            params: { companyId },
          },
        );

        const convData = response.data?.data || response.data;
        if (!convData) {
          console.warn(
            "âš ï¸ [URL-LOAD] Conversation payload missing, clearing URL param",
            { conversationId, companyId },
          );
          clearConversationUrlParam();
          return;
        }

        const metadata = parseInboxConversationMetadata(convData.metadata);

        // Format conversation to match InboxConversation interface
        const formattedConversation: InboxConversation = {
          id: convData.id,
          customerId: convData.customerId,
          customerName:
            convData.customer?.name || convData.customerName || t("conversations.customer"),
          customerAvatar: convData.customer?.avatar || convData.customerAvatar,
          lastMessage: convData.lastMessage || t("conversations.noMessages"),
          lastMessageTime: new Date(
            convData.lastMessageTime || convData.updatedAt,
          ),
          unreadCount: convData.unreadCount || 0,
          platform: "facebook" as const,
          tab: (() => {
            const status = (convData.status || "active").toLowerCase();
            if (status === "resolved" || status === "done") return "done";
            if (
              status === "active" ||
              status === "open" ||
              status === "pending"
            ) {
              const metadataTab = metadata?.tab || metadata?.inboxTab;
              if (
                metadataTab &&
                ["main", "general", "requests", "spam"].includes(metadataTab)
              ) {
                return metadataTab as InboxTab;
              }
              return "main";
            }
            return "all";
          })(),
          status: (() => {
            const status = (convData.status || "active").toLowerCase();
            if (status === "resolved" || status === "done") return "done";
            if (status === "pending") return "pending";
            return "open";
          })(),
          assignedTo: convData.assignedTo || null,
          assignedToName: convData.assignedToName || null,
          tags: convData.tags || [],
          priority: convData.priority || false,
          snoozedUntil: convData.snoozedUntil
            ? new Date(convData.snoozedUntil)
            : metadata?.snoozedUntil
              ? new Date(metadata.snoozedUntil as string)
              : null,
          archived: convData.archived || false,
          muted: convData.muted || false,
          lastStatusChange: new Date(
            convData.lastStatusChange || convData.updatedAt,
          ),
          firstResponseTime: convData.firstResponseTime || null,
          avgResponseTime: convData.avgResponseTime || null,
          pageName: convData.pageName,
          pageId: convData.pageId,
          metadata,
          lastMessageIsFromCustomer: convData.lastMessageIsFromCustomer,
          hasUnreadMessages: convData.hasUnreadMessages,
          postId: (() => {
            if (convData.postId) return convData.postId;
            if (metadata?.postId) return metadata.postId;
            return null;
          })(),
          postDetails: null,
          postDetailsUnavailable: false,
        };

        // Add conversation to list if not already there
        addConversationToList(formattedConversation);

        // Select the conversation
        selectConversation(formattedConversation);

        console.log(
          "âœ… [URL-LOAD] Conversation loaded and selected:",
          conversationId,
        );
      } catch (error: unknown) {
        const status = getApiError(error).response?.status;
        if (status === 404 || status === 403) {
          console.warn(
            "âš ï¸ [URL-LOAD] Conversation missing or inaccessible for current company, clearing URL param",
            { conversationId, companyId, status },
          );
          clearConversationUrlParam();
          return;
        }

        console.error("âŒ [URL-LOAD] Error loading conversation:", error);
      }
    },
    [companyId, selectConversation, addConversationToList, clearConversationUrlParam, t],
  );

  // ðŸ†• Reload conversations when tab changes (especially for unreplied)
  // Skip initial load since useInboxConversations already loads on mount
  const isInitialMount = useRef(true);
  const loadConversationsRef = useRef(loadConversations);
  loadConversationsRef.current = loadConversations; // Keep ref updated

  // ðŸ†• Check URL for conversation parameter on mount (only once)
  const urlConversationLoadedRef = useRef(false);
  const loadSpecificConversationRef = useRef(loadSpecificConversation);
  loadSpecificConversationRef.current = loadSpecificConversation; // Keep ref updated

  useEffect(() => {
    // Only run once when component mounts
    if (urlConversationLoadedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get("conversation");

    if (conversationId && companyId) {
      urlConversationLoadedRef.current = true; // Mark as loaded
      console.log("ðŸ”— [URL] Found conversation ID in URL:", conversationId);
      // Wait a bit for conversations to load first, then load specific conversation
      setTimeout(() => {
        if (loadSpecificConversationRef.current) {
          loadSpecificConversationRef.current(conversationId);
        }
      }, 500);
    }
  }, [companyId]); // Only depend on companyId, not loadSpecificConversation

  useEffect(() => {
    const isPriority = filters.priorityOnly || activeTab === "priority";
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // 🆕 Use database search when search query exists
      if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
        loadConversationsRef.current(
          1,
          false,
          activeTab,
          debouncedSearchQuery.trim(),
          channel,
          isPriority,
        );
      } else {
        loadConversationsRef.current(
          1,
          false,
          activeTab,
          undefined,
          channel,
          isPriority,
        );
      }
      return;
    }

    // 🆕 Use database search when search query exists
    if (debouncedSearchQuery && debouncedSearchQuery.trim()) {
      loadConversationsRef.current(
        1,
        false,
        activeTab,
        debouncedSearchQuery.trim(),
        channel,
        isPriority,
      );
    } else {
      loadConversationsRef.current(
        1,
        false,
        activeTab,
        undefined,
        channel,
        isPriority,
      );
    }
  }, [activeTab, debouncedSearchQuery, filters.priorityOnly]); // 🔧 Trigger search/reload on priority toggle

  // 🔧 OPTIMIZED: Debounce loadConversations to prevent excessive API calls
  // Move this before handlers that use it
  const loadConversationsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadConversationsRefForDebounce = useRef(loadConversations);
  const debouncedSearchQueryRef = useRef(debouncedSearchQuery);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  debouncedSearchQueryRef.current = debouncedSearchQuery; // Keep ref updated
  loadConversationsRefForDebounce.current = loadConversations; // Keep ref updated

  const debouncedLoadConversations = useCallback((tab: InboxTab) => {
    if (loadConversationsTimeoutRef.current) {
      clearTimeout(loadConversationsTimeoutRef.current);
    }
    loadConversationsTimeoutRef.current = setTimeout(() => {
      // 🆕 Use database search when search query exists
      const search = debouncedSearchQueryRef.current?.trim();
      const isPriority = filtersRef.current.priorityOnly || tab === "priority";
      if (search) {
        loadConversationsRefForDebounce.current(1, false, tab, search, channel, isPriority);
      } else {
        loadConversationsRefForDebounce.current(1, false, tab, undefined, channel, isPriority);
      }
      loadConversationsTimeoutRef.current = null;
    }, 500); // Debounce by 500ms to batch multiple updates
  }, [channel]); // 🔧 OPTIMIZED: Empty dependencies, use ref instead

  // Tab counts - OPTIMIZED: Single pass calculation instead of multiple filters
  const tabCounts = useMemo(() => {
    // Use API counts when available (more accurate)
    const counts = {
      all: apiCounts.total || 0,
      unreplied: apiCounts.unreplied || 0,
      done: 0,
      main: 0,
      general: 0,
      requests: 0,
      spam: 0,
      priority: 0,
    };

    // 🔧 OPTIMIZED: Single pass through conversations instead of multiple filters
    if (conversations.length > 0) {
      for (const conv of conversations) {
        if (conv.priority) {
          counts.priority++;
        }
        switch (conv.tab) {
          case "done":
            counts.done++;
            break;
          case "main":
            counts.main++;
            break;
          case "general":
            counts.general++;
            break;
          case "requests":
            counts.requests++;
            break;
          case "spam":
            counts.spam++;
            break;
        }
      }
    }

    // Fallback to conversations.length if API count not available
    if (!apiCounts.total && conversations.length > 0) {
      counts.all = conversations.length;
    }

    return {
      ...counts,
      priority: apiCounts.priority || counts.priority,
    };
  }, [conversations, apiCounts]);

  const priorityCount = tabCounts.priority;

  // ðŸ†• Load all messages for a conversation (for advanced search)
  const loadAllMessagesForConversation = useCallback(
    async (conversationId: string) => {
      // Avoid duplicate loading
      if (loadingMessagesForSearch.has(conversationId)) {
        return;
      }

      // Check if messages are already loaded
      if (conversationMessages.has(conversationId)) {
        const existingMessages = conversationMessages.get(conversationId);
        if (existingMessages && existingMessages.length > 0) {
          return; // Already loaded
        }
      }

      // Check if messages are already loaded for selected conversation
      if (selectedConversation?.id === conversationId && messages.length > 0) {
        // Store messages in conversationMessages map for search (convert to InboxMessage format)
        const inboxMessages: InboxMessage[] = messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderName: msg.senderName,
          timestamp: msg.timestamp,
          type: msg.type as InboxMessage["type"],
          isFromCustomer: msg.isFromCustomer,
          status: msg.status as InboxMessage["status"],
          conversationId: msg.conversationId,
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileSize: msg.fileSize,
          metadata: msg.metadata,
          attachments: msg.attachments,
          isAIResponse: msg.isAIResponse,
        }));
        setConversationMessages((prev) => {
          const newMap = new Map(prev);
          newMap.set(conversationId, inboxMessages);
          return newMap;
        });
        return;
      }

      setLoadingMessagesForSearch((prev) => new Set(prev).add(conversationId));

      try {
        console.log(
          "ðŸ” [SEARCH] Loading all messages for conversation:",
          conversationId,
        );

        let allMessages: InboxMessage[] = [];
        let page = 1;
        let hasMore = true;

        // Load all messages using pagination
        while (hasMore) {
          const response = await apiClient.get(
            `/conversations/${conversationId}/messages`,
            {
              params: {
                page,
                limit: 50,
              },
            },
          );

          const data = (response.data?.data ||
            response.data ||
            []) as InboxApiMessage[];

          if (data.length === 0) {
            hasMore = false;
            break;
          }

          // Parse messages to InboxMessage format
          const parsedMessages: InboxMessage[] = data.map((msg) => ({
            id: msg.id || "",
            content: msg.content || "",
            senderId: msg.senderId || msg.sender?.id || "",
            senderName:
              msg.senderName ||
              msg.sender?.name ||
              (msg.isFromCustomer ? t("facebookInbox.customer") : t("facebookInbox.employee")),
            timestamp: new Date(msg.timestamp || msg.createdAt || Date.now()),
            type: (msg.type || "text") as InboxMessage["type"],
            isFromCustomer: msg.isFromCustomer || false,
            status: (msg.status || "sent") as InboxMessage["status"],
            conversationId: conversationId,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            isAIResponse: msg.isAIResponse || (!msg.isFromCustomer && !msg.senderId),
          }));

          allMessages = [...allMessages, ...parsedMessages];

          // If messages count is less than 50, no more messages
          if (data.length < 50) {
            hasMore = false;
          } else {
            page++;
          }
        }

        console.log(
          `âœ… [SEARCH] Loaded ${allMessages.length} messages for conversation ${conversationId}`,
        );

        // Store messages in conversationMessages map for search
        setConversationMessages((prev) => {
          const newMap = new Map(prev);
          newMap.set(conversationId, allMessages);
          return newMap;
        });
      } catch (error) {
        console.error(
          "âŒ [SEARCH] Error loading all messages for conversation:",
          error,
        );
      } finally {
        setLoadingMessagesForSearch((prev) => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });
      }
    },
    [
      selectedConversation,
      messages,
      loadingMessagesForSearch,
      conversationMessages,
    ],
  );

  // Filtered conversations - using debounced search query with advanced message search
  // ðŸ”§ OPTIMIZED: Removed activeTab from dependencies (not used in filtering)
  const filteredConversations = useMemo(() => {
    const filtered = conversations.filter((conv) => {
      // 1. Tab filter - REMOVED (Server-side filtering now)
      // We assume 'conversations' contains only items for the current tab

      // 2. Search query (using debounced value) - ðŸ†• Advanced: search in messages too
      if (debouncedSearchQuery) {
        const query = debouncedSearchQuery.toLowerCase();
        const matchesName = conv.customerName.toLowerCase().includes(query);
        const matchesMessage = conv.lastMessage.toLowerCase().includes(query);

        // ðŸ†• Advanced: Search in loaded messages (from conversationMessages map or current messages)
        let matchesMessagesContent = false;

        // Check if messages are loaded for this conversation
        const loadedMessages = conversationMessages.get(conv.id);
        if (loadedMessages && loadedMessages.length > 0) {
          matchesMessagesContent = loadedMessages.some((msg) =>
            (msg.content || "").toLowerCase().includes(query),
          );
        } else if (
          selectedConversation?.id === conv.id &&
          messages.length > 0
        ) {
          // Fallback to current messages if conversation is selected
          matchesMessagesContent = messages.some((msg) =>
            (msg.content || "").toLowerCase().includes(query),
          );
        }

        if (!matchesName && !matchesMessage && !matchesMessagesContent)
          return false;
      }

      // 3. Unread filter
      if (filters.unreadOnly && conv.unreadCount === 0) return false;

      // 3.5. Priority filter (⭐)
      if ((filters.priorityOnly || activeTab === "priority") && !conv.priority) return false;

      // 4. Assignment filter
      if (filters.assignedTo === "me" && conv.assignedTo !== user?.id)
        return false;
      if (filters.assignedTo === "unassigned" && conv.assignedTo !== null)
        return false;

      // 5. Date Range
      if (filters.startDate || filters.endDate) {
        const convDate = new Date(conv.lastMessageTime);
        if (filters.startDate && convDate < filters.startDate) return false;
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (convDate > endOfDay) return false;
        }
      }

      return true;
    });
    return filtered;
  }, [
    conversations,
    debouncedSearchQuery,
    filters,
    activeTab,
    user?.id,
    selectedConversation,
    messages,
    conversationMessages,
  ]); // ðŸ”§ Added conversationMessages for advanced search

  // Auto-scroll to bottom
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);
  const oldScrollHeightRef = useRef(0);
  const wasAtBottomRef = useRef(true);

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  }, []);

  // Check if user is at bottom of scroll
  const isAtBottom = useCallback(
    (container: HTMLDivElement, threshold = 100) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      return scrollHeight - scrollTop - clientHeight < threshold;
    },
    [],
  );

  // Track if this is initial load for a conversation
  const isInitialLoadRef = useRef(true);
  const lastConversationIdRef = useRef<string | null>(null);

  // Scroll to bottom when conversation changes or initial load
  useEffect(() => {
    // Detect conversation change
    if (selectedConversation?.id !== lastConversationIdRef.current) {
      isInitialLoadRef.current = true;
      lastConversationIdRef.current = selectedConversation?.id || null;
    }

    if (
      messages.length > 0 &&
      selectedConversation &&
      isInitialLoadRef.current
    ) {
      // Always scroll to bottom when opening a conversation
      // Use multiple timeouts to ensure scroll happens after render
      scrollToBottom(false);
      setTimeout(() => scrollToBottom(false), 50);
      setTimeout(() => scrollToBottom(false), 150);
      setTimeout(() => scrollToBottom(false), 300);
      wasAtBottomRef.current = true;
      isInitialLoadRef.current = false;
    }
  }, [selectedConversation, messages.length, scrollToBottom]);

  // Scroll to bottom on new messages if user was already at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    // If new message was added (length increased) and user was at bottom
    if (
      messages.length > prevMessagesLength.current &&
      wasAtBottomRef.current
    ) {
      setTimeout(() => scrollToBottom(true), 50);
    }

    prevMessagesLength.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Handle scroll events - detect if user is at bottom and load more when scrolling up
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;

      // Check if at bottom
      wasAtBottomRef.current = isAtBottom(container);

      // Load more messages when scrolling to top
      if (container.scrollTop < 200 && hasMore && !loadingMessages) {
        const oldScrollHeight = container.scrollHeight;
        oldScrollHeightRef.current = oldScrollHeight;
        loadMoreMessages();
      }
    },
    [hasMore, loadingMessages, loadMoreMessages, isAtBottom],
  );

  // Restore scroll position after loading older messages
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !oldScrollHeightRef.current) return;

    // If messages increased and we were loading more (old scroll height exists)
    if (
      messages.length > prevMessagesLength.current &&
      prevMessagesLength.current > 0
    ) {
      const newScrollHeight = container.scrollHeight;
      const diff = newScrollHeight - oldScrollHeightRef.current;
      container.scrollTop = diff;
      oldScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  // Send message handlers
  // ðŸ†• Optimistic UI handlers for instant message display
  const handleOptimisticMessage = useCallback(
    (optimisticMsg: InboxMessage) => {
      // Add message immediately to UI
      addMessage(optimisticMsg);
    },
    [addMessage],
  );

  const handleMessageSent = useCallback(
    (_tempId: string, _realMessage: InboxMessage) => {
      // Message sent successfully - socket will handle the update
      // No need to replace since socket event will add the real message
    },
    [],
  );

  const handleMessageError = useCallback((tempId: string, error: string) => {
    // Mark message as failed - could update UI to show error state
    console.error("Message failed:", tempId, error);
  }, []);

  // ðŸ†• Optimistic UI - message appears instantly, sends in background
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!selectedConversation || !companyId) return;

      // Clear reply immediately for better UX
      const currentReplyTo = replyToMessage;
      setReplyToMessage(null);

      // ðŸ†• Update conversation state immediately
      updateSelectedConversation({
        lastMessageIsFromCustomer: false,
        lastMessage:
          content.length > 100 ? content.substring(0, 100) + "..." : content,
        lastMessageTime: new Date(),
      });

      try {
        // ðŸ†• Send with optimistic callbacks - message shows instantly
        await sendTextMessage(
          selectedConversation.id,
          content,
          companyId,
          currentReplyTo,
          handleOptimisticMessage,
          handleMessageSent,
          handleMessageError,
        );

        // ðŸ”§ OPTIMIZED: Don't reload messages if socket will handle it
        if (!isConnected) {
          loadMessages(selectedConversation.id);
        }

        // ðŸ†• If in unreplied tab, reload conversations to get fresh data
        if (activeTab === "unreplied") {
          debouncedLoadConversations("unreplied");
        }
      } catch (error) {
        // Error already handled by handleMessageError
        console.error("ÙØ´Ù„ ÙÙŠ Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ø³Ø§Ù„Ø©:", error);
      }
    },
    [
      selectedConversation,
      companyId,
      sendTextMessage,
      loadMessages,
      replyToMessage,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      handleOptimisticMessage,
      handleMessageSent,
      handleMessageError,
    ],
  );

  const handleSendFile = useCallback(
    async (file: File) => {
      if (!selectedConversation || !companyId) return;
      try {
        await sendFileMessage(selectedConversation.id, file, companyId);

        // ðŸ†• Update conversation state - message is now from us (not customer)
        updateSelectedConversation({
          lastMessageIsFromCustomer: false,
          lastMessage: `ðŸ“Ž ${file.name}`,
          lastMessageTime: new Date(),
        });

        // ðŸ”§ OPTIMIZED: Don't reload messages if socket will handle it
        if (!isConnected) {
          loadMessages(selectedConversation.id);
        }

        // ðŸ†• If in unreplied tab, reload conversations to get fresh data
        if (activeTab === "unreplied") {
          debouncedLoadConversations("unreplied");
        }
      } catch (error) {
        alert(t("conversations.fileSendFailed"));
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

  // Handle text selection from gallery
  const handleSelectTextFromGallery = useCallback(
    async (text: { content: string; imageUrls?: string[] }) => {
      if (!selectedConversation || !companyId) return;

      setShowTextGallery(false);

      try {
        const messageContent = text.content?.trim() || "";
        const imageUrls = text.imageUrls || [];

        // If only text, send it normally
        if (messageContent && imageUrls.length === 0) {
          await sendTextMessage(
            selectedConversation.id,
            messageContent,
            companyId,
            replyToMessage,
            handleOptimisticMessage,
            handleMessageSent,
            handleMessageError,
          );
          updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage: messageContent,
            lastMessageTime: new Date(),
          });
          if (!isConnected) {
            loadMessages(selectedConversation.id);
          }
          if (activeTab === "unreplied") {
            debouncedLoadConversations("unreplied");
          }
          return;
        }

        // Send text first if exists
        if (messageContent) {
          await sendTextMessage(
            selectedConversation.id,
            messageContent,
            companyId,
            replyToMessage,
            handleOptimisticMessage,
            handleMessageSent,
            handleMessageError,
          );
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Send images
        if (imageUrls.length > 0) {
          let successCount = 0;
          for (const imageUrl of imageUrls) {
            try {
              const urlParts = imageUrl.split("/");
              const filename = urlParts[urlParts.length - 1] || "image.jpg";

              await apiClient.post(
                `/conversations/${selectedConversation.id}/send-existing-image`,
                {
                  imageUrl,
                  filename,
                },
              );
              successCount++;

              if (successCount < imageUrls.length) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              }
            } catch (error) {
              console.error("Error sending image:", error);
            }
          }
        }

        // Update state
        updateSelectedConversation({
          lastMessageIsFromCustomer: false,
          lastMessage: messageContent || t("facebookInbox.photo"),
          lastMessageTime: new Date(),
        });

        // 🔧 OPTIMIZED: Don't reload messages if socket will handle it
        if (!isConnected) {
          setTimeout(() => {
            loadMessages(selectedConversation.id);
          }, 500);
        }

        // Reload conversations if in unreplied tab
        if (activeTab === "unreplied") {
          debouncedLoadConversations("unreplied");
        }
      } catch (error) {
        console.error("Error sending from text gallery:", error);
        alert(t("conversations.textSendFailed"));
      }
    },
    [
      selectedConversation,
      companyId,
      sendTextMessage,
      replyToMessage,
      handleOptimisticMessage,
      handleMessageSent,
      handleMessageError,
      loadMessages,
      updateSelectedConversation,
      activeTab,
      isConnected,
      debouncedLoadConversations,
      t,
    ],
  );

  // Handle direct quick reply send (including images if attached)
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

  // Handle single image selection from gallery
  const handleSelectImageFromGallery = useCallback(
    async (imageUrl: string, filename: string) => {
      if (!selectedConversation || !companyId) return;

      setShowImageGallery(false);

      try {
        await apiClient.post(
          `/conversations/${selectedConversation.id}/send-existing-image`,
          {
            imageUrl,
            filename,
          },
        );

        updateSelectedConversation({
          lastMessageIsFromCustomer: false,
          lastMessage: t("facebookInbox.photo"),
          lastMessageTime: new Date(),
        });

        if (!isConnected) {
          setTimeout(() => {
            loadMessages(selectedConversation.id);
          }, 500);
        }

        if (activeTab === "unreplied") {
          debouncedLoadConversations("unreplied");
        }
      } catch (error) {
        console.error("Error sending image from gallery:", error);
        alert(t("conversations.imageSendFailed"));
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
    ],
  );

  // Handle multiple images selection from gallery
  const handleSelectMultipleImagesFromGallery = useCallback(
    async (images: Array<{ url: string; filename: string }>) => {
      if (!selectedConversation || !companyId || images.length === 0) return;

      setShowImageGallery(false);

      try {
        let successCount = 0;
        for (const image of images) {
          try {
            await apiClient.post(
              `/conversations/${selectedConversation.id}/send-existing-image`,
              {
                imageUrl: image.url,
                filename: image.filename,
              },
            );
            successCount++;

            if (successCount < images.length) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.error("Error sending image:", error);
          }
        }

        if (successCount > 0) {
          updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage: t("facebookInbox.photos", { count: successCount }),
            lastMessageTime: new Date(),
          });

          if (!isConnected) {
            setTimeout(() => {
              loadMessages(selectedConversation.id);
            }, 500);
          }

          if (activeTab === "unreplied") {
            debouncedLoadConversations("unreplied");
          }

          if (successCount < images.length) {
            alert(t("conversations.imagesPartialSend", { success: successCount, total: images.length }));
          }
        } else {
          alert(t("conversations.imagesSendFailed"));
        }
      } catch (error) {
        console.error("Error sending images from gallery:", error);
        alert(t("conversations.imagesSendFailed"));
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
    ],
  );

  // ðŸ†• Handle sending product images as a message
  const handleSendProductImages = useCallback(
    async (
      product: { id: string; name: string; price: number | string },
      images: Array<{ url: string; filename: string }>,
      includeDetails: boolean,
    ) => {
      if (!selectedConversation || !companyId || images.length === 0) return;

      setShowProductPicker(false);

      try {
        // Send product name & price text first if requested
        if (includeDetails) {
          const detailText = `${product.name}\nØ§Ù„Ø³Ø¹Ø±: ${product.price} Ø¬.Ù…`;
          await sendTextMessage(
            selectedConversation.id,
            detailText,
            companyId,
          );
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Send images
        let successCount = 0;
        for (const image of images) {
          try {
            await apiClient.post(
              `/conversations/${selectedConversation.id}/send-existing-image`,
              {
                imageUrl: image.url,
                filename: image.filename,
              },
            );
            successCount++;

            if (successCount < images.length) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          } catch (error) {
            console.error("Error sending product image:", error);
          }
        }

        if (successCount > 0) {
          updateSelectedConversation({
            lastMessageIsFromCustomer: false,
            lastMessage:
              includeDetails
                ? product.name
                : t("facebookInbox.photos", { count: successCount }),
            lastMessageTime: new Date(),
          });

          if (!isConnected) {
            setTimeout(() => {
              loadMessages(selectedConversation.id);
            }, 500);
          }

          if (activeTab === "unreplied") {
            debouncedLoadConversations("unreplied");
          }

          if (successCount < images.length) {
            alert(t("conversations.imagesPartialSend", { success: successCount, total: images.length }));
          }
        } else {
          alert(t("conversations.imagesSendFailed"));
        }
      } catch (error) {
        console.error("Error sending product images:", error);
        alert(t("conversations.imagesSendFailed"));
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
      t,
    ],
  );

  // Bulk Action Handlers
  const handleBulkMarkDone = useCallback(async () => {
    if (!companyId || selectedIds.size === 0) return;
    if (!window.confirm(t("conversations.bulkMarkDoneConfirm", { count: selectedIds.size })))
      return;

    try {
      await bulkUpdate(Array.from(selectedIds), "mark_done", null, companyId);
      debouncedLoadConversations(activeTab);
      clearSelection();
      alert(t("conversations.endConversationsSuccess"));
    } catch (error) {
      alert(t("conversations.operationFailed"));
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

  const handleBulkAssign = useCallback(() => {
    // TODO: Show assignment modal
    alert(t("conversations.employeePickerComing"));
  }, [t]);

  const handleBulkTags = useCallback(() => {
    // TODO: Show tags modal
    alert(t("conversations.categoryPickerComing"));
  }, [t]);

  // Action handlers
  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!selectedConversation || !companyId) return;
      try {
        await updateStatus(selectedConversation.id, status, companyId);
        debouncedLoadConversations(activeTab);
      } catch (error) {
        console.error("ÙØ´Ù„ ÙÙŠ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©:", error);
      }
    },
    [
      selectedConversation,
      companyId,
      updateStatus,
      activeTab,
      debouncedLoadConversations,
    ],
  );

  const handleAssignment = useCallback(
    async (userId: string | null) => {
      if (!selectedConversation || !companyId) return;
      try {
        await assignConversation(selectedConversation.id, userId, companyId);
        debouncedLoadConversations(activeTab);
      } catch (error) {
        console.error("ÙØ´Ù„ ÙÙŠ ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©:", error);
      }
    },
    [
      selectedConversation,
      companyId,
      assignConversation,
      activeTab,
      debouncedLoadConversations,
    ],
  );

  const handleMarkDone = useCallback(async () => {
    if (!selectedConversation || !companyId) return;
    try {
      await markAsDone(selectedConversation.id, companyId);
      debouncedLoadConversations(activeTab);
    } catch (error) {
      console.error("ÙØ´Ù„ ÙÙŠ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©:", error);
    }
  }, [
    selectedConversation,
    companyId,
    markAsDone,
    activeTab,
    debouncedLoadConversations,
  ]);

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
      console.error("ÙØ´Ù„ ÙÙŠ ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø£ÙˆÙ„ÙˆÙŠØ©:", error);
    }
  }, [
    selectedConversation,
    companyId,
    togglePriority,
    activeTab,
    debouncedLoadConversations,
  ]);

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

    // Optimistic update for zero-latency UI response
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
          ? t("facebookInbox.aiEnabledSuccess", "تم تشغيل الرد الآلي للذكاء الاصطناعي لهذه المحادثة")
          : t("facebookInbox.aiDisabledSuccess", "تم إيقاف الذكاء الاصطناعي عن هذه المحادثة (التحكم يدوي)"),
      );
    } catch (err) {
      console.error("Failed to toggle AI status:", err);
      toast.error(t("facebookInbox.aiToggleFailed", "تعذر تغيير حالة الذكاء الاصطناعي"));
      // Revert on error
      updateConversationInList(selectedConversation.id, {
        aiEnabled: !nextAiEnabled,
        aiPausedUntil: selectedConversation.aiPausedUntil,
      });
    }
  }, [selectedConversation, updateConversationInList, t]);

  // Tags handler
  const handleTagsChange = useCallback(
    async (tags: string[]) => {
      if (!selectedConversation || !companyId) return;
      try {
        await addTags(selectedConversation.id, tags, companyId);
        debouncedLoadConversations(activeTab);
      } catch (error) {
        console.error("ÙØ´Ù„ ÙÙŠ ØªØ­Ø¯ÙŠØ« Ø§Ù„ØªØµÙ†ÙŠÙØ§Øª:", error);
      }
    },
    [
      selectedConversation,
      companyId,
      addTags,
      activeTab,
      debouncedLoadConversations,
    ],
  );

  // Delete message handler
  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation || !companyId) return;

    const confirmed = window.confirm(
      t("conversations.deleteConversationConfirm", { name: selectedConversation.customerName }),
    );

    if (!confirmed) return;

    try {
      await deleteConversation(selectedConversation.id, companyId);
      await selectConversation(null);
      clearConversationUrlParam();
      clearSelection();
      await loadConversations(
        1,
        false,
        activeTab,
        debouncedSearchQuery.trim() || undefined,
        channel,
        filtersRef.current.priorityOnly,
      );
      alert(t("conversations.deleteConversationSuccess"));
    } catch (error) {
      console.error("ÙØ´Ù„ ÙÙŠ Ø­Ø°Ù Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø©:", error);
      alert(t("conversations.deleteConversationFailed"));
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
    t,
  ]);

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedConversation) return;
      if (!window.confirm(t("conversations.deleteMessageConfirm"))) return;

      try {
        await deleteMessage(selectedConversation.id, messageId);
        removeMessage(messageId);
      } catch (error) {
        alert(t("conversations.deleteMessageFailed"));
      }
    },
    [selectedConversation, deleteMessage, removeMessage, t],
  );

  // Forward message request handler
  const handleForwardRequest = useCallback((message: InboxMessage) => {
    setMessageToForward(message);
    setForwardModalOpen(true);
  }, []);

  // Execute forward handler
  const handleForward = useCallback(
    async (targetConversationId: string) => {
      if (!messageToForward || !companyId) return;

      try {
        await forwardMessage(targetConversationId, messageToForward, companyId);
        alert(t("conversations.forwardMessageSuccess"));
        // Optional: Move to the target conversation
        // selectConversation(conversations.find(c => c.id === targetConversationId));
      } catch (error) {
        alert(t("conversations.forwardMessageFailed"));
      }
    },
    [messageToForward, companyId, forwardMessage, t],
  );

  // Star message handler - Optimistic in-place update without reloading or resetting scroll position
  const handleStarMessage = useCallback(
    async (messageId: string) => {
      if (!selectedConversation) return;
      let previousMessage: InboxMessage | undefined;

      updateMessage(messageId, (prevMsg) => {
        previousMessage = prevMsg;
        const prevMetadata =
          prevMsg.metadata && typeof prevMsg.metadata === "object"
            ? { ...prevMsg.metadata }
            : {};
        const isStarred = !prevMsg.isStarred && !prevMetadata.isStarred;
        return {
          ...prevMsg,
          isStarred,
          metadata: {
            ...prevMetadata,
            isStarred,
          },
        };
      });

      try {
        const isStarred = await toggleMessageStar(
          selectedConversation.id,
          messageId,
        );
        updateMessage(messageId, (prevMsg) => {
          const currentMeta =
            prevMsg.metadata && typeof prevMsg.metadata === "object"
              ? { ...prevMsg.metadata }
              : {};
          return {
            ...prevMsg,
            isStarred: !!isStarred,
            metadata: {
              ...currentMeta,
              isStarred: !!isStarred,
            },
          };
        });
      } catch (error) {
        console.error("Failed to star message", error);
        if (previousMessage) {
          updateMessage(messageId, () => previousMessage!);
        }
      }
    },
    [selectedConversation, toggleMessageStar, updateMessage],
  );

  // Reaction handler - Optimistic in-place update without reloading or resetting scroll position
  const handleMessageReaction = useCallback(
    async (messageId: string, reaction: string) => {
      if (!selectedConversation) return;

      const currentUserId = user?.id || "me";
      let previousMessage: InboxMessage | undefined;

      // 1. Instant optimistic update
      updateMessage(messageId, (prevMsg) => {
        previousMessage = prevMsg;
        const prevMetadata =
          prevMsg.metadata && typeof prevMsg.metadata === "object"
            ? { ...prevMsg.metadata }
            : {};
        const prevReactions =
          prevMetadata.reactions && typeof prevMetadata.reactions === "object"
            ? { ...prevMetadata.reactions }
            : {};

        const existingReaction =
          prevReactions[currentUserId] || prevMetadata.myReaction;

        if (existingReaction === reaction) {
          delete prevReactions[currentUserId];
          delete prevMetadata.myReaction;
        } else {
          prevReactions[currentUserId] = reaction;
          prevMetadata.myReaction = reaction;
        }

        prevMetadata.reactions = prevReactions;

        return {
          ...prevMsg,
          metadata: prevMetadata,
        };
      });

      // 2. Request backend in background (NO loadMessages call!)
      try {
        const res = await toggleMessageReaction(
          selectedConversation.id,
          messageId,
          reaction,
        );
        if (res?.data?.reactions) {
          updateMessage(messageId, (prevMsg) => {
            const currentMeta =
              prevMsg.metadata && typeof prevMsg.metadata === "object"
                ? { ...prevMsg.metadata }
                : {};
            const serverReactions = res.data.reactions;
            return {
              ...prevMsg,
              metadata: {
                ...currentMeta,
                reactions: serverReactions,
                myReaction: serverReactions[currentUserId] || undefined,
              },
            };
          });
        }
      } catch (error) {
        console.error("Failed to update reaction", error);
        if (previousMessage) {
          updateMessage(messageId, () => previousMessage!);
        }
        toast.error(t("conversations.reactionFailed", "فشل في تحديث التفاعل"));
      }
    },
    [selectedConversation, user?.id, toggleMessageReaction, updateMessage, t],
  );

  // Reply handler
  const handleReplyToMessage = useCallback((message: InboxMessage) => {
    setReplyToMessage(message);
    // Focus input?
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  // Snooze handler
  const handleSnoozeConfirm = useCallback(
    async (until: Date) => {
      if (!selectedConversation || !companyId) return;
      try {
        await snoozeConversation(selectedConversation.id, until, companyId);
        setSnoozeModalOpen(false);
        debouncedLoadConversations(activeTab);
        toast.success(t("conversations.snoozeConversationSuccess"));
      } catch (error) {
        toast.error(t("conversations.snoozeConversationFailed"));
      }
    },
    [
      selectedConversation,
      companyId,
      snoozeConversation,
      activeTab,
      debouncedLoadConversations,
      t,
    ],
  );

  // ðŸ†• Sound & Notifications Functions (defined before Socket.IO useEffect)
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
        icon: icon || "/favicon.ico",
        tag: "new-message",
        requireInteraction: false,
        silent: false,
      };

      const wasShown = showNativeBrowserNotification(notificationOptions);
      if (wasShown) {
        return;
      }

      if ("Notification" in window && Notification.permission !== "denied") {
        void requestBrowserNotificationPermission().then((permission) => {
          if (permission === "granted") {
            showNativeBrowserNotification(notificationOptions);
          }
        });
      }
    },
    [notificationsEnabled],
  );

  // Socket.IO
  // ðŸ”§ FIX: Use ref to track activeTab for socket handler to avoid stale closure
  const activeTabRef = useRef<InboxTab>(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (data: SocketInboxMessage) => {
      // ðŸ”§ Only handle messages for this inbox's channel (prevents cross-channel leakage)
      if (data.channel && data.channel !== channel) return;
      if (
        selectedConversation &&
        data.conversationId === selectedConversation.id
      ) {
        addMessage(data);
      }

      // ðŸ†• Play sound and show notification for customer messages
      if (data.isFromCustomer) {
        playNotificationSound();
        if (
          selectedConversation &&
          data.conversationId === selectedConversation.id
        ) {
          // Don't show notification if conversation is already open
        } else {
          showBrowserNotification(
            t("conversations.newMessageFrom", { name: data.customerName || t("conversations.customer") }),
            data.content?.substring(0, 50) || t("conversations.newMessage"),
          );
        }
      }

      // ðŸ”§ OPTIMIZED: Use debounced loadConversations to prevent excessive API calls
      debouncedLoadConversations(activeTabRef.current);
    };

    socket.on("new_message", handleNewMessage);

    // ðŸ†• Handle read receipts - update message status to 'read'
    const handleMessagesRead = (data: {
      conversationId: string;
      watermark: number;
    }) => {
      if (selectedConversation?.id === data.conversationId) {
        // Update all messages sent before watermark to 'read' status
        markMessagesAsRead(data.watermark);
        console.log(
          "ðŸ‘ï¸ [READ-RECEIPT] Messages marked as read up to:",
          new Date(data.watermark),
        );
      }
    };

    socket.on("messages_read", handleMessagesRead);

    // Real-time message reaction updates from other clients/agents
    const handleReactionUpdated = (data: {
      conversationId: string;
      messageId: string;
      reactions: Record<string, string>;
      userId?: string;
    }) => {
      if (selectedConversation?.id === data.conversationId) {
        updateMessage(data.messageId, (prevMsg) => {
          const prevMeta =
            prevMsg.metadata && typeof prevMsg.metadata === "object"
              ? { ...prevMsg.metadata }
              : {};
          const currentUserId = user?.id || user?.userId;
          return {
            ...prevMsg,
            metadata: {
              ...prevMeta,
              reactions: data.reactions,
              myReaction:
                (currentUserId && data.reactions?.[currentUserId]) ||
                prevMeta.myReaction,
            },
          };
        });
      }
    };

    socket.on("message_reaction_updated", handleReactionUpdated);

    // Real-time AI status updates (manual toggle or human handover pause)
    const handleAiStatusChanged = (data: {
      conversationId: string;
      channel?: string;
      aiEnabled: boolean;
      aiPausedUntil?: string | null;
    }) => {
      if (data?.conversationId) {
        updateConversationInList(data.conversationId, {
          aiEnabled: data.aiEnabled,
          aiPausedUntil: data.aiPausedUntil ?? (data.aiEnabled ? null : undefined),
        });
      }
    };

    socket.on("conversation:ai_status_changed", handleAiStatusChanged);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("messages_read", handleMessagesRead);
      socket.off("message_reaction_updated", handleReactionUpdated);
      socket.off("conversation:ai_status_changed", handleAiStatusChanged);
      if (loadConversationsTimeoutRef.current)
        clearTimeout(loadConversationsTimeoutRef.current);
    };
  }, [
    socket,
    isConnected,
    selectedConversation,
    addMessage,
    updateMessage,
    updateConversationInList,
    user?.id,
    user?.userId,
    debouncedLoadConversations,
    playNotificationSound,
    showBrowserNotification,
    markMessagesAsRead,
  ]);

  // Fetch post details when conversation is selected
  const fetchPostDetails = useCallback(
    async (conversationId: string) => {
      try {
        const response = await apiClient.get(
          `/conversations/${conversationId}/post-details`,
        );

        if (response.data?.success && response.data?.data) {
          const postDetails = response.data.data;

          // Update selectedConversation with post details
          updateSelectedConversation({
            postDetails,
            postDetailsUnavailable: false,
          });
          return;
        }

        if (response.data?.success && response.data?.unavailable) {
          updateSelectedConversation({
            postDetails: null,
            postDetailsUnavailable: true,
          });
        }
      } catch (error: unknown) {
        // Silently fail if 404 (post details not found) - it's optional
        const status = getApiError(error).response?.status;
        if (status === 404 || status === 400) {
          updateSelectedConversation({
            postDetails: null,
            postDetailsUnavailable: true,
          });
          return;
        }

        if (status !== 404) {
          console.error("Error fetching post details:", error);
        }
      }
    },
    [updateSelectedConversation],
  );

  // Fetch post details when conversation with postId is selected
  useEffect(() => {
    if (
      selectedConversation?.postId &&
      !selectedConversation?.postDetails &&
      !selectedConversation?.postDetailsUnavailable
    ) {
      fetchPostDetails(selectedConversation.id);
    }
  }, [
    selectedConversation?.id,
    selectedConversation?.postId,
    selectedConversation?.postDetails,
    selectedConversation?.postDetailsUnavailable,
    fetchPostDetails,
  ]);

  // ðŸ†• Load messages for search when search query changes
  useEffect(() => {
    if (!debouncedSearchQuery || debouncedSearchQuery.trim() === "") {
      return;
    }

    const searchLower = debouncedSearchQuery.toLowerCase().trim();

    // Find conversations that match search in name or last message
    const matchingConversations = conversations.filter((conv) => {
      const matchesName = conv.customerName.toLowerCase().includes(searchLower);
      const matchesMessage = conv.lastMessage
        .toLowerCase()
        .includes(searchLower);
      return matchesName || matchesMessage;
    });

    // Load messages for matching conversations that don't have messages loaded yet
    matchingConversations.forEach((conv) => {
      // Check if messages are already loaded
      if (!conversationMessages.has(conv.id)) {
        // Also check if it's the selected conversation with messages
        if (selectedConversation?.id === conv.id && messages.length > 0) {
          // Store current messages (convert to InboxMessage format)
          const inboxMessages: InboxMessage[] = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.senderName,
            timestamp: msg.timestamp,
            type: msg.type as InboxMessage["type"],
            isFromCustomer: msg.isFromCustomer,
            status: msg.status as InboxMessage["status"],
            conversationId: msg.conversationId,
            fileUrl: msg.fileUrl,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            metadata: msg.metadata,
            attachments: msg.attachments,
            isAIResponse: msg.isAIResponse,
          }));
          setConversationMessages((prev) => {
            const newMap = new Map(prev);
            newMap.set(conv.id, inboxMessages);
            return newMap;
          });
        } else {
          // Load messages for this conversation
          loadAllMessagesForConversation(conv.id);
        }
      }
    });
  }, [
    debouncedSearchQuery,
    conversations,
    conversationMessages,
    selectedConversation,
    messages,
    loadAllMessagesForConversation,
  ]);

  // ðŸ†• Block Customer Functions
  const checkBlockStatus = useCallback(async () => {
    if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
      setIsBlocked(false);
      return;
    }

    try {
      setCheckingBlockStatus(true);
      const status = await apiService.checkCustomerBlockStatus(
        selectedConversation.customerId,
        selectedConversation.pageId,
      );
      setIsBlocked(status.isBlocked);
    } catch (error) {
      console.error("Error checking block status:", error);
      setIsBlocked(false);
    } finally {
      setCheckingBlockStatus(false);
    }
  }, [selectedConversation?.pageId, selectedConversation?.customerId]);

  const handleBlockCustomer = useCallback(async () => {
    if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
      alert(t("conversations.pageOrCustomerUnavailable"));
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
      setBlockReason("");
      alert(t("conversations.blockCustomerSuccess"));
    } catch (error: unknown) {
      alert(getApiError(error).message || t("conversations.blockCustomerFailed"));
    } finally {
      setBlocking(false);
    }
  }, [
    selectedConversation?.pageId,
    selectedConversation?.customerId,
    blockReason,
    t,
  ]);

  const handleUnblockCustomer = useCallback(async () => {
    if (!selectedConversation?.pageId || !selectedConversation?.customerId) {
      alert(t("conversations.pageOrCustomerUnavailable"));
      return;
    }

    if (!window.confirm(t("conversations.unblockConfirmMessage"))) {
      return;
    }

    try {
      setBlocking(true);
      await apiService.unblockCustomerOnPage(
        selectedConversation.customerId,
        selectedConversation.pageId,
      );
      setIsBlocked(false);
      alert(t("conversations.unblockCustomerSuccess"));
    } catch (error: unknown) {
      alert(getApiError(error).message || t("conversations.unblockCustomerFailed"));
    } finally {
      setBlocking(false);
    }
  }, [selectedConversation?.pageId, selectedConversation?.customerId, t]);

  // Check block status when conversation changes
  useEffect(() => {
    if (selectedConversation?.pageId && selectedConversation?.customerId) {
      checkBlockStatus();
    } else {
      setIsBlocked(false);
    }
  }, [
    selectedConversation?.id,
    selectedConversation?.pageId,
    selectedConversation?.customerId,
    checkBlockStatus,
  ]);

  // Calculate which customer messages have been replied to - OPTIMIZED VERSION
  const repliedMessages = useMemo((): Set<string> => {
    const repliedSet = new Set<string>();
    if (messages.length === 0) return repliedSet;

    // ðŸ”§ OPTIMIZED: Single pass algorithm - more efficient than nested loops
    // Sort messages by timestamp once
    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    // Track the last reply timestamp
    let lastReplyTime = 0;

    // Single pass: iterate backwards to mark all customer messages before a reply
    for (let i = sortedMessages.length - 1; i >= 0; i--) {
      const msg = sortedMessages[i];
      if (!msg) continue; // Safety check

      const msgTime = new Date(msg.timestamp).getTime();

      if (!msg.isFromCustomer) {
        // Found a reply - update last reply time
        lastReplyTime = Math.max(lastReplyTime, msgTime);
      } else if (lastReplyTime > 0 && msgTime < lastReplyTime) {
        // This customer message is before the last reply, so it's been replied to
        repliedSet.add(msg.id);
      }
    }

    return repliedSet;
  }, [messages]);

  const messagesById = useMemo(() => {
    const map = new Map<string, InboxMessage>();
    messages.forEach((msg) => map.set(msg.id, msg));
    return map;
  }, [messages]);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`inbox-message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-primary", "rounded-2xl", "transition-all", "duration-500");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary");
      }, 2500);
    }
  }, []);

  // إزالة padding و overflow من parent main element في Layout
  useEffect(() => {
    const mainElement = document.querySelector("main");
    if (mainElement) {
      // حفظ الـ classes الأصلية
      const originalClasses = mainElement.className;
      // إزالة padding و overflow وإضافة overflow-hidden و h-full
      mainElement.classList.remove("p-4", "p-6", "overflow-y-auto");
      mainElement.classList.add("p-0", "overflow-hidden", "flex-1", "h-full", "max-h-full");

      return () => {
        // استعادة الـ classes الأصلية عند إغلاق الصفحة
        mainElement.className = originalClasses;
      };
    }

    // New apps layout (no <main>, uses app-shell-content instead)
    const appContent = document.querySelector(".app-shell-content") as HTMLElement | null;
    if (appContent) {
      const origContentOverflow = appContent.style.overflow;
      appContent.style.overflow = "hidden";

      // Also constrain the intermediate wrapper (motion-safe:animate-fade-in)
      const inboxShell = appContent.querySelector(".business-inbox-shell");
      if (inboxShell && inboxShell.parentElement) {
        const wrapper = inboxShell.parentElement;
        wrapper.classList.add("h-full", "flex-1", "flex", "flex-col", "min-h-0");
      }

      return () => {
        appContent.style.overflow = origContentOverflow || "";
      };
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    if (selectedConversation) {
      document.body.classList.add("app-shell-chat-active");
      document.body.classList.add("wa-mobile-chat-active");
      document.documentElement.classList.add("app-shell-chat-active");
    } else {
      document.body.classList.remove("app-shell-chat-active");
      document.body.classList.remove("wa-mobile-chat-active");
      document.documentElement.classList.remove("app-shell-chat-active");
    }

    return () => {
      document.body.classList.remove("app-shell-chat-active");
      document.body.classList.remove("wa-mobile-chat-active");
      document.documentElement.classList.remove("app-shell-chat-active");
    };
  }, [selectedConversation]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateViewportMode = () => {
      setIsMobileViewport(window.innerWidth < 768);
      setIsWideDesktop(window.innerWidth >= 1280);
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);

    return () => {
      window.removeEventListener("resize", updateViewportMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(
        FACEBOOK_INBOX_PROFILE_COLUMN_STORAGE_KEY,
        showDesktopContextColumn ? "true" : "false",
      );
    } catch {
      // Ignore storage failures so the inbox stays usable in restricted modes.
    }
  }, [showDesktopContextColumn]);

  useEffect(() => {
    if (selectedConversation && window.innerWidth < 768) {
      setShowSidebar(false);
    }

    if (!selectedConversation) {
      setShowProfilePanel(false);
      setShowNotes(false);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (!selectedConversation || !isMobileViewport) {
      setShowMobileActionMenu(false);
    }
    if (!selectedConversation) {
      setShowDesktopMoreMenu(false);
    }
  }, [isMobileViewport, selectedConversation]);

  const showPinnedContextPanel = Boolean(
    selectedConversation && isWideDesktop && showDesktopContextColumn,
  );
  const shouldCollapseActions = !isWideDesktop || showPinnedContextPanel;
  const showProfileOverlay = Boolean(
    selectedConversation && showProfilePanel && !isWideDesktop,
  );
  const showNotesOverlay = Boolean(
    selectedConversation && showNotes && !isWideDesktop,
  );
  const isProfilePanelActive = isWideDesktop
    ? Boolean(showPinnedContextPanel && !showNotes)
    : showProfilePanel;
  const profilePanelToggleTitle = isWideDesktop
    ? isProfilePanelActive
      ? t("facebookInbox.hideCustomerData")
      : t("facebookInbox.showCustomerData")
    : t("facebookInbox.customerData");

  const handleBackToConversationList = useCallback(() => {
    setShowSidebar(true);
    setShowProfilePanel(false);
    setShowNotes(false);
    setShowMobileActionMenu(false);
    selectConversation(null);
  }, [selectConversation]);

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
          console.error("Failed to copy link:", err);
          alert(`${t("inbox.conversationLink")}:\n${conversationLink}`);
        });
    },
    [t],
  );

  const handleOpenProfilePanel = useCallback(() => {
    setShowMobileActionMenu(false);

    if (isWideDesktop) {
      setShowProfilePanel(true);

      if (!showDesktopContextColumn || showNotes) {
        setShowDesktopContextColumn(true);
        setShowNotes(false);
        return;
      }

      setShowDesktopContextColumn(false);
      return;
    }

    setShowProfilePanel((current) => {
      const next = !current;
      if (next) {
        setShowNotes(false);
      }
      return next;
    });
  }, [isWideDesktop, showDesktopContextColumn, showNotes]);

  const handleToggleNotesPanel = useCallback(() => {
    setShowMobileActionMenu(false);

    if (isWideDesktop) {
      setShowDesktopContextColumn(true);
      setShowNotes((current) => !current);
      setShowProfilePanel(true);
      return;
    }

    setShowNotes((current) => {
      const next = !current;
      if (next) {
        setShowProfilePanel(false);
      }
      return next;
    });
  }, [isWideDesktop]);

  return (
    <div
      className={`business-inbox-shell h-full w-full flex flex-col flex-1 min-h-0 overflow-hidden${selectedConversation ? " business-inbox-shell--conversation-active" : ""}`}
    >
      <div className={selectedConversation ? "hidden md:block" : ""}>
        <InboxTabs
          activeTab={activeTab}
          onTabChange={(newTab) => {
            setActiveTab(newTab);
          }}
          counts={tabCounts}
          onSearch={setSearchQuery}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onShowStats={() => setShowStats(true)}
          isPriorityOnly={!!filters.priorityOnly}
          onTogglePriority={() =>
            setFilters((prev) => ({
              ...prev,
              priorityOnly: !prev.priorityOnly,
            }))
          }
          priorityCount={priorityCount}
        />
      </div>

      <StatsDashboard
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        conversations={conversations}
      />

      <ForwardModal
        isOpen={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        onForward={handleForward}
        conversations={conversations}
      />

      <SnoozeModal
        isOpen={snoozeModalOpen}
        onClose={() => setSnoozeModalOpen(false)}
        onSnooze={handleSnoozeConfirm}
      />

      <div
        className="business-inbox-stage flex-1 h-full min-h-0 relative overflow-hidden flex flex-col md:flex-row"
        style={{ height: "100%", minHeight: 0, flex: "1 1 0%" }}
      >
        {/* Notes Panel Overlay */}
        {showNotesOverlay && (
          <>
            <div
              className="absolute inset-0 z-20 bg-black/10 backdrop-blur-[1px]"
              onClick={() => setShowNotes(false)}
            />
            <div className="absolute inset-y-0 right-0 z-30 w-[85%] sm:max-w-[20rem]">
              <NotesPanel
                className="h-full w-full shadow-2xl"
                customerId={selectedConversation!.customerId}
                isOpen={showNotes}
                onClose={() => setShowNotes(false)}
              />
            </div>
          </>
        )}

{/* Left: Conversations */}
        <div
          className={`
                    ${showSidebar ? "translate-x-0" : "-translate-x-full"}
                    md:translate-x-0
                    absolute md:relative
                    inset-y-0 left-0
                    w-full sm:w-80 md:w-72 lg:w-80
                    z-30
                    business-inbox-column business-inbox-column--list flex flex-col
                    transition-transform duration-300 ease-in-out
                `}
        >
          {/* Bulk Actions Bar Overlay */}
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onClearSelection={clearSelection}
            onMarkAsDone={handleBulkMarkDone}
            onAssign={handleBulkAssign}
            onAddTags={handleBulkTags}
          />

          <FilterPanel
            isOpen={showFilters}
            filters={filters}
            onFilterChange={setFilters}
            onClose={() => setShowFilters(false)}
            onReset={() =>
              setFilters({
                unreadOnly: false,
                assignedTo: "all",
                startDate: null,
                endDate: null,
                priorityOnly: false,
              })
            }
          />

          {/* Quick Filters Bar (برا ف المحادثات) */}
          <div className="px-3 py-2 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-white/[0.03]">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">

              {/* زر فلتر غير مقروءة السريع */}
              <button
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    unreadOnly: !prev.unreadOnly,
                  }))
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 select-none shadow-sm flex-shrink-0 ${
                  filters.unreadOnly
                    ? "bg-blue-600 text-white shadow-blue-500/25 ring-2 ring-blue-400/50"
                    : "bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/15 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 hover:border-blue-300"
                }`}
                title={filters.unreadOnly ? "إلغاء فلتر غير المقروءة" : "إظهار الرسائل غير المقروءة فقط"}
              >
                <span className="w-2 h-2 rounded-full bg-current"></span>
                <span>غير مقروءة</span>
              </button>
            </div>

            {/* Reset active filters button */}
            {(filters.priorityOnly || filters.unreadOnly || filters.assignedTo !== "all" || filters.startDate || filters.endDate) && (
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    unreadOnly: false,
                    assignedTo: "all",
                    startDate: null,
                    endDate: null,
                    priorityOnly: false,
                  })
                }
                className="text-[11px] text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 font-medium transition-colors whitespace-nowrap flex-shrink-0"
                title="إلغاء جميع الفلاتر"
              >
                مسح الفلاتر
              </button>
            )}
          </div>

          <div
            className="flex-1 overflow-y-auto"
            onScroll={(e) => {
              const target = e.currentTarget;
              const { scrollTop, scrollHeight, clientHeight } = target;
              // Load more when near bottom (within 200px)
              if (
                scrollHeight - scrollTop - clientHeight < 200 &&
                hasMoreConversations &&
                !loading
              ) {
                loadMoreConversations();
              }
            }}
          >
            {loading && conversations.length === 0 ? (
              <div className="business-inbox-empty h-full">
                <div
                  className="animate-spin rounded-full h-12 w-12 border-b-2"
                  style={{ borderColor: "var(--color-primary)" }}
                ></div>
              </div>
            ) : error ? (
              <div
                className="text-center p-8"
                style={{ color: "var(--business-danger)" }}
              >
                {error}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="business-inbox-empty p-8 text-center">
                {filters.priorityOnly ? (
                  <>
                    <div className="text-5xl mb-3">⭐</div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      لا توجد محادثات ذات أولوية
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                      يمكنك تمييز أي محادثة بنجمة من داخل الشات لتظهر هنا
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((prev) => ({ ...prev, priorityOnly: false }))
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm mx-auto"
                    >
                      عرض جميع المحادثات
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">💬</div>
                    <p>{t("facebookInbox.noConversations")}</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                {/* Deduplicate conversations by ID to prevent duplicate key warnings */}
                {Array.from(
                  new Map(
                    filteredConversations.map((conv) => [conv.id, conv]),
                  ).values(),
                ).map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversation?.id === conv.id}
                    isMultiSelected={selectedIds.has(conv.id)}
                    onToggleSelection={(e) => {
                      e.stopPropagation();
                      toggleSelection(conv.id);
                    }}
                    onClick={() => {
                      selectConversation(conv);
                      if (window.innerWidth < 768) {
                        setShowSidebar(false);
                      }
                    }}
                  />
                ))}
                {/* Loading more conversations indicator */}
                {loading && conversations.length > 0 && (
                  <div className="flex justify-center p-4">
                    <div
                      className="animate-spin rounded-full h-6 w-6 border-b-2"
                      style={{ borderColor: "var(--color-muted-foreground)" }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Chat */}
        <div
          className="business-inbox-column flex-1 h-full min-h-0 flex flex-col relative overflow-hidden"
          style={{ height: "100%", minHeight: 0, flex: "1 1 0%", display: "flex", flexDirection: "column" }}
        >
          {selectedConversation ? (
            <>
              {/* Chat Header - simplified, Status & Assignment moved to sidebar */}
              <div className="business-inbox-header business-inbox-chat-header p-2 sm:p-3">
                <div className="business-inbox-header-row business-inbox-chat-header-row">
                  {/* Ø²Ø± Ø§Ù„Ø±Ø¬ÙˆØ¹ Ù„Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ */}
                  <button
                    onClick={handleBackToConversationList}
                    className="md:hidden business-chip-button dark:bg-white/10 dark:text-white dark:border-white/15 dark:hover:bg-white/20 p-2 rounded-lg transition-colors"
                    title={t("facebookInbox.backToConversations")}
                  >
                    <ArrowRight size={20} />
                  </button>

                  <div className="business-inbox-chat-identity flex min-w-0 items-center gap-3">
                    {selectedConversationAvatarUrl ? (
                      <img
                        src={selectedConversationAvatarUrl}
                        alt={selectedConversation.customerName}
                        className="business-conversation-avatar !w-10 !h-10"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="business-conversation-fallback !w-10 !h-10"
                      style={{ display: selectedConversationAvatarUrl ? "none" : "flex" }}
                    >
                      {selectedConversation.customerName?.charAt(0)?.toUpperCase() || "؟"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2
                        className="truncate text-base sm:text-lg font-semibold leading-tight"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {selectedConversation.customerName}
                      </h2>
                      {selectedConversation.pageName && (
                        <p
                          className="truncate text-xs mt-0.5"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {selectedConversation.pageName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="business-inbox-chat-actions">
                    {isMobileViewport ? (
                      <>
                        <button
                          type="button"
                          onClick={handleToggleAi}
                          className="business-icon-button relative rounded-xl transition-all duration-160 active:scale-[0.97]"
                          data-tone={isAiActive ? "primary" : "warning"}
                          style={
                            isAiActive
                              ? {
                                  background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                                  color: "var(--color-primary)",
                                  borderColor: "color-mix(in srgb, var(--color-primary) 28%, transparent)",
                                }
                              : {
                                  background: "color-mix(in srgb, var(--business-warning) 14%, transparent)",
                                  color: "var(--business-warning)",
                                  borderColor: "color-mix(in srgb, var(--business-warning) 32%, transparent)",
                                }
                          }
                          title={
                            isAiActive
                              ? t("facebookInbox.stopAiTooltip", "الرد الذكي مفعّل — اضغط لإيقاف الذكاء الاصطناعي عن هذه المحادثة")
                              : t("facebookInbox.startAiTooltip", "الذكاء الاصطناعي متوقف (تدخل بشري) — اضغط لإعادة تشغيل الرد الآلي")
                          }
                          aria-label={
                            isAiActive
                              ? t("facebookInbox.stopAi", "إيقاف الذكاء الاصطناعي")
                              : t("facebookInbox.startAi", "تشغيل الذكاء الاصطناعي")
                          }
                        >
                          <Bot className="h-5 w-5" />
                          <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                            {isAiActive ? (
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white dark:border-slate-900"></span>
                            ) : (
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 border border-white dark:border-slate-900"></span>
                            )}
                          </span>
                        </button>

                        <button
                          onClick={handleOpenProfilePanel}
                          className="business-icon-button rounded-xl transition-colors"
                          data-tone={
                            isProfilePanelActive ? "primary" : undefined
                          }
                          title={profilePanelToggleTitle}
                          aria-label={profilePanelToggleTitle}
                          aria-pressed={isProfilePanelActive}
                        >
                          <UserCircleIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={() =>
                            setShowMobileActionMenu((current) => !current)
                          }
                          className="business-icon-button rounded-xl transition-colors"
                          data-tone={showMobileActionMenu ? "primary" : undefined}
                          title={t("facebookInbox.more")}
                          aria-expanded={showMobileActionMenu}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </>
                    ) : shouldCollapseActions ? (
                      <>
                        <button
                          type="button"
                          onClick={handleToggleAi}
                          className="business-icon-button relative rounded-xl transition-all duration-160 active:scale-[0.97]"
                          data-tone={isAiActive ? "primary" : "warning"}
                          style={
                            isAiActive
                              ? {
                                  background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                                  color: "var(--color-primary)",
                                  borderColor: "color-mix(in srgb, var(--color-primary) 28%, transparent)",
                                }
                              : {
                                  background: "color-mix(in srgb, var(--business-warning) 14%, transparent)",
                                  color: "var(--business-warning)",
                                  borderColor: "color-mix(in srgb, var(--business-warning) 32%, transparent)",
                                }
                          }
                          title={
                            isAiActive
                              ? t("facebookInbox.stopAiTooltip", "الرد الذكي مفعّل — اضغط لإيقاف الذكاء الاصطناعي عن هذه المحادثة")
                              : t("facebookInbox.startAiTooltip", "الذكاء الاصطناعي متوقف (تدخل بشري) — اضغط لإعادة تشغيل الرد الآلي")
                          }
                          aria-label={
                            isAiActive
                              ? t("facebookInbox.stopAi", "إيقاف الذكاء الاصطناعي")
                              : t("facebookInbox.startAi", "تشغيل الذكاء الاصطناعي")
                          }
                        >
                          <Bot className="h-5 w-5" />
                          <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                            {isAiActive ? (
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white dark:border-slate-900"></span>
                            ) : (
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 border border-white dark:border-slate-900"></span>
                            )}
                          </span>
                        </button>

                        <ConversationActionsBar
                          isPriority={selectedConversation.priority}
                          onTogglePriority={handleTogglePriority}
                          onMarkDone={handleMarkDone}
                          disabled={updating}
                        />

                        <button
                          onClick={handleOpenProfilePanel}
                          className="business-icon-button rounded-xl transition-colors"
                          data-tone={
                            isProfilePanelActive ? "primary" : undefined
                          }
                          title={profilePanelToggleTitle}
                          aria-label={profilePanelToggleTitle}
                          aria-pressed={isProfilePanelActive}
                        >
                          {isProfilePanelActive ? (
                            <PanelRightClose size={18} />
                          ) : (
                            <PanelRightOpen size={18} />
                          )}
                        </button>

                        <div
                          className="business-inbox-chat-separator h-6 w-px mx-1"
                          style={{ background: "var(--business-muted-line)" }}
                        ></div>

                        <div className="relative">
                          <button
                            onClick={() => setShowDesktopMoreMenu((current) => !current)}
                            className="business-icon-button rounded-xl transition-colors"
                            data-tone={showDesktopMoreMenu ? "primary" : undefined}
                            title={t("facebookInbox.moreActions")}
                            aria-expanded={showDesktopMoreMenu}
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {showDesktopMoreMenu && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setShowDesktopMoreMenu(false)}
                                aria-label={t("facebookInbox.closeMenu")}
                              />
                              <div className="business-dropdown-surface absolute left-0 top-full z-30 mt-2 p-2 w-56 flex flex-col gap-1">
                                <button
                                  type="button"
                                  className="business-dropdown-option"
                                  onClick={() => {
                                    setShowDesktopMoreMenu(false);
                                    handleToggleAi();
                                  }}
                                >
                                  <Bot className={`h-5 w-5 ${isAiActive ? "text-amber-500" : "text-emerald-500"}`} />
                                  <span>
                                    {isAiActive
                                      ? t("facebookInbox.stopAi", "إيقاف الذكاء الاصطناعي")
                                      : t("facebookInbox.startAi", "تشغيل الذكاء الاصطناعي")}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  className="business-dropdown-option"
                                  onClick={() => {
                                    setShowDesktopMoreMenu(false);
                                    setShowQuickOrderModal(true);
                                  }}
                                >
                                  <ShoppingCartIcon className="h-5 w-5" />
                                  <span>{t("facebookInbox.createQuickOrder")}</span>
                                </button>

                                <button
                                  type="button"
                                  className="business-dropdown-option"
                                  onClick={() => {
                                    handleCopyConversationLink(selectedConversation.id);
                                    setShowDesktopMoreMenu(false);
                                  }}
                                >
                                  {copiedLink ? (
                                    <Check className="h-5 w-5" />
                                  ) : (
                                    <Copy className="h-5 w-5" />
                                  )}
                                  <span>
                                    {copiedLink
                                      ? String(t("sidebar.linkCopied"))
                                      : String(t("sidebar.copyLink"))}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  className="business-dropdown-option"
                                  onClick={() => {
                                    setShowDesktopMoreMenu(false);
                                    handleToggleNotesPanel();
                                  }}
                                >
                                  <StickyNote className="h-5 w-5" />
                                  <span>{showNotes ? t("facebookInbox.hideNotes") : t("facebookInbox.showNotes")}</span>
                                </button>

                                <button
                                  type="button"
                                  className="business-dropdown-option"
                                  onClick={() => {
                                    setShowDesktopMoreMenu(false);
                                    setSnoozeModalOpen(true);
                                  }}
                                >
                                  <ClockIcon className="h-5 w-5" />
                                  <span>{t("facebookInbox.snooze")}</span>
                                </button>

                                <div className="h-px my-1" style={{ background: "var(--business-muted-line)" }} />

                                <button
                                  type="button"
                                  className="business-dropdown-option"
                                  style={{ color: "var(--business-danger)" }}
                                  onClick={() => {
                                    setShowDesktopMoreMenu(false);
                                    handleDeleteConversation();
                                  }}
                                >
                                  <TrashIcon className="h-5 w-5" />
                                  <span>{t("facebookInbox.deleteConversation")}</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() =>
                            handleCopyConversationLink(selectedConversation.id)
                          }
                          className="business-icon-button rounded-xl transition-colors"
                          data-tone={copiedLink ? "success" : "primary"}
                          style={
                            copiedLink
                              ? {
                                  color: "var(--business-success)",
                                }
                              : {
                                  color: "var(--color-primary)",
                                }
                          }
                          title={String(
                            copiedLink
                              ? t("sidebar.linkCopied")
                              : t("sidebar.copyLink"),
                          )}
                        >
                          {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                        </button>

                        <button
                          onClick={() => setShowQuickOrderModal(true)}
                          className="business-icon-button rounded-xl transition-colors"
                          data-tone="warning"
                          title={t("facebookInbox.createQuickOrder")}
                        >
                          <ShoppingCartIcon className="h-5 w-5" />
                        </button>

                        <button
                          onClick={handleOpenProfilePanel}
                          className="business-icon-button rounded-xl transition-colors"
                          data-tone={
                            isProfilePanelActive ? "primary" : undefined
                          }
                          title={profilePanelToggleTitle}
                          aria-label={profilePanelToggleTitle}
                          aria-pressed={isProfilePanelActive}
                        >
                          {isProfilePanelActive ? (
                            <PanelRightClose size={18} />
                          ) : (
                            <PanelRightOpen size={18} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleAi}
                          className="business-icon-button relative rounded-xl transition-all duration-160 active:scale-[0.97]"
                          data-tone={isAiActive ? "primary" : "warning"}
                          style={
                            isAiActive
                              ? {
                                  background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                                  color: "var(--color-primary)",
                                  borderColor: "color-mix(in srgb, var(--color-primary) 28%, transparent)",
                                }
                              : {
                                  background: "color-mix(in srgb, var(--business-warning) 14%, transparent)",
                                  color: "var(--business-warning)",
                                  borderColor: "color-mix(in srgb, var(--business-warning) 32%, transparent)",
                                }
                          }
                          title={
                            isAiActive
                              ? t("facebookInbox.stopAiTooltip", "الرد الذكي مفعّل — اضغط لإيقاف الذكاء الاصطناعي عن هذه المحادثة")
                              : t("facebookInbox.startAiTooltip", "الذكاء الاصطناعي متوقف (تدخل بشري) — اضغط لإعادة تشغيل الرد الآلي")
                          }
                          aria-label={
                            isAiActive
                              ? t("facebookInbox.stopAi", "إيقاف الذكاء الاصطناعي")
                              : t("facebookInbox.startAi", "تشغيل الذكاء الاصطناعي")
                          }
                        >
                          <Bot className="h-5 w-5" />
                          <span className="absolute -top-0.5 -end-0.5 flex h-2.5 w-2.5">
                            {isAiActive ? (
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 border border-white dark:border-slate-900"></span>
                            ) : (
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 border border-white dark:border-slate-900"></span>
                            )}
                          </span>
                        </button>

                        <div
                          className="business-inbox-chat-separator h-6 w-px mx-1"
                          style={{ background: "var(--business-muted-line)" }}
                        ></div>

                        <button
                          onClick={handleToggleNotesPanel}
                          className="business-chip-button p-2 rounded-full transition-colors"
                          style={
                            showNotes
                              ? {
                                  color: "var(--business-warning)",
                                  background:
                                    "color-mix(in srgb, var(--business-warning) 10%, white)",
                                }
                              : undefined
                          }
                          title={String(t("inbox.notes"))}
                        >
                          <StickyNote size={20} />
                        </button>
                        <ConversationActionsBar
                          isPriority={selectedConversation.priority}
                          onTogglePriority={handleTogglePriority}
                          onMarkDone={handleMarkDone}
                          onSnooze={() => setSnoozeModalOpen(true)}
                          onDelete={handleDeleteConversation}
                          disabled={updating}
                        />
                      </>
                    )}
                  </div>
                </div>

                {isMobileViewport && showMobileActionMenu && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-20 bg-black/10 md:hidden"
                      onClick={() => setShowMobileActionMenu(false)}
                      aria-label={t("facebookInbox.closeMenu")}
                    />
                    <div className="business-inbox-mobile-action-menu business-dropdown-surface absolute inset-x-3 top-full z-30 mt-2 p-2 md:hidden">
                      <button
                        type="button"
                        className="business-dropdown-option"
                        onClick={() => {
                          setShowMobileActionMenu(false);
                          handleToggleAi();
                        }}
                      >
                        <Bot className={`h-5 w-5 ${isAiActive ? "text-amber-500" : "text-emerald-500"}`} />
                        <span>
                          {isAiActive
                            ? t("facebookInbox.stopAi", "إيقاف الذكاء الاصطناعي")
                            : t("facebookInbox.startAi", "تشغيل الذكاء الاصطناعي")}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="business-dropdown-option"
                        onClick={() => {
                          setShowMobileActionMenu(false);
                          setShowQuickOrderModal(true);
                        }}
                      >
                        <ShoppingCartIcon className="h-5 w-5" />
                        <span>{t("facebookInbox.createQuickOrder")}</span>
                      </button>

                      <button
                        type="button"
                        className="business-dropdown-option"
                        onClick={() => {
                          handleCopyConversationLink(selectedConversation.id);
                          setShowMobileActionMenu(false);
                        }}
                      >
                        {copiedLink ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                        <span>
                          {copiedLink
                            ? String(t("sidebar.linkCopied"))
                            : String(t("sidebar.copyLink"))}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="business-dropdown-option"
                        onClick={handleToggleNotesPanel}
                      >
                        <StickyNote size={18} />
                        <span>{showNotes ? t("facebookInbox.hideNotes") : t("facebookInbox.showNotes")}</span>
                      </button>

                      <button
                        type="button"
                        className="business-dropdown-option"
                        onClick={() => {
                          setShowMobileActionMenu(false);
                          handleMarkDone();
                        }}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>{t("facebookInbox.markAsDone")}</span>
                      </button>

                      <button
                        type="button"
                        className="business-dropdown-option"
                        onClick={() => {
                          setShowMobileActionMenu(false);
                          handleTogglePriority();
                        }}
                      >
                        <StarIcon className="h-5 w-5" />
                        <span>
                          {selectedConversation.priority
        ? t("facebookInbox.clearPriority")
        : t("facebookInbox.setPriority")}
                        </span>
                      </button>

                      <button
                        type="button"
                        className="business-dropdown-option"
                        onClick={() => {
                          setShowMobileActionMenu(false);
                          setSnoozeModalOpen(true);
                        }}
                      >
                        <ClockIcon className="h-5 w-5" />
                        <span>{t("facebookInbox.snooze")}</span>
                      </button>

                      <button
                        type="button"
                        className="business-dropdown-option"
                        style={{ color: "var(--business-danger)" }}
                        onClick={() => {
                          setShowMobileActionMenu(false);
                          handleDeleteConversation();
                        }}
                      >
                        <TrashIcon className="h-5 w-5" />
                        <span>{t("facebookInbox.deleteConversation")}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Messages Container - scrollable area, messages directly above input */}
              <div
                className="business-chat-stage flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-4 pb-4"
                style={{ flex: "1 1 0%", minHeight: 0 }}
                ref={messagesContainerRef}
                onScroll={handleScroll}
              >
                {loadingMessages && !hasMore ? (
                  <div className="business-inbox-empty h-full">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-b-2"
                      style={{ borderColor: "var(--color-primary)" }}
                    ></div>
                  </div>
                ) : messages.length === 0 && !loadingMessages ? (
                  <div className="business-inbox-empty h-full py-10">
                    <p>{t("inbox.noMessages")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Loading more indicator at top when loading older messages */}
                    {loadingMessages && hasMore && (
                      <div className="flex justify-center p-2">
                        <div
                          className="animate-spin rounded-full h-5 w-5 border-b-2"
                          style={{
                            borderColor: "var(--color-muted-foreground)",
                          }}
                        ></div>
                      </div>
                    )}

                    {/* Messages in normal order (oldest first, newest last) */}
                    {Array.from(
                      new Map(messages.map((msg) => [msg.id, msg])).values(),
                    ).map((msg) => {
                      // hasBeenReplied: true if replied, false if not replied, undefined if not a customer message
                      const hasBeenReplied = msg.isFromCustomer
                        ? repliedMessages.has(msg.id)
                        : undefined;
                      const parentId =
                        msg.metadata?.replyToResolvedMessageId ||
                        msg.metadata?.replyTo?.messageId;
                      const parentMessage = parentId
                        ? messagesById.get(parentId)
                        : undefined;

                      return (
                        <div
                          key={msg.id}
                          id={`inbox-message-${msg.id}`}
                          className="w-full transition-all duration-300"
                        >
                          <MessageBubble
                            message={msg}
                            parentMessage={parentMessage}
                            {...(hasBeenReplied !== undefined && {
                              hasBeenReplied,
                            })}
                            onDelete={handleDeleteMessage}
                            onForward={handleForwardRequest}
                            onStar={handleStarMessage}
                            onReaction={handleMessageReaction}
                            onReply={handleReplyToMessage}
                            onScrollToMessage={handleScrollToMessage}
                            onCorrect={() => selectedConversation && loadMessages(selectedConversation.id)}
                            currentUserId={user?.id || ""}
                          />
                        </div>
                      );
                    })}

                  </div>
                )}
              </div>

              {/* Bottom composer */}
              <div className="flex-shrink-0 mt-auto" style={{ flexShrink: 0, marginTop: "auto" }}>
                {!isAiActive && (
                  <div
                    className="flex items-center justify-between px-3.5 py-1.5 text-xs border-t backdrop-blur-sm"
                    style={{
                      background:
                        "color-mix(in srgb, var(--business-warning) 8%, var(--color-card, #ffffff))",
                      borderColor:
                        "color-mix(in srgb, var(--business-warning) 22%, transparent)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Bot className="h-4 w-4 flex-shrink-0 text-amber-500" />
                      <span className="truncate font-medium">
                        {isAiPaused
                          ? t(
                              "facebookInbox.aiPausedHandover",
                              "الذكاء الاصطناعي متوقف مؤقتاً بسبب رد يدوي (تدخل بشري)",
                            )
                          : t(
                              "facebookInbox.aiStoppedManually",
                              "الذكاء الاصطناعي متوقف عن هذه المحادثة (التحكم يدوي)",
                            )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleAi}
                      className="ms-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all flex-shrink-0 shadow-sm cursor-pointer"
                    >
                      {t("facebookInbox.resumeAi", "تشغيل الرد الآلي")}
                    </button>
                  </div>
                )}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onSendFile={handleSendFile}
                  onSendQuickReply={handleSendQuickReply}
                  sending={sending}
                  uploadingFile={uploadingFile}
                  conversation={selectedConversation}
                  user={user}
                  replyTo={replyToMessage}
                  onCancelReply={handleCancelReply}
                  onOpenTextGallery={() => setShowTextGallery(true)}
                  onOpenImageGallery={() => setShowImageGallery(true)}
                  onOpenProductPicker={() => setShowProductPicker(true)}
                  draftMessage={composerDraft}
                  onDraftMessageHandled={() => setComposerDraft("")}
                />
              </div>
            </>
          ) : (
            <div className="business-chat-stage flex items-center justify-center h-full">
              <div className="text-center">
                {/* Ø²Ø± ÙØªØ­ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ */}
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden mb-4 business-icon-button !w-14 !h-14 rounded-full shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                    color: "white",
                    borderColor: "transparent",
                  }}
                  title={t("facebookInbox.showConversations")}
                >
                  <Menu size={24} />
                </button>
                <div className="text-6xl mb-4">💬</div>
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {t("facebookInbox.selectConversation")}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {t("facebookInbox.selectConversationHint")}
                </p>
              </div>
            </div>
          )}
        </div>

        {showPinnedContextPanel &&
          (showNotes ? (
            <NotesPanel
              className="business-inbox-column--profile business-inbox-column--context h-full shadow-none"
              customerId={selectedConversation!.customerId}
              isOpen
              onClose={() => setShowNotes(false)}
            />
          ) : (
            <CustomerProfile
              className="business-inbox-column--context h-full shadow-none"
              conversation={selectedConversation!}
              compactHeader
              onTagsChange={handleTagsChange}
              updatingTags={updatingTags}
              currentStatus={selectedConversation!.status}
              onStatusChange={(status) =>
                handleStatusChange(status as ConversationStatus)
              }
              currentAssignee={selectedConversation!.assignedTo}
              currentAssigneeName={selectedConversation!.assignedToName ?? null}
              onAssign={handleAssignment}
              disabled={updating}
              onCopyConversationLink={(conversationId) => {
                const conversationLink = `${window.location.origin}${inboxPath}?conversation=${conversationId}`;

                navigator.clipboard
                  .writeText(conversationLink)
                  .catch((err) => {
                    console.error("âŒ Failed to copy link:", err);
                    alert(t("conversations.conversationLinkAlert", { link: conversationLink }));
                  });
              }}
              isBlocked={isBlocked}
              checkingBlockStatus={checkingBlockStatus}
              blocking={blocking}
              showBlockModal={showBlockModal}
              blockReason={blockReason}
              onBlockClick={() => setShowBlockModal(true)}
              onUnblockClick={handleUnblockCustomer}
              onBlockReasonChange={setBlockReason}
              onBlockConfirm={handleBlockCustomer}
              onBlockCancel={() => {
                setShowBlockModal(false);
                setBlockReason("");
              }}
              soundEnabled={soundEnabled}
              notificationsEnabled={notificationsEnabled}
              onSoundToggle={() => setSoundEnabled(!soundEnabled)}
              onNotificationsToggle={() =>
                setNotificationsEnabled(!notificationsEnabled)
              }
              onCreateOrder={() => setShowQuickOrderModal(true)}
            />
          ))}

        {showProfileOverlay && (
          <>
            <div
              className="absolute inset-0 z-20 bg-black/15 backdrop-blur-[1px]"
              onClick={() => setShowProfilePanel(false)}
            />
            <div className="absolute inset-y-0 right-0 z-30 w-[85%] sm:max-w-[22rem] xl:max-w-[23rem]">
              <button
                type="button"
                onClick={() => setShowProfilePanel(false)}
                className="business-icon-button absolute left-3 top-3 z-40 rounded-full"
                title={t("facebookInbox.closeCustomerData")}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <CustomerProfile
                className="w-full shadow-2xl"
                conversation={selectedConversation!}
                onTagsChange={handleTagsChange}
                updatingTags={updatingTags}
                currentStatus={selectedConversation!.status}
                onStatusChange={(status) =>
                  handleStatusChange(status as ConversationStatus)
                }
                currentAssignee={selectedConversation!.assignedTo}
                currentAssigneeName={selectedConversation!.assignedToName ?? null}
                onAssign={handleAssignment}
                disabled={updating}
                // ðŸ†• Copy Conversation Link
                onCopyConversationLink={(conversationId) => {
                  const conversationLink = `${window.location.origin}${inboxPath}?conversation=${conversationId}`;

                  navigator.clipboard
                    .writeText(conversationLink)
                    .then(() => {
                      console.log(
                        "âœ… Conversation link copied:",
                        conversationLink,
                      );
                    })
                    .catch((err) => {
                      console.error("âŒ Failed to copy link:", err);
                      alert(t("conversations.conversationLinkAlert", { link: conversationLink }));
                    });
                }}
                // ðŸ†• Block Customer Props
                isBlocked={isBlocked}
                checkingBlockStatus={checkingBlockStatus}
                blocking={blocking}
                showBlockModal={showBlockModal}
                blockReason={blockReason}
                onBlockClick={() => setShowBlockModal(true)}
                onUnblockClick={handleUnblockCustomer}
                onBlockReasonChange={setBlockReason}
                onBlockConfirm={handleBlockCustomer}
                onBlockCancel={() => {
                  setShowBlockModal(false);
                  setBlockReason("");
                }}
                // ðŸ†• Sound & Notifications Props
                soundEnabled={soundEnabled}
                notificationsEnabled={notificationsEnabled}
                onSoundToggle={() => setSoundEnabled(!soundEnabled)}
                onNotificationsToggle={() =>
                  setNotificationsEnabled(!notificationsEnabled)
                }
                // ðŸ†• Quick Order
                onCreateOrder={() => setShowQuickOrderModal(true)}
              />
            </div>
          </>
        )}
      </div>

      {typeof navigator !== "undefined" && !navigator.onLine && (
        <div
          className="fixed bottom-4 right-4 z-50 px-3.5 py-1.5 rounded-lg shadow-lg text-xs font-medium"
          style={{
            background:
              "color-mix(in srgb, var(--business-warning) 14%, var(--color-card, #ffffff))",
            border:
              "1px solid color-mix(in srgb, var(--business-warning) 30%, transparent)",
            color: "var(--business-warning)",
          }}
        >
          {t("facebookInbox.disconnected", "⚠️ لا يوجد اتصال بالإنترنت")}
        </div>
      )}

      {/* Text Gallery Modal */}
      <TextGalleryModal
        isOpen={showTextGallery}
        onClose={() => setShowTextGallery(false)}
        onSelectText={handleSelectTextFromGallery}
        onInsertText={(content) => {
          setComposerDraft(content);
          setShowTextGallery(false);
        }}
      />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelectImage={handleSelectImageFromGallery}
        onSelectMultipleImages={handleSelectMultipleImagesFromGallery}
      />

      {/* 🆕 Product Image Picker Modal */}
      <ProductImagePickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSendProduct={handleSendProductImages}
      />

      {/* 🆕 Block Customer Modal */}
      {showBlockModal && selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="business-modal-surface p-6 w-full max-w-md">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--color-foreground)" }}
            >
              {t("facebookInbox.blockOnFacebook")}
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {t("facebookInbox.blockOnFacebookDesc")}
            </p>

            <div className="mb-4">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-foreground)" }}
              >
                {t("facebookInbox.blockReason")}
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="business-chat-input"
                rows={3}
                placeholder={t("facebookInbox.blockReasonPlaceholder")}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockReason("");
                }}
                className="business-chip-button px-4 py-2 rounded-lg"
              >
                {t("facebookInbox.cancel")}
              </button>
              <button
                onClick={handleBlockCustomer}
                disabled={blocking}
                className="business-chip-button px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "var(--business-danger)",
                  borderColor: "transparent",
                  color: "white",
                }}
              >
                {blocking ? t("facebookInbox.blocking") : t("facebookInbox.confirmBlock")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Blocked Customer Alert */}
      {isBlocked && selectedConversation && (
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 rounded-lg p-4 shadow-lg max-w-md business-page-panel"
          style={{
            background:
              "color-mix(in srgb, var(--business-danger) 12%, var(--color-card, #ffffff))",
            borderColor:
              "color-mix(in srgb, var(--business-danger) 22%, transparent)",
          }}
        >
          <div className="flex items-center space-x-2">
            <NoSymbolIcon
              className="w-6 h-6"
              style={{ color: "var(--business-danger)" }}
            />
            <p className="text-sm" style={{ color: "var(--business-danger)" }}>
              {t("facebookInbox.customerBlocked")}
            </p>
          </div>
        </div>
      )}

      {/* 🆕 Quick Order Modal */}
      {selectedConversation && (
        <QuickOrderModal
          isOpen={showQuickOrderModal}
          onClose={() => setShowQuickOrderModal(false)}
          conversation={selectedConversation}
          customerName={selectedConversation.customerName}
          customerPhone={selectedConversation.customerPhone}
          conversationId={selectedConversation.id}
          customerId={selectedConversation.customerId}
          platform={platform}
          pageName={selectedConversation.pageName || "Facebook"}
          onOrderCreated={(orderId, order, confirmationMessage) => {
            console.log("✅ Order created:", orderId, order);
            if (confirmationMessage && addMessage) {
              addMessage(confirmationMessage);
            }
            if (selectedConversation?.id && loadMessages) {
              loadMessages(selectedConversation.id);
            }
          }}
        />
      )}
    </div>
  );
};

export default FacebookInbox;

