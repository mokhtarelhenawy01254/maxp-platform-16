import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import CreateGroupDialog from '@/components/whatsapp/CreateGroupDialog';
import GroupInfoDrawer from '@/components/whatsapp/GroupInfoDrawer';
import ProfileDialog from '@/components/whatsapp/ProfileDialog';
import CheckNumberDialog from '@/components/whatsapp/CheckNumberDialog';
import LabelsDialog from '@/components/whatsapp/LabelsDialog';
import BroadcastDialog from '@/components/whatsapp/BroadcastDialog';
import PrivacySettingsDialog from '@/components/whatsapp/PrivacySettingsDialog';
import BusinessProfileDialog from '@/components/whatsapp/BusinessProfileDialog';
import QuickOrderModal from '@/components/facebook-inbox/Modals/QuickOrderModal';
import QuickCreateTaskModal from '@/components/facebook-inbox/Modals/QuickCreateTaskModal';
import ProductImagePickerModal from '@/components/facebook-inbox/ProductImagePicker/ProductImagePickerModal';
import ImageGalleryModal from '@/components/facebook-inbox/ImageGallery/ImageGalleryModal';
import CreateServiceOrderModal from '@/components/facebook-inbox/Modals/CreateServiceOrderModal';
import InteractiveButtonsModal, { type InteractiveButtonInput } from '../InteractiveButtonsModal';
import type { Contact, Session } from '@/hooks/useWhatsAppQueries';
import type { ConfirmDialogState } from '../../chat/types/whatsappChatTypes';

interface ChatModalsContainerProps {
  confirmData: ConfirmDialogState;
  setConfirmData: React.Dispatch<React.SetStateAction<ConfirmDialogState>>;
  activeSessionId: string;
  selectedSession: string;
  sessions: Session[];
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  conversations: Contact[];
  currentUserProfile: { name: string; status: string; profilePicUrl: string } | null;
  // Modals state
  showContactInfo: boolean;
  setShowContactInfo: (open: boolean) => void;
  createGroupDialogOpen: boolean;
  setCreateGroupDialogOpen: (open: boolean) => void;
  profileDialogOpen: boolean;
  setProfileDialogOpen: (open: boolean) => void;
  checkNumberDialogOpen: boolean;
  setCheckNumberDialogOpen: (open: boolean) => void;
  showQuickOrderModal: boolean;
  setShowQuickOrderModal: (open: boolean) => void;
  showServiceOrderModal: boolean;
  setShowServiceOrderModal: (open: boolean) => void;
  showQuickCreateTaskModal: boolean;
  setShowQuickCreateTaskModal: (open: boolean) => void;
  showProductPicker: boolean;
  setShowProductPicker: (open: boolean) => void;
  showImageGallery: boolean;
  setShowImageGallery: (open: boolean) => void;
  interactiveDialogOpen: boolean;
  setInteractiveDialogOpen: (open: boolean) => void;
  labelDialogOpen: boolean;
  setLabelDialogOpen: (open: boolean) => void;
  selectedContactForLabel: Contact | null;
  setSelectedContactForLabel: (contact: Contact | null) => void;
  broadcastDialogOpen: boolean;
  setBroadcastDialogOpen: (open: boolean) => void;
  privacyDialogOpen: boolean;
  setPrivacyDialogOpen: (open: boolean) => void;
  businessProfileDialogOpen: boolean;
  setBusinessProfileDialogOpen: (open: boolean) => void;
  quickOrderContact: Contact | null;
  setQuickOrderContact: (contact: Contact | null) => void;
  selectedContactPhoneNumber: string | null;
  targetSessionId: string | null;
  getContactName: (contact: Contact) => string;
  getContactPhoneNumber: (contact: Contact) => string;
  onOrderCreated: (orderId: string) => void;
  onServiceOrderCreated: () => void;
  onSendProductImages: (images: any[]) => void;
  onSelectImageFromGallery: (image: any) => void;
  onSelectMultipleImagesFromGallery: (images: any[]) => void;
  onSendInteractive: (params: { text: string; footer?: string; buttons: InteractiveButtonInput[] }) => Promise<void>;
}

