// Facebook Inbox Types
export type InboxTab =
  | "all"
  | "done"
  | "main"
  | "general"
  | "requests"
  | "spam"
  | "unreplied"
  | "priority";
export type ConversationStatus = "open" | "pending" | "resolved" | "done";

export interface InboxConversationMetadata {
  tab?: InboxTab;
  inboxTab?: InboxTab;
  postId?: string;
  [key: string]: unknown;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  companyId: string;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

export interface Note {
  id: string;
  conversationId: string;
  content: string;
  authorId: string;
  authorName: string;
  mentions: string[];
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  variables: string[];
  attachments: string[];
  companyId: string;
  createdBy: string;
  usageCount: number;
  isShared: boolean;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
}

export interface InboxConversation {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  platform: "facebook" | "whatsapp" | "telegram";

  // New fields for inbox
  tab: InboxTab;
  status: ConversationStatus;
  assignedTo: string | null;
  assignedToName?: string;
  assignedToAvatar?: string;
  tags: string[];
  priority: boolean;
  aiEnabled?: boolean;
  aiPausedUntil?: string | null;
  snoozedUntil: Date | null;
  archived: boolean;
  muted: boolean;
  lastStatusChange: Date;
  firstResponseTime: number | null;
  avgResponseTime: number | null;

  // Existing fields
  pageName?: string;
  pageId?: string;
  lastMessageIsFromCustomer?: boolean;
  hasUnreadMessages?: boolean;
  metadata?: InboxConversationMetadata | null;
  // Post information
  postId?: string;
  postDetails?: {
    postId?: string;
    message?: string;
    permalinkUrl?: string;
    fullPicture?: string;
    hasImages?: boolean;
    imageUrls?: string[];
  } | null;
  postDetailsUnavailable?: boolean;
  // 📦 Order info for quick display in conversation list
  lastOrderNumber?: string | null;
  lastOrderStatus?: string | null;
  totalOrders?: number;
}

export interface InboxFilters {
  search: string;
  tags: string[];
  assignee: string | null;
  status: ConversationStatus | null;
  dateRange: [Date, Date] | null;
  hasAttachments: boolean | null;
  unreadOnly: boolean;
}

export interface InboxStats {
  totalConversations: number;
  activeConversations: number;
  responseRate: number;
  avgResponseTime: number;
  firstResponseTime: number;
  resolvedToday: number;
  pendingConversations: number;
}

export interface InboxMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: Date;
  type:
  | "text"
  | "image"
  | "file"
  | "video"
  | "audio"
  | "template"
  | "IMAGE"
  | "FILE"
  | "VIDEO"
  | "AUDIO"
  | "TEMPLATE";
  isFromCustomer: boolean;
  status: "sending" | "sent" | "delivered" | "read" | "error";
  conversationId: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  metadata?: any;
  attachments?: any[]; // Add attachments array for checking buttons etc
  isStarred?: boolean;
  isAIResponse?: boolean;
}
