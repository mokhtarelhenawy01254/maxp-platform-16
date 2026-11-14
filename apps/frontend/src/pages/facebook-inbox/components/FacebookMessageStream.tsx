import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bot } from 'lucide-react';
import MessageBubble from '@/components/facebook-inbox/MessageBubble/MessageBubble';
import MessageInput from '@/components/facebook-inbox/MessageInput/MessageInput';
import type { InboxMessage, InboxConversation } from '@/types/inbox.types';

interface FacebookMessageStreamProps {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  loadingMessages: boolean;
  hasMore: boolean;
  messages: InboxMessage[];
  repliedMessages: Set<string>;
  messagesById: Map<string, InboxMessage>;
  onDeleteMessage: (messageId: string) => void;
  onForwardRequest: (message: InboxMessage) => void;
  onStarMessage: (messageId: string, isStarred: boolean) => void;
  onMessageReaction: (messageId: string, reaction: string | null) => void;
  onReplyToMessage: (message: InboxMessage) => void;
  onScrollToMessage: (messageId: string) => void;
  onReloadMessages: () => void;
  userId: string;
  isAiActive: boolean;
  isAiPaused: boolean;
  isMasterAiDisabled?: boolean;
  onToggleAi: () => void;
  onSendMessage: (content: string) => void;
  onSendFile: (file: File) => void;
  onSendFiles: (files: File[]) => void;
  onSendQuickReply: (reply: any) => void;
  sending: boolean;
  uploadingFile: boolean;
  selectedConversation: InboxConversation;
  user: any;
  replyToMessage: InboxMessage | null;
  onCancelReply: () => void;
  onOpenTextGallery: () => void;
  onOpenImageGallery: () => void;
  onOpenProductPicker?: () => void;
  onOpenOrder?: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
  composerDraft: string;
  setComposerDraft: (draft: string) => void;
  onRetryMessage?: (message: InboxMessage) => void;
}

