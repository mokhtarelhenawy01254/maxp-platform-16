import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
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
    enrollments: number;
  };
}

interface Step {
  id?: string;
  flowId: string;
  delayHours: number;
  content: string;
  mediaUrl?: string;
  stepOrder: number;
}

interface Enrollment {
  id: string;
  status: string;
  currentStep: number;
  nextSendAt: string;
  lastSentAt?: string;
  logs?: string;
  customer: { firstName: string; lastName: string; phone: string };
  whatsAppContact: { phoneNumber: string; name: string | null; pushName: string | null };
  flow: { name: string; steps?: Step[] };
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

const enrollmentStatusClasses: Record<string, string> = {
  ACTIVE:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  COMPLETED:
    "border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200",
  CANCELLED:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
  FAILED:
    "border-rose-300/70 bg-rose-500/10 text-rose-800 dark:border-rose-500/40 dark:text-rose-200",
};

const noticeStyles: Record<NoticeTone, string> = {
  success:
    "border-emerald-300/70 bg-emerald-500/12 text-emerald-950 dark:border-emerald-500/40 dark:text-emerald-100",
  error:
    "border-rose-300/70 bg-rose-500/12 text-rose-950 dark:border-rose-500/40 dark:text-rose-100",
};

const variableTokens = [
  "{firstName}",
  "{lastName}",
  "{customerName}",
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

function replaceVariables(content: string) {
  return content
    .replace(/{firstName}/g, "أحمد")
    .replace(/{lastName}/g, "محمد")
    .replace(/{customerName}/g, "أحمد");
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

const WhatsAppLeadFollowUp: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const locale = i18n.language === "ar" ? "ar-EG" : "en-US";

  const [activeTab, setActiveTab] = useState<TabId>("flows");
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
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
    delayHours: 24,
    content: "",
    stepOrder: 1,
  });

  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  const showNotice = useCallback(
    (message: string, tone: NoticeTone = "success") => {
      setNotice({ message, tone });
    },
    [],
  );

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const fetchSteps = useCallback(
    async (flowId: string) => {
      try {
        setStepsLoading(true);
        const response = await apiClient.get(
          `/whatsapp/lead-followup/flows/${flowId}/steps`,
        );
        setSteps(response.data.data ?? []);
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
      const response = await apiClient.get("/whatsapp/lead-followup/flows");
      const nextFlows = response.data.data ?? [];
      setFlows(nextFlows);

      const nextSelected =
        nextFlows.find((flow: Flow) => flow.id === selectedFlow?.id) ??
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
  }, [fetchSteps, selectedFlow?.id, showNotice, t]);

  const fetchEnrollments = useCallback(async () => {
    try {
      const response = await apiClient.get("/whatsapp/lead-followup/enrollments");
      setEnrollments(response.data.data ?? []);
    } catch (error) {
      setEnrollments([]);
      if (!isNotFoundError(error)) {
        showNotice(t("common.error"), "error");
      }
    }
  }, [showNotice, t]);

  useEffect(() => {
    let isMounted = true;

    const initial = async () => {
      setLoading(true);
      await fetchFlows();
      if (isMounted) setLoading(false);
    };

    void initial();
    return () => { isMounted = false; };
  }, [fetchFlows]);

  useEffect(() => {
    if (activeTab === "monitoring") {
      void fetchEnrollments();
    }
  }, [activeTab, fetchEnrollments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === "flows") {
      await fetchFlows();
    } else {
      await fetchEnrollments();
    }
    setRefreshing(false);
  }, [activeTab, fetchFlows, fetchEnrollments]);

  const handleCreateFlow = useCallback(async () => {
    if (!currentFlow.name?.trim()) return;
    try {
      setSubmitting(true);
      await apiClient.post("/whatsapp/lead-followup/flows", {
        name: currentFlow.name.trim(),
      });
      setFlowDialogOpen(false);
      setCurrentFlow({ name: "", isEnabled: true });
      await fetchFlows();
      showNotice(t("whatsappLeadFollowup.actions.saveSuccess"));
    } catch (error) {
      showNotice(t("whatsappLeadFollowup.actions.saveError"), "error");
    } finally {
      setSubmitting(false);
    }
  }, [currentFlow.name, fetchFlows, showNotice, t]);

  const handleToggleFlow = useCallback(
    async (flow: Flow) => {
      try {
        await apiClient.put(`/whatsapp/lead-followup/flows/${flow.id}`, {
          isEnabled: !flow.isEnabled,
        });
        await fetchFlows();
      } catch {
        showNotice(t("whatsappLeadFollowup.actions.saveError"), "error");
      }
    },
    [fetchFlows, showNotice, t],
  );

