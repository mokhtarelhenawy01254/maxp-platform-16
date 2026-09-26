import React, { useState, useEffect, useRef, useCallback } from "react";
// Turbo ticket chat panel with strict hook ordering and responsive UX
import {
  PaperAirplaneIcon,
  PhotoIcon,
  XMarkIcon,
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  UserIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  MapPinIcon,
  TruckIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import { TurboTicketItem, TurboMessage } from "./types";
import {
  parseSafeDate,
  formatSafeTime,
  formatSafeDateTime,
} from "./ticketDateUtils";

interface TurboTicketChatPanelProps {
  ticket: TurboTicketItem | null;
  loading: boolean;
  onRefreshTicket: () => void;
  onBackToList?: () => void;
  onOpenLogs: () => void;
}

// استخراج كافة روابط الصور والمرفقات من التذكرة أو الرد أياً كان شكلها في استجابة Turbo
const extractMediaUrls = (item: any): string[] => {
  const urls: string[] = [];
  if (!item) return urls;

  const normalizeUrl = (raw: any): string | null => {
    if (!raw) return null;
    let s = String(raw).trim();
    if (!s) return null;
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:") || s.startsWith("data:")) {
      return s;
    }
    if (s.startsWith("/")) {
      return `https://backoffice.turbo-eg.com${s}`;
    }
    return `https://backoffice.turbo-eg.com/${s}`;
  };

  const addUrl = (val: any) => {
    if (!val) return;
    if (typeof val === "string") {
      const u = normalizeUrl(val);
      if (u && !urls.includes(u)) urls.push(u);
    } else if (typeof val === "object") {
      const u = normalizeUrl(val.url || val.file_url || val.path || val.media_url || val.src);
      if (u && !urls.includes(u)) urls.push(u);
    }
  };

  addUrl(item.image);
  addUrl(item.media_url);
  addUrl(item.file);
  addUrl(item.file_url);
  addUrl(item.attachment);
  addUrl(item.attachment_url);

  const mediaList = Array.isArray(item.media)
    ? item.media
    : Array.isArray(item.attachments)
    ? item.attachments
    : Array.isArray(item.images)
    ? item.images
    : [];

  mediaList.forEach(addUrl);
  return urls;
};

const getStatusBadge = (status: any) => {
  let val = "";
  let label = "";

  if (status && typeof status === "object") {
    val = String(status.value || "").toLowerCase().trim();
    label = status.label || "";
  } else if (status !== undefined && status !== null) {
    val = String(status).toLowerCase().trim();
  }

  if (val === "0" || val === "open" || val === "new") {
    return {
      label: label || "جديدة",
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
    };
  }
  if (val === "3" || val === "on_hold" || val === "hold" || val === "pending") {
    return {
      label: label || "معلقة",
      className:
        "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20",
    };
  }
  if (val === "1" || val === "in_progress" || val === "processing") {
    return {
      label: label || "قيد المعالجة",
      className:
        "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20",
    };
  }
  if (val === "2" || val === "closed" || val === "resolved" || val === "solved") {
    return {
      label: label || "مغلقة",
      className:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    };
  }

  if (label) {
    return {
      label,
      className:
        "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20",
    };
  }

  return {
    label: "غير محدد",
    className:
      "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20",
  };
};

