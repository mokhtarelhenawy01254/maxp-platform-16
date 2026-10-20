import React from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import {
  Sheet as UiSheet,
  SheetContent as UiSheetContent,
  SheetDescription as UiSheetDescription,
  SheetHeader as UiSheetHeader,
  SheetTitle as UiSheetTitle,
} from '@/components/ui/sheet';
import type { Message } from '@/hooks/useWhatsAppQueries';

interface ChatStarredMessagesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
}

export const ChatStarredMessagesSheet: React.FC<ChatStarredMessagesSheetProps> = ({
  open,
  onOpenChange,
  messages,
}) => {
  return (
    <UiSheet open={open} onOpenChange={onOpenChange}>
      <UiSheetContent
        side="right"
        className="w-full max-w-md border-l border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiSheetHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-6 text-start">
          <div className="flex items-center gap-2">
            <Star className="size-5 text-amber-500" />
            <UiSheetTitle>الرسائل المميزة</UiSheetTitle>
          </div>
          <UiSheetDescription>
            راجع الرسائل التي تم تمييزها داخل المحادثة الحالية.
          </UiSheetDescription>
        </UiSheetHeader>

        <div className="space-y-3 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)] px-4 py-10 text-center text-sm text-[color:var(--color-muted-foreground)]">
              لا توجد رسائل مميزة
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.messageId}
                className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] px-4 py-3"
              >
                <p className="text-sm text-[color:var(--color-foreground)]">
                  {msg.content}
                </p>
                <p className="mt-2 text-xs text-[color:var(--color-muted-foreground)] tabular-nums font-mono" dir="ltr">
                  {format(new Date(msg.timestamp), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>
            ))
          )}
        </div>
      </UiSheetContent>
    </UiSheet>
  );
};

export default ChatStarredMessagesSheet;