  const handleSaveStep = useCallback(async () => {
    if (!selectedFlow || !currentStep.content?.trim()) return;
    try {
      setSubmitting(true);
      await apiClient.post(`/whatsapp/lead-followup/flows/${selectedFlow.id}/steps`, {
        id: currentStep.id,
        delayHours: currentStep.delayHours ?? 24,
        content: currentStep.content.trim(),
        mediaUrl: currentStep.mediaUrl,
        stepOrder: currentStep.stepOrder ?? 1,
      });
      setStepDialogOpen(false);
      setCurrentStep({ delayHours: 24, content: "", stepOrder: 1 });
      await fetchSteps(selectedFlow.id);
      showNotice(t("whatsappLeadFollowup.actions.saveSuccess"));
    } catch {
      showNotice(t("whatsappLeadFollowup.actions.saveError"), "error");
    } finally {
      setSubmitting(false);
    }
  }, [selectedFlow, currentStep, fetchSteps, showNotice, t]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      if (deleteTarget.type === "flow") {
        await apiClient.delete(`/whatsapp/lead-followup/flows/${deleteTarget.id}`);
        setSelectedFlow(null);
        setSteps([]);
        await fetchFlows();
      } else {
        await apiClient.delete(`/whatsapp/lead-followup/steps/${deleteTarget.id}`);
        if (selectedFlow) await fetchSteps(selectedFlow.id);
      }
      showNotice(t("whatsappLeadFollowup.actions.deleteSuccess"));
    } catch {
      showNotice(t("whatsappLeadFollowup.actions.deleteError"), "error");
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, fetchFlows, fetchSteps, selectedFlow, showNotice, t]);

  const handleEditStep = useCallback(
    (step: Step) => {
      setCurrentStep({
        id: step.id,
        flowId: step.flowId,
        delayHours: step.delayHours,
        content: step.content,
        mediaUrl: step.mediaUrl,
        stepOrder: step.stepOrder,
      });
      setStepDialogOpen(true);
    },
    [],
  );

  const flowsContent = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-20 rounded-3xl bg-[color:var(--shell-control-bg)]/30"
            />
          ))}
        </div>
      );
    }

    if (flows.length === 0) {
      return (
        <EmptyState
          icon={Sparkles}
          title={t("whatsappLeadFollowup.flows.empty")}
          description={t("whatsappLeadFollowup.flows.emptyDesc")}
          action={
            <Button
              className={primaryActionClassName}
              onClick={() => setFlowDialogOpen(true)}
            >
              <Plus className="size-4" />
              {t("whatsappLeadFollowup.flows.addNew")}
            </Button>
          }
        />
      );
    }

    const filteredFlows = flows.filter(
      (flow) =>
        !searchTerm ||
        flow.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    return (
      <div className="space-y-4">
        {flows.length > 1 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
              <Input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 rounded-xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/70 pl-9 text-sm"
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredFlows.map((flow) => (
            <div
              key={flow.id}
              className={cn(
                "group cursor-pointer overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] shadow-sm transition-all hover:shadow-md sm:rounded-3xl",
                selectedFlow?.id === flow.id &&
                  "ring-2 ring-[color:var(--color-primary)]",
              )}
              onClick={() => {
                setSelectedFlow(flow);
                void fetchSteps(flow.id);
              }}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[color:var(--color-primary)]">
                    <Layout className="size-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-foreground)] sm:text-base">
                      {flow.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
                      <span>
                        {flow._count?.steps ?? 0}{" "}
                        {t("whatsappLeadFollowup.flows.steps")}
                      </span>
                      {flow._count?.enrollments ? (
                        <>
                          <span>·</span>
                          <span>
                            {t("whatsappLeadFollowup.flows.activeLeads", {
                              count: flow._count.enrollments,
                            })}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                      flow.isEnabled
                        ? flowStatusClasses.enabled
                        : flowStatusClasses.disabled,
                    )}
                  >
                    {flow.isEnabled
                      ? t("whatsappLeadFollowup.flows.enabled")
                      : t("whatsappLeadFollowup.flows.disabled")}
                  </Badge>

                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full border-[color:var(--shell-control-border)] opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ type: "flow", id: flow.id });
                    }}
                  >
                    <Trash2 className="size-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }, [
    loading,
    flows,
    searchTerm,
    selectedFlow,
    fetchSteps,
    t,
  ]);

  const stepsContent = useMemo(() => {
    if (!selectedFlow) {
      return (
        <div className="flex min-h-[12rem] items-center justify-center">
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            {t("whatsappLeadFollowup.flows.empty")}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {t("whatsappLeadFollowup.steps.title")}
            </p>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">
              {selectedFlow.name}
            </p>
          </div>
          <Button
            className={primaryActionClassName}
            onClick={() => {
              setCurrentStep({
                delayHours: 24,
                content: "",
                stepOrder: (steps.length || 0) + 1,
              });
              setStepDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t("whatsappLeadFollowup.steps.add")}
          </Button>
        </div>

        {stepsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 rounded-2xl bg-[color:var(--shell-control-bg)]/30"
              />
            ))}
          </div>
        ) : steps.length === 0 ? (
          <div className="flex min-h-[10rem] items-center justify-center rounded-2xl border border-dashed border-[color:var(--shell-control-border)]">
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("whatsappLeadFollowup.flows.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-4 py-3 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                    <span className="text-xs font-bold">{idx + 1}</span>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium text-[color:var(--color-foreground)]">
                      {t("whatsappLeadFollowup.steps.delay", {
                        hours: step.delayHours,
                      })}
                    </p>
                    <p className="line-clamp-1 text-xs text-[color:var(--color-muted-foreground)]">
                      {step.content}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full border-[color:var(--shell-control-border)]"
                    onClick={() => handleEditStep(step)}
                  >
                    <Edit className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full border-[color:var(--shell-control-border)]"
                    onClick={() =>
                      setDeleteTarget({ type: "step", id: step.id! })
                    }
                  >
                    <Trash2 className="size-3.5 text-rose-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [
    selectedFlow,
    steps,
    stepsLoading,
    handleEditStep,
    t,
  ]);

  const monitoringContent = useMemo(() => {
    if (enrollments.length === 0 && !loading) {
      return (
        <EmptyState
          icon={Users}
          title={t("whatsappLeadFollowup.monitoring.notStarted")}
          description={t("whatsappLeadFollowup.flows.emptyDesc")}
        />
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("whatsappLeadFollowup.monitoring.customer")}</TableHead>
            <TableHead>{t("whatsappLeadFollowup.flows.name")}</TableHead>
            <TableHead className="text-center">
              {t("whatsappLeadFollowup.monitoring.currentStep")}
            </TableHead>
            <TableHead>{t("whatsappLeadFollowup.monitoring.nextMessage")}</TableHead>
            <TableHead className="text-center">
              {t("whatsappLeadFollowup.monitoring.status")}
            </TableHead>
            <TableHead className="text-center">
              {t("whatsappLeadFollowup.monitoring.lastSent")}
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => {
            const contactInfo =
              enrollment.whatsAppContact?.name ||
              enrollment.whatsAppContact?.pushName ||
              enrollment.whatsAppContact?.phoneNumber ||
              enrollment.customer.phone;
            const flowSteps = enrollment.flow?.steps ?? [];
            const totalSteps = flowSteps.length;
            return (
              <TableRow key={enrollment.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                      {enrollment.customer.firstName}{" "}
                      {enrollment.customer.lastName}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {contactInfo}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{enrollment.flow.name}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm">
                    {t("whatsappLeadFollowup.monitoring.step", {
                      current: Math.min(enrollment.currentStep + 1, totalSteps),
                      total: totalSteps || "?",
                    })}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-[color:var(--color-muted-foreground)]">
                    {enrollment.nextSendAt
                      ? new Date(enrollment.nextSendAt).toLocaleDateString(
                          locale,
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "—"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                      enrollmentStatusClasses[enrollment.status] ??
                        "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
                    )}
                  >
                    {t(
                      `whatsappLeadFollowup.monitoring.${enrollment.status.toLowerCase()}`,
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-xs text-[color:var(--color-muted-foreground)]">
                    {enrollment.lastSentAt
                      ? new Date(enrollment.lastSentAt).toLocaleDateString(
                          locale,
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full border-[color:var(--shell-control-border)]"
                    onClick={() => setSelectedEnrollment(enrollment)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }, [enrollments, loading, locale, t]);

  const flowDeleteTitle = useMemo(() => {
    if (deleteTarget?.type === "step") {
      return t("whatsappLeadFollowup.dialogs.deleteStepTitle");
    }
    return t("whatsappLeadFollowup.dialogs.deleteFlowTitle");
  }, [deleteTarget, t]);

  const flowDeleteDescription = useMemo(() => {
    if (deleteTarget?.type === "step") {
      return t("whatsappLeadFollowup.dialogs.deleteStepContent");
    }
    return t("whatsappLeadFollowup.dialogs.deleteFlowContent");
  }, [deleteTarget, t]);

  const stats = useMemo(() => {
    const active = enrollments.filter((e) => e.status === "ACTIVE").length;
    const completed = enrollments.filter((e) => e.status === "COMPLETED").length;
    return {
      active,
      totalSent: enrollments.reduce(
        (sum, e) => sum + (e.currentStep > 0 ? 1 : 0),
        0,
      ),
      completionRate:
        enrollments.length > 0
          ? Math.round((completed / enrollments.length) * 100)
          : 0,
      totalEnrollments: enrollments.length,
    };
  }, [enrollments]);

  return (
    <WhatsAppPageShell
      title={t("whatsappLeadFollowup.title")}
      description={t("whatsappLeadFollowup.subtitle")}
      icon={Zap}
      backHref="/whatsapp"
      backLabel="WhatsApp"
      actions={
        <Button
          variant="outline"
          size="sm"
          className={outlineActionClassName}
          disabled={refreshing}
          onClick={() => void handleRefresh()}
        >
          <RefreshCw
            className={cn("size-4", refreshing && "animate-spin")}
          />
          {t("common.refresh")}
        </Button>
      }
    >
      {activeTab === "monitoring" && enrollments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <WhatsAppMetricCard
            label={t("whatsappLeadFollowup.stats.activeEnrollments")}
            value={stats.active}
            icon={Users}
            tone="success"
          />
          <WhatsAppMetricCard
            label={t("whatsappLeadFollowup.stats.totalSent")}
            value={stats.totalSent}
            icon={MessageSquare}
            tone="info"
          />
          <WhatsAppMetricCard
            label={t("whatsappLeadFollowup.stats.completionRate")}
            value={`${stats.completionRate}%`}
            icon={TrendingUp}
            tone="primary"
          />
          <WhatsAppMetricCard
            label={t("whatsappLeadFollowup.stats.totalEnrollments")}
            value={stats.totalEnrollments}
            icon={BarChart3}
            tone="primary"
          />
        </div>
      )}

      {notice && (
        <div
          className={cn(
            floatingNoticeBaseClass,
            noticeStyles[notice.tone],
            "pointer-events-auto flex items-center gap-2 px-4 py-3",
          )}
        >
          {notice.tone === "success" ? (
            <CheckCircle className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <p className="text-sm font-medium">{notice.message}</p>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabId)}
        className="space-y-4 sm:space-y-6"
      >
        <TabsList className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-1">
          <TabsTrigger
            value="flows"
            className="rounded-xl data-[state=active]:bg-[color:var(--color-primary)] data-[state=active]:text-white"
          >
            <Layout className="size-4" />
            {t("whatsappLeadFollowup.tabs.flows")}
          </TabsTrigger>
          <TabsTrigger
            value="monitoring"
            className="rounded-xl data-[state=active]:bg-[color:var(--color-primary)] data-[state=active]:text-white"
          >
            <Users className="size-4" />
            {t("whatsappLeadFollowup.tabs.monitoring")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flows" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">{flowsContent}</div>
            <div className="lg:col-span-2">
              <WhatsAppSurfaceCard>{stepsContent}</WhatsAppSurfaceCard>
            </div>
          </div>

          {flows.length > 0 && (
            <WhatsAppSurfaceCard>
              <div className="space-y-3 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-5 text-amber-500" />
                  <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    {t("whatsappLeadFollowup.hints.title")}
                  </p>
                </div>
                <ul className="space-y-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                  <li>💡 {t("whatsappLeadFollowup.hints.tip1")}</li>
                  <li>💡 {t("whatsappLeadFollowup.hints.tip2")}</li>
                  <li>💡 {t("whatsappLeadFollowup.hints.tip3")}</li>
                </ul>
              </div>
            </WhatsAppSurfaceCard>
          )}
        </TabsContent>

        <TabsContent value="monitoring">
          <WhatsAppSurfaceCard>{monitoringContent}</WhatsAppSurfaceCard>
        </TabsContent>
      </Tabs>

      {/* Flow Dialog */}
      <Dialog
        open={flowDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFlowDialogOpen(false);
            setCurrentFlow({ name: "", isEnabled: true });
          }
        }}
      >
        <DialogContent
          size="sm"
          className="rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)]"
        >
          <DialogHeader>
            <DialogTitle>{t("whatsappLeadFollowup.flows.addNew")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="flow-name">
                {t("whatsappLeadFollowup.flows.name")}
              </Label>
              <Input
                id="flow-name"
                value={currentFlow.name ?? ""}
                onChange={(e) =>
                  setCurrentFlow((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("whatsappLeadFollowup.flows.name")}
                className="rounded-xl border-[color:var(--shell-control-border)]"
                dir={isRtl ? "rtl" : "ltr"}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleCreateFlow();
                }}
              />
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
              onClick={() => void handleCreateFlow()}
            >
              {submitting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Dialog */}
      <Dialog
        open={stepDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setStepDialogOpen(false);
            setCurrentStep({ delayHours: 24, content: "", stepOrder: 1 });
          }
        }}
      >
        <DialogContent
          size="lg"
          className="rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)]"
        >
          <DialogHeader>
            <DialogTitle>
              {currentStep.id
                ? t("whatsappLeadFollowup.steps.edit")
                : t("whatsappLeadFollowup.steps.add")}
            </DialogTitle>
            <DialogDescription>
              {selectedFlow?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6 px-6 lg:grid-cols-5">
            <div className="space-y-5 lg:col-span-3">
              <div className="space-y-2">
                <Label htmlFor="step-delay">
                  {t("whatsappLeadFollowup.steps.delay", {
                    hours: currentStep.delayHours ?? 24,
                  })}
                </Label>
                <Input
                  id="step-delay"
                  type="number"
                  min={1}
                  value={currentStep.delayHours ?? 24}
                  onChange={(e) =>
                    setCurrentStep((prev) => ({
                      ...prev,
                      delayHours: Number.parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="rounded-xl border-[color:var(--shell-control-border)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="step-order">
                  {t("whatsappLeadFollowup.steps.stepOrder", "Step Order")}
                </Label>
                <Input
                  id="step-order"
                  type="number"
                  min={1}
                  value={currentStep.stepOrder ?? 1}
                  onChange={(e) =>
                    setCurrentStep((prev) => ({
                      ...prev,
                      stepOrder: Number.parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="rounded-xl border-[color:var(--shell-control-border)]"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <p className="w-full text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                  {t("whatsappLeadFollowup.steps.variables")}
                </p>
                {variableTokens.map((token) => (
                  <Button
                    key={token}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]/80"
                    onClick={() =>
                      setCurrentStep((prev) => ({
                        ...prev,
                        content: `${prev.content || ""}${token}`,
                      }))
                    }
                  >
                    {token}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-5 lg:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="step-content">
                  {t("whatsappLeadFollowup.steps.content")}
                </Label>
                <Textarea
                  id="step-content"
                  value={currentStep.content ?? ""}
                  onChange={(e) =>
                    setCurrentStep((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Hi {firstName}, thanks for reaching out! How can I help you?"
                  className="min-h-[14rem] bg-[color:var(--color-card)]/75"
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                  {t("whatsappLeadFollowup.steps.preview")}
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

      {/* Enrollment Detail Dialog */}
      <Dialog
        open={!!selectedEnrollment}
        onOpenChange={(open) => {
          if (!open) setSelectedEnrollment(null);
        }}
      >
        <DialogContent
          size="sm"
          className="rounded-3xl border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)]"
        >
          <DialogHeader>
            <DialogTitle>
              {t("whatsappLeadFollowup.monitoring.details")}
            </DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4 px-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                  {t("whatsappLeadFollowup.monitoring.customer")}
                </p>
                <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                  {selectedEnrollment.customer.firstName}{" "}
                  {selectedEnrollment.customer.lastName}
                </p>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  {selectedEnrollment.whatsAppContact?.phoneNumber ||
                    selectedEnrollment.customer.phone}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                  {t("whatsappLeadFollowup.flows.name")}
                </p>
                <p className="text-sm font-medium text-[color:var(--color-foreground)]">
                  {selectedEnrollment.flow.name}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                  {t("whatsappLeadFollowup.monitoring.currentStep")}
                </p>
                <p className="text-sm text-[color:var(--color-foreground)]">
                  {selectedEnrollment.currentStep}
                </p>
              </div>
              {selectedEnrollment.logs && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
                    Activity Log
                  </p>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[color:var(--color-muted)]/30 p-3 text-xs text-[color:var(--color-muted-foreground)]">
                    {selectedEnrollment.logs}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
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

export default WhatsAppLeadFollowUp;