export const FacebookMessageStream: React.FC<FacebookMessageStreamProps> = ({
  messagesContainerRef,
  onScroll,
  loadingMessages,
  hasMore,
  messages,
  repliedMessages,
  messagesById,
  onDeleteMessage,
  onForwardRequest,
  onStarMessage,
  onMessageReaction,
  onReplyToMessage,
  onScrollToMessage,
  onReloadMessages,
  userId,
  isAiActive,
  isAiPaused,
  isMasterAiDisabled = false,
  onToggleAi,
  onSendMessage,
  onSendFile,
  onSendFiles,
  onSendQuickReply,
  sending,
  uploadingFile,
  selectedConversation,
  user,
  replyToMessage,
  onCancelReply,
  onOpenTextGallery,
  onOpenImageGallery,
  onOpenProductPicker,
  onOpenOrder,
  onOpenServiceOrder,
  onOpenTasks,
  composerDraft,
  setComposerDraft,
  onRetryMessage,
}) => {
  const { t } = useTranslation();

  const isFacebookConv = !selectedConversation.platform || selectedConversation.platform === 'facebook';

  // Defensive calculation of window expiration from conversation metadata AND active message stream
  let isWindowExpired = Boolean(selectedConversation.isWindowExpired);
  let hoursSinceExpiration = 0;

  if (isFacebookConv) {
    // 1. Look for the most recent inbound customer message in the currently loaded message stream
    const latestStreamCustomerMsg = [...messages].reverse().find(
      (m) => m.isFromCustomer === true || m.sender === 'customer'
    );
    const streamCustomerTime = latestStreamCustomerMsg
      ? new Date(latestStreamCustomerMsg.createdAt || latestStreamCustomerMsg.timestamp || 0).getTime()
      : 0;

    // 2. Look at conversation-level timestamps
    let convInboundTime = 0;
    if (selectedConversation.windowExpiresAt) {
      convInboundTime = new Date(selectedConversation.windowExpiresAt).getTime() - 24 * 60 * 60 * 1000;
    } else if (selectedConversation.lastInboundAt) {
      convInboundTime = new Date(selectedConversation.lastInboundAt).getTime();
    } else if (selectedConversation.lastMessageIsFromCustomer && selectedConversation.lastMessageTime) {
      convInboundTime = new Date(selectedConversation.lastMessageTime).getTime();
    }

    const effectiveInboundTime = Math.max(
      !isNaN(streamCustomerTime) ? streamCustomerTime : 0,
      !isNaN(convInboundTime) ? convInboundTime : 0
    );

    if (effectiveInboundTime > 0) {
      const expiresAt = effectiveInboundTime + 24 * 60 * 60 * 1000;
      if (Date.now() > expiresAt) {
        isWindowExpired = true;
        hoursSinceExpiration = Math.max(0, Math.floor((Date.now() - expiresAt) / (1000 * 60 * 60)));
      } else {
        isWindowExpired = false;
        hoursSinceExpiration = 0;
      }
    } else {
      // If no inbound timestamp found, check if lastMessageTime was within 24h
      const lastMsgTime = selectedConversation.lastMessageTime
        ? new Date(selectedConversation.lastMessageTime).getTime()
        : 0;
      if (lastMsgTime > 0 && Date.now() - lastMsgTime < 24 * 60 * 60 * 1000) {
        isWindowExpired = false;
        hoursSinceExpiration = 0;
      } else {
        isWindowExpired = Boolean(selectedConversation.isWindowExpired);
      }
    }
  }

  return (
    <>
      {/* Scrollable messages viewport */}
      <div
        className="business-chat-stage flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background/60 p-2 sm:p-4 pb-4"
        style={{ flex: '1 1 0%', minHeight: 0 }}
        ref={messagesContainerRef as React.RefObject<HTMLDivElement>}
        onScroll={onScroll}
      >
        {loadingMessages && !hasMore ? (
          <div className="business-inbox-empty h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-primary border-t-transparent" />
          </div>
        ) : messages.length === 0 && !loadingMessages ? (
          <div className="business-inbox-empty h-full py-10 text-center flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('inbox.noMessages')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Loading older messages indicator */}
            {loadingMessages && hasMore && (
              <div className="flex justify-center p-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted-foreground border-t-transparent" />
              </div>
            )}

            {/* Deduplicated message list */}
            {Array.from(
              new Map(messages.map((msg) => [msg.id, msg])).values(),
            ).map((msg) => {
              const hasBeenReplied = msg.isFromCustomer
                ? repliedMessages.has(msg.id)
                : undefined;
              const parentId =
                msg.metadata?.replyToResolvedMessageId ||
                msg.metadata?.replyTo?.messageId;
              const parentMessage = parentId
                ? messagesById.get(parentId)
                : undefined;

              return (
                <div
                  key={msg.id}
                  id={`inbox-message-${msg.id}`}
                  className="w-full transition-all duration-300"
                >
                  <MessageBubble
                    message={msg}
                    parentMessage={parentMessage}
                    {...(hasBeenReplied !== undefined && { hasBeenReplied })}
                    onDelete={onDeleteMessage}
                    onForward={onForwardRequest}
                    onStar={onStarMessage}
                    onReaction={onMessageReaction}
                    onReply={onReplyToMessage}
                    onScrollToMessage={onScrollToMessage}
                    onCorrect={onReloadMessages}
                    currentUserId={userId}
                    onRetry={onRetryMessage}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom composer & AI status banner */}
      <div className="flex-shrink-0 mt-auto border-t border-border/50 bg-card/80" style={{ flexShrink: 0, marginTop: 'auto' }}>
        {(!isAiActive || isMasterAiDisabled) && (
          <div
            className={`flex items-center justify-between px-3.5 py-1.5 text-xs border-b backdrop-blur-sm ${
              isMasterAiDisabled
                ? 'border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                : 'border-amber-500/20 bg-amber-500/10 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Bot
                className={`h-4 w-4 flex-shrink-0 ${
                  isMasterAiDisabled ? 'text-rose-600 dark:text-rose-400' : 'text-amber-500'
                }`}
              />
              <span className="truncate font-medium">
                {isMasterAiDisabled
                  ? t(
                      'facebookInbox.masterAiDisabledBanner',
                      'الذكاء الاصطناعي معطل من الإعدادات الرئيسية — لن يقوم الإيجنت بالرد التلقائي. مطلوب رد يدوي على العميل.',
                    )
                  : isAiPaused
                  ? t(
                      'facebookInbox.aiPausedHandover',
                      'الذكاء الاصطناعي متوقف مؤقتاً بسبب رد يدوي (تدخل بشري)',
                    )
                  : t(
                      'facebookInbox.aiStoppedManually',
                      'الذكاء الاصطناعي متوقف عن هذه المحادثة (التحكم يدوي)',
                    )}
              </span>
            </div>
            {!isMasterAiDisabled && (
              <button
                type="button"
                onClick={onToggleAi}
                className="ms-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white transition-all flex-shrink-0 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t('facebookInbox.resumeAi', 'تشغيل الرد الآلي')}
              </button>
            )}
          </div>
        )}

        {/* 24-hour Facebook window notice */}
        {isFacebookConv && isWindowExpired && (
          <div className="flex items-center justify-between px-4 py-2 text-xs border-b border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span className="font-semibold tabular-nums">
                {hoursSinceExpiration > 0
                  ? `النافذة اتقفلت من ${hoursSinceExpiration} ساعة — لا يمكن إرسال رسائل جديدة`
                  : 'انتهت نافذة الـ 24 ساعة للرد على العميل عبر فيسبوك'}
              </span>
            </div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-300/80 hidden sm:block">
              تواصل مع العميل هاتفياً أو انتظر رداً جديداً منه لفتح النافذة
            </div>
          </div>
        )}

        {/* Failed delivery banner if conversation has failed messages */}
        {(selectedConversation.hasFailedDelivery || selectedConversation.lastMessageDeliveryStatus === 'FAILED') && (
          <div className="flex items-center justify-between px-4 py-2 text-xs border-b border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300 backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <span className="font-semibold">
                {selectedConversation.lastMessageFailureReason
                  ? `فشل إرسال رسالة إلى فيسبوك: ${selectedConversation.lastMessageFailureReason}`
                  : 'توجد رسائل لم تصل إلى العميل على فيسبوك (Meta) — راجع الرسائل بالأسفل لإعادة المحاولة'}
              </span>
            </div>
            <div className="text-[11px] text-red-600/80 dark:text-red-300/80 hidden sm:block">
              اضغط على زر إعادة المحاولة بجوار الرسالة الفاشلة
            </div>
          </div>
        )}

        <MessageInput
          onSendMessage={onSendMessage}
          onSendFile={onSendFile}
          onSendFiles={onSendFiles}
          onSendQuickReply={onSendQuickReply}
          sending={sending}
          uploadingFile={uploadingFile}
          conversation={selectedConversation}
          user={user}
          replyTo={replyToMessage}
          onCancelReply={onCancelReply}
          onOpenTextGallery={onOpenTextGallery}
          onOpenImageGallery={onOpenImageGallery}
          onOpenProductPicker={onOpenProductPicker}
          onOpenOrder={onOpenOrder}
          onOpenServiceOrder={onOpenServiceOrder}
          onOpenTasks={onOpenTasks}
          draftMessage={composerDraft}
          onDraftMessageHandled={() => setComposerDraft('')}
          disabled={isFacebookConv && isWindowExpired}
          disabledReason={
            isFacebookConv && isWindowExpired
              ? hoursSinceExpiration > 0
                ? `النافذة اتقفلت من ${hoursSinceExpiration} ساعة — لا يمكن إرسال رسائل جديدة`
                : 'انتهت نافذة الـ 24 ساعة للرد على العميل'
              : undefined
          }
        />
      </div>
    </>
  );
};

export default FacebookMessageStream;
