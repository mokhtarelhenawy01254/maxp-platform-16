import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Brain, Users, Wrench, Zap, ChevronDown, ChevronRight,
  Loader2, AlertCircle, Bot, Search, Clock, PenLine, Save, X,
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
                <div className="max-w-3xl space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Skills ({profile.skills.length})</h3>
                  {profile.skills.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No skills assigned to this agent.</p>
                  ) : (
                    profile.skills.map((skill) => <SkillCard key={skill.id} skill={skill} />)
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
    </div>
  );
}
