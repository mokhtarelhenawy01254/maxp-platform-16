import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuthSimple";
import useSocket from "../../hooks/useSocket";
import { companyAwareApi } from "../../services/companyAwareApi";
import LinkifiedText from "../../components/common/LinkifiedText";
import { Navigation, Link, Smile, MoreVertical, Search, Phone, Check, CheckCheck, MessageCircle, Bot, Settings, User, Pin, File, Image as ImageIcon, Reply, Forward, Trash2, Mic, X, Video, Volume2, Contact, Edit, Download, Play, Pause } from 'lucide-react';

// --- Types ---
interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "location"
    | "contact"
    | "voice";
  isFromCustomer: boolean;
  status: "sent" | "delivered" | "read" | "failed";
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  isAiGenerated?: boolean;
  replyToMessageId?: string;
  location?: { latitude: number; longitude: number };
  duration?: number; // for audio/voice messages
}

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  platform: "telegram";
  isOnline: boolean;
  messages: Message[];
  telegramBotId?: string;
  aiEnabled?: boolean;
}

const TelegramConversationsPro: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const { socket, isConnected } = useSocket();

  // Detect language direction
  const isRTL = i18n.language === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isInfoOpen, setIsInfoOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showFileMenu, setShowFileMenu] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Filtered Conversations
  const filteredConversations = conversations.filter(
    (c) =>
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filtered Messages (for chat search)
  const filteredMessages = chatSearchQuery
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()),
      )
    : messages;

  const activeConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );

  // --- Effects ---

  // 1. Load Conversations
  useEffect(() => {
    if (!isAuthenticated || !user?.companyId) return;

    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await companyAwareApi.getConversations({
          page: 1,
          limit: 50,
          platform: "telegram",
        });

        if (response.data && response.data.data) {
          const formatted = response.data.data.map((c: any) => ({
            id: c.id,
            customerId: c.customerId,
            customerName: c.customerName || "Telegram User",
            lastMessage: c.lastMessage || "",
            lastMessageTime: new Date(c.lastMessageTime || Date.now()),
            unreadCount: c.unreadCount || 0,
            platform: "telegram",
            isOnline: false,
            messages: [],
            aiEnabled: c.aiEnabled !== false,
          }));
          setConversations(formatted);
        }
      } catch (error) {
        console.error("Failed to load Telegram conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [isAuthenticated, user?.companyId]);

  // 2. Load Messages
  useEffect(() => {
    if (!selectedConversationId) return;

    const fetchMessages = async () => {
      try {
        const response = await companyAwareApi.get(
          `/conversations/${selectedConversationId}/messages`,
        );
        const data = response.data.data || [];

        const loadedMessages: Message[] = data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId || "unknown",
          senderName: msg.isFromCustomer ? "Customer" : "Agent",
          timestamp: new Date(msg.createdAt || Date.now()),
          type: (msg.type || "text").toLowerCase(),
          isFromCustomer: msg.isFromCustomer,
          status: "read",
          conversationId: selectedConversationId,
          fileUrl:
            msg.fileUrl ||
            (msg.metadata
              ? JSON.parse(msg.metadata || "{}").fileUrl
              : undefined),
          fileName:
            msg.fileName ||
            (msg.metadata
              ? JSON.parse(msg.metadata || "{}").fileName
              : undefined),
          fileSize:
            msg.fileSize ||
            (msg.metadata
              ? JSON.parse(msg.metadata || "{}").fileSize
              : undefined),
          location:
            msg.location ||
            (msg.metadata
              ? JSON.parse(msg.metadata || "{}").location
              : undefined),
          duration:
            msg.duration ||
            (msg.metadata
              ? JSON.parse(msg.metadata || "{}").duration
              : undefined),
        }));

        // ترتيب الرسائل من الأقدم للأحدث (الأقدم أولاً)
        const sortedMessages = loadedMessages.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        setMessages(sortedMessages);
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    fetchMessages();
  }, [selectedConversationId]);

  // 3. Socket
  useEffect(() => {
    if (!socket || !isConnected || !user?.companyId) {
      console.log("⚠️ [SOCKET] Socket not ready:", {
        socket: !!socket,
        isConnected,
        companyId: user?.companyId,
      });
      return;
    }

    // Join company room to receive messages
    socket.emit("join_company_room", { companyId: user.companyId });
    console.log("🔌 [SOCKET] Joined company room:", user.companyId);

    const handleNewMessage = (data: any) => {
      console.log("📨 [SOCKET] Received message:", {
        id: data.id,
        platform: data.platform,
        channel: data.channel,
        conversationId: data.conversationId,
        companyId: data.companyId,
        userCompanyId: user?.companyId,
        content: data.content?.substring(0, 50),
      });

      // Filter for Telegram messages
      const isTelegram =
        data.platform === "telegram" || data.channel === "TELEGRAM";
      if (!isTelegram) {
        console.log(
          "⚠️ [SOCKET] Not a Telegram message, skipping. Platform:",
          data.platform,
          "Channel:",
          data.channel,
        );
        return;
      }

      if (String(data.companyId) !== String(user?.companyId)) {
        console.log(
          "⚠️ [SOCKET] Different company, skipping. Data company:",
          data.companyId,
          "User company:",
          user?.companyId,
        );
        return;
      }

      console.log(
        "✅ [SOCKET] Processing Telegram message for conversation:",
        data.conversationId,
      );

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === data.conversationId);
        if (exists) {
          return prev.map((c) =>
            c.id === data.conversationId
              ? {
                  ...c,
                  lastMessage: data.content,
                  lastMessageTime: new Date(),
                  unreadCount:
                    data.conversationId === selectedConversationId
                      ? 0
                      : c.unreadCount + 1,
                }
              : c,
          );
        }
        return prev;
      });

      if (selectedConversationId === data.conversationId) {
        const newMsg: Message = {
          id: data.id || Date.now().toString(),
          content: data.content,
          senderId: data.senderId,
          senderName: data.senderName,
          timestamp: new Date(data.timestamp || Date.now()),
          type: (data.type || "text").toLowerCase(),
          isFromCustomer: data.isFromCustomer,
          status: "delivered",
          conversationId: data.conversationId,
          fileUrl:
            data.fileUrl ||
            (data.metadata
              ? (typeof data.metadata === "string"
                  ? JSON.parse(data.metadata)
                  : data.metadata
                ).fileUrl
              : undefined),
          fileName:
            data.fileName ||
            (data.metadata
              ? (typeof data.metadata === "string"
                  ? JSON.parse(data.metadata)
                  : data.metadata
                ).fileName
              : undefined),
          location:
            data.location ||
            (data.metadata
              ? (typeof data.metadata === "string"
                  ? JSON.parse(data.metadata)
                  : data.metadata
                ).location
              : undefined),
          duration:
            data.duration ||
            (data.metadata
              ? (typeof data.metadata === "string"
                  ? JSON.parse(data.metadata)
                  : data.metadata
                ).duration
              : undefined),
        };

        // منع التكرار: التحقق من وجود الرسالة بالفعل
        setMessages((prev) => {
          // التحقق من وجود الرسالة بنفس ID
          const existsById = prev.some((msg) => msg.id === newMsg.id);
          if (existsById) {
            console.log(
              "⚠️ [SOCKET] Message already exists by ID, skipping:",
              newMsg.id,
            );
            return prev;
          }

          // التحقق من الرسائل المؤقتة (temp messages) - استبدالها بالرسالة الحقيقية
          const tempMessageIndex = prev.findIndex(
            (msg) =>
              msg.id.startsWith("temp_") &&
              msg.content === newMsg.content &&
              !msg.isFromCustomer === !newMsg.isFromCustomer &&
              Math.abs(
                new Date(msg.timestamp).getTime() -
                  new Date(newMsg.timestamp).getTime(),
              ) < 5000,
          );

          if (tempMessageIndex !== -1) {
            // استبدال الرسالة المؤقتة بالرسالة الحقيقية
            const updated = [...prev];
            updated[tempMessageIndex] = newMsg;
            // ترتيب الرسائل بعد الاستبدال
            return updated.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime(),
            );
          }

          // إضافة الرسالة الجديدة وترتيبها
          const updated = [...prev, newMsg];
          return updated.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
          );
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    const handleTyping = (data: any) => {
      if (
        data.conversationId === selectedConversationId &&
        data.isFromCustomer
      ) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("typing", handleTyping);
    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("typing", handleTyping);
    };
  }, [socket, isConnected, selectedConversationId, user?.companyId]);

  // Handlers
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId || !inputText.trim()) return;

    const messageContent = inputText.trim();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMsg: Message = {
      id: tempId,
      content: messageContent,
      senderId: user?.id || "me",
      senderName: "Me",
      timestamp: new Date(),
      type: "text",
      isFromCustomer: false,
      status: "sending",
      conversationId: selectedConversationId,
      replyToMessageId: replyingTo?.id,
    };

    // إضافة الرسالة المؤقتة
    setMessages((prev) => {
      const updated = [...prev, tempMsg];
      return updated.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    });
    setInputText("");
    setReplyingTo(null);
    setTimeout(scrollToBottom, 100);

    try {
      const response = await companyAwareApi.post(
        `/conversations/${selectedConversationId}/messages`,
        {
          message: messageContent,
          type: "text",
          replyToMessageId: replyingTo?.id,
        },
      );

      // إذا كانت الرسالة تم حفظها بنجاح، سيتم استبدالها بالرسالة الحقيقية من Socket
      // لكن إذا لم تأت من Socket، نحدث حالة الرسالة المؤقتة
      if (response.data.success && response.data.data) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, id: response.data.data.id, status: "sent" }
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to send:", error);
      // في حالة الفشل، إزالة الرسالة المؤقتة
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    }
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "audio" | "document",
  ) => {
    if (!e.target.files || !e.target.files[0] || !selectedConversationId)
      return;

    const file = e.target.files[0];
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // إضافة رسالة مؤقتة
    const tempMsg: Message = {
      id: tempId,
      content: `[${type}]`,
      senderId: user?.id || "me",
      senderName: "Me",
      timestamp: new Date(),
      type: type,
      isFromCustomer: false,
      status: "sending",
      conversationId: selectedConversationId,
      fileName: file.name,
      fileSize: file.size,
    };

    setMessages((prev) => {
      const updated = [...prev, tempMsg];
      return updated.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    });
    setTimeout(scrollToBottom, 100);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    try {
      const response = await companyAwareApi.post(
        `/conversations/${selectedConversationId}/messages/media`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      if (response.data.success) {
        // تحديث الرسالة المؤقتة بالرسالة الحقيقية
        // سيتم استبدالها بالرسالة الكاملة من Socket لاحقاً
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, id: response.data.data.id, status: "sent" }
              : msg,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      // إزالة الرسالة المؤقتة في حالة الفشل
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert(isRTL ? "فشل رفع الملف" : "Failed to upload file");
    }
  };

  const handleSendLocation = async () => {
    if (!selectedConversationId) return;

    if (!navigator.geolocation) {
      alert(
        isRTL ? "المتصفح لا يدعم تحديد الموقع" : "Geolocation not supported",
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const response = await companyAwareApi.post(
          `/conversations/${selectedConversationId}/messages`,
          {
            type: "location",
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        );

        if (response.data.success) {
          const newMsg: Message = {
            id: response.data.data.id || Date.now().toString(),
            content: "",
            senderId: user?.id || "me",
            senderName: "Me",
            timestamp: new Date(),
            type: "location",
            isFromCustomer: false,
            status: "sent",
            conversationId: selectedConversationId,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          };
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(scrollToBottom, 100);
        }
      } catch (error) {
        console.error("Failed to send location:", error);
      }
    });
  };

  const handleEditMessage = async (message: Message) => {
    if (!inputText.trim()) return;

    try {
      await companyAwareApi.put(
        `/conversations/${selectedConversationId}/messages/${message.id}`,
        {
          content: inputText,
        },
      );

      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, content: inputText } : m,
        ),
      );
      setEditingMessage(null);
      setInputText("");
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm(isRTL ? "هل تريد حذف هذه الرسالة؟" : "Delete this message?"))
      return;

    try {
      await companyAwareApi.delete(
        `/conversations/${selectedConversationId}/messages/${messageId}`,
      );
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleForwardMessage = async (message: Message) => {
    // TODO: Implement forward to another conversation
    alert(isRTL ? "ميزة إعادة التوجيه قريباً" : "Forward feature coming soon");
  };

  const handleToggleAi = async () => {
    if (!selectedConversationId || !activeConversation) return;
    const newStatus = activeConversation.aiEnabled === false;
    try {
      await companyAwareApi.put(`/conversations/${selectedConversationId}`, {
        aiEnabled: newStatus,
      });
      // Update local state
      setConversations(prev => prev.map(c => {
        if (c.id === selectedConversationId) {
          return { ...c, aiEnabled: newStatus };
        }
        return c;
      }));
      toast.success(newStatus ? 'تم تفعيل الرد الآلي' : 'تم إيقاف الرد الآلي');
    } catch (err) {
      console.error(err);
      toast.error('فشل تحديث حالة الرد الآلي');
    }
  };

  // Get media messages for gallery
  const mediaMessages = messages.filter((m) =>
    ["image", "video", "document"].includes(m.type),
  );

  // --- Render ---
  return (
    <div
      className={`flex h-[calc(100dvh-64px)] business-bg-messenger-app business-bg-soft overflow-hidden`}
      dir={dir}
    >
      {/* SIDEBAR: Conversations List - Position based on language */}
      <div
        className={`w-[350px] business-bg-panel border-r business-border flex flex-col shrink-0 z-20 ${isRTL ? "order-3" : "order-1"}`}
      >
        {/* Header */}
        <div className="p-4 business-bg-primary-solid business-text-on-accent flex justify-between items-center shadow-sm">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Bot size={20} />
            {isRTL ? "محادثات تيليجرام" : "Telegram Chats"}
          </h2>
          <div className="flex gap-2">
            <Settings
              size={18}
              className="cursor-pointer opacity-80 hover:opacity-100"
            />
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b business-border">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? "بحث في المحادثات..." : "Search chats..."}
              className={`w-full ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2 business-bg-soft-strong border-none rounded-lg text-sm business-text-strong business-placeholder-muted focus:ring-2 business-focus-primary transition-all`}
            />
            <Search
              className={`absolute ${isRTL ? "right-3" : "left-3"} top-2.5 business-text-subtle`}
              size={16}
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center business-text-subtle flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 business-border-primary-strong mb-2"></div>
              {isRTL ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-10 text-center business-text-subtle">
              {searchQuery
                ? isRTL
                  ? "لا توجد نتائج"
                  : "No results found"
                : isRTL
                  ? "لا توجد محادثات"
                  : "No conversations found"}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversationId(conv.id)}
                className={`p-3 border-b business-border cursor-pointer business-hover-primary-soft business-hover-soft transition-colors
                                    ${selectedConversationId === conv.id ? `business-bg-primary-soft ${isRTL ? "border-r-4 business-border-r-primary" : "border-l-4 business-border-l-primary"}` : ""}
                                `}
              >
                <div
                  className={`flex justify-between items-start mb-1 ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <h3 className="font-semibold business-text-strong text-sm truncate">
                    {conv.customerName}
                  </h3>
                  <span
                    className={`text-[10px] business-text-subtle whitespace-nowrap ${isRTL ? "mr-2" : "ml-2"}`}
                  >
                    {conv.lastMessageTime.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={`flex justify-between items-end ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <p
                    className={`text-xs business-text-muted truncate max-w-[200px] ${isRTL ? "text-right" : "text-left"}`}
                  >
                    {conv.lastMessage}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="business-bg-primary-solid business-text-on-accent text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MIDDLE: Chat Area */}
      <div className="flex-1 flex flex-col business-bg-messenger-thread business-bg-panel bg-opacity-10 relative order-2">
        {selectedConversationId && activeConversation ? (
          <>
            {/* Header */}
            <div
              className={`p-3 business-bg-panel border-b business-border flex justify-between items-center z-10 shadow-sm px-4 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br business-bg-brand-gradient business-text-on-accent flex items-center justify-center font-bold text-lg shadow-sm">
                  {activeConversation.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold business-text-strong pointer-events-none">
                    {activeConversation.customerName}
                  </h3>
                  <div
                    className={`text-xs business-text-primary flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full business-bg-success-solid"></div>
                    {isRTL ? "مشترك بوت" : "bot subscriber"}
                    {isTyping && (
                      <span className="business-text-muted ml-2">
                        {isRTL ? "يكتب..." : "typing..."}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div
                className={`flex items-center gap-2 business-text-muted ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <button
                  onClick={handleToggleAi}
                  className={`p-2 business-hover-soft rounded-full transition-colors ${
                    activeConversation.aiEnabled !== false
                      ? "business-text-primary business-bg-primary-soft"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                  title={activeConversation.aiEnabled !== false ? (isRTL ? "إيقاف الرد الآلي" : "Disable AI Auto-reply") : (isRTL ? "تشغيل الرد الآلي" : "Enable AI Auto-reply")}
                >
                  <span className="text-base">🤖</span>
                </button>
                <button
                  onClick={() => setChatSearchQuery(chatSearchQuery ? "" : " ")}
                  className="p-2 business-hover-soft rounded-full transition-colors"
                  title={isRTL ? "بحث في المحادثة" : "Search in chat"}
                >
                  <Search size={20} />
                </button>
                <button
                  onClick={() => setShowMediaGallery(!showMediaGallery)}
                  className="p-2 business-hover-soft rounded-full transition-colors"
                  title={isRTL ? "معرض الوسائط" : "Media gallery"}
                >
                  <ImageIcon size={20} />
                </button>
                <button
                  className="p-2 business-hover-soft rounded-full transition-colors"
                  title={isRTL ? "مكالمة (قريباً)" : "Call (Coming Soon)"}
                >
                  <Phone size={20} />
                </button>
                <button
                  className={`p-2 business-hover-soft rounded-full transition-colors ${isInfoOpen ? "business-text-primary business-bg-primary-soft" : ""}`}
                  onClick={() => setIsInfoOpen(!isInfoOpen)}
                  title={isRTL ? "تبديل المعلومات" : "Toggle Info"}
                >
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Chat Search Bar */}
            {chatSearchQuery !== null && chatSearchQuery !== "" && (
              <div className="p-2 business-bg-primary-soft border-b business-border-primary-soft flex items-center gap-2">
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder={
                    isRTL ? "بحث في الرسائل..." : "Search messages..."
                  }
                  className={`flex-1 ${isRTL ? "pr-10 pl-4" : "pl-10 pr-4"} py-2 business-bg-panel border business-border-primary-soft business-control-border rounded-lg text-sm business-text-strong focus:ring-2 business-focus-primary`}
                  autoFocus
                />
                <button
                  onClick={() => setChatSearchQuery("")}
                  className="p-2 business-hover-primary-soft business-hover-primary-solid rounded"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Media Gallery */}
            {showMediaGallery && (
              <div className="p-4 business-bg-panel border-b business-border max-h-48 overflow-y-auto">
                <h4 className="font-semibold mb-3 business-text-strong">
                  {isRTL ? "الوسائط المشتركة" : "Shared Media"}
                </h4>
                <div className="grid grid-cols-6 gap-2">
                  {mediaMessages.slice(0, 12).map((msg, idx) => (
                    <div
                      key={idx}
                      className="aspect-square business-bg-soft-strong rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                    >
                      {msg.type === "image" && msg.fileUrl ? (
                        <img
                          src={msg.fileUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {msg.type === "video" && (
                            <Video size={20} className="business-text-subtle" />
                          )}
                          {msg.type === "document" && (
                            <File size={20} className="business-text-subtle" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 z-10 custom-scrollbar">
              {/* ترتيب الرسائل من الأقدم للأحدث للعرض */}
              {filteredMessages
                .sort(
                  (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
                )
                .map((msg, idx) => {
                  const isMe = !msg.isFromCustomer;
                  const replyingToMsg = msg.replyToMessageId
                    ? messages.find((m) => m.id === msg.replyToMessageId)
                    : null;

                  return (
                    <div
                      key={idx}
                      className={`group flex ${isMe ? (isRTL ? "justify-start" : "justify-end") : isRTL ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] p-3 rounded-2xl shadow-sm relative group-hover:shadow-md transition-shadow
                                            ${isMe ? `business-bg-primary-soft ${isRTL ? "rounded-tl-none" : "rounded-tr-none"}` : `business-bg-panel ${isRTL ? "rounded-tr-none" : "rounded-tl-none"}`}
                                        `}
                      >
                        {/* Reply Preview */}
                        {replyingToMsg && (
                          <div
                            className={`mb-2 ${isRTL ? "border-r-2" : "border-l-2"} business-border-primary-strong pl-2 pr-2 py-1 business-bg-soft rounded text-xs`}
                          >
                            <p className="font-semibold business-text-primary">
                              {replyingToMsg.senderName}
                            </p>
                            <p className="business-text-muted truncate">
                              {replyingToMsg.content ||
                                (isRTL ? "وسائط" : "Media")}
                            </p>
                          </div>
                        )}

                        {!isMe && (
                          <p className="text-[10px] business-text-primary font-bold mb-1 opacity-80">
                            {msg.senderName}
                          </p>
                        )}

                        {/* Media Rendering */}
                        {msg.type === "image" && msg.fileUrl && (
                          <div className="mb-2 relative rounded-lg overflow-hidden border business-border">
                            <img
                              src={msg.fileUrl}
                              alt="attachment"
                              className="max-w-xs max-h-64 object-cover"
                            />
                          </div>
                        )}

                        {msg.type === "video" && msg.fileUrl && (
                          <div className="mb-2 relative rounded-lg overflow-hidden border business-border">
                            <video
                              src={msg.fileUrl}
                              controls
                              className="max-w-xs max-h-64"
                            />
                          </div>
                        )}

                        {msg.type === "audio" && (
                          <div className="mb-2 flex items-center gap-2 p-2 business-bg-soft rounded">
                            <Music
                              size={20}
                              className="business-text-primary"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-semibold">
                                {msg.fileName ||
                                  (isRTL ? "ملف صوتي" : "Audio file")}
                              </p>
                              {msg.duration && (
                                <p className="text-[10px] business-text-muted">
                                  {msg.duration}s
                                </p>
                              )}
                            </div>
                            <button className="p-1 business-hover-soft rounded">
                              <Play size={16} />
                            </button>
                          </div>
                        )}

                        {msg.type === "voice" && (
                          <div className="mb-2 flex items-center gap-2 p-2 business-bg-soft rounded">
                            <Mic size={20} className="business-text-primary" />
                            <div className="flex-1 business-bg-soft-strong h-1 rounded-full">
                              <div
                                className="business-bg-primary-solid h-1 rounded-full"
                                style={{ width: "60%" }}
                              ></div>
                            </div>
                            {msg.duration && (
                              <span className="text-xs business-text-muted">
                                {msg.duration}s
                              </span>
                            )}
                          </div>
                        )}

                        {msg.type === "document" && (
                          <div className="mb-2 flex items-center gap-2 p-2 business-bg-soft rounded border business-border">
                            <File size={24} className="business-text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {msg.fileName || (isRTL ? "مستند" : "Document")}
                              </p>
                              {msg.fileSize && (
                                <p className="text-xs business-text-muted">
                                  {(msg.fileSize / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                            <button className="p-1 business-hover-soft rounded">
                              <Download size={16} />
                            </button>
                          </div>
                        )}

                        {msg.type === "location" && msg.location && (
                          <div className="mb-2 relative rounded-lg overflow-hidden border business-border">
                            <div className="w-64 h-32 business-bg-soft-strong flex items-center justify-center">
                              <Map
                                size={32}
                                className="business-text-primary"
                              />
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute bottom-2 left-2 right-2 business-bg-panel px-2 py-1 rounded text-xs business-text-primary business-hover-primary-soft"
                            >
                              {isRTL ? "فتح في الخرائط" : "Open in Maps"}
                            </a>
                          </div>
                        )}

                        {/* Text Content */}
                        {msg.content && (
                          <LinkifiedText
                            text={msg.content}
                            className={`block text-sm business-text-strong whitespace-pre-wrap leading-relaxed min-w-[120px] ${isRTL ? "text-right" : "text-left"}`}
                          />
                        )}

                        {/* Footer (Time + Status) */}
                        <div
                          className={`flex ${isRTL ? "justify-start" : "justify-end"} items-center gap-1 mt-1 select-none`}
                        >
                          <span className="text-[10px] business-text-subtle">
                            {msg.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMe &&
                            (msg.status === "read" ? (
                              <CheckCheck
                                size={14}
                                className="business-text-primary"
                              />
                            ) : (
                              <Check
                                size={14}
                                className="business-text-subtle"
                              />
                            ))}
                        </div>

                        {/* Message Actions (Hover) */}
                        <div
                          className={`absolute top-0 ${isMe ? (isRTL ? "-right-20" : "-left-20") : isRTL ? "-left-20" : "-right-20"} h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 ${isRTL ? "flex-row-reverse" : ""}`}
                        >
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="p-1.5 business-bg-panel rounded-full shadow business-text-muted business-hover-primary-text"
                            title={isRTL ? "رد" : "Reply"}
                          >
                            <Reply size={14} />
                          </button>
                          <button
                            onClick={() => handleForwardMessage(msg)}
                            className="p-1.5 business-bg-panel rounded-full shadow business-text-muted business-hover-primary-text"
                            title={isRTL ? "إعادة توجيه" : "Forward"}
                          >
                            <Forward size={14} />
                          </button>
                          {isMe && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setInputText(msg.content);
                                }}
                                className="p-1.5 business-bg-panel rounded-full shadow business-text-muted business-hover-primary-text"
                                title={isRTL ? "تعديل" : "Edit"}
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1.5 business-bg-panel rounded-full shadow business-text-muted business-hover-danger-text"
                                title={isRTL ? "حذف" : "Delete"}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 business-bg-panel border-t business-border z-10 px-4 py-4">
              {/* Reply Preview */}
              {replyingTo && (
                <div
                  className={`mb-2 p-2 business-bg-primary-soft rounded-lg flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <div className="flex-1">
                    <p className="text-xs font-semibold business-text-primary">
                      {isRTL ? "رد على" : "Replying to"} {replyingTo.senderName}
                    </p>
                    <p className="text-xs business-text-body truncate">
                      {replyingTo.content || (isRTL ? "وسائط" : "Media")}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 business-hover-primary-soft business-hover-primary-solid rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Edit Preview */}
              {editingMessage && (
                <div
                  className={`mb-2 p-2 business-bg-warning-soft rounded-lg flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <p className="text-xs font-semibold business-text-warning">
                    {isRTL ? "تعديل الرسالة" : "Editing message"}
                  </p>
                  <button
                    onClick={() => {
                      setEditingMessage(null);
                      setInputText("");
                    }}
                    className="p-1 business-hover-warning-soft rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div
                className={`flex items-end gap-2 w-full ${isRTL ? "flex-row-reverse" : ""}`}
              >
                {/* File Menu */}
                {showFileMenu && (
                  <div
                    className={`absolute bottom-16 ${isRTL ? "right-4" : "left-4"} business-bg-panel rounded-lg shadow-xl border business-border p-2 z-50`}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowFileMenu(false);
                        }}
                        className="p-3 business-hover-soft rounded-lg flex flex-col items-center gap-2"
                      >
                        <ImageIcon
                          size={24}
                          className="business-text-primary"
                        />
                        <span className="text-xs business-text-body">
                          {isRTL ? "صورة" : "Photo"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          videoInputRef.current?.click();
                          setShowFileMenu(false);
                        }}
                        className="p-3 business-hover-soft rounded-lg flex flex-col items-center gap-2"
                      >
                        <Video size={24} className="business-text-primary" />
                        <span className="text-xs">
                          {isRTL ? "فيديو" : "Video"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          audioInputRef.current?.click();
                          setShowFileMenu(false);
                        }}
                        className="p-3 business-hover-soft rounded-lg flex flex-col items-center gap-2"
                      >
                        <Music size={24} className="business-text-primary" />
                        <span className="text-xs">
                          {isRTL ? "صوت" : "Audio"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          documentInputRef.current?.click();
                          setShowFileMenu(false);
                        }}
                        className="p-3 business-hover-soft rounded-lg flex flex-col items-center gap-2"
                      >
                        <File size={24} className="business-text-primary" />
                        <span className="text-xs">
                          {isRTL ? "ملف" : "File"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          handleSendLocation();
                          setShowFileMenu(false);
                        }}
                        className="p-3 business-hover-soft rounded-lg flex flex-col items-center gap-2"
                      >
                        <Map size={24} className="business-text-primary" />
                        <span className="text-xs">
                          {isRTL ? "موقع" : "Location"}
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Implement contact sharing
                          alert(
                            isRTL
                              ? "ميزة مشاركة جهة الاتصال قريباً"
                              : "Contact sharing coming soon",
                          );
                          setShowFileMenu(false);
                        }}
                        className="p-3 business-hover-soft rounded-lg flex flex-col items-center gap-2"
                      >
                        <Contact size={24} className="business-text-primary" />
                        <span className="text-xs">
                          {isRTL ? "جهة اتصال" : "Contact"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, "image")}
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  className="hidden"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, "video")}
                />
                <input
                  type="file"
                  ref={audioInputRef}
                  className="hidden"
                  accept="audio/*"
                  onChange={(e) => handleFileSelect(e, "audio")}
                />
                <input
                  type="file"
                  ref={documentInputRef}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, "document")}
                />

                <button
                  onClick={() => setShowFileMenu(!showFileMenu)}
                  className="p-3 business-hover-soft rounded-full business-text-subtle business-hover-muted  transition-colors"
                  title={isRTL ? "إرفاق ملف" : "Attach File"}
                >
                  <Paperclip size={24} />
                </button>

                <div
                  className={`flex-1 business-bg-soft border business-border business-control-border rounded-2xl flex items-center ${isRTL ? "pr-4 pl-4" : "pl-4 pr-4"} py-2 business-focus-within-primary business-focus-within-panel transition-all`}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (editingMessage) {
                          handleEditMessage(editingMessage);
                        } else {
                          handleSendMessage();
                        }
                      }
                    }}
                    placeholder={isRTL ? "اكتب رسالة..." : "Write a message..."}
                    className="w-full business-bg-clear border-none focus:ring-0 business-text-strong business-placeholder-muted leading-relaxed"
                  />
                  <Smile
                    size={20}
                    className={`business-text-subtle cursor-pointer business-hover-muted ${isRTL ? "mr-2" : "ml-2"}`}
                  />
                </div>

                {inputText.trim() || editingMessage ? (
                  <button
                    onClick={() =>
                      editingMessage
                        ? handleEditMessage(editingMessage)
                        : handleSendMessage()
                    }
                    className="p-3 business-bg-primary-solid business-text-on-accent rounded-full shadow-lg business-hover-primary-soft0 active:scale-95 transition-all flex items-center justify-center transform"
                  >
                    <Send size={20} className={isRTL ? "mr-0.5" : "ml-0.5"} />
                  </button>
                ) : (
                  <button
                    className="p-3 business-bg-soft-strong business-text-muted rounded-full business-hover-soft transition-colors"
                    title={
                      isRTL
                        ? "رسالة صوتية (قريباً)"
                        : "Record Voice (Coming Soon)"
                    }
                  >
                    <Mic size={24} />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center business-text-subtle select-none">
            <div className="w-24 h-24 business-bg-soft rounded-full flex items-center justify-center mb-6 shadow-sm">
              <MessageCircle size={48} className="business-text-subtle" />
            </div>
            <p className="text-lg font-medium business-text-subtle">
              {isRTL ? "اختر محادثة للبدء" : "Select a chat to start messaging"}
            </p>
            <p
              className={`text-sm mt-2 max-w-xs text-center ${isRTL ? "text-right" : "text-left"}`}
            >
              {isRTL
                ? "استخدم شريط البحث على اليمين للعثور على عملاء محددين."
                : "Use the search bar on the left to find specific customers."}
            </p>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Info/CRM - Position based on language */}
      {selectedConversationId && activeConversation && isInfoOpen && (
        <div
          className={`w-[300px] business-bg-panel border-l business-border flex flex-col z-20 shadow-lg animate-in slide-in-from-right duration-300 ${isRTL ? "order-1 border-r border-l-0" : "order-3"}`}
        >
          {/* Header */}
          <div
            className={`p-4 border-b business-border flex justify-between items-center ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <h3 className="font-bold business-text-body">
              {isRTL ? "معلومات المستخدم" : "UserInfo"}
            </h3>
            <button
              onClick={() => setIsInfoOpen(false)}
              className="business-text-subtle business-hover-muted"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br business-bg-brand-gradient business-text-on-accent flex items-center justify-center text-3xl font-bold shadow-lg mb-3">
                {activeConversation.customerName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-bold business-text-strong text-center">
                {activeConversation.customerName}
              </h2>
              <p className="text-sm business-text-muted">
                @
                {activeConversation.customerName
                  .replace(/\s/g, "")
                  .toLowerCase()}
              </p>
              <span className="mt-2 text-xs business-bg-primary-soft business-text-primary px-2 py-1 rounded-full font-medium">
                {isRTL ? "مستخدم تيليجرام" : "Telegram User"}
              </span>
            </div>

            {/* Info List */}
            <div className="space-y-4">
              <div
                className={`flex items-center gap-3 business-text-muted ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Phone size={18} className="business-text-subtle" />
                <span className="text-sm">+20 10XXXX XXXX</span>
              </div>
              <div
                className={`flex items-center gap-3 business-text-muted ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Bot size={18} className="business-text-subtle" />
                <span className="text-sm text-wrap break-all">
                  {activeConversation.customerId}
                </span>
              </div>
              <div
                className={`flex items-center gap-3 business-text-muted ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <MapPin size={18} className="business-text-subtle" />
                <span className="text-sm">
                  {isRTL ? "مصر (تقريبي)" : "Egypt (Approx.)"}
                </span>
              </div>
            </div>

            {/* Shared Media Section */}
            <div className="pt-4 border-t business-border">
              <h4
                className={`text-xs font-bold business-text-subtle uppercase tracking-wider mb-3 ${isRTL ? "text-right" : "text-left"}`}
              >
                {isRTL ? "الوسائط المشتركة" : "Shared Media"}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {mediaMessages.slice(0, 9).map((msg, idx) => (
                  <div
                    key={idx}
                    className="aspect-square business-bg-soft-strong rounded-lg overflow-hidden cursor-pointer hover:opacity-80"
                  >
                    {msg.type === "image" && msg.fileUrl ? (
                      <img
                        src={msg.fileUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {msg.type === "video" && (
                          <Video size={20} className="business-text-subtle" />
                        )}
                        {msg.type === "document" && (
                          <File className="business-text-subtle" size={20} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t business-border space-y-2">
              <button
                className={`w-full py-2 flex items-center justify-center gap-2 business-text-danger business-bg-danger-soft business-hover-danger-soft rounded-lg transition-colors text-sm font-medium ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Trash2 size={16} />
                {isRTL ? "حذف المحادثة" : "Delete Conversation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramConversationsPro;
