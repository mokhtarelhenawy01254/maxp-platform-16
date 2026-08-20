import React, { useState, useEffect, useRef } from "react";
import i18n from "../../i18n";
import {
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import { useDateFormat } from "../../hooks/useDateFormat";
import { buildApiUrl } from "../../utils/urlHelper";
import { socketService } from "../../services/socketService";
import LinkifiedText from "../../components/common/LinkifiedText";

// إضافة الـ CSS animations
const styles = `
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out forwards;
  }

  .glass-effect {
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.8);
  }

  .conversation-item {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .conversation-item:hover {
    transform: translateY(-2px);
  }

  .message-bubble {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .message-bubble:hover {
    transform: scale(1.02);
  }

  /* Custom Scrollbar للمحادثات */
  .conversations-scroll {
    scrollbar-width: auto;
  }

  .conversations-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .conversations-scroll::-webkit-scrollbar-track {
    background: rgba(243, 244, 246, 0.5);
    border-radius: 4px;
  }

  .conversations-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #6366f1, #8b5cf6);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .conversations-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #4f46e5, #7c3aed);
  }

  /* Custom Scrollbar للرسائل */
  .messages-scroll {
    scrollbar-width: auto;
  }

  .messages-scroll::-webkit-scrollbar {
    width: 8px;
  }

  .messages-scroll::-webkit-scrollbar-track {
    background: rgba(243, 244, 246, 0.3);
    border-radius: 4px;
  }

  .messages-scroll::-webkit-scrollbar-thumb {
    background: linear-gradient(to bottom, #10b981, #059669);
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .messages-scroll::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(to bottom, #047857, #065f46);
  }

  /* مؤشرات الـ Scroll */
  .scroll-indicator {
    position: relative;
  }

  .scroll-indicator::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 2px;
    height: 100%;
    background: linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.3), transparent);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .scroll-indicator:hover::before {
    opacity: 1;
  }
`;

// إضافة الـ styles للصفحة
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type: "text" | "image" | "file";
  isFromCustomer: boolean;
  status: "sent" | "delivered" | "read";
  metadata?: any;
}

interface Conversation {
  id: string;
  customerName: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
  platform: "facebook" | "whatsapp" | "telegram";
  messages: Message[];
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}

