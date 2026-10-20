import { useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import type { InboxConversation, InboxMessage } from '@/types/inbox.types';

interface UseFacebookInboxScrollParams {
  selectedConversation: InboxConversation | null;
  messages: InboxMessage[];
  hasMore: boolean;
  loadingMessages: boolean;
  loadMoreMessages: () => void;
}

export function useFacebookInboxScroll({
  selectedConversation,
  messages,
  hasMore,
  loadingMessages,
  loadMoreMessages,
}: UseFacebookInboxScrollParams) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(0);
  const oldScrollHeightRef = useRef(0);
  const wasAtBottomRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const lastConversationIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  const isAtBottom = useCallback(
    (container: HTMLDivElement, threshold = 100) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      return scrollHeight - scrollTop - clientHeight < threshold;
    },
    [],
  );

  useEffect(() => {
    if (selectedConversation?.id !== lastConversationIdRef.current) {
      isInitialLoadRef.current = true;
      lastConversationIdRef.current = selectedConversation?.id || null;
    }

    if (
      messages.length > 0 &&
      selectedConversation &&
      isInitialLoadRef.current
    ) {
      scrollToBottom(false);
      setTimeout(() => scrollToBottom(false), 50);
      setTimeout(() => scrollToBottom(false), 150);
      setTimeout(() => scrollToBottom(false), 300);
      wasAtBottomRef.current = true;
      isInitialLoadRef.current = false;
    }
  }, [selectedConversation, messages.length, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || messages.length === 0) return;

    if (
      messages.length > prevMessagesLength.current &&
      wasAtBottomRef.current
    ) {
      setTimeout(() => scrollToBottom(true), 50);
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, scrollToBottom]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;
      wasAtBottomRef.current = isAtBottom(container);
      if (container.scrollTop < 200 && hasMore && !loadingMessages) {
        oldScrollHeightRef.current = container.scrollHeight;
        loadMoreMessages();
      }
    },
    [hasMore, loadingMessages, loadMoreMessages, isAtBottom],
  );

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !oldScrollHeightRef.current) return;
    if (
      messages.length > prevMessagesLength.current &&
      prevMessagesLength.current > 0
    ) {
      const newScrollHeight = container.scrollHeight;
      const diff = newScrollHeight - oldScrollHeightRef.current;
      container.scrollTop = diff;
      oldScrollHeightRef.current = 0;
    }
  }, [messages.length]);

  const repliedMessages = useMemo((): Set<string> => {
    const repliedSet = new Set<string>();
    if (messages.length === 0) return repliedSet;

    const sortedMessages = [...messages].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    let lastReplyTime = 0;
    for (let i = sortedMessages.length - 1; i >= 0; i--) {
      const msg = sortedMessages[i];
      if (!msg) continue;
      const msgTime = new Date(msg.timestamp).getTime();

      if (!msg.isFromCustomer) {
        lastReplyTime = Math.max(lastReplyTime, msgTime);
      } else if (lastReplyTime > 0 && msgTime < lastReplyTime) {
        repliedSet.add(msg.id);
      }
    }
    return repliedSet;
  }, [messages]);

  const messagesById = useMemo(() => {
    const map = new Map<string, InboxMessage>();
    messages.forEach((msg) => map.set(msg.id, msg));
    return map;
  }, [messages]);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`inbox-message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add(
        'ring-2',
        'ring-primary',
        'rounded-2xl',
        'transition-all',
        'duration-500',
      );
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary');
      }, 2500);
    }
  }, []);

  return {
    messagesContainerRef,
    handleScroll,
    repliedMessages,
    messagesById,
    handleScrollToMessage,
    scrollToBottom,
  };
}

export default useFacebookInboxScroll;
