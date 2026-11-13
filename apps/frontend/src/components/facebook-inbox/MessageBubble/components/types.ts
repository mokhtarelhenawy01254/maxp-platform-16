export interface ReplyReference {
  senderName?: string;
  type?: string;
  content?: string;
  imageUrl?: string;
  mediaUrl?: string;
  messageId?: string;
}

export interface MessageMetadata {
  isStarred?: boolean;
  replyTo?: ReplyReference;
  replyToResolvedMessageId?: string;
  replyToContentSnippet?: string;
  replyToType?: string;
  replyToFacebookMessageId?: string;
  myReaction?: string;
  reactions?: Record<string, unknown>;
  isOrderConfirmation?: boolean;
  eventType?: string;
  orderNumber?: string;
  orderId?: string;
  total?: number;
  deliveryStatus?: 'PENDING' | 'SENT' | 'FAILED';
  failureReason?: string | null;
  facebookMessageId?: string | null;
}

export interface TemplateButton {
  type?: string;
  title?: string;
  url?: string;
}

export interface TemplateElement {
  image_url?: string;
  title?: string;
  subtitle?: string;
  buttons?: TemplateButton[];
}

export interface MessageAttachment {
  type?: string;
  url?: string;
  file_url?: string;
  image_url?: string;
  mime_type?: string;
  image_data?: {
    url?: string;
  };
  name?: string;
  payload?: {
    template_type?: string;
    text?: string;
    url?: string;
    image_url?: string;
    elements?: TemplateElement[];
    buttons?: TemplateButton[];
  };
}

export interface Message {
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
  metadata?: MessageMetadata | string | null;
  attachments?: MessageAttachment[];
  isStarred?: boolean;
  isAIResponse?: boolean;
  senderType?: 'AI' | 'META_EXTERNAL' | 'STAFF' | 'CUSTOMER';
  deliveryStatus?: 'PENDING' | 'SENT' | 'FAILED';
  failureReason?: string | null;
  facebookMessageId?: string | null;
}

export interface MessageBubbleProps {
  message: Message;
  parentMessage?: Message;
  onDelete?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onStar?: (messageId: string, isStarred: boolean) => void;
  onReaction?: (messageId: string, reaction: string) => void;
  onReply?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
  currentUserId?: string;
  hasBeenReplied?: boolean;
  onCorrect?: () => void;
  onRetry?: (message: Message) => void;
}

export type MediaKind = "image" | "video" | "audio" | "file";
