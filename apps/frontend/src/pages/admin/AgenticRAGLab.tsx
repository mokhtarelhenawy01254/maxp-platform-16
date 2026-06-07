import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  AutoFixHigh as BackfillIcon,
  CheckCircle as ApproveIcon,
  FactCheck as EvaluationIcon,
  Forum as MessengerIcon,
  Policy as PolicyIcon,
  PlayArrow as RunIcon,
  PlaylistAddCheck as ScenarioIcon,
  QuestionAnswer as FaqIcon,
  Refresh as RefreshIcon,
  Science as LabIcon,
  Send as SendIcon,
  Storage as KnowledgeIcon,
  Close as RejectIcon,
  WarningAmber as WarningIcon,
} from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

type RagSource = {
  content: string;
  source: string;
  relevance: number;
  metadata?: {
    type?: string;
    id?: string;
    category?: string;
    retrieval?: Record<string, number | string | boolean>;
  } | null;
};

type RagResult = {
  answer: string;
  sources: RagSource[];
  finalSource: string;
  iterations: number;
  retrievalMode?: string;
  traceId?: string | null;
  grading?: {
    avgRelevance?: number;
    sufficient?: boolean;
    blocked?: boolean;
  };
};

type RagFailure = {
  id: string;
  query: string;
  createdAt: string;
  finalSource?: string;
  retrievalMode?: string;
  avgRelevance?: number;
  blocked?: boolean;
  category?: string | null;
};

type KnowledgeProposalInput = {
  question?: string;
  answer?: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
};

type KnowledgeProposal = {
  id: string;
  targetType: "FAQ" | "POLICY";
  status: string;
  executionStatus?: string | null;
  originalQuery: string;
  intent?: string;
  input: KnowledgeProposalInput;
  executionResult?: {
    artifactType?: string;
    artifactId?: string;
    category?: string;
  } | null;
  rejectionReason?: string | null;
  createdAt: string;
};

type KnowledgeOverview = {
  generatedAt: string;
  faqs: {
    total: number;
    active: number;
    inactive: number;
    missingEmbeddings: number;
    categories: Record<string, number>;
  };
  policies: {
    total: number;
    active: number;
    inactive: number;
    current: number;
    expired: number;
    future: number;
    missingEmbeddings: number;
    categories: Record<string, number>;
  };
  proposals: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byStatus: Record<string, number>;
  };
  failures: {
    recentCount: number;
    guardrailedCount: number;
    unansweredCount: number;
  };
  latestEvaluation?: {
    id: string;
    status: string;
    trigger?: string | null;
    generatedAt?: string | null;
    createdAt?: string;
    latencyMs?: number | null;
    scenarioSource?: string;
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  } | null;
};

type KnowledgeEvaluationResult = {
  id: string;
  name: string;
  message: string;
  passed: boolean;
  expectedSources: string[];
  finalSource: string;
  retrievalMode?: string;
  avgRelevance: number;
  missingTerms: string[];
  answerPreview?: string;
  latencyMs: number;
};

type KnowledgeEvaluationReport = {
  generatedAt: string;
  scenarioSource: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  results: KnowledgeEvaluationResult[];
};

type SourcePresetKey = "hybrid" | "policy" | "faq" | "full";

type MessengerScenarioDefinition = {
  id: string;
  nameKey: string;
  intentKey: string;
  messageKey: string;
  expectedTermsKey?: string;
  expectedSources: string[];
  expectGuardrail?: boolean;
  sourcePreset?: SourcePresetKey;
  category?: string;
};

type MessengerScenario = {
  id: string;
  name: string;
  intent: string;
  message: string;
  expectedTerms: string[];
  expectedSources: string[];
  expectGuardrail?: boolean;
  sourceOrder: string[];
  category?: string;
};

type ProductEmbeddingItem = {
  id: string;
  name: string;
  sku: string;
  mainImage: string | null;
  isActive: boolean;
  hasTextEmbedding: boolean;
  hasImageEmbedding: boolean;
  textEmbeddingGeneratedAt: string | null;
  imageEmbeddingGeneratedAt: string | null;
};

type RagFaqItem = {
  id: string;
  question: string;
  category: string;
  isActive: boolean;
  hasEmbedding: boolean;
};

type RagPolicyItem = {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  effectiveAt: string | null;
  expiresAt: string | null;
  hasEmbedding: boolean;
};

const SOURCE_PRESETS: Record<SourcePresetKey, { labelKey: string; order: string[] }> = {
  hybrid: {
    labelKey: "agenticRagLab.sourcePresets.hybrid",
    order: ["HYBRID_KNOWLEDGE", "FAQ_DB", "POLICY_DB", "VECTOR_STORE", "PRODUCT_DB"],
  },
  policy: {
    labelKey: "agenticRagLab.sourcePresets.policy",
    order: ["POLICY_DB", "FAQ_DB"],
  },
  faq: {
    labelKey: "agenticRagLab.sourcePresets.faq",
    order: ["FAQ_DB", "POLICY_DB"],
  },
  full: {
    labelKey: "agenticRagLab.sourcePresets.full",
    order: ["HYBRID_KNOWLEDGE", "FAQ_DB", "POLICY_DB", "VECTOR_STORE", "PRODUCT_DB", "WEB"],
  },
};

