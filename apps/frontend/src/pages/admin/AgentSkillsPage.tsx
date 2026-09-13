import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  RefreshCw,
  AlertCircle,
  Cpu,
  Layers,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useAuth } from "../../hooks/useAuthSimple";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

import {
  SkillDefinition,
  ToolDefinition,
  AgentDefinition,
  SkillVertical,
  getSkillMeta,
} from "./agent-skills/types";
import { SkillTelemetryBar } from "./agent-skills/SkillTelemetryBar";
import { SkillFilterBar } from "./agent-skills/SkillFilterBar";
import { SkillBentoCard } from "./agent-skills/SkillBentoCard";
import { SkillMatrixRow } from "./agent-skills/SkillMatrixRow";
import { SkillInspectorDrawer } from "./agent-skills/SkillInspectorDrawer";
import { AssignSkillModal } from "./agent-skills/AssignSkillModal";
import { CreateSkillModal } from "./agent-skills/CreateSkillModal";

const cq = (path: string, companyId?: string) =>
  companyId
    ? `${path}${path.includes("?") ? "&" : "?"}companyId=${encodeURIComponent(companyId)}`
    : path;

const apiRequest = async <T,>(path: string, companyId?: string): Promise<T> => {
  const response = await fetch(buildApiUrl(cq(path, companyId)), {
    headers: tokenManager.createAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(
      data.error || data.message || `Request failed: ${response.status}`
    );
  }
  return data as T;
};

const apiPut = async <T,>(
  path: string,
  body: unknown,
  companyId?: string
): Promise<T> => {
  const response = await fetch(buildApiUrl(cq(path, companyId)), {
    method: "PUT",
    headers: {
      ...tokenManager.createAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(
      data.error || data.message || `Request failed: ${response.status}`
    );
  }
  return data as T;
};

export default function AgentSkillsPage({
  companyId: propCompanyId,
}: { companyId?: string } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const effectiveCompanyId = propCompanyId || user?.companyId || undefined;

  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [query, setQuery] = useState("");
  const [selectedVertical, setSelectedVertical] = useState<SkillVertical>("all");
  const [safetyFilter, setSafetyFilter] = useState<"all" | "autonomous" | "approval" | "equipped">("all");
  const [viewMode, setViewMode] = useState<"grid" | "matrix">("grid");

  // Inspection Drawer & Dialogs
  const [inspectedSkill, setInspectedSkill] = useState<SkillDefinition | null>(null);
  const [assignSkill, setAssignSkill] = useState<SkillDefinition | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Tools Map for fast O(1) lookup
  const toolsMap = useMemo(() => new Map(tools.map((t) => [t.name, t])), [tools]);

  // Skill -> Equipped Agents mapping
  const skillEquippedAgentsMap = useMemo(() => {
    const map = new Map<string, AgentDefinition[]>();
    for (const agent of agents) {
      for (const sid of agent.allowedSkills || []) {
        const existing = map.get(sid) || [];
        existing.push(agent);
        map.set(sid, existing);
      }
    }
    return map;
  }, [agents]);

  // Load all skills, tools, and agents
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sd, td, ad] = await Promise.all([
        apiRequest<{ success: true; skills: SkillDefinition[] }>(
          "agent/skills",
          effectiveCompanyId
        ),
        apiRequest<{ success: true; tools: ToolDefinition[] }>(
          "agent/tools",
          effectiveCompanyId
        ),
        effectiveCompanyId
          ? apiRequest<{ success: true; agents: AgentDefinition[] }>(
              "agent-manager/agents",
              effectiveCompanyId
            ).catch(() => ({ success: true as const, agents: [] }))
          : { success: true as const, agents: [] as AgentDefinition[] },
      ]);

      setSkills(sd.skills || []);
      setTools(td.tools || []);
      setAgents(ad.agents || []);
    } catch (err: any) {
      setError(err.message || t("common.loadError"));
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId, t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Counts by vertical for the filter tabs
  const verticalCounts = useMemo(() => {
    const counts: Record<SkillVertical, number> = {
      all: skills.length,
      sales: 0,
      support: 0,
      marketing: 0,
      medical: 0,
      hotels: 0,
      education: 0,
      inventory: 0,
      management: 0,
      other: 0,
    };

    for (const s of skills) {
      const meta = getSkillMeta(s);
      if (meta.vertical in counts) {
        counts[meta.vertical] = (counts[meta.vertical] || 0) + 1;
      } else {
        counts.other = (counts.other || 0) + 1;
      }
    }
    return counts;
  }, [skills]);

  // Filtered skills list
  const filteredSkills = useMemo(() => {
    let list = skills;
    const q = query.trim().toLowerCase();

    // 1. Text search
    if (q) {
      list = list.filter((s) => {
        const meta = getSkillMeta(s);
        return [
          s.id,
          s.displayName,
          s.description,
          meta.titleAr,
          meta.descAr,
          meta.triggerAr,
          ...(s.allowedTools || []),
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
    }

    // 2. Vertical filter
    if (selectedVertical !== "all") {
      list = list.filter((s) => getSkillMeta(s).vertical === selectedVertical);
    }

    // 3. Safety filter
    if (safetyFilter === "autonomous") {
      list = list.filter((s) => !s.requiresHumanApproval && !getSkillMeta(s).isApprovalRequired);
    } else if (safetyFilter === "approval") {
      list = list.filter((s) => s.requiresHumanApproval || getSkillMeta(s).isApprovalRequired);
    } else if (safetyFilter === "equipped") {
      list = list.filter((s) => (skillEquippedAgentsMap.get(s.id) || []).length > 0);
    }

    return list;
  }, [skills, query, selectedVertical, safetyFilter, skillEquippedAgentsMap]);

  // Single Agent Toggle Handler (from Drawer)
  const handleToggleAgent = async (agentId: string, enabled: boolean) => {
    if (!inspectedSkill) return;
    const targetSkillId = inspectedSkill.id;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    const currentSkills = agent.allowedSkills || [];
    const newSkills = enabled
      ? [...new Set([...currentSkills, targetSkillId])]
      : currentSkills.filter((s) => s !== targetSkillId);

    await apiPut(
      `/agent/agents/${agent.id}/files`,
      {
        name: agent.name,
        role: agent.role,
        allowedTools: agent.allowedTools || [],
        allowedSkills: newSkills,
      },
      effectiveCompanyId
    );

    // Optimistic state update
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, allowedSkills: newSkills } : a))
    );
  };

  // Bulk Agent Assign Handler (from Modal)
  const handleSaveBulkAssign = async (selectedAgentIds: string[]) => {
    if (!assignSkill) return;
    const targetSkillId = assignSkill.id;

    await Promise.all(
      agents.map(async (agent) => {
        const has = (agent.allowedSkills || []).includes(targetSkillId);
        const shouldHave = selectedAgentIds.includes(agent.id);
        if (has === shouldHave) return;

        const newSkills = shouldHave
          ? [...(agent.allowedSkills || []), targetSkillId]
          : (agent.allowedSkills || []).filter((s) => s !== targetSkillId);

        return apiPut(
          `/agent/agents/${agent.id}/files`,
          {
            name: agent.name,
            role: agent.role,
            allowedTools: agent.allowedTools || [],
            allowedSkills: newSkills,
          },
          effectiveCompanyId
        );
      })
    );

    toast.success("تم تحديث تعيين المهارة بنجاح");
    loadAll();
  };

  const handleTestSandbox = (skill: SkillDefinition) => {
    navigate(`/admin/ai-hub?tab=sandbox&skill=${encodeURIComponent(skill.id)}`);
  };

  return (
    <div dir="rtl" className="flex flex-col gap-4 p-3.5 sm:p-6 w-full max-w-[1750px] mx-auto">
      {/* 1. Vanguard Cockpit Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
              مركز قدرات ومهارات الوكلاء (Agent Capability Studio)
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Autonomous Core 2026
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            كتالوج القدرات التنفيذية المستقلة لتشغيل وكلاء المبيعات، العيادات، الفنادق، وخدمة العملاء بأعلى درجات الأمان والربحية.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-9 gap-1.5 font-bold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
          >
            <Plus className="size-4" />
            <span>مهارة مخصصة جديدة</span>
          </Button>

          <Button
            variant="outline"
            size="icon-sm"
            onClick={loadAll}
            disabled={loading}
            className="h-9 w-9 text-muted-foreground hover:text-foreground border-border/80"
            title="تحديث البيانات"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 2. Live Telemetry Bar */}
      <SkillTelemetryBar skills={skills} agents={agents} tools={tools} />

      {/* 3. Segmented Filter & Controls Bar */}
      <SkillFilterBar
        query={query}
        onQueryChange={setQuery}
        selectedVertical={selectedVertical}
        onSelectVertical={setSelectedVertical}
        safetyFilter={safetyFilter}
        onSafetyFilterChange={setSafetyFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        verticalCounts={verticalCounts}
        totalFiltered={filteredSkills.length}
      />

      {/* 4. Main Content: Grid Bento Cards vs Matrix View */}
      {loading ? (
        <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-dashed bg-card/40">
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" />
            <span className="text-xs text-muted-foreground font-mono">جارٍ مزامنة قدرات الوكلاء...</span>
          </div>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/30 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
            <Search className="size-5" />
          </div>
          <h3 className="font-bold text-sm text-foreground">لا توجد مهارات مطابقة للبحث</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            جرب تعديل كلمات البحث أو اختيار قطاع آخر من شريط التصنيفات بالأعلى.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              setSelectedVertical("all");
              setSafetyFilter("all");
            }}
            className="mt-3 text-xs"
          >
            إعادة تعيين الفلاتر
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSkills.map((skill) => (
            <SkillBentoCard
              key={skill.id}
              skill={skill}
              equippedAgents={skillEquippedAgentsMap.get(skill.id) || []}
              toolsMap={toolsMap}
              onInspect={(s) => setInspectedSkill(s)}
              onAssign={(s) => setAssignSkill(s)}
              onTestSandbox={handleTestSandbox}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-[0.7rem] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">القدرة والرمز الفني</th>
                  <th className="py-3 px-3 hidden sm:table-cell">القطاع التجاري</th>
                  <th className="py-3 px-3">نمط التشغيل</th>
                  <th className="py-3 px-3 hidden md:table-cell">الأدوات</th>
                  <th className="py-3 px-3 hidden lg:table-cell">الوكلاء المجهزون</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSkills.map((skill) => (
                  <SkillMatrixRow
                    key={skill.id}
                    skill={skill}
                    equippedAgents={skillEquippedAgentsMap.get(skill.id) || []}
                    toolsMap={toolsMap}
                    onInspect={(s) => setInspectedSkill(s)}
                    onAssign={(s) => setAssignSkill(s)}
                    onTestSandbox={handleTestSandbox}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Slide-Over Quick Inspector Drawer */}
      <SkillInspectorDrawer
        skill={inspectedSkill}
        open={!!inspectedSkill}
        onClose={() => setInspectedSkill(null)}
        agents={agents}
        toolsMap={toolsMap}
        onAgentToggled={handleToggleAgent}
        companyId={effectiveCompanyId}
      />

      {/* 6. Assign Skill Modal */}
      <AssignSkillModal
        open={!!assignSkill}
        skill={assignSkill}
        agents={agents}
        onClose={() => setAssignSkill(null)}
        onSave={handleSaveBulkAssign}
      />

      {/* 7. Create Custom Skill Modal */}
      <CreateSkillModal
        open={createOpen}
        tools={tools}
        onClose={() => setCreateOpen(false)}
        onSaved={loadAll}
        companyId={effectiveCompanyId}
      />
    </div>
  );
}
