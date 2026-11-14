import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuthSimple';
import { useCompany } from '@/contexts/CompanyContext';
import useSocket from '@/hooks/useSocket';
import { useInboxConversations } from '@/hooks/inbox/useInboxConversations';
import { getInboxCustomerAvatarUrl } from '@/utils/imageUrl';
import type { InboxConversation } from '@/types/inbox.types';
import type { FacebookInboxProps } from './types/facebookInboxTypes';
import FacebookInboxTabsBar from './components/FacebookInboxTabsBar';
import FacebookConversationSidebar from './components/FacebookConversationSidebar';
import FacebookChatHeader from './components/FacebookChatHeader';
import FacebookMessageStream from './components/FacebookMessageStream';
import FacebookContextDrawer from './components/FacebookContextDrawer';
import FacebookEmptyChatPlaceholder from './components/FacebookEmptyChatPlaceholder';
import FacebookInboxModalsContainer from './components/FacebookInboxModalsContainer';
import useFacebookInboxData from './hooks/useFacebookInboxData';
import useFacebookInboxModals from './hooks/useFacebookInboxModals';
import useFacebookInboxLayout from './hooks/useFacebookInboxLayout';
import useFacebookInboxSocket from './hooks/useFacebookInboxSocket';
import useFacebookInboxActions from './hooks/useFacebookInboxActions';
import useInboxVerticalCapabilities, {
  type InboxVerticalActionId,
} from './hooks/useInboxVerticalCapabilities';
import useConversationVerticalContext from './hooks/useConversationVerticalContext';

