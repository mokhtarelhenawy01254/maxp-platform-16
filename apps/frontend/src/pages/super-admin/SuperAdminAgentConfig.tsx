import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import i18n from "../../i18n";
import { Brain, Gavel, Puzzle, Save, Plus, Trash2, CheckCircle, ChevronDown, ChevronRight, Bot, Sparkles, Store, Eye, Send, Globe, Shield, Music, MessageSquare, BarChart3, ShoppingCart, Package, TrendingUp, Search, Users, DollarSign } from "lucide-react";

const TABS = [
  { id: "explorer", label: "Agent Explorer", icon: <Bot className="size-4" /> },
  { id: "marketplace", label: "سوق القوالب", icon: <Store className="size-4" /> },
];

const ROLE_ICONS: Record<string, string> = {
  CEO: "👔", SUPPORT: "🎧", SALES: "🤝", SMART_SELLER: "🛒",
  MARKETING: "📢", ORDER: "📦", INVENTORY: "📊", COMPETITOR: "🔍",
  FACEBOOK_SALES_SUPPORT: "💬", SAS_SALES: "🛍️",
};

const ROLE_COLORS: Record<string, string> = {
  CEO: "from-blue-500 to-indigo-600", SUPPORT: "from-emerald-500 to-teal-600",
  SALES: "from-amber-500 to-orange-600", SMART_SELLER: "from-violet-500 to-purple-600",
  MARKETING: "from-pink-500 to-rose-600", ORDER: "from-cyan-500 to-sky-600",
  INVENTORY: "from-slate-500 to-gray-600", COMPETITOR: "from-red-500 to-rose-600",
  FACEBOOK_SALES_SUPPORT: "from-blue-400 to-blue-600", SAS_SALES: "from-green-500 to-emerald-600",
};

/* ── Types ── */
interface Skill { name: string; description: string; params: Record<string, string>; readOnly: boolean; enabled: boolean; }
interface AgentListItem { id: string; name: string; type: string; description: string; icon: string; isBuiltIn: boolean; }
interface AgentConfig { soul: string; rules: string[]; skills: Skill[]; }
type FileId = "soul" | "rules" | "skills";
interface TemplateItem {
  slug: string; name: string; role: string; version: string; icon: string;
  description: string; personaMeta: { language?: string; dialect?: string; tone?: string; formality?: string; };
  soulPreview: string; toolsCount: number; skillsCount: number; channels: string[];
  budget: { dailyUsd?: number; }; industries: string[];
}

const AGENT_FILES: { id: FileId; label: string; ext: string; icon: React.ReactNode }[] = [
  { id: "soul", label: "soul", ext: ".md", icon: <Brain className="size-3.5" /> },
  { id: "rules", label: "rules", ext: ".md", icon: <Gavel className="size-3.5" /> },
  { id: "skills", label: "skills", ext: ".json", icon: <Puzzle className="size-3.5" /> },
];
const SKILL_GROUPS: Record<string, string> = { order: "الطلبات", product: "المنتجات", customer: "العملاء", inventory: "المخزون", sales: "المبيعات", company: "الشركة" };
const EMPTY_CONFIG: AgentConfig = { soul: "", rules: [], skills: [] };
const BOILERPLATE_SOUL = `أنت {agentName} — مساعد ذكي متخصص.\nشخصيتك:\n- تتحدث بأسلوب مهني وودود\n- تستند دائماً إلى البيانات الفعلية\n- تقدم توصيات عملية وقابلة للتنفيذ\n- تكون صادقاً إذا كانت البيانات غير متاحة`;

/* ════════════════════════════════════════════════
   Main Component — Tab Shell
   ════════════════════════════════════════════════ */
const SuperAdminAgentConfig: React.FC = () => {
  const [tab, setTab] = useState<"explorer" | "marketplace">("marketplace");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="px-3 py-1.5 shrink-0 border-b bg-card flex items-center gap-2">
        <Bot className="size-7 text-primary" />
        <div className="flex-1"><p className="text-sm font-bold">إدارة وكلاء الذكاء الاصطناعي</p><p className="text-xs text-muted-foreground">مركز عمليات الوكلاء — القوالب، الإعدادات، والنشر</p></div>
        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "explorer" ? <AgentExplorer /> : <TemplatesMarketplace />}
    </div>
  );
};

