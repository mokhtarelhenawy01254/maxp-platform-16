import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuthSimple';
import { useCompany } from '@/contexts/CompanyContext';
import useSocket from '@/hooks/useSocket';
import { useInboxConversations } from '@/hooks/inbox/useInboxConversations';
import { getInboxCustomerAvatarUrl } from '@/utils/imageUrl';
import type { InboxConversation } from '@/types/inbox.types';
import type { FacebookInboxProps } from './types/facebookInboxTypes';

// Modular Sub-components
import FacebookInboxTabsBar from './components/FacebookInboxTabsBar';
import FacebookConversationSidebar from './components/FacebookConversationSidebar';
import FacebookChatHeader from './components/FacebookChatHeader';
import FacebookMessageStream from './components/FacebookMessageStream';
import FacebookContextDrawer from './components/FacebookContextDrawer';
import FacebookEmptyChatPlaceholder from './components/FacebookEmptyChatPlaceholder';
import FacebookInboxModalsContainer from './components/FacebookInboxModalsContainer';

// Modular Custom Hooks
import useFacebookInboxData from './hooks/useFacebookInboxData';
import useFacebookInboxModals from './hooks/useFacebookInboxModals';
import useFacebookInboxLayout from './hooks/useFacebookInboxLayout';
import useFacebookInboxSocket from './hooks/useFacebookInboxSocket';
import useFacebookInboxActions from './hooks/useFacebookInboxActions';

