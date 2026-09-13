import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, AlertCircle, DownloadCloud, CheckCircle2 } from "lucide-react";
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
import { SkillFilterBar } from "./agent-skills/SkillFilterBar";
import { SkillRowCard } from "./agent-skills/SkillRowCard";
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
  const [installFilter, setInstallFilter] = useState<"all" | "installed" | "uninstalled">("all");

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

  // Equipped skills count
  const equippedSkillsCount = useMemo(() => {
    let count = 0;
    for (const s of skills) {
      if ((skillEquippedAgentsMap.get(s.id) || []).length > 0) {
        count++;
      }
    }
    return count;
  }, [skills, skillEquippedAgentsMap]);

  const uninstalledSkillsCount = Math.max(0, skills.length - equippedSkillsCount);

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

    // 3. Installed / Uninstalled filter
    if (installFilter === "installed") {
      list = list.filter((s) => (skillEquippedAgentsMap.get(s.id) || []).length > 0);
    } else if (installFilter === "uninstalled") {
      list = list.filter((s) => (skillEquippedAgentsMap.get(s.id) || []).length === 0);
    }

    return list;
  }, [skills, query, selectedVertical, installFilter, skillEquippedAgentsMap]);

  // Sub-lists for clear visual grouping
  const installedSkillsList = useMemo(
    () => filteredSkills.filter((s) => (skillEquippedAgentsMap.get(s.id) || []).length > 0),
    [filteredSkills, skillEquippedAgentsMap]
  );

  const uninstalledSkillsList = useMemo(
    () => filteredSkills.filter((s) => (skillEquippedAgentsMap.get(s.id) || []).length === 0),
    [filteredSkills, skillEquippedAgentsMap]
  );

  // Toggle Switch Handler on Row (Enable / Disable Skill)
  const handleToggleSkill = async (skill: SkillDefinition, enabled: boolean) => {
    if (agents.length === 0) {
      toast.info("لا يوجد وكلاء مسجلون لهذه المنشأة لربط المهارة بهم");
      return;
    }

    try {
      if (!enabled) {
        // Remove skill from all agents who have it
        const agentsWithSkill = agents.filter((a) => (a.allowedSkills || []).includes(skill.id));
        await Promise.all(
          agentsWithSkill.map(async (agent) => {
            const nextSkills = (agent.allowedSkills || []).filter((s) => s !== skill.id);
            return apiPut(
              `/agent/agents/${agent.id}/files`,
              {
                name: agent.name,
                role: agent.role,
                allowedTools: agent.allowedTools || [],
                allowedSkills: nextSkills,
              },
              effectiveCompanyId
            );
          })
        );

        setAgents((prev) =>
          prev.map((a) => ({
            ...a,
            allowedSkills: (a.allowedSkills || []).filter((s) => s !== skill.id),
          }))
        );
        toast.success(`تم تعطيل مهارة "${skill.id}" عن الوكلاء`);
      } else {
        // Enable: if there are agents matching the vertical or default to first/all agents
        const meta = getSkillMeta(skill);
        let targetAgents = agents.filter((a) => {
          const role = a.role?.toLowerCase() || "";
          if (meta.vertical === "sales" && (role.includes("sales") || role.includes("seller"))) return true;
          if (meta.vertical === "support" && role.includes("support")) return true;
          if (meta.vertical === "marketing" && (role.includes("buyer") || role.includes("marketing"))) return true;
          return false;
        });

        if (targetAgents.length === 0) {
          targetAgents = [agents[0]]; // fallback to primary agent
        }

        await Promise.all(
          targetAgents.map(async (agent) => {
            const nextSkills = [...new Set([...(agent.allowedSkills || []), skill.id])];
            return apiPut(
              `/agent/agents/${agent.id}/files`,
              {
                name: agent.name,
                role: agent.role,
                allowedTools: agent.allowedTools || [],
                allowedSkills: nextSkills,
              },
              effectiveCompanyId
            );
          })
        );

        const targetIds = new Set(targetAgents.map((a) => a.id));
        setAgents((prev) =>
          prev.map((a) =>
            targetIds.has(a.id)
              ? { ...a, allowedSkills: [...new Set([...(a.allowedSkills || []), skill.id])] }
              : a
          )
        );
        toast.success(`تم تفعيل وتجهيز مهارة "${skill.id}" للوكلاء`);
      }
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تعديل حالة المهارة");
    }
  };

  // Single Agent Toggle Handler (from Drawer)
  const handleToggleAgentInDrawer = async (agentId: string, enabled: boolean) => {
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
    <div dir="rtl" className="flex flex-col gap-3.5 p-3.5 sm:p-5 w-full max-w-[1400px] mx-auto">
      {/* 1. Filter & Actions Header Bar (Image 1 + Image 2 Style) */}
      <SkillFilterBar
        totalCount={skills.length}
        equippedCount={equippedSkillsCount}
        uninstalledCount={uninstalledSkillsCount}
        query={query}
        onQueryChange={setQuery}
        selectedVertical={selectedVertical}
        onSelectVertical={setSelectedVertical}
        installFilter={installFilter}
        onInstallFilterChange={setInstallFilter}
        verticalCounts={verticalCounts}
        onNewSkill={() => setCreateOpen(true)}
        onRefresh={loadAll}
        loading={loading}
      />

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 2. Main High-Density Skills List (Image 1 Style) with Clear Installed vs Uninstalled Sections */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed bg-card/40">
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" />
            <span className="text-xs text-muted-foreground font-mono">جارٍ مزامنة المهارات...</span>
          </div>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card/30 p-8 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2.5">
            <Search className="size-4" />
          </div>
          <h3 className="font-bold text-sm text-foreground">لا توجد مهارات مطابقة للبحث</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            جرب تعديل كلمات البحث أو اختيار تبويب آخر.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Section 1: Installed Skills (Show when 'all' or 'installed') */}
          {installFilter !== "uninstalled" && installedSkillsList.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 shadow-xs" />
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">
                    المهارات المثبتة والنشطة للوكلاء
                  </h3>
                  <span className="font-mono text-[0.7rem] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {installedSkillsList.length}
                  </span>
                </div>
                <span className="text-[0.7rem] text-muted-foreground hidden sm:inline">
                  مجهزة ومفعلة للوكلاء وتستدعى تلقائياً حسب سياق المحادثة
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {installedSkillsList.map((skill) => (
                  <SkillRowCard
                    key={skill.id}
                    skill={skill}
                    equippedAgents={skillEquippedAgentsMap.get(skill.id) || []}
                    toolsMap={toolsMap}
                    onInspect={(s) => setInspectedSkill(s)}
                    onToggle={handleToggleSkill}
                    onAssign={(s) => setAssignSkill(s)}
                    onTestSandbox={handleTestSandbox}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Uninstalled / Available Skills in Store (Show when 'all' or 'uninstalled') */}
          {installFilter !== "installed" && uninstalledSkillsList.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <DownloadCloud className="size-3.5 text-primary" />
                  <h3 className="font-bold text-xs sm:text-sm text-foreground">
                    المستودع: مهارات متاحة للتثبيت
                  </h3>
                  <span className="font-mono text-[0.7rem] font-bold px-1.5 py-0.2 rounded-md bg-primary/10 text-primary">
                    {uninstalledSkillsList.length}
                  </span>
                </div>
                <span className="text-[0.7rem] text-muted-foreground hidden sm:inline">
                  معتمدة في منصة MaxP وجاهزة للتجهيز للوكلاء بنقرة واحدة
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {uninstalledSkillsList.map((skill) => (
                  <SkillRowCard
                    key={skill.id}
                    skill={skill}
                    equippedAgents={skillEquippedAgentsMap.get(skill.id) || []}
                    toolsMap={toolsMap}
                    onInspect={(s) => setInspectedSkill(s)}
                    onToggle={handleToggleSkill}
                    onAssign={(s) => setAssignSkill(s)}
                    onTestSandbox={handleTestSandbox}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Slide-Over Quick Inspector Drawer */}
      <SkillInspectorDrawer
        skill={inspectedSkill}
        open={!!inspectedSkill}
        onClose={() => setInspectedSkill(null)}
        agents={agents}
        toolsMap={toolsMap}
        onAgentToggled={handleToggleAgentInDrawer}
        companyId={effectiveCompanyId}
      />

      {/* 4. Assign Skill Modal */}
      <AssignSkillModal
        open={!!assignSkill}
        skill={assignSkill}
        agents={agents}
        onClose={() => setAssignSkill(null)}
        onSave={handleSaveBulkAssign}
      />

      {/* 5. Create Custom Skill Modal */}
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
