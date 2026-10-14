import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, DownloadCloud, Wrench, Sparkles, Layers, ShieldCheck } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  ToolDefinition,
  AgentDefinition,
  AgentToolInfo,
  ToolInstallFilter,
  ToolSideEffectFilter,
} from "./agent-tools/types";
import { ToolRowCard } from "./agent-tools/ToolRowCard";
import { ToolFilterBar } from "./agent-tools/ToolFilterBar";
import { ToolInspectorDrawer } from "./agent-tools/ToolInspectorDrawer";
import { AssignToolModal } from "./agent-tools/AssignToolModal";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

const cq = (path: string, companyId?: string) =>
  companyId ? `${path}${path.includes("?") ? "&" : "?"}companyId=${encodeURIComponent(companyId)}` : path;

const apiRequest = async <T,>(path: string, companyId?: string): Promise<T> => {
  const response = await fetch(buildApiUrl(cq(path, companyId)), {
    headers: tokenManager.createAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }
  return data as T;
};

const apiPut = async <T,>(path: string, body: unknown, companyId?: string): Promise<T> => {
  const response = await fetch(buildApiUrl(cq(path, companyId)), {
    method: "PUT",
    headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }
  return data as T;
};

export default function AgentToolsPage({ companyId }: { companyId?: string } = {}) {
  const navigate = useNavigate();
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [installFilter, setInstallFilter] = useState<ToolInstallFilter>("all");
  const [sideEffectFilter, setSideEffectFilter] = useState<ToolSideEffectFilter>("all");

  // Modals / Drawers
  const [inspectTool, setInspectTool] = useState<ToolDefinition | null>(null);
  const [assignToolName, setAssignToolName] = useState<string | null>(null);

  // Load tools and agents
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [td, ad] = await Promise.all([
        apiRequest<{ success: true; tools: ToolDefinition[] }>("agent/tools", companyId),
        companyId
          ? apiRequest<{ success: true; agents: AgentDefinition[] }>("agent-manager/agents", companyId)
          : { success: true as const, agents: [] as AgentDefinition[] },
      ]);
      setTools(td.tools || []);
      setAgents(ad.agents || []);
    } catch (err: any) {
      setError(err.message || "تعذر تحميل بيانات الأدوات البرمجية");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Map tools to equipped agents
  const toolToAgents = useMemo(() => {
    const alias = new Map<string, string>();
    for (const toolItem of tools) {
      alias.set(toolItem.name, toolItem.name);
      for (const a of toolItem.aliases || []) alias.set(a, toolItem.name);
    }
    const m = new Map<string, AgentToolInfo[]>();
    for (const a of agents) {
      for (const tn of a.allowedTools || []) {
        const canonical = alias.get(tn) || tn;
        if (!m.has(canonical)) m.set(canonical, []);
        m.get(canonical)!.push({
          id: a.id,
          name: a.name,
          role: a.role,
          icon: a.icon,
          status: a.status,
          autonomy: a.toolAutonomy?.[tn] || "auto",
        });
      }
    }
    return m;
  }, [agents, tools]);

  const equippedCount = useMemo(() => {
    return tools.filter((t) => (toolToAgents.get(t.name) || []).length > 0).length;
  }, [tools, toolToAgents]);

  const unassignedCount = tools.length - equippedCount;

  const groupCounts = useMemo(() => {
    const map: Record<string, number> = { all: tools.length };
    for (const t of tools) {
      const g = (t.group || "other").toLowerCase();
      map[g] = (map[g] || 0) + 1;
    }
    return map;
  }, [tools]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const assigned = toolToAgents.get(tool.name) || [];
      const isEquipped = assigned.length > 0;
      if (installFilter === "installed" && !isEquipped) return false;
      if (installFilter === "uninstalled" && isEquipped) return false;
      if (sideEffectFilter === "read" && tool.sideEffects === "write") return false;
      if (sideEffectFilter === "write" && tool.sideEffects !== "write") return false;
      if (selectedGroup !== "all") {
        const g = (tool.group || "other").toLowerCase();
        if (g !== selectedGroup.toLowerCase()) return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const agentNames = assigned.map((a) => a.name).join(" ");
        const match =
          tool.name.toLowerCase().includes(q) ||
          (tool.description && tool.description.toLowerCase().includes(q)) ||
          agentNames.toLowerCase().includes(q) ||
          (tool.group && tool.group.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [tools, toolToAgents, installFilter, sideEffectFilter, selectedGroup, query]);

  const equippedList = useMemo(() => {
    return filteredTools.filter((t) => (toolToAgents.get(t.name) || []).length > 0);
  }, [filteredTools, toolToAgents]);

  const unassignedList = useMemo(() => {
    return filteredTools.filter((t) => (toolToAgents.get(t.name) || []).length === 0);
  }, [filteredTools, toolToAgents]);

  const handleToggle = async (tool: ToolDefinition, enabled: boolean) => {
    if (enabled) {
      if (agents.length === 0) {
        toast.error("لا يوجد وكلاء متاحون في حسابك لتجهيز الأداة لهم.");
        return;
      }
      setAssignToolName(tool.name);
    } else {
      try {
        const affectedAgents = agents.filter((a) => a.allowedTools?.includes(tool.name));
        await Promise.all(
          affectedAgents.map((agent) => {
            const nt = (agent.allowedTools || []).filter((t) => t !== tool.name);
            return apiPut(
              `/agent/agents/${agent.id}/files`,
              {
                name: agent.name,
                role: agent.role,
                allowedTools: nt,
                allowedSkills: (agent as any).allowedSkills || [],
                toolAutonomy: agent.toolAutonomy || {},
              },
              companyId
            );
          })
        );
        toast.success(`تم إلغاء تجهيز أداة ${tool.name}`);
        loadAll();
      } catch (err: any) {
        toast.error(err.message || "فشل إلغاء تجهيز الأداة");
      }
    }
  };

  const handleSaveDescription = async (toolName: string, newDesc: string) => {
    await apiPut(`agent/tools/${encodeURIComponent(toolName)}`, { description: newDesc }, companyId);
    setTools((prev) =>
      prev.map((t) => (t.name === toolName ? { ...t, description: newDesc } : t))
    );
    if (inspectTool && inspectTool.name === toolName) {
      setInspectTool({ ...inspectTool, description: newDesc });
    }
  };

  const handleSaveAssignments = async (selectedAgentIds: Set<string>) => {
    if (!assignToolName) return;
    const toolName = assignToolName;
    await Promise.all(
      agents.map(async (agent) => {
        const has = agent.allowedTools?.includes(toolName);
        const add = selectedAgentIds.has(agent.id);
        if (has === add) return;
        const nt = add
          ? [...(agent.allowedTools || []), toolName]
          : (agent.allowedTools || []).filter((t) => t !== toolName);
        return apiPut(
          `/agent/agents/${agent.id}/files`,
          {
            name: agent.name,
            role: agent.role,
            allowedTools: nt,
            allowedSkills: (agent as any).allowedSkills || [],
            toolAutonomy: {
              ...(agent.toolAutonomy || {}),
              ...(add ? { [toolName]: "auto" } : {}),
            },
          },
          companyId
        );
      })
    );
    toast.success("تم تحديث تعيينات الأداة بنجاح");
    loadAll();
  };

  return (
    <div dir="rtl" className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* 1. Header Filter Bar with Diagnostics Banner, Pills, and Underlined Tabs */}
      <ToolFilterBar
        totalCount={tools.length}
        equippedCount={equippedCount}
        unassignedCount={unassignedCount}
        query={query}
        onQueryChange={setQuery}
        selectedGroup={selectedGroup}
        onSelectGroup={setSelectedGroup}
        installFilter={installFilter}
        onInstallFilterChange={setInstallFilter}
        sideEffectFilter={sideEffectFilter}
        onSideEffectFilterChange={setSideEffectFilter}
        groupCounts={groupCounts}
        onRefresh={loadAll}
        loading={loading}
      />

      {/* 2. Main Content Area */}
      {loading ? (
        <div className="flex min-h-[380px] items-center justify-center rounded-xl border border-border/70 bg-card">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredTools.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center bg-card/40">
          <Wrench className="size-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-bold text-foreground">لا توجد أدوات مطابقة لمعايير البحث</p>
          <p className="text-xs text-muted-foreground mt-1">
            جرب تعديل كلمة البحث أو تغيير تبويب التصنيف المحدد.
          </p>
        </div>
      ) : installFilter === "all" ? (
        <div className="space-y-5">
          {/* Section 1: Equipped Tools */}
          {equippedList.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <h3 className="text-xs font-bold text-foreground">
                    الأدوات المجهزة والنشطة للوكلاء
                  </h3>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                    {equippedList.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {equippedList.map((tool) => (
                  <ToolRowCard
                    key={tool.name}
                    tool={tool}
                    equippedAgents={toolToAgents.get(tool.name) || []}
                    onInspect={(t) => setInspectTool(t)}
                    onToggle={handleToggle}
                    onAssign={(t) => setAssignToolName(t.name)}
                    onTestSandbox={(t) => navigate(`/admin/ai-hub?tab=sandbox&tool=${t.name}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Unassigned / Available Tools */}
          {unassignedList.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <DownloadCloud className="size-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-bold text-foreground">
                    مستودع الأدوات: متاحة للتجهيز
                  </h3>
                  <span className="font-mono text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-bold">
                    {unassignedList.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                {unassignedList.map((tool) => (
                  <ToolRowCard
                    key={tool.name}
                    tool={tool}
                    equippedAgents={[]}
                    onInspect={(t) => setInspectTool(t)}
                    onToggle={handleToggle}
                    onAssign={(t) => setAssignToolName(t.name)}
                    onTestSandbox={(t) => navigate(`/admin/ai-hub?tab=sandbox&tool=${t.name}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTools.map((tool) => (
            <ToolRowCard
              key={tool.name}
              tool={tool}
              equippedAgents={toolToAgents.get(tool.name) || []}
              onInspect={(t) => setInspectTool(t)}
              onToggle={handleToggle}
              onAssign={(t) => setAssignToolName(t.name)}
              onTestSandbox={(t) => navigate(`/admin/ai-hub?tab=sandbox&tool=${t.name}`)}
            />
          ))}
        </div>
      )}

      {/* 3. Tool Inspector Drawer */}
      <ToolInspectorDrawer
        tool={inspectTool}
        open={!!inspectTool}
        onClose={() => setInspectTool(null)}
        equippedAgents={inspectTool ? toolToAgents.get(inspectTool.name) || [] : []}
        onSaveDescription={handleSaveDescription}
        onAssignAgents={(t) => setAssignToolName(t.name)}
        onTestSandbox={(t) => {
          setInspectTool(null);
          navigate(`/admin/ai-hub?tab=sandbox&tool=${t.name}`);
        }}
      />

      {/* 4. Assign Tool Modal */}
      <AssignToolModal
        open={!!assignToolName}
        toolName={assignToolName || ""}
        agents={agents}
        onClose={() => setAssignToolName(null)}
        onSave={handleSaveAssignments}
      />
    </div>
  );
}
