import React, { useState, useEffect, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  FormControlLabel,
  Switch,
  Checkbox,
  InputAdornment,
  Autocomplete,
  Tabs,
  Tab,
  Collapse,
  Divider,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon,
  Refresh as RefreshIcon,
  SmartToy as BotIcon,
  VpnKey as KeyIcon,
  Bolt as BoltIcon,
  Psychology as BrainIcon,
  Face as FaceIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  ImageSearch as ImageSearchIcon,
  Save as SaveIcon,
  DragIndicator as DragIndicatorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
} from "@mui/icons-material";
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
import { useTheme } from "../hooks/useTheme";
import i18n from "../i18n";

import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";

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

const STATIC_PROVIDER_MODELS: Record<string, string[]> = {
  GOOGLE: GOOGLE_GEMINI_MODELS,
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
      <Paper sx={{ p: 3, borderRadius: 1, boxShadow: "none" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Loading provider runtime dashboard...
          </Typography>
        </Stack>
      </Paper>
    );
  }

  if (!dashboard) {
    return (
      <Alert severity="info" variant="outlined">
        Provider dashboard data is not available yet.
      </Alert>
    );
  }

  const topKeys = dashboard.keys
    .filter((key) => key.budget?.limited)
    .slice(0, 8);

  return (
    <Stack spacing={1.5}>
      <Paper
        sx={{
          p: { xs: 1, md: 1.25 },
          borderRadius: 1,
          boxShadow: "none",
          border: "1px solid",
          borderColor: isDark
            ? "rgba(148, 163, 184, 0.16)"
            : "rgba(15, 23, 42, 0.1)",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 1.2 }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={900}>
              Runtime Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Health, budget limits, fallback readiness, and recent provider traffic.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={onRefresh}
          >
            Refresh
          </Button>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "repeat(6, minmax(0, 1fr))",
            },
            gap: 0.8,
          }}
        >
          {[
            ["Ready providers", `${dashboard.summary.readyProviders}/${dashboard.summary.totalProviders}`],
            ["Active keys", `${dashboard.summary.activeKeys}/${dashboard.summary.totalKeys}`],
            ["Budgeted keys", dashboard.summary.limitedKeys],
            ["Budget blocked", dashboard.summary.exhaustedKeys],
            [`Requests ${dashboard.summary.sinceHours}h`, dashboard.summary.requests24h],
            ["Avg latency", formatLatency(dashboard.summary.avgLatencyMs)],
          ].map(([label, value]) => (
            <Paper
              key={String(label)}
              variant="outlined"
              sx={{ p: 1, borderRadius: 1, minHeight: 74 }}
            >
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ mt: 0.3 }}>
                {typeof value === "number" ? formatCompactNumber(value) : value}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "1.3fr 0.9fr" },
          gap: 1.5,
        }}
      >
        <Paper
          sx={{
            p: { xs: 1, md: 1.25 },
            borderRadius: 1,
            boxShadow: "none",
            border: "1px solid",
            borderColor: isDark
              ? "rgba(148, 163, 184, 0.16)"
              : "rgba(15, 23, 42, 0.1)",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={900}>
              Provider catalog and health
            </Typography>
            <Button
              component={RouterLink}
              to="/super-admin/ai-providers/provider-priority"
              size="small"
              variant="text"
            >
              Fallback chain
            </Button>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 0.9,
            }}
          >
            {dashboard.providers.map((provider) => {
              const providerInfo = PROVIDERS.find((item) => item.value === provider.provider);
              return (
                <Paper
                  key={provider.provider}
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: isDark ? "rgba(15, 23, 42, 0.52)" : "background.paper",
                  }}
                >
                  <Stack spacing={0.85}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <Box sx={{ display: "grid", placeItems: "center", width: 28, height: 28 }}>
                        {providerInfo?.icon || <BotIcon fontSize="small" />}
                      </Box>
                      <Box minWidth={0} sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={900} noWrap>
                          #{provider.priority} {provider.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {provider.adapter} · {provider.activeModel || provider.defaultModel || "No model"}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={getProviderHealthColor(provider.healthStatus)}
                        label={provider.healthStatus.replace(/_/g, " ")}
                        sx={{ height: 22 }}
                      />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ minHeight: 34 }}>
                      {provider.strength}
                    </Typography>

                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      <Chip size="small" label={`${provider.activeKeyCount}/${provider.totalKeyCount} keys`} variant="outlined" sx={{ height: 21 }} />
                      <Chip size="small" label={`${provider.stats24h.success} ok`} color="success" variant="outlined" sx={{ height: 21 }} />
                      <Chip size="small" label={`${provider.stats24h.failed} failed`} color={provider.stats24h.failed ? "error" : "default"} variant="outlined" sx={{ height: 21 }} />
                      <Chip size="small" label={`${provider.stats24h.rateLimit} limit`} color={provider.stats24h.rateLimit ? "warning" : "default"} variant="outlined" sx={{ height: 21 }} />
                    </Stack>

                    <Typography variant="caption" color="text.secondary">
                      {formatProviderLimits(provider.limitHints)}
                    </Typography>
                    {provider.latestSuccessKey && (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        Last success: {provider.latestSuccessKey.name} · {formatRoutingTime(provider.latestSuccessKey.at)}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Paper>

        <Stack spacing={1.5}>
          <Paper
            sx={{
              p: { xs: 1, md: 1.25 },
              borderRadius: 1,
              boxShadow: "none",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(148, 163, 184, 0.16)"
                : "rgba(15, 23, 42, 0.1)",
            }}
          >
            <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>
              Budget ledger
            </Typography>
            {topKeys.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No keys have explicit RPM/RPD/TPM/TPD limits configured yet.
              </Typography>
            ) : (
              <Stack spacing={0.8}>
                {topKeys.map((key) => (
                  <Paper key={key.id} variant="outlined" sx={{ p: 0.9, borderRadius: 1 }}>
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <Box minWidth={0} sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={850} noWrap>
                          {key.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {key.provider} · {key.activeModel?.modelName || "No model"}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        color={getBudgetColor(key.budget)}
                        label={
                          key.budget?.allowed === false
                            ? key.budget.reason || "blocked"
                            : key.budget?.severity || "ready"
                        }
                        sx={{ height: 22 }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.6 }}>
                      {formatProviderLimits(key.budget?.limits)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Today: {formatCompactNumber(key.budget?.usage?.day?.requests)} req · {formatCompactNumber(key.budget?.usage?.day?.tokens)} tokens
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>

          <Paper
            sx={{
              p: { xs: 1, md: 1.25 },
              borderRadius: 1,
              boxShadow: "none",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(148, 163, 184, 0.16)"
                : "rgba(15, 23, 42, 0.1)",
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={900}>
                Recent analytics
              </Typography>
              <Button
                component={RouterLink}
                to="/super-admin/ai-providers/logs"
                size="small"
                variant="text"
              >
                Logs
              </Button>
            </Stack>
            <Stack spacing={0.75}>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                <Chip size="small" color="success" label={`${dashboard.summary.successes24h} successes`} variant="outlined" />
                <Chip size="small" color={dashboard.summary.failures24h ? "error" : "default"} label={`${dashboard.summary.failures24h} failures`} variant="outlined" />
                <Chip size="small" color={dashboard.summary.rateLimits24h ? "warning" : "default"} label={`${dashboard.summary.rateLimits24h} limit events`} variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Provider logs are already the source of truth for full observability. This panel is the short operational view FreeLLMAPI had split across Keys, Fallback, and Analytics.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Stack>
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
    <Paper
      ref={setNodeRef}
      sx={{
        borderRadius: 1,
        boxShadow: "none",
        border: "1px solid",
        borderColor: isDark
          ? "rgba(148, 163, 184, 0.18)"
          : "rgba(15, 23, 42, 0.1)",
        bgcolor: isDragging
          ? isDark
            ? "rgba(37, 99, 235, 0.18)"
            : "rgba(37, 99, 235, 0.08)"
          : "background.paper",
        transform: CSS.Transform.toString(transform),
        transition,
        overflow: "hidden",
      }}
    >
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", md: "center" }}
        sx={{ px: 1, py: 0.85 }}
      >
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Tooltip title="Drag to reorder">
            <IconButton
              size="small"
              {...attributes}
              {...listeners}
              sx={{ cursor: isDragging ? "grabbing" : "grab", width: 32, height: 32 }}
            >
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Chip
            label={`#${index + 1}`}
            size="small"
            color={index === 0 ? "primary" : "default"}
            sx={{ height: 24, fontWeight: 800 }}
          />
          <Box sx={{ display: "grid", placeItems: "center", width: 28, height: 28 }}>
            {item.icon || <BotIcon fontSize="small" />}
          </Box>
          <Box minWidth={0}>
            <Typography variant="body2" fontWeight={850} noWrap>
              {item.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {index === 0
                ? "Primary provider / المزود الأساسي"
                : `Fallback ${index} / احتياطي ${index}`}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip
            size="small"
            icon={
              item.hasActiveKey ? (
                <CheckCircleIcon fontSize="small" />
              ) : (
                <ErrorOutlineIcon fontSize="small" />
              )
            }
            label={`${item.activeKeyCount}/${item.totalKeyCount} active keys`}
            color={item.hasActiveKey ? "success" : "error"}
            variant="outlined"
            sx={{ height: 24 }}
          />
          <Chip
            size="small"
            label={item.activeModel || "No active model"}
            color={item.activeModel ? "default" : "warning"}
            variant="outlined"
            sx={{ height: 24, maxWidth: 210 }}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={testing ? <CircularProgress size={14} /> : <ScienceIcon fontSize="small" />}
            onClick={() => onTest(item.provider)}
            disabled={testing || !item.hasActiveKey}
            sx={{ minHeight: 30, whiteSpace: "nowrap" }}
          >
            Test Now
          </Button>
          <IconButton
            size="small"
            onClick={() => onToggle(item.provider)}
            sx={{ width: 32, height: 32 }}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr 1fr",
              md: "repeat(6, minmax(120px, 1fr))",
            },
            gap: 0.75,
            px: 1,
            py: 1,
          }}
        >
          {[
            ["Active key", item.activeKeyName || "None"],
            ["24h success", item.stats24h.success],
            ["24h failures", item.stats24h.failure],
            ["Rate limits", item.stats24h.rateLimit],
            ["Avg latency", formatLatency(item.stats24h.avgResponseTimeMs)],
            ["Success rate", successRate === null ? "No data" : `${successRate}%`],
          ].map(([label, value]) => (
            <Box
              key={label}
              sx={{
                px: 0.9,
                py: 0.8,
                borderRadius: 1,
                bgcolor: isDark ? "rgba(15, 23, 42, 0.58)" : "rgba(248, 250, 252, 0.95)",
                border: "1px solid",
                borderColor: isDark
                  ? "rgba(148, 163, 184, 0.12)"
                  : "rgba(15, 23, 42, 0.08)",
                minWidth: 0,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {label}
              </Typography>
              <Typography variant="body2" fontWeight={800} noWrap>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
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
    <Box
      sx={{
        p: { xs: 0.75, md: 1 },
        minHeight: "calc(100vh - 64px)",
        bgcolor: isDark ? "rgba(2, 6, 23, 0.28)" : "rgba(248, 250, 252, 0.72)",
      }}
    >
      {/* Compact command header */}
      <Paper
        sx={{
          mb: 1.5,
          px: { xs: 1.25, md: 1.5 },
          py: 1.25,
          borderRadius: 1,
          border: "1px solid",
          borderColor: isDark
            ? "rgba(148, 163, 184, 0.18)"
            : "rgba(15, 23, 42, 0.1)",
          boxShadow: "none",
          bgcolor: isDark ? "rgba(15, 23, 42, 0.82)" : "background.paper",
        }}
      >
        <Stack spacing={1.1}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", lg: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: 1,
                  display: "grid",
                  placeItems: "center",
                  color: "primary.main",
                  bgcolor: isDark
                    ? "rgba(96, 165, 250, 0.14)"
                    : "rgba(37, 99, 235, 0.08)",
                  border: "1px solid",
                  borderColor: isDark
                    ? "rgba(148, 163, 184, 0.18)"
                    : "rgba(15, 23, 42, 0.08)",
                  flexShrink: 0,
                }}
              >
                <BotIcon fontSize="small" />
              </Box>
              <Box minWidth={0}>
                <Typography
                  variant="h6"
                  sx={{ fontSize: "1rem", lineHeight: 1.2, fontWeight: 800 }}
                >
                  {standalonePriority
                    ? "Provider Priority"
                    : "AI Keys & Provider Management"}
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ mt: 0.45 }}
                >
                  <Chip
                    size="small"
                    label={`${activeProviderLabel} active`}
                    color="primary"
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                  <Chip
                    size="small"
                    label={`${activeKeysCount} active keys`}
                    color={activeKeysCount > 0 ? "success" : "default"}
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                  <Chip
                    size="small"
                    label={`${inactiveKeysCount} inactive`}
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                  <Chip
                    size="small"
                    label={`${filteredKeys.length}/${keys.length} shown`}
                    variant="outlined"
                    sx={{ height: 22 }}
                  />
                </Stack>
              </Box>
            </Stack>

            <Alert
              severity="info"
              variant="outlined"
              sx={{
                py: 0.35,
                alignItems: "center",
                borderColor: isDark
                  ? "rgba(96, 165, 250, 0.28)"
                  : "rgba(37, 99, 235, 0.18)",
              }}
            >
              {standalonePriority ? (
                <>
                  Drag providers to set the runtime order. / اسحب المزودين
                  لتحديد ترتيب التشغيل والـ fallback.
                </>
              ) : (
                <>
                  المفاتيح المركزية المضافة هنا مخصصة لإدارة المزودين،
                  ترتيب التشغيل، السجلات، وتشخيص المفاتيح داخل سطح السوبر
                  أدمن فقط.
                </>
              )}
            </Alert>

            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              flexWrap="wrap"
              justifyContent={{ xs: "flex-start", lg: "flex-end" }}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon fontSize="small" />}
                onClick={fetchData}
              >
                Refresh
              </Button>
              {standalonePriority ? (
                <Button
                  size="small"
                  variant="outlined"
                  component={RouterLink}
                  to="/super-admin/ai-providers"
                >
                  AI Keys
                </Button>
              ) : (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    component={RouterLink}
                    to="/super-admin/ai-providers/provider-priority"
                    startIcon={<DragIndicatorIcon fontSize="small" />}
                  >
                    Provider Priority
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    component={RouterLink}
                    to="/super-admin/ai-providers/logs"
                    startIcon={<TimelineIcon fontSize="small" />}
                  >
                    Provider Logs
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      testingRouting ? (
                        <CircularProgress size={14} />
                      ) : (
                        <KeyIcon fontSize="small" />
                      )
                    }
                    onClick={handlePreviewRouting}
                    disabled={testingRouting}
                  >
                    Check Routing
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddIcon fontSize="small" />}
                    onClick={handleOpenAddDialog}
                  >
                    Add API Key
                  </Button>
                </>
              )}
            </Stack>
          </Stack>

          {!standalonePriority && (
            <Tabs
              value={activeTab}
              onChange={(_, value) => setActiveTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 38,
                borderBottom: "1px solid",
                borderColor: isDark
                  ? "rgba(148, 163, 184, 0.14)"
                  : "rgba(15, 23, 42, 0.08)",
                "& .MuiTab-root": {
                  minHeight: 38,
                  textTransform: "none",
                  fontWeight: 800,
                },
              }}
            >
              <Tab value="dashboard" label="Runtime Dashboard" />
              <Tab value="keys" label="AI Keys" />
              <Tab value="config" label="Global Config" />
            </Tabs>
          )}

          {activeTab === "config" && (
            <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(220px, 0.85fr) minmax(160px, 0.55fr) minmax(340px, 1.6fr)",
              },
              gap: 0.75,
              alignItems: "center",
            }}
          >
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{
                minHeight: 42,
                px: 0.75,
                border: "1px solid",
                borderRadius: 1,
                borderColor: isDark
                  ? "rgba(148, 163, 184, 0.14)"
                  : "rgba(15, 23, 42, 0.08)",
              }}
            >
              {activeProviderInfo?.icon}
              <TextField
                select
                label="Active Provider"
                value={globalConfig.defaultProvider}
                onChange={(e) => handleSaveConfig(e.target.value)}
                size="small"
                fullWidth
              >
                {PROVIDERS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      {p.icon} {p.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <FormControlLabel
              labelPlacement="start"
              control={
                <Switch
                  size="small"
                  checked={globalConfig.enableFailover !== false}
                  onChange={() => handleSaveConfig(undefined)}
                  color="primary"
                />
              }
              label={
                <Box sx={{ mr: 0.75 }}>
                  <Typography
                    variant="caption"
                    sx={{ display: "block", fontWeight: 800, lineHeight: 1.15 }}
                  >
                    Smart Failover
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.15 }}
                  >
                    Backup on failure
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                minHeight: 42,
                px: 0.75,
                justifyContent: "space-between",
                border: "1px solid",
                borderRadius: 1,
                borderColor: isDark
                  ? "rgba(148, 163, 184, 0.14)"
                  : "rgba(15, 23, 42, 0.08)",
              }}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "145px minmax(180px, 1fr) auto",
                },
                gap: 0.75,
                alignItems: "center",
              }}
            >
              <TextField
                select
                fullWidth
                size="small"
                label="Vision"
                value={visionForm.provider}
                onChange={(e) => {
                  const nextProvider = e.target.value;
                  setVisionForm({
                    provider: nextProvider,
                    model:
                      DEFAULT_VISION_MODELS[nextProvider] ||
                      visionForm.model ||
                      "",
                  });
                  if (
                    nextProvider === "OPENROUTER" &&
                    openRouterModels.length === 0
                  ) {
                    fetchOpenRouterModels({ silent: true });
                  }
                }}
              >
                <MenuItem value="OPENROUTER">OpenRouter</MenuItem>
                <MenuItem value="GOOGLE">Google Gemini</MenuItem>
              </TextField>
              <Autocomplete
                freeSolo
                fullWidth
                size="small"
                options={visionModelOptions}
                value={visionForm.model || null}
                inputValue={visionForm.model}
                loading={
                  visionForm.provider === "OPENROUTER" &&
                  loadingOpenRouterModels
                }
                onInputChange={(_, value) =>
                  setVisionForm((current) => ({ ...current, model: value }))
                }
                onChange={(_, value) =>
                  setVisionForm((current) => ({
                    ...current,
                    model: typeof value === "string" ? value : value || "",
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vision Model"
                    placeholder={
                      visionForm.provider === "OPENROUTER"
                        ? "openrouter/free"
                        : "gemini-2.5-flash"
                    }
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <ImageSearchIcon fontSize="small" />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {visionForm.provider === "OPENROUTER" &&
                          loadingOpenRouterModels ? (
                            <CircularProgress color="inherit" size={16} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<SaveIcon fontSize="small" />}
                onClick={handleSaveVisionConfig}
                disabled={!visionForm.provider || !visionForm.model.trim()}
                sx={{ minHeight: 40, whiteSpace: "nowrap" }}
              >
                Save
              </Button>
            </Box>
          </Box>

          {/* Embedding Configuration */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "145px minmax(180px, 1fr) 100px auto",
              },
              gap: 0.75,
              alignItems: "center",
              mt: 0.75,
              p: 0.75,
              border: "1px solid",
              borderRadius: 1,
              borderColor: isDark
                ? "rgba(148, 163, 184, 0.14)"
                : "rgba(15, 23, 42, 0.08)",
            }}
          >
            {embeddingHealth && (
              <Alert
                severity={embeddingHealthSeverity}
                variant="outlined"
                sx={{
                  gridColumn: "1 / -1",
                  py: 0.35,
                  "& .MuiAlert-message": { width: "100%" },
                }}
              >
                <Stack spacing={0.5}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={0.75}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Typography variant="caption" fontWeight={900}>
                        {i18n.t("superAdmin.aiProviders.embedding.health.title")}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {embeddingHealthReason}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        color={embeddingHealthSeverity === "error" ? "error" : embeddingHealthSeverity}
                        label={i18n.t(
                          "superAdmin.aiProviders.embedding.health.statusChip",
                          { status: embeddingHealthStatus },
                        )}
                      />
                      {embeddingHealth.fallback &&
                        embeddingHealth.fallback !== "NONE" && (
                          <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={i18n.t(
                              "superAdmin.aiProviders.embedding.health.fallbackChip",
                              { fallback: embeddingHealthFallback },
                            )}
                          />
                        )}
                    </Stack>
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={i18n.t(
                        "superAdmin.aiProviders.embedding.health.modelChip",
                        {
                          model:
                            embeddingHealth.requiredModel ||
                            DEFAULT_EMBEDDING_SETTINGS.model,
                        },
                      )}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={i18n.t(
                        "superAdmin.aiProviders.embedding.health.dimensionChip",
                        {
                          dimension:
                            embeddingHealth.requiredDimension ||
                            DEFAULT_EMBEDDING_SETTINGS.dimension,
                        },
                      )}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={i18n.t(
                        "superAdmin.aiProviders.embedding.health.activeKeysChip",
                        { count: embeddingHealth.activeGoogleKeyCount || 0 },
                      )}
                    />
                  </Stack>
                  {embeddingHealthWarnings.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {i18n.t(
                        "superAdmin.aiProviders.embedding.health.warningsLabel",
                        { warnings: embeddingHealthWarnings.join(" · ") },
                      )}
                    </Typography>
                  )}
                  {embeddingHealth.runtimeFailure && (
                    <Typography variant="caption" color="text.secondary">
                      {i18n.t(
                        "superAdmin.aiProviders.embedding.health.runtimeFailure",
                        {
                          reason: embeddingRuntimeFailureReason,
                          count:
                            embeddingHealth.runtimeFailure
                              .consecutiveFailures || 0,
                          context:
                            embeddingHealth.runtimeFailure.context ||
                            "UNKNOWN",
                        },
                      )}
                    </Typography>
                  )}
                </Stack>
              </Alert>
            )}
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
            >
              {i18n.t("superAdmin.aiProviders.embedding.title")}
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              label={i18n.t("superAdmin.aiProviders.embedding.modelLabel")}
              value={embeddingForm.model || "gemini-embedding-2"}
              onChange={(e) =>
                setEmbeddingForm((prev) => ({
                  ...prev,
                  model: e.target.value,
                  dimension:
                    e.target.value.includes("embedding-2")
                      ? 768
                      : prev.dimension,
                }))
              }
            >
              {EMBEDDING_MODELS.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {i18n.t(m.labelKey)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label={i18n.t("superAdmin.aiProviders.embedding.dimensionsLabel")}
              value={embeddingForm.dimension || 768}
              onChange={(e) =>
                setEmbeddingForm((prev) => ({
                  ...prev,
                  dimension: Number(e.target.value),
                }))
              }
            >
              {EMBEDDING_DIMENSIONS.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SaveIcon fontSize="small" />}
              onClick={handleSaveEmbeddingConfig}
              sx={{ minHeight: 40, whiteSpace: "nowrap" }}
            >
              {i18n.t("superAdmin.aiProviders.embedding.save")}
            </Button>
          </Box>

            </>
          )}

          {activeTab === "keys" && (
          <Stack
            direction={{ xs: "column", xl: "row" }}
            spacing={0.75}
            alignItems={{ xs: "stretch", xl: "center" }}
            sx={{
              pt: 1,
              borderTop: "1px solid",
              borderColor: isDark
                ? "rgba(148, 163, 184, 0.14)"
                : "rgba(15, 23, 42, 0.08)",
            }}
          >
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              flexWrap="wrap"
              alignItems="center"
              sx={{ flex: { xs: "0 1 auto", xl: "1 1 340px" }, minWidth: 0 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  minWidth: 0,
                  flex: "1 1 280px",
                  maxWidth: { xl: 460 },
                  px: 0.9,
                  py: 0.65,
                  borderRadius: 1,
                  bgcolor: isDark
                    ? "rgba(37, 99, 235, 0.12)"
                    : "rgba(37, 99, 235, 0.06)",
                }}
              >
                <KeyIcon fontSize="small" color="primary" />
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, flexShrink: 0 }}
                >
                  Route
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {routeProviderLabel}: {routeSummary}
                </Typography>
              </Box>
              {activePreferredKey && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    handleClearPreferredKey(globalConfig.defaultProvider)
                  }
                  disabled={settingPreferredKeyId === globalConfig.defaultProvider}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  Auto rotation
                </Button>
              )}
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "minmax(220px, 1fr) 145px 130px auto",
                },
                gap: 0.75,
                flex: { xs: "0 1 auto", xl: "2 1 560px" },
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Search name, provider, or key"
                value={filters.search}
                onChange={handleFilterChange("search")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                select
                size="small"
                label="Provider"
                value={filters.provider}
                onChange={handleFilterChange("provider")}
              >
                <MenuItem value="">All</MenuItem>
                {PROVIDERS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                select
                size="small"
                label="Status"
                value={filters.status}
                onChange={handleFilterChange("status")}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FilterListIcon fontSize="small" />}
                disabled={!hasActiveFilters}
                onClick={() => {
                  setFilters({ search: "", provider: "", status: "" });
                }}
                sx={{ minHeight: 40, whiteSpace: "nowrap" }}
              >
                Clear
              </Button>
            </Box>
          </Stack>
          )}
        </Stack>
      </Paper>

      {activeTab === "dashboard" && (
        <RuntimeDashboardPanel
          dashboard={providerDashboard}
          loading={loading}
          isDark={isDark}
          onRefresh={fetchData}
        />
      )}

      {activeTab === "priority" && (
        <Paper
          sx={{
            mb: 1.5,
            p: { xs: 1, md: 1.25 },
            borderRadius: 1,
            boxShadow: "none",
            border: "1px solid",
            borderColor: isDark
              ? "rgba(148, 163, 184, 0.16)"
              : "rgba(15, 23, 42, 0.1)",
          }}
        >
          <Stack spacing={1.1}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={900}>
                  Provider Priority / ترتيب المزودين
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Runtime order: {providerPriority.slice(0, 4).join(" > ")}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="center">
                <FormControlLabel
                  labelPlacement="start"
                  control={
                    <Switch
                      size="small"
                      checked={globalConfig.enableFailover !== false}
                      onChange={handleTogglePriorityFailover}
                      disabled={savingProviderPriority}
                    />
                  }
                  label={
                    <Box sx={{ mr: 0.75 }}>
                      <Typography variant="caption" fontWeight={850} sx={{ display: "block" }}>
                        Enable Auto-Failover
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        تفعيل الانتقال التلقائي
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  startIcon={
                    savingProviderPriority ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <SaveIcon fontSize="small" />
                    )
                  }
                  onClick={() => saveProviderPriority()}
                  disabled={savingProviderPriority}
                  sx={{ minHeight: 36, whiteSpace: "nowrap" }}
                >
                  Save Order
                </Button>
              </Stack>
            </Stack>

            <DndContext sensors={dndSensors} onDragEnd={handleProviderDragEnd}>
              <SortableContext
                items={providerPriority}
                strategy={verticalListSortingStrategy}
              >
                <Stack spacing={0.75}>
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
                </Stack>
              </SortableContext>
            </DndContext>
          </Stack>
        </Paper>
      )}

      {/* Errors/Success */}
      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert
          severity="success"
          sx={{ mb: 1.5 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {activeTab === "keys" && (
        <>
      {/* Bulk actions */}
      {selectedKeys.length > 0 && (
        <Paper
          sx={{
            mb: 1,
            px: 1,
            py: 0.75,
            bgcolor: isDark
              ? "rgba(25, 118, 210, 0.1)"
              : "rgba(25, 118, 210, 0.05)",
            borderRadius: 1,
            boxShadow: "none",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="body2" fontWeight={700}>
              {selectedKeys.length} key(s) selected
            </Typography>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                color="success"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleBulkUpdateStatus(true)}
              >
                Activate
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<StopIcon />}
                onClick={() => handleBulkUpdateStatus(false)}
              >
                Deactivate
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleBulkDelete}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: 1,
          boxShadow: "none",
          border: "1px solid",
          borderColor: isDark
            ? "rgba(148, 163, 184, 0.16)"
            : "rgba(15, 23, 42, 0.1)",
          overflowX: "auto",
          "& .MuiTableCell-root": {
            py: 0.75,
            px: 1.1,
            fontSize: "0.8125rem",
            borderColor: isDark
              ? "rgba(148, 163, 184, 0.12)"
              : "rgba(15, 23, 42, 0.08)",
          },
          "& .MuiTableHead .MuiTableCell-root": {
            py: 0.85,
            fontWeight: 800,
            color: "text.secondary",
            bgcolor: isDark ? "rgba(15, 23, 42, 0.92)" : "grey.50",
          },
          "& .MuiTableRow-root:hover": {
            bgcolor: isDark
              ? "rgba(96, 165, 250, 0.08)"
              : "rgba(37, 99, 235, 0.04)",
          },
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  indeterminate={
                    selectedKeys.length > 0 &&
                    selectedKeys.length < filteredKeys.length
                  }
                  checked={
                    filteredKeys.length > 0 &&
                    selectedKeys.length === filteredKeys.length
                  }
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Active Model</TableCell>
              <TableCell>Agent Fit</TableCell>
              <TableCell>Key (Masked)</TableCell>
              <TableCell>Base URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Routing</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  {loading ? "Loading keys..." : "No keys found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredKeys.map((key) => {
                // Logic to find active model (Priority 1)
                // Default to empty string if not found, to match standard Select behavior
                const providerDefaultModel = getProviderDefaultModel(
                  key.provider,
                );
                const activeModel =
                  key.aiModelConfigs?.find(
                    (m) => m.priority === 1 && m.isEnabled,
                  )?.modelName ||
                  providerDefaultModel ||
                  "";
                const activeModelConfig =
                  key.aiModelConfigs?.find((m) => m.modelName === activeModel) ||
                  key.activeModel ||
                  null;
                const agentFit =
                  activeModelConfig?.agentSuitability || key.agentSuitability;

                const configuredModels =
                  key.aiModelConfigs?.map((m) => m.modelName) || [];
                const providerModels =
                  key.provider === "OPENROUTER"
                    ? openRouterModels
                    : getStaticProviderModels(key.provider);
                const draftModel = modelDrafts[key.id] ?? activeModel;
                const availableModels = Array.from(
                  new Set(
                    [
                      ...configuredModels,
                      ...providerModels,
                      providerDefaultModel,
                      activeModel,
                      draftModel,
                    ].filter(Boolean),
                  ),
                );
                const routingStatus = key.routingStatus;
                const isLastWorkedForProvider =
                  latestSuccessByProvider[key.provider]?.keyId === key.id;
                const isPreviewKey = routingPreview?.keyId === key.id;
                const isPreferredKey =
                  globalConfig.preferredAiKeyIds?.[key.provider] === key.id;
                const routingTime =
                  routingStatus?.lastSucceededAt || routingStatus?.lastSelectedAt;
                const routingModel =
                  routingStatus?.lastSucceededModel || routingStatus?.lastSelectedModel;
                const routingPool =
                  routingStatus?.lastSucceededPool || routingStatus?.lastSelectedPool;
                const testStatus = routingStatus?.lastTestStatus;
                const testTime = routingStatus?.lastTestedAt;

                return (
                  <TableRow
                    key={key.id}
                    hover
                    selected={selectedKeys.includes(key.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedKeys.includes(key.id)}
                        onChange={() => handleSelectKey(key.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        component={RouterLink}
                        to={`/super-admin/ai-providers/keys/${key.id}`}
                        variant="text"
                        size="small"
                        sx={{
                          maxWidth: 210,
                          minWidth: 0,
                          justifyContent: "flex-start",
                          px: 0,
                          textTransform: "none",
                          fontWeight: 700,
                        }}
                      >
                        <Typography
                          component="span"
                          variant="body2"
                          fontWeight={700}
                          noWrap
                          sx={{ maxWidth: 190 }}
                        >
                          {key.name}
                        </Typography>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={
                          PROVIDERS.find((p) => p.value === key.provider)?.icon
                        }
                        label={key.provider}
                        size="small"
                        variant="outlined"
                        sx={{ height: 22 }}
                      />
                    </TableCell>
                    <TableCell>
                      {/* Model Selector */}
                      {availableModels.length > 0 ? (
                        <Autocomplete
                          freeSolo
                          size="small"
                          options={availableModels}
                          value={activeModel || null}
                          inputValue={draftModel}
                          loading={
                            key.provider === "OPENROUTER" &&
                            loadingOpenRouterModels
                          }
                          onInputChange={(_, value) => {
                            setModelDrafts((current) => ({
                              ...current,
                              [key.id]: value,
                            }));
                          }}
                          onChange={(_, value) => {
                            const modelName =
                              typeof value === "string" ? value : value || "";
                            commitActiveModel(key.id, activeModel, modelName);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="standard"
                              placeholder="Search or type model id..."
                              onBlur={() =>
                                commitActiveModel(
                                  key.id,
                                  activeModel,
                                  modelDrafts[key.id] ?? activeModel,
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  commitActiveModel(
                                    key.id,
                                    activeModel,
                                    modelDrafts[key.id] ?? activeModel,
                                  );
                                }
                              }}
                              InputProps={{
                                ...params.InputProps,
                                disableUnderline: true,
                                endAdornment: (
                                  <>
                                    {key.provider === "OPENROUTER" &&
                                    loadingOpenRouterModels ? (
                                      <CircularProgress
                                        color="inherit"
                                        size={16}
                                      />
                                    ) : null}
                                    {params.InputProps.endAdornment}
                                  </>
                                ),
                              }}
                            />
                          )}
                          sx={{
                            minWidth: 240,
                            maxWidth: 360,
                            "& .MuiInputBase-input": {
                              fontSize: "0.8125rem",
                            },
                          }}
                        />
                      ) : (
                        <Typography variant="body2">{activeModel}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={getAgentFitTooltip(agentFit)}>
                        <Chip
                          size="small"
                          icon={<BotIcon fontSize="small" />}
                          color={getAgentFitColor(agentFit) as any}
                          label={getAgentFitLabel(agentFit)}
                          variant={agentFit?.agentReady ? "filled" : "outlined"}
                          sx={{ height: 22 }}
                        />
                      </Tooltip>
                      {agentFit?.warnings?.[0] && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35, maxWidth: 220 }}>
                          {agentFit.warnings[0]}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Consolas, monospace",
                          fontSize: "0.78rem",
                        }}
                      >
                        {key.apiKey.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {key.baseUrl ? (
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ maxWidth: 220 }}
                          title={key.baseUrl}
                        >
                          {key.baseUrl}
                        </Typography>
                      ) : (
                        <Typography color="text.secondary" variant="caption">
                          Default
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {key.isActive ? (
                        <Chip
                          label="Active"
                          color="success"
                          size="small"
                          sx={{ height: 22 }}
                        />
                      ) : (
                        <Chip label="Inactive" size="small" sx={{ height: 22 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 170 }}>
                      <Stack spacing={0.35} alignItems="flex-start">
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          <Chip
                            label={
                              isLastWorkedForProvider
                                ? "Last worked"
                                : routingStatus?.lastSucceededAt
                                  ? "Worked before"
                                  : routingStatus?.lastSelectedAt
                                    ? "Selected before"
                                  : "Not used yet"
                            }
                            color={isLastWorkedForProvider ? "success" : "default"}
                            size="small"
                            variant={
                              isLastWorkedForProvider ? "filled" : "outlined"
                            }
                            sx={{ height: 21 }}
                          />
                          {isPreviewKey && (
                            <Chip
                              label="Current route"
                              color="primary"
                              size="small"
                              variant="outlined"
                              sx={{ height: 21 }}
                            />
                          )}
                          {isPreferredKey && (
                            <Chip
                              label="Preferred"
                              color="secondary"
                              size="small"
                              variant="outlined"
                              sx={{ height: 21 }}
                            />
                          )}
                          {testStatus && (
                            <Chip
                              label={
                                testStatus === "success"
                                  ? "Test OK"
                                  : "Test failed"
                              }
                              color={
                                testStatus === "success" ? "success" : "error"
                              }
                              size="small"
                              variant="outlined"
                              sx={{ height: 21 }}
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          {formatRoutingTime(routingTime)}
                        </Typography>
                        {routingModel && (
                          <Typography variant="caption" color="text.secondary">
                            {routingModel}
                            {routingPool ? ` / ${routingPool}` : ""}
                          </Typography>
                        )}
                        {testTime && (
                          <Typography variant="caption" color="text.secondary">
                            Test {formatRoutingTime(testTime)}
                            {routingStatus?.lastTestLatencyMs
                              ? ` / ${routingStatus.lastTestLatencyMs}ms`
                              : ""}
                          </Typography>
                        )}
                        {routingStatus?.lastTestError && (
                          <Typography
                            variant="caption"
                            color="error"
                            sx={{ maxWidth: 260 }}
                          >
                            {routingStatus.lastTestError}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={
                            testingKeyId === key.id ? (
                              <CircularProgress size={14} />
                            ) : (
                              <CheckCircleIcon fontSize="small" />
                            )
                          }
                          onClick={() => handleTestKey(key.id)}
                          disabled={testingKeyId === key.id}
                          sx={{ minHeight: 28, px: 0.9 }}
                        >
                          Test key
                        </Button>
                        <Button
                          size="small"
                          variant={isPreferredKey ? "contained" : "outlined"}
                          startIcon={
                            settingPreferredKeyId === key.id ? (
                              <CircularProgress size={14} />
                            ) : (
                              <KeyIcon fontSize="small" />
                            )
                          }
                          onClick={() => handleSetPreferredKey(key.id)}
                          disabled={
                            !key.isActive ||
                            isPreferredKey ||
                            settingPreferredKeyId === key.id
                          }
                          sx={{ minHeight: 28, px: 0.9 }}
                        >
                          {isPreferredKey ? "Preferred" : "Use key"}
                        </Button>
                        <IconButton
                          onClick={() =>
                            handleToggleKeyStatus(key.id, key.isActive)
                          }
                          color={key.isActive ? "warning" : "success"}
                          size="small"
                          title={key.isActive ? "Deactivate" : "Activate"}
                          sx={{ width: 30, height: 30 }}
                        >
                          {key.isActive ? (
                            <StopIcon fontSize="small" />
                          ) : (
                            <PlayArrowIcon fontSize="small" />
                          )}
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteKey(key.id)}
                          color="error"
                          size="small"
                          sx={{ width: 30, height: 30 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
        </>
      )}

      {/* Add Key Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Central AI API Key</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Key Name (e.g. My DeepSeek Key)"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <TextField
              select
              label="Provider"
              fullWidth
              value={formData.provider}
              onChange={(e) => {
                const newProvider = e.target.value;
                const defaultBaseUrl = DEFAULT_BASE_URLS[newProvider] || "";
                const defaultModel = DEFAULT_MODELS[newProvider] || "";
                const canReplaceBaseUrl =
                  !formData.baseUrl ||
                  MANAGED_BASE_URLS.includes(formData.baseUrl);
                const canReplaceModel =
                  !formData.defaultModel ||
                  MANAGED_MODELS.includes(formData.defaultModel);

                setFormData({
                  ...formData,
                  provider: newProvider,
                  baseUrl: canReplaceBaseUrl
                    ? defaultBaseUrl
                    : formData.baseUrl,
                  defaultModel: canReplaceModel
                    ? defaultModel
                    : formData.defaultModel,
                });
              }}
            >
              {PROVIDERS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="API Key"
              fullWidth
              value={formData.apiKey}
              onChange={(e) =>
                setFormData({ ...formData, apiKey: e.target.value })
              }
              type="password"
            />
            {formData.provider === "GOOGLE" && (
              <Autocomplete
                freeSolo
                fullWidth
                options={GOOGLE_GEMINI_MODELS}
                value={formData.defaultModel || null}
                inputValue={formData.defaultModel}
                onInputChange={(_, value) =>
                  setFormData((current) => ({
                    ...current,
                    defaultModel: value,
                  }))
                }
                onChange={(_, value) =>
                  setFormData((current) => ({
                    ...current,
                    defaultModel:
                      typeof value === "string" ? value : value || "",
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Gemini Model"
                    placeholder="gemini-2.5-flash"
                    helperText="Stable default is gemini-2.5-flash; Gemini 3 options are preview."
                  />
                )}
              />
            )}
            {(formData.provider === "DEEPSEEK" ||
              formData.provider === "GROQ" ||
              formData.provider === "OLLAMA" ||
              formData.provider === "OPENROUTER" ||
              formData.provider === "NVIDIA") && (
              <TextField
                label="Base URL (Optional)"
                placeholder={
                  formData.provider === "GROQ"
                    ? "https://api.groq.com/openai/v1"
                    : formData.provider === "OPENROUTER"
                      ? "https://openrouter.ai/api/v1"
                      : formData.provider === "NVIDIA"
                        ? "https://integrate.api.nvidia.com/v1"
                        : formData.provider === "OLLAMA"
                          ? "https://ollama.maxp.online"
                          : "https://api.deepseek.com"
                }
                fullWidth
                value={formData.baseUrl}
                onChange={(e) =>
                  setFormData({ ...formData, baseUrl: e.target.value })
                }
                helperText={
                  formData.provider === "OLLAMA"
                    ? "e.g. http://localhost:11434"
                    : formData.provider === "GROQ"
                      ? "Groq uses an OpenAI-compatible API base URL"
                      : formData.provider === "OPENROUTER"
                        ? "Use OpenRouter's OpenAI-compatible API base URL"
                        : formData.provider === "NVIDIA"
                          ? "NVIDIA NIM uses an OpenAI-compatible API base URL"
                          : "Keep empty for standard cloud API"
                }
              />
            )}

            {formData.provider === "OLLAMA" && (
              <Box>
                <Stack direction="row" spacing={1} mb={2} alignItems="center">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={fetchOllamaModels}
                    disabled={loadingModels || !formData.baseUrl}
                  >
                    {loadingModels ? (
                      <CircularProgress size={20} />
                    ) : (
                      "Fetch Models"
                    )}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Click to load available models from your server
                  </Typography>
                </Stack>

                {ollamaModels.length > 0 ? (
                  <TextField
                    select
                    label="Select Model"
                    fullWidth
                    value={formData.defaultModel}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultModel: e.target.value })
                    }
                    helperText="Select the model to use"
                  >
                    {ollamaModels.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    label="Default Model (Manual Entry)"
                    placeholder="e.g. llama3"
                    fullWidth
                    value={formData.defaultModel}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultModel: e.target.value })
                    }
                    helperText="Fetch models to select from list, or type manually"
                  />
                )}
              </Box>
            )}

            {formData.provider === "OPENROUTER" && (
              <Box>
                <Stack direction="row" spacing={1} mb={2} alignItems="center">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => fetchOpenRouterModels()}
                    disabled={loadingOpenRouterModels}
                  >
                    {loadingOpenRouterModels ? (
                      <CircularProgress size={20} />
                    ) : (
                      "Fetch Models"
                    )}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Load available models from OpenRouter
                  </Typography>
                </Stack>

                {openRouterModels.length > 0 ? (
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={openRouterModels}
                    value={formData.defaultModel || null}
                    inputValue={formData.defaultModel}
                    loading={loadingOpenRouterModels}
                    onInputChange={(_, value) =>
                      setFormData((current) => ({
                        ...current,
                        defaultModel: value,
                      }))
                    }
                    onChange={(_, value) =>
                      setFormData((current) => ({
                        ...current,
                        defaultModel:
                          typeof value === "string" ? value : value || "",
                      }))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Default Model"
                        placeholder="Search or type model id"
                        helperText="Search OpenRouter models, or type a model id manually"
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {loadingOpenRouterModels ? (
                                <CircularProgress color="inherit" size={18} />
                              ) : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                ) : (
                  <TextField
                    label="Default Model"
                    placeholder="openrouter/auto"
                    fullWidth
                    value={formData.defaultModel}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultModel: e.target.value })
                    }
                    helperText="Use openrouter/auto or fetch the model list"
                  />
                )}
              </Box>
            )}

            {(formData.provider === "GROQ" ||
              formData.provider === "NVIDIA") && (
              <TextField
                label="Default Model"
                placeholder={
                  formData.provider === "NVIDIA"
                    ? "openai/gpt-oss-120b"
                    : "llama-3.3-70b-versatile"
                }
                fullWidth
                value={formData.defaultModel}
                onChange={(e) =>
                  setFormData({ ...formData, defaultModel: e.target.value })
                }
                helperText={
                  formData.provider === "NVIDIA"
                    ? "Use the NVIDIA NIM model id from docs, or keep the default."
                    : "Use a Groq model id, or keep the default."
                }
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddKey}>
            Add Key
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SuperAdminAIProviders;
