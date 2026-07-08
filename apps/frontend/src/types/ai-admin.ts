export interface AiKey {
  id: string;
  name: string;
  provider: string;
  api_key?: string;
  api_key_masked?: string;
  key_type: string;
  is_active: boolean;
  priority?: number;
  companyId?: string;
}

export interface AiProvider {
  name: string;
  display_name: string;
  adapter_type: string;
  base_url: string;
  default_model: string;
  is_active: boolean;
}

export interface CreateAiKeyPayload {
  provider: string;
  name: string;
  api_key: string;
  models?: string[];
}

export interface AiKeyLog {
  id: string;
  provider: string;
  key_id?: string;
  action: string;
  status: string;
  model?: string;
  latency_ms?: number;
  error?: string;
  company_id?: string;
  created_at: string;
}

export interface AiTestResult {
  ok?: boolean;
  success?: boolean;
  latency_ms?: number;
  model?: string;
  reply?: string;
  [key: string]: unknown;
}
