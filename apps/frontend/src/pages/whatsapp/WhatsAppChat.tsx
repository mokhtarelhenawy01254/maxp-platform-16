import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuthSimple';
import useSocket from '@/hooks/useSocket';
import type { Contact } from '@/hooks/useWhatsAppQueries';
import { useMarkAsRead } from '@/hooks/useWhatsAppMutations';

import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatRightPanel from './components/ChatRightPanel';
import { ChatPollDialog } from './components/dialogs/ChatPollDialog';
import { ChatButtonsDialog } from './components/dialogs/ChatButtonsDialog';
import { ChatListDialog } from './components/dialogs/ChatListDialog';
import { ChatCatalogDialog } from './components/dialogs/ChatCatalogDialog';
import { ChatLocationDialog } from './components/dialogs/ChatLocationDialog';
import { ChatTemplateDialog } from './components/dialogs/ChatTemplateDialog';
import { ChatStatusDialog } from './components/dialogs/ChatStatusDialog';
import { ChatMessageContextMenu } from './components/dialogs/ChatMessageContextMenu';
import { ChatForwardDialog } from './components/dialogs/ChatForwardDialog';
import { ChatReactionPickerDialog } from './components/dialogs/ChatReactionPickerDialog';
import { ContactInfoSheet } from './components/dialogs/ContactInfoSheet';
import { ChatStarredMessagesSheet } from './components/dialogs/ChatStarredMessagesSheet';
import { ChatModalsContainer } from './components/dialogs/ChatModalsContainer';

import { useWhatsAppChatData } from './hooks/useWhatsAppChatData';
import { useWhatsAppChatSocket } from './hooks/useWhatsAppChatSocket';
import { useWhatsAppChatNavigation } from './hooks/useWhatsAppChatNavigation';
import { useWhatsAppChatActions } from './hooks/useWhatsAppChatActions';
import { useWhatsAppChatDialogs } from './hooks/useWhatsAppChatDialogs';
import {
  getBestContactDisplayName,
  getContactPhoneNumber,
} from './whatsappContactDisplay';

