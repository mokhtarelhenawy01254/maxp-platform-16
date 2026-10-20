import type { ConversationStatus } from '@/types/inbox.types';

export interface UnifiedConversation {
  id: string;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'telegram';
  platformIcon?: string;
  contactName: string;
  contactAvatar: string | null;
  contactId: string;
  contactEmail: string | null;
  contactPhone: string | null;
  lastMessage: string;
  lastMessageType: string;
  lastMessageTime: string;
  lastMessageIsFromCustomer: boolean;
  unreadCount: number;
  status: string;
  assignedTo: { id: string; name: string; avatar: string | null } | null;
  isPinned: boolean;
  isMuted: boolean;
  tags: string[];
  metadata: Record<string, any>;
  lastOrderNumber?: string | null;
  lastOrderStatus?: string | null;
  totalOrders?: number;
  aiEnabled?: boolean;
}

export interface UnifiedMessage {
  id: string;
  platform: string;
  messageId?: string;
  content: string;
  type: string;
  isFromCustomer: boolean;
  timestamp: string;
  status: string;
  mediaUrl: string | null;
  mediaType: string | null;
  mediaFileName: string | null;
  attachments?: Array<{
    url?: string;
    type?: string;
    name?: string;
    attachmentIndex?: number;
  }> | null;
  quotedMessage: { id: string; content: string } | null;
  sender: string;
  senderAvatar?: string | null;
  interactiveData: any;
  isStarred?: boolean;
  isAIResponse?: boolean;
  metadata?: Record<string, any>;
}

export interface CustomerProfile {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  status: string;
  createdAt: string;
  totalOrders: number;
  totalConversations: number;
  recentOrders: any[];
  recentConversations: any[];
  tags: string[];
  notes: string;
  ltv?: number;
  ratingStars?: number;
  ratingLabel?: string;
}

export interface Attachment {
  file: File;
  previewUrl: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  size: number;
}

export type PlatformFilter = 'all' | 'whatsapp' | 'facebook' | 'instagram' | 'telegram';
export type StatusFilter = 'all' | 'unread' | 'followUp';
