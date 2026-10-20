import type {
  CompanyUser,
  CredentialFormState,
  OpenClawEnvironment,
  OpenClawProfile,
  OpenClawProviderConfig,
  OpenClawQuickSetupState,
  OpenClawSessionMode,
  OpenClawWakeMode,
  WebhookFormState,
  WebhookProviderType,
} from '../types/taskIntegrationTypes';

export const TASK_SCOPE_OPTIONS = [
  { value: 'tasks:read', label: 'قراءة المهام' },
  { value: 'tasks:write', label: 'إنشاء وتحديث حالة المهام' },
  { value: 'tasks:update', label: 'تعديل بيانات المهام' },
];

export const TASK_WEBHOOK_EVENTS = [
  { value: 'task.created', label: 'إنشاء مهمة' },
  { value: 'task.updated', label: 'تعديل مهمة' },
  { value: 'task.status_changed', label: 'تغيير الحالة' },
  { value: 'task.deleted', label: 'حذف مهمة' },
];

export const WEBHOOK_PROVIDER_OPTIONS: {
  value: WebhookProviderType;
  label: string;
  description: string;
}[] = [
  {
    value: 'GENERIC',
    label: 'Webhook عامة',
    description: 'ترسل payload نظام المهام الحالية كما هي إلى أي نظام خارجي.',
  },
  {
    value: 'OPENCLAW',
    label: 'OpenClaw',
    description: 'ترسل مباشرة إلى OpenClaw /hooks/agent بصيغة جاهزة لكل شركة.',
  },
];

export const OPENCLAW_WAKE_MODE_OPTIONS: {
  value: OpenClawWakeMode;
  label: string;
}[] = [
  { value: 'now', label: 'فورًا' },
  { value: 'next-heartbeat', label: 'مع heartbeat التالية' },
];

export const OPENCLAW_SESSION_MODE_OPTIONS: {
  value: OpenClawSessionMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'default',
    label: 'جلسة ثابتة',
    description:
      'الأكثر أمانًا. يعتمد على hooks.defaultSessionKey داخل OpenClaw.',
  },
  {
    value: 'task-scoped',
    label: 'جلسة لكل مهمة',
    description:
      'يعزل كل مهمة في session مستقلة. يحتاج allowRequestSessionKey=true داخل OpenClaw.',
  },
];

export const OPENCLAW_CHANNEL_OPTIONS = [
  { value: 'last', label: 'آخر قناة' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'signal', label: 'Signal' },
  { value: 'imessage', label: 'iMessage' },
  { value: 'irc', label: 'IRC' },
  { value: 'googlechat', label: 'Google Chat' },
  { value: 'line', label: 'LINE' },
];

export const OPENCLAW_ENVIRONMENT_OPTIONS: {
  value: OpenClawEnvironment;
  label: string;
  description: string;
}[] = [
  {
    value: 'local',
    label: 'تطوير محلي',
    description:
      'مثالي عند تشغيل OpenClaw على نفس الجهاز أو نفس الشبكة المحلية.',
  },
  {
    value: 'production',
    label: 'إنتاج',
    description: 'للدومين النهائي أو reverse proxy الآمن عبر HTTPS.',
  },
];

export const MANAGEMENT_ROLES = ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'];

