import { useState } from 'react';
import type { Contact } from '@/hooks/useWhatsAppQueries';

export function useWhatsAppChatDialogs() {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [buttonsDialogOpen, setButtonsDialogOpen] = useState(false);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [interactiveDialogOpen, setInteractiveDialogOpen] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedContactForLabel, setSelectedContactForLabel] = useState<Contact | null>(null);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [checkNumberDialogOpen, setCheckNumberDialogOpen] = useState(false);
  const [privacyDialogOpen, setPrivacyDialogOpen] = useState(false);
  const [businessProfileDialogOpen, setBusinessProfileDialogOpen] = useState(false);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
  const [showServiceOrderModal, setShowServiceOrderModal] = useState(false);
  const [showQuickCreateTaskModal, setShowQuickCreateTaskModal] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [quickOrderContact, setQuickOrderContact] = useState<Contact | null>(null);
  const [ordersRefreshToken, setOrdersRefreshToken] = useState(0);

  const [showRightPanel, setShowRightPanel] = useState(() =>
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('whatsappChatRightPanelVisible') === 'true'
      : false,
  );

  return {
    showEmojiPicker,
    setShowEmojiPicker,
    replyingTo,
    setReplyingTo,
    isRecording,
    setIsRecording,
    showReactionPicker,
    setShowReactionPicker,
    forwardDialogOpen,
    setForwardDialogOpen,
    pollDialogOpen,
    setPollDialogOpen,
    buttonsDialogOpen,
    setButtonsDialogOpen,
    listDialogOpen,
    setListDialogOpen,
    catalogDialogOpen,
    setCatalogDialogOpen,
    locationDialogOpen,
    setLocationDialogOpen,
    templateDialogOpen,
    setTemplateDialogOpen,
    statusDialogOpen,
    setStatusDialogOpen,
    showContactInfo,
    setShowContactInfo,
    interactiveDialogOpen,
    setInteractiveDialogOpen,
    labelDialogOpen,
    setLabelDialogOpen,
    selectedContactForLabel,
    setSelectedContactForLabel,
    createGroupDialogOpen,
    setCreateGroupDialogOpen,
    profileDialogOpen,
    setProfileDialogOpen,
    checkNumberDialogOpen,
    setCheckNumberDialogOpen,
    privacyDialogOpen,
    setPrivacyDialogOpen,
    businessProfileDialogOpen,
    setBusinessProfileDialogOpen,
    broadcastDialogOpen,
    setBroadcastDialogOpen,
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
    quickOrderContact,
    setQuickOrderContact,
    ordersRefreshToken,
    setOrdersRefreshToken,
    showRightPanel,
    setShowRightPanel,
  };
}
