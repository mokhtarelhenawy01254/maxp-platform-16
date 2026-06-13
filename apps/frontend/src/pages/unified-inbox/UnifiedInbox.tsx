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
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { useTranslation } from "react-i18next";

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

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 Platform styling
// ═══════════════════════════════════════════════════════════════════════════════

const platformStyles: Record<string, { label: string; icon: string }> = {
  facebook: { label: "Messenger", icon: "💬" },
  instagram: { label: "Instagram", icon: "📷" },
  whatsapp: { label: "WhatsApp", icon: "📱" },
  telegram: { label: "Telegram", icon: "✈️" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🏗️ Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const UnifiedInbox: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter] = useState<string>("");
  const [newMessage, setNewMessage] = useState("");
  const [showProfilePanel, setShowProfilePanel] = useState(true);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplies, setQuickReplies] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ──────────────────────────────────────────────────────────
  // 📡 Data Fetching
  // ──────────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("platform", platformFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");

      const response = await apiClient.get(
        `/api/v1/unified-inbox/conversations?${params.toString()}`,
      );

      if (response.data?.success) {
        setConversations(response.data.data || []);
        if (response.data.counts) {
          setCounts(response.data.counts);
        }
      }
    } catch (error) {
      console.error("❌ Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [platformFilter, searchQuery, statusFilter]);

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
      loadMessages(conv);
      if (conv.contactId && !conv.id.startsWith("wa_")) {
        loadCustomerProfile(conv.contactId);
      } else {
        setCustomerProfile(null);
      }
    },
    [loadMessages, loadCustomerProfile],
  );

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const body: any = {
        content: newMessage.trim(),
        platform: selectedConversation.platform,
      };

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
        setMessages((prev) => [...prev, response.data.data]);
        setNewMessage("");
        setTimeout(() => scrollToBottom(), 100);

        // Update conversation preview
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? {
                  ...c,
                  lastMessage: newMessage.trim(),
                  lastMessageTime: new Date().toISOString(),
                  lastMessageIsFromCustomer: false,
                }
              : c,
          ),
        );
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadConversations();
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
  }, [platformFilter, statusFilter]);

  useEffect(() => {
    // Real-time updates
    socketService.connect();

    socketService.onMessage?.((message: any) => {
      if (
        selectedConversation &&
        message.conversationId === selectedConversation.id
      ) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      }
      // Update conversation list
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
    });

    return () => {
      // Cleanup if needed
    };
  }, [selectedConversation]);

  // ──────────────────────────────────────────────────────────
  // 🎨 Helpers
  // ──────────────────────────────────────────────────────────

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
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
        {style.label}
      </span>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 🖼️ RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="business-inbox-shell" dir={isRtl ? "rtl" : "ltr"}>
      <div className="business-inbox-stage">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COLUMN 1 — Conversation List */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="business-inbox-column business-inbox-column--list">
          {/* Header */}
          <div className="business-inbox-header">
            <div className="business-inbox-header-row mb-3">
              <h1 className="business-inbox-title">
                <ChatBubbleLeftRightIcon className="w-6 h-6" />
                {t("unifiedInbox.title")}
              </h1>
              <button
                onClick={() => loadConversations()}
                className="business-chip-button"
                title={t("unifiedInbox.refresh")}
              >
                <ArrowPathIcon
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* Search */}
            <div className="business-inbox-search-wrap mb-3">
              <MagnifyingGlassIcon
                className={`business-inbox-search-icon ${isRtl ? "right-0 left-auto" : ""}`}
              />
              <input
                type="text"
                placeholder={t("unifiedInbox.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`business-inbox-search ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4 text-left"}`}
              />
            </div>

            {/* Platform Filter Tabs */}
            <div className="business-inbox-tabs">
              {[
                {
                  key: "all",
                  label: t("unifiedInbox.tabs.all"),
                  count: counts.all,
                },
                { key: "facebook", label: "💬", count: counts.facebook },
                { key: "instagram", label: "📷", count: counts.instagram },
                { key: "whatsapp", label: "📱", count: counts.whatsapp },
                { key: "telegram", label: "✈️", count: counts.telegram },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPlatformFilter(tab.key)}
                  className="business-inbox-tab"
                  data-active={platformFilter === tab.key ? "true" : "false"}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="business-inbox-tab-count">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
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
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className="business-conversation-card"
                  data-state={
                    selectedConversation?.id === conv.id
                      ? "selected"
                      : conv.unreadCount > 0
                        ? "attention"
                        : "idle"
                  }
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {conv.contactAvatar ? (
                        <img
                          src={conv.contactAvatar}
                          alt={conv.contactName}
                          className="business-conversation-avatar"
                        />
                      ) : (
                        <div className="business-conversation-fallback">
                          {conv.contactName?.charAt(0) || "?"}
                        </div>
                      )}
                      {/* Platform indicator */}
                      <span
                        className={`absolute -bottom-0.5 text-xs ${isRtl ? "-left-0.5" : "-right-0.5"}`}
                      >
                        {platformStyles[conv.platform]?.icon || "💬"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3
                          className={`font-semibold text-sm truncate ${isRtl ? "" : "text-left"}`}
                          style={{ color: "var(--color-foreground)" }}
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
                        className={`text-xs truncate leading-5 ${isRtl ? "" : "text-left"}`}
                        style={{ color: "var(--color-muted-foreground)" }}
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
                </div>
              ))
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
                      >
                        {selectedConversation.contactName}
                      </h3>
                      <div className="flex items-center gap-2">
                        {getPlatformBadge(selectedConversation.platform)}
                        <span
                          className="text-xs"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {selectedConversation.status === "active"
                            ? t("unifiedInbox.status.active")
                            : selectedConversation.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowProfilePanel(!showProfilePanel)}
                      className="business-chip-button"
                      data-active={showProfilePanel ? "true" : "false"}
                      title={t("unifiedInbox.profile")}
                    >
                      <UserCircleIcon className="w-5 h-5" />
                    </button>
                    <button className="business-chip-button">
                      <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

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
                            className={`flex ${msg.isFromCustomer ? "justify-start" : "justify-end"}`}
                          >
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
                                      background:
                                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
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

                              {/* Media */}
                              {msg.mediaUrl &&
                                (msg.type === "image" ||
                                  msg.mediaType?.includes("image")) && (
                                  <img
                                    src={msg.mediaUrl}
                                    alt=""
                                    className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90"
                                  />
                                )}

                              {/* Text content */}
                              {msg.content && (
                                <p
                                  className="text-sm leading-relaxed whitespace-pre-wrap"
                                  style={{
                                    color: msg.isFromCustomer
                                      ? "var(--color-foreground)"
                                      : "white",
                                  }}
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
                                      ? "✓✓"
                                      : msg.status === "delivered"
                                        ? "✓✓"
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

              {/* Quick Replies Panel */}
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
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => useQuickReply(reply)}
                        className="w-full rounded-2xl border px-3 py-2 text-right text-sm transition-colors truncate"
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
                          className="mr-2"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          — {reply.content.substring(0, 50)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="business-chat-composer px-5 py-3">
                <div className="flex items-center gap-2">
                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className="business-chip-button"
                      title={t("unifiedInbox.quickReplies")}
                    >
                      <BoltIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="business-chip-button"
                      title={t("unifiedInbox.attachFile")}
                    >
                      <PaperClipIcon className="w-5 h-5" />
                    </button>
                    <button
                      className="business-chip-button"
                      title={t("unifiedInbox.emoji")}
                    >
                      <FaceSmileIcon className="w-5 h-5" />
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
                      placeholder={t("unifiedInbox.inputPlaceholder", {
                        platform:
                          platformStyles[selectedConversation.platform]
                            ?.label || t("common.platform"),
                      })}
                      className="business-chat-input"
                      disabled={sending}
                    />
                  </div>

                  {/* Send */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="business-icon-button text-white p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                    }}
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <PaperAirplaneIcon className="w-5 h-5 rotate-180" />
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
                      "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, white) 0%, color-mix(in srgb, var(--color-secondary) 12%, white) 100%)",
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
                    <span className="text-xs">Messenger</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs">Instagram</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">📱</span>
                    <span className="text-xs">WhatsApp</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl">✈️</span>
                    <span className="text-xs">Telegram</span>
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
              >
                <XMarkIcon className="w-4 h-4" />
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
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4"
                    style={{
                      borderColor:
                        "color-mix(in srgb, white 76%, var(--color-background) 24%)",
                      background:
                        "linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)",
                    }}
                  >
                    {selectedConversation.contactName?.charAt(0) || "?"}
                  </div>
                )}
              </div>

              <h3
                className="font-bold text-lg"
                style={{ color: "var(--color-foreground)" }}
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
                    {customerProfile.email && (
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
                {customerProfile.notes && (
                  <div className="p-4">
                    <h4
                      className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isRtl ? "text-right" : "text-left"}`}
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {t("unifiedInbox.customer.notes")}
                    </h4>
                    <p
                      className="text-xs leading-relaxed whitespace-pre-wrap"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {customerProfile.notes}
                    </p>
                  </div>
                )}

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
  );
};

export default UnifiedInbox;
