import React, { useState, useEffect, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Checkbox } from "../../components/ui/checkbox";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../../components/ui/table";
import { Separator } from "../../components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "../../components/ui/tooltip";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  Plus, Trash2, CheckCircle, XCircle, RefreshCw, Bot, Key, Zap, Brain, User, Search, SlidersHorizontal, Play, Square, ImagePlus, Save, GripVertical, ChevronDown, ChevronUp, FlaskConical, Clock,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTheme } from "../../hooks/useTheme";
import i18n from "../../i18n";

import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

const BotIcon = ({ color, fontSize, className: cn }: { color?: string; fontSize?: string; className?: string }) => (
  <Bot className={`${cn || ""} ${color === "primary" ? "text-indigo-500" : color === "success" ? "text-green-500" : color === "error" ? "text-red-500" : color === "warning" ? "text-amber-500" : color === "info" ? "text-blue-500" : color === "secondary" ? "text-gray-500" : "text-current"} ${fontSize === "small" ? "h-4 w-4" : "h-5 w-5"}`} />
);
const BoltIcon = ({ color, fontSize, className: cn }: { color?: string; fontSize?: string; className?: string }) => (
  <Zap className={`${cn || ""} ${color === "primary" ? "text-indigo-500" : color === "success" ? "text-green-500" : color === "error" ? "text-red-500" : color === "warning" ? "text-amber-500" : color === "info" ? "text-blue-500" : color === "secondary" ? "text-gray-500" : "text-current"} ${fontSize === "small" ? "h-4 w-4" : "h-5 w-5"}`} />
);
const BrainIcon = ({ color, fontSize, className: cn }: { color?: string; fontSize?: string; className?: string }) => (
  <Brain className={`${cn || ""} ${color === "primary" ? "text-indigo-500" : color === "success" ? "text-green-500" : color === "error" ? "text-red-500" : color === "warning" ? "text-amber-500" : color === "info" ? "text-blue-500" : color === "secondary" ? "text-gray-500" : "text-current"} ${fontSize === "small" ? "h-4 w-4" : "h-5 w-5"}`} />
);
const FaceIcon = ({ color, fontSize, className: cn }: { color?: string; fontSize?: string; className?: string }) => (
  <User className={`${cn || ""} ${color === "primary" ? "text-indigo-500" : color === "success" ? "text-green-500" : color === "error" ? "text-red-500" : color === "warning" ? "text-amber-500" : color === "info" ? "text-blue-500" : color === "secondary" ? "text-gray-500" : "text-current"} ${fontSize === "small" ? "h-4 w-4" : "h-5 w-5"}`} />
);

const PROVIDERS = [
  {
    value: "GOOGLE",
    label: "Google Gemini",
    icon: <BoltIcon color="warning" />,
  },
  {
    value: "DEEPSEEK",
    label: "DeepSeek (V3/R1)",
    icon: <BrainIcon color="primary" />,
  },
  { value: "OPENAI", label: "OpenAI (GPT)", icon: <BotIcon color="success" /> },
  {
    value: "ANTHROPIC",
    label: "Anthropic (Claude)",
    icon: <BotIcon color="error" />,
  },
  {
    value: "HUGGINGFACE",
    label: "Hugging Face (Hub)",
    icon: <FaceIcon color="warning" />,
  },
  { value: "OLLAMA", label: "Ollama (Local)", icon: <BotIcon color="info" /> },
  { value: "GROQ", label: "Groq (LPU)", icon: <BoltIcon color="secondary" /> },
  {
    value: "OPENROUTER",
    label: "OpenRouter",
    icon: <BoltIcon color="primary" />,
  },
  {
    value: "NVIDIA",
    label: "NVIDIA NIM",
    icon: <BoltIcon color="success" />,
  },
  {
    value: "CEREBRAS",
    label: "Cerebras",
    icon: <BoltIcon color="secondary" />,
  },
  {
    value: "GITHUB",
    label: "GitHub Models",
    icon: <BoltIcon color="primary" />,
  },
  {
    value: "SAMBANOVA",
    label: "SambaNova",
    icon: <BoltIcon color="secondary" />,
  },
  {
    value: "MISTRAL",
    label: "Mistral",
    icon: <BoltIcon color="primary" />,
  },
];

const DEFAULT_BASE_URLS: Record<string, string> = {
  DEEPSEEK: "https://api.deepseek.com",
  GROQ: "https://api.groq.com/openai/v1",
  OLLAMA: "https://ollama.maxp.online",
  OPENROUTER: "https://openrouter.ai/api/v1",
  NVIDIA: "https://integrate.api.nvidia.com/v1",
  CEREBRAS: "https://api.cerebras.ai/v1",
  GITHUB: "https://models.github.ai/inference",
  SAMBANOVA: "https://api.sambanova.ai/v1",
  MISTRAL: "https://api.mistral.ai/v1",
};

const DEFAULT_MODELS: Record<string, string> = {
  GOOGLE: "gemini-2.5-flash",
  DEEPSEEK: "deepseek-v4-flash",
  OPENAI: "gpt-4o-mini",
  ANTHROPIC: "claude-sonnet-4-20250514",
  HUGGINGFACE: "mistralai/Mistral-7B-Instruct-v0.3",
  OLLAMA: "llama3.2",
  GROQ: "llama-3.3-70b-versatile",
  OPENROUTER: "openrouter/auto",
  NVIDIA: "openai/gpt-oss-120b",
  CEREBRAS: "qwen-3-235b-a22b-instruct-2507",
  GITHUB: "gpt-4o",
  SAMBANOVA: "DeepSeek-V3.1",
  MISTRAL: "mistral-large-latest",
};

const GOOGLE_GEMINI_MODELS = [
  "gemini-3-pro-preview",
  "gemini-3-pro-image-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite-preview-09-2025",
  "gemini-2.5-flash-image",
  "gemini-2.5-pro-preview-tts",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-preview-image-generation",
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
];

const DEEPSEEK_MODELS = [
  "deepseek-v4-flash",
  "deepseek-v4-pro",
];

const STATIC_PROVIDER_MODELS: Record<string, string[]> = {
  GOOGLE: GOOGLE_GEMINI_MODELS,
  DEEPSEEK: DEEPSEEK_MODELS,
  GROQ: [DEFAULT_MODELS["GROQ"] ?? ""].filter(Boolean),
  NVIDIA: [DEFAULT_MODELS["NVIDIA"] ?? ""].filter(Boolean),

};

const DEFAULT_VISION_MODELS: Record<string, string> = {
  GOOGLE: "gemini-2.5-flash",
  OPENROUTER: "openrouter/free",
};

const DEFAULT_PRODUCT_LANDING_IMAGE_MODEL = "black-forest-labs/flux.1-dev";

const NVIDIA_IMAGE_MODELS = [DEFAULT_PRODUCT_LANDING_IMAGE_MODEL];

type FacebookAdsGenerationMode = "SYSTEM_DEFAULT" | "SPECIFIC_KEY";

type FacebookAdsGenerationSettings = {
  mode: FacebookAdsGenerationMode;
  aiKeyId?: string | null;
};

type ProductLandingImageGenerationMode = "SYSTEM_DEFAULT" | "SPECIFIC_MODEL";

type ProductLandingImageGenerationSettings = {
  mode: ProductLandingImageGenerationMode;
  provider?: string | null;
  aiKeyId?: string | null;
  model?: string | null;
};

type EmbeddingMode = "SYSTEM_DEFAULT" | "SPECIFIC_KEY";

type EmbeddingSettings = {
  mode: EmbeddingMode;
  model?: string;
  dimension?: number;
  aiKeyId?: string | null;
};

const DEFAULT_EMBEDDING_SETTINGS: EmbeddingSettings = {
  mode: "SYSTEM_DEFAULT",
  model: "gemini-embedding-2",
  dimension: 768,
  aiKeyId: null,
};

type EmbeddingHealth = {
  status?: "OK" | "DEGRADED" | "MISCONFIGURED" | string;
  reason?: string;
  provider?: string;
  requiredModel?: string;
  requiredDimension?: number;
  configuredModel?: string;
  configuredDimension?: number;
  mode?: EmbeddingMode;
  selectedKeyId?: string | null;
  selectedKeyName?: string | null;
  hasActiveGoogleKey?: boolean;
  activeGoogleKeyCount?: number;
  warnings?: string[];
  runtimeFailure?: {
    context?: string;
    reason?: string;
    consecutiveFailures?: number;
    repeated?: boolean;
    lastAt?: string | null;
  } | null;
  fallback?: "NONE" | "TEXT_ONLY_SEARCH" | string;
  checkedAt?: string | null;
};

type IntentClassificationMode = "SYSTEM_DEFAULT" | "SPECIFIC_KEY";

type IntentClassificationSettings = {
  mode: IntentClassificationMode;
  provider?: string;
  primaryModel?: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  aiKeyId?: string | null;
  fallbackAiKeyId?: string | null;
};

const DEFAULT_INTENT_CLASSIFICATION_SETTINGS: IntentClassificationSettings = {
  mode: "SYSTEM_DEFAULT",
  provider: "GOOGLE",
  primaryModel: "gemini-3-flash-preview",
  fallbackProvider: "OPENAI",
  fallbackModel: "gpt-4o-mini",
  aiKeyId: null,
  fallbackAiKeyId: null,
};

const EMBEDDING_MODELS = [
  {
    id: "gemini-embedding-001",
    labelKey: "superAdmin.aiProviders.embedding.models.geminiEmbedding001",
    isMultimodal: false,
  },
  {
    id: "gemini-embedding-2",
    labelKey: "superAdmin.aiProviders.embedding.models.geminiEmbedding2",
    isMultimodal: true,
  },
  {
    id: "gemini-embedding-005",
    labelKey: "superAdmin.aiProviders.embedding.models.geminiEmbedding005",
    isMultimodal: true,
  },
];

const EMBEDDING_DIMENSIONS = [768, 1536, 3072];

const DEFAULT_FACEBOOK_ADS_GENERATION: FacebookAdsGenerationSettings = {
  mode: "SYSTEM_DEFAULT",
  aiKeyId: null,
};

const DEFAULT_PRODUCT_LANDING_IMAGE_GENERATION: ProductLandingImageGenerationSettings =
  {
    mode: "SYSTEM_DEFAULT",
    provider: "NVIDIA",
    aiKeyId: null,
    model: DEFAULT_PRODUCT_LANDING_IMAGE_MODEL,
  };

const MANAGED_BASE_URLS = Object.values(DEFAULT_BASE_URLS);
const MANAGED_MODELS = Object.values(DEFAULT_MODELS);

const createInitialFormData = () => ({
  name: "",
  provider: "GOOGLE",
  apiKey: "",
  baseUrl: "",
  defaultModel: DEFAULT_MODELS["GOOGLE"] ?? "",
});

const getProviderDefaultModel = (provider?: string) =>
  provider ? DEFAULT_MODELS[provider] || "" : "";

const getStaticProviderModels = (provider?: string) =>
  provider ? STATIC_PROVIDER_MODELS[provider] || [] : [];

const getAgentFitColor = (fit?: AgentSuitability) => {
  if (fit?.agentReady) return "success";
  if (fit?.nativeToolCalling) return "warning";
  return "default";
};

const getAgentFitLabel = (fit?: AgentSuitability) => {
  if (!fit) return "Unknown";
  return fit.agentReady ? "Agent ready" : fit.nativeToolCalling ? "Tool-capable" : "Chat only";
};