const MESSENGER_SCENARIO_DEFINITIONS: MessengerScenarioDefinition[] = [
  {
    id: "messenger-shipping-cairo",
    nameKey: "agenticRagLab.messenger.scenarios.shippingCairo.name",
    intentKey: "agenticRagLab.messenger.scenarios.shippingCairo.intent",
    messageKey: "agenticRagLab.messenger.scenarios.shippingCairo.message",
    expectedTermsKey: "agenticRagLab.messenger.scenarios.shippingCairo.expectedTerms",
    expectedSources: ["HYBRID_KNOWLEDGE", "POLICY_DB"],
    sourcePreset: "hybrid",
  },
  {
    id: "messenger-return-window",
    nameKey: "agenticRagLab.messenger.scenarios.returnWindow.name",
    intentKey: "agenticRagLab.messenger.scenarios.returnWindow.intent",
    messageKey: "agenticRagLab.messenger.scenarios.returnWindow.message",
    expectedTermsKey: "agenticRagLab.messenger.scenarios.returnWindow.expectedTerms",
    expectedSources: ["HYBRID_KNOWLEDGE", "POLICY_DB", "FAQ_DB"],
    sourcePreset: "hybrid",
  },
  {
    id: "messenger-location-gap",
    nameKey: "agenticRagLab.messenger.scenarios.locationGap.name",
    intentKey: "agenticRagLab.messenger.scenarios.locationGap.intent",
    messageKey: "agenticRagLab.messenger.scenarios.locationGap.message",
    expectedSources: ["EXHAUSTED"],
    sourcePreset: "hybrid",
    category: "location",
  },
  {
    id: "messenger-secret-guardrail",
    nameKey: "agenticRagLab.messenger.scenarios.secretGuardrail.name",
    intentKey: "agenticRagLab.messenger.scenarios.secretGuardrail.intent",
    messageKey: "agenticRagLab.messenger.scenarios.secretGuardrail.message",
    expectedSources: ["GUARDRAIL"],
    expectGuardrail: true,
    sourcePreset: "hybrid",
  },
];

const formatScore = (value?: number) => (Number.isFinite(value) ? Number(value).toFixed(2) : "0.00");
const formatPercent = (value?: number) => `${Math.round((Number.isFinite(value) ? Number(value) : 0) * 100)}%`;
const isProposalReady = (proposal: KnowledgeProposal, input: KnowledgeProposalInput) => (
  proposal.targetType === "POLICY"
    ? Boolean(input.title && input.title.trim().length >= 5 && input.content && input.content.trim().length >= 20)
    : Boolean(input.question && input.question.trim().length >= 5 && input.answer && input.answer.trim().length >= 10)
);

