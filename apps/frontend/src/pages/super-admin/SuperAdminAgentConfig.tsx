import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { Separator } from "../../components/ui/separator";
import { apiClient } from "../../services/apiClient";
import { Brain, Gavel, Puzzle, Save, Plus, Trash2, CheckCircle, Lock, Edit3, ChevronDown, ChevronRight, Bot, Sparkles, X } from "lucide-react";

interface Skill { name: string; description: string; params: Record<string, string>; readOnly: boolean; enabled: boolean; }
interface AgentListItem { id: string; name: string; type: string; description: string; icon: string; isBuiltIn: boolean; }
interface AgentConfig { soul: string; rules: string[]; skills: Skill[]; }
type FileId = "soul" | "rules" | "skills";

const AGENT_FILES: { id: FileId; label: string; ext: string; icon: React.ReactNode }[] = [
  { id: "soul", label: "soul", ext: ".md", icon: <Brain className="size-3.5" /> },
  { id: "rules", label: "rules", ext: ".md", icon: <Gavel className="size-3.5" /> },
  { id: "skills", label: "skills", ext: ".json", icon: <Puzzle className="size-3.5" /> },
];
const SKILL_GROUPS: Record<string, string> = { order: "الطلبات", product: "المنتجات", customer: "العملاء", inventory: "المخزون", sales: "المبيعات", company: "الشركة" };
const EMPTY_CONFIG: AgentConfig = { soul: "", rules: [], skills: [] };
const BOILERPLATE_SOUL = `أنت {agentName} — مساعد ذكي متخصص.\nشخصيتك:\n- تتحدث بأسلوب مهني وودود\n- تستند دائماً إلى البيانات الفعلية\n- تقدم توصيات عملية وقابلة للتنفيذ\n- تكون صادقاً إذا كانت البيانات غير متاحة`;

