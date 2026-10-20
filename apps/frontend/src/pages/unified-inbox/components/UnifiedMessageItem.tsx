import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUturnLeftIcon,
  ArrowTopRightOnSquareIcon,
  TrashIcon,
  PaperClipIcon,
  ClockIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import {
  HeartIcon,
  StarIcon as StarOutlineIcon,
} from '@heroicons/react/24/outline';
import type { UnifiedMessage } from '../types/unifiedInboxTypes';
import { isMediaOrProxyUrl } from '../utils/unifiedInboxUtils';
import { buildProxyImageUrl, getInboxMessageMediaUrl } from '@/utils/imageUrl';

interface UnifiedMessageItemProps {
  msg: UnifiedMessage;
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
}

export const UnifiedMessageItem: React.FC<UnifiedMessageItemProps> = ({
  msg,
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
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`flex items-start gap-1 group ${
        msg.isFromCustomer ? 'justify-start' : 'justify-end flex-row-reverse'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action buttons on hover */}
      {hovered && (
        <div
          className={`business-msg-actions flex items-center gap-0.5 py-1 px-1.5 rounded-full shadow-sm backdrop-blur-sm ${
            isRtl ? 'order-first' : ''
          }`}
          style={{
            background:
              'color-mix(in srgb, var(--color-background) 92%, var(--shell-control-bg) 8%)',
            border: '1px solid var(--business-card-border)',
          }}
        >
          {msg.isFromCustomer && (
            <button
              type="button"
              onClick={() => onReplyMessage(msg)}
              className="business-icon-button business-icon-button--sm business-msg-action-btn"
              aria-label={t('unifiedInbox.reply', 'رد')}
            >
              <ArrowUturnLeftIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onReactMessage(msg.id, 'like')}
            className="business-icon-button business-icon-button--sm business-msg-action-btn"
            aria-label={t('unifiedInbox.addReaction', 'إضافة تفاعل')}
          >
            <HeartIcon className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onStarMessage(msg.id)}
            className="business-icon-button business-icon-button--sm business-msg-action-btn"
            aria-label={t('unifiedInbox.starMessage', 'تمييز الرسالة')}
          >
            <StarOutlineIcon className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onForwardMessage(msg)}
            className="business-icon-button business-icon-button--sm business-msg-action-btn"
            aria-label={t('unifiedInbox.forward', 'إعادة توجيه')}
          >
            <ArrowTopRightOnSquareIcon className="w-4 h-4" aria-hidden="true" />
          </button>
          {!msg.isFromCustomer && (
            <button
              type="button"
              onClick={() => onDeleteMessage(msg.id)}
              className="business-icon-button business-icon-button--sm business-msg-action-btn"
              aria-label={t('unifiedInbox.deleteMessage', 'حذف الرسالة')}
              style={{ color: 'var(--business-danger)' }}
            >
              <TrashIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm business-message-bubble ${
          msg.isFromCustomer
            ? 'business-message-bubble--incoming'
            : 'business-message-bubble--outgoing'
        }`}
        style={
          msg.isFromCustomer
            ? {
                background: 'var(--business-message-incoming-bg)',
                border: '1px solid var(--business-message-incoming-border)',
                borderTopRightRadius: '0.5rem',
              }
            : {
                background: 'var(--color-primary)',
                color: 'white',
                borderTopLeftRadius: '0.5rem',
              }
        }
      >
        {/* Quoted message */}
        {msg.quotedMessage && (
          <div
            className="border-r-2 pr-2 mb-1.5 text-xs opacity-70"
            style={{
              borderColor: msg.isFromCustomer
                ? 'color-mix(in srgb, var(--color-muted-foreground) 40%, transparent)'
                : 'rgba(232, 243, 255, 0.45)',
            }}
          >
            {msg.quotedMessage.content?.substring(0, 80)}
          </div>
        )}

        {/* Attachments list */}
        {Array.isArray(msg.attachments) && msg.attachments.length > 0 ? (
          <div className="mb-2 flex flex-col gap-2">
            {msg.attachments.map((att, idx) => {
              const rawAttUrl = att.url || '';
              const attUrl = getInboxMessageMediaUrl(msg.id, rawAttUrl, {
                attachmentIndex: att.attachmentIndex ?? idx,
              });
              const isAttImage =
                att.type?.toLowerCase().includes('image') ||
                /\.(jpe?g|png|webp|gif)/i.test(rawAttUrl) ||
                /\.(jpe?g|png|webp|gif)/i.test(attUrl);

              if (isAttImage && (attUrl || rawAttUrl)) {
                return (
                  <img
                    key={`${rawAttUrl || attUrl}-${idx}`}
                    src={attUrl || rawAttUrl}
                    alt=""
                    loading="lazy"
                    className="rounded-lg max-w-full mb-1 cursor-pointer hover:opacity-90"
                    style={{ maxHeight: '300px' }}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (target.dataset.retried) return;
                      target.dataset.retried = 'true';
                      if (msg.id) {
                        target.src = buildProxyImageUrl(null, {
                          messageId: msg.id,
                          attachmentIndex: att.attachmentIndex ?? idx,
                        });
                      }
                    }}
                  />
                );
              }
              return null;
            })}
          </div>
        ) : msg.mediaUrl ? (
          (() => {
            const isImage =
              msg.type === 'image' || msg.mediaType?.includes('image');
            const isVideo =
              msg.type === 'video' || msg.mediaType?.includes('video');
            const isAudio =
              msg.type === 'audio' || msg.mediaType?.includes('audio');

            if (isImage) {
              const mediaSrc = getInboxMessageMediaUrl(msg.id, msg.mediaUrl, {
                attachmentIndex: 0,
              });
              return (
                <img
                  src={mediaSrc}
                  alt=""
                  className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.dataset.retried) return;
                    target.dataset.retried = 'true';
                    if (msg.id) {
                      target.src = buildProxyImageUrl(null, {
                        messageId: msg.id,
                        attachmentIndex: 0,
                      });
                    }
                  }}
                />
              );
            }

            if (isVideo) {
              const mediaSrc = getInboxMessageMediaUrl(msg.id, msg.mediaUrl, {
                attachmentIndex: 0,
              });
              return (
                <video
                  src={mediaSrc}
                  controls
                  className="rounded-lg max-w-full mb-1.5"
                  style={{ maxHeight: '300px' }}
                >
                  {t('unifiedInbox.videoNotSupported', 'الفيديو غير مدعوم')}
                </video>
              );
            }

            if (isAudio) {
              const mediaSrc = getInboxMessageMediaUrl(msg.id, msg.mediaUrl, {
                attachmentIndex: 0,
              });
              return (
                <audio
                  src={mediaSrc}
                  controls
                  className="w-full mb-1.5"
                  style={{ minWidth: '200px' }}
                />
              );
            }

            const downloadSrc = getInboxMessageMediaUrl(
              msg.id,
              msg.mediaUrl,
              {
                attachmentIndex: 0,
              },
            );
            return (
              <a
                href={downloadSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg mb-1.5 p-2 border"
                style={{
                  borderColor: 'var(--business-card-border)',
                  background:
                    'color-mix(in srgb, var(--color-primary) 5%, var(--color-background))',
                }}
              >
                <PaperClipIcon
                  className="w-5 h-5 shrink-0"
                  style={{ color: 'var(--color-primary)' }}
                />
                <span
                  className="text-sm truncate"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {msg.mediaFileName ||
                    msg.mediaUrl.split('/').pop() ||
                    t('unifiedInbox.mediaAttachment', 'مرفق وسائط')}
                </span>
                <ArrowDownTrayIcon
                  className="w-4 h-4 shrink-0"
                  style={{
                    color: 'var(--color-muted-foreground)',
                  }}
                />
              </a>
            );
          })()
        ) : null}

        {/* Content URL fallback preview */}
        {(() => {
          if (msg.mediaUrl) return null;
          if (!msg.content || !msg.content.startsWith('http')) return null;
          const url = msg.content.split(/[\s\n]/)[0] || '';
          const isImage =
            /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(url) ||
            url.includes('fbcdn') ||
            url.includes('cdninstagram') ||
            url.includes('fbsbx');
          const isVideo = /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
          const isAudio = /\.(mp3|wav|ogg|aac|m4a|opus)(\?|$)/i.test(url);

          if (isImage) {
            const mediaSrc = getInboxMessageMediaUrl(msg.id, url, {
              attachmentIndex: 0,
            });
            return (
              <img
                src={mediaSrc}
                alt=""
                className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (target.dataset.retried) {
                    target.style.display = 'none';
                    return;
                  }
                  target.dataset.retried = 'true';
                  if (msg.id) {
                    target.src = buildProxyImageUrl(null, {
                      messageId: msg.id,
                      attachmentIndex: 0,
                    });
                  } else {
                    target.style.display = 'none';
                  }
                }}
              />
            );
          }

          if (isVideo) {
            const mediaSrc = getInboxMessageMediaUrl(msg.id, url, {
              attachmentIndex: 0,
            });
            return (
              <video
                src={mediaSrc}
                controls
                className="rounded-lg max-w-full mb-1.5"
                style={{ maxHeight: '300px' }}
              >
                {t('unifiedInbox.videoNotSupported', 'الفيديو غير مدعوم')}
              </video>
            );
          }

          if (isAudio) {
            const mediaSrc = getInboxMessageMediaUrl(msg.id, url, {
              attachmentIndex: 0,
            });
            return (
              <audio
                src={mediaSrc}
                controls
                className="w-full mb-1.5"
                style={{ minWidth: '200px' }}
              />
            );
          }

          return null;
        })()}

        {/* Text content */}
        {msg.content &&
          !isMediaOrProxyUrl(msg.content) &&
          !(
            (msg.attachments?.length || msg.mediaUrl) &&
            (msg.content === msg.mediaUrl ||
              msg.attachments?.some((a) => a.url === msg.content))
          ) && (
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                color: msg.isFromCustomer ? 'var(--color-foreground)' : 'white',
              }}
              translate="no"
            >
              {msg.content}
            </p>
          )}

        {/* Timestamp + status */}
        <div
          className="flex items-center gap-1.5 mt-1 tabular-nums font-mono text-[10px]"
          style={{
            color: msg.isFromCustomer
              ? 'var(--color-muted-foreground)'
              : 'rgba(225, 238, 250, 0.82)',
          }}
        >
          <span>
            {new Date(msg.timestamp).toLocaleTimeString(
              i18n.language === 'ar' ? 'ar-EG' : 'en-US',
              {
                hour: '2-digit',
                minute: '2-digit',
              },
            )}
          </span>
          {!msg.isFromCustomer && (
            <span>
              {msg.status === 'read' ? (
                <span style={{ color: '#53bdeb' }}>✓✓</span>
              ) : msg.status === 'delivered' ? (
                '✓✓'
              ) : msg.status === 'sending' ? (
                <ClockIcon className="w-3 h-3 inline" />
              ) : (
                '✓'
              )}
            </span>
          )}
        </div>

        {/* AI message badge + correction trigger */}
        {!msg.isFromCustomer &&
          (msg.isAIResponse || !msg.sender || msg.sender === 'ai') && (
            <div
              className="mt-2 pt-1.5 flex justify-between items-center text-[10px]"
              style={{
                borderTop: '1px solid rgba(225, 238, 250, 0.2)',
              }}
            >
              <span style={{ color: 'rgba(225, 238, 250, 0.7)' }}>
                {t('unifiedInbox.correctionBadge', 'رد ذكاء اصطناعي')}
              </span>
              {editingMessageId !== msg.id && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessageId(msg.id);
                    setCorrectionText(msg.content || '');
                  }}
                  className="hover:underline font-medium cursor-pointer"
                  style={{ color: 'white' }}
                >
                  {t('unifiedInbox.correctionButton', 'تصحيح الرد')}
                </button>
              )}
            </div>
          )}
      </div>

      {/* Inline Correction Textarea */}
      {editingMessageId === msg.id && (
        <div
          className={`flex w-full mt-2 ${
            msg.isFromCustomer ? 'justify-start' : 'justify-end'
          }`}
        >
          <div
            className="max-w-[75%] rounded-xl p-3 space-y-2"
            style={{
              background: 'var(--color-muted)',
              border: '1px solid var(--business-card-border)',
            }}
          >
            <div
              className="text-xs font-semibold"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('unifiedInbox.correctionTitle', 'تصحيح رد الذكاء الاصطناعي')}
            </div>
            <textarea
              value={correctionText}
              onChange={(e) => setCorrectionText(e.target.value)}
              className="w-full min-h-[60px] p-2 text-sm rounded border outline-none resize-none"
              style={{
                background: 'var(--color-background)',
                color: 'var(--color-foreground)',
                borderColor: 'var(--business-card-border)',
              }}
              placeholder={String(
                t(
                  'unifiedInbox.correctionPlaceholder',
                  'اكتب الرد الصحيح لتدريب النموذج...',
                ),
              )}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEditingMessageId(null);
                  setCorrectionText('');
                }}
                className="px-3 py-1.5 rounded font-medium"
                style={{
                  background: 'var(--color-secondary)',
                  color: 'var(--color-secondary-foreground)',
                }}
              >
                {t('unifiedInbox.correctionCancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={() => submitCorrection(msg.id)}
                disabled={savingCorrection || !correctionText.trim()}
                className="px-3 py-1.5 rounded font-medium disabled:opacity-50"
                style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                }}
              >
                {savingCorrection
                  ? t('unifiedInbox.correctionSaving', 'جاري الحفظ...')
                  : t('unifiedInbox.correctionSave', 'حفظ وتحديث')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
