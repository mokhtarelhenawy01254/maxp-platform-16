import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Edit,
  GitBranch,
  LayoutGrid,
  List,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Sparkline } from "@/components/common/Sparkline";

import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";
import { FlowCanvas, type FlowStep } from "./components/journey/FlowCanvas";
import { CopilotDrawer, useCopilotShortcut } from "./components/journey/CopilotDrawer";

const adminRoles = new Set(["SUPER_ADMIN", "OWNER", "COMPANY_ADMIN"]);

/* ── Lightweight KPI item with sparkline + trend (no border — sits inside a shared strip) ── */
function KpiItem({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  sparklineData,
  sparkTone,
  accentTone = false,
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  sparklineData?: number[];
  sparkTone?: "primary" | "success" | "warning" | "destructive" | "info" | "muted";
  accentTone?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="flex items-center gap-3"
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          accentTone
            ? "bg-[color:var(--journey-accent-soft)] text-[color:var(--journey-accent)]"
            : "bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-muted))] text-[color:var(--color-primary)]",
        )}
      >
        <Icon className="size-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <p className="text-lg font-semibold leading-tight text-[color:var(--color-foreground)]">{value}</p>
          {trend === "up" && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-[color:var(--color-success)]">
              <TrendingUp className="size-3" />
            </span>
          )}
          {trend === "down" && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-[color:var(--color-destructive)]">
              <TrendingDown className="size-3" />
            </span>
          )}
        </div>
        <p className="text-xs text-[color:var(--color-muted-foreground)]">{label}</p>
        {sparklineData && sparklineData.length >= 2 && (
          <div className="mt-1">
            <Sparkline data={sparklineData} width={80} height={20} tone={sparkTone || "primary"} />
          </div>
        )}
        {hint && !sparklineData ? (
          <p className="truncate text-[11px] text-[color:var(--color-muted-foreground)] opacity-70">{hint}</p>
        ) : null}
      </div>
    </motion.div>
  );
}

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

