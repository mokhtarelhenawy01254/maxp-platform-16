import React from 'react';
import { Ban, Check, Phone, ShieldAlert, Star, Trash2 } from 'lucide-react';
import {
  Avatar as UiAvatar,
  AvatarFallback as UiAvatarFallback,
  AvatarImage as UiAvatarImage,
} from '@/components/ui/avatar';
import { Button as UiButton } from '@/components/ui/button';
import {
  Sheet as UiSheet,
  SheetContent as UiSheetContent,
  SheetDescription as UiSheetDescription,
  SheetHeader as UiSheetHeader,
  SheetTitle as UiSheetTitle,
} from '@/components/ui/sheet';
import { getInboxExternalImageUrl } from '@/utils/imageUrl';
import { tToast } from '@/utils/i18n-toast';
import type { Contact } from '@/hooks/useWhatsAppQueries';
import {
  getBestContactDisplayName,
  getContactDisplayPhone,
  getContactInitials,
  getContactPhoneHref,
} from '../../whatsappContactDisplay';

interface ContactInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onLoadStarredMessages: () => void;
  onMuteChat: (contact: Contact) => void;
  onClearChat: (contact: Contact) => void;
  onDeleteChat: (contact: Contact) => void;
  onBlockContact: (contact: Contact) => void;
  onUnblockContact: (contact: Contact) => void;
}

export const ContactInfoSheet: React.FC<ContactInfoSheetProps> = ({
  open,
  onOpenChange,
  contact,
  onLoadStarredMessages,
  onMuteChat,
  onClearChat,
  onDeleteChat,
  onBlockContact,
  onUnblockContact,
}) => {
  if (!contact || contact.isGroup) return null;

  const contactName = getBestContactDisplayName(contact);
  const contactPhoneLabel = getContactDisplayPhone(contact);
  const contactPhoneHref = getContactPhoneHref(contact);

  return (
    <UiSheet open={open} onOpenChange={onOpenChange}>
      <UiSheetContent
        side="right"
        dir="rtl"
        className="w-full max-w-md border-l border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiSheetHeader className="border-b border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-6 py-6 text-start">
          <div className="flex flex-col items-center gap-4 pt-7">
            <UiAvatar className="size-28 shadow-[0_18px_40px_rgba(15,27,45,0.12)]">
              <UiAvatarImage src={getInboxExternalImageUrl(contact.profilePicUrl) || undefined} />
              <UiAvatarFallback className="bg-primary/10 text-2xl font-semibold text-[color:var(--color-primary)]">
                {getContactInitials(contactName)}
              </UiAvatarFallback>
            </UiAvatar>
            <div className="min-w-0 max-w-full space-y-3 text-center">
              <UiSheetTitle
                dir="auto"
                className="mx-auto max-w-full break-words text-center text-xl leading-7 text-[color:var(--color-foreground)]"
              >
                {contactName}
              </UiSheetTitle>
              <UiSheetDescription className="sr-only">
                رقم واتساب {contactPhoneLabel}
              </UiSheetDescription>
              {contactPhoneLabel ? (
                <a
                  href={contactPhoneHref}
                  dir="ltr"
                  className="mx-auto inline-flex h-9 max-w-full items-center justify-center gap-2 rounded-full border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-input-bg)] px-3 font-mono text-sm font-semibold tracking-normal text-[color:var(--color-foreground)] shadow-[0_10px_24px_rgba(15,27,45,0.08)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
                >
                  <Phone className="size-4 text-[color:var(--color-primary)]" />
                  <span className="truncate tabular-nums font-mono">{contactPhoneLabel}</span>
                </a>
              ) : null}
            </div>
          </div>
        </UiSheetHeader>

        <div className="space-y-5 overflow-y-auto px-6 py-6">
          <div className="overflow-hidden rounded-[22px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-strong)] shadow-[0_14px_34px_rgba(15,27,45,0.05)]">
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
            >
              <span>الوسائط والروابط والمستندات</span>
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-[color:var(--color-muted-foreground)] tabular-nums font-mono">
                0
              </span>
            </button>
            <div className="h-px bg-[color:var(--shell-control-border)]" />
            <button
              type="button"
              onClick={onLoadStarredMessages}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
            >
              <span>الرسائل المميزة بنجمة</span>
              <Star className="size-4 text-amber-500 dark:text-amber-400" />
            </button>
            <div className="h-px bg-[color:var(--shell-control-border)]" />
            <button
              type="button"
              onClick={() => onMuteChat(contact)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-[color:var(--color-foreground)] transition-colors hover:bg-[var(--whatsapp-surface-hover)]"
            >
              <span>كتم الإشعارات</span>
              <span className="text-xs text-[color:var(--color-muted-foreground)]">
                {contact.isMuted ? 'مفعل' : 'غير مفعل'}
              </span>
            </button>
          </div>

          <div className="grid gap-3">
            <UiButton
              variant="outline"
              className="h-11 w-full justify-between rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              onClick={() => onClearChat(contact)}
            >
              <span>مسح المحتوى</span>
              <Trash2 className="size-4" />
            </UiButton>

            <UiButton
              variant="outline"
              className="h-11 w-full justify-between rounded-[18px] border-rose-200 bg-rose-50/75 text-rose-600 hover:bg-rose-100/80 hover:text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/[0.08] dark:text-rose-300 dark:hover:bg-rose-500/[0.12] dark:hover:text-rose-200"
              onClick={() => {
                onDeleteChat(contact);
                onOpenChange(false);
              }}
            >
              <span>حذف المحادثة</span>
              <Trash2 className="size-4" />
            </UiButton>

            {contact.isBlocked ? (
              <UiButton
                variant="outline"
                className="h-11 w-full justify-between rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                onClick={() => onUnblockContact(contact)}
              >
                <span>إلغاء حظر {contactName}</span>
                <Check className="size-4 text-[color:var(--color-primary)]" />
              </UiButton>
            ) : (
              <UiButton
                variant="outline"
                className="h-11 w-full justify-between rounded-[18px] border-rose-200 bg-rose-50/75 text-rose-600 hover:bg-rose-100/80 hover:text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/[0.08] dark:text-rose-300 dark:hover:bg-rose-500/[0.12] dark:hover:text-rose-200"
                onClick={() => onBlockContact(contact)}
              >
                <span>حظر {contactName}</span>
                <Ban className="size-4" />
              </UiButton>
            )}

            <UiButton
              variant="outline"
              className="h-11 w-full justify-between rounded-[18px] border-rose-200 bg-[var(--whatsapp-surface-strong)] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/[0.12] dark:hover:text-rose-200"
              onClick={() => tToast.info("whatsappChat.msg_36fc")}
            >
              <span>الإبلاغ عن {contactName}</span>
              <ShieldAlert className="size-4" />
            </UiButton>
          </div>
        </div>
      </UiSheetContent>
    </UiSheet>
  );
};

export default ContactInfoSheet;