/* ════════════════════════════════════════════════
   Agent Explorer (existing functionality)
   ════════════════════════════════════════════════ */
const AgentExplorer: React.FC = () => {
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [agentStates, setAgentStates] = useState<Record<string, { loaded: boolean; loading: boolean; config: AgentConfig; original: AgentConfig }>>({});
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<{ agentId: string; fileId: FileId } | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [newAgentOpen, setNewAgentOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentListItem | null>(null);

  useEffect(() => { (async () => { try { const { data } = await apiClient.get("/super-admin/agents"); if (data.success) setAgents(data.agents); } catch { setListError("فشل تحميل قائمة الوكلاء"); } finally { setLoadingList(false); } })(); }, []);

  const loadAgentConfig = useCallback(async (agentId: string) => {
    if (agentStates[agentId]?.loaded || agentStates[agentId]?.loading) return;
    setAgentStates(p => ({ ...p, [agentId]: { loaded: false, loading: true, config: EMPTY_CONFIG, original: EMPTY_CONFIG } }));
    try { const { data } = await apiClient.get(`/super-admin/agents/${agentId}`); if (data.success) { const c: AgentConfig = { soul: data.agent.instructions_soul ?? data.agent.soul ?? "", rules: data.agent.rules ?? [], skills: data.agent.skills ?? [] }; setAgentStates(p => ({ ...p, [agentId]: { loaded: true, loading: false, config: c, original: { soul: c.soul, rules: [...c.rules], skills: [...c.skills] } } })); } } catch { setAgentStates(p => ({ ...p, [agentId]: { loaded: false, loading: false, config: EMPTY_CONFIG, original: EMPTY_CONFIG } })); } }, [agentStates]);

  const isFileDirty = (state: typeof agentStates[string], fileId: FileId) => { if (!state?.loaded) return false; if (fileId === "soul") return state.config.soul !== state.original.soul; if (fileId === "rules") return JSON.stringify(state.config.rules) !== JSON.stringify(state.original.rules); return JSON.stringify(state.config.skills.map(s => `${s.name}:${s.enabled}`)) !== JSON.stringify(state.original.skills.map(s => `${s.name}:${s.enabled}`)); };
  const isAgentDirty = (state: typeof agentStates[string]) => AGENT_FILES.some(f => isFileDirty(state, f.id));
  const updateField = (agentId: string, field: keyof AgentConfig, value: any) => setAgentStates(p => { const s = p[agentId]; if (!s) return p; return { ...p, [agentId]: { ...s, config: { ...s.config, [field]: value } } }; });

  if (loadingList) return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex-1 flex overflow-hidden bg-muted/50">
      <div className="w-60 shrink-0 border-r flex flex-col">
        <div className="px-3 py-1.5 border-b flex items-center justify-between"><p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">AGENTS EXPLORER</p><Button variant="ghost" size="icon-sm" onClick={() => setNewAgentOpen(true)}><Plus className="size-4" /></Button></div>
        <div className="flex-1 overflow-auto py-0.5">
          {agents.map(agent => { const isOpen = openFolders.has(agent.id); const state = agentStates[agent.id]; const dirty = state ? isAgentDirty(state) : false; return <div key={agent.id} className="px-1 py-0.5">
            <div className="flex items-center gap-0.5 px-1 py-1 rounded cursor-pointer hover:bg-primary/5 group" onClick={() => { setOpenFolders(p => { const n = new Set(p); if (n.has(agent.id)) n.delete(agent.id); else { n.add(agent.id); loadAgentConfig(agent.id); } return n; }); }}>
              {isOpen ? <ChevronDown className="size-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />}
              <span className="text-sm shrink-0">{agent.icon || "🤖"}</span>
              <span className="text-xs font-semibold flex-1 min-w-0 truncate">{agent.name}</span>
              {dirty && <span className="size-1.5 rounded-full bg-yellow-500 shrink-0" />}
              {state?.loading && <LoadingSpinner size="sm" />}
              {agent.isBuiltIn && <Badge variant="outline" className="text-[0.58rem] h-3.5 px-0.5">built-in</Badge>}
              {!agent.isBuiltIn && <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); setDeleteTarget(agent); }}><Trash2 className="size-3 text-red-500" /></Button>}
            </div>
            {isOpen && <div className="mr-2">{AGENT_FILES.map(file => { const isSelected = selectedKey?.agentId === agent.id && selectedKey?.fileId === file.id; return <div key={file.id} className={`flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer text-xs ${isSelected ? "bg-primary/15 text-primary font-semibold" : "hover:bg-muted/50"}`} onClick={() => { setSelectedKey({ agentId: agent.id, fileId: file.id }); setOpenFolders(p => { const n = new Set(p); n.add(agent.id); return n; }); loadAgentConfig(agent.id); }}><span className={isSelected ? "text-primary" : "text-muted-foreground"}>{file.icon}</span><span className="flex-1">{file.label}<span className="text-muted-foreground">{file.ext}</span></span>{isFileDirty(state, file.id) && <span className="size-1.5 rounded-full bg-yellow-500" />}</div>; })}</div>}
          </div>; })}
          {agents.length === 0 && <div className="p-2 text-center"><p className="text-xs text-muted-foreground">لا يوجد وكلاء</p></div>}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-card">
        {!selectedKey ? <div className="flex flex-col items-center justify-center h-full gap-2"><Bot className="size-16 opacity-15" /><p className="text-sm text-muted-foreground">اختر ملفاً من القائمة لبدء التعديل</p></div>
        : agentStates[selectedKey.agentId]?.loading ? <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
        : agentStates[selectedKey.agentId]?.loaded ? <>
          {selectedKey.fileId === "soul" && <div className="flex-1 flex flex-col p-3 gap-1.5 overflow-hidden">
            <div className="flex items-center gap-1"><Brain className="size-4 text-primary" /><span className="text-sm font-bold">soul.md</span><Badge variant="outline" className="text-xs">شخصية الوكيل</Badge><Button variant="link" size="sm" className="mr-auto text-xs" onClick={() => { const s = agentStates[selectedKey.agentId]; if (s) updateField(selectedKey.agentId, "soul", BOILERPLATE_SOUL.replace("{agentName}", agents.find(a => a.id === selectedKey.agentId)?.name || "")); }}>قالب</Button></div>
            <p className="text-xs text-muted-foreground">هذا النص يُدرج في بداية كل محادثة ويحدد شخصية الوكيل.</p>
            <Textarea className="flex-1 font-mono text-sm leading-relaxed" dir={i18n.dir()} value={agentStates[selectedKey.agentId]?.config.soul || ""} onChange={e => updateField(selectedKey.agentId, "soul", e.target.value)} placeholder={BOILERPLATE_SOUL.replace("{agentName}", agents.find(a => a.id === selectedKey.agentId)?.name || "")} />
            <p className="text-xs text-muted-foreground">{(agentStates[selectedKey.agentId]?.config.soul || "").length} حرف</p>
          </div>}
          {selectedKey.fileId === "rules" && <RulesEditor rules={agentStates[selectedKey.agentId]?.config.rules || []} onChange={r => updateField(selectedKey.agentId, "rules", r)} />}
          {selectedKey.fileId === "skills" && <SkillsEditor skills={agentStates[selectedKey.agentId]?.config.skills || []} onChange={s => updateField(selectedKey.agentId, "skills", s)} />}
        </> : null}
      </div>

      <NewAgentDialog open={newAgentOpen} onClose={() => setNewAgentOpen(false)} onCreate={async (form) => { const { data } = await apiClient.post("/super-admin/agents", form); if (data.success) { setAgents(p => [...p, data.agent]); setNewAgentOpen(false); } }} />
      {deleteTarget && <DeleteConfirmDialog agentName={deleteTarget.name} onConfirm={async () => { const id = deleteTarget.id; setDeleteTarget(null); try { const { data } = await apiClient.delete(`/super-admin/agents/${id}`); if (data.success) { setAgents(p => p.filter(a => a.id !== id)); setAgentStates(p => { const n = { ...p }; delete n[id]; return n; }); setOpenFolders(p => { const n = new Set(p); n.delete(id); return n; }); if (selectedKey?.agentId === id) setSelectedKey(null); } } catch {} }} onClose={() => setDeleteTarget(null)} />}
    </div>
  );
};