const AgenticRAGLab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const tr = (key: string, options?: any) => String(t(key, options));
  const trAr = (key: string, options?: any) => String(i18n.getFixedT("ar")(key, options));
  const trArArray = (key: string): string[] => {
    const value = i18n.getFixedT("ar")(key, { returnObjects: true });
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  };

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [sourcePreset, setSourcePreset] = useState<SourcePresetKey>("hybrid");
  const [result, setResult] = useState<RagResult | null>(null);
  const [failures, setFailures] = useState<RagFailure[]>([]);
  const [proposals, setProposals] = useState<KnowledgeProposal[]>([]);
  const [overview, setOverview] = useState<KnowledgeOverview | null>(null);
  const [evaluation, setEvaluation] = useState<KnowledgeEvaluationReport | null>(null);
  const [messengerEvaluation, setMessengerEvaluation] = useState<KnowledgeEvaluationReport | null>(null);
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>(
    () => MESSENGER_SCENARIO_DEFINITIONS.map((scenario) => scenario.id),
  );
  const [proposalEdits, setProposalEdits] = useState<Record<string, KnowledgeProposalInput>>({});
  const [loading, setLoading] = useState(false);
  const [failuresLoading, setFailuresLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [evaluationBusy, setEvaluationBusy] = useState(false);
  const [messengerBusy, setMessengerBusy] = useState(false);
  const [proposalBusy, setProposalBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tabIndex, setTabIndex] = useState(0);
  const [products, setProducts] = useState<ProductEmbeddingItem[]>([]);
  const [productsStats, setProductsStats] = useState<{ total: number; withTextEmbedding: number; withImageEmbedding: number; missingTextEmbedding: number; missingImageEmbedding: number } | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsOffset, setProductsOffset] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsBackfillBusy, setProductsBackfillBusy] = useState(false);
  const [faqItems, setFaqItems] = useState<RagFaqItem[]>([]);
  const [policyItems, setPolicyItems] = useState<RagPolicyItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [faqBackfillBusy, setFaqBackfillBusy] = useState(false);
  const [policyBackfillBusy, setPolicyBackfillBusy] = useState(false);

  const defaultQuestion = trAr("agenticRagLab.defaultQuestion");
  const sourceOrder = useMemo(() => SOURCE_PRESETS[sourcePreset]?.order || SOURCE_PRESETS.hybrid.order, [sourcePreset]);
  const messengerScenarios = useMemo<MessengerScenario[]>(
    () => MESSENGER_SCENARIO_DEFINITIONS.map((scenario) => {
      const preset = SOURCE_PRESETS[scenario.sourcePreset || "hybrid"];
      return {
        id: scenario.id,
        name: tr(scenario.nameKey),
        intent: tr(scenario.intentKey),
        message: trAr(scenario.messageKey),
        expectedTerms: scenario.expectedTermsKey ? trArArray(scenario.expectedTermsKey) : [],
        expectedSources: scenario.expectedSources,
        expectGuardrail: scenario.expectGuardrail,
        sourceOrder: preset.order,
        category: scenario.category,
      };
    }),
    [i18n.language],
  );
  const selectedScenarioSet = useMemo(() => new Set(selectedScenarioIds), [selectedScenarioIds]);
  const messengerResultMap = useMemo(
    () => new Map((messengerEvaluation?.results || []).map((item) => [item.id, item])),
    [messengerEvaluation],
  );

  const getHeaders = (extra: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(extra);

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-overview"), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) setOverview(data.overview || null);
    } finally {
      setOverviewLoading(false);
    }
  };

  const loadFailures = async () => {
    setFailuresLoading(true);
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-failures?limit=20"), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) setFailures(Array.isArray(data.failures) ? data.failures : []);
    } finally {
      setFailuresLoading(false);
    }
  };

  const loadProposals = async () => {
    const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-proposals?status=PENDING&limit=20"), {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      const nextProposals = Array.isArray(data.proposals) ? data.proposals : [];
      setProposals(nextProposals);
      setProposalEdits((current) => {
        const next = { ...current };
        for (const proposal of nextProposals) {
          if (!next[proposal.id]) next[proposal.id] = proposal.input || {};
        }
        return next;
      });
    }
  };

  useEffect(() => {
    loadFailures();
    loadOverview().catch(() => {});
    loadProposals().catch(() => {});
  }, []);

  useEffect(() => {
    setQuestion((current) => current || defaultQuestion);
  }, [defaultQuestion]);

  const runPreview = async () => {
    const message = question.trim();
    if (!message || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-preview"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          message,
          sourceOrder,
          category: category.trim() || undefined,
          persistTrace: true,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || tr("agenticRagLab.errors.previewFailed"));
      setResult(data);
      await loadFailures();
      await loadProposals();
      await loadOverview();
    } catch (err: any) {
      setError(err.message || tr("agenticRagLab.errors.unexpected"));
    } finally {
      setLoading(false);
    }
  };

  const runBackfill = async () => {
    if (backfillBusy) return;
    setBackfillBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-backfill"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ target: "all", limit: 100 }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || tr("agenticRagLab.errors.backfillFailed"));
      setNotice(tr("agenticRagLab.notices.backfillUpdated", { count: data.result?.updated || 0 }));
      await loadOverview();
    } catch (err: any) {
      setError(err.message || tr("agenticRagLab.errors.backfillUnexpected"));
    } finally {
      setBackfillBusy(false);
    }
  };

  const runEvaluation = async () => {
    if (evaluationBusy) return;
    setEvaluationBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-evaluate/run-now"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ alertOnFailure: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || tr("agenticRagLab.errors.evaluationFailed"));
      setEvaluation(data.report || null);
      setNotice(tr("agenticRagLab.notices.evaluationResult", {
        passed: data.report?.passed || 0,
        total: data.report?.total || 0,
      }));
      await loadOverview();
    } catch (err: any) {
      setError(err.message || tr("agenticRagLab.errors.evaluationUnexpected"));
    } finally {
      setEvaluationBusy(false);
    }
  };

  const toggleScenarioSelection = (scenarioId: string) => {
    setSelectedScenarioIds((current) => (
      current.includes(scenarioId)
        ? current.filter((id) => id !== scenarioId)
        : [...current, scenarioId]
    ));
  };

  const runMessengerScenarios = async (mode: "selected" | "failed" = "selected") => {
    if (messengerBusy) return;
    const failedIds = new Set((messengerEvaluation?.results || []).filter((item) => !item.passed).map((item) => item.id));
    const targetIds = mode === "failed" && failedIds.size > 0
      ? [...failedIds]
      : selectedScenarioIds;
    const scenariosToRun = messengerScenarios.filter((scenario) => targetIds.includes(scenario.id));

    if (scenariosToRun.length === 0) {
      setError(tr("agenticRagLab.errors.noMessengerScenarios"));
      return;
    }

    setMessengerBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-evaluate"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          scenarios: scenariosToRun.map((scenario) => ({
            id: scenario.id,
            name: scenario.name,
            message: scenario.message,
            sourceOrder: scenario.sourceOrder,
            expectedSources: scenario.expectedSources,
            expectedTerms: scenario.expectedTerms,
            expectGuardrail: scenario.expectGuardrail,
            category: scenario.category,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || tr("agenticRagLab.errors.messengerEvaluationFailed"));
      setMessengerEvaluation(data.report || null);
      setNotice(tr("agenticRagLab.notices.messengerEvaluationResult", {
        passed: data.report?.passed || 0,
        total: data.report?.total || 0,
      }));
    } catch (err: any) {
      setError(err.message || tr("agenticRagLab.errors.messengerEvaluationUnexpected"));
    } finally {
      setMessengerBusy(false);
    }
  };

  useEffect(() => {
    if (tabIndex === 1) loadProducts(0);
    else if (tabIndex === 2) loadFaqItems();
    else if (tabIndex === 3) loadPolicyItems();
  }, [tabIndex]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setError("");
    setNotice("");
  };

  const loadProducts = async (offset = 0) => {
    setProductsLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/ai/chat/rag-knowledge-products?limit=50&offset=${offset}`), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        setProducts(data.data.items || []);
        setProductsStats(data.data.stats || null);
        setProductsOffset(data.data.offset || 0);
        setProductsTotal(data.data.total || 0);
      }
    } finally {
      setProductsLoading(false);
    }
  };

  const loadFaqItems = async () => {
    setFaqLoading(true);
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-faqs?limit=200"), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) setFaqItems(data.data?.items || []);
    } finally {
      setFaqLoading(false);
    }
  };

  const loadPolicyItems = async () => {
    setPolicyLoading(true);
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-policies?limit=200"), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) setPolicyItems(data.data?.items || []);
    } finally {
      setPolicyLoading(false);
    }
  };

  const runProductBackfill = async (productId?: string) => {
    if (productsBackfillBusy) return;
    setProductsBackfillBusy(true);
    setError("");
    setNotice("");
    try {
      const body = productId ? { productId } : {};
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-products-backfill"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Backfill failed");
      setNotice("Product embeddings backfill completed");
      await loadProducts(productsOffset);
    } catch (err: any) {
      setError(err.message || "Backfill error");
    } finally {
      setProductsBackfillBusy(false);
    }
  };

  const runFaqBackfill = async () => {
    if (faqBackfillBusy) return;
    setFaqBackfillBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-backfill"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ target: "faq", limit: 200 }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "FAQ backfill failed");
      setNotice("FAQ embeddings backfill completed");
      await Promise.all([loadFaqItems(), loadOverview()]);
    } catch (err: any) {
      setError(err.message || "FAQ backfill error");
    } finally {
      setFaqBackfillBusy(false);
    }
  };

  const runPolicyBackfill = async () => {
    if (policyBackfillBusy) return;
    setPolicyBackfillBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-backfill"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ target: "policy", limit: 200 }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Policy backfill failed");
      setNotice("Policy embeddings backfill completed");
      await Promise.all([loadPolicyItems(), loadOverview()]);
    } catch (err: any) {
      setError(err.message || "Policy backfill error");
    } finally {
      setPolicyBackfillBusy(false);
    }
  };

  const handleProductsPrevPage = () => {
    const next = Math.max(0, productsOffset - 50);
    loadProducts(next);
  };

  const handleProductsNextPage = () => {
    const next = productsOffset + 50;
    if (next < productsTotal) loadProducts(next);
  };

  const createProposal = async (failure: RagFailure, targetType: "FAQ" | "POLICY") => {
    setProposalBusy(`${failure.id}:${targetType}`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-proposals"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          failureTraceId: failure.id,
          targetType,
          category: failure.category || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || tr("agenticRagLab.errors.proposalCreateFailed"));
      setNotice(data.deduplicated
        ? tr("agenticRagLab.notices.proposalAlreadyExists")
        : tr("agenticRagLab.notices.proposalCreated"));
      await loadProposals();
    } catch (err: any) {
      setError(err.message || tr("agenticRagLab.errors.proposalCreateUnexpected"));
    } finally {
      setProposalBusy("");
    }
  };

  const updateProposalEdit = (proposalId: string, field: keyof KnowledgeProposalInput, value: string) => {
    setProposalEdits((current) => ({
      ...current,
      [proposalId]: {
        ...(current[proposalId] || {}),
        [field]: value,
      },
    }));
  };

  const approveProposal = async (proposal: KnowledgeProposal) => {
    setProposalBusy(`${proposal.id}:approve`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl(`/ai/chat/rag-knowledge-proposals/${proposal.id}/approve`), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ edits: proposalEdits[proposal.id] || proposal.input || {} }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || tr("agenticRagLab.errors.proposalApproveFailed"));
      setNotice(tr("agenticRagLab.notices.proposalApproved"));
      await Promise.all([loadFailures(), loadProposals(), loadOverview()]);
    } catch (err: any) {
      setError(err.message || tr("agenticRagLab.errors.proposalApproveUnexpected"));
    } finally {
      setProposalBusy("");
    }
  };

  const rejectProposal = async (proposal: KnowledgeProposal) => {
    setProposalBusy(`${proposal.id}:reject`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl(`/ai/chat/rag-knowledge-proposals/${proposal.id}/reject`), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ reason: "RAG_LAB_REJECTED" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || tr("agenticRagLab.errors.proposalRejectFailed"));
      setNotice(tr("agenticRagLab.notices.proposalRejected"));
      await Promise.all([loadProposals(), loadOverview()]);
    } catch (err: any) {
      setError(err.message || tr("agenticRagLab.errors.proposalRejectUnexpected"));
    } finally {
      setProposalBusy("");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: i18n.dir(), bgcolor: "background.default", minHeight: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700 }}>
          <LabIcon color="primary" />
          {tr("agenticRagLab.title")}
        </Typography>
        <Tooltip title={tr("agenticRagLab.refreshTooltip")}>
          <span>
            <IconButton
              onClick={() => {
                loadFailures();
                loadOverview().catch(() => {});
                loadProposals().catch(() => {});
              }}
              disabled={failuresLoading || overviewLoading}
            >
              {failuresLoading || overviewLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label={tr("agenticRagLab.question")}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
            <TextField
              select
              label={tr("agenticRagLab.source")}
              value={sourcePreset}
              onChange={(event) => setSourcePreset(event.target.value as SourcePresetKey)}
              sx={{ minWidth: 180 }}
              size="small"
            >
              {Object.entries(SOURCE_PRESETS).map(([key, preset]) => (
                <MenuItem key={key} value={key}>{tr(preset.labelKey)}</MenuItem>
              ))}
            </TextField>
            <TextField
              label={tr("agenticRagLab.category")}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              size="small"
              sx={{ minWidth: 220 }}
            />
            <Button
              variant="contained"
              onClick={runPreview}
              disabled={loading || !question.trim()}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
              sx={{ minWidth: 140 }}
            >
              {tr("agenticRagLab.run")}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label="RAG Lab" />
          <Tab label="Products" />
          <Tab label="FAQs" />
          <Tab label="Policies" />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
      <>
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <KnowledgeIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{tr("agenticRagLab.knowledge.title")}</Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/admin/faqs"
                startIcon={<FaqIcon />}
              >
                {tr("agenticRagLab.knowledge.openFaqs")}
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                to="/admin/policies"
                startIcon={<PolicyIcon />}
              >
                {tr("agenticRagLab.knowledge.openPolicies")}
              </Button>
              <Button
                variant="outlined"
                startIcon={backfillBusy ? <CircularProgress size={18} /> : <BackfillIcon />}
                onClick={runBackfill}
                disabled={backfillBusy}
              >
                {tr("agenticRagLab.knowledge.backfill")}
              </Button>
              <Button
                variant="contained"
                startIcon={evaluationBusy ? <CircularProgress size={18} color="inherit" /> : <EvaluationIcon />}
                onClick={runEvaluation}
                disabled={evaluationBusy}
              >
                {tr("agenticRagLab.knowledge.runEvaluation")}
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" },
              gap: 1.25,
            }}
          >
            {[
              {
                label: tr("agenticRagLab.overview.faq"),
                value: `${overview?.faqs.active || 0}/${overview?.faqs.total || 0}`,
                meta: tr("agenticRagLab.overview.missingEmbeddings", { count: overview?.faqs.missingEmbeddings || 0 }),
              },
              {
                label: tr("agenticRagLab.overview.policies"),
                value: `${overview?.policies.current || 0}/${overview?.policies.total || 0}`,
                meta: tr("agenticRagLab.overview.missingEmbeddings", { count: overview?.policies.missingEmbeddings || 0 }),
              },
              {
                label: tr("agenticRagLab.overview.approvals"),
                value: `${overview?.proposals.pending || 0}`,
                meta: tr("agenticRagLab.overview.approved", { count: overview?.proposals.approved || 0 }),
              },
              {
                label: tr("agenticRagLab.overview.failures"),
                value: `${overview?.failures.unansweredCount || 0}`,
                meta: tr("agenticRagLab.overview.guardrails", { count: overview?.failures.guardrailedCount || 0 }),
              },
              {
                label: tr("agenticRagLab.overview.latestEvaluation"),
                value: overview?.latestEvaluation
                  ? `${overview.latestEvaluation.passed}/${overview.latestEvaluation.total}`
                  : "-",
                meta: overview?.latestEvaluation
                  ? `${formatPercent(overview.latestEvaluation.passRate)} · ${overview.latestEvaluation.status}`
                  : tr("agenticRagLab.overview.noSavedRun"),
              },
            ].map((item) => (
              <Box
                key={item.label}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                  minHeight: 92,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{item.value}</Typography>
                <Typography variant="body2" color="text.secondary">{overviewLoading ? "..." : item.meta}</Typography>
              </Box>
            ))}
          </Box>

          {evaluation && (
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.25 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    color={evaluation.failed ? "warning" : "success"}
                    label={`${evaluation.passed}/${evaluation.total}`}
                  />
                  <Chip variant="outlined" label={formatPercent(evaluation.passRate)} />
                  <Chip variant="outlined" label={evaluation.scenarioSource} />
                </Stack>
              </Stack>
              <Stack spacing={1}>
                {evaluation.results.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "160px minmax(0, 1fr) 170px" },
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <Chip
                      size="small"
                      color={item.passed ? "success" : "warning"}
                      label={item.passed ? tr("agenticRagLab.status.pass") : tr("agenticRagLab.status.review")}
                    />
                    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                      {item.name}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={item.finalSource} variant="outlined" />
                      <Chip size="small" label={formatScore(item.avgRelevance)} variant="outlined" />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <MessengerIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{tr("agenticRagLab.messenger.title")}</Typography>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ScenarioIcon />}
                onClick={() => setSelectedScenarioIds(MESSENGER_SCENARIO_DEFINITIONS.map((scenario) => scenario.id))}
                disabled={messengerBusy}
              >
                {tr("agenticRagLab.messenger.selectAll")}
              </Button>
              <Button
                variant="outlined"
                onClick={() => setSelectedScenarioIds([])}
                disabled={messengerBusy}
              >
                {tr("agenticRagLab.messenger.clear")}
              </Button>
              <Button
                variant="outlined"
                onClick={() => runMessengerScenarios("failed")}
                disabled={messengerBusy || !messengerEvaluation?.failed}
              >
                {tr("agenticRagLab.messenger.runFailed")}
              </Button>
              <Button
                variant="contained"
                startIcon={messengerBusy ? <CircularProgress size={18} color="inherit" /> : <RunIcon />}
                onClick={() => runMessengerScenarios("selected")}
                disabled={messengerBusy || selectedScenarioIds.length === 0}
              >
                {tr("agenticRagLab.messenger.runSelected")}
              </Button>
            </Stack>
          </Stack>

          {messengerEvaluation && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                color={messengerEvaluation.failed ? "warning" : "success"}
                label={`${messengerEvaluation.passed}/${messengerEvaluation.total}`}
              />
              <Chip variant="outlined" label={formatPercent(messengerEvaluation.passRate)} />
              <Chip variant="outlined" label={messengerEvaluation.scenarioSource} />
            </Stack>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "repeat(2, minmax(0, 1fr))" },
              gap: 1.25,
            }}
          >
            {messengerScenarios.map((scenario) => {
              const item = messengerResultMap.get(scenario.id);
              return (
                <Paper key={scenario.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1.25}>
                    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                      <FormControlLabel
                        control={(
                          <Checkbox
                            checked={selectedScenarioSet.has(scenario.id)}
                            onChange={() => toggleScenarioSelection(scenario.id)}
                            disabled={messengerBusy}
                          />
                        )}
                        label={(
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{scenario.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{scenario.intent}</Typography>
                          </Stack>
                        )}
                        sx={{ alignItems: "flex-start", m: 0 }}
                      />
                      {item && (
                        <Chip
                          size="small"
                          color={item.passed ? "success" : "warning"}
                          label={item.passed ? tr("agenticRagLab.status.pass") : tr("agenticRagLab.status.review")}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {scenario.message}
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {scenario.expectedSources.map((source) => (
                        <Chip key={source} size="small" variant="outlined" label={source} />
                      ))}
                      {scenario.expectGuardrail && <Chip size="small" color="warning" label={tr("agenticRagLab.labels.guardrail")} />}
                    </Stack>
                    {item && (
                      <Box sx={{ borderTop: 1, borderColor: "divider", pt: 1 }}>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                          <Chip size="small" label={item.finalSource} color={item.passed ? "success" : "default"} />
                          <Chip size="small" label={formatScore(item.avgRelevance)} variant="outlined" />
                          <Chip size="small" label={`${item.latencyMs}ms`} variant="outlined" />
                        </Stack>
                        {item.missingTerms.length > 0 && (
                          <Typography variant="caption" color="warning.main" sx={{ display: "block", mb: 0.75 }}>
                            {tr("agenticRagLab.messenger.missingTerms", { terms: item.missingTerms.join(", ") })}
                          </Typography>
                        )}
                        {item.answerPreview && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", whiteSpace: "pre-wrap" }}>
                            {item.answerPreview}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Box>
        </Stack>
      </Paper>

      {result && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={tr("agenticRagLab.result.source", { value: result.finalSource })}
                color={result.finalSource === "EXHAUSTED" ? "warning" : "primary"}
              />
              <Chip label={tr("agenticRagLab.result.mode", { value: result.retrievalMode || "source" })} variant="outlined" />
              <Chip label={tr("agenticRagLab.result.score", { value: formatScore(result.grading?.avgRelevance) })} variant="outlined" />
              <Chip label={tr("agenticRagLab.result.iterations", { value: result.iterations })} variant="outlined" />
              {result.traceId && (
                <Chip label={tr("agenticRagLab.result.trace", { value: result.traceId.slice(0, 10) })} variant="outlined" />
              )}
              {result.grading?.blocked && <Chip icon={<WarningIcon />} label={tr("agenticRagLab.labels.guardrail")} color="warning" />}
            </Stack>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {result.answer}
            </Paper>

            <Divider />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
                gap: 1.5,
              }}
            >
              {result.sources.map((source, index) => (
                <Paper key={`${source.metadata?.id || index}-${source.source}`} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={source.metadata?.type || source.source} color="secondary" variant="outlined" />
                      <Chip size="small" label={tr("agenticRagLab.result.relevance", { value: formatScore(source.relevance) })} />
                      {source.metadata?.category && <Chip size="small" label={source.metadata.category} variant="outlined" />}
                      <Tooltip title={tr("agenticRagLab.copyEvidence")}>
                        <IconButton size="small" onClick={() => navigator.clipboard.writeText(source.content).catch(() => {})}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
                      {source.content}
                    </Typography>
                    {source.metadata?.retrieval && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace", direction: "ltr" }}>
                        {JSON.stringify(source.metadata.retrieval)}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Box>
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <ApproveIcon color="success" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{tr("agenticRagLab.proposals.title")}</Typography>
        </Stack>
        <Stack spacing={1.5}>
          {proposals.length === 0 && (
            <Typography variant="body2" color="text.secondary">{tr("agenticRagLab.proposals.empty")}</Typography>
          )}
          {proposals.map((proposal) => {
            const edit = proposalEdits[proposal.id] || proposal.input || {};
            const isPolicy = proposal.targetType === "POLICY";
            const canApprove = isProposalReady(proposal, edit);
            return (
              <Paper key={proposal.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      color={isPolicy ? "secondary" : "primary"}
                      label={isPolicy ? tr("agenticRagLab.labels.policy") : tr("agenticRagLab.labels.faq")}
                    />
                    <Chip size="small" label={proposal.intent || tr("agenticRagLab.labels.general")} variant="outlined" />
                    <Chip size="small" label={proposal.status} variant="outlined" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{proposal.originalQuery}</Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                      gap: 1.25,
                    }}
                  >
                    {isPolicy ? (
                      <>
                        <TextField
                          label={tr("agenticRagLab.proposals.policyTitle")}
                          value={edit.title || ""}
                          onChange={(event) => updateProposalEdit(proposal.id, "title", event.target.value)}
                          size="small"
                        />
                        <TextField
                          label={tr("agenticRagLab.category")}
                          value={edit.category || ""}
                          onChange={(event) => updateProposalEdit(proposal.id, "category", event.target.value)}
                          size="small"
                        />
                        <TextField
                          label={tr("agenticRagLab.proposals.policyContent")}
                          value={edit.content || ""}
                          onChange={(event) => updateProposalEdit(proposal.id, "content", event.target.value)}
                          multiline
                          minRows={3}
                          sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                        />
                      </>
                    ) : (
                      <>
                        <TextField
                          label={tr("agenticRagLab.question")}
                          value={edit.question || ""}
                          onChange={(event) => updateProposalEdit(proposal.id, "question", event.target.value)}
                          size="small"
                        />
                        <TextField
                          label={tr("agenticRagLab.category")}
                          value={edit.category || ""}
                          onChange={(event) => updateProposalEdit(proposal.id, "category", event.target.value)}
                          size="small"
                        />
                        <TextField
                          label={tr("agenticRagLab.proposals.approvedAnswer")}
                          value={edit.answer || ""}
                          onChange={(event) => updateProposalEdit(proposal.id, "answer", event.target.value)}
                          multiline
                          minRows={3}
                          sx={{ gridColumn: { xs: "auto", md: "1 / -1" } }}
                        />
                      </>
                    )}
                  </Box>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<ApproveIcon />}
                      disabled={!canApprove || Boolean(proposalBusy)}
                      onClick={() => approveProposal(proposal)}
                    >
                      {tr("agenticRagLab.proposals.approve")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      startIcon={<RejectIcon />}
                      disabled={Boolean(proposalBusy)}
                      onClick={() => rejectProposal(proposal)}
                    >
                      {tr("agenticRagLab.proposals.reject")}
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{tr("agenticRagLab.failures.title")}</Typography>
        </Stack>
        <Stack spacing={1}>
          {failures.length === 0 && (
            <Typography variant="body2" color="text.secondary">{tr("agenticRagLab.failures.empty")}</Typography>
          )}
          {failures.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={item.finalSource || "EXHAUSTED"} color={item.blocked ? "warning" : "default"} />
                  <Chip size="small" label={tr("agenticRagLab.result.score", { value: formatScore(item.avgRelevance) })} variant="outlined" />
                  {item.category && <Chip size="small" label={item.category} variant="outlined" />}
                </Stack>
                <Typography variant="body2">{item.query}</Typography>
                {!item.blocked && (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => createProposal(item, "FAQ")}
                      disabled={Boolean(proposalBusy)}
                    >
                      {tr("agenticRagLab.failures.suggestFaq")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => createProposal(item, "POLICY")}
                      disabled={Boolean(proposalBusy)}
                    >
                      {tr("agenticRagLab.failures.suggestPolicy")}
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Paper>
      </>)}
      {tabIndex === 1 && (
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" },
              gap: 1.25,
            }}
          >
            {[
              { label: "Total Products", value: productsStats?.total || 0 },
              { label: "With Text Embedding", value: productsStats?.withTextEmbedding || 0 },
              { label: "With Image Embedding", value: productsStats?.withImageEmbedding || 0 },
              { label: "Missing Text", value: productsStats?.missingTextEmbedding || 0 },
              { label: "Missing Image", value: productsStats?.missingImageEmbedding || 0 },
            ].map((stat) => (
              <Box
                key={stat.label}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 1.5,
                  minHeight: 80,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{productsLoading ? "..." : stat.value}</Typography>
              </Box>
            ))}
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={productsBackfillBusy ? <CircularProgress size={18} /> : <BackfillIcon />}
              onClick={() => runProductBackfill()}
              disabled={productsBackfillBusy}
            >
              Backfill All Products
            </Button>
          </Stack>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Text Embedding</TableCell>
                  <TableCell>Image Embedding</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">{productsLoading ? "Loading..." : "No products found"}</TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          {product.mainImage && <Avatar src={product.mainImage} alt={product.name} sx={{ width: 36, height: 36 }} />}
                          <Typography variant="body2">{product.name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant="body2">{product.sku}</Typography></TableCell>
                      <TableCell>
                        <Chip size="small" color={product.isActive ? "success" : "default"} label={product.isActive ? "Active" : "Inactive"} />
                      </TableCell>
                      <TableCell>
                        {product.hasTextEmbedding ? (
                          <Chip size="small" color="success" label={product.textEmbeddingGeneratedAt ? new Date(product.textEmbeddingGeneratedAt).toLocaleDateString() : "\u2705 Done"} />
                        ) : (
                          <Chip size="small" color="default" label={"\u274C Missing"} />
                        )}
                      </TableCell>
                      <TableCell>
                        {product.hasImageEmbedding ? (
                          <Chip size="small" color="success" label={product.imageEmbeddingGeneratedAt ? new Date(product.imageEmbeddingGeneratedAt).toLocaleDateString() : "\u2705 Done"} />
                        ) : (
                          <Chip size="small" color="default" label={"\u274C Missing"} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={productsBackfillBusy || (product.hasTextEmbedding && product.hasImageEmbedding)}
                          onClick={() => runProductBackfill(product.id)}
                        >
                          Generate Embedding
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Showing {productsOffset + 1}–{Math.min(productsOffset + 50, productsTotal)} of {productsTotal}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" disabled={productsOffset === 0 || productsLoading} onClick={handleProductsPrevPage}>Previous</Button>
              <Button size="small" variant="outlined" disabled={productsOffset + 50 >= productsTotal || productsLoading} onClick={handleProductsNextPage}>Next</Button>
            </Stack>
          </Stack>
        </Stack>
      )}

      {tabIndex === 2 && (
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
              <FaqIcon color="primary" />
              FAQs
            </Typography>
            <Button
              variant="outlined"
              startIcon={faqBackfillBusy ? <CircularProgress size={18} /> : <BackfillIcon />}
              onClick={runFaqBackfill}
              disabled={faqBackfillBusy}
            >
              Backfill FAQs
            </Button>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Question</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Embedding</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {faqItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">{faqLoading ? "Loading..." : "No FAQs found"}</TableCell>
                  </TableRow>
                ) : (
                  faqItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: "monospace", fontSize: 12 }}>{item.id.slice(0, 8)}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{item.question}</Typography></TableCell>
                      <TableCell><Chip size="small" label={item.category} variant="outlined" /></TableCell>
                      <TableCell><Chip size="small" color={item.isActive ? "success" : "default"} label={item.isActive ? "Active" : "Inactive"} /></TableCell>
                      <TableCell><Chip size="small" color={item.hasEmbedding ? "success" : "warning"} label={item.hasEmbedding ? "\u2705 Done" : "\u274C Missing"} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {tabIndex === 3 && (
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
              <PolicyIcon color="primary" />
              Policies
            </Typography>
            <Button
              variant="outlined"
              startIcon={policyBackfillBusy ? <CircularProgress size={18} /> : <BackfillIcon />}
              onClick={runPolicyBackfill}
              disabled={policyBackfillBusy}
            >
              Backfill Policies
            </Button>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Effective</TableCell>
                  <TableCell>Expiry</TableCell>
                  <TableCell>Embedding</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policyItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">{policyLoading ? "Loading..." : "No policies found"}</TableCell>
                  </TableRow>
                ) : (
                  policyItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell><Typography variant="body2">{item.title}</Typography></TableCell>
                      <TableCell><Chip size="small" label={item.category} variant="outlined" /></TableCell>
                      <TableCell><Chip size="small" color={item.isActive ? "success" : "default"} label={item.isActive ? "Active" : "Inactive"} /></TableCell>
                      <TableCell><Typography variant="body2">{item.effectiveAt ? new Date(item.effectiveAt).toLocaleDateString() : "-"}</Typography></TableCell>
                      <TableCell><Typography variant="body2">{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "-"}</Typography></TableCell>
                      <TableCell><Chip size="small" color={item.hasEmbedding ? "success" : "warning"} label={item.hasEmbedding ? "\u2705 Done" : "\u274C Missing"} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

    </Box>
  );
};

export default AgenticRAGLab;
