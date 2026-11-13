import React from "react";
import { CornerDownLeft } from "lucide-react";
import { ReplyReference } from "./types";
import { buildProxyImageUrl } from "@/utils/imageUrl";

export interface ReplyQuotedPreviewProps {
  replyTo: ReplyReference;
  replyToResolvedId?: string;
  replyImageUrl?: string;
  isCustomer: boolean;
  onScrollToMessage?: (messageId: string) => void;
}

export const ReplyQuotedPreview: React.FC<ReplyQuotedPreviewProps> = ({
  replyTo,
  replyToResolvedId,
  replyImageUrl,
  isCustomer,
  onScrollToMessage,
}) => {
  const authorLabel = replyTo.senderName
    ? replyTo.senderName
    : isCustomer
      ? "رسالة سابقة"
      : "العميل";

  return (
    <div
      onClick={() => {
        if (replyToResolvedId && onScrollToMessage) {
          onScrollToMessage(replyToResolvedId);
        }
      }}
      className={`mb-2.5 text-xs rounded-lg p-2.5 flex items-center justify-between gap-2.5 transition-all select-none ${
        replyToResolvedId && onScrollToMessage
          ? "cursor-pointer hover:opacity-95 active:scale-[0.99]"
          : ""
      }`}
      style={{
        background: isCustomer
          ? "rgba(0, 0, 0, 0.05)"
          : "rgba(0, 0, 0, 0.25)",
        borderInlineStart: `3px solid ${
          isCustomer ? "var(--color-primary, #6366f1)" : "rgba(255, 255, 255, 0.8)"
        }`,
      }}
      title={
        replyToResolvedId && onScrollToMessage
          ? "اضغط للانتقال إلى الرسالة الأصلية"
          : undefined
      }
    >
      <div className="flex-1 min-w-0">
        <div
          className="flex items-center gap-1 font-semibold truncate mb-1 text-[11px]"
          style={{
            color: isCustomer ? "var(--color-primary, #4f46e5)" : "#ffffff",
          }}
        >
          <CornerDownLeft className="w-3 h-3 shrink-0 opacity-70" />
          <span className="opacity-80 text-[10px]">رد على:</span>
          <span className="truncate">{authorLabel}</span>
        </div>
        <div
          className="line-clamp-2 text-[11px] leading-relaxed break-words"
          style={{
            color: isCustomer
              ? "var(--color-muted-foreground, #4b5563)"
              : "rgba(255, 255, 255, 0.85)",
          }}
        >
          {replyImageUrl
            ? replyTo.content &&
              replyTo.content !== "📷 صورة" &&
              replyTo.content !== "مرفق/صورة"
              ? replyTo.content
              : "📷 صورة مقتبسة"
            : replyTo.type === "text"
              ? replyTo.content
              : replyTo.content || "مرفق/صورة"}
        </div>
      </div>

      {replyImageUrl && (
        <div className="relative flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 shadow-xs">
          <img
            src={replyImageUrl}
            alt="صورة مقتبسة"
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.dataset.retried && replyToResolvedId) {
                target.dataset.retried = "true";
                target.src = buildProxyImageUrl(null, {
                  messageId: replyToResolvedId,
                });
                return;
              }
              target.style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ReplyQuotedPreview;
