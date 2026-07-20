import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Zap,
  ChevronDown,
  ChevronLeft,
  RefreshCw,
  Search,
  UserPlus,
  Lock,
  Unlock,
  Shield,
  Check,
  AlertCircle,
  Wrench,
  Pencil,
  Save,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/Admin";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import i18n from "../../i18n";

interface ToolDefinition { name: string; description: string; sideEffects: "read" | "write"; requiresApproval: boolean; approvalMode?: string; source?: string; runtimeSource?: string; aliases?: string[]; companyScoped?: boolean; group?: string; }

const GROUP_LABEL_KEYS: Record<string, string> = {
  product: "agentTools.groups.product", order: "agentTools.groups.order",
  customer: "agentTools.groups.customer", inventory: "agentTools.groups.inventory",
  sales: "agentTools.groups.sales", shipping: "agentTools.groups.shipping",
  competitor: "agentTools.groups.competitor", governance: "agentTools.groups.governance",
  knowledge_base: "agentTools.groups.knowledge_base", facebook: "agentTools.groups.facebook",
  hr: "agentTools.groups.hr", smart_seller: "agentTools.groups.smart_seller",
  agents: "agentTools.groups.agents", audit: "agentTools.groups.audit",
  management: "agentTools.groups.management", system: "agentTools.groups.system",
  mcp: "agentTools.groups.mcp",
};
const groupLabel = (g: string) => i18n.t(GROUP_LABEL_KEYS[g] || `agentTools.groups.${g}`) || g;
interface AgentToolInfo { id: string; name: string; role: string; icon: string; status: string; autonomy?: string; }
interface AgentDefinition { id: string; name: string; role: string; icon: string; status: string; allowedTools: string[]; toolAutonomy?: Record<string, string>; }

const cq = (path: string, companyId?: string) =>
  companyId ? `${path}${path.includes("?") ? "&" : "?"}companyId=${encodeURIComponent(companyId)}` : path;
