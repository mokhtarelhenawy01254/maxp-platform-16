import React from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { NoSymbolIcon } from '@heroicons/react/24/outline';
import StatsDashboard from '@/components/facebook-inbox/StatsDashboard/StatsDashboard';
import ForwardModal from '@/components/facebook-inbox/Modals/ForwardModal';
import SnoozeModal from '@/components/facebook-inbox/Modals/SnoozeModal';
import TextGalleryModal from '@/components/facebook-inbox/TextGallery/TextGalleryModal';
import ImageGalleryModal from '@/components/facebook-inbox/ImageGallery/ImageGalleryModal';
import ProductImagePickerModal from '@/components/facebook-inbox/ProductImagePicker/ProductImagePickerModal';
import QuickOrderModal from '@/components/facebook-inbox/Modals/QuickOrderModal';
import type { InboxConversation, InboxMessage } from '@/types/inbox.types';

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
          <div className="business-modal-surface p-6 w-full max-w-md rounded-2xl shadow-2xl">
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('facebookInbox.blockOnFacebook')}
            </h3>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              {t('facebookInbox.blockOnFacebookDesc')}
            </p>

            <div className="mb-4">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-foreground)' }}
              >
                {t('facebookInbox.blockReason')}
              </label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="business-chat-input w-full p-2.5 rounded-xl border text-sm"
                rows={3}
                placeholder={t('facebookInbox.blockReasonPlaceholder')}
              />
            </div>

            <div className="flex justify-end space-x-2 rtl:space-x-reverse">
              <button
                type="button"
                onClick={onCloseBlockModal}
                className="business-chip-button px-4 py-2 rounded-xl text-sm"
              >
                {t('facebookInbox.cancel')}
              </button>
              <button
                type="button"
                onClick={handleBlockCustomer}
                disabled={blocking}
                className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm"
                style={{
                  background: 'var(--business-danger)',
                }}
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
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 rounded-xl p-4 shadow-lg max-w-md business-page-panel flex items-center gap-3"
          style={{
            background:
              'color-mix(in srgb, var(--business-danger) 12%, var(--color-card, #ffffff))',
            borderColor:
              'color-mix(in srgb, var(--business-danger) 22%, transparent)',
          }}
        >
          <NoSymbolIcon
            className="w-5 h-5 flex-shrink-0"
            style={{ color: 'var(--business-danger)' }}
          />
          <p className="text-sm font-medium" style={{ color: 'var(--business-danger)' }}>
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

      {/* Offline Alert (Clean Lucide Icon, Zero Emojis) */}
      {typeof navigator !== 'undefined' && !navigator.onLine && (
        <div
          className="fixed bottom-4 right-4 z-50 px-3.5 py-1.5 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2"
          style={{
            background:
              'color-mix(in srgb, var(--business-warning) 14%, var(--color-card, #ffffff))',
            border:
              '1px solid color-mix(in srgb, var(--business-warning) 30%, transparent)',
            color: 'var(--business-warning)',
          }}
        >
          <WifiOff className="h-3.5 w-3.5 stroke-[2]" />
          <span>{t('facebookInbox.disconnected', 'لا يوجد اتصال بالإنترنت')}</span>
        </div>
      )}
    </>
  );
};

export default FacebookInboxModalsContainer;
