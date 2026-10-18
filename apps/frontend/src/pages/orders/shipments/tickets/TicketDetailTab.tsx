import React from "react";
import { RotateCw, Send, Image, ExternalLink } from "lucide-react";
import type { OrderTicketItem } from "./ticketTypes";
import { getStatusBadge } from "./ticketTypes";

export interface TicketDetailTabProps {
  ticketDetail: OrderTicketItem;
  loadingDetail: boolean;
  onRefreshDetail: () => void;
  replyContent: string;
  setReplyContent: (val: string) => void;
  replyImage: File | null;
  setReplyImage: (val: File | null) => void;
  sendingReply: boolean;
  onSendReply: (e: React.FormEvent) => void;
}

export const TicketDetailTab: React.FC<TicketDetailTabProps> = ({
  ticketDetail,
  loadingDetail,
  onRefreshDetail,
  replyContent,
  setReplyContent,
  replyImage,
  setReplyImage,
  sendingReply,
  onSendReply,
}) => {
  const badge = getStatusBadge(ticketDetail.status);
  const msgs = ticketDetail.messages || ticketDetail.replies || [];

  return (
    <div className="flex flex-col h-full">
      {/* Ticket Top Info */}
      <div className="p-3 bg-muted/40 border-b border-border/70 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs tabular-nums text-foreground">
            تذكرة #{ticketDetail.id}
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefreshDetail}
          disabled={loadingDetail}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition disabled:opacity-50 cursor-pointer"
          title="تحديث الردود"
        >
          <RotateCw className={`h-3.5 w-3.5 ${loadingDetail ? "animate-spin" : ""}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Messages Thread */}
      <div className="p-3.5 space-y-3 overflow-y-auto max-h-[350px] bg-background/50">
        {/* Initial Ticket Message */}
        {ticketDetail.subject && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 dark:text-amber-200">
            <p className="font-bold mb-1">موضوع التذكرة / البداية:</p>
            <p className="leading-relaxed whitespace-pre-wrap">{ticketDetail.subject}</p>
          </div>
        )}

        {/* Messages List */}
        {msgs.length === 0 && !ticketDetail.subject ? (
          <p className="text-center text-xs text-muted-foreground py-6">
            لا توجد رسائل مسجلة بعد.
          </p>
        ) : (
          msgs.map((msg, idx) => {
            const isClient =
              msg.is_client_message === 1 ||
              msg.is_client_message === true ||
              Boolean(msg.user?.name);
            const msgContent = msg.content || msg.message || "";

            return (
              <div
                key={msg.id || idx}
                className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isClient
                      ? "bg-amber-600 text-white rounded-br-xs shadow-xs"
                      : "bg-card text-foreground border border-border/70 rounded-bl-xs shadow-xs"
                  }`}
                >
                  <div className="text-[10px] opacity-75 font-semibold mb-1">
                    {isClient ? "أنت (المتجر)" : "خدمة العملاء / تربو"}
                  </div>
                  <p className="whitespace-pre-wrap">{msgContent}</p>
                  {msg.attachment && (
                    <a
                      href={msg.attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] underline opacity-90 hover:opacity-100"
                    >
                      <span>عرض المرفق</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {msg.created_at && (
                  <span className="text-[9px] text-muted-foreground mt-0.5 px-1 font-mono tabular-nums">
                    {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Reply Form Input */}
      <form
        onSubmit={onSendReply}
        className="p-3 border-t border-border/70 bg-card shrink-0 space-y-2"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={
              replyImage
                ? "اكتب تعليقاً على الصورة (اختياري) أو اضغط رد..."
                : "اكتب رداً على التذكرة، أو الصق لقطة الشاشة (Ctrl+V)..."
            }
            className="flex-1 h-10 text-xs rounded-xl border border-border/70 bg-background px-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-start"
          />
          <label
            className="h-10 px-3 rounded-xl border border-border/70 text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted transition flex items-center justify-center"
            title="إرفاق صورة أو لقطة شاشة"
          >
            <Image className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setReplyImage(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>
          <button
            type="submit"
            disabled={sendingReply || (!replyContent.trim() && !replyImage)}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 active:scale-95 shadow-xs cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{sendingReply ? "إرسال..." : "رد"}</span>
          </button>
        </div>
        {replyImage && (
          <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
            <span className="truncate max-w-[300px]">مرفق جاهز: {replyImage.name}</span>
            <button
              type="button"
              onClick={() => setReplyImage(null)}
              className="text-destructive font-semibold hover:underline cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default TicketDetailTab;
