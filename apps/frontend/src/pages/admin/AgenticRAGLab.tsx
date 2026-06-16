import React, { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Copy,
  Sparkles,
  CheckCircle2,
  FileCheck2,
  MessageSquare,
  Shield,
  Play,
  CheckSquare,
  HelpCircle,
  RefreshCw,
  FlaskConical,
  Send,
  Database,
  XCircle,
  AlertTriangle,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from "lucide-react";

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

  const handleTabChange = (newValue: number) => {
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
      if (response.ok && data.success) {
        setProducts(data.items || []);
        setProductsStats(data.stats || null);
        setProductsOffset(data.offset || 0);
        setProductsTotal(data.total || 0);
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

  const isRtl = i18n.dir() === "rtl";

  return (
    <div className={`p-4 md:p-6 w-full text-slate-900 dark:text-slate-100 bg-background ${isRtl ? "rtl" : "ltr"}`}>
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <FlaskConical className="size-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
              {tr("agenticRagLab.title")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tr("agenticRagLab.refreshTooltip")}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadFailures();
            loadOverview().catch(() => {});
            loadProposals().catch(() => {});
          }}
          disabled={failuresLoading || overviewLoading}
          className="flex items-center gap-2"
        >
          {failuresLoading || overviewLoading ? (
            <Loader2 className="size-4 animate-spin text-indigo-600" />
          ) : (
            <RefreshCw className="size-4 text-indigo-600 dark:text-indigo-400" />
          )}
          <span>{t("agenticRagLab.overview.runEvaluation")}</span>
        </Button>
      </div>

      {/* Main Form Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {tr("agenticRagLab.question")}
            </label>
            <Textarea
              className="w-full text-sm dark:bg-slate-950 dark:border-slate-800 focus-visible:ring-indigo-600"
              placeholder={trAr("agenticRagLab.defaultQuestion")}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {tr("agenticRagLab.source")}
              </label>
              <select
                value={sourcePreset}
                onChange={(e) => setSourcePreset(e.target.value as SourcePresetKey)}
                className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {Object.entries(SOURCE_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {tr(preset.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                {tr("agenticRagLab.category")}
              </label>
              <Input
                type="text"
                placeholder={tr("agenticRagLab.category")}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="dark:bg-slate-950 dark:border-slate-800"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="default"
                onClick={runPreview}
                disabled={loading || !question.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center justify-center gap-2 h-10 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                <span>{tr("agenticRagLab.run")}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl p-4 mb-6 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="hover:opacity-75">
            <XCircle className="size-4" />
          </button>
        </div>
      )}
      {notice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl p-4 mb-6 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="hover:opacity-75">
            <XCircle className="size-4" />
          </button>
        </div>
      )}

      {/* Modern Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto gap-2">
        {["RAG Lab", "Products", "FAQs", "Policies"].map((label, idx) => (
          <button
            key={label}
            onClick={() => handleTabChange(idx)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tabIndex === idx
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 0: RAG Lab */}
      {tabIndex === 0 && (
        <div className="space-y-6">
          {/* Section 1: Overview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <Database className="size-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold">{tr("agenticRagLab.knowledge.title")}</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <RouterLink to="/admin/faqs" className="flex items-center gap-1.5">
                    <HelpCircle className="size-3.5" />
                    <span>{tr("agenticRagLab.knowledge.openFaqs")}</span>
                  </RouterLink>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <RouterLink to="/admin/policies" className="flex items-center gap-1.5">
                    <Shield className="size-3.5" />
                    <span>{tr("agenticRagLab.knowledge.openPolicies")}</span>
                  </RouterLink>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={backfillBusy}
                  onClick={runBackfill}
                  className="flex items-center gap-1.5"
                >
                  {backfillBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>{tr("agenticRagLab.knowledge.backfill")}</span>
                </Button>
                <Button
                  variant="indigo"
                  size="sm"
                  disabled={evaluationBusy}
                  onClick={runEvaluation}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                >
                  {evaluationBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FileCheck2 className="size-3.5" />
                  )}
                  <span>{tr("agenticRagLab.knowledge.runEvaluation")}</span>
                </Button>
              </div>
            </div>

            {/* Overview Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-4 flex flex-col justify-between min-h-[100px] hover:shadow-md transition-shadow"
                >
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</span>
                  <span className="text-xl font-bold mt-1 text-slate-800 dark:text-slate-100">{item.value}</span>
                  <span className="text-[10px] text-slate-500 mt-2 block overflow-hidden text-ellipsis whitespace-nowrap">
                    {overviewLoading ? "..." : item.meta}
                  </span>
                </div>
              ))}
            </div>

            {/* Evaluation Results */}
            {evaluation && (
              <div className="mt-5 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-950/10">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant={evaluation.failed ? "destructive" : "success"}>
                    {evaluation.passed}/{evaluation.total}
                  </Badge>
                  <Badge variant="outline">{formatPercent(evaluation.passRate)}</Badge>
                  <Badge variant="outline">{evaluation.scenarioSource}</Badge>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {evaluation.results.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col md:flex-row justify-between items-start md:items-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0 w-full">
                        <Badge variant={item.passed ? "success" : "warning"} className="flex-shrink-0">
                          {item.passed ? tr("agenticRagLab.status.pass") : tr("agenticRagLab.status.review")}
                        </Badge>
                        <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant="secondary">{item.finalSource}</Badge>
                        <Badge variant="outline">{formatScore(item.avgRelevance)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Messenger Scenarios */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold">{tr("agenticRagLab.messenger.title")}</h3>
              </div>

              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedScenarioIds(MESSENGER_SCENARIO_DEFINITIONS.map((s) => s.id))}
                  disabled={messengerBusy}
                >
                  {tr("agenticRagLab.messenger.selectAll")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedScenarioIds([])}
                  disabled={messengerBusy}
                >
                  {tr("agenticRagLab.messenger.clear")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runMessengerScenarios("failed")}
                  disabled={messengerBusy || !messengerEvaluation?.failed}
                >
                  {tr("agenticRagLab.messenger.runFailed")}
                </Button>
                <Button
                  variant="indigo"
                  size="sm"
                  onClick={() => runMessengerScenarios("selected")}
                  disabled={messengerBusy || selectedScenarioIds.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                >
                  {messengerBusy ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  <span>{tr("agenticRagLab.messenger.runSelected")}</span>
                </Button>
              </div>
            </div>

            {/* Run Performance Results */}
            {messengerEvaluation && (
              <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <Badge variant={messengerEvaluation.failed ? "destructive" : "success"}>
                  {messengerEvaluation.passed}/{messengerEvaluation.total}
                </Badge>
                <Badge variant="outline">{formatPercent(messengerEvaluation.passRate)}</Badge>
                <Badge variant="outline">{messengerEvaluation.scenarioSource}</Badge>
              </div>
            )}

            {/* Scenarios Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {messengerScenarios.map((scenario) => {
                const item = messengerResultMap.get(scenario.id);
                const isSelected = selectedScenarioSet.has(scenario.id);
                return (
                  <div
                    key={scenario.id}
                    className={`border rounded-xl p-4 transition-all duration-200 bg-white dark:bg-slate-900 ${
                      isSelected
                        ? "border-indigo-200 dark:border-indigo-900/60 ring-1 ring-indigo-500/10"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-start gap-2.5">
                          <Checkbox
                            id={scenario.id}
                            checked={isSelected}
                            onCheckedChange={() => toggleScenarioSelection(scenario.id)}
                            disabled={messengerBusy}
                            className="mt-1"
                          />
                          <div>
                            <label htmlFor={scenario.id} className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer hover:text-indigo-600 transition-colors block">
                              {scenario.name}
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{scenario.intent}</span>
                          </div>
                        </div>
                        {item && (
                          <Badge variant={item.passed ? "success" : "warning"}>
                            {item.passed ? tr("agenticRagLab.status.pass") : tr("agenticRagLab.status.review")}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-950/60 whitespace-pre-wrap font-medium">
                        {scenario.message}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {scenario.expectedSources.map((src) => (
                          <Badge key={src} variant="outline" className="text-[10px] py-0 px-1.5">
                            {src}
                          </Badge>
                        ))}
                        {scenario.expectGuardrail && (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                            {tr("agenticRagLab.labels.guardrail")}
                          </Badge>
                        )}
                      </div>

                      {/* Previous Result Detail */}
                      {item && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-1 space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant={item.passed ? "success" : "secondary"} className="text-[10px]">
                              {item.finalSource}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {formatScore(item.avgRelevance)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {item.latencyMs}ms
                            </Badge>
                          </div>
                          {item.missingTerms.length > 0 && (
                            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              {tr("agenticRagLab.messenger.missingTerms", { terms: item.missingTerms.join(", ") })}
                            </p>
                          )}
                          {item.answerPreview && (
                            <div className="text-[11px] text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded border border-slate-100 dark:border-slate-950/50 whitespace-pre-wrap">
                              {item.answerPreview}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Test Results */}
          {result && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge variant={result.finalSource === "EXHAUSTED" ? "warning" : "default"} className="bg-indigo-600 text-white">
                  {tr("agenticRagLab.result.source", { value: result.finalSource })}
                </Badge>
                <Badge variant="outline">
                  {tr("agenticRagLab.result.mode", { value: result.retrievalMode || "source" })}
                </Badge>
                <Badge variant="outline">
                  {tr("agenticRagLab.result.score", { value: formatScore(result.grading?.avgRelevance) })}
                </Badge>
                <Badge variant="outline">
                  {tr("agenticRagLab.result.iterations", { value: result.iterations })}
                </Badge>
                {result.traceId && (
                  <Badge variant="outline">
                    {tr("agenticRagLab.result.trace", { value: result.traceId.slice(0, 10) })}
                  </Badge>
                )}
                {result.grading?.blocked && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    <span>{tr("agenticRagLab.labels.guardrail")}</span>
                  </Badge>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 font-medium">
                {result.answer}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Retrieved Evidence Blocks</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {result.sources.map((src, idx) => (
                    <div key={idx} className="border border-slate-100 dark:border-slate-800 dark:bg-slate-900/50 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {src.metadata?.type || src.source}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {tr("agenticRagLab.result.relevance", { value: formatScore(src.relevance) })}
                          </Badge>
                          {src.metadata?.category && (
                            <Badge variant="outline" className="text-[10px]">
                              {src.metadata.category}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => navigator.clipboard.writeText(src.content).catch(() => {})}
                        >
                          <Copy className="size-3.5 text-slate-500" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                        {src.content}
                      </p>
                      {src.metadata?.retrieval && (
                        <div className="text-[9px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-950 p-1 rounded overflow-x-auto">
                          {JSON.stringify(src.metadata.retrieval)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Proposals */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="size-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold">{tr("agenticRagLab.proposals.title")}</h3>
            </div>

            <div className="space-y-4">
              {proposals.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-450 text-center py-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-dashed">
                  {tr("agenticRagLab.proposals.empty")}
                </p>
              )}

              {proposals.map((proposal) => {
                const edit = proposalEdits[proposal.id] || proposal.input || {};
                const isPolicy = proposal.targetType === "POLICY";
                const canApprove = isProposalReady(proposal, edit);
                return (
                  <div key={proposal.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/20 dark:bg-slate-950/10 space-y-3">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={isPolicy ? "secondary" : "default"}>
                        {isPolicy ? tr("agenticRagLab.labels.policy") : tr("agenticRagLab.labels.faq")}
                      </Badge>
                      <Badge variant="outline">{proposal.intent || tr("agenticRagLab.labels.general")}</Badge>
                      <Badge variant="outline" className="capitalize">{proposal.status}</Badge>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-100 dark:border-slate-800">
                      Query: "{proposal.originalQuery}"
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {isPolicy ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">{tr("agenticRagLab.proposals.policyTitle")}</label>
                            <Input
                              value={edit.title || ""}
                              onChange={(e) => updateProposalEdit(proposal.id, "title", e.target.value)}
                              className="h-9 text-xs dark:bg-slate-900 dark:border-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">{tr("agenticRagLab.category")}</label>
                            <Input
                              value={edit.category || ""}
                              onChange={(e) => updateProposalEdit(proposal.id, "category", e.target.value)}
                              className="h-9 text-xs dark:bg-slate-900 dark:border-slate-800"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">{tr("agenticRagLab.proposals.policyContent")}</label>
                            <Textarea
                              value={edit.content || ""}
                              onChange={(e) => updateProposalEdit(proposal.id, "content", e.target.value)}
                              rows={3}
                              className="text-xs dark:bg-slate-900 dark:border-slate-800"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">{tr("agenticRagLab.question")}</label>
                            <Input
                              value={edit.question || ""}
                              onChange={(e) => updateProposalEdit(proposal.id, "question", e.target.value)}
                              className="h-9 text-xs dark:bg-slate-900 dark:border-slate-800"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">{tr("agenticRagLab.category")}</label>
                            <Input
                              value={edit.category || ""}
                              onChange={(e) => updateProposalEdit(proposal.id, "category", e.target.value)}
                              className="h-9 text-xs dark:bg-slate-900 dark:border-slate-800"
                            />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-450 uppercase">{tr("agenticRagLab.proposals.approvedAnswer")}</label>
                            <Textarea
                              value={edit.answer || ""}
                              onChange={(e) => updateProposalEdit(proposal.id, "answer", e.target.value)}
                              rows={3}
                              className="text-xs dark:bg-slate-900 dark:border-slate-800"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="default"
                        disabled={!canApprove || Boolean(proposalBusy)}
                        onClick={() => approveProposal(proposal)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-lg"
                      >
                        {proposalBusy === `${proposal.id}:approve` ? (
                          <Loader2 className="size-3.5 animate-spin mr-1" />
                        ) : (
                          <CheckCircle2 className="size-3.5 mr-1" />
                        )}
                        <span>{tr("agenticRagLab.proposals.approve")}</span>
                      </Button>

                      <Button
                        size="xs"
                        variant="outline"
                        disabled={Boolean(proposalBusy)}
                        onClick={() => rejectProposal(proposal)}
                        className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs h-8 px-3 rounded-lg"
                      >
                        {proposalBusy === `${proposal.id}:reject` ? (
                          <Loader2 className="size-3.5 animate-spin mr-1" />
                        ) : (
                          <XCircle className="size-3.5 mr-1 text-red-500" />
                        )}
                        <span>{tr("agenticRagLab.proposals.reject")}</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Unanswered Failures */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="size-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold">{tr("agenticRagLab.failures.title")}</h3>
            </div>

            <div className="space-y-3">
              {failures.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-450 text-center py-4 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-dashed">
                  {tr("agenticRagLab.failures.empty")}
                </p>
              )}

              {failures.map((item) => (
                <div key={item.id} className="border border-slate-100 dark:border-slate-850 rounded-xl p-3.5 bg-slate-50/20 dark:bg-slate-950/10 space-y-2.5">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <Badge variant={item.blocked ? "warning" : "secondary"}>
                      {item.finalSource || "EXHAUSTED"}
                    </Badge>
                    <Badge variant="outline">
                      {tr("agenticRagLab.result.score", { value: formatScore(item.avgRelevance) })}
                    </Badge>
                    {item.category && <Badge variant="outline">{item.category}</Badge>}
                  </div>

                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-250">
                    "{item.query}"
                  </p>

                  {!item.blocked && (
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => createProposal(item, "FAQ")}
                        disabled={Boolean(proposalBusy)}
                        className="text-xs h-7 px-2.5 rounded-lg border-slate-200 dark:border-slate-800"
                      >
                        {proposalBusy === `${item.id}:FAQ` && <Loader2 className="size-3 animate-spin mr-1" />}
                        <span>{tr("agenticRagLab.failures.suggestFaq")}</span>
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => createProposal(item, "POLICY")}
                        disabled={Boolean(proposalBusy)}
                        className="text-xs h-7 px-2.5 rounded-lg border-slate-200 dark:border-slate-800"
                      >
                        {proposalBusy === `${item.id}:POLICY` && <Loader2 className="size-3 animate-spin mr-1" />}
                        <span>{tr("agenticRagLab.failures.suggestPolicy")}</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Products */}
      {tabIndex === 1 && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total Products", value: productsStats?.total || 0 },
              { label: "With Text Embedding", value: productsStats?.withTextEmbedding || 0 },
              { label: "With Image Embedding", value: productsStats?.withImageEmbedding || 0 },
              { label: "Missing Text", value: productsStats?.missingTextEmbedding || 0 },
              { label: "Missing Image", value: productsStats?.missingImageEmbedding || 0 },
            ].map((stat, idx) => (
              <div key={idx} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 flex flex-col justify-between min-h-[80px]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <span className="text-xl font-bold mt-1 text-slate-850 dark:text-slate-100">
                  {productsLoading ? "..." : stat.value}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Database className="size-5 text-indigo-650" />
                <span>Product Embeddings Directory</span>
              </h3>
              <Button
                variant="default"
                size="sm"
                onClick={() => runProductBackfill()}
                disabled={productsBackfillBusy}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5"
              >
                {productsBackfillBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span>Backfill All Products</span>
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Text Embedding</th>
                    <th className="px-4 py-3">Image Embedding</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        {productsLoading ? "Loading..." : "No products found"}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {product.mainImage ? (
                              <img src={product.mainImage} alt={product.name} className="size-9 rounded-lg object-cover border border-slate-100 dark:border-slate-850" />
                            ) : (
                              <div className="size-9 bg-slate-100 dark:bg-slate-850 rounded-lg flex items-center justify-center text-[10px] text-slate-400">No Img</div>
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[200px]">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{product.sku}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={product.isActive ? "success" : "secondary"} className="text-[10px]">
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          {product.hasTextEmbedding ? (
                            <Badge variant="success" className="text-[10px]">
                              {product.textEmbeddingGeneratedAt ? new Date(product.textEmbeddingGeneratedAt).toLocaleDateString() : "Done"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Missing</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {product.hasImageEmbedding ? (
                            <Badge variant="success" className="text-[10px]">
                              {product.imageEmbeddingGeneratedAt ? new Date(product.imageEmbeddingGeneratedAt).toLocaleDateString() : "Done"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Missing</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={productsBackfillBusy || (product.hasTextEmbedding && product.hasImageEmbedding)}
                            onClick={() => runProductBackfill(product.id)}
                            className="text-xs h-7 px-2.5 rounded-lg border-slate-200 dark:border-slate-800"
                          >
                            Generate Embedding
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center pt-2 text-xs">
              <span className="text-slate-500">
                Showing {productsOffset + 1}–{Math.min(productsOffset + 50, productsTotal)} of {productsTotal}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={productsOffset === 0 || productsLoading}
                  onClick={handleProductsPrevPage}
                  className="flex items-center gap-1 h-8 px-2.5"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={productsOffset + 50 >= productsTotal || productsLoading}
                  onClick={handleProductsNextPage}
                  className="flex items-center gap-1 h-8 px-2.5"
                >
                  <span>Next</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAQs */}
      {tabIndex === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="size-5 text-indigo-650" />
              <span>FAQs Embedding Index</span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={runFaqBackfill}
              disabled={faqBackfillBusy}
              className="flex items-center gap-1.5"
            >
              {faqBackfillBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>Backfill FAQs</span>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Embedding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {faqItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      {faqLoading ? "Loading..." : "No FAQs found"}
                    </td>
                  </tr>
                ) : (
                  faqItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">{item.question}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.isActive ? "success" : "secondary"} className="text-[10px]">
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.hasEmbedding ? "success" : "warning"} className="text-[10px]">
                          {item.hasEmbedding ? "Done" : "Missing"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Policies */}
      {tabIndex === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="size-5 text-indigo-650" />
              <span>Policies Embedding Index</span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={runPolicyBackfill}
              disabled={policyBackfillBusy}
              className="flex items-center gap-1.5"
            >
              {policyBackfillBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>Backfill Policies</span>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Effective</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3 text-right">Embedding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {policyItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      {policyLoading ? "Loading..." : "No policies found"}
                    </td>
                  </tr>
                ) : (
                  policyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.isActive ? "success" : "secondary"} className="text-[10px]">
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.effectiveAt ? new Date(item.effectiveAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.hasEmbedding ? "success" : "warning"} className="text-[10px]">
                          {item.hasEmbedding ? "Done" : "Missing"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticRAGLab;
