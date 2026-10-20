export type CompanyUser = {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  phone?: string;
};

export type TaskCredential = {
  id: string;
  name: string;
  description: string | null;
  ownershipType: 'USER' | 'COMPANY';
  userId: string | null;
  userName: string | null;
  defaultActingUserId: string | null;
  defaultActingUserName: string | null;
  scopes: string[];
  isActive: boolean;
  keyPrefixMasked: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskWebhook = {
  id: string;
  name: string;
  targetUrl: string;
  providerType: 'GENERIC' | 'OPENCLAW';
  providerConfig: Partial<OpenClawProviderConfig>;
  subscribedEvents: string[];
  customHeaders: Record<string, string>;
  isActive: boolean;
  hasSigningSecret: boolean;
  signingSecretMasked: string | null;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
};

export type WebhookDelivery = {
  id: string;
  event: string;
  requestBody: string;
  responseStatus: number | null;
  responseBody: string | null;
  success: boolean;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type RevealedSecret = {
  title: string;
  description: string;
  value: string;
};

export type CredentialFormState = {
  name: string;
  description: string;
  ownershipType: 'COMPANY' | 'USER';
  actorUserId: string;
  scopes: string[];
  expiresAt: string;
  isActive: boolean;
};

export type WebhookSecretMode = 'auto' | 'custom' | 'none' | 'keep' | 'rotate';
export type WebhookProviderType = 'GENERIC' | 'OPENCLAW';
export type OpenClawWakeMode = 'now' | 'next-heartbeat';
export type OpenClawSessionMode = 'default' | 'task-scoped';
export type OpenClawEnvironment = 'local' | 'production';

export type OpenClawProviderConfig = {
  name: string;
  agentId: string;
  wakeMode: OpenClawWakeMode;
  deliver: boolean;
  channel: string;
  to: string;
  model: string;
  thinking: string;
  timeoutSeconds: number | null;
  sessionMode: OpenClawSessionMode;
  sessionKeyPrefix: string;
};

export type WebhookFormState = {
  name: string;
  targetUrl: string;
  providerType: WebhookProviderType;
  providerConfig: {
    name: string;
    agentId: string;
    wakeMode: OpenClawWakeMode;
    deliver: boolean;
    channel: string;
    to: string;
    model: string;
    thinking: string;
    timeoutSeconds: string;
    sessionMode: OpenClawSessionMode;
    sessionKeyPrefix: string;
  };
  subscribedEvents: string[];
  customHeaders: string;
  secretMode: WebhookSecretMode;
  signingSecret: string;
  isActive: boolean;
};

export type OpenClawQuickSetupState = {
  environment: OpenClawEnvironment;
  name: string;
  baseUrl: string;
  hookToken: string;
  agentId: string;
  wakeMode: OpenClawWakeMode;
  sessionMode: OpenClawSessionMode;
  deliver: boolean;
};

export type OpenClawProfile = {
  id: string;
  environment: OpenClawEnvironment;
  name: string;
  baseUrl: string;
  agentId: string;
  wakeMode: OpenClawWakeMode;
  sessionMode: OpenClawSessionMode;
  deliver: boolean;
  hasHookToken: boolean;
  hookTokenMasked: string | null;
  createdAt: string;
  updatedAt: string;
  hookToken?: string;
};

export type SaveWebhookOptions = {
  formState?: WebhookFormState;
  webhookToEdit?: TaskWebhook | null;
  resetAfterSave?: boolean;
  testAfterSave?: boolean;
};

export type OpenClawQuickSetupAction = 'create' | 'create-test';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  secret?: {
    apiKey?: string;
    signingSecret?: string;
  } | null;
  pagination?: Pagination;
};

export type TestWebhookResult = {
  success: boolean;
  attempted: number;
  delivered: number;
  failed: number;
  endpointId: string;
  responseStatus: number | null;
  errorMessage: string | null;
};

export type TestWebhookResponse = {
  webhookId: string;
  event: string;
  result: TestWebhookResult;
};

export type RetryWebhookDeliveryResult = {
  success: boolean;
  attempted: number;
  delivered: number;
  failed: number;
  endpointId: string;
  deliveryId: string;
  retriedFromDeliveryId: string;
  responseStatus: number | null;
  errorMessage: string | null;
};

export type RetryWebhookDeliveryResponse = {
  webhookId: string;
  deliveryId: string;
  result: RetryWebhookDeliveryResult;
};

export type DeliveryFilter = 'all' | 'success' | 'failed';

export interface TaskIntegrationsTabProps {
  users: CompanyUser[];
}
