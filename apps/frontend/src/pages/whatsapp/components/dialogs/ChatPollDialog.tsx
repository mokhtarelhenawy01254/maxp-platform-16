import React, { useState } from 'react';
import { BarChart3, PlusCircle, X } from 'lucide-react';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import { Input as UiInput } from '@/components/ui/input';
import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from '@/components/ui/select';
import type { PollData } from '../../chat/types/whatsappChatTypes';

interface ChatPollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendPoll: (pollData: PollData) => void | Promise<void>;
}

export const ChatPollDialog: React.FC<ChatPollDialogProps> = ({
  open,
  onOpenChange,
  onSendPoll,
}) => {
  const [pollData, setPollData] = useState<PollData>({
    question: '',
    options: ['', ''],
    selectableCount: 1,
  });

  const handleSend = async () => {
    await onSendPoll(pollData);
    setPollData({ question: '', options: ['', ''], selectableCount: 1 });
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const completedOptionsCount = pollData.options.filter((option) => option.trim()).length;

  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      <UiDialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <BarChart3 className="size-5 text-[color:var(--color-primary)]" />
            <span>إنشاء استطلاع</span>
          </UiDialogTitle>
          <UiDialogDescription>
            اكتب السؤال وحدد الخيارات التي سيستطيع العميل الاختيار منها.
          </UiDialogDescription>
        </UiDialogHeader>

        <div className="space-y-4 px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
              السؤال
            </label>
            <UiInput
              value={pollData.question}
              placeholder="اكتب السؤال هنا..."
              onChange={(e) => setPollData((prev) => ({ ...prev, question: e.target.value }))}
              className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                الخيارات
              </label>
              <span className="text-xs text-[color:var(--color-muted-foreground)] tabular-nums font-mono">
                {completedOptionsCount} مكتمل
              </span>
            </div>
            {pollData.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <UiInput
                  value={option}
                  placeholder={`الخيار ${index + 1}`}
                  onChange={(e) => {
                    const newOptions = [...pollData.options];
                    newOptions[index] = e.target.value;
                    setPollData((prev) => ({ ...prev, options: newOptions }));
                  }}
                  className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-strong)]"
                />
                {pollData.options.length > 2 ? (
                  <UiButton
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                    onClick={() => {
                      const newOptions = pollData.options.filter((_, itemIndex) => itemIndex !== index);
                      setPollData((prev) => ({ ...prev, options: newOptions }));
                    }}
                    aria-label="حذف الخيار"
                  >
                    <X className="size-4" />
                  </UiButton>
                ) : null}
              </div>
            ))}
            {pollData.options.length < 12 ? (
              <UiButton
                variant="outline"
                size="sm"
                onClick={() => setPollData((prev) => ({ ...prev, options: [...prev.options, ''] }))}
              >
                <PlusCircle className="size-4" />
                <span>إضافة خيار</span>
              </UiButton>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
              عدد الاختيارات المسموح بها
            </label>
            <UiSelect
              value={String(pollData.selectableCount)}
              onValueChange={(value) =>
                setPollData((prev) => ({ ...prev, selectableCount: Number(value) }))
              }
            >
              <UiSelectTrigger className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]">
                <UiSelectValue />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="1">اختيار واحد فقط</UiSelectItem>
                <UiSelectItem value="0">اختيارات متعددة</UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </div>
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            إلغاء
          </UiButton>
          <UiButton
            onClick={handleSend}
            disabled={!pollData.question.trim() || completedOptionsCount < 2}
          >
            إرسال الاستطلاع
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatPollDialog;
