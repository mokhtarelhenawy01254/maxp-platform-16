export interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  toolCalls?: Array<{
    tool: string;
    status: string;
    result?: any;
  }>;
  timestamp: string | Date;
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
