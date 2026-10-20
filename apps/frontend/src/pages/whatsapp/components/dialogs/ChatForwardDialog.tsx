import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Avatar as UiAvatar,
  AvatarFallback as UiAvatarFallback,
  AvatarImage as UiAvatarImage,
} from '@/components/ui/avatar';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import { getInboxExternalImageUrl } from '@/utils/imageUrl';
import type { Contact } from '@/hooks/useWhatsAppQueries';
import { getContactDisplayPhone } from '../../whatsappContactDisplay';

interface ChatForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Contact[];
  getContactName: (contact: Contact) => string;
  onForward: (targetJids: string[]) => void | Promise<void>;
  isForwarding?: boolean;
}

export const ChatForwardDialog: React.FC<ChatForwardDialogProps> = ({
  open,
  onOpenChange,
  conversations,
  getContactName,
  onForward,
  isForwarding = false,
}) => {
  const [selectedContactsForForward, setSelectedContactsForForward] = useState<string[]>([]);

  const handleToggleContact = (jid: string) => {
    setSelectedContactsForForward((prev) =>
      prev.includes(jid) ? prev.filter((item) => item !== jid) : [...prev, jid],
    );
  };

  const handleSend = async () => {
    if (selectedContactsForForward.length === 0 || isForwarding) return;
    await onForward(selectedContactsForForward);
    setSelectedContactsForForward([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedContactsForForward([]);
    onOpenChange(false);
  };

  return (
    <UiDialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setSelectedContactsForForward([]);
        }
      }}
    >
      <UiDialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="text-lg text-[color:var(--color-foreground)]">
            إعادة توجيه الرسالة إلى...
          </UiDialogTitle>
          <UiDialogDescription>
            اختر محادثة أو أكثر لإرسال نفس الرسالة بدون فتح نافذة جديدة.
          </UiDialogDescription>
        </UiDialogHeader>

        <div className="max-h-[28rem] space-y-2 overflow-y-auto px-4 py-4">
          {conversations.map((contact) => {
            const isSelected = selectedContactsForForward.includes(contact.jid);
            const contactName = getContactName(contact);

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleToggleContact(contact.jid)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[22px] border px-3 py-3 text-start transition-all',
                  isSelected
                    ? 'border-[color:var(--color-primary)] bg-primary/10'
                    : 'border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] hover:bg-[var(--whatsapp-surface-hover)]',
                )}
              >
                <UiAvatar className="size-11">
                  <UiAvatarImage src={getInboxExternalImageUrl(contact.profilePicUrl) || undefined} />
                  <UiAvatarFallback className="bg-primary/10 font-semibold text-[color:var(--color-primary)]">
                    {contactName.slice(0, 2).toUpperCase()}
                  </UiAvatarFallback>
                </UiAvatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                    {contactName}
                  </p>
                  <p className="truncate text-xs text-[color:var(--color-muted-foreground)] tabular-nums font-mono" dir="ltr">
                    {getContactDisplayPhone(contact)}
                  </p>
                </div>

                {isSelected ? <Check className="size-4 text-[color:var(--color-primary)]" /> : null}
              </button>
            );
          })}
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            إلغاء
          </UiButton>
          <UiButton
            onClick={handleSend}
            disabled={selectedContactsForForward.length === 0 || isForwarding}
          >
            <span>إرسال </span>
            <span className="tabular-nums font-mono">({selectedContactsForForward.length})</span>
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatForwardDialog;
