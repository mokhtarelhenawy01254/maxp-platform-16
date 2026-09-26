export interface TabContext {
  title: string;
  url: string;
  favIconUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tabContext?: TabContext;
  status?: 'sending' | 'success' | 'error';
}

export interface ExtensionAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  badge: string;
  description: string;
  suggestedPrompts: string[];
}

export interface UserSession {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId?: string;
  };
}

export interface ExtensionSettings {
  serverUrl: string;
  selectedAgentSlug: string;
  includeTabContextByDefault: boolean;
}
