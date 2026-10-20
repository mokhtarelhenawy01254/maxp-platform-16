import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { UnifiedMessage } from '../types/unifiedInboxTypes';
import { UnifiedMessageItem } from './UnifiedMessageItem';

interface UnifiedMessageStreamProps {
  messages: UnifiedMessage[];
  loadingMessages: boolean;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onReplyMessage: (msg: UnifiedMessage) => void;
  onReactMessage: (id: string, reaction: string) => void;
  onStarMessage: (id: string) => void;
  onForwardMessage: (msg: UnifiedMessage) => void;
  onDeleteMessage: (id: string) => void;
  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;
  correctionText: string;
  setCorrectionText: (text: string) => void;
  submitCorrection: (id: string) => void;
  savingCorrection: boolean;
  sendError: string | null;
  onDismissSendError: () => void;
}

export const UnifiedMessageStream: React.FC<UnifiedMessageStreamProps> = ({
  messages,
  loadingMessages,
  messagesContainerRef,
  messagesEndRef,
  onReplyMessage,
  onReactMessage,
  onStarMessage,
  onForwardMessage,
  onDeleteMessage,
  editingMessageId,
  setEditingMessageId,
  correctionText,
  setCorrectionText,
  submitCorrection,
  savingCorrection,
  sendError,
  onDismissSendError,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <>
      <div
        ref={messagesContainerRef}
        className="business-chat-stage flex-1 overflow-y-auto p-5"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25px 25px, color-mix(in srgb, var(--color-primary) 4%, transparent) 2%, transparent 0%)',
          backgroundSize: '50px 50px',
        }}
      >
        {loadingMessages ? (
          <div className="business-inbox-empty h-full">
            <div
              className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
              style={{
                borderColor:
                  'color-mix(in srgb, var(--color-primary) 24%, transparent)',
                borderTopColor: 'transparent',
              }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="business-inbox-empty h-full">
            <ChatBubbleLeftRightIcon
              className="w-16 h-16 mb-3"
              style={{
                color:
                  'color-mix(in srgb, var(--color-primary) 18%, var(--color-muted-foreground))',
              }}
            />
            <p className="text-sm">
              {t('unifiedInbox.noMessagesYet', 'لا توجد رسائل بعد')}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.map((msg, index) => {
              const showTimeSeparator =
                index === 0 ||
                (() => {
                  const prevMsg = messages[index - 1];
                  if (!prevMsg) return false;
                  const prev = new Date(prevMsg.timestamp);
                  const curr = new Date(msg.timestamp);
                  return curr.getTime() - prev.getTime() > 30 * 60 * 1000;
                })();

              return (
                <React.Fragment key={msg.id}>
                  {showTimeSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <div
                        className="business-time-separator text-[11px] px-3 py-1 rounded-full tabular-nums font-mono"
                        style={{
                          background:
                            'color-mix(in srgb, var(--color-foreground) 6%, var(--color-background))',
                          border: '1px solid var(--business-card-border)',
                          color: 'var(--color-muted-foreground)',
                        }}
                      >
                        {new Date(msg.timestamp).toLocaleDateString(
                          i18n.language === 'ar' ? 'ar-EG' : 'en-US',
                          {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        )}
                      </div>
                    </div>
                  )}

                  <UnifiedMessageItem
                    msg={msg}
                    onReplyMessage={onReplyMessage}
                    onReactMessage={onReactMessage}
                    onStarMessage={onStarMessage}
                    onForwardMessage={onForwardMessage}
                    onDeleteMessage={onDeleteMessage}
                    editingMessageId={editingMessageId}
                    setEditingMessageId={setEditingMessageId}
                    correctionText={correctionText}
                    setCorrectionText={setCorrectionText}
                    submitCorrection={submitCorrection}
                    savingCorrection={savingCorrection}
                  />
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Send Error Banner */}
      {sendError && (
        <div
          className="px-5 py-2 text-sm flex items-center gap-2"
          style={{
            borderTop: '1px solid var(--business-card-border)',
            background:
              'color-mix(in srgb, var(--business-danger, #ef4444) 8%, var(--color-background))',
            color: 'var(--business-danger, #ef4444)',
          }}
        >
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <span className="flex-1">{sendError}</span>
          <button
            type="button"
            onClick={onDismissSendError}
            className="ml-auto opacity-70 hover:opacity-100"
            aria-label={t('unifiedInbox.dismiss', 'تجاهل')}
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
};
