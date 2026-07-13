export interface AiKey {
  id: string;
  name: string;
  provider: string;
  api_key?: string;
  api_key_masked?: string;
  base_url?: string;
  key_type: string;
  company_id?: string;
  is_active: boolean;
  models?: { id: string; model_name: string; is_enabled: boolean }[];
  max_requests_per_day: number;
  current_usage: number;
  priority: number;
  last_used_at?: string;
  last_tested_at?: string;
  last_test_status?: string;
  created_at?: string;
  updated_at?: string;
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
  key_type?: string;
  max_requests_per_day?: number;
  priority?: number;
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
  response?: string;
  company_id?: string;
  created_at: string;
}

export interface AiTestResult {
  ok?: boolean;
  success?: boolean;
  status?: string;
  latency_ms?: number;
  model?: string;
  reply?: string;
  error?: string;
  [key: string]: unknown;
}

export interface AiKeyUpdatePayload {
  name?: string;
  api_key?: string;
  base_url?: string;
  max_requests_per_day?: number;
  priority?: number;
  is_active?: boolean;
  key_type?: string;
  company_id?: string;
}

export interface GlobalConfig {
  id: string;
  default_provider: string | null;
  enable_failover: boolean;
  provider_priority: string[];
  settings: Record<string, unknown>;
  updated_at: string;
}

export interface DashboardStats {
  total_keys: number;
  active_keys: number;
  keys_by_provider: Record<string, number>;
  keys_by_company: Record<string, number>;
  requests_today: number;
  failures_today: number;
  last_24h_success_rate: number;
}
