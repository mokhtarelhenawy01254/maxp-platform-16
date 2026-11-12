import React from 'react';
import { useTranslation } from 'react-i18next';
import { Ban, WifiOff } from 'lucide-react';
import StatsDashboard from '@/components/facebook-inbox/StatsDashboard/StatsDashboard';
import ForwardModal from '@/components/facebook-inbox/Modals/ForwardModal';
import SnoozeModal from '@/components/facebook-inbox/Modals/SnoozeModal';
import TextGalleryModal from '@/components/facebook-inbox/TextGallery/TextGalleryModal';
import ImageGalleryModal from '@/components/facebook-inbox/ImageGallery/ImageGalleryModal';
import ProductImagePickerModal from '@/components/facebook-inbox/ProductImagePicker/ProductImagePickerModal';
import QuickOrderModal from '@/components/facebook-inbox/Modals/QuickOrderModal';
import VerticalActionModals from './VerticalActionModals';
import type { InboxConversation } from '@/types/inbox.types';

interface FacebookInboxModalsContainerProps {
  showStats: boolean;
  onCloseStats: () => void;
  conversations: InboxConversation[];
  forwardModalOpen: boolean;
  onCloseForwardModal: () => void;
  onForward: (conversationId: string) => void;
  snoozeModalOpen: boolean;
  onCloseSnoozeModal: () => void;
  onSnooze: (until: Date) => void;
  showTextGallery: boolean;
  onCloseTextGallery: () => void;
  onSelectTextFromGallery: (text: { content: string; imageUrls?: string[] }) => void;
  setComposerDraft: (draft: string) => void;
  showImageGallery: boolean;
  onCloseImageGallery: () => void;
  onSelectImageFromGallery: (imageUrl: string, filename: string) => void;
  onSelectMultipleImagesFromGallery: (
    images: Array<{ url: string; filename: string }>,
  ) => void;
  showProductPicker: boolean;
  onCloseProductPicker: () => void;
  onSendProduct: (
    product: { id: string; name: string; price: number | string },
    images: Array<{ url: string; filename: string }>,
    includeDetails: boolean,
  ) => void;
  showBlockModal: boolean;
  onCloseBlockModal: () => void;
  selectedConversation: InboxConversation | null;
  blockReason: string;
  setBlockReason: (reason: string) => void;
  handleBlockCustomer: () => void;
  blocking: boolean;
  isBlocked: boolean;
  showQuickOrderModal: boolean;
  onCloseQuickOrderModal: () => void;
  showServiceOrderModal: boolean;
  onCloseServiceOrderModal: () => void;
  showQuickTaskModal: boolean;
  onCloseQuickTaskModal: () => void;
  showDentalCaseModal: boolean;
  onCloseDentalCaseModal: () => void;
  showAppointmentModal: boolean;
  onCloseAppointmentModal: () => void;
  onVerticalRecordCreated?: () => void;
  platform: string;
  onOrderCreated: (orderId: string, order: any, confirmationMessage?: any) => void;
}

