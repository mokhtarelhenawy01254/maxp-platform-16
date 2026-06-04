import React, { memo } from "react";
import { InboxConversation } from "../../../types/inbox.types";
import { Facebook, MessageCircle, Send } from "lucide-react";

const headingStyle: React.CSSProperties = {
  color: "var(--color-foreground)",
};

const mutedStyle: React.CSSProperties = {
  color: "var(--color-muted-foreground)",
};

const dangerStyle: React.CSSProperties = {
  color:
    "color-mix(in srgb, var(--business-danger) 74%, var(--color-foreground))",
};

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
    const formatTime = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - new Date(date).getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "الآن";
      if (minutes < 60) return `${minutes} د`;
      if (hours < 24) return `${hours} س`;
      if (days < 7) return `${days} يوم`;

      return new Date(date).toLocaleDateString("ar-EG", {
        day: "numeric",
        month: "short",
        calendar: "gregory",
      });
    };

    const getPlatformIcon = (platform: string) => {
      switch (platform) {
        case "facebook":
          return <Facebook size={12} className="fill-current" />;
        case "whatsapp":
          return <MessageCircle size={12} className="fill-current" />;
        case "telegram":
          return <Send size={12} className="fill-current" />;
        default:
          return null;
      }
    };

    return (
      <div
        onClick={onClick}
        className="business-conversation-card group"
        data-state={
          isSelected || isMultiSelected
            ? "selected"
            : conversation.unreadCount > 0
              ? "attention"
              : "idle"
        }
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            {onToggleSelection && (isMultiSelected || true) && (
              <div
                className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200 ${
                  isMultiSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                style={{
                  background:
                    "color-mix(in srgb, var(--color-background) 84%, var(--shell-control-bg) 16%)",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection(e);
                }}
              >
                <input
                  type="checkbox"
                  checked={isMultiSelected}
                  onChange={() => {}}
                  className="h-5 w-5 cursor-pointer rounded"
                  style={{ accentColor: "var(--color-primary)" }}
                />
              </div>
            )}

            {conversation.customerAvatar ? (
              <img
                src={conversation.customerAvatar}
                alt={conversation.customerName}
                loading="lazy"
                className="business-conversation-avatar"
              />
            ) : (
              <div className="business-conversation-fallback">
                {conversation.customerName.charAt(0).toUpperCase()}
              </div>
            )}

            <div
              className="business-platform-indicator absolute -bottom-1 -right-1 justify-center"
              data-platform={conversation.platform}
              style={{ width: "1.3rem", height: "1.3rem", padding: 0 }}
            >
              {getPlatformIcon(conversation.platform)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {conversation.unreadCount > 0 && (
              <div className="mb-1 flex items-center gap-1">
                <span
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ background: "var(--business-danger)" }}
                />
                <span className="text-xs font-medium" style={dangerStyle}>
                  رسائل جديدة
                </span>
              </div>
            )}

            <div className="mb-1 flex items-center justify-between">
              <h4
                className={`truncate text-sm ${
                  conversation.unreadCount > 0 ? "font-bold" : "font-medium"
                }`}
                style={headingStyle}
              >
                {conversation.customerName}
              </h4>
              <span className="mr-2 flex-shrink-0 text-xs" style={mutedStyle}>
                {formatTime(conversation.lastMessageTime)}
              </span>
            </div>

            <p
              className={`truncate text-sm ${
                conversation.unreadCount > 0 ? "font-medium" : ""
              }`}
              style={mutedStyle}
            >
              {conversation.lastMessageIsFromCustomer ? "" : "أنت: "}
              {conversation.lastMessage}
            </p>

            <div className="mt-2 flex items-center gap-2">
              {conversation.unreadCount > 0 && (
                <span className="business-gallery-count px-2 py-0.5 text-xs font-bold">
                  {conversation.unreadCount}
                </span>
              )}

              {conversation.priority && (
                <span style={{ color: "var(--business-warning)" }}>⭐</span>
              )}

              {conversation.assignedTo && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-secondary) 12%, var(--color-background))",
                    color: "var(--color-secondary)",
                  }}
                >
                  👤 معين
                </span>
              )}

              {conversation.tags.length > 0 && (
                <span className="text-xs" style={mutedStyle}>
                  🏷️ {conversation.tags.length}
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
      prevProps.conversation.lastMessage ===
        nextProps.conversation.lastMessage &&
      prevProps.conversation.lastMessageTime.getTime() ===
        nextProps.conversation.lastMessageTime.getTime() &&
      prevProps.conversation.unreadCount ===
        nextProps.conversation.unreadCount &&
      prevProps.conversation.status === nextProps.conversation.status &&
      prevProps.conversation.assignedTo === nextProps.conversation.assignedTo &&
      prevProps.conversation.priority === nextProps.conversation.priority &&
      prevProps.conversation.tags.length ===
        nextProps.conversation.tags.length &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isMultiSelected === nextProps.isMultiSelected
    );
  },
);

ConversationItem.displayName = "ConversationItem";

export default ConversationItem;
