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
  BoltIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  LinkIcon,
  BellSnoozeIcon,
  PencilSquareIcon,
  ShoppingCartIcon,
  ChartBarSquareIcon,
  PhotoIcon,
  BookOpenIcon,
  ArrowUturnLeftIcon,
  HeartIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  StarIcon as StarOutlineIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import StatsDashboard from "../../components/facebook-inbox/StatsDashboard/StatsDashboard";
import QuickOrderModal from "../../components/facebook-inbox/Modals/QuickOrderModal";
import TextGalleryModal from "../../components/facebook-inbox/TextGallery/TextGalleryModal";
import ImageGalleryModal from "../../components/facebook-inbox/ImageGallery/ImageGalleryModal";
import ForwardModal from "../../components/facebook-inbox/Modals/ForwardModal";

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
  quotedMessage: { id: string; content: string } | null;
  sender: string;
  senderAvatar?: string | null;
  interactiveData: any;
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

// Custom brand and helper icons for the platforms dropdown
const FacebookIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
  </svg>
);

const InstagramIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const WhatsAppIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
  </svg>
);

const TelegramIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.02-1.96 1.25-5.54 3.69-.52.36-1 .53-1.42.52-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.24.35-.49.97-.74 3.79-1.65 6.32-2.74 7.59-3.27 3.61-1.5 4.35-1.76 4.84-1.77.11 0 .35.03.5.16.13.12.17.28.19.39.02.1.02.2.01.3z"/>
  </svg>
);

const GlobeIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);

const FlaskIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12"></path>
    <path d="M12 3v15"></path>
    <path d="M9 12h6"></path>
    <path d="M18 19c0 1-1 2-2 2H8c-1 0-2-1-2-2 0-.8.4-1.6 1-2l5-6.5V3h4v5.5l5 6.5c.6.4 1 1.2 1 2z"></path>
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 🏗️ Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const UnifiedInbox: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();

  // State
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<UnifiedConversation | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [counts, setCounts] = useState<PlatformCounts>({
    all: 0,
    facebook: 0,
    instagram: 0,
    whatsapp: 0,
    telegram: 0,
    unreplied: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRef = useRef(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [unreadFilter, setUnreadFilter] = useState(false);
  const [followUpFilter, setFollowUpFilter] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [showProfilePanel, setShowProfilePanel] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showStats, setShowStats] = useState(false);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [showTextGallery, setShowTextGallery] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<any>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<UnifiedMessage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const socketHandlerRef = useRef<((message: any) => void) | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPlatformDropdown(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getPlatformFilterLabel = () => {
    if (selectedPlatforms.length === 0) return t("unifiedInbox.filters.allPlatforms");
    
    if (selectedPlatforms.length === 1) {
      return t(`unifiedInbox.platforms.${selectedPlatforms[0]}`);
    }
    
    const firstLabel = t(`unifiedInbox.platforms.${selectedPlatforms[0]}`);
    return `${firstLabel} + ${selectedPlatforms.length - 1}`;
  };

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
      if (followUpFilter) params.set("status", "pending");
      if (unreadFilter) params.set("unreadOnly", "true");
      params.set("limit", "50");
      params.set("page", String(targetPage));

      const response = await apiClient.get(
        `/api/v1/unified-inbox/conversations?${params.toString()}`,
      );

      if (response.data?.success) {
        const newData = response.data.data || [];
        const pagination = response.data.pagination || {};
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
          setCounts(response.data.counts);
        }
      }
    } catch (error) {
      console.error("❌ Error loading conversations:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedPlatforms, searchQuery, followUpFilter, unreadFilter, activeTab]);

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

  const handleTogglePriority = useCallback(async () => {
    if (!selectedConversation) return;
    setShowActionsMenu(false);
    const newPinned = !selectedConversation.isPinned;
    try {
      await apiClient.put(`/api/v1/unified-inbox/conversations/${selectedConversation.id}`, {
        isPinned: newPinned
      });
      setConversations(prev => prev.map(c =>
        c.id === selectedConversation.id ? { ...c, isPinned: newPinned } : c
      ));
      setSelectedConversation(prev => prev ? { ...prev, isPinned: newPinned } : null);
    } catch (err) {
      console.error("Error toggling priority:", err);
    }
  }, [selectedConversation]);

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
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, status: m.status } : m));
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
    try {
      setLoadingMessages(true);
      const params = new URLSearchParams();
      params.set("platform", conv.platform);
      if (conv.metadata?.["sessionId"])
        params.set("sessionId", conv.metadata["sessionId"]);
      if (conv.metadata?.["jid"]) params.set("jid", conv.metadata["jid"]);

      const realId = conv.id.startsWith("wa_") ? conv.id : conv.id;
      const response = await apiClient.get(
        `/api/v1/unified-inbox/conversations/${realId}/messages?${params.toString()}`,
      );

      if (response.data?.success) {
        setMessages(response.data.data || []);
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadCustomerProfile = useCallback(async (customerId: string) => {
    try {
      setLoadingProfile(true);
      const response = await apiClient.get(
        `/api/v1/unified-inbox/customer/${customerId}`,
      );
      if (response.data?.success) {
        setCustomerProfile(response.data.data);
      }
    } catch (error) {
      console.error("❌ Error loading customer:", error);
      setCustomerProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadQuickReplies = useCallback(async () => {
    try {
      const response = await apiClient.get(
        "/api/v1/unified-inbox/quick-replies",
      );
      if (response.data?.success) {
        setQuickReplies(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading quick replies:", error);
    }
  }, []);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFile(true);
    const newAttachments: Attachment[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;

        const formData = new FormData();
        formData.append("file", file);

        const response = await apiClient.post("/api/v1/upload", formData, {
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

          newAttachments.push({ url: fullUrl, name: file.name, type });
        }
      }

      if (newAttachments.length > 0) {
        setAttachments(prev => [...prev, ...newAttachments]);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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

      // Build the list of payloads to send
      const payloads: any[] = [];

      if (hasText) {
        const firstPayload: any = {
          content: newMessage.trim(),
          platform: selectedConversation.platform,
        };
        if (attachments.length > 0) {
          firstPayload.type = attachments[0].type;
          firstPayload.mediaUrl = attachments[0].url;
          firstPayload.mediaFileName = attachments[0].name;
        }
        payloads.push(firstPayload);

        for (let i = 1; i < attachments.length; i++) {
          payloads.push({
            content: "",
            platform: selectedConversation.platform,
            type: attachments[i].type,
            mediaUrl: attachments[i].url,
            mediaFileName: attachments[i].name,
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

      // Send each payload sequentially
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
        const response = await apiClient.post(
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

        // Update conversation preview
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
                }
              : c,
          ),
        );
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
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  };

  const useQuickReply = (reply: any) => {
    setNewMessage(reply.content);
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
    if (!newMessage.trim()) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [newMessage]);

  useEffect(() => {
    socketService.connect();

    const handler = (message: any) => {
      if (
        selectedConversation &&
        message.conversationId === selectedConversation.id
      ) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
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

    return () => {
      if (socketHandlerRef.current) {
        socketService.off("message:new", socketHandlerRef.current);
        socketHandlerRef.current = null;
      }
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

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* PAGE HEADER — Tabs + Filters (Full Width) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="unified-inbox-page-header" dir={isRtl ? "rtl" : "ltr"}>
        {/* Title + Platform Dropdown */}
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold whitespace-nowrap" style={{ color: "var(--color-foreground)" }}>
            {t("unifiedInbox.title", "الرسائل")}
          </h2>
          <div className="relative">
            <select
              value={selectedPlatforms.length === 0 ? "all" : selectedPlatforms[0]}
              onChange={(e) => {
                if (e.target.value === "all") {
                  setSelectedPlatforms([]);
                } else {
                  setSelectedPlatforms([e.target.value]);
                }
                setActiveTab("all");
              }}
              className="inbox-filter-chip text-sm appearance-none cursor-pointer pr-6 pl-3"
              style={{ borderRadius: "6px" }}
            >
              <option value="all">{t("unifiedInbox.filters.allPlatforms", "كل المنصات")}</option>
              <option value="facebook">Messenger</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">{t("unifiedInbox.tabs.whatsapp", "واتساب")}</option>
            </select>
            <ChevronDownIcon className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--color-muted-foreground)" }} />
          </div>
          {/* Comments links */}
          <div className="flex gap-1">
            <button
              onClick={() => navigate("/unified-comments?platform=facebook")}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ padding: "0.3rem 0.6rem" }}
            >
              {t("unifiedInbox.tabs.fbComments", "تعليقات فيسبوك")}
            </button>
            <button
              onClick={() => navigate("/unified-comments?platform=instagram")}
              className="inbox-filter-chip text-xs whitespace-nowrap"
              style={{ padding: "0.3rem 0.6rem" }}
            >
              {t("unifiedInbox.tabs.igComments", "تعليقات Instagram")}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFollowUpFilter(prev => !prev)}
            className="inbox-filter-chip"
            data-active={followUpFilter ? "true" : "false"}
          >
            {t("unifiedInbox.filters.followUp")}
          </button>

          <button
            type="button"
            onClick={() => setUnreadFilter(prev => !prev)}
            className="inbox-filter-chip"
            data-active={unreadFilter ? "true" : "false"}
          >
            {t("unifiedInbox.filters.unread")}
          </button>

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

          <button
            type="button"
            onClick={() => setShowStats(true)}
            className="inbox-filter-chip"
            aria-label={t("unifiedInbox.stats")}
          >
            {t("unifiedInbox.stats")}
          </button>
        </div>
      </div>

      <div className="business-inbox-shell" dir={isRtl ? "rtl" : "ltr"}>
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
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`business-inbox-search ${isRtl ? "pr-9 pl-4" : "pl-9 pr-4 text-left"}`}
                autoComplete="off"
              />
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
                          <div className="flex items-center justify-between mb-0.5">
                            <h3
                              className={`font-semibold text-sm truncate ${isRtl ? "text-right" : "text-left"}`}
                              style={{ color: "var(--color-foreground)" }}
                              translate="no"
                            >
                              {conv.contactName || t("unifiedInbox.unknown")}
                            </h3>
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
                              {conv.isPinned && (
                                <StarSolidIcon
                                  className="w-3.5 h-3.5"
                                  style={{ color: "var(--business-warning)" }}
                                />
                              )}
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
                  <div className="flex items-center gap-3">
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
                      <h3
                        className="font-semibold text-sm"
                        style={{ color: "var(--color-foreground)" }}
                        translate="no"
                      >
                        {selectedConversation.contactName}
                      </h3>
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
                                className="text-[11px] px-3 py-1 rounded-full"
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-border) 40%, white)",
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
                                className={`flex items-center gap-0.5 py-1 px-1.5 rounded-full shadow-sm backdrop-blur-sm ${isRtl ? "order-first" : ""}`}
                                style={{
                                  background:
                                    "color-mix(in srgb, var(--color-background) 92%, var(--shell-control-bg) 8%)",
                                  border: "1px solid var(--business-card-border)",
                                }}
                              >
                                {msg.isFromCustomer && (
                                  <button
                                    onClick={() => handleMsgReply(msg)}
                                    className="business-icon-button business-icon-button--sm"
                                    aria-label={t("unifiedInbox.reply")}
                                  >
                                    <ArrowUturnLeftIcon className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleMsgReact(msg.id, "👍")}
                                  className="business-icon-button business-icon-button--sm"
                                  aria-label={t("unifiedInbox.addReaction")}
                                >
                                  <HeartIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                  onClick={() => handleMsgStar(msg.id)}
                                  className="business-icon-button business-icon-button--sm"
                                  aria-label={t("unifiedInbox.starMessage")}
                                >
                                  <StarOutlineIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                                <button
                                  onClick={() => { setForwardMessage(msg); setShowForwardModal(true); }}
                                  className="business-icon-button business-icon-button--sm"
                                  aria-label={t("unifiedInbox.forward")}
                                >
                                  <ArrowTopRightOnSquareIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                                {!msg.isFromCustomer && (
                                  <button
                                    onClick={() => handleMsgDelete(msg.id)}
                                    className="business-icon-button business-icon-button--sm"
                                    aria-label={t("unifiedInbox.deleteMessage")}
                                    style={{ color: "var(--business-danger)" }}
                                  >
                                    <TrashIcon className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            )}

                            <div
                              className="max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm"
                              style={
                                msg.isFromCustomer
                                  ? {
                                      background:
                                        "linear-gradient(180deg, color-mix(in srgb, white 90%, var(--color-background) 10%) 0%, color-mix(in srgb, white 78%, var(--color-background) 22%) 100%)",
                                      border:
                                        "1px solid var(--business-card-border)",
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

                              {/* Media from mediaUrl */}
                              {msg.mediaUrl &&
                                (msg.type === "image" ||
                                  msg.mediaType?.includes("image")) && (
                                  <img
                                    src={msg.mediaUrl}
                                    alt=""
                                    className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90"
                                  />
                                )}

                              {/* Media from content URL */}
                              {(() => {
                                if (msg.mediaUrl) return null;
                                if (!msg.content || !msg.content.startsWith("http")) return null;
                                const url = msg.content.split(/[\s\n]/)[0];
                                const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url) || url.includes("fbcdn") || url.includes("cdninstagram");
                                if (!isImage) return null;
                                return (
                                  <img
                                    src={url}
                                    alt=""
                                    className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90"
                                    loading="lazy"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                );
                              })()}

                              {/* Text content (hide if it's a media URL shown above) */}
                              {msg.content && !(msg.content.startsWith("http") && (msg.content.includes("fbcdn") || msg.content.includes("cdninstagram") || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(msg.content.split(/[\s\n]/)[0]))) && (
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
                            </div>
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
                        onClick={() => useQuickReply(reply)}
                        className={`w-full rounded-2xl border px-3 py-2 ${isRtl ? "text-right" : "text-left"} text-sm transition-colors truncate`}
                        style={{
                          borderColor: "var(--business-card-border)",
                          background:
                            "color-mix(in srgb, white 74%, var(--color-background) 26%)",
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

              {/* Attachments Preview Strip */}
              {attachments.length > 0 && (
                <div className="px-5 py-2" style={{ borderTop: '1px solid var(--business-card-border)', background: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-background))' }}>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {attachments.map((att, index) => (
                      <div key={index} className="relative flex-shrink-0 group">
                        {att.type === 'image' ? (
                          <img src={att.url} alt={att.name} className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'var(--business-card-border)' }} />
                        ) : (
                          <div className="w-16 h-16 rounded-lg flex items-center justify-center border" style={{ borderColor: 'var(--business-card-border)', background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}>
                            <PaperClipIcon className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                          </div>
                        )}
                        <button
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ background: 'var(--business-danger)', color: 'white' }}
                          aria-label={t("unifiedInbox.removeFile")}
                        >
                          <XMarkIcon className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <p className="mt-0.5 w-16 truncate text-[10px] text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                          {att.name.length > 10 ? att.name.substring(0, 10) + '...' : att.name}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                    {attachments.length} {attachments.length > 1 ? t("unifiedInbox.files") : t("unifiedInbox.file")}
                  </p>
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="px-5 py-2" style={{ borderTop: '1px solid var(--business-card-border)' }}>
                  <EmojiPicker
                    onEmojiClick={(emojiData: any) => {
                      setNewMessage((prev: string) => prev + emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                    width="100%"
                    height={350}
                  />
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
              <div className="business-chat-composer px-5 py-3">
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  multiple
                />
                <div className="flex items-center gap-2">
                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className="business-chip-button"
                      aria-label={t("unifiedInbox.quickReplies")}
                    >
                      <BoltIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setShowTextGallery(true)}
                      className="business-chip-button"
                      aria-label={t("unifiedInbox.savedTexts")}
                    >
                      <BookOpenIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setShowImageGallery(true)}
                      className="business-chip-button"
                      aria-label={t("unifiedInbox.savedImages")}
                    >
                      <PhotoIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`business-chip-button ${uploadingFile ? 'animate-pulse' : ''}`}
                      aria-label={t("unifiedInbox.attachFile")}
                      disabled={uploadingFile}
                    >
                      <PaperClipIcon className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`business-chip-button ${showEmojiPicker ? 'text-primary' : ''}`}
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
                      "color-mix(in srgb, var(--color-primary) 10%, white)",
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
        {/* COLUMN 3 — Customer Profile Panel */}
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
                    className="w-20 h-20 rounded-full object-cover border-4"
                    style={{
                      borderColor:
                        "color-mix(in srgb, white 76%, var(--color-background) 24%)",
                    }}
                    alt=""
                    width={80}
                    height={80}
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4"
                    style={{
                      borderColor:
                        "color-mix(in srgb, white 76%, var(--color-background) 24%)",
                      background: "var(--color-primary)",
                    }}
                  >
                    {selectedConversation.contactName?.charAt(0) || "?"}
                  </div>
                )}
              </div>

              <h3
                className="font-bold text-lg"
                style={{ color: "var(--color-foreground)" }}
                translate="no"
              >
                {customerProfile?.name || selectedConversation.contactName}
              </h3>
              {getPlatformBadge(selectedConversation.platform)}
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
                {/* Contact Info */}
                <div
                  className="p-4 border-b"
                  style={{ borderColor: "var(--business-muted-line)" }}
                >
                  <h4
                    className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isRtl ? "text-right" : "text-left"}`}
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {t("unifiedInbox.customer.contactInfo")}
                  </h4>
                  <div className="space-y-2.5">
                    {customerProfile.email && !customerProfile.email.endsWith("@example.com") && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <EnvelopeIcon
                          className="w-4 h-4"
                          style={{ color: "var(--color-muted-foreground)" }}
                        />
                        <span
                          className="truncate"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {customerProfile.email}
                        </span>
                      </div>
                    )}
                    {customerProfile.phone && (
                      <div className="flex items-center gap-2.5 text-sm">
                        <PhoneIcon
                          className="w-4 h-4"
                          style={{ color: "var(--color-muted-foreground)" }}
                        />
                        <span style={{ color: "var(--color-foreground)" }}>
                          {customerProfile.phone}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 text-sm">
                      <ClockIcon
                        className="w-4 h-4"
                        style={{ color: "var(--color-muted-foreground)" }}
                      />
                      <span style={{ color: "var(--color-foreground)" }}>
                        {t("unifiedInbox.customer.customerSince", {
                          date: new Date(
                            customerProfile.createdAt,
                          ).toLocaleDateString(
                            i18n.language === "ar" ? "ar-EG" : "en-US",
                            {
                              year: "numeric",
                              month: "long",
                            },
                          ),
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div
                  className="p-4 border-b"
                  style={{ borderColor: "var(--business-muted-line)" }}
                >
                  <h4
                    className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isRtl ? "text-right" : "text-left"}`}
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {t("unifiedInbox.customer.stats")}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{
                        background:
                          "color-mix(in srgb, white 72%, var(--color-background) 28%)",
                      }}
                    >
                      <div
                        className="text-lg font-bold"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {customerProfile.totalOrders}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {t("unifiedInbox.customer.orders")}
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-3 text-center"
                      style={{
                        background:
                          "color-mix(in srgb, white 72%, var(--color-background) 28%)",
                      }}
                    >
                      <div
                        className="text-lg font-bold"
                        style={{ color: "var(--color-primary)" }}
                      >
                        {customerProfile.totalConversations}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {t("unifiedInbox.customer.conversations")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                {customerProfile.recentOrders?.length > 0 && (
                  <div
                    className="p-4 border-b"
                    style={{ borderColor: "var(--business-muted-line)" }}
                  >
                    <h4
                      className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isRtl ? "text-right" : "text-left"}`}
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {t("unifiedInbox.customer.recentOrders")}
                    </h4>
                    <div className="space-y-2">
                      {customerProfile.recentOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between rounded-lg p-2.5"
                          style={{
                            background:
                              "color-mix(in srgb, white 72%, var(--color-background) 28%)",
                          }}
                        >
                          <div>
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
                            </div>
                          </div>
                          <div className="text-left">
                            <div
                              className="text-xs font-semibold"
                              style={{ color: "var(--business-success)" }}
                            >
                              {order.total}{" "}
                              {i18n.language === "ar" ? "ج.م" : "EGP"}
                            </div>
                            <div
                              className="text-[10px]"
                              style={{
                                color:
                                  order.status === "completed"
                                    ? "var(--business-success)"
                                    : "var(--business-warning)",
                              }}
                            >
                              {order.status === "completed"
                                ? t(
                                    "unifiedInbox.customer.orderStatus.completed",
                                  )
                                : order.status === "pending"
                                  ? t(
                                      "unifiedInbox.customer.orderStatus.pending",
                                    )
                                  : order.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {customerProfile.tags?.length > 0 && (
                  <div
                    className="p-4 border-b"
                    style={{ borderColor: "var(--business-muted-line)" }}
                  >
                    <h4
                      className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isRtl ? "text-right" : "text-left"}`}
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {t("unifiedInbox.customer.tags")}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {customerProfile.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            background:
                              "color-mix(in srgb, var(--color-primary) 10%, white)",
                            color: "var(--color-primary)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4
                      className={`text-xs font-semibold uppercase tracking-wider ${isRtl ? "text-right" : "text-left"}`}
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {t("unifiedInbox.notes")}
                    </h4>
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

                {/* Conversation History */}
                {customerProfile.recentConversations?.length > 0 && (
                  <div className="p-4">
                    <h4
                      className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isRtl ? "text-right" : "text-left"}`}
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {t("unifiedInbox.customer.history")}
                    </h4>
                    <div className="space-y-2">
                      {customerProfile.recentConversations.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg p-2.5"
                          style={{
                            background:
                              "color-mix(in srgb, white 72%, var(--color-background) 28%)",
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

    {/* Modals */}
    <StatsDashboard
      isOpen={showStats}
      onClose={() => setShowStats(false)}
      conversations={[]}
    />
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
      onClose={() => setShowTextGallery(false)}
      onSelectText={handleTextGallerySelect}
    />
    <ImageGalleryModal
      isOpen={showImageGallery}
      onClose={() => setShowImageGallery(false)}
      onSelectImage={handleImageGallerySelect}
      onSelectMultipleImages={(images) => {
        if (images.length > 0) {
          setAttachments(prev => [...prev, ...images.map(img => ({ url: img.url, name: img.filename, type: "image" as const }))]);
        }
        setShowImageGallery(false);
      }}
    />
    <ForwardModal
      isOpen={showForwardModal}
      onClose={() => { setShowForwardModal(false); setForwardMessage(null); }}
      onForward={handleForwardMessage}
      conversations={[]}
    />
  </>);
};

export default UnifiedInbox;
