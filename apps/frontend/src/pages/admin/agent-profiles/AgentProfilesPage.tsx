import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Brain, Users, Wrench, Zap, ChevronDown, ChevronRight,
  Loader2, AlertCircle, Bot, Search, Clock, PenLine, Save, X, Plus, Trash2,
} from "lucide-react";
import { sandboxApi, type AgentProfileResponse, type AgentSkillDetail } from "../ai-agent-sandbox/services/sandboxApi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
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

  /* ── Delete agent state ── */
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ── Edit state ── */
  const [editing, setEditing] = useState(false);
  const [draftModel, setDraftModel] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftIcon, setDraftIcon] = useState("🤖");
  const [draftFiles, setDraftFiles] = useState<Record<string, string>>({});
  const [draftAllowedTools, setDraftAllowedTools] = useState<string[]>([]);
  const [draftAllowedSkills, setDraftAllowedSkills] = useState<string[]>([]);
  const [profileSaving, setProfileSaving] = useState(false);

  /* ── All available tools & skills ── */
  const [allTools, setAllTools] = useState<Array<{ name: string; description?: string; sideEffects?: string }>>([]);
  const [allSkills, setAllSkills] = useState<Array<{ id: string; displayName?: string }>>([]);

  /* ── Create agent state ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentModel, setNewAgentModel] = useState("");
  const [newAgentIcon, setNewAgentIcon] = useState("🤖");
  const [newAgentDesc, setNewAgentDesc] = useState("");
  const [newAgentTemplate, setNewAgentTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Array<{ slug: string; name: string; role: string; allowedTools: string[]; allowedSkills: string[] }>>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const AGENT_ICONS = ["🤖", "💼", "🎧", "📦", "📣", "💬", "📊", "🧠", "⚡", "🎯", "🛒", "🔧"];

  const TEMPLATE_ICON: Record<string, string> = {
    sales: "💼", "sales-agent": "💼",
    support: "🎧", "support-agent": "🎧",
    inventory: "📦", "inventory-pricing-agent": "📦",
    marketing: "📣", "marketing-agent": "📣",
    facebook: "💬", "facebook-sales-support-agent": "💬",
    sas: "📊", "sas-sales-agent": "📊",
    ceo: "🧠", "manager-ceo": "🧠",
    competitor: "🔍", analyst: "🔍",
    order: "🛒", "order-agent": "🛒",
    customer: "🤝",
  };
  const templateIcon = (slug: string) => {
    for (const [key, icon] of Object.entries(TEMPLATE_ICON)) {
      if (slug.includes(key)) return icon;
    }
    return "🤖";
  };

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

  /* ── Load available tools & skills ── */
  useEffect(() => {
    Promise.all([
      tryApiFetch<{ tools: Array<{ name: string; description?: string; sideEffects?: string }> }>("/agent/tools"),
      tryApiFetch<{ skills: Array<{ id: string; displayName?: string }> }>("/agent/skills"),
    ]).then(([t, s]) => {
      if (t?.tools) setAllTools(t.tools);
      if (s?.skills) setAllSkills(s.skills);
    });
  }, []);

  /* ── Load templates ── */
  useEffect(() => {
    if (!createOpen) return;
    setTemplatesLoading(true);
    tryApiFetch<{ profiles: Array<{ slug: string; name: string; role: string; allowedTools: string[]; allowedSkills: string[] }> }>("/agent-manager/profiles")
      .then((data) => {
        if (data?.profiles) setTemplates(data.profiles);
        else setTemplates([]);
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [createOpen]);

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
      .then((data) => { if (!cancelled) { setProfile(data); setDraftModel(data.agent.model || ""); setDraftName(data.agent.name); setDraftIcon(data.agent.icon || "🤖"); setDraftFiles({ ...data.files }); setDraftAllowedTools(data.allowedTools || []); setDraftAllowedSkills(data.skillIds || []); } })
      .catch((err) => { if (!cancelled) setProfileError(err?.message || "Failed to load profile"); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

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
      name: draftName || profile.agent.name,
      role: profile.agent.role,
      model: draftModel || profile.agent.model,
      icon: draftIcon,
      allowedTools: draftAllowedTools,
      allowedSkills: draftAllowedSkills,
      files: draftFiles,
    };
    const data = await tryApiFetch<{ success: boolean } & Record<string, unknown>>(
      `/agent/agents/${selectedId}/files`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    if (data) {
      setProfile((prev) => prev ? { ...prev, agent: { ...prev.agent, model: draftModel || prev.agent.model, name: draftName || prev.agent.name, icon: draftIcon }, allowedTools: draftAllowedTools, skillIds: draftAllowedSkills, files: { ...draftFiles } } : prev);
      setAgents((prev) => prev.map((a) => a.id === selectedId ? { ...a, name: draftName || a.name, icon: draftIcon } : a));
      setEditing(false);
      toast.success("تم حفظ التعديلات بنجاح");
    } else {
      setProfileError("فشل حفظ التعديلات");
    }
    setProfileSaving(false);
  };

  const selectedTemplate = templates.find((t) => t.slug === newAgentTemplate);

  /* ── Create agent ── */
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;
    setCreating(true);
    setCreateError(null);
    const selectedTemplate = templates.find((t) => t.slug === newAgentTemplate);
    const data = await tryApiFetch<{ success: boolean; agent: { id: string; name: string } }>(
      "/agent/agents",
      { method: "POST", body: JSON.stringify({
        name: newAgentName.trim(),
        role: selectedTemplate?.role || "CUSTOM",
        templateSlug: newAgentTemplate || null,
        model: newAgentModel || null,
        icon: newAgentIcon,
        description: newAgentDesc || null,
        allowedTools: selectedTemplate?.allowedTools || null,
        allowedSkills: selectedTemplate?.allowedSkills || null,
      })},
    );
    if (data?.agent?.id) {
      setCreateOpen(false);
      setNewAgentName("");
      setNewAgentModel("");
      setNewAgentIcon("🤖");
      setNewAgentDesc("");
      setNewAgentTemplate(null);
      toast.success(`تم إنشاء الوكيل ${data.agent.name} بنجاح`);
      sandboxApi.getAgents().then((res) => {
        setAgents(res.agents as AgentItem[]);
        setSelectedId(data.agent.id);
        const params = new URLSearchParams(searchParams);
        params.set("agent", data.agent.id);
        setSearchParams(params, { replace: true });
      }).catch(() => {});
    } else {
      setCreateError("فشل إنشاء الوكيل. قد يكون الاسم مستخدماً بالفعل.");
    }
    setCreating(false);
  };

  /* ── Delete agent ── */
  const handleDeleteAgent = async () => {
    if (!deleteConfirm || !selectedId) return;
    setDeleting(true);
    setCreateError(null);
    const data = await tryApiFetch<{ success: boolean }>(`/agent/agents/${selectedId}`, { method: "DELETE" });
    if (data) {
      setDeleteConfirm(null);
      const remaining = agents.filter((a) => a.id !== selectedId);
      setAgents(remaining);
      if (remaining.length > 0) setSelectedId(remaining[0].id);
      else setSelectedId(null);
      toast.success("تم حذف الوكيل بنجاح");
    } else {
      setCreateError("فشل حذف الوكيل");
    }
    setDeleting(false);
  };

  const hasChanges = profile && (
    draftModel !== (profile.agent.model || "")
    || draftName !== (profile.agent.name || "")
    || draftIcon !== (profile.agent.icon || "🤖")
    || JSON.stringify(draftAllowedTools) !== JSON.stringify(profile.allowedTools || [])
    || JSON.stringify(draftAllowedSkills) !== JSON.stringify(profile.skillIds || [])
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
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center size-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-indigo-600"
            title="إضافة وكيل جديد"
          >
            <Plus className="size-4" />
          </button>
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
              {editing ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="grid grid-cols-4 gap-0.5">
                    {AGENT_ICONS.map((icon) => (
                      <button key={icon} type="button" onClick={() => { setDraftIcon(icon); if (!editing) setEditing(true); }}
                        className={`size-7 flex items-center justify-center rounded-md text-sm border transition-all ${
                          draftIcon === icon
                            ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >{icon}</button>
                    ))}
                  </div>
                  <span className="text-[8px] text-slate-400">الأيقونة</span>
                </div>
              ) : (
                <span className="text-2xl flex-shrink-0">{selectedAgent.icon || "🤖"}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {editing ? (
                    <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} className="h-8 text-base font-bold w-64" />
                  ) : (
                    <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">{selectedAgent.name}</h1>
                  )}
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
                {profile && selectedAgent?.role !== "CEO" && (
                  <button onClick={() => setDeleteConfirm(selectedId)} className="flex items-center justify-center size-8 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-600 transition-all" title="حذف الوكيل">
                    <Trash2 className="size-3.5" />
                  </button>
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
                  <Button size="sm" variant="outline" className="h-9 text-xs px-3" onClick={() => { setEditing(false); setDraftModel(profile.agent.model || ""); setDraftName(profile.agent.name); setDraftIcon(profile.agent.icon || "🤖"); setDraftAllowedTools(profile.allowedTools || []); setDraftAllowedSkills(profile.skillIds || []); setDraftFiles({ ...profile.files }); }}>
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

              {tab === "tools" && (
                <div className="max-w-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Allowed Tools ({draftAllowedTools.length})</h3>
                    {!editing && profile && (
                      <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                        <PenLine className="size-3" />تعديل
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div className="space-y-2">
                      {allTools.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4">جاري تحميل الأدوات...</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {allTools.map((tool) => {
                            const enabled = draftAllowedTools.includes(tool.name);
                            return (
                              <button key={tool.name} type="button" onClick={() => { if (!editing) setEditing(true); setDraftAllowedTools((prev) => prev.includes(tool.name) ? prev.filter((t) => t !== tool.name) : [...prev, tool.name]); }}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                                  enabled
                                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700"
                                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 opacity-60"
                                }`}
                              >
                                <span className={`size-2 rounded-full flex-shrink-0 ${enabled ? "bg-indigo-500" : "bg-slate-300"}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold truncate">{tool.name}</p>
                                  {tool.description && <p className="text-[10px] text-slate-500 truncate">{tool.description}</p>}
                                </div>
                                {tool.sideEffects === "write" && <span className="text-[8px] text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">write</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : draftAllowedTools.length > 0 ? (
                    <div className="flex flex-wrap gap-2">{draftAllowedTools.map((t) => <ToolBadge key={t} name={t} />)}</div>
                  ) : (
                    <p className="text-sm text-slate-400 italic py-4">لا توجد أدوات مخصصة لهذا الوكيل.</p>
                  )}
                </div>
              )}

              {tab === "skills" && (
                <div className="max-w-3xl space-y-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Skills ({draftAllowedSkills.length})</h3>
                    {!editing && profile && (
                      <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                        <PenLine className="size-3" />تعديل
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div className="space-y-1">
                      {allSkills.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4">جاري تحميل المهارات...</p>
                      ) : (
                        allSkills.map((skill) => {
                          const enabled = draftAllowedSkills.includes(skill.id);
                          return (
                            <button key={skill.id} type="button" onClick={() => { if (!editing) setEditing(true); setDraftAllowedSkills((prev) => prev.includes(skill.id) ? prev.filter((s) => s !== skill.id) : [...prev, skill.id]); }}
                              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                                enabled
                                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 opacity-60"
                              }`}
                            >
                              <span className={`size-2 rounded-full flex-shrink-0 ${enabled ? "bg-indigo-500" : "bg-slate-300"}`} />
                              <Zap className={`size-4 flex-shrink-0 ${enabled ? "text-indigo-500" : "text-slate-400"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold truncate">{skill.displayName || skill.id}</p>
                                <p className="text-xs text-slate-500 font-mono">{skill.id}</p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : profile.skills.length > 0 ? (
                    profile.skills.map((skill) => <SkillCard key={skill.id} skill={skill} />)
                  ) : (
                    <p className="text-sm text-slate-400 italic">لم يتم تعيين مهارات لهذا الوكيل.</p>
                  )}
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

      {/* Create Agent Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o && !creating) setCreateOpen(false); }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[85vh]">
          <div className="flex flex-col max-h-[85vh]">
            {/* Fixed Header */}
            <div className="p-5 pb-0 flex-shrink-0">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-base flex items-center gap-2">
                  <span className="size-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm">✨</span>
                  إضافة وكيل جديد
                </DialogTitle>
              </DialogHeader>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-5 pb-2 flex-1 scrollbar-thin">
              {/* Template Selector */}
              <section className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">القالب</h4>
                </div>
                {templatesLoading ? (
                  <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"><Loader2 className="size-3.5 animate-spin text-indigo-500" /><span className="text-xs text-slate-400">جارٍ تحميل القوالب...</span></div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    <button type="button" onClick={() => setNewAgentTemplate(null)}
                      className={`flex flex-col items-center gap-1 p-2.5 min-w-[80px] rounded-xl border-2 text-center transition-all shrink-0 ${
                        !newAgentTemplate
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <span className={`size-8 flex items-center justify-center rounded-lg text-lg transition-all ${!newAgentTemplate ? "bg-indigo-100 dark:bg-indigo-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>⚙️</span>
                      <p className={`text-[10px] font-semibold ${!newAgentTemplate ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}>مخصص</p>
                      {!newAgentTemplate && <span className="size-1 rounded-full bg-indigo-500" />}
                    </button>
                    {templates.map((tpl) => (
                      <button key={tpl.slug} type="button" onClick={() => { setNewAgentTemplate(tpl.slug); if (!newAgentName) setNewAgentName(tpl.name); }}
                        className={`flex flex-col items-center gap-1 p-2.5 min-w-[80px] rounded-xl border-2 text-center transition-all shrink-0 ${
                          newAgentTemplate === tpl.slug
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <span className={`size-8 flex items-center justify-center rounded-lg text-lg transition-all ${newAgentTemplate === tpl.slug ? "bg-indigo-100 dark:bg-indigo-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
                          {templateIcon(tpl.slug)}
                        </span>
                        <p className={`text-[10px] font-semibold leading-tight ${newAgentTemplate === tpl.slug ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}>{tpl.name}</p>
                        <span className="text-[8px] text-slate-400">{tpl.allowedTools.length} أدوات · {tpl.allowedSkills.length} مهارات</span>
                        {newAgentTemplate === tpl.slug && <span className="size-1 rounded-full bg-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Agent Identity */}
              <section className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">الهوية</h4>
                </div>
                <div className="flex gap-2.5">
                  <div className="flex-shrink-0">
                    <label className="text-[9px] font-medium text-slate-400 block mb-1 text-center">الأيقونة</label>
                    <div className="grid grid-cols-4 gap-0.5">
                      {AGENT_ICONS.map((icon) => (
                        <button key={icon} type="button" onClick={() => setNewAgentIcon(icon)} title={icon}
                          className={`size-8 flex items-center justify-center rounded-lg text-base border transition-all ${
                            newAgentIcon === icon
                              ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600 shadow-sm"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >{icon}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 block mb-0.5">اسم الوكيل *</label>
                      <Input placeholder="مثال: وكيل مبيعات متجر" value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} disabled={creating} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 block mb-0.5">الوصف (اختياري)</label>
                      <Input placeholder="وصف مختصر لمهام الوكيل..." value={newAgentDesc} onChange={(e) => setNewAgentDesc(e.target.value)} disabled={creating} className="h-8 text-sm" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Model */}
              <section className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">الموديل</h4>
                </div>
                <Select value={newAgentModel} onValueChange={setNewAgentModel} disabled={creating}>
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="اختر موديل التشغيل..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون موديل</SelectItem>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.modelName}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.modelName}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{m.provider}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>
            </div>

            {/* Fixed Footer (Summary + Actions) */}
            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4 flex-shrink-0">
              {/* Preview bar */}
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-xl flex-shrink-0">{newAgentIcon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{newAgentName || "اسم الوكيل"}</p>
                    <span className={`size-1.5 rounded-full flex-shrink-0 ${newAgentName ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[10px] text-slate-500">{newAgentDesc || (selectedTemplate ? selectedTemplate.name : "وكيل مخصص")}</span>
                    {selectedTemplate ? (
                      <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-medium">{selectedTemplate.role || selectedTemplate.slug}</span>
                    ) : (
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">CUSTOM</span>
                    )}
                    {newAgentModel && newAgentModel !== "none" && (
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">{newAgentModel.split("/").pop()}</span>
                    )}
                  </div>
                </div>
              </div>

              {createError && (
                <div className="flex items-start gap-2 p-2.5 mb-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertCircle className="size-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400">{createError}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating} className="h-8 text-xs px-3">
                  إلغاء
                </Button>
                <Button onClick={handleCreateAgent} disabled={creating || !newAgentName.trim()} className="h-8 text-xs px-4">
                  {creating ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : <Plus className="ml-1.5 size-3.5" />}
                  {creating ? "جارٍ الإنشاء..." : "إنشاء الوكيل"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o && !deleting) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-4" />
              حذف الوكيل
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              هل أنت متأكد من حذف الوكيل <strong className="text-slate-800 dark:text-slate-200">{selectedAgent?.name}</strong>؟
            </p>
            <p className="text-xs text-slate-400 mt-2">لا يمكن التراجع عن هذا الإجراء. سيتم أرشفة الوكيل بدلاً من حذفه نهائياً.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDeleteAgent} disabled={deleting}>
              {deleting ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : null}
              {deleting ? "جارٍ الحذف..." : "تأكيد الحذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
