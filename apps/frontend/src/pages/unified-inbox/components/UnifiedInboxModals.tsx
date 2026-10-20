import React from 'react';
import QuickOrderModal from '@/components/facebook-inbox/Modals/QuickOrderModal';
import TextGalleryModal from '@/components/facebook-inbox/TextGallery/TextGalleryModal';
import ImageGalleryModal from '@/components/facebook-inbox/ImageGallery/ImageGalleryModal';
import ForwardModal from '@/components/facebook-inbox/Modals/ForwardModal';
import type { UnifiedConversation, UnifiedMessage } from '../types/unifiedInboxTypes';

interface UnifiedInboxModalsProps {
  showQuickOrder: boolean;
  setShowQuickOrder: (show: boolean) => void;
  selectedConversation: UnifiedConversation | null;
  showTextGallery: boolean;
  setShowTextGallery: (show: boolean) => void;
  onTextGallerySelect: (text: { content: string }) => void;
  onLoadQuickReplies: () => void;
  showImageGallery: boolean;
  setShowImageGallery: (show: boolean) => void;
  onImageGallerySelect: (imageUrl: string, filename: string) => void;
  onMultipleImagesSelect: (images: Array<{ url: string; filename: string }>) => void;
  showForwardModal: boolean;
  setShowForwardModal: (show: boolean) => void;
  setForwardMessage: (msg: UnifiedMessage | null) => void;
  onForwardMessage: (targetConvId: string) => void;
  conversations: any[];
}

export const UnifiedInboxModals: React.FC<UnifiedInboxModalsProps> = ({
  showQuickOrder,
  setShowQuickOrder,
  selectedConversation,
  showTextGallery,
  setShowTextGallery,
  onTextGallerySelect,
  onLoadQuickReplies,
  showImageGallery,
  setShowImageGallery,
  onImageGallerySelect,
  onMultipleImagesSelect,
  showForwardModal,
  setShowForwardModal,
  setForwardMessage,
  onForwardMessage,
  conversations,
}) => {
  return (
    <>
      {showQuickOrder && selectedConversation && (
        <QuickOrderModal
          isOpen={showQuickOrder}
          onClose={() => setShowQuickOrder(false)}
          conversationId={selectedConversation.id}
          customerId={selectedConversation.contactId}
          customerName={selectedConversation.contactName}
          customerPhone={selectedConversation.contactPhone || undefined}
          platform={
            selectedConversation.platform === 'whatsapp' ? 'whatsapp' : 'facebook'
          }
        />
      )}

      <TextGalleryModal
        isOpen={showTextGallery}
        onClose={() => {
          setShowTextGallery(false);
          onLoadQuickReplies();
        }}
        onSelectText={onTextGallerySelect}
      />

      <ImageGalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelectImage={onImageGallerySelect}
        onSelectMultipleImages={onMultipleImagesSelect}
      />

      <ForwardModal
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardMessage(null);
        }}
        onForward={onForwardMessage}
        conversations={conversations}
      />
    </>
  );
};

export default UnifiedInboxModals;
