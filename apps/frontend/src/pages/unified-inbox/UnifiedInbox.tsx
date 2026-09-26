import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  FaceSmileIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckIcon,
  LinkIcon,
  BellSnoozeIcon,
  PencilSquareIcon,
  ShoppingCartIcon,
  ArrowUturnLeftIcon,
  HeartIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  StarIcon as StarOutlineIcon,
  ArchiveBoxIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { Activity, ShoppingBag as ShoppingBagLucide, User as UserLucide } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { useTranslation } from "react-i18next";
import EmojiPicker, { Theme as EmojiTheme } from "emoji-picker-react";
import { useTheme } from "../../hooks/useTheme";

import QuickOrderModal from "../../components/facebook-inbox/Modals/QuickOrderModal";
import TextGalleryModal from "../../components/facebook-inbox/TextGallery/TextGalleryModal";
import ImageGalleryModal from "../../components/facebook-inbox/ImageGallery/ImageGalleryModal";
import ForwardModal from "../../components/facebook-inbox/Modals/ForwardModal";
import StatusDropdown from "../../components/facebook-inbox/StatusDropdown/StatusDropdown";
import type { ConversationStatus } from "../../types/inbox.types";
import PostsManagement from "../comments/PostsManagement";
import AssignmentDropdown from "../../components/facebook-inbox/AssignmentDropdown/AssignmentDropdown";
import { buildProxyImageUrl, getImageUrl, getInboxMessageMediaUrl } from "../../utils/imageUrl";

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 Types
// ═══════════════════════════════════════════════════════════════════════════════

interface UnifiedConversation {
  id: string;
  platform: "facebook" | "instagram" | "whatsapp" | "telegram";
  platformIcon: string;
  contactName: string;
  contactAvatar: string | null;
  contactId: string;
  contactEmail: string | null;
  contactPhone: string | null;
  lastMessage: string;
  lastMessageType: string;
  lastMessageTime: string;
  lastMessageIsFromCustomer: boolean;
  unreadCount: number;
  status: string;
  assignedTo: { id: string; name: string; avatar: string | null } | null;
  isPinned: boolean;
  isMuted: boolean;
  tags: string[];
  metadata: Record<string, any>;
  // 📦 Last order info
  lastOrderNumber?: string | null;
  lastOrderStatus?: string | null;
  totalOrders?: number;
  aiEnabled?: boolean;
}

interface UnifiedMessage {
  id: string;
  platform: string;
  messageId?: string;
  content: string;
  type: string;
  isFromCustomer: boolean;
  timestamp: string;
  status: string;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  attachments?: Array<{ url?: string; type?: string; name?: string; attachmentIndex?: number }> | null;
  quotedMessage: { id: string; content: string } | null;
  sender: string;
  senderAvatar?: string | null;
  interactiveData: any;
  isStarred?: boolean;
  isAIResponse?: boolean;
}

interface CustomerProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: string;
  createdAt: string;
  totalOrders: number;
  totalConversations: number;
  recentOrders: any[];
  recentConversations: any[];
  tags: string[];
  notes: string;
  // 🌟 Smart Rating Fields
  ltv?: number;
  ratingStars?: number;
  ratingLabel?: string;
}

interface PlatformCounts {
  all: number;
  facebook: number;
  instagram: number;
  whatsapp: number;
  telegram: number;
  unreplied: number;
}

interface Attachment {
  url: string;
  name: string;
  type: string;
}

// ponytail: API response envelope — backend wraps everything in { success, data, ... }
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | { code: string; message: string };
  message?: string;
  pagination?: { totalPages: number; page?: number; total?: number };
  counts?: PlatformCounts;
}

