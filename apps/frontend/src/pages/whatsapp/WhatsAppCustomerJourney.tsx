import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Edit,
  GitBranch,
  MessageSquare,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../hooks/useAuthSimple";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
  WhatsAppMetricCard,
} from "./components/WhatsAppPageShell";
import { FlowCanvas, type FlowStep } from "./components/journey/FlowCanvas";
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

    return {
      activeCount,
      completedCount,
      totalJourneys,
      completionRate,
      totalSent,
      needsAttention,
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WhatsAppMetricCard
          label={t("whatsappJourney.stats.activeJourneys") as string}
          value={String(stats.activeCount)}
          hint={`${stats.activeCount} / ${stats.totalJourneys}`}
          icon={Users}
          tone="success"
        />
        <WhatsAppMetricCard
          label={t("whatsappJourney.stats.totalSent") as string}
          value={String(stats.totalSent)}
          hint={t("whatsappJourney.steps.send") as string}
          icon={Send}
          tone="info"
        />
        <WhatsAppMetricCard
          label={t("whatsappJourney.stats.completionRate") as string}
          value={`${stats.completionRate}%`}
          hint={`${stats.completedCount} / ${stats.totalJourneys}`}
          icon={TrendingUp}
          tone="primary"
        />
        <WhatsAppMetricCard
          label={t("whatsappJourney.monitoring.deliveryHealth") as string}
          value={
            stats.needsAttention
              ? (t("whatsappJourney.monitoring.needsAttention") as string)
              : (t("whatsappJourney.monitoring.good") as string)
          }
          hint={t("whatsappJourney.monitoring.liveMonitor") as string}
          icon={Zap}
          tone={stats.needsAttention ? "danger" : "success"}
        />
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
                          "group flex w-full flex-col gap-2.5 rounded-2xl border p-3.5 text-start transition-all",
                          selected
                            ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] shadow-sm"
                            : "border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:border-[color:color-mix(in_srgb,var(--color-primary)_40%,var(--shell-control-border))] hover:bg-[color:var(--color-muted)]",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span
                              className={cn(
                                "mt-0.5 size-2.5 shrink-0 rounded-full",
                                flow.isEnabled
                                  ? "bg-[color:var(--business-success)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--business-success)_20%,transparent)]"
                                  : "bg-[color:var(--color-muted-foreground)] opacity-50",
                              )}
                            />
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

                        <div className="flex items-center justify-between gap-2 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_50%,transparent)] pt-2.5">
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

          {/* Monitoring board */}
          <WhatsAppSurfaceCard
            title={t("whatsappJourney.tabs.monitoring") as string}
            description={t("whatsappJourney.monitoring.liveMonitor") as string}
          >
            {journeys.length > 0 ? (
              <div className="space-y-2">
                {journeys.slice(0, 8).map((journey) => {
                  const statusKey = journey.status.toUpperCase();
                  const totalSteps = journey.flow.steps?.length || 0;
                  const initials = `${journey.customer.firstName[0] || ""}${journey.customer.lastName[0] || ""}`.toUpperCase();

                  return (
                    <button
                      key={journey.id}
                      type="button"
                      onClick={() => setSelectedJourney(journey)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-3 text-start transition-colors hover:bg-[color:var(--color-muted)]"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--color-card))] text-xs font-semibold text-[color:var(--color-primary)]">
                        {initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                          {journey.customer.firstName} {journey.customer.lastName}
                        </p>
                        <p className="truncate text-xs text-[color:var(--color-muted-foreground)]">
                          {journey.flow.name}
                        </p>
                      </div>

                      {/* Progress dots */}
                      {totalSteps > 0 && (
                        <div className="flex shrink-0 items-center gap-1">
                          {Array.from({ length: Math.min(totalSteps, 5) }).map(
                            (_, dotIndex) => (
                              <span
                                key={dotIndex}
                                className={cn(
                                  "size-1.5 rounded-full",
                                  dotIndex < journey.currentStep
                                    ? "bg-[color:var(--business-success)]"
                                    : "bg-[color:color-mix(in_srgb,var(--color-muted-foreground)_30%,transparent)]",
                                )}
                              />
                            ),
                          )}
                          <span className="ms-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)]">
                            {journey.currentStep}/{totalSteps}
                          </span>
                        </div>
                      )}

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
                    </button>
                  );
                })}
                {journeys.length > 8 && (
                  <p className="pt-1 text-center text-xs text-[color:var(--color-muted-foreground)]">
                    {journeys.length - 8}+
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Users className="size-8 text-[color:var(--color-muted-foreground)] opacity-40" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {t("common.no_data")}
                </p>
              </div>
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
            <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-muted)_40%,var(--color-background))] p-4">
              {steps.length > 0 || isAdmin ? (
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
              ) : (
                <FlowCanvas
                  steps={steps}
                  isAdmin={isAdmin}
                  onOpenCopilot={() => copilot.setOpen(true)}
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
    </WhatsAppPageShell>
  );
};

export default WhatsAppCustomerJourney;
