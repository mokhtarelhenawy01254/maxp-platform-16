import React, { useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";
import LinkifiedText from "../../components/common/LinkifiedText";

interface Conversation {
  id: string;
  customerId: string;
  platform: string;
  status: string;
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  metadata: any;
  customerName?: string; // اسم العميل
  pageName?: string; // اسم صفحة الفيسبوك
  pageId?: string; // معرف صفحة الفيسبوك
}

interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: string;
  direction: string;
  isFromCustomer: boolean;
  timestamp: string;
  status: string;
  metadata: any;
  isFacebookReply?: boolean; // إضافة معلومة الردود من فيسبوك
  facebookMessageId?: string; // إضافة معرف رسالة فيسبوك
}

const ConversationsSimple: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // تحميل المحادثات
  const loadConversations = async () => {
    try {
      console.log("🔄 Loading conversations...");
      const response = await apiClient.get("/conversations");

      const data = response.data;
      console.log("📊 API Response:", data);

      // Check if data is an array (direct response) or has success property
      if (Array.isArray(data)) {
        console.log("✅ Conversations loaded:", data.length, "conversations");
        setConversations(data);
        setError(null);
      } else if (data.success && data.data) {
        console.log("✅ Conversations loaded:", data.data);
        setConversations(data.data);
        setError(null);
      } else {
        console.error("❌ API returned unexpected format:", data);
        setError("تنسيق غير متوقع من الخادم");
      }
    } catch (error) {
      console.error("❌ Error loading conversations:", error);
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  // تحميل الرسائل
  const loadMessages = async (conversationId: string) => {
    try {
      console.log("🔄 Loading messages for conversation:", conversationId);
      const response = await apiClient.get(
        `/conversations/${conversationId}/messages`,
      );

      const data = response.data;
      console.log("📊 Messages Response:", data);

      // Check if data is an array (direct response) or has success property
      if (Array.isArray(data)) {
        console.log("✅ Messages loaded:", data.length, "messages");
        // تحويل الرسائل الحقيقية إلى تنسيق الواجهة مع إضافة خصائص فيسبوك
        const formattedMessages: Message[] = data.map((msg: any) => ({
          ...msg,
          isFacebookReply:
            msg.isFacebookReply || msg.metadata?.isFacebookReply || false, // Include Facebook reply flag
          facebookMessageId:
            msg.facebookMessageId || msg.metadata?.facebookMessageId || null, // Include Facebook message ID
        }));
        setMessages(formattedMessages);
      } else if (data.success && data.data) {
        console.log("✅ Messages loaded:", data.data);
        // تحويل الرسائل الحقيقية إلى تنسيق الواجهة مع إضافة خصائص فيسبوك
        const formattedMessages: Message[] = data.data.map((msg: any) => ({
          ...msg,
          isFacebookReply:
            msg.isFacebookReply || msg.metadata?.isFacebookReply || false, // Include Facebook reply flag
          facebookMessageId:
            msg.facebookMessageId || msg.metadata?.facebookMessageId || null, // Include Facebook message ID
        }));
        setMessages(formattedMessages);
      } else {
        console.error("❌ Failed to load messages:", data);
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
    }
  };

  // إرسال رسالة
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      console.log("📤 Sending message:", newMessage);
      const response = await apiClient.post(
        `/conversations/${selectedConversation.id}/messages`,
        {
          message: newMessage,
        },
      );

      const data = response.data;
      console.log("📤 Send response:", data);

      setNewMessage("");
      // إعادة تحميل الرسائل
      loadMessages(selectedConversation.id);
    } catch (error) {
      console.error("❌ Error sending message:", error);
    }
  };

  // تحميل المحادثات عند بدء التطبيق
  useEffect(() => {
    loadConversations();
  }, []);

  // تحميل الرسائل عند اختيار محادثة
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل المحادثات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadConversations}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* قائمة المحادثات */}
      <div className="w-1/3 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            المحادثات ({conversations.length})
          </h2>
        </div>

        <div className="overflow-y-auto h-full">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">لا توجد محادثات</div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conversation.id
                    ? "bg-blue-50 border-blue-200"
                    : ""
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">
                    {conversation.customerName || conversation.customerId}
                    {conversation.pageName && (
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded mr-2">
                        {conversation.pageName}
                      </span>
                    )}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {conversation.platform}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {conversation.lastMessage || "لا توجد رسائل"}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(conversation.lastMessageAt).toLocaleString(
                      "ar-EG",
                    )}
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {conversation.messageCount} رسالة
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* رأس المحادثة */}
            <div className="bg-white border-b border-gray-200 p-4">
              <h3 className="font-bold text-lg text-gray-800">
                محادثة مع{" "}
                {selectedConversation.customerName ||
                  selectedConversation.customerId}
                {selectedConversation.pageName && (
                  <span className="text-sm text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded mr-2">
                    {selectedConversation.pageName}
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-500">
                منصة: {selectedConversation.platform} | الحالة:{" "}
                {selectedConversation.status}
              </p>
            </div>

            {/* قائمة الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  لا توجد رسائل في هذه المحادثة
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.isFromCustomer ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isFromCustomer
                            ? "bg-white border border-gray-200 text-gray-800"
                            : message.isFacebookReply
                              ? "bg-purple-100 border border-purple-200 text-purple-800" // نمط خاص للردود من فيسبوك
                              : "bg-blue-500 text-white"
                        }`}
                      >
                        {/* عرض أيقونة خاصة للردود من فيسبوك */}
                        {message.isFacebookReply && (
                          <div className="flex items-center mb-1">
                            <span className="text-xs font-bold text-purple-600">
                              رد من صفحتك على فيسبوك
                            </span>
                          </div>
                        )}
                        <LinkifiedText text={message.content} className="block text-sm" />
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.timestamp).toLocaleString("ar-EG")}
                        </p>
                        {/* عرض معرف رسالة فيسبوك إذا كان متوفرًا */}
                        {message.facebookMessageId && (
                          <p className="text-xs mt-1 opacity-50">
                            معرف فيسبوك:{" "}
                            {message.facebookMessageId.substring(0, 10)}...
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* منطقة إرسال الرسائل */}
            <div className="bg-white border-t border-gray-200 p-4">
              <div className="flex">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || loading}
                  className="bg-blue-500 text-white px-6 py-2 rounded-r-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  إرسال
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-gray-500">
                اختر محادثة من القائمة لعرض الرسائل
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsSimple;
