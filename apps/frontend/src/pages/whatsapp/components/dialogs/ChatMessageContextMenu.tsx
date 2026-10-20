import React from 'react';
import { Copy, Forward, Pin, PinOff, Reply, SmilePlus, Star, Trash2 } from 'lucide-react';
import { Button as UiButton } from '@/components/ui/button';
import type { Message } from '@/hooks/useWhatsAppQueries';
import type { MessageContextMenuPosition } from '../../chat/types/whatsappChatTypes';

const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface ChatMessageContextMenuProps {
  position: MessageContextMenuPosition | null;
  selectedMessage: Message | null;
  onClose: () => void;
  onSendReaction: (messageId: string, emoji: string) => void;
  onOpenReactionPicker: (messageId: string) => void;
  onReply: (message: Message) => void;
  onCopy: (message: Message) => void;
  onForward: (message: Message) => void;
  onStarMessage: (message: Message) => void;
  onPinMessage: (message: Message, durationSeconds: number) => void;
  onUnpinMessage: (messageId: string) => void;
  onDeleteMessage: (message: Message) => void;
}

export const ChatMessageContextMenu: React.FC<ChatMessageContextMenuProps> = ({
  position,
  selectedMessage,
  onClose,
  onSendReaction,
  onOpenReactionPicker,
  onReply,
  onCopy,
  onForward,
  onStarMessage,
  onPinMessage,
  onUnpinMessage,
  onDeleteMessage,
}) => {
  if (!position || !selectedMessage) return null;

  const messageMenuLeft =
    typeof window !== 'undefined'
      ? Math.min(position.mouseX, window.innerWidth - 264)
      : 0;
  const messageMenuTop =
    typeof window !== 'undefined'
      ? Math.min(position.mouseY, window.innerHeight - 320)
      : 0;

  let isMsgPinned = selectedMessage.isPinned === true;
  if (!isMsgPinned && selectedMessage.metadata) {
    try {
      const m =
        typeof selectedMessage.metadata === 'string'
          ? JSON.parse(selectedMessage.metadata)
          : selectedMessage.metadata;
      isMsgPinned = m?.isPinned === true;
    } catch {
      // ignore JSON parse error
    }
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div
        className="fixed z-50 w-64 rounded-[24px] border border-[color:var(--shell-overlay-border)] bg-[var(--shell-overlay-bg)] p-2 shadow-[var(--shell-overlay-shadow)] ring-1 ring-[color:var(--shell-overlay-edge)]"
        style={{ left: messageMenuLeft, top: messageMenuTop }}
      >
        <div className="mb-2 flex flex-wrap gap-1 border-b border-[color:var(--shell-control-border)] pb-2">
          {commonReactions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSendReaction(selectedMessage.messageId, emoji);
                onClose();
              }}
              className="flex size-9 items-center justify-center rounded-2xl text-lg transition-colors hover:bg-[color:var(--shell-control-hover)]"
            >
              {emoji}
            </button>
          ))}
          <UiButton
            variant="ghost"
            size="icon-sm"
            className="rounded-2xl"
            onClick={() => {
              onOpenReactionPicker(selectedMessage.messageId);
              onClose();
            }}
            aria-label="اختر تفاعلاً إضافياً"
          >
            <SmilePlus className="size-4" />
          </UiButton>
        </div>

        <button
          type="button"
          onClick={() => {
            onReply(selectedMessage);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
        >
          <Reply className="size-4" />
          <span>رد</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onCopy(selectedMessage);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
        >
          <Copy className="size-4" />
          <span>نسخ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onForward(selectedMessage);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
        >
          <Forward className="size-4" />
          <span>إعادة توجيه</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onStarMessage(selectedMessage);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--shell-control-hover)]"
        >
          <Star className="size-4" />
          <span>تمييز بنجمة</span>
        </button>

        {isMsgPinned ? (
          <button
            type="button"
            onClick={() => {
              onUnpinMessage(selectedMessage.messageId);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-amber-600 dark:text-amber-400 transition-colors hover:bg-amber-500/10"
          >
            <PinOff className="size-4" />
            <span>إلغاء التثبيت</span>
          </button>
        ) : (
          <div className="border-t border-[color:var(--shell-control-border)] pt-1.5 mt-1">
            <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-[color:var(--color-muted-foreground)]">
              <Pin className="size-3.5" />
              <span>تثبيت الرسالة لمدة:</span>
            </div>
            <div className="grid grid-cols-3 gap-1 px-2 py-1">
              <button
                type="button"
                onClick={() => {
                  onPinMessage(selectedMessage, 86400);
                  onClose();
                }}
                className="rounded-xl px-1.5 py-1 text-xs text-center font-medium bg-[color:var(--shell-control-hover)] hover:bg-primary/20 transition-colors tabular-nums font-mono"
                title="24 ساعة"
              >
                24 س
              </button>
              <button
                type="button"
                onClick={() => {
                  onPinMessage(selectedMessage, 604800);
                  onClose();
                }}
                className="rounded-xl px-1.5 py-1 text-xs text-center font-medium bg-[color:var(--shell-control-hover)] hover:bg-primary/20 transition-colors tabular-nums font-mono"
                title="7 أيام"
              >
                7 أيام
              </button>
              <button
                type="button"
                onClick={() => {
                  onPinMessage(selectedMessage, 2592000);
                  onClose();
                }}
                className="rounded-xl px-1.5 py-1 text-xs text-center font-medium bg-[color:var(--shell-control-hover)] hover:bg-primary/20 transition-colors tabular-nums font-mono"
                title="30 يوماً"
              >
                30 يوم
              </button>
            </div>
          </div>
        )}

        {selectedMessage.fromMe ? (
          <button
            type="button"
            onClick={() => {
              onDeleteMessage(selectedMessage);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded-[18px] px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-500/10"
          >
            <Trash2 className="size-4" />
            <span>حذف للجميع</span>
          </button>
        ) : null}
      </div>
    </>
  );
};

export default ChatMessageContextMenu;
