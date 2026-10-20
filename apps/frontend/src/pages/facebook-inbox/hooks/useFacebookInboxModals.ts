import { useState } from 'react';
import type { InboxMessage } from '@/types/inbox.types';

export function useFacebookInboxModals() {
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<InboxMessage | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<InboxMessage | null>(null);
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);

  const [showTextGallery, setShowTextGallery] = useState(false);
  const [composerDraft, setComposerDraft] = useState<string>('');
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const [showFilters, setShowFilters] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showStats, setShowStats] = useState(false);

  return {
    forwardModalOpen,
    setForwardModalOpen,
    messageToForward,
    setMessageToForward,
    replyToMessage,
    setReplyToMessage,
    snoozeModalOpen,
    setSnoozeModalOpen,
    showTextGallery,
    setShowTextGallery,
    composerDraft,
    setComposerDraft,
    showImageGallery,
    setShowImageGallery,
    showProductPicker,
    setShowProductPicker,
    showQuickOrderModal,
    setShowQuickOrderModal,
    showBlockModal,
    setShowBlockModal,
    blockReason,
    setBlockReason,
    showFilters,
    setShowFilters,
    showNotes,
    setShowNotes,
    showStats,
    setShowStats,
  };
}

export default useFacebookInboxModals;
