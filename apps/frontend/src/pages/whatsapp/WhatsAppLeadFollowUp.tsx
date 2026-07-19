import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2, ChevronDown, ChevronRight, Clock, Globe, Loader2, MessageSquare,
  Plus, RefreshCw, Save, Sparkles, Trash2, Users, Zap, Settings2, Link2, Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import { WhatsAppMetricCard, WhatsAppPageShell, WhatsAppSurfaceCard } from "./components/WhatsAppPageShell";

interface Flow {
  id: string; companyId: string; name: string; isEnabled: boolean;
  isGeneral: boolean;
  _count: { steps: number; journeys: number; categories: number };
  steps?: FlowStep[];
  categories?: { id: string; name: string; color: string | null }[];
}

interface FlowStep {
  id?: string; flowId?: string; delayDays: number; delayHours?: number;
  delayUnit: string; content: string; mediaUrl?: string; stepOrder: number;
}

interface LeadCategory {
  id: string; name: string; color: string; autoFollowUp: boolean;
  triggerFlowId?: string; autoPromoteCategoryId?: string;
}

interface Journey {
  id: string; companyId: string; customerId: string; flowId: string;
  status: string; currentStep: number; nextSendAt: string; lastSentAt?: string;
  customer: { firstName: string; lastName: string; phone: string };
  flow: { name: string; steps: { id: string }[] };
  order?: { orderNumber: string };
}

interface LegacyEnrollment {
  id: string; companyId: string; customerId: string; whatsappContactId: string;
  status: string; currentStep: number; totalSteps: number;
  nextSendAt: string; lastSentAt?: string;
  customer: { firstName: string; lastName: string; phone: string };
  whatsAppContact: { phoneNumber: string; name?: string; pushName?: string };
}

interface Stats {
  active: number; completed: number; cancelled: number; replied: number;
  total: number; totalSent: number; replyRate: number; completionRate: number;
}

interface Settings {
  isEnabled: boolean; businessHourStart?: number | null; businessHourEnd?: number | null;
  timezone?: string | null; steps?: Record<string, unknown>[] | null;
}

const TIMEZONES = [
  "UTC", "US/Eastern", "US/Central", "US/Mountain", "US/Pacific",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "Asia/Dubai", "Asia/Riyadh", "Asia/Kuwait", "Asia/Qatar", "Asia/Bahrain",
  "Asia/Muscat", "Asia/Amman", "Asia/Beirut", "Asia/Jerusalem", "Asia/Tehran",
  "Asia/Karachi", "Asia/Kolkata", "Asia/Bangkok", "Asia/Shanghai", "Asia/Tokyo",
  "Australia/Sydney", "Africa/Cairo", "Africa/Casablanca", "Africa/Lagos", "Africa/Johannesburg",
];

const WA_HOURS = Array.from({ length: 24 }, (_, i) => i);
const STATUSES = ["ACTIVE", "COMPLETED", "CANCELLED"] as const;

