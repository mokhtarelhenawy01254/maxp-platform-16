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

  let isWindowExpired = Boolean(selectedConversation.isWindowExpired);
  let hoursSinceExpiration = 0;

  if (isFacebookConv) {
    if (selectedConversation.windowExpiresAt) {
      const expiresAt = new Date(selectedConversation.windowExpiresAt).getTime();
      if (Date.now() > expiresAt) {
        isWindowExpired = true;
        hoursSinceExpiration = Math.max(0, Math.floor((Date.now() - expiresAt) / (1000 * 60 * 60)));
      }
    } else if (selectedConversation.lastInboundAt) {
      const expiresAt = new Date(selectedConversation.lastInboundAt).getTime() + 24 * 60 * 60 * 1000;
      if (Date.now() > expiresAt) {
        isWindowExpired = true;
        hoursSinceExpiration = Math.max(0, Math.floor((Date.now() - expiresAt) / (1000 * 60 * 60)));
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
        {!isAiActive && (
          <div className="flex items-center justify-between px-3.5 py-1.5 text-xs border-b border-amber-500/20 bg-amber-500/10 text-foreground backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="h-4 w-4 flex-shrink-0 text-amber-500" />
              <span className="truncate font-medium">
                {isAiPaused
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
            <button
              type="button"
              onClick={onToggleAi}
              className="ms-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white transition-all flex-shrink-0 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t('facebookInbox.resumeAi', 'تشغيل الرد الآلي')}
            </button>
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
