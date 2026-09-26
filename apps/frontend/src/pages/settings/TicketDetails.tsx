import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  UserIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  StarIcon as StarOutlineIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { toast } from "sonner";
import i18n from "../../i18n";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";

interface Message {
  id: number;
  ticket_id: number;
  message: string;
  content: string; // Turbo API uses content
  sender_name: string;
  created_at: string;
  is_client_message: number;
  is_comment: number;
  sender: {
    id: number;
    first_name: string;
    last_name: string;
    role_name: string;
  };
  user?: {
    // Turbo API uses user
    id: number;
    name: string;
    first_name: string;
    last_name: string;
    role: {
      name: string;
    };
  };
}

interface TicketDetails {
  id: number;
  description: string;
  content: string; // Turbo API uses content
  status: number;
  rate?: number | null;
  created_at: string;
  messages: Message[];
  logs?: any[];
}

const TicketDetails: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicketDetails();
    }
  }, [ticketId]);

  const loadTicketDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🎫 Loading ticket details from Backend for ID: ${ticketId}`);

      // Call both backend endpoints parallel
      const [ticketResponse, logResponse] = await Promise.all([
        apiClient.get<any>(`/turbo/tickets/${ticketId}`),
        apiClient.get<any>(`/turbo/tickets/${ticketId}/log`),
      ]);

      console.log("📋 Backend ticket response:", ticketResponse.data);
      console.log("📋 Backend log response:", logResponse.data);

      if (!ticketResponse.data.success) {
        throw new Error(
          ticketResponse.data.message || i18n.t("TicketDetails.failed_load_cd6e"),
        );
      }

      // Backend structure: { success: true, data: { success: true, ticket: {...}, ... } }
      const ticketResult = ticketResponse.data.data;
      const logResult = logResponse.data.data;

      // Extract ticket data - ticketResult.ticket contains the actual ticket from Turbo API
      const ticketData = ticketResult.ticket || {};
      // Extract logs - logResult.logs contains the log array
      const logsData = logResult.logs || [];

      // Turbo API returns messages in replies field, not messages
      // Convert replies to messages for consistency
      const messages = ticketData.messages || ticketData.replies || [];

      // Sort messages by created_at ascending (oldest first) for display from top to bottom
      const sortedMessages = [...messages].sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB;
      });

      // Combine ticket data with logs
      const combinedTicket = {
        id: ticketData.id || parseInt(ticketId || "0"),
        description:
          ticketData.content || ticketData.description || "تذكرة Turbo",
        content: ticketData.content || ticketData.description || "",
        status: ticketData.status !== undefined ? ticketData.status : 1,
        created_at: ticketData.created_at || new Date().toISOString(),
        messages: sortedMessages,
        logs: logsData,
        rate: ticketData.rate ?? ticketData.rating ?? null,
      };

      if (ticketData.rate !== undefined && ticketData.rate !== null) {
        setCurrentRating(Number(ticketData.rate));
      } else if (ticketData.rating !== undefined && ticketData.rating !== null) {
        setCurrentRating(Number(ticketData.rating));
      }

      console.log("✅ Combined ticket data:", combinedTicket);
      console.log(
        "📋 Ticket messages count:",
        combinedTicket.messages?.length || 0,
      );
      console.log("📋 Ticket logs count:", combinedTicket.logs?.length || 0);
      console.log("📋 Sample message:", combinedTicket.messages?.[0]);
      console.log("📋 Sample log:", combinedTicket.logs?.[0]);
      setTicket(combinedTicket);
    } catch (error: any) {
      console.error("❌ Error loading ticket from Backend:", error);
      setError(
        error.response?.data?.message ||
          error.message ||
          "فشل تحميل تفاصيل التذكرة",
      );
      tToast.error("TicketDetails.failed_load_cd6e");
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "جديد";
      case 1:
        return "قيد المعالجة";
      case 2:
        return "مغلق";
      default:
        return "غير معروف";
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case 1:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case 2:
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!replyMessage.trim() && !replyImage) {
      tToast.error("TicketDetails.msg_0d3f");
      return;
    }

    if (!ticketId) {
      tToast.error("TicketDetails.msg_8919");
      return;
    }

    try {
      setSendingReply(true);

      // إنشاء FormData
      const text = replyMessage.trim() || (replyImage ? "مرفق لقطة شاشة / صورة" : "");
      const formData = new FormData();
      formData.append("message", text);
      formData.append("content", text);

      // إضافة الصورة إذا كانت موجودة
      if (replyImage) {
        formData.append("image", replyImage);
      }

      const response = await apiClient.post<any>(
        `/turbo/tickets/${ticketId}/reply`,
        formData
      );

      if (response.data.success) {
        tToast.success("TicketDetails.success_send_02a0");
        setReplyMessage("");
        setReplyImage(null);
        // إعادة تحميل تفاصيل التذكرة لتحديث الرسائل
        loadTicketDetails();
      } else {
        throw new Error(response.data.message || i18n.t("TicketDetails.failed_send_234e"));
      }
    } catch (error: any) {
      console.error("❌ Error sending reply:", error);
      toast.error(
        error.response?.data?.error || error.message || "فشل إرسال الرد",
      );
    } finally {
      setSendingReply(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // التحقق من نوع الملف
      if (!file.type.startsWith("image/")) {
        tToast.error("TicketDetails.msg_47f7");
        return;
      }
      // التحقق من حجم الملف (10MB)
      if (file.size > 10 * 1024 * 1024) {
        tToast.error("TicketDetails.msg_ff96");
        return;
      }
      setReplyImage(file);
    }
  };

  const handleRateTicket = async (score: number) => {
    if (!ticketId || submittingRating) return;
    try {
      setSubmittingRating(true);
      const res = await apiClient.post<any>(`/turbo/tickets/${ticketId}/rate`, { rate: score });
      if (res.data?.success) {
        setCurrentRating(score);
        toast.success("تم تقييم التذكرة بنجاح");
      } else {
        toast.error(res.data?.message || "تعذر إرسال التقييم");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء التقييم");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="w-full">
          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-900 dark:shadow-black/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">
              جاري تحميل تفاصيل التذكرة...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="w-full">
          <button
            onClick={() => navigate("/settings/turbo")}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة لإعدادات Turbo
          </button>

          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-900 dark:shadow-black/20">
            <ExclamationCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
              خطأ في تحميل التذكرة
            </h2>
            <p className="mb-4 text-gray-600 dark:text-gray-300">{error}</p>
            <button
              onClick={loadTicketDetails}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-950">
        <div className="w-full">
          <button
            onClick={() => navigate("/settings/turbo")}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة لإعدادات Turbo
          </button>

          <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-900 dark:shadow-black/20">
            <p className="text-gray-600 dark:text-gray-300">
              لم يتم العثور على التذكرة
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/settings/turbo")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            العودة لإعدادات Turbo
          </button>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تذكرة #{ticket.id}
          </h1>
        </div>

        {/* Ticket Info */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                معلومات التذكرة
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Rating Component */}
              <div className="flex items-center gap-1 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl px-2.5 py-1">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 ml-1">
                  {currentRating ? `التقييم (${currentRating}/5):` : "تقييم الدعم:"}
                </span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={submittingRating}
                    onClick={() => handleRateTicket(star)}
                    className="p-0.5 text-amber-500 hover:scale-110 transition disabled:opacity-50"
                    title={`تقييم ${star} من 5 نجوم`}
                  >
                    {currentRating && currentRating >= star ? (
                      <StarSolidIcon className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ) : (
                      <StarOutlineIcon className="h-4 w-4 text-amber-400 hover:text-amber-500" />
                    )}
                  </button>
                ))}
              </div>

              <span
                className={`px-3 py-1 text-sm rounded-full ${getStatusColor(ticket.status)}`}
              >
                {getStatusText(ticket.status)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <ClockIcon className="w-4 h-4" />
              تاريخ الإنشاء: {formatDate(ticket.created_at)}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              وصف المشكلة
            </label>
            <p className="rounded-lg bg-gray-50 p-4 text-gray-900 dark:bg-gray-800 dark:text-gray-100">
              {ticket.description}
            </p>
          </div>
        </div>

        {/* Messages/Conversation */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-black/20">
          <div className="flex items-center gap-3 mb-6">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              المحادثة
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({ticket.messages?.length || 0} رسالة)
            </span>
          </div>

          {ticket.messages && ticket.messages.length > 0 ? (
            <div className="space-y-4">
              {ticket.messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${Number(message.is_client_message) === 1 ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] ${
                      Number(message.is_client_message) === 1
                        ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        : "bg-indigo-600 text-white"
                    } rounded-lg p-4`}
                  >
                    {/* Sender info */}
                    <div className="flex items-center gap-2 mb-2">
                      <UserIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {message.user?.name ||
                          message.sender_name ||
                          (message.user?.first_name
                            ? `${message.user.first_name} ${message.user.last_name}`
                            : null) ||
                          (message.sender?.first_name
                            ? `${message.sender.first_name} ${message.sender.last_name}`
                            : "مستخدم")}
                      </span>
                      {Number(message.is_client_message) === 1 ? (
                        (message.user?.role?.name ||
                          message.sender?.role_name) && (
                          <span className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                            {message.user?.role?.name ||
                              message.sender?.role_name}
                          </span>
                        )
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-indigo-500 text-indigo-100">
                          خدمة العملاء
                        </span>
                      )}
                    </div>

                    {/* Message content */}
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content || message.message}
                    </p>

                    {/* Timestamp */}
                    <p
                      className={`text-xs mt-2 ${
                        Number(message.is_client_message) === 1
                          ? "text-gray-500 dark:text-gray-400"
                          : "text-indigo-200"
                      }`}
                    >
                      {formatDate(message.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <ChatBubbleLeftRightIcon className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p>لا توجد رسائل في هذه التذكرة</p>
            </div>
          )}
        </div>

        {/* Reply Form */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-black/20">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            إرسال رد
          </h2>
          <form onSubmit={handleReply} className="space-y-4">
            <div>
              <label
                htmlFor="replyMessage"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                الرسالة
              </label>
              <textarea
                id="replyMessage"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type && items[i].type.startsWith("image/")) {
                      const blob = items[i].getAsFile();
                      if (blob) {
                        e.preventDefault();
                        const ext = blob.type.split("/")[1] || "png";
                        const file = new File([blob], `screenshot_${Date.now()}.${ext}`, {
                          type: blob.type || "image/png",
                        });
                        setReplyImage(file);
                        toast.success("تم لصق لقطة الشاشة بنجاح!");
                        return;
                      }
                    }
                  }
                }}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                placeholder={
                  replyImage
                    ? "اكتب تعليقاً على الصورة (اختياري) أو اضغط إرسال..."
                    : "اكتب رسالتك هنا، أو الصق لقطة الشاشة مباشرة (Ctrl+V)..."
                }
                disabled={sendingReply}
              />
            </div>

            <div>
              <label
                htmlFor="replyImage"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                صورة (اختياري)
              </label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="replyImage"
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <PhotoIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {replyImage ? replyImage.name : "اختر صورة"}
                  </span>
                </label>
                <input
                  id="replyImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={sendingReply}
                />
                {replyImage && (
                  <button
                    type="button"
                    onClick={() => setReplyImage(null)}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    disabled={sendingReply}
                  >
                    إزالة
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingReply || (!replyMessage.trim() && !replyImage)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              {sendingReply ? "جاري الإرسال..." : "إرسال الرد"}
            </button>
          </form>
        </div>

        {/* Logs Section */}
        {ticket.logs && ticket.logs.length > 0 && (
          <div className="mt-6 rounded-lg bg-white p-6 shadow dark:bg-gray-900 dark:shadow-black/20">
            <div className="flex items-center gap-3 mb-6">
              <ClockIcon className="w-6 h-6 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                سجل التذكرة
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({ticket.logs.length} سجل)
              </span>
            </div>

            <div className="space-y-3">
              {ticket.logs.map((log: any, index: number) => (
                <div
                  key={log.id || index}
                  className="rounded-lg border-r-4 border-indigo-500 bg-gray-50 p-4 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="mb-2 text-sm text-gray-900 dark:text-gray-100">
                        {log.description?.ar ||
                          log.description ||
                          "لا يوجد وصف"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <UserIcon className="w-3 h-3" />
                        <span>{log.user?.full_name || "مستخدم"}</span>
                        <span>•</span>
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetails;