const statusCfg: Record<string, { dot: string; bg: string }> = {
  ACTIVE: { dot: "bg-amber-500", bg: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  COMPLETED: { dot: "bg-emerald-500", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  CANCELLED: { dot: "bg-red-500", bg: "bg-red-500/10 text-red-600 border-red-500/20" },
  FAILED: { dot: "bg-red-500", bg: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const apiBase = "/api/v1/whatsapp/automation";
const lfBase = "/api/v1/whatsapp/lead-followup";

const WhatsAppLeadFollowUp: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const { t } = useTranslation();
  const ns = "whatsappLeadFollowup";
  const tx = useCallback((k: string) => t(`${ns}.${k}`), [t, ns]);

  const wc = useCallback((c: ApiRequestConfig = {}) => companyId ? { ...c, _companyId: companyId } : c, [companyId]);

  const [flows, setFlows] = useState<Flow[]>([]);
  const [categories, setCategories] = useState<LeadCategory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<{ id: string; name: string; color: string; totalContacts: number; enrolled: number; completed: number; replied: number; replyRate: number }[]>([]);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [enrollments, setEnrollments] = useState<LegacyEnrollment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<{ flowId: string; step: FlowStep } | null>(null);
  const [activeTab, setActiveTab] = useState("flows");
  const [monFilter, setMonFilter] = useState({ status: "", flowId: "" });
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowScope, setNewFlowScope] = useState<"TARGETED" | "GENERAL">("TARGETED");
  const [newFlowCategoryIds, setNewFlowCategoryIds] = useState<string[]>([]);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try { const r = await apiClient.get("/whatsapp/lead-categories", wc()); setCategories(r.data.data || []); } catch { /* */ }
  }, [wc]);

  const loadSettings = useCallback(async () => {
    try { const r = await apiClient.get(`${lfBase}/settings`, wc()); setSettings(r.data.data); } catch { /* */ }
  }, [wc]);

  const loadFlows = useCallback(async () => {
    try { const r = await apiClient.get(`${apiBase}/flows`, wc()); setFlows(r.data.data || []); } catch { /* */ }
  }, [wc]);

  const loadStats = useCallback(async () => {
    try { const r = await apiClient.get(`${lfBase}/stats`, wc()); setStats(r.data.data); } catch { /* */ }
  }, [wc]);

  const loadCategoryStats = useCallback(async () => {
    try { const r = await apiClient.get(`${lfBase}/category-stats`, wc()); setCategoryStats(r.data.data || []); } catch { /* */ }
  }, [wc]);

  const loadJourneys = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (monFilter.status) params.status = monFilter.status;
      if (monFilter.flowId) params.flowId = monFilter.flowId;
      const r = await apiClient.get(`${apiBase}/journeys`, wc({ params }));
      setJourneys(r.data.data || []);
    } catch { /* */ }
  }, [wc, monFilter]);

  const loadEnrollments = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (monFilter.status) params.status = monFilter.status;
      const r = await apiClient.get(`${lfBase}/enrollments`, wc({ params }));
      setEnrollments(r.data.data || []);
    } catch { /* */ }
  }, [wc, monFilter.status]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFlows(), loadStats(), loadCategories(), loadSettings(), loadCategoryStats()]);
    setLoading(false);
  }, [loadFlows, loadStats, loadCategories, loadSettings, loadCategoryStats]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (activeTab === "monitoring") { loadJourneys(); loadEnrollments(); }
  }, [activeTab, loadJourneys, loadEnrollments]);

  const loadSteps = useCallback(async (flowId: string) => {
    try { const r = await apiClient.get(`${apiBase}/flows/${flowId}/steps`, wc()); return r.data.data || []; }
    catch { /* */ return []; }
  }, [wc]);

  const toggleFlow = async (flow: Flow) => {
    try {
      await apiClient.put(`${apiBase}/flows/${flow.id}`, { isEnabled: !flow.isEnabled }, wc());
      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, isEnabled: !f.isEnabled } : f));
    } catch { /* */ }
  };

  const createFlow = async () => {
    if (!newFlowName.trim()) return;
    setSaving("create");
    try {
      const r = await apiClient.post(`${apiBase}/flows`, {
        name: newFlowName.trim(),
        isGeneral: newFlowScope === "GENERAL"
      }, wc());
      setFlows(prev => [r.data.data, ...prev]);
      setNewFlowName(""); setNewFlowScope("TARGETED"); setNewFlowCategoryIds([]); setShowNewFlow(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (msg) alert(msg);
    } finally { setSaving(null); }
  };

  const deleteFlow = async (id: string) => {
    try {
      await apiClient.delete(`${apiBase}/flows/${id}`, wc());
      setFlows(prev => prev.filter(f => f.id !== id));
      setDeleteConfirm(null);
    } catch { /* */ }
  };

  const expandFlow = async (flowId: string) => {
    if (expandedFlow === flowId) { setExpandedFlow(null); return; }
    const flow = flows.find(f => f.id === flowId);
    if (flow && !flow.steps) {
      const steps = await loadSteps(flowId);
      setFlows(prev => prev.map(f => f.id === flowId ? { ...f, steps } : f));
    }
    setExpandedFlow(flowId);
  };

  const saveStep = async (flowId: string, step: FlowStep) => {
    setSaving(`step-${flowId}`);
    try {
      await apiClient.post(`${apiBase}/flows/${flowId}/steps`, step, wc());
      const steps = await loadSteps(flowId);
      setFlows(prev => prev.map(f => f.id === flowId ? { ...f, steps } : f));
      setEditingStep(null);
    } catch { /* */ } finally { setSaving(null); }
  };

  const deleteStep = async (stepId: string, flowId: string) => {
    try {
      await apiClient.delete(`${apiBase}/steps/${stepId}`, wc());
      const steps = await loadSteps(flowId);
      setFlows(prev => prev.map(f => f.id === flowId ? { ...f, steps } : f));
    } catch { /* */ }
  };

  const toggleCategory = async (catId: string, autoFollowUp: boolean) => {
    try {
      await apiClient.put(`/whatsapp/lead-categories/${catId}`, { autoFollowUp }, wc());
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, autoFollowUp } : c));
    } catch { /* */ }
  };

  const bindCategoryFlow = async (catId: string, triggerFlowId: string | null) => {
    try {
      await apiClient.put(`/whatsapp/lead-categories/${catId}`, { triggerFlowId }, wc());
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, triggerFlowId: triggerFlowId || undefined } : c));
    } catch { /* */ }
  };

  const cancelEnrollment = async (id: string) => {
    try {
      await apiClient.put(`${lfBase}/enrollments/${id}/cancel`, {}, wc());
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: "CANCELLED" } : e));
    } catch { /* */ }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving("settings");
    try {
      await apiClient.put(`${lfBase}/settings`, settings, wc());
      const r = await apiClient.get(`${lfBase}/stats`, wc());
      setStats(r.data.data);
    } catch { /* */ } finally { setSaving(null); }
  };

  const statCards = useMemo(() => stats ? [
    { label: tx("stats.activeEnrollments"), value: stats.active, icon: Users, tone: "primary" as const },
    { label: tx("stats.totalSent"), value: stats.totalSent, icon: MessageSquare, tone: "info" as const },
    { label: tx("stats.replyRate"), value: `${stats.replyRate}%`, hint: tx("stats.replyRateHint").replace("{{replied}}", String(stats.replied)).replace("{{total}}", String(stats.totalSent)), icon: CheckCircle2, tone: "success" as const },
    { label: tx("stats.completionRate"), value: `${stats.completionRate}%`, icon: Zap, tone: "primary" as const },
    { label: tx("stats.totalEnrollments"), value: stats.total, icon: Layers, tone: "info" as const },
  ] : [], [stats, tx]);

  const formatDate = (d: string) => d ? new Date(d).toLocaleString() : "-";

  const StepForm = ({ flowId, step, onSave, onCancel }: { flowId: string; step: FlowStep; onSave: (s: FlowStep) => void; onCancel: () => void }) => {
    const [local, setLocal] = useState<FlowStep>(step);
    return (
      <div className="space-y-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)] p-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-[color:var(--color-muted-foreground)]">{tx("steps.delay")}</Label>
            <div className="mt-1 flex items-center gap-1">
              <Input type="number" min={1} max={365} className="w-16" value={local.delayUnit === "HOURS" ? (local.delayHours ?? 1) : local.delayDays}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (local.delayUnit === "HOURS") setLocal({ ...local, delayHours: v });
                  else setLocal({ ...local, delayDays: v });
                }} />
              <Select value={local.delayUnit} onValueChange={(v) => setLocal({ ...local, delayUnit: v })}>
                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOURS">{tx("steps.hours")}</SelectItem>
                  <SelectItem value="DAYS">{tx("steps.days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-[color:var(--color-muted-foreground)]">{tx("steps.content")}</Label>
            <p className="text-[10px] text-[color:var(--color-muted-foreground)]">{tx("steps.variables")}</p>
            <Textarea value={local.content} onChange={(e) => setLocal({ ...local, content: e.target.value })}
              rows={2} className="mt-1 resize-none" placeholder="Hi {firstName}..." />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>{tx("actions.cancel")}</Button>
          <Button size="sm" onClick={() => onSave(local)} disabled={!local.content.trim()}>
            {saving === `step-${flowId}` ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
            {tx("actions.save")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <WhatsAppPageShell
      title={tx("title")} subtitle={tx("subtitle")} icon={Zap}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-full" onClick={loadData} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {statCards.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {statCards.map((card, i) => (
                <div key={i} className="transition-all hover:scale-[1.02]">
                  <WhatsAppMetricCard {...card} />
                </div>
              ))}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 gap-1 rounded-2xl bg-[color:color-mix(in_srgb,var(--color-muted)_60%,transparent)] p-1">
              <TabsTrigger value="flows" className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm">
                <Layers className="size-4" /> {tx("tabs.flows")}
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary/20 data-[state=active]:to-primary/5 data-[state=active]:shadow-sm">
                <Users className="size-4" /> {tx("tabs.monitoring")}
              </TabsTrigger>
            </TabsList>

            {/* ── Flows Tab ── */}
            <TabsContent value="flows" className="space-y-6">
              <WhatsAppSurfaceCard
                title={tx("flows.title")}
                action={
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-full text-amber-600 border-amber-300 hover:bg-amber-50"
                      onClick={async () => {
                        try {
                          await apiClient.post(`${apiBase}/flows/preset`, {}, wc());
                          await loadFlows();
                        } catch { /* */ }
                      }}>
                      <Sparkles className="size-4" /> {tx("flows.presetWelcome")}
                    </Button>
                    <Dialog open={showNewFlow} onOpenChange={(open) => { setShowNewFlow(open); if (!open) { setNewFlowScope("TARGETED"); setNewFlowCategoryIds([]); } }}>
                      <DialogTrigger asChild>
                        <Button className="rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm hover:shadow-md">
                          <Plus className="size-4" /> {tx("flows.addNew")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader><DialogTitle>{tx("flows.addNew")}</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div>
                            <Label className="text-xs text-[color:var(--color-muted-foreground)]">{tx("flows.name")}</Label>
                            <Input value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)}
                              placeholder={tx("flows.name")} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-xs text-[color:var(--color-muted-foreground)]">{tx("flows.scope")}</Label>
                            <div className="mt-1 flex gap-2">
                              <Button type="button" variant={newFlowScope === "TARGETED" ? "default" : "outline"} size="sm"
                                className="rounded-full"
                                onClick={() => setNewFlowScope("TARGETED")}>
                                {tx("flows.targeted")}
                              </Button>
                              <Button type="button" variant={newFlowScope === "GENERAL" ? "default" : "outline"} size="sm"
                                className="rounded-full"
                                onClick={() => setNewFlowScope("GENERAL")}>
                                {tx("flows.general")}
                              </Button>
                            </div>
                            <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                              {newFlowScope === "GENERAL" ? tx("flows.generalDesc") : tx("flows.targetedDesc")}
                            </p>
                          </div>
                          {newFlowScope === "TARGETED" && categories.length > 0 && (
                            <div>
                              <Label className="text-xs text-[color:var(--color-muted-foreground)]">{tx("categories.title")}</Label>
                              <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-[color:var(--shell-control-border)] p-2">
                                {categories.map((cat) => (
                                  <label key={cat.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]">
                                    <input type="checkbox" checked={newFlowCategoryIds.includes(cat.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setNewFlowCategoryIds(prev => [...prev, cat.id]);
                                        else setNewFlowCategoryIds(prev => prev.filter(id => id !== cat.id));
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                    <span className="inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color || "#6366f1" }} />
                                    <span>{cat.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setShowNewFlow(false); setNewFlowScope("TARGETED"); setNewFlowCategoryIds([]); }}>{tx("actions.cancel")}</Button>
                          <Button onClick={createFlow} disabled={!newFlowName.trim() || saving === "create"}>
                            {saving === "create" ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                            {tx("flows.addNew")}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                }
              >
                {flows.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-[color:var(--color-muted-foreground)]">
                    <Layers className="size-12 opacity-30" />
                    <p className="font-medium">{tx("flows.empty")}</p>
                    <p className="text-xs">{tx("flows.emptyDesc")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flows.map((flow) => (
                      <div key={flow.id} className="rounded-2xl border border-[color:var(--shell-control-border)] bg-gradient-to-br from-[color:color-mix(in_srgb,var(--color-card)_98%,var(--color-primary))] to-[color:var(--color-card)] shadow-sm transition-all hover:shadow-md">
                        <button onClick={() => expandFlow(flow.id)} className="flex w-full items-center gap-3 p-4 text-left sm:p-5">
                          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                            {expandedFlow === flow.id ? <ChevronDown className="size-4 text-primary" /> : <ChevronRight className="size-4 text-primary" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{flow.name}</p>
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${flow.isGeneral ? "border-sky-300/70 bg-sky-500/10 text-sky-700" : "border-amber-300/70 bg-amber-500/10 text-amber-700"}`}>
                                {flow.isGeneral ? tx("flows.general") : tx("flows.targeted")}
                              </span>
                            </div>
                            <p className="text-xs text-[color:var(--color-muted-foreground)]">
                              {flow._count.steps} {tx("flows.steps")} · {flow._count.journeys} {tx("flows.activeLeads").replace("{{count}}", String(flow._count.journeys))}
                            </p>
                            {flow.isGeneral ? (
                              <p className="mt-0.5 text-xs text-sky-600">{tx("flows.generalDesc")}</p>
                            ) : flow.categories && flow.categories.length > 0 ? (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {flow.categories.map((cat) => (
                                  <span key={cat.id} className="inline-flex items-center gap-1 rounded-full border border-[color:var(--shell-control-border)] px-2 py-0.5 text-[10px]">
                                    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: cat.color || "#6366f1" }} />
                                    {cat.name}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <Switch checked={flow.isEnabled} onCheckedChange={() => toggleFlow(flow)}
                            onClick={(e) => e.stopPropagation()} />
                        </button>

                        {expandedFlow === flow.id && (
                          <div className="border-t border-[color:var(--shell-control-border)] px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
                            {/* Steps */}
                            <div className="mb-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">{tx("steps.title")}</h4>
                                <Button variant="outline" size="sm" className="h-7 rounded-full text-xs"
                                  onClick={() => setEditingStep({ flowId: flow.id, step: { delayDays: 1, delayHours: 1, delayUnit: "HOURS", content: "", stepOrder: (flow.steps?.length ?? 0) + 1 } })}>
                                  <Plus className="size-3" /> {tx("steps.add")}
                                </Button>
                              </div>

                              {(!flow.steps || flow.steps.length === 0) && !editingStep && (
                                <p className="py-4 text-center text-xs text-[color:var(--color-muted-foreground)]">{tx("steps.noSteps")}</p>
                              )}

                              {flow.steps?.map((step, i) => (
                                <div key={step.id || i}>
                                  {editingStep?.flowId === flow.id && editingStep?.step.stepOrder === step.stepOrder ? (
                                    <StepForm flowId={flow.id} step={editingStep.step}
                                      onSave={(s) => saveStep(flow.id, { ...s, id: step.id })}
                                      onCancel={() => setEditingStep(null)} />
                                  ) : (
                                    <div className="group flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-card)_60%,transparent)] p-3 transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-muted)_20%,transparent)]">
                                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">{i + 1}</span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-[color:var(--color-muted-foreground)]">
                                          {step.delayUnit === "HOURS"
                                            ? `${step.delayHours ?? 1} ${tx("steps.hours")}`
                                            : `${step.delayDays} ${step.delayDays === 1 ? tx("steps.day") : tx("steps.days")}`}
                                        </p>
                                        <p className="mt-0.5 text-sm line-clamp-2">{step.content}</p>
                                      </div>
                                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button onClick={() => setEditingStep({ flowId: flow.id, step })} className="rounded-lg p-1.5 text-[color:var(--color-muted-foreground)] hover:bg-primary/10 hover:text-primary">
                                          <Settings2 className="size-3.5" />
                                        </button>
                                        <button onClick={() => step.id && deleteStep(step.id, flow.id)} className="rounded-lg p-1.5 text-[color:var(--color-muted-foreground)] hover:bg-destructive/10 hover:text-destructive">
                                          <Trash2 className="size-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}

                              {editingStep && editingStep.flowId === flow.id && !flow.steps?.some(s => s.stepOrder === editingStep.step.stepOrder) && (
                                <StepForm flowId={flow.id} step={editingStep.step}
                                  onSave={(s) => saveStep(flow.id, s)}
                                  onCancel={() => setEditingStep(null)} />
                              )}
                            </div>

                            {/* Scope & Categories */}
                            <div className="mb-4 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)] p-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">{tx("flows.scope")}</h4>
                                <div className="flex gap-1.5">
                                  <button onClick={async () => {
                                    try {
                                      await apiClient.put(`${apiBase}/flows/${flow.id}`, { isGeneral: false }, wc());
                                      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, isGeneral: false } : f));
                                    } catch { /* */ }
                                  }}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!flow.isGeneral ? "bg-amber-500/15 text-amber-700 border border-amber-300/40" : "border border-[color:var(--shell-control-border)] text-[color:var(--color-muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]"}`}>
                                    {tx("flows.targeted")}
                                  </button>
                                  <button onClick={async () => {
                                    try {
                                      await apiClient.put(`${apiBase}/flows/${flow.id}`, { isGeneral: true }, wc());
                                      setFlows(prev => prev.map(f => f.id === flow.id ? { ...f, isGeneral: true } : f));
                                    } catch (err: any) {
                                      const msg = err?.response?.data?.message;
                                      if (msg) alert(msg);
                                    }
                                  }}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${flow.isGeneral ? "bg-sky-500/15 text-sky-700 border border-sky-300/40" : "border border-[color:var(--shell-control-border)] text-[color:var(--color-muted-foreground)] hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]"}`}>
                                    {tx("flows.general")}
                                  </button>
                                </div>
                              </div>
                              {flow.isGeneral ? (
                                <p className="mt-2 text-xs text-[color:var(--color-muted-foreground)]">{tx("flows.generalDesc")}</p>
                              ) : (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs text-[color:var(--color-muted-foreground)]">{tx("flows.targetedDesc")}</p>
                                  {categories.map((cat) => {
                                    const isLinked = flow.categories?.some(c => c.id === cat.id) || cat.triggerFlowId === flow.id;
                                    return (
                                      <label key={cat.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]">
                                        <input type="checkbox" checked={!!isLinked}
                                          onChange={async () => {
                                            try {
                                              await apiClient.put(`/whatsapp/lead-categories/${cat.id}`, {
                                                triggerFlowId: isLinked ? null : flow.id
                                              }, wc());
                                              await loadFlows();
                                              await loadCategories();
                                            } catch { /* */ }
                                          }}
                                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                        <span className="inline-block size-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color || "#6366f1" }} />
                                        <span className="flex-1">{cat.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Delete flow */}
                            <div className="flex justify-end border-t border-[color:var(--shell-control-border)] pt-3">
                              {deleteConfirm === flow.id ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-destructive">{tx("flows.deleteConfirm")}</span>
                                  <Button variant="destructive" size="sm" className="h-7 rounded-full text-xs" onClick={() => deleteFlow(flow.id)}>
                                    <Trash2 className="size-3" /> {tx("actions.delete")}
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs" onClick={() => setDeleteConfirm(null)}>
                                    {tx("actions.cancel")}
                                  </Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteConfirm(flow.id)}>
                                  <Trash2 className="size-3" /> {tx("actions.delete")}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </WhatsAppSurfaceCard>

              {/* Category Binding */}
              {categories.length > 0 && (
                <WhatsAppSurfaceCard title={tx("categories.title")} description={tx("categories.description")}>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-card)_60%,transparent)] p-3">
                        <span className="flex size-4 shrink-0 rounded-full" style={{ backgroundColor: cat.color || "#6366f1" }} />
                        <span className="min-w-0 flex-1 text-sm font-medium">{cat.name}</span>
                        <label className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                          <Switch checked={cat.autoFollowUp !== false} onCheckedChange={(v) => toggleCategory(cat.id, v)} />
                          {tx("categories.autoFollowUp")}
                        </label>
                        <div className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                          <span>{tx("categories.linkedFlow")}</span>
                          <Select value={cat.triggerFlowId || ""} onValueChange={(v) => bindCategoryFlow(cat.id, v || null)}>
                            <SelectTrigger className="h-7 min-w-[8rem] rounded-full text-xs">
                              <SelectValue placeholder={tx("categories.none")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">{tx("categories.none")}</SelectItem>
                              {flows.filter(f => f.isEnabled).map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </WhatsAppSurfaceCard>
              )}

              {/* Category Performance */}
              {categoryStats.length > 0 && (
                <WhatsAppSurfaceCard title={tx("categories.performanceTitle")} description={tx("categories.performanceDesc")}>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-[color:var(--shell-control-border)]">
                          <th className="py-2 pr-2 text-right text-xs font-medium text-[color:var(--color-muted-foreground)]">{tx("categories.title")}</th>
                          <th className="py-2 px-2 text-right text-xs font-medium text-[color:var(--color-muted-foreground)]">{tx("categories.total")}</th>
                          <th className="py-2 px-2 text-right text-xs font-medium text-[color:var(--color-muted-foreground)]">{tx("categories.enrolled")}</th>
                          <th className="py-2 px-2 text-right text-xs font-medium text-[color:var(--color-muted-foreground)]">{tx("categories.completed")}</th>
                          <th className="py-2 px-2 text-right text-xs font-medium text-[color:var(--color-muted-foreground)]">{tx("categories.replied")}</th>
                          <th className="py-2 pr-2 text-right text-xs font-medium text-[color:var(--color-muted-foreground)]">{tx("categories.replyRate")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryStats.map(cs => (
                          <tr key={cs.id} className="border-b border-[color:color-mix(in_srgb,var(--shell-control-border)_50%,transparent)]">
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="inline-block size-3 rounded-full" style={{ backgroundColor: cs.color || '#6366f1' }} />
                                <span className="font-medium text-[color:var(--color-foreground)]">{cs.name}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]" dir="ltr">{cs.totalContacts}</td>
                            <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]" dir="ltr">{cs.enrolled}</td>
                            <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]" dir="ltr">{cs.completed}</td>
                            <td className="py-2 px-2 text-[color:var(--color-muted-foreground)]" dir="ltr">{cs.replied}</td>
                            <td className="py-2 pr-2" dir="ltr">
                              <span className={`font-medium ${cs.replyRate >= 50 ? 'text-emerald-600' : cs.replyRate >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                                {cs.replyRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </WhatsAppSurfaceCard>
              )}

              {/* Business Hours (global settings) */}
              <WhatsAppSurfaceCard title={tx("businessHours.title")} description={tx("businessHours.description")}>
                {settings && (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                          <Clock className="size-3.5" /> {tx("businessHours.startHour")}
                        </Label>
                        <Select value={String(settings.businessHourStart ?? "")}
                          onValueChange={(v) => setSettings({ ...settings, businessHourStart: v ? Number(v) : null })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder={tx("businessHours.anyTime")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{tx("businessHours.anyTime")}</SelectItem>
                            {WA_HOURS.map(h => <SelectItem key={h} value={String(h)}>{`${h}`.padStart(2, "0")}:00</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                          <Clock className="size-3.5" /> {tx("businessHours.endHour")}
                        </Label>
                        <Select value={String(settings.businessHourEnd ?? "")}
                          onValueChange={(v) => setSettings({ ...settings, businessHourEnd: v ? Number(v) : null })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder={tx("businessHours.anyTime")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{tx("businessHours.anyTime")}</SelectItem>
                            {WA_HOURS.map(h => <SelectItem key={h} value={String(h)}>{`${h}`.padStart(2, "0")}:00</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="flex items-center gap-1.5 text-xs text-[color:var(--color-muted-foreground)]">
                          <Globe className="size-3.5" /> {tx("businessHours.timezone")}
                        </Label>
                        <Select value={settings.timezone || "UTC"}
                          onValueChange={(v) => setSettings({ ...settings, timezone: v || "UTC" })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-muted)_40%,transparent)] p-3">
                      <span className="text-sm">{settings.isEnabled ? tx("status.active") : tx("status.paused")}</span>
                      <div className="flex items-center gap-3">
                        <Switch checked={settings.isEnabled}
                          onCheckedChange={(v) => setSettings({ ...settings, isEnabled: v })} />
                        <Button size="sm" className="rounded-full" onClick={saveSettings} disabled={saving === "settings"}>
                          {saving === "settings" ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                          {tx("actions.save")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </WhatsAppSurfaceCard>

              {/* Hints */}
              <WhatsAppSurfaceCard title={tx("hints.title")}>
                <ul className="space-y-2 text-sm text-[color:var(--color-muted-foreground)]">
                  {[
                    { icon: Clock, color: "text-amber-500", key: "tip1" },
                    { icon: MessageSquare, color: "text-sky-500", key: "tip2" },
                    { icon: Sparkles, color: "text-violet-500", key: "tip3" },
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--color-card)_60%,transparent)] p-3">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5", tip.color)}>
                        <tip.icon className="size-4" />
                      </span>
                      <span>{tx(`hints.${tip.key}`)}</span>
                    </li>
                  ))}
                </ul>
              </WhatsAppSurfaceCard>
            </TabsContent>

            {/* ── Monitoring Tab ── */}
            <TabsContent value="monitoring">
              <WhatsAppSurfaceCard
                title={tx("tabs.monitoring")}
                action={
                  <div className="flex gap-2">
                    <Select value={monFilter.status} onValueChange={(v) => setMonFilter(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="h-9 min-w-[8rem] rounded-full"><SelectValue placeholder={tx("monitoring.allStatuses")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{tx("monitoring.allStatuses")}</SelectItem>
                        {STATUSES.map(s => (
                          <SelectItem key={s} value={s}>{tx(`monitoring.${s.toLowerCase()}`) || s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={monFilter.flowId} onValueChange={(v) => setMonFilter(p => ({ ...p, flowId: v }))}>
                      <SelectTrigger className="h-9 min-w-[8rem] rounded-full"><SelectValue placeholder={tx("monitoring.allFlows")} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{tx("monitoring.allFlows")}</SelectItem>
                        {flows.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                }
              >
                {/* Journeys table */}
                {journeys.length === 0 && enrollments.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12 text-[color:var(--color-muted-foreground)]">
                    <Users className="size-12 opacity-30" />
                    <p className="text-sm font-medium">{tx("monitoring.empty")}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">{tx("monitoring.customer")}</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">{tx("monitoring.flow")}</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">{tx("monitoring.status")}</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">{tx("monitoring.currentStep")}</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-[color:var(--color-muted-foreground)]">{tx("monitoring.nextMessage")}</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Journeys (from flows) */}
                        {journeys.filter(j => !monFilter.flowId || j.flowId === monFilter.flowId).map((j) => {
                          const cfg = statusCfg[j.status] || statusCfg.CANCELLED;
                          const name = j.customer.firstName ? `${j.customer.firstName} ${j.customer.lastName || ""}` : j.customer.phone;
                          const totalSteps = j.flow.steps?.length || 1;
                          return (
                            <TableRow key={j.id} className="hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">{name.charAt(0).toUpperCase()}</span>
                                  <div><p className="font-medium">{name}</p></div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{j.flow.name}</TableCell>
                              <TableCell>
                                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium", cfg.bg)}>
                                  <span className={cn("mr-1.5 inline-block size-1.5 rounded-full", cfg.dot)} />
                                  {tx(`monitoring.${j.status.toLowerCase()}`) || j.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{tx("monitoring.step").replace("{{current}}", String(j.currentStep + 1)).replace("{{total}}", String(totalSteps))}</TableCell>
                              <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">{formatDate(j.nextSendAt)}</TableCell>
                              <TableCell className="text-right" />
                            </TableRow>
                          );
                        })}
                        {/* Legacy enrollments */}
                        {enrollments.map((e) => {
                          const cfg = statusCfg[e.status] || statusCfg.CANCELLED;
                          const name = e.customer.firstName ? `${e.customer.firstName} ${e.customer.lastName || ""}` : e.whatsAppContact.name || e.whatsAppContact.pushName || e.whatsAppContact.phoneNumber;
                          return (
                            <TableRow key={e.id} className="hover:bg-[color:color-mix(in_srgb,var(--color-muted)_30%,transparent)]">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">{name.charAt(0).toUpperCase()}</span>
                                  <div><p className="font-medium">{name}</p><p className="text-xs text-[color:var(--color-muted-foreground)]">{e.whatsAppContact.phoneNumber}</p></div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">—</TableCell>
                              <TableCell>
                                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium", cfg.bg)}>
                                  <span className={cn("mr-1.5 inline-block size-1.5 rounded-full", cfg.dot)} />
                                  {tx(`monitoring.${e.status.toLowerCase()}`) || e.status}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{e.status === "ACTIVE" ? `${e.currentStep + 1}/${e.totalSteps}` : "-"}</TableCell>
                              <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">{formatDate(e.nextSendAt)}</TableCell>
                              <TableCell className="text-right">
                                {e.status === "ACTIVE" && (
                                  <Button variant="outline" size="sm" className="h-7 rounded-full border-red-500/20 text-red-500 hover:bg-red-500/10"
                                    onClick={() => cancelEnrollment(e.id)}>
                                    {tx("monitoring.cancel")}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