const RulesEditor: React.FC<{ rules: string[]; onChange: (r: string[]) => void }> = ({ rules, onChange }) => {
  const [newRule, setNewRule] = useState("");
  return <div className="flex-1 flex flex-col p-3 gap-1.5 overflow-hidden">
    <div className="flex items-center gap-1"><Gavel className="size-4 text-yellow-600" /><span className="text-sm font-bold">rules.md</span><Badge variant="outline" className="text-xs">{rules.length} قاعدة</Badge></div>
    <p className="text-xs text-muted-foreground">قواعد ملزمة تُحقن في كل محادثة.</p>
    <div className="flex-1 overflow-auto space-y-1">{rules.length === 0 ? <div className="p-2 text-center rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">لا توجد قواعد — ستُستخدم القواعد الافتراضية المضمنة في الكود</p></div> : rules.map((rule, idx) => <div key={idx} className="flex items-start gap-1 p-2 rounded-lg bg-muted/30 border"><span className="text-xs font-bold text-yellow-600 min-w-[22px] mt-0.5">{idx + 1}.</span><p className="text-xs flex-1 leading-relaxed">{rule}</p><Button variant="ghost" size="icon-xs" onClick={() => onChange(rules.filter((_, i) => i !== idx))}><Trash2 className="size-3" /></Button></div>)}</div>
    <div className="flex gap-1"><Input size="sm" placeholder="اكتب قاعدة جديدة..." value={newRule} onChange={e => setNewRule(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { const t = newRule.trim(); if (t) { onChange([...rules, t]); setNewRule(""); } } }} /><Button variant="outline" size="sm" disabled={!newRule.trim()} onClick={() => { const t = newRule.trim(); if (t) { onChange([...rules, t]); setNewRule(""); } }}><Plus className="size-3" /> إضافة</Button></div>
  </div>;
};

