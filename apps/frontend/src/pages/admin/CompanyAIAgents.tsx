/**
 * CompanyAIAgents
 * Shows DB-backed company agents with department grouping and profile files.
 * Restructured for improved clarity and impeccable design principles.
 *
 * UX Overhaul: Fixed CSS variables, sidebar scroll, tab flattening,
 * editor upgrade, tools interactivity, activity data, mobile UX,
 * parentId resolution, and improved empty states.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Search,
  MessageSquare,
  Trash2,
  RefreshCw,
  Save,
  Bot,
  Loader2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Menu,
  Shield,
  BookOpen,
  Wrench,
  FileCode,
  Clock,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import "../../styles/ai-agents.css";

/* ─── Types ────────────────────────────────────────────────────── */

interface CompanyAgent {
  id: string;
  name: string;
  role: string;
  icon: string;
  description: string;
  soul: string;
  rules?: string[];
  skills?: string[];
  allowedTools?: string[];
  allowedSkills?: string[];
  toolAutonomy?: Record<string, string>;
  model: string | null;
  status: string;
  parentId: string | null;
  templateSlug: string | null;
  createdBy: string | null;
  createdAt: string;
  departmentId?: string | null;
  departmentKey?: string | null;
  departmentName?: string | null;
  departmentIcon?: string | null;
  managerType?: string | null;
  persona?: Record<string, unknown>;
  policies?: Record<string, unknown>;
  config?: Record<string, string>;
}

interface AgentProfilePayload {
  success: boolean;
  agent: CompanyAgent;
  profile?: {
    slug: string;
    name: string;
    role: string;
    version: string;
    modelPolicy?: Record<string, unknown>;
  } | null;
  files: Record<string, string>;
  tools?: Array<{ name: string; description?: string; sideEffects?: string }>;
  skills?: Array<{ id: string; displayName?: string; description?: string; allowedTools?: string[] }>;
}

interface ModelOption {
  id: string;
  modelName: string;
  provider: string;
  keyId: string;
  keyName: string;
  keyType: string;
  priority: number;
  scope: "company" | "central";
  agentSuitability?: {
    nativeToolCalling?: boolean;
    agentReady?: boolean;
    riskLevel?: string;
    notes?: string[];
  };
}

/* ─── Helpers ──────────────────────────────────────────────────── */

const isActiveStatus = (status?: string | null) => String(status || "").toUpperCase() === "ACTIVE";

const CHANNEL_META = {
  facebook: { label: "فيسبوك/ماسنجر", shortLabel: "فيسبوك" },
  whatsapp: { label: "واتساب", shortLabel: "واتساب" },
  dashboard: { label: "لوحة التحكم", shortLabel: "داشبورد" },
} as const;
type AgentChannel = keyof typeof CHANNEL_META;

/** Get CSS variable name for a role */
const getRoleVar = (role?: string | null) =>
  `var(--role-${(role || "default").toLowerCase().replace(/\s+/g, "_")})`;

/** Get CSS variable name for a channel */
const getChannelVar = (channel: AgentChannel) => `var(--channel-${channel})`;

const collectAgentText = (agent?: Partial<CompanyAgent> | null) => [
  agent?.role,
  agent?.templateSlug,
  agent?.departmentKey,
  agent?.departmentName,
  agent?.description,
  agent?.createdBy,
  ...(agent?.allowedTools || []),
  ...(agent?.allowedSkills || []),
  ...(agent?.skills || []),
].filter(Boolean).join(" ").toLowerCase();

const isFacebookResponderAgent = (agent?: Partial<CompanyAgent> | null) => {
  const role = String(agent?.role || "").toUpperCase();
  return role === "FACEBOOK_SALES_SUPPORT"
    || role === "SAS_SALES"
    || agent?.templateSlug === "facebook-sales-support-agent"
    || agent?.templateSlug === "sas-sales-agent"
    || agent?.createdBy === "system_facebook_channel";
};

const getAgentChannels = (agent?: Partial<CompanyAgent> | null): AgentChannel[] => {
  const text = collectAgentText(agent);
  const role = String(agent?.role || "").toUpperCase();
  const channels: AgentChannel[] = [];

  if (isFacebookResponderAgent(agent) || text.includes("facebook") || text.includes("messenger") || text.includes("فيسبوك") || text.includes("ماسنجر")) {
    channels.push("facebook");
  }
  if (text.includes("whatsapp") || text.includes("واتساب")) {
    channels.push("whatsapp");
  }
  if (role === "CEO" || text.includes("dashboard")) {
    channels.push("dashboard");
  }

  return channels;
};

const fileMapsEqual = (left: Record<string, string>, right: Record<string, string>) => {
  const keys = new Set([...Object.keys(left || {}), ...Object.keys(right || {})]);
  for (const key of keys) {
    if ((left?.[key] || "") !== (right?.[key] || "")) return false;
  }
  return true;
};

