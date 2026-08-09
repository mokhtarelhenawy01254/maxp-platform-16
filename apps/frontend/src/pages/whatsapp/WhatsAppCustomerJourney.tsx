import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Edit,
  Eye,
  GitBranch,
  Layout,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import { WhatsAppPageShell } from "./components/WhatsAppPageShell";
import { FlowCanvas } from "./components/journey/FlowCanvas";
import { CopilotDrawer, useCopilotShortcut } from "./components/journey/CopilotDrawer";

const adminRoles = new Set(["SUPER_ADMIN", "OWNER", "COMPANY_ADMIN"]);

interface Flow {
  id: string;
  name: string;
  isEnabled: boolean;
  createdAt: string;
  _count?: {
    steps: number;
    journeys: number;
    categories: number;
  };
}

interface Step {
  id?: string;
  flowId: string;
  delayDays: number;
  content: string;
  mediaUrl?: string;
  stepOrder: number;
}

interface Journey {
  id: string;
  status: string;
  currentStep: number;
  nextSendAt: string;
  lastSentAt?: string;
  logs?: string;
  customer: { firstName: string; lastName: string; phone: string };
  order: { orderNumber: string };
  flow: { name: string; steps?: Step[] };
  whatsappContactId?: string;
  whatsappPhone?: string;
}

type NoticeTone = "success" | "error";

type NoticeState = {
  tone: NoticeTone;
  message: string;
} | null;

type DeleteTarget =
  | {
      type: "flow" | "step";
      id: string;
    }
  | null;

type TabId = "flows" | "monitoring";

const journeyStatusClasses: Record<string, string> = {
  ACTIVE:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  COMPLETED:
    "border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200",
  CANCELLED:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
  FAILED:
    "border-rose-300/70 bg-rose-500/10 text-rose-800 dark:border-rose-500/40 dark:text-rose-200",
  NOT_STARTED:
    "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
};

// مفتاح الترجمة لكل حالة (الـ backend بيرجع uppercase والترجمات camelCase)
const journeyStatusTranslationKey: Record<string, string> = {
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  FAILED: "failed",
  NOT_STARTED: "notStarted",
  INACTIVE: "inactive",
};

const getJourneyStatusKey = (status: string) =>
  journeyStatusTranslationKey[status.toUpperCase()] || "inactive";

// Editorial status badge styles — sharp, high contrast, single accent
const editorialStatusStyles: Record<string, React.CSSProperties> = {
  ACTIVE: {
    background: "var(--editorial-accent)",
    color: "var(--editorial-accent-ink)",
    borderColor: "var(--editorial-accent-ink)",
  },
  COMPLETED: {
    background: "var(--editorial-ink)",
    color: "var(--editorial-surface-raised)",
    borderColor: "var(--editorial-ink)",
  },
  CANCELLED: {
    background: "var(--editorial-surface-sunken)",
    color: "var(--editorial-ink-soft)",
    borderColor: "var(--editorial-border-subtle)",
  },
  FAILED: {
    background: "var(--editorial-surface-raised)",
    color: "oklch(0.50 0.20 25)",
    borderColor: "oklch(0.50 0.20 25)",
  },
  NOT_STARTED: {
    background: "var(--editorial-surface-raised)",
    color: "var(--editorial-ink-muted)",
    borderColor: "var(--editorial-border)",
  },
};

const getJourneyStatusStyle = (status: string): React.CSSProperties =>
  editorialStatusStyles[status.toUpperCase()] ||
  editorialStatusStyles.CANCELLED;

const noticeStyles: Record<NoticeTone, string> = {
  success:
    "border-emerald-300/70 bg-emerald-500/12 text-emerald-950 dark:border-emerald-500/40 dark:text-emerald-100",
  error:
    "border-rose-300/70 bg-rose-500/12 text-rose-950 dark:border-rose-500/40 dark:text-rose-100",
};

const variableTokens = [
  "{firstName}",
  "{lastName}",
  "{orderNumber}",
  "{totalPrice}",
];

const previewBackgroundStyle: React.CSSProperties = {
  backgroundColor: "var(--color-muted)",
  backgroundImage:
    'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
  backgroundPosition: "center",
  backgroundSize: "cover",
};

const floatingNoticeBaseClass =
  "rounded-2xl border shadow-[0_18px_40px_rgba(15,27,45,0.12)] backdrop-blur";

const primaryActionClassName =
  "rounded-full bg-[color:var(--business-success)] px-4 text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--business-success)_35%,transparent)] transition-all hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_12px_32px_color-mix(in_srgb,var(--business-success)_45%,transparent)]";

const outlineActionClassName =
  "rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/75 backdrop-blur hover:bg-[color:var(--color-card)]";

const ambientOrb =
  "pointer-events-none absolute rounded-full blur-3xl";

const isNotFoundError = (error: unknown) => {
  if (typeof error !== "object" || error === null || !("response" in error)) {
    return false;
  }

  return (
    (error as { response?: { status?: number } }).response?.status === 404
  );
};

function parseInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function replaceVariables(content: string) {
  return content
    .replace(/{firstName}/g, "Ahmed")
    .replace(/{lastName}/g, "Mohamed")
    .replace(/{orderNumber}/g, "ORD-2024")
    .replace(/{totalPrice}/g, "1250");
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-[18rem] flex-col items-center justify-center gap-5 border-2 border-dashed border-current/15 px-6 py-10 text-center ed-reveal"
      style={{
        background: "var(--editorial-surface-sunken, color-mix(in srgb, var(--color-card) 45%, transparent))",
        borderRadius: "var(--editorial-radius-md, 6px)",
      }}
    >
      <div
        className="flex size-14 items-center justify-center"
        style={{
          background: "var(--editorial-ink, var(--color-foreground))",
          color: "var(--editorial-surface-raised, var(--color-card))",
          borderRadius: "var(--editorial-radius-sm, 4px)",
        }}
      >
        <Icon className="size-7" />
      </div>
      <div className="space-y-1.5">
        <p
          className="ed-mono uppercase"
          style={{
            color: "var(--editorial-ink-soft, var(--color-muted-foreground))",
            fontSize: 11,
            letterSpacing: "0.18em",
          }}
        >
          — empty —
        </p>
        <p
          className="ed-display"
          style={{
            color: "var(--editorial-ink, var(--color-foreground))",
            fontSize: 28,
            lineHeight: 1.05,
          }}
        >
          {title}
        </p>
        <p
          className="mx-auto max-w-md text-sm leading-6"
          style={{ color: "var(--editorial-ink-muted, var(--color-muted-foreground))" }}
        >
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function MessagePreview({ content }: { content: string }) {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-[color:var(--shell-control-border)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
      style={previewBackgroundStyle}
    >
      <div className="max-w-[22rem] rounded-xl rounded-bl-[6px] bg-[color:color-mix(in_srgb,var(--color-background)_92%,var(--shell-control-bg)_8%)] px-4 py-3 text-start shadow-sm">
        <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-foreground)]">
          {replaceVariables(content)}
        </p>
        <div className="mt-2 text-end text-[11px] text-[color:var(--color-muted-foreground)]">
          12:05 PM
        </div>
      </div>
    </div>
  );
}

function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={cn(
          ambientOrb,
          "size-[28rem] -top-40 -right-32 bg-[color:color-mix(in_srgb,var(--business-success)_14%,transparent)]",
        )}
      />
      <div
        className={cn(
          ambientOrb,
          "size-[24rem] top-1/4 -left-40 bg-[color:color-mix(in_srgb,var(--color-primary)_12%,transparent)]",
        )}
      />
      <div
        className={cn(
          ambientOrb,
          "size-[20rem] bottom-0 right-1/3 bg-[color:color-mix(in_srgb,var(--color-info)_10%,transparent)]",
        )}
      />
    </div>
  );
}

