export interface ExecutiveContext {
  pathname: string;
  pageTitle: string;
  businessType?: string | null;
  activeApps?: string[];
  entityId?: string | null;
  entityType?: string | null;
  userRole?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  currency?: string;
}

export interface ActionCardData {
  id: string;
  toolCallId?: string;
  title: string;
  actionType: 'price_update' | 'order_confirm' | 'order_cancel' | 'discount_create' | 'inventory_adjust' | 'shipping_update' | 'learned_rule' | 'agent_skill' | 'agent_spawn' | 'generic';
  summary: string;
  parameters: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
  error?: string;
}

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  toolCalls?: Array<{
    id?: string;
    name: string;
    arguments?: Record<string, any>;
    status?: 'running' | 'completed' | 'failed';
    output?: any;
  }>;
  actionCards?: ActionCardData[];
  telemetry?: {
    model?: string;
    latency_ms?: number;
    tokens?: number;
  };
}

export interface CopilotSession {
  id: string;
  title: string;
  createdAt?: string;
  updatedAt: string;
  messages?: CopilotMessage[];
}

export interface QuickPrompt {
  id: string;
  label: string;
  prompt: string;
  category?: string;
}
