import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Brain, Users, Wrench, Zap, ChevronDown, ChevronRight,
  Loader2, AlertCircle, Bot, Search, Clock, PenLine, Save, X, Plus, Trash2, Check,
} from "lucide-react";
import { sandboxApi, type AgentProfileResponse, type AgentSkillDetail } from "../ai-agent-sandbox/services/sandboxApi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";

type Tab = "soul" | "agents" | "tools" | "skills";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "soul",   label: "Soul",   icon: <Brain className="size-4" /> },
  { key: "agents", label: "Agents", icon: <Users className="size-4" /> },
  { key: "tools",  label: "Tools",  icon: <Wrench className="size-4" /> },
  { key: "skills", label: "Skills", icon: <Zap className="size-4" /> },
];

const CHANNEL_META: Record<string, string> = {
  facebook: "فيسبوك",
  whatsapp: "واتساب",
  dashboard: "داشبورد",
};

const FILE_KEYS: Record<Tab, string> = {
  soul: "SOUL.md",
  agents: "AGENTS.md",
  tools: "TOOLS.md",
  skills: "",
};

function MarkdownBlock({ content }: { content: string }) {
  if (!content) return <p className="text-sm text-slate-400 italic">No content available.</p>;
  return (
    <pre className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono break-words">
      {content}
    </pre>
  );
}

