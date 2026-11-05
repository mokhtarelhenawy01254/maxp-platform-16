import React, { memo, useState, useRef, useEffect, useMemo } from "react";
import { Star } from "lucide-react";
import LinkifiedText from "../../common/LinkifiedText";
import {
  MessageBubbleProps,
  formatTime,
  isPotentialMediaPath,
  useMessageBubbleController,
  MessageActionsBar,
  ReplyQuotedPreview,
  MediaAttachmentRenderer,
  TemplateAttachmentRenderer,
  AICorrectionBadge,
  AICorrectionEditor,
  useAICorrection,
} from "./components";

export * from "./components";

export const MessageBubble: React.FC<MessageBubbleProps> = memo(
  ({
    message,
    parentMessage,
    onDelete,
    onForward,
    onStar,
    onReaction,
    onReply,
    onScrollToMessage,
    hasBeenReplied,
    onCorrect,
    currentUserId,
    onRetry,
  }) => {
    const [showActions, setShowActions] = useState(false);
    const [showReactionSelector, setShowReactionSelector] = useState(false);
    const actionsRef = useRef<HTMLDivElement | null>(null);
    const reactionTriggerRef = useRef<HTMLButtonElement | null>(null);

    const {
      isCustomer,
      isStarred,
      replyTo,
      replyToResolvedId,
      replyImageUrl,
      myReaction,
      reactionCounts,
      bubbleStyle,
      bubbleSubtleText,
      attachments,
      imageMediaUrls,
      videoMediaUrl,
      hasVideoMessage,
      audioMediaUrl,
      hasAudioMessage,
      fileMediaUrl,
      hasFileMessage,
      displayTextContent,
      hasTemplateAttachments,
      messageFileLabel,
      isOrderConfirmation,
      orderNum,
      isAIResponse,
    } = useMessageBubbleController({
      message,
      parentMessage,
      hasBeenReplied,
      currentUserId,
    });

    const {
      isEditing,
      correctionText,
      saving,
      setCorrectionText,
      startEditing,
      cancelEditing,
      submitCorrection,
    } = useAICorrection({
      messageId: message.id,
      conversationId: message.conversationId,
      content: message.content,
      onCorrect,
    });

    const parsedMeta = useMemo(() => {
      if (!message.metadata) return null;
      if (typeof message.metadata === "object") return message.metadata as any;
      try {
        return JSON.parse(message.metadata);
      } catch {
        return null;
      }
    }, [message.metadata]);

    const deliveryStatus =
      message.deliveryStatus || parsedMeta?.deliveryStatus || null;
    const failureReason =
      message.failureReason ||
      parsedMeta?.failureReason ||
      parsedMeta?.messengerError ||
      parsedMeta?.facebookErrorMessage ||
      null;

    useEffect(() => {
      if (!showActions) {
        setShowReactionSelector(false);
        return;
      }

      const handlePointerDown = (event: PointerEvent) => {
        if (
          (event.target as HTMLElement)?.closest?.("[data-reaction-selector]")
        ) {
          return;
        }
        if (
          actionsRef.current &&
          !actionsRef.current.contains(event.target as Node)
        ) {
          setShowActions(false);
        }
      };

      document.addEventListener("pointerdown", handlePointerDown);
      return () =>
        document.removeEventListener("pointerdown", handlePointerDown);
    }, [showActions]);

    return (
      <div className="flex flex-col w-full mb-4 relative">
        {isOrderConfirmation && (
          <div className="flex items-center justify-center my-2 w-full">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                تم إنشاء طلب {orderNum ? `#${orderNum}` : ""} من هذه المحادثة
              </span>
              {orderNum && (
                <a
                  href={`/orders/${encodeURIComponent(orderNum)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-emerald-900 dark:hover:text-white mr-1 text-[11px]"
                >
                  عرض الطلب
                </a>
              )}
            </div>
          </div>
        )}
        <div
          className={`relative max-w-[85%] sm:max-w-xs lg:max-w-md ${isCustomer ? "ml-auto" : "mr-auto"}`}
          ref={actionsRef}
        >
          <MessageActionsBar
            message={message}
            isCustomer={isCustomer}
            showActions={showActions}
            setShowActions={setShowActions}
            showReactionSelector={showReactionSelector}
            setShowReactionSelector={setShowReactionSelector}
            reactionTriggerRef={reactionTriggerRef}
            myReaction={myReaction}
            isStarred={!!isStarred}
            onReaction={onReaction}
            onReply={onReply}
            onStar={onStar}
            onForward={onForward}
            onDelete={onDelete}
          />

          {!isCustomer && (
            <div
              className="text-xs mb-1 text-left"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {message.senderName}
            </div>
          )}

          {isCustomer && hasBeenReplied === false && (
            <div
              className="flex items-center gap-1 mb-1 text-xs font-medium"
              style={{ color: "var(--business-danger)" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "var(--business-danger)" }}
              />
              <span>غير مردود عليها</span>
            </div>
          )}

          <div className="px-4 py-2 rounded-2xl" style={bubbleStyle}>
            {replyTo && (
              <ReplyQuotedPreview
                replyTo={replyTo}
                replyToResolvedId={replyToResolvedId}
                replyImageUrl={replyImageUrl}
                isCustomer={isCustomer}
                onScrollToMessage={onScrollToMessage}
              />
            )}

            <MediaAttachmentRenderer
              messageId={message.id}
              imageMediaUrls={imageMediaUrls}
              hasVideoMessage={hasVideoMessage}
              videoMediaUrl={videoMediaUrl}
              hasAudioMessage={hasAudioMessage}
              audioMediaUrl={audioMediaUrl}
              hasFileMessage={hasFileMessage}
              fileMediaUrl={fileMediaUrl}
              messageFileLabel={messageFileLabel}
              fileSize={message.fileSize}
              isCustomer={isCustomer}
              bubbleSubtleText={bubbleSubtleText}
            />

            {hasTemplateAttachments && (
              <TemplateAttachmentRenderer
                messageId={message.id}
                attachments={attachments}
                isCustomer={isCustomer}
              />
            )}

            {displayTextContent &&
              !isPotentialMediaPath(displayTextContent) &&
              !displayTextContent.includes("proxy-image") && (
                <LinkifiedText
                  text={displayTextContent}
                  className="block text-sm whitespace-pre-wrap break-words"
                />
              )}

            {Object.keys(reactionCounts).length > 0 && (
              <div
                className={`business-reaction-pill absolute -bottom-3 ${isCustomer ? "right-2" : "left-2"} rounded-full shadow-md border flex items-center px-1.5 py-0.5 gap-1`}
                style={{
                  background: "var(--business-floating-surface)",
                  borderColor: "var(--business-card-border)",
                }}
              >
                {Object.entries(reactionCounts).map(([reaction, count]) => (
                  <span
                    key={reaction}
                    className="text-xs leading-none flex items-center"
                  >
                    <span className="text-sm">{reaction}</span>
                    {count > 1 && (
                      <span
                        className="text-[10px] ml-0.5 font-medium tabular-nums"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {count}
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
              <span className="text-xs opacity-75 tabular-nums">
                {formatTime(message.timestamp)}
              </span>
              {!isCustomer && (
                <span className="text-xs flex items-center gap-0.5">
                  {(deliveryStatus === "PENDING" || message.status === "sending") && (
                    <span className="flex items-center gap-1 text-white/70" title="قيد الإرسال...">
                      <span className="animate-spin inline-block w-3 h-3 border border-white/50 border-t-white rounded-full" />
                    </span>
                  )}
                  {(deliveryStatus === "SENT" || (!deliveryStatus && message.status === "sent")) && (
                    <span className="text-white/90" title="تم الإرسال">✓</span>
                  )}
                  {message.status === "delivered" && (
                    <span className="text-white" title="تم التسليم">✓✓</span>
                  )}
                  {message.status === "read" && (
                    <span style={{ color: "rgba(200, 235, 255, 0.92)" }} title="تمت القراءة">
                      ✓✓
                    </span>
                  )}
                  {(deliveryStatus === "FAILED" || message.status === "error") && (
                    <span className="inline-flex items-center gap-1 text-amber-300 font-medium" title={failureReason || "فشل الإرسال"}>
                      <span>⚠️</span>
                    </span>
                  )}
                </span>
              )}
            </div>

            {/* عرض سبب الفشل وزر إعادة المحاولة للرسائل الفاشلة */}
            {!isCustomer && (deliveryStatus === "FAILED" || message.status === "error") && (
              <div className="mt-2 pt-2 border-t border-red-400/30 text-xs flex flex-col gap-1.5 bg-red-950/30 -mx-2 px-2 pb-1 rounded-b-xl">
                <div className="flex items-center gap-1 text-red-200 text-[11px] font-medium leading-tight">
                  <span>⚠️</span>
                  <span>{failureReason || "فشل إرسال الرسالة إلى فيسبوك"}</span>
                </div>
                {onRetry && (
                  <button
                    type="button"
                    onClick={() => onRetry(message)}
                    className="self-end inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600/90 hover:bg-red-600 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <span>🔄</span>
                    <span>إعادة محاولة</span>
                  </button>
                )}
              </div>
            )}

            {!isCustomer && isAIResponse && (
              <AICorrectionBadge
                isEditing={isEditing}
                onStartEditing={startEditing}
              />
            )}
          </div>

          <AICorrectionEditor
            isEditing={isEditing}
            isCustomer={isCustomer}
            correctionText={correctionText}
            saving={saving}
            onChangeText={setCorrectionText}
            onCancel={cancelEditing}
            onSubmit={submitCorrection}
          />
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
      prevProps.message.deliveryStatus === nextProps.message.deliveryStatus &&
      prevProps.message.failureReason === nextProps.message.failureReason &&
      prevProps.onRetry === nextProps.onRetry &&
      prevProps.message.type === nextProps.message.type &&
      prevProps.message.fileUrl === nextProps.message.fileUrl &&
      prevProps.message.attachments === nextProps.message.attachments &&
      prevProps.message.metadata === nextProps.message.metadata &&
      prevProps.hasBeenReplied === nextProps.hasBeenReplied &&
      prevProps.currentUserId === nextProps.currentUserId &&
      prevProps.parentMessage?.id === nextProps.parentMessage?.id &&
      prevProps.parentMessage?.content === nextProps.parentMessage?.content &&
      prevProps.parentMessage?.fileUrl === nextProps.parentMessage?.fileUrl &&
      prevProps.onScrollToMessage === nextProps.onScrollToMessage
    );
  },
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
