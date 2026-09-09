import { useState, useEffect, useCallback } from "react";
import { Socket } from "socket.io-client";
import { buildWsUrl } from "../utils/urlHelper";
import { socketService } from "../services/socketService";

export interface SocketEvents {
  // رسائل جديدة
  new_message: (message: any) => void;
  message_delivered: (data: { messageId: string; timestamp: Date }) => void;
  message_read: (data: { messageId: string; timestamp: Date }) => void;

  // حالة الكتابة
  user_typing: (data: {
    userId: string;
    userName: string;
    conversationId: string;
  }) => void;
  user_stopped_typing: (data: {
    userId: string;
    conversationId: string;
  }) => void;

  // حالة الاتصال
  user_online: (data: { userId: string; timestamp: Date }) => void;
  user_offline: (data: { userId: string; timestamp: Date }) => void;
  online_users: (data: { users: string[] }) => void;
  online_users_initial: (data: { users: string[] }) => void;

  // تحديثات المحادثات
  conversation_updated: (conversation: any) => void;
  conversation_deleted: (conversationId: string) => void;
  "conversation:new": (conversation: any) => void;

  // إشعارات
  notification: (notification: any) => void;
}

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  connectionError: string | null;
  emit: (event: string, data?: any) => void;
  on: <K extends keyof SocketEvents>(
    event: K,
    handler: SocketEvents[K],
  ) => void;
  off: <K extends keyof SocketEvents>(
    event: K,
    handler?: SocketEvents[K],
  ) => void;
  connect: () => void;
  disconnect: () => void;
}

const useSocket = (
  _url: string = buildWsUrl(),
  _options: any = {},
): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(() => socketService.getSocket());
  const [isConnected, setIsConnected] = useState<boolean>(() => socketService.isConnected());
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const s = socketService.getSocket();
    if (!s) return;

    setSocket(s);
    setIsConnected(s.connected);

    const onConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onConnectError = (error: any) => {
      setConnectionError(error?.message || "Connection error");
      setIsConnected(false);
    };

    const onReconnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionError(null);
    };

    const onReconnectAttempt = () => {
      setIsReconnecting(true);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectError);
    s.on("reconnect", onReconnect);
    s.on("reconnect_attempt", onReconnectAttempt);

    if (!s.connected) {
      socketService.connect();
    }

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectError);
      s.off("reconnect", onReconnect);
      s.off("reconnect_attempt", onReconnectAttempt);
    };
  }, []);

  const connect = useCallback(() => {
    socketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    // Shared singleton socket — do not disconnect app-wide connection on individual hook unmount
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const s = socketService.getSocket();
    if (s?.connected) {
      s.emit(event, data);
    } else {
      console.warn("⚠️ Cannot emit event: Socket not connected");
    }
  }, []);

  const on = useCallback(
    <K extends keyof SocketEvents>(event: K, handler: SocketEvents[K]) => {
      const s = socketService.getSocket();
      if (s) {
        s.on(event as string, handler as any);
      }
    },
    [],
  );

  const off = useCallback(
    <K extends keyof SocketEvents>(event: K, handler?: SocketEvents[K]) => {
      const s = socketService.getSocket();
      if (s) {
        if (handler) {
          s.off(event as string, handler as any);
        } else {
          s.off(event as string);
        }
      }
    },
    [],
  );

  return {
    socket,
    isConnected,
    isReconnecting,
    connectionError,
    emit,
    on,
    off,
    connect,
    disconnect,
  };
};

export default useSocket;