const getAgentFitTooltip = (fit?: AgentSuitability) => {
  if (!fit) return "No suitability metadata was returned for this model.";
  const capabilities = [
    fit.tools ? "tools" : null,
    fit.toolChoice ? "tool choice" : null,
    fit.structuredOutputs ? "structured outputs" : null,
  ].filter(Boolean).join(", ") || "chat only";
  const notes = [...(fit.strengths || []), ...(fit.warnings || [])].join(" ");
  return `Capabilities: ${capabilities}. Confidence: ${fit.confidence || "unknown"}.${notes ? ` ${notes}` : ""}`;
};

type GlobalConfigState = {
  defaultProvider: string;
  enableFailover?: boolean;
  visionProvider?: string | null;
  visionModel?: string | null;
  preferredAiKeyIds?: Record<string, string>;
  facebookAdsGeneration?: FacebookAdsGenerationSettings;
  productLandingImageGeneration?: ProductLandingImageGenerationSettings;
  embedding?: EmbeddingSettings;
  embeddingHealth?: EmbeddingHealth | null;
  intentClassification?: IntentClassificationSettings;
};

type AiModelConfig = {
  id?: string;
  modelName: string;
  priority: number;
  isEnabled: boolean;
  agentSuitability?: AgentSuitability;
};

type AgentSuitability = {
  tools?: boolean;
  toolChoice?: boolean;
  structuredOutputs?: boolean;
  nativeToolCalling?: boolean;
  agentReady?: boolean;
  confidence?: "high" | "medium" | "low" | string;
  label?: string;
  warnings?: string[];
  strengths?: string[];
};

type AiRoutingStatus = {
  lastSelectedAt?: string | null;
  lastSelectedProvider?: string | null;
  lastSelectedModel?: string | null;
  lastSelectedPool?: string | null;
  lastSelectedCompanyId?: string | null;
  lastSelectedActiveProvider?: string | null;
  lastSucceededAt?: string | null;
  lastSucceededProvider?: string | null;
  lastSucceededModel?: string | null;
  lastSucceededPool?: string | null;
  lastSucceededCompanyId?: string | null;
  lastSucceededActiveProvider?: string | null;
  source?: string | null;
  successSource?: string | null;
  successCount?: number;
  selectionCount?: number;
  lastTestedAt?: string | null;
  lastTestStatus?: "success" | "failed" | string | null;
  lastTestProvider?: string | null;
  lastTestModel?: string | null;
  lastTestLatencyMs?: number | null;
  lastTestError?: string | null;
  testCount?: number;
};

type AiKeyRow = {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
  isActive: boolean;
  routingStatus?: AiRoutingStatus;
  aiModelConfigs?: AiModelConfig[];
  activeModel?: AiModelConfig | null;
  agentSuitability?: AgentSuitability;
};

type AiFilters = {
  search: string;
  provider: string;
  status: string;
};

type RoutingPreview = {
  keyId: string;
  keyName: string;
  provider: string;
  model: string;
  selectedPool?: string;
  activeProvider?: string;
  preferredKeyId?: string | null;
  manualOverride?: boolean;
  keyType?: string;
  dryRun?: boolean;
};

type ProviderPriorityStats = {
  success: number;
  failure: number;
  rateLimit: number;
  avgResponseTimeMs?: number | null;
};

type ProviderPriorityRouting = {
  selectionCount: number;
  successCount: number;
  testCount: number;
  lastTestedAt?: string | null;
  lastTestStatus?: string | null;
  lastTestLatencyMs?: number | null;
  lastTestError?: string | null;
};

type ProviderPriorityItem = {
  provider: string;
  priority: number;
  totalKeyCount: number;
  activeKeyCount: number;
  hasActiveKey: boolean;
  activeModel?: string | null;
  activeKeyName?: string | null;
  stats24h: ProviderPriorityStats;
  routing: ProviderPriorityRouting;
};

type ProviderPriorityViewItem = ProviderPriorityItem & {
  label: string;
  icon?: React.ReactNode;
};

type ProviderDashboardBudget = {
  limited: boolean;
  allowed: boolean;
  reason?: string | null;
  severity?: "unconfigured" | "ready" | "watch" | "exhausted" | string;
  limits?: Record<string, number>;
  usage?: {
    minute?: { requests?: number; tokens?: number };
    day?: { requests?: number; tokens?: number };
  };
  penalty?: {
    reason?: string | null;
    retryAt?: number | string | null;
    retryAfterMs?: number | null;
  } | null;
};

type ProviderDashboardKey = {
  id: string;
  name: string;
  provider: string;
  isActive: boolean;
  keyType?: string | null;
  maskedApiKey?: string | null;
  activeModel?: AiModelConfig | null;
  routingStatus?: AiRoutingStatus;
  budget?: ProviderDashboardBudget;
};

type ProviderDashboardProvider = {
  provider: string;
  label: string;
  adapter?: string;
  defaultModel?: string | null;
  baseUrl?: string | null;
  strength?: string;
  freeTierHint?: string;
  limitHints?: Record<string, number>;
  notes?: string[];
  priority: number;
  totalKeyCount: number;
  activeKeyCount: number;
  limitedKeyCount: number;
  exhaustedKeyCount: number;
  watchKeyCount: number;
  activeModel?: string | null;
  latestSuccessKey?: {
    id: string;
    name: string;
    model?: string | null;
    at?: string | null;
  } | null;
  stats24h: {
    total: number;
    success: number;
    failed: number;
    warning: number;
    rateLimit: number;
    avgLatencyMs?: number | null;
  };
  healthStatus: string;
};

type ProviderDashboardSummary = {
  sinceHours: number;
  totalProviders: number;
  readyProviders: number;
  totalKeys: number;
  activeKeys: number;
  limitedKeys: number;
  exhaustedKeys: number;
  requests24h: number;
  successes24h: number;
  failures24h: number;
  rateLimits24h: number;
  avgLatencyMs?: number | null;
};

type ProviderDashboardData = {
  summary: ProviderDashboardSummary;
  providerPriority: string[];
  providers: ProviderDashboardProvider[];
  keys: ProviderDashboardKey[];
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error";

const normalizeFacebookAdsGeneration = (
  settings?: Partial<FacebookAdsGenerationSettings> | null,
): FacebookAdsGenerationSettings => {
  const mode =
    settings?.mode === "SPECIFIC_KEY" ? "SPECIFIC_KEY" : "SYSTEM_DEFAULT";
  const aiKeyId =
    typeof settings?.aiKeyId === "string" && settings.aiKeyId.trim()
      ? settings.aiKeyId.trim()
      : null;

  return {
    mode,
    aiKeyId: mode === "SPECIFIC_KEY" ? aiKeyId : null,
  };
};

const normalizeProductLandingImageGeneration = (
  settings?: Partial<ProductLandingImageGenerationSettings> | null,
): ProductLandingImageGenerationSettings => {
  const mode =
    settings?.mode === "SPECIFIC_MODEL" ? "SPECIFIC_MODEL" : "SYSTEM_DEFAULT";
  const provider = settings?.provider || "NVIDIA";
  const aiKeyId =
    typeof settings?.aiKeyId === "string" && settings.aiKeyId.trim()
      ? settings.aiKeyId.trim()
      : null;
  const model =
    typeof settings?.model === "string" && settings.model.trim()
      ? settings.model.trim()
      : DEFAULT_PRODUCT_LANDING_IMAGE_MODEL;

  return {
    mode,
    provider,
    aiKeyId: mode === "SPECIFIC_MODEL" ? aiKeyId : null,
    model,
  };
};

const normalizeEmbedding = (
  raw?: Partial<EmbeddingSettings> | null,
): EmbeddingSettings => ({
  mode: raw?.mode === "SPECIFIC_KEY" ? "SPECIFIC_KEY" : "SYSTEM_DEFAULT",
  model: EMBEDDING_MODELS.some((m) => m.id === raw?.model)
    ? raw!.model!
    : DEFAULT_EMBEDDING_SETTINGS.model,
  dimension: EMBEDDING_DIMENSIONS.includes(Number(raw?.dimension))
    ? Number(raw?.dimension)
    : DEFAULT_EMBEDDING_SETTINGS.dimension,
  aiKeyId: raw?.mode === "SPECIFIC_KEY" && raw?.aiKeyId ? raw.aiKeyId : null,
});

const normalizeEmbeddingHealth = (
  raw?: Partial<EmbeddingHealth> | null,
): EmbeddingHealth | null => {
  if (!raw) return null;
  return {
    status: raw.status || "DEGRADED",
    reason: raw.reason || "UNKNOWN",
    provider: raw.provider || "GOOGLE",
    requiredModel: raw.requiredModel || DEFAULT_EMBEDDING_SETTINGS.model,
    requiredDimension:
      Number(raw.requiredDimension) || DEFAULT_EMBEDDING_SETTINGS.dimension,
    configuredModel: raw.configuredModel || raw.requiredModel,
    configuredDimension:
      Number(raw.configuredDimension) || Number(raw.requiredDimension) || 768,
    mode: raw.mode === "SPECIFIC_KEY" ? "SPECIFIC_KEY" : "SYSTEM_DEFAULT",
    selectedKeyId: raw.selectedKeyId || null,
    selectedKeyName: raw.selectedKeyName || null,
    hasActiveGoogleKey: Boolean(raw.hasActiveGoogleKey),
    activeGoogleKeyCount: Number(raw.activeGoogleKeyCount || 0),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.filter(Boolean) : [],
    runtimeFailure: raw.runtimeFailure
      ? {
          context: raw.runtimeFailure.context || "UNKNOWN",
          reason: raw.runtimeFailure.reason || "UNKNOWN",
          consecutiveFailures: Number(raw.runtimeFailure.consecutiveFailures || 0),
          repeated: Boolean(raw.runtimeFailure.repeated),
          lastAt: raw.runtimeFailure.lastAt || null,
        }
      : null,
    fallback: raw.fallback || "NONE",
    checkedAt: raw.checkedAt || null,
  };
};

const normalizeGlobalConfig = (
  config?: Partial<GlobalConfigState> | null,
): GlobalConfigState => ({
  ...(config || {}),
  defaultProvider: config?.defaultProvider || "GOOGLE",
  enableFailover: config?.enableFailover ?? true,
  preferredAiKeyIds: config?.preferredAiKeyIds || {},
  facebookAdsGeneration: normalizeFacebookAdsGeneration(
    config?.facebookAdsGeneration,
  ),
  productLandingImageGeneration: normalizeProductLandingImageGeneration(
    config?.productLandingImageGeneration,
  ),
  embedding: normalizeEmbedding(config?.embedding),
  embeddingHealth: normalizeEmbeddingHealth(config?.embeddingHealth),
});

const getEmbeddingHealthSeverity = (
  health?: EmbeddingHealth | null,
): "success" | "warning" | "error" | "info" => {
  if (!health) return "info";
  if (health.status === "OK" && (health.warnings || []).length === 0) {
    return "success";
  }
  if (health.status === "MISCONFIGURED") return "error";
  return "warning";
};

const translateEmbeddingHealthToken = (
  group: "statuses" | "reasons" | "warnings" | "fallbacks",
  token?: string,
) =>
  i18n.t(`superAdmin.aiProviders.embedding.health.${group}.${token || "UNKNOWN"}`, {
    defaultValue: token || "UNKNOWN",
  });

const formatRoutingTime = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
};

const formatLatency = (value?: number | null) =>
  Number.isFinite(Number(value)) ? `${Math.round(Number(value))}ms` : "No data";