const apiRequest = async <T,>(path: string, companyId?: string): Promise<T> => {
  const response = await fetch(buildApiUrl(cq(path, companyId)), { headers: tokenManager.createAuthHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  return data as T;
};
const apiPut = async <T,>(path: string, body: unknown, companyId?: string): Promise<T> => {
  const response = await fetch(buildApiUrl(cq(path, companyId)), { method: "PUT", headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  return data as T;
};

function AssignToolDialog({ open, toolName, agents, onClose, onSaved, companyId }: { open: boolean; toolName: string; agents: AgentDefinition[]; onClose: () => void; onSaved: () => void; companyId?: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setSelected(new Set(agents.filter((a) => a.allowedTools?.includes(toolName)).map((a) => a.id))); setSearch(""); setError(null); } }, [open, toolName, agents]);
  const filtered = useMemo(() => { if (!search.trim()) return agents; const q = search.toLowerCase(); return agents.filter((a) => [a.name, a.role, a.id].some((v) => String(v).toLowerCase().includes(q))); }, [agents, search]);
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((a) => a.id))); };
  const handleSave = async () => { setSaving(true); setError(null); try { await Promise.all(agents.map(async (agent) => { const has = agent.allowedTools?.includes(toolName); const add = selected.has(agent.id); if (has === add) return; const nt = add ? [...(agent.allowedTools || []), toolName] : (agent.allowedTools || []).filter((t) => t !== toolName); return apiPut(`/agent/agents/${agent.id}/files`, { name: agent.name, role: agent.role, allowedTools: nt, allowedSkills: [], toolAutonomy: { ...(agent.toolAutonomy || {}), ...(add ? { [toolName]: "auto" } : {}) } }, companyId); })); onSaved(); onClose(); } catch (err: any) { setError(err.message || i18n.t("common.saveError")); } finally { setSaving(false); } };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle><div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><span>{i18n.t("agentTools.dialogAssignTitle")}</span></div></DialogTitle>
          <DialogDescription className="font-mono text-xs">{toolName}</DialogDescription>
        </DialogHeader>
        {saving && <div className="h-0.5 w-full animate-pulse bg-primary" />}
        {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="relative mb-3"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={i18n.t("agentTools.dialogSearch")} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" /></div>
        <div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{i18n.t("agentTools.dialogSelected", { selected: selected.size, total: filtered.length })}</span><Button size="sm" variant="link" onClick={toggleAll}>{selected.size === filtered.length ? i18n.t("agentTools.dialogDeselectAll") : i18n.t("agentTools.dialogSelectAll")}</Button></div>
        <div className="max-h-[360px] space-y-1 overflow-auto">{filtered.map((agent) => { const checked = selected.has(agent.id); const already = agent.allowedTools?.includes(toolName); return (<div key={agent.id} onClick={() => toggle(agent.id)} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all", checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}><div className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{checked && <Check className="size-3" />}</div><span className="text-lg">{agent.icon || "🤖"}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{agent.name}</p><span className="text-xs text-muted-foreground">{agent.role}</span></div>{already && !checked && <Badge variant="outline" className="h-4 text-[0.6rem]">{i18n.t("agentTools.dialogCurrent")}</Badge>}</div>); })}</div>
        <DialogFooter><Button variant="outline" onClick={onClose} disabled={saving}>{i18n.t("common.cancel")}</Button><Button onClick={handleSave} disabled={saving}>{saving ? <LoadingSpinner size="sm" /> : <Check className="size-4" />}{saving ? i18n.t("agentTools.dialogSaving") : i18n.t("common.save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentToolsPage({ companyId }: { companyId?: string } = {}) {
  const navigate = useNavigate();
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [query, setQuery] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [assignTool, setAssignTool] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const toolToAgents = useMemo(() => {
    const alias = new Map<string, string>(); for (const t of tools) { alias.set(t.name, t.name); for (const a of t.aliases || []) alias.set(a, t.name); }
    const m = new Map<string, AgentToolInfo[]>(); for (const a of agents) { for (const tn of a.allowedTools || []) { const cn = alias.get(tn) || tn; if (!m.has(cn)) m.set(cn, []); m.get(cn)!.push({ id: a.id, name: a.name, role: a.role, icon: a.icon, status: a.status, autonomy: a.toolAutonomy?.[tn] || "auto" }); } }
    return m;
  }, [agents, tools]);
  const allGroups = useMemo(() => {
    const groups = [...new Set(tools.map((t) => t.group).filter(Boolean))] as string[];
    return groups.sort((a, b) => groupLabel(a).localeCompare(groupLabel(b), "ar"));
  }, [tools]);
  const filteredTools = useMemo(() => {
    let list = tools;
    const n = query.trim().toLowerCase();
    if (n) list = list.filter((t) => { const an = (toolToAgents.get(t.name) || []).map((a) => a.name).join(" "); return [t.name, t.description, t.sideEffects, an].filter(Boolean).some((v) => String(v).toLowerCase().includes(n)); });
    if (selectedGroup) list = list.filter((t) => t.group === selectedGroup);
    return list;
  }, [tools, query, toolToAgents, selectedGroup]);
  const loadAll = useCallback(async () => { setLoading(true); setError(null); try { const [td, ad] = await Promise.all([apiRequest<{ success: true; tools: ToolDefinition[] }>("agent/tools", companyId), companyId ? apiRequest<{ success: true; agents: AgentDefinition[] }>("agent-manager/agents", companyId) : { success: true as const, agents: [] as AgentDefinition[] }]); setTools(td.tools || []); setAgents(ad.agents || []); } catch (err: any) { setError(err.message || i18n.t("common.loadError")); } finally { setLoading(false); } }, [companyId]);
  useEffect(() => { loadAll(); }, [loadAll]);
  const readT = filteredTools.filter((t) => !t.sideEffects || t.sideEffects === "read");
  const writeT = filteredTools.filter((t) => t.sideEffects === "write");

  function ToolCard({ tool }: { tool: ToolDefinition }) {
    const isExpanded = expandedTool === tool.name;
    const [editing, setEditing] = useState(false);
    const [editDesc, setEditDesc] = useState(tool.description || "");
    const [saving, setSaving] = useState(false);
    const agentList = toolToAgents.get(tool.name) || [];
    const isWrite = tool.sideEffects === "write";
    const sourceLabel = tool.source === "mcp" ? i18n.t("agentTools.sources.mcp") : i18n.t("agentTools.sources.python");

    const handleSaveDesc = async () => {
      setSaving(true);
      try {
        const res = await fetch(buildApiUrl(cq(`agent/tools/${encodeURIComponent(tool.name)}`, companyId)), {
          method: "PUT",
          headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ description: editDesc.trim() }),
        });
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.error || "Save failed");
        setEditing(false);
        toast.success(i18n.t("common.saved") || "Saved");
        loadAll();
      } catch (err: any) {
        toast.error(err.message || i18n.t("common.saveError"));
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className={cn("rounded-xl border p-4 transition-all hover:border-primary", isWrite ? "border-amber-600/50 bg-amber-500/[0.03]" : "border-border")}>
        <div className="flex gap-3">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-white", isWrite ? "bg-amber-600" : "bg-primary")}><Zap className="size-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1">
              <span className="font-mono text-sm font-black">{tool.name}</span>
              <Badge variant="outline" className={cn("h-5 gap-1 text-[0.65rem]", isWrite ? "border-amber-600 text-amber-600" : "border-primary text-primary")}>{isWrite ? <Lock className="size-3" /> : <Unlock className="size-3" />}{isWrite ? i18n.t("agentTools.sideEffects.write") : i18n.t("agentTools.sideEffects.read")}</Badge>
              {tool.requiresApproval && <Badge variant="outline" className="h-5 gap-1 text-[0.65rem] border-amber-600 text-amber-600"><Shield className="size-3" />{i18n.t("agentTools.needsApproval")}</Badge>}
              <Badge variant="outline" className="h-5 text-[0.65rem]">{sourceLabel}</Badge>
              {agentList.length > 0 && <Badge variant="outline" className="h-5 text-[0.65rem] text-green-600">{agentList.length} {i18n.t("agentTools.agents")}</Badge>}
            </div>
            {editing ? (
              <div className="mb-2 space-y-2">
                <textarea
                  className="w-full rounded-lg border bg-background p-2 text-sm"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  dir="auto"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="default" onClick={handleSaveDesc} disabled={saving}>
                    {saving ? <LoadingSpinner size="sm" /> : <Save className="size-3" />}{saving ? i18n.t("common.saving") : i18n.t("common.save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditDesc(tool.description || ""); }}>
                    <X className="size-3" />{i18n.t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mb-2 text-sm text-muted-foreground">
                {tool.description || i18n.t("agentTools.noDescription")}
                <Button size="sm" variant="ghost" onClick={() => { setEditing(true); setEditDesc(tool.description || ""); }} className="mr-1 h-5 px-1 text-muted-foreground hover:text-foreground">
                  <Pencil className="size-3" />
                </Button>
              </p>
            )}
            <div className="mb-2"><Button size="sm" variant="outline" onClick={() => setAssignTool(tool.name)} className="h-7 text-[0.72rem]"><UserPlus className="size-3" />{i18n.t("agentTools.assignToAgent")}</Button></div>
            {agentList.length > 0 ? (<><Button variant="link" size="sm" onClick={() => setExpandedTool(isExpanded ? null : tool.name)} className="h-6 text-xs text-muted-foreground">{isExpanded ? <ChevronDown className="size-3" /> : <ChevronLeft className="size-3" />}{i18n.t("agentTools.agentsUsing", { count: agentList.length })}</Button>{isExpanded && <div className="mt-2 space-y-1">{agentList.map((agent) => (<div key={agent.id} className="flex cursor-pointer items-center justify-between rounded-xl border p-2 transition-colors hover:bg-muted" onClick={() => navigate(`/admin/agent-profiles?agent=${agent.id}`)}><div className="flex items-center gap-2"><span className="text-base">{agent.icon || "🤖"}</span><div><p className="text-sm font-bold">{agent.name}</p><span className="text-xs text-muted-foreground">{agent.role}</span></div></div><Badge variant="outline" className={cn("h-4 text-[0.6rem]", agent.autonomy === "blocked" ? "border-destructive text-destructive" : agent.autonomy === "approval" ? "border-amber-600 text-amber-600" : "border-green-600 text-green-600")}>{agent.autonomy === "blocked" ? i18n.t("agentTools.autonomy.blocked") : agent.autonomy === "approval" ? i18n.t("agentTools.autonomy.approval") : i18n.t("agentTools.autonomy.auto")}</Badge></div>))}</div>}</>) : <p className="text-xs italic text-muted-foreground">{i18n.t("agentTools.noAgents")}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-[calc(100dvh-64px)] bg-background p-4 md:p-6">
      <AdminPageHeader
        title={i18n.t("agentTools.title")}
        subtitle={i18n.t("agentTools.subtitle")}
        icon={<Wrench className="size-7" />}
        actions={<>
          <div className="relative min-w-[280px]"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={i18n.t("agentTools.search")} value={query} onChange={(e) => setQuery(e.target.value)} className="pr-9" /></div>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={loadAll}>{loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-4" />}</Button></TooltipTrigger><TooltipContent>{i18n.t("agentTools.refresh")}</TooltipContent></Tooltip></TooltipProvider>
        </>}
      />

      {!loading && <div className="mb-6 flex flex-wrap gap-3">
        <div className="rounded-xl border bg-card p-3"><span className="text-xs text-muted-foreground">{i18n.t("agentTools.totalTools")}</span><p className="text-lg font-black">{tools.length}</p></div>
        <div className="rounded-xl border bg-card p-3"><span className="text-xs text-muted-foreground">{i18n.t("agentTools.read")}</span><p className="text-lg font-black text-primary">{tools.filter((t) => !t.sideEffects || t.sideEffects === "read").length}</p></div>
        <div className="rounded-xl border bg-card p-3"><span className="text-xs text-muted-foreground">{i18n.t("agentTools.write")}</span><p className="text-lg font-black text-amber-600">{tools.filter((t) => t.sideEffects === "write").length}</p></div>
        <div className="rounded-xl border bg-card p-3"><span className="text-xs text-muted-foreground">{i18n.t("agentTools.agents")}</span><p className="text-lg font-black">{agents.length}</p></div>
      </div>}

      {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex gap-4">
        {allGroups.length > 0 && (
          <aside className="hidden w-44 shrink-0 md:block">
            <div className="sticky top-20 space-y-1 rounded-xl border bg-card p-2">
              <button onClick={() => setSelectedGroup(null)} className={`w-full rounded-lg px-3 py-1.5 text-right text-sm transition-colors ${!selectedGroup ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i18n.t("common.all")} ({tools.length})</button>
              {allGroups.map((g) => (
                <button key={g} onClick={() => setSelectedGroup(g)} className={`w-full rounded-lg px-3 py-1.5 text-right text-sm transition-colors ${selectedGroup === g ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{groupLabel(g)} ({tools.filter((t) => t.group === g).length})</button>
              ))}
            </div>
          </aside>
        )}
        <div className="flex-1 min-w-0">
          {loading ? <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-card"><LoadingSpinner size="lg" /></div>
          : filteredTools.length === 0 ? <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-card"><p className="text-muted-foreground">{i18n.t("agentTools.dialogNoResults", { query })}</p></div>
          : <div className="flex flex-col gap-6">
              {readT.length > 0 && <div><div className="mb-3 flex items-center gap-2"><Unlock className="size-5 text-primary" /><h2 className="text-base font-black">{i18n.t("agentTools.readSection")}</h2><Badge variant="outline">{readT.length}</Badge></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{readT.map((t) => (<ToolCard key={t.name} tool={t} />))}</div></div>}
              {writeT.length > 0 && <div><div className="mb-3 flex items-center gap-2"><Lock className="size-5 text-amber-600" /><h2 className="text-base font-black">{i18n.t("agentTools.writeSection")}</h2><Badge variant="outline" className="border-amber-600 text-amber-600">{writeT.length}</Badge></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{writeT.map((t) => (<ToolCard key={t.name} tool={t} />))}</div></div>}
            </div>}
        </div>
      </div>

      <AssignToolDialog open={!!assignTool} toolName={assignTool || ""} agents={agents} onClose={() => setAssignTool(null)} onSaved={loadAll} companyId={companyId} />
    </div>
  );
}