export const FacebookInboxModalsContainer: React.FC<FacebookInboxModalsContainerProps> = ({
  showStats,
  onCloseStats,
  conversations,
  forwardModalOpen,
  onCloseForwardModal,
  onForward,
  snoozeModalOpen,
  onCloseSnoozeModal,
  onSnooze,
  showTextGallery,
  onCloseTextGallery,
  onSelectTextFromGallery,
  setComposerDraft,
  showImageGallery,
  onCloseImageGallery,
  onSelectImageFromGallery,
  onSelectMultipleImagesFromGallery,
  showProductPicker,
  onCloseProductPicker,
  onSendProduct,
  showBlockModal,
  onCloseBlockModal,
  selectedConversation,
  blockReason,
  setBlockReason,
  handleBlockCustomer,
  blocking,
  isBlocked,
  showQuickOrderModal,
  onCloseQuickOrderModal,
  showServiceOrderModal,
  onCloseServiceOrderModal,
  showQuickTaskModal,
  onCloseQuickTaskModal,
  showDentalCaseModal,
  onCloseDentalCaseModal,
  showAppointmentModal,
  onCloseAppointmentModal,
  onVerticalRecordCreated,
  platform,
  onOrderCreated,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <StatsDashboard
        isOpen={showStats}
        onClose={onCloseStats}
        conversations={conversations}
      />

      <ForwardModal
        isOpen={forwardModalOpen}
        onClose={onCloseForwardModal}
        onForward={onForward}
        conversations={conversations}
      />

      <SnoozeModal
        isOpen={snoozeModalOpen}
        onClose={onCloseSnoozeModal}
        onSnooze={onSnooze}
      />

      <TextGalleryModal
        isOpen={showTextGallery}
        onClose={onCloseTextGallery}
        onSelectText={onSelectTextFromGallery}
        onInsertText={(content) => {
          setComposerDraft(content);
          onCloseTextGallery();
        }}
      />

      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={onCloseImageGallery}
        onSelectImage={onSelectImageFromGallery}
        onSelectMultipleImages={onSelectMultipleImagesFromGallery}
      />

      <ProductImagePickerModal
        isOpen={showProductPicker}
        onClose={onCloseProductPicker}
        onSendProduct={onSendProduct}
      />

      {/* Block Customer Modal */}
      {showBlockModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border/60 text-foreground p-6 w-full max-w-md rounded-2xl shadow-2xl">
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              {t('facebookInbox.blockOnFacebook')}
            </h3>
            <p className="text-sm mb-4 text-muted-foreground">
              {t('facebookInbox.blockOnFacebookDesc')}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-foreground">
                {t('facebookInbox.blockReason')}
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border/60 bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                rows={3}
                placeholder={t('facebookInbox.blockReasonPlaceholder')}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCloseBlockModal}
                className="px-4 py-2 rounded-xl text-sm border border-border/60 bg-muted/40 text-foreground hover:bg-muted transition-colors active:scale-[0.97]"
              >
                {t('facebookInbox.cancel')}
              </button>
              <button
                type="button"
                onClick={handleBlockCustomer}
                disabled={blocking}
                className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-destructive text-destructive-foreground shadow-sm active:scale-[0.97]"
              >
                {blocking
                  ? t('facebookInbox.blocking')
                  : t('facebookInbox.confirmBlock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Customer Alert */}
      {isBlocked && selectedConversation && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 shadow-lg max-w-md flex items-center gap-3 text-destructive backdrop-blur-sm">
          <Ban className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            {t('facebookInbox.customerBlocked')}
          </p>
        </div>
      )}

      {/* Quick Order Modal */}
      {selectedConversation && (
        <QuickOrderModal
          isOpen={showQuickOrderModal}
          onClose={onCloseQuickOrderModal}
          conversation={selectedConversation}
          customerName={selectedConversation.customerName}
          customerPhone={selectedConversation.customerPhone}
          conversationId={selectedConversation.id}
          customerId={selectedConversation.customerId}
          platform={platform}
          pageName={selectedConversation.pageName || 'Facebook'}
          onOrderCreated={onOrderCreated}
        />
      )}

      {/* Vertical Action Modals (Services, Tasks, Appointments, Dental Lab) */}
      <VerticalActionModals
        selectedConversation={selectedConversation}
        showServiceOrderModal={showServiceOrderModal}
        onCloseServiceOrderModal={onCloseServiceOrderModal}
        showQuickTaskModal={showQuickTaskModal}
        onCloseQuickTaskModal={onCloseQuickTaskModal}
        showDentalCaseModal={showDentalCaseModal}
        onCloseDentalCaseModal={onCloseDentalCaseModal}
        showAppointmentModal={showAppointmentModal}
        onCloseAppointmentModal={onCloseAppointmentModal}
        onVerticalRecordCreated={onVerticalRecordCreated}
      />

      {/* Offline Alert */}
      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <div className="fixed bottom-4 right-4 z-50 px-3.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-lg text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
          <WifiOff className="h-3.5 w-3.5 stroke-[2]" />
          <span>{t('facebookInbox.disconnected', 'لا يوجد اتصال بالإنترنت')}</span>
        </div>
      )}
    </>
  );
};

export default FacebookInboxModalsContainer;
