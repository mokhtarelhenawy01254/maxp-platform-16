export interface AiKey {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  key_type: string;
  is_active: boolean;
  priority?: number;
  companyId?: string;
}

export type AiProvider = string;

export interface CreateAiKeyPayload {
  provider: string;
  name: string;
  api_key: string;
}

export interface AiTestResult {
  ok?: boolean;
  success?: boolean;
  latency_ms?: number;
  model?: string;
  reply?: string;
  [key: string]: unknown;
}
