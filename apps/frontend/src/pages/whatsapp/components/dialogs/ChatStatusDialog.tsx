import React, { useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import { Textarea as UiTextarea } from '@/components/ui/textarea';

interface ChatStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostStatus: (content: string) => void | Promise<void>;
  isPosting?: boolean;
}

export const ChatStatusDialog: React.FC<ChatStatusDialogProps> = ({
  open,
  onOpenChange,
  onPostStatus,
  isPosting = false,
}) => {
  const [statusContent, setStatusContent] = useState('');

  const handlePost = async () => {
    if (!statusContent.trim() || isPosting) return;
    await onPostStatus(statusContent);
    setStatusContent('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setStatusContent('');
    onOpenChange(false);
  };

  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      <UiDialogContent
        showCloseButton={false}
        className="max-w-xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <PlusCircle className="size-5 text-[color:var(--color-primary)]" />
            <span>إضافة حالة جديدة</span>
          </UiDialogTitle>
          <UiDialogDescription>
            ستظهر الحالة لمدة 24 ساعة ثم تختفي تلقائيًا.
          </UiDialogDescription>
        </UiDialogHeader>

        <div className="space-y-3 px-6 py-6">
          <UiTextarea
            autoFocus
            rows={4}
            value={statusContent}
            onChange={(e) => setStatusContent(e.target.value)}
            placeholder="ماذا يحدث؟ اكتب محتوى الحالة..."
            className="rounded-[20px] bg-[var(--whatsapp-surface-strong)]"
          />
          <p className="text-xs text-[color:var(--color-muted-foreground)] tabular-nums font-mono">
            الحالة ستنتهي بعد 24 ساعة
          </p>
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            إلغاء
          </UiButton>
          <UiButton
            onClick={handlePost}
            disabled={!statusContent.trim() || isPosting}
          >
            {isPosting ? <Loader2 className="size-4 animate-spin me-2" /> : null}
            <span>نشر الحالة</span>
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatStatusDialog;