const SkillsEditor: React.FC<{ skills: Skill[]; onChange: (s: Skill[]) => void }> = ({ skills, onChange }) => {
  const enabledCount = skills.filter(s => s.enabled).length;
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, s) => { const g = SKILL_GROUPS[s.name.split(".")[0]] || "أخرى"; (acc[g] ||= []).push(s); return acc; }, {});
  return <div className="flex-1 flex flex-col p-3 gap-1.5 overflow-auto">
    <div className="flex items-center gap-1 flex-wrap"><Puzzle className="size-4 text-green-600" /><span className="text-sm font-bold">skills.json</span><Badge variant="outline" className="border-green-500 text-green-600 text-xs"><CheckCircle className="size-3" /> {enabledCount} / {skills.length} مفعّل</Badge><div className="mr-auto flex gap-0.5"><Button variant="link" size="sm" className="text-xs" onClick={() => onChange(skills.map(s => ({ ...s, enabled: true })))}>تفعيل الكل</Button><Button variant="link" size="sm" className="text-xs text-red-500" onClick={() => onChange(skills.map(s => ({ ...s, enabled: false })))}>تعطيل الكل</Button></div></div>
    <p className="text-xs text-muted-foreground">الأدوات المتاحة لهذا الوكيل.</p>
    {Object.entries(grouped).map(([group, groupSkills]) => <div key={group}><p className="text-[0.65rem] font-bold tracking-wider text-muted-foreground">{group}</p><div className="grid grid-cols-2 gap-1 mt-0.5">{groupSkills.map(skill => <div key={skill.name} className={`p-2 rounded-lg border-2 cursor-pointer transition-all flex items-start justify-between gap-1 ${skill.enabled ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-border"}`} onClick={() => onChange(skills.map(s => s.name === skill.name ? { ...s, enabled: !s.enabled } : s))}>
      <div className="flex-1 min-w-0"><p className="text-[0.7rem] font-mono font-semibold" style={{ color: skill.enabled ? "var(--color-success)" : "var(--muted-foreground)" }}>{skill.name}</p><p className="text-[0.74rem] text-muted-foreground">{skill.description}</p><Badge variant="outline" className="text-[0.6rem] h-4 mt-0.5">{skill.readOnly ? "قراءة" : "كتابة"}</Badge></div>
      <Switch checked={skill.enabled} onCheckedChange={() => onChange(skills.map(s => s.name === skill.name ? { ...s, enabled: !s.enabled } : s))} onClick={e => e.stopPropagation()} size="sm" />
    </div>)}</div></div>)}
  </div>;
};

