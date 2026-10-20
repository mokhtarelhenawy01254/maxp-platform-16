import { useEffect, useRef } from 'react';
import { socketService } from '@/services/socketService';
import type {
  UnifiedConversation,
  UnifiedMessage,
} from '../types/unifiedInboxTypes';

export const useUnifiedInboxSocket = (
  selectedConversation: UnifiedConversation | null,
  setSelectedConversation: React.Dispatch<
    React.SetStateAction<UnifiedConversation | null>
  >,
  setConversations: React.Dispatch<
    React.SetStateAction<UnifiedConversation[]>
  >,
  setMessages: React.Dispatch<React.SetStateAction<UnifiedMessage[]>>,
  scrollToBottom: () => void,
) => {
  const socketHandlerRef = useRef<((message: any) => void) | null>(null);
  const newConvHandlerRef = useRef<((conversation: any) => void) | null>(null);
  const waSocketHandlerRef = useRef<((payload: any) => void) | null>(null);

  useEffect(() => {
    socketService.connect();

    const handler = (message: any) => {
      if (
        selectedConversation &&
        message.conversationId === selectedConversation.id
      ) {
        setMessages((prev) => [...prev, message]);
        setTimeout(() => scrollToBottom(), 50);
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: message.content,
                lastMessageTime: new Date().toISOString(),
                unreadCount: c.unreadCount + 1,
              }
            : c,
        ),
      );
    };

    socketHandlerRef.current = handler;
    socketService.onMessage(handler);

    const newConvHandler = (conversation: any) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === conversation.id)) return prev;
        return [conversation, ...prev];
      });
    };
    newConvHandlerRef.current = newConvHandler;
    socketService.onNewConversation(newConvHandler);

    const findWaConv = (
      convs: UnifiedConversation[],
      sessionId: string,
      remoteJid: string,
    ) =>
      convs.find(
        (c) =>
          c.platform === 'whatsapp' &&
          c.metadata?.['sessionId'] === sessionId &&
          c.metadata?.['jid'] === remoteJid,
      );

    const waHandler = (payload: any) => {
      const { sessionId, message } = payload;
      if (!sessionId || !message?.remoteJid) return;

      setConversations((prev) => {
        const match = findWaConv(prev, sessionId, message.remoteJid);
        if (!match) return prev;
        return prev.map((c) =>
          c.id === match.id
            ? {
                ...c,
                lastMessage: message.content || '',
                lastMessageTime: message.timestamp
                  ? new Date(message.timestamp).toISOString()
                  : new Date().toISOString(),
                unreadCount: c.unreadCount + (message.fromMe ? 0 : 1),
                lastMessageIsFromCustomer: !message.fromMe,
              }
            : c,
        );
      });

      if (
        selectedConversation?.platform === 'whatsapp' &&
        selectedConversation.metadata?.['sessionId'] === sessionId &&
        selectedConversation.metadata?.['jid'] === message.remoteJid
      ) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m.messageId === message.messageId || m.id === message.id,
            )
          )
            return prev;
          return [
            ...prev,
            {
              id: message.id,
              platform: 'whatsapp',
              messageId: message.messageId,
              content: message.content || '',
              type: (message.messageType || 'TEXT').toLowerCase(),
              isFromCustomer: !message.fromMe,
              timestamp: message.timestamp,
              status: (message.status || 'sent').toLowerCase(),
              mediaUrl: message.mediaUrl || null,
              mediaType: message.mediaType || null,
              mediaFileName: message.mediaFileName || null,
              quotedMessage: message.quotedContent
                ? {
                    id: message.quotedMessageId,
                    content: message.quotedContent,
                  }
                : null,
              isAIResponse: message.isAIResponse || false,
              sender: message.fromMe ? 'agent' : 'customer',
              interactiveData: message.interactiveData || null,
            },
          ];
        });
        setTimeout(() => scrollToBottom(), 50);
      }
    };

    waSocketHandlerRef.current = waHandler;
    socketService.on('whatsapp:message:new', waHandler);
    socketService.on('whatsapp:message:sent', waHandler);

    const aiStatusHandler = (data: {
      conversationId: string;
      aiEnabled: boolean;
    }) => {
      if (!data?.conversationId) return;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId ||
          c.metadata?.['conversationId'] === data.conversationId
            ? { ...c, aiEnabled: data.aiEnabled }
            : c,
        ),
      );
      setSelectedConversation((prev) =>
        prev &&
        (prev.id === data.conversationId ||
          prev.metadata?.['conversationId'] === data.conversationId)
          ? { ...prev, aiEnabled: data.aiEnabled }
          : prev,
      );
    };
    socketService.on('conversation:ai_status_changed', aiStatusHandler);

    return () => {
      if (socketHandlerRef.current) {
        socketService.off('new_message', socketHandlerRef.current);
        socketHandlerRef.current = null;
      }
      if (newConvHandlerRef.current) {
        socketService.off('conversation:new', newConvHandlerRef.current);
        newConvHandlerRef.current = null;
      }
      if (waSocketHandlerRef.current) {
        socketService.off('whatsapp:message:new', waSocketHandlerRef.current);
        socketService.off('whatsapp:message:sent', waSocketHandlerRef.current);
        waSocketHandlerRef.current = null;
      }
      socketService.off('conversation:ai_status_changed', aiStatusHandler);
    };
  }, [
    selectedConversation,
    setConversations,
    setMessages,
    setSelectedConversation,
    scrollToBottom,
  ]);
};