const formatCompactNumber = (value?: number | null) => {
  const numericValue = Number(value || 0);
  if (numericValue >= 1_000_000) return `${(numericValue / 1_000_000).toFixed(1)}M`;
  if (numericValue >= 1_000) return `${(numericValue / 1_000).toFixed(1)}K`;
  return String(Math.round(numericValue));
};

const formatProviderLimits = (limits?: Record<string, number>) => {
  const entries = Object.entries(limits || {}).filter(([, value]) =>
    Number.isFinite(Number(value)),
  );
  if (entries.length === 0) return "No budget limits";
  return entries
    .map(([name, value]) => `${name.toUpperCase()} ${formatCompactNumber(value)}`)
    .join(" · ");
};

type MuiChipColor = "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning";

const getProviderHealthColor = (status?: string): MuiChipColor => {
  if (status === "ready") return "success";
  if (status === "watch") return "warning";
  if (status === "degraded" || status === "budget_exhausted") return "error";
  if (status === "missing_key") return "default";
  return "default";
};

const getBudgetColor = (budget?: ProviderDashboardBudget): MuiChipColor => {
  if (!budget?.limited) return "default";
  if (!budget.allowed || budget.severity === "exhausted") return "error";
  if (budget.severity === "watch") return "warning";
  return "success";
};

