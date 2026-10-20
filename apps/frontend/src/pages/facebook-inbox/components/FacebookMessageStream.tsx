import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
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
  onOpenProductPicker: () => void;
  composerDraft: string;
  setComposerDraft: (draft: string) => void;
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
  composerDraft,
  setComposerDraft,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Scrollable messages viewport */}
      <div
        className="business-chat-stage flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-4 pb-4"
        style={{ flex: '1 1 0%', minHeight: 0 }}
        ref={messagesContainerRef as React.RefObject<HTMLDivElement>}
        onScroll={onScroll}
      >
        {loadingMessages && !hasMore ? (
          <div className="business-inbox-empty h-full flex items-center justify-center">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: 'var(--color-primary)' }}
            />
          </div>
        ) : messages.length === 0 && !loadingMessages ? (
          <div className="business-inbox-empty h-full py-10 text-center">
            <p className="text-sm text-slate-500">{t('inbox.noMessages')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Loading older messages indicator */}
            {loadingMessages && hasMore && (
              <div className="flex justify-center p-2">
                <div
                  className="animate-spin rounded-full h-5 w-5 border-b-2"
                  style={{ borderColor: 'var(--color-muted-foreground)' }}
                />
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
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom composer & AI status banner */}
      <div className="flex-shrink-0 mt-auto" style={{ flexShrink: 0, marginTop: 'auto' }}>
        {!isAiActive && (
          <div
            className="flex items-center justify-between px-3.5 py-1.5 text-xs border-t backdrop-blur-sm"
            style={{
              background:
                'color-mix(in srgb, var(--business-warning) 8%, var(--color-card, #ffffff))',
              borderColor:
                'color-mix(in srgb, var(--business-warning) 22%, transparent)',
              color: 'var(--color-foreground)',
            }}
          >
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
              className="ms-2 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all flex-shrink-0 shadow-sm cursor-pointer"
            >
              {t('facebookInbox.resumeAi', 'تشغيل الرد الآلي')}
            </button>
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
          draftMessage={composerDraft}
          onDraftMessageHandled={() => setComposerDraft('')}
        />
      </div>
    </>
  );
};

export default FacebookMessageStream;
