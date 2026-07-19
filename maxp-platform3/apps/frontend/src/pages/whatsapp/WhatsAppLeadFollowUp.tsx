import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  GripVertical,
  Globe,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import {
  WhatsAppMetricCard,
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

interface Step {
  delayHours: number;
  message: string;
  mediaUrl?: string | null;
}

interface Settings {
  id?: string;
  isEnabled: boolean;
  delayHours: number;
  message: string;
  mediaUrl?: string | null;
  steps: Step[] | null;
  businessHourStart: number | null;
  businessHourEnd: number | null;
  timezone: string | null;
}

interface EnrollmentsStats {
  active: number;
  completed: number;
  cancelled: number;
  replied: number;
  total: number;
  totalSent: number;
  replyRate: number;
  completionRate: number;
}

interface Enrollment {
  id: string;
  companyId: string;
  customerId: string;
  whatsappContactId: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  nextSendAt: string;
  lastSentAt?: string | null;
  repliedAt?: string | null;
  firstMessageAt: string;
  logs?: string | null;
  customer: { firstName: string; lastName: string; phone: string };
  whatsAppContact: { phoneNumber: string; name?: string; pushName?: string };
}

const STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"] as const;

const TIMEZONES = [
  "UTC", "US/Eastern", "US/Central", "US/Mountain", "US/Pacific",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Dubai", "Asia/Riyadh", "Asia/Kuwait", "Asia/Qatar",
  "Asia/Bahrain", "Asia/Muscat", "Asia/Amman", "Asia/Beirut",
  "Asia/Jerusalem", "Asia/Tehran", "Asia/Karachi", "Asia/Kolkata",
  "Asia/Bangkok", "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney",
  "Africa/Cairo", "Africa/Casablanca", "Africa/Lagos", "Africa/Johannesburg",
];

const WA_HOURS = Array.from({ length: 24 }, (_, i) => i);

const defaultSteps: Step[] = [
  { delayHours: 1, message: "Hi {firstName}, thanks for reaching out! How can I help you today?", mediaUrl: null },
  { delayHours: 24, message: "Hi {firstName}, just checking in — did you have any questions?", mediaUrl: null },
  { delayHours: 72, message: "Hi {firstName}, we're here if you need anything. Don't hesitate to reach out!", mediaUrl: null },
];

const statusConfig = {
  ACTIVE: { dot: "bg-amber-500", bg: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  COMPLETED: { dot: "bg-emerald-500", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  CANCELLED: { dot: "bg-red-500", bg: "bg-red-500/10 text-red-600 border-red-500/20" },
} as const;

function StatusDot({ status }: { status: string }) {
  const cfg = statusConfig[status as keyof typeof statusConfig];
  return <span className={cn("mr-1.5 inline-block size-1.5 rounded-full", cfg?.dot || "bg-gray-400")} />;
}

function StepCard({ step, index, onChange, onDelete, canDelete }: {
  step: Step; index: number;
  onChange: (i: number, s: Step) => void;
  onDelete: (i: number) => void; canDelete: boolean;
}) {
  const { t } = useTranslation();
  const ns = "whatsappLeadFollowup";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-card)_98%,var(--color-primary))] to-[color:var(--color-card)] p-4 shadow-sm transition-all duration-200 hover:shadow-md sm:p-5">
      <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-primary/40 to-primary/10" />
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{index + 1}</span>
        <GripVertical className="size-4 shrink-0 text-[color:var(--color-muted-foreground)] opacity-40 transition-opacity group-hover:opacity-70" />
        <span className="text-sm font-semibold">{t(`${ns}.stepEditor.stepLabel`, { ns, current: index + 1 })}</span>
        {canDelete && (
          <button onClick={() => onDelete(index)} className="ml-auto rounded-lg p-1.5 text-[color:var(--color-muted-foreground)] opacity-40 transition-all hover:bg-destructive/10 hover:text-destructive hover:opacity-100">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-medium text-[color:var(--color-muted-foreground)]">{t(`${ns}.stepEditor.hours`, { ns })}</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input type="number" min={1} max={720} className="w-24" value={step.delayHours}
              onChange={(e) => onChange(index, { ...step, delayHours: Number(e.target.value) })} />
            <span className="text-xs text-[color:var(--color-muted-foreground)]">{t(`${ns}.stepEditor.hours`, { ns })}</span>
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-[color:var(--color-muted-foreground)]">{t(`${ns}.steps.content`, { ns })}</Label>
          <p className="mt-0.5 mb-1 text-[10px] text-[color:var(--color-muted-foreground)]">{t(`${ns}.steps.variables`, { ns })}: {"{firstName}"}, {"{lastName}"}, {"{customerName}"}</p>
          <Textarea value={step.message} onChange={(e) => onChange(index, { ...step, message: e.target.value })}
            rows={3} placeholder="Hi {firstName}, thanks for reaching out!" className="resize-none" />
        </div>
      </div>
    </div>
  );
}

function EnrollmentRow({ enrollment, onCancel, cancelling }: {
  enrollment: Enrollment;
  onCancel: (id: string) => void;
  cancelling: string | null;
}) {
  const { t } = useTranslation();
  const ns = "whatsappLeadFollowup";
  const cfg = statusConfig[enrollment.status as keyof typeof statusConfig] || statusConfig.CANCELLED;
  const statusLabel = t(`${ns}.monitoring.${enrollment.status.toLowerCase()}`, { ns }) || enrollment.status;
  const name = enrollment.customer.firstName
    ? `${enrollment.customer.firstName} ${enrollment.customer.lastName || ""}`
    : enrollment.whatsAppContact.name || enrollment.whatsAppContact.pushName || enrollment.whatsAppContact.phoneNumber;
  const nextSend = enrollment.nextSendAt ? new Date(enrollment.nextSendAt).toLocaleString() : "-";
  const lastSent = enrollment.lastSentAt ? new Date(enrollment.lastSentAt).toLocaleString() : "-";

  return (
    <TableRow className="transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]">
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
            {name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-xs text-[color:var(--color-muted-foreground)]">{enrollment.whatsAppContact.phoneNumber}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium", cfg.bg)}>
          <StatusDot status={enrollment.status} />
          {statusLabel}
        </span>
      </TableCell>
      <TableCell className="text-sm">
        {enrollment.status === "ACTIVE" ? `${enrollment.currentStep + 1}/${enrollment.totalSteps}` : "-"}
      </TableCell>
      <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">{nextSend}</TableCell>
      <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">{lastSent}</TableCell>
      <TableCell className="text-right">
        {enrollment.status === "ACTIVE" && (
          <Button variant="outline" size="sm" className="h-8 rounded-full border-red-500/20 text-red-500 hover:bg-red-500/10"
            onClick={() => onCancel(enrollment.id)} disabled={cancelling === enrollment.id}>
            {cancelling === enrollment.id ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
            {t(`${ns}.enrollments.cancel`, { ns })}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

const WhatsAppLeadFollowUp: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const ns = "whatsappLeadFollowup";

  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) => companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const [settings, setSettings] = useState<Settings | null>(null);
  const [stats, setStats] = useState<EnrollmentsStats | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollmentFilter, setEnrollmentFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("settings");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, statsRes] = await Promise.all([
        apiClient.get("/whatsapp/lead-followup/settings", withCompanyConfig()),
        apiClient.get("/whatsapp/lead-followup/stats", withCompanyConfig()),
      ]);
      const s = settingsRes.data.data;
      setSettings({ ...s, steps: Array.isArray(s.steps) && s.steps.length > 0 ? s.steps : null });
      setStats(statsRes.data.data || null);
    } catch {
      // toast handled by apiClient
    } finally {
      setLoading(false);
    }
  }, [withCompanyConfig]);

  const loadEnrollments = useCallback(async (status?: string) => {
    try {
      const params = status ? { status } : {};
      const res = await apiClient.get("/whatsapp/lead-followup/enrollments", withCompanyConfig({ params }));
      setEnrollments(res.data.data || []);
    } catch {
      // handled
    }
  }, [withCompanyConfig]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (activeTab === "monitoring") loadEnrollments(enrollmentFilter);
  }, [activeTab, enrollmentFilter, loadEnrollments]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        isEnabled: settings.isEnabled,
        steps: settings.steps && settings.steps.length > 0 ? settings.steps : undefined,
        businessHourStart: settings.businessHourStart,
        businessHourEnd: settings.businessHourEnd,
        timezone: settings.timezone,
      };
      if (settings.steps && settings.steps.length > 0) {
        payload.delayHours = settings.steps[0].delayHours;
        payload.message = settings.steps[0].message;
        payload.mediaUrl = settings.steps[0].mediaUrl;
      }
      await apiClient.put("/whatsapp/lead-followup/settings", payload, withCompanyConfig());
      const statsRes = await apiClient.get("/whatsapp/lead-followup/stats", withCompanyConfig());
      setStats(statsRes.data.data || null);
    } catch {
      // handled
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const [statsRes, settingsRes] = await Promise.all([
        apiClient.get("/whatsapp/lead-followup/stats", withCompanyConfig()),
        apiClient.get("/whatsapp/lead-followup/settings", withCompanyConfig()),
      ]);
      setStats(statsRes.data.data || null);
      const s = settingsRes.data.data;
      setSettings({ ...s, steps: Array.isArray(s.steps) && s.steps.length > 0 ? s.steps : null });
    } catch {
      // handled
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelEnrollment = async (id: string) => {
    setCancelling(id);
    try {
      await apiClient.put(`/whatsapp/lead-followup/enrollments/${id}/cancel`, {}, withCompanyConfig());
      setEnrollments((prev) => prev.map((e) => (e.id === id ? { ...e, status: "CANCELLED" } : e)));
      const statsRes = await apiClient.get("/whatsapp/lead-followup/stats", withCompanyConfig());
      setStats(statsRes.data.data || null);
    } catch {
      // handled
    } finally {
      setCancelling(null);
    }
  };

  const handleStepChange = (index: number, step: Step) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const steps = prev.steps ? [...prev.steps] : [...defaultSteps];
      steps[index] = step;
      return { ...prev, steps };
    });
  };

  const handleAddStep = () => {
    setSettings((prev) => {
      if (!prev) return prev;
      const steps = prev.steps ? [...prev.steps] : [...defaultSteps];
      steps.push({ delayHours: 24, message: "", mediaUrl: null });
      return { ...prev, steps };
    });
  };

  const handleDeleteStep = (index: number) => {
    setSettings((prev) => {
      if (!prev || !prev.steps) return prev;
      const steps = prev.steps.filter((_, i) => i !== index);
      return { ...prev, steps: steps.length > 0 ? steps : null };
    });
  };

  const stepCount = settings?.steps?.length ?? 1;

  const statCards = useMemo(() => stats ? [
    { label: t(`${ns}.stats.activeEnrollments`, { ns }), value: stats.active, icon: Users, tone: "primary" as const },
    { label: t(`${ns}.stats.totalSent`, { ns }), value: stats.totalSent, icon: MessageSquare, tone: "info" as const },
    {
      label: t(`${ns}.stats.replyRate`, { ns }),
      value: `${stats.replyRate}%`,
      hint: t(`${ns}.stats.replyRateHint`, { ns, replied: stats.replied, total: stats.totalSent }),
      icon: CheckCircle2, tone: "success" as const,
    },
    { label: t(`${ns}.stats.completionRate`, { ns }), value: `${stats.completionRate}%`, icon: Zap, tone: "primary" as const },
  ] : [], [stats, t, ns]);

  return (
    <WhatsAppPageShell
      title={t(`${ns}.title`, { ns })}
      subtitle={t(`${ns}.subtitle`, { ns })}
      icon={Zap}
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 text-white shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md disabled:hover:scale-100"
            onClick={handleSave}
            disabled={saving || !settings}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t(`${ns}.actions.save`, { ns })}
          </Button>
          <Button
            variant="outline"
            className="rounded-full transition-all duration-200 hover:scale-[1.02]"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="animate-in fade-in space-y-4 duration-500">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl sm:h-32" />)}
          </div>
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-500">
          {statCards.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map((card, i) => (
                <div key={i} className="transition-all duration-200 hover:scale-[1.02]">
                  <WhatsAppMetricCard {...card} />
                </div>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 gap-1 rounded-2xl bg-[color:color-mix(in_srgb,var(--color-muted)_60%,transparent)] p-1">
              <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm">
                <Zap className="size-4" />
                {t(`${ns}.tabs.settings`, { ns })}
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm">
                <Users className="size-4" />
                {t(`${ns}.tabs.monitoring`, { ns })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6">
              <WhatsAppSurfaceCard
                title={t(`${ns}.stepEditor.title`, { ns })}
                description={`${t(`${ns}.stepEditor.description`, { ns })} — ${stepCount} ${t(`${ns}.stepEditor.stepLabel`, { ns, current: "" }).replace("1", stepCount.toString())}`}
              >
                {settings?.steps && settings.steps.length > 0 ? (
                  <div className="space-y-3">
                    {settings.steps.map((step, i) => (
                      <StepCard key={i} step={step} index={i}
                        onChange={handleStepChange} onDelete={handleDeleteStep}
                        canDelete={(settings.steps?.length ?? 0) > 1} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-[color:var(--color-muted-foreground)]">
                    <MessageSquare className="size-10 opacity-40" />
                    <p className="text-sm">{t(`${ns}.stepEditor.noSteps`, { ns })}</p>
                  </div>
                )}
                <Button variant="outline" className="mt-4 rounded-full transition-all duration-200 hover:scale-[1.02]" onClick={handleAddStep}>
                  <Plus className="size-4" />
                  {t(`${ns}.stepEditor.addStep`, { ns })}
                </Button>
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard
                title={t(`${ns}.businessHours.title`, { ns })}
                description={t(`${ns}.businessHours.description`, { ns })}
              >
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)]">
                      <Clock className="size-3.5" />
                      {t(`${ns}.businessHours.startHour`, { ns })}
                    </Label>
                    <Select value={String(settings?.businessHourStart ?? "")}
                      onValueChange={(v) => setSettings((prev) => prev ? { ...prev, businessHourStart: v ? Number(v) : null } : prev)}>
                      <SelectTrigger><SelectValue placeholder={t(`${ns}.businessHours.anyTime`, { ns })} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t(`${ns}.businessHours.anyTime`, { ns })}</SelectItem>
                        {WA_HOURS.map((h) => <SelectItem key={h} value={String(h)}>{h.toString().padStart(2, "0")}:00</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)]">
                      <Clock className="size-3.5" />
                      {t(`${ns}.businessHours.endHour`, { ns })}
                    </Label>
                    <Select value={String(settings?.businessHourEnd ?? "")}
                      onValueChange={(v) => setSettings((prev) => prev ? { ...prev, businessHourEnd: v ? Number(v) : null } : prev)}>
                      <SelectTrigger><SelectValue placeholder={t(`${ns}.businessHours.anyTime`, { ns })} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t(`${ns}.businessHours.anyTime`, { ns })}</SelectItem>
                        {WA_HOURS.map((h) => <SelectItem key={h} value={String(h)}>{h.toString().padStart(2, "0")}:00</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-[color:var(--color-muted-foreground)]">
                      <Globe className="size-3.5" />
                      {t(`${ns}.businessHours.timezone`, { ns })}
                    </Label>
                    <Select value={settings?.timezone ?? "UTC"}
                      onValueChange={(v) => setSettings((prev) => prev ? { ...prev, timezone: v || "UTC" } : prev)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {settings && (
                  <div className="mt-5 flex items-center gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-muted)_40%,transparent)] p-3">
                    <Switch checked={settings.isEnabled}
                      onCheckedChange={(checked) => setSettings((prev) => prev ? { ...prev, isEnabled: checked } : prev)} />
                    <span className="text-sm font-medium text-[color:var(--color-muted-foreground)]">
                      {settings.isEnabled ? t(`${ns}.status.active`, { ns }) : t(`${ns}.status.paused`, { ns })}
                    </span>
                  </div>
                )}
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard title={t(`${ns}.hints.title`, { ns })}>
                <ul className="space-y-3 text-sm text-[color:var(--color-muted-foreground)]">
                  {[
                    { icon: Clock, color: "text-amber-500", textKey: "tip1" },
                    { icon: MessageSquare, color: "text-sky-500", textKey: "tip2" },
                    { icon: Sparkles, color: "text-violet-500", textKey: "tip3" },
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-card)_60%,transparent)] p-3 transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5", tip.color)}>
                        <tip.icon className="size-4" />
                      </span>
                      <span>{t(`${ns}.hints.${tip.textKey}`, { ns })}</span>
                    </li>
                  ))}
                </ul>
              </WhatsAppSurfaceCard>
            </TabsContent>

            <TabsContent value="monitoring">
              <WhatsAppSurfaceCard
                title={t(`${ns}.tabs.monitoring`, { ns })}
                action={
                  <Select value={enrollmentFilter} onValueChange={setEnrollmentFilter}>
                    <SelectTrigger className="h-9 min-w-[10rem] rounded-full">
                      <SelectValue placeholder={t(`${ns}.enrollments.allStatuses`, { ns })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t(`${ns}.enrollments.allStatuses`, { ns })}</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{t(`${ns}.monitoring.${s.toLowerCase()}`, { ns }) || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              >
                {enrollments.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-[color:var(--color-muted-foreground)]">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                      <Users className="size-7 opacity-50" />
                    </div>
                    <p className="text-sm font-medium">{t(`${ns}.enrollments.empty`, { ns })}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b-[color:color-mix(in_srgb,var(--shell-control-border)_70%,transparent)]">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                            {t(`${ns}.monitoring.customer`, { ns })}
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                            {t(`${ns}.monitoring.status`, { ns })}
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                            {t(`${ns}.monitoring.currentStep`, { ns })}
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                            {t(`${ns}.monitoring.nextMessage`, { ns })}
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                            {t(`${ns}.monitoring.lastSent`, { ns })}
                          </TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollments.map((enr) => (
                          <EnrollmentRow key={enr.id} enrollment={enr}
                            onCancel={handleCancelEnrollment} cancelling={cancelling} />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </WhatsAppSurfaceCard>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </WhatsAppPageShell>
  );
};

export default WhatsAppLeadFollowUp;
