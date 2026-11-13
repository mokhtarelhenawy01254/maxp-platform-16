export type FlowSubId =
  | 'acquisition'
  | 'attendance'
  | 'placement'
  | 'retention';

export type ChannelType = 'ALL' | 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM';

export type WindowState = 'IN_WINDOW_24H' | 'OUT_OF_WINDOW';

export type NodeCategory =
  | 'trigger'
  | 'window'
  | 'brain'
  | 'data'
  | 'interactive'
  | 'payment'
  | 'notify'
  | 'handover';

export interface FlowNode {
  id: string;
  stepNumber: number;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  category: NodeCategory;
  assignedTool: string;
  toolKey: string;
  windowRule: 'BOTH' | 'IN_24H_ONLY' | 'OUT_24H_ONLY';
  iconName: string;
  status: 'ACTIVE' | 'STANDBY' | 'AUTOMATED';
  detailsAr: string;
  detailsEn: string;
  nextStepIds?: string[];
  badges?: string[];
}

export interface SubFlowDefinition {
  id: FlowSubId;
  titleAr: string;
  titleEn: string;
  shortDescAr: string;
  shortDescEn: string;
  targetOutcomeAr: string;
  targetOutcomeEn: string;
  stageBadgeAr: string;
  stageBadgeEn: string;
  channelBadges: string[];
  windowFocus: 'IN_24H' | 'HYBRID' | 'OUT_24H';
  nodes: FlowNode[];
}

export interface FlowToolItem {
  id: string;
  nameAr: string;
  nameEn: string;
  categoryAr: string;
  categoryEn: string;
  iconName: string;
  status: 'ACTIVE' | 'STANDBY';
  statusBadgeAr: string;
  statusBadgeEn: string;
  descriptionAr: string;
  descriptionEn: string;
  connectedSubFlows: FlowSubId[];
}

export interface SimulatorTraceStep {
  step: number;
  nodeTitleAr: string;
  toolUsed: string;
  windowState: WindowState;
  resultAr: string;
  delayMs: number;
  payload?: any;
}

export interface SimulatorScenario {
  id: string;
  titleAr: string;
  titleEn: string;
  channel: ChannelType;
  windowState: WindowState;
  parentName: string;
  studentName: string;
  studentAge: number;
  incomingMessage: string;
  expectedFlowId: FlowSubId;
  traceSteps: SimulatorTraceStep[];
  outboundPreview: {
    channel: ChannelType;
    messageText: string;
    actionButtons?: string[];
    isMetaUtilityTemplate?: boolean;
    templateName?: string;
  };
}

export interface EducationFlowSettings {
  aiAutoReply: boolean;
  pushFirstSaveWhatsApp: boolean;
  strict24hEnforcement: boolean;
  notifyTeacherOnSchedule: boolean;
  autoRecoverNoShow: boolean;
  renewalAlertDaysBefore: number;
}
