import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Loader2, AlertCircle, Bot, Search, Plus, Trash2,
  Shield, RefreshCw, Menu, MessageSquare, Lock, Archive,
  Wrench, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sandboxApi, type AgentProfileResponse } from "../ai-agent-sandbox/services/sandboxApi";
import AgentProfileHeader from "./AgentProfileHeader";
import AgentSettingsTab from "./AgentSettingsTab";
import AgentSkillsTab from "./AgentSkillsTab";
import AgentToolsTab from "./AgentToolsTab";
import CreateAgentDialog from "./CreateAgentDialog";
import AgentGuardrailsTab from "./AgentGuardrailsTab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent,
} from "@/components/ui/sheet";
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
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

type Tab = "settings" | "skills" | "tools" | "guardrails";

const FILES_EQUAL = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    if ((a?.[k] || "") !== (b?.[k] || "")) return false;
  }
  return true;
};

async function tryApiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    let companyId = "";
    try {
      const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (userStr) companyId = JSON.parse(userStr).companyId || "";
    } catch {
      // ignore JSON parse error
    }
    const res = await fetch(buildApiUrl(path), {
      ...init,
      headers: {
        ...tokenManager.createAuthHeaders(companyId ? { "X-Company-Id": companyId } : {}),
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const msg = data?.error || data?.detail || data?.message || `HTTP ${res.status}`;
      console.warn("[tryApiFetch] %s %s: %s", init?.method || "GET", path, msg);
      return null;
    }
    return data as T;
  } catch (err) {
    console.warn("[tryApiFetch] %s %s exception: %o", init?.method || "GET", path, err);
    return null;
  }
}

interface AgentItem {
  id: string;
  name: string;
  role: string;
  icon?: string;
  status?: string;
  allowedChannels?: string[];
  templateSlug?: string | null;
  description?: string | null;
}

