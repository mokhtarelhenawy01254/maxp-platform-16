import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  FileText,
  ExternalLink,
  UserPlus,
  RefreshCw,
  Search,
  Shield,
  Check,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
interface SkillDefinition { id: string; displayName: string; version?: string; description?: string; allowedTools: string[]; requiresHumanApproval?: boolean; maxToolCount?: number; skillMd?: string; }
interface AgentDefinition { id: string; name: string; role: string; icon: string; status: string; allowedSkills?: string[]; allowedTools?: string[]; }

const apiRequest = async <T,>(path: string): Promise<T> => {
  const response = await fetch(buildApiUrl(path), { headers: tokenManager.createAuthHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  return data as T;
};
const apiPut = async <T,>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(buildApiUrl(path), { method: "PUT", headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  return data as T;
};

function AssignSkillDialog({ open, skillId, agents, onClose, onSaved }: { open: boolean; skillId: string; agents: AgentDefinition[]; onClose: () => void; onSaved: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) { setSelected(new Set(agents.filter((a) => a.allowedSkills?.includes(skillId)).map((a) => a.id))); setSearch(""); setError(null); } }, [open, skillId, agents]);
  const filtered = useMemo(() => { if (!search.trim()) return agents; const q = search.toLowerCase(); return agents.filter((a) => [a.name, a.role, a.id].some((v) => String(v).toLowerCase().includes(q))); }, [agents, search]);
  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((a) => a.id))); };
  const handleSave = async () => { setSaving(true); setError(null); try { await Promise.all(agents.map(async (agent) => { const has = agent.allowedSkills?.includes(skillId); const add = selected.has(agent.id); if (has === add) return; const ns = add ? [...(agent.allowedSkills || []), skillId] : (agent.allowedSkills || []).filter((s) => s !== skillId); return apiPut(`/agent/agents/${agent.id}/files`, { name: agent.name, role: agent.role, allowedTools: agent.allowedTools || [], allowedSkills: ns }); })); onSaved(); onClose(); } catch (err: any) { setError(err.message || "فشل الحفظ"); } finally { setSaving(false); } };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle><div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><span>تعيين المهارة لوكيل</span></div></DialogTitle>
          <DialogDescription className="font-mono text-xs">{skillId}</DialogDescription>
        </DialogHeader>
        {saving && <div className="h-0.5 w-full animate-pulse bg-primary" />}
        {error && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="relative mb-3"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="بحث في الوكلاء..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" /></div>
        <div className="mb-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{selected.size} / {filtered.length} محدد</span><Button size="sm" variant="link" onClick={toggleAll}>{selected.size === filtered.length ? "إلغاء تحديد الكل" : "تحديد الكل"}</Button></div>
        <div className="max-h-[360px] space-y-1 overflow-auto">
          {filtered.map((agent) => { const checked = selected.has(agent.id); const already = agent.allowedSkills?.includes(skillId); return (
            <div key={agent.id} onClick={() => toggle(agent.id)} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 transition-all", checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}>
              <div className={cn("flex size-4 shrink-0 items-center justify-center rounded-sm border", checked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>{checked && <Check className="size-3" />}</div>
              <span className="text-lg">{agent.icon || "🤖"}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{agent.name}</p><span className="text-xs text-muted-foreground">{agent.role}</span></div>
              {already && !checked && <Badge variant="outline" className="h-4 text-[0.6rem]">حالي</Badge>}
            </div>); })}
          {filtered.length === 0 && <p className="py-4 text-center text-muted-foreground">لا توجد نتائج</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} disabled={saving}>إلغاء</Button><Button onClick={handleSave} disabled={saving}>{saving ? <LoadingSpinner size="sm" /> : <Check className="size-4" />}{saving ? "جارٍ الحفظ..." : "حفظ"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AgentSkillsPage() {
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [selected, setSelected] = useState<SkillDefinition | null>(null);
  const [assignSkill, setAssignSkill] = useState<string | null>(null);
  const [query, setQuery] = useState(""); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);

  const toolMap = useMemo(() => new Map(tools.map((t) => [t.name, t])), [tools]);
  const filteredSkills = useMemo(() => { const n = query.trim().toLowerCase(); if (!n) return skills; return skills.filter((s) => [s.id, s.displayName, s.description, ...(s.allowedTools || [])].filter(Boolean).some((v) => String(v).toLowerCase().includes(n))); }, [skills, query]);
  const loadAll = useCallback(async () => { setLoading(true); setError(null); try { const [sd, td, ad] = await Promise.all([apiRequest<{ success: true; skills: SkillDefinition[] }>("agent/skills"), apiRequest<{ success: true; tools: ToolDefinition[] }>("agent/tools"), apiRequest<{ success: true; agents: AgentDefinition[] }>("agent-manager/agents")]); setSkills(sd.skills || []); setTools(td.tools || []); setAgents(ad.agents || []); } catch (err: any) { setError(err.message || "تعذر تحميل المهارات."); } finally { setLoading(false); } }, []);
  useEffect(() => { loadAll(); }, [loadAll]);
  const skillAgentCount = useMemo(() => { const m = new Map<string, number>(); for (const a of agents) { for (const sid of a.allowedSkills || []) m.set(sid, (m.get(sid) || 0) + 1); } return m; }, [agents]);

  return (
    <div dir="rtl" className="min-h-[calc(100vh-64px)] bg-background p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2"><Sparkles className="size-7 text-primary" /><h1 className="text-3xl font-black">مهارات الوكلاء</h1></div>
          <p className="text-muted-foreground">كل مهارة عبارة عن حزمة تعليمات قصيرة مع أدوات محدودة يستخدمها الوكيل داخل دوره.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="بحث في المهارات" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56 pr-9" /></div>
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={loadAll}>{loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-4" />}</Button></TooltipTrigger><TooltipContent>تحديث</TooltipContent></Tooltip></TooltipProvider>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="size-4" /><AlertDescription>{error}</AlertDescription></Alert>}

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl bg-card"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSkills.map((skill) => { const ac = skillAgentCount.get(skill.id) || 0; return (
            <div key={skill.id} className="flex flex-col rounded-xl border bg-card p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2"><Sparkles className="size-5 shrink-0 text-primary" /><h3 className="truncate text-sm font-black">{skill.displayName || skill.id}</h3></div>
                <div className="flex shrink-0 gap-1"><Badge variant="outline" className="h-5 text-[0.65rem]">v{skill.version || "1"}</Badge>{ac > 0 && <Badge variant="outline" className="h-5 text-[0.65rem] text-green-600">{ac} وكيل</Badge>}</div>
              </div>
              <p className="mb-3 min-h-[42px] text-sm text-muted-foreground">{skill.description || "لا يوجد وصف مختصر لهذه المهارة."}</p>
              <div className="mb-4 flex flex-wrap gap-2">{(skill.allowedTools || []).map((t) => (<Badge key={t} variant="outline" className="h-5 gap-1 text-[0.6rem]"><Zap className="size-3" />{t}</Badge>))}</div>
              <div className="mt-auto flex gap-2"><Button onClick={() => setSelected(skill)} className="flex-1"><ExternalLink className="size-4" />تفاصيل</Button><Button variant="outline" onClick={() => setAssignSkill(skill.id)} className="flex-1"><UserPlus className="size-4" />تعيين لوكيل</Button></div>
            </div>); })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{selected?.displayName || selected?.id}</DialogTitle></DialogHeader>
          {selected && <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2"><Badge variant="outline" className="gap-1"><Sparkles className="size-3" />{selected.id}</Badge><Badge variant="outline">v{selected.version || "1"}</Badge><Badge variant="outline" className="gap-1"><Shield className="size-3" />{selected.requiresHumanApproval ? "تحتاج موافقة" : "تشغيل مباشر"}</Badge></div>
            <p className="text-sm text-muted-foreground">{selected.description || "لا يوجد وصف."}</p>
            <div><h4 className="mb-2 text-sm font-black">الأدوات داخل المهارة</h4><div className="flex flex-col gap-2">{(selected.allowedTools || []).map((tn) => { const t = toolMap.get(tn); return (<div key={tn} className="flex items-start justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><p className="font-mono text-sm font-bold">{tn}</p><span className="text-xs text-muted-foreground">{t?.description || "أداة غير موثقة."}</span></div><div className="flex shrink-0 gap-1"><Badge variant="outline" className="h-5 text-[0.6rem]">{t?.sideEffects === "write" ? "كتابة" : "قراءة"}</Badge>{t?.requiresApproval && <Badge variant="outline" className="h-5 text-[0.6rem] border-amber-600 text-amber-600">موافقة</Badge>}</div></div>); })}</div></div>
            <div><div className="mb-2 flex items-center gap-2"><FileText className="size-4 text-primary" /><h4 className="text-sm font-black">SKILL.md</h4></div><div className="max-h-[360px] overflow-auto rounded-xl bg-[#101828] p-4 text-[#e6edf7]" dir="ltr"><pre className="m-0 whitespace-pre-wrap font-mono text-xs" style={{ fontFamily: "Consolas, monospace" }}>{selected.skillMd || "No SKILL.md content available."}</pre></div></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>إغلاق</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignSkillDialog open={!!assignSkill} skillId={assignSkill || ""} agents={agents} onClose={() => setAssignSkill(null)} onSaved={loadAll} />
    </div>
  );
}
