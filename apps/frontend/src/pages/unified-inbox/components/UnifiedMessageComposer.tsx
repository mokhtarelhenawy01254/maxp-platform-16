import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import {
  ChatBubbleLeftRightIcon,
  PaperClipIcon,
  FaceSmileIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '@/hooks/useTheme';
import type {
  UnifiedConversation,
  UnifiedMessage,
} from '../types/unifiedInboxTypes';

interface QuickReply {
  id: string;
  title: string;
  content: string;
  imageUrls?: string[];
}

interface UnifiedMessageComposerProps {
  selectedConversation: UnifiedConversation;
  newMessage: string;
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  attachments: Array<{ url: string; name: string; type: string }>;
  setAttachments: React.Dispatch<
    React.SetStateAction<Array<{ url: string; name: string; type: string }>>
  >;
  replyToMsg: UnifiedMessage | null;
  onCancelReply: () => void;
  onSendMessage: () => void;
  sending: boolean;
  uploadingFile: boolean;
  quickReplies: QuickReply[];
  showQuickReplies: boolean;
  setShowQuickReplies: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectQuickReply: (reply: QuickReply) => void;
  onOpenTextGallery: () => void;
  onOpenImageGallery: () => void;
  onSelectFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UnifiedMessageComposer: React.FC<UnifiedMessageComposerProps> = ({
  selectedConversation,
  newMessage,
  setNewMessage,
  attachments,
  setAttachments,
  replyToMsg,
  onCancelReply,
  onSendMessage,
  sending,
  uploadingFile,
  quickReplies,
  showQuickReplies,
  setShowQuickReplies,
  onSelectQuickReply,
  onOpenTextGallery,
  onOpenImageGallery,
  onSelectFile,
}) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { actualTheme, derivedTheme } = useTheme();
  const isDarkMode = derivedTheme === 'dark' || actualTheme === 'dark';

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        attachmentMenuRef.current &&
        !attachmentMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return 'Messenger';
      case 'instagram':
        return 'Instagram';
      case 'whatsapp':
        return t('unifiedInbox.tabs.whatsapp', 'WhatsApp');
      case 'telegram':
        return 'Telegram';
      default:
        return platform;
    }
  };

  return (
    <>
      {/* Quick Replies Panel */}
      {showQuickReplies && quickReplies.length === 0 && (
        <div
          className="business-chat-composer px-5 py-3 text-sm"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {t('unifiedInbox.noQuickReplies', 'لا توجد ردود جاهزة محفوظة')}
        </div>
      )}
      {showQuickReplies && quickReplies.length > 0 && (
        <div className="business-chat-composer max-h-40 overflow-y-auto">
          <div className="p-3 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                {t('unifiedInbox.quickReplies', 'الردود الجاهزة')}
              </span>
              <button
                type="button"
                onClick={() => setShowQuickReplies(false)}
                className="business-chip-button"
                aria-label={t('unifiedInbox.close', 'إغلاق')}
              >
                <XMarkIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {quickReplies.map((reply) => (
              <button
                type="button"
                key={reply.id}
                onClick={() => onSelectQuickReply(reply)}
                className={`w-full rounded-2xl border px-3 py-2 flex flex-col items-start gap-1 ${
                  isRtl ? 'text-right' : 'text-left'
                } transition-colors hover:border-primary/40 hover:bg-primary/5`}
                style={{
                  borderColor: 'var(--business-card-border)',
                  background:
                    'var(--business-surface-panel, color-mix(in srgb, var(--color-foreground) 4%, var(--color-background)))',
                }}
              >
                <span
                  className="font-medium text-xs"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {reply.title}
                </span>
                <span
                  className="text-xs truncate max-w-full"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  — {reply.content.substring(0, 60)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div
          className="px-5 py-2 flex items-center gap-2 overflow-x-auto"
          style={{
            borderTop: '1px solid var(--business-card-border)',
            background:
              'color-mix(in srgb, var(--color-primary) 5%, var(--color-background))',
          }}
        >
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 shrink-0 border rounded-lg px-2 py-1.5"
              style={{
                borderColor: 'var(--business-card-border)',
                background: 'var(--business-surface-panel)',
              }}
            >
              {att.type === 'image' ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      'color-mix(in srgb, var(--color-primary) 15%, var(--color-background))',
                  }}
                >
                  <PaperClipIcon
                    className="w-5 h-5"
                    style={{ color: 'var(--color-primary)' }}
                  />
                </div>
              )}
              <div className="min-w-0 max-w-[120px]">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {att.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {att.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, i) => i !== idx))
                }
                className="business-chip-button shrink-0"
                aria-label={t('unifiedInbox.removeFile', 'حذف المرفق')}
              >
                <XMarkIcon className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Reply Preview */}
      {replyToMsg && (
        <div
          className="px-5 py-2 flex items-center gap-2"
          style={{
            borderTop: '1px solid var(--business-card-border)',
            background:
              'color-mix(in srgb, var(--color-primary) 5%, var(--color-background))',
          }}
        >
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-medium"
              style={{ color: 'var(--color-primary)' }}
            >
              {t('unifiedInbox.replyingTo', 'الرد على:')}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              {replyToMsg.content?.substring(0, 80) ||
                t('unifiedInbox.mediaAttachment', 'مرفق وسائط')}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="business-chip-button shrink-0"
            aria-label={t('unifiedInbox.cancel', 'إلغاء')}
          >
            <XMarkIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Message Input Bar */}
      <div
        className="business-chat-composer px-5 py-3"
        style={{ position: 'relative' }}
      >
        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div
            className="emoji-picker-popover"
            style={{
              position: 'absolute',
              bottom: '100%',
              insetInlineStart: 0,
              zIndex: 200,
              marginBottom: '4px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <EmojiPicker
              theme={isDarkMode ? EmojiTheme.DARK : EmojiTheme.LIGHT}
              onEmojiClick={(emojiData: any) => {
                setNewMessage((prev: string) => prev + emojiData.emoji);
                setShowEmojiPicker(false);
              }}
              width={320}
              height={380}
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={onSelectFile}
          className="hidden"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
        />

        <div className="flex items-center gap-2">
          {/* Action icon buttons */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
              aria-label={t('unifiedInbox.quickReplies', 'الردود الجاهزة')}
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onOpenTextGallery}
              className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
              aria-label={t('unifiedInbox.savedTexts', 'النصوص المحفوظة')}
            >
              <DocumentTextIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="relative" ref={attachmentMenuRef}>
              <button
                type="button"
                onClick={() => setShowAttachmentMenu((prev) => !prev)}
                className="business-icon-button rounded-xl p-1.5 transition-colors sm:p-2"
                aria-label={t('unifiedInbox.savedImages', 'الصور المحفوظة')}
              >
                <PhotoIcon className="w-5 h-5" aria-hidden="true" />
              </button>

              {showAttachmentMenu && (
                <div
                  className="inbox-platform-dropdown animate-in fade-in slide-in-from-bottom-2"
                  style={{
                    top: 'auto',
                    bottom: 'calc(100% + 6px)',
                    [isRtl ? 'left' : 'right']: 'auto',
                    [isRtl ? 'right' : 'left']: 0,
                    minWidth: 180,
                    zIndex: 200,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      onOpenImageGallery();
                    }}
                    className="inbox-dropdown-item w-full"
                  >
                    <span className="inbox-platform-text">
                      {t('unifiedInbox.chooseExistingFile', 'اختيار ملف محفوظ')}
                    </span>
                  </button>
                  <div
                    style={{
                      borderTop: '1px solid var(--business-card-border)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowAttachmentMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="inbox-dropdown-item w-full"
                  >
                    <span className="inbox-platform-text">
                      {t('unifiedInbox.upload', 'رفع ملف جديد')}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${
                uploadingFile ? 'animate-pulse opacity-50' : ''
              }`}
              aria-label={t('unifiedInbox.attachFile', 'إرفاق ملف')}
              disabled={uploadingFile}
            >
              <PaperClipIcon className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`business-icon-button rounded-xl p-1.5 transition-colors sm:p-2 ${
                showEmojiPicker ? 'text-primary' : ''
              }`}
              aria-label={t('unifiedInbox.emoji', 'إيموجي')}
            >
              <FaceSmileIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Input text field */}
          <div className="flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder={
                uploadingFile
                  ? t('unifiedInbox.uploading', 'جاري الرفع...')
                  : t('unifiedInbox.inputPlaceholder', {
                      platform: getPlatformLabel(selectedConversation.platform),
                      defaultValue: `اكتب رسالة عبر ${getPlatformLabel(selectedConversation.platform)}...`,
                    })
              }
              className="business-chat-input"
              disabled={sending || uploadingFile}
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={onSendMessage}
            disabled={
              (!newMessage.trim() && attachments.length === 0) ||
              sending ||
              uploadingFile
            }
            className="business-icon-button text-white p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
            style={{
              background: 'var(--color-primary)',
            }}
            aria-label={t('unifiedInbox.send', 'إرسال')}
          >
            {sending ? (
              <div
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
            ) : (
              <PaperAirplaneIcon
                className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>
    </>
  );
};
