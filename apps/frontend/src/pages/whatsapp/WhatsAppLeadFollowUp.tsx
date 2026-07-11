import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  GripVertical,
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

function StepCard({
  step,
  index,
  onChange,
  onDelete,
  canDelete,
}: {
  step: Step;
  index: number;
  onChange: (i: number, s: Step) => void;
  onDelete: (i: number) => void;
  canDelete: boolean;
}) {
  const { t } = useTranslation();
  const ns = "whatsappLeadFollowup";
  return (
    <div className="rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-muted)_50%,transparent)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <GripVertical className="size-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
        <span className="text-sm font-semibold">
          {t(`${ns}.monitoring.step`, { ns, current: index + 1, total: "..." })}
        </span>
        {canDelete && (
          <button
            onClick={() => onDelete(index)}
            className="ml-auto rounded-lg p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">{t(`${ns}.steps.delay`, { ns, hours: step.delayHours })}</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={720}
              className="w-24"
              value={step.delayHours}
              onChange={(e) => onChange(index, { ...step, delayHours: Number(e.target.value) })}
            />
            <span className="text-sm text-[color:var(--color-muted-foreground)]">hours</span>
          </div>
        </div>
        <div>
          <Label className="text-xs">{t(`${ns}.steps.content`, { ns })}</Label>
          <p className="mt-0.5 mb-1 text-[10px] text-[color:var(--color-muted-foreground)]">
            {t(`${ns}.steps.variables`, { ns })}: {"{firstName}"}, {"{lastName}"}, {"{customerName}"}
          </p>
          <Textarea
            value={step.message}
            onChange={(e) => onChange(index, { ...step, message: e.target.value })}
            rows={3}
            placeholder="Hi {firstName}, thanks for reaching out!"
          />
        </div>
      </div>
    </div>
  );
}

function EnrollmentRow({
  enrollment,
  onCancel,
  cancelling,
}: {
  enrollment: Enrollment;
  onCancel: (id: string) => void;
  cancelling: string | null;
}) {
  const { t } = useTranslation();
  const ns = "whatsappLeadFollowup";

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-amber-500/15 text-amber-600",
    COMPLETED: "bg-green-500/15 text-green-600",
    CANCELLED: "bg-red-500/15 text-red-600",
  };

  const statusLabel = t(`${ns}.monitoring.${enrollment.status.toLowerCase()}`, { ns }) || enrollment.status;

  const name = enrollment.customer.firstName
    ? `${enrollment.customer.firstName} ${enrollment.customer.lastName || ""}`
    : enrollment.whatsAppContact.name || enrollment.whatsAppContact.pushName || enrollment.whatsAppContact.phoneNumber;

  const nextSend = enrollment.nextSendAt
    ? new Date(enrollment.nextSendAt).toLocaleString()
    : "-";

  const lastSent = enrollment.lastSentAt
    ? new Date(enrollment.lastSentAt).toLocaleString()
    : "-";

  return (
    <TableRow>
      <TableCell className="font-medium">{name}</TableCell>
      <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">
        {enrollment.whatsAppContact.phoneNumber}
      </TableCell>
      <TableCell>
        <Badge className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusColor[enrollment.status] || "")}>
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        {enrollment.status === "ACTIVE"
          ? `${enrollment.currentStep + 1}/${enrollment.totalSteps}`
          : "-"}
      </TableCell>
      <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">{nextSend}</TableCell>
      <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">{lastSent}</TableCell>
      <TableCell>
        {enrollment.status === "ACTIVE" && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={() => onCancel(enrollment.id)}
            disabled={cancelling === enrollment.id}
          >
            {cancelling === enrollment.id ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <XCircle className="size-3" />
            )}
            Cancel
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
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
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
      setSettings({
        ...s,
        steps: Array.isArray(s.steps) && s.steps.length > 0 ? s.steps : null,
      });
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

      // Refresh stats
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
      setSettings({
        ...s,
        steps: Array.isArray(s.steps) && s.steps.length > 0 ? s.steps : null,
      });
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
      setEnrollments((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "CANCELLED" } : e)),
      );
      // Refresh stats
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

  return (
    <WhatsAppPageShell
      title={t(`${ns}.title`, { ns })}
      subtitle={t(`${ns}.subtitle`, { ns })}
      icon={Zap}
      actions={
        <div className="flex items-center gap-2">
          <Button
            className="rounded-full bg-[color:var(--business-success)] px-5 text-white hover:brightness-90"
            onClick={handleSave}
            disabled={saving || !settings}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <WhatsAppMetricCard
                label={t(`${ns}.stats.activeEnrollments`, { ns })}
                value={stats.active}
                icon={Users}
                tone="primary"
              />
              <WhatsAppMetricCard
                label={t(`${ns}.stats.totalSent`, { ns })}
                value={stats.totalSent}
                icon={MessageSquare}
                tone="info"
              />
              <WhatsAppMetricCard
                label="Reply Rate"
                value={`${stats.replyRate}%`}
                hint={`${stats.replied} of ${stats.totalSent} replied`}
                icon={CheckCircle}
                tone="success"
              />
              <WhatsAppMetricCard
                label={t(`${ns}.stats.completionRate`, { ns })}
                value={`${stats.completionRate}%`}
                icon={Zap}
                tone="primary"
              />
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="settings">
                <Zap className="size-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="monitoring">
                <Users className="size-4" />
                {t(`${ns}.tabs.monitoring`, { ns })}
              </TabsTrigger>
            </TabsList>

            {/* ── Settings Tab ── */}
            <TabsContent value="settings">
              <div className="space-y-6">
                {/* Sequence Editor */}
                <WhatsAppSurfaceCard
                  title={`Follow-up Sequence (${stepCount} step${stepCount > 1 ? "s" : ""})`}
                  description="Configure the sequence of messages sent to new leads"
                >
                  {settings?.steps && settings.steps.length > 0 ? (
                    <div className="space-y-3">
                      {settings.steps.map((step, i) => (
                        <StepCard
                          key={i}
                          step={step}
                          index={i}
                          onChange={handleStepChange}
                          onDelete={handleDeleteStep}
                          canDelete={(settings.steps?.length ?? 0) > 1}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      No steps configured. Click below to add your first follow-up step.
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="mt-4 rounded-full"
                    onClick={handleAddStep}
                  >
                    <Plus className="size-4" />
                    Add Step
                  </Button>
                </WhatsAppSurfaceCard>

                {/* Business Hours */}
                <WhatsAppSurfaceCard
                  title="Business Hours"
                  description="Only send follow-ups during specific hours"
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Start Hour (UTC)</Label>
                      <Select
                        value={String(settings?.businessHourStart ?? "")}
                        onValueChange={(v) =>
                          setSettings((prev) =>
                            prev ? { ...prev, businessHourStart: v ? Number(v) : null } : prev,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any time</SelectItem>
                          {WA_HOURS.map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {h.toString().padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">End Hour (UTC)</Label>
                      <Select
                        value={String(settings?.businessHourEnd ?? "")}
                        onValueChange={(v) =>
                          setSettings((prev) =>
                            prev ? { ...prev, businessHourEnd: v ? Number(v) : null } : prev,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Any time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any time</SelectItem>
                          {WA_HOURS.map((h) => (
                            <SelectItem key={h} value={String(h)}>
                              {h.toString().padStart(2, "0")}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Timezone</Label>
                      <Select
                        value={settings?.timezone ?? "UTC"}
                        onValueChange={(v) =>
                          setSettings((prev) =>
                            prev ? { ...prev, timezone: v || "UTC" } : prev,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {settings && (
                    <div className="mt-4 flex items-center gap-3">
                      <Switch
                        checked={settings.isEnabled}
                        onCheckedChange={(checked) =>
                          setSettings((prev) =>
                            prev ? { ...prev, isEnabled: checked } : prev,
                          )
                        }
                      />
                      <span className="text-sm text-[color:var(--color-muted-foreground)]">
                        {settings.isEnabled ? "Follow-up is active" : "Follow-up is paused"}
                      </span>
                    </div>
                  )}
                </WhatsAppSurfaceCard>

                {/* Hints */}
                <WhatsAppSurfaceCard
                  title={t(`${ns}.hints.title`, { ns })}
                  description=""
                >
                  <ul className="space-y-2 text-sm text-[color:var(--color-muted-foreground)]">
                    <li className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span>{t(`${ns}.hints.tip1`, { ns })}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span>{t(`${ns}.hints.tip2`, { ns })}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span>{t(`${ns}.hints.tip3`, { ns })}</span>
                    </li>
                  </ul>
                </WhatsAppSurfaceCard>
              </div>
            </TabsContent>

            {/* ── Monitoring Tab ── */}
            <TabsContent value="monitoring">
              <WhatsAppSurfaceCard
                title={t(`${ns}.tabs.monitoring`, { ns })}
                action={
                  <Select
                    value={enrollmentFilter}
                    onValueChange={setEnrollmentFilter}
                  >
                    <SelectTrigger className="h-9 min-w-[10rem] rounded-full">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`${ns}.monitoring.${s.toLowerCase()}`, { ns }) || s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
              >
                {enrollments.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-[color:var(--color-muted-foreground)]">
                    <Users className="size-8" />
                    <p className="text-sm">No enrollments found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t(`${ns}.monitoring.customer`, { ns })}</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>{t(`${ns}.monitoring.status`, { ns })}</TableHead>
                          <TableHead>{t(`${ns}.monitoring.currentStep`, { ns })}</TableHead>
                          <TableHead>{t(`${ns}.monitoring.nextMessage`, { ns })}</TableHead>
                          <TableHead>{t(`${ns}.monitoring.lastSent`, { ns })}</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {enrollments.map((enr) => (
                          <EnrollmentRow
                            key={enr.id}
                            enrollment={enr}
                            onCancel={handleCancelEnrollment}
                            cancelling={cancelling}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </WhatsAppSurfaceCard>
            </TabsContent>
          </Tabs>
        </>
      )}
    </WhatsAppPageShell>
  );
};

export default WhatsAppLeadFollowUp;
