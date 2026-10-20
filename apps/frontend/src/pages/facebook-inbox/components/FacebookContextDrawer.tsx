import React from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NotesPanel } from '@/components/facebook-inbox/NotesPanel/NotesPanel';
import CustomerProfile from '@/components/facebook-inbox/CustomerProfile/CustomerProfile';
import type { InboxConversation, ConversationStatus } from '@/types/inbox.types';

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
            className="business-inbox-column--profile business-inbox-column--context h-full shadow-none"
            customerId={selectedConversation.customerId}
            isOpen
            onClose={onCloseNotes}
          />
        ) : (
          <CustomerProfile
            className="business-inbox-column--context h-full shadow-none"
            conversation={selectedConversation}
            compactHeader
            onTagsChange={onTagsChange}
            updatingTags={updatingTags}
            currentStatus={selectedConversation.status}
            onStatusChange={(status) =>
              onStatusChange(status as ConversationStatus)
            }
            currentAssignee={selectedConversation.assignedTo}
            currentAssigneeName={selectedConversation.assignedToName ?? null}
            onAssign={onAssign}
            disabled={disabled}
            onCopyConversationLink={handleCopyConversationLink}
            isBlocked={isBlocked}
            checkingBlockStatus={checkingBlockStatus}
            blocking={blocking}
            showBlockModal={showBlockModal}
            blockReason={blockReason}
            onBlockClick={onBlockClick}
            onUnblockClick={onUnblockClick}
            onBlockReasonChange={onBlockReasonChange}
            onBlockConfirm={onBlockConfirm}
            onBlockCancel={onBlockCancel}
            soundEnabled={soundEnabled}
            notificationsEnabled={notificationsEnabled}
            onSoundToggle={onSoundToggle}
            onNotificationsToggle={onNotificationsToggle}
            onCreateOrder={onCreateOrder}
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
              className="business-icon-button absolute left-3 top-3 z-40 rounded-full"
              title={t('facebookInbox.closeCustomerData')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <CustomerProfile
              className="w-full shadow-2xl"
              conversation={selectedConversation}
              onTagsChange={onTagsChange}
              updatingTags={updatingTags}
              currentStatus={selectedConversation.status}
              onStatusChange={(status) =>
                onStatusChange(status as ConversationStatus)
              }
              currentAssignee={selectedConversation.assignedTo}
              currentAssigneeName={selectedConversation.assignedToName ?? null}
              onAssign={onAssign}
              disabled={disabled}
              onCopyConversationLink={handleCopyConversationLink}
              isBlocked={isBlocked}
              checkingBlockStatus={checkingBlockStatus}
              blocking={blocking}
              showBlockModal={showBlockModal}
              blockReason={blockReason}
              onBlockClick={onBlockClick}
              onUnblockClick={onUnblockClick}
              onBlockReasonChange={onBlockReasonChange}
              onBlockConfirm={onBlockConfirm}
              onBlockCancel={onBlockCancel}
              soundEnabled={soundEnabled}
              notificationsEnabled={notificationsEnabled}
              onSoundToggle={onSoundToggle}
              onNotificationsToggle={onNotificationsToggle}
              onCreateOrder={onCreateOrder}
            />
          </div>
        </>
      )}
    </>
  );
};

export default FacebookContextDrawer;
