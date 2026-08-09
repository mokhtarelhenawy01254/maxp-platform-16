import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  Clock,
  Edit,
  Eye,
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
import {
  WhatsAppMetricCard,
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

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

const flowStatusClasses = {
  enabled:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  disabled:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
} as const;

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
  "rounded-full bg-[color:var(--business-success)] px-4 text-white hover:brightness-90";

const outlineActionClassName =
  "rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/75 hover:bg-[color:var(--color-card)]";

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
    <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/45 px-6 py-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-3xl bg-primary/10 text-[color:var(--color-primary)]">
        <Icon className="size-8" />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold text-[color:var(--color-foreground)]">
          {title}
        </p>
        <p className="mx-auto max-w-xl text-sm leading-6 text-[color:var(--color-muted-foreground)]">
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
  const navigate = useNavigate();
  const isRtl = i18n.dir() === "rtl";
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";

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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-14 rounded-full" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.6fr)]">
          <div className="space-y-4">
            <Skeleton className="h-[28rem] rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
          <Skeleton className="h-[38rem] rounded-3xl" />
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
          <Button className={primaryActionClassName} onClick={openCreateFlowDialog}>
            <Plus className="size-4" />
            {t("whatsappJourney.flows.addNew")}
          </Button>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WhatsAppMetricCard
          label={t("whatsappJourney.stats.activeJourneys")}
          value={stats.activeCount}
          icon={Users}
          tone="primary"
        />
        <WhatsAppMetricCard
          label={t("whatsappJourney.stats.totalSent")}
          value={stats.totalSent}
          icon={Send}
          tone="success"
        />
        <WhatsAppMetricCard
          label={t("whatsappJourney.stats.completionRate")}
          value={`${stats.completionRate}%`}
          icon={TrendingUp}
          tone="info"
        />
        <WhatsAppMetricCard
          label={t("whatsappJourney.stats.deliveryStatus")}
          value={stats.healthLabel}
          icon={Zap}
          tone={stats.healthTone as "success" | "danger"}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabId)}
        className="space-y-4"
      >
        <TabsList className="h-auto rounded-full border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 p-1">
          <TabsTrigger className="rounded-full px-4 py-2" value="flows">
            <Layout className="size-4" />
            {t("whatsappJourney.tabs.flows")}
          </TabsTrigger>
          <TabsTrigger className="rounded-full px-4 py-2" value="monitoring">
            <BarChart3 className="size-4" />
            {t("whatsappJourney.tabs.monitoring")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.6fr)]">
            <div className="space-y-4">
              <WhatsAppSurfaceCard
                title={t("whatsappJourney.tabs.flows") as string}
                description={t("whatsappJourney.flows.emptyDesc") as string}
              >
                <div className="space-y-4">
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
                        "h-11 rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/75",
                        isRtl ? "pr-10" : "pl-10",
                      )}
                    />
                  </div>

                  {filteredFlows.length > 0 ? (
                    <div className="space-y-3">
                      {filteredFlows.map((flow) => {
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
                              "rounded-3xl border px-4 py-4 shadow-sm transition-all",
                              "cursor-pointer bg-[color:var(--color-card)]/70 hover:-translate-y-0.5 hover:bg-[color:var(--color-card)]",
                              selected
                                ? "border-[color:var(--business-success)] bg-[color:color-mix(in_srgb,var(--business-success)_8%,white)] shadow-md"
                                : "border-[color:var(--shell-control-border)]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-base font-semibold text-[color:var(--color-foreground)]">
                                    {flow.name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      flow.isEnabled
                                        ? flowStatusClasses.enabled
                                        : flowStatusClasses.disabled,
                                    )}
                                  >
                                    {flow.isEnabled
                                      ? t("whatsappJourney.flows.enabled")
                                      : t("whatsappJourney.flows.disabled")}
                                  </Badge>
                                  {flow._count?.categories && flow._count.categories > 0 ? (
                                    <Badge variant="outline" className="rounded-full border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200">
                                      <Sparkles className="size-3" />
                                      تصنيف
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                                  {t("whatsappJourney.flows.activeCustomers", {
                                    count: flow._count?.journeys || 0,
                                  })}
                                </p>
                              </div>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-full"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditFlowDialog(flow);
                                  }}
                                >
                                  <Edit className="size-4" />
                                  <span className="sr-only">{t("common.edit")}</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-full text-[color:var(--color-destructive)] hover:text-[color:var(--color-destructive)]"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeleteTarget({ type: "flow", id: flow.id });
                                  }}
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">{t("common.delete")}</span>
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] pt-3">
                              <div className="flex items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
                                <MessageSquare className="size-4" />
                                <span>{flow._count?.steps || 0}</span>
                              </div>
                              <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                                {formatDate(flow.createdAt)}
                              </div>
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
                        flows.length === 0 ? (
                          <Button
                            className={primaryActionClassName}
                            onClick={openCreateFlowDialog}
                          >
                            <Plus className="size-4" />
                            {t("whatsappJourney.flows.addNew")}
                          </Button>
                        ) : undefined
                      }
                    />
                  )}
                </div>
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard
                className="border-transparent bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-foreground)_88%,transparent)_0%,color-mix(in_srgb,var(--color-foreground)_96%,transparent)_100%)] text-white shadow-[0_26px_60px_rgba(15,27,45,0.18)]"
                contentClassName="px-5 py-5 sm:px-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[color:var(--color-card)]/10 text-[color:var(--business-warning)]">
                      <Zap className="size-5" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">
                        {t("whatsappJourney.hints.title")}
                      </p>
                      <p className="text-sm text-white/70">
                        {t("whatsappJourney.subtitle")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-xl border border-white/10 bg-[color:var(--color-card)]/6 px-4 py-3"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-card)]/10 text-xs font-semibold text-white">
                          {index}
                        </div>
                        <p className="text-sm leading-6 text-white/82">
                          {t(`whatsappJourney.hints.tip${index}`)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </WhatsAppSurfaceCard>
            </div>

            <WhatsAppSurfaceCard
              title={(selectedFlow?.name || t("whatsappJourney.steps.title")) as string}
              description={
                (selectedFlow
                  ? t("whatsappJourney.subtitle")
                  : t("whatsappJourney.flows.emptyDesc")) as string
              }
              action={
                selectedFlow ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className={outlineActionClassName}
                      disabled={stepsLoading}
                      onClick={() => void fetchSteps(selectedFlow.id)}
                    >
                      <RefreshCw
                        className={cn("size-4", stepsLoading && "animate-spin")}
                      />
                      {t("common.refresh")}
                    </Button>
                    <Button
                      className={primaryActionClassName}
                      onClick={openCreateStepDialog}
                    >
                      <Plus className="size-4" />
                      {t("whatsappJourney.steps.add")}
                    </Button>
                  </div>
                ) : undefined
              }
              className="min-h-[40rem]"
            >
              {!selectedFlow ? (
                <EmptyState
                  icon={Sparkles}
                  title={t("whatsappJourney.flows.empty")}
                  description={t("whatsappJourney.flows.emptyDesc")}
                  action={
                    <Button
                      className={primaryActionClassName}
                      onClick={openCreateFlowDialog}
                    >
                      <Plus className="size-4" />
                      {t("whatsappJourney.flows.addNew")}
                    </Button>
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
              ) : steps.length > 0 ? (
                <div
                  className={cn(
                    "relative space-y-5",
                    isRtl ? "pr-14" : "pl-14",
                  )}
                >
                  <div
                    className={cn(
                      "absolute bottom-2 top-2 w-px bg-[linear-gradient(180deg,color-mix(in_srgb,var(--business-success)_55%,transparent),color-mix(in_srgb,var(--color-secondary)_38%,transparent))]",
                      isRtl ? "right-5" : "left-5",
                    )}
                  />
                  {steps.map((step, index) => (
                    <div key={step.id || `${step.stepOrder}-${index}`} className="relative">
                      <div
                        className={cn(
                          "absolute top-4 flex size-10 items-center justify-center rounded-full border border-[color:var(--business-success)] bg-[var(--app-panel-bg)] text-sm font-semibold text-[color:var(--business-success)] shadow-sm",
                          isRtl ? "-right-14" : "-left-14",
                        )}
                      >
                        {index + 1}
                      </div>

                      <div className="rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/72 p-5 shadow-md">
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.85fr)]">
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className="rounded-full border-emerald-300/70 bg-emerald-500/10 px-3 py-1 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200"
                              >
                                <Clock className="size-3.5" />
                                {t("whatsappJourney.steps.delay", {
                                  days: step.delayDays,
                                })}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 px-3 py-1 text-[color:var(--color-muted-foreground)]"
                              >
                                {t("whatsappJourney.steps.title")}
                              </Badge>
                            </div>

                            <p className="whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-foreground)]">
                              {step.content}
                            </p>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                className={outlineActionClassName}
                                onClick={() => openEditStepDialog(step)}
                              >
                                <Edit className="size-4" />
                                {t("common.edit")}
                              </Button>
                              <Button
                                variant="outline"
                                className="rounded-full border-rose-300/70 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200"
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "step",
                                    id: step.id || "",
                                  })
                                }
                              >
                                <Trash2 className="size-4" />
                                {t("common.delete")}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                              <MessageSquare className="size-3.5" />
                              {t("whatsappJourney.steps.preview")}
                            </div>
                            <MessagePreview content={step.content} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title={t("whatsappJourney.steps.title")}
                  description={t("whatsappJourney.steps.add")}
                  action={
                    <Button
                      className={primaryActionClassName}
                      onClick={openCreateStepDialog}
                    >
                      <Plus className="size-4" />
                      {t("whatsappJourney.steps.add")}
                    </Button>
                  }
                />
              )}
            </WhatsAppSurfaceCard>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <WhatsAppSurfaceCard
            title={t("whatsappJourney.tabs.monitoring") as string}
            description={t("whatsappJourney.subtitle") as string}
            action={
              <Button
                variant="outline"
                className={outlineActionClassName}
                disabled={refreshing}
                onClick={() => void handleRefreshWorkspace()}
              >
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                {t("common.refresh")}
              </Button>
            }
          >
            {journeys.length > 0 ? (
              <div className="overflow-hidden rounded-3xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70">
                <Table>
                  <TableHeader className="bg-[color:var(--color-muted)]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("whatsappJourney.monitoring.customer")}</TableHead>
                      <TableHead>
                        {t("whatsappJourney.monitoring.currentStep")}
                      </TableHead>
                      <TableHead>
                        {t("whatsappJourney.monitoring.nextMessage")}
                      </TableHead>
                      <TableHead>{t("whatsappJourney.monitoring.status")}</TableHead>
                      <TableHead className="text-right">
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
                          className="border-[color:color-mix(in_srgb,var(--shell-control-border)_72%,transparent)] bg-transparent hover:bg-[color:color-mix(in_srgb,var(--color-primary)_4%,white)]"
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-semibold text-[color:var(--color-primary)]">
                                {initials}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                                  {journey.customer.firstName} {journey.customer.lastName}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--color-muted-foreground)]">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70"
                                  >
                                    <Package className="size-3.5" />
                                    #{journey.order.orderNumber}
                                  </Badge>
                                  <span>{journey.customer.phone}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                                {t("whatsappJourney.monitoring.step", {
                                  current: journey.currentStep + 1,
                                  total: journey.flow.steps?.length || "?",
                                })}
                              </p>
                              <p className="text-xs text-[color:var(--color-muted-foreground)]">
                                {journey.flow.name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {statusKey === "ACTIVE" ? (
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                                  {formatDate(journey.nextSendAt)}
                                </p>
                                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                                  {formatTime(journey.nextSendAt)}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-[color:var(--color-muted-foreground)]">
                                -
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full",
                                  journeyStatusClasses[statusKey] ||
                                  journeyStatusClasses['CANCELLED'],
                              )}
                            >
                              {t(
                                `whatsappJourney.monitoring.${getJourneyStatusKey(statusKey)}`,
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {journey.whatsappContactId && (
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="rounded-full text-sky-600 hover:text-sky-700"
                                  onClick={() => navigate('/whatsapp')}
                                  title="فتح المحادثة"
                                >
                                  <MessageSquare className="size-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="rounded-full"
                                onClick={() => setSelectedJourney(journey)}
                              >
                                <Eye className="size-4" />
                                <span className="sr-only">{t("common.actions")}</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70">
                <AlertCircle className="size-4 text-[color:var(--color-warning)]" />
                <AlertTitle>{t("whatsappJourney.tabs.monitoring")}</AlertTitle>
                <AlertDescription>{t("common.no_data")}</AlertDescription>
              </Alert>
            )}
          </WhatsAppSurfaceCard>
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
    </WhatsAppPageShell>
  );
};

export default WhatsAppCustomerJourney;