/** Format relative time in Arabic */
const relativeTime = (dateStr?: string | null) => {
  if (!dateStr) return "غير معروف";
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

/** Simple markdown-to-HTML for preview (headers, lists, code, bold, italic) */
const renderMarkdownPreview = (md: string): string => {
  if (!md) return '<p style="color: var(--color-muted-foreground)">لا يوجد محتوى</p>';
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: { ...tokenManager.createAuthHeaders(), ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || `Error ${res.status}`);
  return data as T;
}

/* ─── Main Component ───────────────────────────────────────────── */

export default function CompanyAIAgents() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [agents, setAgents] = useState<CompanyAgent[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyAgent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgentProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [profileTab, setProfileTab] = useState("soul");
  const [draftFiles, setDraftFiles] = useState<Record<string, string>>({});
  const [draftModel, setDraftModel] = useState("");
  const [draftAllowedTools, setDraftAllowedTools] = useState<string[]>([]);
  const [draftAllowedSkills, setDraftAllowedSkills] = useState<string[]>([]);
  const [draftToolAutonomy, setDraftToolAutonomy] = useState<Record<string, string>>({});
  const [draftConfig, setDraftConfig] = useState<Record<string, string>>({});
  const [allTools, setAllTools] = useState<Array<{ name: string; description?: string; sideEffects?: string }>>([]);
  const [allSkills, setAllSkills] = useState<Array<{ id: string; displayName?: string; description?: string; allowedTools?: string[] }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const profileRequestRef = useRef(0);

  const [templates, setTemplates] = useState<Array<{ slug: string; name: string; role: string; version: string }>>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [hireDialogOpen, setHireDialogOpen] = useState(false);
  const [hiring, setHiring] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentTemplateSlug, setNewAgentTemplateSlug] = useState("");
  const [newAgentModel, setNewAgentModel] = useState("");
  const [newAgentDesc, setNewAgentDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ agents: CompanyAgent[] }>("/agent-manager/agents");
      setAgents(data.agents || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل الوكلاء");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const data = await apiFetch<{ models: ModelOption[] }>("/agent/available-models");
      setModels(data.models || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تحميل موديلات الذكاء الصناعي");
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await apiFetch<{ profiles: Array<{ slug: string; name: string; role: string; version: string }> }>("/agent-manager/profiles");
      setTemplates(data.profiles || []);
    } catch {
      // Fallback
      setTemplates([
        { slug: "sales-agent", name: "وكيل المبيعات", role: "SALES", version: "1.0" },
        { slug: "support-agent", name: "وكيل دعم العملاء", role: "SUPPORT", version: "1.0" },
      ]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadModels();
    loadTemplates();
  }, [load, loadModels, loadTemplates]);

  useEffect(() => {
    (async () => {
      try {
        const [toolsData, skillsData] = await Promise.all([
          apiFetch<{ tools: Array<{ name: string; description?: string; sideEffects?: string }> }>("/agent/tools"),
          apiFetch<{ skills: Array<{ id: string; displayName?: string; description?: string; allowedTools?: string[] }> }>("/agent/skills"),
        ]);
        setAllTools(toolsData.tools || []);
        setAllSkills(skillsData.skills || []);
      } catch {
        // Silently fail — tools/skills lists are non-critical
      }
    })();
  }, []);

  const loadProfile = useCallback(async (agentId: string) => {
    const requestId = ++profileRequestRef.current;
    setProfileLoading(true);
    setProfile(null);
    setError(null);
    try {
      const data = await apiFetch<AgentProfilePayload>(`/agent/agents/${agentId}/files`);
      if (requestId !== profileRequestRef.current) return;
      setProfile(data);
      setDraftFiles(data.files || {});
      setDraftModel(data.agent.model || "");
      setDraftAllowedTools(data.agent.allowedTools || []);
      setDraftAllowedSkills(data.agent.allowedSkills || data.agent.skills || []);
      setDraftToolAutonomy(data.agent.toolAutonomy || {});
      setDraftConfig(data.agent.config || {});
      setProfileTab("soul");
    } catch (e) {
      if (requestId === profileRequestRef.current) {
        setError(e instanceof Error ? e.message : "فشل تحميل بروفايل الوكيل");
      }
    } finally {
      if (requestId === profileRequestRef.current) setProfileLoading(false);
    }
  }, []);

  const ceoAgent = useMemo(() => agents.find((a) => a.role === "CEO"), [agents]);
  const subAgents = useMemo(() => agents.filter((a) => a.role !== "CEO"), [agents]);
  const orderedAgents = useMemo(() => (ceoAgent ? [ceoAgent, ...subAgents] : agents), [agents, ceoAgent, subAgents]);

  /** Map of agent IDs to agent names for parentId resolution */
  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const agent of agents) {
      map.set(agent.id, agent.name);
    }
    return map;
  }, [agents]);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return orderedAgents;
    const q = searchQuery.toLowerCase();
    return orderedAgents.filter((agent) => {
      const text = collectAgentText(agent);
      return text.includes(q) || agent.name.toLowerCase().includes(q);
    });
  }, [orderedAgents, searchQuery]);

  const hasUnsavedChanges = Boolean(
    profile &&
    (draftModel !== (profile.agent.model || "") || !fileMapsEqual(draftFiles, profile.files || {})
      || JSON.stringify(draftAllowedTools) !== JSON.stringify(profile.agent.allowedTools || [])
      || JSON.stringify(draftAllowedSkills) !== JSON.stringify(profile.agent.allowedSkills || profile.agent.skills || [])
      || JSON.stringify(draftToolAutonomy) !== JSON.stringify(profile.agent.toolAutonomy || {})
      || JSON.stringify(draftConfig) !== JSON.stringify(profile.agent.config || {})),
  );

  useEffect(() => {
    if (loading || orderedAgents.length === 0) return;
    const requested = searchParams.get("agent");
    const resolvedAgent = requested?.toLowerCase() === "ceo"
      ? ceoAgent
      : orderedAgents.find((agent) => agent.id === requested);
    const nextAgent = resolvedAgent || ceoAgent || orderedAgents[0];
    if (!nextAgent) return;

    if (selectedAgentId !== nextAgent.id) setSelectedAgentId(nextAgent.id);
    if (requested !== nextAgent.id) setSearchParams({ agent: nextAgent.id }, { replace: true });
  }, [ceoAgent, loading, orderedAgents, searchParams, selectedAgentId, setSearchParams]);

  useEffect(() => {
    if (selectedAgentId) loadProfile(selectedAgentId);
  }, [selectedAgentId, loadProfile]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Global Ctrl+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges && !profileSaving) {
          saveProfile();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnsavedChanges, profileSaving]);

  const handleHireAgentSubmit = async () => {
    if (!newAgentName.trim() || !newAgentTemplateSlug || !newAgentModel) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    const selectedTemplate = templates.find((t) => t.slug === newAgentTemplateSlug);
    if (!selectedTemplate) return;

    setHiring(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; agent: CompanyAgent }>("/agent-manager/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAgentName.trim(),
          role: selectedTemplate.role,
          templateSlug: selectedTemplate.slug,
          model: newAgentModel,
          description: newAgentDesc.trim(),
        }),
      });
      if (data.success && data.agent) {
        toast.success(`تم تعيين الوكيل ${data.agent.name} بنجاح`);
        setHireDialogOpen(false);
        setNewAgentName("");
        setNewAgentTemplateSlug("");
        setNewAgentModel("");
        setNewAgentDesc("");
        await load();
        setSelectedAgentId(data.agent.id);
        setSearchParams({ agent: data.agent.id });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تعيين الوكيل الجديد");
    } finally {
      setHiring(false);
    }
  };

  const discardProfileChanges = useCallback(() => {
    if (!profile) return;
    setDraftFiles(profile.files || {});
    setDraftModel(profile.agent.model || "");
    setDraftAllowedTools(profile.agent.allowedTools || []);
    setDraftAllowedSkills(profile.agent.allowedSkills || profile.agent.skills || []);
    setDraftConfig(profile.agent.config || {});
  }, [profile]);

  const openAgent = useCallback((agent: CompanyAgent) => {
    if (hasUnsavedChanges && !window.confirm("لديك تعديلات غير محفوظة. هل تريد تجاهلها وفتح وكيل آخر؟")) {
      return;
    }
    setSelectedAgentId(agent.id);
    setSearchParams({ agent: agent.id });
    setMobileSheetOpen(false);
  }, [hasUnsavedChanges, setSearchParams]);

  const saveProfile = async () => {
    if (!selectedAgentId || !profile) return;
    const skillsJson = draftFiles["SKILLS.json"];
    if (skillsJson?.trim()) {
      try {
        JSON.parse(skillsJson);
      } catch {
        setProfileTab("skills-json");
        setError("ملف SKILLS.json يحتوي على JSON غير صالح. صححه قبل الحفظ.");
        return;
      }
    }
    setProfileSaving(true);
    setError(null);
    try {
      const data = await apiFetch<AgentProfilePayload>(`/agent/agents/${selectedAgentId}/files`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.agent.name,
          role: profile.agent.role,
          model: draftModel || profile.agent.model,
          allowedTools: draftAllowedTools,
          allowedSkills: draftAllowedSkills,
          toolAutonomy: draftToolAutonomy,
          config: draftConfig,
          files: draftFiles,
        }),
      });
      setProfile(data);
      setDraftFiles(data.files || {});
      setDraftModel(data.agent.model || draftModel || "");
      setDraftAllowedTools(data.agent.allowedTools || []);
      setDraftAllowedSkills(data.agent.allowedSkills || data.agent.skills || []);
      setDraftToolAutonomy(data.agent.toolAutonomy || {});
      setDraftConfig(data.agent.config || {});
      toast.success("تم حفظ بروفايل الوكيل");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل حفظ بروفايل الوكيل");
    } finally {
      setProfileSaving(false);
    }
  };

  const toggleAgentStatus = async (nextActive: boolean) => {
    if (!selectedAgentId || !profile) return;
    const nextStatus = nextActive ? "ACTIVE" : "PAUSED";
    setStatusSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ success: boolean; agent: Partial<CompanyAgent> }>(`/agent/agents/${selectedAgentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const savedStatus = data.agent?.status || nextStatus;
      setAgents((prev) => prev.map((agent) => (
        agent.id === selectedAgentId ? { ...agent, status: savedStatus } : agent
      )));
      setProfile((prev) => prev ? { ...prev, agent: { ...prev.agent, status: savedStatus } } : prev);
      toast.success(savedStatus === "ACTIVE" ? "تم تشغيل الوكيل" : "تم إيقاف الوكيل");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل تغيير حالة الوكيل");
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/agent-manager/agents/${deleteTarget.id}`, { method: "DELETE" });
      setAgents((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success("تم أرشفة الوكيل");
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الحذف");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Shared agent list content for both desktop sidebar and mobile sheet
  const agentListContent = (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="text-sm font-bold">قائمة الوكلاء</h3>
        <Badge variant="secondary" className="text-xs">{agents.length}</Badge>
      </div>
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="بحث في الوكلاء..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pr-9 text-sm"
          />
        </div>
      </div>
      <div className="space-y-0">
        {filteredAgents.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            selected={agent.id === selectedAgentId}
            onOpen={openAgent}
            onDelete={setDeleteTarget}
          />
        ))}
        {filteredAgents.length === 0 && searchQuery && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <Search className="size-8 text-muted-foreground/30" />
            <span>لا توجد نتائج لـ &quot;{searchQuery}&quot;</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">فريق الوكلاء</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              بروفايلات الوكلاء، الأقسام، والتبعية الإدارية داخل الشركة
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile agent list trigger */}
            <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" size="icon" className="ai-agents-mobile-trigger lg:hidden">
                    <Menu className="size-4" />
                  </Button>
                }
              />
              <SheetContent side="right" className="w-[300px] p-0">
                <SheetHeader className="px-4 pt-4 pb-2">
                  <SheetTitle>الوكلاء</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)]">
                  {agentListContent}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Button variant="outline" onClick={() => navigate("/admin/ai-chat")}>
              <MessageSquare className="ml-2 size-4" />
              المحادثة مع المدير
            </Button>
            <Button onClick={() => setHireDialogOpen(true)} className="gap-1.5">
              <Bot className="size-4" />
              تعيين وكيل جديد
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
                  <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>تحديث</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Error Bar */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80 font-bold">&times;</button>
          </div>
        )}

        {loading ? (
          <div className="flex gap-4">
            <div className="hidden lg:block w-[280px]">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="mt-2 h-9 w-full rounded-md bg-muted animate-pulse" />
              <div className="divide-y mt-3 p-3 space-y-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="size-10 rounded-lg bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                      <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
              <div className="mt-2 h-3 w-1/3 rounded bg-muted animate-pulse" />
              <div className="mt-2 h-12 w-full rounded-lg bg-muted animate-pulse" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
              </div>
            </div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16">
            <Bot className="mx-auto mb-4 size-16 text-muted-foreground/20" />
            <h2 className="text-lg font-semibold text-muted-foreground">لا يوجد وكلاء بعد</h2>
            <p className="mt-2 text-sm text-muted-foreground/60 max-w-md mx-auto">
              ابدأ محادثة مع CEO Agent واطلب منه إنشاء وكيل متخصص لمساعدتك في المبيعات أو الدعم أو إدارة المخزون.
            </p>
            <Button className="mt-6" onClick={() => navigate("/admin/ai-chat")}>
              <MessageSquare className="ml-2 size-4" />
              اذهب إلى المحادثة
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
            {/* Desktop Sidebar */}
            <section className="hidden lg:block">
              <div className="ai-agents-sidebar lg:sticky lg:top-[88px]" style={{ maxHeight: "calc(100vh - 120px)" }}>
                <ScrollArea className="h-full" style={{ maxHeight: "calc(100vh - 120px)" }}>
                  {agentListContent}
                </ScrollArea>
              </div>
            </section>

            {/* Profile Panel */}
            <div>
              <AgentProfilePanel
                loading={profileLoading}
                saving={profileSaving}
                statusSaving={statusSaving}
                profile={profile}
                tab={profileTab}
                draftFiles={draftFiles}
                draftModel={draftModel}
                draftAllowedTools={draftAllowedTools}
                draftAllowedSkills={draftAllowedSkills}
                draftToolAutonomy={draftToolAutonomy}
                draftConfig={draftConfig}
                allTools={allTools}
                allSkills={allSkills}
                models={models}
                modelsLoading={modelsLoading}
                dirty={hasUnsavedChanges}
                agentNameMap={agentNameMap}
                onTabChange={setProfileTab}
                onFilesChange={setDraftFiles}
                onModelChange={setDraftModel}
                onAllowedToolsChange={setDraftAllowedTools}
                onAllowedSkillsChange={setDraftAllowedSkills}
                onToolAutonomyChange={setDraftToolAutonomy}
                onConfigChange={setDraftConfig}
                onDiscard={discardProfileChanges}
                onSave={saveProfile}
                onStatusChange={toggleAgentStatus}
                onRetryLoad={() => selectedAgentId && loadProfile(selectedAgentId)}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>أرشفة الوكيل</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              هل تريد أرشفة الوكيل <strong className="text-foreground">{deleteTarget?.name}</strong>؟
              سيتم إيقاف عمله ولن يظهر في القائمة، مع إمكانية استعادته لاحقاً.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? <Loader2 className="ml-2 size-4 animate-spin" /> : null}
                {deleting ? "جاري..." : "أرشفة"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hire Agent Dialog */}
        <Dialog open={hireDialogOpen} onOpenChange={(open) => !open && !hiring && setHireDialogOpen(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>تعيين وكيل جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-3">
              {/* Template Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">اختر قالب الوكيل *</label>
                <Select
                  value={newAgentTemplateSlug}
                  onValueChange={(v) => {
                    setNewAgentTemplateSlug(v);
                    const selected = templates.find((t) => t.slug === v);
                    if (selected) {
                      setNewAgentName(selected.name);
                      setNewAgentDesc(selected.name + " لمساعدتك في أداء المهام المتخصصة.");
                    }
                  }}
                  disabled={hiring}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder={templatesLoading ? "جارٍ تحميل القوالب..." : "اختر قالب للوكيل..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.slug} value={tpl.slug}>
                        <div className="flex flex-col text-start">
                          <span className="font-semibold text-sm">{tpl.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">Role: {tpl.role} · v{tpl.version}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">اسم الوكيل *</label>
                <Input
                  placeholder="مثال: وكيل دعم Swan"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  disabled={hiring}
                />
              </div>

              {/* Model Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">موديل الذكاء الاصطناعي *</label>
                <Select value={newAgentModel} onValueChange={setNewAgentModel} disabled={hiring}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="اختر موديل التشغيل..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.modelName}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{model.modelName}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{model.provider}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground">وصف الوكيل (اختياري)</label>
                <Input
                  placeholder="وصف مبسط لمهام الوكيل..."
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  disabled={hiring}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHireDialogOpen(false)} disabled={hiring}>
                إلغاء
              </Button>
              <Button onClick={handleHireAgentSubmit} disabled={hiring || !newAgentName.trim() || !newAgentTemplateSlug || !newAgentModel}>
                {hiring ? <Loader2 className="ml-2 size-4 animate-spin" /> : null}
                تعيين الوكيل
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

/* ─── Agent List Item ──────────────────────────────────────────── */

function AgentListItem({
  agent,
  selected,
  onOpen,
  onDelete,
}: {
  agent: CompanyAgent;
  selected: boolean;
  onOpen: (agent: CompanyAgent) => void;
  onDelete: (agent: CompanyAgent) => void;
}) {
  const isCEO = agent.role === "CEO";
  const active = isActiveStatus(agent.status);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(agent)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(agent); } }}
      data-selected={selected}
      className="ai-agent-item relative w-full p-3 px-4 text-start"
      style={{ "--agent-role-color": getRoleVar(agent.role) } as React.CSSProperties}
    >
      <div className="group flex gap-3">
        <div
          className="ai-agent-icon"
          style={{ "--agent-role-color": getRoleVar(agent.role) } as React.CSSProperties}
        >
          <span className="text-lg">{agent.icon || "🤖"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{agent.name}</span>
            <span className="ai-status-dot" data-active={active} />
            {!isCEO && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(agent); }}
                    className="mr-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>أرشفة</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {agent.departmentIcon || ""} {agent.departmentName || "بدون قسم"} · {agent.role}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Agent Profile Panel ──────────────────────────────────────── */

function AgentProfilePanel({
  loading,
  saving,
  statusSaving,
  profile,
  tab,
  draftFiles,
  draftModel,
  draftAllowedTools,
  draftAllowedSkills,
  draftToolAutonomy,
  draftConfig,
  allTools,
  allSkills,
  models,
  modelsLoading,
  dirty,
  agentNameMap,
  onTabChange,
  onFilesChange,
  onModelChange,
  onAllowedToolsChange,
  onAllowedSkillsChange,
  onToolAutonomyChange,
  onConfigChange,
  onDiscard,
  onSave,
  onStatusChange,
  onRetryLoad,
}: {
  loading: boolean;
  saving: boolean;
  statusSaving: boolean;
  profile: AgentProfilePayload | null;
  tab: string;
  draftFiles: Record<string, string>;
  draftModel: string;
  draftAllowedTools: string[];
  draftAllowedSkills: string[];
  draftToolAutonomy: Record<string, string>;
  draftConfig: Record<string, string>;
  allTools: Array<{ name: string; description?: string; sideEffects?: string }>;
  allSkills: Array<{ id: string; displayName?: string; description?: string; allowedTools?: string[] }>;
  models: ModelOption[];
  modelsLoading: boolean;
  dirty: boolean;
  agentNameMap: Map<string, string>;
  onTabChange: (value: string) => void;
  onFilesChange: (value: Record<string, string>) => void;
  onModelChange: (value: string) => void;
  onAllowedToolsChange: (value: string[]) => void;
  onAllowedSkillsChange: (value: string[]) => void;
  onToolAutonomyChange: (autonomy: Record<string, string>) => void;
  onConfigChange: (value: Record<string, string>) => void;
  onDiscard: () => void;
  onSave: () => void;
  onStatusChange: (nextActive: boolean) => void;
  onRetryLoad: () => void;
}) {
  const agent = profile?.agent;
  const updateFile = (name: string, value: string) => onFilesChange({ ...draftFiles, [name]: value });
  const active = isActiveStatus(agent?.status);
  const channels = getAgentChannels(agent);
  const selectedModelExists = models.some((model) => model.modelName === draftModel);

  if (loading) {
    return (
      <div className="ai-agent-profile p-6 animate-pulse space-y-4">
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
    );
  }

  if (!profile || !agent) {
    return (
      <div className="ai-agent-profile p-8 text-center">
        <AlertCircle className="mx-auto mb-3 size-10 text-warning" />
        <p className="text-sm font-medium text-foreground mb-1">لم يتم تحميل بروفايل الوكيل</p>
        <p className="text-xs text-muted-foreground mb-4">تأكد من اتصالك بالإنترنت وحاول مجدداً.</p>
        <Button variant="outline" size="sm" onClick={onRetryLoad}>
          <RefreshCw className="ml-2 size-3.5" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  const resolvedParentName = agent.parentId ? (agentNameMap.get(agent.parentId) || agent.parentId) : null;

  return (
    <div className="ai-agent-profile" data-dirty={dirty}>
      {/* ── Header ── */}
      <div className="ai-agent-profile-header">
        <div className="flex items-start gap-3">
          <div
            className="ai-agent-icon"
            style={{
              "--agent-role-color": getRoleVar(agent.role),
              width: "2.75rem",
              height: "2.75rem",
              fontSize: "1.5rem",
            } as React.CSSProperties}
          >
            <span>{agent.icon || "🤖"}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate">{agent.name}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <span>{agent.role}</span>
              <span className="ai-status-dot" data-active={active} />
              <span className="font-medium">{active ? "نشط" : "متوقف"}</span>
              {channels.map((channel) => (
                <span
                  key={channel}
                  className="ai-channel-badge"
                  style={{ "--channel-color": getChannelVar(channel) } as React.CSSProperties}
                >
                  {CHANNEL_META[channel].shortLabel}
                </span>
              ))}
              <span className="text-muted-foreground/60 mr-auto">
                <Clock className="inline-block size-3 ml-1" />
                {relativeTime(agent.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-2">
              <Switch checked={active} onCheckedChange={onStatusChange} disabled={!profile || loading || statusSaving} />
              <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">{statusSaving ? "..." : active ? "مفعل" : "متوقف"}</span>
            </div>
          </div>
        </div>

        {/* Model selector + Save bar */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <Select value={draftModel} onValueChange={(v) => onModelChange(v ?? "")} disabled={modelsLoading || saving}>
            <SelectTrigger className="h-10 flex-1 text-sm font-medium border-border/60 bg-background hover:border-primary/40 transition-colors rounded-lg">
              <SelectValue placeholder={modelsLoading ? "جارٍ..." : "اختر موديل"} />
            </SelectTrigger>
            <SelectContent className="min-w-[260px] p-1.5" position="popper" sideOffset={4}>
              {draftModel && !selectedModelExists && (
                <SelectItem value={draftModel} className="text-sm py-2.5 px-3 rounded-md cursor-pointer">
                  <span className="font-medium">{draftModel}</span>
                  <span className="text-muted-foreground mr-1.5">· الحالي</span>
                </SelectItem>
              )}
              {models.map((model) => (
                <SelectItem key={model.id} value={model.modelName} className="text-sm py-2.5 px-3 rounded-md cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{model.modelName}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{model.provider}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 shrink-0">
            {dirty && (
              <Button variant="outline" size="default" onClick={onDiscard} disabled={saving || statusSaving} className="h-10 text-sm px-4">تراجع</Button>
            )}
            <Button size="default" onClick={onSave} disabled={!profile || saving || !dirty} className="h-10 text-sm px-4">
              {saving ? <Loader2 className="ml-2 size-4 animate-spin" /> : <Save className="ml-2 size-4" />}
              {saving ? "جارٍ..." : dirty ? "حفظ" : "محفوظ"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Metadata Grid (collapsible) ── */}
      <MetadataGrid agent={agent} resolvedParentName={resolvedParentName} />

      {/* ── Flat Tabs (merged — no nesting) ── */}
      <div className="p-3 sm:p-4">
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList variant="line" className="w-full justify-start gap-0.5 mb-4 overflow-x-auto">
            <TabsTrigger value="soul" className="text-xs sm:text-sm font-semibold px-3 py-2 h-9 gap-1.5 data-[state=active]:font-bold">
              <BookOpen className="size-3.5" />
              SOUL.md
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs sm:text-sm font-semibold px-3 py-2 h-9 gap-1.5 data-[state=active]:font-bold">
              <Bot className="size-3.5" />
              AGENTS.md
            </TabsTrigger>
            <TabsTrigger value="tools-md" className="text-xs sm:text-sm font-semibold px-3 py-2 h-9 gap-1.5 data-[state=active]:font-bold">
              <Wrench className="size-3.5" />
              TOOLS.md
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-xs sm:text-sm font-semibold px-3 py-2 h-9 gap-1.5 data-[state=active]:font-bold">
              <Shield className="size-3.5" />
              الأدوات والمهارات
            </TabsTrigger>
            <TabsTrigger value="skills-json" className="text-xs sm:text-sm font-semibold px-3 py-2 h-9 gap-1.5 data-[state=active]:font-bold">
              <FileCode className="size-3.5" />
              SKILLS.json
            </TabsTrigger>
          </TabsList>

          <TabsContent value="soul">
            <FieldEditor label="SOUL.md" value={draftFiles["SOUL.md"] || ""} onChange={(v) => updateFile("SOUL.md", v)} />
          </TabsContent>
          <TabsContent value="agents">
            <FieldEditor label="AGENTS.md" value={draftFiles["AGENTS.md"] || ""} onChange={(v) => updateFile("AGENTS.md", v)} />
          </TabsContent>
          <TabsContent value="tools-md">
            <FieldEditor label="TOOLS.md" value={draftFiles["TOOLS.md"] || ""} onChange={(v) => updateFile("TOOLS.md", v)} />
          </TabsContent>
          <TabsContent value="tools">
            <ToolsAndSkillsTab
              agent={agent}
              draftAllowedTools={draftAllowedTools}
              draftAllowedSkills={draftAllowedSkills}
              draftToolAutonomy={draftToolAutonomy}
              draftConfig={draftConfig}
              allTools={profile?.tools || allTools}
              allSkills={profile?.skills || allSkills}
              onAllowedToolsChange={onAllowedToolsChange}
              onAllowedSkillsChange={onAllowedSkillsChange}
              onToolAutonomyChange={onToolAutonomyChange}
              onConfigChange={onConfigChange}
            />
          </TabsContent>
          <TabsContent value="skills-json">
            <FieldEditor
              label="SKILLS.json"
              value={draftFiles["SKILLS.json"] || ""}
              onChange={(v) => updateFile("SKILLS.json", v)}
              minRows={12}
              disablePreview
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ─── Metadata Grid ────────────────────────────────────────────── */

function MetadataGrid({ agent, resolvedParentName }: { agent: CompanyAgent; resolvedParentName: string | null }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-3 sm:px-4 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        <span className="font-medium">تفاصيل الوكيل</span>
        {!expanded && (
          <span className="mr-2 text-muted-foreground/60 truncate">
            {agent.departmentName || "بدون قسم"} · {agent.managerType || "AGENT"}
          </span>
        )}
      </button>
      {expanded && (
        <div className="ai-meta-grid mt-2">
          <div className="flex items-center gap-2">
            <span className="ai-meta-label">القسم:</span>
            <span className="ai-meta-value">{agent.departmentIcon} {agent.departmentName || "غير محدد"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="ai-meta-label">المستوى:</span>
            <span className="ai-meta-value">{agent.managerType || "AGENT"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="ai-meta-label">المدير:</span>
            <span className="ai-meta-value">{resolvedParentName || "لا يوجد"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="ai-meta-label">أنشأه:</span>
            <span className="ai-meta-value">{agent.createdBy || "النظام"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tools & Skills Tab ───────────────────────────────────────── */

function ToolsAndSkillsTab({
  agent,
  draftAllowedTools,
  draftAllowedSkills,
  draftToolAutonomy,
  draftConfig,
  allTools,
  allSkills,
  onAllowedToolsChange,
  onAllowedSkillsChange,
  onToolAutonomyChange,
  onConfigChange,
}: {
  agent: CompanyAgent;
  draftAllowedTools: string[];
  draftAllowedSkills: string[];
  draftToolAutonomy: Record<string, string>;
  draftConfig: Record<string, string>;
  allTools: Array<{ name: string; description?: string; sideEffects?: string }>;
  allSkills: Array<{ id: string; displayName?: string; description?: string; allowedTools?: string[] }>;
  onAllowedToolsChange: (tools: string[]) => void;
  onAllowedSkillsChange: (skills: string[]) => void;
  onToolAutonomyChange: (autonomy: Record<string, string>) => void;
  onConfigChange: (config: Record<string, string>) => void;
}) {
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [toolsSearch, setToolsSearch] = useState("");
  const [skillsSearch, setSkillsSearch] = useState("");
  const [addToolOpen, setAddToolOpen] = useState(false);
  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [addToolSearch, setAddToolSearch] = useState("");
  const [addSkillSearch, setAddSkillSearch] = useState("");

  const toolMap = useMemo(() => {
    const map = new Map<string, { description?: string; sideEffects?: string }>();
    for (const tool of allTools) {
      map.set(tool.name, tool);
    }
    return map;
  }, [allTools]);

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
      s.id.toLowerCase().includes(q)
      || (s.displayName || "").toLowerCase().includes(q)
      || (s.description || "").toLowerCase().includes(q)
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
  const disableAllTools = () => { onAllowedToolsChange([]); };
  const enableAllSkills = () => onAllowedSkillsChange(allSkills.map((s) => s.id));
  const disableAllSkills = () => onAllowedSkillsChange([]);

  const enabledToolsCount = draftAllowedTools.length;
  const enabledSkillsCount = draftAllowedSkills.length;

  const AUTONOMY_OPTIONS = [
    { value: "auto", label: "تلقائي", icon: "✅", color: "text-emerald-600" },
    { value: "approval", label: "تأكيد", icon: "🔒", color: "text-amber-600" },
    { value: "blocked", label: "محظور", icon: "🚫", color: "text-destructive" },
  ] as const;

  const AutonomySelect = ({ toolName }: { toolName: string }) => {
    const current = draftToolAutonomy[toolName] || "auto";
    return (
      <select
        value={current}
        onChange={(e) => { e.stopPropagation(); setToolAutonomy(toolName, e.target.value); }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "h-7 rounded-md border bg-background px-1.5 text-[0.65rem] font-semibold cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary",
          current === "auto" && "border-emerald-400/50 text-emerald-600",
          current === "approval" && "border-amber-400/50 text-amber-600",
          current === "blocked" && "border-destructive/50 text-destructive",
        )}
      >
        {AUTONOMY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
        ))}
      </select>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tools Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="size-4 text-muted-foreground" />
          <p className="text-sm font-bold">الأدوات</p>
          <Badge variant="secondary" className="text-xs">{enabledToolsCount} / {allTools.length}</Badge>
          <div className="mr-auto flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setAddToolOpen(true)}>+ إضافة أداة</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={enableAllTools}>تفعيل الكل</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={disableAllTools}>تعطيل الكل</Button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="بحث في الأدوات..."
            value={toolsSearch}
            onChange={(e) => setToolsSearch(e.target.value)}
            className="h-8 pr-8 text-xs"
          />
        </div>

        {allTools.length === 0 ? (
          <div className="w-full rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            <Wrench className="mx-auto mb-2 size-6 text-muted-foreground/30" />
            لا توجد أدوات متاحة
          </div>
        ) : (
          <div className="space-y-3">
            {readTools.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">قراءة (آمنة)</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {readTools.map((tool) => {
                    const enabled = draftAllowedTools.includes(tool.name);
                    return (
                      <div
                        key={tool.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleTool(tool.name)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTool(tool.name); } }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                          enabled
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-background hover:border-primary/20 opacity-60",
                        )}
                      >
                        <Switch checked={enabled} className="pointer-events-none shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold truncate", enabled ? "text-primary" : "text-muted-foreground")}>{tool.name}</p>
                          {tool.description && (
                            <p className="text-[0.65rem] text-muted-foreground truncate mt-0.5">{tool.description}</p>
                          )}
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
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">كتابة (تحتاج موافقة)</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {writeTools.map((tool) => {
                    const enabled = draftAllowedTools.includes(tool.name);
                    return (
                      <div
                        key={tool.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleTool(tool.name)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTool(tool.name); } }}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                          enabled
                            ? "border-amber-400/40 bg-amber-500/5"
                            : "border-border/60 bg-background hover:border-amber-400/20 opacity-60",
                        )}
                      >
                        <Switch checked={enabled} className="pointer-events-none shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-semibold truncate", enabled ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>{tool.name}</p>
                          {tool.description && (
                            <p className="text-[0.65rem] text-muted-foreground truncate mt-0.5">{tool.description}</p>
                          )}
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

      {/* Google Sheets Integration Section (shown when googlesheets.* tools are selected) */}
      {draftAllowedTools.some((t) => t.startsWith("googlesheets.")) && (
        <>
          <Separator />
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="size-4 text-emerald-600" />
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">إعدادات الربط بـ Google Sheets</p>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              أدخل الرابط ليستخدمه الوكيل تلقائياً عند تفعيل أدوات الشيت.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                  رابط شيت المنتجات
                </label>
                <Input
                  value={draftConfig.productsSheetUrl || ""}
                  onChange={(e) => onConfigChange({ ...draftConfig, productsSheetUrl: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  dir="ltr"
                  className="h-9 text-xs bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                  رابط Google Apps Script (للأوردرات)
                  <button
                    type="button"
                    onClick={() => setHelpDialogOpen(true)}
                    className="inline-flex items-center justify-center mr-1.5 align-middle size-4 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/50 transition-colors"
                  >
                    <HelpCircle className="size-3.5" />
                  </button>
                </label>
                <Input
                  value={draftConfig.ordersAppsScriptUrl || ""}
                  onChange={(e) => onConfigChange({ ...draftConfig, ordersAppsScriptUrl: e.target.value })}
                  placeholder="https://script.google.com/macros/s/..."
                  dir="ltr"
                  className="h-9 text-xs bg-white dark:bg-gray-900"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Help Dialog for Google Apps Script */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">كيفية الحصول على رابط Google Apps Script</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="font-medium text-emerald-700 dark:text-emerald-400">اتبع الخطوات دي عشان تنشئ Web App للأوردرات:</p>
            <ol className="list-decimal pr-5 space-y-2 text-muted-foreground">
              <li>افتح <strong>Google Sheets</strong> — استخدم Sheet موجود أو اعمل واحد جديد للمنتجات</li>
              <li>من القائمة: <strong>Extensions → Apps Script</strong></li>
              <li>امسح الكود الموجود وحط الكود ده:
                <pre className="mt-1 p-3 rounded-lg bg-muted text-xs font-mono text-left direction-ltr overflow-x-auto whitespace-pre-wrap">
{`function doPost(e) {
  const sheet = SpreadsheetApp
    .openById('YOUR_SHEET_ID')
    .getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.orderNumber || '',
    JSON.stringify(data.items || []),
    data.total || '',
    data.customerName || '',
    '\u062C\u062F\u064A\u062F',
    new Date().toISOString()
  ]);

  return ContentService
    .createTextOutput(
      JSON.stringify({ success: true })
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}`}
                </pre>
              </li>
              <li>غير <code className="bg-muted px-1 rounded">YOUR_SHEET_ID</code> برقم Sheet ID (اللي في الرابط: <span dir="ltr" className="text-xs">https://docs.google.com/spreadsheets/d/<b>THIS_PART</b>/edit</span>)</li>
              <li>عدّل الأعمدة حسب ترتيب الـ Sheet بتاعك</li>
              <li>اضغط <strong>Deploy → New deployment → Web app</strong>
                <ul className="list-disc pr-4 mt-1 space-y-1">
                  <li>Execute as: <strong>Me</strong></li>
                  <li>Who has access: <strong>Anyone</strong></li>
                </ul>
              </li>
              <li>انسخ الرابط اللي يظهر — ده اللي تحطه في حقل <strong>"رابط Google Apps Script"</strong></li>
            </ol>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
              <strong>ملحوظة:</strong> لو مش عاوز الأوردرات تتسجل Automatically، ممكن تسيب الحقل فاضي — الوكيل هيقدر يقرا المنتجات من الشيت ويحول المحادثة لإنشاء طلب يدوي.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Skills Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="size-4 text-muted-foreground" />
          <p className="text-sm font-bold">المهارات</p>
          <Badge variant="secondary" className="text-xs">{enabledSkillsCount} / {allSkills.length}</Badge>
          <div className="mr-auto flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => setAddSkillOpen(true)}>+ إضافة مهارة</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={enableAllSkills}>تفعيل الكل</Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-destructive hover:text-destructive" onClick={disableAllSkills}>تعطيل الكل</Button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="بحث في المهارات..."
            value={skillsSearch}
            onChange={(e) => setSkillsSearch(e.target.value)}
            className="h-8 pr-8 text-xs"
          />
        </div>

        {allSkills.length === 0 ? (
          <div className="w-full rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
            <Shield className="mx-auto mb-2 size-6 text-muted-foreground/30" />
            لا توجد مهارات متاحة
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredSkills.map((skill) => {
              const enabled = draftAllowedSkills.includes(skill.id);
              return (
                <div
                  key={skill.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSkill(skill.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSkill(skill.id); } }}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3 text-sm cursor-pointer transition-all",
                    enabled
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-background hover:border-primary/20 opacity-60",
                  )}
                >
                  <Switch checked={enabled} className="pointer-events-none shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold text-sm", enabled ? "text-primary" : "text-muted-foreground")}>
                      {skill.displayName || skill.id}
                    </p>
                    {skill.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
                    )}
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
          <DialogHeader>
            <DialogTitle>إضافة أداة للوكيل</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ابحث عن أداة..."
              value={addToolSearch}
              onChange={(e) => setAddToolSearch(e.target.value)}
              className="h-9 pr-8 text-sm"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {allTools
                .filter((t) => {
                  if (!addToolSearch.trim()) return true;
                  const q = addToolSearch.toLowerCase();
                  return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
                })
                .map((tool) => {
                  const enabled = draftAllowedTools.includes(tool.name);
                  return (
                    <div
                      key={tool.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleTool(tool.name)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleTool(tool.name); } }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                        enabled ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/20",
                      )}
                    >
                      <Switch checked={enabled} className="pointer-events-none shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-semibold", enabled ? "text-primary" : "text-muted-foreground")}>{tool.name}</p>
                        {tool.description && <p className="text-[0.65rem] text-muted-foreground truncate">{tool.description}</p>}
                      </div>
                      {enabled && (
                        <select
                          value={draftToolAutonomy[tool.name] || "auto"}
                          onChange={(e) => { e.stopPropagation(); setToolAutonomy(tool.name, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-6 rounded border bg-background px-1 text-[0.6rem]"
                        >
                          <option value="auto">تلقائي</option>
                          <option value="approval">تأكيد</option>
                          <option value="blocked">محظور</option>
                        </select>
                      )}
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Skill Dialog */}
      <Dialog open={addSkillOpen} onOpenChange={setAddSkillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة مهارة للوكيل</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="ابحث عن مهارة..."
              value={addSkillSearch}
              onChange={(e) => setAddSkillSearch(e.target.value)}
              className="h-9 pr-8 text-sm"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-1">
              {allSkills
                .filter((s) => {
                  if (!addSkillSearch.trim()) return true;
                  const q = addSkillSearch.toLowerCase();
                  return s.id.toLowerCase().includes(q) || (s.displayName || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
                })
                .map((skill) => {
                  const enabled = draftAllowedSkills.includes(skill.id);
                  return (
                    <div
                      key={skill.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSkill(skill.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSkill(skill.id); } }}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-all",
                        enabled ? "border-primary/40 bg-primary/5" : "border-border/60 hover:border-primary/20",
                      )}
                    >
                      <Switch checked={enabled} className="pointer-events-none shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-semibold", enabled ? "text-primary" : "text-muted-foreground")}>{skill.displayName || skill.id}</p>
                        {skill.description && <p className="text-[0.65rem] text-muted-foreground truncate">{skill.description}</p>}
                      </div>
                    </div>
                  );
                })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Field Editor (with Preview) ──────────────────────────────── */

function FieldEditor({
  label,
  value,
  onChange,
  minRows = 8,
  disablePreview = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  disablePreview?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const lineCount = value.split("\n").length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const shouldCollapse = !expanded && lineCount > 6;
  const isMarkdown = label.endsWith(".md");

  return (
    <div className="ai-editor-wrapper">
      <div className="ai-editor-header">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center size-6 rounded-lg bg-primary/10 text-primary">
            <FileCode className="size-3.5" />
          </span>
          <span className="text-sm font-bold text-foreground font-mono tracking-wide">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.65rem] text-muted-foreground">{lineCount} سطر · {wordCount} كلمة</span>
          {isMarkdown && !disablePreview && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
            >
              {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {showPreview ? "تحرير" : "معاينة"}
            </button>
          )}
          {lineCount > 6 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
            >
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              {expanded ? "طي" : "توسيع"}
            </button>
          )}
        </div>
      </div>

      {showPreview && isMarkdown && !disablePreview ? (
        <div
          className="ai-editor-preview"
          dir="ltr"
          dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(value) }}
        />
      ) : (
        <div className="relative min-h-[200px]">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={shouldCollapse ? 10 : minRows}
            className="resize-y border-0 rounded-none bg-transparent font-mono text-sm leading-[1.8] text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40 px-5 py-4 min-h-[200px]"
            dir="ltr"
            spellCheck={false}
            placeholder={`اكتب محتوى ${label} هنا...`}
          />
        </div>
      )}
    </div>
  );
}