const RuntimeDashboardPanel = ({
  dashboard,
  loading,
  isDark,
  onRefresh,
}: {
  dashboard: ProviderDashboardData | null;
  loading: boolean;
  isDark: boolean;
  onRefresh: () => void;
}) => {
  if (loading && !dashboard) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex flex-row gap-2 items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
          <span className="text-sm text-gray-500">
            Loading provider runtime dashboard...
          </span>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Alert variant="default" className="border-blue-500/50">
        <AlertDescription>
          Provider dashboard data is not available yet.
        </AlertDescription>
      </Alert>
    );
  }

  const topKeys = dashboard.keys
    .filter((key) => key.budget?.limited)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="rounded-lg border bg-card text-card-foreground shadow-sm"
        style={{ padding: "clamp(8px, 1.25vw, 12px)" }}
      >
        <div
          className="flex flex-col md:flex-row gap-1 items-stretch md:items-center justify-between"
          style={{ marginBottom: 6 }}
        >
          <div>
            <span className="text-base font-black" style={{ fontSize: "1rem", lineHeight: 1.2 }}>
              Runtime Dashboard
            </span>
            <span className="text-sm text-gray-500">
              Health, budget limits, fallback readiness, and recent provider traffic.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        <div
          className="grid grid-cols-2 md:grid-cols-6"
          style={{ gap: 4 }}
        >
          {[
            ["Ready providers", `${dashboard.summary.readyProviders}/${dashboard.summary.totalProviders}`],
            ["Active keys", `${dashboard.summary.activeKeys}/${dashboard.summary.totalKeys}`],
            ["Budgeted keys", dashboard.summary.limitedKeys],
            ["Budget blocked", dashboard.summary.exhaustedKeys],
            [`Requests ${dashboard.summary.sinceHours}h`, dashboard.summary.requests24h],
            ["Avg latency", formatLatency(dashboard.summary.avgLatencyMs)],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-lg border bg-card text-card-foreground shadow-sm p-2"
              style={{ minHeight: 74 }}
            >
              <span className="text-xs text-gray-500">
                {label}
              </span>
              <span className="text-lg font-black" style={{ marginTop: 2 }}>
                {typeof value === "number" ? formatCompactNumber(value) : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.9fr]"
        style={{ gap: 6 }}
      >
        <div
          className="rounded-lg border bg-card text-card-foreground shadow-sm"
          style={{ padding: "clamp(8px, 1.25vw, 12px)" }}
        >
          <div className="flex flex-row items-center justify-between" style={{ marginBottom: 4 }}>
            <span className="text-sm font-black">
              Provider catalog and health
            </span>
            <Button
              variant="link"
              size="sm"
              asChild
            >
              <RouterLink to="/super-admin/ai-providers/provider-priority">
                Fallback chain
              </RouterLink>
            </Button>
          </div>
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ gap: 4 }}
          >
            {dashboard.providers.map((provider) => {
              const providerInfo = PROVIDERS.find((item) => item.value === provider.provider);
              return (
                <div
                  key={provider.provider}
                  className="rounded-lg border bg-card text-card-foreground shadow-sm p-2"
                  style={{ backgroundColor: isDark ? "rgba(15, 23, 42, 0.52)" : "#ffffff" }}
                >
                  <div className="flex flex-col" style={{ gap: 3 }}>
                    <div className="flex flex-row items-center" style={{ gap: 3 }}>
                      <div className="grid place-items-center" style={{ width: 28, height: 28 }}>
                        {providerInfo?.icon || <BotIcon className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-black truncate block">
                          #{provider.priority} {provider.label}
                        </span>
                        <span className="text-xs text-gray-500 truncate block">
                          {provider.adapter} · {provider.activeModel || provider.defaultModel || "No model"}
                        </span>
                      </div>
                      <Badge
                        className={getProviderHealthColor(provider.healthStatus) === "success" ? "bg-green-100 text-green-800 hover:bg-green-100" : getProviderHealthColor(provider.healthStatus) === "warning" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : getProviderHealthColor(provider.healthStatus) === "error" ? "bg-red-100 text-red-800 hover:bg-red-100" : "bg-gray-100 text-gray-800 hover:bg-gray-100"}
                        style={{ height: 22 }}
                      >
                        {provider.healthStatus.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <span className="text-xs text-gray-500" style={{ minHeight: 34 }}>
                      {provider.strength}
                    </span>

                    <div className="flex flex-row flex-wrap gap-0.5">
                      <Badge variant="outline" className="h-5 text-xs">{provider.activeKeyCount}/{provider.totalKeyCount} keys</Badge>
                      <Badge variant="outline" className="h-5 text-xs bg-green-50 text-green-700 border-green-200">{provider.stats24h.success} ok</Badge>
                      <Badge variant="outline" className={`h-5 text-xs ${provider.stats24h.failed ? "bg-red-50 text-red-700 border-red-200" : ""}`}>{provider.stats24h.failed} failed</Badge>
                      <Badge variant="outline" className={`h-5 text-xs ${provider.stats24h.rateLimit ? "bg-amber-50 text-amber-700 border-amber-200" : ""}`}>{provider.stats24h.rateLimit} limit</Badge>
                    </div>

                    <span className="text-xs text-gray-500">
                      {formatProviderLimits(provider.limitHints)}
                    </span>
                    {provider.latestSuccessKey && (
                      <span className="text-xs text-gray-500 truncate block">
                        Last success: {provider.latestSuccessKey.name} · {formatRoutingTime(provider.latestSuccessKey.at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div
            className="rounded-lg border bg-card text-card-foreground shadow-sm"
            style={{ padding: "clamp(8px, 1.25vw, 12px)" }}
          >
            <span className="text-sm font-black block" style={{ marginBottom: 4 }}>
              Budget ledger
            </span>
            {topKeys.length === 0 ? (
              <span className="text-sm text-gray-500">
                No keys have explicit RPM/RPD/TPM/TPD limits configured yet.
              </span>
            ) : (
              <div className="flex flex-col" style={{ gap: 3 }}>
                {topKeys.map((key) => (
                  <div key={key.id} className="rounded-lg border bg-card text-card-foreground shadow-sm p-2">
                    <div className="flex flex-row items-center" style={{ gap: 3 }}>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-black truncate block">
                          {key.name}
                        </span>
                        <span className="text-xs text-gray-500 truncate block">
                          {key.provider} · {key.activeModel?.modelName || "No model"}
                        </span>
                      </div>
                      <Badge
                        className={getBudgetColor(key.budget) === "error" ? "bg-red-100 text-red-800 hover:bg-red-100" : getBudgetColor(key.budget) === "warning" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : getBudgetColor(key.budget) === "success" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-gray-100 text-gray-800 hover:bg-gray-100"}
                        style={{ height: 22 }}
                      >
                        {key.budget?.allowed === false
                          ? key.budget.reason || "blocked"
                          : key.budget?.severity || "ready"}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500 block" style={{ marginTop: 3 }}>
                      {formatProviderLimits(key.budget?.limits)}
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Today: {formatCompactNumber(key.budget?.usage?.day?.requests)} req · {formatCompactNumber(key.budget?.usage?.day?.tokens)} tokens
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            className="rounded-lg border bg-card text-card-foreground shadow-sm"
            style={{ padding: "clamp(8px, 1.25vw, 12px)" }}
          >
            <div className="flex flex-row items-center justify-between" style={{ marginBottom: 4 }}>
              <span className="text-sm font-black">
                Recent analytics
              </span>
              <Button
                variant="link"
                size="sm"
                asChild
              >
                <RouterLink to="/super-admin/ai-providers/logs">
                  Logs
                </RouterLink>
              </Button>
            </div>
            <div className="flex flex-col" style={{ gap: 3 }}>
              <div className="flex flex-row flex-wrap gap-1">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{dashboard.summary.successes24h} successes</Badge>
                <Badge variant="outline" className={dashboard.summary.failures24h ? "bg-red-50 text-red-700 border-red-200" : ""}>{dashboard.summary.failures24h} failures</Badge>
                <Badge variant="outline" className={dashboard.summary.rateLimits24h ? "bg-amber-50 text-amber-700 border-amber-200" : ""}>{dashboard.summary.rateLimits24h} limit events</Badge>
              </div>
              <span className="text-sm text-gray-500">
                Provider logs are already the source of truth for full observability. This panel is the short operational view FreeLLMAPI had split across Keys, Fallback, and Analytics.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SortableProviderPriorityRow = ({
  item,
  index,
  isDark,
  expanded,
  testing,
  onToggle,
  onTest,
}: {
  item: ProviderPriorityViewItem;
  index: number;
  isDark: boolean;
  expanded: boolean;
  testing: boolean;
  onToggle: (provider: string) => void;
  onTest: (provider: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.provider });

  const successRate =
    item.routing.selectionCount > 0
      ? Math.round((item.routing.successCount / item.routing.selectionCount) * 100)
      : null;

  return (
    <div
      ref={setNodeRef}
      className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden"
      style={{
        borderColor: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.1)",
        backgroundColor: isDragging
          ? isDark ? "rgba(37, 99, 235, 0.18)" : "rgba(37, 99, 235, 0.08)"
          : undefined,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div
        className="flex flex-col md:flex-row gap-1 items-stretch md:items-center"
        style={{ padding: "4px 8px 3px" }}
      >
        <div className="flex flex-row items-center gap-1 min-w-0 flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  {...attributes}
                  {...listeners}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Drag to reorder</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Badge
            className={index === 0 ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-100" : ""}
            style={{ height: 24, fontWeight: 800 }}
          >
            #{index + 1}
          </Badge>
          <div className="grid place-items-center" style={{ width: 28, height: 28 }}>
            {item.icon || <BotIcon className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-black truncate block">
              {item.label}
            </span>
            <span className="text-xs text-gray-500 truncate block">
              {index === 0
                ? "Primary provider / المزود الأساسي"
                : `Fallback ${index} / احتياطي ${index}`}
            </span>
          </div>
        </div>

        <div className="flex flex-row flex-wrap items-center gap-1">
          <Badge
            variant="outline"
            className={`h-6 ${item.hasActiveKey ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
          >
            <span className="flex items-center gap-1">
              {item.hasActiveKey ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              <span>{item.activeKeyCount}/{item.totalKeyCount} active keys</span>
            </span>
          </Badge>
          <Badge
            variant="outline"
            className={`h-6 ${!item.activeModel ? "bg-amber-50 text-amber-700 border-amber-200" : ""}`}
            style={{ maxWidth: 210 }}
          >
            {item.activeModel || "No active model"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTest(item.provider)}
            disabled={testing || !item.hasActiveKey}
            className="whitespace-nowrap"
            style={{ minHeight: 30 }}
          >
            {testing ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600 mr-1" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-1" />
            )}
            Test Now
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onToggle(item.provider)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          <Separator />
          <div
            className="grid grid-cols-2 md:grid-cols-[repeat(6,minmax(120px,1fr))]"
            style={{ gap: 3, padding: "4px 8px 4px" }}
          >
            {[
              ["Active key", item.activeKeyName || "None"],
              ["24h success", item.stats24h.success],
              ["24h failures", item.stats24h.failure],
              ["Rate limits", item.stats24h.rateLimit],
              ["Avg latency", formatLatency(item.stats24h.avgResponseTimeMs)],
              ["Success rate", successRate === null ? "No data" : `${successRate}%`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded min-w-0"
                style={{
                  padding: "3px 4px",
                  backgroundColor: isDark ? "rgba(15, 23, 42, 0.58)" : "rgba(248, 250, 252, 0.95)",
                  border: "1px solid",
                  borderColor: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.08)",
                }}
              >
                <span className="text-xs text-gray-500 block">
                  {label}
                </span>
                <span className="text-sm font-black truncate block">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

type SuperAdminAIProvidersProps = {
  initialTab?: "dashboard" | "keys" | "config" | "priority";
  standalonePriority?: boolean;
};

const SuperAdminAIProviders = ({
  initialTab,
  standalonePriority = false,
}: SuperAdminAIProvidersProps) => {
  const { actualTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(additionalHeaders);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "keys" | "config" | "priority"
  >(
    initialTab || (standalonePriority ? "priority" : "dashboard"),
  );

  // Ollama Specific
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<string[]>([]);
  const [loadingOpenRouterModels, setLoadingOpenRouterModels] = useState(false);

  // Data States
  const [globalConfig, setGlobalConfig] = useState<GlobalConfigState>({
    defaultProvider: "GOOGLE",
    enableFailover: true,
    preferredAiKeyIds: {},
    facebookAdsGeneration: DEFAULT_FACEBOOK_ADS_GENERATION,
    embedding: DEFAULT_EMBEDDING_SETTINGS,
    embeddingHealth: null,
  });
  const [visionForm, setVisionForm] = useState<{ provider: string; model: string }>({
    provider: "OPENROUTER",
    model: DEFAULT_VISION_MODELS["OPENROUTER"] ?? "",
  });
  const [facebookAdsGenerationForm, setFacebookAdsGenerationForm] =
    useState<FacebookAdsGenerationSettings>(DEFAULT_FACEBOOK_ADS_GENERATION);
  const [
    productLandingImageGenerationForm,
    setProductLandingImageGenerationForm,
  ] = useState<ProductLandingImageGenerationSettings>(
    DEFAULT_PRODUCT_LANDING_IMAGE_GENERATION,
  );
  const [embeddingForm, setEmbeddingForm] =
    useState<EmbeddingSettings>(DEFAULT_EMBEDDING_SETTINGS);
  const [intentClassificationForm, setIntentClassificationForm] =
    useState<IntentClassificationSettings>(DEFAULT_INTENT_CLASSIFICATION_SETTINGS);
  const [keys, setKeys] = useState<AiKeyRow[]>([]);
  const [providerDashboard, setProviderDashboard] =
    useState<ProviderDashboardData | null>(null);
  const [filteredKeys, setFilteredKeys] = useState<AiKeyRow[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [providerPriority, setProviderPriority] = useState<string[]>(
    PROVIDERS.map((provider) => provider.value),
  );
  const [providerPriorityItems, setProviderPriorityItems] = useState<
    ProviderPriorityItem[]
  >([]);
  const [savingProviderPriority, setSavingProviderPriority] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
  const lastModelCommitRef = useRef<Record<string, string>>({});
  const [routingPreview, setRoutingPreview] = useState<RoutingPreview | null>(
    null,
  );
  const [testingRouting, setTestingRouting] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [settingPreferredKeyId, setSettingPreferredKeyId] = useState<
    string | null
  >(null);

  // Filter States
  const [filters, setFilters] = useState<AiFilters>({
    search: "",
    provider: "",
    status: "",
  });
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData);

  const applyFilters = (
    keysToFilter: AiKeyRow[],
    currentFilters: AiFilters,
  ) => {
    let filtered = [...keysToFilter];

    // Search filter
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      filtered = filtered.filter(
        (key) =>
          key.name.toLowerCase().includes(searchLower) ||
          key.provider.toLowerCase().includes(searchLower) ||
          key.apiKey.substring(0, 8).toLowerCase().includes(searchLower),
      );
    }

    // Provider filter
    if (currentFilters.provider) {
      filtered = filtered.filter(
        (key) => key.provider === currentFilters.provider,
      );
    }

    // Status filter
    if (currentFilters.status !== "") {
      const isActive = currentFilters.status === "active";
      filtered = filtered.filter((key) => key.isActive === isActive);
    }

    setFilteredKeys(filtered);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh dashboard every 30s when the dashboard tab is active
  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const interval = setInterval(() => {
      fetch(buildApiUrl("super-admin/ai/provider-dashboard"), {
        headers: getAuthHeaders(),
      })
        .then(r => r.json())
        .then(d => { if (d.success) setProviderDashboard(d.data); })
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (keys.length > 0) {
      applyFilters(keys, filters);
    }
  }, [filters, keys]);

  const loadRoutingPreview = async (
    provider = globalConfig.defaultProvider,
    options: { silent?: boolean } = {},
  ) => {
    try {
      if (!options.silent) {
        setTestingRouting(true);
        setError(null);
      }

      const response = await fetch(
        buildApiUrl("super-admin/ai/routing-preview"),
        {
          method: "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ provider }),
        },
      );
      const data = await response.json();

      if (data.success) {
        setRoutingPreview(data.data);
        if (!options.silent) {
          setSuccess(
            `Currently routed to ${data.data.keyName} (${data.data.provider}) / ${data.data.model}`,
          );
        }
        return data.data as RoutingPreview;
      }

      setRoutingPreview(null);
      if (!options.silent) {
        setError(data.message || "Failed to preview routing.");
      }
    } catch (err) {
      setRoutingPreview(null);
      if (!options.silent) {
        setError(`Failed to preview routing: ${getErrorMessage(err)}`);
      }
    } finally {
      if (!options.silent) setTestingRouting(false);
    }

    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      const [configRes, keysRes, priorityRes, dashboardRes] = await Promise.all([
        fetch(buildApiUrl("super-admin/ai/config"), { headers }),
        fetch(buildApiUrl("super-admin/ai/keys"), { headers }),
        fetch(buildApiUrl("super-admin/ai/provider-priority"), { headers }),
        fetch(buildApiUrl("super-admin/ai/provider-dashboard"), { headers }),
      ]);

      const configData = await configRes.json();
      const keysData = await keysRes.json();
      const priorityData = await priorityRes.json();
      const dashboardData = await dashboardRes.json();

      if (configData.success) {
        const loadedConfig = normalizeGlobalConfig(configData.data);
        setGlobalConfig(loadedConfig);
        setFacebookAdsGenerationForm(
          normalizeFacebookAdsGeneration(loadedConfig.facebookAdsGeneration),
        );
        setProductLandingImageGenerationForm(
          normalizeProductLandingImageGeneration(
            loadedConfig.productLandingImageGeneration,
          ),
        );
        setEmbeddingForm(
          normalizeEmbedding(loadedConfig.embedding),
        );
        const visionProvider =
          loadedConfig.visionProvider ||
          loadedConfig.defaultProvider ||
          "OPENROUTER";
        setVisionForm({
          provider: visionProvider,
          model:
            loadedConfig.visionModel ||
            DEFAULT_VISION_MODELS[visionProvider] ||
            "",
        });
        loadRoutingPreview(loadedConfig.defaultProvider || "GOOGLE", {
          silent: true,
        });
      }
      if (keysData.success) {
        setKeys(keysData.data);
        setModelDrafts({});
        lastModelCommitRef.current = {};
        if (
          keysData.data.some((key: AiKeyRow) => key.provider === "OPENROUTER") &&
          openRouterModels.length === 0
        ) {
          fetchOpenRouterModels({ silent: true });
        }
      }
      if (priorityData.success) {
        setProviderPriority(priorityData.data.providerPriority || []);
        setProviderPriorityItems(priorityData.data.providers || []);
      }
      if (dashboardData.success) {
        setProviderDashboard(dashboardData.data);
      }
    } catch (err) {
      console.error("Failed to fetch AI data:", err);
      // Mock data for UI development if backend fails (remove later)
      // setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange =
    (field: keyof AiFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFilters({ ...filters, [field]: event.target.value });
    };

  const handleOpenAddDialog = () => {
    setFormData(createInitialFormData());
    setOllamaModels([]);
    setOpenDialog(true);
  };

  const handleSaveConfig = async (newProvider?: string) => {
    try {
      const response = await fetch(buildApiUrl("super-admin/ai/config"), {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          defaultProvider:
            newProvider !== undefined
              ? newProvider
              : globalConfig.defaultProvider,
          enableFailover:
            newProvider === undefined &&
            globalConfig.enableFailover !== undefined
              ? !globalConfig.enableFailover
              : globalConfig.enableFailover,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGlobalConfig(normalizeGlobalConfig(data.data));
        loadRoutingPreview(data.data.defaultProvider, { silent: true });
        setSuccess(
          newProvider
            ? `System now using ${newProvider} exclusively.`
            : `Failover setting updated.`,
        );
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to update configuration.");
    }
  };

  const saveProviderPriority = async (
    nextPriority = providerPriority,
    nextEnableFailover = globalConfig.enableFailover !== false,
  ) => {
    try {
      setSavingProviderPriority(true);
      setError(null);
      const response = await fetch(
        buildApiUrl("super-admin/ai/provider-priority"),
        {
          method: "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            providerPriority: nextPriority,
            enableFailover: nextEnableFailover,
          }),
        },
      );
      const data = await response.json();

      if (data.success) {
        setProviderPriority(data.data.providerPriority || nextPriority);
        setProviderPriorityItems(data.data.providers || []);
        setGlobalConfig((current) =>
          normalizeGlobalConfig({
            ...current,
            defaultProvider: data.data.defaultProvider || nextPriority[0],
            enableFailover: data.data.enableFailover,
          }),
        );
        loadRoutingPreview(data.data.defaultProvider || nextPriority[0], {
          silent: true,
        });
        setSuccess("Provider priority saved / تم حفظ ترتيب المزودين.");
      } else {
        setError(data.message || "Failed to save provider priority.");
      }
    } catch (err) {
      setError(`Failed to save provider priority: ${getErrorMessage(err)}`);
    } finally {
      setSavingProviderPriority(false);
    }
  };

  const handleProviderDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setProviderPriority((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  };

  const handleTogglePriorityFailover = () => {
    const nextEnableFailover = !(globalConfig.enableFailover !== false);
    setGlobalConfig((current) => ({
      ...current,
      enableFailover: nextEnableFailover,
    }));
    saveProviderPriority(providerPriority, nextEnableFailover);
  };

  const handleTestProvider = async (provider: string) => {
    try {
      setTestingProvider(provider);
      setError(null);
      const previewResponse = await fetch(
        buildApiUrl("super-admin/ai/routing-preview"),
        {
          method: "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ provider, strictProvider: true }),
        },
      );
      const previewData = await previewResponse.json();
      if (!previewData.success || !previewData.data?.keyId) {
        setError(previewData.message || `No active ${provider} key is available.`);
        return;
      }

      const testResponse = await fetch(
        buildApiUrl(`super-admin/ai/keys/${previewData.data.keyId}/test`),
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      const testData = await testResponse.json();
      if (testData.success && testData.data?.ok) {
        setSuccess(
          `${provider} test passed via ${testData.data.keyName || previewData.data.keyName}.`,
        );
      } else {
        setError(testData.message || `${provider} test failed.`);
      }
      fetchData();
    } catch (err) {
      setError(`Failed to test ${provider}: ${getErrorMessage(err)}`);
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSaveVisionConfig = async () => {
    try {
      const response = await fetch(buildApiUrl("super-admin/ai/config"), {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          defaultProvider: globalConfig.defaultProvider,
          enableFailover: globalConfig.enableFailover,
          visionProvider: visionForm.provider,
          visionModel: visionForm.model.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setGlobalConfig(normalizeGlobalConfig(data.data));
        setSuccess(`Vision model updated to ${visionForm.model.trim()}`);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to update vision configuration.");
    }
  };

  const handleSaveFacebookAdsGenerationConfig = async () => {
    const nextSettings = normalizeFacebookAdsGeneration(
      facebookAdsGenerationForm,
    );

    if (nextSettings.mode === "SPECIFIC_KEY" && !nextSettings.aiKeyId) {
      setError("Choose an active provider key for this routing.");
      return;
    }

    try {
      const response = await fetch(buildApiUrl("super-admin/ai/config"), {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          defaultProvider: globalConfig.defaultProvider,
          enableFailover: globalConfig.enableFailover,
          facebookAdsGeneration: nextSettings,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const normalizedConfig = normalizeGlobalConfig(data.data);
        setGlobalConfig(normalizedConfig);
        setFacebookAdsGenerationForm(
          normalizeFacebookAdsGeneration(
            normalizedConfig.facebookAdsGeneration,
          ),
        );
        setSuccess("Generation routing updated.");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to update generation routing.");
    }
  };

  const handleSaveProductLandingImageGenerationConfig = async () => {
    const nextSettings = normalizeProductLandingImageGeneration(
      productLandingImageGenerationForm,
    );

    if (nextSettings.mode === "SPECIFIC_MODEL") {
      if (!nextSettings.aiKeyId) {
        setError("Choose an active NVIDIA key for image routing.");
        return;
      }

      if (!nextSettings.model?.trim()) {
        setError("Choose an NVIDIA image model for image routing.");
        return;
      }
    }

    try {
      const response = await fetch(buildApiUrl("super-admin/ai/config"), {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          defaultProvider: globalConfig.defaultProvider,
          enableFailover: globalConfig.enableFailover,
          productLandingImageGeneration: nextSettings,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const normalizedConfig = normalizeGlobalConfig(data.data);
        setGlobalConfig(normalizedConfig);
        setProductLandingImageGenerationForm(
          normalizeProductLandingImageGeneration(
            normalizedConfig.productLandingImageGeneration,
          ),
        );
        setSuccess("Image generation routing updated.");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to update image generation routing.");
    }
  };

  const handleSaveEmbeddingConfig = async () => {
    const nextSettings = normalizeEmbedding(embeddingForm);

    if (nextSettings.mode === "SPECIFIC_KEY" && !nextSettings.aiKeyId) {
      setError(i18n.t("superAdmin.aiProviders.embedding.errors.chooseGoogleKey"));
      return;
    }

    try {
      const response = await fetch(buildApiUrl("super-admin/ai/config"), {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          defaultProvider: globalConfig.defaultProvider,
          enableFailover: globalConfig.enableFailover,
          embedding: nextSettings,
        }),
      });
      const data = await response.json();
      if (data.success) {
        const normalizedConfig = normalizeGlobalConfig(data.data);
        setGlobalConfig(normalizedConfig);
        setEmbeddingForm(
          normalizeEmbedding(normalizedConfig.embedding),
        );
        setSuccess(i18n.t("superAdmin.aiProviders.embedding.messages.updated"));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(i18n.t("superAdmin.aiProviders.embedding.errors.updateFailed"));
    }
  };

  const handleTestEmbedding = async () => {
    const nextSettings = normalizeEmbedding(embeddingForm);
    if (!nextSettings.aiKeyId) {
      setError(i18n.t("superAdmin.aiProviders.embedding.errors.selectKeyToTest"));
      return;
    }
    try {
      const response = await fetch(buildApiUrl("super-admin/ai/embedding/test"), {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          keyId: nextSettings.aiKeyId,
          text: "Test embedding query",
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(
          i18n.t("superAdmin.aiProviders.embedding.messages.testPassed", {
            model: data.data.model,
            dimension: data.data.dimension,
            latencyMs: data.data.latencyMs,
          }),
        );
      } else {
        setError(
          data.message ||
            i18n.t("superAdmin.aiProviders.embedding.errors.testFailed"),
        );
      }
    } catch (err) {
      setError(i18n.t("superAdmin.aiProviders.embedding.errors.testFailed"));
    }
  };

  const handlePreviewRouting = () => {
    loadRoutingPreview(globalConfig.defaultProvider);
  };

  const handleAddKey = async () => {
    try {
      const response = await fetch(buildApiUrl("super-admin/ai/keys"), {
        method: "POST",
        headers: getAuthHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          ...formData,
          modelName: formData.defaultModel, // Map to backend expected field
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSuccess("Key added successfully");
        setOpenDialog(false);
        fetchData(); // Reload
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Failed to add key.");
    }
  };

  const fetchOllamaModels = async () => {
    if (!formData.baseUrl) {
      setError("Please enter Base URL first (e.g. http://localhost:11434)");
      return;
    }
    try {
      setLoadingModels(true);
      setError(null);

      // Call our new backend proxy
      const response = await fetch(
        buildApiUrl(
          `super-admin/ai/ollama/models?baseUrl=${encodeURIComponent(formData.baseUrl)}`,
        ),
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();

      if (data.success) {
        setOllamaModels(data.models);
        setSuccess(`Found ${data.models.length} models!`);
      } else {
        setError(data.message);
        setOllamaModels([]);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to fetch models: ${getErrorMessage(err)}`);
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchOpenRouterModels = async (
    options: { silent?: boolean; baseUrl?: string } = {},
  ) => {
    try {
      setLoadingOpenRouterModels(true);
      if (!options.silent) setError(null);

      const targetBaseUrl =
        options.baseUrl || formData.baseUrl || DEFAULT_BASE_URLS["OPENROUTER"] || "";
      const response = await fetch(
        buildApiUrl(
          `super-admin/ai/openrouter/models?baseUrl=${encodeURIComponent(targetBaseUrl)}`,
        ),
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();

      if (data.success) {
        setOpenRouterModels(data.models);
        if (!options.silent) setSuccess(`Found ${data.models.length} models!`);
      } else if (!options.silent) {
        setError(data.message);
        setOpenRouterModels([]);
      }
    } catch (err) {
      console.error(err);
      if (!options.silent) {
        setError(
          `Failed to fetch OpenRouter models: ${getErrorMessage(err)}`,
        );
      }
    } finally {
      setLoadingOpenRouterModels(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this key?")) return;
    try {
      const response = await fetch(buildApiUrl(`super-admin/ai/keys/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setSuccess("Key deleted.");
        setSelectedKeys([]);
        fetchData();
      }
    } catch (err) {
      setError("Failed delete.");
    }
  };

  const handleToggleKeyStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        buildApiUrl(`super-admin/ai/keys/${id}/active-status`),
        {
          method: "PATCH",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ isActive: !currentStatus }),
        },
      );
      if (response.ok) {
        setSuccess(`Key ${!currentStatus ? "activated" : "deactivated"}.`);
        fetchData();
      }
    } catch (err) {
      setError("Failed to update key status.");
    }
  };

  const handleTestKey = async (id: string) => {
    try {
      setTestingKeyId(id);
      setError(null);

      const response = await fetch(
        buildApiUrl(`super-admin/ai/keys/${id}/test`),
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();

      if (data.success) {
        if (data.data?.ok) {
          setSuccess(
            `Key test passed for ${data.data.keyName} in ${data.data.latencyMs}ms.`,
          );
        } else {
          setError(
            `Key test failed for ${data.data?.keyName || "selected key"}: ${data.data?.error || "Unknown error"}`,
          );
        }
        fetchData();
      } else {
        setError(data.message || "Failed to test key.");
      }
    } catch (err) {
      setError(`Failed to test key: ${getErrorMessage(err)}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleSetPreferredKey = async (id: string) => {
    try {
      setSettingPreferredKeyId(id);
      setError(null);

      const response = await fetch(
        buildApiUrl(`super-admin/ai/keys/${id}/preferred`),
        {
          method: "POST",
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();

      if (data.success) {
        setGlobalConfig(normalizeGlobalConfig(data.data));
        setSuccess(`${data.preferredKey?.name || "Selected key"} is now preferred.`);
        fetchData();
      } else {
        setError(data.message || "Failed to set preferred key.");
      }
    } catch (err) {
      setError(`Failed to set preferred key: ${getErrorMessage(err)}`);
    } finally {
      setSettingPreferredKeyId(null);
    }
  };

  const handleClearPreferredKey = async (provider: string) => {
    try {
      setSettingPreferredKeyId(provider);
      setError(null);

      const response = await fetch(
        buildApiUrl(`super-admin/ai/preferred-key/${provider}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      const data = await response.json();

      if (data.success) {
        setGlobalConfig(normalizeGlobalConfig(data.data));
        setSuccess(`${provider} routing returned to automatic rotation.`);
        fetchData();
      } else {
        setError(data.message || "Failed to clear preferred key.");
      }
    } catch (err) {
      setError(`Failed to clear preferred key: ${getErrorMessage(err)}`);
    } finally {
      setSettingPreferredKeyId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedKeys.length} key(s)?`,
      )
    )
      return;

    try {
      const response = await fetch(
        buildApiUrl("super-admin/ai/keys/bulk-delete"),
        {
          method: "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ ids: selectedKeys }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(`${data.count} key(s) deleted successfully.`);
        setSelectedKeys([]);
        fetchData();
      } else {
        setError(data.message || "Failed to delete keys.");
      }
    } catch (err) {
      setError("Failed to delete keys.");
    }
  };

  const handleBulkUpdateStatus = async (isActive: boolean) => {
    if (selectedKeys.length === 0) return;

    try {
      const response = await fetch(
        buildApiUrl("super-admin/ai/keys/bulk-update-status"),
        {
          method: "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ ids: selectedKeys, isActive }),
        },
      );
      const data = await response.json();
      if (data.success) {
        setSuccess(
          `${data.count} key(s) ${isActive ? "activated" : "deactivated"} successfully.`,
        );
        setSelectedKeys([]);
        fetchData();
      } else {
        setError(data.message || "Failed to update keys status.");
      }
    } catch (err) {
      setError("Failed to update keys status.");
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedKeys(filteredKeys.map((key) => key.id));
    } else {
      setSelectedKeys([]);
    }
  };

  const handleSelectKey = (id: string) => {
    setSelectedKeys((prev) =>
      prev.includes(id) ? prev.filter((keyId) => keyId !== id) : [...prev, id],
    );
  };

  const handleUpdateActiveModel = async (keyId: string, modelName: string) => {
    const cleanModelName = modelName.trim();
    if (!cleanModelName) {
      setError("Model name is required.");
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(`super-admin/ai/keys/${keyId}/active-model`),
        {
          method: "POST",
          headers: getAuthHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ modelName: cleanModelName }),
        },
      );

      if (response.ok) {
        setSuccess(`Active model updated to ${cleanModelName}`);
        setModelDrafts((current) => ({
          ...current,
          [keyId]: cleanModelName,
        }));
        fetchData(); // Refresh UI to reflect changes
      } else {
        setError("Failed to update active model");
      }
    } catch (err) {
      setError("Error updating model");
      console.error(err);
    }
  };

  const commitActiveModel = (
    keyId: string,
    currentModel: string,
    nextModel: string,
  ) => {
    const cleanModelName = nextModel.trim();
    if (!cleanModelName || cleanModelName === currentModel.trim()) return;
    if (lastModelCommitRef.current[keyId] === cleanModelName) return;

    lastModelCommitRef.current[keyId] = cleanModelName;
    handleUpdateActiveModel(keyId, cleanModelName);
  };

  const activeProviderInfo = PROVIDERS.find(
    (p) => p.value === globalConfig.defaultProvider,
  );
  const visionModelOptions = Array.from(
    new Set([
      DEFAULT_VISION_MODELS[visionForm.provider] || "",
      ...(visionForm.provider === "OPENROUTER" ? openRouterModels : []),
      ...(visionForm.provider === "GOOGLE" ? GOOGLE_GEMINI_MODELS : []),
    ]),
  ).filter(Boolean);
  const latestSuccessByProvider = keys.reduce<
    Record<string, { keyId: string; succeededAt: number }>
  >((latest, key) => {
    const succeededAt = Date.parse(key.routingStatus?.lastSucceededAt || "");
    if (!Number.isFinite(succeededAt)) return latest;
    const current = latest[key.provider];
    if (!current || succeededAt > current.succeededAt) {
      latest[key.provider] = { keyId: key.id, succeededAt };
    }
    return latest;
  }, {});
  const activePreferredKeyId =
    globalConfig.preferredAiKeyIds?.[globalConfig.defaultProvider] || null;
  const activePreferredKey = keys.find((key) => key.id === activePreferredKeyId);
  const activeAiKeys = keys.filter((key) => key.isActive);
  const facebookAdsGenerationKey = keys.find(
    (key) => key.id === facebookAdsGenerationForm.aiKeyId,
  );
  const activeNvidiaKeys = activeAiKeys.filter(
    (key) => key.provider === "NVIDIA",
  );
  const productLandingImageGenerationKey = keys.find(
    (key) => key.id === productLandingImageGenerationForm.aiKeyId,
  );
  const productLandingImageKeyOptions =
    productLandingImageGenerationKey &&
    !activeNvidiaKeys.some((key) => key.id === productLandingImageGenerationKey.id)
      ? [productLandingImageGenerationKey, ...activeNvidiaKeys]
      : activeNvidiaKeys;
  const activeKeysCount = keys.filter((key) => key.isActive).length;
  const inactiveKeysCount = keys.length - activeKeysCount;
  const activeProviderLabel =
    activeProviderInfo?.label || globalConfig.defaultProvider;
  const hasActiveFilters = Boolean(
    filters.search || filters.provider || filters.status,
  );
  const routeSummary = routingPreview
    ? `${routingPreview.keyName} / ${routingPreview.model}`
    : activePreferredKey
      ? `${activePreferredKey.name} / preferred`
      : "Auto rotation";
  const routeProviderLabel =
    routingPreview?.provider || globalConfig.defaultProvider;
  const providerPriorityItemMap = new Map(
    providerPriorityItems.map((item) => [item.provider, item]),
  );
  const orderedProviderPriorityItems: ProviderPriorityViewItem[] =
    providerPriority.map((provider, index) => {
      const providerInfo = PROVIDERS.find((item) => item.value === provider);
      const backendItem = providerPriorityItemMap.get(provider);
      const providerKeys = keys.filter((key) => key.provider === provider);
      const activeProviderKeys = providerKeys.filter((key) => key.isActive);
      const fallbackActiveKey = activeProviderKeys[0] || null;
      const fallbackModel =
        fallbackActiveKey?.aiModelConfigs?.find((model) => model.isEnabled)
          ?.modelName || getProviderDefaultModel(provider);

      return {
        provider,
        priority: index + 1,
        totalKeyCount: backendItem?.totalKeyCount ?? providerKeys.length,
        activeKeyCount: backendItem?.activeKeyCount ?? activeProviderKeys.length,
        hasActiveKey:
          backendItem?.hasActiveKey ?? activeProviderKeys.length > 0,
        activeModel:
          backendItem?.activeModel ||
          (fallbackActiveKey ? fallbackModel : null),
        activeKeyName: backendItem?.activeKeyName || fallbackActiveKey?.name || null,
        stats24h: backendItem?.stats24h || {
          success: 0,
          failure: 0,
          rateLimit: 0,
          avgResponseTimeMs: null,
        },
        routing: backendItem?.routing || {
          selectionCount: 0,
          successCount: 0,
          testCount: 0,
        },
        label: providerInfo?.label || provider,
        icon: providerInfo?.icon,
      };
    });
  const embeddingHealth = globalConfig.embeddingHealth;
  const embeddingHealthSeverity = getEmbeddingHealthSeverity(embeddingHealth);
  const embeddingHealthReason = translateEmbeddingHealthToken(
    "reasons",
    embeddingHealth?.reason,
  );
  const embeddingHealthStatus = translateEmbeddingHealthToken(
    "statuses",
    embeddingHealth?.status,
  );
  const embeddingHealthFallback = translateEmbeddingHealthToken(
    "fallbacks",
    embeddingHealth?.fallback,
  );
  const embeddingRuntimeFailureReason = translateEmbeddingHealthToken(
    "reasons",
    embeddingHealth?.runtimeFailure?.reason,
  );
  const embeddingHealthWarnings = (embeddingHealth?.warnings || []).map((warning) =>
    translateEmbeddingHealthToken("warnings", warning),
  );

  return (
    <div
      className="p-1 md:p-1"
      style={{
        minHeight: "calc(100vh - 64px)",
        backgroundColor: isDark ? "rgba(2, 6, 23, 0.28)" : "rgba(248, 250, 252, 0.72)",
      }}
    >
      <div
        className="rounded-lg border bg-card text-card-foreground shadow-sm"
        style={{
          marginBottom: 6,
          padding: "clamp(6px, 1vw, 12px)",
          borderColor: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.1)",
          backgroundColor: isDark ? "rgba(15, 23, 42, 0.82)" : undefined,
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex flex-col lg:flex-row gap-1 items-stretch lg:items-center justify-between">
            <div className="flex flex-row gap-1 items-center min-w-0">
              <div
                className="rounded grid place-items-center flex-shrink-0"
                style={{
                  width: 34,
                  height: 34,
                  color: "#6366f1",
                  backgroundColor: isDark ? "rgba(96, 165, 250, 0.14)" : "rgba(37, 99, 235, 0.08)",
                  border: "1px solid",
                  borderColor: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
                }}
              >
                <BotIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-base font-black block leading-tight">
                  {standalonePriority
                    ? i18n.t("superAdmin.aiProviders.priority.title")
                    : "AI Keys & Provider Management"}
                </span>
                <div className="flex flex-row flex-wrap gap-0.5" style={{ marginTop: 2 }}>
                  <Badge variant="outline" className="h-5 text-xs border-indigo-200 text-indigo-700">{activeProviderLabel} active</Badge>
                  <Badge variant="outline" className={`h-5 text-xs ${activeKeysCount > 0 ? "bg-green-50 text-green-700 border-green-200" : ""}`}>{activeKeysCount} active keys</Badge>
                  <Badge variant="outline" className="h-5 text-xs">{inactiveKeysCount} inactive</Badge>
                  <Badge variant="outline" className="h-5 text-xs">{filteredKeys.length}/{keys.length} shown</Badge>
                </div>
              </div>
            </div>

            <Alert variant="default" className="border-blue-500/50 py-1 items-center">
              <AlertDescription>
                {standalonePriority ? (
                  i18n.t("superAdmin.aiProviders.priority.dragOrder")
                ) : (
                  i18n.t("superAdmin.aiProviders.globalKeys.description")
                )}
              </AlertDescription>
            </Alert>

            <div className="flex flex-row flex-wrap gap-1 justify-start lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchData}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              {standalonePriority ? (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <RouterLink to="/super-admin/ai-providers">
                    AI Keys
                  </RouterLink>
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <RouterLink to="/super-admin/ai-providers/provider-priority">
                      <GripVertical className="h-4 w-4 mr-1" />
                      Provider Priority
                    </RouterLink>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <RouterLink to="/super-admin/ai-providers/logs">
                      <Clock className="h-4 w-4 mr-1" />
                      Provider Logs
                    </RouterLink>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePreviewRouting}
                    disabled={testingRouting}
                  >
                    {testingRouting ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600 mr-1" />
                    ) : (
                      <Key className="h-4 w-4 mr-1" />
                    )}
                    Check Routing
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleOpenAddDialog}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add API Key
                  </Button>
                </>
              )}
            </div>
          </div>

          {!standalonePriority && (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
              <TabsList className="h-9">
                <TabsTrigger value="dashboard" className="text-xs font-black">Runtime Dashboard</TabsTrigger>
                <TabsTrigger value="keys" className="text-xs font-black">AI Keys</TabsTrigger>
                <TabsTrigger value="config" className="text-xs font-black">Global Config</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {activeTab === "config" && (
            <>
          <div
            className="grid grid-cols-1 md:grid-cols-[minmax(220px,0.85fr)_minmax(160px,0.55fr)_minmax(340px,1.6fr)] items-center"
            style={{ gap: 3 }}
          >
            <div
              className="flex flex-row items-center gap-1 rounded border"
              style={{
                minHeight: 42,
                padding: "0 3px",
                borderColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)",
              }}
            >
              {activeProviderInfo?.icon}
              <Select
                value={globalConfig.defaultProvider}
                onValueChange={(value) => handleSaveConfig(value)}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Active Provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-1">{p.icon} {p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="flex items-center justify-between rounded border min-h-[42px]"
              style={{
                padding: "0 3px",
                borderColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)",
              }}
            >
              <div className="mr-1">
                <span className="text-xs font-black block leading-tight">Smart Failover</span>
                <span className="text-xs text-gray-500 block leading-tight">Backup on failure</span>
              </div>
              <Switch
                size="default"
                checked={globalConfig.enableFailover !== false}
                onCheckedChange={() => handleSaveConfig(undefined)}
              />
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-[145px_minmax(180px,1fr)_auto] items-center"
              style={{ gap: 3 }}
            >
              <Select
                value={visionForm.provider}
                onValueChange={(nextProvider) => {
                  setVisionForm({
                    provider: nextProvider,
                    model: DEFAULT_VISION_MODELS[nextProvider] || visionForm.model || "",
                  });
                  if (nextProvider === "OPENROUTER" && openRouterModels.length === 0) {
                    fetchOpenRouterModels({ silent: true });
                  }
                }}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Vision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPENROUTER">OpenRouter</SelectItem>
                  <SelectItem value="GOOGLE">Google Gemini</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full">
                <ImagePlus className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder={visionForm.provider === "OPENROUTER" ? "openrouter/free" : "gemini-2.5-flash"}
                  value={visionForm.model}
                  onChange={(e) => setVisionForm((current) => ({ ...current, model: e.target.value }))}
                />
                {visionForm.provider === "OPENROUTER" && loadingOpenRouterModels && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 absolute right-2 top-1/2 -translate-y-1/2" />
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveVisionConfig}
                disabled={!visionForm.provider || !visionForm.model.trim()}
                className="whitespace-nowrap"
                style={{ minHeight: 40 }}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-[145px_minmax(180px,1fr)_100px_auto] items-center rounded border mt-1"
            style={{ gap: 3, padding: 3, borderColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)" }}
          >
            {embeddingHealth && (
              <Alert
                variant={embeddingHealthSeverity === "error" ? "destructive" : embeddingHealthSeverity === "warning" ? "default" : "default"}
                className={`col-span-full py-1 ${embeddingHealthSeverity === "warning" ? "border-yellow-500/50" : embeddingHealthSeverity === "success" ? "border-green-500/50" : embeddingHealthSeverity === "info" ? "border-blue-500/50" : ""}`}
              >
                <AlertDescription className="w-full">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-col sm:flex-row gap-1 items-start sm:items-center justify-between">
                      <div>
                        <span className="text-xs font-black block">
                          {i18n.t("superAdmin.aiProviders.embedding.health.title")}
                        </span>
                        <span className="text-xs text-gray-500 block">
                          {embeddingHealthReason}
                        </span>
                      </div>
                      <div className="flex flex-row flex-wrap gap-0.5">
                        <Badge
                          className={embeddingHealthSeverity === "error" ? "bg-red-100 text-red-800 hover:bg-red-100" : embeddingHealthSeverity === "warning" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : embeddingHealthSeverity === "success" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-blue-100 text-blue-800 hover:bg-blue-100"}
                        >
                          {i18n.t("superAdmin.aiProviders.embedding.health.statusChip", { status: embeddingHealthStatus })}
                        </Badge>
                        {embeddingHealth.fallback && embeddingHealth.fallback !== "NONE" && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {i18n.t("superAdmin.aiProviders.embedding.health.fallbackChip", { fallback: embeddingHealthFallback })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-row flex-wrap gap-0.5">
                      <Badge variant="outline">
                        {i18n.t("superAdmin.aiProviders.embedding.health.modelChip", { model: embeddingHealth.requiredModel || DEFAULT_EMBEDDING_SETTINGS.model })}
                      </Badge>
                      <Badge variant="outline">
                        {i18n.t("superAdmin.aiProviders.embedding.health.dimensionChip", { dimension: embeddingHealth.requiredDimension || DEFAULT_EMBEDDING_SETTINGS.dimension })}
                      </Badge>
                      <Badge variant="outline">
                        {i18n.t("superAdmin.aiProviders.embedding.health.activeKeysChip", { count: embeddingHealth.activeGoogleKeyCount || 0 })}
                      </Badge>
                    </div>
                    {embeddingHealthWarnings.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {i18n.t("superAdmin.aiProviders.embedding.health.warningsLabel", { warnings: embeddingHealthWarnings.join(" · ") })}
                      </span>
                    )}
                    {embeddingHealth.runtimeFailure && (
                      <span className="text-xs text-gray-500">
                        {i18n.t("superAdmin.aiProviders.embedding.health.runtimeFailure", { reason: embeddingRuntimeFailureReason, count: embeddingHealth.runtimeFailure.consecutiveFailures || 0, context: embeddingHealth.runtimeFailure.context || "UNKNOWN" })}
                      </span>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
            <span className="text-xs font-black whitespace-nowrap">
              {i18n.t("superAdmin.aiProviders.embedding.title")}
            </span>
            <Select
              value={embeddingForm.model || "gemini-embedding-2"}
              onValueChange={(value) =>
                setEmbeddingForm((prev) => ({
                  ...prev,
                  model: value,
                  dimension: value.includes("embedding-2") ? 768 : prev.dimension,
                }))
              }
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder={i18n.t("superAdmin.aiProviders.embedding.modelLabel")} />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {i18n.t(m.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(embeddingForm.dimension || 768)}
              onValueChange={(value) =>
                setEmbeddingForm((prev) => ({
                  ...prev,
                  dimension: Number(value),
                }))
              }
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder={i18n.t("superAdmin.aiProviders.embedding.dimensionsLabel")} />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveEmbeddingConfig}
              className="whitespace-nowrap"
              style={{ minHeight: 40 }}
            >
              <Save className="h-4 w-4 mr-1" />
              {i18n.t("superAdmin.aiProviders.embedding.save")}
            </Button>
          </div>

            </>
          )}

          {activeTab === "keys" && (
          <div
            className="flex flex-col xl:flex-row gap-1 items-stretch xl:items-center pt-1 border-t"
            style={{ borderColor: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.08)" }}
          >
            <div
              className="flex flex-row flex-wrap items-center gap-1 min-w-0"
              style={{ flex: "0 1 auto" }}
            >
              <div
                className="flex items-center gap-1 min-w-0 rounded"
                style={{
                  flex: "1 1 280px",
                  maxWidth: 460,
                  padding: "3px 4px",
                  backgroundColor: isDark ? "rgba(37, 99, 235, 0.12)" : "rgba(37, 99, 235, 0.06)",
                }}
              >
                <Key className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <span className="text-xs font-black flex-shrink-0">Route</span>
                <span className="text-xs text-gray-500 truncate">{routeProviderLabel}: {routeSummary}</span>
              </div>
              {activePreferredKey && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleClearPreferredKey(globalConfig.defaultProvider)}
                  disabled={settingPreferredKeyId === globalConfig.defaultProvider}
                  className="whitespace-nowrap"
                >
                  Auto rotation
                </Button>
              )}
            </div>

            <div
              className="grid grid-cols-1 sm:grid-cols-[minmax(220px,1fr)_145px_130px_auto] gap-1"
              style={{ flex: "0 1 auto" }}
            >
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <Input
                  className="pl-8 h-9 text-sm"
                  placeholder="Search name, provider, or key"
                  value={filters.search}
                  onChange={handleFilterChange("search")}
                />
              </div>
              <Select
                value={filters.provider}
                onValueChange={(value) => setFilters({ ...filters, provider: value })}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!hasActiveFilters}
                onClick={() => setFilters({ search: "", provider: "", status: "" })}
                className="whitespace-nowrap"
                style={{ minHeight: 40 }}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          )}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <RuntimeDashboardPanel
          dashboard={providerDashboard}
          loading={loading}
          isDark={isDark}
          onRefresh={fetchData}
        />
      )}

      {activeTab === "priority" && (
        <div
          className="rounded-lg border bg-card text-card-foreground shadow-sm"
          style={{
            marginBottom: 6,
            padding: "clamp(4px, 1vw, 6px)",
            borderColor: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.1)",
          }}
        >
          <div className="flex flex-col gap-1">
            <div className="flex flex-col md:flex-row gap-1 items-stretch md:items-center justify-between">
              <div>
                <span className="text-base font-black block">{i18n.t("superAdmin.aiProviders.priority.title")}</span>
                <span className="text-sm text-gray-500">{i18n.t("superAdmin.aiProviders.priority.runtimeOrder", { order: providerPriority.slice(0, 4).join(" > ") })}</span>
              </div>
              <div className="flex flex-row flex-wrap items-center gap-1">
                <div className="flex items-center gap-2 mr-1">
                  <div className="text-right">
                    <span className="text-xs font-black block">{i18n.t("superAdmin.aiProviders.priority.enableAutoFailover")}</span>
                    <span className="text-xs text-gray-500 block">{i18n.t("superAdmin.aiProviders.priority.autoFailoverDesc")}</span>
                  </div>
                  <Switch
                    size="default"
                    checked={globalConfig.enableFailover !== false}
                    onCheckedChange={handleTogglePriorityFailover}
                    disabled={savingProviderPriority}
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => saveProviderPriority()}
                  disabled={savingProviderPriority}
                  className="whitespace-nowrap"
                  style={{ minHeight: 36 }}
                >
                  {savingProviderPriority ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Order
                </Button>
              </div>
            </div>

            <DndContext sensors={dndSensors} onDragEnd={handleProviderDragEnd}>
              <SortableContext
                items={providerPriority}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-1">
                  {orderedProviderPriorityItems.map((item, index) => (
                    <SortableProviderPriorityRow
                      key={item.provider}
                      item={item}
                      index={index}
                      isDark={isDark}
                      expanded={expandedProvider === item.provider}
                      testing={testingProvider === item.provider}
                      onToggle={(provider) =>
                        setExpandedProvider((current) =>
                          current === provider ? null : provider,
                        )
                      }
                      onTest={handleTestProvider}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-1.5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default" className="mb-1.5 border-green-500/50">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {activeTab === "keys" && (
        <>
      {selectedKeys.length > 0 && (
        <div
          className="rounded mb-1 px-1 py-0.5"
          style={{
            backgroundColor: isDark ? "rgba(25, 118, 210, 0.1)" : "rgba(25, 118, 210, 0.05)",
          }}
        >
          <div className="flex flex-col sm:flex-row gap-1 items-stretch sm:items-center justify-between">
            <span className="text-sm font-bold">{selectedKeys.length} key(s) selected</span>
            <div className="flex flex-row flex-wrap gap-1">
              <Button size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-50" onClick={() => handleBulkUpdateStatus(true)}>
                <Play className="h-4 w-4 mr-1" /> Activate
              </Button>
              <Button size="sm" variant="outline" className="border-amber-500 text-amber-700 hover:bg-amber-50" onClick={() => handleBulkUpdateStatus(false)}>
                <Square className="h-4 w-4 mr-1" /> Deactivate
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-x-auto"
        style={{
          borderColor: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.1)",
        }}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500 w-10">
                <Checkbox
                  checked={filteredKeys.length > 0 && selectedKeys.length === filteredKeys.length}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedKeys(filteredKeys.map((key) => key.id));
                    else setSelectedKeys([]);
                  }}
                />
              </TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Name</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Provider</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Active Model</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Agent Fit</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Key (Masked)</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Base URL</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Status</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Routing</TableHead>
              <TableHead className="py-2 px-1 text-xs font-black text-gray-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-4 text-sm text-gray-500">
                  {loading ? "Loading keys..." : "No keys found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredKeys.map((key) => {
                const providerDefaultModel = getProviderDefaultModel(key.provider);
                const activeModel =
                  key.aiModelConfigs?.find((m) => m.priority === 1 && m.isEnabled)?.modelName ||
                  providerDefaultModel || "";
                const activeModelConfig =
                  key.aiModelConfigs?.find((m) => m.modelName === activeModel) ||
                  key.activeModel || null;
                const agentFit = activeModelConfig?.agentSuitability || key.agentSuitability;

                const configuredModels = key.aiModelConfigs?.map((m) => m.modelName) || [];
                const providerModels =
                  key.provider === "OPENROUTER" ? openRouterModels : getStaticProviderModels(key.provider);
                const draftModel = modelDrafts[key.id] ?? activeModel;
                const availableModels = Array.from(
                  new Set([...configuredModels, ...providerModels, providerDefaultModel, activeModel, draftModel].filter(Boolean)),
                );
                const routingStatus = key.routingStatus;
                const isLastWorkedForProvider = latestSuccessByProvider[key.provider]?.keyId === key.id;
                const isPreviewKey = routingPreview?.keyId === key.id;
                const isPreferredKey = globalConfig.preferredAiKeyIds?.[key.provider] === key.id;
                const routingTime = routingStatus?.lastSucceededAt || routingStatus?.lastSelectedAt;
                const routingModel = routingStatus?.lastSucceededModel || routingStatus?.lastSelectedModel;
                const routingPool = routingStatus?.lastSucceededPool || routingStatus?.lastSelectedPool;
                const testStatus = routingStatus?.lastTestStatus;
                const testTime = routingStatus?.lastTestedAt;

                return (
                  <TableRow key={key.id} className={selectedKeys.includes(key.id) ? "bg-muted" : ""}>
                    <TableCell className="py-2 px-1">
                      <Checkbox
                        checked={selectedKeys.includes(key.id)}
                        onCheckedChange={() => handleSelectKey(key.id)}
                      />
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      <Button variant="link" size="sm" asChild className="px-0 font-bold justify-start text-left max-w-[210px]">
                        <RouterLink to={`/super-admin/ai-providers/keys/${key.id}`} className="truncate block max-w-[190px]">
                          {key.name}
                        </RouterLink>
                      </Button>
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      <Badge variant="outline" className="h-5 text-xs">
                        <span className="flex items-center gap-1">
                          {PROVIDERS.find((p) => p.value === key.provider)?.icon}
                          <span>{key.provider}</span>
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      {availableModels.length > 0 ? (
                        <div className="relative min-w-[240px] max-w-[360px]">
                          <Input
                            className="h-8 text-xs border-0 border-b rounded-none"
                            placeholder="Search or type model id..."
                            value={draftModel}
                            onChange={(e) => setModelDrafts((current) => ({ ...current, [key.id]: e.target.value }))}
                            onBlur={() => commitActiveModel(key.id, activeModel, modelDrafts[key.id] ?? activeModel)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitActiveModel(key.id, activeModel, modelDrafts[key.id] ?? activeModel);
                            }}
                          />
                          {key.provider === "OPENROUTER" && loadingOpenRouterModels && (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 absolute right-2 top-1/2 -translate-y-1/2" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm">{activeModel}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={agentFit?.agentReady ? "default" : "outline"}
                              className={getAgentFitColor(agentFit) === "success" ? "bg-green-100 text-green-800 hover:bg-green-100" : getAgentFitColor(agentFit) === "warning" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}
                              style={{ height: 22 }}
                            >
                              <BotIcon className="h-3.5 w-3.5 mr-1" />
                              {getAgentFitLabel(agentFit)}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>{getAgentFitTooltip(agentFit)}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {agentFit?.warnings?.[0] && (
                        <span className="text-xs text-gray-500 block mt-0.5 max-w-[220px]">{agentFit.warnings[0]}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      <span className="text-xs" style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}>
                        {key.apiKey.substring(0, 8)}...
                      </span>
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      {key.baseUrl ? (
                        <span className="text-xs truncate block max-w-[220px]" title={key.baseUrl}>{key.baseUrl}</span>
                      ) : (
                        <span className="text-xs text-gray-500">Default</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      {key.isActive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100" style={{ height: 22 }}>Active</Badge>
                      ) : (
                        <Badge variant="outline" style={{ height: 22 }}>Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-1 min-w-[170px]">
                      <div className="flex flex-col items-start gap-0.5">
                        <div className="flex flex-row flex-wrap gap-0.5">
                          <Badge
                            className={isLastWorkedForProvider ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                            variant={isLastWorkedForProvider ? "default" : "outline"}
                            style={{ height: 21 }}
                          >
                            {isLastWorkedForProvider ? "Last worked" : routingStatus?.lastSucceededAt ? "Worked before" : routingStatus?.lastSelectedAt ? "Selected before" : "Not used yet"}
                          </Badge>
                          {isPreviewKey && (
                            <Badge variant="outline" className="border-indigo-200 text-indigo-700" style={{ height: 21 }}>Current route</Badge>
                          )}
                          {isPreferredKey && (
                            <Badge variant="outline" className="border-gray-400 text-gray-600" style={{ height: 21 }}>Preferred</Badge>
                          )}
                          {testStatus && (
                            <Badge
                              className={testStatus === "success" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}
                              variant="outline"
                              style={{ height: 21 }}
                            >
                              {testStatus === "success" ? "Test OK" : "Test failed"}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{formatRoutingTime(routingTime)}</span>
                        {routingModel && <span className="text-xs text-gray-500">{routingModel}{routingPool ? ` / ${routingPool}` : ""}</span>}
                        {testTime && (
                          <span className="text-xs text-gray-500">
                            Test {formatRoutingTime(testTime)}{routingStatus?.lastTestLatencyMs ? ` / ${routingStatus.lastTestLatencyMs}ms` : ""}
                          </span>
                        )}
                        {routingStatus?.lastTestError && (
                          <span className="text-xs text-red-500 max-w-[260px]">{routingStatus.lastTestError}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-1">
                      <div className="flex flex-row flex-wrap gap-0.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestKey(key.id)}
                          disabled={testingKeyId === key.id}
                          className="px-1"
                          style={{ minHeight: 28 }}
                        >
                          {testingKeyId === key.id ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span className="ml-1">Test key</span>
                        </Button>
                        <Button
                          size="sm"
                          variant={isPreferredKey ? "default" : "outline"}
                          onClick={() => handleSetPreferredKey(key.id)}
                          disabled={!key.isActive || isPreferredKey || settingPreferredKeyId === key.id}
                          className="px-1"
                          style={{ minHeight: 28 }}
                        >
                          {settingPreferredKeyId === key.id ? (
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600" />
                          ) : (
                            <Key className="h-4 w-4" />
                          )}
                          <span className="ml-1">{isPreferredKey ? "Preferred" : "Use key"}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleKeyStatus(key.id, key.isActive)}
                          title={key.isActive ? "Deactivate" : "Activate"}
                        >
                          {key.isActive ? <Square className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-green-500" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
        </>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Central AI API Key</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new AI API key.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-1">
            <div>
              <Label>Key Name (e.g. My DeepSeek Key)</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(newProvider) => {
                  const defaultBaseUrl = DEFAULT_BASE_URLS[newProvider] || "";
                  const defaultModel = DEFAULT_MODELS[newProvider] || "";
                  const canReplaceBaseUrl = !formData.baseUrl || MANAGED_BASE_URLS.includes(formData.baseUrl);
                  const canReplaceModel = !formData.defaultModel || MANAGED_MODELS.includes(formData.defaultModel);
                  setFormData({
                    ...formData,
                    provider: newProvider,
                    baseUrl: canReplaceBaseUrl ? defaultBaseUrl : formData.baseUrl,
                    defaultModel: canReplaceModel ? defaultModel : formData.defaultModel,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
            {formData.provider === "GOOGLE" && (
              <div>
                <Label>Gemini Model</Label>
                <Input
                  placeholder="gemini-2.5-flash"
                  value={formData.defaultModel}
                  onChange={(e) => setFormData((current) => ({ ...current, defaultModel: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Stable default is gemini-2.5-flash; Gemini 3 options are preview.</p>
              </div>
            )}
            {(formData.provider === "DEEPSEEK" || formData.provider === "GROQ" || formData.provider === "OLLAMA" || formData.provider === "OPENROUTER" || formData.provider === "NVIDIA") && (
              <div>
                <Label>Base URL (Optional)</Label>
                <Input
                  placeholder={formData.provider === "GROQ" ? "https://api.groq.com/openai/v1" : formData.provider === "OPENROUTER" ? "https://openrouter.ai/api/v1" : formData.provider === "NVIDIA" ? "https://integrate.api.nvidia.com/v1" : formData.provider === "OLLAMA" ? "https://ollama.maxp.online" : "https://api.deepseek.com"}
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.provider === "OLLAMA" ? "e.g. http://localhost:11434" : formData.provider === "GROQ" ? "Groq uses an OpenAI-compatible API base URL" : formData.provider === "OPENROUTER" ? "Use OpenRouter's OpenAI-compatible API base URL" : formData.provider === "NVIDIA" ? "NVIDIA NIM uses an OpenAI-compatible API base URL" : "Keep empty for standard cloud API"}
                </p>
              </div>
            )}

            {formData.provider === "OLLAMA" && (
              <div>
                <div className="flex flex-row gap-1 items-center mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchOllamaModels}
                    disabled={loadingModels || !formData.baseUrl}
                  >
                    {loadingModels ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                    ) : "Fetch Models"}
                  </Button>
                  <span className="text-xs text-gray-500">Click to load available models from your server</span>
                </div>

                {ollamaModels.length > 0 ? (
                  <Select
                    value={formData.defaultModel}
                    onValueChange={(value) => setFormData({ ...formData, defaultModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {ollamaModels.map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    <Label>Default Model (Manual Entry)</Label>
                    <Input
                      placeholder="e.g. llama3"
                      value={formData.defaultModel}
                      onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Fetch models to select from list, or type manually</p>
                  </div>
                )}
              </div>
            )}

            {formData.provider === "OPENROUTER" && (
              <div>
                <div className="flex flex-row gap-1 items-center mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOpenRouterModels()}
                    disabled={loadingOpenRouterModels}
                  >
                    {loadingOpenRouterModels ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
                    ) : "Fetch Models"}
                  </Button>
                  <span className="text-xs text-gray-500">Load available models from OpenRouter</span>
                </div>

                {openRouterModels.length > 0 ? (
                  <div>
                    <Label>Default Model</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search or type model id"
                        value={formData.defaultModel}
                        onChange={(e) => setFormData((current) => ({ ...current, defaultModel: e.target.value }))}
                        className="pr-8"
                      />
                      {loadingOpenRouterModels && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 absolute right-2 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Search OpenRouter models, or type a model id manually</p>
                  </div>
                ) : (
                  <div>
                    <Label>Default Model</Label>
                    <Input
                      placeholder="openrouter/auto"
                      value={formData.defaultModel}
                      onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use openrouter/auto or fetch the model list</p>
                  </div>
                )}
              </div>
            )}

            {(formData.provider === "GROQ" || formData.provider === "NVIDIA") && (
              <div>
                <Label>Default Model</Label>
                <Input
                  placeholder={formData.provider === "NVIDIA" ? "openai/gpt-oss-120b" : "llama-3.3-70b-versatile"}
                  value={formData.defaultModel}
                  onChange={(e) => setFormData({ ...formData, defaultModel: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.provider === "NVIDIA" ? "Use the NVIDIA NIM model id from docs, or keep the default." : "Use a Groq model id, or keep the default."}
                </p>
              </div>
            )}

            {formData.provider === "DEEPSEEK" && (
              <div>
                <Label>DeepSeek Model</Label>
                <Select
                  value={formData.defaultModel}
                  onValueChange={(value) => setFormData({ ...formData, defaultModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {(STATIC_PROVIDER_MODELS["DEEPSEEK"] || []).map((model) => (
                      <SelectItem key={model} value={model}>{model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>deepseek-v4-flash</strong> recommended. <code>deepseek-chat</code> deprecated on 2026/07/24.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button onClick={handleAddKey}>Add Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminAIProviders;
