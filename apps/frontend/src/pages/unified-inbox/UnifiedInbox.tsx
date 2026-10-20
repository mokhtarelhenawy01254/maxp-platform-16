import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PostsManagement from '@/pages/comments/PostsManagement';

// Subcomponents
import { UnifiedInboxHeaderBar } from './components/UnifiedInboxHeaderBar';
import { UnifiedConversationSidebar } from './components/UnifiedConversationSidebar';
import { UnifiedChatHeader } from './components/UnifiedChatHeader';
import { UnifiedMessageStream } from './components/UnifiedMessageStream';
import { UnifiedMessageComposer } from './components/UnifiedMessageComposer';
import { UnifiedCustomerProfileDrawer } from './components/UnifiedCustomerProfileDrawer';
import { UnifiedEmptyChatPlaceholder } from './components/UnifiedEmptyChatPlaceholder';
import { UnifiedInboxModals } from './components/UnifiedInboxModals';

// Custom Hooks
import { useUnifiedInboxData } from './hooks/useUnifiedInboxData';
import { useUnifiedInboxMessages } from './hooks/useUnifiedInboxMessages';
import { useUnifiedInboxCustomerProfile } from './hooks/useUnifiedInboxCustomerProfile';
import { useUnifiedInboxActions } from './hooks/useUnifiedInboxActions';
import { useUnifiedInboxSocket } from './hooks/useUnifiedInboxSocket';

// Types
import type {
  UnifiedConversation,
  UnifiedMessage,
} from './types/unifiedInboxTypes';