export const FacebookInbox: React.FC<FacebookInboxProps> = ({
  channel = 'FACEBOOK',
  platform = 'facebook',
  inboxPath = '/facebook-inbox',
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { socket, isConnected } = useSocket();

  // Core inbox data provider hook
  const {
    conversations,
    selectedConversation,
    messages,
    loading,
    loadingMessages,
    error,
    selectConversation,
    loadMessages,
    loadConversations,
    loadMoreMessages,
    addMessage,
    updateMessage,
    hasMore,
    hasMoreConversations,
    loadMoreConversations,
    updateSelectedConversation,
    updateConversationInList,
    selectedIds,
    toggleSelection,
    clearSelection,
    apiCounts,
    addConversationToList,
    markMessagesAsRead,
  } = useInboxConversations();

  // Modals state
  const modals = useFacebookInboxModals();

  // Layout & Responsive state
  const layout = useFacebookInboxLayout({
    selectedConversation,
    selectConversation,
    showNotes: modals.showNotes,
    setShowNotes: modals.setShowNotes,
  });

  // Conversations, search, and filters data hook
  const inboxData = useFacebookInboxData({
    channel,
    companyId,
    conversations,
    selectedConversation,
    selectConversation,
    messages,
    loadConversations,
    addConversationToList,
    updateSelectedConversation,
    apiCounts,
    user,
  });

  // Real-time socket & notifications hook
  const socketData = useFacebookInboxSocket({
    socket,
    isConnected,
    channel,
    selectedConversation,
    activeTab: inboxData.activeTab,
    addMessage,
    updateMessage,
    updateConversationInList,
    markMessagesAsRead,
    debouncedLoadConversations: inboxData.debouncedLoadConversations,
    loadMessages,
    userId: user?.id,
  });

  // Actions & Message dispatch hook
  const actions = useFacebookInboxActions({
    channel,
    companyId,
    inboxPath,
    selectedConversation,
    selectConversation,
    activeTab: inboxData.activeTab,
    messages,
    addMessage,
    loadMessages,
    loadMoreMessages,
    hasMore,
    loadingMessages,
    loadConversations,
    debouncedSearchQuery: inboxData.debouncedSearchQuery,
    updateSelectedConversation,
    updateConversationInList,
    debouncedLoadConversations: inboxData.debouncedLoadConversations,
    clearConversationUrlParam: inboxData.clearConversationUrlParam,
    clearSelection,
    selectedIds,
    replyToMessage: modals.replyToMessage,
    setReplyToMessage: modals.setReplyToMessage,
    setShowTextGallery: modals.setShowTextGallery,
    setShowImageGallery: modals.setShowImageGallery,
    setShowProductPicker: modals.setShowProductPicker,
    setShowBlockModal: modals.setShowBlockModal,
    setBlockReason: modals.setBlockReason,
    blockReason: modals.blockReason,
    setIsBlocked: inboxData.setIsBlocked,
    setBlocking: inboxData.setBlocking,
    blocking: inboxData.blocking,
    filters: inboxData.filters,
    isConnected,
    setMessageToForward: modals.setMessageToForward,
    setForwardModalOpen: modals.setForwardModalOpen,
    setSnoozeModalOpen: modals.setSnoozeModalOpen,
    setComposerDraft: modals.setComposerDraft,
  });

  const selectedConversationAvatarUrl = getInboxCustomerAvatarUrl(
    selectedConversation?.customerId,
    selectedConversation?.customerAvatar,
  );

  const handleSelectConversationItem = useCallback(
    (conv: InboxConversation) => {
      selectConversation(conv);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        layout.setShowSidebar(false);
      }
    },
    [selectConversation, layout],
  );

  return (
    <div
      className={`business-inbox-shell h-full w-full flex flex-col flex-1 min-h-0 overflow-hidden${
        selectedConversation ? ' business-inbox-shell--conversation-active' : ''
      }`}
    >
      {/* Top Tabs Bar */}
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
      />

      <div
        className="business-inbox-stage flex-1 h-full min-h-0 relative overflow-hidden flex flex-col md:flex-row"
        style={{ height: '100%', minHeight: 0, flex: '1 1 0%' }}
      >
        {/* Left Column: Conversation List Sidebar */}
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
          onResetFilters={() =>
            inboxData.setFilters({
              unreadOnly: false,
              assignedTo: 'all',
              startDate: null,
              endDate: null,
              priorityOnly: false,
            })
          }
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

        {/* Center Column: Chat Viewport */}
        <div
          className="business-inbox-column flex-1 h-full min-h-0 flex flex-col relative overflow-hidden"
          style={{
            height: '100%',
            minHeight: 0,
            flex: '1 1 0%',
            display: 'flex',
            flexDirection: 'column',
          }}
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
                onReloadMessages={() =>
                  selectedConversation && loadMessages(selectedConversation.id)
                }
                userId={user?.id || ''}
                isAiActive={actions.isAiActive}
                isAiPaused={actions.isAiPaused}
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
                onOpenProductPicker={() => modals.setShowProductPicker(true)}
                composerDraft={modals.composerDraft}
                setComposerDraft={modals.setComposerDraft}
              />
            </>
          ) : (
            <FacebookEmptyChatPlaceholder
              onShowSidebar={() => layout.setShowSidebar(true)}
            />
          )}
        </div>

        {/* Right Column: Customer Profile & Notes Context Drawer */}
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
            onBlockCancel={() => {
              modals.setShowBlockModal(false);
              modals.setBlockReason('');
            }}
            soundEnabled={socketData.soundEnabled}
            notificationsEnabled={socketData.notificationsEnabled}
            onSoundToggle={() =>
              socketData.setSoundEnabled(!socketData.soundEnabled)
            }
            onNotificationsToggle={() =>
              socketData.setNotificationsEnabled(!socketData.notificationsEnabled)
            }
            onCreateOrder={() => modals.setShowQuickOrderModal(true)}
          />
        )}
      </div>

      {/* Global Modals Container */}
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
        onSelectMultipleImagesFromGallery={
          actions.handleSelectMultipleImagesFromGallery
        }
        showProductPicker={modals.showProductPicker}
        onCloseProductPicker={() => modals.setShowProductPicker(false)}
        onSendProduct={actions.handleSendProductImages}
        showBlockModal={modals.showBlockModal}
        onCloseBlockModal={() => {
          modals.setShowBlockModal(false);
          modals.setBlockReason('');
        }}
        selectedConversation={selectedConversation}
        blockReason={modals.blockReason}
        setBlockReason={modals.setBlockReason}
        handleBlockCustomer={actions.handleBlockCustomer}
        blocking={inboxData.blocking}
        isBlocked={inboxData.isBlocked}
        showQuickOrderModal={modals.showQuickOrderModal}
        onCloseQuickOrderModal={() => modals.setShowQuickOrderModal(false)}
        platform={platform}
        onOrderCreated={(_orderId, _order, confirmationMessage) => {
          if (confirmationMessage && addMessage) {
            addMessage(confirmationMessage);
          }
          if (selectedConversation?.id && loadMessages) {
            loadMessages(selectedConversation.id);
          }
        }}
      />
    </div>
  );
};

export default FacebookInbox;
