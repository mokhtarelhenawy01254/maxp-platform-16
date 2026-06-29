import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  ExternalLink,
  UserPlus,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  Plus,
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

interface ToolDefinition { name: string; description: string; sideEffects: "read" | "write"; requiresApproval: boolean; }
interface SkillDefinition { id: string; displayName: string; version?: string; description?: string; allowedTools: string[]; requiresHumanApproval?: boolean; maxToolCount?: number; skillMd?: string; group?: string; }

const SKILL_GROUP_LABELS: Record<string, string> = {
  sales: "المبيعات", marketing: "التسويق", support: "الدعم",
  product: "المنتجات", customer: "العملاء", management: "الإدارة",
  inventory: "المخزون", order: "الطلبات", pricing: "التسعير",
  store: "المتجر", other: "أخرى",
};
interface AgentDefinition { id: string; name: string; role: string; icon: string; status: string; allowedSkills?: string[]; allowedTools?: string[]; }

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

function AssignSkillDialog({ open, skillId, agents, onClose, onSaved, companyId }: { open: boolean; skillId: string; agents: AgentDefinition[]; onClose: () => void; onSaved: () => void; companyId?: string }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setSelected(new Set(agents.filter((a) => a.allowedSkills?.includes(skillId)).map((a) => a.id))); setSearch(""); setError(null); } }, [open, skillId, agents]);
  const filtered = useMemo(() => { if (!search.trim()) return agents; const q = search.toLowerCase(); return agents.filter((a) => [a.name, a.role, a.id].some((v) => String(v).toLowerCase().includes(q))); }, [agents, search]);
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((a) => a.id))); };
  const handleSave = async () => { setSaving(true); setError(null); try { await Promise.all(agents.map(async (agent) => { const has = agent.allowedSkills?.includes(skillId); const add = selected.has(agent.id); if (has === add) return; const ns = add ? [...(agent.allowedSkills || []), skillId] : (agent.allowedSkills || []).filter((s) => s !== skillId); return apiPut(`/agent/agents/${agent.id}/files`, { name: agent.name, role: agent.role, allowedTools: agent.allowedTools || [], allowedSkills: ns }, companyId); })); onSaved(); onClose(); } catch (err: any) { setError(err.message || t("common.saveError")); } finally { setSaving(false); } };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle><div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><span>{t("agentSkills.dialogAssignTitle")}</span></div></DialogTitle>
          <DialogDescription className="font-mono text-xs">{skillId}</DialogDescription>
        </DialogHeader>
        {saving && <div className="h-0.5 w-full animate-pulse bg-primary" />}
        {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="relative mb-3"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("agentSkills.dialogSearch")} value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" /></div>
        <div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{t("agentSkills.dialogSelected", { selected: selected.size, total: filtered.length })}</span><Button size="sm" variant="link" onClick={toggleAll}>{selected.size === filtered.length ? t("agentSkills.dialogDeselectAll") : t("agentSkills.dialogSelectAll")}</Button></div>
        <div className="max-h-[360px] space-y-1 overflow-auto">
          {filtered.map((agent) => { const checked = selected.has(agent.id); const already = agent.allowedSkills?.includes(skillId); return (
            <div key={agent.id} onClick={() => toggle(agent.id)} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all", checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
              <div className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{checked && <Check className="size-3" />}</div>
              <span className="text-lg">{agent.icon || "🤖"}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{agent.name}</p><span className="text-xs text-muted-foreground">{agent.role}</span></div>
              {already && !checked && <Badge variant="outline" className="h-4 text-[0.6rem]">{t("agentSkills.dialogCurrent")}</Badge>}
            </div>); })}
          {filtered.length === 0 && <p className="py-4 text-center text-muted-foreground">{t("agentSkills.dialogNoResults")}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button><Button onClick={handleSave} disabled={saving}>{saving ? <LoadingSpinner size="sm" /> : <Check className="size-4" />}{saving ? t("agentSkills.dialogSaving") : t("common.save")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSkillDialog({ open, tools, onClose, onSaved, companyId }: { open: boolean; tools: ToolDefinition[]; onClose: () => void; onSaved: () => void; companyId?: string }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolSearch, setToolSearch] = useState("");

  useEffect(() => { if (open) { setName(""); setDescription(""); setInstructions(""); setSelectedTools(new Set()); setPriority(0); setError(null); setToolSearch(""); } }, [open]);

  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return tools;
    const q = toolSearch.toLowerCase();
    return tools.filter((t) => [t.name, t.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [tools, toolSearch]);

  const toggleTool = (tn: string) => setSelectedTools((p) => { const n = new Set(p); if (n.has(tn)) n.delete(tn); else n.add(tn); return n; });

  const handleCreate = async () => {
    if (!name.trim()) { setError(t("agentSkills.errorNameRequired")); return; }
    if (!instructions.trim()) { setError(t("agentSkills.errorInstructionsRequired")); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch(buildApiUrl(cq("agent/skills", companyId)), {
        method: "POST",
        headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          tools: Array.from(selectedTools),
          priority,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.error || t("agentSkills.errorCreateFailed"));
      toast.success(t("common.saved"));
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || t("common.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle><div className="flex items-center gap-2"><Plus className="size-5 text-primary" /><span>{t("agentSkills.dialogCreateTitle")}</span></div></DialogTitle>
        </DialogHeader>
        {saving && <div className="h-0.5 w-full animate-pulse bg-primary" />}
        {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-bold">{t("agentSkills.dialogName")}</label>
            <Input placeholder={t("agentSkills.dialogNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">{t("agentSkills.dialogDescription")}</label>
            <Input placeholder={t("agentSkills.dialogDescriptionPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">{t("agentSkills.dialogInstructions")}</label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder={t("agentSkills.dialogInstructionsPlaceholder")}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">{t("agentSkills.dialogTools")}</label>
            <div className="relative mb-2"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("agentSkills.search")} value={toolSearch} onChange={(e) => setToolSearch(e.target.value)} className="pr-9" /></div>
            <div className="max-h-[140px] space-y-1 overflow-auto rounded-xl border p-2">
              {filteredTools.map((tool) => { const checked = selectedTools.has(tool.name); return (
                <div key={tool.name} onClick={() => toggleTool(tool.name)} className={cn("flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors", checked ? "bg-primary/10 text-primary" : "hover:bg-muted")}>
                  <div className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{checked && <Check className="size-3" />}</div>
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{tool.name}</span>
                </div>); })}
              {filteredTools.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">{t("agentSkills.dialogNoResults")}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold">{t("agentSkills.dialogPriority")}</label>
            <Input type="number" min={0} placeholder={t("agentSkills.dialogPriorityPlaceholder")} value={priority} onChange={(e) => setPriority(Number(e.target.value) || 0)} className="w-24" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : <Plus className="size-4" />}
            {saving ? t("agentSkills.dialogCreating") : t("agentSkills.createSkill")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentSkillsPage({ companyId }: { companyId?: string } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [assignSkill, setAssignSkill] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  const allGroups = useMemo(() => {
    const groups = [...new Set(skills.map((s) => s.group).filter(Boolean))] as string[];
    return groups.sort((a, b) => (SKILL_GROUP_LABELS[a] || a).localeCompare(SKILL_GROUP_LABELS[b] || b, "ar"));
  }, [skills]);
  const filteredSkills = useMemo(() => {
    let list = skills;
    const n = query.trim().toLowerCase();
    if (n) list = list.filter((s) => [s.id, s.displayName, s.description, ...(s.allowedTools || [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(n)));
    if (selectedGroup) list = list.filter((s) => s.group === selectedGroup);
    return list;
  }, [skills, query, selectedGroup]);
  const loadAll = useCallback(async () => { setLoading(true); setError(null); try { const [sd, td, ad] = await Promise.all([apiRequest<{ success: true; skills: SkillDefinition[] }>("agent/skills", companyId), apiRequest<{ success: true; tools: ToolDefinition[] }>("agent/tools", companyId), companyId ? apiRequest<{ success: true; agents: AgentDefinition[] }>("agent-manager/agents", companyId) : { success: true as const, agents: [] as AgentDefinition[] }]); setSkills(sd.skills || []); setTools(td.tools || []); setAgents(ad.agents || []); } catch (err: any) { setError(err.message || t("common.loadError")); } finally { setLoading(false); } }, [companyId]);
  useEffect(() => { loadAll(); }, [loadAll]);
  const skillAgentCount = useMemo(() => { const m = new Map<string, number>(); for (const a of agents) { for (const sid of a.allowedSkills || []) m.set(sid, (m.get(sid) || 0) + 1); } return m; }, [agents]);

  return (
    <div dir="rtl" className="min-h-[calc(100vh-64px)] bg-background p-4 md:p-6">
      <AdminPageHeader
        title={t("agentSkills.title")}
        subtitle={t("agentSkills.subtitle")}
        icon={<Sparkles className="size-7" />}
        actions={<>
          <Button onClick={() => setCreateOpen(true)}><Plus className="size-4" />{t("agentSkills.createSkill")}</Button>
          <div className="relative"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t("agentSkills.search")} value={query} onChange={(e) => setQuery(e.target.value)} className="w-56 pr-9" /></div>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={loadAll}>{loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-4" />}</Button></TooltipTrigger><TooltipContent>{t("agentSkills.refresh")}</TooltipContent></Tooltip></TooltipProvider>
        </>}
      />

      {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-card"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="flex gap-4">
          {allGroups.length > 0 && (
            <aside className="hidden w-44 shrink-0 md:block">
              <div className="sticky top-20 space-y-1 rounded-xl border bg-card p-2">
                <button onClick={() => setSelectedGroup(null)} className={`w-full rounded-lg px-3 py-1.5 text-right text-sm transition-colors ${!selectedGroup ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>الكل ({skills.length})</button>
                {allGroups.map((g) => (
                  <button key={g} onClick={() => setSelectedGroup(g)} className={`w-full rounded-lg px-3 py-1.5 text-right text-sm transition-colors ${selectedGroup === g ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{SKILL_GROUP_LABELS[g] || g} ({skills.filter((s) => s.group === g).length})</button>
                ))}
              </div>
            </aside>
          )}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredSkills.map((skill) => { const ac = skillAgentCount.get(skill.id) || 0; return (
                <div key={skill.id} className="flex flex-col rounded-xl border bg-card p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2"><Sparkles className="size-5 shrink-0 text-primary" /><h3 className="truncate text-sm font-black">{skill.displayName || skill.id}</h3></div>
                    <div className="flex shrink-0 gap-1"><Badge variant="outline" className="h-5 text-[0.65rem]">v{skill.version || "1"}</Badge>{ac > 0 && <Badge variant="outline" className="h-5 text-[0.65rem] text-green-600">{ac} {t("agentSkills.agents")}</Badge>}</div>
                  </div>
                  <p className="mb-3 min-h-[42px] text-sm text-muted-foreground">{skill.description || t("agentSkills.noDescription")}</p>
                  <div className="mb-4 flex flex-wrap gap-2">{(skill.allowedTools || []).map((t) => (<Badge key={t} variant="outline" className="h-5 gap-1 text-[0.6rem]"><Zap className="size-3" />{t}</Badge>))}</div>
                  <div className="mt-auto flex gap-2"><Button onClick={() => navigate(`/super-admin/ai-hub/skills/${skill.id}`, { state: { skill, tools, agents, companyId } })} className="flex-1"><ExternalLink className="size-4" />{t("agentSkills.details")}</Button><Button variant="outline" onClick={() => setAssignSkill(skill.id)} className="flex-1"><UserPlus className="size-4" />{t("agentSkills.assignToAgent")}</Button></div>
                </div>); })}
            </div>
            {filteredSkills.length === 0 && <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-card"><p className="text-muted-foreground">{t("agentSkills.noDescription")}</p></div>}
          </div>
        </div>
      )}

      <AssignSkillDialog open={!!assignSkill} skillId={assignSkill || ""} agents={agents} onClose={() => setAssignSkill(null)} onSaved={loadAll} companyId={companyId} />
      <CreateSkillDialog open={createOpen} tools={tools} onClose={() => setCreateOpen(false)} onSaved={loadAll} companyId={companyId} />
    </div>
  );
}