export const FacebookInbox: React.FC<FacebookInboxProps> = ({
  channel = 'FACEBOOK',
  platform = 'facebook',
  inboxPath = '/facebook-inbox',
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { socket, isConnected } = useSocket();

  const {
    conversations, selectedConversation, messages, loading, loadingMessages, error,
    selectConversation, loadMessages, loadConversations, loadMoreMessages,
    addMessage, updateMessage, hasMore, hasMoreConversations, loadMoreConversations,
    updateSelectedConversation, updateConversationInList, selectedIds,
    toggleSelection, clearSelection, apiCounts, addConversationToList, markMessagesAsRead,
  } = useInboxConversations();

  const modals = useFacebookInboxModals();
  const capabilities = useInboxVerticalCapabilities();
  const { context: verticalContext, refetch: refetchVerticalContext } =
    useConversationVerticalContext(selectedConversation?.id);

  const layout = useFacebookInboxLayout({
    selectedConversation, selectConversation, showNotes: modals.showNotes, setShowNotes: modals.setShowNotes,
  });

  const inboxData = useFacebookInboxData({
    channel, companyId, conversations, selectedConversation, selectConversation,
    messages, loadConversations, addConversationToList, updateSelectedConversation, apiCounts, user,
  });

  const socketData = useFacebookInboxSocket({
    socket, isConnected, channel, selectedConversation, activeTab: inboxData.activeTab,
    addMessage, updateMessage, updateConversationInList, markMessagesAsRead,
    debouncedLoadConversations: inboxData.debouncedLoadConversations, loadMessages, userId: user?.id,
  });

  const actions = useFacebookInboxActions({
    channel, companyId, inboxPath, selectedConversation, selectConversation,
    activeTab: inboxData.activeTab, messages, addMessage, updateMessage, loadMessages, loadMoreMessages,
    hasMore, loadingMessages, loadConversations, debouncedSearchQuery: inboxData.debouncedSearchQuery,
    updateSelectedConversation, updateConversationInList, debouncedLoadConversations: inboxData.debouncedLoadConversations,
    clearConversationUrlParam: inboxData.clearConversationUrlParam, clearSelection, selectedIds,
    replyToMessage: modals.replyToMessage, setReplyToMessage: modals.setReplyToMessage,
    setShowTextGallery: modals.setShowTextGallery, setShowImageGallery: modals.setShowImageGallery,
    setShowProductPicker: modals.setShowProductPicker, setShowBlockModal: modals.setShowBlockModal,
    setBlockReason: modals.setBlockReason, blockReason: modals.blockReason,
    setIsBlocked: inboxData.setIsBlocked, setBlocking: inboxData.setBlocking,
    blocking: inboxData.blocking, filters: inboxData.filters, isConnected,
    setMessageToForward: modals.setMessageToForward, setForwardModalOpen: modals.setForwardModalOpen,
    setSnoozeModalOpen: modals.setSnoozeModalOpen, setComposerDraft: modals.setComposerDraft,
  });

  const selectedConversationAvatarUrl = getInboxCustomerAvatarUrl(
    selectedConversation?.customerId,
    selectedConversation?.customerAvatar,
  );

  const handleSelectConversationItem = useCallback(
    (conv: InboxConversation) => {
      selectConversation(conv);
      if (typeof window !== 'undefined' && window.innerWidth < 768) layout.setShowSidebar(false);
    },
    [selectConversation, layout],
  );

  const handleTriggerVerticalAction = useCallback(
    (actionId: InboxVerticalActionId) => {
      if (actionId === 'appointment' && capabilities.vertical === 'education') {
        modals.setShowEducationDemoDayModal(true);
        return;
      }
      const actionMap: Record<InboxVerticalActionId, (v: boolean) => void> = {
        dental_case: modals.setShowDentalCaseModal,
        appointment: modals.setShowAppointmentModal,
        service_order: modals.setShowServiceOrderModal,
        task: modals.setShowQuickTaskModal,
        order: modals.setShowQuickOrderModal,
      };
      actionMap[actionId]?.(true);
    },
    [
      capabilities.vertical,
      modals.setShowEducationDemoDayModal,
      modals.setShowDentalCaseModal, modals.setShowAppointmentModal,
      modals.setShowServiceOrderModal, modals.setShowQuickTaskModal, modals.setShowQuickOrderModal,
    ],
  );

  const enabledActions = useMemo(
    () => new Set(capabilities.availableActions.map((a) => a.id)),
    [capabilities.availableActions],
  );
  const hasOrderAction = enabledActions.has('order');
  const hasServiceOrderAction = enabledActions.has('service_order');
  const hasTaskAction = enabledActions.has('task');

  const handleResetFilters = useCallback(() => {
    inboxData.setFilters({
      unreadOnly: false, assignedTo: 'all', startDate: null, endDate: null, priorityOnly: false,
    });
  }, [inboxData.setFilters]);

  const handleCloseBlockModal = useCallback(() => {
    modals.setShowBlockModal(false);
    modals.setBlockReason('');
  }, [modals.setShowBlockModal, modals.setBlockReason]);

  const handleOrderCreated = useCallback(
    (_orderId: string, _order: any, confirmationMessage?: any) => {
      if (confirmationMessage && addMessage) addMessage(confirmationMessage);
      if (selectedConversation?.id && loadMessages) loadMessages(selectedConversation.id);
      refetchVerticalContext();
    },
    [addMessage, loadMessages, selectedConversation?.id, refetchVerticalContext],
  );

  return (
    <div
      className={`business-inbox-shell h-full w-full flex flex-col flex-1 min-h-0 overflow-hidden bg-card text-foreground${
        selectedConversation ? ' business-inbox-shell--conversation-active' : ''
      }`}
    >
      <FacebookInboxTabsBar
        hasSelectedConversation={Boolean(selectedConversation)}
        activeTab={inboxData.activeTab}
        onTabChange={inboxData.setActiveTab}
        counts={inboxData.tabCounts}
        onSearch={inboxData.setSearchQuery}
        onToggleFilters={() => modals.setShowFilters(!modals.showFilters)}
        onShowStats={() => modals.setShowStats(true)}
        filters={inboxData.filters}
        setFilters={inboxData.setFilters}
        priorityCount={inboxData.priorityCount}
        verticalBadge={{ label: capabilities.specialtyLabel, className: capabilities.badgeClassName }}
      />

      <div
        className="business-inbox-stage flex-1 h-full min-h-0 relative overflow-hidden flex flex-col md:flex-row"
        style={{ height: '100%', minHeight: 0, flex: '1 1 0%' }}
      >
        <FacebookConversationSidebar
          showSidebar={layout.showSidebar}
          selectedIds={selectedIds}
          clearSelection={clearSelection}
          onBulkMarkDone={actions.handleBulkMarkDone}
          onBulkAssign={() => alert(t('conversations.employeePickerComing'))}
          onBulkTags={() => alert(t('conversations.categoryPickerComing'))}
          showFilters={modals.showFilters}
          filters={inboxData.filters}
          setFilters={inboxData.setFilters}
          onCloseFilters={() => modals.setShowFilters(false)}
          onResetFilters={handleResetFilters}
          loading={loading}
          error={error}
          conversations={conversations}
          filteredConversations={inboxData.filteredConversations}
          selectedConversation={selectedConversation}
          toggleSelection={toggleSelection}
          onSelectConversation={handleSelectConversationItem}
          hasMoreConversations={hasMoreConversations}
          onLoadMoreConversations={loadMoreConversations}
        />

        <div
          className="business-inbox-column flex-1 h-full min-h-0 flex flex-col relative overflow-hidden"
          style={{ height: '100%', minHeight: 0, flex: '1 1 0%', display: 'flex', flexDirection: 'column' }}
        >
          {selectedConversation ? (
            <>
              <FacebookChatHeader
                selectedConversation={selectedConversation}
                selectedConversationAvatarUrl={selectedConversationAvatarUrl}
                onBackToConversationList={layout.handleBackToConversationList}
                isMobileViewport={layout.isMobileViewport}
                isWideDesktop={layout.isWideDesktop}
                shouldCollapseActions={layout.shouldCollapseActions}
                isAiActive={actions.isAiActive}
                isMasterAiDisabled={actions.isMasterAiDisabled}
                aiStatusReason={actions.aiStatusReason}
                onToggleAi={actions.handleToggleAi}
                isProfilePanelActive={layout.isProfilePanelActive}
                profilePanelToggleTitle={layout.profilePanelToggleTitle}
                onOpenProfilePanel={layout.handleOpenProfilePanel}
                showMobileActionMenu={layout.showMobileActionMenu}
                setShowMobileActionMenu={layout.setShowMobileActionMenu}
                showDesktopMoreMenu={layout.showDesktopMoreMenu}
                setShowDesktopMoreMenu={layout.setShowDesktopMoreMenu}
                copiedLink={actions.copiedLink}
                onCopyConversationLink={actions.handleCopyConversationLink}
                primaryAction={capabilities.primaryAction}
                availableActions={capabilities.availableActions}
                onTriggerVerticalAction={handleTriggerVerticalAction}
                onOpenQuickOrderModal={() => modals.setShowQuickOrderModal(true)}
                showNotes={modals.showNotes}
                onToggleNotesPanel={layout.handleToggleNotesPanel}
                onOpenSnoozeModal={() => modals.setSnoozeModalOpen(true)}
                onDeleteConversation={actions.handleDeleteConversation}
                onTogglePriority={actions.handleTogglePriority}
                onMarkDone={actions.handleMarkDone}
                updating={actions.updating}
              />

              <FacebookMessageStream
                messagesContainerRef={actions.messagesContainerRef}
                onScroll={actions.handleScroll}
                loadingMessages={loadingMessages}
                hasMore={hasMore}
                messages={messages}
                repliedMessages={actions.repliedMessages}
                messagesById={actions.messagesById}
                onDeleteMessage={actions.handleDeleteMessage}
                onForwardRequest={actions.handleForwardRequest}
                onStarMessage={actions.handleStarMessage}
                onMessageReaction={actions.handleMessageReaction}
                onReplyToMessage={actions.handleReplyToMessage}
                onScrollToMessage={actions.handleScrollToMessage}
                onReloadMessages={() => selectedConversation && loadMessages(selectedConversation.id)}
                userId={user?.id || ''}
                isAiActive={actions.isAiActive}
                isAiPaused={actions.isAiPaused}
                isMasterAiDisabled={actions.isMasterAiDisabled}
                onToggleAi={actions.handleToggleAi}
                onSendMessage={actions.handleSendMessage}
                onSendFile={actions.handleSendFile}
                onSendFiles={actions.handleSendFiles}
                onSendQuickReply={actions.handleSendQuickReply}
                sending={actions.sending}
                uploadingFile={actions.uploadingFile}
                selectedConversation={selectedConversation}
                user={user}
                replyToMessage={modals.replyToMessage}
                onCancelReply={actions.handleCancelReply}
                onOpenTextGallery={() => modals.setShowTextGallery(true)}
                onOpenImageGallery={() => modals.setShowImageGallery(true)}
                onOpenProductPicker={capabilities.showProductPicker ? () => modals.setShowProductPicker(true) : undefined}
                onOpenOrder={() => modals.setShowQuickOrderModal(true)}
                onOpenServiceOrder={hasServiceOrderAction ? () => modals.setShowServiceOrderModal(true) : undefined}
                onOpenTasks={hasTaskAction ? () => modals.setShowQuickTaskModal(true) : undefined}
                composerDraft={modals.composerDraft}
                setComposerDraft={modals.setComposerDraft}
                onRetryMessage={actions.handleRetryMessage}
              />
            </>
          ) : (
            <FacebookEmptyChatPlaceholder onShowSidebar={() => layout.setShowSidebar(true)} />
          )}
        </div>

        {selectedConversation && (
          <FacebookContextDrawer
            selectedConversation={selectedConversation}
            inboxPath={inboxPath}
            showPinnedContextPanel={layout.showPinnedContextPanel}
            showNotes={modals.showNotes}
            onCloseNotes={() => modals.setShowNotes(false)}
            showNotesOverlay={layout.showNotesOverlay}
            showProfileOverlay={layout.showProfileOverlay}
            onCloseProfilePanel={() => layout.setShowProfilePanel(false)}
            onTagsChange={actions.handleTagsChange}
            updatingTags={actions.updatingTags}
            onStatusChange={actions.handleStatusChange}
            onAssign={actions.handleAssignment}
            disabled={actions.updating}
            isBlocked={inboxData.isBlocked}
            checkingBlockStatus={inboxData.checkingBlockStatus}
            blocking={inboxData.blocking}
            showBlockModal={modals.showBlockModal}
            blockReason={modals.blockReason}
            onBlockClick={() => modals.setShowBlockModal(true)}
            onUnblockClick={actions.handleUnblockCustomer}
            onBlockReasonChange={modals.setBlockReason}
            onBlockConfirm={actions.handleBlockCustomer}
            onBlockCancel={handleCloseBlockModal}
            soundEnabled={socketData.soundEnabled}
            notificationsEnabled={socketData.notificationsEnabled}
            onSoundToggle={() => socketData.setSoundEnabled(!socketData.soundEnabled)}
            onNotificationsToggle={() => socketData.setNotificationsEnabled(!socketData.notificationsEnabled)}
            onCreateOrder={() => modals.setShowQuickOrderModal(true)}
            verticalCapabilities={capabilities}
            verticalContext={verticalContext}
            onPrimaryAction={() => handleTriggerVerticalAction(capabilities.primaryAction.id)}
            onOpenServiceOrder={hasServiceOrderAction ? () => modals.setShowServiceOrderModal(true) : undefined}
            onOpenTasks={hasTaskAction ? () => modals.setShowQuickTaskModal(true) : undefined}
            onInsertSnippet={modals.setComposerDraft}
          />
        )}
      </div>

      <FacebookInboxModalsContainer
        showStats={modals.showStats}
        onCloseStats={() => modals.setShowStats(false)}
        conversations={conversations}
        forwardModalOpen={modals.forwardModalOpen}
        onCloseForwardModal={() => modals.setForwardModalOpen(false)}
        onForward={actions.handleForward}
        snoozeModalOpen={modals.snoozeModalOpen}
        onCloseSnoozeModal={() => modals.setSnoozeModalOpen(false)}
        onSnooze={actions.handleSnoozeConfirm}
        showTextGallery={modals.showTextGallery}
        onCloseTextGallery={() => modals.setShowTextGallery(false)}
        onSelectTextFromGallery={actions.handleSelectTextFromGallery}
        setComposerDraft={modals.setComposerDraft}
        showImageGallery={modals.showImageGallery}
        onCloseImageGallery={() => modals.setShowImageGallery(false)}
        onSelectImageFromGallery={actions.handleSelectImageFromGallery}
        onSelectMultipleImagesFromGallery={actions.handleSelectMultipleImagesFromGallery}
        showProductPicker={modals.showProductPicker}
        onCloseProductPicker={() => modals.setShowProductPicker(false)}
        onSendProduct={actions.handleSendProductImages}
        showBlockModal={modals.showBlockModal}
        onCloseBlockModal={handleCloseBlockModal}
        selectedConversation={selectedConversation}
        blockReason={modals.blockReason}
        setBlockReason={modals.setBlockReason}
        handleBlockCustomer={actions.handleBlockCustomer}
        blocking={inboxData.blocking}
        isBlocked={inboxData.isBlocked}
        showQuickOrderModal={modals.showQuickOrderModal}
        onCloseQuickOrderModal={() => modals.setShowQuickOrderModal(false)}
        showServiceOrderModal={modals.showServiceOrderModal}
        onCloseServiceOrderModal={() => modals.setShowServiceOrderModal(false)}
        showQuickTaskModal={modals.showQuickTaskModal}
        onCloseQuickTaskModal={() => modals.setShowQuickTaskModal(false)}
        showDentalCaseModal={modals.showDentalCaseModal}
        onCloseDentalCaseModal={() => modals.setShowDentalCaseModal(false)}
        showAppointmentModal={modals.showAppointmentModal}
        onCloseAppointmentModal={() => modals.setShowAppointmentModal(false)}
        showEducationDemoDayModal={modals.showEducationDemoDayModal}
        onCloseEducationDemoDayModal={() => modals.setShowEducationDemoDayModal(false)}
        onInsertConfirmation={modals.setComposerDraft}
        onVerticalRecordCreated={refetchVerticalContext}
        platform={platform}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
};

export default FacebookInbox;
