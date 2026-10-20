import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { InboxConversation } from '@/types/inbox.types';
import { FACEBOOK_INBOX_PROFILE_COLUMN_STORAGE_KEY } from '../types/facebookInboxTypes';

interface UseFacebookInboxLayoutParams {
  selectedConversation: InboxConversation | null;
  selectConversation: (conversation: InboxConversation | null) => void;
  showNotes: boolean;
  setShowNotes: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useFacebookInboxLayout({
  selectedConversation,
  selectConversation,
  showNotes,
  setShowNotes,
}: UseFacebookInboxLayoutParams) {
  const { t } = useTranslation();

  const [showSidebar, setShowSidebar] = useState(true);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showDesktopContextColumn, setShowDesktopContextColumn] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return (
        window.localStorage.getItem(FACEBOOK_INBOX_PROFILE_COLUMN_STORAGE_KEY) !==
        'false'
      );
    } catch {
      return true;
    }
  });

  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);
  const [showDesktopMoreMenu, setShowDesktopMoreMenu] = useState(false);

  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const [isWideDesktop, setIsWideDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1280 : false,
  );

  // Resize listener
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateViewportMode = () => {
      setIsMobileViewport(window.innerWidth < 768);
      setIsWideDesktop(window.innerWidth >= 1280);
    };

    updateViewportMode();
    window.addEventListener('resize', updateViewportMode);
    return () => {
      window.removeEventListener('resize', updateViewportMode);
    };
  }, []);

  // Save desktop column state to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        FACEBOOK_INBOX_PROFILE_COLUMN_STORAGE_KEY,
        showDesktopContextColumn ? 'true' : 'false',
      );
    } catch {
      // Ignore storage errors
    }
  }, [showDesktopContextColumn]);

  // Handle container padding override in Layout
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (mainElement) {
      const originalClasses = mainElement.className;
      mainElement.classList.remove('p-4', 'p-6', 'overflow-y-auto');
      mainElement.classList.add(
        'p-0',
        'overflow-hidden',
        'flex-1',
        'h-full',
        'max-h-full',
      );
      return () => {
        mainElement.className = originalClasses;
      };
    }

    const appContent = document.querySelector('.app-shell-content') as HTMLElement | null;
    if (appContent) {
      const origContentOverflow = appContent.style.overflow;
      appContent.style.overflow = 'hidden';

      const inboxShell = appContent.querySelector('.business-inbox-shell');
      if (inboxShell && inboxShell.parentElement) {
        const wrapper = inboxShell.parentElement;
        wrapper.classList.add('h-full', 'flex-1', 'flex', 'flex-col', 'min-h-0');
      }

      return () => {
        appContent.style.overflow = origContentOverflow || '';
      };
    }

    return undefined;
  }, []);

  // Sync body classes for mobile / chat active
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    if (selectedConversation) {
      document.body.classList.add('app-shell-chat-active');
      document.body.classList.add('wa-mobile-chat-active');
      document.documentElement.classList.add('app-shell-chat-active');
    } else {
      document.body.classList.remove('app-shell-chat-active');
      document.body.classList.remove('wa-mobile-chat-active');
      document.documentElement.classList.remove('app-shell-chat-active');
    }

    return () => {
      document.body.classList.remove('app-shell-chat-active');
      document.body.classList.remove('wa-mobile-chat-active');
      document.documentElement.classList.remove('app-shell-chat-active');
    };
  }, [selectedConversation]);

  // Responsive sidebar toggles on select
  useEffect(() => {
    if (selectedConversation && window.innerWidth < 768) {
      setShowSidebar(false);
    }
    if (!selectedConversation) {
      setShowProfilePanel(false);
      setShowNotes(false);
    }
  }, [selectedConversation, setShowNotes]);

  useEffect(() => {
    if (!selectedConversation || !isMobileViewport) {
      setShowMobileActionMenu(false);
    }
    if (!selectedConversation) {
      setShowDesktopMoreMenu(false);
    }
  }, [isMobileViewport, selectedConversation]);

  const showPinnedContextPanel = Boolean(
    selectedConversation && isWideDesktop && showDesktopContextColumn,
  );
  const shouldCollapseActions = !isWideDesktop || showPinnedContextPanel;
  const showProfileOverlay = Boolean(
    selectedConversation && showProfilePanel && !isWideDesktop,
  );
  const showNotesOverlay = Boolean(
    selectedConversation && showNotes && !isWideDesktop,
  );
  const isProfilePanelActive = isWideDesktop
    ? Boolean(showPinnedContextPanel && !showNotes)
    : showProfilePanel;
  const profilePanelToggleTitle = isWideDesktop
    ? isProfilePanelActive
      ? t('facebookInbox.hideCustomerData')
      : t('facebookInbox.showCustomerData')
    : t('facebookInbox.customerData');

  const handleBackToConversationList = useCallback(() => {
    setShowSidebar(true);
    setShowProfilePanel(false);
    setShowNotes(false);
    setShowMobileActionMenu(false);
    selectConversation(null);
  }, [selectConversation, setShowNotes]);

  const handleOpenProfilePanel = useCallback(() => {
    setShowMobileActionMenu(false);

    if (isWideDesktop) {
      setShowProfilePanel(true);
      if (!showDesktopContextColumn || showNotes) {
        setShowDesktopContextColumn(true);
        setShowNotes(false);
        return;
      }
      setShowDesktopContextColumn(false);
      return;
    }

    setShowProfilePanel((current) => {
      const next = !current;
      if (next) {
        setShowNotes(false);
      }
      return next;
    });
  }, [isWideDesktop, showDesktopContextColumn, showNotes, setShowNotes]);

  const handleToggleNotesPanel = useCallback(() => {
    setShowMobileActionMenu(false);

    if (isWideDesktop) {
      setShowDesktopContextColumn(true);
      setShowNotes((current) => !current);
      setShowProfilePanel(true);
      return;
    }

    setShowNotes((current) => {
      const next = !current;
      if (next) {
        setShowProfilePanel(false);
      }
      return next;
    });
  }, [isWideDesktop, setShowNotes]);

  return {
    showSidebar,
    setShowSidebar,
    showProfilePanel,
    setShowProfilePanel,
    showDesktopContextColumn,
    setShowDesktopContextColumn,
    showMobileActionMenu,
    setShowMobileActionMenu,
    showDesktopMoreMenu,
    setShowDesktopMoreMenu,
    isMobileViewport,
    isWideDesktop,
    showPinnedContextPanel,
    shouldCollapseActions,
    showProfileOverlay,
    showNotesOverlay,
    isProfilePanelActive,
    profilePanelToggleTitle,
    handleBackToConversationList,
    handleOpenProfilePanel,
    handleToggleNotesPanel,
  };
}

export default useFacebookInboxLayout;