const SuperAdminAgentConfig: React.FC = () => {
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
    try { const { data } = await apiClient.get(`/super-admin/agents/${agentId}`); if (data.success) { const c: AgentConfig = { soul: data.agent.soul ?? "", rules: data.agent.rules ?? [], skills: data.agent.skills ?? [] }; setAgentStates(p => ({ ...p, [agentId]: { loaded: true, loading: false, config: c, original: { soul: c.soul, rules: [...c.rules], skills: [...c.skills] } } })); } } catch { setAgentStates(p => ({ ...p, [agentId]: { loaded: false, loading: false, config: EMPTY_CONFIG, original: EMPTY_CONFIG } })); } }, [agentStates]);

  const isFileDirty = (state: typeof agentStates[string], fileId: FileId) => { if (!state?.loaded) return false; if (fileId === "soul") return state.config.soul !== state.original.soul; if (fileId === "rules") return JSON.stringify(state.config.rules) !== JSON.stringify(state.original.rules); return JSON.stringify(state.config.skills.map(s => `${s.name}:${s.enabled}`)) !== JSON.stringify(state.original.skills.map(s => `${s.name}:${s.enabled}`)); };
  const isAgentDirty = (state: typeof agentStates[string]) => AGENT_FILES.some(f => isFileDirty(state, f.id));

  const theme = { palette: { primary: { main: "#3b82f6" }, action: { hover: "rgba(0,0,0,0.04)" }, warning: { main: "#f59e0b" }, success: { main: "#10b981" }, text: { secondary: "#64748b", disabled: "#94a3b8", primary: "#1e293b" }, divider: "#e5e7eb", background: { paper: "#fff", default: "#f8fafc" } } };

  if (loadingList) return <div className="flex justify-center items-center h-[60vh]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="px-3 py-1.5 shrink-0 border-b bg-card flex items-center gap-2">
        <Bot className="size-7 text-primary" />
        <div className="flex-1"><p className="text-sm font-bold">{selectedKey ? `${agents.find(a => a.id === selectedKey.agentId)?.icon} ${agents.find(a => a.id === selectedKey.agentId)?.name}` : "إدارة وكلاء الذكاء الاصطناعي"}</p><p className="text-xs text-muted-foreground">{selectedKey ? agents.find(a => a.id === selectedKey.agentId)?.description || `النوع: ${agents.find(a => a.id === selectedKey.agentId)?.type}` : "اختر وكيلاً من القائمة لعرض ملفاته وتعديلها"}</p></div>
        {selectedKey && agentStates[selectedKey.agentId] && isAgentDirty(agentStates[selectedKey.agentId]) && <>
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">تغييرات غير محفوظة</Badge>
          <Button size="sm" disabled={saving === selectedKey.agentId} onClick={async () => { const s = agentStates[selectedKey.agentId]; if (!s?.loaded) return; setSaving(selectedKey.agentId); try { const { data } = await apiClient.put(`/super-admin/agents/${selectedKey.agentId}`, { soul: s.config.soul, rules: s.config.rules, enabledSkills: s.config.skills.filter(sk => sk.enabled).map(sk => sk.name) }); if (data.success) setAgentStates(p => ({ ...p, [selectedKey.agentId]: { ...p[selectedKey.agentId], original: { soul: p[selectedKey.agentId].config.soul, rules: [...p[selectedKey.agentId].config.rules], skills: [...p[selectedKey.agentId].config.skills] } } })); } catch (e: any) { setListError(e?.response?.data?.error || e.message || "فشل الحفظ"); } finally { setSaving(null); } }}>{saving === selectedKey.agentId ? <LoadingSpinner size="sm" /> : <Save className="size-4" />} حفظ</Button>
        </>}
      </div>

      {listError && <Alert variant="destructive" className="mx-2 mt-1" onClose={() => setListError(null)}><AlertDescription>{listError}</AlertDescription></Alert>}

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
              <Textarea className="flex-1 font-mono text-sm leading-relaxed" dir="rtl" value={agentStates[selectedKey.agentId]?.config.soul || ""} onChange={e => updateField(selectedKey.agentId, "soul", e.target.value)} placeholder={BOILERPLATE_SOUL.replace("{agentName}", agents.find(a => a.id === selectedKey.agentId)?.name || "")} />
              <p className="text-xs text-muted-foreground">{(agentStates[selectedKey.agentId]?.config.soul || "").length} حرف</p>
            </div>}
            {selectedKey.fileId === "rules" && <RulesEditor rules={agentStates[selectedKey.agentId]?.config.rules || []} onChange={r => updateField(selectedKey.agentId, "rules", r)} />}
            {selectedKey.fileId === "skills" && <SkillsEditor skills={agentStates[selectedKey.agentId]?.config.skills || []} onChange={s => updateField(selectedKey.agentId, "skills", s)} />}
          </> : null}
        </div>
      </div>

      <NewAgentDialog open={newAgentOpen} onClose={() => setNewAgentOpen(false)} onCreate={async (form) => { const { data } = await apiClient.post("/super-admin/agents", form); if (data.success) { setAgents(p => [...p, data.agent]); setNewAgentOpen(false); } }} />
      {deleteTarget && <DeleteConfirmDialog agentName={deleteTarget.name} onConfirm={async () => { const id = deleteTarget.id; setDeleteTarget(null); try { const { data } = await apiClient.delete(`/super-admin/agents/${id}`); if (data.success) { setAgents(p => p.filter(a => a.id !== id)); setAgentStates(p => { const n = { ...p }; delete n[id]; return n; }); setOpenFolders(p => { const n = new Set(p); n.delete(id); return n; }); if (selectedKey?.agentId === id) setSelectedKey(null); } } catch {} }} onClose={() => setDeleteTarget(null)} />}
    </div>
  );

  function updateField(agentId: string, field: keyof AgentConfig, value: any) { setAgentStates(p => { const s = p[agentId]; if (!s) return p; return { ...p, [agentId]: { ...s, config: { ...s.config, [field]: value } } }; }); }
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
      <div className="flex-1 min-w-0"><p className="text-[0.7rem] font-mono font-semibold" style={{ color: skill.enabled ? "#10b981" : "var(--muted-foreground)" }}>{skill.name}</p><p className="text-[0.74rem] text-muted-foreground">{skill.description}</p><Badge variant="outline" className="text-[0.6rem] h-4 mt-0.5">{skill.readOnly ? "قراءة" : "كتابة"}</Badge></div>
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

export default SuperAdminAgentConfig;