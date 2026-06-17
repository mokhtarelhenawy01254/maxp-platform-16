import React, { useState, memo } from "react";
import { Trash2, Reply, Forward, Star, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";
import ReactionSelector from "../../../../components/facebook-inbox/Generic/ReactionSelector";
import LinkifiedText from "../../../components/common/LinkifiedText";
import { InboxMessage } from "../../../types/inbox.types";

interface MessageBubbleProps {
  message: InboxMessage;
  onDelete?: (messageId: string) => void;
  onForward?: (message: InboxMessage) => void;
  onStar?: (messageId: string, isStarred: boolean) => void;
  onReaction?: (messageId: string, reaction: string) => void;
  onReply?: (message: InboxMessage) => void;
  currentUserId?: string;
  hasBeenReplied?: boolean;
}

const neutralActionStyle: React.CSSProperties = {
  background:
    "linear-gradient(180deg, color-mix(in srgb, var(--color-background) 92%, var(--shell-control-bg) 8%) 0%, color-mix(in srgb, var(--shell-control-bg) 78%, var(--color-background) 22%) 100%)",
  border: "1px solid var(--business-card-border)",
  color: "var(--color-muted-foreground)",
};

const warningActionStyle: React.CSSProperties = {
  background:
    "color-mix(in srgb, var(--business-warning) 10%, var(--color-background))",
  border:
    "1px solid color-mix(in srgb, var(--business-warning) 18%, transparent)",
  color: "var(--business-warning)",
};

const dangerActionStyle: React.CSSProperties = {
  background:
    "color-mix(in srgb, var(--business-danger) 10%, var(--color-background))",
  border:
    "1px solid color-mix(in srgb, var(--business-danger) 18%, transparent)",
  color: "var(--business-danger)",
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({
    message,
    onDelete,
    onForward,
    onStar,
    onReaction,
    onReply,
    hasBeenReplied,
  }) => {
    const isCustomer = !!message.isFromCustomer;
    const [showActions, setShowActions] = useState(false);
    const [showReactionSelector, setShowReactionSelector] = useState(false);
    const { t, i18n } = useTranslation();

    // Parse metadata safely
    let metadata: any = {};
    try {
      if (typeof message.metadata === "string") {
        metadata = JSON.parse(message.metadata);
      } else if (typeof message.metadata === "object") {
        metadata = message.metadata;
      }
    } catch (e) {
      // ignore
    }

    const isStarred = metadata?.isStarred || message.isStarred;
    const replyTo = metadata?.replyTo;
    const myReaction = metadata?.myReaction;
    const reactionCounts = Object.entries(metadata?.reactions ?? {}).reduce<
      Record<string, number>
    >((acc, [reaction, count]) => {
      if (typeof count === "number") {
        acc[reaction] = count;
      }

      return acc;
    }, {});

    const formatTime = (date: Date) => {
      const now = new Date();
      const messageDate = new Date(date);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const msgDay = new Date(
        messageDate.getFullYear(),
        messageDate.getMonth(),
        messageDate.getDate(),
      );

      if (isNaN(messageDate.getTime())) return "";

      const diffDays = Math.floor(
        (today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24),
      );

      const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
      const timeStr = messageDate.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (diffDays === 0) {
        return timeStr;
      } else if (diffDays === 1) {
        return `${t("unifiedInbox.yesterday")} ${timeStr}`;
      } else if (diffDays < 7) {
        return messageDate.toLocaleDateString(locale, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        return messageDate.toLocaleDateString(locale, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    };

    const formatFileSize = (bytes?: number) => {
      if (!bytes) return "";
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const bubbleStyle: React.CSSProperties = isCustomer
      ? hasBeenReplied === false
        ? {
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-background) 88%, var(--shell-control-bg) 12%) 0%, color-mix(in srgb, var(--shell-control-bg) 82%, var(--color-background) 18%) 100%)",
            color: "var(--color-foreground)",
            borderRadius: "1rem",
            borderBottomRightRadius: "0.35rem",
            border:
              "2px solid color-mix(in srgb, var(--business-danger) 32%, transparent)",
          }
        : {
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-background) 88%, var(--shell-control-bg) 12%) 0%, color-mix(in srgb, var(--shell-control-bg) 82%, var(--color-background) 18%) 100%)",
            color: "var(--color-foreground)",
            borderRadius: "1rem",
            borderBottomRightRadius: "0.35rem",
            border: "1px solid var(--business-card-border)",
          }
      : {
          background: "var(--color-primary)",
          color:
            "color-mix(in srgb, var(--color-background) 96%, transparent)",
          borderRadius: "1rem",
          borderBottomLeftRadius: "0.35rem",
        };

    const bubbleSubtleText = isCustomer
      ? "var(--color-muted-foreground)"
      : "color-mix(in srgb, var(--color-background) 78%, transparent)";

    const fileCardStyle: React.CSSProperties = {
      background: isCustomer
        ? "color-mix(in srgb, var(--shell-control-bg) 82%, var(--color-background) 18%)"
        : "color-mix(in srgb, var(--color-background) 18%, transparent)",
    };

    const statusAccentStyle: React.CSSProperties =
      message.status === "read"
        ? {
            color:
              "color-mix(in srgb, var(--color-background) 82%, var(--color-secondary))",
          }
        : message.status === "error"
          ? {
              color:
                "color-mix(in srgb, var(--business-danger) 24%, var(--color-background))",
            }
          : {
              color:
                "color-mix(in srgb, var(--color-background) 92%, transparent)",
            };

    return (
      <div
        className={`flex w-full mb-4 group relative`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {showActions && (
          <div
            className={`absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-1 rounded-full p-1 shadow-sm backdrop-blur-sm ${
              isCustomer ? "right-full mr-2" : "left-full ml-2"
            }`}
            style={neutralActionStyle}
          >
            {onReaction && (
              <div className="relative">
                  <button
                    onClick={() => setShowReactionSelector(!showReactionSelector)}
                    className="business-icon-button business-icon-button--sm"
                    style={myReaction ? warningActionStyle : neutralActionStyle}
                    title={t("unifiedInbox.addReaction")}
                  >
                    <Smile size={14} />
                  </button>
                {showReactionSelector && (
                  <ReactionSelector
                    onSelect={(r) => {
                      if (onReaction) onReaction(message.id, r);
                      setShowReactionSelector(false);
                    }}
                    currentReaction={myReaction}
                  />
                )}
              </div>
            )}
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="business-icon-button business-icon-button--sm"
                style={neutralActionStyle}
                title={t("unifiedInbox.reply")}
              >
                <Reply size={14} />
              </button>
            )}
            {onStar && (
              <button
                onClick={() => onStar(message.id, !!isStarred)}
                className="business-icon-button business-icon-button--sm"
                style={isStarred ? warningActionStyle : neutralActionStyle}
                title={isStarred ? t("unifiedInbox.unstarMessage") : t("unifiedInbox.starMessage")}
              >
                <Star size={14} fill={isStarred ? "currentColor" : "none"} />
              </button>
            )}
            {onForward && (
              <button
                onClick={() => onForward(message)}
                className="business-icon-button business-icon-button--sm"
                style={neutralActionStyle}
                title={t("unifiedInbox.forward")}
              >
                <Forward size={14} />
              </button>
            )}
            {!isCustomer && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="business-icon-button business-icon-button--sm"
                style={dangerActionStyle}
                title={t("unifiedInbox.deleteMessage")}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}

        <div
          className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isCustomer ? "ml-auto" : "mr-auto"}`}
        >
          {!isCustomer && (
            <div
              className="mb-1 text-left text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {message.senderName}
            </div>
          )}

          {isCustomer && hasBeenReplied === false && (
            <div
              className="mb-1 flex items-center gap-1 text-xs font-medium"
              style={{ color: "var(--business-danger)" }}
            >
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ background: "var(--business-danger)" }}
              />
              <span>{t("unifiedInbox.unreplied")}</span>
            </div>
          )}

          <div className="rounded-2xl px-4 py-2" style={bubbleStyle}>
            {replyTo && (
              <div
                className="mb-2 border-l-2 pl-2 text-xs"
                style={{
                  borderColor: isCustomer
                    ? "color-mix(in srgb, var(--color-muted-foreground) 40%, transparent)"
                    : "color-mix(in srgb, var(--color-background) 42%, transparent)",
                  color: isCustomer
                    ? "var(--color-muted-foreground)"
                    : "color-mix(in srgb, var(--color-background) 82%, transparent)",
                }}
              >
                <div className="font-semibold">{replyTo.senderName}</div>
                <div className="truncate opacity-80">
                  {replyTo.type === "text" ? replyTo.content : replyTo.content || t("unifiedInbox.mediaAttachment")}
                </div>
              </div>
            )}

            {/* Media Content */}
            {(message.type === "image" || message.type === "IMAGE") &&
              (message.fileUrl ||
                (typeof message.content === "string" &&
                  message.content.startsWith("http"))) && (
                <div className="mb-2">
                  <img
                    src={message.fileUrl || message.content}
                    alt={t("unifiedInbox.mediaAttachment")}
                    loading="lazy"
                    className="rounded-lg max-w-full h-auto"
                    style={{ maxHeight: "300px" }}
                  />
                </div>
              )}

            {(message.type === "video" || message.type === "VIDEO") &&
              (message.fileUrl ||
                (typeof message.content === "string" &&
                  message.content.startsWith("http"))) && (
                <div className="mb-2">
                  <video
                    src={message.fileUrl || message.content}
                    controls
                    className="rounded-lg max-w-full h-auto"
                    style={{ maxHeight: "300px" }}
                  />
                </div>
              )}

            {(message.type === "audio" || message.type === "AUDIO") &&
              (message.fileUrl ||
                (typeof message.content === "string" &&
                  message.content.startsWith("http"))) && (
                <div className="mb-2">
                  <audio
                    src={message.fileUrl || message.content}
                    controls
                    className="w-full min-w-[200px]"
                  />
                </div>
              )}

            {(message.type === "file" || message.type === "FILE") &&
              (message.fileUrl ||
                (typeof message.content === "string" &&
                  message.content.startsWith("http"))) && (
                <a
                  href={message.fileUrl || message.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 flex items-center gap-2 rounded-lg p-2"
                  style={fileCardStyle}
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: isCustomer
                        ? "color-mix(in srgb, var(--color-background) 56%, transparent)"
                        : "color-mix(in srgb, var(--color-background) 24%, transparent)",
                    }}
                  >
                    📎
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{
                        color: isCustomer
                          ? "var(--color-foreground)"
                          : "color-mix(in srgb, var(--color-background) 96%, transparent)",
                      }}
                    >
                      {message.fileName || message.content}
                    </p>
                    <p className="text-xs" style={{ color: bubbleSubtleText }}>
                      {formatFileSize(message.fileSize)}
                    </p>
                  </div>
                  <div className="text-xs">⬇️</div>
                </a>
              )}

            {/* Text Content */}
            {message.content &&
              (() => {
                // Check if content has embedded URL
                if (
                  message.content.includes("|IMAGE_URL|") ||
                  message.content.includes("|FILE_URL|") ||
                  message.content.includes("|VIDEO_URL|") ||
                  message.content.includes("|AUDIO_URL|")
                ) {
                  const textPart = message.content
                    .split(/(\|(IMAGE|FILE|VIDEO|AUDIO)_URL\|)/)[0]
                    .trim();
                  return textPart ? (
                    <LinkifiedText
                      text={textPart}
                      className="block text-sm whitespace-pre-wrap break-words mb-2"
                    />
                  ) : null;
                }

                const isMediaType = [
                  "IMAGE",
                  "VIDEO",
                  "AUDIO",
                  "FILE",
                  "image",
                  "video",
                  "audio",
                  "file",
                ].includes(message.type);
                const contentIsUrl =
                  typeof message.content === "string" &&
                  message.content.startsWith("http");

                if (
                  message.content !== message.fileUrl &&
                  !(isMediaType && contentIsUrl)
                ) {
                  return (
                    <LinkifiedText
                      text={message.content}
                      className="block text-sm whitespace-pre-wrap break-words"
                    />
                  );
                }
                return null;
              })()}

            {Object.keys(reactionCounts).length > 0 && (
              <div
                className={`absolute -bottom-3 flex items-center gap-1 rounded-full border px-1.5 py-0.5 shadow-md ${
                  isCustomer ? "right-2" : "left-2"
                }`}
                style={neutralActionStyle}
              >
                {Object.entries(reactionCounts).map(([reaction, count]) => (
                  <span
                    key={reaction}
                    className="flex items-center text-xs leading-none"
                  >
                    <span className="text-sm">{reaction}</span>
                    {Number(count) > 1 && (
                      <span
                        className="ml-0.5 text-[10px] font-medium"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {String(count)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end mt-1 gap-2">
              {isStarred && (
                <Star
                  size={10}
                  className="fill-current"
                  style={{ color: "var(--business-warning)" }}
                />
              )}
              <span className="text-xs opacity-75">
                {formatTime(message.timestamp)}
              </span>
              {!isCustomer && (
                <span className="text-xs flex items-center gap-0.5">
                  {message.status === "sending" && (
                    <span
                      className="flex items-center gap-1"
                      style={{ color: bubbleSubtleText }}
                    >
                      <span
                        className="inline-block h-3 w-3 animate-spin rounded-full border"
                        style={{
                          borderColor: bubbleSubtleText,
                          borderTopColor:
                            "color-mix(in srgb, var(--color-background) 96%, transparent)",
                        }}
                      />
                    </span>
                  )}
                  {message.status === "sent" && (
                    <span style={statusAccentStyle}>✓</span>
                  )}
                  {message.status === "delivered" && (
                    <span style={statusAccentStyle}>✓✓</span>
                  )}
                  {message.status === "read" && (
                    <span style={statusAccentStyle}>✓✓</span>
                  )}
                  {message.status === "error" && (
                    <span style={statusAccentStyle}>❌</span>
                  )}
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
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.timestamp.getTime() ===
        nextProps.message.timestamp.getTime() &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.message.metadata === nextProps.message.metadata &&
      prevProps.hasBeenReplied === nextProps.hasBeenReplied &&
      prevProps.currentUserId === nextProps.currentUserId
    );
  },
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