const NewAgentDialog: React.FC<{ open: boolean; onClose: () => void; onCreate: (d: { name: string; type: string; description: string; icon: string }) => Promise<void> }> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState(""); const [type, setType] = useState(""); const [description, setDescription] = useState(""); const [icon, setIcon] = useState("🤖"); const [creating, setCreating] = useState(false); const [err, setErr] = useState<string | null>(null);
  const slugify = (s: string) => s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  return <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}><DialogContent><DialogHeader><DialogTitle>إنشاء وكيل جديد</DialogTitle></DialogHeader>
    {err && <Alert variant="destructive"><AlertDescription>{err}</AlertDescription></Alert>}
    <div className="space-y-2"><div className="flex gap-1.5"><Input value={icon} onChange={e => setIcon(e.target.value)} className="w-20 text-center text-xl" /><Input label="اسم الوكيل *" value={name} onChange={e => { setName(e.target.value); setType(slugify(e.target.value)); }} autoFocus /></div><Input label="المعرّف (type) *" value={type} onChange={e => setType(slugify(e.target.value))} helperText="حروف إنجليزية وأرقام وشرطة سفلية فقط" /><Input label="الوصف (اختياري)" value={description} onChange={e => setDescription(e.target.value)} /></div>
    <DialogFooter><Button variant="outline" onClick={onClose} disabled={creating}>إلغاء</Button><Button onClick={async () => { if (!name.trim() || !type.trim()) return; setCreating(true); setErr(null); try { await onCreate({ name: name.trim(), type: type.trim(), description: description.trim(), icon: icon || "🤖" }); setName(""); setType(""); setDescription(""); setIcon("🤖"); } catch (e: any) { setErr(e?.response?.data?.error || e.message || "حدث خطأ"); } finally { setCreating(false); } }} disabled={!name.trim() || !type.trim() || creating}>{creating ? <LoadingSpinner size="sm" /> : <Plus className="size-4" />} إنشاء</Button></DialogFooter>
  </DialogContent></Dialog>;
};

const DeleteConfirmDialog: React.FC<{ agentName: string | null; onConfirm: () => void; onClose: () => void }> = ({ agentName, onConfirm, onClose }) => (
  <Dialog open={!!agentName} onOpenChange={o => { if (!o) onClose(); }}><DialogContent><DialogHeader><DialogTitle>حذف الوكيل</DialogTitle></DialogHeader><p>هل أنت متأكد من حذف الوكيل <strong>{agentName}</strong>؟ لا يمكن التراجع عن هذا.</p>
    <DialogFooter><Button variant="outline" onClick={onClose}>إلغاء</Button><Button variant="destructive" onClick={onConfirm}>حذف</Button></DialogFooter>
  </DialogContent></Dialog>
);

/* ════════════════════════════════════════════════
   Templates Marketplace
   ════════════════════════════════════════════════ */