export const UnifiedInbox: React.FC = () => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  // Selection & UI Drawer State
  const [selectedConversation, setSelectedConversation] =
    useState<UnifiedConversation | null>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(true);

  // Modals state
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const [showTextGallery, setShowTextGallery] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<UnifiedMessage | null>(
    null,
  );

  // Hook 1: Conversation list, filtering, search, pagination, bulk selection
  const {
    conversations,
    setConversations,
    loading,
    loadingMore,
    localSearchQuery,
    selectedPlatforms,
    setSelectedPlatforms,
    activeFilter,
    setActiveFilter,
    activeTab,
    setActiveTab,
    selectedConvIds,
    selectMode,
    setSelectMode,
    toggleSelectConv,
    clearSelection,
    handleConversationListScroll,
    handleRefresh,
    handleToggleConvStar,
    handleBulkUpdate,
    handleSearchChange,
  } = useUnifiedInboxData(selectedConversation, setSelectedConversation);

  // Hook 2: Message stream, sending, files, quick replies, AI correction
  const {
    messages,
    setMessages,
    loadingMessages,
    sending,
    sendError,
    setSendError,
    newMessage,
    setNewMessage,
    attachments,
    setAttachments,
    uploadingFile,
    replyToMsg,
    quickReplies,
    showQuickReplies,
    setShowQuickReplies,
    editingMessageId,
    setEditingMessageId,
    correctionText,
    setCorrectionText,
    savingCorrection,
    messagesEndRef,
    messagesContainerRef,
    loadMessages,
    loadQuickReplies,
    handleSendMessage,
    handleFileSelect,
    submitCorrection,
    handleMsgStar,
    handleMsgReact,
    handleMsgDelete,
    handleMsgReply,
    handleCancelReply,
    handleQuickReplySelect,
    scrollToBottom,
  } = useUnifiedInboxMessages(
    selectedConversation,
    setConversations,
    setSelectedConversation,
  );

  // Hook 3: Customer profile & notes
  const {
    customerProfile,
    setCustomerProfile,
    loadingProfile,
    profileActiveTab,
    setProfileActiveTab,
    editNote,
    setEditNote,
    noteText,
    setNoteText,
    loadCustomerProfile,
    handleSaveNote,
  } = useUnifiedInboxCustomerProfile(selectedConversation);

  // Hook 4: Conversation actions (status, assign, resolve, snooze, etc.)
  const {
    handleStatusChange,
    handleAssign,
    handleMarkResolved,
    handleMarkUnread,
    handleArchiveConversation,
    handleBlockCustomer,
    handleDeleteConversation,
    handleToggleAi,
    handleTogglePriority,
    handleCopyConversationLink,
    handleSnooze,
    handleForwardMessage,
  } = useUnifiedInboxActions(
    selectedConversation,
    setSelectedConversation,
    setConversations,
    handleToggleConvStar,
  );

  // Hook 5: Real-time Socket sync
  useUnifiedInboxSocket(
    selectedConversation,
    setSelectedConversation,
    setConversations,
    setMessages,
    scrollToBottom,
  );

  // Select conversation and load messages + profile
  const selectConversation = useCallback(
    (conv: UnifiedConversation) => {
      setSelectedConversation(conv);
      setSendError(null);
      loadMessages(conv);
      if (conv.contactId) {
        loadCustomerProfile(conv.contactId);
      } else {
        setCustomerProfile(null);
      }
    },
    [loadMessages, loadCustomerProfile, setCustomerProfile, setSendError],
  );

  // Hash-based navigation: browser back returns to conversation list
  useEffect(() => {
    if (!selectedConversation) {
      if (window.location.hash === '#chat') {
        window.history.back();
      }
      return;
    }
    window.location.hash = 'chat';
    const onHashChange = () => {
      if (window.location.hash !== '#chat' && selectedConversation) {
        setSelectedConversation(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [selectedConversation]);

  // App shell class toggling
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (selectedConversation) {
      document.body.classList.add('app-shell-chat-active');
    } else {
      document.body.classList.remove('app-shell-chat-active');
    }
    return () => {
      document.body.classList.remove('app-shell-chat-active');
    };
  }, [selectedConversation]);

  // Warn before closing if there's unsent message
  useEffect(() => {
    const hasUnsent = newMessage.trim().length > 0;
    if (!hasUnsent) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [newMessage]);

  const isCommentsActive =
    activeTab === 'fb-comments' || activeTab === 'ig-comments';

  return (
    <>
      <div
        className="flex flex-col h-full w-full bg-background"
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{ background: 'var(--color-background)' }}
      >
        {/* Top Header Bar */}
        <UnifiedInboxHeaderBar
          selectedPlatforms={selectedPlatforms}
          setSelectedPlatforms={setSelectedPlatforms}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRefresh={handleRefresh}
          loading={loading}
          selectMode={selectMode}
          setSelectMode={setSelectMode}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {isCommentsActive ? (
            <div className="absolute inset-0 overflow-hidden bg-slate-50 dark:bg-slate-900 p-2">
              <PostsManagement
                embedded
                defaultPlatform={
                  (activeTab === 'fb-comments' ? 'facebook' : 'instagram') as any
                }
              />
            </div>
          ) : (
            <div
              className={`business-inbox-shell w-full ${
                selectedConversation
                  ? 'business-inbox-shell--conversation-active'
                  : ''
              }`}
            >
              <div className="business-inbox-stage">
                {/* Column 1: Conversations Sidebar */}
                <UnifiedConversationSidebar
                  conversations={conversations}
                  selectedConversation={selectedConversation}
                  selectConversation={selectConversation}
                  loading={loading}
                  loadingMore={loadingMore}
                  localSearchQuery={localSearchQuery}
                  onSearchChange={handleSearchChange}
                  activeFilter={activeFilter}
                  setActiveFilter={setActiveFilter}
                  selectMode={selectMode}
                  selectedConvIds={selectedConvIds}
                  toggleSelectConv={toggleSelectConv}
                  clearSelection={clearSelection}
                  onBulkUpdate={handleBulkUpdate}
                  onToggleConvStar={handleToggleConvStar}
                  onScroll={handleConversationListScroll}
                />

                {/* Column 2: Chat Canvas */}
                <div className="business-inbox-column flex-1">
                  {selectedConversation ? (
                    <>
                      <UnifiedChatHeader
                        selectedConversation={selectedConversation}
                        onBackToList={() => setSelectedConversation(null)}
                        onToggleAi={handleToggleAi}
                        onOpenQuickOrder={() => setShowQuickOrder(true)}
                        showProfilePanel={showProfilePanel}
                        onToggleProfilePanel={() =>
                          setShowProfilePanel((prev) => !prev)
                        }
                        onMarkResolved={handleMarkResolved}
                        onTogglePriority={handleTogglePriority}
                        onCopyLink={handleCopyConversationLink}
                        onSnooze={handleSnooze}
                        onDeleteConversation={handleDeleteConversation}
                      />
                      <UnifiedMessageStream
                        messages={messages}
                        loadingMessages={loadingMessages}
                        messagesContainerRef={messagesContainerRef}
                        messagesEndRef={messagesEndRef}
                        onReplyMessage={handleMsgReply}
                        onReactMessage={handleMsgReact}
                        onStarMessage={handleMsgStar}
                        onForwardMessage={(msg) => {
                          setForwardMessage(msg);
                          setShowForwardModal(true);
                        }}
                        onDeleteMessage={handleMsgDelete}
                        editingMessageId={editingMessageId}
                        setEditingMessageId={setEditingMessageId}
                        correctionText={correctionText}
                        setCorrectionText={setCorrectionText}
                        submitCorrection={submitCorrection}
                        savingCorrection={savingCorrection}
                        sendError={sendError}
                        onDismissSendError={() => setSendError(null)}
                      />
                      <UnifiedMessageComposer
                        selectedConversation={selectedConversation}
                        newMessage={newMessage}
                        setNewMessage={setNewMessage}
                        attachments={attachments}
                        setAttachments={setAttachments}
                        replyToMsg={replyToMsg}
                        onCancelReply={handleCancelReply}
                        onSendMessage={handleSendMessage}
                        sending={sending}
                        uploadingFile={uploadingFile}
                        quickReplies={quickReplies}
                        showQuickReplies={showQuickReplies}
                        setShowQuickReplies={setShowQuickReplies}
                        onSelectQuickReply={handleQuickReplySelect}
                        onOpenTextGallery={() => setShowTextGallery(true)}
                        onOpenImageGallery={() => setShowImageGallery(true)}
                        onSelectFile={handleFileSelect}
                      />
                    </>
                  ) : (
                    <UnifiedEmptyChatPlaceholder />
                  )}
                </div>

                {/* Column 3: Customer Profile Drawer */}
                <UnifiedCustomerProfileDrawer
                  selectedConversation={selectedConversation}
                  showProfilePanel={showProfilePanel}
                  onClose={() => setShowProfilePanel(false)}
                  customerProfile={customerProfile}
                  loadingProfile={loadingProfile}
                  profileActiveTab={profileActiveTab}
                  setProfileActiveTab={setProfileActiveTab}
                  onStatusChange={handleStatusChange}
                  onAssign={handleAssign}
                  onMarkUnread={handleMarkUnread}
                  onArchiveConversation={handleArchiveConversation}
                  onBlockCustomer={handleBlockCustomer}
                  editNote={editNote}
                  setEditNote={setEditNote}
                  noteText={noteText}
                  setNoteText={setNoteText}
                  onSaveNote={handleSaveNote}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals Container */}
      <UnifiedInboxModals
        showQuickOrder={showQuickOrder}
        setShowQuickOrder={setShowQuickOrder}
        selectedConversation={selectedConversation}
        showTextGallery={showTextGallery}
        setShowTextGallery={setShowTextGallery}
        onTextGallerySelect={(text) => {
          setNewMessage((prev) => prev + text.content);
          setShowTextGallery(false);
        }}
        onLoadQuickReplies={loadQuickReplies}
        showImageGallery={showImageGallery}
        setShowImageGallery={setShowImageGallery}
        onImageGallerySelect={(imageUrl, filename) => {
          setAttachments((prev) => [
            ...prev,
            { url: imageUrl, name: filename, type: 'image' },
          ]);
          setShowImageGallery(false);
        }}
        onMultipleImagesSelect={(imgs) => {
          setAttachments((prev) => [
            ...prev,
            ...imgs.map((im) => ({
              url: im.url,
              name: im.filename,
              type: 'image',
            })),
          ]);
          setShowImageGallery(false);
        }}
        showForwardModal={showForwardModal}
        setShowForwardModal={setShowForwardModal}
        setForwardMessage={setForwardMessage}
        onForwardMessage={(targetConvId) =>
          handleForwardMessage(forwardMessage, targetConvId)
        }
        conversations={conversations}
      />
    </>
  );
};

export default UnifiedInbox;