const Conversations: React.FC = () => {
  const { formatDate } = useDateFormat();
  // const { user } = useAuth(); // 'user' is declared but its value is never read.
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAutoUpdating, setIsAutoUpdating] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnected = false;

  // تحميل المحادثات من API
  const loadConversations = async (showAutoUpdateIndicator = false) => {
    try {
      // تجنب التحديث المتكرر - على الأقل ثانيتين بين التحديثات
      const now = Date.now();
      if (showAutoUpdateIndicator && now - lastUpdateTime < 2000) {
        return;
      }

      if (showAutoUpdateIndicator) {
        setIsAutoUpdating(true);
        setLastUpdateTime(now);
      } else {
        setLoading(true);
      }

      const response = await fetch(buildApiUrl("conversations"));
      const data = await response.json();

      if (data.success) {
        console.log("✅ Conversations loaded successfully:", data.data.length);

        // تحويل البيانات للتنسيق المطلوب
        const formattedConversations = data.data.map((conv: any) => ({
          id: conv.id,
          customerName: conv.customerName || "عميل غير معروف", // Fix: Use customerName instead of customerId
          lastMessage: conv.lastMessage || "لا توجد رسائل",
          lastMessageTime: new Date(conv.lastMessageTime || Date.now()),
          unreadCount: conv.unreadCount || 0,
          platform: conv.platform || "unknown",
          isOnline: false,
          messages: [],
          pageName: conv.pageName || null, // إضافة اسم الصفحة
          pageId: conv.pageId || null, // إضافة معرف الصفحة
        }));

        setConversations(formattedConversations);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
      setIsAutoUpdating(false);
    }
  };

  // تحميل رسائل محادثة معينة
  const loadMessages = async (conversationId: string, silent = false) => {
    try {
      const response = await fetch(
        buildApiUrl(`conversations/${conversationId}/messages`),
      );
      const data = await response.json();

      if (data.success) {
        // تحديث ذكي للرسائل - فقط عند وجود تغييرات
        const currentMessages = selectedConversation?.messages || [];
        const hasNewMessages =
          currentMessages.length !== data.data.length ||
          data.data.some(
            (msg: any, index: number) =>
              !currentMessages[index] || currentMessages[index].id !== msg.id,
          );

        if (hasNewMessages) {
          console.log("📨 Updating messages - new messages detected");

          // تحديث المحادثة المحددة بالرسائل
          setConversations((prev: Conversation[]) =>
            prev.map((conv: Conversation) =>
              conv.id === conversationId
                ? { ...conv, messages: data.data }
                : conv,
            ),
          );

          // تحديث المحادثة المختارة
          if (selectedConversation?.id === conversationId) {
            setSelectedConversation((prev: Conversation | null) =>
              prev ? { ...prev, messages: data.data } : null,
            );

            // إزالة التمرير التلقائي المزعج
            // if (!silent) {
            //   setTimeout(scrollToBottom, 100);
            // }
          }

          // إشعار صوتي ومرئي للرسائل الجديدة (فقط إذا كانت من العميل)
          if (silent && data.data.length > currentMessages.length) {
            const newMessage = data.data[data.data.length - 1];
            if (newMessage?.isFromCustomer) {
              console.log(
                "🔔 New customer message - playing notification sound",
              );

              // تحديث مؤشر الرسائل الجديدة
              setHasNewMessages(true);

              // تحديث عنوان الصفحة
              document.title = "🔔 رسالة جديدة - منصة التواصل";

              // تشغيل صوت إشعار بسيط
              try {
                const audio = new Audio(
                  "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
                );
                audio.volume = 0.3;
                audio
                  .play()
                  .catch((e) =>
                    console.log("Could not play notification sound:", e),
                  );
              } catch (e) {
                console.log("Notification sound not available");
              }
            }
          }
        } else if (!silent) {
          console.log("✅ No new messages - skipping update");
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // مراقبة التمرير لإظهار/إخفاء زر التمرير
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;
    setShowScrollButton(!isNearBottom);
  };

  // تتبع حالة الكتابة المحسن
  const handleTypingStart = () => {
    if (!isUserTyping) {
      console.log("🖊️ User started typing - pausing auto-update");
      setIsUserTyping(true);
    }

    // إلغاء المؤقت السابق
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // إعداد مؤقت جديد لإيقاف حالة الكتابة بعد ثانيتين من عدم الكتابة
    typingTimeoutRef.current = setTimeout(() => {
      console.log("✅ User stopped typing - resuming auto-update");
      setIsUserTyping(false);
    }, 2000); // تقليل الوقت إلى ثانيتين
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Socket.IO event listeners للتحديث الفوري
  useEffect(() => {
    // Connect to socket if not already connected
    if (!socketService.isConnected()) {
      socketService.connect();
    }

    // Listen for new messages
    const handleNewMessage = (message: any) => {
      console.log("🔌 [SOCKET] New message received:", message);

      // Update messages in selected conversation
      if (selectedConversation?.id === message.conversationId) {
        setSelectedConversation((prev: Conversation | null) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, message],
          };
        });
      }

      // Update conversation list with latest message
      setConversations((prev: Conversation[]) => {
        return prev.map((conv: Conversation) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: message.content,
              lastMessageTime: new Date(message.timestamp),
              unreadCount: conv.unreadCount + (message.isFromCustomer ? 1 : 0),
            };
          }
          return conv;
        });
      });
    };

    // Listen for new conversations
    const handleNewConversation = (conversation: any) => {
      console.log("🔌 [SOCKET] New conversation received:", conversation);

      // Add new conversation to the top of the list
      setConversations((prev: Conversation[]) => {
        // Check if conversation already exists
        const exists = prev.some(
          (conv: Conversation) => conv.id === conversation.id,
        );
        if (exists) {
          // Update existing conversation
          return prev.map((conv: Conversation) =>
            conv.id === conversation.id ? { ...conv, ...conversation } : conv,
          );
        } else {
          // Add new conversation to the beginning of the list
          return [conversation, ...prev];
        }
      });
    };

    // Listen for conversation updates
    const handleConversationUpdated = (conversation: any) => {
      console.log("🔌 [SOCKET] Conversation updated:", conversation);

      // Update conversation in the list
      setConversations((prev: Conversation[]) => {
        return prev.map((conv: Conversation) =>
          conv.id === conversation.id ? { ...conv, ...conversation } : conv,
        );
      });
    };

    // Register event listeners
    socketService.onMessage(handleNewMessage);
    socketService.onConversationUpdated(handleConversationUpdated);
    socketService.onNewConversation(handleNewConversation); // Add this line

    // Cleanup function
    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("conversation:updated", handleConversationUpdated);
      socketService.off("conversation:new", handleNewConversation);
    };
  }, [selectedConversation]);

  // useEffect للتحديث التلقائي الذكي والسريع
  useEffect(() => {
    console.log("🔄 Setting up smart real-time update system");

    // تحديث أبطأ كل 10 ثوان للمحادثات
    const conversationsInterval = setInterval(() => {
      if (!isUserTyping) {
        console.log("🔄 Smart auto-updating conversations...");
        loadConversations(true);
      } else {
        console.log("⏸️ Skipping conversations auto-update: user is typing");
      }
    }, 10000); // كل 10 ثوان للمحادثات

    return () => {
      clearInterval(conversationsInterval);
    };
  }, [isUserTyping]); // مع dependency صحيحة

  // تحديث منفصل للرسائل
  useEffect(() => {
    if (!selectedConversation) return;

    console.log(
      "🔄 Setting up messages auto-update for conversation:",
      selectedConversation.id,
    );

    // تحديث سريع كل 5 ثوان للرسائل الجديدة
    const messagesInterval = setInterval(() => {
      if (!isUserTyping) {
        console.log("🔄 Smart auto-updating messages...");
        loadMessages(selectedConversation.id, true);
      } else {
        console.log("⏸️ Skipping messages auto-update: user is typing");
      }
    }, 5000); // كل 5 ثوان للرسائل

    return () => {
      clearInterval(messagesInterval);
    };
  }, [selectedConversation?.id, isUserTyping]); // مع dependencies صحيحة

  // تنظيف timeout الكتابة
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      selectedConversation &&
      (!selectedConversation.messages ||
        selectedConversation.messages.length === 0)
    ) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // إزالة التمرير التلقائي المزعج - دع المستخدم يتحكم في التمرير
  // useEffect(() => {
  //   scrollToBottom();
  // }, [selectedConversation?.messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const messageContent = newMessage;
    setNewMessage(""); // مسح الرسالة فوراً

    console.log("📤 Attempting to send message:", messageContent);
    console.log("📤 To conversation:", selectedConversation.id);

    try {
      // 🔧 FIX: استخدم endpoint الصحيح
      const url = buildApiUrl(
        `conversations/${selectedConversation.id}/messages`,
      );
      console.log("📤 Sending POST to:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageContent,
        }),
      });

      console.log("📤 Response status:", response.status);
      console.log("📤 Response ok:", response.ok);

      const data = await response.json();
      console.log("📤 Response data:", data);

      if (data.success) {
        console.log("✅ Message sent successfully");

        // إرسال إشعار عبر Socket.IO للتحديث الفوري (معطل مؤقتاً)
        // Socket.IO معطل للاختبار
        console.log("📡 Socket.IO disabled - message sent via HTTP only");

        // إعادة تحميل الرسائل لإظهار الرسالة الجديدة
        console.log("🔄 Reloading messages to show new message...");
        await loadMessages(selectedConversation.id, true);

        // التمرير لأسفل فقط عند إرسال رسالة جديدة
        setTimeout(scrollToBottom, 300);

        // تحديث آخر رسالة في قائمة المحادثات
        setConversations((prev: Conversation[]) =>
          prev.map((conv: Conversation) =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessage: messageContent,
                  lastMessageTime: new Date(),
                }
              : conv,
          ),
        );

        console.log("✅ Message handling completed");
      } else {
        console.error("❌ Server returned error:", data.message);
        alert("فشل في إرسال الرسالة: " + data.message);
        setNewMessage(messageContent); // إرجاع الرسالة في حالة الفشل
      }
    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert(i18n.t("Conversations.error_error_e429"));
      setNewMessage(messageContent); // إرجاع الرسالة في حالة الفشل
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === "string" ? new Date(date) : date;

    // التحقق من صحة التاريخ
    if (isNaN(dateObj.getTime())) {
      return "غير محدد";
    }

    const diff = now.getTime() - dateObj.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "الآن";
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return formatDate(dateObj);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "facebook":
        return (
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">f</span>
          </div>
        );
      case "whatsapp":
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs">💬</span>
          </div>
        );
      case "telegram":
        return (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs">✈️</span>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs">💬</span>
          </div>
        );
    }
  };

  // تحديد المحادثة كمقروءة
  const markAsRead = async (conversationId: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`conversations/${conversationId}/read`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        // تحديث عداد الرسائل غير المقروءة
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv,
          ),
        );
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  // معالجة اختيار محادثة
  const handleSelectConversation = (conversation: Conversation) => {
    // تجنب إعادة التحديد للمحادثة نفسها
    if (selectedConversation?.id === conversation.id) {
      return;
    }

    console.log("📱 Selecting conversation:", conversation.id);
    setSelectedConversation(conversation);

    // إزالة مؤشر الرسائل الجديدة
    setHasNewMessages(false);
    document.title = "منصة التواصل";

    // تحميل رسائل المحادثة الجديدة
    loadMessages(conversation.id);

    if (conversation.unreadCount > 0) {
      markAsRead(conversation.id);
    }
  };

  // التحديث اليدوي
  const handleManualRefresh = () => {
    console.log("🔄 Manual refresh triggered");
    loadConversations(true);
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 mx-auto"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-white mx-auto"></div>
          </div>
          <div className="mt-6 space-y-2">
            <p className="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              جاري تحميل المحادثات
            </p>
            <p className="text-sm text-gray-500">يرجى الانتظار قليلاً...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-full">
      {/* Conversations Sidebar */}
      <div className="w-1/3 bg-white/80 backdrop-blur-sm border-r border-gray-200/50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-gray-200/50 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">المحادثات</h2>
                <p className="text-indigo-100 text-sm">
                  إدارة محادثات العملاء ({filteredConversations.length})
                </p>
              </div>
              {hasNewMessages && (
                <div className="flex items-center space-x-2 space-x-reverse bg-red-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-red-100 font-medium animate-pulse">
                    رسائل جديدة
                  </span>
                </div>
              )}
            </div>
            {isAutoUpdating && !isUserTyping && (
              <div className="flex items-center text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white ml-2"></div>
                <span className="text-white font-medium">تحديث تلقائي</span>
              </div>
            )}
            {isUserTyping && (
              <div className="flex items-center text-sm bg-orange-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
                <div className="flex space-x-1 ml-2">
                  <div className="w-2 h-2 bg-orange-300 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-orange-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-orange-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-orange-100 font-medium">
                  جاري الكتابة
                </span>
              </div>
            )}
          </div>
          <div className="flex space-x-3 space-x-reverse mt-4">
            <div className="relative flex-1">
              <label htmlFor="conversations-search" className="sr-only">
                البحث في المحادثات
              </label>
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60" />
              <input
                id="conversations-search"
                name="searchQuery"
                type="text"
                autoComplete="off"
                placeholder="البحث في المحادثات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:ring-2 focus:ring-white/50 focus:border-white/50 backdrop-blur-sm transition-all duration-200"
              />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <button
                onClick={handleManualRefresh}
                disabled={loading || isAutoUpdating}
                className="p-3 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                title="تحديث المحادثات"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${loading || isAutoUpdating ? "animate-spin" : ""}`}
                />
              </button>

              {/* مؤشر حالة التحديث التلقائي */}
              <div className="flex items-center space-x-2 space-x-reverse text-xs bg-white/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                <div
                  className={`w-2 h-2 rounded-full ${!isUserTyping ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}
                ></div>
                <span className="text-white/80 font-medium">
                  {!isUserTyping ? "متصل" : "متوقف"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 conversations-scroll scroll-indicator">
          {filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  لا توجد محادثات
                </h3>
                <p className="text-gray-500 text-sm">
                  في انتظار رسائل العملاء...
                </p>
              </div>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`conversation-item group relative p-4 mb-2 rounded-2xl cursor-pointer animate-slide-in ${
                  selectedConversation?.id === conversation.id
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-white/60 hover:bg-white/80 backdrop-blur-sm border border-gray-200/50 hover:shadow-lg hover:shadow-gray-500/10"
                }`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="relative">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        selectedConversation?.id === conversation.id
                          ? "bg-white/20 backdrop-blur-sm"
                          : "bg-gradient-to-br from-indigo-100 to-purple-100"
                      }`}
                    >
                      <UserCircleIcon
                        className={`h-8 w-8 ${
                          selectedConversation?.id === conversation.id
                            ? "text-white"
                            : "text-indigo-600"
                        }`}
                      />
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                    )}
                    <div className="absolute -bottom-1 -left-1 text-sm">
                      {getPlatformIcon(conversation.platform)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3
                        className={`text-base font-semibold truncate transition-colors duration-300 ${
                          selectedConversation?.id === conversation.id
                            ? "text-white"
                            : "text-gray-900"
                        }`}
                      >
                        {conversation.customerName}
                        {conversation.pageName && (
                          <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                            {conversation.pageName}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span
                          className={`text-xs font-medium ${
                            selectedConversation?.id === conversation.id
                              ? "text-white/80"
                              : "text-gray-500"
                          }`}
                        >
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-2 text-xs font-bold text-white bg-red-500 rounded-full shadow-lg animate-pulse">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-sm truncate transition-colors duration-300 ${
                        selectedConversation?.id === conversation.id
                          ? "text-white/90"
                          : "text-gray-600"
                      }`}
                    >
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 h-full max-h-full flex flex-col bg-white/50 backdrop-blur-sm overflow-hidden">
          {/* Chat Header */}
          <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center shadow-lg">
                    <UserCircleIcon className="h-8 w-8 text-indigo-600" />
                  </div>
                  {selectedConversation.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedConversation.customerName}
                  </h3>
                  <div className="flex items-center space-x-3 space-x-reverse mt-1">
                    <span
                      className={`text-sm font-medium ${selectedConversation.isOnline ? "text-green-600" : "text-gray-500"}`}
                    >
                      {selectedConversation.isOnline ? "متصل الآن" : "غير متصل"}
                    </span>
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <div
                        className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                      ></div>
                      <span className="text-xs text-gray-500">
                        {isConnected ? "مباشر" : "غير مباشر"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <button className="p-3 text-gray-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all duration-200 group">
                  <PhoneIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                </button>
                <button className="p-3 text-gray-400 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-200 group">
                  <VideoCameraIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                </button>
                <button className="p-3 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 group">
                  <InformationCircleIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                </button>
                <button className="p-3 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all duration-200 group">
                  <EllipsisVerticalIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="relative flex-1 min-h-0 overflow-hidden">
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="h-full max-h-full overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-transparent to-gray-50/50 messages-scroll scroll-indicator"
            >
              {selectedConversation?.messages?.length > 0 ? (
                selectedConversation.messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromCustomer ? "justify-start" : "justify-end"} animate-fade-in`}
                    style={{
                      animationDelay: `${index * 0.1}s`,
                    }}
                  >
                    <div
                      className={`message-bubble relative max-w-xs lg:max-w-md px-5 py-3 rounded-2xl shadow-lg backdrop-blur-sm ${
                        message.isFromCustomer
                          ? "bg-white/90 text-gray-900 border border-gray-200/50"
                          : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-indigo-500/25"
                      }`}
                    >
                      <LinkifiedText
                        text={message.content}
                        className="block text-sm leading-relaxed"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <div
                          className={`text-xs font-medium ${
                            message.isFromCustomer
                              ? "text-gray-500"
                              : "text-white/80"
                          }`}
                        >
                          {formatTime(message.timestamp)}
                        </div>

                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <ChatBubbleLeftRightIcon className="h-10 w-10 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      لا توجد رسائل بعد
                    </h3>
                    <p className="text-gray-500 mb-4">
                      ابدأ محادثة جديدة مع العميل
                    </p>
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium shadow-lg">
                      <span>في انتظار الرسائل...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* زر التمرير لأسفل */}
            {showScrollButton && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-4 right-4 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group animate-fade-in"
                title="التمرير لأسفل"
              >
                <svg
                  className="w-5 h-5 group-hover:translate-y-1 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Message Input */}
          <div className="flex-shrink-0 bg-white/80 backdrop-blur-sm border-t border-gray-200/50 p-6 shadow-lg">
            <div className="flex items-end space-x-3 space-x-reverse">
              <button className="p-3 text-gray-400 hover:text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all duration-200 group">
                <PaperClipIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <div className="flex-1 relative">
                <label htmlFor="conversation-message-input" className="sr-only">
                  اكتب رسالتك هنا
                </label>
                <textarea
                  id="conversation-message-input"
                  name="message"
                  autoComplete="off"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTypingStart(); // تتبع الكتابة
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="اكتب رسالتك هنا..."
                  className="w-full px-5 py-4 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  rows={1}
                />
              </div>
              <button className="p-3 text-gray-400 hover:text-purple-600 rounded-xl hover:bg-purple-50 transition-all duration-200 group">
                <FaceSmileIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 group"
              >
                <PaperAirplaneIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 h-full max-h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 overflow-hidden">
          <div className="text-center p-12">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
              <ChatBubbleLeftRightIcon className="h-12 w-12 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              اختر محادثة للبدء
            </h3>
            <p className="text-gray-500 text-lg mb-6">
              اختر محادثة من القائمة لبدء المراسلة مع العملاء
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer">
              <span>جاهز للمحادثة</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversations;
