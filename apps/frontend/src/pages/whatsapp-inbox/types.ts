export type RoutingMode = 'NUMBER_OWNER' | 'ROUND_ROBIN';

export type DistributionStrategy = 'ROUND_ROBIN';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar: string | null;
  currentChatCount?: number;
  isOnline?: boolean;
}

export interface WorkspaceNumber {
  id: string;
  sessionId: string;
  assignmentId: string | null;
  isConfigured: boolean;
  connectionStatus: string;
  routingMode: RoutingMode;
  distributionStrategy: DistributionStrategy;
  assignedUser: Employee | null;
  routingUsers: Employee[];
  routingUserIds: string[];
  activeMemberCount: number;
  lastDistributedUserId: string | null;
  lastDistributedAt: string | null;
  roundRobinCursor: number;
  assignedAt: string | null;
  isActive: boolean;
  session: {
    id: string;
    name: string;
    phoneNumber: string;
    status: string;
    provider: string;
    profileName: string | null;
    lastConnectedAt: string | null;
    updatedAt?: string;
  };
}

export interface WorkspaceStats {
  totalNumbers: number;
  configuredNumbers: number;
  exclusiveNumbers: number;
  roundRobinNumbers: number;
  connectedNumbers: number;
}

export interface PreviewResult {
  nextUserId: string | null;
  candidateCount: number;
  skippedOffline: number;
  skippedOverCapacity: number;
}

export interface InboxSettings {
  defaultChatStatus: string;
  autoCloseEnabled: boolean;
  autoCloseAfterMin: number;
  archiveAfterDays: number;
  retentionDays: number;
  maxChatsPerModerator: number;
  allowTransfer: boolean;
  requireNoteOnClose: boolean;
  notifyOnNewChat: boolean;
  notifyOnTransfer: boolean;
  notifyOnClose: boolean;
  browserPushEnabled: boolean;
  soundEnabled: boolean;
  soundUrl?: string;
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string;
}

export type FeedbackType = 'success' | 'error';

export interface Feedback {
  type: FeedbackType;
  text: string;
}