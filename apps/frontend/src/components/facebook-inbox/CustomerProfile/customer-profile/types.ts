import { InboxConversation } from "../../../../types/inbox.types";

export interface CustomerProfileVerticalAction {
  id: string;
  label: string;
}

export interface CustomerProfileVerticalRecord {
  id: string;
  type?: string;
  title?: string;
  code?: string;
  status?: string;
  amount?: number;
  date?: string;
  subtitle?: string;
  href?: string;
  [key: string]: unknown;
}

export interface CustomerProfileVerticalContext {
  vertical?: string;
  records?: CustomerProfileVerticalRecord[];
  dentalCases?: CustomerProfileVerticalRecord[];
  appointments?: CustomerProfileVerticalRecord[];
  serviceOrders?: CustomerProfileVerticalRecord[];
  tasks?: CustomerProfileVerticalRecord[];
  enrollments?: CustomerProfileVerticalRecord[];
  summary?: {
    countLabel?: string;
    valueLabel?: string;
    primaryCount?: number;
    secondaryValue?: number;
    totalCount?: number;
    totalValue?: number;
    items?: CustomerProfileVerticalRecord[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface CustomerProfileVerticalCapabilities {
  vertical: string;
  specialtyLabel: string;
  badgeClassName?: string;
  primaryAction: CustomerProfileVerticalAction;
  availableActions?: CustomerProfileVerticalAction[];
  recordsTabLabel: string;
  kpiLabels: {
    countLabel: string;
    valueLabel: string;
  };
  showProductPicker?: boolean;
}

export interface CustomerProfileProps {
  conversation: InboxConversation;
  className?: string;
  onTagsChange: (tags: string[]) => void;
  updatingTags: boolean;
  currentStatus?: string;
  onStatusChange?: (status: string) => void;
  currentAssignee?: string | null;
  currentAssigneeName?: string | null;
  onAssign?: (userId: string | null) => void;
  disabled?: boolean;
  // Open Conversation Callback
  onOpenConversation?: (conversationId: string) => void;
  // Block Customer Props
  isBlocked?: boolean;
  checkingBlockStatus?: boolean;
  blocking?: boolean;
  showBlockModal?: boolean;
  blockReason?: string;
  onBlockClick?: () => void;
  onUnblockClick?: () => void;
  onBlockReasonChange?: (reason: string) => void;
  onBlockConfirm?: () => void;
  onBlockCancel?: () => void;
  // Sound & Notifications Props
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  onSoundToggle?: () => void;
  onNotificationsToggle?: () => void;
  // Copy Conversation Link
  onCopyConversationLink?: (conversationId: string) => void;
  // Quick Order & Vertical Capabilities
  onCreateOrder?: () => void;
  compactHeader?: boolean;
  verticalCapabilities?: CustomerProfileVerticalCapabilities;
  verticalContext?: CustomerProfileVerticalContext | null;
  onPrimaryAction?: () => void;
  onOpenServiceOrder?: () => void;
  onOpenTasks?: () => void;
}

export type Tab = "info" | "orders" | "timeline";

export interface ApiErrorLike {
  response?: {
    data?: {
      message?: string;
      error?: string;
      info?: string;
    };
  };
  message?: string;
}
