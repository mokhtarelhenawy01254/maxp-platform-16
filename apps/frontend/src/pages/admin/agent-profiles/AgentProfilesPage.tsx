import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Brain, Users, Wrench, Zap, ChevronDown, ChevronRight, ChevronUp,
  Loader2, AlertCircle, Bot, Search, Clock, PenLine, Save, X, Plus, Trash2,
  BookOpen, Shield, FileCode, RefreshCw, Eye, EyeOff, HelpCircle, Menu, MessageSquare, Archive,
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
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";

function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

type Tab = "settings" | "advanced";
type AdvancedTab = "soul" | "agents" | "tools-md" | "skills-json";

const FILE_LABELS: Record<AdvancedTab, string> = {
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
          {skill.allowedTools?.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t("agentProfiles.skillCard.tools", { count: skill.allowedTools?.length ?? 0 })}</p>
              <div className="flex flex-wrap gap-1.5">{skill.allowedTools?.map((t) => <ToolBadge key={t} name={t} />)}</div>
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
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="size-4 text-indigo-500 flex-shrink-0" />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono tracking-wide truncate">{label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
    <div className="px-4 lg:px-6 pt-3">
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
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-2 text-xs">
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get("agent");
  const isMobile = useIsMobile(1024);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(agentIdFromUrl);
  const [searchQuery, setSearchQuery] = useState("");

  const [tab, setTab] = useState<Tab>("settings");
  const [advancedFile, setAdvancedFile] = useState<AdvancedTab>("soul");
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
  const [draftDescription, setDraftDescription] = useState("");
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
      || draftDescription !== (profile.agent.description || "")
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
  }, [profile, draftModel, draftName, draftIcon, draftDescription, draftAllowedTools, draftAllowedSkills, draftToolAutonomy, draftConfig, draftFiles]);

  const advancedFileOptions: { key: AdvancedTab; label: string }[] = [
    { key: "soul", label: t("agentProfiles.tabs.soul") },
    { key: "agents", label: t("agentProfiles.tabs.agents") },
    { key: "tools-md", label: t("agentProfiles.tabs.toolsMd") },
    { key: "skills-json", label: t("agentProfiles.tabs.skillsJson") },
  ];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "settings", label: t("agentProfiles.tabs.settings"), icon: <Shield className="size-4" aria-hidden="true" /> },
    { key: "advanced", label: t("agentProfiles.tabs.advanced"), icon: <FileCode className="size-4" aria-hidden="true" /> },
  ];

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    setProfileError(null);
    try {
      const res = await sandboxApi.getAgents();
      setAgents(res.agents as AgentItem[]);
      if (res.agents.length > 0) setSelectedId((prev) => prev || res.agents[0].id);
    } catch {
      setProfileError("فشل تحميل الوكلاء");
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  /* ── Load agents ── */
  useEffect(() => { loadAgents(); }, [loadAgents]);

  const orderedAgents = useMemo(() => {
    const ceo = agents.find((a) => a.role === "CEO");
    if (!ceo) return agents;
    return [ceo, ...agents.filter((a) => a.id !== ceo.id)];
  }, [agents]);

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
          setDraftDescription(data.agent.description || "");
          setDraftFiles({ ...data.files });
          setDraftAllowedTools(data.allowedTools || []);
          setDraftAllowedSkills(data.skillIds || []);
          setDraftToolAutonomy((data.agent as { toolAutonomy?: Record<string, string> }).toolAutonomy || {});
          const loadedConfig = (data.agent as { config?: Record<string, string> }).config || {};
          let parsedConfig = loadedConfig;
          if (!loadedConfig.soul_persona && data.files?.["SOUL.md"]) {
            const soul = data.files["SOUL.md"];
            const lines = soul.split("\n");
            const first = lines[0]?.match(/^أنت (.+?)(?:، (.+?))?\.$/);
            if (first) {
              parsedConfig = { soul_persona: first[1] || "", soul_goal: first[2] || "" };
              const sectionMap: Record<string, string> = {
                "أسلوب الرد": "soul_tone",
                "المهام الأساسية": "soul_tasks",
                "الحدود": "soul_boundaries",
                "رسالة الترحيب": "soul_welcome",
                "عندما لا تعرف الإجابة": "soul_escalation",
                "لغة الرد": "soul_language",
                "تعليمات إضافية": "soul_custom",
              };
              for (const [section, key] of Object.entries(sectionMap)) {
                const re = new RegExp(`## ${section}\\n([\\s\\S]*?)(?=\\n## |\\n?$)`);
                const m = soul.match(re);
                if (m) parsedConfig[key] = m[1].trim();
              }
              const toneRev: Record<string, string> = { "ودود ومتعاون": "friendly", "رسمي ومهني": "formal", "مختصر ومباشر": "concise", "مفصل وشامل": "detailed" };
              if (parsedConfig.soul_tone && toneRev[parsedConfig.soul_tone]) parsedConfig.soul_tone = toneRev[parsedConfig.soul_tone];
              const langRev: Record<string, string> = { "حسب لغة العميل (عربي أو إنجليزي)": "auto", "العربية": "ar", "English": "en" };
              if (parsedConfig.soul_language && langRev[parsedConfig.soul_language]) parsedConfig.soul_language = langRev[parsedConfig.soul_language];
              const escRev: Record<string, string> = {
                "إذا كنت لا تعرف الإجابة، اسأل التاجر عبر لوحة التحكم.": "knowledge_ask",
                "إذا كنت لا تعرف الإجابة، حول المحادثة إلى فريق الدعم البشري.": "escalate_human",
                "إذا كنت لا تعرف الإجابة، اعتذر للعميل واطلب منه التواصل مع الدعم.": "apologize",
              };
              if (parsedConfig.soul_escalation && escRev[parsedConfig.soul_escalation]) parsedConfig.soul_escalation = escRev[parsedConfig.soul_escalation];
            }
          }
          if (!parsedConfig.soul_custom && data.files?.["SOUL.md"]) {
            const m2 = data.files["SOUL.md"].match(/## تعليمات إضافية\n([\s\S]*?)(?=\n## |\n?$)/);
            if (m2) parsedConfig.soul_custom = m2[1].trim();
          }
          setDraftConfig(parsedConfig);
          if (parsedConfig.soul_persona) generateSoulFromConfig(parsedConfig);
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
      description: draftDescription || profile.agent.description,
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
        agent: { ...prev.agent, model: draftModel || prev.agent.model, name: draftName || prev.agent.name, description: draftDescription || prev.agent.description, icon: draftIcon, toolAutonomy: draftToolAutonomy, config: draftConfig } as typeof prev.agent,
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
        model: newAgentModel && newAgentModel !== "none" ? newAgentModel : null,
        icon: newAgentIcon,
        description: newAgentDesc || null,
        allowedTools: selectedTemplate?.allowedTools || null,
        allowedSkills: selectedTemplate?.allowedSkills || null,
      })},
    );
    if (data?.id) {
      setCreateOpen(false);
      setNewAgentName("");
      setNewAgentModel("");
      setNewAgentIcon("🤖");
      setNewAgentDesc("");
      setNewAgentTemplate(null);
      toast.success(t("agentProfiles.toast.createSuccess", { name: data.name }));
      sandboxApi.getAgents().then((res) => {
        setAgents(res.agents as AgentItem[]);
        setSelectedId(data.id);
        const params = new URLSearchParams(searchParams);
        params.set("agent", data.id);
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

  /* ── Update page title ── */
  useEffect(() => {
    if (selectedAgent?.name) {
      document.title = selectedAgent.name + " — " + t("agentProfiles.sidebar.title");
    }
  }, [selectedAgent?.name, t]);

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

  const filteredAgents = orderedAgents.filter((a) => {
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

  const generateSoulFromConfig = (config: Record<string, string>) => {
    const persona = config.soul_persona || "";
    const goal = config.soul_goal || "";
    const toneMap: Record<string, string> = {
      friendly: "ودود ومتعاون",
      formal: "رسمي ومهني",
      concise: "مختصر ومباشر",
      detailed: "مفصل وشامل",
    };
    const tone = toneMap[config.soul_tone || ""] || "";
    const tasks = config.soul_tasks || "";
    const boundaries = config.soul_boundaries || "";
    const langMap: Record<string, string> = {
      auto: "حسب لغة العميل (عربي أو إنجليزي)",
      ar: "العربية",
      en: "English",
    };
    const language = langMap[config.soul_language || ""] || "";
    const welcome = config.soul_welcome || "";
    const escalationMap: Record<string, string> = {
      knowledge_ask: "إذا كنت لا تعرف الإجابة، اسأل التاجر عبر لوحة التحكم.",
      escalate_human: "إذا كنت لا تعرف الإجابة، حول المحادثة إلى فريق الدعم البشري.",
      apologize: "إذا كنت لا تعرف الإجابة، اعتذر للعميل واطلب منه التواصل مع الدعم.",
    };
    const escalation = escalationMap[config.soul_escalation || ""] || escalationMap.knowledge_ask;

    const parts: string[] = [];
    if (persona || goal) {
      const line = goal
        ? `أنت ${persona}، ${goal}.`
        : `أنت ${persona}.`;
      parts.push(line);
    }
    if (tone) parts.push(`\n## أسلوب الرد\n${tone}`);
    if (tasks) parts.push(`\n## المهام الأساسية\n${tasks}`);
    if (boundaries) parts.push(`\n## الحدود\n${boundaries}`);
    if (welcome) parts.push(`\n## رسالة الترحيب\n${welcome}`);
    if (escalation) parts.push(`\n## عندما لا تعرف الإجابة\n${escalation}`);
    if (language) parts.push(`\n## لغة الرد\n${language}`);
    if (config.soul_custom) parts.push(`\n## تعليمات إضافية\n${config.soul_custom}`);

    const soulContent = parts.join("\n\n");
    setDraftFiles((prev) => ({ ...prev, "SOUL.md": soulContent }));
  };

  const soulTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSoulFieldChange = (key: string, value: string) => {
    const newConfig = { ...draftConfig, [key]: value };
    setDraftConfig(newConfig);
    if (soulTimer.current) clearTimeout(soulTimer.current);
    soulTimer.current = setTimeout(() => generateSoulFromConfig(newConfig), 300);
  };

  const discardChanges = () => {
    if (!profile) return;
    setEditing(false);
    setDraftModel(profile.agent.model || "");
    setDraftName(profile.agent.name);
    setDraftIcon(profile.agent.icon || "🤖");
    setDraftDescription(profile.agent.description || "");
    setDraftFiles({ ...profile.files });
    setDraftAllowedTools(profile.allowedTools || []);
    setDraftAllowedSkills(profile.skillIds || []);
    setDraftToolAutonomy((profile.agent as { toolAutonomy?: Record<string, string> }).toolAutonomy || {});
    const discardedConfig = (profile.agent as { config?: Record<string, string> }).config || {};
    let parsedDiscard = discardedConfig;
    if (!discardedConfig.soul_persona && profile.files?.["SOUL.md"]) {
      const soul = profile.files["SOUL.md"];
      const first = soul.split("\n")[0]?.match(/^أنت (.+?)(?:، (.+?))?\.$/);
      if (first) {
        parsedDiscard = { soul_persona: first[1] || "", soul_goal: first[2] || "" };
        const secMap: Record<string, string> = { "أسلوب الرد": "soul_tone", "المهام الأساسية": "soul_tasks", "الحدود": "soul_boundaries", "رسالة الترحيب": "soul_welcome", "عندما لا تعرف الإجابة": "soul_escalation", "لغة الرد": "soul_language" };
        for (const [sec, key] of Object.entries(secMap)) {
          const m = soul.match(new RegExp(`## ${sec}\\n([\\s\\S]*?)(?=\\n## |\\n?$)`));
          if (m) parsedDiscard[key] = m[1].trim();
        }
        const tR: Record<string, string> = { "ودود ومتعاون": "friendly", "رسمي ومهني": "formal", "مختصر ومباشر": "concise", "مفصل وشامل": "detailed" };
        if (parsedDiscard.soul_tone && tR[parsedDiscard.soul_tone]) parsedDiscard.soul_tone = tR[parsedDiscard.soul_tone];
        const lR: Record<string, string> = { "حسب لغة العميل (عربي أو إنجليزي)": "auto", "العربية": "ar", "English": "en" };
        if (parsedDiscard.soul_language && lR[parsedDiscard.soul_language]) parsedDiscard.soul_language = lR[parsedDiscard.soul_language];
        const eR: Record<string, string> = { "إذا كنت لا تعرف الإجابة، اسأل التاجر عبر لوحة التحكم.": "knowledge_ask", "إذا كنت لا تعرف الإجابة، حول المحادثة إلى فريق الدعم البشري.": "escalate_human", "إذا كنت لا تعرف الإجابة، اعتذر للعميل واطلب منه التواصل مع الدعم.": "apologize" };
        if (parsedDiscard.soul_escalation && eR[parsedDiscard.soul_escalation]) parsedDiscard.soul_escalation = eR[parsedDiscard.soul_escalation];
      }
    }
    setDraftConfig(parsedDiscard);
    if (parsedDiscard.soul_persona) generateSoulFromConfig(parsedDiscard);
  };

  const sidebarContent = (
    <aside className="w-64 flex-shrink-0 border-r border-border/50 flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
        <Bot className="size-4 text-primary" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground/90">{t("agentProfiles.sidebar.title")}</h2>
        {!agentsLoading && <Badge variant="secondary" className="text-xs mr-auto">{agents.length}</Badge>}
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center size-6 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
          title={t("agentProfiles.sidebar.addTitle")}
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <Input placeholder={t("agentProfiles.sidebar.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pr-8 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {agentsLoading ? (
          <div className="space-y-2 p-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="size-8 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAgents.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-xs text-muted-foreground/60">
            <Search className="size-6 text-muted-foreground/30" />
            <span>{t("agentProfiles.sidebar.noResults", { query: searchQuery })}</span>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <button key={agent.id} onClick={() => {
              if (hasUnsavedChanges && selectedId !== agent.id && !window.confirm(t("agentProfiles.sidebar.unsavedConfirm"))) return;
              setSelectedId(agent.id);
              setTab("settings");
              setMobileDrawerOpen(false);
            }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedId === agent.id
                  ? "bg-primary/5 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <span className="text-xl flex-shrink-0">{agent.icon || "🤖"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={`text-xs font-semibold truncate ${
                    selectedId === agent.id ? "text-primary" : "text-foreground/80"
                  }`}>{agent.name}</p>
                  <span className={`inline-block size-1.5 rounded-full flex-shrink-0 ${
                    profile && selectedId === agent.id && active ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-[calc(100vh-140px)] lg:h-[calc(100vh-90px)] bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ── Mobile: Sheet Drawer + Full Main ── */}
      {isMobile && (
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="right" className="w-[300px] p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* ── Desktop: Static Sidebar ── */}
      {!isMobile && sidebarContent}

      {/* ── Main Panel ── */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="px-4 lg:px-6 py-4 border-b border-border/50">
          {/* Mobile header row */}
          <div className="flex items-center gap-2 mb-3 lg:hidden">
            <button onClick={() => setMobileDrawerOpen(true)}
              className="flex items-center justify-center size-8 rounded-lg hover:bg-muted text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("agentProfiles.sidebar.title")}
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <Badge variant="secondary" className="text-xs mr-auto">{agents.length}</Badge>
            <button onClick={() => navigate("/admin/ai-chat")}
              className="flex items-center justify-center size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("agentProfiles.header.chatWithManager")}
              title={t("agentProfiles.header.chatWithManager")}
            >
              <MessageSquare className="size-4" aria-hidden="true" />
            </button>
            <button onClick={() => loadAgents()}
              className="flex items-center justify-center size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("agentProfiles.header.refresh")}
              title={t("agentProfiles.header.refresh")}
              disabled={agentsLoading}
            >
              <RefreshCw className={cn("size-4", agentsLoading && "animate-spin")} aria-hidden="true" />
            </button>
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("agentProfiles.sidebar.addTitle")}
              title={t("agentProfiles.sidebar.addTitle")}
            >
              <Plus className="size-5" aria-hidden="true" />
            </button>
          </div>

          {selectedAgent ? (
            <div className="space-y-3">
              {/* Identity row */}
              <div className="flex items-start gap-3">
                {editing ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="grid grid-cols-4 gap-0.5">
                      {AGENT_ICONS.map((icon) => (
                        <button key={icon} type="button" onClick={() => { setDraftIcon(icon); if (!editing) setEditing(true); }}
                          className={`size-7 flex items-center justify-center rounded-md text-sm border transition-colors ${
                            draftIcon === icon
                              ? "border-primary bg-primary/10"
                              : "border hover:border-foreground/30"
                          }`}
                        >{icon}</button>
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{t("agentProfiles.icon.label")}</span>
                  </div>
                ) : (
                  <span className="text-2xl flex-shrink-0">{selectedAgent.icon || "🤖"}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editing ? (
                      <Input value={draftName} onChange={(e) => { setDraftName(e.target.value); if (!editing) setEditing(true); }} className="h-8 text-base font-bold w-full lg:w-64" />
                    ) : (
                      <h1 className="text-base font-bold text-foreground/90">{selectedAgent.name}</h1>
                    )}
                    {profile && (
                      <>
                        <span className={`inline-block size-2 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">{active ? t("agentProfiles.header.status.active") : t("agentProfiles.header.status.paused")}</span>
                        {channels.map((ch) => (
                          <span key={ch} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{t(`agentProfiles.channel.${ch}`)}</span>
                        ))}
                        {createdStr && <span className="text-xs text-muted-foreground/70"><Clock className="inline-block size-3 ml-1" aria-hidden="true" />{createdStr}</span>}
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedAgent.role}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {profile && (
                    <div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-3 py-1.5">
                      <Switch checked={active} onCheckedChange={toggleStatus} disabled={statusSaving} />
                      <span className="text-xs font-medium text-muted-foreground">{statusSaving ? "..." : active ? t("agentProfiles.header.status.active_toggle") : t("agentProfiles.header.status.paused_toggle")}</span>
                    </div>
                  )}
                  {profile?.agent.templateSlug && (
                    <span className="text-xs font-mono text-muted-foreground/70 bg-muted px-2 py-1.5 rounded">{profile.agent.templateSlug}</span>
                  )}
                  {profile && selectedAgent?.role !== "CEO" && (
                    <button onClick={() => setDeleteConfirm(selectedId)}
                      className="flex items-center justify-center size-8 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground/70 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      aria-label={t("agentProfiles.header.deleteTitle")}
                      title={t("agentProfiles.header.deleteTitle")}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {/* Toolbar row */}
              {profile && (
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap border-b border-dashed border-border cursor-help">{t("agentProfiles.header.model")}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] text-xs">
                        {t("agentProfiles.help.model")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Select value={draftModel} onValueChange={(v) => { setDraftModel(v ?? ""); if (!editing) setEditing(true); }}>
                    <SelectTrigger className="h-8 text-sm min-w-[140px]">
                      <SelectValue placeholder={models.length > 0 ? t("agentProfiles.header.modelPlaceholder") : t("agentProfiles.header.noModels")} />
                    </SelectTrigger>
                    <SelectContent>
                      {draftModel && !models.some((m) => m.modelName === draftModel) && (
                        <SelectItem value={draftModel} className="text-sm">
                          <span className="font-medium">{draftModel}</span>
                          <span className="text-xs text-muted-foreground/70 mr-2">{t("agentProfiles.header.current")}</span>
                        </SelectItem>
                      )}
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.modelName} className="text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.modelName}</span>
                            <span className="text-xs text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">{m.provider}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mr-auto" />
                  {draftModel && <span className="text-xs font-mono text-muted-foreground/50 truncate max-w-[120px]">{draftModel.split("/").pop()}</span>}
                  <Button variant="ghost" size="icon" className="size-8" onClick={loadAgents} disabled={agentsLoading} aria-label={t("agentProfiles.header.refresh")} title={t("agentProfiles.header.refresh")}>
                    <RefreshCw className={cn("size-3.5", agentsLoading && "animate-spin")} aria-hidden="true" />
                  </Button>
                  {editing && hasUnsavedChanges && (
                    <Button size="sm" variant="outline" className="h-8 text-xs px-2.5" onClick={discardChanges}>
                      <X className="size-3.5 ml-1" aria-hidden="true" />{t("agentProfiles.header.discard")}
                    </Button>
                  )}
                  <Button size="sm" className="h-8 text-xs px-3" onClick={saveProfile} disabled={profileSaving || !editing || !hasUnsavedChanges}>
                    {profileSaving ? <Loader2 className="size-3.5 animate-spin ml-1" aria-hidden="true" /> : <Save className="size-3.5 ml-1" aria-hidden="true" />}
                    {profileSaving ? t("agentProfiles.header.saving") : editing && hasUnsavedChanges ? t("agentProfiles.header.save") : t("agentProfiles.header.saved")}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/70">{t("agentProfiles.header.noSelection")}</p>
          )}
        </div>
        {/* Tabs */}
        <div className="border-b border-border/50 px-4 lg:px-6 flex gap-1 overflow-x-auto scrollbar-thin">
          {tabs.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-3 text-xs lg:text-sm font-medium border-b-2 transition-colors whitespace-nowrap rounded-t-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {profileLoading && (
            <div className="animate-pulse space-y-4 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/3 rounded bg-muted" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-muted" />
                <div className="h-6 w-24 rounded-full bg-muted" />
              </div>
              <div className="h-11 w-full rounded-lg bg-muted" />
              <div className="grid grid-cols-2 gap-2">
                {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-lg bg-muted" />)}
              </div>
            </div>
          )}

          {profileError && !profileLoading && (
            <div role="alert" aria-live="polite" className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl max-w-lg mb-4">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="flex-1 text-sm text-red-600 dark:text-red-400">{profileError}</span>
              <button onClick={() => setProfileError(null)} className="text-red-500 hover:text-red-700 font-bold" aria-label={t("agentProfiles.header.discard")}>&times;</button>
            </div>
          )}

          {!profileLoading && !profileError && profile && (
            <>
              {tab === "settings" && (
                <div className="max-w-3xl space-y-6">
                  {!editing ? (
                    <div className="space-y-5">
                      {[
                        { label: t("agentProfiles.settings.agentName"), value: draftName },
                        { label: t("agentProfiles.settings.persona"), value: draftConfig.soul_persona, hint: t("agentProfiles.settings.personaHint") },
                        { label: t("agentProfiles.settings.goal"), value: draftConfig.soul_goal, hint: t("agentProfiles.settings.goalHint"), multi: true },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="block text-sm font-medium text-foreground/70 mb-1">{f.label}</label>
                          <p className={`text-sm ${f.value ? "text-foreground/90" : "text-muted-foreground/40 italic"}`}>
                            {f.value || "—"}
                          </p>
                          {f.hint && <p className="text-xs text-muted-foreground/70 mt-0.5">{f.hint}</p>}
                        </div>
                      ))}
                      <hr className="border-t border-border/50" />
                      {[
                        { label: t("agentProfiles.settings.tone"), value: [
                          { k: "friendly", l: t("agentProfiles.settings.toneFriendly") },
                          { k: "formal", l: t("agentProfiles.settings.toneFormal") },
                          { k: "concise", l: t("agentProfiles.settings.toneConcise") },
                          { k: "detailed", l: t("agentProfiles.settings.toneDetailed") },
                        ].find(o => o.k === (draftConfig.soul_tone || "friendly"))?.l, hint: t("agentProfiles.settings.toneHint") },
                        { label: t("agentProfiles.settings.language"), value: [
                          { k: "auto", l: t("agentProfiles.settings.languageAuto") },
                          { k: "ar", l: t("agentProfiles.settings.languageAr") },
                          { k: "en", l: t("agentProfiles.settings.languageEn") },
                        ].find(o => o.k === (draftConfig.soul_language || "auto"))?.l, hint: t("agentProfiles.settings.languageHint") },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="block text-sm font-medium text-foreground/70 mb-1">{f.label}</label>
                          <p className="text-sm text-foreground/90">{f.value}</p>
                          {f.hint && <p className="text-xs text-muted-foreground/70 mt-0.5">{f.hint}</p>}
                        </div>
                      ))}
                      <hr className="border-t border-border/50" />
                      {[
                        { label: t("agentProfiles.settings.tasks"), value: draftConfig.soul_tasks, hint: t("agentProfiles.settings.tasksHint"), multi: true },
                        { label: t("agentProfiles.settings.boundaries"), value: draftConfig.soul_boundaries, hint: t("agentProfiles.settings.boundariesHint"), multi: true },
                        { label: t("agentProfiles.settings.welcome"), value: draftConfig.soul_welcome, hint: t("agentProfiles.settings.welcomeHint") },
                      ].map((f) => (
                        <div key={f.label}>
                          <label className="block text-sm font-medium text-foreground/70 mb-1">{f.label}</label>
                          {f.multi ? (
                            <p className={`text-sm whitespace-pre-wrap ${f.value ? "text-foreground/90" : "text-muted-foreground/40 italic"}`}>
                              {f.value || "—"}
                            </p>
                          ) : (
                            <p className={`text-sm truncate ${f.value ? "text-foreground/90" : "text-muted-foreground/40 italic"}`}>
                              {f.value || "—"}
                            </p>
                          )}
                          {f.hint && <p className="text-xs text-muted-foreground/70 mt-0.5">{f.hint}</p>}
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.escalation")}</label>
                        <p className="text-sm text-foreground/90">
                          {[{ v: "knowledge_ask", l: "يسألني عبر لوحة التحكم" }, { v: "escalate_human", l: "يحول المحادثة لبشر" }, { v: "apologize", l: "يعتذر ويقول مايعرفش" }].find(o => o.v === (draftConfig.soul_escalation || "knowledge_ask"))?.l}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.escalationHint")}</p>
                      </div>
                      {draftConfig.soul_custom && (
                        <div>
                          <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.customPrompt")}</label>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap font-mono">{draftConfig.soul_custom}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.customPromptHint")}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Agent Name */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.agentName")}</label>
                        <Input value={draftName} onChange={(e) => { setDraftName(e.target.value) }}
                          placeholder={t("agentProfiles.settings.agentNamePlaceholder")} className="h-8 text-sm" />
                      </div>

                      {/* Persona */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.persona")}</label>
                        <Input value={draftConfig.soul_persona || ""} onChange={(e) => handleSoulFieldChange("soul_persona", e.target.value)}
                          placeholder={t("agentProfiles.settings.personaPlaceholder")} className="h-8 text-sm" />
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.personaHint")}</p>
                      </div>

                      {/* Goal */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.goal")}</label>
                        <Textarea value={draftConfig.soul_goal || ""} onChange={(e) => handleSoulFieldChange("soul_goal", e.target.value)}
                          placeholder={t("agentProfiles.settings.goalPlaceholder")} className="text-sm min-h-[48px] resize-y" />
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.goalHint")}</p>
                      </div>

                      <hr className="border-t border-border/50" />

                      {/* Tone */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.tone")}</label>
                        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg w-fit">
                          {[
                            { key: "friendly", label: t("agentProfiles.settings.toneFriendly") },
                            { key: "formal", label: t("agentProfiles.settings.toneFormal") },
                            { key: "concise", label: t("agentProfiles.settings.toneConcise") },
                            { key: "detailed", label: t("agentProfiles.settings.toneDetailed") },
                          ].map((opt) => (
                            <button key={opt.key} type="button"
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                (draftConfig.soul_tone || "friendly") === opt.key
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => handleSoulFieldChange("soul_tone", opt.key)}
                            >{opt.label}</button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.toneHint")}</p>
                      </div>

                      {/* Language */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.language")}</label>
                        <div className="flex gap-1 bg-muted/50 p-0.5 rounded-lg w-fit">
                          {[
                            { key: "auto", label: t("agentProfiles.settings.languageAuto") },
                            { key: "ar", label: t("agentProfiles.settings.languageAr") },
                            { key: "en", label: t("agentProfiles.settings.languageEn") },
                          ].map((opt) => (
                            <button key={opt.key} type="button"
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                (draftConfig.soul_language || "auto") === opt.key
                                  ? "bg-background text-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                              onClick={() => handleSoulFieldChange("soul_language", opt.key)}
                            >{opt.label}</button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.languageHint")}</p>
                      </div>

                      <hr className="border-t border-border/50" />

                      {/* Tasks */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.tasks")}</label>
                        <Textarea value={draftConfig.soul_tasks || ""} onChange={(e) => handleSoulFieldChange("soul_tasks", e.target.value)}
                          placeholder={t("agentProfiles.settings.tasksPlaceholder")} className="text-sm min-h-[48px] resize-y" />
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.tasksHint")}</p>
                      </div>

                      {/* Boundaries */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.boundaries")}</label>
                        <Textarea value={draftConfig.soul_boundaries || ""} onChange={(e) => handleSoulFieldChange("soul_boundaries", e.target.value)}
                          placeholder={t("agentProfiles.settings.boundariesPlaceholder")} className="text-sm min-h-[48px] resize-y" />
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.boundariesHint")}</p>
                      </div>

                      {/* Welcome Message */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.welcome")}</label>
                        <Input value={draftConfig.soul_welcome || ""} onChange={(e) => handleSoulFieldChange("soul_welcome", e.target.value)}
                          placeholder={t("agentProfiles.settings.welcomePlaceholder")} className="h-8 text-sm" />
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.welcomeHint")}</p>
                      </div>

                      {/* Escalation */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.escalation")}</label>
                        <Select value={draftConfig.soul_escalation || "knowledge_ask"}
                          onValueChange={(v) => handleSoulFieldChange("soul_escalation", v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="knowledge_ask">يسألني عبر لوحة التحكم</SelectItem>
                            <SelectItem value="escalate_human">يحول المحادثة لبشر</SelectItem>
                            <SelectItem value="apologize">يعتذر ويقول مايعرفش</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.escalationHint")}</p>
                      </div>

                      {/* إضافة تعليمات إضافية */}
                      <div>
                        <label className="block text-sm font-medium text-foreground/70 mb-1">{t("agentProfiles.settings.customPrompt")}</label>
                        <Textarea value={draftConfig.soul_custom || ""} onChange={(e) => handleSoulFieldChange("soul_custom", e.target.value)}
                          placeholder={t("agentProfiles.settings.customPromptPlaceholder")} className="text-sm min-h-[48px] resize-y font-mono text-xs" />
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{t("agentProfiles.settings.customPromptHint")}</p>
                      </div>
                    </div>
                  )}

                  <hr className="border-t border-border/50" />

                  {/* ── Status footer ── */}
                  <div className="flex items-center justify-end gap-2">
                    {!editing ? (
                      <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={() => { setEditing(true); }}>
                        <PenLine className="size-3.5 ml-1" aria-hidden="true" />تعديل
                      </Button>
                    ) : profileSaving ? (
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Loader2 className="size-3 animate-spin" />
                        {t("agentProfiles.header.saving")}
                      </span>
                    ) : hasUnsavedChanges ? (
                      <span className="flex items-center gap-1.5 text-xs text-amber-600">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        تعديلات غير محفوظة
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <Save className="size-3" />
                        {t("agentProfiles.header.saved")}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {tab === "advanced" && (
                <div className="space-y-6 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{t("agentProfiles.tabs.advancedFile")}</span>
                    <Select value={advancedFile} onValueChange={(v) => setAdvancedFile(v as AdvancedTab)}>
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {advancedFileOptions.map((opt) => (
                          <SelectItem key={opt.key} value={opt.key} className="text-sm">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {renderFileContent(FILE_LABELS[advancedFile])}

                  <Separator />

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
                </div>
              )}
            </>
          )}

          {!profileLoading && !profileError && !profile && selectedId && (
            <div className="flex items-center justify-center py-16"><Loader2 className="size-5 text-primary animate-spin" /></div>
          )}

          {agents.length === 0 && !agentsLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Bot className="mx-auto mb-4 size-14 text-muted-foreground/20" />
              <h2 className="text-base font-semibold text-muted-foreground/80">{t("agentProfiles.empty.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground/60 max-w-md">{t("agentProfiles.empty.desc")}</p>
              <Button className="mt-6" onClick={() => navigate("/admin/ai-chat")}>
                <MessageSquare className="size-4 ml-2" />{t("agentProfiles.empty.chatCta")}
              </Button>
            </div>
          ) : !selectedId && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Bot className="size-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground/60">{t("agentProfiles.header.noSelection")}</p>
            </div>
          )}
        </div>
      </main>

      {/* ── Create Agent Dialog ── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o && !creating) setCreateOpen(false); }}>
        <DialogContent className="sm:max-w-lg !p-0 !gap-0 !max-h-[min(85vh,640px)]">
          <div className="flex flex-col overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex-shrink-0">
              <DialogHeader className="mb-0">
                <DialogTitle className="text-base flex items-center gap-2">
                  <span className="size-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm">✨</span>
                  {t("agentProfiles.create.title")}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="overflow-y-auto px-5 pb-3 flex-1 min-h-0 scrollbar-thin">
              <section className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
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
                      className={`flex flex-col items-center gap-1 p-2 min-w-[72px] rounded-xl border-2 text-center transition-colors shrink-0 ${
                        !newAgentTemplate
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <span className={`size-7 flex items-center justify-center rounded-lg text-base transition-colors ${!newAgentTemplate ? "bg-indigo-100 dark:bg-indigo-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>⚙️</span>
                      <p className={`text-[10px] font-semibold ${!newAgentTemplate ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}>{t("agentProfiles.create.custom")}</p>
                      {!newAgentTemplate && <span className="size-1 rounded-full bg-indigo-500" />}
                    </button>
                    {templates.map((tpl) => (
                      <button key={tpl.slug} type="button" onClick={() => { setNewAgentTemplate(tpl.slug); if (!newAgentName) setNewAgentName(tpl.name); }}
                        className={`flex flex-col items-center gap-1 p-2 min-w-[72px] rounded-xl border-2 text-center transition-colors shrink-0 ${
                          newAgentTemplate === tpl.slug
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <span className={`size-7 flex items-center justify-center rounded-lg text-base transition-colors ${newAgentTemplate === tpl.slug ? "bg-indigo-100 dark:bg-indigo-900/40" : "bg-slate-100 dark:bg-slate-800"}`}>
                          {templateIcon(tpl.slug)}
                        </span>
                        <p className={`text-[10px] font-semibold leading-tight ${newAgentTemplate === tpl.slug ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"}`}>{tpl.name}</p>
                        <span className="text-[8px] text-slate-400">{t("agentProfiles.create.toolsCount", { n: tpl.allowedTools?.length ?? 0, m: tpl.allowedSkills?.length ?? 0 })}</span>
                        {newAgentTemplate === tpl.slug && <span className="size-1 rounded-full bg-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("agentProfiles.create.identity")}</h4>
                </div>
                <div className="flex gap-2.5">
                  <div className="flex-shrink-0">
                    <label className="text-[9px] font-medium text-slate-400 block mb-1 text-center">{t("agentProfiles.icon.label")}</label>
                    <div className="grid grid-cols-4 gap-0.5">
                      {AGENT_ICONS.map((icon) => (
                        <button key={icon} type="button" onClick={() => setNewAgentIcon(icon)} title={icon}
                          className={`size-7 flex items-center justify-center rounded-lg text-sm border transition-colors shadow-sm ${
                            newAgentIcon === icon
                              ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-600"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >{icon}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div>
                      <label htmlFor="new-agent-name" className="text-[9px] font-medium text-slate-400 block mb-0.5">{t("agentProfiles.create.name")}</label>
                      <Input id="new-agent-name" placeholder={t("agentProfiles.create.namePlaceholder")} value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} disabled={creating} className="h-7 text-sm" />
                    </div>
                    <div>
                      <label htmlFor="new-agent-desc" className="text-[9px] font-medium text-slate-400 block mb-0.5">{t("agentProfiles.create.description")}</label>
                      <Input id="new-agent-desc" placeholder={t("agentProfiles.create.descPlaceholder")} value={newAgentDesc} onChange={(e) => setNewAgentDesc(e.target.value)} disabled={creating} className="h-7 text-sm" />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                  <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t("agentProfiles.create.model")}</h4>
                </div>
                <Select value={newAgentModel} onValueChange={setNewAgentModel} disabled={creating}>
                  <SelectTrigger id="new-agent-model" className="w-full h-7 text-sm">
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

            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/30 px-5 py-3 flex-shrink-0">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-lg flex-shrink-0">{newAgentIcon}</span>
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
                <div className="flex items-start gap-2 p-2 mb-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
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

      {/* ── Archive Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o && !deleting) setDeleteConfirm(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Archive className="size-4" />
              {t("agentProfiles.archive.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <span dangerouslySetInnerHTML={{ __html: t("agentProfiles.archive.confirm", { name: selectedAgent?.name }) }} />
            </p>
            <p className="text-xs text-slate-400 mt-2">{t("agentProfiles.archive.note")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>{t("agentProfiles.archive.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteAgent} disabled={deleting}>
              {deleting ? <Loader2 className="ml-1.5 size-3.5 animate-spin" /> : null}
              {deleting ? t("agentProfiles.archive.archiving") : t("agentProfiles.archive.confirmButton")}
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
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Wrench className="size-4 text-slate-500" aria-hidden="true" />
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
                      <div key={tool.name} className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden", enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20 opacity-60")}>
                        <button type="button" onClick={() => toggleTool(tool.name)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Switch checked={enabled} className="pointer-events-none shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs font-semibold truncate", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                            {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                          </div>
                        </button>
                        {enabled && (
                          <div className="px-2">
                            <AutonomySelect toolName={tool.name} />
                          </div>
                        )}
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
                      <div key={tool.name} className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden", enabled ? "border-amber-400/40 bg-amber-500/5" : "border-slate-200 dark:border-slate-700 hover:border-amber-400/20 opacity-60")}>
                        <button type="button" onClick={() => toggleTool(tool.name)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                        >
                          <Switch checked={enabled} className="pointer-events-none shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-xs font-semibold truncate", enabled ? "text-amber-600 dark:text-amber-400" : "text-slate-500")}>{tool.name}</p>
                            {tool.description && <p className="text-[0.65rem] text-slate-500 truncate mt-0.5">{tool.description}</p>}
                          </div>
                        </button>
                        {enabled && (
                          <div className="px-2">
                            <AutonomySelect toolName={tool.name} />
                          </div>
                        )}
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
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Shield className="size-4 text-slate-500" aria-hidden="true" />
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
                <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-left",
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
                </button>
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
                <div key={tool.name} className={cn("flex items-center rounded-lg border text-sm transition-colors overflow-hidden", enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20")}
                >
                  <button type="button" onClick={() => toggleTool(tool.name)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Switch checked={enabled} className="pointer-events-none shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{tool.name}</p>
                      {tool.description && <p className="text-[0.65rem] text-slate-500 truncate">{tool.description}</p>}
                    </div>
                  </button>
                  {enabled && (
                    <div className="px-2">
                      <select value={draftToolAutonomy[tool.name] || "auto"} onChange={(e) => { e.stopPropagation(); setToolAutonomy(tool.name, e.target.value); }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 rounded border bg-background px-1 text-[0.6rem]"
                      >
                        {autonomyOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                      </select>
                    </div>
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
                <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)}
                  className={cn("w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    enabled ? "border-indigo-400/40 bg-indigo-500/5" : "border-slate-200 dark:border-slate-700 hover:border-indigo-400/20",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-semibold", enabled ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500")}>{skill.displayName || skill.id}</p>
                    {skill.description && <p className="text-[0.65rem] text-slate-500 truncate">{skill.description}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