export const toDateTimeInputValue = (value?: string | null): string => {
  if (!value) return '';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '';

  const localDate = new Date(
    parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return 'غير متوفر';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'غير متوفر';

  return parsedDate.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const buildUserLabel = (user: CompanyUser): string =>
  user.name || `${user.firstName} ${user.lastName}`.trim();

export const createInitialCredentialForm = (
  defaultUserId: string,
): CredentialFormState => ({
  name: '',
  description: '',
  ownershipType: 'COMPANY',
  actorUserId: defaultUserId,
  scopes: ['tasks:read', 'tasks:write'],
  expiresAt: '',
  isActive: true,
});

export const createInitialWebhookForm = (): WebhookFormState => ({
  name: '',
  targetUrl: '',
  providerType: 'GENERIC',
  providerConfig: {
    name: 'Tasks',
    agentId: '',
    wakeMode: 'now',
    deliver: false,
    channel: 'last',
    to: '',
    model: '',
    thinking: '',
    timeoutSeconds: '',
    sessionMode: 'default',
    sessionKeyPrefix: 'hook:task:',
  },
  subscribedEvents: TASK_WEBHOOK_EVENTS.map((eventItem) => eventItem.value),
  customHeaders: '',
  secretMode: 'auto',
  signingSecret: '',
  isActive: true,
});

export const createOpenClawLocalPreset = (): Partial<WebhookFormState> => ({
  providerType: 'OPENCLAW',
  targetUrl: 'http://127.0.0.1:18789/hooks/agent',
  customHeaders: JSON.stringify(
    {
      Authorization: 'Bearer OPENCLAW_HOOKS_TOKEN',
    },
    null,
    2,
  ),
  secretMode: 'none',
  providerConfig: {
    name: 'Tasks',
    agentId: 'main',
    wakeMode: 'now',
    deliver: false,
    channel: 'last',
    to: '',
    model: '',
    thinking: '',
    timeoutSeconds: '',
    sessionMode: 'default',
    sessionKeyPrefix: 'hook:task:',
  },
});

export const createOpenClawProductionPreset = (): Partial<WebhookFormState> => ({
  providerType: 'OPENCLAW',
  targetUrl: 'https://openclaw.example.com/hooks/agent',
  customHeaders: JSON.stringify(
    {
      Authorization: 'Bearer OPENCLAW_PROD_HOOKS_TOKEN',
    },
    null,
    2,
  ),
  secretMode: 'none',
  providerConfig: {
    name: 'Tasks',
    agentId: 'main',
    wakeMode: 'now',
    deliver: false,
    channel: 'last',
    to: '',
    model: '',
    thinking: '',
    timeoutSeconds: '',
    sessionMode: 'default',
    sessionKeyPrefix: 'hook:task:',
  },
});

export const getDefaultOpenClawBaseUrl = (
  environment: OpenClawEnvironment,
): string =>
  environment === 'local'
    ? 'http://127.0.0.1:18789'
    : 'https://openclaw.example.com';

export const getDefaultOpenClawName = (
  environment: OpenClawEnvironment,
): string =>
  environment === 'local'
    ? 'OpenClaw Tasks Sync - Local'
    : 'OpenClaw Tasks Sync - Production';

export const createInitialOpenClawQuickSetup = (): OpenClawQuickSetupState => ({
  environment: 'local',
  name: getDefaultOpenClawName('local'),
  baseUrl: getDefaultOpenClawBaseUrl('local'),
  hookToken: '',
  agentId: 'main',
  wakeMode: 'now',
  sessionMode: 'default',
  deliver: false,
});

export const toOpenClawQuickSetupState = (
  profile: Pick<
    OpenClawProfile,
    | 'environment'
    | 'name'
    | 'baseUrl'
    | 'agentId'
    | 'wakeMode'
    | 'sessionMode'
    | 'deliver'
  > & { hookToken?: string | null },
): OpenClawQuickSetupState => ({
  environment: profile.environment,
  name: profile.name || getDefaultOpenClawName(profile.environment),
  baseUrl: profile.baseUrl || getDefaultOpenClawBaseUrl(profile.environment),
  hookToken: profile.hookToken || '',
  agentId: profile.agentId || 'main',
  wakeMode: profile.wakeMode || 'now',
  sessionMode: profile.sessionMode || 'default',
  deliver: Boolean(profile.deliver),
});

export const prettifyJson = (
  value: Record<string, string> | null | undefined,
): string => {
  if (!value || Object.keys(value).length === 0) {
    return '';
  }
  return JSON.stringify(value, null, 2);
};

export const parseCustomHeaders = (
  value: string,
): { isValid: boolean; parsed: Record<string, string>; error?: string } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { isValid: true, parsed: {} };
  }

  try {
    const parsedValue = JSON.parse(trimmed) as unknown;
    if (
      !parsedValue ||
      Array.isArray(parsedValue) ||
      typeof parsedValue !== 'object'
    ) {
      return {
        isValid: false,
        parsed: {},
        error: 'صيغة الـ headers يجب أن تكون JSON object',
      };
    }

    const normalized = Object.fromEntries(
      Object.entries(parsedValue as Record<string, unknown>).map(
        ([key, headerValue]) => [key, String(headerValue)],
      ),
    );

    return { isValid: true, parsed: normalized };
  } catch (_error) {
    return {
      isValid: false,
      parsed: {},
      error: 'تعذر قراءة customHeaders. استخدم JSON صحيحًا',
    };
  }
};

