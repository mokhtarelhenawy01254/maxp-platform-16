import React, { memo } from "react";
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
        className="business-conversation-card group"
        data-state={
          isSelected
            ? "selected"
            : conversation.unreadCount > 0
              ? "attention"
              : "idle"
        }
      >
        <div className="flex items-start gap-2.5">
          {/* Avatar / Checkbox Container */}
          <div className="relative flex-shrink-0">
            {/* Checkbox overlay - visible on hover or when selected */}
            {onToggleSelection && (isMultiSelected || true) && (
              <div
                className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200 ${
                  isMultiSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                style={{
                  background:
                    "color-mix(in srgb, white 76%, var(--color-background) 24%)",
                }}
                onClick={onToggleSelection}
              >
                <input
                  type="checkbox"
                  checked={isMultiSelected}
                  onChange={() => {}} // Handled by div click
                  className="w-5 h-5 rounded cursor-pointer"
                  style={{ accentColor: "var(--color-primary)" }}
                />
              </div>
            )}

            {customerAvatarUrl ? (
              <img
                src={customerAvatarUrl}
                alt={conversation.customerName}
                loading="lazy"
                className="business-conversation-avatar"
              />
            ) : (
              <div className="business-conversation-fallback">
                {conversation.customerName.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Online indicator */}
            {conversation.platform === "facebook" && (
              <div className="relative -mt-2.5 -mr-0.5 float-left">
                <div
                  className="h-2.5 w-2.5 rounded-full border-2"
                  style={{
                    background: "var(--business-success)",
                    borderColor:
                      "color-mix(in srgb, white 78%, var(--color-background) 22%)",
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Unread indicator - similar to unreplied messages */}
            {conversation.unreadCount > 0 && (
              <div className="mb-0.5 flex items-center gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--business-danger)" }}
                ></span>
                <span
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--business-danger)" }}
                >
                  رسائل جديدة
                </span>
              </div>
            )}

            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h4
                className="truncate text-sm font-bold"
                style={{ color: "var(--color-foreground)" }}
              >
                {conversation.customerName}
              </h4>
              <span
                className="mr-1 flex-shrink-0 text-[11px]"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {formatTime(conversation.lastMessageTime)}
              </span>
            </div>

            {/* Last message */}
            <p
              className={`truncate text-[12px] ${conversation.unreadCount > 0 ? "font-medium" : "font-normal"}`}
              style={{
                color: conversation.unreadCount > 0
                  ? "var(--color-muted-foreground)"
                  : "color-mix(in srgb, var(--color-muted-foreground) 70%, transparent)",
              }}
            >
              {conversation.lastMessageIsFromCustomer ? "" : "أنت: "}
              {conversation.lastMessage}
            </p>

            {/* Badges */}
            <div className="mt-1.5 flex items-center gap-1.5">
              {conversation.unreadCount > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white"
                  style={{ background: "var(--color-primary)" }}
                >
                  {conversation.unreadCount}
                </span>
              )}

              {conversation.priority && (
                <span style={{ color: "var(--business-warning)" }}>⭐</span>
              )}

              {conversation.assignedTo && (
                <span
                  className="rounded px-1.5 py-0.5 text-[11px]"
                  style={{
                    color: "var(--color-secondary)",
                    background:
                      "color-mix(in srgb, var(--color-secondary) 10%, white)",
                  }}
                >
                  👤 معين
                </span>
              )}

              {conversation.snoozedUntil && new Date(conversation.snoozedUntil).getTime() > Date.now() && (
                <span
                  className="rounded px-1.5 py-0.5 text-[11px]"
                  style={{
                    color: "var(--color-warning, #f59e0b)",
                    background: "color-mix(in srgb, var(--color-warning, #f59e0b) 12%, transparent)",
                  }}
                  title="محادثة مؤجلة"
                >
                  ⏰ مؤجلة
                </span>
              )}

              {conversation.tags.length > 0 && (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
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
    // Custom comparison function for better performance
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
      (prevProps.conversation.snoozedUntil?.getTime() || 0) ===
        (nextProps.conversation.snoozedUntil?.getTime() || 0) &&
      prevProps.conversation.tags.length ===
        nextProps.conversation.tags.length &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.isMultiSelected === nextProps.isMultiSelected
    );
  },
);

ConversationItem.displayName = "ConversationItem";

export default ConversationItem;
