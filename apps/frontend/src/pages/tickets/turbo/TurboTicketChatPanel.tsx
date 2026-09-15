import React, { useState, useEffect, useRef } from "react";
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
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { TurboTicketItem, TurboMessage } from "./types";

interface TurboTicketChatPanelProps {
  ticket: TurboTicketItem | null;
  loading: boolean;
  onRefreshTicket: () => void;
  onBackToList?: () => void;
  onOpenLogs: () => void;
}

export const TurboTicketChatPanel: React.FC<TurboTicketChatPanelProps> = ({
  ticket,
  loading,
  onRefreshTicket,
  onBackToList,
  onOpenLogs,
}) => {
  const [replyText, setReplyText] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [ratingScore, setRatingScore] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket) {
      setRatingScore(ticket.rate ?? ticket.rating ?? null);
      setReplyText("");
      setReplyImage(null);
    }
  }, [ticket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages?.length, ticket?.replies?.length]);

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

  const messages: TurboMessage[] = ticket.messages || ticket.replies || [];
  const sortedMessages = [...messages].sort((a, b) => {
    const tA = new Date(a.created_at || 0).getTime();
    const tB = new Date(b.created_at || 0).getTime();
    return tA - tB;
  });

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
    if ((!replyText.trim() && !replyImage) || sending || !ticket.id) return;

    try {
      setSending(true);
      const formData = new FormData();
      formData.append("message", replyText.trim());
      formData.append("content", replyText.trim());
      formData.append("ticket_id", String(ticket.id));

      if (replyImage) {
        formData.append("image", replyImage);
        formData.append("media[0]", replyImage);
      }

      const res = await apiClient.post<any>(
        `/turbo/tickets/${ticket.id}/reply`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data?.success) {
        toast.success("تم إرسال الرد بنجاح لتربو");
        setReplyText("");
        setReplyImage(null);
        onRefreshTicket();
      } else {
        toast.error(res.data?.message || "فشل إرسال الرد");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
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
              {ticket.code && (
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

        {/* Right Tools: Rating & Logs & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
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

      {/* Messages Thread Feed */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3.5 min-h-0 touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Initial Ticket Card */}
        <div className="p-3 sm:p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1.5 flex-wrap gap-1">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              موضوع التذكرة وتفاصيل الشكوى
            </span>
            <span className="tabular-nums font-mono text-[11px]">
              {ticket.created_at
                ? new Date(ticket.created_at).toLocaleString("ar-EG")
                : ""}
            </span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {ticket.content || ticket.description || "لا يوجد وصف إضافي"}
          </p>
        </div>

        {/* Messages Stream */}
        {sortedMessages.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            لا توجد ردود بعد. سيتم عرض ردود خدمة عملاء تربو هنا فور وصولها.
          </div>
        ) : (
          sortedMessages.map((msg, idx) => {
            const isStore =
              Number(msg.is_client_message) === 1 ||
              msg.is_client_message === true;
            const senderTitle =
              msg.sender_name ||
              (isStore ? "أنا (المتجر)" : "خدمة عملاء تربو");
            const roleName =
              msg.user?.role?.name ||
              msg.sender?.role_name ||
              (isStore ? "المتجر" : "تربو");
            const textContent = msg.content || msg.message || "";
            const imageUrl = msg.image || msg.media_url;

            return (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${
                  isStore ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mb-1 px-1 flex-wrap">
                  <UserIcon className="h-3 w-3" />
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {senderTitle}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    {roleName}
                  </span>
                  {msg.created_at && (
                    <span className="tabular-nums font-mono text-[10px]">
                      •{" "}
                      {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
                  <p className="whitespace-pre-wrap break-words">{textContent}</p>

                  {imageUrl && (
                    <div className="mt-2">
                      <img
                        src={imageUrl}
                        alt="مرفق التذكرة"
                        onClick={() => setPreviewImage(imageUrl)}
                        className="max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition border border-white/20"
                      />
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
          <div className="flex items-center gap-2 mb-2 p-1.5 px-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs w-fit">
            <PhotoIcon className="h-4 w-4 text-zinc-500" />
            <span className="truncate max-w-[200px] text-zinc-700 dark:text-zinc-300">
              {replyImage.name}
            </span>
            <button
              type="button"
              onClick={() => setReplyImage(null)}
              className="text-rose-500 hover:text-rose-600 p-0.5 rounded"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendReply} className="flex items-center gap-1.5 sm:gap-2">
          <label className="p-2 sm:p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition active:scale-95 shrink-0" title="إرفاق صورة">
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
            placeholder="اكتب ردك لخدمة عملاء وعمليات تربو..."
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