function ToolBadge({ name }: { name: string }) {
  const isWrite =
    name.includes("create") || name.includes("update") ||
    name.includes("delete") || name.includes("send") || name.includes("write");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
        isWrite
          ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400"
          : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
      }`}
    >
      {name}
    </span>
  );
}

function SkillCard({ skill }: { skill: AgentSkillDetail }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Zap className="size-4 text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {skill.displayName || skill.id}
          </span>
          <span className="text-xs text-slate-400 font-mono flex-shrink-0">{skill.id}</span>
        </div>
        {open ? <ChevronDown className="size-4 text-slate-400" /> : <ChevronRight className="size-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3 bg-white dark:bg-slate-900">
          {skill.description && <p className="text-sm text-slate-600 dark:text-slate-400">{skill.description}</p>}
          {skill.instructions && (
            <p className="text-xs text-slate-500 dark:text-slate-500 italic border-l-2 border-slate-200 pl-3">{skill.instructions}</p>
          )}
          {skill.allowedTools.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tools ({skill.allowedTools.length})</p>
              <div className="flex flex-wrap gap-1.5">{skill.allowedTools.map((t) => <ToolBadge key={t} name={t} />)}</div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No tools configured</p>
          )}
        </div>
      )}
    </div>
  );
}

interface AgentItem {
  id: string;
  name: string;
  role: string;
  icon?: string;
}

interface AvailableTool {
  name: string;
  description: string;
  sideEffect?: string;
  sideEffects?: string;
}

interface CompanySkill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  tools: string[];
  enabled: boolean;
  priority: number;
  createdAt?: string;
}

function CreateSkillDrawer({
  open,
  onClose,
  onCreated,
  tryApiFetch,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (skill: CompanySkill) => void;
  tryApiFetch: <T>(path: string, init?: RequestInit) => Promise<T | null>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tools, setTools] = useState<AvailableTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolSearch, setToolSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setToolsLoading(true);
    tryApiFetch<{ success: boolean; tools: AvailableTool[] }>("/agent/tools")
      .then((data) => { if (data?.tools) setTools(data.tools); })
      .finally(() => setToolsLoading(false));
  }, [open]);

  const reset = () => {
    setName(""); setDescription(""); setInstructions("");
    setSelectedTools([]); setEnabled(true); setError(null); setToolSearch("");
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("اسم المهارة مطلوب"); return; }
    if (!instructions.trim()) { setError("التعليمات مطلوبة"); return; }
    setSaving(true);
    setError(null);
    const data = await tryApiFetch<{ success: boolean; skill: CompanySkill }>("/agent/skills", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), description, instructions, tools: selectedTools, enabled }),
    });
    setSaving(false);
    if (data?.skill) {
      onCreated(data.skill);
      handleClose();
    } else {
      setError("فشل إنشاء المهارة");
    }
  };

  const filteredTools = tools.filter((t) =>
    !toolSearch || t.name.toLowerCase().includes(toolSearch.toLowerCase()) || t.description?.toLowerCase().includes(toolSearch.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />
      {/* Panel */}
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">إنشاء مهارة جديدة</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="size-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              اسم المهارة <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: order-support"
              className="h-9 text-sm font-mono"
              dir="ltr"
            />
            <p className="text-[10px] text-slate-400">يُستخدم كـ ID فريد، بدون مسافات</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">الوصف</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للمهارة"
              className="h-9 text-sm"
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              التعليمات <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="اكتب التعليمات التفصيلية لهذه المهارة..."
              className="min-h-[120px] text-sm resize-y"
              rows={5}
            />
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                الأدوات المتاحة
              </label>
              {selectedTools.length > 0 && (
                <span className="text-xs text-indigo-600 font-medium">{selectedTools.length} محدد</span>
              )}
            </div>

            {/* Tool search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              <Input
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                placeholder="بحث في الأدوات..."
                className="h-8 pr-8 text-xs"
              />
            </div>

            {toolsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-4 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                {filteredTools.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">لا توجد أدوات</p>
                ) : filteredTools.map((tool) => {
                  const isWrite = (tool.sideEffect || tool.sideEffects || "").includes("write");
                  const checked = selectedTools.includes(tool.name);
                  return (
                    <button
                      key={tool.name}
                      type="button"
                      onClick={() => toggleTool(tool.name)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                        checked
                          ? "bg-indigo-50 dark:bg-indigo-950/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className={`mt-0.5 size-4 rounded flex-shrink-0 flex items-center justify-center border ${
                        checked
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {checked && <Check className="size-2.5 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">{tool.name}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            isWrite
                              ? "bg-orange-50 text-orange-600 border border-orange-200"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}>
                            {isWrite ? "write" : "read"}
                          </span>
                        </div>
                        {tool.description && (
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tool.description}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Enabled */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">تفعيل المهارة</p>
              <p className="text-xs text-slate-400">المهارة ستكون متاحة للـ agents فور الإنشاء</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <Button variant="outline" size="sm" onClick={handleClose} className="h-9 px-4 text-sm" disabled={saving}>
            إلغاء
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 px-5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? <Loader2 className="size-3.5 animate-spin ml-1.5" /> : <Zap className="size-3.5 ml-1.5" />}
            {saving ? "جار الإنشاء..." : "إنشاء المهارة"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────── */

const isActive = (s?: string | null) => String(s || "").toUpperCase() === "ACTIVE";

const relativeTime = (dateStr?: string | null) => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-EG");
};

const getAgentChannels = (profile?: AgentProfileResponse | null): string[] => {
  if (!profile) return [];
  const { agent } = profile;
  const text = [agent.role, agent.templateSlug, agent.description].filter(Boolean).join(" ").toLowerCase();
  const channels: string[] = [];
  if (text.includes("facebook") || text.includes("messenger") || text.includes("فيسبوك")) channels.push("facebook");
  if (text.includes("whatsapp") || text.includes("واتساب")) channels.push("whatsapp");
  if (agent.role === "CEO" || text.includes("dashboard")) channels.push("dashboard");
  return channels;
};

const FILES_EQUAL = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) { if ((a?.[k] || "") !== (b?.[k] || "")) return false; }
  return true;
};

async function tryApiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(buildApiUrl(path), {
      ...init,
      headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json", ...(init?.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) return null;
    return data as T;
  } catch { return null; }
}

