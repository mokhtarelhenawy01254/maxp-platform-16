export interface AgentTelemetry {
  latency_ms?: number;
  tokens?: number;
  model?: string;
  p95_sla?: string;
  status?: string;
}

export interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  toolCalls?: Array<{
    tool?: string;
    name?: string;
    status?: string;
    result?: any;
    args?: any;
  }>;
  telemetry?: AgentTelemetry;
  timestamp: string | Date;
  attachments?: Array<{
    type: "image" | "video" | "audio" | "file";
    url: string;
    name?: string;
    size?: number;
  }>;
}

export interface DraftItem {
  draft_id: string;
  angle: string;
  campaign_name: string;
  headline: string;
  primary_text: string;
  budget_amount: number;
  status: string;
}

export interface CopilotSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface QuickPrompt {
  label: string;
  prompt: string;
}
