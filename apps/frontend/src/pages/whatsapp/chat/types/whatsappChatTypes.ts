import type { InfiniteData } from '@tanstack/react-query';
import type { Contact, Message, Session } from '@/hooks/useWhatsAppQueries';

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  currency?: string | null;
  imageUrl?: string | null;
}

export interface ListRow {
  id: string;
  title: string;
  description: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ConversationsPage {
  conversations: Contact[];
  pagination: PaginationState;
  counts?: {
    all: number;
    unread: number;
    groups: number;
    unreplied: number;
    archived: number;
  };
}

export interface MessagesPage {
  messages: Message[];
  pagination: PaginationState;
}

export interface IncomingMessageEvent {
  sessionId: string;
  message: Message;
  contact?: Contact;
  conversationId?: string | null;
}

export interface NotificationEventPayload {
  contactName: string;
  message?: string | null;
  messageType?: string | null;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  sessionId?: string;
}

export interface MessageStatusEventPayload {
  messageId: string;
  status: string;
  remoteJid?: string;
  sessionId: string;
}

export interface TypingEventPayload {
  jid?: string;
}

export interface AppErrorLike {
  message?: string;
  response?: {
    data?: {
      error?: string;
    };
  };
}

export type ConversationsCache = InfiniteData<ConversationsPage>;
export type MessagesCache = InfiniteData<MessagesPage>;

export interface PollData {
  question: string;
  options: string[];
  selectableCount: number;
}

export interface ButtonsData {
  text: string;
  footer: string;
  buttons: { id: string; text: string }[];
}

export interface ListData {
  text: string;
  buttonText: string;
  title: string;
  sections: ListSection[];
}

export interface LocationData {
  latitude: string;
  longitude: string;
  address: string;
}

export interface MessageContextMenuPosition {
  mouseX: number;
  mouseY: number;
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  content: string;
  onConfirm: () => void;
}

export interface NotificationSettingsState {
  notificationSound: boolean;
  browserNotifications: boolean;
}