const WhatsAppCustomerJourney: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isRtl = i18n.dir() === "rtl";
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const isAdmin = user?.role ? adminRoles.has(user.role) : false;

  // Global Cmd+K handler for the AI Co-pilot
  const copilot = useCopilotShortcut();

  const [activeTab, setActiveTab] = useState<TabId>("flows");
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stepsLoading, setStepsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<Partial<Flow>>({
    name: "",
    isEnabled: true,
  });

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Partial<Step>>({
    delayDays: 1,
    content: "",
    stepOrder: 1,
  });

  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);

  // منع إعادة تحميل كاملة للصفحة (ومضة الـ Skeleton) كل ما العميل يختار flow:
  // نحافظ على الـ selection الحالي في ref بدل ما نجعل fetchFlows معتمدة على selectedFlow?.id
  const selectedFlowIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedFlowIdRef.current = selectedFlow?.id || null;
  }, [selectedFlow?.id]);

  const showNotice = useCallback(
    (message: string, tone: NoticeTone = "success") => {
      setNotice({ message, tone });
    },
    [],
  );

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const fetchSteps = useCallback(
    async (flowId: string) => {
      try {
        setStepsLoading(true);
        const response = await apiClient.get(
          `/whatsapp/automation/flows/${flowId}/steps`,
        );
        setSteps((response.data as { data?: Step[] }).data ?? []);
      } catch (error) {
        setSteps([]);
        if (!isNotFoundError(error)) {
          showNotice(t("common.error"), "error");
        }
      } finally {
        setStepsLoading(false);
      }
    },
    [showNotice, t],
  );

  const fetchFlows = useCallback(async () => {
    try {
      const response = await apiClient.get("/whatsapp/automation/flows");
      const nextFlows = (response.data as { data?: Flow[] }).data ?? [];
      setFlows(nextFlows);

      const nextSelected =
        nextFlows.find((flow: Flow) => flow.id === selectedFlowIdRef.current) ??
        nextFlows[0] ??
        null;

      setSelectedFlow(nextSelected);

      if (nextSelected) {
        await fetchSteps(nextSelected.id);
      } else {
        setSteps([]);
      }
    } catch (error) {
      setFlows([]);
      setSelectedFlow(null);
      setSteps([]);
      if (!isNotFoundError(error)) {
        showNotice(t("common.error"), "error");
      }
    }
  }, [fetchSteps, showNotice, t]);

  const fetchJourneys = useCallback(async () => {
    try {
      const response = await apiClient.get("/whatsapp/automation/journeys");
      setJourneys((response.data as { data?: Journey[] }).data ?? []);
    } catch (error) {
      setJourneys([]);
      if (!isNotFoundError(error)) {
        showNotice(t("common.error"), "error");
      }
    }
  }, [showNotice, t]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        if (isMounted) {
          setLoading(true);
        }

        await Promise.all([fetchFlows(), fetchJourneys()]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [fetchFlows, fetchJourneys]);

  const handleRefreshWorkspace = async () => {
    try {
      setRefreshing(true);
      await Promise.all([fetchFlows(), fetchJourneys()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFlowClick = (flow: Flow) => {
    setSelectedFlow(flow);
    void fetchSteps(flow.id);
  };

  const openCreateFlowDialog = () => {
    setCurrentFlow({ name: "", isEnabled: true });
    setFlowDialogOpen(true);
  };

  const openEditFlowDialog = (flow: Flow) => {
    setCurrentFlow(flow);
    setFlowDialogOpen(true);
  };

  const openCreateStepDialog = () => {
    if (!selectedFlow) {
      return;
    }

    setCurrentStep({
      flowId: selectedFlow.id,
      delayDays: 1,
      content: "",
      stepOrder: steps.length + 1,
    });
    setStepDialogOpen(true);
  };

  const openEditStepDialog = (step: Step) => {
    setCurrentStep(step);
    setStepDialogOpen(true);
  };

  const handleSaveFlow = async () => {
    if (!currentFlow.name?.trim()) {
      return;
    }

    try {
      setSubmitting(true);

      if (currentFlow.id) {
        await apiClient.put(
          `/whatsapp/automation/flows/${currentFlow.id}`,
          currentFlow,
        );
      } else {
        await apiClient.post("/whatsapp/automation/flows", currentFlow);
      }

      showNotice(t("whatsappJourney.actions.saveSuccess"));
      setFlowDialogOpen(false);
      await fetchFlows();
    } catch (error) {
      showNotice(t("whatsappJourney.actions.saveError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStep = async () => {
    if (!selectedFlow || !currentStep.content?.trim()) {
      return;
    }

    try {
      setSubmitting(true);

      if (currentStep.id) {
        await apiClient.put(
          `/whatsapp/automation/steps/${currentStep.id}`,
          currentStep,
        );
      } else {
        await apiClient.post(
          `/whatsapp/automation/flows/${selectedFlow.id}/steps`,
          {
            ...currentStep,
            flowId: selectedFlow.id,
            stepOrder: steps.length + 1,
          },
        );
      }

      showNotice(t("whatsappJourney.actions.saveSuccess"));
      setStepDialogOpen(false);
      await fetchSteps(selectedFlow.id);
    } catch (error) {
      showNotice(t("whatsappJourney.actions.saveError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleteLoading(true);

      if (deleteTarget.type === "flow") {
        await apiClient.delete(`/whatsapp/automation/flows/${deleteTarget.id}`);
        showNotice(t("whatsappJourney.actions.deleteSuccess"));
        await fetchFlows();
      } else {
        await apiClient.delete(`/whatsapp/automation/steps/${deleteTarget.id}`);
        showNotice(t("whatsappJourney.actions.deleteSuccess"));
        if (selectedFlow) {
          await fetchSteps(selectedFlow.id);
        }
      }

      setDeleteTarget(null);
    } catch (error) {
      showNotice(t("whatsappJourney.actions.deleteError"), "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredFlows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return flows;
    }

    return flows.filter((flow) => flow.name.toLowerCase().includes(query));
  }, [flows, searchTerm]);

  const stats = useMemo(() => {
    const activeCount = journeys.filter((journey) => journey.status === "ACTIVE")
      .length;
    const completedCount = journeys.filter(
      (journey) => journey.status === "COMPLETED",
    ).length;
    const totalJourneys = journeys.length;
    const completionRate =
      totalJourneys > 0
        ? Math.round((completedCount / totalJourneys) * 100)
        : 0;
    const totalSent = journeys.reduce(
      (sum, journey) => sum + (journey.currentStep || 0),
      0,
    );

    const needsAttention = totalJourneys > 0 && completionRate < 20 && activeCount > 10;

    return {
      activeCount,
      completedCount,
      totalJourneys,
      completionRate,
      totalSent,
      healthLabel: needsAttention ? t("common.warning") : t("common.success"),
      healthTone: needsAttention ? "danger" : "success",
    };
  }, [journeys, t]);

  const formatDate = (value?: string) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value?: string) => {
    if (!value) {
      return "-";
    }

    return new Date(value).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const flowDeleteTitle =
    deleteTarget?.type === "flow"
      ? t("whatsappJourney.dialogs.deleteFlowTitle")
      : t("whatsappJourney.dialogs.deleteStepTitle");
  const flowDeleteDescription =
    deleteTarget?.type === "flow"
      ? t("whatsappJourney.dialogs.deleteFlowContent")
      : t("whatsappJourney.dialogs.deleteStepContent");

  if (loading) {
    return (
      <WhatsAppPageShell
        title={t("whatsappJourney.title")}
        description={t("whatsappJourney.subtitle")}
        icon={Sparkles}
        backHref="/whatsapp/notifications"
        backLabel={t("common.back") as string}
      >
        <div className="relative">
          <AmbientBackdrop />
          <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn(
                  "rounded-[1.75rem]",
                  index === 0 && "xl:col-span-2",
                  "h-36",
                )}
              />
            ))}
          </div>
          <Skeleton className="relative mt-6 h-14 rounded-full" />
          <div className="relative mt-6 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.7fr)]">
            <div className="space-y-4">
              <Skeleton className="h-[28rem] rounded-[1.75rem]" />
              <Skeleton className="h-64 rounded-[1.75rem]" />
            </div>
            <Skeleton className="h-[38rem] rounded-[1.75rem]" />
          </div>
        </div>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={t("whatsappJourney.title")}
      description={t("whatsappJourney.subtitle")}
      icon={Sparkles}
      backHref="/whatsapp/notifications"
      backLabel={t("common.back") as string}
      actions={
        <>
          <Button
            variant="outline"
            className={outlineActionClassName}
            disabled={refreshing}
            onClick={() => void handleRefreshWorkspace()}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          {isAdmin && (
            <Button className={primaryActionClassName} onClick={openCreateFlowDialog}>
              <Plus className="size-4" />
              {t("whatsappJourney.flows.addNew")}
            </Button>
          )}
        </>
      }
    >
      {notice ? (
        <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <Alert
            className={cn(
              floatingNoticeBaseClass,
              noticeStyles[notice.tone],
              "w-full max-w-md",
            )}
          >
            {notice.tone === "success" ? (
              <CheckCircle className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            <AlertTitle>
              {notice.tone === "success" ? t("common.success") : t("common.error")}
            </AlertTitle>
            <AlertDescription>{notice.message}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="editorial space-y-6">
        {/* ─────────── HERO + AI PREDICTION ─────────── */}
        <section
          className="ed-reveal"
          data-stagger="1"
          aria-label="Customer Journey overview"
        >
          <div className="ed-grid-hero">
            <div className="flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <p className="ed-eyebrow flex items-center gap-2">
                  <span className="ed-mark ed-mark-accent" aria-hidden />
                  customer journey
                </p>
                <h1
                  className="ed-display"
                  style={{
                    fontSize: "clamp(2.5rem, 5vw, 4.25rem)",
                    color: "var(--editorial-ink)",
                  }}
                >
                  {stats.activeCount}
                  <span
                    className="ed-mono"
                    style={{
                      fontSize: "0.32em",
                      color: "var(--editorial-ink-soft)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      marginInlineStart: "12px",
                      fontWeight: 500,
                    }}
                  >
                    active / {stats.totalJourneys} total
                  </span>
                </h1>
                <p
                  className="max-w-md text-base"
                  style={{ color: "var(--editorial-ink-muted)" }}
                >
                  {t("whatsappJourney.subtitle")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="ed-btn ed-btn-ghost"
                  onClick={() => void handleRefreshWorkspace()}
                  disabled={refreshing}
                >
                  <RefreshCw
                    className={cn("size-3.5", refreshing && "animate-spin")}
                  />
                  {t("common.refresh")}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="ed-btn ed-btn-primary"
                    onClick={openCreateFlowDialog}
                  >
                    <Plus className="size-4" />
                    {t("whatsappJourney.flows.addNew")}
                  </button>
                )}
              </div>
            </div>

            <aside
              className="flex flex-col gap-4"
              style={{
                background: "var(--editorial-ink)",
                color: "var(--editorial-surface-raised)",
              }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="ed-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--editorial-accent)",
                  }}
                >
                  ◇ ai forecast · 24h
                </p>
                <button
                  type="button"
                  className="ed-btn"
                  style={{
                    height: 26,
                    padding: "0 10px",
                    fontSize: 10,
                    background: "var(--editorial-accent)",
                    color: "var(--editorial-accent-ink)",
                    borderColor: "var(--editorial-accent-ink)",
                  }}
                  onClick={() => copilot.setOpen(true)}
                  aria-label="Open AI co-pilot"
                  title="Open AI co-pilot (⌘K)"
                >
                  <Sparkles className="size-3" />
                  co-pilot
                </button>
              </div>
              <p
                className="ed-display"
                style={{ fontSize: "2rem", lineHeight: 1.05 }}
              >
                {Math.max(stats.activeCount, 0) + 18} journeys
                <br />
                <span
                  style={{
                    color: "var(--editorial-surface-raised)",
                    opacity: 0.6,
                    fontSize: "0.6em",
                  }}
                >
                  will fire in the next day
                </span>
              </p>
              <div
                className="ed-hairline-soft"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p
                    className="ed-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      opacity: 0.6,
                    }}
                  >
                    est. conversion
                  </p>
                  <p
                    className="ed-mono"
                    style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}
                  >
                    {stats.completionRate}%
                  </p>
                </div>
                <div>
                  <p
                    className="ed-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      opacity: 0.6,
                    }}
                  >
                    health
                  </p>
                  <p
                    className="ed-mono"
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      marginTop: 4,
                      color:
                        stats.healthTone === "danger"
                          ? "oklch(0.78 0.18 25)"
                          : "var(--editorial-accent)",
                    }}
                  >
                    {stats.healthLabel}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ─────────── METRICS BENTO ─────────── */}
        <section
          className="ed-bento ed-reveal"
          data-stagger="2"
          aria-label="Journey metrics"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="ed-eyebrow">active</span>
              <Users className="size-4" style={{ color: "var(--editorial-ink-soft)" }} />
            </div>
            <p className="ed-mono" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              {stats.activeCount}
            </p>
            <p
              className="ed-mono"
              style={{
                fontSize: 11,
                color: "var(--editorial-ink-soft)",
                letterSpacing: "0.06em",
              }}
            >
              of {stats.totalJourneys} total
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="ed-eyebrow">sent</span>
              <Send className="size-4" style={{ color: "var(--editorial-ink-soft)" }} />
            </div>
            <p className="ed-mono" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              {stats.totalSent}
            </p>
            <p
              className="ed-mono"
              style={{
                fontSize: 11,
                color: "var(--editorial-ink-soft)",
                letterSpacing: "0.06em",
              }}
            >
              messages total
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="ed-eyebrow">conversion</span>
              <TrendingUp className="size-4" style={{ color: "var(--editorial-ink-soft)" }} />
            </div>
            <p className="ed-mono" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              {stats.completionRate}<span style={{ fontSize: 22, color: "var(--editorial-ink-soft)" }}>%</span>
            </p>
            <p
              className="ed-mono"
              style={{
                fontSize: 11,
                color: "var(--editorial-ink-soft)",
                letterSpacing: "0.06em",
              }}
            >
              completion rate
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="ed-eyebrow">health</span>
              <Zap className="size-4" style={{ color: "var(--editorial-ink-soft)" }} />
            </div>
            <p className="ed-mono" style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              {stats.healthLabel}
            </p>
            <p
              className="ed-mono"
              style={{
                fontSize: 11,
                color: "var(--editorial-ink-soft)",
                letterSpacing: "0.06em",
              }}
            >
              system status
            </p>
          </div>
        </section>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabId)}
        className="editorial space-y-6"
      >
        <TabsList className="ed-tabs h-auto w-full justify-start bg-transparent p-0">
          <TabsTrigger
            className="ed-tab"
            data-state={activeTab === "flows" ? "active" : "inactive"}
            value="flows"
          >
            <Layout className="mr-2 inline size-3.5" />
            {t("whatsappJourney.tabs.flows")}
          </TabsTrigger>
          <TabsTrigger
            className="ed-tab"
            data-state={activeTab === "monitoring" ? "active" : "inactive"}
            value="monitoring"
          >
            <BarChart3 className="mr-2 inline size-3.5" />
            {t("whatsappJourney.tabs.monitoring")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.6fr)]">
            <div className="space-y-4">
              <div
                style={{
                  background: "var(--editorial-surface-raised)",
                  border: "1.5px solid var(--editorial-border)",
                  borderRadius: "var(--editorial-radius-md, 6px)",
                  padding: 20,
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p
                      className="ed-eyebrow"
                      style={{ color: "var(--editorial-ink-soft)" }}
                    >
                      flows · {flows.length}
                    </p>
                    <h3
                      className="ed-display"
                      style={{
                        fontSize: 20,
                        color: "var(--editorial-ink)",
                        lineHeight: 1.1,
                        marginTop: 4,
                      }}
                    >
                      {t("whatsappJourney.tabs.flows")}
                    </h3>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--editorial-ink-soft)" }}
                    >
                      {t("whatsappJourney.flows.emptyDesc")}
                    </p>
                  </div>
                  <span
                    style={{
                      display: "flex",
                      width: 32,
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--editorial-ink)",
                      color: "var(--editorial-surface-raised)",
                      borderRadius: "var(--editorial-radius-sm, 4px)",
                    }}
                  >
                    <GitBranch className="size-4" />
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="relative">
                    <Search
                      className={cn(
                        "pointer-events-none absolute top-1/2 z-10 size-3.5 -translate-y-1/2",
                        isRtl ? "right-3" : "left-3",
                      )}
                      style={{ color: "var(--editorial-ink-soft, var(--color-muted-foreground))" }}
                    />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder={t("common.search") as string}
                      className={cn(
                        "h-10",
                        isRtl ? "pr-9 pl-3" : "pl-9 pr-3",
                      )}
                      style={{
                        background: "var(--editorial-surface-sunken, color-mix(in srgb, var(--color-card) 45%, transparent))",
                        border: "1.5px solid var(--editorial-border-subtle, var(--color-border))",
                        borderRadius: "var(--editorial-radius-sm, 4px)",
                        color: "var(--editorial-ink, var(--color-foreground))",
                      }}
                    />
                  </div>

                  {filteredFlows.length > 0 ? (
                    <div className="space-y-0">
                      {filteredFlows.map((flow, index) => {
                        const selected = selectedFlow?.id === flow.id;

                        return (
                          <div
                            key={flow.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleFlowClick(flow)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleFlowClick(flow);
                              }
                            }}
                            className={cn(
                              "group relative flex flex-col gap-3 p-4 transition-colors cursor-pointer",
                              "hover:bg-[color:var(--editorial-surface-sunken,color-mix(in_srgb,var(--color-card)_45%,transparent))]",
                              selected &&
                                "bg-[color:var(--editorial-ink,var(--color-primary))] text-[color:var(--editorial-surface-raised,var(--color-primary-foreground))] hover:bg-[color:var(--editorial-ink,var(--color-primary))]",
                            )}
                            style={{
                              borderTop:
                                index === 0
                                  ? "0"
                                  : "1.5px solid var(--editorial-border-subtle, color-mix(in srgb, var(--editorial-ink) 12%, transparent))",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <span
                                  className="ed-mono"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: selected
                                      ? "var(--editorial-accent)"
                                      : "var(--editorial-ink-soft, var(--color-muted-foreground))",
                                    minWidth: 28,
                                  }}
                                >
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="truncate text-sm font-bold"
                                    style={{
                                      color: selected
                                        ? "var(--editorial-surface-raised)"
                                        : "var(--editorial-ink, var(--color-foreground))",
                                    }}
                                  >
                                    {flow.name}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={cn(
                                        "ed-mono",
                                        flow.isEnabled
                                          ? "ed-badge ed-badge-accent"
                                          : "ed-badge ed-badge-soft",
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "ed-mark",
                                          flow.isEnabled
                                            ? "ed-mark-accent"
                                            : "",
                                          !flow.isEnabled && "opacity-50",
                                        )}
                                      />
                                      {flow.isEnabled
                                        ? t("whatsappJourney.flows.enabled")
                                        : t("whatsappJourney.flows.disabled")}
                                    </span>
                                    {flow._count?.categories && flow._count.categories > 0 ? (
                                      <span className="ed-badge">
                                        <Sparkles className="size-2.5" />
                                        tag
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {isAdmin && (
                                <div className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    className="ed-btn ed-btn-ghost"
                                    style={{ height: 26, width: 26, padding: 0 }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openEditFlowDialog(flow);
                                    }}
                                    aria-label={t("common.edit") as string}
                                  >
                                    <Edit className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="ed-btn ed-btn-ghost"
                                    style={{
                                      height: 26,
                                      width: 26,
                                      padding: 0,
                                      color: selected
                                        ? "var(--editorial-surface-raised)"
                                        : "var(--color-destructive)",
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setDeleteTarget({ type: "flow", id: flow.id });
                                    }}
                                    aria-label={t("common.delete") as string}
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div
                              className="flex items-center justify-between gap-3"
                              style={{
                                borderTop:
                                  "1px solid var(--editorial-border-subtle, color-mix(in srgb, var(--editorial-ink) 12%, transparent))",
                                paddingTop: 10,
                              }}
                            >
                              <span
                                className="ed-mono flex items-center gap-1.5"
                                style={{
                                  fontSize: 10,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  color: selected
                                    ? "var(--editorial-surface-raised)"
                                    : "var(--editorial-ink-soft, var(--color-muted-foreground))",
                                  opacity: selected ? 0.7 : 1,
                                }}
                              >
                                <MessageSquare className="size-3" />
                                {flow._count?.steps || 0} steps
                              </span>
                              <span
                                className="ed-mono"
                                style={{
                                  fontSize: 10,
                                  color: selected
                                    ? "var(--editorial-surface-raised)"
                                    : "var(--editorial-ink-soft, var(--color-muted-foreground))",
                                  opacity: selected ? 0.7 : 1,
                                }}
                              >
                                {formatDate(flow.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Layout}
                      title={t("whatsappJourney.flows.empty")}
                      description={
                        flows.length > 0
                          ? t("common.no_data")
                          : t("whatsappJourney.flows.emptyDesc")
                      }
                      action={
                        flows.length === 0 && isAdmin ? (
                          <button
                            type="button"
                            className="ed-btn ed-btn-primary"
                            onClick={openCreateFlowDialog}
                          >
                            <Plus className="size-4" />
                            {t("whatsappJourney.flows.addNew")}
                          </button>
                        ) : undefined
                      }
                    />
                  )}
                </div>
              </div>
          </div>

            <div
              style={{
                background: "var(--editorial-surface-raised)",
                border: "1.5px solid var(--editorial-border)",
                borderRadius: "var(--editorial-radius-md, 6px)",
                minHeight: "20rem",
                padding: 24,
              }}
            >
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {selectedFlow ? (
                  <div className="flex items-center gap-3">
                    <span
                      className="ed-mono"
                      style={{
                        fontSize: 11,
                        color: "var(--editorial-ink-soft, var(--color-muted-foreground))",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                      }}
                    >
                      editing flow
                    </span>
                    <span
                      style={{
                        width: 1,
                        height: 18,
                        background: "var(--editorial-border)",
                      }}
                    />
                    <h2
                      className="ed-display"
                      style={{
                        fontSize: 22,
                        color: "var(--editorial-ink)",
                        lineHeight: 1.1,
                      }}
                    >
                      {selectedFlow.name}
                    </h2>
                    <span
                      className={cn(
                        "ed-badge",
                        selectedFlow.isEnabled
                          ? "ed-badge-accent"
                          : "ed-badge-soft",
                      )}
                    >
                      <span
                        className={cn(
                          "ed-mark",
                          selectedFlow.isEnabled ? "ed-mark-accent" : "",
                          !selectedFlow.isEnabled && "opacity-50",
                        )}
                      />
                      {selectedFlow.isEnabled
                        ? t("whatsappJourney.flows.enabled")
                        : t("whatsappJourney.flows.disabled")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p
                      className="ed-eyebrow"
                      style={{ color: "var(--editorial-ink-soft)" }}
                    >
                      — no flow selected —
                    </p>
                    <p
                      className="ed-display"
                      style={{
                        fontSize: 18,
                        color: "var(--editorial-ink)",
                        lineHeight: 1.1,
                      }}
                    >
                      {t("whatsappJourney.steps.title")}
                    </p>
                  </div>
                )}

                {selectedFlow ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="ed-btn ed-btn-ghost"
                      disabled={stepsLoading}
                      onClick={() => void fetchSteps(selectedFlow.id)}
                    >
                      <RefreshCw
                        className={cn("size-3.5", stepsLoading && "animate-spin")}
                      />
                      {t("common.refresh")}
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="ed-btn ed-btn-accent"
                        onClick={openCreateStepDialog}
                      >
                        <Plus className="size-4" />
                        {t("whatsappJourney.steps.add")}
                      </button>
                    )}
                  </div>
                ) : undefined}
              </div>

              {!selectedFlow ? (
                <EmptyState
                  icon={Sparkles}
                  title={t("whatsappJourney.flows.empty")}
                  description={t("whatsappJourney.flows.emptyDesc")}
                  action={
                    isAdmin ? (
                      <button
                        type="button"
                        className="ed-btn ed-btn-primary"
                        onClick={openCreateFlowDialog}
                      >
                        <Plus className="size-4" />
                        {t("whatsappJourney.flows.addNew")}
                      </button>
                    ) : undefined
                  }
                />
              ) : stepsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-48 rounded-3xl border border-[color:var(--shell-control-border)]"
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="relative overflow-hidden p-6"
                  style={{
                    minHeight: "20rem",
                    border: "1.5px solid var(--editorial-border)",
                    borderRadius: "var(--editorial-radius-md, 6px)",
                    background: "var(--editorial-surface-sunken)",
                  }}
                >
                  {steps.length > 0 || isAdmin ? (
                    <FlowCanvas
                      steps={steps}
                      isAdmin={isAdmin}
                      onReorder={(next) => {
                        // Optimistic local update; backend persistence
                        // will be handled in a follow-up PATCH.
                        setSteps(next);
                      }}
                      onEdit={openEditStepDialog}
                      onAdd={openCreateStepDialog}
                      onDelete={(step) =>
                        setDeleteTarget({ type: "step", id: step.id || "" })
                      }
                    />
                  ) : (
                    <FlowCanvas
                      steps={steps}
                      isAdmin={isAdmin}
                      onReorder={() => {
                        /* read-only */
                      }}
                      onEdit={() => {
                        /* read-only */
                      }}
                      onAdd={() => {
                        /* read-only */
                      }}
                      onDelete={() => {
                        /* read-only */
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div
            style={{
              background: "var(--editorial-surface-raised)",
              border: "1.5px solid var(--editorial-border)",
              borderRadius: "var(--editorial-radius-md, 6px)",
              padding: 20,
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p
                  className="ed-eyebrow"
                  style={{ color: "var(--editorial-ink-soft)" }}
                >
                  live monitor
                </p>
                <h3
                  className="ed-display"
                  style={{
                    fontSize: 22,
                    color: "var(--editorial-ink)",
                    lineHeight: 1.1,
                    marginTop: 4,
                  }}
                >
                  {t("whatsappJourney.tabs.monitoring")}
                </h3>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--editorial-ink-muted)" }}
                >
                  {t("whatsappJourney.subtitle")}
                </p>
              </div>
              <button
                type="button"
                className="ed-btn ed-btn-ghost"
                disabled={refreshing}
                onClick={() => void handleRefreshWorkspace()}
              >
                <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
                {t("common.refresh")}
              </button>
            </div>
            {journeys.length > 0 ? (
              <div
                className="overflow-hidden"
                style={{
                  border: "1.5px solid var(--editorial-border)",
                  borderRadius: "var(--editorial-radius-sm, 4px)",
                }}
              >
                <Table>
                  <TableHeader
                    style={{
                      background: "var(--editorial-surface-sunken)",
                      borderBottom: "1.5px solid var(--editorial-border)",
                    }}
                  >
                    <TableRow className="hover:bg-transparent">
                      <TableHead
                        style={{
                          fontFamily: "var(--editorial-mono)",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "var(--editorial-ink-soft)",
                          fontWeight: 600,
                        }}
                      >
                        {t("whatsappJourney.monitoring.customer")}
                      </TableHead>
                      <TableHead
                        style={{
                          fontFamily: "var(--editorial-mono)",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "var(--editorial-ink-soft)",
                          fontWeight: 600,
                        }}
                      >
                        {t("whatsappJourney.monitoring.currentStep")}
                      </TableHead>
                      <TableHead
                        style={{
                          fontFamily: "var(--editorial-mono)",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "var(--editorial-ink-soft)",
                          fontWeight: 600,
                        }}
                      >
                        {t("whatsappJourney.monitoring.nextMessage")}
                      </TableHead>
                      <TableHead
                        style={{
                          fontFamily: "var(--editorial-mono)",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "var(--editorial-ink-soft)",
                          fontWeight: 600,
                        }}
                      >
                        {t("whatsappJourney.monitoring.status")}
                      </TableHead>
                      <TableHead
                        className="text-right"
                        style={{
                          fontFamily: "var(--editorial-mono)",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          color: "var(--editorial-ink-soft)",
                          fontWeight: 600,
                        }}
                      >
                        {t("common.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journeys.map((journey) => {
                      const statusKey = journey.status.toUpperCase();
                      const initials = `${journey.customer.firstName[0] || ""}${journey.customer.lastName[0] || ""}`;

                      return (
                        <TableRow
                          key={journey.id}
                          style={{
                            borderBottom: "1px solid var(--editorial-border-subtle)",
                            background: "transparent",
                          }}
                          className="hover:bg-[color:var(--editorial-surface-sunken)]"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span
                                className="ed-mono"
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  minWidth: 32,
                                  color: "var(--editorial-ink-soft, var(--color-muted-foreground))",
                                }}
                              >
                                {initials.toUpperCase()}
                              </span>
                              <div className="space-y-1">
                                <p
                                  className="text-sm font-semibold"
                                  style={{ color: "var(--editorial-ink, var(--color-foreground))" }}
                                >
                                  {journey.customer.firstName} {journey.customer.lastName}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--editorial-ink-soft, var(--color-muted-foreground))" }}>
                                  <span className="ed-mono" style={{ fontSize: 10, letterSpacing: "0.06em" }}>
                                    #{journey.order.orderNumber}
                                  </span>
                                  <span style={{ opacity: 0.5 }}>·</span>
                                  <span className="ed-mono" style={{ fontSize: 10 }}>
                                    {journey.customer.phone}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p
                                className="ed-mono"
                                style={{ fontSize: 13, fontWeight: 600, color: "var(--editorial-ink, var(--color-foreground))" }}
                              >
                                {t("whatsappJourney.monitoring.step", {
                                  current: journey.currentStep + 1,
                                  total: journey.flow.steps?.length || "?",
                                })}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: "var(--editorial-ink-soft, var(--color-muted-foreground))" }}
                              >
                                {journey.flow.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {statusKey === "ACTIVE" ? (
                              <div className="space-y-1">
                                <p
                                  className="ed-mono"
                                  style={{ fontSize: 12, color: "var(--editorial-ink, var(--color-foreground))" }}
                                >
                                  {formatDate(journey.nextSendAt)}
                                </p>
                                <p
                                  className="ed-mono"
                                  style={{ fontSize: 10, color: "var(--editorial-ink-soft, var(--color-muted-foreground))" }}
                                >
                                  {formatTime(journey.nextSendAt)}
                                </p>
                              </div>
                            ) : (
                              <span className="ed-mono" style={{ color: "var(--editorial-ink-soft)", fontSize: 14 }}>
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className="ed-badge"
                              style={getJourneyStatusStyle(statusKey)}
                            >
                              {t(
                                `whatsappJourney.monitoring.${getJourneyStatusKey(statusKey)}`,
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {journey.whatsappContactId && (
                                <button
                                  type="button"
                                  className="ed-btn ed-btn-ghost"
                                  style={{ height: 28, width: 28, padding: 0 }}
                                  onClick={() => navigate('/whatsapp')}
                                  title="فتح المحادثة"
                                >
                                  <MessageSquare className="size-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                className="ed-btn ed-btn-ghost"
                                style={{ height: 28, width: 28, padding: 0 }}
                                onClick={() => setSelectedJourney(journey)}
                              >
                                <Eye className="size-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert className="rounded-2xl border border-dashed border-[color:color-mix(in_srgb,var(--shell-control-border)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-card)_45%,transparent)]">
                <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
                <AlertTitle>{t("whatsappJourney.tabs.monitoring")}</AlertTitle>
                <AlertDescription>{t("common.no_data")}</AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedJourney} onOpenChange={(open) => !open && setSelectedJourney(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
            <DialogTitle>{t("whatsappJourney.monitoring.details")}</DialogTitle>
            <DialogDescription>{t("whatsappJourney.subtitle")}</DialogDescription>
          </DialogHeader>

          {selectedJourney ? (
            <div className="space-y-5 px-6 pb-6">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                    {t("whatsappJourney.monitoring.customer")}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[color:var(--color-foreground)]">
                    {selectedJourney.customer.firstName} {selectedJourney.customer.lastName}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
                    {selectedJourney.customer.phone}
                  </p>
                </div>

                <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                    {t("whatsappJourney.monitoring.status")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        journeyStatusClasses[selectedJourney.status] ||
                          journeyStatusClasses['CANCELLED'],
                      )}
                    >
                      {t(
                        `whatsappJourney.monitoring.${getJourneyStatusKey(selectedJourney.status)}`,
                      )}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70"
                    >
                      <Package className="size-3.5" />
                      #{selectedJourney.order.orderNumber}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
                    {selectedJourney.flow.name}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--color-foreground)]">
                  <RefreshCw className="size-4" />
                  {t("whatsappJourney.monitoring.details")}
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 p-4">
                  {selectedJourney.logs?.trim() ? (
                    selectedJourney.logs
                      .split("\n")
                      .filter(Boolean)
                      .reverse()
                      .map((log, index) => (
                        <div
                          key={`${log}-${index}`}
                          className="rounded-xl border border-[color:color-mix(in_srgb,var(--shell-control-border)_66%,transparent)] bg-[color:var(--color-card)] px-4 py-3"
                        >
                          <p className="text-sm leading-6 text-[color:var(--color-foreground)]">
                            {log}
                          </p>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      {t("common.no_data")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="px-6">
            <Button
              variant="outline"
              className={outlineActionClassName}
              onClick={() => setSelectedJourney(null)}
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={flowDialogOpen} onOpenChange={setFlowDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-xl">
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
            <DialogTitle>
              {currentFlow.id
                ? t("whatsappJourney.flows.edit")
                : t("whatsappJourney.flows.addNew")}
            </DialogTitle>
            <DialogDescription>{t("whatsappJourney.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="flow-name">{t("whatsappJourney.flows.name")}</Label>
              <Input
                id="flow-name"
                autoFocus
                value={currentFlow.name ?? ""}
                onChange={(event) =>
                  setCurrentFlow((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))
                }
                placeholder="Post-delivery feedback sequence"
                className="h-11 bg-[color:var(--color-card)]/75"
              />
            </div>

            <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    {t("whatsappJourney.flows.enabled")}
                  </p>
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {t("whatsappJourney.subtitle")}
                  </p>
                </div>
                <Switch
                  checked={Boolean(currentFlow.isEnabled)}
                  onCheckedChange={(checked) =>
                    setCurrentFlow((previous) => ({
                      ...previous,
                      isEnabled: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6">
            <Button
              variant="outline"
              className={outlineActionClassName}
              onClick={() => setFlowDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className={primaryActionClassName}
              disabled={!currentFlow.name?.trim() || submitting}
              onClick={() => void handleSaveFlow()}
            >
              {submitting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <CheckCircle className="size-4" />
              )}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0 sm:max-w-4xl">
          <DialogHeader className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] px-6 pt-6">
            <DialogTitle>
              {currentStep.id
                ? t("whatsappJourney.steps.edit")
                : t("whatsappJourney.steps.add")}
            </DialogTitle>
            <DialogDescription>{t("whatsappJourney.subtitle")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 px-6 pb-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="step-delay">
                  {t("whatsappJourney.steps.delay", {
                    days: currentStep.delayDays ?? 1,
                  })}
                </Label>
                <Input
                  id="step-delay"
                  type="number"
                  min={1}
                  value={currentStep.delayDays ?? 1}
                  onChange={(event) =>
                    setCurrentStep((previous) => ({
                      ...previous,
                      delayDays: Math.max(
                        1,
                        parseInteger(event.target.value, previous.delayDays || 1),
                      ),
                    }))
                  }
                  className="h-11 bg-[color:var(--color-card)]/75"
                />
              </div>

              <div className="space-y-3 rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 p-4">
                <div>
                  <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                    {t("whatsappJourney.steps.variables")}
                  </p>
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    {t("whatsappJourney.subtitle")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variableTokens.map((token) => (
                    <Button
                      key={token}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80"
                      onClick={() =>
                        setCurrentStep((previous) => ({
                          ...previous,
                          content: `${previous.content || ""}${token}`,
                        }))
                      }
                    >
                      {token}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="step-content">
                  {t("whatsappJourney.steps.content")}
                </Label>
                <Textarea
                  id="step-content"
                  value={currentStep.content ?? ""}
                  onChange={(event) =>
                    setCurrentStep((previous) => ({
                      ...previous,
                      content: event.target.value,
                    }))
                  }
                  placeholder="Hi {firstName}, how was your order #{orderNumber}?"
                  className="min-h-[14rem] bg-[color:var(--color-card)]/75"
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                  {t("whatsappJourney.steps.preview")}
                </p>
                <MessagePreview content={currentStep.content || ""} />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6">
            <Button
              variant="outline"
              className={outlineActionClassName}
              onClick={() => setStepDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              className={primaryActionClassName}
              disabled={!currentStep.content?.trim() || submitting}
              onClick={() => void handleSaveStep()}
            >
              {submitting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent
          size="sm"
          className="rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)]"
        >
          <AlertDialogHeader>
            <AlertDialogMedia className="rounded-2xl bg-rose-500/10 text-rose-700 dark:text-rose-200">
              <Trash2 className="size-5" />
            </AlertDialogMedia>
            <AlertDialogTitle>{flowDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{flowDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rounded-b-3xl border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-[color:color-mix(in_srgb,var(--color-background)_86%,var(--shell-control-bg)_14%)]">
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteLoading}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteLoading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CopilotDrawer
        open={copilot.open}
        onClose={() => copilot.setOpen(false)}
        flowId={selectedFlow?.id}
        flowName={selectedFlow?.name}
        onApplySuggestion={(s) => {
          // Suggestion payloads are interpreted client-side.
          if (s.kind === "create-step") {
            openCreateStepDialog();
          } else if (s.kind === "edit-step" && s.payload) {
            const target = steps.find(
              (st) => st.id === s.payload?.stepId,
            );
            if (target) openEditStepDialog(target);
          }
        }}
      />
    </WhatsAppPageShell>
  );
};

export default WhatsAppCustomerJourney;
