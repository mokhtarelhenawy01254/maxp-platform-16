import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { NotesPanel } from '@/components/facebook-inbox/NotesPanel/NotesPanel';
import CustomerProfile from '@/components/facebook-inbox/CustomerProfile/CustomerProfile';
import type { InboxConversation, ConversationStatus } from '@/types/inbox.types';
import type { InboxVerticalCapabilities } from '../hooks/useInboxVerticalCapabilities';
import type { VerticalContextData } from '../hooks/useConversationVerticalContext';

interface FacebookContextDrawerProps {
  selectedConversation: InboxConversation;
  inboxPath: string;
  showPinnedContextPanel: boolean;
  showNotes: boolean;
  onCloseNotes: () => void;
  showNotesOverlay: boolean;
  showProfileOverlay: boolean;
  onCloseProfilePanel: () => void;
  onTagsChange: (tags: string[]) => void;
  updatingTags: boolean;
  onStatusChange: (status: ConversationStatus) => void;
  onAssign: (userId: string | null) => void;
  disabled: boolean;
  isBlocked: boolean;
  checkingBlockStatus: boolean;
  blocking: boolean;
  showBlockModal: boolean;
  blockReason: string;
  onBlockClick: () => void;
  onUnblockClick: () => void;
  onBlockReasonChange: (reason: string) => void;
  onBlockConfirm: () => void;
  onBlockCancel: () => void;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  onSoundToggle: () => void;
  onNotificationsToggle: () => void;
  onCreateOrder: () => void;
  verticalCapabilities?: InboxVerticalCapabilities;
  verticalContext?: VerticalContextData | null;
  onPrimaryAction?: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
  onInsertSnippet?: (text: string) => void;
}

export const FacebookContextDrawer: React.FC<FacebookContextDrawerProps> = ({
  selectedConversation,
  inboxPath,
  showPinnedContextPanel,
  showNotes,
  onCloseNotes,
  showNotesOverlay,
  showProfileOverlay,
  onCloseProfilePanel,
  onTagsChange,
  updatingTags,
  onStatusChange,
  onAssign,
  disabled,
  isBlocked,
  checkingBlockStatus,
  blocking,
  showBlockModal,
  blockReason,
  onBlockClick,
  onUnblockClick,
  onBlockReasonChange,
  onBlockConfirm,
  onBlockCancel,
  soundEnabled,
  notificationsEnabled,
  onSoundToggle,
  onNotificationsToggle,
  onCreateOrder,
  verticalCapabilities,
  verticalContext,
  onPrimaryAction,
  onOpenServiceOrder,
  onOpenTasks,
  onInsertSnippet,
}) => {
  const { t } = useTranslation();

  const handleCopyConversationLink = (conversationId: string) => {
    const conversationLink = `${window.location.origin}${inboxPath}?conversation=${conversationId}`;
    navigator.clipboard
      .writeText(conversationLink)
      .catch((err) => {
        console.error('Failed to copy link:', err);
        alert(t('conversations.conversationLinkAlert', { link: conversationLink }));
      });
  };

  const sharedProfileProps = {
    conversation: selectedConversation,
    onTagsChange,
    updatingTags,
    currentStatus: selectedConversation.status,
    onStatusChange: (status: string) =>
      onStatusChange(status as ConversationStatus),
    currentAssignee: selectedConversation.assignedTo,
    currentAssigneeName: selectedConversation.assignedToName ?? null,
    onAssign,
    disabled,
    onCopyConversationLink: handleCopyConversationLink,
    isBlocked,
    checkingBlockStatus,
    blocking,
    showBlockModal,
    blockReason,
    onBlockClick,
    onUnblockClick,
    onBlockReasonChange,
    onBlockConfirm,
    onBlockCancel,
    soundEnabled,
    notificationsEnabled,
    onSoundToggle,
    onNotificationsToggle,
    onCreateOrder,
    verticalCapabilities,
    verticalContext,
    onPrimaryAction,
    onOpenServiceOrder,
    onOpenTasks,
    onInsertSnippet,
  };

  return (
    <>
      {/* Notes Panel Overlay */}
      {showNotesOverlay && (
        <>
          <div
            className="absolute inset-0 z-20 bg-black/10 backdrop-blur-[1px]"
            onClick={onCloseNotes}
          />
          <div className="absolute inset-y-0 right-0 z-30 w-[85%] sm:max-w-[20rem]">
            <NotesPanel
              className="h-full w-full shadow-2xl"
              customerId={selectedConversation.customerId}
              isOpen={showNotes}
              onClose={onCloseNotes}
            />
          </div>
        </>
      )}

      {/* Pinned Desktop Context Column */}
      {showPinnedContextPanel &&
        (showNotes ? (
          <NotesPanel
            className="business-inbox-column--profile business-inbox-column--context h-full border-s border-border/50 bg-card/80 shadow-none"
            customerId={selectedConversation.customerId}
            isOpen
            onClose={onCloseNotes}
          />
        ) : (
          <CustomerProfile
            className="business-inbox-column--context h-full border-s border-border/50 bg-card/80 shadow-none"
            compactHeader
            {...sharedProfileProps}
          />
        ))}

      {/* Mobile/Tablet Profile Overlay */}
      {showProfileOverlay && (
        <>
          <div
            className="absolute inset-0 z-20 bg-black/15 backdrop-blur-[1px]"
            onClick={onCloseProfilePanel}
          />
          <div className="absolute inset-y-0 right-0 z-30 w-[85%] sm:max-w-[22rem] xl:max-w-[23rem]">
            <button
              type="button"
              onClick={onCloseProfilePanel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground hover:bg-muted absolute left-3 top-3 z-40 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title={t('facebookInbox.closeCustomerData')}
              aria-label={t('facebookInbox.closeCustomerData')}
            >
              <X className="h-4 w-4" />
            </button>
            <CustomerProfile
              className="w-full shadow-2xl"
              {...sharedProfileProps}
            />
          </div>
        </>
      )}
    </>
  );
};

export default FacebookContextDrawer;
