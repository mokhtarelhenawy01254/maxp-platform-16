export type FlowNodeType =
  | 'trigger'
  | 'message'
  | 'delay'
  | 'condition'
  | 'action';

export type FlowCategory =
  | 'all'
  | 'demo_booking'
  | 'attendance'
  | 'enrollment'
  | 'retention';

export type EducationChannelType =
  | 'WHATSAPP_BAILEYS'
  | 'WHATSAPP_WABA'
  | 'FACEBOOK_MESSENGER'
  | 'INSTAGRAM_DIRECT'
  | 'PUSH_FIRST';

export type MetaWindowPolicy =
  | 'INSIDE_24H'
  | 'OUTSIDE_24H_HSM'
  | 'MESSAGE_TAG_EVENT_UPDATE'
  | 'NOT_APPLICABLE';

export interface FlowMessageButton {
  id: string;
  label: string;
  actionType?: 'NAVIGATE' | 'OPEN_URL' | 'CALL_PHONE';
  targetNodeId?: string;
  url?: string;
}

export interface CanvasNodeData {
  id: string;
  type: FlowNodeType;
  title: string;
  subtitle?: string;
  channel?: EducationChannelType | 'WHATSAPP' | 'MESSENGER' | 'SYSTEM' | 'SMS';
  windowPolicy?: MetaWindowPolicy;
  metaTemplateName?: string;
  messageText?: string;
  buttons?: FlowMessageButton[];
  footerNote?: string;
  delayText?: string;
  delayDetail?: string;
  conditionQuestion?: string;
  branches?: {
    yes: { label: string; targetId: string };
    no: { label: string; targetId: string };
  };
  stepNumber?: number;
  category: FlowCategory;
  badges?: string[];
  x?: number;
  y?: number;
  stats?: {
    enteredCount: number;
    deliveredCount: number;
    responseRate: number;
  };
}

export interface FlowConnection {
  fromId: string;
  toId: string;
  fromPort?: 'bottom' | 'yes' | 'no';
  toPort?: 'top';
  color?: string;
  label?: string;
}

export interface FlowSubJourney {
  id: FlowCategory;
  name: string;
  description: string;
  nodeIds: string[];
}

export interface EducationFlowRecord {
  id: string;
  name: string;
  description: string;
  category: FlowCategory;
  triggerEvent: string;
  triggerLabel: string;
  isEnabled: boolean;
  channels: EducationChannelType[];
  totalEnrolled: number;
  deliveryRate: number;
  responseRate: number;
  nodeCount: number;
  updatedAt: string;
}

export interface SmartVariableItem {
  key: string;
  label: string;
  category: 'student' | 'session' | 'demoday' | 'billing';
  sample: string;
}

