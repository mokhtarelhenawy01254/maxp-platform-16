import React, { memo } from "react";
import { Bot } from "lucide-react";
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
                className={`business-conversation-checkbox-overlay absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200 bg-white/80 dark:bg-slate-900/80 backdrop-blur-[2px] ${
                  isMultiSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
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
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) (fallback as HTMLElement).style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="business-conversation-fallback"
              style={{ display: customerAvatarUrl ? "none" : "flex" }}
            >
              {conversation.customerName?.charAt(0)?.toUpperCase() || "؟"}
            </div>

            {/* Online indicator */}
            {conversation.platform === "facebook" && (
              <div className="relative -mt-2.5 -mr-0.5 float-left">
                <div
                  className="h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Unread indicator - similar to unreplied messages */}
            {conversation.unreadCount > 0 && (
              <div className="mb-0.5 flex items-center gap-1">
                <span
                  className="business-conversation-unread-dot h-1.5 w-1.5 rounded-full animate-pulse bg-red-500"
                ></span>
                <span
                  className="business-conversation-unread-badge text-[11px] font-semibold text-red-600 dark:text-rose-400"
                >
                  رسائل جديدة
                </span>
              </div>
            )}

            <div className="mb-0.5 flex items-center justify-between gap-2">
              <h4
                className="truncate text-sm font-bold text-gray-900 dark:text-white"
              >
                {conversation.customerName}
              </h4>
              <span
                className="ms-2 me-1 flex-shrink-0 text-[11px] text-gray-500 dark:text-slate-400"
              >
                {formatTime(conversation.lastMessageTime)}
              </span>
            </div>

            {/* Last message */}
            <p
              className={`truncate text-[12px] ${conversation.unreadCount > 0 ? "font-medium text-gray-800 dark:text-slate-200" : "font-normal text-gray-500 dark:text-slate-400"}`}
            >
              {conversation.lastMessageIsFromCustomer ? "" : "أنت: "}
              {conversation.lastMessage}
            </p>

            {/* Badges */}
            <div className="mt-1.5 flex items-center gap-1.5">
              {conversation.unreadCount > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white bg-blue-600 dark:bg-blue-500"
                >
                  {conversation.unreadCount}
                </span>
              )}

              {conversation.priority && (
                <span className="text-amber-500 dark:text-amber-400">⭐</span>
              )}

              {conversation.assignedTo && (
                <span
                  className="business-conversation-assigned-badge rounded px-1.5 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 dark:border dark:border-teal-500/25"
                >
                  👤 معين
                </span>
              )}

              {(conversation.aiEnabled === false || (conversation.aiPausedUntil && new Date(conversation.aiPausedUntil).getTime() > Date.now())) && (
                <span
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-500/25"
                  title="الذكاء الاصطناعي متوقف عن هذه المحادثة (تدخل بشري)"
                >
                  <Bot className="w-3 h-3 opacity-80" />
                  <span>تدخل بشري</span>
                </span>
              )}

              {conversation.snoozedUntil && new Date(conversation.snoozedUntil).getTime() > Date.now() && (
                <span
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border dark:border-amber-500/25"
                  title="محادثة مؤجلة"
                >
                  ⏰ مؤجلة
                </span>
              )}

              {conversation.tags.length > 0 && (
                <span
                  className="rounded px-1.5 py-0.5 text-[11px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
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
      prevProps.conversation.aiEnabled === nextProps.conversation.aiEnabled &&
      prevProps.conversation.aiPausedUntil === nextProps.conversation.aiPausedUntil &&
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