export const TurboTicketChatPanel: React.FC<TurboTicketChatPanelProps> = ({
  ticket,
  loading,
  onRefreshTicket,
  onBackToList,
  onOpenLogs,
}) => {
  const { user } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [ratingScore, setRatingScore] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showOrderSidebar, setShowOrderSidebar] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [searchingOrder, setSearchingOrder] = useState(false);
  const [manualMatchedOrder, setManualMatchedOrder] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate and cleanup object URL for reply image preview
  useEffect(() => {
    if (!replyImage) {
      setReplyImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(replyImage);
    setReplyImagePreview(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [replyImage]);

  // Handle screenshot paste (Ctrl+V) from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const items = (e as any).clipboardData?.items;
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
          toast.success("تم لصق لقطة الشاشة بنجاح! جاهزة للإرسال.");
          return;
        }
      }
    }
  }, []);

  // Global window paste listener for screenshots while viewing ticket
  useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl && activeEl.tagName === "INPUT" && activeEl.getAttribute("placeholder")?.includes("1042")) {
        return;
      }
      handlePaste(e);
    };
    window.addEventListener("paste", onGlobalPaste);
    return () => window.removeEventListener("paste", onGlobalPaste);
  }, [handlePaste]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type && file.type.startsWith("image/")) {
        setReplyImage(file);
        toast.success("تم إرفاق الصورة بنجاح");
      } else {
        toast.error("يرجى إرفاق ملف صورة صالح (PNG, JPG, WEBP)");
      }
    }
  };

  useEffect(() => {
    if (ticket) {
      setRatingScore(ticket.rate ?? ticket.rating ?? null);
      setReplyText("");
      setReplyImage(null);
      setManualMatchedOrder(null);
      setOrderSearchQuery("");
      if (ticket.matchedOrder) {
        setShowOrderSidebar(true);
      }
    }
  }, [ticket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length, ticket?.replies?.length]);

  const activeOrder = ticket?.matchedOrder || manualMatchedOrder;

  const isMessageFromStore = (msg: TurboMessage) => {
    if (msg.is_client_message === 1 || msg.is_client_message === true) return true;
    if (msg.is_client_message === 0 || msg.is_client_message === false) return false;

    // Fallback if is_client_message not provided by Turbo API
    const agentId = (ticket as any)?.agent?.id ? String((ticket as any).agent.id) : null;
    const userId = msg.user?.id ? String(msg.user.id) : null;
    const userName = (msg.user?.name || "").toLowerCase();
    const username = (msg.user?.username || "").toLowerCase();
    const email = (msg.user?.email || "").toLowerCase();

    if (
      (agentId && userId === agentId) ||
      username === "ai_customer_service" ||
      email.includes("algoistic.com") ||
      userName.includes("ai customer") ||
      userName.includes("خدمة العملاء") ||
      userName.includes("الدعم الفني")
    ) {
      return false;
    }

    return true;
  };

  const formatSenderName = (msg: TurboMessage) => {
    const isStore = isMessageFromStore(msg);

    if (isStore) {
      const storeName = user?.company?.name?.trim() || "المتجر";
      let personName = (
        msg.sender_name ||
        msg.user?.name ||
        ""
      ).trim();
      personName = personName
        .replace(/العميل\s+[^\s]+/gi, "")
        .replace(/client\s+[^\s]+/gi, "")
        .trim();

      if (
        !personName ||
        personName.toLowerCase() === "المتجر" ||
        personName.toLowerCase() === "swan" ||
        personName.toLowerCase() === "client"
      ) {
        personName =
          `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
          "المسؤول";
      }
      return `${storeName} - ${personName}`;
    } else {
      let turboName = (
        msg.user?.name ||
        msg.sender_name ||
        [msg.user?.first_name, msg.user?.last_name].filter(Boolean).join(" ") ||
        [msg.sender?.first_name, msg.sender?.last_name].filter(Boolean).join(" ") ||
        ""
      ).trim();

      turboName = turboName
        .replace(/^تربو\s*[-–:]*\s*/gi, "")
        .replace(/^turbo\s*[-–:]*\s*/gi, "")
        .trim();

      if (!turboName || turboName === "خدمة عملاء" || turboName === "الدعم الفني") {
        turboName = "خدمة العملاء";
      }
      return `تربو - ${turboName}`;
    }
  };

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSearchQuery.trim()) return;
    try {
      setSearchingOrder(true);
      const res = await apiClient.get<any>(
        `/orders?search=${encodeURIComponent(orderSearchQuery.trim())}&limit=1`
      );
      const ord =
        res.data?.orders?.[0] ||
        res.data?.data?.orders?.[0] ||
        res.data?.data?.[0];
      if (ord) {
        setManualMatchedOrder({
          id: ord.id,
          orderNumber: ord.orderNumber,
          status: ord.status,
          turboStatus: ord.turboShipmentStatus || ord.shippingStatus,
          turboTrackingNumber: ord.turboTrackingNumber,
          turboShipmentId: ord.turboShipmentId,
          turboCaptainName: ord.turboCaptainName,
          turboCaptainPhone: ord.turboCaptainPhone,
          customer: {
            name: ord.customerName || ord.customer?.name,
            phone: ord.customerPhone || ord.customer?.phone,
            address:
              ord.shippingAddress ||
              ord.customerAddress ||
              ord.customer?.address,
            city: ord.city || ord.customer?.city,
            governorate: ord.governorate || ord.customer?.governorate,
          },
          items: (ord.orderItems || ord.items || []).map((it: any) => ({
            id: it.id,
            productName: it.productName || it.product?.name || "منتج",
            variantName: it.variantName || it.productVariant?.name,
            quantity: it.quantity,
            unitPrice: Number(it.price || it.unitPrice || 0),
            total: Number(it.total || (it.quantity || 1) * (it.price || 0)),
          })),
          financials: {
            subtotal: Number(ord.subtotal || 0),
            shippingFee: Number(ord.shippingFee || ord.shippingCost || 0),
            discount: Number(ord.discount || 0),
            total: Number(ord.total || 0),
          },
        });
        toast.success(`تم العثور على أوردر #${ord.orderNumber}`);
      } else {
        toast.error("لم يتم العثور على أوردر بهذا الرقم");
      }
    } catch {
      toast.error("فشل البحث عن الأوردر");
    } finally {
      setSearchingOrder(false);
    }
  };

  const messages: TurboMessage[] = ticket?.messages || ticket?.replies || [];
  const uniqueMessages = React.useMemo(() => {
    if (!ticket) return [];
    const sorted = [...messages].sort((a, b) => {
      const tA = parseSafeDate(a.created_at)?.getTime() || 0;
      const tB = parseSafeDate(b.created_at)?.getTime() || 0;
      return tA - tB;
    });

    const seenKeys = new Set<string>();
    const initialText = (ticket.content || ticket.description || "")
      .trim()
      .replace(/\s+/g, " ");

    return sorted.filter((msg, idx) => {
      const text = (msg.content || msg.message || "").trim().replace(/\s+/g, " ");

      // 1. Deduplicate by unique message ID
      if (msg.id) {
        const idKey = `id_${msg.id}`;
        if (seenKeys.has(idKey)) return false;
        seenKeys.add(idKey);
      }

      // 2. Suppress duplicate initial message matching the ticket's Initial Ticket Card
      const isStore = isMessageFromStore(msg);
      if (initialText && text === initialText && (idx === 0 || isStore)) {
        return false;
      }

      // 3. Fallback dedup for identical content repeated with the same timestamp & sender
      const contentKey = `c_${text}_${msg.created_at || ""}_${msg.user?.name || ""}`;
      if (seenKeys.has(contentKey)) return false;
      seenKeys.add(contentKey);

      return true;
    });
  }, [ticket?.messages, ticket?.replies, ticket?.content, ticket?.description, (ticket as any)?.agent]);

  if (!ticket) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50 dark:bg-zinc-950/40">
        <div className="max-w-md space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center">
            <DocumentTextIcon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            اختر تذكرة لعرض المحادثة
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            يمكنك متابعة المحادثة الحية مع فريق عمليات وخدمة عملاء شركة تربو،
            والرد المباشر وإرفاق الصور أو فتح تذكرة جديدة.
          </p>
        </div>
      </main>
    );
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("تم نسخ كود الشحنة");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRate = async (score: number) => {
    if (submittingRating || !ticket.id) return;
    try {
      setSubmittingRating(true);
      const res = await apiClient.post<any>(
        `/turbo/tickets/${ticket.id}/rate`,
        { rate: score }
      );
      if (res.data?.success) {
        setRatingScore(score);
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!replyText.trim() && !replyImage) || sending || !ticket?.id) return;

    try {
      setSending(true);
      const formData = new FormData();
      const text = replyText.trim() || (replyImage ? "مرفق لقطة شاشة / صورة" : "");
      formData.append("message", text);
      formData.append("content", text);
      formData.append("ticket_id", String(ticket.id));

      if (replyImage) {
        formData.append("image", replyImage);
      }

      const res = await apiClient.post<any>(
        `/turbo/tickets/${ticket.id}/reply`,
        formData
      );

      if (res.data?.success) {
        toast.success("تم إرسال الرد والمرفق بنجاح لشركة الشحن");
        setReplyText("");
        setReplyImage(null);
        onRefreshTicket();
      } else {
        toast.error(res.data?.message || res.data?.error || "فشل إرسال الرد");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "حدث خطأ أثناء إرسال الرد"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/40 min-w-0 relative">
      {/* Top Header Bar */}
      <header className="p-2.5 sm:p-3 px-3 sm:px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-2.5 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="md:hidden p-1.5 px-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition active:scale-95 flex items-center gap-1 text-xs font-semibold shrink-0"
              title="الرجوع لقائمة التذاكر"
            >
              <ArrowRightIcon className="h-4 w-4" />
              <span>رجوع</span>
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
                تذكرة #{ticket.id}
              </h2>
              {ticket.status !== undefined && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    getStatusBadge(ticket.status).className
                  }`}
                >
                  {getStatusBadge(ticket.status).label}
                </span>
              )}
              {ticket.code && String(ticket.code).trim() !== String(ticket.id).trim() && (
                <button
                  type="button"
                  onClick={() => handleCopyCode(ticket.code!)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-mono transition"
                  title="نسخ كود الشحنة"
                >
                  <span>شحنة: {ticket.code}</span>
                  {copiedCode ? (
                    <ClipboardDocumentCheckIcon className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <ClipboardDocumentIcon className="h-3 w-3 text-zinc-400" />
                  )}
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-sm mt-0.5">
              {ticket.subject || ticket.description || "استفسار شحن"}
            </p>
          </div>
        </div>

        {/* Right Tools: Order Details & Rating & Logs & Refresh */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowOrderSidebar((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
              showOrderSidebar
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs"
                : activeOrder || ticket.matchedOrderSummary
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
            title="تفاصيل الأوردر المرتبط"
          >
            <ShoppingBagIcon className="h-4 w-4" />
            <span className="hidden sm:inline">تفاصيل الأوردر</span>
            {(activeOrder || ticket.matchedOrderSummary) && (
              <span className="tabular-nums font-mono px-1.5 py-0.2 rounded text-[10px] bg-emerald-600 text-white font-bold">
                #{activeOrder?.orderNumber || ticket.matchedOrderSummary?.orderNumber}
              </span>
            )}
          </button>

          {/* Rating */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs">
            <span className="text-zinc-500 text-[11px] ml-1">تقييم:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                disabled={submittingRating}
                onClick={() => handleRate(s)}
                className="text-amber-400 hover:scale-110 transition disabled:opacity-50"
              >
                {ratingScore && ratingScore >= s ? (
                  <StarSolid className="h-3.5 w-3.5" />
                ) : (
                  <StarOutline className="h-3.5 w-3.5 text-zinc-400" />
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenLogs}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ClockIcon className="h-3.5 w-3.5" />
            <span>السجل</span>
          </button>

          <button
            type="button"
            onClick={onRefreshTicket}
            disabled={loading}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-50"
            title="تحديث المحادثة"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </header>

      {/* Main Workspace: Chat Feed + Collapsible Order Details Sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Column: Messages Thread & Input Bar */}
        <div
          className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Visual Backdrop Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-40 bg-zinc-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4 text-center pointer-events-none animate-fadeIn">
              <div className="p-4 rounded-2xl bg-white/10 border-2 border-dashed border-white text-white shadow-xl">
                <PhotoIcon className="h-10 w-10 animate-bounce text-emerald-400" />
              </div>
              <div>
                <p className="font-bold text-base text-white">أفلت الصورة أو لقطة الشاشة هنا</p>
                <p className="text-xs text-zinc-300 mt-1">سيتم إرفاقها بالتذكرة فوراً وتجهيزها للإرسال</p>
              </div>
            </div>
          )}

          {/* Messages Thread Feed */}
          <div
            className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3.5 min-h-0 touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* Initial Ticket Card */}
            {(() => {
              const storeName = user?.company?.name?.trim() || "المتجر";
              let creatorClean = (
                ticket.creator_name ||
                ticket.user?.name ||
                ticket.user_name ||
                ticket.client_name ||
                ""
              )
                .trim()
                .replace(/العميل\s+[^\s]+/gi, "")
                .trim();

              if (
                !creatorClean ||
                creatorClean.toLowerCase() === "swan" ||
                creatorClean === "المتجر"
              ) {
                creatorClean =
                  `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
                  "المسؤول";
              }
              const byText = `${storeName} - ${creatorClean}`;
              const initialMediaUrls = extractMediaUrls(ticket);

              return (
                <div className="p-3 sm:p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5 flex-wrap gap-1">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      تذكرة بواسطة: {byText}
                    </span>
                    <span className="tabular-nums font-mono text-[11px]">
                      {ticket.created_at
                        ? formatSafeDateTime(ticket.created_at)
                        : ""}
                    </span>
                  </div>
                  {ticket.category?.name && (
                    <div className="mb-2">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                        الفئة: {ticket.category.name}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {ticket.content || ticket.description || "لا يوجد وصف إضافي"}
                  </p>

                  {/* Initial Ticket Attachment if present */}
                  {initialMediaUrls.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                      <p className="text-[11px] text-zinc-400 mb-1.5 font-medium">
                        مرفقات التذكرة ({initialMediaUrls.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {initialMediaUrls.map((url, attIdx) => (
                          <button
                            key={attIdx}
                            type="button"
                            onClick={() => setPreviewImage(url)}
                            className="group relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 max-w-[160px] max-h-[120px] focus:outline-hidden bg-zinc-950/20"
                            title="تكبير المرفق"
                          >
                            <img
                              src={url}
                              alt={`مرفق ${attIdx + 1}`}
                              className="object-cover w-full h-full group-hover:scale-105 transition"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Messages Stream */}
            {uniqueMessages.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                لا توجد ردود بعد. سيتم عرض ردود خدمة عملاء تربو هنا فور وصولها.
              </div>
            ) : (
              uniqueMessages.map((msg, idx) => {
                const isStore = isMessageFromStore(msg);
                const senderTitle = formatSenderName(msg);
                const roleName = isStore
                  ? user?.company?.name?.trim() || "المتجر"
                  : "تربو";
                const textContent = msg.content || msg.message || "";
                const msgMediaUrls = extractMediaUrls(msg);

                return (
                  <div
                    key={msg.id || idx}
                    className={`flex flex-col ${
                      isStore ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1 px-1 flex-wrap">
                      <UserIcon className="h-3 w-3" />
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {senderTitle}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        {roleName}
                      </span>
                      {msg.created_at && (
                        <span className="tabular-nums font-mono text-[10px]">
                          •{" "}
                          {formatSafeTime(msg.created_at)}
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[88%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                        isStore
                          ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-br-xs"
                          : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-bl-xs"
                      }`}
                    >
                      {textContent && (
                        <p className="whitespace-pre-wrap break-words">{textContent}</p>
                      )}

                      {msgMediaUrls.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msgMediaUrls.map((url, uIdx) => (
                            <img
                              key={uIdx}
                              src={url}
                              alt="مرفق التذكرة"
                              onClick={() => setPreviewImage(url)}
                              className="max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition border border-white/20 object-contain bg-zinc-950/20"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar with Safe Area Bottom Padding */}
          <footer className="p-2.5 sm:p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg sm:shadow-none">
            {replyImage && (
              <div className="flex items-center gap-3 mb-2 p-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs w-fit shadow-xs">
                {replyImagePreview ? (
                  <img
                    src={replyImagePreview}
                    alt="معاينة المرفق"
                    onClick={() => setPreviewImage(replyImagePreview)}
                    className="w-10 h-10 object-cover rounded-lg border border-zinc-300 dark:border-zinc-700 cursor-pointer hover:opacity-80 transition shrink-0"
                    title="تكبير الصورة"
                  />
                ) : (
                  <PhotoIcon className="h-6 w-6 text-zinc-500 shrink-0" />
                )}
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[180px]">
                      {replyImage.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      ({(replyImage.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    جاهزة للإرسال مع الرد
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyImage(null)}
                  className="text-zinc-400 hover:text-rose-500 p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                  title="إلغاء المرفق"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleSendReply} className="flex items-center gap-1.5 sm:gap-2">
              <label
                className="p-2 sm:p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition active:scale-95 shrink-0"
                title="إرفاق صورة أو لقطة شاشة"
              >
                <PhotoIcon className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={sending}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReplyImage(e.target.files[0]);
                    }
                  }}
                />
              </label>

              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  replyImage
                    ? "اكتب تعليقاً على الصورة (اختياري) أو اضغط إرسال..."
                    : "اكتب ردك، أو الصق لقطة الشاشة مباشرة (Ctrl+V)..."
                }
                disabled={sending}
                className="flex-1 min-w-0 px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-400 dark:focus:border-zinc-600 transition"
              />

              <button
                type="submit"
                disabled={sending || (!replyText.trim() && !replyImage)}
                className="p-2.5 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 disabled:opacity-40 transition active:scale-97 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold shrink-0 shadow-xs"
              >
                <span>{sending ? "إرسال..." : "إرسال"}</span>
                <PaperAirplaneIcon className="h-3.5 w-3.5 rotate-180" />
              </button>
            </form>
          </footer>
        </div>

        {/* Right Column: In-Chat Order Details Sidebar */}
        {showOrderSidebar && (
          <aside className="w-80 sm:w-88 md:w-96 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full min-h-0 overflow-hidden shrink-0 absolute inset-y-0 right-0 z-30 md:static md:z-auto shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShoppingBagIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {activeOrder
                    ? `تفاصيل طلب #${activeOrder.orderNumber}`
                    : "تفاصيل الأوردر المرتبط"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderSidebar(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                title="إغلاق القائمة الجانبية"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Sidebar Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
              {activeOrder ? (
                <>
                  {/* Statuses & Tracking */}
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 space-y-2">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <span className="text-[11px] text-zinc-500">حالة الطلب بالمتجر:</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                        {activeOrder.status}
                      </span>
                    </div>
                    {activeOrder.turboStatus && (
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[11px] text-zinc-500">حالة شحن تربو:</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          {activeOrder.turboStatus}
                        </span>
                      </div>
                    )}
                    {(activeOrder.turboTrackingNumber || activeOrder.turboShipmentId) && (
                      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-700/50">
                        <span className="text-[11px] text-zinc-500">رقم البوليصة / الشحنة:</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyCode(
                              String(activeOrder.turboTrackingNumber || activeOrder.turboShipmentId)
                            )
                          }
                          className="font-mono text-[11px] font-bold text-zinc-800 dark:text-zinc-200 hover:text-primary transition flex items-center gap-1"
                        >
                          <span>{activeOrder.turboTrackingNumber || activeOrder.turboShipmentId}</span>
                          <ClipboardDocumentIcon className="h-3 w-3 text-zinc-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Customer Details Card */}
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-zinc-500" />
                        <span>بيانات العميل</span>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {activeOrder.customer?.name || "عميل بدون اسم"}
                      </p>
                      {activeOrder.customer?.phone && (
                        <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                          <span className="font-mono text-zinc-700 dark:text-zinc-300 tabular-nums text-[11px]">
                            {activeOrder.customer.phone}
                          </span>
                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${activeOrder.customer.phone}`}
                              className="p-1 px-1.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition flex items-center gap-1 text-[10px]"
                              title="اتصال بالعميل"
                            >
                              <PhoneIcon className="h-3 w-3" />
                              <span>اتصال</span>
                            </a>
                            {(() => {
                              const cleanP = String(activeOrder.customer.phone).replace(/\D/g, "");
                              const waNumber = cleanP.startsWith("0") ? `2${cleanP}` : cleanP;
                              return (
                                <a
                                  href={`https://wa.me/${waNumber}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 px-1.5 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition flex items-center gap-1 text-[10px] font-semibold"
                                  title="محادثة واتساب"
                                >
                                  <ChatBubbleLeftRightIcon className="h-3 w-3" />
                                  <span>واتساب</span>
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    {(activeOrder.customer?.governorate ||
                      activeOrder.customer?.city ||
                      activeOrder.customer?.address) && (
                      <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 space-y-1">
                        <div className="flex items-start gap-1.5 text-zinc-600 dark:text-zinc-300 text-[11px]">
                          <MapPinIcon className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                          <div>
                            {(activeOrder.customer.governorate || activeOrder.customer.city) && (
                              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                                {[activeOrder.customer.governorate, activeOrder.customer.city]
                                  .filter(Boolean)
                                  .join(" - ")}
                              </p>
                            )}
                            {activeOrder.customer.address && (
                              <p className="text-zinc-500 dark:text-zinc-400 leading-snug">
                                {activeOrder.customer.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Products List */}
                  {activeOrder.items && activeOrder.items.length > 0 && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 space-y-2">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                        المنتجات المطلوبة ({activeOrder.items.length})
                      </span>
                      <div className="space-y-1.5 divide-y divide-zinc-200/50 dark:divide-zinc-700/50">
                        {activeOrder.items.map((item: any, iIdx: number) => (
                          <div
                            key={item.id || iIdx}
                            className="pt-1.5 first:pt-0 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {item.productName}
                              </p>
                              {item.variantName && (
                                <p className="text-[10px] text-zinc-500">
                                  {item.variantName}
                                </p>
                              )}
                              <p className="text-[10px] text-zinc-400 font-mono tabular-nums">
                                {item.quantity} × {item.unitPrice} ج.م
                              </p>
                            </div>
                            <span className="font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums text-xs">
                              {item.total} ج.م
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Breakdown */}
                  {activeOrder.financials && (
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700/60 space-y-1.5">
                      <span className="font-bold text-zinc-800 dark:text-zinc-200 block mb-1">
                        الحسابات المالية
                      </span>
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>قيمة المنتجات:</span>
                        <span className="font-mono tabular-nums font-medium">
                          {activeOrder.financials.subtotal} ج.م
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>مصاريف الشحن:</span>
                        <span className="font-mono tabular-nums font-medium">
                          {activeOrder.financials.shippingFee} ج.م
                        </span>
                      </div>
                      {activeOrder.financials.discount > 0 && (
                        <div className="flex items-center justify-between text-emerald-600 text-[11px]">
                          <span>الخصم:</span>
                          <span className="font-mono tabular-nums font-medium">
                            -{activeOrder.financials.discount} ج.م
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        <span>المطلوب تحصيله:</span>
                        <span className="font-mono tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
                          {activeOrder.financials.total} ج.م
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Turbo Captain info if assigned */}
                  {(activeOrder.turboCaptainName || activeOrder.turboCaptainPhone) && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                      <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <TruckIcon className="h-3.5 w-3.5" />
                        <span>مندوب / كابتن تربو</span>
                      </span>
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {activeOrder.turboCaptainName || "كابتن تربو"}
                      </p>
                      {activeOrder.turboCaptainPhone && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-mono text-zinc-700 dark:text-zinc-300 tabular-nums text-[11px]">
                            {activeOrder.turboCaptainPhone}
                          </span>
                          <a
                            href={`tel:${activeOrder.turboCaptainPhone}`}
                            className="p-1 px-2 rounded bg-amber-600 text-white hover:bg-amber-700 transition text-[10px] font-semibold"
                          >
                            اتصال
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Link to Store Order */}
                  <a
                    href={`/orders?search=${encodeURIComponent(activeOrder.orderNumber)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition active:scale-97 shadow-xs"
                  >
                    <span>عرض الأوردر بالكامل في المتجر</span>
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </a>
                </>
              ) : (
                <div className="space-y-3 py-4">
                  <div className="text-center space-y-1">
                    <ShoppingBagIcon className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">
                      لا يوجد أوردر مرتبط تلقائياً
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      يمكنك البحث برقم الأوردر أو كود الشحنة لعرض كافة تفاصيل الطلب هنا.
                    </p>
                  </div>

                  <form onSubmit={handleSearchOrder} className="space-y-2">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                      <input
                        type="text"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        placeholder="رقم الأوردر (مثال: 1042)..."
                        className="w-full pr-8 pl-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-400 transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={searchingOrder || !orderSearchQuery.trim()}
                      className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition disabled:opacity-40"
                    >
                      {searchingOrder ? "جاري البحث..." : "بحث عن الأوردر"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>


      {/* Enlarged Image Lightbox */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs cursor-zoom-out"
        >
          <img
            src={previewImage}
            alt="معاينة المرفق"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </main>
  );
};
