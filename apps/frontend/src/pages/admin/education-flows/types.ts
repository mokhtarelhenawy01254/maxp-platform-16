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

export interface FlowMessageButton {
  id: string;
  label: string;
  targetNodeId?: string;
}

export interface CanvasNodeData {
  id: string;
  type: FlowNodeType;
  title: string;
  subtitle?: string;
  channel?: 'WHATSAPP' | 'MESSENGER' | 'SYSTEM' | 'SMS';
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
