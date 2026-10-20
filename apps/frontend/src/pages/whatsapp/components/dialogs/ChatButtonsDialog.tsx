import React, { useState } from 'react';
import { MousePointerSquare, PlusCircle, X } from 'lucide-react';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import { Input as UiInput } from '@/components/ui/input';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import type { ButtonsData } from '../../chat/types/whatsappChatTypes';

interface ChatButtonsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendButtons: (buttonsData: ButtonsData) => void | Promise<void>;
}

export const ChatButtonsDialog: React.FC<ChatButtonsDialogProps> = ({
  open,
  onOpenChange,
  onSendButtons,
}) => {
  const [buttonsData, setButtonsData] = useState<ButtonsData>({
    text: '',
    footer: '',
    buttons: [{ id: '1', text: '' }],
  });

  const handleSend = async () => {
    await onSendButtons(buttonsData);
    setButtonsData({ text: '', footer: '', buttons: [{ id: '1', text: '' }] });
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      <UiDialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <MousePointerSquare className="size-5 text-[color:var(--color-primary)]" />
            <span>إرسال رسالة بأزرار</span>
          </UiDialogTitle>
        </UiDialogHeader>

        <div className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
              نص الرسالة
            </label>
            <UiTextarea
              rows={4}
              value={buttonsData.text}
              placeholder="اكتب نص الرسالة هنا..."
              onChange={(e) => setButtonsData((prev) => ({ ...prev, text: e.target.value }))}
              className="rounded-[20px] bg-[var(--whatsapp-surface-strong)]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
              نص التذييل
            </label>
            <UiInput
              value={buttonsData.footer}
              onChange={(e) => setButtonsData((prev) => ({ ...prev, footer: e.target.value }))}
              className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              placeholder="اختياري"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                الأزرار
              </label>
              <span className="text-xs text-[color:var(--color-muted-foreground)] tabular-nums font-mono">
                بحد أقصى 3
              </span>
            </div>
            {buttonsData.buttons.map((button, index) => (
              <div key={button.id} className="flex items-center gap-2">
                <UiInput
                  value={button.text}
                  placeholder={`الزر ${index + 1}`}
                  onChange={(e) => {
                    const newButtons = [...buttonsData.buttons];
                    newButtons[index] = { ...button, text: e.target.value };
                    setButtonsData((prev) => ({ ...prev, buttons: newButtons }));
                  }}
                  className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-strong)]"
                />
                {buttonsData.buttons.length > 1 ? (
                  <UiButton
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                    onClick={() => {
                      setButtonsData((prev) => ({
                        ...prev,
                        buttons: prev.buttons.filter((_, itemIndex) => itemIndex !== index),
                      }));
                    }}
                    aria-label="حذف الزر"
                  >
                    <X className="size-4" />
                  </UiButton>
                ) : null}
              </div>
            ))}
            {buttonsData.buttons.length < 3 ? (
              <UiButton
                variant="outline"
                size="sm"
                onClick={() =>
                  setButtonsData((prev) => ({
                    ...prev,
                    buttons: [...prev.buttons, { id: String(prev.buttons.length + 1), text: '' }],
                  }))
                }
              >
                <PlusCircle className="size-4" />
                <span>إضافة زر</span>
              </UiButton>
            ) : null}
          </div>
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            إلغاء
          </UiButton>
          <UiButton onClick={handleSend} disabled={!buttonsData.text.trim()}>
            إرسال
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatButtonsDialog;