const WhatsAppChatContent: React.FC = () => {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const markAsReadMutation = useMarkAsRead();
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modular Hooks
  const chatData = useWhatsAppChatData();
  const dialogs = useWhatsAppChatDialogs();

  const normalizeContactJid = useCallback((jid: string) => {
    if (!jid) return '';
    const parts = jid.split('@')[0];
    const bareJid = parts?.split(':')[0] || '';
    return bareJid.replace(/\D/g, '');
  }, []);

  const getContactName = useCallback((contact: Contact) => {
    return getBestContactDisplayName(contact);
  }, []);

  const getParticipantName = useCallback((participantJid: string) => {
    return participantJid ? normalizeContactJid(participantJid) : '';
  }, [normalizeContactJid]);

  // Actions Hook
  const chatActions = useWhatsAppChatActions({
    selectedContact: chatData.selectedContact,
    setSelectedContact: chatData.setSelectedContact,
    selectedSession: chatData.selectedSession,
    activeSessionId: chatData.activeSessionId,
    targetSessionId: chatData.targetSessionId,
    user,
    visibleMessages: chatData.visibleMessages,
    newMessage,
    setNewMessage,
    replyingTo: dialogs.replyingTo,
    setReplyingTo: dialogs.setReplyingTo,
    fileInputRef,
    setOrdersRefreshToken: dialogs.setOrdersRefreshToken,
    setShowImageGallery: dialogs.setShowImageGallery,
  });

  // Socket Hook
  useWhatsAppChatSocket({
    socket,
    selectedContact: chatData.selectedContact,
    setSelectedContact: chatData.setSelectedContact,
    selectedSession: chatData.selectedSession,
    setSelectedSession: chatData.setSelectedSession,
    conversations: chatData.conversations,
    normalizeContactJid,
    setTypingUsers,
    markAsReadMutation,
  });

  // Automatically mark conversation as read when opened/selected
  useEffect(() => {
    if (!chatData.selectedContact) return;
    const contact = chatData.selectedContact;
    const targetSessionId =
      contact.sessionId ||
      (chatData.selectedSession === 'all' ? null : chatData.selectedSession) ||
      chatData.activeSessionId;

    if (!targetSessionId || !contact.jid) return;

    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
      markAsReadTimeoutRef.current = null;
    }

    markAsReadTimeoutRef.current = setTimeout(() => {
      markAsReadMutation.mutate({
        sessionId: targetSessionId,
        remoteJid: contact.jid,
      });

      if ((contact.unreadCount || 0) > 0) {
        chatData.setSelectedContact((prev) =>
          prev && prev.jid === contact.jid ? { ...prev, unreadCount: 0 } : prev,
        );
      }
    }, 200);

    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
    };
  }, [
    chatData.selectedContact?.jid,
    chatData.selectedContact?.sessionId,
    chatData.selectedSession,
    chatData.activeSessionId,
    markAsReadMutation,
  ]);

  // Navigation Hook
  const chatNav = useWhatsAppChatNavigation({
    selectedContact: chatData.selectedContact,
    setSelectedContact: chatData.setSelectedContact,
    selectedSession: chatData.selectedSession,
    setSelectedSession: chatData.setSelectedSession,
    loadingSessions: chatData.loadingSessions,
    conversations: chatData.conversations,
    setNewMessage,
    normalizeContactJid,
  });

  if (authLoading || chatData.loadingSessions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--app-canvas)]">
        <Loader2 className="size-6 animate-spin text-[color:var(--color-primary)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const selectedContactPhoneNumber = chatData.selectedContact
    ? getContactPhoneNumber(chatData.selectedContact)
    : null;

  return (
    <div
      className={cn(
        'whatsapp-workspace-root whatsapp-theme-transition flex h-full min-h-0 flex-col overflow-hidden',
        chatData.selectedContact && 'whatsapp-workspace--chat-active',
      )}
      data-chat-active={chatData.selectedContact ? 'true' : 'false'}
    >
      <h1 className="sr-only">لوحة تشغيل واتساب</h1>
      <div className="whatsapp-theme-transition flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row border-none rounded-none shadow-none bg-[color:var(--color-card)]">
        <ChatSidebar
          className={cn(
            'wa-panel-sidebar ltr:lg:order-1 rtl:lg:order-1',
            chatData.selectedContact && 'max-lg:hidden',
          )}
          sessions={chatData.sessions}
          conversations={chatData.conversations}
          statuses={[]}
          selectedSession={chatData.selectedSession}
          selectedContact={chatData.selectedContact}
          currentUserProfile={chatData.currentUserProfile}
          isLoadingConversations={chatData.loadingConversations}
          isLoadingMoreConversations={chatData.isLoadingMoreConversations}
          hasMoreConversations={chatData.hasMoreConversations}
          isLoadingStatuses={false}
          onSelectSession={chatData.setSelectedSession}
          onSelectContact={chatNav.selectContactWithTransition}
          onOpenProfile={() => dialogs.setProfileDialogOpen(true)}
          onOpenNewChat={() => dialogs.setCheckNumberDialogOpen(true)}
          onOpenNewGroup={() => dialogs.setCreateGroupDialogOpen(true)}
          onOpenPrivacySettings={() => dialogs.setPrivacyDialogOpen(true)}
          onOpenBusinessProfile={() => dialogs.setBusinessProfileDialogOpen(true)}
          onSyncHistory={chatActions.handleSyncHistory}
          isSyncingHistory={chatActions.isSyncingHistory}
          onPinChat={chatActions.handlePinChat}
          onArchiveChat={chatActions.handleArchiveChat}
          onDeleteChat={chatActions.handleDeleteChat}
          onBlockContact={chatActions.handleBlockContact}
          onMuteChat={chatActions.handleMuteChat}
          onMarkAsRead={chatActions.handleMarkUnread}
          onLoadMore={chatData.fetchNextConversationsPage}
          conversationsError={chatData.conversationsError}
          onRetryConversations={() => chatData.refetchConversations()}
          onAddStatus={() => dialogs.setStatusDialogOpen(true)}
          onOpenBroadcast={() => dialogs.setBroadcastDialogOpen(true)}
          onOpenCheckNumber={() => dialogs.setCheckNumberDialogOpen(true)}
          onOpenLabels={() => {
            dialogs.setSelectedContactForLabel(null);
            dialogs.setLabelDialogOpen(true);
          }}
          onBulkDelete={chatActions.handleBulkDeleteChats}
          onDeleteAll={chatActions.handleDeleteAllChats}
          labels={chatData.labels}
          filterType={chatData.chatFilter}
          onFilterTypeChange={chatData.setChatFilter}
          searchTerm={chatData.searchTerm}
          onSearchChange={chatData.setSearchTerm}
          showArchived={chatData.showArchived}
          onToggleArchived={(archived) => chatData.setShowArchived(archived)}
          counts={chatData.conversationCounts}
        />

        <div className="relative flex h-full min-h-0 flex-1 overflow-hidden ltr:lg:order-2 rtl:lg:order-2">
          <ChatWindow
            showRightPanel={dialogs.showRightPanel}
            onToggleRightPanel={() => dialogs.setShowRightPanel((prev) => !prev)}
            className={cn(
              'wa-panel-chat',
              !chatData.selectedContact && 'max-lg:hidden',
              dialogs.showRightPanel && 'max-lg:hidden',
            )}
            selectedContact={chatData.selectedContact}
            messages={chatData.visibleMessages}
            loadingMessages={chatData.loadingMessages}
            onToggleAi={chatActions.handleToggleAi}
            virtualItems={chatData.messagesVirtualizer.getVirtualItems()}
            totalHeight={chatData.messagesVirtualizer.getTotalSize()}
            measureElement={chatData.messagesVirtualizer.measureElement}
            messagesContainerRef={chatData.messagesContainerRef}
            typingUsers={typingUsers}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            showEmojiPicker={dialogs.showEmojiPicker}
            setShowEmojiPicker={dialogs.setShowEmojiPicker}
            replyingTo={dialogs.replyingTo}
            setReplyingTo={dialogs.setReplyingTo}
            isRecording={dialogs.isRecording}
            setIsRecording={dialogs.setIsRecording}
            isSendingMessage={chatActions.sendMessageMutation.isPending}
            user={user}
            onSendFile={chatActions.handleSendFileDirect}
            onSendMessageText={chatActions.handleSendMessage}
            onSendMessage={chatActions.handleSendMessage}
            onFileUpload={chatActions.handleFileUpload}
            onVoiceNoteSend={async (blob) => {
              await chatActions.handleSendFileDirect(new File([blob], 'voice_note.webm', { type: 'audio/webm' }));
            }}
            onOpenContactInfo={() => dialogs.setShowContactInfo(true)}
            onMessageContextMenu={chatActions.handleMessageContextMenu}
            getContactName={getContactName}
            getParticipantName={getParticipantName}
            onOpenPoll={() => dialogs.setPollDialogOpen(true)}
            onOpenButtons={() => dialogs.setButtonsDialogOpen(true)}
            onOpenList={() => dialogs.setListDialogOpen(true)}
            onOpenCatalog={() => {
              void chatData.loadProducts();
              dialogs.setCatalogDialogOpen(true);
            }}
            onOpenLocation={() => dialogs.setLocationDialogOpen(true)}
            onOpenOrder={() => dialogs.setShowQuickOrderModal(true)}
            onOpenServiceOrder={() => dialogs.setShowServiceOrderModal(true)}
            onOpenTasks={() => dialogs.setShowQuickCreateTaskModal(true)}
            onOpenTemplate={() => void chatData.handleOpenTemplateDialog().then(() => dialogs.setTemplateDialogOpen(true))}
            onOpenProducts={() => dialogs.setShowProductPicker(true)}
            onOpenImageGallery={() => dialogs.setShowImageGallery(true)}
            onBackToList={() => {
              if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
                document.startViewTransition(() => chatData.setSelectedContact(null));
              } else {
                chatData.setSelectedContact(null);
              }
            }}
            onTouchStart={chatNav.handleChatTouchStart}
            onTouchEnd={chatNav.handleChatTouchEnd}
            fileInputRef={fileInputRef}
            isUploadingMedia={chatActions.sendMediaMutation.isPending || chatActions.isDirectUploading}
            messagesError={chatData.messagesError}
            onRetryMessages={() => chatData.refetchMessages()}
            onOpenInteractive={() => dialogs.setInteractiveDialogOpen(true)}
            pinnedMessage={chatData.currentPinnedMessage}
            onScrollToPinnedMessage={() => {
              if (chatData.currentPinnedMessage) {
                chatData.handleScrollToMessage(chatData.currentPinnedMessage.messageId);
              }
            }}
            onUnpinMessage={(messageId) => void chatActions.handleUnpinMessage(messageId)}
            highlightedMessageId={chatData.highlightedMessageId}
            onQuotedMessageClick={chatData.handleScrollToMessage}
            onSendReaction={chatActions.handleSendReaction}
          />

          {chatData.selectedContact && dialogs.showRightPanel && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 max-lg:block lg:hidden"
                onClick={() => dialogs.setShowRightPanel(false)}
              />
              <div className="chat-right-panel-container">
                <ChatRightPanel
                  key={chatData.selectedContact.id || chatData.selectedContact.jid}
                  contact={chatData.selectedContact}
                  labels={chatData.labels}
                  refreshToken={dialogs.ordersRefreshToken}
                  onOpenOrder={() => dialogs.setShowQuickOrderModal(true)}
                  onOpenServiceOrder={() => dialogs.setShowServiceOrderModal(true)}
                  onOpenTasks={() => dialogs.setShowQuickCreateTaskModal(true)}
                  onClose={() => dialogs.setShowRightPanel(false)}
                  onOpenLabels={() => {
                    dialogs.setSelectedContactForLabel(chatData.selectedContact);
                    dialogs.setLabelDialogOpen(true);
                  }}
                  onContactUpdated={(updatedContact) => {
                    chatData.setSelectedContact(updatedContact);
                    queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
                    queryClient.invalidateQueries({ queryKey: ['whatsapp', 'contacts'] });
                    queryClient.invalidateQueries({ queryKey: ['whatsapp', 'messages'] });
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ChatMessageContextMenu
        position={chatActions.messageContextMenu}
        selectedMessage={chatActions.selectedMessageForMenu}
        onClose={() => {
          chatActions.setMessageContextMenu(null);
          chatActions.setSelectedMessageForMenu(null);
        }}
        onSendReaction={chatActions.handleSendReaction}
        onOpenReactionPicker={(messageId) => dialogs.setShowReactionPicker(messageId)}
        onReply={chatActions.handleReply}
        onCopy={chatActions.handleCopy}
        onForward={() => dialogs.setForwardDialogOpen(true)}
        onStarMessage={chatActions.handleStarMessage}
        onPinMessage={chatActions.handlePinMessage}
        onUnpinMessage={chatActions.handleUnpinMessage}
        onDeleteMessage={chatActions.handleDeleteMessage}
      />

      <ChatForwardDialog
        open={dialogs.forwardDialogOpen}
        onOpenChange={dialogs.setForwardDialogOpen}
        conversations={chatData.conversations}
        getContactName={getContactName}
        onForward={chatActions.handleForwardMessage}
      />

      <ChatReactionPickerDialog
        messageId={dialogs.showReactionPicker}
        onClose={() => dialogs.setShowReactionPicker(null)}
        onSelectEmoji={chatActions.handleSendReaction}
      />

      <ChatPollDialog
        open={dialogs.pollDialogOpen}
        onOpenChange={dialogs.setPollDialogOpen}
        onSendPoll={chatActions.handleSendPoll}
      />

      <ChatButtonsDialog
        open={dialogs.buttonsDialogOpen}
        onOpenChange={dialogs.setButtonsDialogOpen}
        onSendButtons={chatActions.handleSendButtons}
      />

      <ChatListDialog
        open={dialogs.listDialogOpen}
        onOpenChange={dialogs.setListDialogOpen}
        onSendList={chatActions.handleSendList}
      />

      <ChatCatalogDialog
        open={dialogs.catalogDialogOpen}
        onOpenChange={dialogs.setCatalogDialogOpen}
        products={chatData.products}
        onSendProduct={chatActions.handleSendProduct}
      />

      <ChatLocationDialog
        open={dialogs.locationDialogOpen}
        onOpenChange={dialogs.setLocationDialogOpen}
        onSendLocation={chatActions.handleSendLocation}
      />

      <ChatTemplateDialog
        open={dialogs.templateDialogOpen}
        onOpenChange={dialogs.setTemplateDialogOpen}
        templates={chatData.templates}
        loadingTemplates={chatData.loadingTemplates}
        onSendTemplate={chatActions.handleSendTemplate}
      />

      <ChatStatusDialog
        open={dialogs.statusDialogOpen}
        onOpenChange={dialogs.setStatusDialogOpen}
        onPostStatus={chatActions.handlePostStatusAction}
        isPosting={chatActions.postingStatus}
      />

      <ContactInfoSheet
        open={dialogs.showContactInfo && Boolean(!chatData.selectedContact?.isGroup)}
        onOpenChange={dialogs.setShowContactInfo}
        contact={chatData.selectedContact}
        onLoadStarredMessages={chatData.loadStarredMessages}
        onMuteChat={chatActions.handleMuteChat}
        onClearChat={chatActions.handleClearChat}
        onDeleteChat={chatActions.handleDeleteChat}
        onBlockContact={chatActions.handleBlockContact}
        onUnblockContact={chatActions.handleUnblockContact}
      />

      <ChatStarredMessagesSheet
        open={chatData.starredMessagesOpen}
        onOpenChange={chatData.setStarredMessagesOpen}
        messages={chatData.starredMessages}
      />

      <ChatModalsContainer
        confirmData={chatActions.confirmData}
        setConfirmData={chatActions.setConfirmData}
        activeSessionId={chatData.activeSessionId}
        selectedSession={chatData.selectedSession}
        sessions={chatData.sessions}
        selectedContact={chatData.selectedContact}
        setSelectedContact={chatData.setSelectedContact}
        conversations={chatData.conversations}
        currentUserProfile={chatData.currentUserProfile}
        showContactInfo={dialogs.showContactInfo}
        setShowContactInfo={dialogs.setShowContactInfo}
        createGroupDialogOpen={dialogs.createGroupDialogOpen}
        setCreateGroupDialogOpen={dialogs.setCreateGroupDialogOpen}
        profileDialogOpen={dialogs.profileDialogOpen}
        setProfileDialogOpen={dialogs.setProfileDialogOpen}
        checkNumberDialogOpen={dialogs.checkNumberDialogOpen}
        setCheckNumberDialogOpen={dialogs.setCheckNumberDialogOpen}
        showQuickOrderModal={dialogs.showQuickOrderModal}
        setShowQuickOrderModal={dialogs.setShowQuickOrderModal}
        showServiceOrderModal={dialogs.showServiceOrderModal}
        setShowServiceOrderModal={dialogs.setShowServiceOrderModal}
        showQuickCreateTaskModal={dialogs.showQuickCreateTaskModal}
        setShowQuickCreateTaskModal={dialogs.setShowQuickCreateTaskModal}
        showProductPicker={dialogs.showProductPicker}
        setShowProductPicker={dialogs.setShowProductPicker}
        showImageGallery={dialogs.showImageGallery}
        setShowImageGallery={dialogs.setShowImageGallery}
        interactiveDialogOpen={dialogs.interactiveDialogOpen}
        setInteractiveDialogOpen={dialogs.setInteractiveDialogOpen}
        labelDialogOpen={dialogs.labelDialogOpen}
        setLabelDialogOpen={dialogs.setLabelDialogOpen}
        selectedContactForLabel={dialogs.selectedContactForLabel}
        setSelectedContactForLabel={dialogs.setSelectedContactForLabel}
        broadcastDialogOpen={dialogs.broadcastDialogOpen}
        setBroadcastDialogOpen={dialogs.setBroadcastDialogOpen}
        privacyDialogOpen={dialogs.privacyDialogOpen}
        setPrivacyDialogOpen={dialogs.setPrivacyDialogOpen}
        businessProfileDialogOpen={dialogs.businessProfileDialogOpen}
        setBusinessProfileDialogOpen={dialogs.setBusinessProfileDialogOpen}
        quickOrderContact={dialogs.quickOrderContact}
        setQuickOrderContact={dialogs.setQuickOrderContact}
        selectedContactPhoneNumber={selectedContactPhoneNumber}
        targetSessionId={chatData.targetSessionId}
        getContactName={getContactName}
        getContactPhoneNumber={getContactPhoneNumber}
        onOrderCreated={(orderId) => {
          toast.success(t('whatsapp.dialogs.orderCreated', { orderId }));
          dialogs.setOrdersRefreshToken((prev) => prev + 1);
        }}
        onServiceOrderCreated={() => {
          dialogs.setOrdersRefreshToken((prev) => prev + 1);
        }}
        onSendProductImages={chatActions.handleSendProductImages}
        onSelectImageFromGallery={chatActions.handleSelectImageFromGallery}
        onSelectMultipleImagesFromGallery={chatActions.handleSelectMultipleImagesFromGallery}
        onSendInteractive={chatActions.handleSendInteractive}
      />
    </div>
  );
};

const WhatsAppChat: React.FC = () => <WhatsAppChatContent />;

export default WhatsAppChat;
export { WhatsAppChat };