export default function AgentProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get("agent");

  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(agentIdFromUrl);
  const [searchQuery, setSearchQuery] = useState("");

  const [tab, setTab] = useState<Tab>("soul");
  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [models, setModels] = useState<Array<{ id: string; modelName: string; provider: string }>>([]);
  const [statusSaving, setStatusSaving] = useState(false);

  const [createSkillOpen, setCreateSkillOpen] = useState(false);
  const [companySkills, setCompanySkills] = useState<CompanySkill[]>([]);
  const [companySkillsLoading, setCompanySkillsLoading] = useState(false);

  /* ── Edit state ── */
  const [editing, setEditing] = useState(false);
  const [draftModel, setDraftModel] = useState("");
  const [draftFiles, setDraftFiles] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);

  /* ── Load agents ── */
  useEffect(() => {
    sandboxApi.getAgents()
      .then((res) => {
        setAgents(res.agents as AgentItem[]);
        if (!selectedId && res.agents.length > 0) setSelectedId(res.agents[0].id);
      })
      .catch(() => {})
      .finally(() => setAgentsLoading(false));
  }, []);

  /* ── Load models ── */
  useEffect(() => {
    tryApiFetch<{ models: Array<{ id: string; modelName: string; provider: string }> }>("/agent/available-models")
      .then((data) => { if (data) setModels(data.models || []); });
  }, []);

  /* ── Load profile ── */
  useEffect(() => {
    if (!selectedId) return;
    const params = new URLSearchParams(searchParams);
    params.set("agent", selectedId);
    setSearchParams(params, { replace: true });

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    setEditing(false);
    sandboxApi.getAgentProfile(selectedId)
      .then((data) => { if (!cancelled) { setProfile(data); setDraftModel(data.agent.model || ""); setDraftFiles({ ...data.files }); } })
      .catch((err) => { if (!cancelled) setProfileError(err?.message || "Failed to load profile"); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  /* ── Load company skills ── */
  useEffect(() => {
    setCompanySkillsLoading(true);
    tryApiFetch<{ success: boolean; skills: CompanySkill[] }>("/agent/skills/company")
      .then((data) => { if (data?.skills) setCompanySkills(data.skills); })
      .finally(() => setCompanySkillsLoading(false));
  }, []);

  const handleSkillCreated = (skill: CompanySkill) => {
    setCompanySkills((prev) => [skill, ...prev]);
  };

  const handleDeleteSkill = async (id: string) => {
    const data = await tryApiFetch<{ success: boolean }>(`/agent/skills/${id}`, { method: "DELETE" });
    if (data?.success) setCompanySkills((prev) => prev.filter((s) => s.id !== id));
  };

  /* ── Toggle status ── */
  const toggleStatus = async (nextActive: boolean) => {
    if (!selectedId || !profile) return;
    setStatusSaving(true);
    const data = await tryApiFetch<{ success: boolean; agent: { status: string } }>(
      `/agent/agents/${selectedId}/status`,
      { method: "PATCH", body: JSON.stringify({ status: nextActive ? "ACTIVE" : "PAUSED" }) },
    );
    if (data?.agent?.status) {
      setProfile((prev) => prev ? { ...prev, agent: { ...prev.agent, status: data.agent.status } } : prev);
    }
    setStatusSaving(false);
  };

  /* ── Save profile ── */
  const saveProfile = async () => {
    if (!selectedId || !profile) return;
    setProfileSaving(true);
    setProfileError(null);
    const body: Record<string, unknown> = {
      name: profile.agent.name,
      role: profile.agent.role,
      model: draftModel || profile.agent.model,
      files: draftFiles,
    };
    const data = await tryApiFetch<{ success: boolean } & Record<string, unknown>>(
      `/agent/agents/${selectedId}/files`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    if (data) {
      setProfile((prev) => prev ? { ...prev, agent: { ...prev.agent, model: draftModel || prev.agent.model }, files: { ...draftFiles } } : prev);
      setEditing(false);
    } else {
      setProfileError("فشل حفظ التعديلات");
    }
    setProfileSaving(false);
  };

  const hasChanges = profile && (
    draftModel !== (profile.agent.model || "")
    || !FILES_EQUAL(draftFiles, profile.files)
  );

  const selectedAgent = agents.find((a) => a.id === selectedId);
  const channels = useMemo(() => getAgentChannels(profile), [profile]);
  const active = isActive(profile?.agent?.status);
  const createdStr = relativeTime((profile?.agent as { createdAt?: string })?.createdAt);

  const filteredAgents = agents.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
  });

  const renderFileContent = (fileKey: string) => {
    if (!profile) return null;
    const content = editing ? draftFiles[fileKey] || "" : profile.files[fileKey];
    if (!editing) return <MarkdownBlock content={content} />;
    return (
      <Textarea
        value={content}
        onChange={(e) => setDraftFiles({ ...draftFiles, [fileKey]: e.target.value })}
        className="min-h-[300px] font-mono text-sm leading-relaxed resize-y border rounded-xl p-4"
        dir="ltr"
        spellCheck={false}
      />
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Bot className="size-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Agents</h2>
          {!agentsLoading && <span className="ml-auto text-xs text-slate-400">{agents.length}</span>}
        </div>
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pr-8 text-xs" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agentsLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="size-5 text-indigo-500 animate-spin" /></div>
          ) : filteredAgents.map((agent) => (
            <button key={agent.id} onClick={() => setSelectedId(agent.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                selectedId === agent.id
                  ? "bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <span className="text-xl flex-shrink-0">{agent.icon || "🤖"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-semibold truncate ${selectedId === agent.id ? "text-indigo-700 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>{agent.name}</p>
                  <span className={`inline-block size-1.5 rounded-full flex-shrink-0 ${
                    selectedId === agent.id ? (profile && selectedId === agent.id && active ? "bg-emerald-500" : "bg-slate-300") : "bg-slate-300 dark:bg-slate-600"
                  }`} />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{agent.role}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {selectedAgent ? (
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{selectedAgent.icon || "🤖"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">{selectedAgent.name}</h1>
                  {profile && (
                    <>
                      <span className={`inline-block size-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className="text-xs text-slate-500">{active ? "نشط" : "متوقف"}</span>
                      {channels.map((ch) => (
                        <span key={ch} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">{CHANNEL_META[ch] || ch}</span>
                      ))}
                      {createdStr && <span className="text-xs text-slate-400"><Clock className="inline-block size-3 ml-1" />{createdStr}</span>}
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAgent.role}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {profile && (
                  <div className="flex items-center gap-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800 px-3 py-1.5">
                    <Switch checked={active} onCheckedChange={toggleStatus} disabled={statusSaving} />
                    <span className="text-xs font-medium text-slate-500">{statusSaving ? "..." : active ? "مفعل" : "متوقف"}</span>
                  </div>
                )}
                {profile?.agent.templateSlug && (
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded">{profile.agent.templateSlug}</span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select an agent from the left</p>
          )}

          {/* Model + Save */}
          {profile && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">الموديل:</span>
                <Select value={draftModel} onValueChange={(v) => { setDraftModel(v ?? ""); if (!editing) setEditing(true); }}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 dark:border-slate-700 rounded-lg flex-1 min-w-0">
                    <SelectValue placeholder={models.length > 0 ? "اختر موديل..." : "لا توجد موديلات متاحة"} />
                  </SelectTrigger>
                  <SelectContent>
                    {draftModel && !models.some((m) => m.modelName === draftModel) && (
                      <SelectItem value={draftModel} className="text-sm">
                        <span className="font-medium">{draftModel}</span>
                        <span className="text-xs text-slate-400 mr-2">· الحالي</span>
                      </SelectItem>
                    )}
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.modelName} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.modelName}</span>
                          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{m.provider}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasChanges && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-9 text-xs px-3" onClick={() => { setEditing(false); setDraftModel(profile.agent.model || ""); setDraftFiles({ ...profile.files }); }}>
                    <X className="size-3.5 ml-1.5" />تراجع
                  </Button>
                  <Button size="sm" className="h-9 text-xs px-4" onClick={saveProfile} disabled={profileSaving}>
                    {profileSaving ? <Loader2 className="size-3.5 animate-spin ml-1.5" /> : <Save className="size-3.5 ml-1.5" />}
                    {profileSaving ? "حفظ..." : "حفظ"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex gap-1">
          {TABS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {profileLoading && <div className="flex items-center justify-center py-16"><Loader2 className="size-6 text-indigo-500 animate-spin" /></div>}

          {profileError && !profileLoading && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl max-w-lg">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
            </div>
          )}

          {!profileLoading && !profileError && profile && (
            <>
              {(["soul", "agents", "tools"] as Tab[]).includes(tab) && (
                <div className="max-w-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{FILE_KEYS[tab]}</h3>
                    <button onClick={() => { if (!editing) { setEditing(true); } else { setDraftFiles({ ...profile.files }); setEditing(false); } }}
                      className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                      {editing ? <X className="size-3" /> : <PenLine className="size-3" />}
                      {editing ? "إلغاء" : "تعديل"}
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                    {renderFileContent(FILE_KEYS[tab])}
                  </div>
                </div>
              )}

              {tab === "tools" && profile.allowedTools.length > 0 && (
                <div className="max-w-3xl mt-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Allowed Tools ({profile.allowedTools.length})</h3>
                  <div className="flex flex-wrap gap-2">{profile.allowedTools.map((t) => <ToolBadge key={t} name={t} />)}</div>
                </div>
              )}

              {tab === "skills" && (
                <div className="max-w-3xl space-y-6">
                  {/* Agent Template Skills */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      مهارات الـ Agent ({profile.skills.length})
                    </h3>
                    {profile.skills.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">لا توجد مهارات مخصصة لهذا الـ agent.</p>
                    ) : (
                      <div className="space-y-2">
                        {profile.skills.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
                      </div>
                    )}
                  </div>

                  {/* Company Skills (custom) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        مهارات الشركة ({companySkills.length})
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => setCreateSkillOpen(true)}
                        className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                      >
                        <Plus className="size-3.5" />
                        إنشاء مهارة
                      </Button>
                    </div>

                    {companySkillsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="size-4 text-indigo-500 animate-spin" />
                      </div>
                    ) : companySkills.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
                        <Zap className="size-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">لا توجد مهارات مخصصة بعد</p>
                        <p className="text-xs text-slate-400 mt-1">اضغط على "إنشاء مهارة" لإضافة مهارة جديدة</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {companySkills.map((skill) => (
                          <div key={skill.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                              <Zap className="size-4 text-indigo-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{skill.name}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                                    skill.enabled
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-100 text-slate-500 border-slate-200"
                                  }`}>
                                    {skill.enabled ? "مفعل" : "متوقف"}
                                  </span>
                                </div>
                                {skill.description && (
                                  <p className="text-xs text-slate-500 mt-0.5 truncate">{skill.description}</p>
                                )}
                              </div>
                              {skill.tools.length > 0 && (
                                <span className="text-xs text-slate-400 flex-shrink-0">{skill.tools.length} أداة</span>
                              )}
                              <button
                                onClick={() => handleDeleteSkill(skill.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                                title="حذف"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                            {(skill.instructions || skill.tools.length > 0) && (
                              <div className="px-4 py-3 space-y-2 bg-white dark:bg-slate-900">
                                {skill.instructions && (
                                  <p className="text-xs text-slate-500 italic border-l-2 border-slate-200 pl-3 line-clamp-2">
                                    {skill.instructions}
                                  </p>
                                )}
                                {skill.tools.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {skill.tools.map((t) => <ToolBadge key={t} name={t} />)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!profileLoading && !profileError && !profile && selectedId && (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-5 text-indigo-500 animate-spin" /></div>
          )}

          {!selectedId && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bot className="size-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">اختر وكيلاً من القائمة</p>
            </div>
          )}
        </div>
      </main>

      <CreateSkillDrawer
        open={createSkillOpen}
        onClose={() => setCreateSkillOpen(false)}
        onCreated={handleSkillCreated}
        tryApiFetch={tryApiFetch}
      />
    </div>
  );
}
