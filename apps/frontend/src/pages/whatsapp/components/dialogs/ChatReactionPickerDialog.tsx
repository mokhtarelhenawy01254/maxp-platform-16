import React from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';

interface ChatReactionPickerDialogProps {
  messageId: string | null;
  onClose: () => void;
  onSelectEmoji: (messageId: string, emoji: string) => void;
}

export const ChatReactionPickerDialog: React.FC<ChatReactionPickerDialogProps> = ({
  messageId,
  onClose,
  onSelectEmoji,
}) => {
  return (
    <UiDialog open={Boolean(messageId)} onOpenChange={(open) => !open && onClose()}>
      <UiDialogContent
        showCloseButton={false}
        className="max-w-fit rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-4"
      >
        <UiDialogHeader className="pb-3 text-start">
          <UiDialogTitle className="text-base">اختر تفاعل</UiDialogTitle>
        </UiDialogHeader>
        <EmojiPicker
          onEmojiClick={(data: EmojiClickData) => {
            if (messageId) {
              onSelectEmoji(messageId, data.emoji);
              onClose();
            }
          }}
        />
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatReactionPickerDialog;