const TemplatesMarketplace: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [previewTarget, setPreviewTarget] = useState<TemplateItem | null>(null);
  const [applyTarget, setApplyTarget] = useState<TemplateItem | null>(null);

  useEffect(() => { (async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/super-admin/agents/marketplace");
      if (data.success) setTemplates(data.templates);
    } catch { setError("فشل تحميل سوق القوالب"); }
    finally { setLoading(false); }
  })(); }, []);

  const allIndustries = [...new Set(templates.flatMap(t => t.industries))].sort();
  const filtered = templates.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.role.toLowerCase().includes(search.toLowerCase())) return false;
    if (industryFilter && !t.industries.includes(industryFilter)) return false;
    return true;
  });

  const toneColor = (tone?: string) => {
    const map: Record<string, string> = { empathetic: "text-pink-600 bg-pink-50", persuasive: "text-amber-600 bg-amber-50", professional: "text-blue-600 bg-blue-50", analytical: "text-slate-600 bg-slate-50", creative: "text-violet-600 bg-violet-50", strategic: "text-indigo-600 bg-indigo-50", friendly: "text-green-600 bg-green-50", helpful: "text-teal-600 bg-teal-50" };
    return map[tone || ""] || "text-gray-600 bg-gray-50";
  };

  if (loading) return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="px-4 py-3 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن قالب..." className="pr-9 h-9 text-sm" />
          </div>
          <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-muted-foreground">
            <option value="">كل المجالات</option>
            {allIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length} قالب من {templates.length}</span>
        </div>
      </div>

      {error && <Alert variant="destructive" className="mx-4 mt-2"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex-1 overflow-auto p-4">
        {filtered.length === 0 ? <div className="flex flex-col items-center justify-center h-full gap-2"><Store className="size-16 opacity-15" /><p className="text-sm text-muted-foreground">لا توجد قوالب تطابق بحثك</p></div>
        : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(t => (
            <div key={t.slug} className="group bg-white rounded-xl border shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 flex flex-col overflow-hidden">
              {/* Card header with gradient */}
              <div className={`bg-gradient-to-br ${ROLE_COLORS[t.role] || "from-primary to-primary/70"} p-4 text-white relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-black/5 rounded-full translate-x-1/3 translate-y-1/3" />
                <div className="flex items-start justify-between relative">
                  <div>
                    <p className="text-3xl">{t.icon || ROLE_ICONS[t.role] || "🤖"}</p>
                    <p className="text-sm font-bold mt-1">{t.name}</p>
                    <p className="text-[0.65rem] opacity-80 font-medium">{t.role}</p>
                  </div>
                  <Badge className="bg-white/20 text-white border-0 text-[0.6rem]">{t.version}</Badge>
                </div>
              </div>
              {/* Card body */}
              <div className="p-3 flex-1 flex flex-col gap-2">
                {/* Industry tags */}
                <div className="flex flex-wrap gap-1">
                  {t.industries.slice(0, 3).map(ind => (
                    <span key={ind} className="text-[0.6rem] px-1.5 py-0.5 rounded-full bg-primary/5 text-primary font-medium">{ind}</span>
                  ))}
                </div>
                {/* Persona meta */}
                {t.personaMeta?.tone && (
                  <div className="flex items-center gap-2">
                    <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-full font-medium ${toneColor(t.personaMeta.tone)}`}>
                      {t.personaMeta.tone}
                    </span>
                    {t.personaMeta.language && <span className="text-[0.6rem] text-muted-foreground">{t.personaMeta.language === "arabic" ? "عربي" : t.personaMeta.language}</span>}
                    {t.personaMeta.dialect && t.personaMeta.dialect !== "standard" && <span className="text-[0.6rem] text-muted-foreground">· {t.personaMeta.dialect}</span>}
                  </div>
                )}
                {/* Soul preview */}
                {t.soulPreview && (
                  <div className="flex-1 min-h-[48px]">
                    <p className="text-[0.65rem] text-muted-foreground leading-relaxed line-clamp-3">{t.soulPreview}</p>
                  </div>
                )}
                {/* Stats row */}
                <div className="flex items-center gap-3 text-[0.65rem] text-muted-foreground pt-1 border-t">
                  <span className="flex items-center gap-1"><Puzzle className="size-3" />{t.toolsCount} أداة</span>
                  <span className="flex items-center gap-1"><CheckCircle className="size-3" />{t.skillsCount} مهارة</span>
                  {t.budget?.dailyUsd && <span className="flex items-center gap-1"><DollarSign className="size-3" />${t.budget.dailyUsd}/day</span>}
                </div>
                {/* Actions */}
                <div className="flex gap-1.5 mt-1">
                  <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => setPreviewTarget(t)}>
                    <Eye className="size-3 ml-1" /> معاينة
                  </Button>
                  <Button size="sm" className="flex-1 text-xs h-8" onClick={() => setApplyTarget(t)}>
                    <Send className="size-3 ml-1" /> تطبيق
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>}
      </div>

      {previewTarget && <TemplatePreviewDialog template={previewTarget} onClose={() => setPreviewTarget(null)} />}
      {applyTarget && <ApplyTemplateDialog template={applyTarget} onClose={() => setApplyTarget(null)} />}
    </div>
  );
};