interface UploadResponse {
  success?: boolean;
  filePath?: string;
  fullUrl?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 Platform styling
// ═══════════════════════════════════════════════════════════════════════════════

const platformStyles: Record<string, { label: string; icon: string }> = {
  facebook: { label: "Messenger", icon: "💬" },
  instagram: { label: "Instagram", icon: "📷" },
  whatsapp: { label: "WhatsApp", icon: "📱" },
  telegram: { label: "Telegram", icon: "✈️" },
  website: { label: "Website", icon: "🌐" },
  test: { label: "Test Platform", icon: "🧪" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏗️ Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const UnifiedInbox: React.FC = () => {
  const { t: rawT, i18n } = useTranslation();
  // ponytail: react-i18next v12 returns DefaultTFuncReturn, cast to string for aria-label/props
  const t = rawT as ((key: string, opts?: any) => string);
  const isRtl = i18n.dir() === "rtl";
  const { actualTheme, derivedTheme } = useTheme();
  const isDarkMode = derivedTheme === "dark" || actualTheme === "dark";

  // State
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<UnifiedConversation | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<"timeline" | "orders" | "info">("timeline");
  // ponytail: counts fetched from API but not yet displayed in UI — wire up when needed

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'followUp'>('all');
  const [activeTab, setActiveTab] = useState("all");
  const [newMessage, setNewMessage] = useState("");
  const [showProfilePanel, setShowProfilePanel] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState("");

  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [showTextGallery, setShowTextGallery] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<UnifiedMessage | null>(null);

  // ── AI Correction state ──
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [savingCorrection, setSavingCorrection] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketHandlerRef = useRef<((message: any) => void) | null>(null);
  const newConvHandlerRef = useRef<((conversation: any) => void) | null>(null);
  const waSocketHandlerRef = useRef<((payload: any) => void) | null>(null);
  // ponytail: AbortControllers prevent race conditions when switching conversations rapidly
  const messagesAbortRef = useRef<AbortController | null>(null);
  const profileAbortRef = useRef<AbortController | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ──────────────────────────────────────────────────────────
  // 📡 Data Fetching
  // ──────────────────────────────────────────────────────────

  const loadConversations = useCallback(async (pageNum?: number, append?: boolean) => {
    const targetPage = pageNum ?? 1;
    const isAppend = append ?? false;

    try {
      if (!isAppend) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams();

      if (selectedPlatforms.length > 0) {
        params.set("platform", selectedPlatforms.join(","));
      } else {
        params.set("platform", "all");
      }

      if (searchQuery) params.set("search", searchQuery);
      if (activeTab !== "all") params.set("tab", activeTab);
      if (activeFilter === 'followUp') params.set("isPinned", "true");
      if (activeFilter === 'unread') params.set("unreadOnly", "true");
      params.set("limit", "50");
      params.set("page", String(targetPage));

      const response = await apiClient.get<ApiResponse<UnifiedConversation[]>>(
        `/api/v1/unified-inbox/conversations?${params.toString()}`,
      );

      if (response.data?.success) {
        const newData = response.data.data || [];
        const pagination = response.data.pagination || { totalPages: 0 };
        const hasNext = pagination.totalPages > targetPage;

        setHasMore(hasNext);
        pageRef.current = targetPage;

        if (isAppend) {
          setConversations(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const fresh = newData.filter(c => !existingIds.has(c.id));
            return [...prev, ...fresh];
          });
        } else {
          setConversations(newData);
        }

        if (response.data.counts) {
          // ponytail: counts available but not displayed yet
        }
      }
    } catch (error) {
      console.error("❌ Error loading conversations:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedPlatforms, searchQuery, activeFilter, activeTab]);

  const loadMoreConversations = useCallback(() => {
    if (!hasMore || loadingMore) return;
    loadConversations(pageRef.current + 1, true);
  }, [hasMore, loadingMore, loadConversations]);

  const handleConversationListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      loadMoreConversations();
    }
  }, [loadMoreConversations]);

  const toggleSelectConv = useCallback((id: string) => {
    setSelectedConvIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedConvIds(new Set());
    setSelectMode(false);
  }, []);

  const handleRefresh = useCallback(() => {
    loadConversations();
  }, [loadConversations]);

  const handleToggleConvStar = useCallback(async (convId: string, currentlyPinned: boolean) => {
    const newPinned = !currentlyPinned;
    setConversations(prev => prev.map(c =>
      c.id === convId ? { ...c, isPinned: newPinned } : c
    ));
    if (selectedConversation?.id === convId) {
      setSelectedConversation(prev => prev ? { ...prev, isPinned: newPinned } : null);
    }
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${convId}`, {
        isPinned: newPinned
      });
    } catch (err) {
      console.error("Error toggling star:", err);
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, isPinned: currentlyPinned } : c
      ));
    }
  }, [selectedConversation]);

  const handleToggleAi = useCallback(async () => {
    if (!selectedConversation) return;
    const newStatus = selectedConversation.aiEnabled === false;
    
    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === selectedConversation.id ? { ...c, aiEnabled: newStatus } : c
    ));
    setSelectedConversation(prev => prev ? { ...prev, aiEnabled: newStatus } : null);

    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`, {
        aiEnabled: newStatus
      });
    } catch (err) {
      console.error("Error toggling AI status:", err);
      // Revert on error
      setConversations(prev => prev.map(c =>
        c.id === selectedConversation.id ? { ...c, aiEnabled: !newStatus } : c
      ));
      setSelectedConversation(prev => prev ? { ...prev, aiEnabled: !newStatus } : null);
    }
  }, [selectedConversation]);

  const handleTogglePriority = useCallback(() => {
    if (!selectedConversation) return;
    setShowActionsMenu(false);
    handleToggleConvStar(selectedConversation.id, selectedConversation.isPinned);
  }, [selectedConversation, handleToggleConvStar]);

  const handleCopyConversationLink = useCallback(() => {
    if (!selectedConversation) return;
    const link = `${window.location.origin}/unified-inbox?conv=${selectedConversation.id}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setShowActionsMenu(false);
  }, [selectedConversation]);

  const handleSnooze = useCallback(async (until: Date) => {
    if (!selectedConversation) return;
    setShowSnoozePicker(false);
    setShowActionsMenu(false);
    try {
      await apiClient.post(`/api/v1/unified-inbox/conversations/${selectedConversation.id}/snooze`, {
        snoozeUntil: until.toISOString()
      });
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
    } catch (err) {
      console.error("Error snoozing:", err);
    }
  }, [selectedConversation]);

  const handleSaveNote = useCallback(async () => {
    if (!selectedConversation || !customerProfile) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/customer/${customerProfile.id}`, {
        notes: noteText
      });
      setCustomerProfile(prev => prev ? { ...prev, notes: noteText } : null);
      setEditNote(false);
    } catch (err) {
      console.error("Error saving note:", err);
    }
  }, [selectedConversation, customerProfile, noteText]);

  const handleForwardMessage = useCallback(async (targetConversationId: string) => {
    if (!forwardMessage) return;
    try {
      await apiClient.post(`/api/v1/unified-inbox/conversations/${targetConversationId}/messages`, {
        content: forwardMessage.content,
        type: forwardMessage.type || 'text',
        platform: forwardMessage.platform,
        mediaUrl: forwardMessage.mediaUrl,
        mediaFileName: forwardMessage.mediaFileName
      });
      setShowForwardModal(false);
      setForwardMessage(null);
    } catch (err) {
      console.error("Error forwarding message:", err);
    }
  }, [forwardMessage]);

  const handleTextGallerySelect = useCallback((text: { content: string; imageUrls?: string[] }) => {
    setNewMessage(prev => prev + text.content);
    setShowTextGallery(false);
  }, []);

  const handleMsgStar = useCallback(async (msgId: string) => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}/star`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isStarred: !m.isStarred } : m));
    } catch (err) {
      console.error("Error starring message:", err);
    }
  }, [selectedConversation]);

  const handleMsgReact = useCallback(async (msgId: string, reaction: string) => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}/reaction`, { reaction });
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  }, [selectedConversation]);

  const handleMsgDelete = useCallback(async (msgId: string) => {
    if (!selectedConversation) return;
    try {
      await apiClient.delete(`/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  }, [selectedConversation]);

  const handleMsgReply = useCallback((msg: UnifiedMessage) => {
    setReplyToMsg(msg);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMsg(null);
  }, []);

  const handleImageGallerySelect = useCallback((imageUrl: string, filename: string) => {
    setAttachments(prev => [...prev, { url: imageUrl, name: filename, type: "image" }]);
    setShowImageGallery(false);
  }, []);

  const handleBulkUpdate = useCallback(async (status: string) => {
    if (selectedConvIds.size === 0) return;
    try {
      await Promise.all(Array.from(selectedConvIds).map(id =>
        apiClient.put(`/api/v1/unified-inbox/conversations/${id}`, { status })
      ));
      setConversations(prev => prev.filter(c => !selectedConvIds.has(c.id)));
      if (selectedConversation && selectedConvIds.has(selectedConversation.id)) {
        setSelectedConversation(null);
      }
      clearSelection();
    } catch (err) {
      console.error("Error bulk update:", err);
    }
  }, [selectedConvIds, selectedConversation, clearSelection]);

  const loadMessages = useCallback(async (conv: UnifiedConversation) => {
    // Abort previous in-flight request to avoid race when switching conversations
    messagesAbortRef.current?.abort();
    const ac = new AbortController();
    messagesAbortRef.current = ac;

    try {
      setLoadingMessages(true);
      const params = new URLSearchParams();
      params.set("platform", conv.platform);
      if (conv.metadata?.["sessionId"])
        params.set("sessionId", conv.metadata["sessionId"]);
      if (conv.metadata?.["jid"]) params.set("jid", conv.metadata["jid"]);

      const response = await apiClient.get<ApiResponse<UnifiedMessage[]>>(
        `/api/v1/unified-inbox/conversations/${conv.id}/messages?${params.toString()}`,
        { signal: ac.signal },
      );

      if (response.data?.success) {
        setMessages(response.data.data || []);
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error: any) {
      if (ac.signal.aborted) return; // superseded by a newer request
      console.error("❌ Error loading messages:", error);
    } finally {
      if (messagesAbortRef.current === ac) {
        setLoadingMessages(false);
      }
    }
  }, []);

  const loadCustomerProfile = useCallback(async (customerId: string) => {
    profileAbortRef.current?.abort();
    const ac = new AbortController();
    profileAbortRef.current = ac;

    try {
      setLoadingProfile(true);
      const response = await apiClient.get<ApiResponse<CustomerProfile>>(
        `/api/v1/unified-inbox/customer/${customerId}`,
        { signal: ac.signal },
      );
      if (response.data?.success) {
        setCustomerProfile(response.data.data ?? null);
      }
    } catch (error: any) {
      if (ac.signal.aborted) return;
      console.error("❌ Error loading customer:", error);
      setCustomerProfile(null);
    } finally {
      if (profileAbortRef.current === ac) {
        setLoadingProfile(false);
      }
    }
  }, []);

  const loadQuickReplies = useCallback(async () => {
    try {
      const [qrResponse, textsResponse] = await Promise.all([
        apiClient.get<ApiResponse<any[]>>("/api/v1/unified-inbox/quick-replies").catch(() => null),
        apiClient.get<{ texts: any[] }>("/user/text-gallery").catch(() => null)
      ]);

      let combined: any[] = [];
      
      if (qrResponse?.data?.success) {
        combined = [...(qrResponse.data.data || [])];
      }

      if (textsResponse?.data?.texts) {
        const sortedTexts = [...textsResponse.data.texts].sort((a: any, b: any) => {
          if (!!a.isPinned === !!b.isPinned) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
          return a.isPinned ? -1 : 1;
        });

        const formattedTexts = sortedTexts.map((t: any) => ({
          id: `saved-text-${t.id}`,
          title: t.title || t("unifiedInbox.untitled"),
          content: t.content,
          imageUrls: t.imageUrls,
        }));
        combined = [...combined, ...formattedTexts];
      }

      setQuickReplies(combined);
    } catch (error) {
      console.error("Error loading quick replies and saved texts:", error);
    }
  }, []);

  // — Hash-based navigation: browser back returns to conversation list (works in PWA) —
  useEffect(() => {
    if (!selectedConversation) {
      if (window.location.hash === '#chat') {
        window.history.back();
      }
      return;
    }
    window.location.hash = 'chat';
    const onHashChange = () => {
      if (window.location.hash !== '#chat' && selectedConversation) {
        setSelectedConversation(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [selectedConversation]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    if (selectedConversation) {
      document.body.classList.add('app-shell-chat-active');
    } else {
      document.body.classList.remove('app-shell-chat-active');
    }

    return () => {
      document.body.classList.remove('app-shell-chat-active');
    };
  }, [selectedConversation]);

  // ──────────────────────────────────────────────────────────
  // 🎯 Actions
  // ──────────────────────────────────────────────────────────

  const selectConversation = useCallback(
    (conv: UnifiedConversation) => {
      setSelectedConversation(conv);
      setShowActionsMenu(false);
      setSendError(null);
      loadMessages(conv);
      // Load customer profile for all platforms if contactId exists
      if (conv.contactId) {
        loadCustomerProfile(conv.contactId);
      } else {
        setCustomerProfile(null);
      }
    },
    [loadMessages, loadCustomerProfile],
  );

  // ── AI Correction ──
  const submitCorrection = async (msgId: string) => {
    if (!correctionText.trim() || !selectedConversation) return;
    setSavingCorrection(true);
    try {
      await apiClient.post<ApiResponse>(
        `/api/v1/unified-inbox/conversations/${selectedConversation.id}/messages/${msgId}/correct`,
        { correction: correctionText.trim() }
      );
      setEditingMessageId(null);
      setCorrectionText("");
      // Reload messages
      loadMessages(selectedConversation);
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || "فشل إرسال التصحيح");
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);
      if (!file) continue;

      // Validate file size (max 20 MB)
      if (file.size > 20 * 1024 * 1024) {
        setSendError(t("unifiedInbox.fileTooLarge"));
        setTimeout(() => setSendError(null), 5000);
        continue;
      }

      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await apiClient.post<UploadResponse>("/api/v1/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (response.data?.success || response.data?.filePath) {
          const filePath = response.data.filePath;
          const fullUrl = response.data.fullUrl || `${window.location.origin}${filePath}`;

          let type = "document";
          if (file.type.startsWith("image/")) {
            type = "image";
          } else if (file.type.startsWith("video/")) {
            type = "video";
          } else if (file.type.startsWith("audio/")) {
            type = "audio";
          }

          setAttachments(prev => [...prev, { url: fullUrl, name: file.name, type }]);
        } else {
          setSendError(t("unifiedInbox.uploadFailed"));
          setTimeout(() => setSendError(null), 5000);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setSendError(t("unifiedInbox.uploadFailed"));
        setTimeout(() => setSendError(null), 5000);
      } finally {
        setUploadingFile(false);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
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
            content: "",
            platform: selectedConversation.platform,
            type: att.type,
            mediaUrl: att.url,
            mediaFileName: att.name,
          });
        }
      } else {
        for (const att of attachments) {
          payloads.push({
            content: "",
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

        if (selectedConversation.metadata?.["sessionId"]) {
          body.sessionId = selectedConversation.metadata["sessionId"];
        }
        if (selectedConversation.metadata?.["jid"]) {
          body.jid = selectedConversation.metadata["jid"];
        }

        const realId = selectedConversation.id;
        const response = await apiClient.post<ApiResponse<UnifiedMessage>>(
          `/api/v1/unified-inbox/conversations/${realId}/messages`,
          body,
        );

        if (response.data?.success) {
          sentMessages.push(response.data.data);
        }
      }

      if (sentMessages.length > 0) {
        setMessages((prev) => [...prev, ...sentMessages]);
        setNewMessage("");
        setAttachments([]);
        setReplyToMsg(null);
        setTimeout(() => scrollToBottom(), 100);

        const previewText = attachments.length > 0
          ? (attachments.every(a => a.type === "image")
              ? `📷 ${attachments.length}`
              : `📎 ${attachments.length}`)
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
        setSelectedConversation((prev) => prev ? { ...prev, aiEnabled: false } : null);
      }
    } catch (error: any) {
      console.error("❌ Error sending message:", error);
      const msg = error?.response?.data?.message || error?.message || t("unifiedInbox.sendFailed");
      setSendError(msg);
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  // ── Conversation quick actions ──
  const handleMarkResolved = useCallback(async () => {
    if (!selectedConversation) return;
    setShowActionsMenu(false);
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`, { status: "resolved" });
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
    } catch (err) {
      console.error("Error marking resolved:", err);
    }
  }, [selectedConversation]);

  const handleStatusChange = useCallback(async (status: ConversationStatus) => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`, { status });
      setConversations(prev =>
        prev.map(c => c.id === selectedConversation.id ? { ...c, status } : c)
      );
      setSelectedConversation(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      console.error("Error updating status:", err);
    }
  }, [selectedConversation]);

  const handleAssign = useCallback(async (userId: string | null, name?: string | null) => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`, {
        assignedTo: userId,
      });
      const assignee = userId ? { id: userId, name: name || "", avatar: null } : null;
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, assignedTo: assignee }
            : c
        )
      );
      setSelectedConversation(prev =>
        prev ? { ...prev, assignedTo: assignee } : null
      );
    } catch (err) {
      console.error("Error assigning conversation:", err);
    }
  }, [selectedConversation]);

  const handleMarkUnread = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`, {
        unreadCount: 1,
      });
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id ? { ...c, unreadCount: 1 } : c
        )
      );
    } catch (err) {
      console.error("Error marking unread:", err);
    }
  }, [selectedConversation]);

  const handleArchiveConversation = useCallback(async () => {
    if (!selectedConversation) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`, {
        archived: true,
      });
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
    } catch (err) {
      console.error("Error archiving conversation:", err);
    }
  }, [selectedConversation]);

  const handleBlockCustomer = useCallback(async () => {
    if (!selectedConversation) return;
    if (!window.confirm(t("unifiedInbox.blockConfirm", { defaultValue: "Are you sure you want to block this customer?" }))) return;
    try {
      await apiClient.put(`/api/v1/unified-inbox/customer/${selectedConversation.contactId}/block`);
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
    } catch (err) {
      console.error("Error blocking customer:", err);
    }
  }, [selectedConversation]);

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation) return;
    if (!window.confirm(t("unifiedInbox.deleteConfirm"))) return;
    setShowActionsMenu(false);
    try {
      await apiClient.delete(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`);
      setConversations(prev => prev.filter(c => c.id !== selectedConversation.id));
      setSelectedConversation(null);
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearchChange = (value: string) => {
    setLocalSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  };

  // Clear pending search timeout and abort in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      messagesAbortRef.current?.abort();
      profileAbortRef.current?.abort();
    };
  }, []);

  const handleQuickReplySelect = (reply: any) => {
    setNewMessage((prev) => prev ? prev + "\n" + (reply.content || "") : (reply.content || ""));
    
    if (reply.imageUrls && reply.imageUrls.length > 0) {
      const newAtts = reply.imageUrls.map((url: string) => ({
        url,
        name: url.split("/").pop() || "image",
        type: "image"
      }));
      setAttachments(prev => [...prev, ...newAtts]);
    }
    
    setShowQuickReplies(false);
  };

  // ──────────────────────────────────────────────────────────
  // 🔄 Effects
  // ──────────────────────────────────────────────────────────

  useEffect(() => {
    loadConversations();
    loadQuickReplies();
  }, [loadConversations, loadQuickReplies]);

  // Warn before closing if there's unsent message
  useEffect(() => {
    const hasUnsent = newMessage.trim().length > 0;
    if (!hasUnsent) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [newMessage.trim().length > 0]);

  useEffect(() => {
    socketService.connect();

    const handler = (message: any) => {
      if (
        selectedConversation &&
        message.conversationId === selectedConversation.id
      ) {
        setMessages((prev) => [...prev, message]);
        setTimeout(() => scrollToBottom(), 50);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: message.content,
                lastMessageTime: new Date().toISOString(),
                unreadCount: c.unreadCount + 1,
              }
            : c,
        ),
      );
    };

    socketHandlerRef.current = handler;
    socketService.onMessage(handler);

    const newConvHandler = (conversation: any) => {
      setConversations((prev) => {
        if (prev.some(c => c.id === conversation.id)) return prev;
        return [conversation, ...prev];
      });
    };
    newConvHandlerRef.current = newConvHandler;
    socketService.onNewConversation(newConvHandler);

    const findWaConv = (convs: UnifiedConversation[], sessionId: string, remoteJid: string) =>
      convs.find(c => c.platform === 'whatsapp' && c.metadata?.["sessionId"] === sessionId && c.metadata?.["jid"] === remoteJid);

    const waHandler = (payload: any) => {
      const { sessionId, message } = payload;
      if (!sessionId || !message?.remoteJid) return;

      setConversations((prev) => {
        const match = findWaConv(prev, sessionId, message.remoteJid);
        if (!match) return prev;
        return prev.map((c) =>
          c.id === match.id
            ? {
                ...c,
                lastMessage: message.content || '',
                lastMessageTime: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
                unreadCount: c.unreadCount + (message.fromMe ? 0 : 1),
                lastMessageIsFromCustomer: !message.fromMe,
              }
            : c,
        );
      });

      if (selectedConversation?.platform === 'whatsapp' &&
          selectedConversation.metadata?.["sessionId"] === sessionId &&
          selectedConversation.metadata?.["jid"] === message.remoteJid) {
        setMessages((prev) => {
          if (prev.some(m => m.messageId === message.messageId || m.id === message.id)) return prev;
          return [...prev, {
            id: message.id,
            platform: 'whatsapp',
            messageId: message.messageId,
            content: message.content || '',
            type: (message.messageType || 'TEXT').toLowerCase(),
            isFromCustomer: !message.fromMe,
            timestamp: message.timestamp,
            status: (message.status || 'sent').toLowerCase(),
            mediaUrl: message.mediaUrl || null,
            mediaType: message.mediaType || null,
            mediaFileName: message.mediaFileName || null,
            quotedMessage: message.quotedContent ? { id: message.quotedMessageId, content: message.quotedContent } : null,
            isAIResponse: message.isAIResponse || false,
            sender: message.fromMe ? 'agent' : 'customer',
            interactiveData: message.interactiveData || null,
          }];
        });
        setTimeout(() => scrollToBottom(), 50);
      }
    };

    waSocketHandlerRef.current = waHandler;
    socketService.on("whatsapp:message:new", waHandler);
    socketService.on("whatsapp:message:sent", waHandler);

    const aiStatusHandler = (data: { conversationId: string; aiEnabled: boolean }) => {
      if (!data?.conversationId) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId || c.metadata?.["conversationId"] === data.conversationId
            ? { ...c, aiEnabled: data.aiEnabled }
            : c,
        ),
      );
      setSelectedConversation((prev) =>
        prev && (prev.id === data.conversationId || prev.metadata?.["conversationId"] === data.conversationId)
          ? { ...prev, aiEnabled: data.aiEnabled }
          : prev,
      );
    };
    socketService.on("conversation:ai_status_changed", aiStatusHandler);

    return () => {
      if (socketHandlerRef.current) {
        socketService.off("new_message", socketHandlerRef.current);
        socketHandlerRef.current = null;
      }
      if (newConvHandlerRef.current) {
        socketService.off("conversation:new", newConvHandlerRef.current);
        newConvHandlerRef.current = null;
      }
      if (waSocketHandlerRef.current) {
        socketService.off("whatsapp:message:new", waSocketHandlerRef.current);
        socketService.off("whatsapp:message:sent", waSocketHandlerRef.current);
        waSocketHandlerRef.current = null;
      }
      socketService.off("conversation:ai_status_changed", aiStatusHandler);
    };
  }, [selectedConversation]);

  // ──────────────────────────────────────────────────────────
  // 🎨 Helpers
  // ──────────────────────────────────────────────────────────

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const locale = i18n.language === "ar" ? "ar-EG" : "en-US";

    if (days === 0) {
      return date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (days === 1) return t("unifiedInbox.yesterday");
    if (days < 7) return date.toLocaleDateString(locale, { weekday: "short" });
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  };

  const getPlatformBadge = (platform: string) => {
    const style =
      (platformStyles as any)[platform] || platformStyles["facebook"];
    return (
      <span className="business-platform-indicator" data-platform={platform}>
        <span className={isRtl ? "ml-1" : "mr-1"}>{style.icon}</span>
        {t(`unifiedInbox.platforms.${platform}`, { defaultValue: style.label })}
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🖼️ RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const isCommentsActive = activeTab === 'fb-comments' || activeTab === 'ig-comments';

  return (
    <>
      <div className="flex flex-col h-full w-full bg-background" dir={isRtl ? "rtl" : "ltr"} style={{ background: "var(--color-background)" }}>
        {/* 1. Global Header */}
      <div className="unified-inbox-header px-5 pt-4 pb-3 border-b shrink-0" style={{ borderColor: 'var(--business-muted-line)', background: 'var(--business-surface-panel)' }}>
        <h1 className="text-[22px] font-bold mb-1" style={{ color: 'var(--color-foreground)' }}>{t("unifiedInbox.pageTitle", "البريد الوارد")}</h1>

        {/* Platform Dropdown + Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Platform pills — integrated + comments */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => { setSelectedPlatforms([]); setActiveTab("all"); }}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ borderRadius: "999px", padding: "0.3rem 0.85rem" }}
              data-active={selectedPlatforms.length === 0 && activeTab === "all"}
            >
              {t("unifiedInbox.filters.allPlatforms", "كل المنصات")}
            </button>
            <button
              onClick={() => { setSelectedPlatforms(["facebook"]); setActiveTab("all"); }}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ borderRadius: "999px", padding: "0.3rem 0.85rem" }}
              data-active={selectedPlatforms.length === 1 && selectedPlatforms[0] === "facebook" && activeTab === "all"}
            >
              Messenger
            </button>
            <button
              onClick={() => { setSelectedPlatforms(["instagram"]); setActiveTab("all"); }}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ borderRadius: "999px", padding: "0.3rem 0.85rem" }}
              data-active={selectedPlatforms.length === 1 && selectedPlatforms[0] === "instagram" && activeTab === "all"}
            >
              Instagram
            </button>
            <button
              onClick={() => { setSelectedPlatforms(["whatsapp"]); setActiveTab("all"); }}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ borderRadius: "999px", padding: "0.3rem 0.85rem" }}
              data-active={selectedPlatforms.length === 1 && selectedPlatforms[0] === "whatsapp" && activeTab === "all"}
            >
              {t("unifiedInbox.tabs.whatsapp", "واتساب")}
            </button>

            <div className="w-px h-5" style={{ background: 'var(--business-card-border)' }} />

            <button
              onClick={() => { setActiveTab("fb-comments"); setSelectedPlatforms([]); }}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ borderRadius: "999px", padding: "0.3rem 0.85rem" }}
              data-active={activeTab === "fb-comments"}
            >
              {t("unifiedInbox.tabs.fbComments", "تعليقات فيسبوك")}
            </button>
            <button
              onClick={() => { setActiveTab("ig-comments"); setSelectedPlatforms([]); }}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ borderRadius: "999px", padding: "0.3rem 0.85rem" }}
              data-active={activeTab === "ig-comments"}
            >
              {t("unifiedInbox.tabs.igComments", "تعليقات Instagram")}
            </button>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2 mr-auto">
            <button
              type="button"
              onClick={handleRefresh}
              className="inbox-filter-chip"
              aria-label={t("unifiedInbox.refresh")}
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setSelectMode(prev => !prev)}
              className="inbox-filter-chip"
              data-active={selectMode ? "true" : "false"}
              aria-label={t("unifiedInbox.select")}
            >
              <CheckIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {isCommentsActive ? (
          <div className="absolute inset-0 overflow-hidden bg-slate-50 dark:bg-slate-900 p-2">
            {/* ponytail: PostsManagement.jsx infers defaultPlatform as null from its default value */}
            <PostsManagement embedded defaultPlatform={(activeTab === 'fb-comments' ? 'facebook' : 'instagram') as any} />
          </div>
        ) : (
          <div className={`business-inbox-shell w-full ${selectedConversation ? 'business-inbox-shell--conversation-active' : ''}`}>
            <div className="business-inbox-stage">
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* COLUMN 1 — Conversation List */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <div className="business-inbox-column business-inbox-column--list">
                {/* Header */}
                <div className="business-inbox-header">
                  {/* Search */}
                  <div className="business-inbox-search-wrap mb-3">
              <MagnifyingGlassIcon
                className={`business-inbox-search-icon ${isRtl ? "right-3 left-auto" : "left-3 right-auto"}`}
              />
              <input
                type="text"
                id="inbox-search"
                name="inbox-search"
                placeholder={t("unifiedInbox.searchPlaceholder")}
                aria-label={t("unifiedInbox.searchPlaceholder")}
                value={localSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`business-inbox-search ${isRtl ? "pr-9 pl-4" : "pl-9 pr-4 text-left"}`}
                autoComplete="off"
              />
            </div>

            {/* Filter chips under search */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="inbox-filter-chip text-xs"
                style={{ borderRadius: "999px", padding: "0.25rem 0.75rem" }}
                data-active={activeFilter === 'all'}
              >
                {t("unifiedInbox.filters.all")}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('unread')}
                className="inbox-filter-chip text-xs"
                style={{ borderRadius: "999px", padding: "0.25rem 0.75rem" }}
                data-active={activeFilter === 'unread'}
              >
                {t("unifiedInbox.filters.unread")}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('followUp')}
                className="inbox-filter-chip text-xs"
                style={{ borderRadius: "999px", padding: "0.25rem 0.75rem" }}
                data-active={activeFilter === 'followUp'}
              >
                {t("unifiedInbox.filters.followUp")}
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedConvIds.size > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                background: "color-mix(in srgb, var(--color-primary) 8%, var(--color-background))",
                borderBottom: "1px solid var(--business-card-border)",
              }}
            >
              <span className="text-xs font-medium" style={{ color: "var(--color-foreground)" }}>
                {selectedConvIds.size} {t("unifiedInbox.selected")}
              </span>
              <button
                type="button"
                onClick={() => handleBulkUpdate("resolved")}
                className="inbox-filter-chip text-xs"
                style={{ padding: "0.25rem 0.6rem" }}
              >
                {t("unifiedInbox.markAsResolved")}
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inbox-filter-chip text-xs"
                style={{ padding: "0.25rem 0.6rem" }}
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Conversation List */}
          <div
            className={`flex-1 overflow-y-auto ${selectedConvIds.size > 0 ? "" : ""}`}
            onScroll={handleConversationListScroll}
          >
            {loading ? (
              <div className="business-inbox-empty h-40">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                      borderTopColor: "transparent",
                    }}
                  />
                  <span className="text-sm">{t("unifiedInbox.loading")}</span>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="business-inbox-empty h-40">
                <ChatBubbleLeftRightIcon
                  className="w-12 h-12"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-primary) 24%, var(--color-muted-foreground))",
                  }}
                />
                <p className="text-sm">{t("unifiedInbox.noConversations")}</p>
              </div>
            ) : (
              <>
                {conversations.map((conv) => {
                  const isSelected = selectedConvIds.has(conv.id);
                  return (
                    <button
                      key={conv.id}
                      onClick={(e) => {
                        if (selectMode) {
                          e.preventDefault();
                          toggleSelectConv(conv.id);
                          return;
                        }
                        selectConversation(conv);
                      }}
                      className="business-conversation-card w-full text-left"
                      data-state={
                        isSelected
                          ? "selected"
                          : selectedConversation?.id === conv.id
                            ? "selected"
                            : conv.unreadCount > 0
                              ? "attention"
                              : "idle"
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          {selectMode && (
                            <div
                              className="absolute inset-0 z-10 flex items-center justify-center"
                              style={{
                                background: isSelected
                                  ? "color-mix(in srgb, var(--color-primary) 20%, transparent)"
                                  : "color-mix(in srgb, var(--color-background) 70%, transparent)",
                                borderRadius: "999px",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectConv(conv.id);
                              }}
                            >
                              <div
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                  isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-gray-400"
                                }`}
                              >
                                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                              </div>
                            </div>
                          )}
                          {conv.contactAvatar ? (
                            <img
                              src={conv.contactAvatar}
                              alt={conv.contactName}
                              className="business-conversation-avatar"
                              width={40}
                              height={40}
                              style={{ opacity: selectMode && isSelected ? 0.7 : 1 }}
                            />
                          ) : (
                            <div className="business-conversation-fallback" style={{ opacity: selectMode && isSelected ? 0.7 : 1 }}>
                              {conv.contactName?.charAt(0) || "?"}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 text-xs ${isRtl ? "-left-0.5" : "-right-0.5"}`}
                          >
                            {platformStyles[conv.platform]?.icon || "💬"}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center justify-between mb-0.5 gap-2`}>
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <h3
                                className={`font-semibold text-sm truncate ${isRtl ? "text-right" : "text-left"}`}
                                style={{ color: "var(--color-foreground)" }}
                                translate="no"
                              >
                                {conv.contactName || t("unifiedInbox.unknown")}
                              </h3>
                              {conv.lastOrderNumber && (
                                <span
                                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                                  style={{
                                    background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-background))",
                                    color: "var(--color-primary)",
                                    border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
                                  }}
                                  title={t("unifiedInbox.lastOrder", { id: conv.lastOrderNumber })}
                                >
                                  #{conv.lastOrderNumber}
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[11px] flex-shrink-0 ${isRtl ? "mr-2" : "ml-2"}`}
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              {formatTime(conv.lastMessageTime)}
                            </span>
                          </div>

                          <p
                            className={`text-xs truncate leading-5 ${isRtl ? "text-right" : "text-left"}`}
                            style={{ color: "var(--color-muted-foreground)" }}
                            translate="no"
                          >
                            {conv.lastMessageIsFromCustomer
                              ? ""
                              : t("unifiedInbox.you")}
                            {conv.lastMessage || t("unifiedInbox.noMessages")}
                          </p>

                          <div className="flex items-center justify-between mt-1">
                            {getPlatformBadge(conv.platform)}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleConvStar(conv.id, conv.isPinned);
                                }}
                                className="p-0.5 rounded hover:opacity-80 transition-opacity"
                                aria-label={conv.isPinned ? t("unifiedInbox.unstar") : t("unifiedInbox.star")}
                              >
                                {conv.isPinned ? (
                                  <StarSolidIcon
                                    className="w-3.5 h-3.5"
                                    style={{ color: "var(--business-warning)" }}
                                  />
                                ) : (
                                  <StarOutlineIcon
                                    className="w-3.5 h-3.5"
                                    style={{ color: "var(--color-muted-foreground)" }}
                                  />
                                )}
                              </button>
                              {conv.unreadCount > 0 && (
                                <span
                                  className="text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 text-white"
                                  style={{ background: "var(--business-danger)" }}
                                >
                                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
                      style={{
                        borderColor: "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                        borderTopColor: "transparent",
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COLUMN 2 — Chat Area */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="business-inbox-column flex-1">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="business-inbox-header">
                <div className="business-inbox-header-row">
                  <div className="flex items-center gap-1 sm:gap-3">
                    {/* Mobile back button */}
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden business-chip-button shrink-0"
                      aria-label={t("unifiedInbox.backToList", "رجوع")}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isRtl ? 'scaleX(-1)' : 'none' }}>
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <div className="relative">
                      {selectedConversation.contactAvatar ? (
                        <img
                          src={selectedConversation.contactAvatar}
                          alt=""
                          className="business-conversation-avatar !w-10 !h-10"
                          width={40}
                          height={40}
                        />
                      ) : (
                        <div className="business-conversation-fallback !w-10 !h-10">
                          {selectedConversation.contactName?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3
                          className="font-semibold text-sm"
                          style={{ color: "var(--color-foreground)" }}
                          translate="no"
                        >
                          {selectedConversation.contactName}
                        </h3>
                        {selectedConversation.lastOrderNumber && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                            style={{
                              background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-background))",
                              color: "var(--color-primary)",
                              border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
                            }}
                            title={`${t("unifiedInbox.orders")}: #${selectedConversation.lastOrderNumber}`}
                          >
                            #{selectedConversation.lastOrderNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getPlatformBadge(selectedConversation.platform)}
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {t(`unifiedInbox.status.${selectedConversation.status.toLowerCase()}`, {
                            defaultValue: selectedConversation.status
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleToggleAi}
                      className="business-chip-button"
                      style={{
                        background: selectedConversation.aiEnabled !== false ? "color-mix(in srgb, var(--color-primary) 12%, var(--color-background))" : "none",
                        color: selectedConversation.aiEnabled !== false ? "var(--color-primary)" : "var(--color-muted-foreground)",
                      }}
                      title={selectedConversation.aiEnabled !== false ? t("unifiedInbox.aiToggleOn", "الرد الذكي مفعّل (اضغط للإيقاف)") : t("unifiedInbox.aiToggleOff", "الرد الذكي متوقف (تدخل بشري - اضغط لإعادة التفعيل)")}
                    >
                      <span className="text-base font-bold">🤖</span>
                    </button>
                    <button
                      onClick={() => setShowQuickOrder(true)}
                      className="business-chip-button"
                      aria-label={t("unifiedInbox.quickOrder")}
                    >
                      <ShoppingCartIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setShowProfilePanel(!showProfilePanel)}
                      className="business-chip-button"
                      data-active={showProfilePanel ? "true" : "false"}
                      aria-label={t("unifiedInbox.profile")}
                    >
                      <UserCircleIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <div className="relative" ref={actionsMenuRef}>
                      <button
                        className="business-chip-button"
                        onClick={() => setShowActionsMenu(prev => !prev)}
                        aria-label={t("unifiedInbox.options")}
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" aria-hidden="true" />
                      </button>
                      {showActionsMenu && (
                        <div
                          className="inbox-platform-dropdown"
                          style={{
                            top: "calc(100% + 6px)",
                            [isRtl ? "left" : "right"]: 0,
                            left: isRtl ? 0 : "auto",
                            right: isRtl ? "auto" : 0,
                            minWidth: 180,
                            zIndex: 200,
                          }}
                        >
                          <button
                            className="inbox-dropdown-item w-full"
                            onClick={handleMarkResolved}
                          >
                            <CheckIcon className="w-4 h-4" style={{ color: "var(--business-success)" }} aria-hidden="true" />
                            <span className="inbox-platform-text">
                              {t("unifiedInbox.markAsResolved")}
                            </span>
                          </button>
                          <button
                            className="inbox-dropdown-item w-full"
                            onClick={handleTogglePriority}
                          >
                            <StarSolidIcon className="w-4 h-4" style={{ color: selectedConversation?.isPinned ? "var(--business-warning)" : "var(--color-muted-foreground)" }} />
                            <span className="inbox-platform-text">
                              {selectedConversation?.isPinned ? t("unifiedInbox.unstar") : t("unifiedInbox.star")}
                            </span>
                          </button>
                          <button
                            className="inbox-dropdown-item w-full"
                            onClick={handleCopyConversationLink}
                          >
                            <LinkIcon className="w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
                            <span className="inbox-platform-text">
                              {t("unifiedInbox.copyLink")}
                            </span>
                          </button>
                          <button
                            className="inbox-dropdown-item w-full"
                            onClick={() => setShowSnoozePicker(true)}
                          >
                            <BellSnoozeIcon className="w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
                            <span className="inbox-platform-text">
                              {t("unifiedInbox.snooze")}
                            </span>
                          </button>
                          <button
                            className="inbox-dropdown-item w-full"
                            onClick={() => { setShowActionsMenu(false); setShowProfilePanel(p => !p); }}
                          >
                            <UserCircleIcon className="w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} aria-hidden="true" />
                            <span className="inbox-platform-text">
                              {showProfilePanel ? t("unifiedInbox.hideProfile") : t("unifiedInbox.showProfile")}
                            </span>
                          </button>
                          <div style={{ height: 1, background: "var(--business-card-border)", margin: "4px 8px" }} />
                          <button
                            className="inbox-dropdown-item w-full"
                            onClick={handleDeleteConversation}
                            style={{ color: "var(--business-danger, #ef4444)" }}
                          >
                            <TrashIcon className="w-4 h-4" aria-hidden="true" />
                            <span className="inbox-platform-text">
                              {t("unifiedInbox.deleteConversation")}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Snooze Picker */}
              {showSnoozePicker && (
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-xl p-4"
                  style={{
                    background: "var(--business-surface-panel)",
                    border: "1px solid var(--business-card-border)",
                    minWidth: 200,
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
                      {t("unifiedInbox.snooze")}
                    </span>
                    <button onClick={() => setShowSnoozePicker(false)} className="business-chip-button" aria-label={t("unifiedInbox.close")}>
                      <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1">
                    {[
                      { label: t("unifiedInbox.snooze1h"), ms: 60 * 60 * 1000 },
                      { label: t("unifiedInbox.snooze3h"), ms: 3 * 60 * 60 * 1000 },
                      { label: t("unifiedInbox.snoozeTomorrow"), ms: 24 * 60 * 60 * 1000 },
                      { label: t("unifiedInbox.snoozeWeek"), ms: 7 * 24 * 60 * 60 * 1000 },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        className="inbox-dropdown-item"
                        onClick={() => handleSnooze(new Date(Date.now() + opt.ms))}
                      >
                        <BellSnoozeIcon className="w-4 h-4" style={{ color: "var(--color-muted-foreground)" }} />
                        <span className="inbox-platform-text">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div
                ref={messagesContainerRef}
                className="business-chat-stage flex-1 overflow-y-auto p-5"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 25px 25px, color-mix(in srgb, var(--color-primary) 4%, transparent) 2%, transparent 0%)",
                  backgroundSize: "50px 50px",
                }}
              >
                {loadingMessages ? (
                  <div className="business-inbox-empty h-full">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                        borderTopColor: "transparent",
                      }}
                    />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="business-inbox-empty h-full">
                    <ChatBubbleLeftRightIcon
                      className="w-16 h-16 mb-3"
                      style={{
                        color:
                          "color-mix(in srgb, var(--color-primary) 18%, var(--color-muted-foreground))",
                      }}
                    />
                    <p className="text-sm">{t("unifiedInbox.noMessagesYet")}</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {messages.map((msg, index) => {
                      const showTimeSeparator =
                        index === 0 ||
                        (() => {
                          const prevMsg = messages[index - 1];
                          if (!prevMsg) return false;
                          const prev = new Date(prevMsg.timestamp);
                          const curr = new Date(msg.timestamp);
                          return (
                            curr.getTime() - prev.getTime() > 30 * 60 * 1000
                          );
                        })();

                      return (
                        <React.Fragment key={msg.id}>
                          {showTimeSeparator && (
                            <div className="flex items-center justify-center my-4">
                              <div
                                className="business-time-separator text-[11px] px-3 py-1 rounded-full"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-foreground) 6%, var(--color-background))",
                                  border: "1px solid var(--business-card-border)",
                                  color: "var(--color-muted-foreground)",
                                }}
                              >
                                {new Date(msg.timestamp).toLocaleDateString(
                                  i18n.language === "ar" ? "ar-EG" : "en-US",
                                  {
                                    weekday: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </div>
                            </div>
                          )}

                          <div
                            className={`flex items-start gap-1 group ${msg.isFromCustomer ? "justify-start" : "justify-end flex-row-reverse"}`}
                            onMouseEnter={() => setHoveredMsgId(msg.id)}
                            onMouseLeave={() => setHoveredMsgId(null)}
                          >
                            {/* Action buttons on hover */}
                            {hoveredMsgId === msg.id && (
                              <div
                                className={`business-msg-actions flex items-center gap-0.5 py-1 px-1.5 rounded-full shadow-sm backdrop-blur-sm ${isRtl ? "order-first" : ""}`}
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-background) 92%, var(--shell-control-bg) 8%)",
                                  border: "1px solid var(--business-card-border)",
                                }}
                              >
                                {msg.isFromCustomer && (
                                  <button
                                    onClick={() => handleMsgReply(msg)}
                                    className="business-icon-button business-icon-button--sm business-msg-action-btn"
                                    aria-label={t("unifiedInbox.reply")}
                                  >
                                    <ArrowUturnLeftIcon className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleMsgReact(msg.id, "👍")}
                                  className="business-icon-button business-icon-button--sm business-msg-action-btn"
                                  aria-label={t("unifiedInbox.addReaction")}
                                >
                                  <HeartIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                  onClick={() => handleMsgStar(msg.id)}
                                  className="business-icon-button business-icon-button--sm business-msg-action-btn"
                                  aria-label={t("unifiedInbox.starMessage")}
                                >
                                  <StarOutlineIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                  onClick={() => { setForwardMessage(msg); setShowForwardModal(true); }}
                                  className="business-icon-button business-icon-button--sm business-msg-action-btn"
                                  aria-label={t("unifiedInbox.forward")}
                                >
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                                {!msg.isFromCustomer && (
                                  <button
                                    onClick={() => handleMsgDelete(msg.id)}
                                    className="business-icon-button business-icon-button--sm business-msg-action-btn"
                                    aria-label={t("unifiedInbox.deleteMessage")}
                                    style={{ color: "var(--business-danger)" }}
                                  >
                                    <TrashIcon className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            )}

                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm business-message-bubble ${
                                msg.isFromCustomer
                                  ? "business-message-bubble--incoming"
                                  : "business-message-bubble--outgoing"
                              }`}
                              style={
                                msg.isFromCustomer
                                  ? {
                                      background:
                                        "var(--business-message-incoming-bg)",
                                      border:
                                        "1px solid var(--business-message-incoming-border)",
                                      borderTopRightRadius: "0.5rem",
                                    }
                                  : {
                                      background: "var(--color-primary)",
                                      color: "white",
                                      borderTopLeftRadius: "0.5rem",
                                    }
                              }
                            >
                              {/* Quoted message */}
                              {msg.quotedMessage && (
                                <div
                                  className="border-r-2 pr-2 mb-1.5 text-xs opacity-70"
                                  style={{
                                    borderColor: msg.isFromCustomer
                                      ? "color-mix(in srgb, var(--color-muted-foreground) 40%, transparent)"
                                      : "rgba(232, 243, 255, 0.45)",
                                  }}
                                >
                                  {msg.quotedMessage.content?.substring(0, 80)}
                                </div>
                              )}

                              {/* Media from attachments or mediaUrl */}
                              {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
                                <div className="mb-2 flex flex-col gap-2">
                                  {msg.attachments.map((att, idx) => {
                                    const rawAttUrl = att.url || "";
                                    const attUrl = getInboxMessageMediaUrl(msg.id, rawAttUrl, {
                                      attachmentIndex: att.attachmentIndex ?? idx,
                                    });
                                    const isAttImage =
                                      att.type?.toLowerCase().includes("image") ||
                                      /\.(jpe?g|png|webp|gif)/i.test(rawAttUrl) ||
                                      /\.(jpe?g|png|webp|gif)/i.test(attUrl);
                                    if (isAttImage && (attUrl || rawAttUrl)) {
                                      return (
                                        <img
                                          key={`${rawAttUrl || attUrl}-${idx}`}
                                          src={attUrl || rawAttUrl}
                                          alt=""
                                          loading="lazy"
                                          className="rounded-lg max-w-full mb-1 cursor-pointer hover:opacity-90"
                                          style={{ maxHeight: "300px" }}
                                          onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            if (target.dataset.retried) return;
                                            target.dataset.retried = "true";
                                            if (msg.id) {
                                              target.src = buildProxyImageUrl(null, {
                                                messageId: msg.id,
                                                attachmentIndex: att.attachmentIndex ?? idx,
                                              });
                                            }
                                          }}
                                        />
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              ) : msg.mediaUrl ? (() => {
                                const isImage = msg.type === "image" || msg.mediaType?.includes("image");
                                const isVideo = msg.type === "video" || msg.mediaType?.includes("video");
                                const isAudio = msg.type === "audio" || msg.mediaType?.includes("audio");

                                if (isImage) {
                                  const mediaSrc = getInboxMessageMediaUrl(msg.id, msg.mediaUrl, {
                                    attachmentIndex: 0,
                                  });
                                  return (
                                    <img
                                      src={mediaSrc}
                                      alt=""
                                      className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90"
                                      onError={(e) => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        if (target.dataset.retried) return;
                                        target.dataset.retried = "true";
                                        if (msg.id) {
                                          target.src = buildProxyImageUrl(null, {
                                            messageId: msg.id,
                                            attachmentIndex: 0,
                                          });
                                        }
                                      }}
                                    />
                                  );
                                }

                                if (isVideo) {
                                  const mediaSrc = getInboxMessageMediaUrl(msg.id, msg.mediaUrl, {
                                    attachmentIndex: 0,
                                  });
                                  return (
                                    <video
                                      src={mediaSrc}
                                      controls
                                      className="rounded-lg max-w-full mb-1.5"
                                      style={{ maxHeight: "300px" }}
                                    >
                                      {t("unifiedInbox.videoNotSupported")}
                                    </video>
                                  );
                                }

                                if (isAudio) {
                                  const mediaSrc = getInboxMessageMediaUrl(msg.id, msg.mediaUrl, {
                                    attachmentIndex: 0,
                                  });
                                  return (
                                    <audio
                                      src={mediaSrc}
                                      controls
                                      className="w-full mb-1.5"
                                      style={{ minWidth: "200px" }}
                                    />
                                  );
                                }

                                const downloadSrc = getInboxMessageMediaUrl(msg.id, msg.mediaUrl, {
                                  attachmentIndex: 0,
                                });
                                return (
                                  <a
                                    href={downloadSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 rounded-lg mb-1.5 p-2 border"
                                    style={{
                                      borderColor: "var(--business-card-border)",
                                      background: "color-mix(in srgb, var(--color-primary) 5%, var(--color-background))",
                                    }}
                                  >
                                    <PaperClipIcon className="w-5 h-5 shrink-0" style={{ color: "var(--color-primary)" }} />
                                    <span className="text-sm truncate" style={{ color: "var(--color-foreground)" }}>
                                      {msg.mediaFileName || msg.mediaUrl.split("/").pop() || t("unifiedInbox.mediaAttachment")}
                                    </span>
                                    <span className="text-xs shrink-0" style={{ color: "var(--color-muted-foreground)" }}>⬇️</span>
                                  </a>
                                );
                              })() : null}

                              {/* Media from content URL */}
                              {(() => {
                                if (msg.mediaUrl) return null;
                                if (!msg.content || !msg.content.startsWith("http")) return null;
                                const url = msg.content.split(/[\s\n]/)[0] || "";
                                const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url) || url.includes("fbcdn") || url.includes("cdninstagram") || url.includes("fbsbx");
                                const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
                                const isAudio = /\.(mp3|wav|ogg|aac|m4a|opus)(\?|$)/i.test(url);

                                if (isImage) {
                                  const mediaSrc = getInboxMessageMediaUrl(msg.id, url, { attachmentIndex: 0 });
                                  return (
                                    <img
                                      src={mediaSrc}
                                      alt=""
                                      className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90"
                                      loading="lazy"
                                      onError={(e) => {
                                        const target = e.currentTarget as HTMLImageElement;
                                        if (target.dataset.retried) {
                                          target.style.display = "none";
                                          return;
                                        }
                                        target.dataset.retried = "true";
                                        if (msg.id) {
                                          target.src = buildProxyImageUrl(null, {
                                            messageId: msg.id,
                                            attachmentIndex: 0,
                                          });
                                        } else {
                                          target.style.display = "none";
                                        }
                                      }}
                                    />
                                  );
                                }

                                if (isVideo) {
                                  const mediaSrc = getInboxMessageMediaUrl(msg.id, url, { attachmentIndex: 0 });
                                  return (
                                    <video
                                      src={mediaSrc}
                                      controls
                                      className="rounded-lg max-w-full mb-1.5"
                                      style={{ maxHeight: "300px" }}
                                    >
                                      {t("unifiedInbox.videoNotSupported")}
                                    </video>
                                  );
                                }

                                if (isAudio) {
                                  const mediaSrc = getInboxMessageMediaUrl(msg.id, url, { attachmentIndex: 0 });
                                  return (
                                    <audio
                                      src={mediaSrc}
                                      controls
                                      className="w-full mb-1.5"
                                      style={{ minWidth: "200px" }}
                                    />
                                  );
                                }

                                return null;
                              })()}

                              {/* Text content (hide if it's a media URL shown above) */}
                              {msg.content && !(msg.content.startsWith("http") && (msg.content.includes("fbcdn") || msg.content.includes("cdninstagram") || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(msg.content.split(/[\s\n]/)[0] || ""))) && (
                                <p
                                  className="text-sm leading-relaxed whitespace-pre-wrap"
                                  style={{
                                    color: msg.isFromCustomer
                                      ? "var(--color-foreground)"
                                      : "white",
                                  }}
                                  translate="no"
                                >
                                  {msg.content}
                                </p>
                              )}

                              {/* Timestamp + status */}
                              <div
                                className="flex items-center gap-1.5 mt-1"
                                style={{
                                  color: msg.isFromCustomer
                                    ? "var(--color-muted-foreground)"
                                    : "rgba(225, 238, 250, 0.82)",
                                }}
                              >
                                <span className="text-[10px]">
                                  {new Date(msg.timestamp).toLocaleTimeString(
                                    i18n.language === "ar" ? "ar-EG" : "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                                {!msg.isFromCustomer && (
                                  <span className="text-[10px]">
                                    {msg.status === "read"
                                      ? <span style={{ color: "#53bdeb" }}>✓✓</span>
                                      : msg.status === "delivered"
                                        ? "✓✓"
                                        : msg.status === "sending"
                                          ? <ClockIcon className="w-3 h-3 inline" />
                                          : "✓"}
                                  </span>
                                )}
                              </div>

                              {/* AI message badge + correction button */}
                              {!msg.isFromCustomer && (msg.isAIResponse || !msg.sender || msg.sender === 'ai') && (
                                <div className="mt-2 pt-1.5 flex justify-between items-center text-[10px]" style={{ borderTop: '1px solid rgba(225, 238, 250, 0.2)' }}>
                                  <span style={{ color: 'rgba(225, 238, 250, 0.7)' }}>{t("unifiedInbox.correctionBadge")}</span>
                                  {editingMessageId !== msg.id && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMessageId(msg.id);
                                        setCorrectionText(msg.content || '');
                                      }}
                                      className="hover:underline font-medium cursor-pointer"
                                      style={{ color: 'white' }}
                                    >
                                      {t("unifiedInbox.correctionButton")}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Correction textarea (shown below the bubble) */}
                            {editingMessageId === msg.id && (
                              <div className={`flex ${msg.isFromCustomer ? 'justify-start' : 'justify-end'}`}>
                                <div className="max-w-[75%] rounded-xl p-3 space-y-2" style={{ background: 'var(--color-muted)', border: '1px solid var(--business-card-border)' }}>
                                  <div className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>{t("unifiedInbox.correctionTitle")}</div>
                                  <textarea
                                    value={correctionText}
                                    onChange={(e) => setCorrectionText(e.target.value)}
                                    className="w-full min-h-[60px] p-2 text-sm rounded border outline-none resize-none"
                                    style={{ background: 'var(--color-background)', color: 'var(--color-foreground)', borderColor: 'var(--business-card-border)' }}
                                    placeholder={String(t("unifiedInbox.correctionPlaceholder"))}
                                  />
                                  <div className="flex justify-end gap-2 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => { setEditingMessageId(null); setCorrectionText(''); }}
                                      className="px-3 py-1.5 rounded font-medium"
                                      style={{ background: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}
                                    >
                                      {t("unifiedInbox.correctionCancel")}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => submitCorrection(msg.id)}
                                      disabled={savingCorrection || !correctionText.trim()}
                                      className="px-3 py-1.5 rounded font-medium disabled:opacity-50"
                                      style={{ background: 'var(--color-primary)', color: 'white' }}
                                    >
                                      {savingCorrection ? t("unifiedInbox.correctionSaving") : t("unifiedInbox.correctionSave")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Send Error Banner */}
              {sendError && (
                <div
                  className="px-5 py-2 text-sm flex items-center gap-2"
                  style={{
                    borderTop: "1px solid var(--business-card-border)",
                    background: "color-mix(in srgb, var(--business-danger, #ef4444) 8%, var(--color-background))",
                    color: "var(--business-danger, #ef4444)",
                  }}
                >
                  <span>⚠️</span>
                  <span>{sendError}</span>
                  <button
                    onClick={() => setSendError(null)}
                    className="ml-auto"
                    style={{ color: "inherit", opacity: 0.7 }}
                    aria-label={t("unifiedInbox.dismiss")}
                  >
                    <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Quick Replies Panel */}
              {showQuickReplies && quickReplies.length === 0 && (
                <div className="business-chat-composer px-5 py-3 text-sm" style={{ color: "var(--color-muted-foreground)" }}>
                  {t("unifiedInbox.noQuickReplies")}
                </div>
              )}
              {showQuickReplies && quickReplies.length > 0 && (
                <div className="business-chat-composer max-h-40 overflow-y-auto">
                  <div className="p-3 space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {t("unifiedInbox.quickReplies")}
                      </span>
                  <button
                    onClick={() => setShowQuickReplies(false)}
                    className="business-chip-button"
                    aria-label={t("unifiedInbox.close")}
                  >
                    <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                    </div>
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReplySelect(reply)}
                        className={`w-full rounded-2xl border px-3 py-2 flex flex-col items-start gap-1 ${isRtl ? "text-right" : "text-left"} transition-colors hover:border-primary/40 hover:bg-primary/5`}
                        style={{
                          borderColor: "var(--business-card-border)",
                          background:
                            "var(--business-surface-panel, color-mix(in srgb, var(--color-foreground) 4%, var(--color-background)))",
                        }}
                      >
                        <span
                          className="font-medium"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {reply.title}
                        </span>
                          <span
                            className={isRtl ? "ml-2" : "mr-2"}
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                          — {reply.content.substring(0, 50)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachment Preview */}
              {attachments.length > 0 && (
                <div className="px-5 py-2 flex items-center gap-2 overflow-x-auto" style={{ borderTop: '1px solid var(--business-card-border)', background: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-background))' }}>
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2 shrink-0 border rounded-lg px-2 py-1.5" style={{ borderColor: 'var(--business-card-border)', background: 'var(--business-surface-panel)' }}>
                      {att.type === 'image' ? (
                        <img src={att.url} alt={att.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--color-primary) 15%, var(--color-background))' }}>
                          <PaperClipIcon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                        </div>
                      )}
                      <div className="min-w-0 max-w-[120px]">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--color-foreground)' }}>{att.name}</p>
                        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{att.type}</p>
                      </div>
                      <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="business-chip-button shrink-0" aria-label={t("unifiedInbox.removeFile")}>
                        <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}



              {/* Reply Preview */}
              {replyToMsg && (
                <div className="px-5 py-2 flex items-center gap-2" style={{ borderTop: '1px solid var(--business-card-border)', background: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-background))' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>
                      {t("unifiedInbox.replyingTo")}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                      {replyToMsg.content?.substring(0, 80) || t("unifiedInbox.mediaAttachment")}
                    </p>
                  </div>
                  <button onClick={handleCancelReply} className="business-chip-button shrink-0" aria-label={t("unifiedInbox.cancel")}>
                    <XMarkIcon className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {/* Message Input */}
              <div className="business-chat-composer px-5 py-3" style={{ position: 'relative' }}>
                {/* Emoji Picker — floats above composer, no layout shift */}
                {showEmojiPicker && (
                  <div
                    className="emoji-picker-popover"
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      insetInlineStart: 0,
                      zIndex: 200,
                      marginBottom: '4px',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <EmojiPicker
                      theme={isDarkMode ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                      onEmojiClick={(emojiData: any) => {
                        setNewMessage((prev: string) => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      width={320}
                      height={380}
                    />
                  </div>
                )}
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                />
                <div className="flex items-center gap-2">
                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                      aria-label={t("unifiedInbox.quickReplies")}
                    >
                      <ChatBubbleLeftRightIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setShowTextGallery(true)}
                      className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                      aria-label={t("unifiedInbox.savedTexts")}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </button>
                    <div className="relative" ref={attachmentMenuRef}>
                      <button
                        onClick={() => setShowAttachmentMenu(prev => !prev)}
                        className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                        aria-label={t("unifiedInbox.savedImages")}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </button>

                      {showAttachmentMenu && (
                        <div 
                          className="inbox-platform-dropdown animate-in fade-in slide-in-from-bottom-2"
                          style={{
                            top: "auto",
                            bottom: "calc(100% + 6px)",
                            [isRtl ? "left" : "right"]: "auto",
                            [isRtl ? "right" : "left"]: 0,
                            minWidth: 180,
                            zIndex: 200,
                          }}
                        >
                          <button
                            onClick={() => {
                              setShowAttachmentMenu(false);
                              setShowImageGallery(true);
                            }}
                            className="inbox-dropdown-item w-full"
                          >
                            <span className="inbox-platform-text">
                              {t("unifiedInbox.chooseExistingFile", "Choose existing file")}
                            </span>
                          </button>
                          <div style={{ borderTop: '1px solid var(--business-card-border)' }} />
                          <button
                            onClick={() => {
                              setShowAttachmentMenu(false);
                              fileInputRef.current?.click();
                            }}
                            className="inbox-dropdown-item w-full"
                          >
                            <span className="inbox-platform-text">
                              {t("unifiedInbox.upload", "Upload")}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${uploadingFile ? 'animate-pulse opacity-50' : ''}`}
                      aria-label={t("unifiedInbox.attachFile")}
                      disabled={uploadingFile}
                    >
                      <PaperClipIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${showEmojiPicker ? 'text-primary' : ''}`}
                      aria-label={t("unifiedInbox.emoji")}
                    >
                      <FaceSmileIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={uploadingFile ? t("unifiedInbox.uploading") : t("unifiedInbox.inputPlaceholder", {
                        platform: t(`unifiedInbox.platforms.${selectedConversation.platform}`, {
                          defaultValue: platformStyles[selectedConversation.platform]?.label || t("common.platform")
                        }),
                      })}
                      className="business-chat-input"
                      disabled={sending || uploadingFile}
                    />
                  </div>

                  {/* Send */}
                  <button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && attachments.length === 0) || sending || uploadingFile}
                    className="business-icon-button text-white p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    style={{
                      background: "var(--color-primary)",
                    }}
                    aria-label={t("unifiedInbox.send")}
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></div>
                    ) : (
                      <PaperAirplaneIcon className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="business-chat-stage flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div
                  className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-primary) 14%, var(--color-background))",
                  }}
                >
                  <ChatBubbleLeftRightIcon
                    className="w-12 h-12"
                    style={{ color: "var(--color-primary)" }}
                  />
                </div>
                <h2
                  className="text-xl font-bold mb-2"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {t("unifiedInbox.empty.header")}
                </h2>
                <p
                  className="text-sm leading-relaxed mb-6"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {t("unifiedInbox.empty.subheader")}
                  <br />
                  {t("unifiedInbox.empty.description")}
                </p>
                <div
                  className="flex items-center justify-center gap-6"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">💬</span>
                    <span className="text-xs">{t("unifiedInbox.platforms.facebook")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs">{t("unifiedInbox.platforms.instagram")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📱</span>
                    <span className="text-xs">{t("unifiedInbox.platforms.whatsapp")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">✈️</span>
                    <span className="text-xs">{t("unifiedInbox.platforms.telegram")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COLUMN 3 - Customer Profile Panel */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showProfilePanel && selectedConversation && (
          <div className="business-inbox-column business-inbox-column--profile overflow-y-auto">
            {/* Profile Header */}
            <div className="business-inbox-header text-center relative">
              <button
                onClick={() => setShowProfilePanel(false)}
                className={`absolute top-3 p-1 rounded business-chip-button ${isRtl ? "left-3" : "right-3"}`}
                aria-label={t("unifiedInbox.close")}
              >
                <XMarkIcon className="w-4 h-4" aria-hidden="true" />
              </button>

              <div className="relative inline-block mb-3">
                {selectedConversation.contactAvatar ? (
                  <img
                    src={selectedConversation.contactAvatar}
                    className="w-20 h-20 rounded-full object-cover border-2"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--color-primary) 30%, var(--color-background))",
                    }}
                    alt=""
                    width={80}
                    height={80}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2"
                    style={{
                      borderColor:
                        "color-mix(in srgb, var(--color-primary) 30%, var(--color-background))",
                      background: "var(--color-primary)",
                    }}
                  >
                    {selectedConversation.contactName?.charAt(0) || "?"}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 mb-1">
                <h3
                  className="font-bold text-lg"
                  style={{ color: "var(--color-foreground)" }}
                  translate="no"
                >
                  {customerProfile?.name || selectedConversation.contactName}
                </h3>
                {selectedConversation.lastOrderNumber && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                    style={{
                      background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-background))",
                      color: "var(--color-primary)",
                      border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
                    }}
                    title={`${t("unifiedInbox.orders")}: #${selectedConversation.lastOrderNumber}`}
                  >
                    #{selectedConversation.lastOrderNumber}
                  </span>
                )}
              </div>
              {getPlatformBadge(selectedConversation.platform)}
            </div>

            {/* Status & Assignment & Actions */}
            <div className="px-4 pb-4 border-b" style={{ borderColor: "var(--business-muted-line)" }}>
              <div className="mt-2 grid gap-1.5" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)" }}>
                <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-xl [&>div>button]:px-2 [&>div>button]:py-1.5 [&>div>button]:text-xs [&>div>button_span]:truncate">
                  <StatusDropdown
                    currentStatus={selectedConversation.status as ConversationStatus}
                    onStatusChange={handleStatusChange}
                    disabled={loadingProfile}
                  />
                </div>
                <div className="min-w-0 [&>div>button]:w-full [&>div>button]:justify-between [&>div>button]:overflow-hidden [&>div>button]:rounded-xl [&>div>button]:px-2 [&>div>button]:py-1.5 [&>div>button]:text-xs [&>div>button_span]:truncate">
                  <AssignmentDropdown
                    currentAssignee={selectedConversation.assignedTo?.id || null}
                    currentAssigneeName={selectedConversation.assignedTo?.name || undefined}
                    onAssign={handleAssign}
                    disabled={loadingProfile}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  onClick={handleMarkUnread}
                  className="business-icon-button rounded-full p-2.5 transition-colors border shadow-sm"
                  style={{
                    color: "var(--color-primary)",
                    background: "color-mix(in srgb, var(--color-primary) 10%, var(--color-background))",
                    borderColor: "color-mix(in srgb, var(--color-primary) 20%, transparent)",
                  }}
                  title={t("unifiedInbox.markUnread")}
                >
                  <EnvelopeIcon className="w-5 h-5 shrink-0" />
                </button>
                <button
                  onClick={handleArchiveConversation}
                  className="business-icon-button rounded-full p-2.5 transition-colors border shadow-sm"
                  style={{
                    color: "var(--business-warning)",
                    background: "color-mix(in srgb, var(--business-warning) 10%, var(--color-background))",
                    borderColor: "color-mix(in srgb, var(--business-warning) 20%, transparent)",
                  }}
                  title={t("unifiedInbox.archive")}
                >
                  <ArchiveBoxIcon className="w-5 h-5 shrink-0" />
                </button>
                <button
                  onClick={handleBlockCustomer}
                  className="business-icon-button rounded-full p-2.5 transition-colors border shadow-sm"
                  style={{
                    color: "var(--business-danger)",
                    background: "color-mix(in srgb, var(--business-danger) 10%, var(--color-background))",
                    borderColor: "color-mix(in srgb, var(--business-danger) 20%, transparent)",
                  }}
                  title={t("unifiedInbox.block")}
                >
                  <NoSymbolIcon className="w-5 h-5 shrink-0" />
                </button>
              </div>
            </div>

            {loadingProfile ? (
              <div className="business-inbox-empty py-10">
                <div
                  className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--color-primary) 24%, transparent)",
                    borderTopColor: "transparent",
                  }}
                />
              </div>
            ) : customerProfile ? (
              <>
                {/* Stats */}
                <div className="mt-4 px-4">
                  <div
                    className="grid grid-cols-2 overflow-hidden rounded-[20px] border bg-transparent text-center w-full"
                    style={{
                      borderColor: "var(--business-muted-line, var(--business-card-border))",
                    }}
                  >
                    <div className="flex-1 py-3 text-center">
                      <p className="mb-1 text-xs font-bold" style={{ color: "var(--color-muted-foreground)" }}>
                        {t("unifiedInbox.customer.orders", { defaultValue: "الطلبات" })}
                      </p>
                      <p
                        className="text-lg font-bold"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {customerProfile.totalOrders || 0}
                      </p>
                    </div>
                    <div
                      className="flex-1 py-3 text-center"
                      style={{ borderInlineStart: "1px solid var(--business-muted-line, var(--business-card-border))" }}
                    >
                      <p className="mb-1 text-xs font-bold" style={{ color: "var(--color-muted-foreground)" }}>
                        {t("unifiedInbox.customer.ltv", { defaultValue: "القيمة" })}
                      </p>
                      <p
                        className="flex items-baseline justify-center gap-1 text-lg font-bold"
                        style={{ color: "var(--business-success)" }}
                      >
                        {customerProfile.ltv?.toLocaleString() || 0} <span className="text-xs font-medium">{t("unifiedInbox.egp", { defaultValue: "ج.م" })}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="business-inbox-tabs mx-4 mt-4">
                  <button
                    onClick={() => setProfileActiveTab("timeline")}
                    className="business-inbox-tab"
                    data-active={profileActiveTab === "timeline"}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Activity size={16} /> {t("unifiedInbox.activity", { defaultValue: "نشاط" })}
                    </span>
                  </button>
                  <button
                    onClick={() => setProfileActiveTab("orders")}
                    className="business-inbox-tab"
                    data-active={profileActiveTab === "orders"}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <ShoppingBagLucide size={16} /> {t("unifiedInbox.orders", { defaultValue: "طلبات" })}
                      {customerProfile.recentOrders?.length > 0 && (
                        <span className="business-inbox-tab-count">{customerProfile.recentOrders.length}</span>
                      )}
                    </span>
                  </button>
                  <button
                    onClick={() => setProfileActiveTab("info")}
                    className="business-inbox-tab"
                    data-active={profileActiveTab === "info"}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <UserLucide size={16} /> {t("unifiedInbox.info", { defaultValue: "معلومات" })}
                    </span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {profileActiveTab === "info" && (
                    <div className="space-y-4 pt-4">
                      {/* Contact Info */}
                      <div
                        className="p-4 border rounded-[20px] bg-transparent"
                        style={{ borderColor: "var(--business-muted-line, var(--business-card-border))" }}
                      >
                        <h4
                          className="mb-3 text-sm font-bold text-end"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {t("unifiedInbox.customer.contactInfo")}
                        </h4>
                        <div className="space-y-3">
                          {customerProfile?.phone && (
                            <div className="flex items-center justify-end gap-2 text-sm">
                              <span className="font-medium" style={{ color: "var(--color-foreground)" }} dir="ltr">
                                {customerProfile.phone}
                              </span>
                              <PhoneIcon
                                className="w-4 h-4"
                                style={{ color: "var(--color-muted-foreground)" }}
                              />
                            </div>
                          )}
                          {customerProfile?.email && !customerProfile.email.endsWith("@example.com") && (
                            <div className="flex items-center justify-end gap-2 text-sm">
                              <span
                                className="truncate font-medium"
                                style={{ color: "var(--color-foreground)" }}
                              >
                                {customerProfile.email}
                              </span>
                              <EnvelopeIcon
                                className="w-4 h-4"
                                style={{ color: "var(--color-muted-foreground)" }}
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-2 text-sm">
                            <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                              {t("unifiedInbox.customer.customerSince", {
                                date: new Date(
                                  customerProfile?.createdAt || new Date(),
                                ).toLocaleDateString(
                                  i18n.language === "ar" ? "ar-EG" : "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                  },
                                ),
                              })}
                            </span>
                            <ClockIcon
                              className="w-4 h-4"
                              style={{ color: "var(--color-muted-foreground)" }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tags */}
                      {customerProfile.tags?.length > 0 && (
                        <div
                          className="p-4 border rounded-[20px] bg-transparent"
                          style={{ borderColor: "var(--business-muted-line, var(--business-card-border))" }}
                        >
                          <h4
                            className="mb-3 text-sm font-bold text-end"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {t("unifiedInbox.customer.tags")}
                          </h4>
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {customerProfile.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-primary) 14%, var(--color-background))",
                                  color: "var(--color-primary)",
                                  border: "1px solid color-mix(in srgb, var(--color-primary) 24%, transparent)",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div 
                        className="p-4 border rounded-[20px] bg-transparent"
                        style={{ borderColor: "var(--business-muted-line, var(--business-card-border))" }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => {
                              setNoteText(customerProfile?.notes || "");
                              setEditNote(!editNote);
                            }}
                            className="business-chip-button"
                            aria-label={t("unifiedInbox.customer.notes")}
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <h4
                            className="text-sm font-bold text-end"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {t("unifiedInbox.notes")}
                          </h4>
                        </div>
                        {editNote ? (
                          <div className="space-y-2">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder={t("unifiedInbox.notePlaceholder")}
                              className="business-chat-input w-full p-2 text-xs min-h-[80px] resize-none"
                              style={{ color: "var(--color-foreground)" }}
                            />
                            <div className="flex gap-2">
                              <button onClick={handleSaveNote} className="inbox-filter-chip text-xs" data-active="true">
                                {t("unifiedInbox.save")}
                              </button>
                              <button onClick={() => setEditNote(false)} className="inbox-filter-chip text-xs">
                                {t("unifiedInbox.cancel")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            className="text-xs leading-relaxed whitespace-pre-wrap"
                            style={{ color: customerProfile?.notes ? "var(--color-foreground)" : "var(--color-muted-foreground)" }}
                          >
                            {customerProfile?.notes || t("unifiedInbox.noNotes")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {profileActiveTab === "orders" && (
                    <div className="space-y-4 pt-4">
                      {/* Recent Orders */}
                      {customerProfile?.recentOrders?.length > 0 && (
                        <div
                          className="p-4 border rounded-[20px] bg-transparent"
                          style={{ borderColor: "var(--business-muted-line, var(--business-card-border))" }}
                        >
                          <h4
                            className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isRtl ? "text-right" : "text-left"}`}
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {t("unifiedInbox.customer.recentOrders")}
                            <span className="opacity-60 ml-1">
                              ({customerProfile.totalOrders})
                            </span>
                          </h4>
                          <div className="space-y-2">
                            {customerProfile.recentOrders.map((order) => (
                              <button
                                key={order.id}
                                onClick={() =>
                                  window.open(
                                    `/orders/${encodeURIComponent(String(order.id))}`,
                                    "_blank",
                                  )
                                }
                                className="business-profile-item-card w-full flex items-center justify-between rounded-lg p-2.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-foreground) 5%, var(--color-background))",
                                  border: "1px solid var(--business-card-border)",
                                }}
                                title={t("unifiedInbox.viewOrder")}
                              >
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="text-xs font-medium"
                                    style={{ color: "var(--color-foreground)" }}
                                  >
                                    #{order.orderNumber}
                                  </div>
                                  <div
                                    className="text-[10px]"
                                    style={{ color: "var(--color-muted-foreground)" }}
                                  >
                                    {new Date(order.createdAt).toLocaleDateString(
                                      i18n.language === "ar" ? "ar-EG" : "en-US",
                                    )}
                                    {order._count?.items > 0 && (
                                      <span className="mx-1">·</span>
                                    )}
                                    {order._count?.items > 0 && (
                                      <span>
                                        {order._count.items}{" "}
                                        {t("unifiedInbox.products")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={`${isRtl ? "text-right" : "text-right"} ml-3 flex-shrink-0`}>
                                  <div
                                    className="text-xs font-semibold"
                                    style={{ color: "var(--business-success)" }}
                                  >
                                    {new Intl.NumberFormat(i18n.language, { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(Number(order.total))}
                                  </div>
                                  <div
                                    className="text-[10px]"
                                    style={{
                                      color:
                                        order.status === "completed" || order.status === "DELIVERED" || order.status === "SHIPPED"
                                          ? "var(--business-success)"
                                          : order.status === "CANCELLED" || order.status === "REFUNDED"
                                            ? "var(--business-danger, #ef4444)"
                                            : "var(--business-warning)",
                                    }}
                                  >
                                    {order.status === "completed" || order.status === "DELIVERED"
                                      ? t(
                                          "unifiedInbox.customer.orderStatus.completed",
                                        )
                                      : order.status === "pending"
                                        ? t(
                                            "unifiedInbox.customer.orderStatus.pending",
                                          )
                                        : order.status === "CANCELLED"
                                          ? t(
                                              "unifiedInbox.customer.orderStatus.cancelled",
                                            )
                                          : order.status}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                          {customerProfile.totalOrders > customerProfile.recentOrders.length && (
                            <button
                              onClick={() =>
                                window.open(
                                  `/orders?customerId=${encodeURIComponent(selectedConversation.contactId || "")}`,
                                  "_blank",
                                )
                              }
                              className="mt-2 w-full text-xs font-medium py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                              style={{
                                color: "var(--color-primary)",
                                background:
                                  "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                              }}
                            >
                              {t("unifiedInbox.viewAllOrders")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {profileActiveTab === "timeline" && (
                    <div className="space-y-4 pt-4">
                      {/* Conversation History */}
                      {customerProfile.recentConversations?.length > 0 && (
                        <div 
                          className="p-4 border rounded-[20px] bg-transparent"
                          style={{ borderColor: "var(--business-muted-line, var(--business-card-border))" }}
                        >
                          <h4
                            className="mb-3 text-sm font-bold text-end"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {t("unifiedInbox.customer.history")}
                          </h4>
                          <div className="space-y-2">
                            {customerProfile.recentConversations.map((c) => (
                              <div
                                key={c.id}
                                className="business-profile-item-card rounded-lg p-2.5"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-foreground) 5%, var(--color-background))",
                                  border: "1px solid var(--business-card-border)",
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  {getPlatformBadge(c.platform)}
                                  <span
                                    className="text-[10px]"
                                    style={{ color: "var(--color-muted-foreground)" }}
                                  >
                                    {formatTime(c.lastMessageAt)}
                                  </span>
                                </div>
                                <p
                                  className="text-xs truncate"
                                  style={{ color: "var(--color-muted-foreground)" }}
                                >
                                  {c.lastMessagePreview}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (

              <div className="business-inbox-empty py-10">
                <UserCircleIcon
                  className="w-12 h-12 mb-2"
                  style={{
                    color:
                      "color-mix(in srgb, var(--color-primary) 18%, var(--color-muted-foreground))",
                  }}
                />
                <p className="text-sm">{t("unifiedInbox.customer.noData")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
        )}
      </div>
    </div>

    {/* Modals */}

    {showQuickOrder && selectedConversation && (
      <QuickOrderModal
        isOpen={showQuickOrder}
        onClose={() => setShowQuickOrder(false)}
        conversationId={selectedConversation.id}
        customerId={selectedConversation.contactId}
        customerName={selectedConversation.contactName}
        customerPhone={selectedConversation.contactPhone || undefined}
        platform={selectedConversation.platform === "whatsapp" ? "whatsapp" : "facebook"}
      />
    )}
    <TextGalleryModal
      isOpen={showTextGallery}
      onClose={() => {
        setShowTextGallery(false);
        loadQuickReplies();
      }}
      onSelectText={handleTextGallerySelect}
    />
    <ImageGalleryModal
      isOpen={showImageGallery}
      onClose={() => setShowImageGallery(false)}
      onSelectImage={handleImageGallerySelect}
      onSelectMultipleImages={(images) => {
        setAttachments(prev => [...prev, ...images.map(img => ({ url: img.url, name: img.filename, type: "image" }))]);
        setShowImageGallery(false);
      }}
    />
    <ForwardModal
      isOpen={showForwardModal}
      onClose={() => { setShowForwardModal(false); setForwardMessage(null); }}
      onForward={handleForwardMessage}
      conversations={conversations}
    />
    </>
  );
};

export default UnifiedInbox;