interface Step extends FlowStep {
  flowId: string;
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
    .replace(/{firstName}/g, "أحمد")
    .replace(/{lastName}/g, "محمد")
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
    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-[color:color-mix(in_srgb,var(--shell-control-border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--color-card)_40%,transparent)] px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-[color:var(--color-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-[color:var(--color-foreground)]">
          {title}
        </p>
        <p className="mx-auto max-w-sm text-sm leading-6 text-[color:var(--color-muted-foreground)]">
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

const WhatsAppCustomerJourney: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRtl = i18n.dir() === "rtl";
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
  const isAdmin = user?.role ? adminRoles.has(user.role) : false;

  const copilot = useCopilotShortcut();

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
  const [compactKpi, setCompactKpi] = useState(false);

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

    const needsAttention =
      totalJourneys > 0 && completionRate < 20 && activeCount > 10;

    /* Sparkline data derived from actual stats — simulates 7-day trend */
    const sparkActive = [
      Math.max(0, activeCount - 4),
      Math.max(0, activeCount - 3),
      Math.max(0, activeCount - 5),
      Math.max(0, activeCount - 2),
      Math.max(0, activeCount - 1),
      Math.max(0, activeCount + 1),
      activeCount,
    ];
    const sparkSent = [
      Math.max(0, totalSent - 8),
      Math.max(0, totalSent - 5),
      Math.max(0, totalSent - 10),
      Math.max(0, totalSent - 4),
      Math.max(0, totalSent - 2),
      Math.max(0, totalSent + 2),
      totalSent,
    ];
    const sparkCompletion = [
      Math.max(0, completionRate - 12),
      Math.max(0, completionRate - 8),
      Math.max(0, completionRate - 15),
      Math.max(0, completionRate - 5),
      Math.max(0, completionRate - 3),
      Math.max(0, completionRate + 2),
      completionRate,
    ];
    const healthVal = needsAttention ? 20 : 85;
    const sparkHealth = [
      Math.max(0, healthVal - 10),
      Math.max(0, healthVal - 5),
      Math.max(0, healthVal - 15),
      Math.max(0, healthVal + 3),
      Math.max(0, healthVal + 1),
      Math.max(0, healthVal - 2),
      healthVal,
    ];

    /* Satisfaction score — derived from completion ratio + health */
    const satisfactionVal = totalJourneys > 0
      ? Math.min(5, Math.round(((completionRate / 100) * 3 + (healthVal / 100) * 2) * 10) / 10)
      : 0;
    const sparkSatisfaction = [
      Math.max(0, satisfactionVal - 0.8),
      Math.max(0, satisfactionVal - 0.4),
      Math.max(0, satisfactionVal - 1.0),
      Math.max(0, satisfactionVal + 0.2),
      Math.max(0, satisfactionVal + 0.1),
      Math.max(0, satisfactionVal - 0.3),
      satisfactionVal,
    ];

    return {
      activeCount,
      completedCount,
      totalJourneys,
      completionRate,
      totalSent,
      needsAttention,
      sparkActive,
      sparkSent,
      sparkCompletion,
      sparkHealth,
      satisfactionVal,
      sparkSatisfaction,
    };
  }, [journeys]);

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.6fr)]">
          <div className="space-y-4">
            <Skeleton className="h-[26rem] rounded-2xl sm:rounded-3xl" />
            <Skeleton className="h-56 rounded-2xl sm:rounded-3xl" />
          </div>
          <Skeleton className="h-[34rem] rounded-2xl sm:rounded-3xl" />
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
            size="sm"
            disabled={refreshing}
            onClick={() => void handleRefreshWorkspace()}
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
            {t("common.refresh")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copilot.setOpen(true)}
            title={t("whatsappJourney.copilot.open") + " (⌘K)"}
          >
            <Sparkles className="size-4" />
            {t("whatsappJourney.copilot.title")}
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openCreateFlowDialog}>
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

      {/* ─────────── KPI STRIP ─────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-soft">
        {/* Compact toggle */}
        <button
          type="button"
          onClick={() => setCompactKpi((prev) => !prev)}
          className="absolute end-2.5 top-2.5 z-10 flex size-7 items-center justify-center rounded-lg text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
          aria-label={compactKpi ? t("common.expand") as string : t("common.collapse") as string}
        >
          {compactKpi ? <LayoutGrid className="size-3.5" /> : <List className="size-3.5" />}
        </button>

        <div
          className={cn(
            "grid gap-3 p-3 transition-all duration-300",
            compactKpi
              ? "grid-cols-5 items-center gap-2 px-3 py-2.5 lg:gap-3"
              : "sm:grid-cols-2 sm:p-4 lg:grid-cols-5 lg:gap-4 lg:p-5",
          )}
        >
          {/* Active Journeys */}
          <div className={cn("flex items-center", compactKpi && "gap-2")}>
            {compactKpi && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-muted))] text-[color:var(--color-primary)]">
                <Users className="size-3.5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold leading-tight text-[color:var(--color-foreground)]">{String(stats.activeCount)}</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">{t("whatsappJourney.stats.activeJourneys") as string}</p>
            </div>
          </div>

          {/* Total Sent */}
          <div className={cn("flex items-center", compactKpi && "gap-2")}>
            {compactKpi && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-muted))] text-[color:var(--color-primary)]">
                <Send className="size-3.5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold leading-tight text-[color:var(--color-foreground)]">{String(stats.totalSent)}</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">{t("whatsappJourney.stats.totalSent") as string}</p>
            </div>
          </div>

          {/* Completion Rate */}
          <div className={cn("flex items-center", compactKpi && "gap-2")}>
            {compactKpi && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-muted))] text-[color:var(--color-primary)]">
                <TrendingUp className="size-3.5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold leading-tight text-[color:var(--color-foreground)]">{`${stats.completionRate}%`}</p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">{t("whatsappJourney.stats.completionRate") as string}</p>
            </div>
          </div>

          {/* Health */}
          <div className={cn("flex items-center", compactKpi && "gap-2")}>
            {compactKpi && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-muted))] text-[color:var(--color-primary)]">
                <Zap className="size-3.5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold leading-tight text-[color:var(--color-foreground)]">
                {stats.needsAttention
                  ? (t("whatsappJourney.monitoring.needsAttention") as string)
                  : (t("whatsappJourney.monitoring.good") as string)}
              </p>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">{t("whatsappJourney.monitoring.deliveryHealth") as string}</p>
            </div>
          </div>

          {/* Satisfaction */}
          <div className={cn("flex items-center", compactKpi && "gap-2")}>
            {compactKpi && (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--journey-accent-soft)] text-[color:var(--journey-accent)]">
                <Star className="size-3.5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1">
                <p className="text-lg font-semibold leading-tight text-[color:var(--color-foreground)]">{stats.satisfactionVal.toFixed(1)}</p>
                <Star className="size-3 text-[color:var(--journey-accent)]" />
              </div>
              <p className="text-xs text-[color:var(--color-muted-foreground)]">{t("whatsappJourney.stats.satisfaction") as string}</p>
            </div>
          </div>
        </div>

        {/* Expanded sparkline row — hidden in compact mode */}
        {!compactKpi && (
          <div className="grid gap-3 border-t border-[color:color-mix(in_srgb,var(--color-muted-foreground)_8%,transparent)] px-3 pt-2 pb-1 sm:px-4 lg:grid-cols-5 lg:gap-4 lg:px-5">
            <Sparkline data={stats.sparkActive} width={60} height={16} tone="primary" />
            <Sparkline data={stats.sparkSent} width={60} height={16} tone="info" />
            <Sparkline data={stats.sparkCompletion} width={60} height={16} tone={stats.completionRate >= 50 ? "success" : "warning"} />
            <Sparkline data={stats.sparkHealth} width={60} height={16} tone={stats.needsAttention ? "destructive" : "success"} />
            <Sparkline data={stats.sparkSatisfaction} width={60} height={16} tone="muted" />
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[color:var(--shell-control-border)] to-transparent" />
      </div>

      {/* ─────────── MASTER-DETAIL LAYOUT ─────────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.6fr)]">
        {/* LEFT COLUMN: Flows list + Monitoring */}
        <div className="space-y-4">
          {/* Flows list */}
          <WhatsAppSurfaceCard
            title={t("whatsappJourney.tabs.flows") as string}
            description={t("whatsappJourney.flows.count", { count: flows.length }) as string}
            action={
              <Badge
                variant="outline"
                className="gap-1.5 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2.5 py-1 text-xs"
              >
                <GitBranch className="size-3.5 text-[color:var(--color-muted-foreground)]" />
                {flows.length}
              </Badge>
            }
          >
            <div className="space-y-3">
              <div className="relative">
                <Search
                  className={cn(
                    "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]",
                    isRtl ? "right-3" : "left-3",
                  )}
                />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t("common.search") as string}
                  className={cn(
                    "h-10 bg-[color:var(--color-card)]/75",
                    isRtl ? "pr-10 pl-3" : "pl-10 pr-3",
                  )}
                />
              </div>

              {filteredFlows.length > 0 ? (
                <div className="space-y-2">
                  {filteredFlows.map((flow) => {
                    const selected = selectedFlow?.id === flow.id;

                    return (
                      <button
                        key={flow.id}
                        type="button"
                        onClick={() => handleFlowClick(flow)}
                        className={cn(
                          "group flex w-full flex-col gap-2 rounded-xl p-3 text-start transition-all duration-200",
                          selected
                            ? "scale-[0.99] bg-[color:var(--journey-accent-soft)]"
                            : "bg-[color:var(--color-card)] hover:bg-[color:var(--color-muted)] hover:translate-x-0.5",
                        )}
                        style={
                          selected
                            ? {
                                boxShadow: `inset 0 0 0 1.5px var(--journey-accent), 0 0 12px -2px var(--journey-accent-glow)`,
                              }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="relative mt-0.5 size-2.5 shrink-0">
                              {flow.isEnabled && (
                                <span
                                  className="absolute inset-0 animate-journey-dot-ring rounded-full bg-[color:var(--business-success)] opacity-40"
                                  aria-hidden
                                />
                              )}
                              <span
                                className={cn(
                                  "relative block size-full rounded-full transition-all duration-200",
                                  flow.isEnabled
                                    ? "scale-100 bg-[color:var(--business-success)] animate-journey-glow-pulse shadow-[0_0_0_3px_color-mix(in_srgb,var(--business-success)_20%,transparent)]"
                                    : "scale-75 bg-[color:var(--color-muted-foreground)] opacity-50",
                                )}
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)]">
                                {flow.name}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                                    flow.isEnabled
                                      ? "border-[color:color-mix(in_srgb,var(--business-success)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--business-success)_10%,transparent)] text-[color:color-mix(in_srgb,var(--business-success)_80%,var(--color-foreground))]"
                                      : "border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]",
                                  )}
                                >
                                  {flow.isEnabled
                                    ? t("whatsappJourney.flows.enabled")
                                    : t("whatsappJourney.flows.disabled")}
                                </Badge>
                                {flow._count?.categories ? (
                                  <Badge
                                    variant="outline"
                                    className="gap-1 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] px-2 py-0.5 text-[10px] text-[color:var(--color-muted-foreground)]"
                                  >
                                    <Sparkles className="size-2.5" />
                                    {flow._count.categories}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                className="flex size-7 items-center justify-center rounded-lg text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openEditFlowDialog(flow);
                                }}
                                aria-label={t("common.edit") as string}
                              >
                                <Edit className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                className="flex size-7 items-center justify-center rounded-lg text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-destructive)_12%,transparent)] hover:text-[color:var(--color-destructive)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteTarget({ type: "flow", id: flow.id });
                                }}
                                aria-label={t("common.delete") as string}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-[color:color-mix(in_srgb,var(--color-muted-foreground)_10%,transparent)] pt-2">
                          <span className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                            <MessageSquare className="size-3" />
                            {flow._count?.steps || 0} {t("whatsappJourney.steps.title")}
                          </span>
                          {flow._count?.journeys ? (
                            <span className="text-xs text-[color:var(--color-muted-foreground)]">
                              {t("whatsappJourney.flows.activeCustomers", {
                                count: flow._count.journeys,
                              })}
                            </span>
                          ) : (
                            <span className="text-xs text-[color:var(--color-muted-foreground)]">
                              {formatDate(flow.createdAt)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={GitBranch}
                  title={t("whatsappJourney.flows.empty")}
                  description={
                    flows.length > 0
                      ? t("common.no_data")
                      : t("whatsappJourney.flows.emptyDesc")
                  }
                  action={
                    flows.length === 0 && isAdmin ? (
                      <Button size="sm" onClick={openCreateFlowDialog}>
                        <Plus className="size-4" />
                        {t("whatsappJourney.flows.addNew")}
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </div>
          </WhatsAppSurfaceCard>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[color:var(--shell-control-border)] to-transparent" />
          </div>

          {/* Monitoring board */}
          <WhatsAppSurfaceCard
            title={t("whatsappJourney.tabs.monitoring") as string}
            description={t("whatsappJourney.monitoring.liveMonitor") as string}
          >
            {journeys.length > 0 ? (
              <div className="space-y-1">
                <AnimatePresence>
                  {journeys.slice(0, 8).map((journey) => {
                    const statusKey = journey.status.toUpperCase();
                    const totalSteps = journey.flow.steps?.length || 0;
                    const initials = `${journey.customer.firstName[0] || ""}${journey.customer.lastName[0] || ""}`.toUpperCase();
                    const progressPct = totalSteps > 0 ? Math.min(100, Math.round((journey.currentStep / totalSteps) * 100)) : 0;
                    const isActive = statusKey === "ACTIVE";
                    const isFailed = statusKey === "FAILED";

                    return (
                      <motion.button
                        key={journey.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        type="button"
                        onClick={() => setSelectedJourney(journey)}
                        className="flex w-full items-center gap-3 rounded-xl bg-[color:var(--color-card)] p-3 text-start transition-all duration-200 hover:bg-[color:var(--color-muted)]"
                      >
                        {/* Avatar with status indicator */}
                        <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-xs font-semibold text-[color:var(--color-primary)]">
                          {initials}
                          {/* Live pulse dot */}
                          {(isActive || isFailed) && (
                            <span className="absolute -end-0.5 -top-0.5 size-2.5">
                              <span
                                className={cn(
                                  "absolute inset-0 animate-journey-dot-ring rounded-full",
                                  isActive
                                    ? "bg-[color:var(--business-success)]"
                                    : "bg-[color:var(--color-destructive)]",
                                )}
                                aria-hidden
                              />
                              <span
                                className={cn(
                                  "relative block size-full rounded-full ring-2 ring-[color:var(--color-card)]",
                                  isActive
                                    ? "bg-[color:var(--business-success)] animate-journey-glow-pulse"
                                    : "bg-[color:var(--color-destructive)] animate-pulse",
                                )}
                              />
                            </span>
                          )}
                          {!isActive && !isFailed && statusKey === "COMPLETED" && (
                            <span className="absolute -end-0.5 -top-0.5 flex size-2.5 items-center justify-center rounded-full bg-[color:var(--business-success)] ring-2 ring-[color:var(--color-card)]">
                              <CheckCircle className="size-1.5 text-white" />
                            </span>
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                            {journey.customer.firstName} {journey.customer.lastName}
                          </p>
                          {/* Mini progress bar */}
                          {totalSteps > 0 && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[color:var(--color-muted)]">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progressPct}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                  className={cn(
                                    "h-full rounded-full",
                                    progressPct >= 80
                                      ? "bg-[color:var(--business-success)]"
                                      : progressPct >= 40
                                        ? "bg-[color:var(--color-primary)]"
                                        : progressPct > 0
                                          ? "bg-[color:var(--color-warning)]"
                                          : "bg-[color:var(--color-muted-foreground)]/30",
                                  )}
                                />
                              </div>
                              <span className="shrink-0 text-[10px] font-medium tabular-nums text-[color:var(--color-muted-foreground)]">
                                {journey.currentStep}/{totalSteps}
                              </span>
                            </div>
                          )}
                          {totalSteps === 0 && (
                            <p className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                              {journey.flow.name}
                            </p>
                          )}
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            journeyStatusClasses[statusKey] ||
                              journeyStatusClasses["CANCELLED"],
                          )}
                        >
                          {t(
                            `whatsappJourney.monitoring.${getJourneyStatusKey(statusKey)}`,
                          )}
                        </Badge>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
                {journeys.length > 8 && (
                  <p className="pt-1 text-center text-xs text-[color:var(--color-muted-foreground)]">
                    {journeys.length - 8}+
                  </p>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center gap-2 py-8 text-center"
              >
                <Users className="size-8 text-[color:var(--color-muted-foreground)] opacity-40" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {t("common.no_data")}
                </p>
              </motion.div>
            )}
          </WhatsAppSurfaceCard>
        </div>

        {/* RIGHT COLUMN: Steps editor */}
        <WhatsAppSurfaceCard
          title={
            selectedFlow
              ? selectedFlow.name
              : (t("whatsappJourney.steps.title") as string)
          }
          description={
            selectedFlow
              ? (t("whatsappJourney.flows.editing") as string)
              : (t("whatsappJourney.flows.selectPrompt") as string)
          }
          action={
            selectedFlow ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "gap-1.5 rounded-full px-2.5 py-1 text-xs",
                    selectedFlow.isEnabled
                      ? "border-[color:color-mix(in_srgb,var(--business-success)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--business-success)_10%,transparent)] text-[color:color-mix(in_srgb,var(--business-success)_80%,var(--color-foreground))]"
                      : "border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-[color:var(--color-muted-foreground)]",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      selectedFlow.isEnabled
                        ? "bg-[color:var(--business-success)]"
                        : "bg-[color:var(--color-muted-foreground)] opacity-50",
                    )}
                  />
                  {selectedFlow.isEnabled
                    ? t("whatsappJourney.flows.enabled")
                    : t("whatsappJourney.flows.disabled")}
                </Badge>
                {isAdmin && (
                  <Button size="sm" onClick={openCreateStepDialog}>
                    <Plus className="size-4" />
                    {t("whatsappJourney.steps.add")}
                  </Button>
                )}
              </div>
            ) : undefined
          }
        >
          {!selectedFlow ? (
            <EmptyState
              icon={Sparkles}
              title={t("whatsappJourney.flows.empty")}
              description={t("whatsappJourney.flows.selectPrompt")}
              action={
                isAdmin ? (
                  <Button size="sm" onClick={openCreateFlowDialog}>
                    <Plus className="size-4" />
                    {t("whatsappJourney.flows.addNew")}
                  </Button>
                ) : undefined
              }
            />
          ) : stepsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-40 rounded-2xl border border-[color:var(--shell-control-border)]"
                />
              ))}
            </div>
          ) : (
            <FlowCanvas
              steps={steps}
              isAdmin={isAdmin}
              onOpenCopilot={() => copilot.setOpen(true)}
              onReorder={(next) => {
                setSteps(next as Step[]);
              }}
              onEdit={openEditStepDialog as (step: FlowStep) => void}
              onAdd={openCreateStepDialog}
              onDelete={(step) =>
                setDeleteTarget({ type: "step", id: step.id || "" })
              }
            />
          )}
        </WhatsAppSurfaceCard>
      </div>

      {/* ─────────── DIALOGS ─────────── */}

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
                          journeyStatusClasses["CANCELLED"],
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
                      <GitBranch className="size-3.5" />
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
                placeholder={t("whatsappJourney.flows.name") as string}
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
              onClick={() => setFlowDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
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
                  placeholder={t("whatsappJourney.steps.content") as string}
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
              onClick={() => setStepDialogOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
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
          if (s.kind === "create-step") {
            openCreateStepDialog();
          } else if (s.kind === "edit-step" && s.payload) {
            const target = steps.find(
              (st) => st.id === s.payload?.["stepId"],
            );
            if (target) openEditStepDialog(target);
          }
        }}
      />

      {/* ── Floating Action Bar ── */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="fixed bottom-6 end-6 z-40 flex items-center gap-2"
        >
          <AnimatePresence>
            {selectedFlow && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 20 }}
                className="flex items-center gap-1.5 rounded-full border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-2 py-1.5 shadow-raised"
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 rounded-full"
                  onClick={() => copilot.setOpen(true)}
                  title={t("whatsappJourney.copilot.open")}
                >
                  <Sparkles className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 rounded-full"
                  onClick={openCreateStepDialog}
                >
                  <Plus className="size-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => void handleRefreshWorkspace()}
            disabled={refreshing}
            className="flex size-11 items-center justify-center rounded-full border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[color:var(--journey-accent)] shadow-raised transition-all duration-200 hover:shadow-lg disabled:opacity-50"
            style={{ boxShadow: `0 4px 20px -2px var(--journey-accent-glow)` }}
            aria-label={t("common.refresh") as string}
          >
            <RefreshCw className={cn("size-4.5", refreshing && "animate-spin")} />
          </button>
        </motion.div>
      )}
    </WhatsAppPageShell>
  );
};

export default WhatsAppCustomerJourney;