/* ── Template Preview Dialog ── */
const TemplatePreviewDialog: React.FC<{ template: TemplateItem; onClose: () => void }> = ({ template: t, onClose }) => {
  const [fullSoul, setFullSoul] = useState<string | null>(null);
  const [loadingSoul, setLoadingSoul] = useState(false);

  useEffect(() => { if (t.slug && !fullSoul && !loadingSoul) { setLoadingSoul(true); apiClient.get(`/super-admin/agents/${t.slug}`).then(({ data }) => { if (data.agent?.instructions_soul) setFullSoul(data.agent.instructions_soul); else setFullSoul(""); }).catch(() => setFullSoul("")).finally(() => setLoadingSoul(false)); } }, [t.slug, fullSoul, loadingSoul]);

  return <Dialog open onOpenChange={o => { if (!o) onClose(); }}><DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
    <DialogHeader>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{t.icon || ROLE_ICONS[t.role] || "🤖"}</span>
        <div>
          <DialogTitle className="text-lg">{t.name}</DialogTitle>
          <p className="text-xs text-muted-foreground">{t.role} · v{t.version}</p>
        </div>
      </div>
    </DialogHeader>

    <div className="space-y-4">
      {/* Industries & Persona */}
      <div className="flex flex-wrap gap-2">
        {t.industries.map(ind => <Badge key={ind} variant="secondary" className="text-xs">{ind}</Badge>)}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {t.personaMeta?.language && <span>اللغة: <strong>{t.personaMeta.language === "arabic" ? "العربية" : t.personaMeta.language}</strong></span>}
        {t.personaMeta?.dialect && <span>اللغة: <strong>{t.personaMeta.dialect}</strong></span>}
        {t.personaMeta?.tone && <span>النبرة: <strong>{t.personaMeta.tone}</strong></span>}
        {t.personaMeta?.formality && <span>الرسمية: <strong>{t.personaMeta.formality}</strong></span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{t.toolsCount}</p><p className="text-[0.6rem] text-muted-foreground">أدوات</p></div>
        <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{t.skillsCount}</p><p className="text-[0.6rem] text-muted-foreground">مهارات</p></div>
        <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-lg font-bold">{t.budget?.dailyUsd ? `$${t.budget.dailyUsd}` : "-"}</p><p className="text-[0.6rem] text-muted-foreground">الميزانية/يوم</p></div>
      </div>

      {/* Channels */}
      <div><p className="text-xs font-bold mb-1">القنوات المتاحة</p>
        <div className="flex gap-2">{t.channels.map(ch => <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>)}</div>
      </div>

      {/* Soul preview */}
      <div><p className="text-xs font-bold mb-1">الشخصية (Soul)</p>
        <div className="bg-muted/30 rounded-lg p-3 text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-auto dir-rtl">
          {loadingSoul ? "جاري التحميل..." : (fullSoul || t.soulPreview || "لا توجد شخصية محددة")}
        </div>
      </div>
    </div>

    <DialogFooter><Button onClick={onClose}>إغلاق</Button></DialogFooter>
  </DialogContent></Dialog>;
};

/* ── Apply Template to Company Dialog ── */
const ApplyTemplateDialog: React.FC<{ template: TemplateItem; onClose: () => void }> = ({ template: t, onClose }) => {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { (async () => {
    try {
      const { data } = await apiClient.get("/super-admin/companies/quick-list");
      if (data.success) setCompanies(data.companies);
    } catch { }
    finally { setLoadingCompanies(false); }
  })(); }, []);

  const apply = async () => {
    if (!selectedId) return;
    setApplying(true);
    try {
      await apiClient.post("/super-admin/agents/apply-template", { templateSlug: t.slug, companyId: selectedId });
      setDone(true);
    } catch { }
    finally { setApplying(false); }
  };

  return <Dialog open onOpenChange={o => { if (!o) onClose(); }}><DialogContent>
    <DialogHeader><DialogTitle>تطبيق القالب على شركة</DialogTitle></DialogHeader>
    {done ? <>
      <div className="flex flex-col items-center gap-2 py-4"><CheckCircle className="size-12 text-green-500" /><p className="font-bold">تم تطبيق قالب {t.name} بنجاح!</p><p className="text-xs text-muted-foreground">الوكيل جاهز للعمل على الشركة المحددة.</p></div>
      <DialogFooter><Button onClick={onClose}>إغلاق</Button></DialogFooter>
    </> : <>
      <p className="text-sm">تطبيق قالب <strong>{t.icon} {t.name}</strong> على شركة:</p>
      {loadingCompanies ? <div className="flex justify-center py-4"><LoadingSpinner /></div>
      : <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">اختر شركة...</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={applying}>إلغاء</Button>
        <Button onClick={apply} disabled={!selectedId || applying}>
          {applying ? <LoadingSpinner size="sm" /> : <Send className="size-4 ml-1" />}
          {applying ? "جاري التطبيق..." : "تطبيق القالب"}
        </Button>
      </DialogFooter>
    </>}
  </DialogContent></Dialog>;
};

export default SuperAdminAgentConfig;