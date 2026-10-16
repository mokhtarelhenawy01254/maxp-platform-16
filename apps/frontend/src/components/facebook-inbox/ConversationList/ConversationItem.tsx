import React, { memo } from "react";
import {
  Bot,
  Mic,
  Image as ImageIcon,
  Video,
  Paperclip,
  Star,
  UserCheck,
  Clock,
  Tag,
} from "lucide-react";
import { InboxConversation } from "../../../types/inbox.types";
import { getInboxCustomerAvatarUrl } from "../../../utils/imageUrl";

interface ConversationItemProps {
  conversation: InboxConversation;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent) => void;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = memo(
  ({
    conversation,
    isSelected,
    isMultiSelected = false,
    onToggleSelection,
    onClick,
  }) => {
    const customerAvatarUrl = getInboxCustomerAvatarUrl(
      conversation.customerId,
      conversation.customerAvatar,
    );

    const getConversationPreviewContent = (raw?: string | null) => {
      if (!raw || !raw.trim() || raw.trim().toLowerCase() === "no messages") {
        return <span>لا توجد رسائل</span>;
      }
      const text = raw.trim();

      // Voice note
      if (
        /audioclip|\.mp4|\.m4a|\.mp3|\.aac|\.opus|\.oga|\.ogg/i.test(text) &&
        (/fbsbx\.com|uploads\/chat-media|chat-media|https?:\/\//i.test(text) || text.endsWith(".mp4"))
      ) {
        return (
          <span className="inline-flex items-center gap-1 text-primary">
            <Mic className="w-3 h-3" />
            <span>رسالة صوتية</span>
          </span>
        );
      }

      // Image
      if (
        /proxy-image|\/uploads\/chat-media.*?\.(jpg|jpeg|png|webp|gif)/i.test(text) ||
        /scontent.*?\.fbcdn\.net/i.test(text)
      ) {
        return (
          <span className="inline-flex items-center gap-1 text-primary">
            <ImageIcon className="w-3 h-3" />
            <span>صورة</span>
          </span>
        );
      }

      // Video
      if (/^https?:\/\/.*?\.(mp4|mov|webm)/i.test(text) && !/audioclip/i.test(text)) {
        return (
          <span className="inline-flex items-center gap-1 text-primary">
            <Video className="w-3 h-3" />
            <span>فيديو</span>
          </span>
        );
      }

      // Attachment
      if (/^https?:\/\/.*\/uploads\//i.test(text) || text.startsWith("/uploads/")) {
        return (
          <span className="inline-flex items-center gap-1 text-primary">
            <Paperclip className="w-3 h-3" />
            <span>مرفق</span>
          </span>
        );
      }

      // Strip leading internal Meta template slugs
      const cleanedTemplate = text
        .replace(/^(?:Template:\s*)?[a-z0-9_]{10,}(?:\r?\n)+/i, "")
        .trim();

      return <span>{cleanedTemplate || text}</span>;
    };

    const formatTime = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "الآن";
      if (minutes < 60) return `${minutes} د`;
      if (hours < 24) return `${hours} س`;
      if (days < 7) return `${days} يوم`;

      return date.toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "short",
        calendar: "gregory",
      });
    };

    return (
      <div
        onClick={onClick}
        className={`p-3 border-b border-border/50 transition-all cursor-pointer group text-start relative select-none ${
          isSelected
            ? "bg-primary/10 border-s-2 border-s-primary text-foreground"
            : "hover:bg-muted/40 text-foreground"
        }`}
      >
        <div className="flex items-start gap-2.5">
          {/* Avatar Container */}
          <div className="relative shrink-0">
            {onToggleSelection && (
              <div
                className={`absolute inset-0 z-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-xs transition-opacity duration-150 ${
                  isMultiSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={onToggleSelection}
              >
                <input
                  type="checkbox"
                  checked={isMultiSelected}
                  onChange={() => {}}
                  className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                />
              </div>
            )}

            {customerAvatarUrl ? (
              <img
                src={customerAvatarUrl}
                alt={conversation.customerName}
                loading="lazy"
                className="w-9 h-9 rounded-full object-cover border border-border/60"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="w-9 h-9 rounded-full bg-muted/60 border border-border/60 items-center justify-center text-xs font-semibold text-muted-foreground uppercase"
              style={{ display: customerAvatarUrl ? "none" : "flex" }}
            >
              {conversation.customerName?.charAt(0) || "؟"}
            </div>

            {conversation.platform === "facebook" && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-emerald-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {conversation.unreadCount > 0 && (
              <div className="mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-semibold text-primary">
                  رسائل جديدة
                </span>
              </div>
            )}

            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h4 className="truncate text-xs font-semibold text-foreground">
                {conversation.customerName}
              </h4>
              <span className="text-[10px] text-muted-foreground font-mono tabular-nums shrink-0">
                {formatTime(conversation.lastMessageTime)}
              </span>
            </div>

            {/* Last message preview */}
            <p
              className={`truncate text-[11px] leading-relaxed ${
                conversation.unreadCount > 0
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {conversation.lastMessageIsFromCustomer ? "" : "أنت: "}
              {getConversationPreviewContent(conversation.lastMessage)}
            </p>

            {/* Badges Strip */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {conversation.unreadCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono tabular-nums bg-primary text-primary-foreground">
                  {conversation.unreadCount}
                </span>
              )}

              {conversation.priority && (
                <span className="inline-flex items-center p-0.5 rounded text-amber-500">
                  <Star className="w-3 h-3 fill-current" />
                </span>
              )}

              {conversation.assignedTo && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  <UserCheck className="w-2.5 h-2.5" />
                  <span>معين</span>
                </span>
              )}

              {(conversation.aiEnabled === false ||
                (conversation.aiPausedUntil &&
                  new Date(conversation.aiPausedUntil).getTime() > Date.now())) && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                  title="الذكاء الاصطناعي متوقف (تدخل بشري)"
                >
                  <Bot className="w-2.5 h-2.5" />
                  <span>تدخل بشري</span>
                </span>
              )}

              {conversation.snoozedUntil &&
                new Date(conversation.snoozedUntil).getTime() > Date.now() && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                    title="محادثة مؤجلة"
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>مؤجلة</span>
                  </span>
                )}

              {conversation.tags.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums bg-muted text-muted-foreground border border-border/50">
                  <Tag className="w-2.5 h-2.5" />
                  <span>{conversation.tags.length}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.conversation.id === nextProps.conversation.id &&
      prevProps.conversation.lastMessage === nextProps.conversation.lastMessage &&
      prevProps.conversation.lastMessageTime.getTime() ===
        nextProps.conversation.lastMessageTime.getTime() &&
      prevProps.conversation.unreadCount ===
        nextProps.conversation.unreadCount &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isMultiSelected === nextProps.isMultiSelected &&
      prevProps.conversation.priority === nextProps.conversation.priority &&
      prevProps.conversation.assignedTo === nextProps.conversation.assignedTo &&
      prevProps.conversation.aiEnabled === nextProps.conversation.aiEnabled &&
      prevProps.conversation.aiPausedUntil === nextProps.conversation.aiPausedUntil &&
      prevProps.conversation.snoozedUntil === nextProps.conversation.snoozedUntil &&
      prevProps.conversation.tags.length === nextProps.conversation.tags.length
    );
  },
);

export default ConversationItem;
