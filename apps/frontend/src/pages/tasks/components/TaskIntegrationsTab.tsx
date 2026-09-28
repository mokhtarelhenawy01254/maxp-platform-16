import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import i18n from "../../../i18n";
import { tToast } from "../../../utils/i18n-toast";
import { buildApiUrl, buildAppUrl } from "../../../utils/urlHelper";
import tokenManager from "../../../utils/tokenManager";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
  KeyIcon,
  LinkIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuthSimple";

type CompanyUser = {
  id: string;
  firstName: string;
  lastName: string;
  name?: string;
  phone?: string;
};

type TaskCredential = {
  id: string;
  name: string;
  description: string | null;
  ownershipType: "USER" | "COMPANY";
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

type TaskWebhook = {
  id: string;
  name: string;
  targetUrl: string;
  providerType: "GENERIC" | "OPENCLAW";
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

type WebhookDelivery = {
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

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type RevealedSecret = {
  title: string;
  description: string;
  value: string;
};

type CredentialFormState = {
  name: string;
  description: string;
  ownershipType: "COMPANY" | "USER";
  actorUserId: string;
  scopes: string[];
  expiresAt: string;
  isActive: boolean;
};

type WebhookSecretMode = "auto" | "custom" | "none" | "keep" | "rotate";
type WebhookProviderType = "GENERIC" | "OPENCLAW";
type OpenClawWakeMode = "now" | "next-heartbeat";
type OpenClawSessionMode = "default" | "task-scoped";
type OpenClawEnvironment = "local" | "production";

type OpenClawProviderConfig = {
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

type WebhookFormState = {
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

type OpenClawQuickSetupState = {
  environment: OpenClawEnvironment;
  name: string;
  baseUrl: string;
  hookToken: string;
  agentId: string;
  wakeMode: OpenClawWakeMode;
  sessionMode: OpenClawSessionMode;
  deliver: boolean;
};

type OpenClawProfile = {
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

type SaveWebhookOptions = {
  formState?: WebhookFormState;
  webhookToEdit?: TaskWebhook | null;
  resetAfterSave?: boolean;
  testAfterSave?: boolean;
};

type OpenClawQuickSetupAction = "create" | "create-test";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  secret?: {
    apiKey?: string;
    signingSecret?: string;
  } | null;
  pagination?: Pagination;
};

type TestWebhookResult = {
  success: boolean;
  attempted: number;
  delivered: number;
  failed: number;
  endpointId: string;
  responseStatus: number | null;
  errorMessage: string | null;
};

type TestWebhookResponse = {
  webhookId: string;
  event: string;
  result: TestWebhookResult;
};

type RetryWebhookDeliveryResult = {
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

type RetryWebhookDeliveryResponse = {
  webhookId: string;
  deliveryId: string;
  result: RetryWebhookDeliveryResult;
};

type DeliveryFilter = "all" | "success" | "failed";

interface TaskIntegrationsTabProps {
  users: CompanyUser[];
}

const TASK_SCOPE_OPTIONS = [
  { value: "tasks:read", label: "قراءة المهام" },
  { value: "tasks:write", label: "إنشاء وتحديث حالة المهام" },
  { value: "tasks:update", label: "تعديل بيانات المهام" },
];

const TASK_WEBHOOK_EVENTS = [
  { value: "task.created", label: "إنشاء مهمة" },
  { value: "task.updated", label: "تعديل مهمة" },
  { value: "task.status_changed", label: "تغيير الحالة" },
  { value: "task.deleted", label: "حذف مهمة" },
];
const WEBHOOK_PROVIDER_OPTIONS: {
  value: WebhookProviderType;
  label: string;
  description: string;
}[] = [
  {
    value: "GENERIC",
    label: "Webhook عامة",
    description: "ترسل payload نظام المهام الحالية كما هي إلى أي نظام خارجي.",
  },
  {
    value: "OPENCLAW",
    label: "OpenClaw",
    description: "ترسل مباشرة إلى OpenClaw /hooks/agent بصيغة جاهزة لكل شركة.",
  },
];
const OPENCLAW_WAKE_MODE_OPTIONS: { value: OpenClawWakeMode; label: string }[] =
  [
    { value: "now", label: "فورًا" },
    { value: "next-heartbeat", label: "مع heartbeat التالية" },
  ];
const OPENCLAW_SESSION_MODE_OPTIONS: {
  value: OpenClawSessionMode;
  label: string;
  description: string;
}[] = [
  {
    value: "default",
    label: "جلسة ثابتة",
    description:
      "الأكثر أمانًا. يعتمد على hooks.defaultSessionKey داخل OpenClaw.",
  },
  {
    value: "task-scoped",
    label: "جلسة لكل مهمة",
    description:
      "يعزل كل مهمة في session مستقلة. يحتاج allowRequestSessionKey=true داخل OpenClaw.",
  },
];
const OPENCLAW_CHANNEL_OPTIONS = [
  { value: "last", label: "آخر قناة" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "discord", label: "Discord" },
  { value: "slack", label: "Slack" },
  { value: "signal", label: "Signal" },
  { value: "imessage", label: "iMessage" },
  { value: "irc", label: "IRC" },
  { value: "googlechat", label: "Google Chat" },
  { value: "line", label: "LINE" },
];
const OPENCLAW_ENVIRONMENT_OPTIONS: {
  value: OpenClawEnvironment;
  label: string;
  description: string;
}[] = [
  {
    value: "local",
    label: "تطوير محلي",
    description:
      "مثالي عند تشغيل OpenClaw على نفس الجهاز أو نفس الشبكة المحلية.",
  },
  {
    value: "production",
    label: "إنتاج",
    description: "للدومين النهائي أو reverse proxy الآمن عبر HTTPS.",
  },
];

const MANAGEMENT_ROLES = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN"];

const toDateTimeInputValue = (value?: string | null): string => {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";

  const localDate = new Date(
    parsedDate.getTime() - parsedDate.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "غير متوفر";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "غير متوفر";

  return parsedDate.toLocaleString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildUserLabel = (user: CompanyUser): string =>
  user.name || `${user.firstName} ${user.lastName}`.trim();

const createInitialCredentialForm = (
  defaultUserId: string,
): CredentialFormState => ({
  name: "",
  description: "",
  ownershipType: "COMPANY",
  actorUserId: defaultUserId,
  scopes: ["tasks:read", "tasks:write"],
  expiresAt: "",
  isActive: true,
});

const createInitialWebhookForm = (): WebhookFormState => ({
  name: "",
  targetUrl: "",
  providerType: "GENERIC",
  providerConfig: {
    name: "Tasks",
    agentId: "",
    wakeMode: "now",
    deliver: false,
    channel: "last",
    to: "",
    model: "",
    thinking: "",
    timeoutSeconds: "",
    sessionMode: "default",
    sessionKeyPrefix: "hook:task:",
  },
  subscribedEvents: TASK_WEBHOOK_EVENTS.map((eventItem) => eventItem.value),
  customHeaders: "",
  secretMode: "auto",
  signingSecret: "",
  isActive: true,
});

const createOpenClawLocalPreset = (): Partial<WebhookFormState> => ({
  providerType: "OPENCLAW",
  targetUrl: "http://127.0.0.1:18789/hooks/agent",
  customHeaders: JSON.stringify(
    {
      Authorization: "Bearer OPENCLAW_HOOKS_TOKEN",
    },
    null,
    2,
  ),
  secretMode: "none",
  providerConfig: {
    name: "Tasks",
    agentId: "main",
    wakeMode: "now",
    deliver: false,
    channel: "last",
    to: "",
    model: "",
    thinking: "",
    timeoutSeconds: "",
    sessionMode: "default",
    sessionKeyPrefix: "hook:task:",
  },
});

const createOpenClawProductionPreset = (): Partial<WebhookFormState> => ({
  providerType: "OPENCLAW",
  targetUrl: "https://openclaw.example.com/hooks/agent",
  customHeaders: JSON.stringify(
    {
      Authorization: "Bearer OPENCLAW_PROD_HOOKS_TOKEN",
    },
    null,
    2,
  ),
  secretMode: "none",
  providerConfig: {
    name: "Tasks",
    agentId: "main",
    wakeMode: "now",
    deliver: false,
    channel: "last",
    to: "",
    model: "",
    thinking: "",
    timeoutSeconds: "",
    sessionMode: "default",
    sessionKeyPrefix: "hook:task:",
  },
});

const getDefaultOpenClawBaseUrl = (environment: OpenClawEnvironment): string =>
  environment === "local"
    ? "http://127.0.0.1:18789"
    : "https://openclaw.example.com";

const getDefaultOpenClawName = (environment: OpenClawEnvironment): string =>
  environment === "local"
    ? "OpenClaw Tasks Sync - Local"
    : "OpenClaw Tasks Sync - Production";

const createInitialOpenClawQuickSetup = (): OpenClawQuickSetupState => ({
  environment: "local",
  name: getDefaultOpenClawName("local"),
  baseUrl: getDefaultOpenClawBaseUrl("local"),
  hookToken: "",
  agentId: "main",
  wakeMode: "now",
  sessionMode: "default",
  deliver: false,
});

const toOpenClawQuickSetupState = (
  profile: Pick<
    OpenClawProfile,
    | "environment"
    | "name"
    | "baseUrl"
    | "agentId"
    | "wakeMode"
    | "sessionMode"
    | "deliver"
  > & { hookToken?: string | null },
): OpenClawQuickSetupState => ({
  environment: profile.environment,
  name: profile.name || getDefaultOpenClawName(profile.environment),
  baseUrl: profile.baseUrl || getDefaultOpenClawBaseUrl(profile.environment),
  hookToken: profile.hookToken || "",
  agentId: profile.agentId || "main",
  wakeMode: profile.wakeMode || "now",
  sessionMode: profile.sessionMode || "default",
  deliver: Boolean(profile.deliver),
});

const prettifyJson = (
  value: Record<string, string> | null | undefined,
): string => {
  if (!value || Object.keys(value).length === 0) {
    return "";
  }

  return JSON.stringify(value, null, 2);
};

const parseCustomHeaders = (
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
      typeof parsedValue !== "object"
    ) {
      return {
        isValid: false,
        parsed: {},
        error: "صيغة الـ headers يجب أن تكون JSON object",
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
      error: "تعذر قراءة customHeaders. استخدم JSON صحيحًا",
    };
  }
};

const hasOpenClawAuthHeader = (headers: Record<string, string>): boolean =>
  Object.keys(headers).some((key) => {
    const normalizedKey = key.trim().toLowerCase();
    return (
      normalizedKey === "authorization" || normalizedKey === "x-openclaw-token"
    );
  });

const normalizeOpenClawAgentUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/hooks/agent") ? trimmed : `${trimmed}/hooks/agent`;
};

const buildWebhookProviderConfigPayload = (
  formState: WebhookFormState,
): OpenClawProviderConfig => ({
  name: formState.providerConfig.name.trim() || "Tasks",
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
    formState.providerConfig.sessionMode === "task-scoped"
      ? formState.providerConfig.sessionKeyPrefix.trim() || "hook:task:"
      : "hook:task:",
});

const toWebhookFormProviderConfig = (
  providerConfig?: Partial<OpenClawProviderConfig> | null,
): WebhookFormState["providerConfig"] => ({
  name: providerConfig?.name || "Tasks",
  agentId: providerConfig?.agentId || "",
  wakeMode: providerConfig?.wakeMode || "now",
  deliver: Boolean(providerConfig?.deliver),
  channel: providerConfig?.channel || "last",
  to: providerConfig?.to || "",
  model: providerConfig?.model || "",
  thinking: providerConfig?.thinking || "",
  timeoutSeconds:
    providerConfig?.timeoutSeconds !== null &&
    providerConfig?.timeoutSeconds !== undefined
      ? String(providerConfig.timeoutSeconds)
      : "",
  sessionMode: providerConfig?.sessionMode || "default",
  sessionKeyPrefix: providerConfig?.sessionKeyPrefix || "hook:task:",
});

export const TaskIntegrationsTab: React.FC<TaskIntegrationsTabProps> = ({
  users,
}) => {
  const { user } = useAuth();
  const activeCompanyId = user?.companyId ?? null;
  const defaultUserId = user?.id || "";
  const canManageIntegrations = MANAGEMENT_ROLES.includes(user?.role || "");
  const integrationPageUrl = useMemo(
    () =>
      new URL(
        buildAppUrl("tasks/integrations"),
        window.location.origin,
      ).toString(),
    [],
  );
  const externalApiBaseUrl = useMemo(
    () =>
      new URL(buildApiUrl("external/tasks"), window.location.origin).toString(),
    [],
  );

  const [credentials, setCredentials] = useState<TaskCredential[]>([]);
  const [openClawProfiles, setOpenClawProfiles] = useState<OpenClawProfile[]>(
    [],
  );
  const [webhooks, setWebhooks] = useState<TaskWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeliveriesFor, setLoadingDeliveriesFor] = useState<
    string | null
  >(null);
  const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(
    null,
  );
  const [deliveriesByWebhook, setDeliveriesByWebhook] = useState<
    Record<string, WebhookDelivery[]>
  >({});
  const [deliveryFilterByWebhook, setDeliveryFilterByWebhook] = useState<
    Record<string, DeliveryFilter>
  >({});
  const [deliveryPaginationByWebhook, setDeliveryPaginationByWebhook] =
    useState<Record<string, Pagination>>({});
  const [credentialForm, setCredentialForm] = useState<CredentialFormState>(
    createInitialCredentialForm(defaultUserId),
  );
  const [webhookForm, setWebhookForm] = useState<WebhookFormState>(
    createInitialWebhookForm(),
  );
  const [openClawQuickSetup, setOpenClawQuickSetup] =
    useState<OpenClawQuickSetupState>(createInitialOpenClawQuickSetup());
  const [editingCredential, setEditingCredential] =
    useState<TaskCredential | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<TaskWebhook | null>(
    null,
  );
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [submittingCredential, setSubmittingCredential] = useState(false);
  const [submittingWebhook, setSubmittingWebhook] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(
    null,
  );
  const [openClawQuickSetupAction, setOpenClawQuickSetupAction] =
    useState<OpenClawQuickSetupAction | null>(null);
  const [savingOpenClawProfile, setSavingOpenClawProfile] = useState(false);
  const [hydratingOpenClawProfileId, setHydratingOpenClawProfileId] = useState<
    string | null
  >(null);
  const [deletingOpenClawProfileId, setDeletingOpenClawProfileId] = useState<
    string | null
  >(null);
  const [revealedSecret, setRevealedSecret] = useState<RevealedSecret | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const previousCompanyIdRef = React.useRef<string | null>(null);
  const currentOpenClawProfile = useMemo(
    () =>
      openClawProfiles.find(
        (profile) => profile.environment === openClawQuickSetup.environment,
      ) || null,
    [openClawProfiles, openClawQuickSetup.environment],
  );

  const userOptions = useMemo(
    () =>
      users
        .map((user) => ({
          id: user.id,
          label: buildUserLabel(user),
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "ar")),
    [users],
  );
  const sampleAssignedUserId = useMemo(
    () => userOptions[0]?.id || "USER_ID",
    [userOptions],
  );
  const listTasksSnippet = useMemo(
    () => `curl -X GET "${externalApiBaseUrl}" \\
  -H "x-api-key: YOUR_API_KEY"`,
    [externalApiBaseUrl],
  );
  const createTaskSnippet = useMemo(
    () => `curl -X POST "${externalApiBaseUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "title": "متابعة عميل خارجي",
    "description": "تم إنشاء المهمة من نظام شريك",
    "priority": "HIGH",
    "assignedTo": "${sampleAssignedUserId}"
  }'`,
    [externalApiBaseUrl, sampleAssignedUserId],
  );
  const updateTaskSnippet = useMemo(
    () => `curl -X PATCH "${externalApiBaseUrl}/TASK_ID" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "title": "متابعة عميل خارجي معدلة",
    "description": "تم تحديث وصف وتفاصيل المهمة من التكامل الخارجي",
    "priority": "HIGH",
    "dueDate": "2026-10-15T15:00:00.000Z",
    "tags": ["external", "updated"],
    "assignedTo": "${sampleAssignedUserId}"
  }'`,
    [externalApiBaseUrl, sampleAssignedUserId],
  );
  const updateStatusSnippet = useMemo(
    () => `curl -X PATCH "${externalApiBaseUrl}/TASK_ID/status" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "status": "IN_PROGRESS",
    "progress": 40
  }'`,
    [externalApiBaseUrl],
  );

  const requestWithAuth = async <T,>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> => {
    const token = tokenManager.getAccessToken();
    if (!token) {
      throw new Error("يجب تسجيل الدخول أولًا");
    }

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(buildApiUrl(endpoint), {
      ...options,
      headers,
    });

    const rawBody = await response.text();
    const parsedBody = rawBody
      ? (JSON.parse(rawBody) as ApiResponse<T>)
      : ({ success: response.ok } as ApiResponse<T>);

    if (!response.ok || parsedBody.success === false) {
      throw new Error(parsedBody.message || "حدث خطأ غير متوقع");
    }

    return parsedBody;
  };

  const resetCredentialForm = () => {
    setCredentialForm(createInitialCredentialForm(defaultUserId));
    setEditingCredential(null);
    setShowCredentialForm(false);
  };

  const resetWebhookForm = () => {
    setWebhookForm(createInitialWebhookForm());
    setEditingWebhook(null);
    setShowWebhookForm(false);
  };

  const applyOpenClawLocalPreset = () => {
    setWebhookForm((current) => ({
      ...current,
      ...createOpenClawLocalPreset(),
      name: current.name || "OpenClaw Tasks Sync",
    }));
    setShowWebhookForm(true);
    toast.success(
      "تم تعبئة إعدادات OpenClaw المحلية. راجع الـ token قبل الحفظ.",
    );
  };

  const applyOpenClawProductionPreset = () => {
    setWebhookForm((current) => ({
      ...current,
      ...createOpenClawProductionPreset(),
      name: current.name || "OpenClaw Tasks Sync - Production",
    }));
    setShowWebhookForm(true);
    toast.success(
      "تم تعبئة إعدادات OpenClaw للإنتاج. راجع الدومين والـ token قبل الحفظ.",
    );
  };

  const loadOpenClawProfiles = async () => {
    const response = await requestWithAuth<OpenClawProfile[]>(
      "tasks/integrations/openclaw-profiles",
    );
    setOpenClawProfiles(response.data || []);
  };

  const hydrateOpenClawProfile = async (
    profile: OpenClawProfile,
    options: { applyToState?: boolean; silent?: boolean } = {},
  ): Promise<OpenClawQuickSetupState | null> => {
    const { applyToState = true, silent = false } = options;

    try {
      setHydratingOpenClawProfileId(profile.id);
      const response = await requestWithAuth<OpenClawProfile>(
        `tasks/integrations/openclaw-profiles/${profile.id}/reveal`,
        {
          method: "POST",
        },
      );
      const hydratedProfile = response.data;

      if (!hydratedProfile?.hookToken) {
        throw new Error("تعذر تحميل Hook Token المحفوظة");
      }

      const nextState = toOpenClawQuickSetupState({
        ...hydratedProfile,
        hookToken: hydratedProfile.hookToken,
      });

      if (applyToState) {
        setOpenClawQuickSetup(nextState);
      }

      if (!silent) {
        toast.success(response.message || "تم تحميل إعداد OpenClaw المحفوظ");
      }

      return nextState;
    } catch (error) {
      if (!silent) {
        toast.error(
          error instanceof Error
            ? error.message
            : "تعذر تحميل إعداد OpenClaw المحفوظ",
        );
      }
      return null;
    } finally {
      setHydratingOpenClawProfileId(null);
    }
  };

  const saveOpenClawProfile = async () => {
    const normalizedBaseUrl = openClawQuickSetup.baseUrl.trim();
    if (!normalizedBaseUrl) {
      tToast.error("taskIntegrations.msg_a3c9");
      return;
    }

    if (
      !openClawQuickSetup.hookToken.trim() &&
      !currentOpenClawProfile?.hasHookToken
    ) {
      tToast.error("taskIntegrations.msg_9d3f");
      return;
    }

    try {
      setSavingOpenClawProfile(true);
      const payload = {
        environment: openClawQuickSetup.environment,
        name:
          openClawQuickSetup.name.trim() ||
          getDefaultOpenClawName(openClawQuickSetup.environment),
        baseUrl: normalizedBaseUrl,
        hookToken: openClawQuickSetup.hookToken.trim() || undefined,
        agentId: openClawQuickSetup.agentId.trim(),
        wakeMode: openClawQuickSetup.wakeMode,
        sessionMode: openClawQuickSetup.sessionMode,
        deliver: openClawQuickSetup.deliver,
      };

      const response = currentOpenClawProfile
        ? await requestWithAuth<OpenClawProfile>(
            `tasks/integrations/openclaw-profiles/${currentOpenClawProfile.id}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            },
          )
        : await requestWithAuth<OpenClawProfile>(
            "tasks/integrations/openclaw-profiles",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );

      toast.success(
        response.message ||
          (currentOpenClawProfile
            ? "تم تحديث إعداد OpenClaw المحفوظ"
            : "تم حفظ إعداد OpenClaw"),
      );
      await loadOpenClawProfiles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ إعداد OpenClaw",
      );
    } finally {
      setSavingOpenClawProfile(false);
    }
  };

  const deleteOpenClawProfile = async (profile: OpenClawProfile) => {
    if (
      !window.confirm(`سيتم حذف الإعداد "${profile.name}". هل تريد المتابعة؟`)
    ) {
      return;
    }

    try {
      setDeletingOpenClawProfileId(profile.id);
      const response = await requestWithAuth<null>(
        `tasks/integrations/openclaw-profiles/${profile.id}`,
        {
          method: "DELETE",
        },
      );
      toast.success(response.message || "تم حذف إعداد OpenClaw");
      await loadOpenClawProfiles();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حذف إعداد OpenClaw",
      );
    } finally {
      setDeletingOpenClawProfileId(null);
    }
  };

  const resolveOpenClawQuickSetupState =
    async (): Promise<OpenClawQuickSetupState | null> => {
      if (openClawQuickSetup.hookToken.trim()) {
        return openClawQuickSetup;
      }

      if (!currentOpenClawProfile) {
        return openClawQuickSetup;
      }

      return hydrateOpenClawProfile(currentOpenClawProfile, {
        applyToState: false,
        silent: true,
      });
    };

  const buildOpenClawQuickSetupForm =
    async (): Promise<WebhookFormState | null> => {
      const quickSetupState =
        (await resolveOpenClawQuickSetupState()) || openClawQuickSetup;
      const targetUrl = normalizeOpenClawAgentUrl(quickSetupState.baseUrl);
      if (!targetUrl) {
        tToast.error("taskIntegrations.msg_43bd");
        return null;
      }

      if (!quickSetupState.hookToken.trim()) {
        tToast.error("taskIntegrations.msg_a6c0");
        return null;
      }

      return {
        name:
          quickSetupState.name.trim() ||
          getDefaultOpenClawName(quickSetupState.environment),
        targetUrl,
        providerType: "OPENCLAW",
        providerConfig: {
          name: "Tasks",
          agentId: quickSetupState.agentId.trim(),
          wakeMode: quickSetupState.wakeMode,
          deliver: quickSetupState.deliver,
          channel: "last",
          to: "",
          model: "",
          thinking: "",
          timeoutSeconds: "",
          sessionMode: quickSetupState.sessionMode,
          sessionKeyPrefix: "hook:task:",
        },
        subscribedEvents: TASK_WEBHOOK_EVENTS.map(
          (eventItem) => eventItem.value,
        ),
        customHeaders: JSON.stringify(
          {
            Authorization: `Bearer ${quickSetupState.hookToken.trim()}`,
          },
          null,
          2,
        ),
        secretMode: "none",
        signingSecret: "",
        isActive: true,
      };
    };

  const applyOpenClawQuickSetup = async () => {
    const nextForm = await buildOpenClawQuickSetupForm();
    if (!nextForm) {
      return;
    }

    setWebhookForm(nextForm);
    setEditingWebhook(null);
    setShowWebhookForm(true);
    tToast.success("taskIntegrations.msg_e3f1");
  };

  const loadCredentials = async () => {
    const response = await requestWithAuth<TaskCredential[]>(
      "tasks/integrations/credentials",
    );
    setCredentials(response.data || []);
  };

  const loadWebhooks = async () => {
    const response = await requestWithAuth<TaskWebhook[]>(
      "tasks/integrations/webhooks",
    );
    setWebhooks(response.data || []);
  };

  const loadIntegrations = async () => {
    if (!activeCompanyId || !canManageIntegrations) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      await Promise.all([
        loadCredentials(),
        loadOpenClawProfiles(),
        loadWebhooks(),
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تحميل تكاملات المهام";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Load the integrations workspace once when the page opens.
  useEffect(() => {
    if (!activeCompanyId) {
      setCredentials([]);
      setOpenClawProfiles([]);
      setWebhooks([]);
      setDeliveriesByWebhook({});
      setDeliveryFilterByWebhook({});
      setDeliveryPaginationByWebhook({});
      setExpandedWebhookId(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    void loadIntegrations();
  }, [activeCompanyId, canManageIntegrations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeCompanyId) {
      return;
    }

    const previousCompanyId = previousCompanyIdRef.current;
    previousCompanyIdRef.current = activeCompanyId;

    if (!previousCompanyId || previousCompanyId === activeCompanyId) {
      return;
    }

    setExpandedWebhookId(null);
    setDeliveriesByWebhook({});
    setDeliveryFilterByWebhook({});
    setDeliveryPaginationByWebhook({});
    setRevealedSecret(null);
    setEditingCredential(null);
    setEditingWebhook(null);
    setShowCredentialForm(false);
    setShowWebhookForm(false);
    setCredentialForm(createInitialCredentialForm(defaultUserId));
    setWebhookForm(createInitialWebhookForm());
  }, [activeCompanyId, defaultUserId]);

  useEffect(() => {
    if (editingCredential) {
      return;
    }

    const fallbackActorUserId = userOptions[0]?.id || defaultUserId;
    setCredentialForm((current) => {
      if (current.actorUserId && userOptions.some((option) => option.id === current.actorUserId)) {
        return current;
      }

      if (current.actorUserId === fallbackActorUserId) {
        return current;
      }

      return {
        ...current,
        actorUserId: fallbackActorUserId,
      };
    });
  }, [defaultUserId, editingCredential, userOptions]);

  const copySecret = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (_error) {
      tToast.error("taskIntegrations.msg_218b");
    }
  };

  const toggleCredentialScope = (scope: string) => {
    setCredentialForm((current) => ({
      ...current,
      scopes: current.scopes.includes(scope)
        ? current.scopes.filter((item) => item !== scope)
        : [...current.scopes, scope],
    }));
  };

  const toggleWebhookEvent = (eventName: string) => {
    setWebhookForm((current) => ({
      ...current,
      subscribedEvents: current.subscribedEvents.includes(eventName)
        ? current.subscribedEvents.filter((item) => item !== eventName)
        : [...current.subscribedEvents, eventName],
    }));
  };

  const submitCredential = async () => {
    if (!credentialForm.name.trim()) {
      tToast.error("taskIntegrations.name_required_d4fe");
      return;
    }

    if (credentialForm.scopes.length === 0) {
      tToast.error("taskIntegrations.msg_770f");
      return;
    }

    if (
      (credentialForm.scopes.includes("tasks:write") ||
        credentialForm.scopes.includes("tasks:update")) &&
      !credentialForm.actorUserId.trim()
    ) {
      tToast.error("taskIntegrations.msg_7395");
      return;
    }

    try {
      setSubmittingCredential(true);
      const payload = {
        name: credentialForm.name.trim(),
        description: credentialForm.description.trim() || null,
        scopes: credentialForm.scopes,
        expiresAt: credentialForm.expiresAt
          ? new Date(credentialForm.expiresAt).toISOString()
          : null,
        isActive: credentialForm.isActive,
        userId:
          credentialForm.ownershipType === "USER"
            ? credentialForm.actorUserId || null
            : null,
        defaultActingUserId:
          credentialForm.ownershipType === "COMPANY"
            ? credentialForm.actorUserId || null
            : null,
      };

      const response = editingCredential
        ? await requestWithAuth<TaskCredential>(
            `tasks/integrations/credentials/${editingCredential.id}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            },
          )
        : await requestWithAuth<TaskCredential>(
            "tasks/integrations/credentials",
            {
              method: "POST",
              body: JSON.stringify(payload),
            },
          );

      toast.success(
        response.message ||
          (editingCredential ? "تم تحديث المفتاح" : "تم إنشاء المفتاح"),
      );

      if (response.secret?.apiKey) {
        setRevealedSecret({
          title: "تم إصدار API Key جديدة",
          description:
            "انسخ المفتاح الآن، فلن يظهر لك مرة أخرى بعد إغلاق هذه البطاقة.",
          value: response.secret.apiKey,
        });
      }

      resetCredentialForm();
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ مفتاح التكامل",
      );
    } finally {
      setSubmittingCredential(false);
    }
  };

  const startEditingCredential = (credential: TaskCredential) => {
    setEditingCredential(credential);
    setCredentialForm({
      name: credential.name,
      description: credential.description || "",
      ownershipType: credential.ownershipType,
      actorUserId:
        credential.ownershipType === "USER"
          ? credential.userId || ""
          : credential.defaultActingUserId || "",
      scopes: credential.scopes,
      expiresAt: toDateTimeInputValue(credential.expiresAt),
      isActive: credential.isActive,
    });
    setShowCredentialForm(true);
  };

  const rotateCredential = async (credential: TaskCredential) => {
    if (
      !window.confirm(
        `سيتم تدوير المفتاح "${credential.name}" وإبطال القيمة الحالية فورًا. هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<TaskCredential>(
        `tasks/integrations/credentials/${credential.id}/rotate`,
        {
          method: "POST",
        },
      );

      if (response.secret?.apiKey) {
        setRevealedSecret({
          title: `تم تدوير المفتاح: ${credential.name}`,
          description:
            "المفتاح القديم أصبح غير صالح. انسخ القيمة الجديدة الآن.",
          value: response.secret.apiKey,
        });
      }

      toast.success(response.message || "تم تدوير المفتاح");
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تدوير المفتاح",
      );
    }
  };

  const toggleCredentialActiveState = async (credential: TaskCredential) => {
    try {
      const response = await requestWithAuth<TaskCredential>(
        `tasks/integrations/credentials/${credential.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ isActive: !credential.isActive }),
        },
      );
      toast.success(
        response.message ||
          (credential.isActive ? "تم تعطيل المفتاح" : "تم تفعيل المفتاح"),
      );
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث حالة المفتاح",
      );
    }
  };

  const revokeCredential = async (credential: TaskCredential) => {
    if (
      !window.confirm(
        `سيتم إلغاء المفتاح "${credential.name}" نهائيًا. هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<null>(
        `tasks/integrations/credentials/${credential.id}`,
        {
          method: "DELETE",
          body: JSON.stringify({ reason: "revoked from tasks UI" }),
        },
      );
      toast.success(response.message || "تم إلغاء المفتاح");
      await loadCredentials();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر إلغاء المفتاح",
      );
    }
  };

  const buildWebhookPayload = (
    formState: WebhookFormState,
    webhookToEdit: TaskWebhook | null,
  ): Record<string, unknown> | null => {
    if (!formState.name.trim()) {
      tToast.error("taskIntegrations.msg_6566");
      return null;
    }

    if (!formState.targetUrl.trim()) {
      tToast.error("taskIntegrations.msg_b920");
      return null;
    }

    if (formState.subscribedEvents.length === 0) {
      tToast.error("taskIntegrations.msg_2cdf");
      return null;
    }

    const parsedHeaders = parseCustomHeaders(formState.customHeaders);
    if (!parsedHeaders.isValid) {
      toast.error(parsedHeaders.error || "صيغة customHeaders غير صحيحة");
      return null;
    }

    if (
      formState.providerType === "OPENCLAW" &&
      !hasOpenClawAuthHeader(parsedHeaders.parsed)
    ) {
      toast.error(
        "OpenClaw تحتاج Authorization أو x-openclaw-token داخل customHeaders",
      );
      return null;
    }

    if (formState.secretMode === "custom" && !formState.signingSecret.trim()) {
      tToast.error("taskIntegrations.msg_9461");
      return null;
    }

    if (
      formState.providerType === "OPENCLAW" &&
      formState.providerConfig.sessionMode === "task-scoped" &&
      !formState.providerConfig.sessionKeyPrefix.trim()
    ) {
      tToast.error("taskIntegrations.msg_e7d5");
      return null;
    }

    if (
      formState.providerType === "OPENCLAW" &&
      formState.providerConfig.timeoutSeconds.trim() &&
      (!Number.isFinite(Number(formState.providerConfig.timeoutSeconds)) ||
        Number(formState.providerConfig.timeoutSeconds) <= 0)
    ) {
      tToast.error("taskIntegrations.msg_22fd");
      return null;
    }

    const payload: Record<string, unknown> = {
      name: formState.name.trim(),
      targetUrl: formState.targetUrl.trim(),
      providerType: formState.providerType,
      providerConfig:
        formState.providerType === "OPENCLAW"
          ? buildWebhookProviderConfigPayload(formState)
          : {},
      subscribedEvents: formState.subscribedEvents,
      customHeaders: parsedHeaders.parsed,
      isActive: formState.isActive,
    };

    if (!webhookToEdit) {
      if (formState.secretMode === "custom") {
        payload["signingSecret"] = formState.signingSecret.trim();
      } else if (formState.secretMode === "none") {
        payload["signingSecret"] = "";
      }
    } else if (formState.secretMode === "custom") {
      payload["signingSecret"] = formState.signingSecret.trim();
    } else if (formState.secretMode === "none") {
      payload["signingSecret"] = "";
    } else if (formState.secretMode === "rotate") {
      payload["rotateSigningSecret"] = true;
    }

    return payload;
  };

  const saveWebhook = async ({
    formState = webhookForm,
    webhookToEdit = editingWebhook,
    resetAfterSave = true,
    testAfterSave = false,
  }: SaveWebhookOptions = {}): Promise<TaskWebhook | null> => {
    const payload = buildWebhookPayload(formState, webhookToEdit);
    if (!payload) {
      return null;
    }

    try {
      setSubmittingWebhook(true);

      const response = webhookToEdit
        ? await requestWithAuth<TaskWebhook>(
            `tasks/integrations/webhooks/${webhookToEdit.id}`,
            {
              method: "PUT",
              body: JSON.stringify(payload),
            },
          )
        : await requestWithAuth<TaskWebhook>("tasks/integrations/webhooks", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      toast.success(
        response.message ||
          (webhookToEdit ? "تم تحديث الـ webhook" : "تم إنشاء الـ webhook"),
      );

      if (response.secret?.signingSecret) {
        setRevealedSecret({
          title: webhookToEdit
            ? `تم تدوير secret الحالية لـ ${formState.name}`
            : "تم إنشاء signing secret جديدة",
          description:
            "احفظ هذه القيمة الآن، فهي لن تُعرض مرة أخرى بنفس الشكل.",
          value: response.secret.signingSecret,
        });
      }

      if (resetAfterSave) {
        resetWebhookForm();
      }
      await loadWebhooks();
      const savedWebhook = response.data || null;

      if (testAfterSave && savedWebhook) {
        await testWebhookConnection(savedWebhook);
      }

      return savedWebhook;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حفظ الـ webhook",
      );
      return null;
    } finally {
      setSubmittingWebhook(false);
    }
  };

  const submitWebhook = async () => {
    await saveWebhook();
  };

  const createOpenClawWebhookFromQuickSetup = async (testAfterSave = false) => {
    const nextForm = await buildOpenClawQuickSetupForm();
    if (!nextForm) {
      return;
    }

    try {
      setOpenClawQuickSetupAction(testAfterSave ? "create-test" : "create");
      await saveWebhook({
        formState: nextForm,
        webhookToEdit: null,
        resetAfterSave: true,
        testAfterSave,
      });
    } finally {
      setOpenClawQuickSetupAction(null);
    }
  };

  const startEditingWebhook = (webhook: TaskWebhook) => {
    setEditingWebhook(webhook);
    setWebhookForm({
      name: webhook.name,
      targetUrl: webhook.targetUrl,
      providerType: webhook.providerType || "GENERIC",
      providerConfig: toWebhookFormProviderConfig(webhook.providerConfig),
      subscribedEvents: webhook.subscribedEvents,
      customHeaders: prettifyJson(webhook.customHeaders),
      secretMode: "keep",
      signingSecret: "",
      isActive: webhook.isActive,
    });
    setShowWebhookForm(true);
  };

  const toggleWebhookActiveState = async (webhook: TaskWebhook) => {
    try {
      const response = await requestWithAuth<TaskWebhook>(
        `tasks/integrations/webhooks/${webhook.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ isActive: !webhook.isActive }),
        },
      );
      toast.success(
        response.message ||
          (webhook.isActive ? "تم تعطيل الـ webhook" : "تم تفعيل الـ webhook"),
      );
      await loadWebhooks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحديث حالة الـ webhook",
      );
    }
  };

  const rotateWebhookSecret = async (webhook: TaskWebhook) => {
    if (
      !window.confirm(
        `سيتم تدوير signing secret لـ "${webhook.name}". هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<TaskWebhook>(
        `tasks/integrations/webhooks/${webhook.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ rotateSigningSecret: true }),
        },
      );

      if (response.secret?.signingSecret) {
        setRevealedSecret({
          title: `تم تدوير signing secret: ${webhook.name}`,
          description: "انسخ القيمة الجديدة الآن وأحدثها في النظام الخارجي.",
          value: response.secret.signingSecret,
        });
      }

      toast.success(response.message || "تم تدوير signing secret");
      await loadWebhooks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تدوير signing secret",
      );
    }
  };

  const deleteWebhook = async (webhook: TaskWebhook) => {
    if (
      !window.confirm(
        `سيتم حذف الـ webhook "${webhook.name}". هل تريد المتابعة؟`,
      )
    ) {
      return;
    }

    try {
      const response = await requestWithAuth<null>(
        `tasks/integrations/webhooks/${webhook.id}`,
        {
          method: "DELETE",
        },
      );
      toast.success(response.message || "تم حذف الـ webhook");
      setExpandedWebhookId((current) =>
        current === webhook.id ? null : current,
      );
      setDeliveriesByWebhook((current) => {
        const next = { ...current };
        delete next[webhook.id];
        return next;
      });
      setDeliveryPaginationByWebhook((current) => {
        const next = { ...current };
        delete next[webhook.id];
        return next;
      });
      await loadWebhooks();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر حذف الـ webhook",
      );
    }
  };

  const loadWebhookDeliveries = async (webhookId: string, force = false) => {
    if (!force && deliveriesByWebhook[webhookId]) {
      return;
    }

    try {
      setLoadingDeliveriesFor(webhookId);
      const response = await requestWithAuth<WebhookDelivery[]>(
        `tasks/integrations/webhooks/${webhookId}/deliveries`,
      );

      setDeliveriesByWebhook((current) => ({
        ...current,
        [webhookId]: response.data || [],
      }));

      if (response.pagination) {
        setDeliveryPaginationByWebhook((current) => ({
          ...current,
          [webhookId]: response.pagination as Pagination,
        }));
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر تحميل سجل التسليم",
      );
    } finally {
      setLoadingDeliveriesFor(null);
    }
  };

  const toggleDeliveries = async (webhookId: string) => {
    if (expandedWebhookId === webhookId) {
      setExpandedWebhookId(null);
      return;
    }

    setExpandedWebhookId(webhookId);
    await loadWebhookDeliveries(webhookId);
  };

  const testWebhookConnection = async (webhook: TaskWebhook) => {
    try {
      setTestingWebhookId(webhook.id);

      const preferredEvent = webhook.subscribedEvents.includes(
        "task.status_changed",
      )
        ? "task.status_changed"
        : webhook.subscribedEvents[0] || "task.updated";

      const response = await requestWithAuth<TestWebhookResponse>(
        `tasks/integrations/webhooks/${webhook.id}/test`,
        {
          method: "POST",
          body: JSON.stringify({ event: preferredEvent }),
        },
      );

      const testResult = response.data?.result;

      if (testResult?.success) {
        toast.success(response.message || "تم إرسال اختبار الـ webhook");
      } else {
        toast.error(
          testResult?.errorMessage ||
            response.message ||
            "تم تنفيذ الاختبار لكن الإرسال فشل",
        );
      }

      setDeliveriesByWebhook((current) => {
        const next = { ...current };
        delete next[webhook.id];
        return next;
      });
      setDeliveryPaginationByWebhook((current) => {
        const next = { ...current };
        delete next[webhook.id];
        return next;
      });
      setExpandedWebhookId(webhook.id);

      await Promise.all([
        loadWebhookDeliveries(webhook.id, true),
        loadWebhooks(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر اختبار الـ webhook",
      );
    } finally {
      setTestingWebhookId(null);
    }
  };

  const retryWebhookDelivery = async (
    webhookId: string,
    delivery: WebhookDelivery,
  ) => {
    try {
      setRetryingDeliveryId(delivery.id);

      const response = await requestWithAuth<RetryWebhookDeliveryResponse>(
        `tasks/integrations/webhooks/${webhookId}/deliveries/${delivery.id}/retry`,
        {
          method: "POST",
        },
      );

      const retryResult = response.data?.result;

      if (retryResult?.success) {
        toast.success(response.message || "تمت إعادة إرسال الـ webhook");
      } else {
        toast.error(
          retryResult?.errorMessage ||
            response.message ||
            "تمت إعادة الإرسال لكن الـ webhook فشلت",
        );
      }

      setExpandedWebhookId(webhookId);
      await Promise.all([
        loadWebhookDeliveries(webhookId, true),
        loadWebhooks(),
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "تعذر إعادة إرسال الـ webhook",
      );
    } finally {
      setRetryingDeliveryId(null);
    }
  };

  if (!canManageIntegrations) {
    return (
      <div className="rounded-[28px] border border-amber-500/20 bg-amber-500/8 p-6 text-amber-900 dark:text-amber-100">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-semibold">
              الوصول إلى تكاملات المهام محدود
            </h3>
            <p className="mt-2 text-sm leading-6">
              إدارة مفاتيح الـ API والـ webhooks متاحة فقط لأدوار{" "}
              <span className="font-semibold">OWNER</span>
              {"، "}
              <span className="font-semibold">COMPANY_ADMIN</span> و{" "}
              <span className="font-semibold">SUPER_ADMIN</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <section className="flex flex-col gap-2.5 rounded-[24px] border border-border/70 bg-card/62 p-3.5 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.18)] md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {credentials.length} مفتاح
          </span>
          <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {webhooks.length} webhook
          </span>
          <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
            {openClawProfiles.length} إعداد OpenClaw
          </span>
        </div>

        <div className="hidden flex-wrap gap-2 md:flex">
          <button
            type="button"
            onClick={() => {
              resetCredentialForm();
              setShowCredentialForm(true);
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
          >
            <KeyIcon className="ml-2 h-4 w-4" />
            مفتاح جديد
          </button>
          <button
            type="button"
            onClick={() => {
              resetWebhookForm();
              setShowWebhookForm(true);
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
          >
            <PlusIcon className="ml-2 h-4 w-4" />
            Webhook جديدة
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="rounded-[24px] border border-border/70 bg-card/64 p-3.5 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.18)]">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              روابط العمل السريعة
            </h3>
            <p className="text-xs leading-5 text-muted-foreground">
              الحد الأدنى الذي تحتاجه لبدء الربط.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">
                  Base URL
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copySecret(externalApiBaseUrl, "تم نسخ Base URL")
                  }
                  className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
                >
                  <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                  نسخ
                </button>
              </div>
              <code className="block break-all text-xs leading-6 text-primary">
                {externalApiBaseUrl}
              </code>
            </div>

            <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-foreground">
                  رابط الصفحة
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copySecret(integrationPageUrl, "تم نسخ رابط صفحة التكاملات")
                  }
                  className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
                >
                  <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                  نسخ
                </button>
              </div>
              <code className="block break-all text-xs leading-6 text-foreground">
                {integrationPageUrl}
              </code>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TASK_SCOPE_OPTIONS.map((scope) => (
              <span
                key={scope.value}
                className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary"
              >
                {scope.value}
              </span>
            ))}
          </div>
        </div>

        <details className="rounded-[26px] border border-border/70 bg-card/68 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.2)] [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                مرجع المطور
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                أمثلة الطلبات وملاحظات الأمان متاحة هنا عندما تحتاجها فقط.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                4 أمثلة جاهزة
              </span>
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </summary>

          <div className="border-t border-border/60 px-4 pb-4 pt-4">
            <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-background p-2 text-foreground">
                  <ShieldCheckIcon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">
                    ملاحظات الأمان وقواعد الصلاحيات
                  </h4>
                  <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                    <li>
                      نقطة `PATCH /api/v1/external/tasks/:id` تدعم تحديث
                      العنوان، الوصف، الأولوية، الموعد، الوسوم، والمسؤول،
                      وترسل إشعارًا فوريًا للمكلف بالمهمة.
                    </li>
                    <li>
                      لا يمكن الوصول أو تعديل مهام أي شركة أخرى عبر التكامل الخارجي (تُرفض بـ 404 Not Found).
                    </li>
                    <li>
                      صلاحيات `tasks:write` و `tasks:update` تحتاج مستخدم تنفيذ افتراضي نشط داخل نفس
                      الشركة، وأي مستخدم مسؤول يُسند إليه العمل يجب أن يكون نشطًا بالشركة.
                    </li>
                    <li>
                      احتفظ بالـ API key أو signing secret في النظام الخارجي فور
                      إنشائها، ويمكنك تدويرها عند الحاجة بأمان.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {TASK_WEBHOOK_EVENTS.map((eventItem) => (
                <span
                  key={eventItem.value}
                  className="inline-flex items-center rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary"
                >
                  {eventItem.value}
                </span>
              ))}
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "قراءة المهام", value: listTasksSnippet },
                { title: "إنشاء مهمة", value: createTaskSnippet },
                { title: "تعديل بيانات المهمة", value: updateTaskSnippet },
                { title: "تحديث الحالة", value: updateStatusSnippet },
              ].map((snippet) => (
                <div
                  key={snippet.title}
                  className="rounded-[22px] border border-border/60 bg-background/72 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">
                      {snippet.title}
                    </div>
                    <button
                      onClick={() =>
                        copySecret(
                          snippet.value,
                          `تم نسخ مثال ${snippet.title}`,
                        )
                      }
                      className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
                    >
                      <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                      نسخ
                    </button>
                  </div>
                  <pre className="overflow-auto whitespace-pre-wrap break-words rounded-[18px] border border-border/60 bg-foreground/[0.94] p-3 text-xs leading-6 text-background">
                    {snippet.value}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      {revealedSecret && (
        <div className="rounded-[26px] border border-primary/15 bg-primary/6 p-5 shadow-[0_18px_54px_-42px_rgba(47,107,255,0.24)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-foreground">
                <CheckCircleIcon className="h-5 w-5" />
                <h3 className="font-semibold">{revealedSecret.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {revealedSecret.description}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  copySecret(revealedSecret.value, "تم نسخ السر إلى الحافظة")
                }
                className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <DocumentDuplicateIcon className="ml-2 h-4 w-4" />
                نسخ الآن
              </button>
              <button
                onClick={() => setRevealedSecret(null)}
                className="inline-flex items-center rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
              >
                <EyeSlashIcon className="ml-2 h-4 w-4" />
                إخفاء
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-[20px] border border-primary/15 bg-background/78 p-3">
            <code className="block break-all text-xs leading-6 text-foreground">
              {revealedSecret.value}
            </code>
          </div>
        </div>
      )}

      {loadError && (
        <div className="rounded-[26px] border border-rose-500/20 bg-rose-500/8 p-4 text-rose-900 dark:text-rose-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">تعذر تحميل التكاملات</div>
                <p className="mt-1 text-sm">{loadError}</p>
              </div>
            </div>
            <button
              onClick={() => void loadIntegrations()}
              className="inline-flex items-center rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/50"
            >
              <ArrowPathIcon className="ml-2 h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[28px] border border-border/70 bg-card/72 p-5 shadow-[0_22px_70px_-54px_rgba(15,27,45,0.28)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                مفاتيح الـ API
              </h3>
              <p className="text-sm text-muted-foreground">
                {credentials.length} مفتاح نشط أو محفوظ حاليًا للشركة
              </p>
            </div>
          </div>

          {showCredentialForm && (
            <div className="mt-5 rounded-[24px] border border-primary/15 bg-primary/6 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-semibold text-foreground">
                  {editingCredential ? "تعديل المفتاح" : "إنشاء مفتاح جديد"}
                </h4>
                <button
                  onClick={resetCredentialForm}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    اسم المفتاح
                  </label>
                  <input
                    value={credentialForm.name}
                    onChange={(event) =>
                      setCredentialForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    placeholder="مثال: متجر الشريك - الإنتاج"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    وصف اختياري
                  </label>
                  <textarea
                    value={credentialForm.description}
                    onChange={(event) =>
                      setCredentialForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    placeholder="لأي نظام خارجي سيُستخدم هذا المفتاح؟"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    نوع المفتاح
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "COMPANY", label: "مفتاح شركة" },
                      { value: "USER", label: "مفتاح مستخدم" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          setCredentialForm((current) => ({
                            ...current,
                            ownershipType: item.value as "COMPANY" | "USER",
                          }))
                        }
                        className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                          credentialForm.ownershipType === item.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background/75 text-foreground hover:bg-background"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {credentialForm.ownershipType === "USER"
                      ? "المستخدم المرتبط"
                      : "مستخدم التنفيذ الافتراضي"}
                  </label>
                  <select
                    value={credentialForm.actorUserId}
                    onChange={(event) =>
                      setCredentialForm((current) => ({
                        ...current,
                        actorUserId: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="">بدون مستخدم</option>
                    {userOptions.map((userOption) => (
                      <option key={userOption.id} value={userOption.id}>
                        {userOption.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    مطلوب فقط إذا كانت الصلاحيات تشمل الكتابة.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    تاريخ الانتهاء
                  </label>
                  <input
                    type="datetime-local"
                    value={credentialForm.expiresAt}
                    onChange={(event) =>
                      setCredentialForm((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  />
                </div>

                <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={credentialForm.isActive}
                    onChange={(event) =>
                      setCredentialForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                  تفعيل المفتاح مباشرة بعد الحفظ
                </label>

                <div className="md:col-span-2">
                  <div className="mb-2 text-sm font-medium text-foreground">
                    الصلاحيات
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TASK_SCOPE_OPTIONS.map((scope) => (
                      <button
                        key={scope.value}
                        type="button"
                        onClick={() => toggleCredentialScope(scope.value)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium ${
                          credentialForm.scopes.includes(scope.value)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background/75 text-foreground hover:bg-background"
                        }`}
                      >
                        {scope.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  onClick={resetCredentialForm}
                  className="rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => void submitCredential()}
                  disabled={submittingCredential}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingCredential
                    ? "جارٍ الحفظ..."
                    : editingCredential
                      ? "حفظ التعديلات"
                      : "إصدار المفتاح"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
                جارٍ تحميل المفاتيح...
              </div>
            ) : credentials.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
                لا توجد مفاتيح تكامل حتى الآن.
              </div>
            ) : (
              credentials.map((credential) => (
                <div
                  key={credential.id}
                  className="rounded-[24px] border border-border/70 bg-background/70 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-foreground">
                          {credential.name}
                        </h4>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            credential.isActive
                              ? "border border-primary/20 bg-primary/8 text-primary"
                              : "border border-border/60 bg-background/75 text-muted-foreground"
                          }`}
                        >
                          {credential.isActive ? "نشط" : "معطل"}
                        </span>
                        <span className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                          {credential.ownershipType === "USER"
                            ? "مفتاح مستخدم"
                            : "مفتاح شركة"}
                        </span>
                      </div>
                      {credential.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {credential.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => startEditingCredential(credential)}
                        className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                      >
                        تحرير
                      </button>
                      <button
                        onClick={() => void rotateCredential(credential)}
                        className="rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12"
                      >
                        تدوير المفتاح
                      </button>
                      <button
                        onClick={() =>
                          void toggleCredentialActiveState(credential)
                        }
                        className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                          credential.isActive
                            ? "border border-border/60 bg-background/75 text-foreground hover:bg-background"
                            : "border border-primary/20 bg-primary/8 text-primary hover:bg-primary/12"
                        }`}
                      >
                        {credential.isActive ? "تعطيل" : "تفعيل"}
                      </button>
                      <button
                        onClick={() => void revokeCredential(credential)}
                        className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-500/12 dark:text-rose-300"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                      <div className="text-xs text-muted-foreground">
                        المفتاح الظاهر
                      </div>
                      <div className="mt-1 font-mono text-xs leading-6 text-foreground">
                        {credential.keyPrefixMasked || "غير متوفر"}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                      <div className="text-xs text-muted-foreground">
                        المستخدم المرتبط
                      </div>
                      <div className="mt-1">
                        {credential.ownershipType === "USER"
                          ? credential.userName || "غير محدد"
                          : credential.defaultActingUserName || "غير محدد"}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                      <div className="text-xs text-muted-foreground">
                        آخر استخدام
                      </div>
                      <div className="mt-1">
                        {formatDateTime(credential.lastUsedAt)}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                      <div className="text-xs text-muted-foreground">
                        ينتهي في
                      </div>
                      <div className="mt-1">
                        {formatDateTime(credential.expiresAt)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {credential.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-full border border-border/60 bg-background/75 px-3 py-1 text-xs font-semibold text-foreground"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-border/70 bg-card/72 p-5 shadow-[0_22px_70px_-54px_rgba(15,27,45,0.28)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Webhooks
              </h3>
              <p className="text-sm text-muted-foreground">
                {webhooks.length} endpoint مرتبطة بتحديثات المهام
              </p>
            </div>
            <div className="hidden flex-wrap gap-2 md:flex">
              <button
                onClick={applyOpenClawLocalPreset}
                className="inline-flex items-center justify-center rounded-2xl border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12"
              >
                <LinkIcon className="ml-2 h-4 w-4" />
                OpenClaw محلي
              </button>
              <button
                onClick={applyOpenClawProductionPreset}
                className="inline-flex items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/8 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12"
              >
                <ShieldCheckIcon className="ml-2 h-4 w-4" />
                OpenClaw إنتاج
              </button>
            </div>
          </div>

          <details className="mt-5 rounded-[24px] border border-border/70 bg-background/55 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none flex-col gap-2.5 p-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h4 className="font-semibold text-foreground">
                  إعداد سريع لـ OpenClaw
                </h4>
                <p className="text-xs leading-5 text-muted-foreground">
                  افتحه فقط عندما تحتاج تعبئة الإعداد أو إنشاء webhook بسرعة.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary">
                  {openClawProfiles.length} إعداد محفوظ
                </span>
                <span className="rounded-full border border-border/60 bg-background/80 px-3 py-2 text-xs text-muted-foreground">
                  الشركة الحالية تُستخدم تلقائيًا عند الحفظ
                </span>
                <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </summary>

            <div className="border-t border-border/60 bg-secondary/8 p-4">
              <div className="rounded-[24px] border border-border/70 bg-background/75 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      الإعدادات المحفوظة للشركة
                    </div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">
                      احفظ `local` و`production` مرة واحدة، وبعدها سيُستخدم Hook
                      Token المحفوظة تلقائيًا عند الإنشاء أو الاختبار.
                    </p>
                  </div>
                  <div className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary">
                    {openClawProfiles.length} إعداد محفوظ
                  </div>
                </div>

                {openClawProfiles.length === 0 ? (
                  <div className="mt-3 rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
                    لا توجد إعدادات OpenClaw محفوظة بعد لهذه الشركة.
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {openClawProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className={`rounded-2xl border p-4 ${
                          currentOpenClawProfile?.id === profile.id
                            ? "border-secondary/25 bg-secondary/10 shadow-[0_20px_60px_-48px_rgba(34,199,201,0.4)]"
                            : "border-border/70 bg-background/72"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-foreground">
                            {profile.name}
                          </div>
                          <span className="rounded-full border border-border/60 bg-background/75 px-2.5 py-1 text-xs font-semibold text-foreground">
                            {profile.environment === "local" ? "محلي" : "إنتاج"}
                          </span>
                          {currentOpenClawProfile?.id === profile.id && (
                            <span className="rounded-full border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                              البيئة الحالية
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-2 text-xs leading-6 text-muted-foreground">
                          <div>
                            <span className="font-semibold text-foreground">
                              Base URL:
                            </span>{" "}
                            <span className="font-mono">{profile.baseUrl}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">
                              Hook Token:
                            </span>{" "}
                            <span className="font-mono">
                              {profile.hookTokenMasked || "محفوظة"}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">
                              آخر تحديث:
                            </span>{" "}
                            {formatDateTime(profile.updatedAt)}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void hydrateOpenClawProfile(profile)}
                            disabled={hydratingOpenClawProfileId === profile.id}
                            className="rounded-2xl border border-secondary/20 bg-secondary/8 px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {hydratingOpenClawProfileId === profile.id
                              ? "جارٍ التحميل..."
                              : "استخدام الإعداد"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenClawQuickSetup(
                                toOpenClawQuickSetupState(profile),
                              )
                            }
                            className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                          >
                            تحميل البيانات
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteOpenClawProfile(profile)}
                            disabled={deletingOpenClawProfileId === profile.id}
                            className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-900/40"
                          >
                            {deletingOpenClawProfileId === profile.id
                              ? "جارٍ الحذف..."
                              : "حذف"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="xl:col-span-2">
                  <div className="mb-2 text-sm font-medium text-foreground">
                    البيئة
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {OPENCLAW_ENVIRONMENT_OPTIONS.map((environmentOption) => (
                      <button
                        key={environmentOption.value}
                        type="button"
                        onClick={() => {
                          const matchingProfile = openClawProfiles.find(
                            (profile) =>
                              profile.environment === environmentOption.value,
                          );
                          setOpenClawQuickSetup(
                            matchingProfile
                              ? toOpenClawQuickSetupState(matchingProfile)
                              : {
                                  ...createInitialOpenClawQuickSetup(),
                                  environment: environmentOption.value,
                                  baseUrl: getDefaultOpenClawBaseUrl(
                                    environmentOption.value,
                                  ),
                                  name: getDefaultOpenClawName(
                                    environmentOption.value,
                                  ),
                                },
                          );
                        }}
                        className={`rounded-2xl border p-4 text-right transition ${
                          openClawQuickSetup.environment ===
                          environmentOption.value
                            ? "border-secondary/25 bg-secondary/10 text-foreground shadow-[0_20px_60px_-48px_rgba(34,199,201,0.42)]"
                            : "border-border/70 bg-background/72 text-foreground hover:bg-background"
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          {environmentOption.label}
                        </div>
                        <div className="mt-1 text-xs leading-6 opacity-80">
                          {environmentOption.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    اسم الـ webhook
                  </label>
                  <input
                    value={openClawQuickSetup.name}
                    onChange={(event) =>
                      setOpenClawQuickSetup((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    placeholder="OpenClaw Tasks Sync"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    agentId
                  </label>
                  <input
                    value={openClawQuickSetup.agentId}
                    onChange={(event) =>
                      setOpenClawQuickSetup((current) => ({
                        ...current,
                        agentId: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    placeholder="main"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Base URL أو endpoint
                  </label>
                  <input
                    value={openClawQuickSetup.baseUrl}
                    onChange={(event) =>
                      setOpenClawQuickSetup((current) => ({
                        ...current,
                        baseUrl: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                    placeholder="https://openclaw.example.com أو http://127.0.0.1:18789"
                  />
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    سيتم تحويله تلقائيًا إلى:{" "}
                    <code>
                      {normalizeOpenClawAgentUrl(openClawQuickSetup.baseUrl) ||
                        "/hooks/agent"}
                    </code>
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Hook Token
                  </label>
                  <input
                    value={openClawQuickSetup.hookToken}
                    onChange={(event) =>
                      setOpenClawQuickSetup((current) => ({
                        ...current,
                        hookToken: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 font-mono text-foreground focus:border-secondary focus:outline-none"
                    placeholder="ocl_hook_..."
                  />
                  {currentOpenClawProfile?.hasHookToken &&
                    !openClawQuickSetup.hookToken.trim() && (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        يمكنك ترك الحقل فارغًا. سيتم استخدام Hook Token المحفوظة
                        لهذه البيئة تلقائيًا.
                      </p>
                    )}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    wake mode
                  </label>
                  <select
                    value={openClawQuickSetup.wakeMode}
                    onChange={(event) =>
                      setOpenClawQuickSetup((current) => ({
                        ...current,
                        wakeMode: event.target.value as OpenClawWakeMode,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  >
                    {OPENCLAW_WAKE_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    session mode
                  </label>
                  <select
                    value={openClawQuickSetup.sessionMode}
                    onChange={(event) =>
                      setOpenClawQuickSetup((current) => ({
                        ...current,
                        sessionMode: event.target.value as OpenClawSessionMode,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-primary focus:outline-none"
                  >
                    {OPENCLAW_SESSION_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={openClawQuickSetup.deliver}
                    onChange={(event) =>
                      setOpenClawQuickSetup((current) => ({
                        ...current,
                        deliver: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary/20"
                  />
                  أرسل الرد إلى القناة أيضًا
                </label>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  onClick={() =>
                    setOpenClawQuickSetup(createInitialOpenClawQuickSetup())
                  }
                  disabled={submittingWebhook || savingOpenClawProfile}
                  className="rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                >
                  إعادة تعيين
                </button>
                <button
                  onClick={() => void applyOpenClawQuickSetup()}
                  disabled={submittingWebhook || savingOpenClawProfile}
                  className="rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
                >
                  تعبئة النموذج تلقائيًا
                </button>
                <button
                  onClick={() => void saveOpenClawProfile()}
                  disabled={submittingWebhook || savingOpenClawProfile}
                  className="rounded-2xl border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingOpenClawProfile
                    ? "جارٍ الحفظ..."
                    : currentOpenClawProfile
                      ? "تحديث الإعداد المحفوظ"
                      : "حفظ الإعداد لهذه البيئة"}
                </button>
                <button
                  onClick={() =>
                    void createOpenClawWebhookFromQuickSetup(false)
                  }
                  disabled={submittingWebhook || savingOpenClawProfile}
                  className="rounded-2xl border border-secondary/20 bg-secondary/8 px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {openClawQuickSetupAction === "create"
                    ? "جارٍ الإنشاء..."
                    : "إنشاء webhook الآن"}
                </button>
                <button
                  onClick={() => void createOpenClawWebhookFromQuickSetup(true)}
                  disabled={submittingWebhook || savingOpenClawProfile}
                  className="rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {openClawQuickSetupAction === "create-test"
                    ? "جارٍ الإنشاء والاختبار..."
                    : "إنشاء ثم اختبار"}
                </button>
              </div>
            </div>
          </details>

          {showWebhookForm && (
            <div className="mt-5 rounded-[24px] border border-secondary/20 bg-secondary/8 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-semibold text-foreground">
                  {editingWebhook ? "تعديل الـ webhook" : "إنشاء Webhook جديدة"}
                </h4>
                <button
                  onClick={resetWebhookForm}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="mb-2 text-sm font-medium text-foreground">
                    نوع التكامل
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {WEBHOOK_PROVIDER_OPTIONS.map((providerOption) => (
                      <button
                        key={providerOption.value}
                        type="button"
                        onClick={() =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerType: providerOption.value,
                          }))
                        }
                        className={`rounded-2xl border p-4 text-right transition ${
                          webhookForm.providerType === providerOption.value
                            ? "border-secondary/25 bg-secondary/10 text-foreground shadow-[0_20px_60px_-48px_rgba(34,199,201,0.42)]"
                            : "border-border/70 bg-background/72 text-foreground hover:bg-background"
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          {providerOption.label}
                        </div>
                        <div className="mt-1 text-xs leading-6 opacity-80">
                          {providerOption.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    اسم الـ webhook
                  </label>
                  <input
                    value={webhookForm.name}
                    onChange={(event) =>
                      setWebhookForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                    placeholder="مثال: مزامنة متجر خارجي"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    الرابط المستهدف
                  </label>
                  <input
                    value={webhookForm.targetUrl}
                    onChange={(event) =>
                      setWebhookForm((current) => ({
                        ...current,
                        targetUrl: event.target.value,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                    placeholder="https://partner.example.com/webhooks/tasks"
                  />
                </div>

                {webhookForm.providerType === "OPENCLAW" && (
                  <>
                    <div className="md:col-span-2 rounded-[22px] border border-secondary/20 bg-secondary/8 p-4 text-sm text-foreground">
                      <div className="font-semibold">إعداد OpenClaw للشركة</div>
                      <p className="mt-2 leading-6">
                        سيتم إرسال الطلب إلى <code>/hooks/agent</code> مباشرة.
                        ضع
                        <code>
                          {" "}
                          Authorization: Bearer OPENCLAW_HOOKS_TOKEN
                        </code>{" "}
                        داخل
                        <code> customHeaders</code> الخاصة بهذه البيئة.
                      </p>
                      {webhookForm.providerConfig.sessionMode ===
                        "task-scoped" && (
                        <p className="mt-2 leading-6 text-muted-foreground">
                          عند استخدام جلسة لكل مهمة يجب تفعيل
                          <code> hooks.allowRequestSessionKey=true</code> داخل
                          OpenClaw مع prefix مسموح مناسب.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        اسم المصدر داخل OpenClaw
                      </label>
                      <input
                        value={webhookForm.providerConfig.name}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              name: event.target.value,
                            },
                          }))
                        }
                        className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                        placeholder="Tasks"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        agentId داخل OpenClaw
                      </label>
                      <input
                        value={webhookForm.providerConfig.agentId}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              agentId: event.target.value,
                            },
                          }))
                        }
                        className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                        placeholder="main"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        wake mode
                      </label>
                      <select
                        value={webhookForm.providerConfig.wakeMode}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              wakeMode: event.target.value as OpenClawWakeMode,
                            },
                          }))
                        }
                        className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                      >
                        {OPENCLAW_WAKE_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        session mode
                      </label>
                      <select
                        value={webhookForm.providerConfig.sessionMode}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              sessionMode: event.target
                                .value as OpenClawSessionMode,
                            },
                          }))
                        }
                        className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                      >
                        {OPENCLAW_SESSION_MODE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {
                          OPENCLAW_SESSION_MODE_OPTIONS.find(
                            (option) =>
                              option.value ===
                              webhookForm.providerConfig.sessionMode,
                          )?.description
                        }
                      </p>
                    </div>

                    {webhookForm.providerConfig.sessionMode ===
                      "task-scoped" && (
                      <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                          session key prefix
                        </label>
                        <input
                          value={webhookForm.providerConfig.sessionKeyPrefix}
                          onChange={(event) =>
                            setWebhookForm((current) => ({
                              ...current,
                              providerConfig: {
                                ...current.providerConfig,
                                sessionKeyPrefix: event.target.value,
                              },
                            }))
                          }
                          className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                          placeholder="hook:task:"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={webhookForm.providerConfig.deliver}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              deliver: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary/20"
                      />
                      أرسل رد OpenClaw إلى القناة أيضًا
                    </label>

                    {webhookForm.providerConfig.deliver && (
                      <>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">
                            القناة
                          </label>
                          <select
                            value={webhookForm.providerConfig.channel}
                            onChange={(event) =>
                              setWebhookForm((current) => ({
                                ...current,
                                providerConfig: {
                                  ...current.providerConfig,
                                  channel: event.target.value,
                                },
                              }))
                            }
                            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                          >
                            {OPENCLAW_CHANNEL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-foreground">
                            المرسل إليه داخل القناة
                          </label>
                          <input
                            value={webhookForm.providerConfig.to}
                            onChange={(event) =>
                              setWebhookForm((current) => ({
                                ...current,
                                providerConfig: {
                                  ...current.providerConfig,
                                  to: event.target.value,
                                },
                              }))
                            }
                            className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                            placeholder="مثال: chat id أو رقم حسب القناة"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        model override
                      </label>
                      <input
                        value={webhookForm.providerConfig.model}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              model: event.target.value,
                            },
                          }))
                        }
                        className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                        placeholder="اختياري: openai/gpt-5.2-mini"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        thinking level
                      </label>
                      <input
                        value={webhookForm.providerConfig.thinking}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              thinking: event.target.value,
                            },
                          }))
                        }
                        className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                        placeholder="اختياري: low أو medium"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        timeoutSeconds
                      </label>
                      <input
                        value={webhookForm.providerConfig.timeoutSeconds}
                        onChange={(event) =>
                          setWebhookForm((current) => ({
                            ...current,
                            providerConfig: {
                              ...current.providerConfig,
                              timeoutSeconds: event.target.value,
                            },
                          }))
                        }
                        className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                        inputMode="numeric"
                        placeholder="اختياري: 120"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <div className="mb-2 text-sm font-medium text-foreground">
                    الأحداث المرسلة
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {TASK_WEBHOOK_EVENTS.map((eventItem) => (
                      <button
                        key={eventItem.value}
                        type="button"
                        onClick={() => toggleWebhookEvent(eventItem.value)}
                        className={`rounded-full border px-3 py-2 text-sm font-medium ${
                          webhookForm.subscribedEvents.includes(eventItem.value)
                            ? "border-secondary/25 bg-secondary text-secondary-foreground"
                            : "border-border/60 bg-background/75 text-foreground hover:bg-background"
                        }`}
                      >
                        {eventItem.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    وضع التوقيع
                  </label>
                  <select
                    value={webhookForm.secretMode}
                    onChange={(event) =>
                      setWebhookForm((current) => ({
                        ...current,
                        secretMode: event.target.value as WebhookSecretMode,
                      }))
                    }
                    className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                  >
                    {!editingWebhook && (
                      <option value="auto">توليد secret تلقائيًا</option>
                    )}
                    {editingWebhook && (
                      <option value="keep">الاحتفاظ بالـ secret الحالية</option>
                    )}
                    {editingWebhook && (
                      <option value="rotate">تدوير الـ secret الحالية</option>
                    )}
                    <option value="custom">secret مخصصة</option>
                    <option value="none">بدون توقيع</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 rounded-[20px] border border-border/60 bg-background/75 px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={webhookForm.isActive}
                    onChange={(event) =>
                      setWebhookForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-border text-secondary focus:ring-secondary/20"
                  />
                  تفعيل الـ webhook بعد الحفظ
                </label>

                {webhookForm.secretMode === "custom" && (
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      signing secret
                    </label>
                    <input
                      value={webhookForm.signingSecret}
                      onChange={(event) =>
                        setWebhookForm((current) => ({
                          ...current,
                          signingSecret: event.target.value,
                        }))
                      }
                      className="business-control-input w-full rounded-2xl px-3 py-2 text-foreground focus:border-secondary focus:outline-none"
                      placeholder="أدخل قيمة سرية مخصصة"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    customHeaders بصيغة JSON
                  </label>
                  <textarea
                    value={webhookForm.customHeaders}
                    onChange={(event) =>
                      setWebhookForm((current) => ({
                        ...current,
                        customHeaders: event.target.value,
                      }))
                    }
                    rows={5}
                    className="business-control-input w-full rounded-2xl px-3 py-2 font-mono text-sm text-foreground focus:border-secondary focus:outline-none"
                    placeholder={'{\n  "X-Partner-Id": "store-17"\n}'}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  onClick={resetWebhookForm}
                  className="rounded-2xl border border-border/60 bg-background/75 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => void submitWebhook()}
                  disabled={submittingWebhook}
                  className="rounded-2xl bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submittingWebhook
                    ? "جارٍ الحفظ..."
                    : editingWebhook
                      ? "حفظ التعديلات"
                      : "إنشاء الـ webhook"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
                جارٍ تحميل الـ webhooks...
              </div>
            ) : webhooks.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-border/70 bg-background/55 p-6 text-center text-sm text-muted-foreground">
                لا توجد Webhooks حتى الآن.
              </div>
            ) : (
              webhooks.map((webhook) => {
                const deliveries = deliveriesByWebhook[webhook.id] || [];
                const deliveryPagination =
                  deliveryPaginationByWebhook[webhook.id];
                const isExpanded = expandedWebhookId === webhook.id;
                const deliveryFilter =
                  deliveryFilterByWebhook[webhook.id] || "all";
                const filteredDeliveries = deliveries.filter((delivery) => {
                  if (deliveryFilter === "success") return delivery.success;
                  if (deliveryFilter === "failed") return !delivery.success;
                  return true;
                });

                return (
                  <div
                    key={webhook.id}
                    className="rounded-[24px] border border-border/70 bg-background/70 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {webhook.name}
                          </h4>
                          <span className="rounded-full border border-secondary/20 bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                            {webhook.providerType === "OPENCLAW"
                              ? "OpenClaw"
                              : "Generic"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              webhook.isActive
                                ? "border border-primary/20 bg-primary/8 text-primary"
                                : "border border-border/60 bg-background/75 text-muted-foreground"
                            }`}
                          >
                            {webhook.isActive ? "نشط" : "معطل"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              webhook.hasSigningSecret
                                ? "border border-secondary/20 bg-secondary/10 text-secondary"
                                : "border border-border/60 bg-background/75 text-muted-foreground"
                            }`}
                          >
                            {webhook.hasSigningSecret ? "موقّع" : "بدون توقيع"}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <ArrowTopRightOnSquareIcon className="h-4 w-4 shrink-0" />
                          <a
                            href={webhook.targetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-secondary hover:underline"
                          >
                            {webhook.targetUrl}
                          </a>
                        </div>
                        {webhook.providerType === "OPENCLAW" && (
                          <div className="mt-2 text-xs leading-6 text-muted-foreground">
                            agent: {webhook.providerConfig.agentId || "default"}{" "}
                            | session:{" "}
                            {webhook.providerConfig.sessionMode ===
                            "task-scoped"
                              ? `${webhook.providerConfig.sessionKeyPrefix}...`
                              : "defaultSessionKey"}
                            {" | "}wake: {webhook.providerConfig.wakeMode}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => startEditingWebhook(webhook)}
                          className="rounded-2xl border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
                        >
                          تحرير
                        </button>
                        <button
                          onClick={() => void testWebhookConnection(webhook)}
                          disabled={testingWebhookId === webhook.id}
                          className="rounded-2xl border border-secondary/20 bg-secondary/8 px-3 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/12 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {testingWebhookId === webhook.id
                            ? "جارٍ الاختبار..."
                            : "اختبار الاتصال"}
                        </button>
                        <button
                          onClick={() => void rotateWebhookSecret(webhook)}
                          className="rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12"
                        >
                          تدوير secret
                        </button>
                        <button
                          onClick={() => void toggleWebhookActiveState(webhook)}
                          className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                            webhook.isActive
                              ? "border border-border/60 bg-background/75 text-foreground hover:bg-background"
                              : "border border-primary/20 bg-primary/8 text-primary hover:bg-primary/12"
                          }`}
                        >
                          {webhook.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          onClick={() => void deleteWebhook(webhook)}
                          className="rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-500/12 dark:text-rose-300"
                        >
                          حذف
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                      <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                        <div className="text-xs text-muted-foreground">
                          آخر Trigger
                        </div>
                        <div className="mt-1">
                          {formatDateTime(webhook.lastTriggeredAt)}
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
                        <div className="text-xs text-muted-foreground">
                          آخر نجاح
                        </div>
                        <div className="mt-1">
                          {formatDateTime(webhook.lastSuccessAt)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {webhook.subscribedEvents.map((eventName) => (
                        <span
                          key={eventName}
                          className="rounded-full border border-border/60 bg-background/75 px-3 py-1 text-xs font-semibold text-foreground"
                        >
                          {eventName}
                        </span>
                      ))}
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                        failures: {webhook.failureCount}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-border/70 pt-4">
                      <button
                        onClick={() => void toggleDeliveries(webhook.id)}
                        className="inline-flex items-center text-sm font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="ml-2 h-4 w-4" />
                        )}
                        سجل التسليم
                        {deliveryPagination && (
                          <span className="mr-2 text-xs text-muted-foreground">
                            ({deliveryPagination.total})
                          </span>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                              {[
                                {
                                  value: "all" as DeliveryFilter,
                                  label: "الكل",
                                },
                                {
                                  value: "success" as DeliveryFilter,
                                  label: "الناجح",
                                },
                                {
                                  value: "failed" as DeliveryFilter,
                                  label: "الفاشل",
                                },
                              ].map((filterOption) => (
                                <button
                                  key={filterOption.value}
                                  type="button"
                                  onClick={() =>
                                    setDeliveryFilterByWebhook((current) => ({
                                      ...current,
                                      [webhook.id]: filterOption.value,
                                    }))
                                  }
                                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                                    deliveryFilter === filterOption.value
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-border/60 bg-background/75 text-muted-foreground hover:bg-background hover:text-foreground"
                                  }`}
                                >
                                  {filterOption.label}
                                </button>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              المعروض: {filteredDeliveries.length} من{" "}
                              {deliveries.length}
                            </div>
                          </div>

                          {loadingDeliveriesFor === webhook.id ? (
                            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-center text-sm text-muted-foreground">
                              جارٍ تحميل السجل...
                            </div>
                          ) : deliveries.length === 0 ? (
                            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-center text-sm text-muted-foreground">
                              لا توجد عمليات تسليم بعد.
                            </div>
                          ) : filteredDeliveries.length === 0 ? (
                            <div className="rounded-[20px] border border-dashed border-border/70 bg-background/55 p-4 text-center text-sm text-muted-foreground">
                              لا توجد نتائج مطابقة لهذا الفلتر.
                            </div>
                          ) : (
                            filteredDeliveries.map((delivery) => (
                              <details
                                key={delivery.id}
                                className="rounded-[24px] border border-border/70 bg-background/70 p-4"
                              >
                                <summary className="flex cursor-pointer list-none flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        delivery.success
                                          ? "border border-secondary/20 bg-secondary/10 text-secondary"
                                          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                                      }`}
                                    >
                                      {delivery.success ? "ناجح" : "فشل"}
                                    </span>
                                    <span className="text-sm font-medium text-foreground">
                                      {delivery.event}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center">
                                      <ClockIcon className="ml-1 h-4 w-4" />
                                      {formatDateTime(delivery.createdAt)}
                                    </span>
                                    <span>
                                      status: {delivery.responseStatus ?? "—"}
                                    </span>
                                    <span>
                                      {delivery.durationMs
                                        ? `${delivery.durationMs}ms`
                                        : "بدون مدة"}
                                    </span>
                                  </div>
                                </summary>

                                {delivery.errorMessage && (
                                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                                    {delivery.errorMessage}
                                  </div>
                                )}

                                <div className="mt-4 flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void retryWebhookDelivery(
                                        webhook.id,
                                        delivery,
                                      )
                                    }
                                    disabled={
                                      retryingDeliveryId === delivery.id
                                    }
                                    className="rounded-2xl border border-primary/20 bg-primary/8 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/12 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {retryingDeliveryId === delivery.id
                                      ? "جارٍ الإرسال..."
                                      : delivery.success
                                        ? "إعادة الإرسال"
                                        : "إعادة المحاولة"}
                                  </button>
                                </div>

                                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                                  <div className="rounded-[20px] border border-border/60 bg-foreground/[0.94] p-3 text-xs text-background">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <div className="font-semibold text-background/70">
                                        Request Body
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void copySecret(
                                            delivery.requestBody || "",
                                            "تم نسخ Request Body",
                                          )
                                        }
                                        className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-background"
                                      >
                                        <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                                        نسخ
                                      </button>
                                    </div>
                                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words">
                                      {delivery.requestBody}
                                    </pre>
                                  </div>
                                  <div className="rounded-[20px] border border-border/60 bg-foreground/[0.94] p-3 text-xs text-background">
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                      <div className="font-semibold text-background/70">
                                        Response Body
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void copySecret(
                                            delivery.responseBody || "",
                                            "تم نسخ Response Body",
                                          )
                                        }
                                        className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:bg-background"
                                      >
                                        <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                                        نسخ
                                      </button>
                                    </div>
                                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words">
                                      {delivery.responseBody || "لا يوجد محتوى"}
                                    </pre>
                                  </div>
                                </div>
                              </details>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-30 md:hidden">
        <div className="business-page-panel rounded-[24px] border border-border/70 bg-card/95 px-3 py-3 shadow-[0_18px_42px_-28px_rgba(15,27,45,0.45)] backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                وصول سريع للتكاملات
              </p>
              <p className="text-xs text-muted-foreground">
                افتح إنشاء مفتاح أو webhook دون الرجوع إلى أعلى الصفحة.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetCredentialForm();
                setShowCredentialForm(true);
              }}
              className="rounded-full border border-border/60 bg-background/75 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-background"
            >
              مفتاح
            </button>
            <button
              type="button"
              onClick={() => {
                resetWebhookForm();
                setShowWebhookForm(true);
              }}
              className="rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/90"
            >
              ربط
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
