import { useEffect, useRef, useCallback, type TouchEvent as ReactTouchEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient as api } from '@/services/apiClient';
import type { Contact } from '@/hooks/useWhatsAppQueries';

interface UseWhatsAppChatNavigationParams {
  selectedContact: Contact | null;
  setSelectedContact: (contact: Contact | null) => void;
  selectedSession: string;
  setSelectedSession: (sessionId: string) => void;
  loadingSessions: boolean;
  conversations: Contact[];
  setNewMessage: React.Dispatch<React.SetStateAction<string>>;
  normalizeContactJid: (jid: string) => string;
}

export function useWhatsAppChatNavigation({
  selectedContact,
  setSelectedContact,
  selectedSession,
  setSelectedSession,
  loadingSessions,
  conversations,
  setNewMessage,
  normalizeContactJid,
}: UseWhatsAppChatNavigationParams) {
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkAppliedRef = useRef(false);

  // Swipe gesture handler for mobile back navigation
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleChatTouchStart = useCallback((e: ReactTouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0]!.clientX,
      y: e.touches[0]!.clientY,
      time: Date.now(),
    };
  }, []);

  const handleChatTouchEnd = useCallback(
    (e: ReactTouchEvent) => {
      if (!touchStartRef.current || !selectedContact) return;
      const deltaX = e.changedTouches[0]!.clientX - touchStartRef.current.x;
      const deltaY = Math.abs(e.changedTouches[0]!.clientY - touchStartRef.current.y);
      const elapsed = Date.now() - touchStartRef.current.time;

      const isRtl = document.documentElement.dir === 'rtl';
      const isSwipeBack = isRtl ? deltaX < -80 : deltaX > 80;

      if (deltaY < 50 && elapsed < 400 && isSwipeBack) {
        if (typeof document.startViewTransition === 'function') {
          document.startViewTransition(() => setSelectedContact(null));
        } else {
          setSelectedContact(null);
        }
      }
      touchStartRef.current = null;
    },
    [selectedContact, setSelectedContact],
  );

  // View-transition-wrapped contact selection
  const selectContactWithTransition = useCallback(
    (contact: Contact | null) => {
      if (typeof document.startViewTransition === 'function' && window.innerWidth < 1280) {
        document.startViewTransition(() => setSelectedContact(contact));
      } else {
        setSelectedContact(contact);
      }
    },
    [setSelectedContact],
  );

  // Mobile layout: hide app-shell header + remove padding when chat is open
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => {
      if (mq.matches && selectedContact) {
        document.body.classList.add('wa-mobile-chat-active');
      } else {
        document.body.classList.remove('wa-mobile-chat-active');
      }
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => {
      mq.removeEventListener?.('change', apply);
      document.body.classList.remove('wa-mobile-chat-active');
    };
  }, [selectedContact]);

  // Hash-based navigation: browser back returns to chat list
  useEffect(() => {
    if (!selectedContact) {
      if (window.location.hash === '#chat') {
        try {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
        } catch {
          // ignore
        }
      }
      return;
    }
    if (window.location.hash !== '#chat') {
      try {
        window.history.pushState(
          null,
          '',
          window.location.pathname + window.location.search + '#chat',
        );
      } catch {
        window.location.hash = 'chat';
      }
    }
    const onHashChange = () => {
      if (window.location.hash !== '#chat' && selectedContact) {
        setSelectedContact(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [selectedContact, setSelectedContact]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    if (selectedContact) {
      document.body.classList.add('app-shell-chat-active');
    } else {
      document.body.classList.remove('app-shell-chat-active');
    }

    return () => {
      document.body.classList.remove('app-shell-chat-active');
    };
  }, [selectedContact]);

  // Deep link: open specific chat from URL params
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    if (loadingSessions) return;

    const sessionParam = searchParams.get('session');
    const rawJidParam = searchParams.get('jid');
    const phoneParam = searchParams.get('phone');
    const conversationIdParam =
      searchParams.get('conversationId') || searchParams.get('conversation');
    const nameParam = searchParams.get('name');
    const orderNumberParam = searchParams.get('orderNumber') || searchParams.get('orderId');

    if (!sessionParam && !rawJidParam && !phoneParam && !conversationIdParam) return;

    let cleanPhone = (phoneParam || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
      cleanPhone = '2' + cleanPhone;
    }

    let targetJid = rawJidParam || '';
    if (!targetJid && cleanPhone) {
      targetJid = `${cleanPhone}@s.whatsapp.net`;
    } else if (targetJid && !targetJid.includes('@')) {
      targetJid = `${targetJid}@s.whatsapp.net`;
    }

    if (!cleanPhone && targetJid) {
      cleanPhone = targetJid.replace(/@.*$/, '').replace(/\D/g, '');
    }

    const normalizedTarget = targetJid ? normalizeContactJid(targetJid) : '';

    const applyOrderGreeting = () => {
      if (orderNumberParam) {
        setNewMessage((prev) => {
          if (prev && prev.trim()) return prev;
          const greetingName = nameParam ? `${nameParam}، ` : '';
          return `مرحباً ${greetingName}نتواصل معك بخصوص طلبك رقم #${orderNumberParam}`;
        });
      }
    };

    const found = conversations.find((c) => {
      if (
        conversationIdParam &&
        (c.id === conversationIdParam || c.jid === conversationIdParam)
      )
        return true;
      if (sessionParam && c.sessionId !== sessionParam) return false;
      if (normalizedTarget && normalizeContactJid(c.jid) === normalizedTarget) return true;
      if (
        cleanPhone &&
        c.phoneNumber &&
        normalizeContactJid(c.phoneNumber).includes(cleanPhone)
      )
        return true;
      return false;
    });

    if (found) {
      deepLinkAppliedRef.current = true;
      setSearchParams({}, { replace: true });
      if (selectedSession !== found.sessionId) {
        setSelectedSession(found.sessionId);
      }
      setSelectedContact(found);
      applyOrderGreeting();
      return;
    }

    let isCancelled = false;
    const lookupAndApply = async () => {
      if (cleanPhone || conversationIdParam || targetJid) {
        try {
          const res = await api.get<{ conversations?: Contact[] }>(
            '/whatsapp/conversations',
            {
              params: {
                search: cleanPhone || targetJid || conversationIdParam,
                sessionId: sessionParam || 'all',
                limit: 5,
              },
            },
          );
          const matched = res.data?.conversations?.[0];
          if (matched && !isCancelled) {
            deepLinkAppliedRef.current = true;
            setSearchParams({}, { replace: true });
            if (selectedSession !== matched.sessionId) {
              setSelectedSession(matched.sessionId);
            }
            setSelectedContact(matched);
            applyOrderGreeting();
            return;
          }
        } catch (err) {
          console.warn('WhatsApp deep-link lookup error:', err);
        }
      }

      if (!isCancelled && targetJid) {
        deepLinkAppliedRef.current = true;
        setSearchParams({}, { replace: true });
        const fallbackSession = sessionParam || selectedSession || '';
        const syntheticContact: Contact = {
          id: targetJid,
          jid: targetJid,
          sessionId: fallbackSession,
          phoneNumber: cleanPhone,
          name: nameParam || null,
          pushName: nameParam || null,
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
          window: {
            isOpen: false,
            remainingSeconds: 0,
            remainingLabel: '',
            windowExpiresAt: null,
          },
        };
        setSelectedContact(syntheticContact);
        applyOrderGreeting();
      }
    };

    void lookupAndApply();

    return () => {
      isCancelled = true;
    };
  }, [
    conversations,
    loadingSessions,
    normalizeContactJid,
    searchParams,
    selectedSession,
    setNewMessage,
    setSearchParams,
    setSelectedContact,
    setSelectedSession,
  ]);

  return {
    handleChatTouchStart,
    handleChatTouchEnd,
    selectContactWithTransition,
  };
}
