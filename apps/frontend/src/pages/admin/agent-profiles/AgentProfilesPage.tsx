import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Brain, Users, Wrench, Zap, ChevronDown, ChevronRight, ChevronUp,
  Loader2, AlertCircle, Bot, Search, Clock, PenLine, Save, X, Plus, Trash2,
  BookOpen, Shield, FileCode, RefreshCw, Eye, EyeOff, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sandboxApi, type AgentProfileResponse, type AgentSkillDetail } from "../ai-agent-sandbox/services/sandboxApi";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";

type Tab = "soul" | "agents" | "tools-md" | "tools" | "skills-json";

const FILE_KEYS: Record<string, string> = {
  soul: "SOUL.md",
  agents: "AGENTS.md",
  "tools-md": "TOOLS.md",
  "skills-json": "SKILLS.json",
};

const isActive = (s?: string | null) => String(s || "").toUpperCase() === "ACTIVE";

const relativeTime = (dateStr: string | null | undefined, t: (key: string, opts?: Record<string, unknown>) => string, locale?: string) => {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("agentProfiles.time.now");
  if (minutes < 60) return t("agentProfiles.time.minutesAgo", { minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("agentProfiles.time.hoursAgo", { hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("agentProfiles.time.daysAgo", { days });
  return new Date(dateStr).toLocaleDateString(locale || "ar-EG");
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

const collectAgentText = (agent?: { name?: string; role?: string; templateSlug?: string | null; description?: string | null; createdBy?: string | null } | null) => [
  agent?.role, agent?.templateSlug, agent?.description, agent?.createdBy,
].filter(Boolean).join(" ").toLowerCase();

const renderMarkdownPreview = (md: string, t: (key: string) => string): string => {
  if (!md) return `<p style="color: var(--color-muted-foreground)">${t("agentProfiles.editor.emptyContent")}</p>`;
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>").replace(/^## (.+)$/gm, "<h2>$1</h2>").replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>").replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>").replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>")
    .replace(/^/, "<p>").replace(/$/, "</p>");
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

function ToolBadge({ name }: { name: string }) {
  const isWrite =
    name.includes("create") || name.includes("update") ||
    name.includes("delete") || name.includes("send") || name.includes("write");
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
      isWrite
        ? "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-400"
        : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400"
    }`}>
      {name}
    </span>
  );
}

function SkillCard({ skill }: { skill: AgentSkillDetail }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Zap className="size-4 text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{skill.displayName || skill.id}</span>
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t("agentProfiles.skillCard.tools", { count: skill.allowedTools.length })}</p>
              <div className="flex flex-wrap gap-1.5">{skill.allowedTools.map((t) => <ToolBadge key={t} name={t} />)}</div>
            </div>
          ) : <p className="text-xs text-slate-400 italic">{t("agentProfiles.skillCard.noTools")}</p>}
        </div>
      )}
    </div>
  );
}

function FieldEditor({ label, value, onChange, minRows = 8, disablePreview = false }: {
  label: string; value: string; onChange: (v: string) => void; minRows?: number; disablePreview?: boolean;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const lineCount = value.split("\n").length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const shouldCollapse = !expanded && lineCount > 6;
  const isMarkdown = label.endsWith(".md");

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <FileCode className="size-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono tracking-wide">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] text-slate-400">{t("agentProfiles.editor.linesWords", { lineCount, wordCount })}</span>
          {isMarkdown && !disablePreview && (
            <button type="button" onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            >
              {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPreview ? t("agentProfiles.editor.edit") : t("agentProfiles.editor.preview")}
            </button>
          )}
          {lineCount > 6 && (
            <button type="button" onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 transition-colors px-2 py-1 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            >
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {expanded ? t("agentProfiles.editor.collapse") : t("agentProfiles.editor.expand")}
            </button>
          )}
        </div>
      </div>
      {showPreview && isMarkdown && !disablePreview ? (
        <div className="p-5" dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(value, t) }} />
      ) : (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)}
          rows={shouldCollapse ? 10 : minRows}
          className="resize-y border-0 rounded-none bg-transparent font-mono text-sm leading-[1.8] text-slate-800 dark:text-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400/40 px-5 py-4 min-h-[200px]"
          dir="ltr" spellCheck={false}
          placeholder={t("agentProfiles.editor.placeholder", { label })}
        />
      )}
    </div>
  );
}

function MetadataGrid({ agent, resolvedParentName }: { agent: { departmentIcon?: string | null; departmentName?: string | null; managerType?: string | null; createdBy?: string | null; parentId?: string | null }; resolvedParentName: string | null }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="px-6 pt-3">
      <button type="button" onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors w-full"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        <span className="font-medium">{t("agentProfiles.metadata.title")}</span>
        {!expanded && (
          <span className="mr-2 text-slate-400/60 truncate">
            {agent.departmentName || t("agentProfiles.metadata.noDepartment")} · {agent.managerType || "AGENT"}
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">{t("agentProfiles.metadata.department")}</span>
            <span className="text-slate-700 dark:text-slate-300">{agent.departmentIcon} {agent.departmentName || t("agentProfiles.metadata.unspecified")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">{t("agentProfiles.metadata.level")}</span>
            <span className="text-slate-700 dark:text-slate-300">{agent.managerType || "AGENT"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">{t("agentProfiles.metadata.manager")}</span>
            <span className="text-slate-700 dark:text-slate-300">{resolvedParentName || t("agentProfiles.metadata.none")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-400">{t("agentProfiles.metadata.createdBy")}</span>
            <span className="text-slate-700 dark:text-slate-300">{agent.createdBy || t("agentProfiles.metadata.system")}</span>
          </div>
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
  departmentIcon?: string | null;
  departmentName?: string | null;
  managerType?: string | null;
  createdBy?: string | null;
  parentId?: string | null;
}

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

export default function AgentProfilesPage() {
  const { t, i18n } = useTranslation();
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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draftModel, setDraftModel] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftIcon, setDraftIcon] = useState("🤖");
  const [draftFiles, setDraftFiles] = useState<Record<string, string>>({});
  const [draftAllowedTools, setDraftAllowedTools] = useState<string[]>([]);
  const [draftAllowedSkills, setDraftAllowedSkills] = useState<string[]>([]);
  const [draftToolAutonomy, setDraftToolAutonomy] = useState<Record<string, string>>({});
  const [draftConfig, setDraftConfig] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);

  const [allTools, setAllTools] = useState<Array<{ name: string; description?: string; sideEffects?: string }>>([]);
  const [allSkills, setAllSkills] = useState<Array<{ id: string; displayName?: string }>>([]);

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

  const hasUnsavedChanges = useMemo(() => {
    if (!profile) return false;
    return (
      draftModel !== (profile.agent.model || "")
      || draftName !== (profile.agent.name || "")
      || draftIcon !== (profile.agent.icon || "🤖")
      || JSON.stringify(draftAllowedTools) !== JSON.stringify(profile.allowedTools || [])
      || JSON.stringify(draftAllowedSkills) !== JSON.stringify(profile.skillIds || [])
      || JSON.stringify(draftToolAutonomy) !== JSON.stringify(
          (profile.agent as { toolAutonomy?: Record<string, string> }).toolAutonomy || {}
        )
      || JSON.stringify(draftConfig) !== JSON.stringify(
          (profile.agent as { config?: Record<string, string> }).config || {}
        )
      || !FILES_EQUAL(draftFiles, profile.files)
    );
  }, [profile, draftModel, draftName, draftIcon, draftAllowedTools, draftAllowedSkills, draftToolAutonomy, draftConfig, draftFiles]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "soul",   label: t("agentProfiles.tabs.soul"),   icon: <BookOpen className="size-4" /> },
    { key: "agents", label: t("agentProfiles.tabs.agents"),  icon: <Users className="size-4" /> },
    { key: "tools-md",  label: t("agentProfiles.tabs.toolsMd"),  icon: <Wrench className="size-4" /> },
    { key: "tools", label: t("agentProfiles.tabs.tools"),   icon: <Shield className="size-4" /> },
    { key: "skills-json", label: t("agentProfiles.tabs.skillsJson"), icon: <FileCode className="size-4" /> },
  ];

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
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setDraftModel(data.agent.model || "");
          setDraftName(data.agent.name);
          setDraftIcon(data.agent.icon || "🤖");
          setDraftFiles({ ...data.files });
          setDraftAllowedTools(data.allowedTools || []);
          setDraftAllowedSkills(data.skillIds || []);
          setDraftToolAutonomy((data.agent as { toolAutonomy?: Record<string, string> }).toolAutonomy || {});
          setDraftConfig((data.agent as { config?: Record<string, string> }).config || {});
        }
      })
      .catch((err) => { if (!cancelled) setProfileError(err?.message || "Failed to load profile"); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  /* ── beforeunload warning ── */
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  /* ── Ctrl+S save ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges && !profileSaving) saveProfile();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasUnsavedChanges, profileSaving]);

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
    const skillsJson = draftFiles["SKILLS.json"];
    if (skillsJson?.trim()) {
      try { JSON.parse(skillsJson); }
      catch { setTab("skills-json"); setProfileError(t("agentProfiles.toast.invalidSkillsJson")); return; }
    }
    setProfileSaving(true);
    setProfileError(null);
    const body: Record<string, unknown> = {
      name: draftName || profile.agent.name,
      role: profile.agent.role,
      model: draftModel || profile.agent.model,
      icon: draftIcon,
      allowedTools: draftAllowedTools,
      allowedSkills: draftAllowedSkills,
      toolAutonomy: draftToolAutonomy,
      config: draftConfig,
      files: draftFiles,
    };
    const data = await tryApiFetch<{ success: boolean } & Record<string, unknown>>(
      `/agent/agents/${selectedId}/files`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    if (data) {
      setProfile((prev) => prev ? {
        ...prev,
        agent: { ...prev.agent, model: draftModel || prev.agent.model, name: draftName || prev.agent.name, icon: draftIcon, toolAutonomy: draftToolAutonomy, config: draftConfig } as typeof prev.agent,
        allowedTools: draftAllowedTools,
        skillIds: draftAllowedSkills,
        files: { ...draftFiles },
      } : prev);
      setAgents((prev) => prev.map((a) => a.id === selectedId ? { ...a, name: draftName || a.name, icon: draftIcon } : a));
      setEditing(false);
      toast.success(t("agentProfiles.toast.saveSuccess"));
    } else {
      setProfileError(t("agentProfiles.toast.saveFailed"));
    }
    setProfileSaving(false);
  };

  const selectedTemplate = templates.find((t) => t.slug === newAgentTemplate);

  /* ── Create agent ── */
  const handleCreateAgent = async () => {
    if (!newAgentName.trim()) return;
    setCreating(true);
    setCreateError(null);
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
      toast.success(t("agentProfiles.toast.createSuccess", { name: data.agent.name }));
      sandboxApi.getAgents().then((res) => {
        setAgents(res.agents as AgentItem[]);
        setSelectedId(data.agent.id);
        const params = new URLSearchParams(searchParams);
        params.set("agent", data.agent.id);
        setSearchParams(params, { replace: true });
      }).catch(() => {});
    } else {
      setCreateError(t("agentProfiles.toast.createFailed"));
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
      toast.success(t("agentProfiles.toast.deleteSuccess"));
    } else {
      setCreateError(t("agentProfiles.toast.deleteFailed"));
    }
    setDeleting(false);
  };

  const selectedAgent = agents.find((a) => a.id === selectedId);
  const channels = useMemo(() => getAgentChannels(profile), [profile]);
  const active = isActive(profile?.agent?.status);
  const createdStr = relativeTime((profile?.agent as { createdAt?: string })?.createdAt, t, i18n.language);

  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents) map.set(a.id, a.name);
    return map;
  }, [agents]);

  const resolvedParentName = selectedAgent?.parentId
    ? (agentNameMap.get(selectedAgent.parentId) || selectedAgent.parentId)
    : null;

  const filteredAgents = agents.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return collectAgentText(a).includes(q) || a.name.toLowerCase().includes(q);
  });

  const updateFile = (fileKey: string, value: string) => {
    if (!editing) setEditing(true);
    setDraftFiles((prev) => ({ ...prev, [fileKey]: value }));
  };

  const renderFileContent = (fileKey: string) => {
    if (!profile) return null;
    const content = (editing ? draftFiles[fileKey] : profile.files[fileKey]) || "";
    return <FieldEditor label={fileKey} value={content} onChange={(v) => updateFile(fileKey, v)} minRows={12} disablePreview={fileKey === "SKILLS.json"} />;
  };

  const discardChanges = () => {
    if (!profile) return;
    setEditing(false);
    setDraftModel(profile.agent.model || "");
    setDraftName(profile.agent.name);
    setDraftIcon(profile.agent.icon || "🤖");
    setDraftFiles({ ...profile.files });
    setDraftAllowedTools(profile.allowedTools || []);
    setDraftAllowedSkills(profile.skillIds || []);
    setDraftToolAutonomy((profile.agent as { toolAutonomy?: Record<string, string> }).toolAutonomy || {});
    setDraftConfig((profile.agent as { config?: Record<string, string> }).config || {});
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Bot className="size-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("agentProfiles.sidebar.title")}</h2>
          {!agentsLoading && <Badge variant="secondary" className="text-xs mr-auto">{agents.length}</Badge>}
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center justify-center size-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-indigo-600"
            title={t("agentProfiles.sidebar.addTitle")}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input placeholder={t("agentProfiles.sidebar.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pr-8 text-xs" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {agentsLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="size-5 text-indigo-500 animate-spin" /></div>
          ) : filteredAgents.length === 0 && searchQuery ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-xs text-slate-400">
              <Search className="size-6 text-slate-300" />
              <span>{t("agentProfiles.sidebar.noResults", { query: searchQuery })}</span>
            </div>
          ) : (
            filteredAgents.map((agent) => (
              <button key={agent.id} onClick={() => {
                if (hasUnsavedChanges && selectedId !== agent.id && !window.confirm(t("agentProfiles.sidebar.unsavedConfirm"))) return;
                setSelectedId(agent.id);
                setTab("soul");
              }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  selectedId === agent.id
                    ? "bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <span className="text-xl flex-shrink-0">{agent.icon || "🤖"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-semibold truncate ${
                      selectedId === agent.id ? "text-indigo-700 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"
                    }`}>{agent.name}</p>
                    <span className={`inline-block size-1.5 rounded-full flex-shrink-0 ${
                      profile && selectedId === agent.id && active ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                    }`} />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{agent.role}</p>
                  {(agent.departmentName) && (
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate">{agent.departmentIcon} {agent.departmentName}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Panel ── */}
      <main className="flex-1 flex flex-col overflow-y-auto">
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
                  <span className="text-[8px] text-slate-400">{t("agentProfiles.icon.label")}</span>
                </div>
              ) : (
                <span className="text-2xl flex-shrink-0">{selectedAgent.icon || "🤖"}</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {editing ? (
                    <Input value={draftName} onChange={(e) => { setDraftName(e.target.value); if (!editing) setEditing(true); }} className="h-8 text-base font-bold w-64" />
                  ) : (
                    <h1 className="text-base font-bold text-slate-800 dark:text-slate-200">{selectedAgent.name}</h1>
                  )}
                  {profile && (
                    <>
                      <span className={`inline-block size-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className="text-xs text-slate-500">{active ? t("agentProfiles.header.status.active") : t("agentProfiles.header.status.paused")}</span>
                      {channels.map((ch) => (
                        <span key={ch} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded font-medium">{t(`agentProfiles.channel.${ch}`)}</span>
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
                    <span className="text-xs font-medium text-slate-500">{statusSaving ? "..." : active ? t("agentProfiles.header.status.active_toggle") : t("agentProfiles.header.status.paused_toggle")}</span>
                  </div>
                )}
                {profile?.agent.templateSlug && (
                  <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 rounded">{profile.agent.templateSlug}</span>
                )}
                {profile && selectedAgent?.role !== "CEO" && (
                  <button onClick={() => setDeleteConfirm(selectedId)}
                    className="flex items-center justify-center size-8 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-600 transition-all"
                    title={t("agentProfiles.header.deleteTitle")}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{t("agentProfiles.header.noSelection")}</p>
          )}

          {/* Model + Save */}
          {profile && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{t("agentProfiles.header.model")}</span>
                <Select value={draftModel} onValueChange={(v) => { setDraftModel(v ?? ""); if (!editing) setEditing(true); }}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 dark:border-slate-700 rounded-lg flex-1 min-w-0">
                    <SelectValue placeholder={models.length > 0 ? t("agentProfiles.header.modelPlaceholder") : t("agentProfiles.header.noModels")} />
                  </SelectTrigger>
                  <SelectContent>
                    {draftModel && !models.some((m) => m.modelName === draftModel) && (
                      <SelectItem value={draftModel} className="text-sm">
                        <span className="font-medium">{draftModel}</span>
                        <span className="text-xs text-slate-400 mr-2">{t("agentProfiles.header.current")}</span>
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
              {hasUnsavedChanges && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-9 text-xs px-3" onClick={discardChanges}>
                    <X className="size-3.5 ml-1.5" />{t("agentProfiles.header.discard")}
                  </Button>
                  <Button size="sm" className="h-9 text-xs px-4" onClick={saveProfile} disabled={profileSaving}>
                    {profileSaving ? <Loader2 className="size-3.5 animate-spin ml-1.5" /> : <Save className="size-3.5 ml-1.5" />}
                    {profileSaving ? t("agentProfiles.header.saving") : t("agentProfiles.header.save")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Metadata Grid */}
        {selectedAgent && <MetadataGrid agent={selectedAgent} resolvedParentName={resolvedParentName} />}

        {/* Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex gap-1 overflow-x-auto">
          {tabs.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {profileLoading && <div className="flex items-center justify-center py-16"><Loader2 className="size-6 text-indigo-500 animate-spin" /></div>}

          {profileError && !profileLoading && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl max-w-lg mb-4">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>
            </div>
          )}

          {!profileLoading && !profileError && profile && (
            <>
              {(["soul", "agents", "tools-md"] as Tab[]).includes(tab) && (
                <div className="max-w-3xl">{renderFileContent(FILE_KEYS[tab])}</div>
              )}
              {tab === "skills-json" && (
                <div className="max-w-3xl">{renderFileContent("SKILLS.json")}</div>
              )}
              {tab === "tools" && (
                <ToolsAndSkillsTab
                  allTools={allTools}
                  allSkills={allSkills}
                  draftAllowedTools={draftAllowedTools}
                  draftAllowedSkills={draftAllowedSkills}
                  draftToolAutonomy={draftToolAutonomy}
                  draftConfig={draftConfig}
                  onAllowedToolsChange={setDraftAllowedTools}
                  onAllowedSkillsChange={setDraftAllowedSkills}
                  onToolAutonomyChange={setDraftToolAutonomy}
                  onConfigChange={setDraftConfig}
                />
              )}
            </>
          )}

          {!profileLoading && !profileError && !profile && selectedId && (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-5 text-indigo-500 animate-spin" /></div>
          )}

          {!selectedId && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bot className="size-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm text-slate-400">{t("agentProfiles.header.noSelection")}</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Create Agent Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o && !creating) setCreateOpen(false); }}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 max-h-[85vh]">
          <div className="flex flex-col max-h-[85vh]">
            <div className="p-5 pb-0 flex-shrink-0">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-base flex items-center gap-2">
                  <span className="size-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm">✨</span>
                  {t("agentProfiles.create.title")}
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="overflow-y-auto px-5 pb-2 flex-1 scrollbar-thin">
              <section className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("agentProfiles.create.template")}</h4>
                </div>
                {templatesLoading ? (
                  <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <Loader2 className="size-3.5 animate-spin text-indigo-500" />
                    <span className="text-xs text-slate-400">{t("agentProfiles.create.loadingTemplates")}</span>
                  </div>
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
                      <p className={`text-[10px] font-semibold ${!newAgentTemplate ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}>{t("agentProfiles.create.custom")}</p>
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
                        <span className="text-[8px] text-slate-400">{t("agentProfiles.create.toolsCount", { n: tpl.allowedTools.length, m: tpl.allowedSkills.length })}</span>
                        {newAgentTemplate === tpl.slug && <span className="size-1 rounded-full bg-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("agentProfiles.create.identity")}</h4>
                </div>
                <div className="flex gap-2.5">
                  <div className="flex-shrink-0">
                    <label className="text-[9px] font-medium text-slate-400 block mb-1 text-center">{t("agentProfiles.icon.label")}</label>
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
                      <label className="text-[9px] font-medium text-slate-400 block mb-0.5">{t("agentProfiles.create.name")}</label>
                      <Input placeholder={t("agentProfiles.create.namePlaceholder")} value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} disabled={creating} className="h-8 text-sm" />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium text-slate-400 block mb-0.5">{t("agentProfiles.create.description")}</label>
                      <Input placeholder={t("agentProfiles.create.descPlaceholder")} value={newAgentDesc} onChange={(e) => setNewAgentDesc(e.target.value)} disabled={creating} className="h-8 text-sm" />
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("agentProfiles.create.model")}</h4>
                </div>
                <Select value={newAgentModel} onValueChange={setNewAgentModel} disabled={creating}>
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder={t("agentProfiles.create.modelPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("agentProfiles.create.noModel")}</SelectItem>
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

            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4 flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-xl flex-shrink-0">{newAgentIcon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{newAgentName || t("agentProfiles.create.namePreview")}</p>
                    <span className={`size-1.5 rounded-full flex-shrink-0 ${newAgentName ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-[10px] text-slate-500">{newAgentDesc || (selectedTemplate ? selectedTemplate.name : t("agentProfiles.create.descPreview"))}</span>
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
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating} className="h-8 text-xs px-3">{t("agentProfiles.create.cancel")}</Button>
                <Button onClick={handleCreateAgent} disabled={creating || !newAgentName.trim()} className="h-8 text-xs px-4">
                  {creating ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : <Plus className="ml-1.5 size-3.5" />}
                  {creating ? t("agentProfiles.create.creating") : t("agentProfiles.create.submit")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o && !deleting) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-4" />
              {t("agentProfiles.delete.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span dangerouslySetInnerHTML={{ __html: t("agentProfiles.delete.confirm", { name: selectedAgent?.name }) }} />
            </p>
            <p className="text-xs text-slate-400 mt-2">{t("agentProfiles.delete.irreversible")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>{t("agentProfiles.delete.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteAgent} disabled={deleting}>
              {deleting ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : null}
              {deleting ? t("agentProfiles.delete.deleting") : t("agentProfiles.delete.confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Tools & Skills Tab ────────────────────────────────────────── */

function ToolsAndSkillsTab({
  allTools, allSkills,
  draftAllowedTools, draftAllowedSkills, draftToolAutonomy, draftConfig,
  onAllowedToolsChange, onAllowedSkillsChange, onToolAutonomyChange, onConfigChange,
}: {
  allTools: Array<{ name: string; description?: string; sideEffects?: string }>;
  allSkills: Array<{ id: string; displayName?: string; description?: string; allowedTools?: string[] }>;
  draftAllowedTools: string[];
  draftAllowedSkills: string[];
  draftToolAutonomy: Record<string, string>;
  draftConfig: Record<string, string>;
  onAllowedToolsChange: (tools: string[]) => void;
  onAllowedSkillsChange: (skills: string[]) => void;
  onToolAutonomyChange: (autonomy: Record<string, string>) => void;
  onConfigChange: (config: Record<string, string>) => void;
}) {
  const { t } = useTranslation();
  const [toolsSearch, setToolsSearch] = useState("");
  const [skillsSearch, setSkillsSearch] = useState("");
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addToolSearch, setAddToolSearch] = useState("");
  const [addSkillSearch, setAddSkillSearch] = useState("");
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const filteredTools = useMemo(() => {
    if (!toolsSearch.trim()) return allTools;
    const q = toolsSearch.toLowerCase();
    return allTools.filter((t) => t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
  }, [allTools, toolsSearch]);

  const readTools = filteredTools.filter((t) => !t.sideEffects || t.sideEffects === "read");
  const writeTools = filteredTools.filter((t) => t.sideEffects === "write");

  const filteredSkills = useMemo(() => {
    if (!skillsSearch.trim()) return allSkills;
    const q = skillsSearch.toLowerCase();
    return allSkills.filter((s) =>
      s.id.toLowerCase().includes(q) || (s.displayName || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q)
    );
  }, [allSkills, skillsSearch]);

  const toggleTool = (toolName: string) => {
    const next = draftAllowedTools.includes(toolName)
      ? draftAllowedTools.filter((t) => t !== toolName)
      : [...draftAllowedTools, toolName];
    onAllowedToolsChange(next);
    if (!draftAllowedTools.includes(toolName)) {
      onToolAutonomyChange({ ...draftToolAutonomy, [toolName]: draftToolAutonomy[toolName] || "auto" });
    }
  };

  const setToolAutonomy = (toolName: string, level: string) => {
    onToolAutonomyChange({ ...draftToolAutonomy, [toolName]: level });
  };

  const toggleSkill = (skillId: string) => {
    const next = draftAllowedSkills.includes(skillId)
      ? draftAllowedSkills.filter((s) => s !== skillId)
      : [...draftAllowedSkills, skillId];
    onAllowedSkillsChange(next);
  };

  const enableAllTools = () => {
    onAllowedToolsChange(allTools.map((t) => t.name));
    const autonomyUpdate = { ...draftToolAutonomy };
    for (const t of allTools) {
      if (!autonomyUpdate[t.name]) autonomyUpdate[t.name] = "auto";
    }
    onToolAutonomyChange(autonomyUpdate);
  };
  const disableAllTools = () => onAllowedToolsChange([]);
  const enableAllSkills = () => onAllowedSkillsChange(allSkills.map((s) => s.id));
  const disableAllSkills = () => onAllowedSkillsChange([]);

  const enabledToolsCount = draftAllowedTools.length;
  const enabledSkillsCount = draftAllowedSkills.length;

  const autonomyOptions = [
    { value: "auto", label: t("agentProfiles.autonomy.auto"), color: "text-emerald-600" },
    { value: "approval", label: t("agentProfiles.autonomy.approval"), color: "text-amber-600" },
    { value: "blocked", label: t("agentProfiles.autonomy.blocked"), color: "text-destructive" },
  ] as const;

  const AutonomySelect = ({ toolName }: { toolName: string }) => {
    const current = draftToolAutonomy[toolName] || "auto";
    return (
      <select value={current} onChange={(e) => { e.stopPropagation(); setToolAutonomy(toolName, e.target.value); }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "h-7 rounded-md border bg-background px-1.5 text-[0.65rem] font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary",
          current === "auto" && "border-emerald-400/50 text-emerald-600",
          current === "approval" && "border-amber-400/50 text-amber-600",
          current === "blocked" && "border-destructive/50 text-destructive",
        )}
      >
        {autonomyOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* ── Tools Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="size-4 text-slate-500" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("agentProfiles.tools.title")}</p>
          <Badge variant="secondary" className="text-xs">{enabledToolsCount} / {allTools.length}</Badge>
          <div className="mr-auto flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setAddToolOpen(true)}>{t("agentProfiles.tools.add")}</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={enableAllTools}>{t("agentProfiles.tools.enableAll")}</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={disableAllTools}>{t("agentProfiles.tools.disableAll")}</Button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input placeholder={t("agentProfiles.tools.search")} value={toolsSearch} onChange={(e) => setToolsSearch(e.target.value)} className="h-8 pr-8 text-xs" />
        </div>

        {allTools.length === 0 ? (
          <div className="w-full rounded-lg border border-dashed px-4 py-6 text-center text-xs text-slate-400">
            <Wrench className="mx-auto mb-2 size-6 text-slate-300/30" />
            {t("agentProfiles.tools.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {readTools.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1.5 font-medium">{t("agentProfiles.tools.readOnly")}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {readTools.map((tool) => {
                    const enabled = draftAllowedTools.includes(tool.name);
                    return (
                      <div key={tool.name} role="button" tabIndex={0} onClick={() => toggleTool(tool.name)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTool(tool.name); } }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                          enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20 opacity-60",
                        )}
                      >
                        <Switch checked={enabled} className="pointer-events-none shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold truncate", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                          {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                        </div>
                        {enabled && <AutonomySelect toolName={tool.name} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {writeTools.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1.5 font-medium">{t("agentProfiles.tools.write")}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {writeTools.map((tool) => {
                    const enabled = draftAllowedTools.includes(tool.name);
                    return (
                      <div key={tool.name} role="button" tabIndex={0} onClick={() => toggleTool(tool.name)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTool(tool.name); } }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                          enabled ? "border-amber-400/40 bg-amber-500/5" : "border-slate-200 dark:border-slate-700 hover:border-amber-400/20 opacity-60",
                        )}
                      >
                        <Switch checked={enabled} className="pointer-events-none shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold truncate", enabled ? "text-amber-600 dark:text-amber-400" : "text-slate-500")}>{tool.name}</p>
                          {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                        </div>
                        {enabled && <AutonomySelect toolName={tool.name} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Google Sheets Integration ── */}
      {draftAllowedTools.some((t) => t.startsWith("googlesheets.")) && (
        <>
          <Separator />
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="size-4 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{t("agentProfiles.googleSheets.title")}</p>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{t("agentProfiles.googleSheets.desc")}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">{t("agentProfiles.googleSheets.productsLabel")}</label>
                <Input value={draftConfig.productsSheetUrl || ""} onChange={(e) => onConfigChange({ ...draftConfig, productsSheetUrl: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/d/..." dir="ltr" className="h-9 text-xs bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                  {t("agentProfiles.googleSheets.ordersLabel")}
                  <button type="button" onClick={() => setHelpDialogOpen(true)}
                    className="inline-flex items-center justify-center mr-1.5 align-middle size-4 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 transition-colors"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </label>
                <Input value={draftConfig.ordersAppsScriptUrl || ""} onChange={(e) => onConfigChange({ ...draftConfig, ordersAppsScriptUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/..." dir="ltr" className="h-9 text-xs bg-white dark:bg-gray-900"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base">{t("agentProfiles.googleSheets.helpTitle")}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">{t("agentProfiles.googleSheets.helpTitle")}</p>
            <ol className="list-decimal pr-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li dangerouslySetInnerHTML={{ __html: t("agentProfiles.googleSheets.helpStep1") }} />
              <li dangerouslySetInnerHTML={{ __html: t("agentProfiles.googleSheets.helpStep2") }} />
              <li>{t("agentProfiles.googleSheets.helpStep3")}</li>
              <li>{t("agentProfiles.googleSheets.helpStep4")}</li>
            </ol>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Skills Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="size-4 text-slate-500" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{t("agentProfiles.skills.title")}</p>
          <Badge variant="secondary" className="text-xs">{enabledSkillsCount} / {allSkills.length}</Badge>
          <div className="mr-auto flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setAddSkillOpen(true)}>{t("agentProfiles.skills.add")}</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={enableAllSkills}>{t("agentProfiles.skills.enableAll")}</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={disableAllSkills}>{t("agentProfiles.skills.disableAll")}</Button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input placeholder={t("agentProfiles.skills.search")} value={skillsSearch} onChange={(e) => setSkillsSearch(e.target.value)} className="h-8 pr-8 text-xs" />
        </div>

        {allSkills.length === 0 ? (
          <div className="w-full rounded-lg border border-dashed px-4 py-6 text-center text-xs text-slate-400">
            <Shield className="mx-auto mb-2 size-6 text-slate-300/30" />
            {t("agentProfiles.skills.empty")}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredSkills.map((skill) => {
              const enabled = draftAllowedSkills.includes(skill.id);
              return (
                <div key={skill.id} role="button" tabIndex={0} onClick={() => toggleSkill(skill.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSkill(skill.id); } }}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-all",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20 opacity-60",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold text-sm", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>
                      {skill.displayName || skill.id}
                    </p>
                    {skill.description && <p className="text-xs text-slate-500 mt-0.5">{skill.description}</p>}
                    {skill.allowedTools && skill.allowedTools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {skill.allowedTools.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[0.6rem] h-4 px-1.5">{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Tool Dialog */}
      <Dialog open={addToolOpen} onOpenChange={setAddToolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("agentProfiles.tools.addDialogTitle")}</DialogTitle></DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input placeholder={t("agentProfiles.tools.addSearch")} value={addToolSearch} onChange={(e) => setAddToolSearch(e.target.value)} className="h-9 pr-8 text-sm" autoFocus />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {allTools.filter((t) => {
              if (!addToolSearch.trim()) return true;
              const q = addToolSearch.toLowerCase();
              return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
            }).map((tool) => {
              const enabled = draftAllowedTools.includes(tool.name);
              return (
                <div key={tool.name} role="button" tabIndex={0} onClick={() => toggleTool(tool.name)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTool(tool.name); } }}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                    {tool.description && <p className="text-[0.65rem] text-slate-500 truncate">{tool.description}</p>}
                  </div>
                  {enabled && (
                    <select value={draftToolAutonomy[tool.name] || "auto"} onChange={(e) => { e.stopPropagation(); setToolAutonomy(tool.name, e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 rounded border bg-background px-1 text-[0.6rem]"
                    >
                      {autonomyOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Skill Dialog */}
      <Dialog open={addSkillOpen} onOpenChange={setAddSkillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t("agentProfiles.skills.addDialogTitle")}</DialogTitle></DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input placeholder={t("agentProfiles.skills.addSearch")} value={addSkillSearch} onChange={(e) => setAddSkillSearch(e.target.value)} className="h-9 pr-8 text-sm" autoFocus />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {allSkills.filter((s) => {
              if (!addSkillSearch.trim()) return true;
              const q = addSkillSearch.toLowerCase();
              return s.id.toLowerCase().includes(q) || (s.displayName || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
            }).map((skill) => {
              const enabled = draftAllowedSkills.includes(skill.id);
              return (
                <div key={skill.id} role="button" tabIndex={0} onClick={() => toggleSkill(skill.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSkill(skill.id); } }}
                  className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{skill.displayName || skill.id}</p>
                    {skill.description && <p className="text-[0.65rem] text-slate-500 truncate">{skill.description}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