export const hasOpenClawAuthHeader = (
  headers: Record<string, string>,
): boolean =>
  Object.keys(headers).some((key) => {
    const normalizedKey = key.trim().toLowerCase();
    return (
      normalizedKey === 'authorization' || normalizedKey === 'x-openclaw-token'
    );
  });

export const normalizeOpenClawAgentUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/hooks/agent') ? trimmed : `${trimmed}/hooks/agent`;
};

export const buildWebhookProviderConfigPayload = (
  formState: WebhookFormState,
): OpenClawProviderConfig => ({
  name: formState.providerConfig.name.trim() || 'Tasks',
  agentId: formState.providerConfig.agentId.trim(),
  wakeMode: formState.providerConfig.wakeMode,
  deliver: formState.providerConfig.deliver,
  channel: formState.providerConfig.channel,
  to: formState.providerConfig.to.trim(),
  model: formState.providerConfig.model.trim(),
  thinking: formState.providerConfig.thinking.trim(),
  timeoutSeconds: formState.providerConfig.timeoutSeconds.trim()
    ? Number(formState.providerConfig.timeoutSeconds.trim())
    : null,
  sessionMode: formState.providerConfig.sessionMode,
  sessionKeyPrefix:
    formState.providerConfig.sessionMode === 'task-scoped'
      ? formState.providerConfig.sessionKeyPrefix.trim() || 'hook:task:'
      : 'hook:task:',
});

export const toWebhookFormProviderConfig = (
  providerConfig?: Partial<OpenClawProviderConfig> | null,
): WebhookFormState['providerConfig'] => ({
  name: providerConfig?.name || 'Tasks',
  agentId: providerConfig?.agentId || '',
  wakeMode: providerConfig?.wakeMode || 'now',
  deliver: Boolean(providerConfig?.deliver),
  channel: providerConfig?.channel || 'last',
  to: providerConfig?.to || '',
  model: providerConfig?.model || '',
  thinking: providerConfig?.thinking || '',
  timeoutSeconds:
    providerConfig?.timeoutSeconds !== null &&
    providerConfig?.timeoutSeconds !== undefined
      ? String(providerConfig.timeoutSeconds)
      : '',
  sessionMode: providerConfig?.sessionMode || 'default',
  sessionKeyPrefix: providerConfig?.sessionKeyPrefix || 'hook:task:',
});

export const buildTaskSnippets = (
  externalApiBaseUrl: string,
  sampleAssignedUserId: string,
) => ({
  listTasksSnippet: `curl -X GET "${externalApiBaseUrl}" \\\n  -H "x-api-key: YOUR_API_KEY"`,
  createTaskSnippet: `curl -X POST "${externalApiBaseUrl}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -d '{\n    "title": "متابعة عميل خارجي",\n    "description": "تم إنشاء المهمة من نظام شريك",\n    "priority": "HIGH",\n    "assignedTo": "${sampleAssignedUserId}"\n  }'`,
  updateTaskSnippet: `curl -X PATCH "${externalApiBaseUrl}/TASK_ID" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -d '{\n    "title": "متابعة عميل خارجي معدلة",\n    "description": "تم تحديث وصف وتفاصيل المهمة من التكامل الخارجي",\n    "priority": "HIGH",\n    "dueDate": "2026-10-15T15:00:00.000Z",\n    "tags": ["external", "updated"],\n    "assignedTo": "${sampleAssignedUserId}"\n  }'`,
  updateStatusSnippet: `curl -X PATCH "${externalApiBaseUrl}/TASK_ID/status" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: YOUR_API_KEY" \\\n  -d '{\n    "status": "IN_PROGRESS",\n    "progress": 40\n  }'`,
});