export const ChatModalsContainer: React.FC<ChatModalsContainerProps> = ({
  confirmData,
  setConfirmData,
  activeSessionId,
  selectedSession,
  sessions,
  selectedContact,
  setSelectedContact,
  conversations,
  currentUserProfile,
  showContactInfo,
  setShowContactInfo,
  createGroupDialogOpen,
  setCreateGroupDialogOpen,
  profileDialogOpen,
  setProfileDialogOpen,
  checkNumberDialogOpen,
  setCheckNumberDialogOpen,
  showQuickOrderModal,
  setShowQuickOrderModal,
  showServiceOrderModal,
  setShowServiceOrderModal,
  showQuickCreateTaskModal,
  setShowQuickCreateTaskModal,
  showProductPicker,
  setShowProductPicker,
  showImageGallery,
  setShowImageGallery,
  interactiveDialogOpen,
  setInteractiveDialogOpen,
  labelDialogOpen,
  setLabelDialogOpen,
  selectedContactForLabel,
  setSelectedContactForLabel,
  broadcastDialogOpen,
  setBroadcastDialogOpen,
  privacyDialogOpen,
  setPrivacyDialogOpen,
  businessProfileDialogOpen,
  setBusinessProfileDialogOpen,
  quickOrderContact,
  setQuickOrderContact,
  selectedContactPhoneNumber,
  targetSessionId,
  getContactName,
  getContactPhoneNumber,
  onOrderCreated,
  onServiceOrderCreated,
  onSendProductImages,
  onSelectImageFromGallery,
  onSelectMultipleImagesFromGallery,
  onSendInteractive,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const quickOrderCustomerName = quickOrderContact
    ? getContactName(quickOrderContact)
    : selectedContact
      ? getContactName(selectedContact)
      : undefined;

  const quickOrderCustomerPhone =
    (quickOrderContact
      ? getContactPhoneNumber(quickOrderContact)
      : selectedContactPhoneNumber) || undefined;

  const quickOrderPageName =
    selectedSession && selectedSession !== 'all'
      ? sessions.find((s) => s.id === selectedSession)?.name || 'WhatsApp'
      : 'WhatsApp';

  return (
    <>
      <ConfirmDialog
        open={confirmData.open}
        title={confirmData.title}
        content={confirmData.content}
        onConfirm={confirmData.onConfirm}
        onCancel={() => setConfirmData((prev) => ({ ...prev, open: false }))}
        confirmLabel={t('whatsapp.dialogs.confirm') as string}
        cancelLabel={t('whatsapp.dialogs.cancel') as string}
      />

      <GroupInfoDrawer
        open={showContactInfo && Boolean(selectedContact?.isGroup)}
        onClose={() => setShowContactInfo(false)}
        sessionId={selectedContact?.sessionId || selectedSession}
        groupJid={selectedContact?.jid || ''}
        contacts={conversations}
      />

      <CreateGroupDialog
        open={createGroupDialogOpen}
        onClose={() => setCreateGroupDialogOpen(false)}
        sessionId={activeSessionId}
        contacts={conversations}
        onGroupCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
        }}
      />

      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        sessionId={activeSessionId}
        currentName={currentUserProfile?.name || ''}
        currentStatus={currentUserProfile?.status || ''}
        currentPicture={currentUserProfile?.profilePicUrl || ''}
      />

      <CheckNumberDialog
        open={checkNumberDialogOpen}
        onClose={() => setCheckNumberDialogOpen(false)}
        sessionId={activeSessionId}
        sessions={sessions}
        onChatStart={(jid, selectedSessionId) => {
          const chatSessionId = selectedSessionId || activeSessionId;
          const existingContact = conversations.find((c) => c.jid === jid);
          if (existingContact) {
            setSelectedContact(existingContact);
          } else {
            queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
            const newContact: Contact = {
              id: jid,
              jid,
              sessionId: chatSessionId,
              phoneNumber: jid.replace(/@.*$/, '').replace(/[^\d]/g, ''),
              name: null,
              pushName: null,
              profilePicUrl: null,
              isGroup: false,
              category: null,
              unreadCount: 0,
              lastMessageAt: new Date().toISOString(),
              isArchived: false,
              isPinned: false,
              isMuted: false,
              isBlocked: false,
              session: { name: '', phoneNumber: '' },
              customer: null,
              isNewsletter: false,
              window: { isOpen: false, remainingSeconds: 0, remainingLabel: '', windowExpiresAt: null },
            };
            setSelectedContact(newContact);
          }
        }}
      />

      <QuickOrderModal
        isOpen={showQuickOrderModal}
        onClose={() => {
          setShowQuickOrderModal(false);
          setQuickOrderContact(null);
        }}
        customerName={quickOrderCustomerName}
        customerPhone={quickOrderCustomerPhone}
        conversationId={quickOrderContact?.id || selectedContact?.id}
        customerId={quickOrderContact?.customer?.id || quickOrderContact?.id || selectedContact?.id}
        platform="whatsapp"
        pageName={quickOrderPageName}
        onOrderCreated={onOrderCreated}
      />

      <CreateServiceOrderModal
        isOpen={showServiceOrderModal}
        onClose={() => setShowServiceOrderModal(false)}
        customerName={selectedContact ? getContactName(selectedContact) : undefined}
        customerPhone={selectedContactPhoneNumber || undefined}
        sessionId={targetSessionId || undefined}
        onOrderCreated={onServiceOrderCreated}
      />

      <QuickCreateTaskModal
        isOpen={showQuickCreateTaskModal}
        onClose={() => setShowQuickCreateTaskModal(false)}
      />

      <ProductImagePickerModal
        isOpen={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSendProduct={onSendProductImages}
      />

      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelectImage={onSelectImageFromGallery}
        onSelectMultipleImages={onSelectMultipleImagesFromGallery}
      />

      <InteractiveButtonsModal
        open={interactiveDialogOpen}
        onOpenChange={setInteractiveDialogOpen}
        onSend={onSendInteractive}
      />

      <LabelsDialog
        open={labelDialogOpen}
        onClose={() => {
          setLabelDialogOpen(false);
          setSelectedContactForLabel(null);
        }}
        sessionId={activeSessionId}
        contactJid={selectedContactForLabel?.jid}
        initialLabels={selectedContactForLabel?.labels || []}
        onLabelsUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp', 'conversations'] });
        }}
      />

      <BroadcastDialog
        open={broadcastDialogOpen}
        onClose={() => setBroadcastDialogOpen(false)}
        sessionId={activeSessionId}
        contacts={conversations}
      />

      <PrivacySettingsDialog
        open={privacyDialogOpen}
        onClose={() => setPrivacyDialogOpen(false)}
        sessionId={activeSessionId}
        contacts={conversations}
      />

      <BusinessProfileDialog
        open={businessProfileDialogOpen}
        onClose={() => setBusinessProfileDialogOpen(false)}
        sessionId={activeSessionId}
      />
    </>
  );
};

export default ChatModalsContainer;