export default function AgentProfilesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentIdFromUrl = searchParams.get("agent");
  const isMobile = useIsMobile(1024);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const companyId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").companyId || "";
    } catch {
      return "";
    }
  }, []);

  const initialAgentIdRef = React.useRef<string | null>(agentIdFromUrl);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(agentIdFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentsListTab, setAgentsListTab] = useState<"active" | "archived">("active");

  const [tab, setTab] = useState<Tab>("settings");
  const [profile, setProfile] = useState<AgentProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [statusSaving, setStatusSaving] = useState(false);
  const [actionConfirm, setActionConfirm] = useState<"archive" | "delete" | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftIcon, setDraftIcon] = useState("🤖");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftFiles, setDraftFiles] = useState<Record<string, string>>({});
  const [draftConfig, setDraftConfig] = useState<Record<string, string>>({});
  const [profileSaving, setProfileSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [templates, setTemplates] = useState<Array<{ slug: string; name: string; role: string; allowedTools: string[]; allowedSkills: string[] }>>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  /* ── Unsaved changes calculation (Clean & non-mutating) ── */
  const hasUnsavedChanges = useMemo(() => {
    if (!profile) return false;
    return (
      draftName !== (profile.agent.name || "") ||
      draftIcon !== (profile.agent.icon || "🤖") ||
      draftDescription !== (profile.agent.description || "") ||
      JSON.stringify(draftConfig) !== JSON.stringify((profile.agent as { config?: Record<string, string> }).config || {}) ||
      !FILES_EQUAL(draftFiles, profile.files)
    );
  }, [profile, draftName, draftIcon, draftDescription, draftConfig, draftFiles]);

  const tabs: { key: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: "settings", label: t("agentProfiles.tabs.settings", "الإعدادات"), icon: <Shield className="size-4" /> },
    {
      key: "skills",
      label: t("agentProfiles.tabs.skills", "المهارات"),
      count: profile?.skills?.length ?? 0,
      icon: <Zap className="size-4 text-indigo-500" />,
    },
    {
      key: "tools",
      label: t("agentProfiles.tabs.tools", "الأدوات"),
      count: profile?.allowedTools?.length ?? 0,
      icon: <Wrench className="size-4 text-primary" />,
    },
    { key: "guardrails", label: t("agentProfiles.tabs.guardrails", "القواعد والتعلم"), icon: <Lock className="size-4" /> },
  ];

  /* ── Load agents ── */
  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    setProfileError(null);
    const initialTargetId = initialAgentIdRef.current;
    initialAgentIdRef.current = null;

    try {
      if (agentsListTab === "archived") {
        const res = await tryApiFetch<{ success: boolean; agents: AgentItem[] }>("/agent/agents?status=ARCHIVED");
        const list = res?.agents || [];
        setAgents(list);
        if (list.length > 0) {
          setSelectedId((prev) => (list.some((a) => a.id === prev) ? prev : list[0].id));
        } else {
          setSelectedId(null);
          setProfile(null);
        }
      } else {
        const res = await sandboxApi.getAgents(initialTargetId || undefined);
        const list = (res.agents || []) as AgentItem[];

        // Only on initial page load: if the URL agent is not in active list, check if it is archived
        if (initialTargetId && !list.some((a) => a.id === initialTargetId)) {
          const archRes = await tryApiFetch<{ success: boolean; agents: AgentItem[] }>("/agent/agents?status=ARCHIVED");
          const archList = archRes?.agents || [];
          if (archList.some((a) => a.id === initialTargetId)) {
            setAgents(archList);
            setSelectedId(initialTargetId);
            setAgentsListTab("archived");
            return;
          }
        }

        setAgents(list);
        if (initialTargetId && list.some((a) => a.id === initialTargetId)) {
          setSelectedId(initialTargetId);
        } else if (list.length > 0) {
          setSelectedId((prev) => (list.some((a) => a.id === prev) ? prev : list[0].id));
        } else {
          setSelectedId(null);
          setProfile(null);
        }
      }
    } catch {
      setProfileError(t("agentProfiles.sidebar.loadError", "فشل تحميل الوكلاء"));
    } finally {
      setAgentsLoading(false);
    }
  }, [agentsListTab, t]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const orderedAgents = useMemo(() => {
    const ceo = agents.find((a) => a.role === "CEO");
    if (!ceo) return agents;
    return [ceo, ...agents.filter((a) => a.id !== ceo.id)];
  }, [agents]);

  /* ── Load templates for Create Agent ── */
  useEffect(() => {
    if (!createOpen) return;
    setTemplatesLoading(true);
    tryApiFetch<{ profiles: Array<{ slug: string; name: string; role: string; allowedTools: string[]; allowedSkills: string[] }> }>("/agent-manager/profiles")
      .then((data) => {
        setTemplates(data?.profiles || []);
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, [createOpen]);

  /* ── Load selected agent profile ── */
  const loadProfileData = useCallback(async (id: string) => {
    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    setEditing(false);

    try {
      const data = await sandboxApi.getAgentProfile(id);
      setProfile(data);
      setDraftName(data.agent.name || "");
      setDraftIcon(data.agent.icon || "🤖");
      setDraftDescription(data.agent.description || "");
      setDraftFiles({ ...(data.files || {}) });
      setDraftConfig({ ...((data.agent as { config?: Record<string, string> }).config || {}) });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load profile";
      setProfileError(errorMsg);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      setSearchParams((prev) => {
        if (!prev.has("agent")) return prev;
        const next = new URLSearchParams(prev);
        next.delete("agent");
        return next;
      }, { replace: true });
      return;
    }
    setSearchParams((prev) => {
      if (prev.get("agent") === selectedId) return prev;
      const next = new URLSearchParams(prev);
      next.set("agent", selectedId);
      return next;
    }, { replace: true });

    loadProfileData(selectedId);
  }, [selectedId, setSearchParams, loadProfileData]);

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

  /* ── Toggle Status ── */
  const toggleStatus = async (nextActive: boolean) => {
    if (!selectedId || !profile) return;
    setStatusSaving(true);
    const data = await tryApiFetch<{ success: boolean; agent: { status: string } }>(
      `/agent/agents/${selectedId}/status`,
      { method: "PATCH", body: JSON.stringify({ status: nextActive ? "ACTIVE" : "PAUSED" }) }
    );
    if (data?.agent?.status) {
      const nextStatus = data.agent.status;
      setProfile((prev) => (prev ? { ...prev, agent: { ...prev.agent, status: nextStatus } } : prev));
      setAgents((prev) => prev.map((a) => (a.id === selectedId ? { ...a, status: nextStatus } : a)));
      if (agentsListTab === "archived" && nextActive) {
        setAgentsListTab("active");
      }
      toast.success(nextActive ? t("agentProfiles.header.status.active_toggle", "تم تفعيل الوكيل") : t("agentProfiles.header.status.paused_toggle", "تم إيقاف الوكيل"));
    }
    setStatusSaving(false);
  };

  /* ── Save Profile ── */
  const saveProfile = async () => {
    if (!selectedId || !profile) return;
    setProfileSaving(true);
    setProfileError(null);

    const body: Record<string, unknown> = {
      name: draftName || profile.agent.name,
      description: draftDescription,
      role: profile.agent.role,
      icon: draftIcon,
      config: draftConfig,
      files: draftFiles,
    };

    const data = await tryApiFetch<{ success: boolean } & Record<string, unknown>>(
      `/agent/agents/${selectedId}/files`,
      { method: "PUT", body: JSON.stringify(body) }
    );

    if (data) {
      setProfile((prev) =>
        prev
          ? ({
              ...prev,
              agent: {
                ...prev.agent,
                name: draftName || prev.agent.name,
                description: draftDescription,
                icon: draftIcon,
                config: draftConfig,
              },
              files: { ...draftFiles },
            } as typeof prev)
          : prev
      );
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedId
            ? { ...a, name: draftName || a.name, icon: draftIcon, description: draftDescription }
            : a
        )
      );
      setEditing(false);
      toast.success(t("agentProfiles.toast.saveSuccess", "تم حفظ التغييرات بنجاح"));
    } else {
      setProfileError(t("agentProfiles.toast.saveFailed", "فشل حفظ التغييرات"));
    }
    setProfileSaving(false);
  };

  /* ── Discard Changes ── */
  const discardChanges = () => {
    if (!profile) return;
    setEditing(false);
    setDraftName(profile.agent.name || "");
    setDraftIcon(profile.agent.icon || "🤖");
    setDraftDescription(profile.agent.description || "");
    setDraftFiles({ ...(profile.files || {}) });
    setDraftConfig({ ...((profile.agent as { config?: Record<string, string> }).config || {}) });
  };

  /* ── Archive Agent ── */
  const handleArchiveAgent = async () => {
    if (!actionConfirm || !selectedId) return;
    setDeleting(true);
    const data = await tryApiFetch<{ success: boolean }>(`/agent/agents/${selectedId}?archive=true`, { method: "DELETE" });
    if (data) {
      setActionConfirm(null);
      const remaining = agents.filter((a) => a.id !== selectedId);
      setAgents(remaining);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
        setSearchParams({ agent: remaining[0].id }, { replace: true });
      } else {
        setSelectedId(null);
        setProfile(null);
        setSearchParams({}, { replace: true });
      }
      toast.success(t("agentProfiles.toast.archiveSuccess", "تمت أرشفة الوكيل بنجاح"));
      loadAgents();
    } else {
      toast.error(t("agentProfiles.toast.archiveFailed", "فشل أرشفة الوكيل"));
    }
    setDeleting(false);
  };

  /* ── Permanent Delete Agent ── */
  const handleDeleteAgent = async () => {
    if (!actionConfirm || !selectedId) return;
    setDeleting(true);
    const data = await tryApiFetch<{ success: boolean }>(`/agent/agents/${selectedId}?permanent=true`, { method: "DELETE" });
    if (data) {
      setActionConfirm(null);
      const remaining = agents.filter((a) => a.id !== selectedId);
      setAgents(remaining);
      if (remaining.length > 0) {
        setSelectedId(remaining[0].id);
        setSearchParams({ agent: remaining[0].id }, { replace: true });
      } else {
        setSelectedId(null);
        setProfile(null);
        setSearchParams({}, { replace: true });
      }
      toast.success(t("agentProfiles.toast.deleteSuccess", "تم حذف الوكيل نهائياً"));
      loadAgents();
    } else {
      toast.error(t("agentProfiles.toast.deleteFailed", "فشل حذف الوكيل"));
    }
    setDeleting(false);
  };

  const selectedAgent = useMemo(() => {
    const found = agents.find((a) => a.id === selectedId);
    if (found) return found;
    if (profile?.agent && profile.agent.id === selectedId) {
      return {
        id: profile.agent.id,
        name: profile.agent.name || "",
        role: profile.agent.role || "",
        icon: profile.agent.icon,
        status: profile.agent.status,
        allowedChannels: profile.agent.allowedChannels,
        templateSlug: profile.agent.templateSlug,
        description: profile.agent.description,
      } as AgentItem;
    }
    return undefined;
  }, [agents, selectedId, profile]);

  /* ── Dynamic Page Title ── */
  useEffect(() => {
    if (selectedAgent?.name) {
      document.title = `${selectedAgent.name} — ${t("agentProfiles.sidebar.title", "فريق الايجنت")}`;
    }
  }, [selectedAgent?.name, t]);

  /* ── Channels computation ── */
  const channels = useMemo(() => {
    if (selectedAgent?.allowedChannels && selectedAgent.allowedChannels.length > 0) {
      return selectedAgent.allowedChannels;
    }
    const text = [profile?.agent.role, profile?.agent.templateSlug, profile?.agent.description].filter(Boolean).join(" ").toLowerCase();
    const chs: string[] = [];
    if (text.includes("facebook") || text.includes("messenger")) chs.push("facebook");
    if (text.includes("whatsapp")) chs.push("whatsapp");
    return chs.length > 0 ? chs : ["whatsapp"];
  }, [selectedAgent, profile]);

  const filteredAgents = orderedAgents.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || (a.role && a.role.toLowerCase().includes(q));
  });

  /* ── Sidebar Component ── */
  const sidebarContent = (
    <aside className="w-full lg:w-64 h-full shrink-0 border-e border-border/50 flex flex-col overflow-hidden bg-card/40">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground/90">{t("agentProfiles.sidebar.title", "فريق الايجنت")}</h2>
          {!agentsLoading && <Badge variant="secondary" className="text-xs">{agents.length}</Badge>}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center size-7 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
          title={t("agentProfiles.sidebar.addTitle", "إضافة وكيل ذكي")}
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <Input
            placeholder={t("agentProfiles.sidebar.search", "بحث...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pr-8 text-xs"
          />
        </div>
      </div>

      <div className="px-3 pb-2 flex gap-1 border-b border-border/20">
        <button
          onClick={() => {
            setAgentsListTab("active");
            setSearchQuery("");
          }}
          className={cn(
            "flex-1 py-1 text-center text-[11px] font-semibold rounded-md transition-all",
            agentsListTab === "active"
              ? "bg-primary/10 text-primary font-bold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {t("agentProfiles.sidebar.activeTab", "النشطين")}
        </button>
        <button
          onClick={() => {
            setAgentsListTab("archived");
            setSearchQuery("");
          }}
          className={cn(
            "flex-1 py-1 text-center text-[11px] font-semibold rounded-md transition-all",
            agentsListTab === "archived"
              ? "bg-primary/10 text-primary font-bold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          {t("agentProfiles.sidebar.archivedTab", "المؤرشفين")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {agentsLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 animate-pulse">
                <div className="size-8 rounded-lg bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-2 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-xs text-muted-foreground/60">
            <Search className="size-6 text-muted-foreground/30" />
            <span>{t("agentProfiles.sidebar.noResults", "لا توجد نتائج")}</span>
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const isAgentActive = agent.status?.toUpperCase() === "ACTIVE";
            const isCurrentSelected = selectedId === agent.id;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedId(agent.id);
                  setSearchParams({ agent: agent.id }, { replace: true });
                  setTab("settings");
                  setMobileDrawerOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-lg text-right transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCurrentSelected
                    ? "bg-primary/10 border border-primary/20 text-primary font-semibold"
                    : "hover:bg-muted/50 border border-transparent text-foreground/80"
                )}
              >
                <span className="text-xl shrink-0">{agent.icon || "🤖"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs truncate font-medium">{agent.name}</p>
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full shrink-0",
                        isAgentActive ? "bg-emerald-500" : "bg-muted-foreground/30"
                      )}
                      title={isAgentActive ? "نشط" : "متوقف"}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{agent.role}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ── Mobile Drawer ── */}
      {isMobile && (
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetContent side="right" className="w-[85vw] max-w-[340px] p-0 flex flex-col h-full bg-card">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* ── Desktop Static Sidebar ── */}
      {!isMobile && sidebarContent}

      {/* ── Main Panel ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
        {/* Mobile Fallback Bar (Only when no agent profile is loaded) */}
        {isMobile && !(selectedAgent && profile) && (
          <div className="flex items-center justify-between gap-2 p-2.5 border-b border-border/50 lg:hidden bg-card/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileDrawerOpen(true)}
              className="gap-2 text-xs h-8"
            >
              <Menu className="size-4" />
              <span>{t("agentProfiles.sidebar.title", "فريق الايجنت")}</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1.5 text-xs h-8"
            >
              <Plus className="size-4" />
              <span>{t("agentProfiles.sidebar.addTitle", "إضافة")}</span>
            </Button>
          </div>
        )}

        {selectedAgent && profile ? (
          <>
            {/* Header */}
            <AgentProfileHeader
              agentId={selectedAgent.id}
              agentRole={selectedAgent.role}
              agentStatus={profile.agent.status}
              templateSlug={profile.agent.templateSlug}
              channels={channels}
              editing={editing}
              setEditing={setEditing}
              draftName={draftName}
              setDraftName={setDraftName}
              draftIcon={draftIcon}
              setDraftIcon={setDraftIcon}
              hasUnsavedChanges={hasUnsavedChanges}
              statusSaving={statusSaving}
              profileSaving={profileSaving}
              onToggleStatus={toggleStatus}
              onSave={saveProfile}
              onDiscard={discardChanges}
              onArchive={() => setActionConfirm("archive")}
              onDelete={() => setActionConfirm("delete")}
              onRefresh={loadAgents}
              refreshLoading={agentsLoading}
              onOpenDrawer={() => setMobileDrawerOpen(true)}
              onCreateAgent={() => setCreateOpen(true)}
            />

            {/* Tabs Bar */}
            <div className="border-b border-border/50 px-2 sm:px-4 lg:px-6 flex gap-1 sm:gap-2 bg-card/40 overflow-x-auto no-scrollbar shrink-0">
              {tabs.map(({ key, label, count, icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 min-h-[44px] text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap active:scale-98",
                    tab === key
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {icon}
                  <span>{label}</span>
                  {typeof count === "number" && (
                    <span
                      className={cn(
                        "text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-mono font-medium",
                        tab === key
                          ? "bg-primary/15 text-primary font-bold"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6 pb-24 sm:pb-8 min-h-0 min-w-0">
              {profileError && (
                <div role="alert" className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl max-w-2xl mb-5 text-destructive text-xs">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="flex-1">{profileError}</span>
                  <button onClick={() => setProfileError(null)} className="font-bold">&times;</button>
                </div>
              )}

              {profile.agent.status?.toUpperCase() === "ARCHIVED" ? (
                <div className="max-w-md mx-auto my-12 p-6 bg-card border border-border rounded-2xl text-center space-y-5 shadow-sm">
                  <div className="size-14 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-2xl">
                    {draftIcon || "🤖"}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">{draftName}</h3>
                    <p className="text-xs text-muted-foreground">{profile.agent.role}</p>
                    <p className="text-xs text-muted-foreground pt-2 leading-relaxed">
                      {t("agentProfiles.archived.desc", "هذا الوكيل مؤرشف حالياً. يمكنك استعادته للعمل، أو حذفه بشكل نهائي.")}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={async () => {
                        const data = await tryApiFetch<{ success: boolean; agent?: { status?: string } }>(
                          `/agent/agents/${selectedId}/status`,
                          { method: "PATCH", body: JSON.stringify({ status: "ACTIVE" }) }
                        );
                        if (data) {
                          const nextStatus = data.agent?.status || "ACTIVE";
                          setProfile((prev) => (prev ? { ...prev, agent: { ...prev.agent, status: nextStatus } } : prev));
                          toast.success(t("agentProfiles.archived.restoreSuccess", "تمت استعادة الوكيل بنجاح."));
                          if (agentsListTab === "active") {
                            loadAgents();
                          } else {
                            setAgentsListTab("active");
                          }
                        }
                      }}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <RefreshCw className="size-3" />
                      {t("agentProfiles.archived.restoreBtn", "استعادة الوكيل")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setActionConfirm("delete")}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Trash2 className="size-3" />
                      {t("agentProfiles.archived.deleteBtn", "حذف نهائي")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {tab === "settings" && (
                    <AgentSettingsTab
                      editing={editing}
                      draftName={draftName}
                      setDraftName={setDraftName}
                      draftDescription={draftDescription}
                      setDraftDescription={setDraftDescription}
                      draftConfig={draftConfig}
                      setDraftConfig={setDraftConfig}
                      draftFiles={draftFiles}
                      setDraftFiles={setDraftFiles}
                    />
                  )}

                  {tab === "skills" && (
                    <AgentSkillsTab
                      skills={profile.skills || []}
                      agentId={selectedAgent.id}
                      agentName={selectedAgent.name}
                      onRefresh={loadAgents}
                    />
                  )}

                  {tab === "tools" && (
                    <AgentToolsTab
                      allowedTools={profile.allowedTools || []}
                      agentId={selectedAgent.id}
                      agentName={selectedAgent.name}
                      companyId={companyId}
                      onRefresh={loadAgents}
                    />
                  )}

                  {tab === "guardrails" && (
                    <AgentGuardrailsTab
                      agentId={selectedAgent.id}
                      companyId={companyId}
                      agentModel={profile.agent.model || "gemini-2.5-flash"}
                      agentProvider="GOOGLE"
                    />
                  )}
                </>
              )}
            </div>
          </>
        ) : profileLoading || (agentsLoading && selectedId && !profile) ? (
          <div className="flex items-center justify-center flex-1 py-20">
            <Loader2 className="size-6 text-primary animate-spin" />
          </div>
        ) : profileError && !profile ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-center px-4">
            <AlertCircle className="size-10 text-destructive mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              {t("agentProfiles.header.loadFailed", "فشل تحميل بيانات الوكيل")}
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm">
              {profileError}
            </p>
            {selectedId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadProfileData(selectedId)}
                className="gap-2 text-xs"
              >
                <RefreshCw className="size-3.5" />
                {t("common.retry", "إعادة المحاولة")}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 py-20 text-center">
            <Bot className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-xs text-muted-foreground mb-4">{t("agentProfiles.header.noSelectionHint", "اختر وكيلاً لعرض التفاصيل")}</p>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5 ml-1" />
              {t("agentProfiles.sidebar.addTitle", "إضافة وكيل ذكي")}
            </Button>
          </div>
        )}
      </main>

      {/* ── Create Agent Dialog ── */}
      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        templates={templates}
        templatesLoading={templatesLoading}
        onCreated={(newId) => {
          toast.success(t("agentProfiles.toast.createSuccess", "تم إنشاء الوكيل بنجاح"));
          loadAgents().then(() => {
            setSelectedId(newId);
          });
        }}
      />

      {/* ── Archive Dialog ── */}
      <Dialog open={actionConfirm === "archive"} onOpenChange={(o) => { if (!o && !deleting) setActionConfirm(null); }}>
        <DialogContent className="sm:max-w-sm text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 text-base">
              <Archive className="size-4" />
              {t("agentProfiles.archive.title", "أرشفة الوكيل")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p>
              {t("agentProfiles.archive.confirmPrefix", "هل أنت متأكد من أرشفة الوكيل")}{" "}
              <strong className="font-semibold text-foreground">{selectedAgent?.name || draftName}</strong>
              {t("agentProfiles.archive.confirmSuffix", "؟")}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {t("agentProfiles.archive.note", "سيتم نقل الوكيل إلى قائمة المؤرشفين، وتبقى بياناته محفوظة حيث يمكنك استعادته في أي وقت.")}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setActionConfirm(null)} disabled={deleting}>
              {t("common.cancel", "إلغاء")}
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              size="sm"
              onClick={handleArchiveAgent}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Archive className="ml-1 size-3.5" />}
              {deleting ? t("agentProfiles.archive.archiving", "جارٍ الأرشفة...") : t("agentProfiles.archive.confirmButton", "أرشفة الوكيل")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Agent Dialog ── */}
      <Dialog open={actionConfirm === "delete"} onOpenChange={(o) => { if (!o && !deleting) setActionConfirm(null); }}>
        <DialogContent className="sm:max-w-sm text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive text-base">
              <Trash2 className="size-4" />
              {t("agentProfiles.delete.title", "حذف الوكيل نهائياً")}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-xs text-muted-foreground space-y-1.5 leading-relaxed">
            <p>
              {t("agentProfiles.delete.confirmPrefix", "هل أنت متأكد من حذف الوكيل")}{" "}
              <strong className="font-semibold text-foreground">{selectedAgent?.name || draftName}</strong>
              {t("agentProfiles.delete.confirmSuffix", " نهائياً؟")}
            </p>
            <p className="text-[11px] text-destructive/80 font-medium">
              {t("agentProfiles.delete.note", "سيتم مسح هذا الوكيل وكافة إعداداته وبياناته بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.")}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setActionConfirm(null)} disabled={deleting}>
              {t("common.cancel", "إلغاء")}
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteAgent} disabled={deleting}>
              {deleting ? <Loader2 className="ml-1 size-3 animate-spin" /> : <Trash2 className="ml-1 size-3.5" />}
              {deleting ? t("agentProfiles.delete.deleting", "جارٍ الحذف...") : t("agentProfiles.delete.confirmButton", "حذف نهائي")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
