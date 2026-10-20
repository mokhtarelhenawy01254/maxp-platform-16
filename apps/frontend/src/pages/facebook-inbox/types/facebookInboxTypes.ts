import type {
  InboxMessage,
  InboxConversation,
  InboxTab,
  ConversationStatus,
} from '@/types/inbox.types';
import type { FilterState } from '@/components/facebook-inbox/FilterPanel/FilterPanel';

export interface FacebookInboxProps {
  channel?: string;
  platform?: string;
  inboxPath?: string;
}

export type ApiErrorLike = {
  response?: {
    status?: number;
  };
  message?: string;
};

export type InboxApiMessage = Partial<Omit<InboxMessage, 'metadata' | 'timestamp'>> & {
  createdAt?: string | Date;
  timestamp?: string | Date;
  metadata?: string | Record<string, unknown> | null;
  sender?: {
    id?: string;
    name?: string;
  };
  senderName?: string;
};

export type SocketInboxMessage = InboxMessage & {
  customerName?: string;
  channel?: string;
};

export const getApiError = (error: unknown): ApiErrorLike => {
  if (typeof error === 'object' && error !== null) {
    return error as ApiErrorLike;
  }
  return {};
};

export const FACEBOOK_INBOX_PROFILE_COLUMN_STORAGE_KEY =
  'facebookInboxProfileColumnVisible';

export interface TabCountsState {
  all: number;
  unreplied: number;
  done: number;
  main: number;
  general: number;
  requests: number;
  spam: number;
  priority: number;
}
